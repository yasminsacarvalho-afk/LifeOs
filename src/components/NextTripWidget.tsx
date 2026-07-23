import { useState, useEffect } from "react";
import { Clock, MapPin, ArrowDown, ArrowUp, Building2, Info, X, AlertTriangle, ArrowRight, Save, Loader2, Radar, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { UiTrip } from "@/lib/trip-helpers";

interface Partner {
  id: string;
  name: string;
}

interface Props {
  trips: UiTrip[];
  partners: Partner[];
  onCheckIn?: (trip: UiTrip) => void;
}

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

export function NextTripWidget({ trips, partners, onCheckIn }: Props) {
  const [now, setNow] = useState(new Date());
  const [selectedTrip, setSelectedTrip] = useState<UiTrip | null>(null);
  const [indicatedTime, setIndicatedTime] = useState("");
  const [isSavingTime, setIsSavingTime] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayWeekDay = now.getDay();
  
  // Filter for trips operating today that have not been checked in
  const pendingTrips = trips.filter(t => {
    const runsToday = t.operating_days ? t.operating_days.includes(todayWeekDay) : true;
    return runsToday && t.status !== "checked-in";
  });

  const descendoList = pendingTrips
    .filter(t => t.direction === "descendo")
    .sort((a, b) => new Date(a.raw_scheduled_departure!).getTime() - new Date(b.raw_scheduled_departure!).getTime());

  const subindoList = pendingTrips
    .filter(t => t.direction === "subindo")
    .sort((a, b) => new Date(a.raw_scheduled_departure!).getTime() - new Date(b.raw_scheduled_departure!).getTime());

  const getCloseTrips = (list: UiTrip[]) => {
    if (list.length === 0) return [];
    const first = list[0];
    const firstTime = new Date(first.raw_scheduled_departure!).getTime();
    
    return list.filter(t => {
      const diffMinutes = Math.abs(new Date(t.raw_scheduled_departure!).getTime() - firstTime) / 60000;
      return diffMinutes <= 45; // Within 45 minutes
    });
  };

  const nextDescendoTrips = getCloseTrips(descendoList);
  const nextSubindoTrips = getCloseTrips(subindoList);

  const renderTripCard = (closeTrips: UiTrip[], directionName: string, icon: React.ReactNode, colorClass: string, bgClass: string, borderClass: string) => {
    if (closeTrips.length === 0) {
      return (
        <div className={cn("flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed text-muted-foreground", borderClass, bgClass)}>
          <div className={cn("p-3 rounded-full mb-2 bg-background/50", colorClass)}>
            {icon}
          </div>
          <p className="text-sm font-medium">Nenhuma viagem {directionName} pendente hoje</p>
        </div>
      );
    }

    const trip = closeTrips[0];
    const concurrent = closeTrips.slice(1);

    const partner = partners.find(p => p.id === trip.company_id);
    const partnerNameStr = partner?.name?.toLowerCase() || "";
    const sched = new Date(trip.raw_scheduled_departure!).getTime();
    const diffSec = Math.round((sched - now.getTime()) / 1000);
    
    const isDelayed = diffSec < 0;
    const isImminent = diffSec >= 0 && diffSec <= 900; // 15 mins

    let alertBg = "bg-gradient-to-r from-danger/10 to-danger/5 border-danger/30";
    let alertIconBg = "bg-danger/20 text-danger";
    let alertTextMain = "text-danger";
    let alertTextLight = "text-danger/70 text-danger-foreground";
    let alertBorder = "border-danger/20";
    let alertInnerBorder = "border-danger/10";
    
    if (partnerNameStr.includes("rota")) {
      alertBg = "bg-gradient-to-r from-purple-900/15 to-purple-800/5 border-purple-900/30";
      alertIconBg = "bg-purple-900/20 text-purple-700 dark:text-purple-400";
      alertTextMain = "text-purple-700 dark:text-purple-400";
      alertTextLight = "text-purple-800 dark:text-purple-300";
      alertBorder = "border-purple-900/20";
      alertInnerBorder = "border-purple-900/10";
    } else if (partnerNameStr.includes("brasileiro")) {
      alertBg = "bg-gradient-to-r from-blue-600/15 to-blue-500/5 border-blue-600/30";
      alertIconBg = "bg-blue-600/20 text-blue-700 dark:text-blue-400";
      alertTextMain = "text-blue-700 dark:text-blue-400";
      alertTextLight = "text-blue-800 dark:text-blue-300";
      alertBorder = "border-blue-600/20";
      alertInnerBorder = "border-blue-600/10";
    } else if (partnerNameStr.includes("aguia") || partnerNameStr.includes("águia")) {
      alertBg = "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 shadow-sm";
      alertIconBg = "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100";
      alertTextMain = "text-gray-900 dark:text-gray-100";
      alertTextLight = "text-gray-700 dark:text-gray-300";
      alertBorder = "border-gray-300 dark:border-gray-700";
      alertInnerBorder = "border-gray-200 dark:border-gray-800";
    }

    return (
      <div 
        onClick={() => setSelectedTrip(trip)}
        className={cn(
          "relative overflow-hidden rounded-2xl border p-6 backdrop-blur-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-lg",
          isDelayed ? "border-danger/30 bg-gradient-to-br from-danger/10 to-background shadow-glow-danger" : 
          isImminent ? "border-warning/30 bg-gradient-to-br from-warning/10 to-background shadow-glow-warning" : 
          "border-border/50 bg-gradient-to-br from-card/80 to-background hover:border-primary/40 hover:shadow-glow-accent"
        )}
      >
        <div className={cn("absolute right-0 top-0 w-32 h-32 rounded-bl-full -z-10 opacity-30 transition-transform duration-500 group-hover:scale-110", bgClass, borderClass.replace('border-', 'bg-'))} />
        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div className="flex-1 pr-4 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 shadow-sm", bgClass, colorClass, borderClass.replace('border-', 'border border-'))}>
                {icon} {directionName}
              </span>
              <span className="text-[10px] font-mono font-semibold text-muted-foreground border border-border/50 px-2 py-1 rounded bg-background/50 shadow-inner">
                {trip.code}
              </span>
            </div>
            <h3 className="text-xl font-bold break-words tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
              {trip.origin} <span className="text-muted-foreground/60 font-light mx-1">→</span> {trip.destination}
            </h3>
            
            {trip.agent_indicated_time && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-warning/15 border border-warning/30 text-warning font-semibold text-xs shadow-inner">
                <Radar className="size-3.5 animate-pulse" />
                Previsão Agente (Rastreio): {trip.agent_indicated_time}
              </div>
            )}
          </div>
          
          <div className={cn(
            "flex flex-col items-end sm:justify-center rounded-xl px-4 py-2 border shadow-inner backdrop-blur-md shrink-0 w-full sm:w-auto",
            isDelayed ? "bg-danger/5 border-danger/20" : isImminent ? "bg-warning/5 border-warning/20" : "bg-primary/5 border-primary/20"
          )}>
            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
              <div className={cn(
                "text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 sm:mt-0.5 sm:order-last",
                isDelayed ? "text-danger/80" : isImminent ? "text-warning/80" : "text-primary/70"
              )}>
                {isDelayed ? "Em Atraso" : "Tempo Restante"}
              </div>
              <div className={cn(
                "font-mono text-2xl sm:text-3xl font-extrabold tracking-tighter tabular-nums",
                isDelayed ? "text-danger" : isImminent ? "text-warning" : "text-primary"
              )}>
                {formatCountdown(diffSec)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4 pt-4 border-t border-border/40">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary">
              <Clock className="size-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saída Programada</div>
              <div className="text-sm font-bold">{trip.departure}</div>
            </div>
          </div>
          
          {partner && (
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-full bg-secondary text-secondary-foreground">
                <Building2 className="size-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Operado Por</div>
                <div className="text-sm font-bold text-foreground">{partner.name}</div>
              </div>
            </div>
          )}

          {onCheckIn && (
            <div className="ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckIn(trip);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                Fazer Check-in
              </button>
            </div>
          )}
        </div>

        {concurrent.length > 0 && (
          <div className={cn("mt-5 rounded-xl border p-4 flex items-start gap-3 shadow-inner", alertBg)}>
            <div className={cn("p-2 rounded-full shrink-0 mt-0.5", alertIconBg)}>
              <AlertTriangle className="size-4 animate-pulse" />
            </div>
            <div className={cn("text-xs font-medium leading-relaxed w-full", alertTextLight)}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className={cn("font-bold", alertTextMain)}>ALERTA OPERACIONAL:</span> Há {concurrent.length} outr{concurrent.length > 1 ? 'os' : 'o'} embarque{concurrent.length > 1 ? 's' : ''} programado{concurrent.length > 1 ? 's' : ''} num intervalo de 45 minutos. Risco de gargalo.
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const text = `⚠️ *ALERTA DE GARGALO OPERACIONAL*
Próximos embarques num intervalo de 45 minutos:

${concurrent.map(c => `- *${c.departure}* (${c.origin} -> ${c.destination}) - ${partners.find(p => p.id === c.company_id)?.name || 'Sem empresa'}`).join('\n')}
`;
                    navigator.clipboard.writeText(text);
                    alert("Resumo do alerta copiado!");
                  }}
                  className={cn("inline-flex items-center gap-1.5 shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors", alertIconBg)}
                >
                  <Copy className="size-3" /> Copiar Alerta
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-2 w-full">
                {concurrent.map(c => (
                  <div key={c.id} className={cn("flex flex-col bg-background/60 rounded-lg px-3 py-2 border w-full shadow-sm", alertBorder)}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-1 sm:gap-0">
                      <span className={cn("font-bold font-mono text-sm", alertTextMain)}>{c.departure}</span>
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className={cn("bg-background/80 px-1.5 py-0.5 rounded text-[10px] font-mono border", alertInnerBorder)}>{c.code}</span>
                        <span>{partners.find(p => p.id === c.company_id)?.name || 'Sem empresa'}</span>
                      </span>
                    </div>
                    <div className={cn("text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5 border-t pt-1.5 mt-0.5 opacity-80", alertInnerBorder)}>
                      <MapPin className="size-3" />
                      <span className="truncate">{c.origin}</span>
                      <ArrowRight className="size-3 shrink-0 opacity-70" />
                      <span className="truncate">{c.destination}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (nextDescendoTrips.length === 0 && nextSubindoTrips.length === 0) return null;

  return (
    <>
      <section className="mb-8">
        <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
           Atendimento
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {renderTripCard(nextDescendoTrips, "Descendo (Litoral)", <ArrowDown className="size-4" />, "text-cyan-500", "bg-cyan-500/10", "border-cyan-500/30")}
          {renderTripCard(nextSubindoTrips, "Subindo (Interior)", <ArrowUp className="size-4" />, "text-orange-500", "bg-orange-500/10", "border-orange-500/30")}
        </div>
      </section>

      {/* Details Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedTrip(null)}>
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedTrip(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>
            
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Info className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Protocolo: {selectedTrip.code}</h3>
                <p className="text-sm text-muted-foreground">Informações da Viagem</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <Radar className="size-3 text-warning" />
                  Horário Indicado (Rastreio)
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={indicatedTime || selectedTrip.agent_indicated_time || ""}
                    onChange={e => setIndicatedTime(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono focus:border-warning focus:outline-none focus:ring-1 focus:ring-warning"
                  />
                  <button
                    disabled={isSavingTime || (!indicatedTime && !selectedTrip.agent_indicated_time)}
                    onClick={async () => {
                      setIsSavingTime(true);
                      try {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const timeToSave = indicatedTime ? `${todayStr}|${indicatedTime}` : null;
                        await supabase.from("trips").update({ 
                          agent_indicated_time: timeToSave,
                          updated_at: new Date().toISOString() 
                        }).eq("id", selectedTrip.id);
                        
                        // Keep only the HH:MM part for the immediate UI reflection
                        selectedTrip.agent_indicated_time = indicatedTime || null;
                      } catch(e) {
                        console.error(e);
                      } finally {
                        setIsSavingTime(false);
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg bg-warning px-3 py-2 text-xs font-bold text-warning-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {isSavingTime ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Caso o carro atrase por algum imprevisto, insira aqui o novo horário previsto para sinalizar no painel.
                </p>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Empresa Parceira</div>
                <div className="font-semibold flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  {partners.find(p => p.id === selectedTrip.company_id)?.name || "N/A"}
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Cidades Atendidas</div>
                {selectedTrip.cities && selectedTrip.cities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTrip.cities.map(city => (
                      <span key={city} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        <MapPin className="size-3" /> {city}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm italic text-muted-foreground">Nenhuma cidade intermediária informada.</div>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedTrip(null)}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow-sm"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
