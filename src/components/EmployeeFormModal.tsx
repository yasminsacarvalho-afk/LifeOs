import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import type { DbSeller } from "@/hooks/use-sellers-realtime";
import type { DbSellerGoal } from "@/hooks/use-seller-goals-realtime";
import { PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  employee: DbSeller | null;
  employeeGoals: DbSellerGoal[];
  open: boolean;
  onClose: () => void;
}

export function EmployeeFormModal({ employee, employeeGoals, open, onClose }: Props) {
  const { partners } = usePartnersRealtime();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("Vendedor");
  const [active, setActive] = useState(true);
  const [baseSalary, setBaseSalary] = useState("");
  const [commissionRate, setCommissionRate] = useState("");

  const [goals, setGoals] = useState<{ description: string; target_amount: string; bonus_amount: string; }[]>([]);

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email || "");
      setCompanyId(employee.company_id || "");
      setRole(employee.role || "Vendedor");
      setActive(employee.active);
      setBaseSalary(employee.base_salary.toString());
      setCommissionRate(employee.commission_rate.toString());
      setGoals(employeeGoals.map(g => ({
        description: g.description,
        target_amount: g.target_amount.toString(),
        bonus_amount: g.bonus_amount.toString()
      })));
    } else {
      setName("");
      setEmail("");
      setCompanyId("");
      setRole("Vendedor");
      setActive(true);
      setBaseSalary("0");
      setCommissionRate("0");
      setGoals([]);
    }
  }, [employee, employeeGoals, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      email: email || null,
      company_id: companyId || null,
      role,
      active,
      base_salary: Number(baseSalary),
      commission_rate: Number(commissionRate),
      // We no longer use these as the main source of truth, but keep them at 0 or the first goal for legacy compatibility
      sales_goal: goals.length > 0 ? Number(goals[0].target_amount) : 0,
      bonus_amount: goals.length > 0 ? Number(goals[0].bonus_amount) : 0,
    };

    try {
      toast.loading("Salvando colaborador...", { id: "emp-save" });
      let sellerId = employee?.id;

      if (employee) {
        const { error } = await supabase.from("sellers").update(payload).eq("id", employee.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("sellers").insert(payload).select().single();
        if (error) throw error;
        sellerId = data.id;
      }

      if (sellerId) {
        // Delete old goals
        await supabase.from("seller_goals").delete().eq("seller_id", sellerId);
        
        // Insert new goals
        if (goals.length > 0) {
          const goalsPayload = goals.map(g => ({
            seller_id: sellerId,
            description: g.description,
            target_amount: Number(g.target_amount),
            bonus_amount: Number(g.bonus_amount),
          }));
          await supabase.from("seller_goals").insert(goalsPayload);
        }
      }

      toast.success("Colaborador salvo com sucesso!", { id: "emp-save" });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar colaborador.", { id: "emp-save" });
    } finally {
      setLoading(false);
    }
  };

  const addGoal = () => {
    setGoals([...goals, { description: `Meta ${goals.length + 1}`, target_amount: "0", bonus_amount: "0" }]);
  };

  const updateGoal = (index: number, field: string, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setGoals(newGoals);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {employee ? "Editar Colaborador" : "Novo Colaborador"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail (Opcional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cargo / Função</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="Vendedor">Vendedor</option>
                <option value="Atendimento">Atendimento</option>
                <option value="Motorista">Motorista</option>
                <option value="Gerente">Gerente</option>
                <option value="Operação">Operação</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa Base</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">(Geral)</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Salário Fixo Mensal (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tx. Comissão Padrão (%)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-primary">Múltiplas Metas & Bônus</label>
              <button 
                type="button" 
                onClick={addGoal}
                className="text-xs flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
              >
                <PlusCircle className="size-3" /> Adicionar Meta
              </button>
            </div>
            
            {goals.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhuma meta cadastrada.</p>
            )}

            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
              {goals.map((goal, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center bg-card p-2 border border-border/50 rounded-lg">
                  <input
                    required
                    type="text"
                    value={goal.description}
                    onChange={(e) => updateGoal(index, "description", e.target.value)}
                    placeholder="Descrição"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={goal.target_amount}
                    onChange={(e) => updateGoal(index, "target_amount", e.target.value)}
                    placeholder="Vender (R$)"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none text-primary"
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={goal.bonus_amount}
                    onChange={(e) => updateGoal(index, "bonus_amount", e.target.value)}
                    placeholder="Bônus (R$)"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none text-success"
                  />
                  <button 
                    type="button" 
                    onClick={() => removeGoal(index)}
                    className="p-1.5 text-danger hover:bg-danger/10 rounded"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-border bg-background text-primary focus:ring-primary"
            />
            <label htmlFor="active" className="text-sm font-medium cursor-pointer">
              Colaborador Ativo
            </label>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Save className="size-4" />
              {loading ? "Salvando..." : "Salvar Colaborador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
