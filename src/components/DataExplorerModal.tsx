import { useState } from "react";
import { X, Database, Play, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DataExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMetric: (metric: { id: string; label: string; value: string; table: string }) => void;
}

const TABLES = [
  "sales",
  "leads",
  "financial_records",
  "trips",
  "cash_closings",
  "fleet",
  "partners",
  "tasks",
  "knowledge_base",
  "shifts"
];

export function DataExplorerModal({ isOpen, onClose, onAddMetric }: DataExplorerModalProps) {
  const [label, setLabel] = useState("");
  const [table, setTable] = useState("sales");
  const [operation, setOperation] = useState<"count" | "sum" | "avg">("count");
  const [column, setColumn] = useState("");
  
  const [previewValue, setPreviewValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleTestQuery = async () => {
    setIsLoading(true);
    setError("");
    setPreviewValue(null);

    try {
      if (operation === "count") {
        const { count, error: err } = await supabase.from(table).select("*", { count: "exact", head: true });
        if (err) throw err;
        setPreviewValue(count?.toString() || "0");
      } else {
        if (!column) throw new Error("Você precisa especificar a coluna para somar/calcular média.");
        
        // Since Supabase RPC for generic aggregations might not exist, we fetch data and aggregate client-side
        // For large tables this is bad, but for a quick dynamic explorer it works
        const { data, error: err } = await supabase.from(table).select(column);
        if (err) throw err;
        
        if (!data || data.length === 0) {
          setPreviewValue("0");
        } else {
          const values = data.map(d => Number(d[column]) || 0);
          const sum = values.reduce((a, b) => a + b, 0);
          
          if (operation === "sum") {
            setPreviewValue(sum.toLocaleString("pt-BR"));
          } else if (operation === "avg") {
            const avg = sum / values.length;
            setPreviewValue(avg.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Erro ao consultar o banco de dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!previewValue) return;
    onAddMetric({
      id: Math.random().toString(),
      label: label || `Consulta em ${table}`,
      value: previewValue,
      table
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><Database className="size-5 text-primary"/> Data Explorer (Acesso Total)</h2>
            <p className="text-sm text-muted-foreground mt-1">Crie métricas customizadas vasculhando qualquer tabela do banco.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nome da Métrica</label>
            <input
              type="text"
              placeholder="Ex: Total de Despesas (OPEX)"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Tabela do Banco de Dados</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={table}
                onChange={e => setTable(e.target.value)}
              >
                {TABLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">Operação</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={operation}
                onChange={e => setOperation(e.target.value as any)}
              >
                <option value="count">Contar Registros (Quantidade)</option>
                <option value="sum">Somar Valores (R$ / Total)</option>
                <option value="avg">Média de Valores</option>
              </select>
            </div>
          </div>

          {operation !== "count" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-semibold">Nome da Coluna Numérica (Obrigatório)</label>
              <input
                type="text"
                placeholder="Ex: amount, total_revenue_calc, sale_price..."
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                value={column}
                onChange={e => setColumn(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">A coluna deve existir na tabela selecionada.</p>
            </div>
          )}

          <div className="pt-4 border-t border-border flex flex-col gap-4">
            <button
              type="button"
              onClick={handleTestQuery}
              disabled={isLoading || (operation !== "count" && !column)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-primary/50 bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all disabled:opacity-50"
            >
              <Play className="size-4" /> {isLoading ? "Consultando Banco..." : "Testar Consulta (Run Query)"}
            </button>

            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-medium">
                {error}
              </div>
            )}

            {previewValue !== null && !error && (
              <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-success uppercase tracking-widest mb-1">Resultado da Query:</div>
                  <div className="font-mono text-2xl font-black text-foreground">{previewValue}</div>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-success text-success-foreground font-bold rounded-lg hover:opacity-90 flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle2 className="size-4" /> Fixar na Estratégia
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
