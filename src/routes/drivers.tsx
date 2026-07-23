import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useDriversRealtime, type DbDriver, type DbDriverEvaluation } from "@/hooks/use-drivers-realtime";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, User, List, Clock, Info, CheckCircle2, MessageSquareText, Search, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/drivers")({
  head: () => ({
    meta: [
      { title: "Gestão de Motoristas · Voyage Flow" },
      { name: "description", content: "Cadastro, histórico e avaliação de motoristas." },
    ],
  }),
  component: DriversPage,
});

function DriversPage() {
  const { drivers, evaluations, loading } = useDriversRealtime();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DbDriver | null>(null);
  
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DbDriver | null>(null);
  
  const [search, setSearch] = useState("");

  const handleOpenForm = (driver?: DbDriver) => {
    setEditingDriver(driver || null);
    setIsModalOpen(true);
  };

  const handleOpenHistory = (driver: DbDriver) => {
    setSelectedDriver(driver);
    setHistoryOpen(true);
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar
        title="Motoristas"
        subtitle="Gerencie o cadastro da frota de motoristas e visualize o histórico operacional de cada um."
        actions={
          <button
            onClick={() => handleOpenForm()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            Novo Motorista
          </button>
        }
      />

      <main className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-card/50 px-4 py-2 border border-border rounded-lg">
            <User className="size-4" />
            <span className="font-semibold">{drivers.length}</span> cadastrados
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Carregando motoristas...</div>
        ) : filteredDrivers.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 border border-dashed rounded-xl bg-card/50">
            Nenhum motorista encontrado.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDrivers.map(driver => {
              const driverEvals = evaluations.filter(e => e.driver_id === driver.id);
              
              return (
                <div key={driver.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground truncate max-w-[150px]">{driver.name}</h3>
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="size-3" /> {driver.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border/50 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                        <List className="size-3.5" /> Linhas Operantes
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {driver.lines.length > 0 ? driver.lines.map(l => (
                          <span key={l} className="bg-background border border-border px-2 py-0.5 rounded text-xs">
                            {l}
                          </span>
                        )) : (
                          <span className="text-xs italic text-muted-foreground">Nenhuma informada</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageSquareText className="size-3.5" />
                        {driverEvals.length} avaliaç{driverEvals.length === 1 ? 'ão' : 'ões'}
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenHistory(driver)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Histórico
                        </button>
                        <span className="text-muted-foreground/30">•</span>
                        <button 
                          onClick={() => handleOpenForm(driver)}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <DriverFormModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        driver={editingDriver} 
      />

      <DriverHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        driver={selectedDriver}
        evaluations={evaluations.filter(e => e.driver_id === selectedDriver?.id)}
      />
    </>
  );
}

function DriverFormModal({ open, onClose, driver }: { open: boolean; onClose: () => void; driver: DbDriver | null }) {
  const [name, setName] = useState("");
  const [lines, setLines] = useState("");
  const [status, setStatus] = useState("ativo");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when driver changes
  import("react").then(React => {
    React.useEffect(() => {
      if (driver) {
        setName(driver.name);
        setLines(driver.lines.join(", "));
        setStatus(driver.status);
      } else {
        setName("");
        setLines("");
        setStatus("ativo");
      }
    }, [driver, open]);
  });

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const linesArray = lines.split(",").map(l => l.trim()).filter(Boolean);
      const data = { name, lines: linesArray, status };

      if (driver) {
        await supabase.from("drivers").update(data).eq("id", driver.id);
      } else {
        await supabase.from("drivers").insert([data]);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar motorista.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>

        <h2 className="text-lg font-bold mb-6">{driver ? "Editar Motorista" : "Novo Motorista"}</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="Ex: João da Silva"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Linhas (separadas por vírgula)
            </label>
            <input
              type="text"
              required
              value={lines}
              onChange={e => setLines(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="Ex: Itapetinga x Porto, VCA x SSA"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="afastado">Afastado</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Salvando..." : "Salvar Motorista"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DriverHistoryModal({ open, onClose, driver, evaluations }: { open: boolean; onClose: () => void; driver: DbDriver | null; evaluations: DbDriverEvaluation[] }) {
  if (!open || !driver) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold">{driver.name}</h2>
            <p className="text-sm text-muted-foreground">Histórico de observações</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {evaluations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Info className="size-8 mx-auto mb-3 opacity-20" />
              Nenhuma observação registrada para este motorista.
            </div>
          ) : (
            evaluations.map(ev => {
              let stars = 0;
              let text = ev.observations;
              const match = ev.observations.match(/^\[(\d)\s*Estrelas\]\s*(.*)$/i);
              if (match) {
                stars = parseInt(match[1]);
                text = match[2];
              }

              return (
                <div key={ev.id} className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3" />
                      {new Date(ev.created_at).toLocaleDateString('pt-BR')} às {new Date(ev.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div>Por: {ev.evaluator_name || 'CCO'}</div>
                  </div>
                  
                  {stars > 0 && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={cn("size-3.5", stars >= s ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                  )}

                  <div className="text-sm text-foreground bg-card p-3 rounded border border-border shadow-inner">
                    {text}
                  </div>
                  {ev.trip_id && (
                    <div className="text-[10px] text-primary/70 uppercase tracking-widest font-semibold flex items-center gap-1">
                      <ShieldCheck className="size-3" /> Relacionado a uma viagem da Torre de Controle
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
