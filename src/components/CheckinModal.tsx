import { useEffect, useState } from "react";
import { X, Send, AlertTriangle, CheckCircle2, MessageCircle, Loader2, Plus, UserPlus, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { UiTrip } from "@/lib/trip-helpers";
import { cn } from "@/lib/utils";
import { useDriversRealtime } from "@/hooks/use-drivers-realtime";

interface Props {
  trip: UiTrip | null;
  open: boolean;
  onClose: (result?: { sentWa: boolean }) => void;
}

const buses = ["G8 1205 (Scania K400)", "G7 1102 (Volvo 9800)", "DD 980 (Marcopolo Paradiso)", "G7 1050 (O500R)"];

export function CheckinModal({ trip, open, onClose }: Props) {
  const { drivers, loading: loadingDrivers } = useDriversRealtime();

  const [bus, setBus] = useState("");
  const [driverSelect, setDriverSelect] = useState("");
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverLines, setNewDriverLines] = useState("");

  const [packages, setPackages] = useState("12");
  const [packagesNotes, setPackagesNotes] = useState("");
  const [sendWA, setSendWA] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualTime, setManualTime] = useState("");
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (open) {
      const now = new Date();
      setManualTime(now.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit" }));
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setSaving(false);
      setIsCreatingDriver(false);
      setNewDriverName("");
      setNewDriverLines("");
      setBus(trip?.bus ?? "");
      
      // Try to match existing driver
      if (trip?.driver && drivers.length > 0) {
        const match = drivers.find(d => d.name.toLowerCase() === trip.driver?.toLowerCase());
        if (match) {
          setDriverSelect(match.name);
        } else {
          setDriverSelect("");
        }
      } else {
        if (drivers.length > 0 && !driverSelect) {
          setDriverSelect(drivers[0].name);
        }
      }
      
      setPackages("12");
      setRating(0);
    }
  }, [open, trip, drivers.length]);

  if (!open || !trip) return null;

  const handleConfirm = async () => {
    let finalDriverName = driverSelect;

    if (!bus.trim()) {
      alert("O número da placa ou identificação do carro é obrigatório.");
      return;
    }

    if (isCreatingDriver) {
      if (!newDriverName) {
        alert("Digite o nome do novo motorista.");
        return;
      }
      if (!newDriverLines) {
        alert("Digite as linhas de operação (ex: VCA x SSA).");
        return;
      }
      finalDriverName = newDriverName;
    } else {
      if (!driverSelect) {
        alert("Selecione um motorista ou cadastre um novo.");
        return;
      }
    }

    setSaving(true);
    
    // Create ISO string from today's date and the manual time
    const today = new Date();
    const [hours, minutes] = manualTime.split(":");
    today.setHours(Number(hours), Number(minutes), 0, 0);
    const nowIso = today.toISOString();
    
    const packagesCount = Number(packages) || 0;

    try {
      let finalDriverId = "";
      
      // Registrar motorista inline se necessário
      if (isCreatingDriver) {
        const linesArray = newDriverLines.split(",").map(l => l.trim()).filter(Boolean);
        const { data: newDriver } = await supabase.from("drivers").insert([{
          name: newDriverName,
          lines: linesArray,
          status: "ativo"
        }]).select().single();
        if (newDriver) finalDriverId = newDriver.id;
      } else {
        const match = drivers.find(d => d.name === finalDriverName);
        if (match) finalDriverId = match.id;
      }

      await supabase.from("checkins").insert({
        trip_id: trip.id,
        real_departure: nowIso,
        car_plate: bus,
        driver_name: finalDriverName,
        packages_count: packagesCount,
        packages_notes: packagesNotes || null,
        sent_to_whatsapp: sendWA,
      });

      await supabase
        .from("trips")
        .update({
          status: "checked_in",
          real_departure: nowIso,
          car_plate: bus,
          driver_name: finalDriverName,
        })
        .eq("id", trip.id);

      // Save driver evaluation if rating > 0
      if (rating > 0 && finalDriverId) {
        await supabase.from("driver_evaluations").insert({
          driver_id: finalDriverId,
          trip_id: trip.id,
          observations: `[${rating} Estrelas] Avaliação rápida no Check-in Operacional.`,
          evaluator_name: "Operador de Check-in",
        });
      }

      setConfirmed(true);
      setTimeout(() => onClose({ sentWa: sendWA }), 10000);
    } catch (e) {
      console.error(e);
      alert("Erro ao realizar check-in.");
      setSaving(false);
    }
  };

  const handleCopy = () => {
    const text = `🚐 *CHECK-IN OPERACIONAL*
*Protocolo:* ${trip.code}
*Rota:* ${trip.origin} -> ${trip.destination}
*Saída Prevista:* ${trip.departure}
*Saída Real:* ${manualTime}
*Carro:* ${bus}
*Motorista:* ${isCreatingDriver ? newDriverName : driverSelect}
*Encomendas:* ${packages} volumes
*Observações:* ${packagesNotes || "Nenhuma"}
`;
    navigator.clipboard.writeText(text);
    alert("Resumo copiado para a área de transferência!");
  };

  const handleSos = async () => {
    await supabase.from("sos_alerts").insert({
      trip_id: trip.id,
      message: `SOS · ${trip.code} · carro quebrado · ${bus} · ${isCreatingDriver ? newDriverName : driverSelect}`,
      severity: "high",
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background/70 px-4 py-8 backdrop-blur-md animate-slide-up"
      onClick={() => onClose()}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Check-in Operacional · {trip.code}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              {trip.origin} <span className="text-muted-foreground">→</span> {trip.destination}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Saída prevista <span className="font-mono text-foreground">{trip.departure}</span> ·{" "}
              {trip.service} · {trip.route}
            </p>
          </div>
          <button
            onClick={() => onClose()}
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {confirmed ? (
          <div className="grid place-items-center gap-3 p-12 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-success/15 text-success animate-pulse-ring">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="text-lg font-semibold">Check-in confirmado às {manualTime}</div>
            <div className="text-sm text-muted-foreground mb-6">
              {sendWA
                ? "Registro salvo no sistema. Pronto para compartilhar."
                : "Registro salvo. WhatsApp não acionado automaticamente."}
            </div>
            
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 px-6 py-3 font-bold uppercase tracking-wider transition-colors"
            >
              Copiar Resumo (Ctrl+C)
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Hora real de saída" highlight>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-2xl font-bold font-mono text-success outline-none focus:border-success/50 focus:ring-1 focus:ring-success/50"
                />
              </Field>

              <Field label="Número do Carro / Placa">
                <input
                  type="text"
                  required
                  placeholder="Ex: 1205 ou ABC-1234"
                  value={bus}
                  onChange={(e) => setBus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm font-medium outline-none focus:border-primary uppercase"
                />
              </Field>

              <div className="md:col-span-2 rounded-xl border border-border bg-background/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Motorista Responsável
                  </div>
                  <button 
                    onClick={() => setIsCreatingDriver(!isCreatingDriver)}
                    className={cn(
                      "text-xs font-semibold flex items-center gap-1.5 transition-colors",
                      isCreatingDriver ? "text-danger hover:text-danger/80" : "text-primary hover:text-primary/80"
                    )}
                  >
                    {isCreatingDriver ? (
                      <><X className="size-3" /> Cancelar Cadastro</>
                    ) : (
                      <><UserPlus className="size-3" /> Novo Motorista</>
                    )}
                  </button>
                </div>

                {!isCreatingDriver ? (
                  <select
                    value={driverSelect}
                    onChange={(e) => setDriverSelect(e.target.value)}
                    disabled={loadingDrivers}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm font-medium outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">Selecione um motorista cadastrado...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} {d.status !== "ativo" ? `(${d.status})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nome Completo</label>
                      <input
                        type="text"
                        value={newDriverName}
                        onChange={e => setNewDriverName(e.target.value)}
                        placeholder="Ex: Carlos Silva"
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Linhas de Operação</label>
                      <input
                        type="text"
                        value={newDriverLines}
                        onChange={e => setNewDriverLines(e.target.value)}
                        placeholder="Ex: Itapetinga x Porto"
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}
                
                {/* Avaliação do Motorista */}
                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground block">Avaliar Serviço (Opcional)</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={cn(
                            "p-1 rounded-full transition-colors",
                            rating >= star ? "text-warning hover:text-warning/80" : "text-muted-foreground/30 hover:text-muted-foreground/60"
                          )}
                        >
                          <Star className="size-5" fill={rating >= star ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {rating > 0 && (
                    <p className="text-[10px] text-right text-muted-foreground mt-1">
                      {rating} estrela{rating > 1 ? "s" : ""} - Esta nota vai para o histórico do motorista.
                    </p>
                  )}
                </div>
              </div>

              <Field label="Encomendas (volumes)">
                <input
                  type="number"
                  value={packages}
                  onChange={(e) => setPackages(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm font-medium font-mono outline-none focus:border-primary"
                />
              </Field>
            </div>

            <div className="px-6 pb-6">
              <Field label="Observações (Encomendas / Viagem)">
                <textarea
                  value={packagesNotes}
                  onChange={(e) => setPackagesNotes(e.target.value)}
                  placeholder="Ex: 2 volumes sensíveis; bagageiro cheio..."
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary min-h-[60px] resize-none"
                />
              </Field>
            </div>

            <div className="border-t border-border bg-background/40 p-6">
              <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3">
                <input
                  type="checkbox"
                  checked={sendWA}
                  onChange={(e) => setSendWA(e.target.checked)}
                  className="size-4 accent-success"
                />
                <MessageCircle className="size-4 text-success" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Enviar para grupos WhatsApp</div>
                  <div className="text-[11px] text-muted-foreground">
                    CCO · Agência {trip.destination} · Supervisão de plantão
                  </div>
                </div>
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => onClose()}
                  className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-wider transition-transform hover:scale-[1.01]",
                    "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow-accent",
                    saving && "opacity-70",
                  )}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {saving ? "Salvando…" : "Confirmar check-in"}
                </button>
              </div>

              <button
                onClick={handleSos}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-danger hover:bg-danger/10"
              >
                <AlertTriangle className="size-3.5" /> Acionar SOS · carro quebrado
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  highlight,
  children,
}: {
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-widest",
          highlight ? "text-success" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
