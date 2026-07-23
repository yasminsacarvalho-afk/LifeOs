import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { Map, MapPin, Search, ArrowRight, Bus, Clock, CalendarDays, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search-routes")({
  component: SearchRoutesPage,
});

function SearchRoutesPage() {
  const { trips, loading } = useTripsRealtime();
  
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  
  // Extrai todas as cidades únicas que aparecem como origem, destino ou intermediárias
  const allCities = useMemo(() => {
    const cities = new Set<string>();
    trips.forEach(t => {
      if (t.origin) cities.add(t.origin.trim().toUpperCase());
      if (t.destination) cities.add(t.destination.trim().toUpperCase());
      if (t.cities && Array.isArray(t.cities)) {
        t.cities.forEach(c => cities.add(c.trim().toUpperCase()));
      }
    });
    return Array.from(cities).sort();
  }, [trips]);

  // Função para verificar se uma viagem atende o trajeto Origem -> Destino
  // Ela atende se a Origem vem ANTES do Destino na rota.
  const filteredTrips = useMemo(() => {
    if (!origin || !destination) return [];
    
    const ori = origin.trim().toUpperCase();
    const dest = destination.trim().toUpperCase();
    
    if (ori === dest) return [];
    
    return trips.filter(t => {
      // Cria a sequência de cidades da rota
      const routeSeq = [
        t.origin?.trim().toUpperCase(),
        ...(t.cities ? t.cities.map(c => c.trim().toUpperCase()) : []),
        t.destination?.trim().toUpperCase()
      ].filter(Boolean);
      
      const oriIndex = routeSeq.indexOf(ori);
      const destIndex = routeSeq.indexOf(dest);
      
      // Se ambas as cidades existem na rota E a origem vem antes do destino
      return oriIndex !== -1 && destIndex !== -1 && oriIndex < destIndex;
    }).sort((a, b) => a.scheduled_departure.localeCompare(b.scheduled_departure));
  }, [trips, origin, destination]);

  const now = new Date();
  const currentHourMinute = now.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const todayWeekDay = now.getDay();

  return (
    <>
      <TopBar
        title="Buscador de Rotas"
        subtitle="Descubra quais linhas atendem de uma cidade para outra."
      />

      <main className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto space-y-6">
        
        {/* Caixa de Busca */}
        <section className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Map className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-end gap-4 max-w-4xl">
            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <MapPin className="size-4" /> De onde? (Origem)
              </label>
              <select 
                value={origin} 
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full h-14 rounded-xl border border-border bg-background px-4 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
              >
                <option value="">Selecione a cidade de origem...</option>
                {allCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="hidden md:flex mb-4 text-muted-foreground">
              <ArrowRight className="size-6" />
            </div>

            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <MapPin className="size-4" /> Para onde? (Destino)
              </label>
              <select 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-14 rounded-xl border border-border bg-background px-4 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
              >
                <option value="">Selecione a cidade de destino...</option>
                {allCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Resultados */}
        {origin && destination && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              Rotas Encontradas <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">{filteredTrips.length}</span>
            </h2>

            {filteredTrips.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-3xl p-12 text-center">
                <MapPin className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma rota direta encontrada</h3>
                <p className="text-muted-foreground">Não temos registros de linhas que façam {origin} → {destination} diretamente.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTrips.map(trip => {
                  const runsToday = trip.operating_days ? trip.operating_days.includes(todayWeekDay) : true;
                  
                  let badgeText = "Não roda hoje";
                  let badgeClass = "bg-background border border-border text-muted-foreground";
                  let cardClass = "border-border";

                  if (runsToday) {
                    if (trip.status === "checked-in") {
                      if (trip.origin?.trim().toUpperCase() !== ori) {
                        badgeText = "Em Trânsito (A caminho)";
                        badgeClass = "bg-primary/15 text-primary animate-pulse";
                        cardClass = "border-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.1)]";
                      } else {
                        badgeText = "Já passou hoje";
                        badgeClass = "bg-muted text-muted-foreground";
                        cardClass = "border-border opacity-70";
                      }
                    } else if (trip.status === "delayed") {
                      badgeText = "Em Atraso na Origem";
                      badgeClass = "bg-danger/15 text-danger animate-pulse";
                      cardClass = "border-danger/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]";
                    } else if (trip.status === "imminent") {
                      badgeText = "Saindo em breve";
                      badgeClass = "bg-warning/15 text-warning animate-pulse";
                      cardClass = "border-warning/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
                    } else {
                      badgeText = "Ainda passa hoje";
                      badgeClass = "bg-success/15 text-success";
                      cardClass = "border-success/30 hover:border-success/50 transition-colors";
                    }
                  } else {
                    cardClass = "border-border opacity-50";
                  }

                  return (
                    <div key={trip.id} className={cn("bg-card border rounded-2xl p-5 transition-all hover:shadow-md", cardClass)}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold font-mono text-sm inline-flex items-center gap-2">
                          <Bus className="size-4" />
                          {trip.code}
                        </div>
                        <span className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded-md", badgeClass)}>
                          {badgeText}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Clock className="size-5 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground">Horário Agendado</div>
                            <div className="font-mono text-xl font-bold">{trip.scheduled_departure}</div>
                          </div>
                        </div>

                        <div className="bg-muted/30 rounded-xl p-3 text-sm">
                          <div className="flex items-center gap-2 mb-2 font-semibold">
                            <span className="truncate">{trip.origin}</span>
                            <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                            <span className="truncate">{trip.destination}</span>
                          </div>
                          
                          {trip.cities && trip.cities.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
                              <strong>Via:</strong> {trip.cities.join(" • ")}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                          <CalendarDays className="size-4" />
                          <span>
                            {!trip.operating_days || trip.operating_days.length === 7 
                              ? "Todos os dias" 
                              : `Roda ${trip.operating_days.length} dias por semana`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
