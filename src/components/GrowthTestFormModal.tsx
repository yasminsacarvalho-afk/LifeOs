import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GrowthTest {
  id: string;
  name: string;
  objective: string;
  status: "active" | "completed" | "paused";
  budget: number;
  spent: number;
  cpc: number;
  leads: number;
  sales: number;
  revenue: number;
  targetCac: number;
  startDate: string;
}

interface GrowthTestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (test: Omit<GrowthTest, "id" | "cpc" | "startDate">) => void;
  initialData?: GrowthTest | null;
}

export function GrowthTestFormModal({ isOpen, onClose, onSave, initialData }: GrowthTestFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    objective: "",
    status: "active" as "active" | "completed" | "paused",
    budget: 0,
    spent: 0,
    leads: 0,
    sales: 0,
    revenue: 0,
    targetCac: 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        objective: initialData.objective,
        status: initialData.status,
        budget: initialData.budget,
        spent: initialData.spent,
        leads: initialData.leads,
        sales: initialData.sales,
        revenue: initialData.revenue,
        targetCac: initialData.targetCac,
      });
    } else {
      setFormData({
        name: "",
        objective: "",
        status: "active",
        budget: 0,
        spent: 0,
        leads: 0,
        sales: 0,
        revenue: 0,
        targetCac: 0,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{initialData ? "Editar" : "Novo"} Experimento de Ads</h2>
            <p className="text-sm text-muted-foreground mt-1">Defina metas e acompanhe os gastos da campanha.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold">Nome da Campanha/Teste</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">Objetivo Principal</label>
              <input
                type="text"
                required
                placeholder="Ex: Reduzir CAC, Aumentar Leads..."
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.objective}
                onChange={e => setFormData({ ...formData, objective: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Status do Teste</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="active">Em andamento</option>
                <option value="paused">Pausado</option>
                <option value="completed">Concluído</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-warning">Orçamento Total (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-danger">Valor já Gasto (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.spent}
                onChange={e => setFormData({ ...formData, spent: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary">Leads Gerados</label>
              <input
                type="number"
                min="0"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.leads}
                onChange={e => setFormData({ ...formData, leads: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary">Vendas Fechadas</label>
              <input
                type="number"
                min="0"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.sales}
                onChange={e => setFormData({ ...formData, sales: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-success">Receita Gerada (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.revenue}
                onChange={e => setFormData({ ...formData, revenue: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-info">Meta de CAC (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={formData.targetCac}
                onChange={e => setFormData({ ...formData, targetCac: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              Salvar Experimento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
