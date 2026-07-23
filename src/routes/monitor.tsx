import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileText, MessageCircle, Send, CheckCircle2, RotateCcw, X, Eye, EyeOff } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { TripCard } from "@/components/TripCard";
import { CheckinModal } from "@/components/CheckinModal";
import { TripFormModal } from "@/components/TripFormModal";
import { TripDetailsModal } from "@/components/TripDetailsModal";
import { ItinerarySearchModal } from "@/components/ItinerarySearchModal";
import { DriverEvaluationModal } from "@/components/DriverEvaluationModal";
import { CityCodesModal } from "@/components/CityCodesModal";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { supabase } from "@/integrations/supabase/client";
import type { UiTrip } from "@/lib/trip-helpers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monitor")({
  head: () => ({
    meta: [
      { title: "Torre de Controle · Agência de itambé" },
      {
        name: "description",
        content:
          "Painel operacional em tempo real das viagens do dia: timeline cronológica, alertas visuais, check-in e integração WhatsApp.",
      },
    ],
  }),
  component: MonitorPage,
});

type Filter = "todas" | "imminent" | "delayed" | "checked-in" | "scheduled";

function MonitorPage() {
  const { trips, loading } = useTripsRealtime();
  const { partners } = usePartnersRealtime();

  const [activeTrip, setActiveTrip] = useState<UiTrip | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<UiTrip | null>(null);
  const [activeDetailsTrip, setActiveDetailsTrip] = useState<UiTrip | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [cityCodesModalOpen, setCityCodesModalOpen] = useState(false);
  
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalTrip, setEvalTrip] = useState<UiTrip | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());

  const [filter, setFilter] = useState<Filter>("todas");
  const [companyFilter, setCompanyFilter] = useState<string>("todas");
  const [directionFilter, setDirectionFilter] = useState<string>("todas");
  const [showHidden, setShowHidden] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const todayWeekDay = new Date().getDay();

  const operatingTrips = useMemo(() => {
    return trips.filter(t => {
      if (!showHidden && t.hide_from_dashboard) return false;
      return t.operating_days ? t.operating_days.includes(todayWeekDay) : true;
    });
  }, [trips, todayWeekDay, showHidden]);

  const counts = useMemo(() => {
    return {
      total: operatingTrips.length,
      checkedIn: operatingTrips.filter((t) => t.status === "checked-in").length,
      imminent: operatingTrips.filter((t) => t.status === "imminent").length,
      delayed: operatingTrips.filter((t) => t.status === "delayed").length,
      scheduled: operatingTrips.filter((t) => t.status === "scheduled").length,
    };
  }, [operatingTrips]);

  const filtered = useMemo(() => {
    let result = operatingTrips;
    if (companyFilter !== "todas") {
      result = result.filter(t => t.company_id === companyFilter);
    }
    if (directionFilter !== "todas") {
      result = result.filter(t => t.direction === directionFilter);
    }
    if (filter !== "todas") {
      result = result.filter(t => t.status === filter);
    }
    return result;
  }, [operatingTrips, filter, companyFilter, directionFilter]);

  const handleOpenCheckin = (trip: UiTrip) => {
    setActiveTrip(trip);
    setModalOpen(true);
  };

  const handleCloseCheckin = (result?: { sentWa: boolean }) => {
    if (result && activeTrip) {
      showToast(
        result.sentWa
          ? `✅ Check-in ${activeTrip.code} enviado ao WhatsApp operacional`
          : `✅ Check-in ${activeTrip.code} registrado`,
      );
    }
    setModalOpen(false);
    setActiveTrip(null);
  };

  const handleOpenForm = (trip?: UiTrip) => {
    setEditingTrip(trip || null);
    setFormModalOpen(true);
  };

  const handleDeleteTrip = async (trip: UiTrip) => {
    if (confirm(`Tem certeza que deseja excluir a frota ${trip.code}?`)) {
      try {
        await supabase.from("trips").delete().eq("id", trip.id);
        showToast(`🗑️ Frota ${trip.code} excluída com sucesso`);
      } catch (e) {
        showToast(`❌ Erro ao excluir frota`);
      }
    }
  };

  const handleResetDay = async () => {
    if (confirm("ATENÇÃO: Isto irá reiniciar a Torre de Controle, voltando todas as frotas para o status 'Programado'. Deseja iniciar um novo dia de operação?")) {
      try {
        const ids = trips.map(t => t.id);
        if (ids.length > 0) {
          await supabase.from("trips").update({ status: "scheduled", real_departure: null }).in("id", ids);
        }
        showToast("🌅 Novo dia iniciado. Frotas reiniciadas.");
      } catch(e) {
        showToast("❌ Erro ao reiniciar as frotas.");
      }
    }
  };

  const handleResetTrip = async (trip: UiTrip) => {
    if (confirm(`Tem certeza que deseja reiniciar a rota ${trip.code}? Ela voltará para o status 'Programado'.`)) {
      try {
        await supabase.from("trips").update({ status: "scheduled", real_departure: null }).eq("id", trip.id);
        showToast(`🔄 Rota ${trip.code} reiniciada`);
      } catch (e) {
        showToast(`❌ Erro ao reiniciar rota`);
      }
    }
  };

  const handleBulkReset = async () => {
    if (selectedTrips.size === 0) return;
    if (confirm(`Tem certeza que deseja reiniciar ${selectedTrips.size} rotas? Elas voltarão para 'Programado'.`)) {
      try {
        const ids = Array.from(selectedTrips);
        await supabase.from("trips").update({ status: "scheduled", real_departure: null }).in("id", ids);
        showToast(`🔄 ${selectedTrips.size} rotas reiniciadas`);
        setSelectedTrips(new Set());
        setIsSelectionMode(false);
      } catch (e) {
        showToast(`❌ Erro ao reiniciar rotas`);
      }
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTrips.size === 0) return;
    if (confirm(`Tem certeza que deseja regularizar (marcar como concluída) ${selectedTrips.size} rotas?`)) {
      try {
        const ids = Array.from(selectedTrips);
        const now = new Date().toISOString();
        await supabase.from("trips").update({ status: "checked_in", real_departure: now }).in("id", ids);
        showToast(`✅ ${selectedTrips.size} rotas regularizadas com sucesso`);
        setSelectedTrips(new Set());
        setIsSelectionMode(false);
      } catch (e) {
        showToast(`❌ Erro ao regularizar rotas`);
      }
    }
  };

  const handleSOS = async (trip: UiTrip) => {
    await supabase.from("sos_alerts").insert({
      trip_id: trip.id,
      message: `SOS · ${trip.code} · carro quebrado entre ${trip.origin} e ${trip.destination}`,
      severity: "high",
    });
    showToast(`🚨 SOS acionado · ${trip.code} · CCO e agência ${trip.destination} notificados`);
  };

  const handleReport = (trip: UiTrip) => {
    showToast(`📋 Relatório de ${trip.code} pronto para compartilhar`);
  };

  const handleEvaluate = (trip: UiTrip) => {
    setEvalTrip(trip);
    setEvalModalOpen(true);
  };


  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <>
      <TopBar
        title="Torre de Controle"
        subtitle="Gerencie as viagens, acompanhe as rotas e centralize a comunicação."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedTrips(new Set());
              }}
              className={cn("inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all shadow-sm",
                isSelectionMode ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-white/5"
              )}
            >
              <CheckCircle2 className="size-4" />
              {isSelectionMode ? "Sair" : "Selecionar"}
            </button>
            <button
              onClick={() => handleOpenForm()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-all shadow-sm"
            >
              Nova Viagem
            </button>
            <button
              onClick={() => setCityCodesModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#8A05BE] text-white px-4 py-2 text-sm font-medium hover:bg-[#8A05BE]/90 transition-all shadow-sm"
            >
              Dicionário
            </button>
            <button
              onClick={() => setSearchModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-info/20 text-info px-4 py-2 text-sm font-medium hover:bg-info/30 transition-all shadow-sm"
            >
              Buscar Rota
            </button>
            <button
              onClick={handleResetDay}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-danger/20 border border-danger/50 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/30 transition-all shadow-sm"
            >
              Reiniciar Dia
            </button>
            <button
              onClick={() => setShowHidden(!showHidden)}
              className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all shadow-sm",
                showHidden ? "bg-warning/20 text-warning border-warning" : "bg-card border-border hover:bg-white/5 text-muted-foreground"
              )}
              title="Mostrar/Ocultar viagens marcadas para não aparecer no dashboard"
            >
              {showHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
          </div>
        }
      />

      <main className="px-4 md:px-8 py-6 md:py-8">
        {/* Filters */}
        <div className="mb-4 flex flex-row items-center gap-4 bg-card border border-border rounded-xl p-2 px-4 shadow-sm w-full overflow-x-auto hide-scrollbar">
          <div className="flex gap-2 min-w-max">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary min-w-[180px]"
            >
              <option value="todas">Empresas</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="h-6 w-px bg-border hidden sm:block" />

          <div className="flex bg-background border border-border rounded-lg p-0.5 min-w-max">
            <button
              onClick={() => setDirectionFilter("todas")}
              className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all", directionFilter === "todas" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              Todos Sentidos
            </button>
            <button
              onClick={() => setDirectionFilter("descendo")}
              className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all", directionFilter === "descendo" ? "bg-cyan-500/20 text-cyan-500 border border-cyan-500/30" : "text-muted-foreground hover:text-foreground")}
            >
              Descendo ( PS/ILHEUS/CNV/MCR )
            </button>
            <button
              onClick={() => setDirectionFilter("subindo")}
              className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all", directionFilter === "subindo" ? "bg-orange-500/20 text-orange-500 border border-orange-500/30" : "text-muted-foreground hover:text-foreground")}
            >
              Subindo (VCA / SSA / GO / BA / MG / RJ )
            </button>
          </div>
        </div>

        {/* Status bar */}
        <section className="mb-6 flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x">
          <StatusChip
            label="Total Hoje"
            value={counts.total}
            tone="border-border bg-card/70 text-foreground"
            active={filter === "todas"}
            onClick={() => setFilter("todas")}
          />
          <StatusChip
            label="Check-in OK"
            value={counts.checkedIn}
            tone="border-success/30 bg-success/5 text-success"
            active={filter === "checked-in"}
            onClick={() => setFilter("checked-in")}
          />
          <StatusChip
            label="Iminentes"
            value={counts.imminent}
            tone="border-warning/40 bg-warning/5 text-warning"
            active={filter === "imminent"}
            onClick={() => setFilter("imminent")}
            pulse
          />
          <StatusChip
            label="Atrasadas"
            value={counts.delayed}
            tone="border-danger/40 bg-danger/5 text-danger"
            active={filter === "delayed"}
            onClick={() => setFilter("delayed")}
            pulse
          />
          <StatusChip
            label="Programadas"
            value={counts.scheduled}
            tone="border-border bg-card/70 text-muted-foreground"
            active={filter === "scheduled"}
            onClick={() => setFilter("scheduled")}
          />
        </section>

        <div className="grid gap-6 grid-cols-1 xl:grid-cols-[1fr_320px]">
          {/* Timeline */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Cronologia de Partidas
              </h2>
              <div className="font-mono text-[11px] text-muted-foreground">
                Ordenado por horário de saída
              </div>
            </div>

            {isSelectionMode && selectedTrips.size > 0 && (
              <div className="mb-4 bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
                <div className="text-sm font-semibold text-primary px-2">
                  {selectedTrips.size} rota(s) selecionada(s)
                </div>
                <div className="flex gap-2">
                  <button onClick={handleBulkComplete} className="px-3 py-1.5 bg-success/20 text-success border border-success/30 rounded shadow-sm text-xs font-bold hover:bg-success/30 transition-colors">
                    <CheckCircle2 className="size-3 inline mr-1" /> Regularizar
                  </button>
                  <button onClick={handleBulkReset} className="px-3 py-1.5 bg-warning/20 text-warning border border-warning/30 rounded shadow-sm text-xs font-bold hover:bg-warning/30 transition-colors">
                    <RotateCcw className="size-3 inline mr-1" /> Reiniciar
                  </button>
                  <button onClick={() => setSelectedTrips(new Set())} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded ml-2 transition-colors"><X className="size-4" /></button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-sm text-muted-foreground">
                  Sem viagens neste filtro.
                </div>
              ) : (
                filtered.map((trip, idx) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    index={idx}
                    isSelected={selectedTrips.has(trip.id)}
                    onCheckIn={handleOpenCheckin}
                    onSOS={handleSOS}
                    onReport={handleReport}
                    onEdit={handleOpenForm}
                    onDelete={handleDeleteTrip}
                    onEvaluate={handleEvaluate}
                    onReset={handleResetTrip}
                    partnerName={partners.find(p => p.id === trip.company_id)?.name}
                    onClick={(trip) => {
                      if (isSelectionMode) {
                        const next = new Set(selectedTrips);
                        if (next.has(trip.id)) next.delete(trip.id);
                        else next.add(trip.id);
                        setSelectedTrips(next);
                      } else {
                        setActiveDetailsTrip(trip);
                        setDetailsModalOpen(true);
                      }
                    }}
                  />
                ))
              )}
            </div>
          </section>

          {/* Side panel — WhatsApp & SOS */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-success/25 bg-gradient-to-br from-success/10 via-card to-card p-6">
              <div className="mb-3 flex items-center gap-2">
                <MessageCircle className="size-4 text-success" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-success">
                  Comunicação WhatsApp
                </h3>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Check-ins e SOS são propagados automaticamente aos grupos operacionais. Use os
                botões abaixo para acionar manualmente.
              </p>
              <div className="space-y-2">
                <SideAction
                  onClick={() => showToast("📡 Resumo do plantão enviado a 4 grupos operacionais")}
                  label="Enviar resumo aos grupos"
                  hint="CCO · Agências · Supervisão"
                  icon={<Send className="size-4" />}
                />
                <SideAction
                  onClick={() =>
                    showToast("📋 Relatório consolidado do dia copiado para área de transferência")
                  }
                  label="Gerar relatório do dia"
                  hint="Pronto para compartilhar"
                  icon={<FileText className="size-4" />}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-danger/30 bg-gradient-to-br from-danger/10 via-card to-card p-6">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="size-4 text-danger" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-danger">
                  Plantão de Emergência
                </h3>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Acione o SOS para comunicar carro quebrado ao CCO, agência de destino e supervisão.
              </p>
              <button
                onClick={() =>
                  showToast("🚨 SOS global acionado · CCO + agências notificadas")
                }
                className="w-full rounded-lg bg-danger px-4 py-3 text-sm font-bold uppercase tracking-wider text-danger-foreground animate-pulse-ring-danger"
              >
                Acionar SOS Global
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-5">
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Legenda
              </h3>
              <div className="space-y-2 text-xs">
                <LegendRow color="bg-success" label="Check-in realizado" />
                <LegendRow color="bg-warning" label="Embarque < 15 min" />
                <LegendRow color="bg-danger" label="Atrasado · sem check-in" />
                <LegendRow color="bg-muted-foreground/50" label="Programado" />
              </div>
            </div>
          </aside>
        </div>
      </main>

      <CheckinModal trip={activeTrip} open={modalOpen} onClose={handleCloseCheckin} />
      
      <CityCodesModal 
        open={cityCodesModalOpen}
        onClose={() => setCityCodesModalOpen(false)}
      />
      
      <TripFormModal trip={editingTrip} open={formModalOpen} onClose={() => setFormModalOpen(false)} />
      
      <TripDetailsModal
        trip={activeDetailsTrip}
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
      />

      <ItinerarySearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        trips={trips}
        partners={partners}
      />

      <DriverEvaluationModal
        open={evalModalOpen}
        onClose={() => setEvalModalOpen(false)}
        trip={evalTrip}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-border bg-card/95 px-5 py-3 text-sm shadow-2xl backdrop-blur-xl animate-slide-up">
          {toast}
        </div>
      )}
    </>
  );
}

function StatusChip({
  label,
  value,
  tone,
  active,
  onClick,
  pulse,
}: {
  label: string;
  value: number;
  tone: string;
  active: boolean;
  onClick: () => void;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group rounded-xl border p-4 text-left transition-all backdrop-blur-sm shrink-0 min-w-[140px] snap-center flex-1",
        tone,
        active && "ring-2 ring-primary/40 scale-[1.01]",
        !active && "opacity-90 hover:opacity-100",
      )}
    >
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
        <span>{label}</span>
        {pulse && value > 0 && (
          <span className="size-1.5 rounded-full bg-current animate-pulse" />
        )}
      </div>
      <div className="mt-1 font-mono text-3xl font-semibold tabular-nums">{value}</div>
    </button>
  );
}

function SideAction({
  onClick,
  label,
  hint,
  icon,
}: {
  onClick: () => void;
  label: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/80 px-3 py-2.5 text-left transition-colors hover:border-success/40 hover:bg-success/5"
    >
      <span className="grid size-8 place-items-center rounded-md bg-success/15 text-success">
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </div>
    </button>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className={cn("size-2 rounded-full", color)} />
      <span>{label}</span>
    </div>
  );
}
