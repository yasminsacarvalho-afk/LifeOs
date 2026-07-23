import { X, MapPin, Building2, Info, RefreshCw, FileText } from "lucide-react";
import type { UiTrip } from "@/lib/trip-helpers";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";

interface TripDetailsModalProps {
  trip: UiTrip | null;
  open: boolean;
  onClose: () => void;
}

export function TripDetailsModal({ trip, open, onClose }: TripDetailsModalProps) {
  const { partners } = usePartnersRealtime();

  if (!open || !trip) return null;

  const partner = partners.find(p => p.id === trip.company_id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="mb-6 border-b border-border/50 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                <span>{trip.origin}</span>
                <span className="text-muted-foreground/30 font-normal">&rarr;</span>
                <span>{trip.destination}</span>
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 font-mono bg-card w-fit px-2 py-1 rounded-md border border-border/50">
                <span>Frota {trip.code}</span>
                {trip.bus && <span>· Placa {trip.bus}</span>}
              </div>
            </div>
            
            {partner && (
              <div className="flex flex-col sm:items-end bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                <span className="text-lg sm:text-xl font-extrabold text-primary flex items-center gap-1.5">
                  <Building2 className="size-5" /> {partner.name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Cidades Atendidas */}
          <div className="rounded-xl border border-border bg-background/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
              <MapPin className="size-4" /> Cidades Atendidas
            </h3>
            {trip.cities && trip.cities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trip.cities.map((city, idx) => (
                  <span key={idx} className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/20">
                    {city}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma cidade intermediária cadastrada para esta rota.</p>
            )}
          </div>

          {/* Regras da Empresa Parceira */}
          <div className="rounded-xl border border-border bg-background/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
              <Building2 className="size-4" /> Informações da Parceira: {partner?.name || "N/A"}
            </h3>
            
            {!partner ? (
              <p className="text-sm text-muted-foreground">Nenhuma empresa parceira vinculada a esta viagem.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <FileText className="size-3" /> Protocolo Padrão
                  </span>
                  <p className="text-sm bg-card p-2 rounded-md border border-border/50 min-h-[40px]">
                    {partner.protocolo || "Não definido"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="size-3" /> Política de Troca
                  </span>
                  <p className="text-sm bg-card p-2 rounded-md border border-border/50 min-h-[40px]">
                    {partner.politica_troca || "Não definida"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="size-3" /> Política de Devolução
                  </span>
                  <p className="text-sm bg-card p-2 rounded-md border border-border/50 min-h-[40px]">
                    {partner.politica_devolucao || "Não definida"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Info className="size-3" /> Outras Informações
                  </span>
                  <p className="text-sm bg-card p-2 rounded-md border border-border/50 min-h-[40px]">
                    {partner.mais_informacoes || "Nenhuma informação adicional"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
