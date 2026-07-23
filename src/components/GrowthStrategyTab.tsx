import { useState, useMemo } from "react";
import { Plus, Trash2, LayoutTemplate, Activity, DollarSign, Users, Target, CheckSquare, LineChart, ListTodo, MousePointer2, Database, TrendingDown, TrendingUp, Bus, Package, Building2, UserCog, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { useCrmRealtime } from "@/hooks/use-crm-realtime";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";
import { useTransactionsRealtime } from "@/hooks/use-transactions-realtime";
import { usePackagesRealtime } from "@/hooks/use-packages-realtime";
import { useDriversRealtime } from "@/hooks/use-drivers-realtime";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useShiftsRealtime } from "@/hooks/use-shifts-realtime";

export interface DynamicTab {
  id: string;
  title: string;
  content: string;
  pinnedMetrics: string[];
  customFields?: { id: string; label: string; value: string }[];
  actionButtons?: { id: string; label: string; color: string }[];
  customQueries?: { id: string; label: string; value: string; table: string }[];
}

interface GrowthStrategyTabProps {
  tab: DynamicTab;
  onUpdate: (tab: DynamicTab) => void;
  onDelete: (id: string) => void;
}

const AVAILABLE_METRICS = [
  // Faturamento e Caixa
  { id: "revenue", label: "Faturamento Bruto (30d)", icon: DollarSign, color: "text-success", category: "Financeiro" },
  { id: "cash", label: "Caixa Validado (30d)", icon: CheckSquare, color: "text-success", category: "Financeiro" },
  { id: "ticket", label: "Ticket Médio", icon: Target, color: "text-primary", category: "Financeiro" },
  { id: "commissions", label: "Comissões Pagas (30d)", icon: TrendingDown, color: "text-danger", category: "Financeiro" },
  
  // Despesas e Custos
  { id: "opex", label: "Custo Operacional (OPEX)", icon: TrendingDown, color: "text-danger", category: "Custos" },
  { id: "capex", label: "Investimentos (CAPEX)", icon: TrendingUp, color: "text-warning", category: "Custos" },
  
  // Operacional e Frota
  { id: "trips", label: "Viagens Realizadas (30d)", icon: Bus, color: "text-info", category: "Operação" },
  { id: "packages", label: "Encomendas Transportadas", icon: Package, color: "text-info", category: "Operação" },
  { id: "drivers", label: "Motoristas Ativos na Frota", icon: UserCog, color: "text-foreground", category: "Operação" },
  { id: "shifts", label: "Plantões Operacionais", icon: CalendarClock, color: "text-muted-foreground", category: "Operação" },
  
  // Comercial
  { id: "leads", label: "Leads Totais no Funil", icon: Users, color: "text-warning", category: "Comercial" },
  { id: "conversion", label: "Taxa de Conversão CRM", icon: Target, color: "text-primary", category: "Comercial" },
  { id: "sales_count", label: "Total de Vendas (Qtd)", icon: Activity, color: "text-success", category: "Comercial" },
  { id: "partners", label: "Empresas Parceiras Ativas", icon: Building2, color: "text-primary", category: "Comercial" },
];

import { DataExplorerModal } from "./DataExplorerModal";

