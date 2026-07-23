import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { TreasuryAccount, TreasuryAllocation } from "@/hooks/use-treasury-realtime";

interface Props {
  account: TreasuryAccount | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  activeContext: 'business' | 'personal';
}

const THEMES = [
  { id: 'purple', label: 'Roxo (Nubank)', color: 'text-[#8A05BE]', bg: 'bg-[#8A05BE]' },
  { id: 'orange', label: 'Laranja (Inter/Itaú)', color: 'text-[#FF7A00]', bg: 'bg-[#FF7A00]' },
  { id: 'blue', label: 'Azul (Mercado Pago)', color: 'text-[#009EE3]', bg: 'bg-[#009EE3]' },
  { id: 'emerald', label: 'Esmeralda', color: 'text-emerald-500', bg: 'bg-emerald-500' },
  { id: 'rose', label: 'Rose', color: 'text-rose-500', bg: 'bg-rose-500' },
  { id: 'gray', label: 'Cinza Escuro', color: 'text-gray-400', bg: 'bg-gray-500' },
];

export function TreasuryAccountModal({ account, open, onClose, onSuccess, activeContext }: Props) {
  const [bankName, setBankName] = useState("");
  const [accountPurpose, setAccountPurpose] = useState("");
  const [accountContext, setAccountContext] = useState<'business' | 'personal'>(activeContext);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [accountType, setAccountType] = useState<string>("checking");
  const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [theme, setTheme] = useState("blue");
  const [allocations, setAllocations] = useState<TreasuryAllocation[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (account) {
        setBankName(account.bank_name);
        setAccountPurpose(account.account_purpose);
        setAccountContext(account.account_context || activeContext);
        setCurrentBalance(account.current_balance || 0);
        setAccountType(account.account_type || "checking");
        setInvoiceAmount(account.invoice_amount || 0);
        setInvoiceDate(account.invoice_date || "");
        setTheme(account.theme);
        setAllocations(account.allocations || []);
        setNotes(account.notes || "");
      } else {
        setBankName("");
        setAccountPurpose("");
        setAccountContext(activeContext);
        setCurrentBalance(0);
        setAccountType("checking");
        setInvoiceAmount(0);
        setInvoiceDate("");
        setTheme("blue");
        setAllocations([]);
        setNotes("");
      }
    }
  }, [open, account]);

  if (!open) return null;

  const handleAddAllocation = () => {
    setAllocations([
      ...allocations,
      { id: Math.random().toString(36).substring(7), name: "", amount: 0, purpose: "" }
    ]);
  };

  const handleUpdateAllocation = (id: string, field: keyof TreasuryAllocation, value: any) => {
    setAllocations(allocations.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleRemoveAllocation = (id: string) => {
    setAllocations(allocations.filter(a => a.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Filtra alocações vazias
    const validAllocations = allocations.filter(a => a.name.trim() !== "");

    const payload = {
      bank_name: bankName,
      account_purpose: accountPurpose,
      account_context: accountContext,
      current_balance: currentBalance,
      account_type: accountType,
      invoice_amount: invoiceAmount,
      invoice_date: invoiceDate,
      theme,
      allocations: validAllocations,
      notes,
    };

    try {
      if (account) {
        await supabase.from("treasury_accounts").update(payload).eq("id", account.id);
      } else {
        await supabase.from("treasury_accounts").insert([payload]);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Supabase Error:", error);
      alert("Erro ao salvar conta bancária. O banco de dados recusou a operação (verifique se rodou o script alter_treasury_accounts.sql).");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    if (!confirm("Tem certeza que deseja excluir esta conta bancária e todas as suas caixinhas?")) return;
    
    setSaving(true);
    try {
      await supabase.from("treasury_accounts").delete().eq("id", account.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl overflow-y-auto max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-8">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 p-5 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {account ? "Editar Conta Bancária" : "Nova Conta Bancária"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Nome do Banco / Instituição
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ex: Nubank, BTG Pactual..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Finalidade / Uso Principal
              </label>
              <input
                type="text"
                value={accountPurpose}
                onChange={(e) => setAccountPurpose(e.target.value)}
                placeholder="Ex: Conta PJ & Caixinhas"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Pertence à (Contexto)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAccountContext('business')}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", accountContext === 'business' ? "bg-primary/20 border-primary text-primary" : "bg-muted/20 border-border text-muted-foreground")}
                >
                  🏢 Empresa
                </button>
                <button
                  type="button"
                  onClick={() => setAccountContext('personal')}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", accountContext === 'personal' ? "bg-primary/20 border-primary text-primary" : "bg-muted/20 border-border text-muted-foreground")}
                >
                  👤 Pessoal
                </button>
              </div>
            </div>
            
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Tipo de Conta
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType('checking')}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", accountType === 'checking' ? "bg-primary/20 border-primary text-primary" : "bg-muted/20 border-border text-muted-foreground")}
                >
                  🏦 Conta Corrente
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('credit')}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-bold border transition-colors", accountType === 'credit' ? "bg-primary/20 border-primary text-primary" : "bg-muted/20 border-border text-muted-foreground")}
                >
                  💳 Cartão de Crédito
                </button>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-primary">
                Saldo Atual Total na Conta Bancária (Caixa Principal + Caixinhas)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground font-bold">R$</span>
                <input
                  type="number"
                  value={currentBalance || ""}
                  onChange={(e) => setCurrentBalance(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 pl-9 text-base font-mono font-bold focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {accountType === 'credit' && (
              <div className="grid sm:grid-cols-2 gap-4 sm:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-rose-500">
                    Valor da Próxima Fatura
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground font-bold">R$</span>
                    <input
                      type="number"
                      value={invoiceAmount || ""}
                      onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 pl-9 text-sm font-mono font-bold focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-rose-500">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Cor do Banco (Identidade Visual)
            </label>
            <div className="flex flex-wrap gap-3">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform",
                    t.bg,
                    theme === t.id ? "scale-125 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                  title={t.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-4 border-t border-border">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Anotações / Prós / Bônus
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Este banco tem rendimento CDI de 100%. Uso o cartão Black para milhas..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                Caixinhas / Reservas Desta Conta
              </label>
              <button
                type="button"
                onClick={handleAddAllocation}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="size-3" /> Adicionar Reserva
              </button>
            </div>
            
            {allocations.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                Nenhuma reserva configurada para este banco. Adicione para rastrear seu dinheiro.
              </div>
            ) : (
              <div className="space-y-3">
                {allocations.map((alloc) => (
                  <div key={alloc.id} className="p-3 bg-muted/20 border border-border rounded-xl flex flex-col md:flex-row gap-3">
                    <div className="flex-1 space-y-2">
                       <input
                         type="text"
                         value={alloc.name}
                         onChange={(e) => handleUpdateAllocation(alloc.id, "name", e.target.value)}
                         placeholder="Nome da Caixinha (Ex: Reserva Impostos)"
                         className="w-full text-sm font-semibold bg-transparent border-b border-border px-1 py-1 focus:border-primary focus:outline-none"
                       />
                       <input
                         type="text"
                         value={alloc.purpose}
                         onChange={(e) => handleUpdateAllocation(alloc.id, "purpose", e.target.value)}
                         placeholder="Motivo / Propósito (Ex: Pagar Simples Nacional)"
                         className="w-full text-xs text-muted-foreground bg-transparent border-b border-border px-1 py-1 focus:border-primary focus:outline-none"
                       />
                    </div>
                    <div className="w-full md:w-32 flex items-start gap-2">
                       <div className="relative w-full">
                         <span className="absolute left-2 top-1.5 text-xs text-muted-foreground font-semibold">R$</span>
                         <input
                           type="number"
                           value={alloc.amount || ""}
                           onChange={(e) => handleUpdateAllocation(alloc.id, "amount", Number(e.target.value))}
                           className="w-full text-sm font-mono bg-background border border-border rounded-md px-2 py-1 pl-7 focus:border-primary focus:outline-none"
                         />
                       </div>
                       <button
                         type="button"
                         onClick={() => handleRemoveAllocation(alloc.id)}
                         className="p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger rounded-md transition-colors"
                       >
                         <Trash2 className="size-4" />
                       </button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-2 text-right text-xs font-medium text-muted-foreground">
                  Saldo Total Nestas Reservas: <span className="font-mono font-bold text-foreground">
                    {(allocations.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-border">
            {account ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-bold uppercase tracking-widest text-danger hover:text-danger/80 transition-colors"
              >
                Excluir Banco
              </button>
            ) : <div/>}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border bg-card px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !bankName.trim()}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]",
                  saving && "opacity-70 pointer-events-none"
                )}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Salvando..." : "Salvar Contas"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
