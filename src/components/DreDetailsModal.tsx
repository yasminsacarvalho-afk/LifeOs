import { X, Search } from "lucide-react";
import type { UiSale } from "@/hooks/use-sales-realtime";
import type { UiPackage } from "@/hooks/use-packages-realtime";
import type { DbExpense } from "@/hooks/use-expenses-realtime";

interface DreDetailsModalProps {
  open: boolean;
  onClose: () => void;
  currentMonth: Date;
  filteredSales: UiSale[];
  filteredPackages: UiPackage[];
  filteredExpenses: DbExpense[];
  payroll: any[];
}

export function DreDetailsModal({
  open,
  onClose,
  currentMonth,
  filteredSales,
  filteredPackages,
  filteredExpenses,
  payroll,
}: DreDetailsModalProps) {
  if (!open) return null;

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary">Auditoria de Lançamentos</h2>
            <p className="text-sm text-muted-foreground capitalize">DRE · {monthName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Receitas - Passagens */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"></span> Passagens ({filteredSales.length})
            </h3>
            <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Passageiro</th>
                    <th className="px-4 py-2 font-medium">Rota</th>
                    <th className="px-4 py-2 font-medium text-right">Valor Bruto</th>
                    <th className="px-4 py-2 font-medium text-right">Receita Agência (Comissão)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredSales.map(s => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 text-xs">{new Date(s.sale_date + "T12:00:00").toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2 truncate max-w-[150px]">{s.passenger_name}</td>
                      <td className="px-4 py-2 truncate max-w-[150px] text-xs text-muted-foreground">{s.trip_code || s.origin + " -> " + s.destination}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground font-mono">{formatCurrency(Number(s.amount))}</td>
                      <td className="px-4 py-2 text-right text-success font-mono font-medium">+{formatCurrency(Number(s.commission_amount))}</td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">Nenhuma passagem neste mês.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Receitas - Encomendas */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"></span> Encomendas ({filteredPackages.length})
            </h3>
            <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Cód / Remetente</th>
                    <th className="px-4 py-2 font-medium text-right">Valor Bruto</th>
                    <th className="px-4 py-2 font-medium text-right">Receita Agência (Comissão)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredPackages.map(p => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 text-xs">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs">{p.code}</span> <span className="text-muted-foreground">· {p.sender_name}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground font-mono">{formatCurrency(Number(p.price))}</td>
                      <td className="px-4 py-2 text-right text-success font-mono font-medium">+{formatCurrency(Number(p.commission))}</td>
                    </tr>
                  ))}
                  {filteredPackages.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">Nenhuma encomenda neste mês.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Despesas */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-danger"></span> Despesas Lançadas ({filteredExpenses.length})
            </h3>
            <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Descrição</th>
                    <th className="px-4 py-2 font-medium text-center">Tipo</th>
                    <th className="px-4 py-2 font-medium text-right">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 text-xs">{new Date(e.expense_date + "T12:00:00").toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2">{e.description}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-muted text-muted-foreground">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-danger font-mono">-{formatCurrency(Number(e.amount))}</td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">Nenhuma despesa neste mês.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Folha de Pagamento */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span> Folha de Pagamento (RH)
            </h3>
            <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Colaborador</th>
                    <th className="px-4 py-2 font-medium text-right">Salário Base (C.F.)</th>
                    <th className="px-4 py-2 font-medium text-right">Bônus Metas (C.F.)</th>
                    <th className="px-4 py-2 font-medium text-right">Total a Pagar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payroll.map(emp => (
                    <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 font-medium">{emp.name}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground font-mono">{formatCurrency(emp.baseSalary)}</td>
                      <td className="px-4 py-2 text-right text-warning font-mono">+{formatCurrency(emp.bonus)}</td>
                      <td className="px-4 py-2 text-right text-danger font-mono font-semibold">-{formatCurrency(emp.baseSalary + emp.bonus)}</td>
                    </tr>
                  ))}
                  {payroll.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">Nenhum colaborador no RH.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
