import { useState, useEffect, useMemo } from "react";
import { Target, CheckCircle2, TrendingUp, Users, Calendar, ArrowRight, Zap, Trophy, Plus, Pencil, Trash2, X, Activity, DollarSign, Bus, BarChart3, Clock, Wallet, Banknote, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrmRealtime } from "@/hooks/use-crm-realtime";
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { useDailyAnalysesRealtime } from "@/hooks/use-daily-analyses-realtime";
import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";

interface StrategyStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "done";
  deadline: string;
  impact: "high" | "medium" | "low";
}

interface Lever {
  id: string;
  title: string;
  description: string;
  color: "primary" | "success" | "warning" | "danger" | "info";
  iconName: "Users" | "TrendingUp" | "Trophy" | "Target" | "Zap";
}

const DEFAULT_STEPS: StrategyStep[] = [
  { id: "1", title: "Configuração do Pixel & Tracking", description: "Garantir que todas as conversões de VCA x SP estão sendo mapeadas corretamente no Meta/Google.", status: "done", deadline: "Semana 1", impact: "high" },
  { id: "2", title: "Campanha Fundo de Funil (Pesquisa)", description: "Google Ads com palavras exatas: 'passagem onibus vitoria da conquista para sao paulo', 'viagem vca sp'.", status: "in_progress", deadline: "Semana 1", impact: "high" },
  { id: "3", title: "Campanha Social (Descoberta)", description: "Anúncios em vídeo curtos (Reels/TikTok) mostrando o conforto do ônibus Leito nessa rota longa.", status: "pending", deadline: "Semana 2", impact: "medium" },
  { id: "4", title: "Remarketing (Abandono de Carrinho)", description: "Oferecer 10% de desconto ou poltrona garantida para quem iniciou a compra mas não finalizou.", status: "pending", deadline: "Semana 3", impact: "high" },
  { id: "5", title: "Parcerias Locais em VCA", description: "Flyers/Cartazes em pontos estratégicos físicos de Vitória da Conquista com QR Code rastreável.", status: "pending", deadline: "Semana 4", impact: "low" },
];

const DEFAULT_LEVERS: Lever[] = [
  { id: "l1", title: "Público Alvo", description: "Focar em baianos residentes em São Paulo que viajam para rever a família (trabalhadores, estudantes), e comerciantes que compram mercadorias em SP.", color: "primary", iconName: "Users" },
  { id: "l2", title: "Argumentos de Venda", description: "Preço competitivo vs. Avião\nBagagem mais generosa\nEmbarque/desembarque direto na rodoviária central\nConforto do Leito/Cama", color: "success", iconName: "TrendingUp" },
  { id: "l3", title: "Atenção à Concorrência", description: "Gontijo opera forte nesta rota. O preço deles dita o mercado. Manter nosso preço max 10% acima se oferecermos categoria superior.", color: "warning", iconName: "Trophy" }
];

const AVAILABLE_KPIS = [
  { id: "totalRevenue", label: "T. Geral", group: "Faturamento (Caixa)", type: "currency" },
  { id: "spRevenue", label: "SP Total", group: "Faturamento (Caixa)", type: "currency" },
  { id: "totalTickets", label: "Tkt. Geral", group: "Vendas", type: "number" },
  { id: "spTickets", label: "Tkt. SP", group: "Vendas", type: "number" },
  { id: "activeTrips", label: "Viagens Ativas", group: "Frota", type: "number" },
  { id: "spTrips", label: "Viagens SP", group: "Frota", type: "number" },
  { id: "spVolumeAnalyses", label: "Volume Histórico (SP)", group: "Análise Diária", type: "number" },
  { id: "totalCommissions", label: "Comissões Gerais", group: "Financeiro", type: "currency" },
  { id: "totalLeads", label: "Total Leads (CRM)", group: "CRM", type: "number" },
  { id: "wonLeads", label: "Leads Convertidos", group: "CRM", type: "number" },
  { id: "conversionRate", label: "Taxa de Conversão", group: "CRM", type: "percent" },
];

