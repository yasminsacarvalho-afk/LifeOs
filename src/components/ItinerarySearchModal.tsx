import { useState, useMemo } from "react";
import { Search, X, MapPin, Building2, Calendar, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UiTrip } from "@/lib/trip-helpers";

interface Partner {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  trips: UiTrip[];
  partners: Partner[];
}

const DAYS_MAP: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

// Remove acentos e deixa minúsculo para busca exata
const normalizeString = (str: string) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

export function ItinerarySearchModal({ open, onClose, trips, partners }: Props) {
  const [searchOrigin, setSearchOrigin] = useState("");
  const [searchDest, setSearchDest] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const results = useMemo(() => {
    if (!hasSearched) return [];
    
    const normSearchOrigin = normalizeString(searchOrigin);
    const normSearchDest = normalizeString(searchDest);

    if (!normSearchOrigin || !normSearchDest) return [];

    return trips.filter(trip => {
      // Monta o trajeto completo: Origem -> Cidades Intermediárias -> Destino
      const fullRoute = [trip.origin, ...(trip.cities || []), trip.destination].map(normalizeString);
      
      // Procura o índice das cidades buscando a correspondência exata ou parcial (ex: "vitoria" acha "vitoria da conquista")
      // Vamos tentar um "includes" em cada cidade, mas garantindo a ordem.
      const originIndex = fullRoute.findIndex(city => city.includes(normSearchOrigin));
      
      if (originIndex === -1) return false;

      // A partir de onde achou a origem, procura o destino
      const remainingRoute = fullRoute.slice(originIndex + 1);
      const destIndex = remainingRoute.findIndex(city => city.includes(normSearchDest));

      return destIndex !== -1;
    }).sort((a, b) => {
      // Ordena pelo horário de saída
      return (a.departure || "").localeCompare(b.departure || "");
    });
  }, [trips, searchOrigin, searchDest, hasSearched]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        
        {/* Header e Formulário */}
        <div className="p-6 border-b border-border bg-background/50 backdrop-blur-sm shrink-0">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Search className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Buscar Itinerário</h2>
              <p className="text-sm text-muted-foreground">Descubra quais frotas atendem sua rota.</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Origem</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Ex: Itambe"
                  value={searchOrigin}
                  onChange={e => { setSearchOrigin(e.target.value); setHasSearched(false); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  required
                />
              </div>
            </div>
            
            <div className="hidden sm:flex items-center justify-center pb-3 px-2">
              <ArrowRight className="size-5 text-muted-foreground" />
            </div>

            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Destino</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Ex: Porto Seguro"
                  value={searchDest}
                  onChange={e => { setSearchDest(e.target.value); setHasSearched(false); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-glow-accent hover:opacity-90 transition-opacity"
            >
              Pesquisar
            </button>
          </form>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12 opacity-60">
              <MapPin className="size-12 mb-4" />
              <p className="font-medium text-lg">Digite a origem e o destino para começar.</p>
              <p className="text-sm">O sistema pesquisará todas as rotas e cidades intermediárias.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <Search className="size-12 mb-4 opacity-40" />
              <p className="font-medium text-lg text-foreground">Nenhuma rota encontrada</p>
              <p className="text-sm">Não há veículos que partam de "{searchOrigin}" com destino a "{searchDest}".</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground mb-4">
                {results.length} viage{results.length > 1 ? 'ns' : 'm'} encontrada{results.length > 1 ? 's' : ''}
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                {results.map(trip => {
                  const partner = partners.find(p => p.id === trip.company_id);
                  
                  return (
                    <div key={trip.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary mb-2">
                            <Clock className="size-3" /> {trip.departure}
                          </span>
                          <h4 className="font-bold text-foreground line-clamp-2">
                            {trip.origin} <ArrowRight className="inline size-3 text-muted-foreground" /> {trip.destination}
                          </h4>
                          <div className="text-xs text-muted-foreground font-mono mt-1">
                            Código: {trip.code}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-border/50">
                        {/* Empresa */}
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shrink-0">
                            <Building2 className="size-3.5" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operadora</div>
                            <div className="text-sm font-semibold">{partner?.name || "Desconhecida"}</div>
                          </div>
                        </div>

                        {/* Dias de Operação */}
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
                            <Calendar className="size-3.5" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dias Ativos</div>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {trip.operating_days && trip.operating_days.length > 0 ? (
                                trip.operating_days.map(day => (
                                  <span key={day} className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded font-medium text-foreground">
                                    {DAYS_MAP[day]}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs italic text-muted-foreground">Não informados</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
