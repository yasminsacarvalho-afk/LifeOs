import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";
import { GrowthTestFormModal } from "@/components/GrowthTestFormModal";
import { CompetitorPriceFormModal } from "@/components/CompetitorPriceFormModal";
import { GrowthStrategyTab } from "@/components/GrowthStrategyTab";
import { VcaSpStrategyTab } from "@/components/VcaSpStrategyTab";
import { Pencil, Trash2 } from "lucide-react";
import { 
  Target, BarChart3, TrendingUp, DollarSign, Users, 
  Search, Plus, Activity, SearchCheck, CheckCircle2, 
  XCircle, Filter, Percent, ArrowUpRight, ArrowDownRight, TestTube2, AlertTriangle, Eye, LineChart, Store
} from "lucide-react";

export const Route = createFileRoute("/growth")({
  component: GrowthLaboratory,
  head: () => ({
    meta: [{ title: "Laboratório de Growth · Voyage Flow" }],
  }),
});

interface GrowthTest {
  id: string;
  name: string;
  objective: string;
  status: "active" | "completed" | "paused";
  budget: number;
  spent: number;
  cpc: number; // Cost per click
  leads: number;
  sales: number;
  revenue: number;
  targetCac: number;
  startDate: string;
}

interface CompetitorPrice {
  id: string;
  competitor: string;
  service: string;
  competitorPrice: number;
  competitorClass: string;
  ourPrice: number;
  ourClass: string;
  difference: number;
  notes: string;
  ourNotes: string;
  lastChecked: string;
  customFields?: Record<string, string>;
}

const formatCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const generateId = () => Math.random().toString(36).substr(2, 9);

