import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import type { UiTrip } from "@/lib/trip-helpers";

interface TripFormModalProps {
  trip?: UiTrip | null;
  open: boolean;
  onClose: () => void;
}

export function TripFormModal({ trip, open, onClose }: TripFormModalProps) {
  const { partners } = usePartnersRealtime();
  
  const [code, setCode] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routeName, setRouteName] = useState("");
  const [originCode, setOriginCode] = useState("");
  const [destinationCode, setDestinationCode] = useState("");
  const [scheduledDeparture, setScheduledDeparture] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [historicalCities, setHistoricalCities] = useState<string[]>([]);
  const [direction, setDirection] = useState("descendo");
  const [operatingDays, setOperatingDays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [hideFromDashboard, setHideFromDashboard] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("trips").select("cities").then(({ data }) => {
      if (data) {
        const unique = new Set<string>();
        data.forEach(t => t.cities?.forEach(c => unique.add(c)));
        setHistoricalCities(Array.from(unique).sort());
      }
    });
  }, []);

  useEffect(() => {
    if (open) {
      if (trip) {
        setCode(trip.code);
        setOrigin(trip.origin);
        setDestination(trip.destination);
        setRouteName(trip.route_name || "");
        setOriginCode(trip.origin_code || "");
        setDestinationCode(trip.destination_code || "");
        setCompanyId(trip.company_id || "");
        
        // Format datetime-local from ISO
        const dt = new Date(trip.raw_scheduled_departure || trip.departure);
        const isoLocal = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        setScheduledDeparture(isoLocal);
        
        setCarPlate(trip.bus || "");
        setDriverName(trip.driver || "");
        setSelectedCities(trip.cities || []);
        setDirection(trip.direction || "descendo");
        setOperatingDays(trip.operating_days || [0,1,2,3,4,5,6]);
        setHideFromDashboard(trip.hide_from_dashboard || false);
      } else {
        setCode("");
        setOrigin("");
        setDestination("");
        setRouteName("");
        setOriginCode("");
        setDestinationCode("");
        setCompanyId("");
        
        // Default to now
        const now = new Date();
        const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        setScheduledDeparture(isoLocal);
        
        setCarPlate("");
        setDriverName("");
        setSelectedCities([]);
        setDirection("descendo");
        setOperatingDays([0,1,2,3,4,5,6]);
        setHideFromDashboard(false);
      }
    }
  }, [trip, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !origin || !destination || !scheduledDeparture) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);

    // Convert local datetime to UTC ISO string
    const dateUtc = new Date(scheduledDeparture).toISOString();

    const payload = {
      code,
      origin,
      destination,
      route_name: routeName || null,
      origin_code: originCode || null,
      destination_code: destinationCode || null,
      scheduled_departure: dateUtc,
      company_id: companyId || null,
      car_plate: carPlate || null,
      driver_name: driverName || null,
      cities: selectedCities.length > 0 ? selectedCities : null,
      direction,
      operating_days: operatingDays,
      hide_from_dashboard: hideFromDashboard,
    };

    try {
      if (trip) {
        await supabase.from("trips").update(payload).eq("id", trip.id);
      } else {
        await supabase.from("trips").insert([payload]);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar frota/viagem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0A0A0A] p-8 shadow-2xl animate-in zoom-in-95 duration-200 hide-scrollbar">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {trip ? "Editar Frota / Viagem" : "Nova Frota / Viagem"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure os parâmetros operacionais, rota e horários.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SEÇÃO 1: Identificação Operacional */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Identificação Operacional</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Código da Frota / Serviço <span className="text-[#8A05BE]">*</span></label>
                <input
                  type="text"
                  placeholder="Ex: 0425"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Linha (Nome da Rota)</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo x P. Seguro"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 flex items-center justify-between">
                  <span>Empresa Parceira</span>
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] transition-all"
                >
                  <option value="" className="bg-black">-- Nenhuma --</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id} className="bg-black text-white">{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Parametrização de Rota */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Parametrização de Rota</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/70">Origem <span className="text-[#8A05BE]">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cód (Ex: SPO)"
                    value={originCode}
                    onChange={(e) => setOriginCode(e.target.value)}
                    className="w-24 rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] uppercase text-center transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Nome (Ex: São Paulo)"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    required
                    className="flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/70">Destino <span className="text-[#8A05BE]">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cód (Ex: BPS)"
                    value={destinationCode}
                    onChange={(e) => setDestinationCode(e.target.value)}
                    className="w-24 rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] uppercase text-center transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Nome (Ex: Porto Seguro)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    className="flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                <label className="text-xs font-semibold text-white/70">Sentido da Viagem</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] transition-all"
                >
                  <option value="descendo" className="bg-black">Descendo (Para o Litoral)</option>
                  <option value="subindo" className="bg-black">Subindo (Para o Interior)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/70">Horário Programado <span className="text-[#8A05BE]">*</span></label>
                <input
                  type="time"
                  value={scheduledDeparture.split('T')[1]?.substring(0, 5) || "00:00"}
                  onChange={(e) => {
                    const datePart = scheduledDeparture.split('T')[0] || new Date().toISOString().split('T')[0];
                    setScheduledDeparture(`${datePart}T${e.target.value}`);
                  }}
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] transition-all"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Detalhes Adicionais */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
             <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Detalhes da Operação</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Placa do Veículo</label>
                <input
                  type="text"
                  placeholder="Ex: ABC-1234"
                  value={carPlate}
                  onChange={(e) => setCarPlate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] transition-all uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Nome do Motorista</label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <label className="text-xs font-semibold text-white/70 block">Cidades de Embarque / Desembarque</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedCities.map(c => (
                  <span key={c} className="bg-[#8A05BE]/20 border border-[#8A05BE]/30 text-white px-3 py-1 rounded-md text-xs flex items-center gap-2 font-medium">
                    {c} 
                    <button type="button" onClick={() => setSelectedCities(selectedCities.filter(x => x !== c))} className="hover:text-danger transition-colors">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite o nome da cidade e aperte Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val && !selectedCities.includes(val)) {
                        setSelectedCities([...selectedCities, val]);
                      }
                      e.currentTarget.value = "";
                    }
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8A05BE] transition-all"
                  list="historical-cities"
                />
                <datalist id="historical-cities">
                  {historicalCities.filter(c => !selectedCities.includes(c)).map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 block">Frequência (Dias da Semana)</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Dom', val: 0 },
                  { label: 'Seg', val: 1 },
                  { label: 'Ter', val: 2 },
                  { label: 'Qua', val: 3 },
                  { label: 'Qui', val: 4 },
                  { label: 'Sex', val: 5 },
                  { label: 'Sáb', val: 6 },
                ].map(day => (
                  <label key={day.val} className={`flex items-center justify-center min-w-[50px] cursor-pointer border px-3 py-2 rounded-lg transition-all text-xs font-semibold ${operatingDays.includes(day.val) ? 'bg-[#8A05BE] border-[#8A05BE] text-white shadow-lg' : 'bg-black/50 border-white/10 text-muted-foreground hover:border-white/30'}`}>
                    <input
                      type="checkbox"
                      checked={operatingDays.includes(day.val)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setOperatingDays([...operatingDays, day.val].sort());
                        } else {
                          setOperatingDays(operatingDays.filter(d => d !== day.val));
                        }
                      }}
                      className="hidden"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
            <div className="pt-0.5">
              <input
                type="checkbox"
                id="hideDashboard"
                checked={hideFromDashboard}
                onChange={(e) => setHideFromDashboard(e.target.checked)}
                className="size-5 accent-danger rounded bg-black border-white/10 cursor-pointer"
              />
            </div>
            <div>
              <label htmlFor="hideDashboard" className="text-sm font-bold text-danger cursor-pointer block">Ocultar do Monitor de Frotas Diário</label>
              <p className="text-xs text-danger/70 mt-1">
                Ao marcar esta opção, o registro serve apenas para cadastrar a inteligência de código e rota, mas não vai aparecer na tabela de controle operacional do dia.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8A05BE] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg hover:shadow-[#8A05BE]/20 disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : <><Save className="size-4" /> Salvar Configuração</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
