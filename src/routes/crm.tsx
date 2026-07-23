import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useCrmRealtime, type CrmLead } from "@/hooks/use-crm-realtime";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { CrmLeadFormModal } from "@/components/CrmLeadFormModal";
import { Plus, MoreVertical, DollarSign, Building2, User, Clock, CheckCircle2, Inbox, ArrowRight, Users, TrendingUp, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Importações das imagens locais
import aguiaImg from "@/aguia.jpg";
import brasileiroImg from "@/Brasileiro.png";
import cidadeImg from "@/Cidadesol.webp";
import rotaImg from "@/rota.png";
import gontijoImg from "@/Gontijo.jpg";

const PARTNER_IMAGES: Record<string, string> = {
  "aguia branca": aguiaImg,
  "rota": rotaImg,
  "brasileiro": brasileiroImg,
  "cidade sol": cidadeImg,
  "gontijo": gontijoImg,
};

export const Route = createFileRoute("/crm")({
  component: () => <CrmKanbanPage title="CRM & Pipeline" />,
});

const COLUMNS = [
  { id: "nao_atendido", title: "Não Atendido", color: "bg-danger/20 text-danger border-danger/30", icon: Inbox },
  { id: "em_atendimento", title: "Em Atendimento", color: "bg-warning/20 text-warning border-warning/30", icon: Clock },
  { id: "aguardando", title: "Aguardando", color: "bg-info/20 text-info border-info/30", icon: MoreVertical },
  { id: "venda", title: "Venda", color: "bg-success/20 text-success border-success/30", icon: CheckCircle2 },
  { id: "revenda", title: "Revenda", color: "bg-primary/20 text-primary border-primary/30", icon: ArrowRight },
  { id: "lead", title: "Lead (Frio/Morno)", color: "bg-muted text-muted-foreground border-border", icon: User },
];

function CrmKanbanPage({ title }: { title: string }) {
  const { leads, loading } = useCrmRealtime();
  const { partners } = usePartnersRealtime();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [defaultCol, setDefaultCol] = useState("nao_atendido");

  const handleEdit = (lead: CrmLead) => {
    setEditingLead(lead);
    setModalOpen(true);
  };

  const handleNewLead = (status: string = "nao_atendido") => {
    setEditingLead(null);
    setDefaultCol(status);
    setModalOpen(true);
  };

  const moveLead = async (leadId: string, newStatus: string) => {
    toast.loading("Movendo card...", { id: `move-${leadId}` });
    try {
      const { error } = await supabase.from("crm_leads").update({ status: newStatus }).eq("id", leadId);
      if (error) throw error;
      toast.success("Movido com sucesso!", { id: `move-${leadId}` });
    } catch (err: any) {
      if (err.code === '42P01') {
         toast.error("Você precisa rodar o script SQL no Supabase primeiro.", { id: `move-${leadId}` });
      } else {
         toast.error("Erro ao mover card.", { id: `move-${leadId}` });
      }
    }
  };

  const getPartnerName = (id: string | null) => {
    if (!id) return null;
    const partner = partners.find(p => p.id === id);
    return partner ? partner.name : null;
  };

  const pipelineCommission = leads.filter(l => l.status !== "venda").reduce((acc, l) => acc + (Number(l.estimated_commission) || 0), 0);
  const fechadoCommission = leads.filter(l => l.status === "venda").reduce((acc, l) => acc + (Number(l.estimated_commission) || 0), 0);

  const companyStats = partners.map(p => {
    const pLeads = leads.filter(l => l.target_company_id === p.id);
    const fechado = pLeads.filter(l => l.status === "venda").reduce((acc, l) => acc + (Number(l.expected_value) || 0), 0);
    const aberto = pLeads.filter(l => l.status !== "venda").reduce((acc, l) => acc + (Number(l.expected_value) || 0), 0);
    const comissaoAberta = pLeads.filter(l => l.status !== "venda").reduce((acc, l) => acc + (Number(l.estimated_commission) || 0), 0);
    return { id: p.id, name: p.name, color: p.color, fechado, aberto, comissaoAberta, total: pLeads.length };
  }).filter(s => s.total > 0).sort((a, b) => b.fechado - a.fechado);

  return (
    <>
      <TopBar 
        title={title} 
        subtitle="Gerenciamento de contatos, atendimentos e funil de vendas." 
        actions={
          <button
            onClick={() => handleNewLead("nao_atendido")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm shadow-primary/20"
          >
            <Plus className="size-4" /> Novo Lead
          </button>
        }
      />
      
      <main className="px-4 md:px-6 py-6 h-auto lg:h-[calc(100vh-80px)] lg:overflow-hidden flex flex-col gap-6 overflow-y-auto">
        {/* Main KPIs Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0 animate-in fade-in slide-in-from-top-4 duration-700">
          
          {/* Total Leads */}
          <div className="group relative bg-card/40 backdrop-blur-xl border border-white/5 hover:border-primary/30 rounded-2xl p-5 shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="size-12" />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground mb-3 relative z-10">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Users className="size-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest">Total de Leads</span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight mb-2 relative z-10">{leads.length}</div>
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                Conv: {leads.length > 0 ? ((leads.filter(l => l.status === "venda").length / leads.length) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
          </div>

          {/* Pending */}
          <div className="group relative bg-card/40 backdrop-blur-xl border border-white/5 hover:border-warning/30 rounded-2xl p-5 shadow-lg hover:shadow-warning/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="size-12" />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground mb-3 relative z-10">
              <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
                <Clock className="size-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest">Pendentes / Em Atend.</span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight relative z-10">
              {leads.filter(l => l.status === "nao_atendido" || l.status === "em_atendimento").length}
            </div>
          </div>

          {/* Pipeline */}
          <div className="group relative bg-card/40 backdrop-blur-xl border border-white/5 hover:border-info/30 rounded-2xl p-5 shadow-lg hover:shadow-info/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute -right-4 -top-4 size-24 bg-info/10 rounded-full blur-2xl group-hover:bg-info/20 transition-colors" />
            <div className="flex items-center gap-2 text-muted-foreground mb-3 relative z-10">
              <div className="p-1.5 rounded-lg bg-info/10 text-info">
                <TrendingUp className="size-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest">Pipeline (Aberto)</span>
            </div>
            <div className="text-2xl font-extrabold font-mono tracking-tight relative z-10 mb-2">
              {leads.filter(l => l.status !== "venda").reduce((acc, l) => acc + (Number(l.expected_value) || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="flex flex-col gap-1 relative z-10 pt-2 border-t border-white/5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Comissão Estimada</span>
              <span className="text-sm font-bold text-info font-mono">
                R$ {pipelineCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Closed */}
          <div className="group relative bg-gradient-to-br from-success/10 to-card/40 backdrop-blur-xl border border-success/20 hover:border-success/40 rounded-2xl p-5 shadow-lg hover:shadow-success/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute -right-4 -top-4 size-24 bg-success/20 rounded-full blur-2xl group-hover:bg-success/30 transition-colors" />
            <div className="flex items-center gap-2 text-muted-foreground mb-3 relative z-10">
              <div className="p-1.5 rounded-lg bg-success/20 text-success">
                <CheckCircle2 className="size-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-success">Vendas (Fechado)</span>
            </div>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-success relative z-10 mb-2">
              {leads.filter(l => l.status === "venda").reduce((acc, l) => acc + (Number(l.expected_value) || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="flex flex-col gap-1 relative z-10 pt-2 border-t border-success/10">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-success/70">Comissão Ganha</span>
              <span className="text-sm font-bold text-success font-mono">
                R$ {fechadoCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Company Performance Breakdown */}
        {companyStats.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-2 pt-1 shrink-0 hide-scrollbar animate-in fade-in slide-in-from-right-8 duration-700 delay-150 fill-mode-both">
            {companyStats.map(stat => {
              const totalMoney = stat.fechado + stat.aberto;
              const fechadoPct = totalMoney > 0 ? (stat.fechado / totalMoney) * 100 : 0;
              const imgUrl = PARTNER_IMAGES[stat.name.toLowerCase()] || "";
              
              return (
                <div key={stat.id} className="min-w-[280px] group relative rounded-2xl flex flex-col shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-default overflow-hidden border border-border">
                  {/* Fundo com Imagem Escurecida */}
                  {imgUrl ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${imgUrl})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-card z-0" />
                  )}
                  {/* Overlay gradiente para dar contraste aos textos */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/60 z-0" />

                  {/* Decorative color line top */}
                  <div className="absolute top-0 left-0 w-full h-1.5 opacity-90 transition-opacity z-10" style={{ backgroundColor: stat.color || '#888' }} />
                  
                  <div className="relative z-10 p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-extrabold tracking-tight text-white drop-shadow-md truncate">{stat.name}</span>
                      <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold shadow-sm">{stat.total} leads</span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Potencial (Aberto)</span>
                        <span className="font-mono text-info font-bold tracking-tight">R$ {stat.aberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase text-success/80 font-bold tracking-wider">Comissão a Receber</span>
                        <span className="font-mono text-success font-bold tracking-tight text-lg drop-shadow-sm">+ R$ {stat.comissaoAberta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] text-muted-foreground font-bold">Conversão</span>
                        <span className="text-[10px] font-mono font-bold">{fechadoPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${fechadoPct}%`, backgroundColor: stat.color || '#10b981' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Kanban Board Container */}
        <div className="flex gap-4 h-full overflow-x-auto pb-4 pt-2 snap-x hide-scrollbar">
          
          {COLUMNS.map(col => {
            const columnLeads = leads.filter(l => l.status === col.id);
            const totalValue = columnLeads.reduce((acc, l) => acc + (Number(l.expected_value) || 0), 0);
            const Icon = col.icon;

            return (
              <div key={col.id} className="min-w-[320px] w-[320px] max-w-[320px] flex flex-col bg-card/30 border border-border/50 rounded-2xl overflow-hidden snap-center">
                {/* Column Header */}
                <div className="p-4 border-b border-border/50 bg-muted/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5", col.color)}>
                      <Icon className="size-3.5" />
                      {col.title}
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{columnLeads.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">Ticket Acumulado:</span>
                    <span className="font-mono font-bold text-foreground">
                      {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {/* Column Body / Cards List */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 hide-scrollbar">
                  {columnLeads.map(lead => (
                    <div key={lead.id} className="bg-card border border-border/80 rounded-xl p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all group relative cursor-pointer" onClick={() => handleEdit(lead)}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-foreground leading-tight">{lead.client_name}</h4>
                        {/* Status Change Dropdown / Quick Move (Click event prevention) */}
                        <div className="relative group/menu" onClick={e => e.stopPropagation()}>
                          <button className="p-1 text-muted-foreground hover:bg-muted rounded">
                            <MoreVertical className="size-4" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
                            {COLUMNS.filter(c => c.id !== col.id).map(c => (
                              <button 
                                key={c.id} 
                                onClick={(e) => { e.stopPropagation(); moveLead(lead.id, c.id); }}
                                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted text-muted-foreground transition-colors"
                              >
                                Mover para {c.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        {(lead.phone || lead.email) && (
                          <div className="flex flex-col gap-1 text-[10px] text-muted-foreground font-medium">
                            {lead.phone && <span>📞 {lead.phone}</span>}
                            {lead.email && <span>📧 {lead.email}</span>}
                          </div>
                        )}
                        {lead.target_company_id && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/40 w-max px-2 py-1 rounded-md">
                            <Building2 className="size-3" /> {getPartnerName(lead.target_company_id) || "Empresa Desconhecida"}
                          </div>
                        )}
                        {lead.desired_destination && (
                          <div className="flex items-center gap-1.5 text-xs text-info font-medium bg-info/10 w-max px-2 py-1 rounded-md border border-info/20">
                            <MapPin className="size-3" /> {lead.desired_destination}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {lead.notes || "Sem observações detalhadas."}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Valor Estimado</span>
                          <div className="flex items-center gap-1 text-foreground font-mono font-bold text-sm">
                            <DollarSign className="size-3.5 text-success" />
                            {Number(lead.expected_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        {lead.estimated_commission > 0 && (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Comissão</span>
                            <span className="text-xs font-mono font-bold text-primary">
                              R$ {Number(lead.estimated_commission).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {columnLeads.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center text-xs text-muted-foreground/50 font-medium">
                      Arrastar ou adicionar card
                    </div>
                  )}

                  <button 
                    onClick={() => handleNewLead(col.id)}
                    className="w-full py-2.5 rounded-lg border border-dashed border-border text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="size-3" /> Adicionar Lead Rápido
                  </button>
                </div>
              </div>
            );
          })}

        </div>
      </main>

      <CrmLeadFormModal 
        lead={editingLead} 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        defaultStatus={defaultCol}
      />
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
