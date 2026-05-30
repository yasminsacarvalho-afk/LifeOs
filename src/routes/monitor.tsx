import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileText, MessageCircle, Send } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { TripCard } from "@/components/TripCard";
import { CheckinModal } from "@/components/CheckinModal";
import { trips as seedTrips, type Trip } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monitor")({
  head: () => ({
    meta: [
      { title: "Torre de Controle · Voyage Flow" },
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
  const [trips, setTrips] = useState<Trip[]>(seedTrips);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("todas");
  const [toast, setToast] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      total: trips.length,
      checkedIn: trips.filter((t) => t.status === "checked-in").length,
      imminent: trips.filter((t) => t.status === "imminent").length,
      delayed: trips.filter((t) => t.status === "delayed").length,
      scheduled: trips.filter((t) => t.status === "scheduled").length,
    };
  }, [trips]);

  const filtered = useMemo(() => {
    if (filter === "todas") return trips;
    return trips.filter((t) => t.status === filter);
  }, [trips, filter]);

  const handleOpenCheckin = (trip: Trip) => {
    setActiveTrip(trip);
    setModalOpen(true);
  };

  const handleCloseCheckin = () => {
    if (activeTrip) {
      const time = new Date().toLocaleTimeString("pt-BR", { hour12: false }).slice(0, 5);
      setTrips((prev) =>
        prev.map((t) =>
          t.id === activeTrip.id
            ? {
                ...t,
                status: "checked-in" as const,
                checkedInAt: time,
                bus: t.bus ?? "G8 1205 (Scania K400)",
                driver: t.driver ?? "Claudio Mendonça",
                packages: t.packages ?? 12,
              }
            : t,
        ),
      );
      showToast(`✅ Check-in ${activeTrip.code} enviado ao WhatsApp operacional`);
    }
    setModalOpen(false);
    setActiveTrip(null);
  };

  const handleSOS = (trip: Trip) => {
    showToast(`🚨 SOS acionado · ${trip.code} · CCO e agência ${trip.destination} notificados`);
  };

  const handleReport = (trip: Trip) => {
    showToast(`📋 Relatório de ${trip.code} pronto para compartilhar`);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <>
      <TopBar
        title="Torre de Controle Operacional"
        subtitle="Timeline cronológica das partidas do dia · atualização em tempo real"
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.7_0.16_295)] px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow-accent hover:scale-[1.01] transition-transform">
            <Send className="size-4" /> Enviar resumo do dia
          </button>
        }
      />

      <main className="px-8 py-8">
        {/* Status bar */}
        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
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

            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-sm text-muted-foreground">
                  Sem viagens neste filtro.
                </div>
              ) : (
                filtered.map((trip, i) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    index={i}
                    onCheckIn={handleOpenCheckin}
                    onSOS={handleSOS}
                    onReport={handleReport}
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
        "group rounded-xl border p-4 text-left transition-all backdrop-blur-sm",
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
