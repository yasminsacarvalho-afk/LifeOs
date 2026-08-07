import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { isWithinFinancialPeriod, getFinancialPeriod } from "@/lib/date-helpers";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, ArrowUpRight, Building2, Crown, Radar, TrendingUp, Trophy, X, Lock, Activity, Eye, EyeOff, Target } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PartnerShowcase } from "@/components/PartnerShowcase";
import { NextTripWidget } from "@/components/NextTripWidget";
import { CheckinModal } from "@/components/CheckinModal";
import type { UiTrip } from "@/lib/trip-helpers";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";
import { usePosGoals } from "@/hooks/use-pos-goals";
import { cn } from "@/lib/utils";

export function PosPrincipal() {
  const { partners, loading: loadingPartners } = usePartnersRealtime();
  const { trips, loading: loadingTrips } = useTripsRealtime();
  const { sales, loading: loadingSales } = useSalesRealtime();
  const { closings } = useCashClosingsRealtime();
  const { goals } = usePosGoals();

  const [activeTrip, setActiveTrip] = useState<UiTrip | null>(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string, name: string, total: number } | null>(null);
  const [isPrivacyMode, setIsPrivacyMode] = useState(true);

  const togglePrivacyMode = () => {
    if (isPrivacyMode) {
      const pwd = window.prompt("Digite a senha para exibir os valores:");
      if (pwd === "Euamocristo12") {
        setIsPrivacyMode(false);
      } else if (pwd !== null) {
        alert("Senha incorreta!");
      }
    } else {
      setIsPrivacyMode(true);
    }
  };

  const handleOpenCheckin = (trip: UiTrip) => {
    setActiveTrip(trip);
    setCheckinModalOpen(true);
  };

  const handleCloseCheckin = (result?: { sentWa: boolean }) => {
    if (result && activeTrip) {
      showToast(
        result.sentWa
          ? `✅ Check-in ${activeTrip.code} enviado ao WhatsApp`
          : `✅ Check-in ${activeTrip.code} registrado`,
      );
    }
    setCheckinModalOpen(false);
    setActiveTrip(null);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return "R$ ••••••";
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // 1. Cálculos Gerais baseados nas vendas reais e parceiros
  const totalMeta = partners.reduce((acc, p) => acc + (Number(p.meta) || 0), 0);
  const totalComissaoEstimada = partners.reduce((acc, p) => acc + ((Number(p.meta) || 0) * ((Number(p.comissao) || 0) / 100)), 0);
  
  // Obter data atual para os filtros diários e financeiros
  const now = new Date();
  const todayWeekDay = now.getDay();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentPeriod = useMemo(() => getFinancialPeriod(now), [now]);

  const monthSales = sales.filter(s => isWithinFinancialPeriod(s.sale_date || s.created_at, now));
  const monthClosings = closings.filter(c => isWithinFinancialPeriod(c.closing_date, now));

  const operatingTrips = trips.filter(t => t.operating_days ? t.operating_days.includes(todayWeekDay) : true);

  // 2. Fonte de Verdade Unificada (Fechamento > Vendas Brutas)
  const closingsByDate = monthClosings.reduce((acc, c) => {
    const date = c.closing_date;
    acc[date] = { isClosed: true, companies: {} };
    let hasSettlements = false;
    if (c.company_settlements && Array.isArray(c.company_settlements) && c.company_settlements.length > 0) {
       hasSettlements = true;
       (c.company_settlements as any[]).forEach(s => {
          acc[date].companies[s.company_id] = {
             amount: Number(s.total) || 0,
             commission: Number(s.commission) || 0
          };
       });
    }
    if (!hasSettlements && c.company_totals) {
       Object.entries(c.company_totals as Record<string, number>).forEach(([cid, amount]) => {
          const partner = partners.find(p => p.id === cid);
          const commissionRate = Number(partner?.comissao || partner?.commission_rate || 0) / 100;
          acc[date].companies[cid] = {
             amount: Number(amount) || 0,
             commission: (Number(amount) || 0) * commissionRate
          };
       });
    }
    return acc;
  }, {} as Record<string, { isClosed: boolean, companies: Record<string, {amount: number, commission: number}> }>);

  const salesByDateCompany = monthSales.reduce((acc, s) => {
    const date = (s.sale_date || s.created_at || "").split(" ")[0];
    const cid = s.company_id || "unknown";
    if (!acc[date]) acc[date] = {};
    if (!acc[date][cid]) acc[date][cid] = { amount: 0, commission: 0 };
    acc[date][cid].amount += Number(s.amount);
    acc[date][cid].commission += Number(s.commission_amount);
    return acc;
  }, {} as Record<string, Record<string, {amount: number, commission: number}>>);

  const allDates = Array.from(new Set([...Object.keys(closingsByDate), ...Object.keys(salesByDateCompany)]));
  
  let totalFaturamentoMes = 0;
  let totalComissoesMes = 0;
  const partnerSalesMap: Record<string, { amount: number, commission: number }> = {};
  const unifiedDailyGraph: Record<string, { revenue: number, commission: number }> = {};

  allDates.forEach(date => {
     let dayRev = 0;
     let dayCom = 0;
     
     if (closingsByDate[date]?.isClosed) {
        const companies = closingsByDate[date].companies;
        Object.entries(companies).forEach(([cid, data]) => {
           totalFaturamentoMes += data.amount;
           totalComissoesMes += data.commission;
           dayRev += data.amount;
           dayCom += data.commission;
           
           if (!partnerSalesMap[cid]) partnerSalesMap[cid] = { amount: 0, commission: 0 };
           partnerSalesMap[cid].amount += data.amount;
           partnerSalesMap[cid].commission += data.commission;
        });
     } else if (salesByDateCompany[date]) {
        const companies = salesByDateCompany[date];
        Object.entries(companies).forEach(([cid, data]) => {
           totalFaturamentoMes += data.amount;
           totalComissoesMes += data.commission;
           dayRev += data.amount;
           dayCom += data.commission;
           
           if (!partnerSalesMap[cid]) partnerSalesMap[cid] = { amount: 0, commission: 0 };
           partnerSalesMap[cid].amount += data.amount;
           partnerSalesMap[cid].commission += data.commission;
        });
     }
     
     unifiedDailyGraph[date] = { revenue: dayRev, commission: dayCom };
  });

  const todayStats = unifiedDailyGraph[todayStr] || { revenue: 0, commission: 0 };
  const totalFaturamentoHoje = todayStats.revenue;

  let topPartnerName = "N/A";
  if (Object.keys(partnerSalesMap).length > 0) {
    const topPartnerId = Object.keys(partnerSalesMap).sort((a,b) => partnerSalesMap[b].amount - partnerSalesMap[a].amount)[0];
    if (topPartnerId && topPartnerId !== "unknown") {
      topPartnerName = partners.find(p => p.id === topPartnerId)?.name || "N/A";
    }
  }

  const selectedCompanyDetails = useMemo(() => {
    if (!selectedCompany) return [];
    
    const details: any[] = [];
    allDates.forEach(date => {
      if (closingsByDate[date]?.isClosed) {
         const data = closingsByDate[date].companies[selectedCompany.id];
         if (data && data.amount > 0) {
            const closing = monthClosings.find(c => c.closing_date === date);
            const settlement = (closing?.company_settlements as any[])?.find(s => s.company_id === selectedCompany.id);
            details.push({
               date,
               amount: data.amount,
               commission: data.commission,
               pix: Number(settlement?.pix) || 0,
               dinheiro: Number(settlement?.dinheiro) || 0,
               cartao: Number(settlement?.cartao) || 0,
               source: "Fechamento de Caixa",
            });
         }
      } else {
         const data = salesByDateCompany[date]?.[selectedCompany.id];
         if (data && data.amount > 0) {
            const daySales = monthSales.filter(s => (s.sale_date || s.created_at || "").startsWith(date) && s.company_id === selectedCompany.id);
            const pix = daySales.filter(s => s.payment_method?.toLowerCase() === 'pix').reduce((a, b) => a + Number(b.amount), 0);
            const dinheiro = daySales.filter(s => s.payment_method?.toLowerCase() === 'dinheiro').reduce((a, b) => a + Number(b.amount), 0);
            const cartao = daySales.filter(s => s.payment_method?.toLowerCase().includes('cart')).reduce((a, b) => a + Number(b.amount), 0);
            
            details.push({
               date,
               amount: data.amount,
               commission: data.commission,
               pix, dinheiro, cartao,
               source: "Vendas em Tempo Real",
            });
         }
      }
    });
    return details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCompany, allDates, closingsByDate, salesByDateCompany, monthClosings, monthSales]);

  const dynamicStats = [
    {
      label: "Meta de Vendas (Mês)",
      value: formatCurrency(totalMeta),
      delta: "Projetado",
      deltaTone: "text-muted-foreground",
      sub: "Soma das metas parceiras",
    },
    {
      label: "Faturamento Realizado",
      value: formatCurrency(totalFaturamentoMes),
      delta: isPrivacyMode ? "•••" : `${totalMeta > 0 ? ((totalFaturamentoMes / totalMeta) * 100).toFixed(1) : 0}% da meta`,
      deltaTone: "text-success",
      sub: "Quanto já vendemos no mês",
    },
    {
      label: "Comissão Prevista (Se Bater Meta)",
      value: formatCurrency(totalComissaoEstimada),
      delta: "Recebível Ideal",
      deltaTone: "text-warning",
      sub: "Baseado em 100% de meta",
    },
    {
      label: "Comissão Realizada",
      value: formatCurrency(totalComissoesMes),
      delta: "Líquido Atual",
      deltaTone: "text-success",
      sub: "O que já garantimos",
    },
    {
      label: "Faturamento Diário",
      value: formatCurrency(totalFaturamentoHoje),
      delta: "Hoje",
      deltaTone: "text-blue-500",
      sub: "Baseado nos lançamentos",
    },
    {
      label: "Empresas Parceiras",
      value: isPrivacyMode ? "•••" : partners.length.toString(),
      delta: "Ativas",
      deltaTone: "text-primary",
      sub: "Monitoramento operante",
    },
    {
      label: "Melhor Performance",
      value: topPartnerName,
      delta: "Top 1",
      deltaTone: "text-warning",
      sub: "Empresa que mais faturou",
    },
    {
      label: "Frotas em Operação",
      value: isPrivacyMode ? "•••" : operatingTrips.length.toString(),
      delta: "Hoje",
      deltaTone: "text-warning",
      sub: "Viagens diárias no monitor",
    },
  ];

  const dynamicRanking = [...partners]
    .map(p => {
      const pSales = partnerSalesMap[p.id] || { amount: 0, commission: 0 };
      const metaVal = Number(p.meta) || 1; // evitar divisão por 0
      const comissaoPrevista = (metaVal * (Number(p.comissao) || 0)) / 100;
      return {
        id: p.id,
        name: p.name,
        amountVal: pSales.amount,
        revenue: formatCurrency(pSales.amount),
        commission: formatCurrency(pSales.commission),
        expectedCommission: formatCurrency(comissaoPrevista),
        goal: Math.min(100, Math.round((pSales.amount / metaVal) * 100))
      };
    })
    .sort((a, b) => b.amountVal - a.amountVal)
    .slice(0, 5)
    .map((p, index) => ({ ...p, rank: index + 1 }));

  // 3. Share por empresa (Faturamento Mensal vs Meta)
  const dynamicShare = dynamicRanking.map(p => {
    const metaVal = Number(partners.find(x => x.id === p.id)?.meta || 0);
    return {
      name: p.name,
      Meta: metaVal,
      Faturado: p.amountVal
    };
  }).filter(p => p.Meta > 0 || p.Faturado > 0);

  // 4. Gráfico da Semana (Últimos 7 dias)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const dynamicSeries = last7Days.map(dateStr => {
    const stats = unifiedDailyGraph[dateStr] || { revenue: 0, commission: 0 };
    
    // Formatar DD/MM para o eixo X
    const [_, month, day] = dateStr.split("-");
    
    return {
      day: `${day}/${month}`,
      revenue: stats.revenue,
      commission: stats.commission
    };
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 md:px-8 pt-6">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white">Overview Operacional</h2>
          <p className="text-sm text-[#A1A1AA]">Central de Comando (CCO).</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={togglePrivacyMode}
            className="p-2 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.06)] text-[#A1A1AA] hover:text-white transition-colors"
            title={isPrivacyMode ? "Exibir valores" : "Ocultar valores"}
          >
            {isPrivacyMode ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
          <Link
            to="/monitor"
            className="inline-flex items-center gap-2 rounded-lg bg-rose-500 hover:bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-rose-500/20 transition-colors"
          >
            <Radar className="size-4" />
            <span className="hidden sm:inline">Abrir Torre de Controle</span>
          </Link>
        </div>
      </div>

      <main className="space-y-6 md:space-y-8 px-4 md:px-8 py-6 md:py-8">
        {/* Partner Showcase Cover */}
        <PartnerShowcase partners={partners} sales={monthSales} closings={monthClosings} />

        {/* Next Trips Real-time Widget */}
        <NextTripWidget trips={trips} partners={partners} onCheckIn={handleOpenCheckin} />

        {/* KPI grid */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dynamicStats.map((s, i) => (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-sm transition-colors hover:border-primary/30 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-primary/10 blur-3xl opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-2 font-mono text-3xl font-semibold tracking-tight">
                {loadingPartners ? "..." : s.value}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={cn("font-medium inline-flex items-center gap-1", s.deltaTone)}>
                  <ArrowUpRight className="size-3" /> {s.delta}
                </span>
                <span className="text-muted-foreground">{s.sub}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Charts */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm lg:col-span-2">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Faturamento da semana</h2>
                <p className="text-xs text-muted-foreground">
                  Receita líquida × comissões pagas (últimos 7 dias)
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] mt-2 sm:mt-0">
                <Legend dot="bg-primary" label="Receita" />
                <Legend dot="bg-accent" label="Comissão" />
              </div>
            </div>
            <div className="h-72 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicSeries} margin={{ left: -10, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "oklch(0.66 0.012 285)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.66 0.012 285)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => isPrivacyMode ? "•••" : `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.17 0.014 285)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) =>
                      isPrivacyMode ? "R$ ••••••" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#gRev)"
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#gCom)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              {isPrivacyMode && (
                <div className="absolute inset-0 z-10 backdrop-blur-md bg-background/20 flex items-center justify-center">
                  <span className="text-muted-foreground font-semibold flex items-center gap-2"><EyeOff className="size-4"/> Valores Ocultos</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm">
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Realizado vs Meta</h2>
                <p className="text-xs text-muted-foreground">Faturamento em cima das metas</p>
              </div>
              <Building2 className="size-4 text-muted-foreground" />
            </div>
            <div className="h-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicShare} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "oklch(0.66 0.012 285)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                    contentStyle={{
                      background: "oklch(0.17 0.014 285)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => isPrivacyMode ? "R$ ••••••" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  />
                  <Bar dataKey="Meta" fill="oklch(0.5 0.05 285)" radius={[0, 4, 4, 0]} barSize={8} />
                  <Bar dataKey="Faturado" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
              {isPrivacyMode && (
                <div className="absolute inset-0 z-10 backdrop-blur-md bg-background/20 flex items-center justify-center">
                  <span className="text-muted-foreground font-semibold flex items-center gap-2"><EyeOff className="size-4"/> Valores Ocultos</span>
                </div>
              )}
            </div>
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Top 4 parceiras concentram <span className="text-foreground font-semibold">94%</span>{" "}
              da receita.
            </div>
          </div>
        </section>

        {/* Ranking + Goals */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm lg:col-span-2">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-warning" />
                <h2 className="text-base font-semibold tracking-tight">
                  Ranking de Empresas & Vendedores
                </h2>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Junho · 2026
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border hidden sm:block">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Empresa</th>
                    <th className="px-4 py-3 text-right">Faturado</th>
                    <th className="px-4 py-3 text-right">Comissão Realizada</th>
                    <th className="px-4 py-3 text-right">Comissão Prevista (Meta)</th>
                    <th className="px-4 py-3 text-left">Progresso da Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {dynamicRanking.map((p) => (
                    <tr 
                      key={p.rank} 
                      onClick={() => setSelectedCompany({ id: p.id, name: p.name, total: p.amountVal })}
                      className="border-t border-border hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        <span
                          className={cn(
                            "inline-grid size-6 place-items-center rounded-md border text-xs font-bold",
                            p.rank === 1
                              ? "border-warning/40 bg-warning/10 text-warning"
                              : "border-border bg-card",
                          )}
                        >
                          {p.rank === 1 ? <Crown className="size-3" /> : p.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.revenue}</td>
                      <td className="px-4 py-3 text-right font-mono text-success">
                        {p.commission}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {p.expectedCommission}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/5">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                p.goal >= 80
                                  ? "bg-success"
                                  : p.goal >= 60
                                    ? "bg-primary"
                                    : "bg-warning",
                              )}
                              style={{ width: `${p.goal}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">
                            {isPrivacyMode ? "•••" : `${p.goal}%`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Ranking Cards */}
            <div className="sm:hidden space-y-3">
              {dynamicRanking.map((p) => (
                <div 
                  key={p.rank}
                  onClick={() => setSelectedCompany({ id: p.id, name: p.name, total: p.amountVal })}
                  className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={cn(
                        "inline-grid size-8 shrink-0 place-items-center rounded-lg border text-sm font-bold shadow-sm",
                        p.rank === 1
                          ? "border-warning/40 bg-warning/10 text-warning shadow-warning/10"
                          : "border-border bg-muted/50",
                      )}
                    >
                      {p.rank === 1 ? <Crown className="size-4" /> : p.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base truncate">{p.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              p.goal >= 80 ? "bg-success" : p.goal >= 60 ? "bg-primary" : "bg-warning",
                            )}
                            style={{ width: `${p.goal}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-muted-foreground shrink-0 w-8 text-right">
                          {isPrivacyMode ? "•••" : `${p.goal}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm pt-3 border-t border-border/50">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Faturado</div>
                      <div className="font-mono font-medium">{p.revenue}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Líquido</div>
                      <div className="font-mono font-bold text-success">{p.commission}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6 backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Meta Mensal LifeOs
                </span>
                <TrendingUp className="size-4 text-primary" />
              </div>
              <div className="font-mono text-3xl font-semibold">
                {formatCurrency(totalFaturamentoMes)}
              </div>
              <div className="text-xs text-muted-foreground">de {formatCurrency(totalMeta)} (meta total projetada)</div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${Math.min(100, (totalFaturamentoMes / (totalMeta || 1)) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>{isPrivacyMode ? "•••" : `${((totalFaturamentoMes / (totalMeta || 1)) * 100).toFixed(1)}%`} concluído</span>
                <span>Real vs. Meta</span>
              </div>
            </div>

            <Link
              to="/monitor"
              className="group block rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm hover:border-warning/40 transition-colors"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-warning">
                  Torre de Controle
                </span>
                <Radar className="size-4 text-warning" />
              </div>
              <div className="text-sm">
                <span className="font-mono text-2xl font-semibold">{isPrivacyMode ? "•••" : operatingTrips.length}</span>{" "}
                <span className="text-muted-foreground">partidas hoje</span>
              </div>
              <div className="mt-2 flex gap-2 text-[10px] font-bold uppercase tracking-widest">
                <span className="rounded bg-success/10 px-2 py-0.5 text-success">
                  {operatingTrips.filter(t => t.status === "checked-in").length} ok
                </span>
                <span className="rounded bg-warning/10 px-2 py-0.5 text-warning">
                  {operatingTrips.filter(t => t.status === "imminent").length} iminente
                </span>
                <span className="rounded bg-danger/10 px-2 py-0.5 text-danger">
                  {operatingTrips.filter(t => t.status === "delayed").length} atrasada
                </span>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground/80 group-hover:text-foreground">
                Abrir monitor em tempo real <ArrowRight className="size-3" />
              </div>
            </Link>

            {/* Aquisições / Wishlist Widget */}
            <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm relative overflow-hidden group">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Target className="size-4" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">Metas de Compra</h2>
                </div>
                <Link to="/goals" className="text-[10px] uppercase font-bold text-muted-foreground hover:text-emerald-500 transition-colors">
                  Ver Todas
                </Link>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {goals.filter(g => g.type?.toLowerCase().includes('aquisição') || g.type?.toLowerCase().includes('aquisicao') || g.type?.toLowerCase().includes('compras')).length > 0 ? (
                  goals.filter(g => g.type?.toLowerCase().includes('aquisição') || g.type?.toLowerCase().includes('aquisicao') || g.type?.toLowerCase().includes('compras')).map(goal => (
                    <div key={goal.id} className="p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm">{goal.title}</h4>
                        <span className="text-xs font-mono text-emerald-500">
                          {isPrivacyMode ? "R$ •••••" : formatCurrency(goal.target_value || 0)}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">
                          {goal.description}
                        </p>
                      )}
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Guardado</span>
                          <span>{goal.progress_percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${goal.progress_percentage}%` }}
                          />
                        </div>
                        <div className="text-right text-[10px] font-mono text-muted-foreground mt-1">
                          Falta: {isPrivacyMode ? "R$ •••••" : formatCurrency((goal.target_value || 0) - ((goal.target_value || 0) * (goal.progress_percentage / 100)))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground italic border border-dashed border-border rounded-xl">
                    Nenhuma meta de compra definida.
                    <br/>
                    <Link to="/goals" className="text-emerald-500 font-medium not-italic mt-2 inline-block">Adicionar Nova +</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Detalhes de Vendas Modal */}
      {selectedCompany && (() => {
         const selectedPartner = partners.find(p => p.id === selectedCompany.id);
         const partnerMeta = Number(selectedPartner?.meta) || 0;
         const dailyMeta = partnerMeta / (currentPeriod.daysInPeriod || 30);
         
         const faturamentoFechamentos = selectedCompanyDetails.filter(d => d.source === "Fechamento de Caixa").reduce((a, b) => a + b.amount, 0);
         const qtdVendas = monthSales.filter(s => s.company_id === selectedCompany.id).length;
         const qtdFrota = trips.filter(t => t.company_id === selectedCompany.id).length;
         
         const daysAboveGoal = selectedCompanyDetails.filter(d => d.source === "Fechamento de Caixa" && d.amount >= dailyMeta).length;
         const progressPercent = partnerMeta > 0 ? (faturamentoFechamentos / partnerMeta) * 100 : 0;
         const dailyAverage = faturamentoFechamentos / (selectedCompanyDetails.filter(d => d.source === "Fechamento de Caixa").length || 1);

         return (
           <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in p-0 sm:p-4">
              <div className="w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 overflow-hidden flex flex-col h-[90vh] sm:max-h-[85vh]">
                 <div className="flex flex-shrink-0 items-center justify-between border-b border-border p-4 sm:p-5 bg-muted/20">
                    <div>
                       <h3 className="text-lg sm:text-xl font-bold">{selectedCompany.name}</h3>
                       <p className="text-xs sm:text-sm text-muted-foreground">Desempenho da Empresa (Competência Atual)</p>
                    </div>
                    <button onClick={() => setSelectedCompany(null)} className="rounded-full p-2 bg-card border border-border hover:bg-muted transition-colors">
                       <X className="size-5" />
                    </button>
                 </div>
                 
                 {/* Modal Summary Grid */}
                 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 p-4 sm:p-5 pb-0 shrink-0 overflow-x-auto no-scrollbar">
                    <div className="bg-background border border-border rounded-xl p-3 col-span-2 sm:col-span-2 md:col-span-2 flex flex-col justify-center">
                       <div className="text-[10px] uppercase font-bold text-muted-foreground">Faturamento (Caixa)</div>
                       <div className="font-mono text-xl sm:text-2xl font-black text-success">{isPrivacyMode ? "•••" : formatCurrency(faturamentoFechamentos)}</div>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-3 flex flex-col justify-center">
                       <div className="text-[10px] uppercase font-bold text-muted-foreground">Qtd. Vendas</div>
                       <div className="font-mono text-lg font-bold">{isPrivacyMode ? "•••" : qtdVendas}</div>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-3 flex flex-col justify-center">
                       <div className="text-[10px] uppercase font-bold text-muted-foreground">Frota (Viagens)</div>
                       <div className="font-mono text-lg font-bold">{isPrivacyMode ? "•••" : qtdFrota}</div>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-3 flex flex-col justify-center col-span-2 sm:col-span-2 md:col-span-1">
                       <div className="text-[10px] uppercase font-bold text-muted-foreground">Meta Mensal</div>
                       <div className="font-mono text-lg font-bold text-primary">{isPrivacyMode ? "•••" : formatCurrency(partnerMeta)}</div>
                       <div className="text-[10px] text-muted-foreground mt-0.5">{isPrivacyMode ? "•••" : `${progressPercent.toFixed(1)}%`} atingida</div>
                    </div>
                 </div>
                 
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin scrollbar-thumb-border">
                    {selectedCompanyDetails.map((day, i) => {
                       const isGoalReached = day.amount >= dailyMeta;
                       const diffToGoal = Math.abs(day.amount - dailyMeta);
                       
                       return (
                         <div key={i} className="rounded-xl border border-border bg-background p-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                               {day.source === "Fechamento de Caixa" ? <Lock className="size-16" /> : <Activity className="size-16" />}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3 relative z-10">
                               <div>
                                  <div className="font-bold text-lg">{day.date.split('-').reverse().join('/')}</div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <div className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded inline-flex items-center gap-1", day.source === "Fechamento de Caixa" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                                       {day.source === "Fechamento de Caixa" ? <Lock className="size-3" /> : <Activity className="size-3" />}
                                       {day.source}
                                    </div>
                                    <div className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded inline-flex items-center gap-1", isGoalReached ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                                       {isGoalReached ? "Meta Batida" : "Abaixo da Meta"}
                                    </div>
                                  </div>
                               </div>
                               <div className="text-left sm:text-right w-full sm:w-auto bg-muted/20 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-border/50">
                                  <div className="font-mono text-xl font-bold text-primary">{isPrivacyMode ? "R$ ••••••" : formatCurrency(day.amount)}</div>
                                  <div className="text-xs font-semibold text-muted-foreground mt-0.5">Comissão: {isPrivacyMode ? "R$ ••••••" : formatCurrency(day.commission)}</div>
                               </div>
                            </div>
                            
                            <div className="bg-muted/10 p-2 rounded-lg text-xs flex justify-between items-center mb-3 border border-border/50">
                               <span className="text-muted-foreground">Progresso da meta diária:</span>
                               <span className={cn("font-bold font-mono", isGoalReached ? "text-success" : "text-danger")}>
                                  {isPrivacyMode ? "•••" : (isGoalReached ? `+ ${formatCurrency(diffToGoal)}` : `- ${formatCurrency(diffToGoal)}`)}
                               </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50 relative z-10">
                               <div className="bg-muted/30 p-2 rounded-lg text-center border border-border/50">
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Pix</div>
                                  <div className="font-mono text-sm font-medium">{isPrivacyMode ? "R$ ••••••" : formatCurrency(day.pix)}</div>
                               </div>
                               <div className="bg-muted/30 p-2 rounded-lg text-center border border-border/50">
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Dinheiro</div>
                                  <div className="font-mono text-sm font-medium">{isPrivacyMode ? "R$ ••••••" : formatCurrency(day.dinheiro)}</div>
                               </div>
                               <div className="bg-muted/30 p-2 rounded-lg text-center border border-border/50">
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Cartão</div>
                                  <div className="font-mono text-sm font-medium">{isPrivacyMode ? "R$ ••••••" : formatCurrency(day.cartao)}</div>
                               </div>
                            </div>
                         </div>
                       );
                    })}
                    
                    {selectedCompanyDetails.length === 0 && (
                       <div className="text-center py-10 text-muted-foreground italic border border-dashed border-border rounded-xl">
                          Nenhuma venda registrada para esta empresa no período selecionado.
                       </div>
                    )}
                 </div>
                 
                 <div className="border-t border-border p-4 sm:p-5 bg-muted/20 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-2 sm:gap-0">
                    <span className="text-sm font-semibold text-muted-foreground text-center sm:text-left">Total Faturado no Mês (Apenas Caixa):</span>
                    <span className="text-2xl font-bold font-mono text-success">{isPrivacyMode ? "R$ ••••••" : formatCurrency(faturamentoFechamentos)}</span>
                 </div>
              </div>
           </div>
         );
      })()}

      <CheckinModal trip={activeTrip} open={checkinModalOpen} onClose={handleCloseCheckin} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-border bg-card/95 px-5 py-3 text-sm shadow-2xl backdrop-blur-xl animate-slide-up">
          {toast}
        </div>
      )}
    </>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-1 font-medium text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} /> {label}
    </span>
  );
}
