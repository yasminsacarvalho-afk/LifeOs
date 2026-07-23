import { useMemo, useState, Fragment, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { AnaliseDiariaFormModal } from "@/components/AnaliseDiariaFormModal";
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { usePackagesRealtime } from "@/hooks/use-packages-realtime";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useSellersRealtime } from "@/hooks/use-sellers-realtime";
import { useCrmRealtime } from "@/hooks/use-crm-realtime";
import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";
import { useTransactionsRealtime } from "@/hooks/use-transactions-realtime";
import { useOperationalReports } from "@/hooks/use-operational-reports";
import { useCityCodesRealtime } from "@/hooks/use-city-codes-realtime";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, ReferenceLine } from "recharts";
import { BarChart, Activity, Wallet, Smartphone, Bus, Store, Trophy, Calendar, UserCheck, CreditCard, TrendingUp, TrendingDown, MapPin, Users, UserCog, CalendarClock, AlertTriangle, LineChart, Lock, CheckCircle2, ChevronDown, ChevronRight, Target, Settings, X, DollarSign, Plus, Edit2, Trash2, MessageSquare, Wand2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isWithinFinancialPeriod, getFinancialPeriod, getCurrentDayOfFinancialPeriod } from "@/lib/date-helpers";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [{ title: "Análises & Insights · Voyage Flow" }],
  }),
  component: AnalyticsPage,
});

const formatCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const AVAILABLE_KPIS_ANALYTICS = [
  { id: "totalRevenue", label: "Faturamento Bruto", group: "Caixa Financeiro", type: "currency" },
  { id: "totalCommissions", label: "Comissões Gerais", group: "Caixa Financeiro", type: "currency" },
  { id: "opex", label: "OPEX (Custo Operacional)", group: "Caixa Financeiro", type: "currency" },
  { id: "netRevenue", label: "Lucro Operacional", group: "Caixa Financeiro", type: "currency" },
  { id: "totalTickets", label: "Volume Total (Passagens)", group: "Vendas e Operação", type: "number" },
  { id: "avgTicket", label: "Ticket Médio", group: "Vendas e Operação", type: "currency" },
  { id: "totalTrips", label: "Viagens Realizadas", group: "Vendas e Operação", type: "number" },
  { id: "punctuality", label: "Pontualidade da Frota", group: "Vendas e Operação", type: "percent" },
  { id: "totalPackages", label: "Volume de Encomendas", group: "Vendas e Operação", type: "number" },
  { id: "totalLeads", label: "Total Leads", group: "CRM Comercial", type: "number" },
  { id: "wonLeads", label: "Leads Convertidos", group: "CRM Comercial", type: "number" },
  { id: "conversionRate", label: "Taxa de Conversão", group: "CRM Comercial", type: "percent" },
];

const PIE_COLORS = ["#8A05BE", "#A333CD", "#C135FF", "#56007A", "#E3A3FF"];