export function GrowthLaboratory() {
  const [activeTab, setActiveTab] = useState<string>("tests");
  
  // Local State
  const [dynamicTabs, setDynamicTabs] = useState<any[]>(() => {
    const saved = localStorage.getItem("vf_growth_dynamic_tabs");
    if (saved) return JSON.parse(saved);
    return [];
  });

  useEffect(() => {
    localStorage.setItem("vf_growth_dynamic_tabs", JSON.stringify(dynamicTabs));
  }, [dynamicTabs]);
  const [tests, setTests] = useState<GrowthTest[]>(() => {
    const saved = localStorage.getItem("vf_growth_tests");
    if (saved) return JSON.parse(saved);
    return [
      { id: "1", name: "Campanha Meta Ads - Pacotes Nordeste", objective: "Aumentar Leads de Pacotes", status: "active", budget: 5000, spent: 1250, cpc: 0.45, leads: 120, sales: 15, revenue: 8500, targetCac: 100, startDate: new Date().toISOString() },
      { id: "2", name: "Teste A/B Landing Page Fretamento", objective: "Reduzir CAC de Fretamento", status: "completed", budget: 2000, spent: 2000, cpc: 1.12, leads: 50, sales: 5, revenue: 12000, targetCac: 350, startDate: new Date(Date.now() - 1000000000).toISOString() }
    ];
  });

  const [prices, setPrices] = useState<CompetitorPrice[]>(() => {
    const saved = localStorage.getItem("vf_competitor_prices");
    if (saved) return JSON.parse(saved);
    return [
      { id: "1", competitor: "Buser", service: "Passagem SP -> RJ", competitorPrice: 89.90, ourPrice: 79.90, difference: -10, notes: "Monitorando promoção de fim de semana.", lastChecked: new Date().toISOString() },
      { id: "2", competitor: "ClickBus", service: "Passagem BH -> SP", competitorPrice: 145.00, ourPrice: 155.00, difference: 10, notes: "Nós oferecemos leito, eles semi-leito.", lastChecked: new Date().toISOString() }
    ];
  });

  useEffect(() => {
    localStorage.setItem("vf_growth_tests", JSON.stringify(tests));
  }, [tests]);

  useEffect(() => {
    localStorage.setItem("vf_competitor_prices", JSON.stringify(prices));
  }, [prices]);


  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<GrowthTest | null>(null);

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<CompetitorPrice | null>(null);

  const [searchCompetitor, setSearchCompetitor] = useState("");
  const filteredPrices = prices.filter(p => 
    p.service.toLowerCase().includes(searchCompetitor.toLowerCase()) || 
    p.competitor.toLowerCase().includes(searchCompetitor.toLowerCase())
  );

  const handleSaveTest = (data: Omit<GrowthTest, "id" | "cpc" | "startDate">) => {
    if (editingTest) {
      setTests(tests.map(t => t.id === editingTest.id ? { ...t, ...data, cpc: data.sales > 0 ? data.spent / data.sales : 0 } : t));
    } else {
      setTests([...tests, { 
        ...data, 
        id: generateId(), 
        cpc: data.sales > 0 ? data.spent / data.sales : 0, 
        startDate: new Date().toISOString() 
      }]);
    }
    setIsTestModalOpen(false);
    setEditingTest(null);
  };

  const handleDeleteTest = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este teste?")) {
      setTests(tests.filter(t => t.id !== id));
    }
  };

  const handleSavePrice = (data: Omit<CompetitorPrice, "id" | "difference" | "lastChecked">) => {
    const diff = data.ourPrice - data.competitorPrice;
    if (editingPrice) {
      setPrices(prices.map(p => p.id === editingPrice.id ? { ...p, ...data, difference: diff, lastChecked: new Date().toISOString() } : p));
    } else {
      setPrices([...prices, { 
        ...data, 
        id: generateId(), 
        difference: diff,
        lastChecked: new Date().toISOString() 
      }]);
    }
    setIsPriceModalOpen(false);
    setEditingPrice(null);
  };

  const handleDeletePrice = (id: string) => {
    if (confirm("Tem certeza que deseja remover este monitoramento?")) {
      setPrices(prices.filter(p => p.id !== id));
    }
  };

  // Derived Metrics
  const activeTests = tests.filter(t => t.status === "active");
  const totalSpent = tests.reduce((sum, t) => sum + t.spent, 0);
  const totalRevenue = tests.reduce((sum, t) => sum + t.revenue, 0);
  const globalRoi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

  return (
    <>
      <TopBar 
        title="Laboratório de Growth" 
        subtitle="Gerenciamento de testes de tráfego, CAC e monitoramento da concorrência." 
      />

      <main className="px-4 md:px-8 py-6 md:py-8 space-y-8 max-w-7xl mx-auto">
        
        {/* KPI Row */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-primary/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <TestTube2 className="size-5 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Testes Ativos</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-foreground">
              {activeTests.length}
            </div>
            <div className="text-xs font-semibold text-primary mt-2 flex items-center gap-1.5">
               <Activity className="size-3" /> Em fase de experimentação
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-warning/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-warning/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="size-5 text-warning" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Investimento Total (Ads)</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-warning">
              {formatCurrency(totalSpent)}
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1.5">
               <LineChart className="size-3" /> Gasto acumulado
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-success/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-success/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="size-5 text-success" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">ROI de Growth</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-success">
              {globalRoi.toFixed(0)}%
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1.5">
               <TrendingUp className="size-3" /> Retorno sobre investimento
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-info/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-info/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <SearchCheck className="size-5 text-info" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Preços Monitorados</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-foreground">
              {prices.length}
            </div>
            <div className="text-xs font-semibold text-info mt-2 flex items-center gap-1.5">
               <Eye className="size-3" /> Inteligência de mercado
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border overflow-x-auto whitespace-nowrap hide-scrollbar">
          <button 
            onClick={() => setActiveTab("tests")}
            className={cn("px-6 py-3 font-medium text-sm transition-colors border-b-2 flex-shrink-0", activeTab === "tests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            <div className="flex items-center gap-2"><TestTube2 className="size-4" /> Gestão de Tráfego & CAC</div>
          </button>
          <button 
            onClick={() => setActiveTab("competitors")}
            className={cn("px-6 py-3 font-medium text-sm transition-colors border-b-2 flex-shrink-0", activeTab === "competitors" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            <div className="flex items-center gap-2"><SearchCheck className="size-4" /> Monitoramento da Concorrência</div>
          </button>
          <button 
            onClick={() => setActiveTab("vcasp")}
            className={cn("px-6 py-3 font-medium text-sm transition-colors border-b-2 flex-shrink-0", activeTab === "vcasp" ? "border-[#8A05BE] text-[#8A05BE]" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            <div className="flex items-center gap-2"><Target className="size-4" /> Meta 100: VCA x SP</div>
          </button>

          {dynamicTabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn("px-6 py-3 font-medium text-sm transition-colors border-b-2 flex-shrink-0", activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              <div className="flex items-center gap-2"><Target className="size-4" /> {tab.title}</div>
            </button>
          ))}

          <button 
            onClick={() => {
              const newTab = { id: generateId(), title: "Nova Estratégia", content: "", pinnedMetrics: [] };
              setDynamicTabs([...dynamicTabs, newTab]);
              setActiveTab(newTab.id);
            }}
            className="px-4 py-3 font-medium text-sm transition-colors text-muted-foreground hover:text-primary flex-shrink-0 border-b-2 border-transparent"
          >
            <div className="flex items-center gap-2"><Plus className="size-4" /></div>
          </button>
        </div>

                {/* Dynamic Tab Content */}
        {(() => {
          const activeDynamicTab = dynamicTabs.find(t => t.id === activeTab);
          if (!activeDynamicTab) return null;
          return (
            <GrowthStrategyTab 
              key={activeDynamicTab.id}
              tab={activeDynamicTab}
              onUpdate={(updatedTab) => setDynamicTabs(dynamicTabs.map(t => t.id === updatedTab.id ? updatedTab : t))}
              onDelete={(id) => {
                setDynamicTabs(dynamicTabs.filter(t => t.id !== id));
                setActiveTab("tests");
              }}
            />
          );
        })()}

        {/* VCA x SP Hardcoded Tab */}
        {activeTab === "vcasp" && <VcaSpStrategyTab />}

        {/* Tests Content */}
        {activeTab === "tests" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Painel de Experimentos de Ads</h2>
              <button onClick={() => { setEditingTest(null); setIsTestModalOpen(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">
                <Plus className="size-4" /> Novo Teste
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {tests.map(test => {
                const currentCac = test.sales > 0 ? test.spent / test.sales : 0;
                const roi = test.spent > 0 ? ((test.revenue - test.spent) / test.spent) * 100 : 0;
                const cacStatus = currentCac <= test.targetCac ? "success" : currentCac <= test.targetCac * 1.2 ? "warning" : "danger";

                return (
                  <div key={test.id} className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col md:flex-row gap-8 items-start relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-20 transition-colors", test.status === "active" ? "bg-primary" : "bg-muted")} />
                    
                    <div className="flex-1 w-full relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border", 
                          test.status === "active" ? "bg-primary/10 text-primary border-primary/20" : 
                          test.status === "completed" ? "bg-success/10 text-success border-success/20" : 
                          "bg-muted/10 text-muted-foreground border-border"
                        )}>
                          {test.status === "active" ? "Em andamento" : test.status === "completed" ? "Concluído" : "Pausado"}
                        </span>
                        
                        <span className="text-xs text-muted-foreground">Investimento Max: {formatCurrency(test.budget)}</span>
                      </div>
                      <div className="absolute top-0 right-0 flex items-center gap-2">
                        <button onClick={() => { setEditingTest(test); setIsTestModalOpen(true); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-4" /></button>
                        <button onClick={() => handleDeleteTest(test.id)} className="p-2 bg-danger/10 hover:bg-danger/20 rounded-lg text-danger transition-colors"><Trash2 className="size-4" /></button>
                      </div>

                      <h3 className="text-xl font-bold text-foreground mb-1">{test.name}</h3>
                      <p className="text-sm text-muted-foreground mb-6">{test.objective}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Gasto Atual</div>
                          <div className="font-mono text-lg font-bold">{formatCurrency(test.spent)}</div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Leads</div>
                          <div className="font-mono text-lg font-bold">{test.leads} <span className="text-xs text-muted-foreground font-sans">gerados</span></div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Vendas</div>
                          <div className="font-mono text-lg font-bold">{test.sales} <span className="text-xs text-muted-foreground font-sans">fechadas</span></div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Receita Gerada</div>
                          <div className="font-mono text-lg font-bold text-success">{formatCurrency(test.revenue)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-64 flex flex-col gap-4 relative z-10">
                      <div className={cn("p-4 rounded-2xl border flex flex-col items-center justify-center text-center shadow-lg", 
                        cacStatus === "success" ? "bg-success/10 border-success/20" : 
                        cacStatus === "warning" ? "bg-warning/10 border-warning/20" : 
                        "bg-danger/10 border-danger/20"
                      )}>
                        <div className={cn("text-[10px] uppercase font-bold tracking-widest mb-1", 
                          cacStatus === "success" ? "text-success" : cacStatus === "warning" ? "text-warning" : "text-danger"
                        )}>CAC Realizado</div>
                        <div className={cn("font-mono text-3xl font-black tracking-tighter", 
                          cacStatus === "success" ? "text-success" : cacStatus === "warning" ? "text-warning" : "text-danger"
                        )}>{formatCurrency(currentCac)}</div>
                        <div className="text-xs mt-1 opacity-70">Meta: {formatCurrency(test.targetCac)}</div>
                      </div>

                      <div className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                        <span className="text-xs font-bold text-muted-foreground uppercase">ROI</span>
                        <span className={cn("font-mono font-bold", roi >= 0 ? "text-success" : "text-danger")}>
                          {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Competitors Content */}
        {activeTab === "competitors" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold tracking-tight">Monitoramento Estratégico de Preços</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por rota ou concorrente..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary transition-colors"
                    value={searchCompetitor}
                    onChange={(e) => setSearchCompetitor(e.target.value)}
                  />
                </div>
                <button onClick={() => { setEditingPrice(null); setIsPriceModalOpen(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 whitespace-nowrap">
                  <Plus className="size-4" /> Adicionar
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Concorrente</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Rota / Serviço</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-danger bg-danger/5 border-l border-danger/10 text-right">O Deles (Preço / Classe)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-success bg-success/5 border-r border-success/10 text-right">O Nosso (Preço / Classe)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Vantagem de Preço</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-[300px]">Comparativo (Diferenciais / Critérios)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPrices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum concorrente ou rota encontrada para o filtro.</td>
                    </tr>
                  ) : filteredPrices.map(price => {
                    const isCheaper = price.difference > 0; // Se diferença > 0, nós somos mais caros
                    const isSame = price.difference === 0;
                    return (
                      <tr key={price.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-4 font-bold flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <Store className="size-4 text-muted-foreground" />
                          </div>
                          {price.competitor}
                        </td>
                        <td className="p-4 font-medium text-sm">{price.service}</td>
                        <td className="p-4 text-right bg-danger/5 border-l border-danger/10">
                          <div className="font-mono font-bold text-muted-foreground line-through opacity-80">{formatCurrency(price.competitorPrice)}</div>
                          <div className="text-[10px] uppercase font-bold text-danger mt-1">{price.competitorClass}</div>
                        </td>
                        <td className="p-4 text-right bg-success/5 border-r border-success/10">
                          <div className="font-mono font-bold text-foreground">{formatCurrency(price.ourPrice)}</div>
                          <div className="text-[10px] uppercase font-bold text-success mt-1">{price.ourClass}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border",
                            isSame ? "bg-muted/10 text-muted-foreground border-white/10" :
                            !isCheaper ? "bg-success/10 text-success border-success/20" :
                            "bg-warning/10 text-warning border-warning/20"
                          )}>
                            {!isSame && (!isCheaper ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />)}
                            {!isSame ? `${formatCurrency(Math.abs(price.difference))}` : "Empatado"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          <div className="flex flex-col gap-2">
                            {price.notes && (
                              <div className="flex items-start gap-2 bg-danger/5 p-2 rounded border border-danger/10">
                                <span className="font-bold text-danger uppercase text-[9px] mt-0.5 min-w-[40px]">Deles:</span> 
                                <span>{price.notes}</span>
                              </div>
                            )}
                            {price.ourNotes && (
                              <div className="flex items-start gap-2 bg-success/5 p-2 rounded border border-success/10">
                                <span className="font-bold text-success uppercase text-[9px] mt-0.5 min-w-[40px]">Nosso:</span> 
                                <span className="text-foreground">{price.ourNotes}</span>
                              </div>
                            )}
                            {price.customFields && Object.keys(price.customFields).length > 0 && (
                              <div className="mt-1 pt-1 border-t border-white/5 flex flex-col gap-1">
                                {Object.entries(price.customFields).map(([k, v]) => (
                                  <div key={k} className="flex justify-between items-center bg-black/40 px-2 py-1 rounded text-[10px]">
                                    <span className="font-bold text-muted-foreground">{k}:</span>
                                    <span className="text-foreground">{v}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => { setEditingPrice(price); setIsPriceModalOpen(true); }} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-3.5" /></button>
                             <button onClick={() => handleDeletePrice(price.id)} className="p-1.5 bg-danger/10 hover:bg-danger/20 rounded-md text-danger transition-colors"><Trash2 className="size-3.5" /></button>
                           </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <GrowthTestFormModal 
        isOpen={isTestModalOpen}
        onClose={() => { setIsTestModalOpen(false); setEditingTest(null); }}
        onSave={handleSaveTest}
        initialData={editingTest}
      />
      <CompetitorPriceFormModal 
        isOpen={isPriceModalOpen}
        onClose={() => { setIsPriceModalOpen(false); setEditingPrice(null); }}
        onSave={handleSavePrice}
        initialData={editingPrice}
      />
    </>
  );
}
