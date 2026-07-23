import { useEffect, useState } from "react";
import { X, Save, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSellersRealtime, type DbSeller } from "@/hooks/use-sellers-realtime";
import type { UiShift } from "@/hooks/use-shifts-realtime";
import { cn } from "@/lib/utils";

interface Props {
  shift: UiShift | null;
  employee: DbSeller | null;
  dateStr: string; // YYYY-MM-DD
  open: boolean;
  onClose: () => void;
}

export function ShiftFormModal({ shift, employee, dateStr, open, onClose }: Props) {
  const { sellers } = useSellersRealtime();
  const [loading, setLoading] = useState(false);

  const [shiftType, setShiftType] = useState<"completa" | "manha" | "tarde" | "folga">("completa");
  const [status, setStatus] = useState<"agendado" | "realizado" | "trocado" | "falta">("agendado");
  const [isSwapped, setIsSwapped] = useState(false);
  const [coveredById, setCoveredById] = useState("");
  const [swapFee, setSwapFee] = useState("");
  const [swapType, setSwapType] = useState<"money" | "time_off">("money");

  // Format date for display
  const displayDate = dateStr 
    ? new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { weekday: 'long', day: '2-digit', month: 'long' })
    : "";

  useEffect(() => {
    if (shift) {
      setShiftType(shift.shift_type);
      setStatus(shift.status);
      setIsSwapped(shift.swap_requested || !!shift.covered_by_id);
      setCoveredById(shift.covered_by_id || "");
      setSwapFee(shift.swap_fee.toString());
      setSwapType(shift.swap_type || "money");
    } else {
      setShiftType("completa");
      setStatus("agendado");
      setIsSwapped(false);
      setCoveredById("");
      setSwapFee("0");
      setSwapType("money");
    }
  }, [shift, open]);

  if (!open || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      seller_id: employee.id,
      shift_date: dateStr,
      shift_type: shiftType,
      status: status,
      swap_requested: isSwapped,
      covered_by_id: isSwapped && coveredById ? coveredById : null,
      swap_type: isSwapped ? swapType : null,
      swap_fee: isSwapped && swapType === "money" ? Number(swapFee) : 0,
    };

    try {
      const result = await supabase.from("shifts").upsert(
        payload,
        { onConflict: 'seller_id,shift_date' }
      );

      if (result.error) {
        throw new Error(result.error.message);
      }
      
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar escala: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!shift) return;
    if (confirm("Tem certeza que deseja apagar esta escala?")) {
      setLoading(true);
      await supabase.from("shifts").delete().eq("id", shift.id);
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Gerenciar Escala</h2>
            <p className="text-sm text-muted-foreground capitalize">{employee.name} • {displayDate}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <label className="text-sm font-medium">Turno de Trabalho</label>
            <div className="grid grid-cols-2 gap-2">
              {(["completa", "manha", "tarde", "folga"] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setShiftType(type)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium border transition-colors capitalize",
                    shiftType === type 
                      ? "bg-primary/20 border-primary text-primary" 
                      : "bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/20"
                  )}
                >
                  {type === "completa" ? "Integral (06 às 19)" : type === "manha" ? "Manhã" : type === "tarde" ? "Tarde" : "Folga"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border/50">
            <label className="text-sm font-medium">Presença (Status do Turno)</label>
            <div className="grid grid-cols-2 gap-2">
              {(["agendado", "realizado", "falta"] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatus(st);
                    if (st === "falta") setIsSwapped(false);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2",
                    status === st && st === "agendado" ? "bg-warning/20 border-warning text-warning" :
                    status === st && st === "realizado" ? "bg-success/20 border-success text-success" :
                    status === st && st === "falta" ? "bg-danger/20 border-danger text-danger" :
                    "bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/20"
                  )}
                >
                  {st === "agendado" ? <Clock className="size-3" /> : st === "falta" ? <AlertTriangle className="size-3" /> : null}
                  {st === "agendado" ? "Agendado" : st === "realizado" ? "Presente" : "Falta"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isSwapped"
                checked={isSwapped}
                onChange={(e) => {
                  setIsSwapped(e.target.checked);
                  if (e.target.checked) setStatus("trocado");
                  else setStatus("agendado");
                }}
                className="rounded border-border bg-background text-primary focus:ring-primary"
              />
              <label htmlFor="isSwapped" className="text-sm font-medium cursor-pointer">
                Houve Troca de Turno (Substituição)?
              </label>
            </div>

            {isSwapped && (
              <div className="space-y-4 p-4 rounded-xl bg-warning/5 border border-warning/20 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="swapType" 
                      checked={swapType === "money"} 
                      onChange={() => setSwapType("money")}
                      className="text-warning focus:ring-warning"
                    />
                    Troca em Dinheiro
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="swapType" 
                      checked={swapType === "time_off"} 
                      onChange={() => setSwapType("time_off")}
                      className="text-warning focus:ring-warning"
                    />
                    Troca por Folga
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-warning/20">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-warning">Quem Cobriu?</label>
                    <select
                      required={isSwapped}
                      value={coveredById}
                      onChange={(e) => setCoveredById(e.target.value)}
                      className="w-full rounded-md border border-warning/30 bg-background/50 px-3 py-2 text-sm focus:border-warning focus:outline-none"
                    >
                      <option value="">Selecione...</option>
                      {sellers.filter(s => s.id !== employee.id).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  {swapType === "money" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-warning">Valor Pago (R$)</label>
                      <input
                        required={swapType === "money"}
                        type="number"
                        step="0.01"
                        min="0"
                        value={swapFee}
                        onChange={(e) => setSwapFee(e.target.value)}
                        placeholder="Ex: 50.00"
                        className="w-full rounded-md border border-warning/30 bg-background/50 px-3 py-2 text-sm focus:border-warning focus:outline-none"
                      />
                    </div>
                  )}
                  {swapType === "time_off" && (
                    <div className="space-y-2 flex items-center justify-center pt-5">
                      <span className="text-xs text-warning/80 text-center font-medium">Acordo de Folga. Valor (R$) zerado.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between gap-3 pt-4 border-t border-border">
            {shift ? (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
              >
                Excluir
              </button>
            ) : <div />}
            <div className="flex gap-2">
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
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