function AnalyticsPage() {
  const { sales } = useSalesRealtime();
  const { trips } = useTripsRealtime();
  const { cityCodes } = useCityCodesRealtime();
  const { packages } = usePackagesRealtime();
  const { partners } = usePartnersRealtime();
  const { sellers } = useSellersRealtime();
  const { leads } = useCrmRealtime();
  const { closings } = useCashClosingsRealtime();
  const { transactions } = useTransactionsRealtime();
  const { reports: operationalReports } = useOperationalReports();

  const [filterMode, setFilterMode] = useState<"month" | "period">("month");
  const [topDaysMode, setTopDaysMode] = useState<"specific" | "weekday">("specific");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedClosing, setExpandedClosing] = useState<string | null>(null);
  const [isClosingsTableOpen, setIsClosingsTableOpen] = useState(false);

  const [selectedKpis, setSelectedKpis] = useState<string[]>(() => {
    const saved = localStorage.getItem("vf_analytics_kpis");
    if (saved) return JSON.parse(saved);
    return ["totalRevenue", "totalCommissions", "totalTickets", "avgTicket"];
  });
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [insightModalData, setInsightModalData] = useState<{ title: string; text: string; list?: { label: string; value: string }[] } | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<any>(null);


  const isIncluded = (dateString?: string) => {
    if (!dateString) return false;
    const dateStr = dateString.replace(" ", "T"); 
    
    if (filterMode === "month") {
      const [year, month] = dateStr.split("T")[0].split("-");
      return Number(year) === currentMonth.getFullYear() && Number(month) === currentMonth.getMonth() + 1;
    } else {
      const justDate = dateStr.split("T")[0];
      if (startDate && justDate < startDate) return false;
      if (endDate && justDate > endDate) return false;
      return true;
    }
  };

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [expandedLakeItems, setExpandedLakeItems] = useState<Record<string, boolean>>({});

  const toggleLakeItem = (id: string) => {
    setExpandedLakeItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [expandedSaudeComercial, setExpandedSaudeComercial] = useState(true);
  const [expandedDestinos, setExpandedDestinos] = useState(false);
  const [expandedConsistency, setExpandedConsistency] = useState<Record<string, boolean>>({});
  const toggleConsistency = (id: string) => {
    setExpandedConsistency(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredSales = useMemo(() => sales.filter(s => isIncluded(s.created_at || s.sale_date) && (selectedCompanyId === "all" || s.company_id === selectedCompanyId)), [sales, filterMode, currentMonth, startDate, endDate, selectedCompanyId]);
  const filteredTrips = useMemo(() => trips.filter(t => isIncluded(t.raw_scheduled_departure || t.created_at) && (selectedCompanyId === "all" || t.company_id === selectedCompanyId)), [trips, filterMode, currentMonth, startDate, endDate, selectedCompanyId]);
  const filteredPackages = useMemo(() => packages.filter(p => isIncluded(p.created_at) && (selectedCompanyId === "all" || !p.company_id || p.company_id === selectedCompanyId)), [packages, filterMode, currentMonth, startDate, endDate, selectedCompanyId]);
  const filteredLeads = useMemo(() => leads.filter(l => isIncluded(l.created_at) && (selectedCompanyId === "all" || !l.company_id || l.company_id === selectedCompanyId)), [leads, filterMode, currentMonth, startDate, endDate, selectedCompanyId]);
  const filteredClosings = useMemo(() => closings.filter(c => isIncluded(c.closing_date)), [closings, filterMode, currentMonth, startDate, endDate]);
  const filteredOperationalReports = useMemo(() => {
    return operationalReports.filter(r => {
       if (!isIncluded(r.report_date)) return false;
       return true;
    });
  }, [operationalReports, filterMode, currentMonth, startDate, endDate]);
  
  const globalTotalSales = useMemo(() => {
    return filteredClosings.reduce((acc, c) => {
      if (selectedCompanyId === "all") return acc + Number(c.total_revenue || 0);
      let companyTotal = 0;
      if (c.company_settlements && Array.isArray(c.company_settlements)) {
        const settlement = c.company_settlements.find((s: any) => s.company_id === selectedCompanyId);
        if (settlement) companyTotal = Number(settlement.total || 0);
      } else if (c.company_totals && c.company_totals[selectedCompanyId]) {
        companyTotal = Number(c.company_totals[selectedCompanyId] || 0);
      }
      return acc + companyTotal;
    }, 0);
  }, [filteredClosings, selectedCompanyId]);
  // Performance Optimizations: Pre-grouping data to avoid O(N^2) loops
  const salesByDate = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach(s => {
      const d = (s.sale_date || s.created_at || "").split("T")[0].split(" ")[0];
      if (d) map.set(d, (map.get(d) || 0) + 1);
    });
    return map;
  }, [filteredSales]);

  const salesByTripId = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredSales.forEach(s => {
      if (s.trip_id) {
        if (!map.has(s.trip_id)) map.set(s.trip_id, []);
        map.get(s.trip_id)!.push(s);
      }
    });
    return map;
  }, [filteredSales]);

  const pkgsByTripId = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredPackages.forEach(p => {
      if (p.trip_id) {
        if (!map.has(p.trip_id)) map.set(p.trip_id, []);
        map.get(p.trip_id)!.push(p);
      }
    });
    return map;
  }, [filteredPackages]);



  // 1. Receita por Canal de Venda
  const channelData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach(s => {
      const channel = s.sales_channel || "Não informado";
      map[channel] = (map[channel] || 0) + Number(s.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredSales]);

  // 3. Fechamento de Carro (Trip Profitability)
  const tripProfitability = useMemo(() => {
    return filteredTrips.map(t => {
      const tripSales = salesByTripId.get(t.id) || [];
      const passagensTotal = tripSales.reduce((acc, s) => acc + Number(s.amount), 0);
      const qtdPassagens = tripSales.length;

      const tripPackages = pkgsByTripId.get(t.id) || [];
      const encomendasTotal = tripPackages.reduce((acc, p) => acc + Number(p.price), 0);
      const qtdEncomendas = tripPackages.length;

      const faturamentoTotal = passagensTotal + encomendasTotal;

      return {
        ...t,
        passagensTotal,
        qtdPassagens,
        encomendasTotal,
        qtdEncomendas,
        faturamentoTotal,
      };
    }).sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);
  }, [filteredTrips, salesByTripId, pkgsByTripId]);

  // 4. Análise Operacional (Atraso Médio)
  const operationalStats = useMemo(() => {
    let totalDelayMinutes = 0;
    let delayedTrips = 0;
    const completedTrips = filteredTrips.filter(t => t.status === "checked-in" || t.raw_real_departure);

    completedTrips.forEach(t => {
      if (t.raw_real_departure) {
        const sched = new Date(t.raw_scheduled_departure || "").getTime();
        const real = new Date(t.raw_real_departure).getTime();
        const diffMin = (real - sched) / 60000;
        if (diffMin > 5) { // Tolerância de 5 min
          totalDelayMinutes += diffMin;
          delayedTrips++;
        }
      }
    });

    const avgDelay = delayedTrips > 0 ? (totalDelayMinutes / delayedTrips).toFixed(0) : 0;
    const punctuality = completedTrips.length > 0 ? ((completedTrips.length - delayedTrips) / completedTrips.length) * 100 : 100;

    return { avgDelay, punctuality: punctuality.toFixed(1), totalCompleted: completedTrips.length };
  }, [filteredTrips]);

  // 5. Dossiê Analítico por Empresa
  const companyInsights = useMemo(() => {
    return partners
      .filter(p => selectedCompanyId === "all" || p.id === selectedCompanyId)
      .map(partner => {
      const companySales = filteredSales.filter(s => s.company_id === partner.id);
      const salesCount = companySales.length;
      const commissionRate = Number(partner.commission_rate || 0) / 100;
      
      let totalSalesAmount = 0;
      let totalCommissionAmount = 0;
      let repassesFeitos = 0;
      
      filteredClosings.forEach(c => {
        let foundInSettlements = false;
        if (c.company_settlements && Array.isArray(c.company_settlements)) {
          c.company_settlements.forEach((settlement: any) => {
            if (settlement.company_id === partner.id) {
              totalSalesAmount += Number(settlement.total || 0);
              totalCommissionAmount += Number(settlement.commission || (Number(settlement.total || 0) * commissionRate));
              repassesFeitos++;
              foundInSettlements = true;
            }
          });
        }
        // Backward compatibility
        if (!foundInSettlements && c.company_totals && c.company_totals[partner.id]) {
          const val = Number(c.company_totals[partner.id] || 0);
          totalSalesAmount += val;
          totalCommissionAmount += val * commissionRate;
          repassesFeitos++;
        }
      });

      let totalMonthCommission = 0;
      filteredClosings.forEach(c => {
        let foundInSettlements = false;
        if (c.company_settlements && Array.isArray(c.company_settlements)) {
          c.company_settlements.forEach((settlement: any) => {
            if (settlement.company_id === partner.id) {
              totalMonthCommission += Number(settlement.commission || (Number(settlement.total || 0) * commissionRate));
              foundInSettlements = true;
            }
          });
        }
        if (!foundInSettlements && c.company_totals && c.company_totals[partner.id]) {
          totalMonthCommission += Number(c.company_totals[partner.id] || 0) * commissionRate;
        }
      });

      const repassadoAmount = totalSalesAmount; // Maintaining for UI compatibility

      const share = globalTotalSales > 0 ? (totalSalesAmount / globalTotalSales) * 100 : 0;
      const ticketMedio = salesCount > 0 ? totalSalesAmount / salesCount : 0;
      let topSaleAmount = 0;

      const channelCount: Record<string, number> = {};
      const sellerCount: Record<string, number> = {};
      const paymentCount: Record<string, number> = {};
      const dayCount: Record<string, number> = {};
      const dateCount: Record<string, number> = {};

      companySales.forEach(s => {
        const amt = Number(s.amount);
        if (amt > topSaleAmount) topSaleAmount = amt;

        // Channel
        const ch = s.sales_channel || "Não informado";
        channelCount[ch] = (channelCount[ch] || 0) + amt;

        // Seller
        const sel = s.seller_id ? (sellers.find(x => x.id === s.seller_id)?.name || "Desconhecido") : "Sistema";
        sellerCount[sel] = (sellerCount[sel] || 0) + amt;

        // Payment
        const pay = s.payment_method || "Não informado";
        paymentCount[pay] = (paymentCount[pay] || 0) + amt;

        // Date & Day
        if (s.sale_date) {
          const dateObj = new Date(s.sale_date + "T12:00:00");
          const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
          dayCount[dayName] = (dayCount[dayName] || 0) + amt;
          dateCount[s.sale_date] = (dateCount[s.sale_date] || 0) + amt;
        }
      });

      const getTop = (record: Record<string, number>) => {
        let topK = "N/A";
        let topV = 0;
        for (const [k, v] of Object.entries(record)) {
          if (v > topV) { topV = v; topK = k; }
        }
        return { name: topK, amount: topV };
      };

      const bestChannel = getTop(channelCount);
      const bestSeller = getTop(sellerCount);
      const bestPayment = getTop(paymentCount);
      const bestDay = getTop(dayCount);
      const peakDate = getTop(dateCount);

      // formata a data de pico
      let peakDateFormatted = "N/A";
      if (peakDate.name !== "N/A") {
        const [y, m, d] = peakDate.name.split("-");
        peakDateFormatted = `${d}/${m}`;
      }

      return {
        id: partner.id,
        companyName: partner.name,
        commissionRateRaw: Number(partner.commission_rate || 0),
        totalSalesAmount,
        totalCommissionAmount,
        totalMonthCommission,
        repassadoAmount,
        repassesFeitos,
        salesCount,
        share,
        ticketMedio,
        topSaleAmount,
        bestChannel,
        bestSeller,
        bestPayment,
        bestDay,
        peakDateFormatted,
        peakDateAmount: peakDate.amount
      };
    }).sort((a, b) => b.totalSalesAmount - a.totalSalesAmount);
  }, [filteredSales, partners, sellers, globalTotalSales, filteredClosings]);

  // 6. Termômetro Semanal (Dias mais parados e movimentados)
  const weekdayStats = useMemo(() => {
    const datesMap: Record<string, { count: number, revenue: number, dayName: string, formattedDate: string }> = {};

    filteredClosings.forEach(c => {
      if (!c.closing_date) return;
      const dateStr = c.closing_date.split("T")[0].split(" ")[0].trim();
      
      let dayRev = 0;
      if (c.company_settlements && Array.isArray(c.company_settlements) && c.company_settlements.length > 0) {
         c.company_settlements.forEach((s: any) => {
            if (selectedCompanyId === "all" || s.company_id === selectedCompanyId) {
               dayRev += Number(s.total) || 0;
            }
         });
      } else if (c.company_totals) {
         Object.entries(c.company_totals as Record<string, number>).forEach(([cid, amount]) => {
            if (selectedCompanyId === "all" || cid === selectedCompanyId) {
               dayRev += Number(amount) || 0;
            }
         });
      }
      
      const salesCount = salesByDate.get(dateStr) || 0;

      const dateObj = new Date(dateStr + "T12:00:00"); 
      if (!isNaN(dateObj.getTime())) {
        const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        
        const key = topDaysMode === "weekday" ? capitalizedDay : dateStr;

        if (!datesMap[key]) {
          datesMap[key] = { count: 0, revenue: 0, dayName: capitalizedDay, formattedDate: topDaysMode === "weekday" ? "" : formattedDate };
        }
        datesMap[key].count += salesCount;
        datesMap[key].revenue += dayRev;

        if (topDaysMode === "weekday") {
           if (!datesMap[key].formattedDate.includes(formattedDate)) {
               datesMap[key].formattedDate += datesMap[key].formattedDate ? `, ${formattedDate}` : formattedDate;
           }
        }
      }
    });

    return Object.entries(datesMap)
      .map(([_, stats]) => {
         return { day: stats.dayName, count: stats.count, revenue: stats.revenue, dates: stats.formattedDate ? stats.formattedDate.split(', ') : [] };
      })
      .filter(x => x.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredClosings, salesByDate, selectedCompanyId, topDaysMode]);

  // 7. Correlação Motorista x Vendas
  const driverPerformance = useMemo(() => {
    const driverMap: Record<string, { name: string, tripsCount: number, passagensRevenue: number, passagensCount: number, encomendasRevenue: number }> = {};

    filteredTrips.forEach(t => {
      const dName = t.driver_name || "Desconhecido";
      if (!driverMap[dName]) {
        driverMap[dName] = { name: dName, tripsCount: 0, passagensRevenue: 0, passagensCount: 0, encomendasRevenue: 0 };
      }
      driverMap[dName].tripsCount += 1;
      
      const tripSales = salesByTripId.get(t.id) || [];
      driverMap[dName].passagensRevenue += tripSales.reduce((acc, s) => acc + Number(s.amount), 0);
      driverMap[dName].passagensCount += tripSales.length;

      const tripPkgs = pkgsByTripId.get(t.id) || [];
      driverMap[dName].encomendasRevenue += tripPkgs.reduce((acc, p) => acc + Number(p.price), 0);
    });

    return Object.values(driverMap)
      .map(d => ({ ...d, totalRevenue: d.passagensRevenue + d.encomendasRevenue }))
      .filter(d => d.totalRevenue > 0 || d.tripsCount > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredTrips, salesByTripId, pkgsByTripId]);

  // 8. Correlação Colaborador x Empresa
  const sellerCompanyCorrelation = useMemo(() => {
    const matrix: any[] = [];
    
    partners
      .filter(p => selectedCompanyId === "all" || p.id === selectedCompanyId)
      .forEach(partner => {
      const pSales = filteredSales.filter(s => s.company_id === partner.id);
      if (pSales.length === 0) return;
      
      const sellerMap: Record<string, { count: number, revenue: number }> = {};
      pSales.forEach(s => {
        const sName = s.seller_id ? (sellers.find(x => x.id === s.seller_id)?.name || "Sistema / Site") : "Sistema / Site";
        if (!sellerMap[sName]) sellerMap[sName] = { count: 0, revenue: 0 };
        sellerMap[sName].revenue += Number(s.amount);
        sellerMap[sName].count += 1;
      });

      const sortedSellers = Object.entries(sellerMap)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue);

      matrix.push({
        companyName: partner.name,
        topSeller: sortedSellers[0],
        totalRevenue: pSales.reduce((acc, s) => acc + Number(s.amount), 0)
      });
    });

    return matrix.sort((a, b) => b.topSeller.revenue - a.topSeller.revenue);
  }, [filteredSales, partners, sellers]);

  // Feriados Nacionais Identificados no Período
  const holidaysInPeriod = useMemo(() => {
    const period = getFinancialPeriod(currentMonth);
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    
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
    
    const found = [];
    const iter = new Date(start);
    while (iter <= end) {
      const h = fixedHolidays.find(f => f.month === iter.getMonth() && f.day === iter.getDate());
      if (h) {
         found.push({ date: new Date(iter), name: h.name });
      }
      iter.setDate(iter.getDate() + 1);
    }
    return found;
  }, [currentMonth]);

  // 9. Alerta de Metas (Quem fica pra trás)
  const pacingAlerts = useMemo(() => {
    const now = new Date();
    const period = getFinancialPeriod(currentMonth);
    const daysInMonth = period.daysInPeriod;
    const currentDay = getCurrentDayOfFinancialPeriod(now);
    const percentMonthElapsed = currentDay / daysInMonth;

    return partners
      .filter(p => selectedCompanyId === "all" || p.id === selectedCompanyId)
      .map(partner => {
      let targetMeta = Number(partner.meta) || 0;
      let targetElapsedPercent = 1;

      if (filterMode === "month" && currentMonth.getMonth() === now.getMonth() && currentMonth.getFullYear() === now.getFullYear()) {
        targetElapsedPercent = percentMonthElapsed;
      } else if (filterMode === "day") {
        targetMeta = targetMeta / daysInMonth;
      }

      let rev = 0;
      filteredClosings.forEach(c => {
        let found = false;
        if (c.company_settlements && Array.isArray(c.company_settlements)) {
          c.company_settlements.forEach((settlement: any) => {
            if (settlement.company_id === partner.id) {
              rev += Number(settlement.total || 0);
              found = true;
            }
          });
        }
        if (!found && c.company_totals && c.company_totals[partner.id]) {
          rev += Number(c.company_totals[partner.id] || 0);
        }
      });

      const expectedRevenue = targetMeta * targetElapsedPercent;
      const pacing = expectedRevenue > 0 ? (rev / expectedRevenue) * 100 : 0;
      
      return {
        id: partner.id,
        name: partner.name,
        revenue: rev,
        target: targetMeta,
        expectedRevenue,
        pacing
      };
    }).sort((a, b) => a.pacing - b.pacing);
  }, [filteredSales, partners, filterMode, currentMonth, filteredClosings]);

  // 10. Consistência de Meta Diária (Meta batida por dia)
  const dailyGoalConsistency = useMemo(() => {
    const period = getFinancialPeriod(currentMonth);
    const daysInMonth = period.daysInPeriod;
    
    return partners
      .filter(p => selectedCompanyId === "all" || p.id === selectedCompanyId)
      .map(partner => {
      const dailyMeta = (Number(partner.meta) || 0) / daysInMonth;
      
      const closingsByDay: Record<string, number> = {};
      
      filteredClosings.forEach(c => {
        const dateStr = c.closing_date; 
        let found = false;
        if (c.company_settlements && Array.isArray(c.company_settlements)) {
          c.company_settlements.forEach((settlement: any) => {
            if (settlement.company_id === partner.id) {
              closingsByDay[dateStr] = (closingsByDay[dateStr] || 0) + Number(settlement.total || 0);
              found = true;
            }
          });
        }
        if (!found && c.company_totals && c.company_totals[partner.id]) {
          closingsByDay[dateStr] = (closingsByDay[dateStr] || 0) + Number(c.company_totals[partner.id] || 0);
        }
      });
      
      let daysMet = 0;
      Object.values(closingsByDay).forEach(dailyTotal => {
        if (dailyTotal >= dailyMeta) {
          daysMet++;
        }
      });
      
      const now = new Date();
      let daysToCheck = 0;
      
      if (filterMode === "month") {
         const isCurrent = currentMonth.getMonth() === now.getMonth() && currentMonth.getFullYear() === now.getFullYear();
         if (isCurrent) {
            daysToCheck = now.getDate();
         } else if (now < currentMonth) {
            daysToCheck = 0;
         } else {
            daysToCheck = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
         }
      } else {
         const startLocal = new Date(startDate + "T00:00:00");
         const endLocal = new Date(endDate + "T23:59:59");
         
         if (now < startLocal) {
            daysToCheck = 0;
         } else if (now > endLocal) {
            daysToCheck = Math.max(1, Math.ceil((endLocal.getTime() - startLocal.getTime()) / (1000 * 3600 * 24)));
         } else {
            daysToCheck = Math.max(1, Math.ceil((now.getTime() - startLocal.getTime()) / (1000 * 3600 * 24)));
         }
      }
      
      // Fallback de segurança para garantir que nunca teremos dias negativos (ex: se o usuário lançou fechamentos para o futuro)
      if (daysMet > daysToCheck) {
         daysToCheck = Object.keys(closingsByDay).length;
      }
      
      // Além disso, se o ciclo tiver dias sem fechamento que já passaram, contamos como falha, 
      // garantindo que daysToCheck represente os dias decorridos.
      
      const hitRate = daysToCheck > 0 ? (daysMet / daysToCheck) * 100 : 0;
      
      let surplus = 0;
      let deficit = 0;
      
      const history = Object.entries(closingsByDay).map(([date, total]) => {
         if (total >= dailyMeta) {
            surplus += (total - dailyMeta);
         } else {
            deficit += (dailyMeta - total);
         }
         return {
            date,
            total,
            met: total >= dailyMeta
         };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const netBalance = surplus - deficit;

      return {
        id: partner.id,
        name: partner.name,
        dailyMeta,
        daysMet,
        daysToCheck,
        hitRate,
        history,
        surplus,
        deficit,
        netBalance
      };
    });
  }, [partners, currentMonth, filteredClosings]);

  // 11. Funil de Conversão do CRM
  const crmConversion = useMemo(() => {
    const total = filteredLeads.length;
    const won = filteredLeads.filter(l => l.status === 'venda' || l.status === 'revenda').length;
    const lost = filteredLeads.filter(l => l.status === 'nao_atendido').length;
    const inProgress = total - won - lost;
    const conversionRate = total > 0 ? (won / total) * 100 : 0;
    
    return { total, won, lost, inProgress, conversionRate };
  }, [filteredLeads]);

  // 12. Histórico de Fechamentos do Período
  const closingsHistory = useMemo(() => {
    return filteredClosings.map(c => {
      let calculatedTotal = 0;
      let calculatedCommission = 0;
      if (c.company_settlements && Array.isArray(c.company_settlements)) {
        c.company_settlements.forEach((s: any) => {
          if (selectedCompanyId === "all" || s.company_id === selectedCompanyId) {
            calculatedTotal += Number(s.total || 0);
            calculatedCommission += Number(s.commission || 0);
          }
        });
      } else if (c.company_totals) {
         if (selectedCompanyId === "all") {
           Object.values(c.company_totals).forEach((val: any) => {
              calculatedTotal += Number(val || 0);
           });
         } else if (c.company_totals[selectedCompanyId]) {
           calculatedTotal += Number(c.company_totals[selectedCompanyId] || 0);
         }
      }
      
      const salesCount = salesByDate.get(c.closing_date) || 0;

      return {
        ...c,
        total_revenue_calc: calculatedTotal,
        total_commission_calc: calculatedCommission,
        sales_count_calc: salesCount
      };
    }).sort((a, b) => new Date(b.closing_date).getTime() - new Date(a.closing_date).getTime());
  }, [filteredClosings, salesByDate, selectedCompanyId]);

  // 2. Receita por Forma de Pagamento (Movido para cá para evitar erro de inicialização)
  const paymentData = useMemo(() => {
    let pix = 0;
    let dinheiro = 0;
    let cartao = 0;
    closingsHistory.forEach(c => {
      if (c.company_settlements && Array.isArray(c.company_settlements)) {
        c.company_settlements.forEach((s: any) => {
          if (selectedCompanyId === "all" || s.company_id === selectedCompanyId) {
            pix += Number(s.pix || 0);
            dinheiro += Number(s.dinheiro || 0);
            cartao += Number(s.cartao || 0);
          }
        });
      }
    });
    const map: Record<string, number> = {};
    if (pix > 0) map["Pix"] = pix;
    if (dinheiro > 0) map["Dinheiro"] = dinheiro;
    if (cartao > 0) map["Cartão"] = cartao;
    
    if (pix === 0 && dinheiro === 0 && cartao === 0) {
       filteredSales.forEach(s => {
         const pay = s.payment_method || "Não informado";
         map[pay] = (map[pay] || 0) + Number(s.amount);
       });
    }

    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [closingsHistory, filteredSales, selectedCompanyId]);

  // 13. Estatísticas e Projeções de Fechamento por Empresa
  const companyClosingStats = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
    const totalDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const passedDays = isCurrentMonth ? today.getDate() : totalDays;
    const remainingDays = Math.max(0, totalDays - passedDays);

    return partners
      .filter(p => selectedCompanyId === "all" || p.id === selectedCompanyId)
      .map(partner => {
      const dailyTotals: number[] = [];
      filteredClosings.forEach(c => {
        if (c.company_settlements && Array.isArray(c.company_settlements)) {
          const settlement = c.company_settlements.find((s: any) => s.company_id === partner.id);
          if (settlement) {
            dailyTotals.push(Number(settlement.total || 0));
          }
        } else if (c.company_totals && c.company_totals[partner.id]) {
          dailyTotals.push(Number(c.company_totals[partner.id] || 0));
        }
      });

      const validTotals = dailyTotals.filter(v => v > 0);
      const totalAmount = validTotals.reduce((a, b) => a + b, 0);
      const avgAmount = validTotals.length > 0 ? totalAmount / validTotals.length : 0;
      const bestAmount = validTotals.length > 0 ? Math.max(...validTotals) : 0;
      const worstAmount = validTotals.length > 0 ? Math.min(...validTotals) : 0;

      const projPessimista = totalAmount + (worstAmount * remainingDays);
      const projMedia = totalAmount + (avgAmount * remainingDays);
      const projOtimista = totalAmount + (bestAmount * remainingDays);

      return {
        partner,
        totalAmount,
        avgAmount,
        bestAmount,
        worstAmount,
        projPessimista,
        projMedia,
        projOtimista,
        remainingDays,
        validDays: validTotals.length
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount).filter(c => c.totalAmount > 0);
  }, [filteredClosings, partners, currentMonth]);

  const dynamicRanking = useMemo(() => {
    return [...partners]
      .filter(p => selectedCompanyId === "all" || p.id === selectedCompanyId)
      .map(p => {
        const stats = companyClosingStats.find(c => c.partner.id === p.id);
        const amountVal = stats ? stats.totalAmount : 0;
        const metaVal = Number(p.meta) || 1;
        const comissaoPrevista = (metaVal * (Number(p.comissao || (p as any).commission_rate || 0))) / 100;
        const comissaoRealizada = (amountVal * (Number(p.comissao || (p as any).commission_rate || 0))) / 100;

        return {
          id: p.id,
          name: p.name,
          amountVal,
          revenue: formatCurrency(amountVal),
          commission: formatCurrency(comissaoRealizada),
          expectedCommission: formatCurrency(comissaoPrevista),
          goal: Math.min(100, Math.round((amountVal / metaVal) * 100))
        };
      })
      .sort((a, b) => b.amountVal - a.amountVal)
      .slice(0, 10)
      .map((p, index) => ({ ...p, rank: index + 1 }));
  }, [partners, companyClosingStats, selectedCompanyId]);



  const closingsChartData = useMemo(() => {
    const reversed = [...closingsHistory].reverse();
    return reversed.map(c => {
      const [y, m, d] = c.closing_date.split('-');
      return {
        date: `${d}/${m}`,
        revenue: c.total_revenue_calc,
        commission: c.total_commission_calc
      };
    });
  }, [closingsHistory]);

  const closingsTotals = useMemo(() => closingsHistory.reduce((acc, c) => ({
      sales: acc.sales + (c.sales_count_calc || 0),
      revenue: acc.revenue + (c.total_revenue_calc || 0),
      commission: acc.commission + (c.total_commission_calc || 0),
  }), { sales: 0, revenue: 0, commission: 0 }), [closingsHistory]);

  const getKpiValueAnalytics = (id: string) => {
    switch (id) {
      case "totalRevenue": return closingsTotals.revenue;
      case "totalCommissions": return closingsTotals.commission;
      case "opex": return opex;
      case "netRevenue": return closingsTotals.revenue - opex;
      case "totalTickets": 
        return filteredOperationalReports.reduce((acc, a) => {
          let val = 0;
          if (selectedCompanyId === "all") {
             val = a.report_data?.faturamento_por_empresa?.total_passagens?.bilhetes || 0;
          } else {
             const partner = partners.find(p => p.id === selectedCompanyId);
             if (partner) {
                const emp = a.report_data?.faturamento_por_empresa?.empresas?.find((e: any) => e.nome === partner.name);
                if (emp) val = emp.passagens || 0;
             }
          }
          return acc + (isNaN(val) ? 0 : val);
        }, 0);
      case "avgTicket": return filteredSales.length > 0 ? closingsTotals.revenue / filteredSales.length : 0;
      case "totalTrips": return filteredTrips.length;
      case "punctuality": return operationalStats.punctuality;
      case "totalPackages": return filteredPackages.length;
      case "totalLeads": return filteredLeads.length;
      case "wonLeads": return filteredLeads.filter(l => l.status === "won").length;
      case "conversionRate": return filteredLeads.length > 0 ? (filteredLeads.filter(l => l.status === "won").length / filteredLeads.length) * 100 : 0;
      default: return 0;
    }
  };

  const toggleKpi = (id: string) => {
    setSelectedKpis(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  useEffect(() => {
    localStorage.setItem("vf_analytics_kpis", JSON.stringify(selectedKpis));
  }, [selectedKpis]);
  
  const globalMeta = useMemo(() => {
     const filteredPartners = selectedCompanyId === "all" ? partners : partners.filter(p => p.id === selectedCompanyId);
     const totalGlobalDailyGoal = filteredPartners.reduce((sum, p) => sum + (Number(p.sales_goal) || 0), 0);
     const daysInPeriod = filterMode === "month" 
        ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
        : Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)));
     
     const totalGlobalMonthlyGoal = totalGlobalDailyGoal * daysInPeriod;
     const percent = totalGlobalMonthlyGoal > 0 ? (closingsTotals.revenue / totalGlobalMonthlyGoal) * 100 : 0;
     return { goal: totalGlobalMonthlyGoal, percent };
  }, [partners, currentMonth, filterMode, startDate, endDate, closingsTotals.revenue, selectedCompanyId]);

  const carProfitability = useMemo(() => {
    const map = new Map<string, { count: number, revenue: number, empresa: string }>();
    filteredOperationalReports.forEach(a => {
      const linhas = a.report_data?.detalhe_servicos_linhas;
      if (Array.isArray(linhas)) {
        linhas.forEach((l: any) => {
          if (!l.servico) return;
          const empresa = l.empresa || "Geral";
          
          if (selectedCompanyId !== "all") {
             const partner = partners.find(p => p.id === selectedCompanyId);
             if (partner && empresa !== partner.name && empresa !== "Geral") return;
          }

          let rawName = l.servico.trim();
          
          // Tenta normalizar o nome da rota cruzando com o dicionário de cidades (CityCodes)
          let normalizedName = rawName;
          const parts = rawName.split(/ x /i);
          if (parts.length === 2) {
             let originPart = parts[0].trim();
             let destTimePart = parts[1].trim();
             
             let destPart = destTimePart;
             let timePart = "";
             const timeMatch = destTimePart.match(/(\d{2}:\d{2})$/);
             if (timeMatch) {
                timePart = timeMatch[1];
                destPart = destTimePart.replace(timePart, '').trim();
             }
             
             const normalizeMatch = (str: string) => {
                 const clean = str.trim().replace(/\s*-\s*[A-Za-z]{2}\s*$/, "").toUpperCase();
                 const noAccent = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                 return cityCodes.find(c => {
                    const cClean = c.city_name.toUpperCase();
                    const cNoAccent = cClean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return c.code.toUpperCase() === clean || cClean === clean || cNoAccent === noAccent;
                 });
             };
             
             const oMatch = normalizeMatch(originPart);
             if (oMatch) originPart = oMatch.city_name;
             
             const dMatch = normalizeMatch(destPart);
             if (dMatch) destPart = dMatch.city_name;
             
             normalizedName = `${originPart} x ${destPart}${timePart ? ' ' + timePart : ''}`;
          }

          const name = normalizedName;
          const key = `${name}|${empresa}`;
          const qtd = parseInt(l.passagens) || 0;
          const val = parseFloat(l.faturamento) || 0;

          if (map.has(key)) {
             const existing = map.get(key)!;
             map.set(key, { count: existing.count + qtd, revenue: existing.revenue + val, empresa });
          } else {
             map.set(key, { count: qtd, revenue: val, empresa });
          }
        });
      }
    });
    return Array.from(map.entries()).map(([key, data]) => {
      const name = key.split('|')[0];
      const searchName = name.toUpperCase();
      const matchedTrip = trips.find(t => {
         const tripTime = t.departure || "--:--";
         
         const oNorm = cityCodes.find(c => c.code === t.origin_code || c.city_name === t.origin)?.city_name || t.origin;
         const dNorm = cityCodes.find(c => c.code === t.destination_code || c.city_name === t.destination)?.city_name || t.destination;
         
         const expectedName = `${oNorm} x ${dNorm} ${tripTime}`.toUpperCase();
         
         return expectedName === searchName ||
                (t.code && searchName.includes(t.code.toUpperCase())) || 
                (t.route_name && searchName.includes(t.route_name.toUpperCase())) ||
                (t.origin_code && t.destination_code && searchName.includes(`${t.origin_code} X ${t.destination_code}`.toUpperCase()));
      });
      
      return { 
        name, 
        isRegistered: !!matchedTrip,
        matchedCode: matchedTrip?.code,
        matchedOrigin: matchedTrip?.origin || matchedTrip?.origin_code || "",
        matchedDestination: matchedTrip?.destination || matchedTrip?.destination_code || "",
        matchedTime: matchedTrip?.departure || "",
        ...data 
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredOperationalReports, trips, selectedCompanyId, partners, cityCodes]);

  const opex = useMemo(() => {
    const filteredTransactions = transactions.filter(t => isIncluded(t.date) && (selectedCompanyId === "all" || !t.company_id || t.company_id === selectedCompanyId));
    return filteredTransactions
      .filter(t => t.context === 'business' && t.type === 'expense' && t.category !== 'CAPEX / Aquisições' && t.category !== 'Pró-Labore / Distribuição')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions, filterMode, currentMonth, startDate, endDate, selectedCompanyId]);

  const opexCovered = closingsTotals.commission >= opex;
  const opexPercentage = opex > 0 ? (closingsTotals.commission / opex) * 100 : 0;

  const aiInsights = useMemo(() => {
     const anomalies: any[] = [];
     const insights: any[] = [];
     const recommendations: any[] = [];

     // Sazonalidade / Horários Heatmap
     const hours = new Array(24).fill(0);
     filteredSales.forEach(s => {
       if (s.created_at) {
          const h = new Date(s.created_at).getHours();
          hours[h]++;
       }
     });

     const peakHour = hours.indexOf(Math.max(...hours));
     if (hours[peakHour] > 0) {
        insights.push({
           text: `O horário de pico para transações é às ${peakHour}h00.`,
           modal: {
              title: "Horário de Pico",
              text: `O volume máximo de transações registradas acontece na faixa das ${peakHour}h. Este é o momento em que a equipe de atendimento deve estar com capacidade máxima.`,
              list: [{ label: "Transações Registradas", value: hours[peakHour].toString() }]
           }
        });
     }

     // Pareto & Índice de Dependência
     let paretoServices = 0;
     let paretoRevenueServices = 0;
     const totalRevServices = tripProfitability.reduce((acc, t) => acc + t.faturamentoTotal, 0);
     const topServices = [];
     if (totalRevServices > 0) {
        for (const t of tripProfitability) {
           paretoRevenueServices += t.faturamentoTotal;
           paretoServices++;
           const routeName = t.route_name || `${t.origin} x ${t.destination} ${t.departure}`;
           topServices.push({ label: `[Serviço] ${routeName}`, value: formatCurrency(t.faturamentoTotal) });
           if (paretoRevenueServices >= totalRevServices * 0.8) break;
        }

        const pctServices = Math.round((paretoServices / (tripProfitability.length || 1)) * 100);
        insights.push({
           text: `Apenas ${pctServices}% dos serviços geram 80% do seu faturamento.`,
           modal: {
              title: "Curva ABC - Pareto (80/20)",
              text: "Estes são os serviços que compõem a base vital do seu faturamento filtrado:",
              list: topServices
           }
        });
        if (pctServices < 20) {
           recommendations.push({
              text: "Concentração de risco comercial altíssima. Considere pulverizar a oferta ou fazer promoções em novas rotas.",
              modal: {
                 title: "Recomendação Estratégica",
                 text: "Sua dependência de poucos serviços cria um risco estrutural. Uma eventual queda na demanda de apenas um desses serviços afetará gravemente seu caixa. Recomendamos injetar capital de marketing (tráfego pago ou ofertas via WhatsApp) em serviços secundários para equilibrar a carteira."
              }
           });
        }
     }
     
     if (companyClosingStats.length > 0 && closingsTotals.revenue > 0) {
        const topPartner = companyClosingStats[0];
        const pPercent = (topPartner.revenue / closingsTotals.revenue) * 100;
        if (pPercent > 50) {
           anomalies.push({
              text: `⚠️ Alerta de Risco: O parceiro ${topPartner.name} concentra ${pPercent.toFixed(1)}% das vendas totais.`,
              modal: {
                 title: "Dependência de Parceiro B2B",
                 text: "Sua estrutura está altamente dependente de um único polo de vendas. Isso reduz seu poder de barganha e aumenta a fragilidade operacional.",
                 list: [
                    { label: "Parceiro Dominante", value: topPartner.name },
                    { label: "Faturamento Gerado", value: formatCurrency(topPartner.revenue) },
                    { label: "Share de Mercado", value: `${pPercent.toFixed(1)}%` }
                 ]
              }
           });
        }
     }

     // Comparativo Automático
     let todayRevenue = 0;
     let yesterdayRevenue = 0;
     let todayPix = 0;
     let yestPix = 0;

     const rawToday = new Date().toISOString().split("T")[0];
     const yd = new Date(); yd.setDate(yd.getDate() - 1);
     const rawYest = yd.toISOString().split("T")[0];

     filteredSales.forEach(s => {
       if (!s.created_at) return;
       const amt = Number(s.amount || 0);
       const isPix = s.payment_method?.toLowerCase().includes("pix");
       if (s.created_at.startsWith(rawToday)) {
         todayRevenue += amt;
         if (isPix) todayPix += amt;
       }
       if (s.created_at.startsWith(rawYest)) {
         yesterdayRevenue += amt;
         if (isPix) yestPix += amt;
       }
     });

     const revGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
     if (yesterdayRevenue > 0 && revGrowth < -15 && new Date().getHours() > 18) {
       anomalies.push({
          text: `⚠️ Queda crítica: A receita de hoje caiu ${Math.abs(revGrowth).toFixed(0)}% comparado a ontem.`,
          modal: {
             title: "Comparativo D-1 (Queda de Caixa)",
             text: "A arrecadação sofreu uma retração significativa em relação a ontem.",
             list: [
                { label: "Faturamento Ontem", value: formatCurrency(yesterdayRevenue) },
                { label: "Faturamento Hoje", value: formatCurrency(todayRevenue) },
                { label: "Variação", value: `${revGrowth.toFixed(1)}%` }
             ]
          }
       });
     } else if (yesterdayRevenue > 0 && revGrowth > 15) {
       insights.push({
          text: `🔥 Crescimento: O faturamento de hoje já subiu ${revGrowth.toFixed(0)}% em relação a ontem.`,
          modal: {
             title: "Comparativo D-1 (Alta Demanda)",
             text: "Excelente! A arrecadação de hoje já supera consideravelmente o dia de ontem.",
             list: [
                { label: "Faturamento Ontem", value: formatCurrency(yesterdayRevenue) },
                { label: "Faturamento Hoje", value: formatCurrency(todayRevenue) },
                { label: "Crescimento Líquido", value: `+${revGrowth.toFixed(1)}%` }
             ]
          }
       });
     }

     const pixGrowth = yestPix > 0 ? ((todayPix - yestPix) / yestPix) * 100 : 0;
     if (yestPix > 0 && pixGrowth < -25 && new Date().getHours() > 18) {
       anomalies.push({
          text: `⚠️ Volume de transações via Pix despencou ${Math.abs(pixGrowth).toFixed(0)}% hoje.`,
          modal: {
             title: "Alerta de Liquidez Imediata",
             text: "Houve uma forte queda nas entradas via Pix, o que impacta diretamente na sua liquidez em tempo real para pagamentos imediatos (como adiantamentos e combustíveis).",
             list: [
                { label: "Pix Ontem", value: formatCurrency(yestPix) },
                { label: "Pix Hoje", value: formatCurrency(todayPix) }
             ]
          }
       });
     }
     
     const failingPartners = dailyGoalConsistency.filter(c => c.hitRate === 0 && c.daysToCheck > 3);
     if (failingPartners.length > 0) {
       anomalies.push({
          text: `⚠️ Existem ${failingPartners.length} parceiros que não bateram a meta nenhum dia no período.`,
          modal: {
             title: "Inadimplência de Metas Comerciais",
             text: "Os seguintes parceiros não atingiram a meta diária estipulada em nenhum dos dias do período selecionado. Acione os gestores responsáveis:",
             list: failingPartners.map(p => ({ label: p.name, value: `Meta: ${formatCurrency(p.dailyMeta)}/dia` }))
          }
       });
     }

     // Saúde Comercial (Score)
     let health = 100;
     const healthBreakdown: { label: string; value: string }[] = [];
     const avgHitRate = dailyGoalConsistency.length > 0 ? dailyGoalConsistency.reduce((acc, c) => acc + c.hitRate, 0) / dailyGoalConsistency.length : 0;
     
     if (avgHitRate < 50) { health -= 20; healthBreakdown.push({ label: "Baixa consistência de Meta (< 50%)", value: "-20 pts" }); }
     else { healthBreakdown.push({ label: "Consistência de Meta", value: "✔ OK" }); }
     
     if (crmConversion.conversionRate < 30) { health -= 15; healthBreakdown.push({ label: "Conversão CRM baixa (< 30%)", value: "-15 pts" }); }
     else { healthBreakdown.push({ label: "Conversão CRM", value: "✔ OK" }); }
     
     if (operationalStats.punctuality < 80) { health -= 10; healthBreakdown.push({ label: "Atrasos recorrentes em Frotas", value: "-10 pts" }); }
     else { healthBreakdown.push({ label: "Pontualidade da Frota", value: "✔ OK" }); }
     
     if (revGrowth < 0) { health -= 10; healthBreakdown.push({ label: "Receita (D-1) em retração", value: "-10 pts" }); }
     else { healthBreakdown.push({ label: "Crescimento da Receita", value: "✔ OK" }); }
     
     if (companyClosingStats.length > 0 && (companyClosingStats[0].revenue / (closingsTotals.revenue || 1)) > 0.6) { health -= 10; healthBreakdown.push({ label: "Dependência de um único parceiro (> 60%)", value: "-10 pts" }); }
     else { healthBreakdown.push({ label: "Diversificação B2B", value: "✔ OK" }); }

     return {
        anomalies,
        insights,
        recommendations,
        healthScore: Math.max(0, health),
        healthBreakdown,
        hours,
        todayRevenue,
        revGrowth
     };
  }, [filteredSales, sales, companyClosingStats, closingsTotals, dailyGoalConsistency, crmConversion, operationalStats, tripProfitability]);

  return (
    <>
      <TopBar
        title="Análises & Insights 360º"
        subtitle="Inteligência de negócios gerada a partir das vendas, logística e frotas."
      />

      <main className="px-4 md:px-8 py-6 md:py-8 space-y-8 relative overflow-hidden">
        {/* Ambient Purple Nubank Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-[#8A05BE]/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#C135FF]/5 blur-[150px] rounded-full pointer-events-none -z-10" />

        {/* Filtros de Período */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 rounded-2xl border border-[#8A05BE]/30 bg-black/60 shadow-[0_0_30px_rgba(138,5,190,0.05)] backdrop-blur-xl">
          <div>
            <h2 className="text-xl font-bold tracking-tight capitalize">Filtros de Análise</h2>
            <p className="text-sm text-muted-foreground">Selecione o período de tempo para refinar os insights abaixo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
              <button 
                onClick={() => setFilterMode("month")} 
                className={cn("px-4 py-2 text-sm font-medium transition-colors", filterMode === "month" ? "bg-[#8A05BE] text-white" : "hover:bg-white/5 text-muted-foreground")}
              >
                Por Mês
              </button>
              <button 
                onClick={() => setFilterMode("period")} 
                className={cn("px-4 py-2 text-sm font-medium transition-colors border-l border-border", filterMode === "period" ? "bg-[#8A05BE] text-white" : "hover:bg-white/5 text-muted-foreground")}
              >
                Por Período (Datas)
              </button>
            </div>

            {filterMode === "month" ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="px-3 py-2 bg-card border border-border rounded-lg text-sm hover:bg-white/5">&larr; Mês Ant.</button>
                <div className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-sm font-semibold capitalize min-w-[160px] text-center flex items-center justify-center">
                  <span>{currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                </div>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="px-3 py-2 bg-card border border-border rounded-lg text-sm hover:bg-white/5">Próx. &rarr;</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-muted-foreground">até</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="ml-2 px-3 py-1.5 bg-[#8A05BE]/10 border border-[#8A05BE]/20 rounded-md text-xs font-bold text-[#c178e6] flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar className="size-3.5" />
                  {Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1)} dias
                </div>
              </div>
            )}
            
            <div className="w-px h-8 bg-border/50 mx-2 hidden md:block"></div>
            
            <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden transition-colors hover:border-[#8A05BE]/50 focus-within:border-[#8A05BE] focus-within:ring-1 focus-within:ring-[#8A05BE]/50">
              <div className="pl-3 pr-2 flex items-center justify-center text-muted-foreground border-r border-border/50 bg-black/40">
                <Store className="size-4" />
              </div>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent border-none px-3 py-2 text-sm focus:outline-none focus:ring-0 text-foreground cursor-pointer font-medium min-w-[180px]"
              >
                <option className="bg-[#0A0A0A] text-white" value="all">Todas as Empresas</option>
                {partners.map(p => (
                  <option className="bg-[#0A0A0A] text-white" key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>


        {/* Menu de Acesso Rápido (Sticky) */}
        <div className="sticky top-2 z-50 py-3 bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 flex items-center gap-2 overflow-x-auto hide-scrollbar shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2 shrink-0">Navegar para:</span>
          {[
            { id: "ai-insights", label: "IA & Insights" },
            { id: "kpis", label: "KPIs" },
            { id: "inteligencia", label: "Inteligência Customizada" },
            { id: "diario", label: "Operação" },
            { id: "historico", label: "Histórico" },
            { id: "termometro", label: "Termômetro" },
            { id: "ranking", label: "Ranking Top 10" },
            { id: "rentabilidade", label: "Rentabilidade" },
            { id: "correlacoes", label: "Top 10 Dias" },
            { id: "simulador", label: "Simulador" },
            { id: "auditoria", label: "Auditoria" },
            { id: "pacing", label: "Pacing" },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => {
                const el = document.getElementById(item.id);
                if (el) {
                  const y = el.getBoundingClientRect().top + window.scrollY - 100;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }}
              className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-[#8A05BE]/20 hover:border-[#8A05BE]/50 hover:text-white transition-all text-xs text-white/70 font-medium"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Voyage AI & Risk Management */}

        <section id="ai-insights" className="relative overflow-hidden rounded-3xl border border-[#8A05BE]/20 bg-black/60 p-8 backdrop-blur-2xl shadow-2xl mt-4">
            <div className="flex justify-between items-center cursor-pointer group" onClick={() => setExpandedSaudeComercial(!expandedSaudeComercial)}>
              <div className="flex items-center gap-3">
                <Activity className="size-6 text-[#8A05BE] group-hover:scale-110 transition-transform" />
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">Insight Engine & Resumo Executivo <ChevronDown className={cn("size-5 transition-transform duration-300", expandedSaudeComercial && "rotate-180")} /></h2>
                  <p className="text-sm text-muted-foreground">O jeito mais rápido de interpretar seu negócio: Auditoria IA, anomalias e dicas sem precisar analisar gráficos.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="text-right hidden sm:block">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score atual</div>
                    <div className={cn("font-bold font-mono text-xl", aiInsights.healthScore >= 80 ? "text-success" : aiInsights.healthScore >= 50 ? "text-warning" : "text-danger")}>{aiInsights.healthScore}/100</div>
                 </div>
              </div>
            </div>
            
            <div className={cn("transition-all duration-500 overflow-hidden", expandedSaudeComercial ? "max-h-[3000px] opacity-100 mt-6 border-t border-[#8A05BE]/30 pt-6" : "max-h-0 opacity-0 mt-0")}>
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
           {/* Coluna Esquerda: Anomalias e Heatmap */}
           <div className="space-y-6">
              {/* Radar de Anomalias */}
              <div className="rounded-2xl border border-white/5 bg-black/40 p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
                       </span>
                       Auditoria em Tempo Real
                    </h2>
                 </div>
                 
                 <div className="space-y-2">
                    {aiInsights.anomalies.length > 0 ? (
                       aiInsights.anomalies.map((a, i) => (
                          <div 
                             key={i} 
                             onClick={() => setInsightModalData(a.modal)}
                             className="group flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all"
                          >
                             <div className="mt-0.5 bg-danger/20 p-1.5 rounded-md text-danger shrink-0">
                                <AlertTriangle className="size-3.5" />
                             </div>
                             <div className="flex-1">
                                <p className="text-sm font-medium text-white/90 group-hover:text-white transition-colors leading-snug">{a.text}</p>
                             </div>
                             <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all mt-0.5" />
                          </div>
                       ))
                    ) : (
                       <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                          <div className="bg-success/20 p-1.5 rounded-md text-success shrink-0">
                             <CheckCircle2 className="size-3.5" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">Nenhuma anomalia detectada.</p>
                       </div>
                    )}
                 </div>
              </div>

              {/* IA Insights & Recomendações */}
              <div className="rounded-2xl border border-white/5 bg-black/40 p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <Wand2 className="size-3.5 text-primary" /> IA Insights
                    </h2>
                 </div>
                 
                 <div className="space-y-2">
                    {aiInsights.insights.map((ins, i) => (
                       <div 
                         key={i} 
                         onClick={() => setInsightModalData(ins.modal)}
                         className="group flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all"
                       >
                          <div className="mt-0.5 bg-primary/20 p-1.5 rounded-md text-primary shrink-0">
                             <Activity className="size-3.5" />
                          </div>
                          <div className="flex-1">
                             <p className="text-sm font-medium text-white/90 group-hover:text-white transition-colors leading-snug">{ins.text}</p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all mt-0.5" />
                       </div>
                    ))}
                    {aiInsights.recommendations.map((rec, i) => (
                       <div 
                         key={i} 
                         onClick={() => setInsightModalData(rec.modal)}
                         className="group flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all"
                       >
                          <div className="mt-0.5 bg-warning/20 p-1.5 rounded-md text-warning shrink-0">
                             <TrendingUp className="size-3.5" />
                          </div>
                          <div className="flex-1">
                             <p className="text-sm font-medium text-warning/90 group-hover:text-warning transition-colors leading-snug">{rec.text}</p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all mt-0.5" />
                       </div>
                    ))}
                 </div>
              </div>

              {/* Heatmap de Horários */}
              <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-xl">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Heatmap de Vendas por Horário</h3>
                 <div className="flex gap-1 h-32 items-end">
                    {aiInsights.hours.map((val, h) => {
                       const max = Math.max(...aiInsights.hours, 1);
                       const height = (val / max) * 100;
                       return (
                          <div key={h} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                             <div className="w-full bg-[#8A05BE] rounded-t-sm transition-all group-hover:bg-[#C135FF]" style={{ height: `${height}%`, opacity: Math.max(0.2, height/100) }}></div>
                             <span className="text-[9px] text-muted-foreground font-mono">{h.toString().padStart(2, '0')}h</span>
                             
                             {/* Tooltip */}
                             <div className="absolute -top-8 bg-black border border-white/10 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                {val} transações
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>
           </div>

           {/* Coluna Direita: Saúde Comercial & Pareto */}
           <div className="space-y-6">
              {/* Saúde Comercial Score */}
              <div 
                 className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors group"
                 onClick={() => setInsightModalData({
                    title: "Composição da Saúde Comercial",
                    text: "Veja exatamente como o score da sua operação está sendo calculado. Itens em vermelho estão penalizando sua nota:",
                    list: aiInsights.healthBreakdown
                 })}
              >
                 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 group-hover:text-white transition-colors flex items-center gap-2">
                    Índice de Saúde Comercial <ChevronRight className="size-3 opacity-50" />
                 </h3>
                 <div className="relative size-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                       <circle className="text-white/5 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                       <circle 
                          className={cn("stroke-current drop-shadow-[0_0_8px_rgba(currentcolor,0.5)] transition-all duration-1000", aiInsights.healthScore >= 80 ? "text-success" : aiInsights.healthScore >= 50 ? "text-warning" : "text-danger")} 
                          strokeWidth="8" 
                          strokeLinecap="round" 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          fill="transparent" 
                          strokeDasharray="251.2" 
                          strokeDashoffset={251.2 - (251.2 * aiInsights.healthScore) / 100}
                       ></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-4xl font-extrabold font-mono tracking-tighter">{aiInsights.healthScore}</span>
                       <span className="text-[10px] text-muted-foreground uppercase font-bold">/ 100</span>
                    </div>
                 </div>
                 <div className="mt-6 w-full space-y-2 text-left">
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="size-3 text-success"/> Ticket Médio Saudável</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="size-3 text-success"/> Receita em Crescimento</span>
                    </div>
                 </div>
              </div>

              {/* Indicadores Resumo */}
              <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Painel de Eficiência (Média)</h3>
                 <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-sm text-muted-foreground">Conversão Comercial</span>
                    <span className="font-mono font-bold text-white">{crmConversion.conversionRate.toFixed(1)}%</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-sm text-muted-foreground">Taxa de Atraso Frotas</span>
                    <span className="font-mono font-bold text-white">{operationalStats.avgDelay} min</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-sm text-muted-foreground">Dependência 80/20</span>
                    <span className="font-mono font-bold text-warning">Risco {aiInsights.recommendations.length > 0 ? "Alto" : "Baixo"}</span>
                 </div>
                 <div className="flex justify-between items-center pt-1">
                    <span className="text-sm text-muted-foreground">Comissão Absorvida</span>
                    <span className="font-mono font-bold text-danger">- {formatCurrency(closingsTotals.commission)}</span>
                 </div>
              </div>
           </div>
          </div>
         </div>
        </section>

        {/* KPI Row (Visão Macro Financeira) */}
        <section id="kpis" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-primary/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="size-5 text-[#8A05BE]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A05BE]/80">Total Faturado</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-foreground">
              {formatCurrency(closingsTotals.revenue)}
            </div>
            <div className="text-xs font-semibold text-[#8A05BE] mt-2 flex items-center gap-1.5">
               <Activity className="size-3" /> Volume financeiro do período
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-danger/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-danger/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <LineChart className="size-5 text-danger" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Comissão (Rateio)</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-danger">
              - {formatCurrency(closingsTotals.commission)}
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1.5">
               <TrendingUp className="size-3" /> Pagamento de parceiros
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-warning/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-warning/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="size-5 text-warning" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Meta x Realizado</h3>
            </div>
            <div className="flex items-baseline gap-2">
               <div className="text-4xl font-extrabold font-mono tracking-tighter text-warning">
                 {globalMeta.percent.toFixed(1)}%
               </div>
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1.5">
               Alvo do período: {formatCurrency(globalMeta.goal)}
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-3">
               <div className="h-full bg-warning" style={{ width: `${Math.min(100, globalMeta.percent)}%` }} />
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl border border-[#8A05BE]/20 bg-black/60 p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(138,5,190,0.1)] group transition-all hover:bg-black/80 hover:border-[#8A05BE]/50">
            <div className={cn("absolute -right-10 -top-10 size-40 blur-[60px] rounded-full pointer-events-none transition-colors", opexCovered ? "bg-[#8A05BE]/20 group-hover:bg-[#8A05BE]/40" : "bg-warning/20 group-hover:bg-warning/30")}></div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className={cn("size-5", opexCovered ? "text-[#8A05BE]" : "text-warning")} />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">OPEX / Break-even</h3>
            </div>
            <div className={cn("text-4xl font-extrabold font-mono tracking-tighter", opexCovered ? "text-success" : "text-warning")}>
              {formatCurrency(opex)}
            </div>
            <div className={cn("text-xs font-semibold mt-2 flex items-center gap-1.5", opexCovered ? "text-success" : "text-warning")}>
               <CheckCircle2 className="size-3" /> {opexCovered ? `Operação paga (${opexPercentage.toFixed(0)}%)` : `Falta ${formatCurrency(opex - closingsTotals.commission)}`}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-info/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-info/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="size-5 text-info" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Ticket Médio</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-foreground">
              {closingsTotals.sales > 0 ? formatCurrency(closingsTotals.revenue / closingsTotals.sales) : "R$ 0,00"}
            </div>
            <div className="text-xs font-semibold text-info mt-2 flex items-center gap-1.5">
               <Users className="size-3" /> Gasto médio por passagem
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl group transition-all hover:bg-black/60 hover:border-white/10">
            <div className="absolute -right-10 -top-10 size-40 bg-success/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-success/30 transition-colors"></div>
            <div className="flex items-center gap-2 mb-3">
              <Bus className="size-5 text-success" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Pontualidade</h3>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tighter text-success">
              {operationalStats.punctuality}%
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1.5">
               <CalendarClock className="size-3" /> {operationalStats.avgDelay} min de atraso médio
            </div>
          </div>
        </section>

        {/* Painel Customizável */}
        <section id="inteligencia" className="relative overflow-hidden rounded-3xl border border-success/20 bg-success/5 p-8 backdrop-blur-2xl shadow-2xl mt-4">
           <div className="absolute -right-20 -top-20 size-60 bg-success/10 blur-[60px] rounded-full pointer-events-none transition-colors"></div>
           <div className="flex items-center justify-between mb-6 relative z-10">
             <div className="flex items-center gap-3">
               <DollarSign className="size-6 text-success" />
               <div>
                 <h2 className="text-2xl font-bold tracking-tight text-white">Inteligência Customizada (Caixa & Vendas)</h2>
                 <p className="text-sm text-muted-foreground">Indicadores dinâmicos escolhidos por você para tomada de decisão ágil.</p>
               </div>
             </div>
             <button onClick={() => setIsKpiModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-success/10 hover:bg-success/20 text-success rounded-xl transition-colors font-bold text-sm border border-success/20">
               <Settings className="size-4" /> Customizar KPIs
             </button>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
             {selectedKpis.map(kpiId => {
               const def = AVAILABLE_KPIS_ANALYTICS.find(k => k.id === kpiId);
               if (!def) return null;
               const val = getKpiValueAnalytics(kpiId);
               return (
                 <div key={kpiId} className="bg-black/40 p-5 rounded-2xl border border-success/10 hover:border-success/30 transition-colors">
                   <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1 truncate" title={def.label}>{def.label}</div>
                   <div className="text-2xl font-black text-white truncate">
                     {def.type === "currency" ? formatCurrency(val as number) : def.type === "percent" ? `${(val as number).toFixed(1)}%` : val}
                   </div>
                 </div>
               );
             })}
             {selectedKpis.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground text-sm italic py-8 border border-dashed border-white/10 rounded-2xl bg-black/20">
                  Nenhum indicador selecionado. Clique em "Customizar KPIs" para adicionar informações de Caixa e Vendas aqui.
                </div>
             )}
           </div>
        </section>



        {/* Histórico de Fechamentos Chart - moved up */}
        <section id="historico" className="relative overflow-hidden rounded-3xl border border-[#8A05BE]/30 bg-black/60 p-8 backdrop-blur-2xl shadow-2xl mt-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-[#8A05BE]/50 to-transparent"></div>
            <div className="absolute -left-40 -bottom-40 size-96 bg-[#8A05BE]/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="mb-8 flex items-center justify-between relative z-10">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Histórico Financeiro</h2>
                <p className="text-base text-muted-foreground mt-1 font-medium">Evolução do faturamento real validado em caixa e comissões associadas.</p>
              </div>
              <div className="bg-[#8A05BE]/10 p-3 rounded-2xl border border-[#8A05BE]/20">
                 <Lock className="size-6 text-[#8A05BE]" />
              </div>
            </div>

            {closingsChartData.length > 0 ? (
              <div className="h-[350px] relative z-10 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    const avgRevenue = closingsChartData.reduce((acc, curr) => acc + curr.revenue, 0) / closingsChartData.length || 0;
                    return (
                      <ComposedChart data={closingsChartData} margin={{ top: 20, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} vertical={false} />
                        <XAxis dataKey="date" stroke="currentColor" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis 
                          yAxisId="left"
                          stroke="currentColor" 
                          opacity={0.5}
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          dx={-10}
                          domain={[0, (dataMax: number) => Math.max(8000, dataMax)]}
                          tickFormatter={(value: number) => value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace('.0', '')}k` : `R$ ${value}`}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#8A05BE" 
                          opacity={0.8}
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          dx={10}
                          tickFormatter={(value: number) => value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace('.0', '')}k` : `R$ ${value}`}
                        />
                        <RechartsTooltip 
                          formatter={(val: number, name: string) => [formatCurrency(val), name === "revenue" ? "Faturado" : "Comissão"]}
                          contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(138,5,190,0.3)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                        <ReferenceLine 
                          yAxisId="left" 
                          y={avgRevenue} 
                          stroke="#C135FF" 
                          strokeDasharray="5 5" 
                          strokeOpacity={0.8}
                          label={{ position: 'insideTopLeft', value: `Média Faturamento: ${formatCurrency(avgRevenue)}`, fill: '#C135FF', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <Bar yAxisId="left" dataKey="revenue" name="Faturado" fill="url(#colorRevenueGradient)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                        <Line yAxisId="right" type="monotone" dataKey="commission" name="Comissão" stroke="#8A05BE" strokeWidth={4} dot={{ r: 5, fill: "#8A05BE", strokeWidth: 2, stroke: "#000" }} activeDot={{ r: 8, strokeWidth: 0 }} />
                        <defs>
                          <linearGradient id="colorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8A05BE" stopOpacity={1} />
                            <stop offset="100%" stopColor="#8A05BE" stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                      </ComposedChart>
                    );
                  })()}
                </ResponsiveContainer>
              </div>
            ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground italic border border-dashed border-white/10 rounded-2xl">
                   Nenhum dado financeiro para gerar o gráfico.
                </div>
            )}
        </section>

        {/* Charts Row */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#8A05BE]/30 bg-black/60 shadow-[0_0_30px_rgba(138,5,190,0.05)] p-6 backdrop-blur-xl">
            <h3 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-2 text-white">
              <Smartphone className="size-5 text-[#8A05BE]" /> Faturamento por Canal de Venda
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {channelData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#8A05BE', '#A020F0', '#C135FF', '#D8BFD8'][index % 4]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-[#8A05BE]/30 bg-black/60 shadow-[0_0_30px_rgba(138,5,190,0.05)] p-6 backdrop-blur-xl">
            <h3 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-2 text-white">
              <Wallet className="size-5 text-[#8A05BE]" /> Formas de Pagamento
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {paymentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#8A05BE', '#7B1FA2', '#4A148C', '#E1BEE7'][index % 4]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>



        {/* Ranking de Empresas */}
        <section id="ranking" className="rounded-2xl border border-[#8A05BE]/30 bg-black/60 p-6 backdrop-blur-xl overflow-hidden mt-4">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-warning" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Ranking de Empresas & Vendedores
              </h2>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Top 10 Faturamento
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5 hidden sm:block">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-right">Faturado</th>
                  <th className="px-4 py-3 text-right text-success">Comissão Realizada</th>
                  <th className="px-4 py-3 text-right">Comissão Prevista (Meta)</th>
                  <th className="px-4 py-3 text-left">Progresso da Meta</th>
                </tr>
              </thead>
              <tbody>
                {dynamicRanking.map((p) => (
                  <tr 
                    key={p.rank} 
                    className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      <span
                        className={cn(
                          "inline-grid size-6 place-items-center rounded-md border text-xs font-bold",
                          p.rank === 1
                            ? "border-warning/40 bg-warning/10 text-warning"
                            : "border-white/10 bg-black",
                        )}
                      >
                        {p.rank === 1 ? <Trophy className="size-3" /> : p.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{p.name}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{p.revenue}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-success">
                      {p.commission}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {p.expectedCommission}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/5 border border-white/5">
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
                          {p.goal}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {dynamicRanking.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma empresa encontrada com faturamento.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Ranking Cards */}
          <div className="sm:hidden space-y-3">
            {dynamicRanking.map((p) => (
              <div 
                key={p.rank}
                className="rounded-xl border border-white/5 bg-black/40 p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={cn(
                      "inline-grid size-8 shrink-0 place-items-center rounded-lg border text-sm font-bold shadow-sm",
                      p.rank === 1
                        ? "border-warning/40 bg-warning/10 text-warning shadow-warning/10"
                        : "border-white/10 bg-black/50",
                    )}
                  >
                    {p.rank === 1 ? <Trophy className="size-4" /> : p.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base text-white truncate">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            p.goal >= 80 ? "bg-success" : p.goal >= 60 ? "bg-primary" : "bg-warning",
                          )}
                          style={{ width: `${p.goal}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-muted-foreground shrink-0 w-8 text-right">
                        {p.goal}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm pt-3 border-t border-white/5">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Faturado</div>
                    <div className="font-mono font-medium">{p.revenue}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Comissão Liquida</div>
                    <div className="font-mono font-bold text-success">{p.commission}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fechamento de Carro Table */}
        <section id="rentabilidade" className="rounded-2xl border border-[#8A05BE]/30 bg-black/60 p-6 backdrop-blur-xl overflow-hidden mt-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Fechamento de Carro (Rentabilidade)</h2>
              <p className="text-sm text-muted-foreground">Volume de passagens e faturamento extraídos do Diário Analítico.</p>
            </div>
            <BarChart className="size-5 text-[#8A05BE]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-[#8A05BE]/30 text-muted-foreground">
                  <th className="px-4 py-3 text-left font-semibold">Rota / Serviço</th>
                  <th className="px-4 py-3 text-center font-semibold">Qtd Passagens</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#8A05BE]">Receita Total</th>
                </tr>
              </thead>
              <tbody>
                {carProfitability.map((car, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-[#8A05BE]">{car.name}</div>
                        {!car.isRegistered ? (
                          <span className="inline-flex items-center gap-1 bg-warning/10 text-warning text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border border-warning/20" title="Este serviço/rota não foi encontrado no cadastro de Frotas Ativas.">
                            <AlertTriangle className="size-3" /> Não Cadastrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-success/10 text-success text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border border-success/20" title="Linkado à Frota">
                            <CheckCircle2 className="size-3" /> {car.matchedCode} {car.matchedOrigin && car.matchedDestination && `(${car.matchedOrigin} → ${car.matchedDestination})`} {car.matchedTime && `às ${car.matchedTime}`}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5 tracking-widest">{car.empresa}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-white">{car.count}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-lg text-[#8A05BE] bg-[#8A05BE]/5 rounded-r-md">
                      {formatCurrency(car.revenue)}
                    </td>
                  </tr>
                ))}
                {carProfitability.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">Nenhuma rota ou serviço registrado no diário deste período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ============================================================== */}
        {/* NOVA SEÇÃO: Análises Minuciosas & Correlações */}
        {/* ============================================================== */}

        <div className="pt-4 border-t border-[#8A05BE]/30">
          <div className="mb-6 flex items-center gap-2">
            <LineChart className="size-6 text-[#8A05BE]" />
            <h2 className="text-2xl font-bold tracking-tight text-white">Análises Minuciosas & Correlações</h2>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            {/* Termômetro Semanal */}
            <section id="correlacoes" className="rounded-2xl border border-[#8A05BE]/30 bg-black/60 p-6 backdrop-blur-xl">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">Top 10 Dias de Vendas</h3>
                  <p className="text-sm text-muted-foreground">Dias de maior pico de vendas.</p>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={topDaysMode}
                    onChange={(e) => setTopDaysMode(e.target.value as any)}
                    className="bg-black/50 border border-[#8A05BE]/30 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#8A05BE] cursor-pointer"
                  >
                    <option className="bg-[#0A0A0A]" value="specific">Datas Específicas</option>
                    <option className="bg-[#0A0A0A]" value="weekday">Dias da Semana (Agrupado)</option>
                  </select>
                  <CalendarClock className="size-5 text-[#8A05BE] hidden sm:block" />
                </div>
              </div>
              
              <div className="space-y-4">
                {weekdayStats.length > 0 ? weekdayStats.slice(0, 10).map((w, i) => (
                  <div key={i} className="flex flex-col gap-3 p-4 rounded-xl bg-black/40 border border-[#8A05BE]/20 shadow-sm relative overflow-hidden hover:bg-white/[0.02] transition-colors">
                    {i === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>}
                    {i === weekdayStats.length - 1 && weekdayStats.length > 1 && <div className="absolute top-0 left-0 w-1 h-full bg-danger"></div>}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm", i === 0 ? "bg-success/20 text-success" : i === weekdayStats.length - 1 ? "bg-danger/20 text-danger" : "bg-black/50 text-white")}>
                          #{i+1}
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-2 text-white">
                             {w.day} <span className="text-[10px] text-muted-foreground font-normal">({w.dates.join(', ')})</span>
                             {i === 0 && <span className="text-[9px] uppercase font-bold text-success bg-success/10 px-1.5 py-0.5 rounded tracking-wider">Pico</span>}
                             {i === weekdayStats.length - 1 && weekdayStats.length > 1 && <span className="text-[9px] uppercase font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded tracking-wider">Fraco</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{w.count} {w.count === 1 ? 'venda/pass' : 'vendas/pass'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-base text-white">{formatCurrency(w.revenue)}</div>
                      </div>
                    </div>
                    
                  </div>
                )) : (
                  <div className="text-center py-6 text-muted-foreground italic text-sm">Sem dados suficientes no período.</div>
                )}
              </div>
            </section>

            {/* Alerta de Metas */}
            <section className="rounded-2xl border border-[#8A05BE]/30 bg-black/60 p-6 backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">Alerta de Metas (Pacing)</h3>
                  <p className="text-sm text-muted-foreground">Monitoramento de ritmo: quem está ficando para trás.</p>
                </div>
                <AlertTriangle className="size-5 text-warning" />
              </div>

              <div className="space-y-4">
                {holidaysInPeriod.length > 0 && (
                   <div className="bg-info/10 border border-info/20 rounded-xl p-3 flex gap-3 items-start">
                      <Calendar className="size-4 text-info mt-0.5 shrink-0" />
                      <div className="flex-1">
                         <div className="text-[10px] font-bold text-info mb-1 uppercase tracking-widest">Atenção Operacional</div>
                         <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                           Este período possui feriados identificados que podem afetar o ritmo de vendas (Pacing). Ajuste suas campanhas:
                         </p>
                         <ul className="text-[10px] font-medium text-white/80 space-y-1">
                            {holidaysInPeriod.map((h, idx) => (
                               <li key={idx} className="flex justify-between items-center bg-black/40 px-2 py-1.5 rounded border border-white/5">
                                  <span>{h.name}</span>
                                  <span className="font-mono text-info/80">{h.date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                               </li>
                            ))}
                         </ul>
                      </div>
                   </div>
                )}
                {pacingAlerts.map(pa => (
                  <div key={pa.id} className="p-4 rounded-xl bg-black/40 border border-[#8A05BE]/20 relative overflow-hidden flex flex-col gap-2">
                    <div className={cn("absolute inset-y-0 left-0 w-1", pa.pacing >= 100 ? "bg-success" : pa.pacing >= 80 ? "bg-warning" : "bg-danger")} />
                    <div className="flex items-center justify-between pl-3">
                      <div className="font-bold text-sm text-white">{pa.name}</div>
                      <div className={cn("font-bold text-xs px-2 py-0.5 rounded-full", pa.pacing >= 100 ? "bg-success/20 text-success" : pa.pacing >= 80 ? "bg-warning/20 text-warning" : "bg-danger/20 text-danger")}>
                        Ritmo: {pa.pacing.toFixed(1)}%
                      </div>
                    </div>
                    <div className="pl-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Faturado: {formatCurrency(pa.revenue)}</span>
                      <span>Alvo Ideal (Até agora): {formatCurrency(pa.expectedRevenue)}</span>
                    </div>
                  </div>
                ))}
                {pacingAlerts.length === 0 && (
                   <div className="text-center py-6 text-muted-foreground italic text-sm">Sem parceiros configurados.</div>
                )}
              </div>
            </section>
          </div>

          <div className="mb-8">
            {/* Consistência de Meta Diária */}
            <section className="rounded-2xl border border-[#8A05BE]/30 bg-black/60 p-6 backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">Consistência de Meta Diária</h3>
                  <p className="text-sm text-muted-foreground">Monitoramento analítico de performance diária por parceiro.</p>
                </div>
                <Trophy className="size-5 text-warning" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {dailyGoalConsistency.map((dg, i) => (
                  <div 
                    key={dg.id} 
                    className="p-4 rounded-xl bg-black/40 border border-[#8A05BE]/20 relative overflow-hidden hover:bg-black/60 transition-colors cursor-pointer group"
                    onClick={() => toggleConsistency(dg.id)}
                  >
                    <div className={cn("absolute inset-y-0 left-0 w-1", dg.hitRate >= 80 ? "bg-success" : dg.hitRate >= 50 ? "bg-warning" : "bg-danger")} />
                    <div className="flex items-center justify-between pl-3 mb-2">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {dg.name}
                        {dg.hitRate === 100 && <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Perfeito</span>}
                      </div>
                      <div className="font-mono font-bold text-xs text-[#8A05BE]">
                        Meta: {formatCurrency(dg.dailyMeta)}/dia
                      </div>
                    </div>
                    <div className="pl-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>
                           <span className="text-success font-medium">{dg.daysMet} batidos</span> 
                           <span className="mx-1 opacity-40">|</span> 
                           <span className="text-danger font-medium">{dg.daysToCheck - dg.daysMet} não batidos</span>
                        </span>
                        <span className="font-bold text-white">{dg.hitRate.toFixed(1)}% de sucesso</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                        <div className={cn("h-full transition-all", dg.hitRate >= 80 ? "bg-success" : dg.hitRate >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${dg.hitRate}%` }} />
                      </div>
                      <div className="mt-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs flex flex-col gap-2">
                         <div className="flex justify-between items-center text-muted-foreground">
                            <span>Excedente (Dias Bons):</span>
                            <span className="font-mono text-success">+{formatCurrency(dg.surplus)}</span>
                         </div>
                         <div className="flex justify-between items-center text-muted-foreground">
                            <span>Falta (Dias Ruins):</span>
                            <span className="font-mono text-danger">-{formatCurrency(dg.deficit)}</span>
                         </div>
                         <div className="pt-2 border-t border-white/5 flex justify-between items-center font-bold">
                            <span className="text-white">Balanço do Mês:</span>
                            <span className={cn("font-mono", dg.netBalance >= 0 ? "text-success" : "text-danger")}>
                               {dg.netBalance >= 0 ? "+" : ""}{formatCurrency(dg.netBalance)}
                            </span>
                         </div>
                         <div className={cn("mt-1 text-[10px] p-2 rounded-lg border", dg.netBalance >= 0 ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger")}>
                            {dg.netBalance >= 0 
                              ? "✓ O excedente operacional cobre as faltas. Meta global estabilizada."
                              : "⚠️ O excedente não é suficiente para cobrir as faltas. Risco na meta global!"}
                         </div>
                      </div>
                      
                      <div className="mt-3 text-[10px] text-muted-foreground flex justify-between items-center group-hover:text-white/70 transition-colors">
                        <span>Clique para {expandedConsistency[dg.id] ? "ocultar detalhes" : "ver detalhamento por dia"}</span>
                        <ChevronDown className={cn("size-3 transition-transform", expandedConsistency[dg.id] && "rotate-180")} />
                      </div>

                      <div className={cn("transition-all duration-300 overflow-hidden", expandedConsistency[dg.id] ? "max-h-[300px] mt-4 opacity-100 overflow-y-auto custom-scrollbar pr-2" : "max-h-0 mt-0 opacity-0")}>
                         <div className="space-y-1.5 border-t border-white/5 pt-3">
                            {dg.history.map((h, idx) => (
                               <div key={idx} className="flex justify-between items-center text-xs bg-white/5 px-3 py-2 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                                     <CalendarClock className="size-3" />
                                     {new Date(h.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                  </span>
                                  <div className="flex items-center gap-3">
                                     <span className="font-mono font-bold text-white">{formatCurrency(h.total)}</span>
                                     {h.met ? (
                                        <span className="bg-success/20 text-success px-1.5 py-0.5 rounded uppercase font-bold text-[9px] min-w-[50px] text-center border border-success/20">Batida</span>
                                     ) : (
                                        <span className="bg-danger/20 text-danger px-1.5 py-0.5 rounded uppercase font-bold text-[9px] min-w-[50px] text-center border border-danger/20">Falhou</span>
                                     )}
                                  </div>
                               </div>
                            ))}
                            {dg.history.length === 0 && <div className="text-xs text-muted-foreground italic text-center py-2">Sem fechamentos registrados para este parceiro.</div>}
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
                {dailyGoalConsistency.length === 0 && (
                   <div className="text-center py-6 text-muted-foreground italic text-sm">Sem parceiros configurados.</div>
                )}
              </div>
            </section>
          </div>


          {/* Auditoria de Fechamentos */}
          <section id="auditoria" className="mt-12 mb-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Auditoria de Fechamentos</h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Registros diários do caixa matriz e detalhamento de split de pagamento.</p>
              </div>
              <div className="flex gap-4">
                 <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Faturado</span>
                    <span className="text-base font-mono font-bold text-success">{formatCurrency(closingsTotals.revenue)}</span>
                 </div>
                 <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Comissão</span>
                    <span className="text-base font-mono font-bold text-danger">- {formatCurrency(closingsTotals.commission)}</span>
                 </div>
              </div>
            </div>

            
            <div className="grid gap-6 mb-8 lg:grid-cols-1">
               {companyClosingStats.length > 0 && (
                 <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl p-6">
                    <h3 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2"><Target className="size-5 text-primary" /> Projeção de Fechamentos (Mês Atual)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {companyClosingStats.map((stat) => (
                          <div key={stat.partner.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/20 transition-colors"></div>
                             
                             <div className="flex justify-between items-center mb-4 relative z-10">
                                <span className="font-bold text-base flex items-center gap-2"><Store className="size-4 text-primary" /> {stat.partner.name}</span>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5">Faltam {stat.remainingDays} dias</span>
                             </div>

                             <div className="grid grid-cols-3 gap-3 mb-5 relative z-10">
                                <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-center flex flex-col justify-center">
                                   <span className="text-[9px] uppercase font-bold tracking-widest text-danger mb-1 block">Pior Dia</span>
                                   <span className="font-mono font-bold text-danger">{formatCurrency(stat.worstAmount)}</span>
                                </div>
                                <div className="bg-info/10 border border-info/20 rounded-xl p-3 text-center flex flex-col justify-center">
                                   <span className="text-[9px] uppercase font-bold tracking-widest text-info mb-1 block">Média</span>
                                   <span className="font-mono font-bold text-info">{formatCurrency(stat.avgAmount)}</span>
                                </div>
                                <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-center flex flex-col justify-center">
                                   <span className="text-[9px] uppercase font-bold tracking-widest text-success mb-1 block">Melhor Dia</span>
                                   <span className="font-mono font-bold text-success">{formatCurrency(stat.bestAmount)}</span>
                                </div>
                             </div>

                             <div className="pt-4 border-t border-white/10 relative z-10">
                                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3">Como será o fechamento do mês:</div>
                                <div className="space-y-2 text-sm">
                                   <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground flex items-center gap-1.5"><TrendingDown className="size-3 text-danger" /> Se for ruim:</span>
                                      <span className="font-mono font-bold text-foreground">{formatCurrency(stat.projPessimista)}</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="size-3 text-info" /> Na média:</span>
                                      <span className="font-mono font-bold text-info">{formatCurrency(stat.projMedia)}</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp className="size-3 text-success" /> Se for ótimo:</span>
                                      <span className="font-mono font-bold text-success">{formatCurrency(stat.projOtimista)}</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
               <div 
                 onClick={() => setIsClosingsTableOpen(!isClosingsTableOpen)}
                 className="grid grid-cols-12 gap-4 p-5 border-b border-white/10 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-white/[0.02] cursor-pointer hover:bg-white/[0.05] transition-colors items-center"
               >
                  <div className="col-span-3 pl-4 flex items-center gap-2">
                    <ChevronRight className={cn("size-4 transition-transform", isClosingsTableOpen && "rotate-90")} />
                    Data do Fechamento
                  </div>
                  <div className="col-span-2 text-center">Qtd. Vendas</div>
                  <div className="col-span-3 text-right">Total Faturado</div>
                  <div className="col-span-2 text-right">Comissão (Entrada)</div>
                  <div className="col-span-2 text-center">Status</div>
               </div>

               {isClosingsTableOpen && (
                 <div className="flex flex-col">
                    {closingsHistory.length === 0 ? (
                       <div className="text-center py-16 text-muted-foreground italic border-b border-white/5">Nenhum fechamento registrado nas datas selecionadas.</div>
                  ) : (
                     closingsHistory.map((c) => {
                        const [y, m, d] = c.closing_date.split('-');
                        const formattedDate = `${d}/${m}/${y}`;
                        const isExpanded = expandedClosing === c.id;

                        return (
                           <div key={c.id} className="group flex flex-col border-b border-white/5 last:border-0 transition-colors">
                              {/* Main Row */}
                              <div 
                                 onClick={() => setExpandedClosing(isExpanded ? null : c.id)}
                                 className={cn("grid grid-cols-12 gap-4 p-5 items-center cursor-pointer transition-all", isExpanded ? "bg-white/[0.04]" : "hover:bg-white/[0.02]")}
                              >
                                 <div className="col-span-3 pl-4 font-bold text-primary flex items-center gap-3 text-sm">
                                    <div className={cn("p-1.5 rounded-md bg-white/5 transition-transform", isExpanded && "rotate-90 bg-primary/20 text-primary")}>
                                       <ChevronRight className="size-4" />
                                    </div>
                                    {formattedDate}
                                 </div>
                                 <div className="col-span-2 text-center font-mono text-sm text-muted-foreground">{c.sales_count_calc || 0}</div>
                                 <div className="col-span-3 text-right font-mono font-bold text-success text-base">{formatCurrency(c.total_revenue_calc || 0)}</div>
                                 <div className="col-span-2 text-right font-mono font-bold text-success text-base">+ {formatCurrency(c.total_commission_calc || 0)}</div>
                                 <div className="col-span-2 flex justify-center">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-success/10 text-success border border-success/20">
                                       <CheckCircle2 className="size-3" /> Validado
                                    </span>
                                 </div>
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                 <div className="p-6 bg-black/20 border-t border-white/5 shadow-inner">
                                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                       <Activity className="size-3" /> Split de Repasse por Empresa
                                    </div>
                                    
                                    {(!c.company_settlements || c.company_settlements.length === 0) ? (
                                       <div className="text-sm text-muted-foreground italic bg-white/5 p-4 rounded-xl border border-white/5">Sem rateio mapeado no caixa.</div>
                                    ) : (
                                       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                          {(c.company_settlements as any[])
                                             .filter(s => selectedCompanyId === "all" || s.company_id === selectedCompanyId)
                                             .map(s => {
                                             const partner = partners.find(p => p.id === s.company_id);
                                             const rate = partner ? partner.commission_rate : 0;
                                             return (
                                             <div key={s.id} className="relative overflow-hidden bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col shadow-2xl hover:bg-black/60 transition-colors group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/20 transition-colors"></div>
                                                <div className="flex items-center justify-between mb-4 relative z-10">
                                                   <span className="font-bold text-sm tracking-tight flex items-center gap-2">
                                                      <Store className="size-3.5 text-primary" /> {s.company_name}
                                                   </span>
                                                   <span className="bg-white/10 border border-white/5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider text-muted-foreground shadow-sm">
                                                      {rate}%
                                                   </span>
                                                </div>
                                                
                                                <div className="mb-4 relative z-10">
                                                   <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1 opacity-70">Faturado</div>
                                                   <div className="text-success font-mono text-2xl font-extrabold tracking-tight">{formatCurrency(Number(s.total || 0))}</div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-[10px] uppercase font-semibold text-muted-foreground relative z-10">
                                                   <div className="bg-white/[0.02] border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center">
                                                      <span className="opacity-60 flex items-center gap-1 mb-1"><Smartphone className="size-3" /> PIX</span>
                                                      <span className="font-mono text-foreground text-xs font-bold">{formatCurrency(Number(s.pix || 0))}</span>
                                                   </div>
                                                   <div className="bg-white/[0.02] border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center">
                                                      <span className="opacity-60 flex items-center gap-1 mb-1"><Wallet className="size-3" /> ESP</span>
                                                      <span className="font-mono text-foreground text-xs font-bold">{formatCurrency(Number(s.dinheiro || 0))}</span>
                                                   </div>
                                                   <div className="bg-white/[0.02] border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center">
                                                      <span className="opacity-60 flex items-center gap-1 mb-1"><CreditCard className="size-3" /> CAR</span>
                                                      <span className="font-mono text-foreground text-xs font-bold">{formatCurrency(Number(s.cartao || 0))}</span>
                                                   </div>
                                                </div>

                                                <div className="flex justify-between items-center bg-gradient-to-r from-success/10 to-success/5 border border-success/20 px-4 py-3 rounded-xl mt-4 relative z-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                                   <span className="text-success uppercase tracking-wider font-extrabold text-[10px] flex items-center gap-1.5">
                                                      <TrendingUp className="size-3" /> Comissão (Receita)
                                                   </span>
                                                   <span className="font-mono font-black text-success text-base tracking-tighter drop-shadow-sm">+ {formatCurrency(Number(s.commission || 0))}</span>
                                                </div>
                                             </div>
                                          )})}
                                       </div>
                                    )}
                                 </div>
                              )}
                           </div>
                        );
                     })
                  )}
                 </div>
               )}
            </div>
          </section>
        </div>
      </main>

      {/* KPI Selector Modal */}
      {isKpiModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-background border border-border rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-xl font-bold">Customizar Indicadores (Caixa & Vendas)</h3>
                <p className="text-sm text-muted-foreground">Marque quais dados cruciais você deseja que fiquem fixos no topo do seu painel analítico.</p>
              </div>
              <button onClick={() => setIsKpiModalOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-white/5"><X className="size-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {Array.from(new Set(AVAILABLE_KPIS_ANALYTICS.map(k => k.group))).map(group => (
                  <div key={group} className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-success border-b border-white/5 pb-2">{group}</h4>
                    <div className="space-y-2">
                      {AVAILABLE_KPIS_ANALYTICS.filter(k => k.group === group).map(kpi => (
                        <label key={kpi.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/10">
                          <input 
                            type="checkbox" 
                            checked={selectedKpis.includes(kpi.id)}
                            onChange={() => toggleKpi(kpi.id)}
                            className="size-4 rounded border-white/20 bg-black/40 text-success focus:ring-success focus:ring-offset-background cursor-pointer"
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
              <button onClick={() => setIsKpiModalOpen(false)} className="bg-success hover:bg-success/90 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg transition-all text-sm">Salvar Preferências</button>
            </div>
          </div>
        </div>
      )}

      {/* Destination Details Modal */}
      {selectedDestination && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-background border border-border rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="size-5 text-[#8A05BE]" /> {selectedDestination.city}
                </h3>
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  Cód. de Identificação: {selectedDestination.code}
                </p>
              </div>
              <button onClick={() => setSelectedDestination(null)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-white/5"><X className="size-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto hide-scrollbar space-y-6">
              
              {/* Resumo do Destino */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Volume Total</span>
                  <span className="font-mono text-2xl font-bold text-white">{selectedDestination.qtd} <span className="text-sm font-normal text-muted-foreground">passagens</span></span>
                </div>
                <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Receita Gerada</span>
                  <span className="font-mono text-2xl font-bold text-success">{formatCurrency(selectedDestination.valor)}</span>
                </div>
              </div>

              {/* Histórico e Performance */}
              <div>
                 <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-2 mb-4">
                    Histórico de Performance (Dias)
                 </h4>
                 
                 {(!selectedDestination.history || selectedDestination.history.length === 0) ? (
                    <div className="text-sm text-muted-foreground italic text-center py-4 bg-white/5 rounded-xl">Sem histórico detalhado disponível para este destino.</div>
                 ) : (
                    <div className="flex flex-col gap-2">
                       {selectedDestination.history.map((h: any, idx: number) => {
                          const [y, m, d] = h.date.split('-');
                          const formattedDate = `${d}/${m}/${y}`;
                          
                          // Achar max e min
                          const maxQtd = Math.max(...selectedDestination.history.map((x:any) => x.qtd));
                          const minQtd = Math.min(...selectedDestination.history.map((x:any) => x.qtd));
                          
                          const isMax = h.qtd === maxQtd;
                          const isMin = h.qtd === minQtd;
                          
                          return (
                             <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                   <div className="font-mono font-bold text-sm text-white">{formattedDate}</div>
                                   <div className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                      {h.company}
                                   </div>
                                </div>
                                <div className="flex items-center gap-4">
                                   <div className="text-right">
                                      <div className="font-mono font-bold text-success text-sm">{formatCurrency(h.valor)}</div>
                                      <div className="text-[10px] text-muted-foreground">{h.qtd} passagens</div>
                                   </div>
                                   <div className="w-16 text-right flex flex-col items-end">
                                      {isMax && <span className="text-[9px] uppercase font-bold text-success bg-success/20 px-1.5 py-0.5 rounded flex items-center gap-1"><TrendingUp className="size-3" /> Pico</span>}
                                      {isMin && <span className="text-[9px] uppercase font-bold text-danger bg-danger/20 px-1.5 py-0.5 rounded flex items-center gap-1 mt-1"><TrendingDown className="size-3" /> Baixa</span>}
                                   </div>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 )}
              </div>
              
            </div>
            <div className="p-4 border-t border-border flex justify-end bg-black/20 rounded-b-3xl">
              <button 
                onClick={() => setSelectedDestination(null)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Insight Details Modal */}
      {insightModalData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-background border border-border rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-primary/10 text-primary rounded-xl"><Wand2 className="size-5" /></div>
                 <h3 className="text-xl font-bold leading-tight">{insightModalData.title}</h3>
              </div>
              <button onClick={() => setInsightModalData(null)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-white/5">
                 <X className="size-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
               <p className="text-muted-foreground text-sm leading-relaxed">{insightModalData.text}</p>
               
               {insightModalData.list && insightModalData.list.length > 0 && (
                  <div className="space-y-2 bg-black/30 border border-white/5 p-4 rounded-2xl">
                     {insightModalData.list.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 last:pb-0">
                           <span className="text-sm font-medium text-foreground">{item.label}</span>
                           <span className="text-sm font-bold font-mono text-primary">{item.value}</span>
                        </div>
                     ))}
                  </div>
               )}
            </div>
            
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-black/20 rounded-b-3xl">
              <button onClick={() => setInsightModalData(null)} className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg transition-all text-sm">Ciente, Fechar</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
