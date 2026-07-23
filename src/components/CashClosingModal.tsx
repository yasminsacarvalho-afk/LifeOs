import { useEffect, useState, useMemo } from "react";
import { X, Lock, Coins, Banknote, FileText, Calendar, AlertTriangle, CheckCircle2, Plus, Trash2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { getLocalToday } from "@/lib/date-helpers";
import type { DbCashClosing } from "@/hooks/use-cash-closings-realtime";
import { cn } from "@/lib/utils";

interface Props {
  closing: DbCashClosing | null;
  open: boolean;
  onClose: () => void;
  initialDate?: string;
}

export interface CompanySettlement {
  id: string;
  company_id: string;
  company_name: string;
  pix: number;
  dinheiro: number;
  cartao: number;
  total: number;
  commission: number;
}

export function CashClosingModal({ closing, open, onClose, initialDate }: Props) {
  const { partners } = usePartnersRealtime();

  const [loading, setLoading] = useState(false);
  const [closingDate, setClosingDate] = useState(getLocalToday());
  const [expenses, setExpenses] = useState("0");
  const [initialChangeFund, setInitialChangeFund] = useState("0");
  const [notes, setNotes] = useState("");
  
  const [actualCashTotalInput, setActualCashTotalInput] = useState<string>("");

  // Estado para Acertos por Empresa
  const [settlements, setSettlements] = useState<CompanySettlement[]>([]);
  const [selPartnerId, setSelPartnerId] = useState("");
  const [valPix, setValPix] = useState("");
  const [valDinheiro, setValDinheiro] = useState("");
  const [valCartao, setValCartao] = useState("");
  const [valComissao, setValComissao] = useState("");

  useEffect(() => {
    if (!selPartnerId) {
      setValComissao("");
      return;
    }
    const partner = partners.find(p => p.id === selPartnerId);
    if (!partner) return;

    const pix = Number(valPix) || 0;
    const dinheiro = Number(valDinheiro) || 0;
    const cartao = Number(valCartao) || 0;
    const total = pix + dinheiro + cartao;
    
    if (total > 0) {
      const commissionRate = Number(partner.comissao) || 0;
      const calc = (total * commissionRate) / 100;
      setValComissao(calc.toFixed(2));
    } else {
      setValComissao("");
    }
  }, [valPix, valDinheiro, valCartao, selPartnerId, partners]);



  const handleAddSettlement = () => {
    if (!selPartnerId) return alert("Selecione a empresa.");
    const partner = partners.find(p => p.id === selPartnerId);
    if (!partner) return;

    const pix = Number(valPix) || 0;
    const dinheiro = Number(valDinheiro) || 0;
    const cartao = Number(valCartao) || 0;
    const total = pix + dinheiro + cartao;
    
    if (total <= 0) return alert("Informe ao menos um valor (PIX, Dinheiro ou Cartão).");

    const commissionRate = Number(partner.comissao) || 0;
    const calculatedCommission = (total * commissionRate) / 100;
    const commission = valComissao !== "" ? Number(valComissao) : calculatedCommission;

    const newSettlement: CompanySettlement = {
      id: Math.random().toString(36).substr(2, 9),
      company_id: partner.id,
      company_name: partner.name,
      pix,
      dinheiro,
      cartao,
      total,
      commission
    };

    setSettlements(prev => [...prev, newSettlement]);
    setSelPartnerId("");
    setValPix("");
    setValDinheiro("");
    setValCartao("");
    setValComissao("");
  };

  const handleRemoveSettlement = (id: string) => {
    setSettlements(prev => prev.filter(s => s.id !== id));
  };

  const actualCashTotal = useMemo(() => {
    return Number(actualCashTotalInput) || 0;
  }, [actualCashTotalInput]);

  useEffect(() => {
    if (closing) {
      setClosingDate(closing.closing_date);
      setExpenses(closing.expenses.toString());
      setNotes(closing.notes || "");
      const c = closing as any;
      setInitialChangeFund(c.initial_change_fund?.toString() || "0");
      setActualCashTotalInput(c.actual_cash_total?.toString() || "");
      if (c.company_settlements) {
         setSettlements(c.company_settlements as CompanySettlement[]);
      }
    } else {
      setClosingDate(initialDate || getLocalToday());
      setExpenses("0");
      setInitialChangeFund("0");
      setNotes("");
      setActualCashTotalInput("");
      setSettlements([]);
      setSelPartnerId("");
      setValPix("");
      setValDinheiro("");
      setValCartao("");
      setValComissao("");
    }
  }, [closing, open]);

  if (!open) return null;

  const totalSettlementsDinheiro = settlements.reduce((acc, s) => acc + Number(s.dinheiro), 0);
  const totalSettlementsPix = settlements.reduce((acc, s) => acc + Number(s.pix), 0);
  const totalSettlementsCartao = settlements.reduce((acc, s) => acc + Number(s.cartao), 0);
  const totalVendas = totalSettlementsDinheiro + totalSettlementsPix + totalSettlementsCartao;
  const totalSaidas = Number(expenses || 0);

  const expectedCash = totalSettlementsDinheiro + Number(initialChangeFund || 0) - totalSaidas;
  const difference = actualCashTotal - expectedCash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const closedBy = userData?.user?.email || "Operador (Admin)";

        const payload = {
        closing_date: closingDate,
        expenses: Number(expenses),
        net_amount: 0, // Nao usado mais dessa forma
        system_cash_total: totalSettlementsDinheiro, // Reutilizando para não quebrar tabelas antigas, mas agora é a soma de dinheiro informada
        actual_cash_total: actualCashTotal,
        difference: difference,
        initial_change_fund: Number(initialChangeFund),
        bills_breakdown: {},
        company_totals: {}, // Removido do calculo automático
        notes,
        closed_by: closedBy,
        company_settlements: settlements,
      } as any;

      let response;
      if (closing) {
        response = await supabase.from("cash_closings").update(payload).eq("id", closing.id);
      } else {
        response = await supabase.from("cash_closings").insert(payload);
      }

      if (response.error) {
        throw response.error;
      }
      
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("cash_closings_date_key") || err.code === "23505") {
        alert("Já existe um fechamento de caixa para a data informada! Se deseja alterar os valores, por favor clique em 'Editar' no histórico de fechamentos desta data.");
      } else {
        alert(`Erro ao salvar fechamento de caixa: ${err.message || "Verifique o console."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-t-3xl sm:rounded-3xl bg-card shadow-xl flex flex-col max-h-[92vh] sm:max-h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full text-primary">
              <Lock className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {closing ? "Editar Fechamento" : "Fechamento Diário de Caixa"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                Confira os valores e informe o dinheiro físico em caixa para o fechamento.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 bg-card hover:bg-muted border border-border transition-colors">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-border">
          <form id="cash-closing-form" onSubmit={handleSubmit} className="flex flex-col gap-6 sm:gap-8">
            
            <div className="space-y-6">
              
              {/* Data, Troco e Despesas */}
              <div className="space-y-4 bg-muted/10 p-4 sm:p-5 rounded-2xl border border-border/50">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1"><Calendar className="size-3"/> Data do Fechamento</label>
                  <input
                    required
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1"><Coins className="size-3"/> Fundo de Troco (R$)</label>
                    <input
                      type="number" step="0.01" min="0" value={initialChangeFund} onChange={(e) => setInitialChangeFund(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm focus:border-primary focus:outline-none transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground">Valor em caixa para facilitar troco.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1"><FileText className="size-3"/> Despesas Extras (R$)</label>
                    <input
                      type="number" step="0.01" min="0" value={expenses} onChange={(e) => setExpenses(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm focus:border-primary focus:outline-none transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground">Valores retirados (lanches, etc).</p>
                  </div>
                </div>
              </div>

              {/* Acerto com Parceiros */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-base font-semibold flex items-center gap-2 mb-6 text-foreground">
                  <Building2 className="size-5 text-muted-foreground" /> Acerto de Vendas (Por Empresa)
                </h3>
                
                <div className="space-y-5 mb-8">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Selecione a Empresa</label>
                    <select
                      value={selPartnerId}
                      onChange={(e) => setSelPartnerId(e.target.value)}
                      className="w-full h-12 rounded-xl border border-border/60 bg-background text-foreground px-4 text-base focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Toque para selecionar...</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.comissao}%)</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">PIX</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R$</span>
                        <input
                          type="number" step="0.01" min="0" placeholder="0,00" value={valPix} onChange={(e) => setValPix(e.target.value)}
                          className="w-full h-11 rounded-xl border border-border/60 bg-background text-foreground pl-8 pr-3 text-sm font-mono focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Dinheiro</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R$</span>
                        <input
                          type="number" step="0.01" min="0" placeholder="0,00" value={valDinheiro} onChange={(e) => setValDinheiro(e.target.value)}
                          className="w-full h-11 rounded-xl border border-border/60 bg-background text-foreground pl-8 pr-3 text-sm font-mono focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Cartão</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R$</span>
                        <input
                          type="number" step="0.01" min="0" placeholder="0,00" value={valCartao} onChange={(e) => setValCartao(e.target.value)}
                          className="w-full h-11 rounded-xl border border-border/60 bg-background text-foreground pl-8 pr-3 text-sm font-mono focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#8A05BE] uppercase tracking-widest mb-1.5 block">Comissão Real</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A05BE] font-medium text-sm">R$</span>
                        <input
                          type="number" step="0.01" min="0" placeholder="0,00" value={valComissao} onChange={(e) => setValComissao(e.target.value)}
                          className="w-full h-11 rounded-xl border border-[#8A05BE]/40 bg-[#8A05BE]/5 text-[#8A05BE] font-bold pl-8 pr-3 text-sm font-mono focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button type="button" onClick={handleAddSettlement} className="w-full h-12 bg-[#8A05BE]/10 text-[#8A05BE] font-bold rounded-xl hover:bg-[#8A05BE]/20 flex items-center justify-center gap-2 transition-colors">
                    <Plus className="size-5" /> Adicionar Acerto
                  </button>
                </div>

                {settlements.length > 0 ? (
                  <div className="space-y-0 border-t border-border/40 pt-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Acertos Lançados</h4>
                    {settlements.map(s => (
                      <div key={s.id} className="flex items-center justify-between py-4 border-b border-border/40 last:border-0 group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                            <Building2 className="size-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-base leading-tight">{s.company_name}</div>
                            <div className="text-[11px] text-muted-foreground mt-1">
                              PIX: R$ {s.pix.toFixed(2)} • DIN: R$ {s.dinheiro.toFixed(2)} • CAR: R$ {s.cartao.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium text-foreground text-base">R$ {s.total.toFixed(2)}</div>
                            <div className="text-[11px] font-semibold text-[#8A05BE]">Comissão: R$ {s.commission.toFixed(2)}</div>
                          </div>
                          <button type="button" onClick={() => handleRemoveSettlement(s.id)} className="p-2 text-muted-foreground/50 hover:text-danger hover:bg-danger/10 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-t border-border/40">
                    <p className="text-sm text-muted-foreground">Nenhum acerto lançado ainda.</p>
                  </div>
                )}
              </div>

              {/* Resumo Financeiro Completo */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm mb-6">
                <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
                  <Banknote className="size-5 text-muted-foreground" /> Resumo de Entradas e Saídas
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Total em Vendas (Geral)</span>
                    <span className="font-medium text-foreground">R$ {totalVendas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Entradas em PIX</span>
                    <span className="font-medium text-foreground">R$ {totalSettlementsPix.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Entradas em Cartão</span>
                    <span className="font-medium text-foreground">R$ {totalSettlementsCartao.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground pt-2 border-t border-border/50">
                    <span>Entradas em Dinheiro</span>
                    <span className="font-medium text-success">R$ {totalSettlementsDinheiro.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground pt-2 border-t border-border/50">
                    <span className="flex items-center gap-1"><Coins className="size-3"/> Fundo de Troco Inicial</span>
                    <span className="font-medium text-foreground">+ R$ {Number(initialChangeFund).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground pt-2 border-t border-border/50">
                    <span className="flex items-center gap-1"><Trash2 className="size-3"/> Total de Saídas (Despesas)</span>
                    <span className="font-medium text-danger">- R$ {totalSaidas.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Resumo do Esperado no Caixa Físico */}
              <div className="bg-[#8A05BE] rounded-3xl p-6 shadow-md text-white">
                <div className="flex justify-between items-center text-sm mb-3">
                  <span className="font-medium flex items-center gap-2 opacity-90"><Banknote className="size-4" /> Entradas em Dinheiro</span>
                  <span className="font-semibold">R$ {totalSettlementsDinheiro.toFixed(2)}</span>
                </div>
                {Number(initialChangeFund) > 0 && (
                  <div className="flex justify-between items-center text-sm mb-3">
                    <span className="font-medium flex items-center gap-2 opacity-90"><Coins className="size-4" /> (+) Fundo de Troco</span>
                    <span className="font-semibold">+ R$ {Number(initialChangeFund).toFixed(2)}</span>
                  </div>
                )}
                {Number(expenses) > 0 && (
                  <div className="flex justify-between items-center text-sm border-b border-white/20 pb-3 mb-3">
                    <span className="font-medium flex items-center gap-2 opacity-90"><Trash2 className="size-4" /> (-) Despesas (Saídas)</span>
                    <span className="font-semibold">- R$ {Number(expenses).toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2">
                  <h3 className="text-sm font-medium opacity-90 mb-1">Total esperado em caixa (Dinheiro Físico)</h3>
                  <div className="text-4xl font-bold tracking-tight">
                    R$ {expectedCash.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="rounded-2xl border border-border/50 bg-card p-5">
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <FileText className="size-4 text-muted-foreground" /> <span className="text-muted-foreground">Observações (Opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma anotação sobre o dia..."
                  className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm focus:outline-none focus:border-primary min-h-[100px] transition-all"
                />
              </div>

            </div>

              {/* Dinheiro Contado no Caixa e Resultado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <label className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground">
                    <Coins className="size-5 text-muted-foreground" /> Dinheiro em Caixa (Físico)
                  </label>
                  <p className="text-xs text-muted-foreground mb-4">Informe o valor total (cédulas e moedas) contadas na gaveta.</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">R$</span>
                    <input
                      type="number" step="0.01" min="0" placeholder="0,00" value={actualCashTotalInput} onChange={(e) => setActualCashTotalInput(e.target.value)}
                      className="w-full h-14 rounded-xl border border-border bg-background text-foreground pl-12 pr-4 text-xl font-bold font-mono focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Banner de Resultado */}
                <div className={cn(
                  "flex flex-col justify-center rounded-3xl p-6",
                  difference === 0 ? 'bg-green-50 text-green-700 border border-green-200' : 
                  difference > 0 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 
                  'bg-red-50 text-red-700 border border-red-200'
                )}>
                  <div className="flex items-center gap-4 mb-2">
                    {difference === 0 ? (
                      <CheckCircle2 className="size-6 text-success" />
                    ) : (
                      <AlertTriangle className={cn("size-6", difference > 0 ? "text-warning" : "text-danger")} />
                    )}
                    <span className="font-semibold text-sm">
                      Resultado da Conferência
                    </span>
                  </div>
                  <span className="text-3xl font-bold">
                    {difference === 0 ? "CAIXA BATEU" : difference > 0 ? `SOBRA R$ ${difference.toFixed(2)}` : `FALTA R$ ${Math.abs(difference).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border bg-muted/20 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl px-5 py-3 sm:py-2.5 text-sm font-medium hover:bg-card border border-transparent hover:border-border transition-all"
          >
            Cancelar
          </button>
          <button
            form="cash-closing-form"
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-[#8A05BE] px-6 py-3 sm:py-2.5 text-sm font-bold text-white hover:bg-[#72049d] disabled:opacity-50 shadow-md transition-all active:scale-95"
          >
            <Lock className="size-5" />
            {loading ? "Fechando..." : "Confirmar Fechamento"}
          </button>
        </div>

      </div>
    </div>
  );
}
