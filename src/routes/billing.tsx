import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getFinancialPeriod } from "@/lib/date-helpers";
import { TopBar } from "@/components/TopBar";
import { Plus, Edit2, Trash2, Calendar, Lock, DollarSign, Building2, TrendingUp, TrendingDown, CheckCircle2, CheckSquare, Square, Receipt, UploadCloud, XCircle, Loader2, AlertTriangle, Clock, ChevronDown, ChevronUp, Banknote, ArrowRight, PieChart, Wallet, Target, Activity, BellRing, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSalesRealtime, type UiSale } from "@/hooks/use-sales-realtime";
import { useCashClosingsRealtime, type DbCashClosing } from "@/hooks/use-cash-closings-realtime";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useExpensesRealtime } from "@/hooks/use-expenses-realtime";
import { SaleFormModal } from "@/components/SaleFormModal";
import { CashClosingModal } from "@/components/CashClosingModal";
import { CsvImportModal } from "@/components/CsvImportModal";
import { ExpenseFormModal } from "@/components/ExpenseFormModal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [{ title: "Faturamento e Caixa · Voyage Flow" }],
  }),
  component: BillingPage,
});

type Tab = "vendas" | "fechamentos" | "analise";

const formatCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function BillingPage() {
  const { sales } = useSalesRealtime();
  const { closings } = useCashClosingsRealtime();
  const { partners } = usePartnersRealtime();
  const { expenses } = useExpensesRealtime();

  const [activeTab, setActiveTab] = useState<Tab>("vendas");

  // Análise Diária State
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const [analiseDate, setAnaliseDate] = useState<string>(todayStr);
  const [analiseNotes, setAnaliseNotes] = useState<string>("");
  type TopService = { nome: string; quantidade: string; valor: string };
  const [analiseTopLines, setAnaliseTopLines] = useState<TopService[]>([]);
  const [currentLineNome, setCurrentLineNome] = useState<string>("");
  const [currentLineQtd, setCurrentLineQtd] = useState<string>("");
  const [currentLineValor, setCurrentLineValor] = useState<string>("");
  const [analiseTicketMedio, setAnaliseTicketMedio] = useState<string>("");
  const [analiseEmpresa, setAnaliseEmpresa] = useState<string>("");
  const [isSavingAnalise, setIsSavingAnalise] = useState(false);
  const [analiseTopCity, setAnaliseTopCity] = useState<string>("");
  const [analiseClima, setAnaliseClima] = useState<string>("");
  const [analiseTaxas, setAnaliseTaxas] = useState<string>("");
  const [analiseHorario, setAnaliseHorario] = useState<string>("");
  const [analisePagamento, setAnalisePagamento] = useState<string>("");
  
  // Novos estados de Receita
  const [analiseReceitaOrigem, setAnaliseReceitaOrigem] = useState<string>("");
  const [analiseReceitaDestino, setAnaliseReceitaDestino] = useState<string>("");
  const [analiseReceitaRota, setAnaliseReceitaRota] = useState<string>("");
  const [analiseReceitaHorario, setAnaliseReceitaHorario] = useState<string>("");
  
  const [analiseTotalVendas, setAnaliseTotalVendas] = useState<string>("");
  const [analiseVolumeVendas, setAnaliseVolumeVendas] = useState<string>("");
  
  // Vendas State
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<UiSale | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [filterCompanyId, setFilterCompanyId] = useState<string>("todas");
  const [filterDate, setFilterDate] = useState<string>("todas");
  const [selectedSales, setSelectedSales] = useState<string[]>([]);

  // Fechamentos State
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [editingClosing, setEditingClosing] = useState<DbCashClosing | null>(null);
  const [closingModalInitialDate, setClosingModalInitialDate] = useState<string>("");
  const [closingFilter, setClosingFilter] = useState<'all' | 'nao_informados' | 'pendentes' | 'quitados'>('all');
  const [closingDateFilter, setClosingDateFilter] = useState<string>("");

  useEffect(() => {
    // Other effects can go here
  }, []);

  const period = useMemo(() => getFinancialPeriod(new Date()), []);

  const financialPeriodDates = useMemo(() => {
    const dates: string[] = [];
    const now = new Date();
    let currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(); // Até hoje
    
    currentDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);

    while (currentDate <= endDate) {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, "0");
      const d = String(currentDate.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates.reverse(); // Mais recente primeiro
  }, []);

  const filteredSales = useMemo(() => {
    let result = sales;
    if (filterCompanyId !== "todas") {
      result = result.filter(s => s.company_id === filterCompanyId);
    }
    if (filterDate !== "todas") {
      result = result.filter(s => s.sale_date === filterDate);
    }
    return result;
  }, [sales, filterCompanyId, filterDate]);

  // Extrair datas únicas das vendas para o filtro
  const uniqueSaleDates = useMemo(() => {
    const dates = new Set(sales.map(s => s.sale_date).filter(Boolean));
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [sales]);

  const getDynamicCommission = (sale: UiSale) => {
    const partner = partners.find(p => p.id === sale.company_id);
    const rate = partner ? Number(partner.comissao || 0) : 0;
    // Fallback to sale.commission_amount if rate is 0
    if (rate === 0 && sale.commission_amount) return Number(sale.commission_amount);
    return Number(sale.amount || 0) * (rate / 100);
  };

  const accumulatedDifference = useMemo(() => {
    // Retornando 0 (zerado) por enquanto, a pedido do usuário
    return 0; // closings.reduce((acc, c) => acc + (Number(c.difference) || 0), 0);
  }, [closings]);

  const pendingBoletosData = useMemo(() => {
    let totalPendingAmount = 0;
    let totalPendingCount = 0;
    const pendingCompaniesMap: Record<string, { name: string; amount: number; count: number }> = {};

    closings.forEach(c => {
      const companySettlements = (c.company_settlements || []) as any[];
      let hasPerCompanyBoleto = false;

      // 1. Checar os boletos individuais de cada empresa (Novo Padrão)
      companySettlements.forEach(s => {
        // Usando o campo pago antigo (paid) ou o novo boleto_paid
        const isBoletoPaid = s.boleto_paid || s.paid;
        
        if (s.boleto_generated && !isBoletoPaid) {
          hasPerCompanyBoleto = true;
          totalPendingAmount += Number(s.total || 0);
          totalPendingCount++;
          if (!pendingCompaniesMap[s.company_name]) {
            pendingCompaniesMap[s.company_name] = { name: s.company_name, amount: 0, count: 0 };
          }
          pendingCompaniesMap[s.company_name].amount += Number(s.total || 0);
          pendingCompaniesMap[s.company_name].count++;
        }
      });

      // 2. Fallback para os boletos globais (Legado Antigo)
      if (!hasPerCompanyBoleto && c.boleto_generated && !c.boleto_paid) {
        const targetCompany = companySettlements.find(s => s.is_boleto_target);
        totalPendingCount++;
        
        if (targetCompany) {
          totalPendingAmount += Number(targetCompany.total || 0);
          if (!pendingCompaniesMap[targetCompany.company_name]) {
            pendingCompaniesMap[targetCompany.company_name] = { name: targetCompany.company_name, amount: 0, count: 0 };
          }
          pendingCompaniesMap[targetCompany.company_name].amount += Number(targetCompany.total || 0);
          pendingCompaniesMap[targetCompany.company_name].count++;
        } else {
          // Fallback se não tiver empresa destino assinalada
          totalPendingAmount += Number(c.net_amount || 0);
        }
      }
    });

    return {
      total: totalPendingAmount,
      count: totalPendingCount,
      companies: Object.values(pendingCompaniesMap)
    };
  }, [closings]);

  const handleDeleteSale = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta venda? O saldo do caixa do dia poderá ser afetado.")) {
      await supabase.from("sales").delete().eq("id", id);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Tem certeza que deseja excluir as ${selectedSales.length} vendas selecionadas?`)) {
      await supabase.from("sales").delete().in("id", selectedSales);
      setSelectedSales([]);
    }
  };

  const handleDeleteClosing = async (id: string) => {
    if (confirm("Deseja realmente reabrir/excluir o caixa deste dia?")) {
      await supabase.from("cash_closings").delete().eq("id", id);
    }
  };

  return (
    <>
      <TopBar
        title="Faturamento e Caixa"
        subtitle="Gerencie as vendas diárias, comissões de parceiros e fechamentos de caixa."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCsvModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-card border border-border p-2 md:px-4 md:py-2 text-sm font-medium hover:bg-white/5 transition-all shadow-sm"
              title="Importar CSV"
            >
              <UploadCloud className="size-4" /> <span className="hidden md:inline">Importar CSV</span>
            </button>
            <button
              onClick={() => {
                setEditingSale(null);
                setSaleModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-card border border-border p-2 md:px-4 md:py-2 text-sm font-medium hover:bg-white/5 transition-all shadow-sm"
              title="Nova Venda"
            >
              <Plus className="size-4" /> <span className="hidden md:inline">Nova Venda</span>
            </button>
            <button
              onClick={() => {
                setEditingClosing(null);
                setClosingModalInitialDate("");
                setClosingModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary p-2 md:px-4 md:py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm shadow-primary/20"
              title="Fechar Caixa"
            >
              <Lock className="size-4" /> <span className="hidden md:inline">Fechar Caixa</span>
            </button>
          </div>
        }
      />

      <main className="px-4 md:px-8 py-6 md:py-8 space-y-6 max-w-full overflow-hidden">
        {/* Tabs */}
        <div className="flex space-x-1 rounded-xl bg-card border border-border p-1 w-full overflow-x-auto no-scrollbar md:w-max">
          <button
            onClick={() => setActiveTab("vendas")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
              activeTab === "vendas"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <DollarSign className="size-4 shrink-0" /> Lançamentos de Vendas
          </button>
          <button
            onClick={() => setActiveTab("fechamentos")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
              activeTab === "fechamentos"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <Lock className="size-4 shrink-0" /> Histórico de Fechamentos
          </button>
        </div>

        {activeTab === "vendas" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-border bg-card/50">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1">
                  <Building2 className="size-3" /> Filtrar por Parceira
                </label>
                <select
                  value={filterCompanyId}
                  onChange={(e) => {
                    setFilterCompanyId(e.target.value);
                    setSelectedSales([]);
                  }}
                  className="w-full sm:w-auto rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="todas">Empresas</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1">
                  <Calendar className="size-3" /> Vendas Diárias
                </label>
                <select
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setSelectedSales([]);
                  }}
                  className="w-full sm:w-auto rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="todas">Todas as Datas</option>
                  {uniqueSaleDates.map(date => (
                    <option key={date} value={date}>{date.split("-").reverse().join("/")}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Sales Cards (Visible only on small screens) */}
            <div className="md:hidden space-y-4">
              {filteredSales.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-2xl bg-card/50">
                  Nenhuma movimentação encontrada para este período.
                </div>
              ) : (
                filteredSales.map((sale) => (
                  <div key={sale.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-bold text-lg text-foreground tracking-tight flex items-center gap-2">
                          <Building2 className="size-4 text-primary" />
                          {sale.partner_name || "Venda Avulsa"}
                        </div>
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Calendar className="size-3" />
                          {sale.sale_date ? sale.sale_date.split("-").reverse().join("/") : "N/A"} 
                          {sale.created_at && ` • ${new Date(sale.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                        </div>
                      </div>
                      <div className="flex gap-1 bg-muted/30 p-1 rounded-xl border border-border/50">
                        <button onClick={() => { setEditingSale(sale); setSaleModalOpen(true); }} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Edit2 className="size-3.5" />
                        </button>
                        <button onClick={() => handleDeleteSale(sale.id)} className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                       {sale.operation_type && sale.operation_type !== 'VENDA' ? (
                          <span className="bg-danger/10 text-danger border border-danger/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                             {sale.operation_type}
                          </span>
                       ) : (
                          <span className="bg-success/10 text-success border border-success/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                             VENDA
                          </span>
                       )}
                       <span className="bg-muted px-2.5 py-0.5 rounded-full text-[10px] font-bold text-foreground tracking-wider uppercase">
                         {sale.payment_method || "N/A"} {sale.fp1 && `(${sale.fp1})`}
                       </span>
                    </div>

                    <div className="bg-muted/20 p-3 rounded-xl border border-border/50 text-xs text-muted-foreground space-y-1.5 mb-4">
                       <div className="flex justify-between">
                         <span className="font-medium text-foreground/70">Operador</span>
                         <span className="font-medium text-foreground">{sale.seller_name || "N/A"}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="font-medium text-foreground/70">Serviço & Rota</span>
                         <span className="font-medium text-foreground text-right">
                           {sale.codigo_servico || "-"} {sale.hr ? `(${sale.hr})` : ""} <br/>
                           {sale.ori && sale.des ? `${sale.ori} → ${sale.des}` : "-"}
                         </span>
                       </div>
                    </div>
                    
                    <div className="flex justify-between items-end pt-3 border-t border-border/50">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Valor da Transação</div>
                        <div className="font-mono text-xl font-bold text-success tracking-tight">R$ {sale.amount.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Comissão Retida</div>
                        <div className="font-mono text-sm font-bold text-danger">- R$ {getDynamicCommission(sale).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedSales.length > 0 && (
              <div className="bg-primary/10 border-b border-primary/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between rounded-t-2xl mb-[-1px] relative z-10 gap-3">
                <span className="text-sm font-bold text-primary sm:pl-3">{selectedSales.length} transações selecionadas</span>
                <button 
                  onClick={handleBulkDelete}
                  className="text-xs font-bold bg-danger text-danger-foreground hover:bg-danger/90 px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
                >
                  <Trash2 className="size-4" />
                  Excluir Lotes Selecionados
                </button>
              </div>
            )}
            
            {/* Desktop Sales Table (Hidden on small screens) */}
            <div className={cn("hidden md:block border border-border bg-card shadow-sm overflow-hidden", selectedSales.length > 0 ? "rounded-b-2xl" : "rounded-2xl")}>
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedSales.length === filteredSales.length && filteredSales.length > 0}
                        onChange={(e) => setSelectedSales(e.target.checked ? filteredSales.map(s => s.id) : [])}
                        className="rounded border-border bg-card text-primary focus:ring-primary size-4"
                      />
                    </th>
                    <th className="px-5 py-4 text-left">Data da Transação</th>
                    <th className="px-5 py-4 text-left">Origem / Parceira</th>
                    <th className="px-5 py-4 text-left">Detalhes Operacionais</th>
                    <th className="px-5 py-4 text-right">Valor Bruto</th>
                    <th className="px-5 py-4 text-right">Comissão</th>
                    <th className="px-5 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground">
                        Nenhuma transação financeira encontrada para o período.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr 
                        key={sale.id} 
                        className={cn("hover:bg-muted/20 transition-colors cursor-pointer group", selectedSales.includes(sale.id) && "bg-primary/5")}
                        onClick={() => setSelectedSales(prev => prev.includes(sale.id) ? prev.filter(id => id !== sale.id) : [...prev, sale.id])}
                      >
                        <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedSales.includes(sale.id)}
                            onChange={(e) => setSelectedSales(prev => e.target.checked ? [...prev, sale.id] : prev.filter(id => id !== sale.id))}
                            className="rounded border-border bg-card text-primary focus:ring-primary size-4"
                          />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-mono text-sm font-medium text-foreground">
                            {sale.sale_date ? sale.sale_date.split("-").reverse().join("/") : "N/A"}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            {sale.operation_type && sale.operation_type !== 'VENDA' ? (
                               <span className="bg-danger/10 text-danger border border-danger/20 px-1.5 py-0.5 rounded-sm font-bold tracking-wider uppercase">
                                  {sale.operation_type}
                               </span>
                            ) : (
                               <span className="bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded-sm font-bold tracking-wider uppercase">
                                  VENDA
                               </span>
                            )}
                            {sale.created_at ? `${new Date(sale.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                             {sale.partner_name || "Venda Avulsa"}
                          </div>
                          <div className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                            {sale.seller_name ? `OP: ${sale.seller_name}` : "OP: N/A"}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-1">
                             <span className="bg-muted border border-border/50 px-2 py-0.5 rounded-full text-[10px] font-bold text-foreground tracking-wider uppercase">
                               {sale.payment_method || "N/A"} {sale.fp1 && `(${sale.fp1})`}
                             </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            Srv: {sale.codigo_servico || "-"} {sale.hr ? `(${sale.hr})` : ""} | Trj: {sale.ori && sale.des ? `${sale.ori}→${sale.des}` : "-"}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="font-mono font-bold text-[15px] text-success tracking-tight">
                            R$ {sale.amount.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="font-mono text-sm font-bold text-danger">
                            - R$ {getDynamicCommission(sale).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingSale(sale);
                                setSaleModalOpen(true);
                              }}
                              className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale.id)}
                              className="p-2 text-muted-foreground hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Totals Summary Bank Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-background border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-success" />
                 <div>
                   <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">
                     <DollarSign className="size-4 text-success" />
                     Volume Bruto em Vendas
                   </div>
                   <div className="text-3xl font-bold tracking-tight text-foreground">
                      R$ {filteredSales.reduce((acc, s) => acc + Number(s.amount || 0), 0).toFixed(2)}
                   </div>
                 </div>
              </div>
              
              <div className="bg-background border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-danger" />
                 <div>
                   <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">
                     <Banknote className="size-4 text-danger" />
                     Total de Comissões (Desconto)
                   </div>
                   <div className="text-3xl font-bold tracking-tight text-foreground">
                      - R$ {filteredSales.reduce((acc, s) => acc + getDynamicCommission(s), 0).toFixed(2)}
                   </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fechamentos" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl mx-auto">
            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Accumulated Auditoria */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-sm uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2 mb-1">
                    <Activity className="size-4" /> Balanço Acumulado
                  </h3>
                  <p className="text-xs text-muted-foreground">Soma de faltas e sobras de todos os fechamentos.</p>
                </div>
                <div className={cn(
                  "px-6 py-4 rounded-xl flex flex-col items-center justify-center min-w-[140px] border shadow-inner",
                  accumulatedDifference === 0 ? "bg-success/10 text-success border-success/20" : 
                  accumulatedDifference > 0 ? "bg-warning/10 text-warning border-warning/20" : 
                  "bg-danger/10 text-danger border-danger/20"
                )}>
                   <span className="text-xs font-bold uppercase mb-1 flex items-center gap-1.5">
                     {accumulatedDifference === 0 ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                     {accumulatedDifference === 0 ? "Caixa Redondo" : accumulatedDifference > 0 ? "Sobra Acumulada" : "Rombo Acumulado (Falta)"}
                   </span>
                   <span className="text-3xl font-bold tracking-tight">
                     {accumulatedDifference > 0 ? "+" : accumulatedDifference < 0 ? "-" : ""} {formatCurrency(Math.abs(accumulatedDifference))}
                   </span>
                </div>
              </div>

              {/* Pending Boletos */}
              <div className={cn("bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-4 transition-colors", pendingBoletosData.total > 0 ? "border-warning/50" : "border-border")}>
                <div>
                  <h3 className="text-sm uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2 mb-1">
                    <Receipt className="size-4" /> Boletos em Aberto (A Pagar)
                  </h3>
                  <p className="text-xs text-muted-foreground">Valor total de boletos gerados e aguardando pagamento.</p>
                </div>
                
                <div className="flex items-center justify-between gap-4 w-full">
                  <div className={cn(
                    "px-4 py-3 rounded-xl flex flex-col items-center justify-center flex-1 border shadow-inner min-w-[120px]",
                    pendingBoletosData.total === 0 ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                  )}>
                     <span className="text-xs font-bold uppercase mb-0.5 flex items-center gap-1.5">
                       {pendingBoletosData.total === 0 ? <CheckCircle2 className="size-3" /> : <Clock className="size-3 animate-pulse" />}
                       {pendingBoletosData.total === 0 ? "Tudo Pago" : `${pendingBoletosData.count} Pendente(s)`}
                     </span>
                     <span className="text-2xl font-bold tracking-tight">
                       {formatCurrency(pendingBoletosData.total)}
                     </span>
                  </div>

                  {pendingBoletosData.companies.length > 0 && (
                    <div className="flex-1 flex flex-col gap-1.5 border-l border-border/50 pl-4 max-h-[70px] overflow-y-auto pr-1">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Aguardando:</div>
                      {pendingBoletosData.companies.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-semibold truncate max-w-[100px]" title={c.name}>{c.name}</span>
                          <span className="font-mono text-warning font-bold pl-2">{formatCurrency(c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
              <h2 className="text-lg font-bold">Histórico Diário</h2>
              <div className="flex flex-wrap items-center gap-2">
                <input 
                  type="date"
                  value={closingDateFilter}
                  onChange={(e) => setClosingDateFilter(e.target.value)}
                  className="px-3 py-1 text-xs border rounded-lg bg-background text-foreground"
                />
                
                <button 
                  onClick={() => setClosingFilter('all')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-full border transition-colors", closingFilter === 'all' ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background text-muted-foreground border-border hover:bg-muted")}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setClosingFilter('nao_informados')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-full border transition-colors", closingFilter === 'nao_informados' ? "bg-danger text-danger-foreground border-danger shadow-sm" : "bg-background text-muted-foreground border-border hover:bg-muted")}
                >
                  Não Informados
                </button>
                <button 
                  onClick={() => setClosingFilter('pendentes')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-full border transition-colors", closingFilter === 'pendentes' ? "bg-warning text-warning-foreground border-warning shadow-sm" : "bg-background text-muted-foreground border-border hover:bg-muted")}
                >
                  Repasse Pendente
                </button>
                <button 
                  onClick={() => setClosingFilter('quitados')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-full border transition-colors", closingFilter === 'quitados' ? "bg-success text-success-foreground border-success shadow-sm" : "bg-background text-muted-foreground border-border hover:bg-muted")}
                >
                  Quitados
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {(() => {
                const filteredDates = financialPeriodDates.filter(date => {
                  if (closingDateFilter && date !== closingDateFilter) return false;

                  if (closingFilter === 'all') return true;
                  
                  const closing = closings.find(c => c.closing_date === date);
                  
                  if (!closing) {
                    return closingFilter === 'nao_informados';
                  }

                  if (closingFilter === 'nao_informados') return false;

                  const companySettlements = (closing.company_settlements || []) as any[];
                  const totalSettlements = companySettlements.length;
                  const pendingSettlements = companySettlements.filter(s => !(s.boleto_paid || s.paid));
                  const isAllPaid = totalSettlements > 0 && pendingSettlements.length === 0;

                  if (closingFilter === 'pendentes') return !isAllPaid;
                  if (closingFilter === 'quitados') return isAllPaid;

                  return true;
                });

                if (filteredDates.length === 0) {
                  return (
                    <div className="p-12 text-center text-muted-foreground border border-dashed rounded-xl bg-card/40">
                      Nenhum caixa encontrado para este filtro.
                    </div>
                  );
                }

                return filteredDates.map(date => {
                  const closing = closings.find(c => c.closing_date === date);
                  const isToday = date === todayStr;

                  if (closing) {
                    return (
                      <ClosingCard 
                        key={closing.id} 
                        closing={closing} 
                        onEdit={() => {
                          setEditingClosing(closing);
                          setClosingModalOpen(true);
                        }}
                        onDelete={() => handleDeleteClosing(closing.id)}
                      />
                    );
                  }

                  // Caixa pendente
                  return (
                    <div key={date} className={cn(
                      "p-4 rounded-xl border border-dashed flex items-center justify-between transition-colors",
                      isToday ? "border-warning/30 bg-warning/5 text-warning" : "border-danger/30 bg-danger/5 text-danger"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-full", isToday ? "bg-warning/20" : "bg-danger/20")}>
                          {isToday ? <Clock className="size-5" /> : <AlertTriangle className="size-5" />}
                        </div>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            <Calendar className="size-4" />
                            Caixa de {date.split('-').reverse().join('/')}
                          </div>
                          <div className="text-xs mt-0.5 opacity-80">
                            {isToday ? "Dia em andamento. Feche o caixa no fim do expediente." : "Atenção: O fechamento financeiro deste dia está pendente!"}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingClosing(null);
                          setClosingModalInitialDate(date);
                          setClosingModalOpen(true);
                        }} 
                        className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-transform hover:scale-105 shadow-sm text-white", isToday ? "bg-warning" : "bg-danger")}
                      >
                        Fechar Caixa
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}


      </main>

      <SaleFormModal
        sale={editingSale}
        open={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
      />

      <CashClosingModal
        closing={editingClosing}
        open={closingModalOpen}
        onClose={() => setClosingModalOpen(false)}
        initialDate={closingModalInitialDate}
      />

      <CsvImportModal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={() => {
        }}
      />

      <ExpenseFormModal 
        open={false}
        onClose={() => {}}
      />
    </>
  );
}

function ClosingCard({ closing, onEdit, onDelete }: { closing: any, onEdit: () => void, onDelete: () => void }) {
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  let volumeFinanceiro = 0;
  let totalComissao = 0;
  
  const companySettlements = (closing.company_settlements || []) as any[];
  const totalSettlements = companySettlements.length;
  const pendingSettlements = companySettlements.filter(s => !(s.boleto_paid || s.paid));
  const pendingAmount = pendingSettlements.reduce((acc, s) => acc + Number(s.total || 0), 0);
  const allPaid = totalSettlements > 0 && pendingSettlements.length === 0;

  if (totalSettlements > 0) {
    companySettlements.forEach((s: any) => {
      volumeFinanceiro += Number(s.total || 0);
      totalComissao += Number(s.commission || 0);
    });
  }

  const handleToggle = async (field: 'boleto_generated' | 'boleto_paid', value: boolean) => {
    setUpdating(true);
    await supabase.from('cash_closings').update({ [field]: value }).eq('id', closing.id);
    setUpdating(false);
  };

  const handleToggleCompanyBoleto = async (companyId: string, field: 'boleto_generated' | 'boleto_paid' | 'paid', currentStatus: boolean) => {
    if (!closing.company_settlements || !Array.isArray(closing.company_settlements)) return;
    
    const updatedSettlements = closing.company_settlements.map((s: any) => {
      if (s.id === companyId) {
        return { ...s, [field]: !currentStatus };
      }
      return s;
    });
    
    setUpdating(true);
    await supabase.from('cash_closings').update({ company_settlements: updatedSettlements }).eq('id', closing.id);
    setUpdating(false);
  };

  const handleToggleCompanyPaid = async (companyId: string, currentStatus: boolean) => {
    return handleToggleCompanyBoleto(companyId, 'paid', currentStatus);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${closing.id}-${Math.random()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
      
      await supabase.from('cash_closings').update({ boleto_receipt_url: data.publicUrl }).eq('id', closing.id);
    } catch (err) {
      alert("Erro ao enviar comprovante.");
    } finally {
      setUploading(false);
    }
  };

  const removeReceipt = async () => {
    setUpdating(true);
    await supabase.from('cash_closings').update({ boleto_receipt_url: null }).eq('id', closing.id);
    setUpdating(false);
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all group/card relative overflow-hidden">
      
      <div className="absolute top-4 right-4 flex opacity-0 group-hover/card:opacity-100 transition-opacity gap-1 z-10">
         <button onClick={onEdit} className="p-1.5 hover:text-primary hover:bg-primary/10 rounded-md text-muted-foreground transition-colors"><Edit2 className="size-4"/></button>
         <button onClick={onDelete} className="p-1.5 hover:text-danger hover:bg-danger/10 rounded-md text-muted-foreground transition-colors"><Trash2 className="size-4"/></button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 pr-16">
            <span className="font-bold text-xl text-foreground tracking-tight flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              {closing.closing_date ? closing.closing_date.split('-').reverse().join('/') : "N/A"}
              {closing.closing_date && (
                <span className="text-sm font-medium text-muted-foreground capitalize ml-1">
                  ({new Date(closing.closing_date + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')})
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full font-medium">Operador: {closing.closed_by || 'Sistema'}</span>
            
            {totalSettlements > 0 && (
              <span className={cn(
                "text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border shadow-sm transition-colors",
                allPaid ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
              )}>
                {allPaid ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                {allPaid ? "Caixa Quitado" : `Falta pagar ${pendingSettlements.length} parceira(s)`}
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mb-5">
            {closing.notes || "Sem observações adicionais para este fechamento."}
          </div>

          <div className="flex flex-wrap items-center gap-3 py-4 border-y border-border/50 mb-5 bg-muted/10 px-4 rounded-xl">
             <div className="flex flex-wrap items-center gap-2 border-r border-border/50 pr-4">
                <button
                  disabled={updating}
                  onClick={() => handleToggle('boleto_generated', !closing.boleto_generated)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm", closing.boleto_generated ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-muted disabled:opacity-50")}
                >
                  {closing.boleto_generated ? <CheckCircle2 className="size-3.5" /> : <div className="size-3.5 rounded-full border-2 border-current opacity-40" />}
                  Boleto Global Gerado
                </button>
                
                <button
                  disabled={updating || !closing.boleto_generated}
                  onClick={() => handleToggle('boleto_paid', !closing.boleto_paid)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm", closing.boleto_paid ? "bg-success text-success-foreground border-success" : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50")}
                >
                  {closing.boleto_paid ? <CheckCircle2 className="size-3.5" /> : <div className="size-3.5 rounded-full border-2 border-current opacity-40" />}
                  Boleto Global Pago
                </button>
             </div>

            {closing.boleto_receipt_url ? (
               <div className="flex items-center gap-1 pl-2">
                 <a href={closing.boleto_receipt_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-info/10 text-info border border-info hover:bg-info/20 transition-all">
                   <Receipt className="size-4" /> Ver Comprovante
                 </a>
                 <button onClick={removeReceipt} disabled={updating} className="p-1.5 text-danger hover:bg-danger/10 rounded-full transition-colors">
                   <XCircle className="size-4" />
                 </button>
               </div>
            ) : (
               <label className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-dashed border-border cursor-pointer hover:bg-muted text-muted-foreground ml-2", uploading && "opacity-50 pointer-events-none")}>
                 {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                 Anexar Comprovante
                 <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
               </label>
            )}
          </div>

          {((closing as any).company_settlements && Array.isArray((closing as any).company_settlements) && (closing as any).company_settlements.length > 0) && (
            <>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors mb-3 bg-primary/5 px-3 py-1.5 rounded-lg"
              >
                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                {isExpanded ? "Ocultar Extrato de Parceiras" : "Ver Extrato de Parceiras"}
              </button>

              {isExpanded && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="pt-2">
                    <div className="space-y-3 max-w-lg">
                      {((closing as any).company_settlements).map((s: any) => (
                        <div key={s.id} className="bg-background border border-border rounded-xl p-4 shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <div className="font-bold text-sm text-foreground flex items-center gap-2"><Building2 className="size-4 text-muted-foreground"/> {s.company_name}</div>
                            <div className="text-right">
                              <div className="text-[9px] uppercase font-bold text-muted-foreground">Comissão (Desconto)</div>
                              <div className="font-mono text-xs font-bold text-danger">- {formatCurrency(Number(s.commission))}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
                            <div className="text-center border-r border-border/50">
                              <div className="text-[9px] uppercase mb-0.5">PIX</div>
                              <div className="font-mono text-foreground font-medium">{formatCurrency(Number(s.pix))}</div>
                            </div>
                            <div className="text-center border-r border-border/50">
                              <div className="text-[9px] uppercase mb-0.5">Dinheiro</div>
                              <div className="font-mono text-foreground font-medium">{formatCurrency(Number(s.dinheiro))}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[9px] uppercase mb-0.5">Cartão</div>
                              <div className="font-mono text-foreground font-medium">{formatCurrency(Number(s.cartao))}</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Líquido a Repassar</div>
                            <div className="font-mono text-sm font-bold text-success">{formatCurrency(Number(s.total))}</div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                            <button
                              disabled={updating}
                              onClick={() => handleToggleCompanyBoleto(s.id, 'boleto_generated', !!s.boleto_generated)}
                              className={cn("flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold transition-all border shadow-sm", s.boleto_generated ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-muted disabled:opacity-50")}
                            >
                              {s.boleto_generated ? <CheckCircle2 className="size-3" /> : <div className="size-3 rounded-full border-2 border-current opacity-40" />}
                              Boleto Gerado
                            </button>
                            
                            <button
                              disabled={updating || !s.boleto_generated}
                              onClick={() => handleToggleCompanyPaid(s.id, !!(s.boleto_paid || s.paid))}
                              className={cn("flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold transition-all border shadow-sm", (s.boleto_paid || s.paid) ? "bg-success text-success-foreground border-success" : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50")}
                            >
                              {(s.boleto_paid || s.paid) ? <CheckCircle2 className="size-3" /> : <div className="size-3 rounded-full border-2 border-current opacity-40" />}
                              Boleto Pago
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
        
        <div className="flex flex-col gap-4 shrink-0 w-full md:w-auto md:min-w-[320px]">
          
          <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
             <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">
               <Banknote className="size-4 text-success" />
               Volume Bruto Movimentado
             </div>
             <div className="text-3xl font-bold tracking-tight text-foreground mb-4">{formatCurrency(volumeFinanceiro)}</div>
             
             <div className="flex justify-between items-center pt-3 border-t border-border/50">
               <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Comissões Retidas</div>
               <div className="font-mono text-sm font-bold text-danger">- {formatCurrency(totalComissao)}</div>
             </div>
          </div>

          <div className="bg-background border border-border p-5 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
               <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Auditoria de Caixa</div>
               {Number(closing.difference) === 0 ? (
                 <div className="flex items-center gap-1.5 text-success font-bold text-xs bg-success/10 px-2.5 py-1 rounded-full">
                   <CheckCircle2 className="size-3.5" /> Saldo Bateu
                 </div>
               ) : (
                 <div className={cn("font-bold text-xs px-2.5 py-1 rounded-full", Number(closing.difference) > 0 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger")}>
                   {Number(closing.difference) > 0 ? "Sobra:" : "Falta:"} {formatCurrency(Math.abs(Number(closing.difference)))}
                 </div>
               )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1">Sistema</div>
                <div className="font-mono font-bold text-foreground text-sm">{formatCurrency(Number(closing.system_cash_total))}</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1">Gaveta Físico</div>
                <div className="font-mono font-bold text-foreground text-sm">{formatCurrency(Number(closing.actual_cash_total))}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-medium text-muted-foreground">
               {Number(closing.initial_change_fund || 0) > 0 && (
                 <div className="flex justify-between items-center">
                   <span>Troco Inicial do Dia</span>
                   <span className="font-mono text-foreground">+ {formatCurrency(Number(closing.initial_change_fund))}</span>
                 </div>
               )}
               {Number(closing.expenses || 0) > 0 && (
                 <div className="flex justify-between items-center">
                   <span className="text-danger flex items-center gap-1"><ArrowRight className="size-3"/> Sangrias / Despesas</span>
                   <span className="font-mono text-danger">- {formatCurrency(Number(closing.expenses))}</span>
                 </div>
               )}
               {((closing as any).company_settlements?.length || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Total de Repasses (Líquido)</span>
                    <span className="font-mono text-foreground">- {formatCurrency(volumeFinanceiro - totalComissao)}</span>
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
