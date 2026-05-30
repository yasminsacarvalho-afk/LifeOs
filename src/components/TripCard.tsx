import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, MapPin, Package, Phone, Send, User, X } from "lucide-react";
import type { Trip, TripStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  TripStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  "checked-in": {
    label: "Check-in realizado",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    dot: "bg-success",
  },
  imminent: {
    label: "Embarque iminente",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/40",
    dot: "bg-warning",
  },
  delayed: {
    label: "Atrasado · sem check-in",
    color: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/40",
    dot: "bg-danger",
  },
  scheduled: {
    label: "Programado",
    color: "text-muted-foreground",
    bg: "bg-white/5",
    border: "border-border",
    dot: "bg-muted-foreground/50",
  },
};

function formatCountdown(seconds: number) {
  const sign = seconds < 0 ? "-" : "";
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) {
    return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  trip: Trip;
  onCheckIn: (trip: Trip) => void;
  onSOS: (trip: Trip) => void;
  onReport: (trip: Trip) => void;
  index: number;
}

export function TripCard({ trip, onCheckIn, onSOS, onReport, index }: Props) {
  const meta = statusMeta[trip.status];
  const [countdown, setCountdown] = useState(trip.countdownSeconds ?? 0);

  useEffect(() => {
    if (trip.status !== "imminent" && trip.status !== "scheduled") return;
    setCountdown(trip.countdownSeconds ?? 0);
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [trip.countdownSeconds, trip.status]);

  const isPulsing = trip.status === "imminent" || trip.status === "delayed";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card/70 backdrop-blur-sm transition-all animate-slide-up",
        meta.border,
        trip.status === "checked-in" && "opacity-80",
        trip.status === "delayed" && "shadow-glow-danger",
        trip.status === "imminent" && "shadow-glow-warning",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", meta.dot)} />

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-5 p-5 pl-6">
        {/* Time column */}
        <div className="w-20 font-mono">
          <div className={cn("text-xl font-semibold tabular-nums", meta.color)}>
            {trip.departure}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            → {trip.arrival}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-mono">
              {trip.code}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                meta.bg,
                meta.color,
                meta.border,
              )}
            >
              <span className={cn("mr-1 inline-block size-1.5 rounded-full align-middle", meta.dot, isPulsing && "animate-pulse")} />
              {meta.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-base font-medium">
            <span className="truncate">{trip.origin}</span>
            <span className="text-muted-foreground">→</span>
            <span className="truncate">{trip.destination}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {trip.route}
            </span>
            <span>· {trip.service}</span>
            {trip.bus && <span className="font-mono">· {trip.bus}</span>}
            {trip.driver && (
              <span className="inline-flex items-center gap-1">
                <User className="size-3" /> {trip.driver}
              </span>
            )}
            {trip.packages !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Package className="size-3" /> {trip.packages} encomendas
              </span>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex flex-col items-end gap-2">
          {trip.status === "imminent" && (
            <>
              <div className="flex items-baseline gap-2">
                <Clock className={cn("size-3", meta.color)} />
                <span className="font-mono text-2xl font-bold tabular-nums tracking-tight">
                  {formatCountdown(countdown)}
                </span>
              </div>
              <button
                onClick={() => onCheckIn(trip)}
                className="rounded-md bg-warning px-4 py-2 text-xs font-bold uppercase tracking-wider text-warning-foreground transition-transform hover:scale-[1.02] shadow-glow-warning"
              >
                Realizar Check-in
              </button>
            </>
          )}

          {trip.status === "delayed" && (
            <>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-danger">
                  Atraso
                </div>
                <div className="font-mono text-2xl font-bold text-danger">
                  +{trip.delayMinutes}m
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSOS(trip)}
                  className="inline-flex items-center gap-1 rounded-md bg-danger px-3 py-2 text-xs font-bold uppercase tracking-wider text-danger-foreground animate-pulse-ring-danger"
                >
                  <AlertTriangle className="size-3.5" /> SOS
                </button>
                <button
                  onClick={() => onCheckIn(trip)}
                  className="rounded-md border border-border bg-card px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-white/5"
                >
                  Regularizar
                </button>
              </div>
            </>
          )}

          {trip.status === "checked-in" && (
            <>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <CheckCircle2 className="size-4" />
                <span>{trip.checkedInAt}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onReport(trip)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <Send className="size-3" /> Relatório
                </button>
              </div>
            </>
          )}

          {trip.status === "scheduled" && (
            <>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Em
                </div>
                <div className="font-mono text-xl font-semibold tabular-nums text-foreground/70">
                  {formatCountdown(countdown)}
                </div>
              </div>
              <button
                onClick={() => onCheckIn(trip)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Antecipar check-in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { X, Phone };