export function VcaSpStrategyTab() {
  const { leads } = useCrmRealtime();
  const { sales } = useSalesRealtime();
  const { trips } = useTripsRealtime();
  const { analyses } = useDailyAnalysesRealtime();
  const { closings } = useCashClosingsRealtime();

  // Consolidado da Plataforma
  const platformInsights = useMemo(() => {
    // Frotas
    const activeTrips = trips.filter(t => t.status !== "cancelled" && t.status !== "completed").length;
    const spTrips = trips.filter(t => t.destination?.toLowerCase().includes("sao paulo") || t.destination?.toLowerCase() === "sp").length;
    
    // Análise Diária (Volume VCA x SP)
    let spVolumeAnalyses = 0;
    analyses.forEach(a => {
      if (a.top_lines && Array.isArray(a.top_lines)) {
        a.top_lines.forEach((line: any) => {
          if (line.nome && (line.nome.toLowerCase().includes("vca x sp") || line.nome.toLowerCase().includes("vitoria da conquista"))) {
            spVolumeAnalyses += Number(line.quantidade || 0);
          }
        });
      }
    });

    // Fechamento de Caixa
    const totalCash = closings.reduce((acc, c) => acc + Number(c.total_amount || 0), 0);
    const totalCommissions = closings.reduce((acc, c) => acc + Number(c.total_commissions || 0), 0);

    return { activeTrips, spTrips, spVolumeAnalyses, totalCash, totalCommissions };
  }, [trips, analyses, closings]);

  // Informações para Tomada de Decisão (CRM e Vendas)
  const crmInsights = useMemo(() => {
    const spLeads = leads.filter(l => l.destination?.toLowerCase().includes("sao paulo") || l.destination?.toLowerCase().includes("são paulo") || l.destination?.toLowerCase() === "sp");
    const won = spLeads.filter(l => l.status === "won").length;
    return {
      totalLeads: spLeads.length,
      wonLeads: won,
      conversionRate: spLeads.length > 0 ? (won / spLeads.length) * 100 : 0
    };
  }, [leads]);

  const globalSalesInsights = useMemo(() => {
    const totalRevenue = sales.reduce((acc, s) => acc + Number(s.amount || 0), 0);
    const spSales = sales.filter(s => s.destination?.toLowerCase().includes("sao paulo") || s.destination?.toLowerCase().includes("sp"));
    const spRevenue = spSales.reduce((acc, s) => acc + Number(s.amount || 0), 0);
    return { totalRevenue, totalTickets: sales.length, spRevenue, spTickets: spSales.length };
  }, [sales]);

  const [salesProgress, setSalesProgress] = useState(() => {
    const saved = localStorage.getItem("vf_vca_sp_progress");
    return saved ? parseInt(saved) : 24;
  }); 
  const goal = 100;

  useEffect(() => {
    localStorage.setItem("vf_vca_sp_progress", salesProgress.toString());
  }, [salesProgress]);
  
  const [steps, setSteps] = useState<StrategyStep[]>(() => {
    const saved = localStorage.getItem("vf_vca_sp_steps");
    if (saved) return JSON.parse(saved);
    return DEFAULT_STEPS;
  });

  const [levers, setLevers] = useState<Lever[]>(() => {
    const saved = localStorage.getItem("vf_vca_sp_levers");
    if (saved) return JSON.parse(saved);
    return DEFAULT_LEVERS;
  });

  useEffect(() => {
    localStorage.setItem("vf_vca_sp_steps", JSON.stringify(steps));
  }, [steps]);

  useEffect(() => {
    localStorage.setItem("vf_vca_sp_levers", JSON.stringify(levers));
  }, [levers]);

  // Step Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<StrategyStep | null>(null);
  const [formData, setFormData] = useState<Partial<StrategyStep>>({ title: "", description: "", deadline: "", impact: "medium", status: "pending" });

  // Lever Modal
  const [isLeverModalOpen, setIsLeverModalOpen] = useState(false);
  const [editingLever, setEditingLever] = useState<Lever | null>(null);
  const [leverFormData, setLeverFormData] = useState<Partial<Lever>>({ title: "", description: "", color: "primary", iconName: "Trophy" });

  const [selectedKpis, setSelectedKpis] = useState<string[]>(() => {
    const saved = localStorage.getItem("vf_vca_sp_kpis");
    if (saved) return JSON.parse(saved);
    return ["totalRevenue", "spRevenue", "totalTickets", "spTickets"];
  });
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("vf_vca_sp_kpis", JSON.stringify(selectedKpis));
  }, [selectedKpis]);

  const toggleKpi = (id: string) => {
    setSelectedKpis(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  const getKpiValue = (id: string) => {
    const allData: Record<string, any> = { ...platformInsights, ...crmInsights, ...globalSalesInsights };
    return allData[id] || 0;
  };

  const toggleStepStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSteps(steps.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === "pending" ? "in_progress" : s.status === "in_progress" ? "done" : "pending";
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  const handleEditStep = (step: StrategyStep, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStep(step);
    setFormData(step);
    setIsModalOpen(true);
  };

  const handleDeleteStep = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir esta ação?")) {
      setSteps(steps.filter(s => s.id !== id));
    }
  };

  const handleSaveStep = () => {
    if (!formData.title) return alert("Título é obrigatório");
    if (editingStep) {
      setSteps(steps.map(s => s.id === editingStep.id ? { ...s, ...formData } as StrategyStep : s));
    } else {
      setSteps([...steps, { ...formData, id: Math.random().toString(36).substr(2, 9), status: formData.status || "pending" } as StrategyStep]);
    }
    setIsModalOpen(false);
    setEditingStep(null);
  };

  const handleEditLever = (lever: Lever) => {
    setEditingLever(lever);
    setLeverFormData(lever);
    setIsLeverModalOpen(true);
  };

  const handleDeleteLever = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta alavanca?")) {
      setLevers(levers.filter(l => l.id !== id));
    }
  };

  const handleSaveLever = () => {
    if (!leverFormData.title) return alert("Título é obrigatório");
    if (editingLever) {
      setLevers(levers.map(l => l.id === editingLever.id ? { ...l, ...leverFormData } as Lever : l));
    } else {
      setLevers([...levers, { ...leverFormData, id: Math.random().toString(36).substr(2, 9) } as Lever]);
    }
    setIsLeverModalOpen(false);
    setEditingLever(null);
  };

  const getIcon = (name: string, className: string) => {
    switch (name) {
      case "Users": return <Users className={className} />;
      case "TrendingUp": return <TrendingUp className={className} />;
      case "Target": return <Target className={className} />;
      case "Zap": return <Zap className={className} />;
      default: return <Trophy className={className} />;
    }
  };

  const formatCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-[#8A05BE]/20 to-black/40 border border-[#8A05BE]/30 p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20"><Target className="size-32" /></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#8A05BE]/20 text-[#8A05BE] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-[#8A05BE]/30 mb-4">
            <Zap className="size-3" /> Projeto Especial
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-2">Meta 100: Operação VCA x SP</h2>
          <p className="text-muted-foreground max-w-2xl">Roteiro estratégico focado exclusivamente em atingir o alvo de 100 passagens emitidas para a rota Vitória da Conquista ➔ São Paulo.</p>
          
          <div className="mt-8 bg-black/40 p-6 rounded-2xl border border-white/5 max-w-3xl backdrop-blur-md">
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-1">Progresso Atual</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">{salesProgress}</span>
                  <span className="text-xl text-muted-foreground font-bold">/ {goal}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#8A05BE]">{((salesProgress/goal)*100).toFixed(1)}% Concluído</div>
              </div>
            </div>
            
            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#8A05BE] to-[#C135FF] transition-all duration-1000 ease-out"
                style={{ width: `${(salesProgress/goal)*100}%` }}
              />
            </div>
            
            <div className="mt-4 flex gap-2">
              <button onClick={() => setSalesProgress(Math.max(0, salesProgress - 1))} className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 text-xs font-bold transition-colors">-1 Venda</button>
              <button onClick={() => setSalesProgress(Math.min(goal, salesProgress + 1))} className="px-3 py-1 bg-[#8A05BE]/20 text-[#8A05BE] rounded hover:bg-[#8A05BE]/30 border border-[#8A05BE]/30 text-xs font-bold transition-colors">+1 Venda Registrada</button>
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL INTEGRADO DA PLATAFORMA */}
      <div className="bg-card/30 border border-white/10 p-6 rounded-3xl space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="size-5 text-[#8A05BE]" />
          <h3 className="text-xl font-bold">Painel Integrado da Plataforma</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/40 border border-white/5 p-5 rounded-2xl">
             <div className="flex items-center gap-2 text-muted-foreground mb-2">
               <Bus className="size-4" /> <span className="text-xs font-bold uppercase tracking-widest">Monitor de Frotas</span>
             </div>
             <div className="flex justify-between items-end">
               <div>
                 <div className="text-3xl font-black">{platformInsights.activeTrips}</div>
                 <div className="text-xs text-muted-foreground mt-1">Viagens Ativas</div>
               </div>
               <div className="text-right">
                 <div className="text-xl font-bold text-[#8A05BE]">{platformInsights.spTrips}</div>
                 <div className="text-[10px] uppercase text-muted-foreground">Destino SP</div>
               </div>
             </div>
          </div>
          
          <div className="bg-black/40 border border-white/5 p-5 rounded-2xl">
             <div className="flex items-center gap-2 text-muted-foreground mb-2">
               <Activity className="size-4" /> <span className="text-xs font-bold uppercase tracking-widest">Análise Diária</span>
             </div>
             <div className="flex justify-between items-end">
               <div>
                 <div className="text-3xl font-black">{platformInsights.spVolumeAnalyses}</div>
                 <div className="text-xs text-muted-foreground mt-1">Vol. Histórico (VCAxSP)</div>
               </div>
             </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-5 rounded-2xl">
             <div className="flex items-center gap-2 text-muted-foreground mb-2">
               <Wallet className="size-4" /> <span className="text-xs font-bold uppercase tracking-widest">Faturamento</span>
             </div>
             <div className="flex justify-between items-end">
               <div>
                 <div className="text-2xl font-black text-success">{formatCurrency(platformInsights.totalCash)}</div>
                 <div className="text-xs text-muted-foreground mt-1">Fechamento de Caixa</div>
               </div>
             </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-5 rounded-2xl">
             <div className="flex items-center gap-2 text-muted-foreground mb-2">
               <Banknote className="size-4" /> <span className="text-xs font-bold uppercase tracking-widest">Comissões</span>
             </div>
             <div className="flex justify-between items-end">
               <div>
                 <div className="text-2xl font-black text-danger">- {formatCurrency(platformInsights.totalCommissions)}</div>
                 <div className="text-xs text-muted-foreground mt-1">Repasses & Comissões</div>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ArrowRight className="size-5 text-primary" /> Roteiro de Execução (Roadmap)
            </h3>
            <button 
              onClick={() => {
                setEditingStep(null);
                setFormData({ title: "", description: "", deadline: "", impact: "medium", status: "pending" });
                setIsModalOpen(true);
              }}
              className="bg-[#8A05BE] text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#8A05BE]/90 transition-colors"
            >
              <Plus className="size-4" /> Nova Ação
            </button>
          </div>
          
          <div className="space-y-3">
            {steps.map(step => (
              <div 
                key={step.id} 
                className={cn(
                  "p-5 rounded-2xl border transition-all cursor-pointer relative group",
                  step.status === "done" ? "bg-success/5 border-success/20 opacity-70" :
                  step.status === "in_progress" ? "bg-[#8A05BE]/10 border-[#8A05BE]/30 shadow-[0_0_15px_rgba(138,5,190,0.15)]" :
                  "bg-card/40 border-border hover:border-white/20"
                )}
                onClick={(e) => toggleStepStatus(step.id, e)}
              >
                <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1 rounded-lg backdrop-blur-md border border-white/10">
                  <button onClick={(e) => handleEditStep(step, e)} className="p-1.5 text-muted-foreground hover:text-white transition-colors" title="Editar"><Pencil className="size-3.5" /></button>
                  <button onClick={(e) => handleDeleteStep(step.id, e)} className="p-1.5 text-muted-foreground hover:text-danger transition-colors" title="Excluir"><Trash2 className="size-3.5" /></button>
                </div>
                <div className="flex gap-4 items-start">
                  <div className={cn(
                    "mt-0.5 rounded-full p-1 transition-colors",
                    step.status === "done" ? "bg-success text-white" :
                    step.status === "in_progress" ? "bg-[#8A05BE] text-white" :
                    "bg-muted text-muted-foreground"
                  )}>
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div className="flex-1 pr-12">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={cn("font-bold text-base", step.status === "done" && "line-through text-muted-foreground")}>{step.title}</h4>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                          {step.deadline}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                          step.impact === "high" ? "border-danger/30 text-danger bg-danger/10" :
                          step.impact === "medium" ? "border-warning/30 text-warning bg-warning/10" :
                          "border-info/30 text-info bg-info/10"
                        )}>
                          Impacto: {step.impact === "high" ? "Alto" : step.impact === "medium" ? "Médio" : "Baixo"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
            {steps.length === 0 && (
               <div className="text-center py-12 text-muted-foreground italic border border-dashed border-white/10 rounded-2xl bg-black/20">
                 Nenhuma ação no roteiro. Adicione a primeira!
               </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="size-5 text-info" /> Tomada de Decisão
          </h3>

          <div className="grid gap-4">
            {/* CRM Insights Panel */}
            <div className="bg-info/5 border border-info/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 size-24 bg-info/10 blur-[30px] rounded-full pointer-events-none"></div>
              <div className="flex items-center gap-2 text-info font-bold mb-4">
                <Users className="size-4" /> Inteligência CRM (SP)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Total de Leads</div>
                  <div className="text-2xl font-black text-white">{crmInsights.totalLeads}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Conversão</div>
                  <div className="text-2xl font-black text-success">{crmInsights.conversionRate.toFixed(1)}%</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 border-t border-info/10 pt-3">
                Atendimentos registrados no CRM com destino a SP.
              </p>
            </div>

            {/* Global Sales Panel */}
            <div className="bg-success/5 border border-success/20 rounded-2xl p-6 relative overflow-hidden flex flex-col h-full">
              <div className="absolute -right-6 -top-6 size-24 bg-success/10 blur-[30px] rounded-full pointer-events-none"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2 text-success font-bold">
                  <DollarSign className="size-4" /> Inteligência Customizada (KPIs)
                </div>
                <button onClick={() => setIsKpiModalOpen(true)} className="p-1.5 bg-success/10 hover:bg-success/20 text-success rounded-lg transition-colors">
                  <Settings className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                {selectedKpis.map(kpiId => {
                   const def = AVAILABLE_KPIS.find(k => k.id === kpiId);
                   if (!def) return null;
                   const val = getKpiValue(kpiId);
                   return (
                     <div key={kpiId} className="bg-black/20 p-3 rounded-xl border border-success/10">
                       <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-1 truncate" title={def.label}>{def.label}</div>
                       <div className="text-lg font-black text-white truncate">
                         {def.type === "currency" ? formatCurrency(val) : def.type === "percent" ? `${val.toFixed(1)}%` : val}
                       </div>
                     </div>
                   );
                })}
                {selectedKpis.length === 0 && (
                   <div className="col-span-2 text-center text-muted-foreground text-xs italic py-4">
                     Nenhum KPI selecionado. Clique na engrenagem para adicionar.
                   </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 border-t border-success/10 pt-3">
                Você pode customizar os indicadores que aparecem neste painel.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8">
             <h3 className="text-xl font-bold flex items-center gap-2">
               <Trophy className="size-5 text-warning" /> Alavancas Chave
             </h3>
             <button 
               onClick={() => {
                 setEditingLever(null);
                 setLeverFormData({ title: "", description: "", color: "primary", iconName: "Trophy" });
                 setIsLeverModalOpen(true);
               }}
               className="bg-white/10 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-white/20 transition-colors"
             >
               <Plus className="size-3" /> Adicionar
             </button>
          </div>
          
          <div className="bg-card/40 border border-border rounded-2xl p-6 space-y-4">
            {levers.map((lever, idx) => (
              <div key={lever.id} className="relative group">
                <div className="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1 rounded-lg backdrop-blur-md border border-white/10 z-10">
                  <button onClick={() => handleEditLever(lever)} className="p-1 text-muted-foreground hover:text-white transition-colors" title="Editar"><Pencil className="size-3" /></button>
                  <button onClick={() => handleDeleteLever(lever.id)} className="p-1 text-muted-foreground hover:text-danger transition-colors" title="Excluir"><Trash2 className="size-3" /></button>
                </div>
                
                <div className={cn(
                  "p-4 rounded-xl border border-white/5",
                  lever.color === "primary" ? "bg-[#8A05BE]/5" :
                  lever.color === "success" ? "bg-success/5" :
                  lever.color === "warning" ? "bg-warning/5" :
                  lever.color === "danger" ? "bg-danger/5" : "bg-info/5"
                )}>
                  <div className={cn(
                    "flex items-center gap-2 font-bold mb-2",
                    lever.color === "primary" ? "text-[#8A05BE]" :
                    lever.color === "success" ? "text-success" :
                    lever.color === "warning" ? "text-warning" :
                    lever.color === "danger" ? "text-danger" : "text-info"
                  )}>
                    {getIcon(lever.iconName, "size-4")} {lever.title}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {lever.description}
                  </p>
                </div>
                
                {idx < levers.length - 1 && <div className="w-full h-[1px] bg-white/10 mt-4" />}
              </div>
            ))}
            {levers.length === 0 && (
              <div className="text-center py-6 text-muted-foreground italic text-sm">Nenhuma alavanca cadastrada.</div>
            )}
          </div>
        </div>
      </div>

      {/* Step CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-background border border-border rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold">{editingStep ? "Editar Ação" : "Nova Ação"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-white/5"><X className="size-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Título da Ação</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-white"
                  placeholder="Ex: Campanha Google Ads..."
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Descrição</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-white min-h-[100px] resize-none"
                  placeholder="Detalhes da execução..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Prazo / Deadline</label>
                  <input 
                    type="text" 
                    value={formData.deadline} 
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-white"
                    placeholder="Ex: Semana 2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Impacto</label>
                  <select 
                    value={formData.impact} 
                    onChange={e => setFormData({...formData, impact: e.target.value as any})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-white"
                  >
                    <option value="high">Alto</option>
                    <option value="medium">Médio</option>
                    <option value="low">Baixo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Status</label>
                <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-xl">
                  <button onClick={() => setFormData({...formData, status: "pending"})} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-colors", formData.status === "pending" ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5")}>Pendente</button>
                  <button onClick={() => setFormData({...formData, status: "in_progress"})} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-colors", formData.status === "in_progress" ? "bg-[#8A05BE]/20 text-[#8A05BE]" : "text-muted-foreground hover:bg-white/5")}>Em Andamento</button>
                  <button onClick={() => setFormData({...formData, status: "done"})} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-colors", formData.status === "done" ? "bg-success/20 text-success" : "text-muted-foreground hover:bg-white/5")}>Concluído</button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSaveStep} className="bg-[#8A05BE] hover:bg-[#8A05BE]/90 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg transition-all">Salvar Ação</button>
            </div>
          </div>
        </div>
      )}

      {/* Lever CRUD Modal */}
      {isLeverModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-background border border-border rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold">{editingLever ? "Editar Alavanca" : "Nova Alavanca"}</h3>
              <button onClick={() => setIsLeverModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-white/5"><X className="size-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Título da Alavanca</label>
                <input 
                  type="text" 
                  value={leverFormData.title} 
                  onChange={e => setLeverFormData({...leverFormData, title: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-white"
                  placeholder="Ex: Público Alvo"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Descrição / Conteúdo</label>
                <textarea 
                  value={leverFormData.description} 
                  onChange={e => setLeverFormData({...leverFormData, description: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-white min-h-[100px] resize-none"
                  placeholder="Detalhes..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Cor / Tema</label>
                  <select 
                    value={leverFormData.color} 
                    onChange={e => setLeverFormData({...leverFormData, color: e.target.value as any})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-white"
                  >
                    <option value="primary">Primário (Roxo)</option>
                    <option value="success">Sucesso (Verde)</option>
                    <option value="warning">Atenção (Amarelo)</option>
                    <option value="danger">Perigo (Vermelho)</option>
                    <option value="info">Info (Azul)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Ícone</label>
                  <select 
                    value={leverFormData.iconName} 
                    onChange={e => setLeverFormData({...leverFormData, iconName: e.target.value as any})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors text-white"
                  >
                    <option value="Users">Usuários</option>
                    <option value="TrendingUp">Gráfico Subindo</option>
                    <option value="Trophy">Troféu</option>
                    <option value="Target">Alvo</option>
                    <option value="Zap">Raio</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setIsLeverModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSaveLever} className="bg-[#8A05BE] hover:bg-[#8A05BE]/90 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg transition-all">Salvar Alavanca</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Selector Modal */}
      {isKpiModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-background border border-border rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-xl font-bold">Customizar Indicadores (KPIs)</h3>
                <p className="text-sm text-muted-foreground">Marque quais dados você deseja puxar de toda a plataforma para o seu painel da Meta 100.</p>
              </div>
              <button onClick={() => setIsKpiModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-white/5"><X className="size-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {Array.from(new Set(AVAILABLE_KPIS.map(k => k.group))).map(group => (
                  <div key={group} className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#8A05BE] border-b border-white/5 pb-2">{group}</h4>
                    <div className="space-y-2">
                      {AVAILABLE_KPIS.filter(k => k.group === group).map(kpi => (
                        <label key={kpi.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/10">
                          <input 
                            type="checkbox" 
                            checked={selectedKpis.includes(kpi.id)}
                            onChange={() => toggleKpi(kpi.id)}
                            className="size-4 rounded border-white/20 bg-black/40 text-[#8A05BE] focus:ring-[#8A05BE] focus:ring-offset-background cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-bold text-white leading-none mb-1">{kpi.label}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              {kpi.type === "currency" ? "Financeiro" : kpi.type === "percent" ? "Porcentagem" : "Numérico"}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-black/20 rounded-b-3xl">
              <button onClick={() => setIsKpiModalOpen(false)} className="bg-[#8A05BE] hover:bg-[#8A05BE]/90 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg transition-all">Concluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
