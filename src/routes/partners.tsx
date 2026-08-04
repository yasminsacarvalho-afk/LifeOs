import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Building2, DollarSign, Target, Plus, ArrowLeft, Route as RouteIcon, 
  FileText, Scale, ChevronDown, ChevronUp, RefreshCw, Undo2, 
  TrendingUp, Truck, Info, Users, BarChart3, X, Coins, Trash2, Edit2, Check,
  Calendar, AlertTriangle, History, Trophy, CalendarClock, ChevronLeft, ChevronRight
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useState, useMemo } from "react";
import { usePartnersRealtime, type PartnerWithTrips } from "@/hooks/use-partners-realtime";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";
import { getFinancialPeriod, getCurrentDayOfFinancialPeriod } from "@/lib/date-helpers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partners")({
  component: () => <GerenciamentoParceiros title="Empresas Parceiras" />,
});

export function GerenciamentoParceiros({ title }: { title: string }) {
  const { partners, loading } = usePartnersRealtime();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [empresaExpandida, setEmpresaExpandida] = useState<string | null>(null);
  const [expandedConsistency, setExpandedConsistency] = useState<Record<string, boolean>>({});
  const [consistencyTab, setConsistencyTab] = useState<Record<string, 'bases' | 'historico'>>({});
  const [consistencyMonthOffset, setConsistencyMonthOffset] = useState(0);

  const toggleConsistency = (id: string) => {
    setExpandedConsistency(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [editingGoalPartnerId, setEditingGoalPartnerId] = useState<string | null>(null);
  const [editingGoalValue, setEditingGoalValue] = useState<string>("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const handleSaveMonthlyGoal = async (companyId: string, monthKey: string) => {
    try {
       setIsSavingGoal(true);
       const val = Number(editingGoalValue.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''));
       if (isNaN(val) || val <= 0) {
          setEditingGoalPartnerId(null);
          return;
       }
       
       const { data: existing } = await supabase.from("monthly_goals").select("id").eq("company_id", companyId).eq("period_month", monthKey).maybeSingle();
       
       if (existing) {
          await supabase.from("monthly_goals").update({ target_amount: val }).eq("id", existing.id);
       } else {
          await supabase.from("monthly_goals").insert({ company_id: companyId, period_month: monthKey, target_amount: val });
       }
       toast.success("Meta do ciclo atualizada com sucesso!");
       setEditingGoalPartnerId(null);
       setEditingGoalValue("");
    } catch (e) {
       console.error(e);
       toast.error("Erro ao salvar meta.");
    } finally {
       setIsSavingGoal(false);
    }
  };
  
  // Estado para Edição
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [meta, setMeta] = useState("");
  const [comissao, setComissao] = useState("");
  const [linhas, setLinhas] = useState<string[]>([]);
  const [protocolo, setProtocolo] = useState("");
  const [ticketMedio, setTicketMedio] = useState("");
  const [carrosPorDia, setCarrosPorDia] = useState("");
  const [politicaDevolucao, setPoliticaDevolucao] = useState("");
  const [politicaTroca, setPoliticaTroca] = useState("");
  const [maisInformacoes, setMaisInformacoes] = useState("");

  const { closings } = useCashClosingsRealtime();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Análise de Contexto Mensal
  const monthContext = useMemo(() => {
    const now = new Date();
    const period = getFinancialPeriod(now);
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    
    let totalDays = 0;
    let weekends = 0;
    
    const fixedHolidays = [
      { month: 0, day: 1, name: 'Confraternização Universal' },
      { month: 3, day: 21, name: 'Tiradentes' },
      { month: 4, day: 1, name: 'Dia do Trabalho' },
      { month: 8, day: 7, name: 'Independência do Brasil' },
      { month: 9, day: 12, name: 'Nossa Senhora Aparecida' },
      { month: 10, day: 2, name: 'Finados' },
      { month: 10, day: 15, name: 'Proclamação da República' },
      { month: 11, day: 25, name: 'Natal' }
    ];
    
    const holidaysFound = [];
    
    const iter = new Date(start);
    while (iter <= end) {
      totalDays++;
      const dayOfWeek = iter.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) weekends++;
      
      const h = fixedHolidays.find(f => f.month === iter.getMonth() && f.day === iter.getDate());
      if (h) {
         holidaysFound.push(h);
      }
      iter.setDate(iter.getDate() + 1);
    }
    
    return {
       totalDays,
       weekends,
       holidays: holidaysFound
    };
  }, []);

  const metaDiariaCalculada = useMemo(() => {
    const m = Number(meta) || 0;
    return monthContext.totalDays > 0 ? m / monthContext.totalDays : 0;
  }, [meta, monthContext.totalDays]);

  const histAudit = useMemo(() => {
    if (!editingId) return null;
    let currentMonthRev = 0;
    let currentMonthDays = 0;
    let lastMonthRev = 0;
    let lastMonthDays = 0;
    
    const now = new Date();
    const currentPeriod = getFinancialPeriod(now);
    
    const lastMonthDate = new Date(now);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastPeriod = getFinancialPeriod(lastMonthDate);
    
    const recentDays: { date: string, total: number }[] = [];
    
    // Ordena desc para pegar os últimos dias corretamente
    const sortedClosings = [...closings].sort((a, b) => new Date(b.closing_date).getTime() - new Date(a.closing_date).getTime());
    
    sortedClosings.forEach(c => {
       let partnerTotal = 0;
       if (c.company_settlements && Array.isArray(c.company_settlements)) {
          c.company_settlements.forEach((s: any) => {
             if (s.company_id === editingId && Number(s.total || 0) > 0) {
                partnerTotal += Number(s.total);
             }
          });
       }
       
       if (partnerTotal > 0) {
          if (c.closing_date >= currentPeriod.startStr && c.closing_date <= currentPeriod.endStr) {
             currentMonthRev += partnerTotal;
             currentMonthDays++;
          } else if (c.closing_date >= lastPeriod.startStr && c.closing_date <= lastPeriod.endStr) {
             lastMonthRev += partnerTotal;
             lastMonthDays++;
          }
          
          if (recentDays.length < 5) {
             recentDays.push({ date: c.closing_date, total: partnerTotal });
          }
       }
    });
    
    return { 
       current: { rev: currentMonthRev, days: currentMonthDays, avg: currentMonthDays > 0 ? currentMonthRev / currentMonthDays : 0 },
       last: { rev: lastMonthRev, days: lastMonthDays, avg: lastMonthDays > 0 ? lastMonthRev / lastMonthDays : 0 },
       recent: recentDays
    };
  }, [editingId, closings]);

  const dailyGoalConsistency = useMemo(() => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + consistencyMonthOffset);
    
    const isCurrentMonth = new Date().getMonth() === targetDate.getMonth() && new Date().getFullYear() === targetDate.getFullYear();
    const period = getFinancialPeriod(targetDate);
    const daysInMonth = period.daysInPeriod;
    const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    
    return partners.map(partner => {
      const specificGoal = partner.monthly_goals?.find(mg => mg.period_month === monthKey);
      const baseMeta = specificGoal ? specificGoal.target_amount : (Number(partner.meta) || 0);
      const dailyMeta = baseMeta / daysInMonth;
      
      const closingsByDay: Record<string, number> = {};
      
      closings.forEach(c => {
         if (c.closing_date >= period.startStr && c.closing_date <= period.endStr) {
            const dateStr = c.closing_date; 
            if (c.company_settlements && Array.isArray(c.company_settlements)) {
               c.company_settlements.forEach((settlement: any) => {
                  if (settlement.company_id === partner.id) {
                     closingsByDay[dateStr] = (closingsByDay[dateStr] || 0) + Number(settlement.total || 0);
                  }
               });
            }
         }
      });
      
      let daysToCheck = isCurrentMonth ? (getCurrentDayOfFinancialPeriod(targetDate) || 1) : daysInMonth;
      if (daysToCheck > daysInMonth) daysToCheck = daysInMonth;
      
      let daysMet = 0;
      let totalRev = 0;
      let minDay = Infinity;
      let maxDay = -Infinity;
      let surplus = 0;
      let deficit = 0;
      
      let goodDaysSum = 0;
      let goodDaysCount = 0;
      let badDaysSum = 0;
      let badDaysCount = 0;
      
      let peakDay = { date: '', total: -Infinity };
      let worstDay = { date: '', total: Infinity };
      
      const history = [];
      const startDt = new Date(period.startDate);
      
      for (let i = 0; i < daysToCheck; i++) {
         const currentD = new Date(startDt);
         currentD.setDate(currentD.getDate() + i);
         const dateKey = currentD.toISOString().split('T')[0];
         
         const total = closingsByDay[dateKey] || 0;
         totalRev += total;
         
         if (total >= dailyMeta) {
            daysMet++;
            surplus += (total - dailyMeta);
            goodDaysSum += total;
            goodDaysCount++;
         } else {
            deficit += (dailyMeta - total);
            badDaysSum += total;
            badDaysCount++;
         }
         
         if (total < minDay) minDay = total;
         if (total > maxDay) maxDay = total;
         
         if (total > peakDay.total) peakDay = { date: dateKey, total };
         if (total < worstDay.total) worstDay = { date: dateKey, total };
         
         history.push({
            date: dateKey,
            total,
            met: total >= dailyMeta
         });
      }
      
      history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const hitRate = daysToCheck > 0 ? (daysMet / daysToCheck) * 100 : 0;
      
      if (minDay === Infinity) minDay = 0;
      if (maxDay === -Infinity) maxDay = 0;
      const avgDay = daysToCheck > 0 ? totalRev / daysToCheck : 0;
      
      const daysLeft = Math.max(0, daysInMonth - daysToCheck);
      
      // Projeção Estatística Refinada
      const avgGoodDay = goodDaysCount > 0 ? (goodDaysSum / goodDaysCount) : (avgDay * 1.2);
      const avgBadDay = badDaysCount > 0 ? (badDaysSum / badDaysCount) : (avgDay * 0.8);

      const projRuim = totalRev + (daysLeft * avgBadDay);
      const projMedia = totalRev + (daysLeft * avgDay);
      const projOtima = totalRev + (daysLeft * avgGoodDay);
      
      if (peakDay.total === -Infinity) peakDay.total = 0;
      if (worstDay.total === Infinity) worstDay.total = 0;

      const destCount: Record<string, number> = {};
      const servCount: Record<string, number> = {};
      let totalServicos = 0;
      
      if (partner.trips) {
         partner.trips.forEach((t: any) => {
            if (t.scheduled_departure) {
               const d = t.scheduled_departure.split('T')[0];
               if (d >= period.startStr && d <= period.endStr) {
                  if (t.destination) destCount[t.destination] = (destCount[t.destination] || 0) + 1;
                  if (t.code) servCount[t.code] = (servCount[t.code] || 0) + 1;
                  totalServicos++;
               }
            }
         });
      }
      
      const topDestinations = Object.entries(destCount).sort((a,b) => b[1] - a[1]).slice(0, 3).map(x => ({ name: x[0], count: x[1] }));
      const totalDestinos = Object.keys(destCount).length;
      const topServices = Object.entries(servCount).sort((a,b) => b[1] - a[1]).slice(0, 3).map(x => ({ name: x[0], count: x[1] }));
      
      return {
        id: partner.id,
        name: partner.name,
        baseMeta,
        dailyMeta,
        daysMet,
        daysToCheck,
        hitRate,
        surplus,
        deficit,
        netBalance: surplus - deficit,
        history,
        totalRev,
        minDay,
        maxDay,
        avgDay,
        daysLeft,
        projRuim,
        projMedia,
        projOtima,
        peakDay,
        worstDay,
        topDestinations,
        topServices,
        isCurrentMonth,
        targetDate,
        monthKey,
        totalServicos,
        totalDestinos
      };
    });
  }, [partners, closings, consistencyMonthOffset]);

  const comissaoCalculadaFormulario = useMemo(() => {
    const m = Number(meta) || 0;
    const c = Number(comissao) || 0;
    return m * (c / 100);
  }, [meta, comissao]);

  const kpis = useMemo(() => {
    const total = partners.length;
    
    // Calcula com base no ciclo ativo selecionado na inteligência
    const metaTotal = dailyGoalConsistency.length > 0 
      ? dailyGoalConsistency.reduce((acc, dg) => acc + dg.baseMeta, 0)
      : partners.reduce((acc, emp) => acc + (Number(emp.meta) || 0), 0);
      
    const comissaoTotalReal = partners.reduce((acc, emp) => {
      const dg = dailyGoalConsistency.find(d => d.id === emp.id);
      const m = dg ? dg.baseMeta : (Number(emp.meta) || 0);
      const c = Number(emp.comissao) || 0;
      return acc + (m * (c / 100));
    }, 0);
    
    const totalCarros = partners.reduce((acc, emp) => acc + (Number(emp.carros_por_dia) || 0), 0);

    return { total, metaTotal, comissaoTotalReal, totalCarros };
  }, [partners, dailyGoalConsistency]);

  const toggleExpandir = (id: string) => {
    setEmpresaExpandida(empresaExpandida === id ? null : id);
  };

  const handleEditClick = (emp: PartnerWithTrips, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(emp.id);
    setNome(emp.name);
    setMeta(emp.meta?.toString() || "");
    setComissao(emp.comissao?.toString() || "");
    setLinhas(emp.linhas_exclusivas || []);
    setProtocolo(emp.protocolo || "");
    setTicketMedio(emp.ticket_medio?.toString() || "");
    setCarrosPorDia(emp.carros_por_dia?.toString() || "");
    setPoliticaDevolucao(emp.politica_devolucao || "");
    setPoliticaTroca(emp.politica_troca || "");
    setMaisInformacoes(emp.mais_informacoes || "");
    setMostrarFormulario(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir esta empresa parceira? Isso pode afetar frotas vinculadas a ela.")) {
      toast.loading("Excluindo parceiro...", { id: "partner-delete" });
      try {
        const { error } = await supabase.from("partner_companies").delete().eq("id", id);
        if (error) throw error;
        toast.success("Parceiro excluído com sucesso!", { id: "partner-delete" });
      } catch (err) {
        console.error(err);
        toast.error("Erro ao excluir parceiro.", { id: "partner-delete" });
      }
    }
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !meta || !comissao) {
      alert("Por favor, preencha os campos obrigatórios (Razão Social, Meta e Comissão).");
      return;
    }

    setIsSubmitting(true);

    const dataPayload = {
      name: nome,
      slug: nome.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      meta: Number(meta) || 0,
      comissao: Number(comissao) || 0,
      linhas_exclusivas: linhas.map(l => l.trim()).filter(Boolean),
      protocolo,
      politica_devolucao: politicaDevolucao,
      politica_troca: politicaTroca,
      ticket_medio: ticketMedio ? Number(ticketMedio) : null,
      carros_por_dia: carrosPorDia ? Number(carrosPorDia) : null,
      mais_informacoes: maisInformacoes,
    };

    try {
      toast.loading("Salvando parceiro...", { id: "partner-save" });
      if (editingId) {
        const { error } = await supabase.from("partner_companies").update(dataPayload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_companies").insert([dataPayload]);
        if (error) throw error;
      }
      
      toast.success("Parceiro salvo com sucesso!", { id: "partner-save" });
      setMostrarFormulario(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar parceiro.", { id: "partner-save" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNome(""); setMeta(""); setComissao(""); setLinhas([]); setProtocolo("");
    setTicketMedio(""); setCarrosPorDia(""); setPoliticaDevolucao(""); setPoliticaTroca(""); setMaisInformacoes("");
  };

  const handleCancelForm = () => {
    setMostrarFormulario(false);
    resetForm();
  };

  return (
    <>
      <TopBar title={title} subtitle="Métricas consolidadas, parametrização de metas e diretrizes de parceiros." />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
        
        {/* SEÇÃO DE KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between text-white/60">
              <span className="text-xs font-bold uppercase tracking-wider">Total de Parceiros</span>
              <Users className="size-4 text-white" />
            </div>
            <p className="text-3xl font-black tracking-tight text-white">{loading ? '...' : kpis.total}</p>
          </div>

          <div className="rounded-2xl border border-[#8A05BE]/30 bg-black/40 backdrop-blur-xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8A05BE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between text-white/60">
              <span className="text-[10px] font-bold uppercase tracking-wider">Meta Global (Ciclo Ativo)</span>
              <Target className="size-4 text-[#8A05BE]" />
            </div>
            <p className="text-3xl font-black tracking-tight font-mono text-white">
              {loading ? '...' : kpis.metaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-black/40 backdrop-blur-xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between text-white/60">
              <span className="text-[10px] font-bold uppercase tracking-wider">Comissão Total (Ciclo)</span>
              <Coins className="size-4 text-blue-400" />
            </div>
            <p className="text-3xl font-black tracking-tight font-mono text-blue-400">
              {loading ? '...' : kpis.comissaoTotalReal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-black/40 backdrop-blur-xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between text-white/60">
              <span className="text-xs font-bold uppercase tracking-wider">Frota Total Ativa</span>
              <Truck className="size-4 text-amber-500" />
            </div>
            <p className="text-3xl font-black tracking-tight text-white flex items-baseline gap-1">
              {loading ? '...' : kpis.totalCarros} <span className="text-xs font-medium text-white/50">carros/dia</span>
            </p>
          </div>
        </div>

        {/* Consistência de Meta Diária - Análise Operacional */}
        {!mostrarFormulario && dailyGoalConsistency.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-black p-6 md:p-8 mb-8 animate-in fade-in duration-500 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-white/5 pb-6">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                   <Target className="size-5 text-white/80" /> Inteligência de Metas Baseada em Vendas
                </h3>
                <p className="text-sm text-white/50 mt-2 max-w-xl">
                   Auditoria de performance operacional. Utilize os dados reais de fechamento para parametrizar metas futuras precisas.
                </p>
              </div>
              
              <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10 shrink-0">
                <button 
                  onClick={() => setConsistencyMonthOffset(prev => prev - 1)}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/60 hover:text-white"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="text-xs font-semibold tracking-wider uppercase text-white min-w-[120px] text-center">
                  {new Date(dailyGoalConsistency[0]?.targetDate || new Date()).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>
                <button 
                  onClick={() => setConsistencyMonthOffset(prev => prev + 1)}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/60 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  disabled={consistencyMonthOffset >= 0}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
              {dailyGoalConsistency.map((dg, i) => (
                <div 
                  key={dg.id} 
                  className="p-6 rounded-2xl bg-black/40 border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group relative overflow-hidden backdrop-blur-xl shadow-2xl hover:shadow-[#8A05BE]/5"
                  onClick={() => toggleConsistency(dg.id)}
                >
                  <div className={cn("absolute inset-y-0 left-0 w-[3px]", dg.hitRate >= 80 ? "bg-success/80" : dg.hitRate >= 50 ? "bg-warning/80" : "bg-danger/80")} />
                  
                  <div className="flex items-start justify-between mb-8 pl-1">
                    <div>
                      <div className="font-light text-lg text-white tracking-wide">{dg.name}</div>
                      {editingGoalPartnerId === dg.id ? (
                        <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                           <input 
                             type="text" 
                             className="bg-transparent border-b border-[#8A05BE] px-1 py-1 text-sm text-white font-mono w-28 focus:outline-none"
                             placeholder="Valor total"
                             value={editingGoalValue}
                             onChange={e => setEditingGoalValue(e.target.value)}
                             autoFocus
                           />
                           <button 
                             className="text-[#8A05BE] hover:text-white transition-colors disabled:opacity-50"
                             onClick={() => handleSaveMonthlyGoal(dg.id, dg.monthKey)}
                             disabled={isSavingGoal}
                           >
                             <Check className="size-4" />
                           </button>
                           <button 
                             className="text-white/40 hover:text-white transition-colors"
                             onClick={() => setEditingGoalPartnerId(null)}
                           >
                             <X className="size-4" />
                           </button>
                        </div>
                      ) : (
                        <div className="text-xs text-white/40 mt-1 flex items-center gap-2 group/edit">
                          <span className="uppercase tracking-widest text-[9px]">
                            Meta do Ciclo: <span className="font-mono text-white/80 text-[11px] ml-1">{dg.baseMeta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </span>
                          <button 
                            className="opacity-0 group-hover/edit:opacity-100 transition-opacity p-1 hover:text-white text-white/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGoalPartnerId(dg.id);
                              setEditingGoalValue((dg.baseMeta || 0).toString());
                            }}
                          >
                            <Edit2 className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                       <div className={cn("text-3xl font-mono font-light tracking-tighter", dg.hitRate >= 80 ? "text-success" : dg.hitRate >= 50 ? "text-warning" : "text-danger")}>{dg.hitRate.toFixed(0)}<span className="text-lg text-white/30 ml-0.5">%</span></div>
                    </div>
                  </div>
                  
                  <div className="mb-8 space-y-5">
                     {/* Consistência Progress */}
                     <div>
                       <div className="flex justify-between text-[10px] text-white/40 mb-2 uppercase tracking-widest">
                         <span>Consistência Operacional</span>
                         <span className="font-mono text-white/70">{dg.daysMet}/{dg.daysToCheck} dias bons</span>
                       </div>
                       <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all duration-700", dg.hitRate >= 80 ? "bg-success" : dg.hitRate >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.min(100, dg.hitRate)}%` }} />
                       </div>
                     </div>
                     
                     {/* Meta Financeira Progress */}
                     <div>
                       <div className="flex justify-between items-end mb-2">
                         <span className="text-[10px] text-white/40 uppercase tracking-widest">Meta Financeira</span>
                         <div className="text-right flex flex-col">
                           <span className="text-[#8A05BE] font-mono text-sm">{dg.baseMeta > 0 ? ((dg.totalRev / dg.baseMeta) * 100).toFixed(1) : 0}%</span>
                         </div>
                       </div>
                       <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                          <div className="h-full bg-[#8A05BE] transition-all duration-700" style={{ width: `${Math.min(100, dg.baseMeta > 0 ? (dg.totalRev / dg.baseMeta) * 100 : 0)}%` }} />
                          {dg.totalRev > dg.baseMeta && (
                            <div className="h-full bg-success transition-all duration-700" style={{ width: `${Math.min(100, ((dg.totalRev - dg.baseMeta) / dg.baseMeta) * 100)}%` }} />
                          )}
                       </div>
                       <div className="text-[10px] text-right mt-1.5 text-white/30 font-mono tracking-wider">
                          <span className={cn(dg.totalRev >= dg.baseMeta ? "text-success" : "text-white/80")}>{dg.totalRev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> <span className="mx-1 text-white/10">/</span> {dg.baseMeta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                       </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-xs mb-4 pt-4 border-t border-white/5">
                     <div>
                        <div className="text-white/30 mb-1 uppercase tracking-widest text-[9px]">Excedente</div>
                        <div className="font-mono text-success text-sm">+{dg.surplus.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                     </div>
                     <div className="text-right">
                        <div className="text-white/30 mb-1 uppercase tracking-widest text-[9px]">Déficit</div>
                        <div className="font-mono text-danger text-sm">-{dg.deficit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                     </div>
                  </div>

                  <div className="flex justify-between items-center py-2 px-1 text-sm border-b border-white/5 mb-4">
                     <span className="text-white/50">Balanço do Ciclo</span>
                     <span className={cn("font-mono", dg.netBalance >= 0 ? "text-success" : "text-danger")}>{dg.netBalance >= 0 ? "+" : ""}{dg.netBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  
                  <div className="text-[10px] text-white/30 flex justify-between items-center group-hover:text-white/60 transition-colors uppercase tracking-widest">
                    <span>{expandedConsistency[dg.id] ? "Fechar Análise" : "Abrir Histórico Completo"}</span>
                    <ChevronDown className={cn("size-3 transition-transform", expandedConsistency[dg.id] && "rotate-180")} />
                  </div>

                  <div className={cn("transition-all duration-300 overflow-hidden", expandedConsistency[dg.id] ? "max-h-[800px] mt-4 opacity-100 overflow-y-auto custom-scrollbar pr-1" : "max-h-0 mt-0 opacity-0")}>
                     <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                        
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg w-full">
                           <button 
                             onClick={(e) => { e.stopPropagation(); setConsistencyTab(prev => ({...prev, [dg.id]: 'bases'})) }}
                             className={cn("flex-1 text-[10px] uppercase tracking-wider py-1.5 rounded-md font-bold transition-colors", (consistencyTab[dg.id] || 'bases') === 'bases' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]")}
                           >
                              Bases Operacionais
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setConsistencyTab(prev => ({...prev, [dg.id]: 'historico'})) }}
                             className={cn("flex-1 text-[10px] uppercase tracking-wider py-1.5 rounded-md font-bold transition-colors", (consistencyTab[dg.id] || 'bases') === 'historico' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]")}
                           >
                              Caixa Real
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setConsistencyTab(prev => ({...prev, [dg.id]: 'raiox'})) }}
                             className={cn("flex-1 text-[10px] uppercase tracking-wider py-1.5 rounded-md font-bold transition-colors", (consistencyTab[dg.id] || 'bases') === 'raiox' ? "bg-[#8A05BE] text-white shadow-sm" : "text-[#8A05BE]/60 hover:text-[#8A05BE] hover:bg-[#8A05BE]/10")}
                           >
                              Raio-X
                           </button>
                        </div>

                        {(consistencyTab[dg.id] || 'bases') === 'bases' ? (
                          <div className="bg-white/[0.01] border border-white/5 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="flex justify-between items-center mb-4">
                                <div className="text-xs font-semibold text-white uppercase tracking-wider">Métricas Reais</div>
                                <div className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded">Restam {dg.daysLeft} dias</div>
                             </div>

                             <div className="flex justify-between text-xs mb-3">
                                <div className="flex flex-col">
                                   <span className="text-white/40 uppercase text-[9px] mb-1">Mínima Real</span>
                                   <span className="font-mono text-white">{dg.minDay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <div className="flex flex-col text-center">
                                   <span className="text-white/40 uppercase text-[9px] mb-1">Média Real</span>
                                   <span className="font-mono text-white">{dg.avgDay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                   <span className="text-white/40 uppercase text-[9px] mb-1">Máxima Real</span>
                                   <span className="font-mono text-white">{dg.maxDay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                             </div>

                             {dg.daysLeft > 0 ? (
                               <div className="pt-3 border-t border-white/5 space-y-2">
                                  <div className="text-[9px] uppercase tracking-wider text-[#8A05BE] mb-2">Projeção Final do Mês (Simulação Estatística)</div>
                                  <div className="flex justify-between text-xs">
                                     <span className="text-white/50 border-b border-white/10 border-dashed pb-0.5">Cenário Conservador (Dias Ruins)</span>
                                     <span className="font-mono text-danger">{dg.projRuim.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                     <span className="text-white/70 border-b border-white/10 border-dashed pb-0.5">Cenário Base (Média Histórica)</span>
                                     <span className="font-mono text-[#8A05BE] font-bold">{dg.projMedia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                     <span className="text-white/50 border-b border-white/10 border-dashed pb-0.5">Cenário Otimista (Dias Bons)</span>
                                     <span className="font-mono text-success">{dg.projOtima.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                  </div>
                               </div>
                             ) : (
                               <div className="pt-3 border-t border-white/5 space-y-2">
                                  <div className="text-[9px] uppercase tracking-wider text-[#8A05BE] mb-2">Ciclo Encerrado</div>
                                  <div className="flex justify-between text-xs">
                                     <span className="text-white/50">Faturamento Final Consolidado</span>
                                     <span className="font-mono text-white">{dg.totalRev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                  </div>
                               </div>
                             )}
                          </div>
                        ) : (consistencyTab[dg.id] || 'bases') === 'historico' ? (
                          <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          {dg.history.map((h, idx) => (
                             <div key={idx} className="flex justify-between items-center text-[11px] bg-white/[0.02] px-3 py-2 rounded border border-transparent hover:border-white/5 transition-colors">
                                <span className="text-white/40 font-mono">
                                   {new Date(h.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })}
                                </span>
                                <div className="flex items-center gap-4">
                                   <span className={cn("font-mono", h.met ? "text-success" : "text-danger")}>{h.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                   <span className={cn("w-1.5 h-1.5 rounded-full", h.met ? "bg-success shadow-[0_0_5px_rgba(34,197,94,0.8)]" : "bg-danger")} />
                                </div>
                             </div>
                          ))}
                          {dg.history.length === 0 && (
                            <div className="text-center py-4 text-[10px] uppercase tracking-widest text-white/30">Nenhum fechamento registrado no ciclo.</div>
                          )}
                          </div>
                        ) : (
                          <div className="bg-[#8A05BE]/5 border border-[#8A05BE]/20 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
                             
                             <div className="grid grid-cols-2 gap-4">
                               <div>
                                 <div className="text-[9px] uppercase tracking-widest text-success mb-1">Pico de Vendas</div>
                                 <div className="text-sm font-mono text-white mb-0.5">
                                   {dg.peakDay.total > 0 ? dg.peakDay.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00"}
                                 </div>
                                 {dg.peakDay.total > 0 && (
                                   <div className="text-[10px] text-white/40">{new Date(dg.peakDay.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })}</div>
                                 )}
                               </div>
                               <div>
                                 <div className="text-[9px] uppercase tracking-widest text-danger mb-1">Baixa de Vendas</div>
                                 <div className="text-sm font-mono text-white mb-0.5">
                                   {dg.worstDay.total > 0 ? dg.worstDay.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00"}
                                 </div>
                                 {dg.worstDay.total > 0 && (
                                   <div className="text-[10px] text-white/40">{new Date(dg.worstDay.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })}</div>
                                 )}
                               </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#8A05BE]/10">
                               <div>
                                 <div className="text-[9px] uppercase tracking-widest text-[#8A05BE] mb-2">Top Destinos</div>
                                 {dg.topDestinations.length > 0 ? (
                                   <div className="space-y-1.5">
                                     {dg.topDestinations.map((d: any, idx: number) => (
                                       <div key={idx} className="flex items-center justify-between text-[10px]">
                                          <span className="text-white/70 truncate pr-2" title={d.name}>{d.name}</span>
                                          <span className="text-[#8A05BE] font-mono shrink-0">{d.count}x</span>
                                       </div>
                                     ))}
                                   </div>
                                 ) : (
                                   <div className="text-[9px] text-white/30 italic">Sem dados.</div>
                                 )}
                               </div>
                               <div>
                                 <div className="text-[9px] uppercase tracking-widest text-[#8A05BE] mb-2">Top Serviços</div>
                                 {dg.topServices.length > 0 ? (
                                   <div className="space-y-1.5">
                                     {dg.topServices.map((s: any, idx: number) => (
                                       <div key={idx} className="flex items-center justify-between text-[10px]">
                                          <span className="text-white/70 truncate pr-2 font-bold" title={s.name}>{s.name}</span>
                                          <span className="text-[#8A05BE] font-mono shrink-0">{s.count}x</span>
                                       </div>
                                     ))}
                                   </div>
                                 ) : (
                                   <div className="text-[9px] text-white/30 italic">Sem dados.</div>
                                 )}
                               </div>
                             </div>

                          </div>
                        )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CABEÇALHO DA TABELA + BOTÃO DE CADASTRO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Portfólio de Empresas</h2>
            <p className="text-sm text-muted-foreground">Visualização de contratos, metas comerciais e regras operacionais.</p>
          </div>
          {!mostrarFormulario && (
            <button
              onClick={() => { resetForm(); setMostrarFormulario(true); }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm"
            >
              <Plus className="size-4" /> Adicionar Empresa
            </button>
          )}
        </div>

        {/* FORMULÁRIO DE CADASTRO */}
        {mostrarFormulario && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-md relative animate-in slide-in-from-top-4 duration-200">
            <button 
              type="button"
              onClick={handleCancelForm}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-semibold tracking-tight mb-6 flex items-center gap-2">
              <Building2 className="size-5 text-primary" /> {editingId ? "Editar Parametrização" : "Nova Parametrização de Empresa"}
            </h3>
            
            <form onSubmit={handleCadastrar} className="space-y-6">
              {/* Grid 1 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">Razão Social *</label>
                  <input type="text" placeholder="Ex: Expresso Nordeste" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Meta de Faturamento *</label>
                  <input type="number" placeholder="R$ 50000" value={meta} onChange={(e) => setMeta(e.target.value)} required className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Comissão (%) *</label>
                  <input type="number" step="0.01" placeholder="10" value={comissao} onChange={(e) => setComissao(e.target.value)} required className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Coins className="size-3" /> Comissão em Dinheiro (Retorno)
                  </label>
                  <div className="w-full rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 text-sm font-semibold font-mono text-blue-700 dark:text-blue-400 h-[38px] flex items-center">
                    {comissaoCalculadaFormulario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </div>

              {/* Caixa de Contexto Analítico de Meta */}
              {Number(meta) > 0 && (
                <div className="bg-muted/30 border border-border/60 rounded-xl p-4 flex flex-col md:flex-row gap-6 items-start">
                   <div className="flex-1 space-y-3">
                      <h4 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5"><Calendar className="size-3" /> Realidade Operacional (Mês Atual)</h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                         <div className="bg-background border border-border rounded-lg p-2">
                            <div className="text-lg font-black">{monthContext.totalDays}</div>
                            <div className="text-[9px] uppercase text-muted-foreground">Dias de Ciclo</div>
                         </div>
                         <div className="bg-background border border-border rounded-lg p-2">
                            <div className="text-lg font-black text-warning">{monthContext.weekends}</div>
                            <div className="text-[9px] uppercase text-muted-foreground">Fins de Semana</div>
                         </div>
                         <div className="bg-background border border-border rounded-lg p-2">
                            <div className="text-lg font-black text-info">{monthContext.holidays.length}</div>
                            <div className="text-[9px] uppercase text-muted-foreground">Feriados Fixos</div>
                         </div>
                      </div>
                      {monthContext.holidays.length > 0 && (
                         <div className="text-[10px] text-muted-foreground italic flex gap-1">
                            <AlertTriangle className="size-3 text-warning shrink-0 mt-0.5" />
                            Atenção aos feriados: {monthContext.holidays.map(h => h.name).join(', ')}.
                         </div>
                      )}
                   </div>
                   
                   <div className="flex-1 border-l border-border/60 pl-6 space-y-4">
                      <div>
                         <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">Target Diário Necessário</div>
                         <div className="text-2xl font-black font-mono text-primary flex items-baseline gap-1">
                            {metaDiariaCalculada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} <span className="text-xs font-normal text-muted-foreground">/dia</span>
                         </div>
                      </div>

                      {histAudit && (
                         <div className="bg-background/50 border border-border rounded-lg p-3 space-y-3">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><History className="size-3" /> Auditoria: Histórico Real</div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                               <div className="border border-border/50 bg-background rounded p-2">
                                  <div className="text-[9px] text-muted-foreground uppercase mb-1">Média Mês Atual ({histAudit.current.days}d)</div>
                                  <div className={`font-mono font-bold ${histAudit.current.avg >= metaDiariaCalculada ? 'text-success' : 'text-danger'}`}>{histAudit.current.avg.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
                               </div>
                               <div className="border border-border/50 bg-background rounded p-2">
                                  <div className="text-[9px] text-muted-foreground uppercase mb-1">Média Mês Passado ({histAudit.last.days}d)</div>
                                  <div className={`font-mono font-bold text-muted-foreground`}>{histAudit.last.avg.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
                               </div>
                            </div>
                            
                            {histAudit.recent.length > 0 && (
                               <div>
                                  <div className="text-[9px] text-muted-foreground uppercase mb-1.5 border-b border-border/50 pb-1">Últimos {histAudit.recent.length} Fechamentos Válidos</div>
                                  <div className="flex flex-wrap gap-1.5">
                                     {histAudit.recent.map((r, i) => (
                                        <div key={i} className="text-[10px] font-mono bg-background border border-border px-1.5 py-0.5 rounded flex items-center gap-1">
                                           <span className="text-muted-foreground/50">{r.date.split('-')[2]}/{r.date.split('-')[1]}</span>
                                           <span className={r.total >= metaDiariaCalculada ? 'text-success' : 'text-white'}>{r.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            )}

                            <div className="text-[9px] text-muted-foreground/70">
                               {histAudit.current.avg > 0 && histAudit.current.avg < metaDiariaCalculada && (
                                  <div className="text-danger mt-1">⚠️ A meta estipulada está maior do que a média de faturamento diário deste mês.</div>
                               )}
                            </div>
                         </div>
                      )}
                   </div>
                </div>
              )}

              {/* Grid 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="size-3.5" /> Ticket Médio</label>
                  <input type="number" placeholder="R$" value={ticketMedio} onChange={(e) => setTicketMedio(e.target.value)} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Truck className="size-3.5" /> Carros por Dia</label>
                  <input type="number" placeholder="Qtd" value={carrosPorDia} onChange={(e) => setCarrosPorDia(e.target.value)} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><FileText className="size-3.5" /> Protocolo Identificador</label>
                  <input type="text" placeholder="Cód/Link" value={protocolo} onChange={(e) => setProtocolo(e.target.value)} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><RouteIcon className="size-3.5" /> Linhas Exclusivas</label>
                    <button type="button" onClick={() => setLinhas([...linhas, ""])} className="text-[10px] uppercase font-bold text-primary hover:opacity-80 transition-opacity flex items-center gap-0.5">
                      <Plus className="size-3" /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                    {linhas.length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-1">Nenhuma linha cadastrada.</p>
                    )}
                    {linhas.map((linha, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="text" placeholder="Nome da linha" value={linha} onChange={(e) => {
                          const newLinhas = [...linhas];
                          newLinhas[idx] = e.target.value;
                          setLinhas(newLinhas);
                        }} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        <button type="button" onClick={() => {
                          const newLinhas = [...linhas];
                          newLinhas.splice(idx, 1);
                          setLinhas(newLinhas);
                        }} className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Undo2 className="size-3.5" /> Política de Devolução</label>
                  <textarea placeholder="Regras de estorno e prazos..." value={politicaDevolucao} onChange={(e) => setPoliticaDevolucao(e.target.value)} rows={2} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><RefreshCw className="size-3.5" /> Política de Troca</label>
                  <textarea placeholder="Prazos para remarcação e custos..." value={politicaTroca} onChange={(e) => setPoliticaTroca(e.target.value)} rows={2} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Info className="size-3.5" /> Informações Complementares</label>
                <textarea placeholder="Observações operacionais importantes..." value={maisInformacoes} onChange={(e) => setMaisInformacoes(e.target.value)} rows={2} className="w-full rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={handleCancelForm} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm">
                  {isSubmitting ? 'Salvando...' : <><Check className="size-4" /> Salvar Registro</>}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* LISTAGEM DE EMPRESAS */}
        <section className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 text-center text-sm text-muted-foreground">Carregando parceiros...</div>
          ) : partners.length === 0 ? (
            <div className="p-16 text-center text-sm text-muted-foreground space-y-2">
              <Building2 className="size-8 text-muted-foreground/50 mx-auto stroke-[1.5]" />
              <p>Nenhuma empresa cadastrada no ecossistema.</p>
              <p className="text-xs opacity-70">Utilize o botão superior para realizar a parametrização inicial.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4 w-10 text-center"></th>
                    <th className="p-4">Empresa</th>
                    <th className="p-4">Meta (Ciclo Selecionado)</th>
                    <th className="p-4">Comissão (%)</th>
                    <th className="p-4">Retorno Estimado (R$)</th>
                    <th className="p-4">Volume (Dia)</th>
                    <th className="p-4">Operação (Monitor)</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {partners.map((empresa) => {
                    const estaExpandido = empresaExpandida === empresa.id;
                    
                    // Cálculo da meta ativa do ciclo reativo ao painel de Inteligência
                    const dg = dailyGoalConsistency.find(d => d.id === empresa.id);
                    
                    const metaNum = dg ? dg.baseMeta : (Number(empresa.meta) || 0);
                    const comissaoNum = Number(empresa.comissao) || 0;
                    const retornoEstimado = metaNum * (comissaoNum / 100);
                    
                    // Se houver dg, calcula o volume diário com base nos dias reais do ciclo selecionado
                    const diasNoCiclo = dg ? (dg.daysLeft + dg.daysToCheck) : getFinancialPeriod(new Date()).daysInPeriod;
                    const volumeDiario = metaNum / diasNoCiclo;
                    
                    const totalServicos = dg ? dg.totalServicos : (empresa.trips?.length || 0);
                    const totalDestinos = dg ? dg.totalDestinos : new Set(empresa.trips?.filter(t => t.destination).map(t => t.destination)).size;

                    return (
                      <React.Fragment key={empresa.id}>
                        <tr 
                          onClick={() => toggleExpandir(empresa.id)}
                          className="hover:bg-muted/30 cursor-pointer transition-colors group"
                        >
                          <td className="p-4 text-center text-muted-foreground group-hover:text-foreground transition-colors">
                            {estaExpandido ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </td>
                          <td className="p-4 font-medium text-foreground">{empresa.name}</td>
                          <td className="p-4 font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                            {metaNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-4 font-mono text-muted-foreground group-hover:text-foreground transition-colors">{comissaoNum}%</td>
                          
                          <td className="p-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                            {retornoEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="p-4">
                            <span className="text-xs bg-muted border border-border px-2 py-0.5 rounded-md font-medium font-mono text-foreground whitespace-nowrap">
                              {volumeDiario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}<span className="text-[10px] text-muted-foreground">/dia</span>
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-semibold text-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded w-fit">{totalServicos} Serviços</span>
                              <span className="text-[10px] text-muted-foreground">{totalDestinos} Destinos Únicos</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={(e) => handleEditClick(empresa, e)} className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10">
                                <Edit2 className="size-4" />
                              </button>
                              <button onClick={(e) => handleDelete(empresa.id, e)} className="p-2 text-muted-foreground hover:text-danger transition-colors rounded-lg hover:bg-danger/10">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {estaExpandido && (
                          <tr className="bg-muted/20 border-t border-b border-border/40">
                            <td colSpan={7} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                      <FileText className="size-3 text-primary" /> Protocolo de Identificação
                                    </h4>
                                    <p className="text-xs font-mono bg-background px-2.5 py-1.5 border border-border rounded-lg inline-block shadow-sm">
                                      {empresa.protocolo || "Não definido"}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                      <TrendingUp className="size-3 text-primary" /> Ticket Médio Operacional
                                    </h4>
                                    <p className="text-xs font-mono bg-background px-2.5 py-1.5 border border-border rounded-lg inline-block shadow-sm">
                                      {empresa.ticket_medio ? Number(empresa.ticket_medio).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado"}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                      <RouteIcon className="size-3 text-primary" /> Rotas e Linhas Exclusivas
                                    </h4>
                                    {empresa.linhas_exclusivas && empresa.linhas_exclusivas.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {empresa.linhas_exclusivas.map((linha, idx) => (
                                          <span key={idx} className="text-[11px] bg-background border border-border px-2 py-0.5 rounded-md">
                                            {linha}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">Nenhuma rota restrita mapeada.</p>
                                    )}
                                  </div>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                      <Undo2 className="size-3" /> Termos de Devolução
                                    </h4>
                                    <div className="text-xs bg-background/60 border border-border/80 p-3 rounded-xl leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                      {empresa.politica_devolucao || "Diretriz de devolução padrão aplicável."}
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                      <RefreshCw className="size-3" /> Termos de Trocas / Alterações
                                    </h4>
                                    <div className="text-xs bg-background/60 border border-border/80 p-3 rounded-xl leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                      {empresa.politica_troca || "Diretriz de troca padrão aplicável."}
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-1 md:col-span-3 pt-2 border-t border-border/40">
                                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                    <Scale className="size-3 text-muted-foreground" /> Informações Legais / Notas Gerais
                                  </h4>
                                  <div className="text-xs bg-background/40 border border-border p-3.5 rounded-xl text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {empresa.mais_informacoes || "Sem notas adicionais cadastradas."}
                                  </div>
                                </div>

                                {/* Seção de Frotas Vinculadas */}
                                <div className="col-span-1 md:col-span-3 pt-4 border-t border-border/40 mt-2">
                                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                    <Truck className="size-3 text-amber-500" /> Frotas/Viagens Vinculadas Hoje ({empresa.trips?.length || 0})
                                  </h4>
                                  
                                  {empresa.trips && empresa.trips.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                      {empresa.trips.map(trip => (
                                        <div key={trip.id} className="border border-border/60 bg-background rounded-lg p-3 text-xs space-y-1">
                                          <div className="font-bold flex items-center justify-between">
                                            {trip.code}
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground uppercase">{trip.status}</span>
                                          </div>
                                          <div className="text-muted-foreground truncate">{trip.origin} → {trip.destination}</div>
                                          {trip.car_plate && <div className="text-muted-foreground font-mono">Placa: {trip.car_plate}</div>}
                                          <div className="text-muted-foreground">{new Date(trip.scheduled_departure).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground bg-background/50 border border-dashed border-border p-4 rounded-xl text-center">
                                      Nenhuma frota vinculada ou programada para esta empresa no momento.
                                    </div>
                                  )}
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </section>

        {/* LINK DE RETORNO */}
        <div className="flex justify-start">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Retornar ao LifeOs Dashboard
          </Link>
        </div>
      </main>
    </>
  );
}

export function ComingSoon({ title, description = "Módulo em construção." }: { title: string; description?: string }) {
  return (
    <>
      <TopBar title={title} subtitle={description} />
      <main className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Building2 className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Em Construção</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Este módulo está sendo desenvolvido e estará disponível em breve com novas funcionalidades.
        </p>
      </main>
    </>
  );
}