export function GrowthStrategyTab({ tab, onUpdate, onDelete }: GrowthStrategyTabProps) {
  const { sales } = useSalesRealtime();
  const { leads } = useCrmRealtime();
  const { trips } = useTripsRealtime();
  const { closings } = useCashClosingsRealtime();
  const { transactions } = useTransactionsRealtime();
  const { packages } = usePackagesRealtime();
  const { drivers } = useDriversRealtime();
  const { partners } = usePartnersRealtime();
  const { shifts } = useShiftsRealtime();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  const [isDataExplorerOpen, setIsDataExplorerOpen] = useState(false);

  // Fallbacks for new properties
  const customFields = tab.customFields || [];
  const actionButtons = tab.actionButtons || [];
  const customQueries = tab.customQueries || [];

  // Calculate Metrics
  const metricsData = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Financeiro
    const recentSales = sales.filter(s => new Date(s.sale_date || s.created_at || "") >= thirtyDaysAgo);
    const revenue = recentSales.reduce((acc, s) => acc + Number(s.amount || 0), 0);
    const ticket = recentSales.length > 0 ? revenue / recentSales.length : 0;
    
    const recentClosings = closings.filter(c => new Date(c.closing_date) >= thirtyDaysAgo);
    const totalCash = recentClosings.reduce((acc, c) => acc + Number(c.total_revenue_calc || 0), 0);
    const totalCommissions = recentClosings.reduce((acc, c) => acc + Number(c.total_commission_calc || 0), 0);

    // Custos (Transações de saída)
    const recentExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo);
    const capex = recentExpenses.filter(t => t.category === 'CAPEX / Aquisições').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const opex = recentExpenses.filter(t => t.category !== 'CAPEX / Aquisições' && t.category !== 'Pró-Labore / Distribuição').reduce((acc, t) => acc + Number(t.amount || 0), 0);

    // Comercial e CRM
    const activeLeads = leads.filter(l => l.status !== "venda" && l.status !== "nao_atendido" && l.status !== "revenda");
    const wonLeads = leads.filter(l => l.status === "venda" || l.status === "revenda");
    const conversion = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;
    
    // Operacional
    const recentTrips = trips.filter(t => new Date(t.raw_scheduled_departure || t.created_at) >= thirtyDaysAgo);
    const recentPackages = packages.filter(p => new Date(p.created_at) >= thirtyDaysAgo);

    return {
      revenue: revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      cash: totalCash.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      ticket: ticket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      commissions: totalCommissions.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      
      opex: opex.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      capex: capex.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      
      trips: recentTrips.length.toString(),
      packages: recentPackages.length.toString(),
      drivers: drivers.length.toString(),
      shifts: shifts.length.toString(),
      
      leads: leads.length.toString(), // All leads in funnel
      conversion: `${conversion.toFixed(1)}%`,
      sales_count: recentSales.length.toString(),
      partners: partners.length.toString()
    };
  }, [sales, leads, trips, closings, transactions, packages, drivers, partners, shifts]);

  const toggleMetric = (metricId: string) => {
    const newMetrics = tab.pinnedMetrics.includes(metricId)
      ? tab.pinnedMetrics.filter(m => m !== metricId)
      : [...tab.pinnedMetrics, metricId];
    onUpdate({ ...tab, pinnedMetrics: newMetrics });
  };

  const addField = () => {
    const newField = { id: Math.random().toString(), label: "Novo Parâmetro", value: "" };
    onUpdate({ ...tab, customFields: [...customFields, newField] });
  };

  const updateField = (id: string, key: "label" | "value", val: string) => {
    onUpdate({ 
      ...tab, 
      customFields: customFields.map(f => f.id === id ? { ...f, [key]: val } : f) 
    });
  };

  const removeField = (id: string) => {
    onUpdate({ ...tab, customFields: customFields.filter(f => f.id !== id) });
  };

  const addButton = () => {
    const colors = ["bg-primary", "bg-success", "bg-warning", "bg-info", "bg-danger", "bg-foreground"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newBtn = { id: Math.random().toString(), label: "Nova Ação", color: randomColor };
    onUpdate({ ...tab, actionButtons: [...actionButtons, newBtn] });
  };

  const updateButton = (id: string, label: string) => {
    onUpdate({ ...tab, actionButtons: actionButtons.map(b => b.id === id ? { ...b, label } : b) });
  };

  const removeButton = (id: string) => {
    onUpdate({ ...tab, actionButtons: actionButtons.filter(b => b.id !== id) });
  };

  // Group metrics by category for UI
  const categories = Array.from(new Set(AVAILABLE_METRICS.map(m => m.category)));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
        {isEditingTitle ? (
          <input
            type="text"
            autoFocus
            className="bg-transparent border-b border-primary text-2xl font-bold tracking-tight outline-none w-1/2"
            value={tab.title}
            onChange={e => onUpdate({ ...tab, title: e.target.value })}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={e => e.key === "Enter" && setIsEditingTitle(false)}
          />
        ) : (
          <h2 
            className="text-2xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors flex items-center gap-3"
            onClick={() => setIsEditingTitle(true)}
            title="Clique para renomear"
          >
            {tab.title}
            <span className="text-[10px] uppercase font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1">
               <Plus className="size-3"/> Editar Nome
            </span>
          </h2>
        )}

        <div className="flex gap-2">
           <button 
             onClick={() => setShowMetricSelector(!showMetricSelector)}
             className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-foreground px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg"
           >
             <LineChart className="size-4 text-primary" /> Painel Geral do Sistema
           </button>
           <button 
             onClick={() => onDelete(tab.id)}
             className="flex items-center gap-2 bg-danger/10 text-danger hover:bg-danger/20 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg"
           >
             <Trash2 className="size-4" /> Excluir Aba
           </button>
        </div>
      </div>

      {showMetricSelector && (
        <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 shadow-inner">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-widest">
              <Database className="size-4" /> Dicionário de Dados do Sistema
            </div>
            <div className="text-xs text-muted-foreground italic">Clique no card para enviar o dado vivo para a sua Estratégia.</div>
          </div>
          
          <div className="flex flex-col gap-6">
            {categories.map(cat => (
              <div key={cat}>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{cat}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {AVAILABLE_METRICS.filter(m => m.category === cat).map(m => {
                    const isPinned = tab.pinnedMetrics.includes(m.id);
                    return (
                      <div 
                        key={m.id}
                        onClick={() => toggleMetric(m.id)}
                        className={cn("cursor-pointer p-3 rounded-xl border transition-all flex flex-col items-start gap-2 relative overflow-hidden group", 
                          isPinned ? "bg-white/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]" : "bg-black/60 border-white/5 hover:bg-white/5"
                        )}
                      >
                        {isPinned && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 rounded-full blur-[20px] -mr-8 -mt-8 pointer-events-none"></div>}
                        
                        <div className="flex items-center justify-between w-full">
                           <div className={cn("p-1.5 rounded-md bg-background", m.color)}>
                             <m.icon className="size-3" />
                           </div>
                           {isPinned && <CheckSquare className="size-3.5 text-primary" />}
                        </div>
                        
                        <div className="flex-1 w-full mt-1">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{m.label}</div>
                          <div className="font-mono text-sm font-bold text-foreground mt-0.5">{metricsData[m.id as keyof typeof metricsData]}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Brainstorm Tools */}
        <div className="lg:col-span-1 space-y-6">
           
           {/* Pinned Metrics */}
           <div className="space-y-3">
             <div className="flex items-center justify-between">
               <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                 <LineChart className="size-4" /> Monitoramento
               </label>
               <button onClick={() => setIsDataExplorerOpen(true)} className="text-primary hover:bg-primary/10 p-1 rounded transition-colors" title="Criar Query Customizada no Banco (SQL)"><Database className="size-4" /></button>
             </div>
             
             {tab.pinnedMetrics.length === 0 && customQueries.length === 0 ? (
               <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-xs text-muted-foreground italic">
                 Abra o Painel Geral do Sistema acima para puxar métricas ao vivo para cá.
               </div>
             ) : (
               <div className="flex flex-col gap-3">
                 {tab.pinnedMetrics.map(metricId => {
                   const m = AVAILABLE_METRICS.find(x => x.id === metricId);
                   if (!m) return null;
                   return (
                     <div key={metricId} className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-4 group">
                       <div className="flex items-center gap-2 mb-1">
                         <m.icon className={cn("size-3", m.color)} />
                         <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{m.label}</h3>
                       </div>
                       <div className="text-xl font-extrabold font-mono tracking-tighter text-foreground">
                         {metricsData[metricId as keyof typeof metricsData]}
                       </div>
                     </div>
                   );
                 })}
                 
                 {customQueries.map(query => (
                    <div key={query.id} className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 group">
                       <button onClick={() => onUpdate({...tab, customQueries: customQueries.filter(q => q.id !== query.id)})} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-danger hover:bg-danger/10 rounded transition-all"><Trash2 className="size-3" /></button>
                       <div className="flex items-center gap-2 mb-1">
                         <Database className="size-3 text-primary" />
                         <h3 className="text-[9px] font-bold uppercase tracking-widest text-primary">{query.label} <span className="text-muted-foreground font-normal">({query.table})</span></h3>
                       </div>
                       <div className="text-xl font-extrabold font-mono tracking-tighter text-foreground">
                         {query.value}
                       </div>
                    </div>
                 ))}
               </div>
             )}
           </div>

           {/* Action Buttons Maker */}
           <div className="space-y-3 pt-4 border-t border-white/5">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <MousePointer2 className="size-4" /> Ações Rápidas
                </label>
                <button onClick={addButton} className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"><Plus className="size-4" /></button>
             </div>
             
             {actionButtons.length === 0 ? (
               <div className="text-xs text-muted-foreground italic opacity-60">Crie botões para registrar etapas.</div>
             ) : (
               <div className="flex flex-col gap-2">
                  {actionButtons.map(btn => (
                     <div key={btn.id} className="flex items-center gap-2 group">
                        <input 
                          type="text" 
                          value={btn.label}
                          onChange={(e) => updateButton(btn.id, e.target.value)}
                          className={cn("flex-1 px-3 py-2 rounded-lg text-sm font-bold text-center text-white outline-none focus:ring-2 focus:ring-white/20 transition-all", btn.color)}
                        />
                        <button onClick={() => removeButton(btn.id)} className="opacity-0 group-hover:opacity-100 p-2 text-danger hover:bg-danger/10 rounded-lg transition-all"><Trash2 className="size-3" /></button>
                     </div>
                  ))}
               </div>
             )}
           </div>

           {/* Custom Fields Maker */}
           <div className="space-y-3 pt-4 border-t border-white/5">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ListTodo className="size-4" /> Variáveis
                </label>
                <button onClick={addField} className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"><Plus className="size-4" /></button>
             </div>
             
             {customFields.length === 0 ? (
               <div className="text-xs text-muted-foreground italic opacity-60">Crie campos (Ex: Orçamento).</div>
             ) : (
               <div className="flex flex-col gap-3">
                  {customFields.map(field => (
                     <div key={field.id} className="bg-black/20 p-2 rounded-xl border border-white/5 relative group">
                        <button onClick={() => removeField(field.id)} className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><XIcon className="size-2" /></button>
                        <input 
                          type="text" 
                          value={field.label}
                          placeholder="Nome da Variável"
                          onChange={(e) => updateField(field.id, "label", e.target.value)}
                          className="w-full bg-transparent border-b border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary outline-none focus:border-primary/50 mb-1"
                        />
                        <input 
                          type="text" 
                          value={field.value}
                          placeholder="Defina o valor..."
                          onChange={(e) => updateField(field.id, "value", e.target.value)}
                          className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm font-medium text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                        />
                     </div>
                  ))}
               </div>
             )}
           </div>
        </div>

        {/* Right Column: Free Document */}
        <div className="lg:col-span-3 space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <LayoutTemplate className="size-4" /> Quadro de Anotações Livre
          </label>
          <textarea
            value={tab.content}
            onChange={e => onUpdate({ ...tab, content: e.target.value })}
            placeholder="Documente o brainstorm aqui..."
            className="w-full h-[700px] rounded-3xl border border-white/10 bg-black/40 p-8 text-foreground outline-none focus:border-primary transition-colors resize-none leading-relaxed text-lg shadow-2xl backdrop-blur-xl"
          />
        </div>

      </div>

      <DataExplorerModal 
        isOpen={isDataExplorerOpen}
        onClose={() => setIsDataExplorerOpen(false)}
        onAddMetric={(metric) => onUpdate({ ...tab, customQueries: [...customQueries, metric] })}
      />
    </div>
  );
}

function XIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  )
}
