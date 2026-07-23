import { useState, useEffect } from "react";
import { X, MessageSquareText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDriversRealtime, type DbDriver } from "@/hooks/use-drivers-realtime";
import type { UiTrip } from "@/lib/trip-helpers";

interface Props {
  open: boolean;
  onClose: () => void;
  trip: UiTrip | null;
}

export function DriverEvaluationModal({ open, onClose, trip }: Props) {
  const { drivers } = useDriversRealtime();
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [observations, setObservations] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && trip) {
      // Try to auto-select driver based on name
      if (trip.driver_name) {
        const match = drivers.find(d => d.name.toLowerCase() === trip.driver_name?.toLowerCase());
        if (match) setSelectedDriverId(match.id);
        else setSelectedDriverId("");
      } else {
        setSelectedDriverId("");
      }
      setObservations("");
    }
  }, [open, trip, drivers]);

  if (!open || !trip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) {
      alert("Por favor, selecione o motorista.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const evaluatorName = userData.user?.email || "CCO";

      await supabase.from("driver_evaluations").insert([{
        driver_id: selectedDriverId,
        trip_id: trip.id,
        observations,
        evaluator_name: evaluatorName
      }]);
      
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDrivers = drivers.filter(d => d.status === "ativo");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted">
          <X className="size-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Avaliar Motorista</h2>
            <p className="text-sm text-muted-foreground">Viagem: {trip.code}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Motorista
            </label>
            <select
              required
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Selecione um motorista...</option>
              {activeDrivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {!selectedDriverId && trip.driver_name && (
              <p className="text-xs text-warning mt-1">
                Atenção: O motorista "{trip.driver_name}" não foi encontrado no cadastro. Você precisa cadastrá-lo em "Motoristas".
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Observações (Comportamento, atrasos, etc)
            </label>
            <div className="relative">
              <MessageSquareText className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <textarea
                required
                rows={4}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Detalhe o que ocorreu durante a viagem..."
                className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedDriverId}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-glow-accent hover:opacity-90 disabled:opacity-50 transition-opacity mt-4"
          >
            {isSubmitting ? "Registrando..." : "Registrar Avaliação"}
          </button>
        </form>
      </div>
    </div>
  );
}
