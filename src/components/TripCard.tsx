import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, MapPin, Package, Phone, Send, User, X, Edit2, Trash2, Building2, ArrowDown, ArrowUp, ShieldCheck, RotateCcw } from "lucide-react";
import type { UiTrip, UiTripStatus } from "@/lib/trip-helpers";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  UiTripStatus,
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
  trip: UiTrip;
  isSelected?: boolean;
  onCheckIn: (trip: UiTrip) => void;
  onSOS: (trip: UiTrip) => void;
  onReport: (trip: UiTrip) => void;
  onEdit: (trip: UiTrip) => void;
  onDelete: (trip: UiTrip) => void;
  onEvaluate?: (trip: UiTrip) => void;
  onReset?: (trip: UiTrip) => void;
  partnerName?: string;
  index: number;
  onClick?: (trip: UiTrip) => void;
}

export function TripCard({ trip, isSelected, onCheckIn, onSOS, onReport, onEdit, onDelete, onEvaluate, onReset, partnerName, index, onClick }: Props) {
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
        onClick && "cursor-pointer hover:border-primary/50",
        meta.border,
        isSelected && "ring-2 ring-primary bg-primary/5",
        trip.status === "checked-in" && "opacity-80",
        trip.status === "delayed" && "shadow-glow-danger",
        trip.status === "imminent" && "shadow-glow-warning",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => onClick && onClick(trip)}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", meta.dot)} />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 p-4 sm:p-5 pl-5 sm:pl-6">
        <div className="flex gap-4 flex-1 min-w-0 items-start sm:items-center">
          {/* Time column */}
          <div className="w-16 sm:w-20 font-mono shrink-0">
            <div className={cn("text-lg sm:text-xl font-semibold tabular-nums", meta.color)}>
              {trip.departure}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              → {trip.arrival}
            </div>
          </div>
  
          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-mono">
                {trip.code}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                  meta.bg,
                  meta.color,
                  meta.border,
                )}
              >
                <span className={cn("mr-1 inline-block size-1.5 rounded-full align-middle", meta.dot, isPulsing && "animate-pulse")} />
                {meta.label}
              </span>
              {trip.direction && (
                <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap",
                  trip.direction === "descendo" ? "text-cyan-500 bg-cyan-500/10 border-cyan-500/30" : "text-orange-500 bg-orange-500/10 border-orange-500/30"
                )}>
                  {trip.direction === "descendo" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
                  {trip.direction === "descendo" ? "Descendo (Litoral)" : "Subindo (Interior)"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm sm:text-base font-medium leading-tight">
              <span className="truncate max-w-full">{trip.origin}</span>
              <span className="text-muted-foreground shrink-0">→</span>
              <span className="truncate max-w-full">{trip.destination}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
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
                  <Package className="size-3" /> {trip.packages} enc.
                </span>
              )}
              {partnerName && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Building2 className="size-3" /> {partnerName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 mt-2 sm:mt-0 w-full sm:w-auto border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0 shrink-0">
          {/* Ações de CRUD */}
          <div className="flex sm:gap-1 order-2 sm:order-first">
            {onReset && trip.status !== 'scheduled' && (
              <button onClick={(e) => { e.stopPropagation(); onReset(trip); }} className="p-1.5 text-muted-foreground hover:text-warning transition-colors rounded-md hover:bg-warning/10" title="Reiniciar Rota">
                <RotateCcw className="size-3.5" />
              </button>
            )}
            {onEvaluate && (
              <button onClick={(e) => { e.stopPropagation(); onEvaluate(trip); }} className="p-1.5 text-muted-foreground hover:text-success transition-colors rounded-md hover:bg-success/10" title="Avaliar Motorista">
                <ShieldCheck className="size-3.5" />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onEdit(trip); }} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10" title="Editar Frota">
              <Edit2 className="size-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(trip); }} className="p-1.5 text-muted-foreground hover:text-danger transition-colors rounded-md hover:bg-danger/10" title="Excluir Frota">
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {trip.status === "imminent" && (
            <>
              <div className="flex items-center sm:items-baseline gap-2">
                <Clock className={cn("size-3", meta.color)} />
                <span className="font-mono text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
                  {formatCountdown(countdown)}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onCheckIn(trip); }}
                className="rounded-md bg-warning px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-warning-foreground transition-transform hover:scale-[1.02] shadow-glow-warning"
              >
                Check-in
              </button>
            </>
          )}

          {trip.status === "delayed" && (
            <>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-danger">
                  Atraso
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-danger">
                  +{trip.delayMinutes}m
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onSOS(trip); }}
                  className="inline-flex items-center gap-1 rounded-md bg-danger px-3 py-2 text-xs font-bold uppercase tracking-wider text-danger-foreground animate-pulse-ring-danger"
                >
                  <AlertTriangle className="size-3.5" /> SOS
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onCheckIn(trip); }}
                  className="rounded-md border border-border bg-card px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-white/5"
                >
                  Regularizar
                </button>
              </div>
            </>
          )}

          {trip.status === "checked-in" && (
            <div onClick={(e) => e.stopPropagation()}>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <CheckCircle2 className="size-4" />
                <span>{trip.checkedInAt}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onReport(trip); }}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <Send className="size-3" /> Relatório
                </button>
              </div>
            </div>
          )}

          {trip.status === "scheduled" && (
            <>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Em
                </div>
                <div className="font-mono text-lg sm:text-xl font-semibold tabular-nums text-foreground/70">
                  {formatCountdown(countdown)}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onCheckIn(trip); }}
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
