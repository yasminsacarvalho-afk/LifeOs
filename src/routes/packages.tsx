import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { PackageOpen, Plus, Clock, Truck, MapPin, CheckCircle2, ChevronRight, Edit2, Kanban, List, ArrowDownCircle, ArrowUpCircle, DollarSign, Wallet } from "lucide-react";
import { usePackagesRealtime, type UiPackage } from "@/hooks/use-packages-realtime";
import { PackageFormModal } from "@/components/PackageFormModal";
import { DeliverySettlementModal } from "@/components/DeliverySettlementModal";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/packages")({
  head: () => ({
    meta: [{ title: "Encomendas · Voyage Flow" }],
  }),
  component: PackagesPage,
});

const STATUS_COLUMNS = [
  { id: "aguardando", title: "Aguardando", icon: Clock, color: "text-muted-foreground", bg: "bg-muted/10", border: "border-border" },
  { id: "enviada", title: "Enviada", icon: Truck, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  { id: "chegou", title: "Chegou no Destino", icon: MapPin, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  { id: "entregue", title: "Entregue ao Cliente", icon: CheckCircle2, color: "text-success", bg: "bg-success/10", border: "border-success/30" },
] as const;

function PackagesPage() {
  const { packages } = usePackagesRealtime();
  const [modalOpen, setModalOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<UiPackage | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [filterDirection, setFilterDirection] = useState<"all" | "envio" | "recebimento">("all");

  const filteredPackages = packages.filter(p => {
    if (filterDirection === "all") return true;
    return p.direction === filterDirection;
  });

  // Calculate KPIs
  const metrics = {
    totalCommission: packages.filter(p => p.status === "entregue").reduce((acc, p) => acc + Number(p.commission), 0),
    delivered: packages.filter(p => p.status === "entregue").length,
    pending: packages.filter(p => p.status !== "entregue").length,
    sent: packages.filter(p => p.direction === "envio").length,
  };

  const handleStatusChange = async (pkgId: string, currentStatus: string) => {
    const currentIndex = STATUS_COLUMNS.findIndex(c => c.id === currentStatus);
    if (currentIndex < STATUS_COLUMNS.length - 1) {
      const nextStatus = STATUS_COLUMNS[currentIndex + 1].id;
      await supabase.from("packages").update({ status: nextStatus }).eq("id", pkgId);
    }
  };

  const handleEdit = (pkg: UiPackage) => {
    setEditingPkg(pkg);
    setModalOpen(true);
  };

  return (
    <>
      <TopBar
        title="Gestão de Encomendas"
        subtitle="Rastreamento logístico e faturamento de pacotes com comissão."
        actions={
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center bg-card border border-border/60 rounded-lg p-1 shadow-sm">
                <button 
                  onClick={() => setFilterDirection("all")}
                  className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filterDirection === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setFilterDirection("envio")}
                  className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1", filterDirection === "envio" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
                >
                  <ArrowUpCircle className="size-3" /> Envios
                </button>
                <button 
                  onClick={() => setFilterDirection("recebimento")}
                  className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1", filterDirection === "recebimento" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
                >
                  <ArrowDownCircle className="size-3" /> Recebidos
                </button>
             </div>

             <div className="flex items-center bg-card border border-border/60 rounded-lg p-1 shadow-sm">
                <button 
                  onClick={() => setViewMode("kanban")}
                  className={cn("p-1.5 rounded-md transition-all", viewMode === "kanban" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50")}
                  title="Visão Kanban"
                >
                  <Kanban className="size-4" />
                </button>
                <button 
                  onClick={() => setViewMode("grid")}
                  className={cn("p-1.5 rounded-md transition-all", viewMode === "grid" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50")}
                  title="Visão em Lista"
                >
                  <List className="size-4" />
                </button>
             </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={() => setSettlementOpen(true)}
                className="hidden md:inline-flex items-center gap-2 rounded-lg bg-card border border-border/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-all shadow-sm"
              >
                <Wallet className="size-4" /> Acerto Entregadores
              </button>
              <button
                onClick={() => {
                  setEditingPkg(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm shadow-primary/20"
              >
                <Plus className="size-4" /> Nova
              </button>
            </div>
          </div>
        }
      />

      <main className="px-4 md:px-8 py-6 md:py-8 h-auto lg:h-[calc(100vh-80px)] lg:overflow-hidden flex flex-col overflow-y-auto">
        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-in slide-in-from-top-4 duration-500 shrink-0">
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign className="size-16 text-success" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-success/10 rounded-lg">
                  <DollarSign className="size-4 text-success" />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground">Comissões Recebidas</h3>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                R$ {metrics.totalCommission.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">Apenas encomendas entregues</div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 className="size-16 text-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CheckCircle2 className="size-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground">Entregues</h3>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.delivered}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">Pacotes finalizados com sucesso</div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="size-16 text-warning" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="size-4 text-warning" />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground">Faltam Entregar</h3>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.pending}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">Em trânsito ou aguardando</div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowUpCircle className="size-16 text-info" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-info/10 rounded-lg">
                  <ArrowUpCircle className="size-4 text-info" />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground">Total Enviado</h3>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.sent}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">Pacotes despachados pela agência</div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {viewMode === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 h-auto lg:h-full">
            {STATUS_COLUMNS.map((column) => {
              const columnPackages = filteredPackages.filter(p => p.status === column.id);
              const ColumnIcon = column.icon;

            return (
              <div key={column.id} className="flex flex-col h-[500px] lg:h-full rounded-2xl bg-card/40 border border-border overflow-hidden backdrop-blur-sm">
                <div className={cn("p-4 border-b flex items-center justify-between", column.border, column.bg)}>
                  <div className="flex items-center gap-2">
                    <ColumnIcon className={cn("size-4", column.color)} />
                    <h3 className="font-bold text-sm tracking-tight">{column.title}</h3>
                  </div>
                  <span className="text-xs font-mono font-semibold text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
                    {columnPackages.length}
                  </span>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-hide">
                  {columnPackages.map((pkg) => (
                    <div key={pkg.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/50 transition-colors group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary px-2 py-1 bg-primary/10 rounded-md">
                            {pkg.code}
                          </span>
                          {pkg.direction === "envio" ? (
                             <span className="text-[10px] font-bold bg-muted text-foreground px-1.5 py-0.5 rounded flex items-center gap-1">
                               <ArrowUpCircle className="size-3 text-info" /> Envio
                             </span>
                          ) : pkg.status === "enviada" ? (
                             <span className="text-[10px] font-bold bg-warning text-warning-foreground px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse shadow-sm">
                               <Truck className="size-3" /> A Caminho Daqui
                             </span>
                          ) : (
                             <span className="text-[10px] font-bold bg-muted text-foreground px-1.5 py-0.5 rounded flex items-center gap-1">
                               <ArrowDownCircle className="size-3 text-success" /> Receb.
                             </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all"
                        >
                          <Edit2 className="size-3" />
                        </button>
                      </div>
                      
                      <div className="mb-3 space-y-1">
                        <div className="text-sm font-semibold truncate">{pkg.sender_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{pkg.origin}</span>
                          <ChevronRight className="size-3" />
                          <span>{pkg.destination}</span>
                        </div>
                        <div className="text-sm font-medium truncate pt-1">Para: {pkg.receiver_name}</div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Frete</span>
                          <span className="text-sm font-mono font-semibold">R$ {pkg.price.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Comissão ({pkg.direction === "envio" ? "10%" : "15%"})</span>
                          <span className="text-sm font-mono font-bold text-success">+ R$ {pkg.commission.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-col gap-1 max-w-[120px]">
                          <div className="text-xs font-mono text-muted-foreground truncate">
                            {pkg.trip_code ? `Frota ${pkg.trip_code}` : "Sem frota"}
                          </div>
                          {pkg.delivery_person_name && (
                            <div className="text-[10px] flex items-center gap-1 font-bold truncate" title={pkg.delivery_person_name}>
                              <span className={cn("size-1.5 rounded-full", pkg.delivery_paid ? "bg-success" : "bg-warning")} />
                              {pkg.delivery_person_name}
                            </div>
                          )}
                        </div>
                        {column.id !== "entregue" && (
                          <button
                            onClick={() => handleStatusChange(pkg.id, pkg.status)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", column.color, column.bg, "hover:brightness-110")}
                          >
                            Avançar &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {columnPackages.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground">
                      Nenhuma encomenda
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        ) : (
          <div className="bg-card/40 border border-border/60 rounded-2xl overflow-hidden h-full flex flex-col backdrop-blur-sm shadow-sm">
            <div className="overflow-x-auto flex-1 p-0">
              <table className="w-full text-sm text-left min-w-[1000px]">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Código / Status</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Direção</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Remetente &rarr; Destinatário</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Trecho</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Empresa / Frota</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Frete</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Comissão</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredPackages.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground font-medium">
                        Nenhuma encomenda encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredPackages.map((pkg) => {
                      const statusCol = STATUS_COLUMNS.find(c => c.id === pkg.status);
                      const StatusIcon = statusCol?.icon || Clock;
                      
                      return (
                        <tr key={pkg.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5">
                              <span className="font-mono font-bold text-primary bg-primary/10 w-max px-2 py-0.5 rounded">
                                {pkg.code}
                              </span>
                              <div className={cn("flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full w-max border", statusCol?.color, statusCol?.bg, statusCol?.border)}>
                                <StatusIcon className="size-3" />
                                {statusCol?.title}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {pkg.direction === "envio" ? (
                              <span className="text-xs font-bold text-info flex items-center gap-1.5 bg-info/10 px-2.5 py-1 rounded-md w-max border border-info/20">
                                <ArrowUpCircle className="size-3.5" /> Envio
                              </span>
                            ) : pkg.status === "enviada" ? (
                              <span className="text-xs font-bold text-warning flex items-center gap-1.5 bg-warning/10 px-2.5 py-1 rounded-md w-max border border-warning/20">
                                <Truck className="size-3.5 animate-pulse" /> A Caminho Daqui
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-success flex items-center gap-1.5 bg-success/10 px-2.5 py-1 rounded-md w-max border border-success/20">
                                <ArrowDownCircle className="size-3.5" /> Recebimento
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{pkg.sender_name}</span>
                              <span className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                                <ChevronRight className="size-3" /> Para: {pkg.receiver_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-xs bg-muted w-max px-2.5 py-1 rounded-md">
                              <MapPin className="size-3.5 text-primary" />
                              {pkg.origin} &rarr; {pkg.destination}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="font-medium">{pkg.partner_name || "Avulso"}</span>
                              <span className="text-muted-foreground font-mono">{pkg.trip_code ? `Frota ${pkg.trip_code}` : "Sem frota"}</span>
                              {pkg.delivery_person_name && (
                                <span className={cn("text-[9px] uppercase tracking-wider font-bold", pkg.delivery_paid ? "text-success" : "text-warning")}>
                                  Entregador: {pkg.delivery_person_name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="font-mono font-semibold">R$ {pkg.price.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-mono font-bold text-success">+ R$ {pkg.commission.toFixed(2)}</span>
                              <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                                {pkg.direction === "envio" ? "10%" : "15%"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleEdit(pkg)}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Editar Encomenda"
                            >
                              <Edit2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Grid View Footer Summary */}
            <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                Total de {filteredPackages.length} encomenda(s)
              </span>
              <div className="flex items-center gap-6">
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Total de Fretes</span>
                    <span className="font-mono font-bold">R$ {filteredPackages.reduce((acc, p) => acc + Number(p.price), 0).toFixed(2)}</span>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-success/80">Comissão Projetada</span>
                    <span className="font-mono font-bold text-success">R$ {filteredPackages.reduce((acc, p) => acc + Number(p.commission), 0).toFixed(2)}</span>
                 </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      <PackageFormModal pkg={editingPkg} open={modalOpen} onClose={() => setModalOpen(false)} />
      <DeliverySettlementModal packages={filteredPackages} open={settlementOpen} onClose={() => setSettlementOpen(false)} />
    </>
  );
}
