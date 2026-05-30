import { useEffect, useState } from "react";
import { X, Send, AlertTriangle, CheckCircle2, MessageCircle } from "lucide-react";
import type { Trip } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface Props {
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
}

const buses = ["G8 1205 (Scania K400)", "G7 1102 (Volvo 9800)", "DD 980 (Marcopolo Paradiso)"];
const drivers = ["Claudio Mendonça", "Marcos Oliveira", "Roberto Dias", "Valdir Pereira"];

export function CheckinModal({ trip, open, onClose }: Props) {
  const [bus, setBus] = useState(buses[0]);
  const [driver, setDriver] = useState(drivers[0]);
  const [packages, setPackages] = useState("12");
  const [sendWA, setSendWA] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setBus(buses[0]);
      setDriver(drivers[0]);
      setPackages("12");
    }
  }, [open, trip]);

  if (!open || !trip) return null;

  const time = now.toLocaleTimeString("pt-BR", { hour12: false });

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      onClose();
    }, 1600);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 px-4 backdrop-blur-md animate-slide-up"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            onClick={onClose}
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
            <div className="text-lg font-semibold">Check-in confirmado às {time}</div>
            <div className="text-sm text-muted-foreground">
              {sendWA
                ? "Resumo enviado aos grupos operacionais via WhatsApp."
                : "Registro salvo. WhatsApp não acionado."}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Hora real de saída" highlight>
                <div className="font-mono text-3xl font-bold tabular-nums text-success">
                  {time}
                </div>
              </Field>

              <Field label="Carro escalado">
                <select
                  value={bus}
                  onChange={(e) => setBus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm font-medium outline-none focus:border-primary"
                >
                  {buses.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Motorista responsável">
                <select
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm font-medium outline-none focus:border-primary"
                >
                  {drivers.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Encomendas (volumes)">
                <input
                  type="number"
                  value={packages}
                  onChange={(e) => setPackages(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm font-medium font-mono outline-none focus:border-primary"
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
                  onClick={onClose}
                  className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-wider transition-transform hover:scale-[1.01]",
                    "bg-gradient-to-r from-primary to-[oklch(0.7_0.16_295)] text-primary-foreground shadow-glow-accent",
                  )}
                >
                  <Send className="size-4" />
                  Confirmar check-in
                </button>
              </div>

              <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-danger hover:bg-danger/10">
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
