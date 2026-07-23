import { useState } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ExpenseFormModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<"fixo" | "variavel">("fixo");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      toast.loading("Salvando despesa...", { id: "expense-save" });
      const { error } = await supabase.from("expenses").insert({
        description,
        amount: Number(amount),
        category,
        expense_date: date,
      });
      if (error) throw error;
      toast.success("Despesa salva com sucesso!", { id: "expense-save" });
      setDescription("");
      setAmount("");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar despesa.", { id: "expense-save" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Lançar Despesa</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição (O que é?)</label>
            <input
              required
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Conta de Luz, Aluguel"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-danger focus:outline-none text-danger"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium">Categoria do Custo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory("fixo")}
                className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${category === "fixo" ? "bg-primary/20 border-primary text-primary" : "bg-muted/10 border-border/50 text-muted-foreground"}`}
              >
                Custo Fixo
              </button>
              <button
                type="button"
                onClick={() => setCategory("variavel")}
                className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${category === "variavel" ? "bg-warning/20 border-warning text-warning" : "bg-muted/10 border-border/50 text-muted-foreground"}`}
              >
                Custo Variável
              </button>
            </div>
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
              className="inline-flex items-center gap-2 rounded-lg bg-danger px-5 py-2 text-sm font-medium text-danger-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Save className="size-4" />
              {loading ? "Salvando..." : "Salvar Despesa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
