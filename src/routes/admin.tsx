import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useSellersRealtime, type DbSeller } from "@/hooks/use-sellers-realtime";
import { useSellerGoalsRealtime } from "@/hooks/use-seller-goals-realtime";
import { useShiftsRealtime } from "@/hooks/use-shifts-realtime";
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { usePackagesRealtime } from "@/hooks/use-packages-realtime";
import { useExpensesRealtime } from "@/hooks/use-expenses-realtime";
import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";
import { EmployeeFormModal } from "@/components/EmployeeFormModal";
import { ShiftFormModal } from "@/components/ShiftFormModal";
import { ExpenseFormModal } from "@/components/ExpenseFormModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Calendar as CalendarIcon, Wallet, BarChart3, Plus, Edit2, Clock, CheckCircle2, AlertTriangle, Trash2, Activity, Wifi, WifiOff, AlertCircle, X, Download, Printer, Search, Coffee, ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, ComposedChart, Line, CartesianGrid, Legend, Area, AreaChart } from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DreDetailsModal } from "@/components/DreDetailsModal";
import { isWithinFinancialPeriod, getFinancialPeriod } from "@/lib/date-helpers";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Gestão RH · LifeOs" }],
  }),
  component: AdminPage,
});

type Tab = "colaboradores" | "escalas" | "folha" | "desempenho" | "despesas" | "dre";

function AdminPage() {
  const { role, permissions, onlineUsers } = useAuth();
  const canViewFinancial = role === "admin" || permissions.includes("view_financial_values");
  const canDelete = role === "admin" || permissions.includes("delete_records");

  const [activeTab, setActiveTab] = useState<Tab>("colaboradores");
  
  // Dados de colaboradores
  const { sellers: employees } = useSellersRealtime();
  const { goals: sellerGoals } = useSellerGoalsRealtime();
  const { expenses } = useExpensesRealtime();
  const { packages } = usePackagesRealtime();
  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<DbSeller | null>(null);

  // Escalas Modal
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [selectedEmpForShift, setSelectedEmpForShift] = useState<DbSeller | null>(null);
  const [selectedDateForShift, setSelectedDateForShift] = useState("");
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isRemuneracaoOpen, setIsRemuneracaoOpen] = useState(false);
  const [escalaViewMode, setEscalaViewMode] = useState<"detailed" | "print">("detailed");

  // Dados de Vendas para Folha e Desempenho
  const { sales } = useSalesRealtime();
  const { closings } = useCashClosingsRealtime();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dreDetailsOpen, setDreDetailsOpen] = useState(false);

  // Escalas: Vamos pegar da semana atual (Simplificado para o UI)
  const period = getFinancialPeriod(currentMonth);
  const calendarStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const calendarEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  const fetchStart = new Date(Math.min(period.startDate.getTime(), calendarStart.getTime()));
  const fetchEnd = new Date(Math.max(period.endDate.getTime(), calendarEnd.getTime()));

  const { shifts } = useShiftsRealtime(
    `${fetchStart.getFullYear()}-${String(fetchStart.getMonth() + 1).padStart(2, "0")}-${String(fetchStart.getDate()).padStart(2, "0")}`, 
    `${fetchEnd.getFullYear()}-${String(fetchEnd.getMonth() + 1).padStart(2, "0")}-${String(fetchEnd.getDate()).padStart(2, "0")}`
  );

  // Cálculos da Folha de Pagamento
  const payroll = useMemo(() => {
    return employees.map(emp => {
      // Vendas do colaborador no mês atual
      const empSales = sales.filter(s => s.seller_id === emp.id);
      const totalVendido = empSales.reduce((acc, s) => acc + Number(s.amount), 0);
      const comissaoTotal = empSales.reduce((acc, s) => acc + Number(s.commission_amount), 0);
      
      // Múltiplas Metas
      const empGoals = sellerGoals.filter(g => g.seller_id === emp.id).sort((a, b) => b.target_amount - a.target_amount);
      
      let bateuMeta = false;
      let bonus = 0;
      let targetGoal = 0;
      
      for (const goal of empGoals) {
        if (totalVendido >= goal.target_amount) {
          bateuMeta = true;
          bonus = goal.bonus_amount;
          targetGoal = goal.target_amount;
          break; // O array está ordenado do maior para o menor
        }
      }
      
      // Trocas de turno (Swap fees)
      const empShifts = shifts.filter(sh => sh.seller_id === emp.id || sh.covered_by_id === emp.id);
      let saldoTrocas = 0;
      empShifts.forEach(sh => {
        if (sh.swap_type === 'time_off') return;
        
        if (sh.covered_by_id === emp.id) saldoTrocas += Number(sh.swap_fee); // Ganhou cobrindo
        if (sh.seller_id === emp.id && sh.covered_by_id) saldoTrocas -= Number(sh.swap_fee); // Pagou pra ser coberto
      });

      // Calcular salário com base no Regime Mensal (Base - Faltas)
      const monthShifts = shifts.filter(sh => 
        (sh.seller_id === emp.id || sh.covered_by_id === emp.id) && 
        isWithinFinancialPeriod(sh.shift_date, currentMonth)
      );
      
      let faltas = 0;
      monthShifts.forEach(sh => {
        if (sh.status === 'falta' && sh.seller_id === emp.id) {
          faltas++;
        }
      });
      
      const baseMensal = Number(emp.base_salary) || 0;
      const diaria = baseMensal / 30;
      const salarioDiarias = baseMensal - (faltas * diaria);

      const salarioFinal = salarioDiarias + comissaoTotal + bonus + saldoTrocas;

      return {
        ...emp,
        totalVendido,
        comissaoTotal,
        bateuMeta,
        bonus,
        targetGoal,
        saldoTrocas,
        salarioDiarias,
        salarioFinal
      };
    }).sort((a, b) => b.salarioFinal - a.salarioFinal);
  }, [employees, sales, shifts, sellerGoals]);

  const handleEdit = (emp: DbSeller) => {
    setEditingEmp(emp);
    setModalOpen(true);
  };

  const handleDeleteEmp = async (emp: DbSeller) => {
    if (confirm(`Tem certeza que deseja excluir o colaborador ${emp.name}? Esta ação não pode ser desfeita.`)) {
      toast.loading("Excluindo colaborador...", { id: "emp-delete" });
      try {
        const { error } = await supabase.from('sellers').delete().eq('id', emp.id);
        if (error) throw error;
        toast.success("Colaborador excluído com sucesso!", { id: "emp-delete" });
      } catch (err) {
        console.error("Erro ao excluir colaborador:", err);
        toast.error("Erro ao excluir colaborador. Verifique se existem vendas ou escalas vinculadas.", { id: "emp-delete" });
      }
    }
  };

  // Gráficos de Desempenho
  const performanceData = useMemo(() => {
    return employees.map(emp => {
      const empSales = sales.filter(s => s.seller_id === emp.id);
      const wp = empSales.filter(s => s.sales_channel === "WhatsApp").reduce((acc, s) => acc + Number(s.amount), 0);
      const balcao = empSales.filter(s => s.sales_channel === "Balcão").reduce((acc, s) => acc + Number(s.amount), 0);
      const total = wp + balcao;
      return {
        name: emp.name,
        wp,
        balcao,
        total,
        meta: emp.sales_goal
      };
    }).sort((a, b) => b.total - a.total);
  }, [employees, sales]);

  const PIE_COLORS = ["var(--accent)", "var(--primary)"];

  const formatCurrency = (val: number) => {
    if (!canViewFinancial) return "R$ ***";
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const isWithinCalendarMonth = (dateString: string, referenceDate: Date) => {
    if (!dateString) return false;
    const [year, month] = dateString.split('T')[0].split('-');
    return Number(year) === referenceDate.getFullYear() && Number(month) === referenceDate.getMonth() + 1;
  };

  // DRE Calculations
  const dreStats = useMemo(() => {
    // Filtrar pelo mês atual (currentMonth)
    const filteredSales = sales.filter(s => isWithinCalendarMonth(s.sale_date || s.created_at, currentMonth));
    const filteredPackages = packages.filter(p => isWithinCalendarMonth(p.created_at, currentMonth));
    const filteredExpenses = expenses.filter(e => isWithinCalendarMonth(e.expense_date || e.created_at, currentMonth));
    const filteredClosings = closings.filter(c => isWithinCalendarMonth(c.closing_date || c.created_at, currentMonth));

    // Receitas (Baseado no Fechamento de Caixa)
    let receitaFechamentos = 0;
    filteredClosings.forEach(closing => {
      const settlements = (closing.company_settlements as any[]) || [];
      settlements.forEach(s => {
        receitaFechamentos += Number(s.commission || 0);
      });
    });

    const receitaPassagensBruto = filteredSales.reduce((acc, s) => acc + Number(s.commission_amount), 0);
    const receitaEncomendasBruto = filteredPackages.reduce((acc, p) => acc + Number(p.commission), 0);

    const receitaTotal = receitaFechamentos;

    // Deduções e Impostos
    const impostoSimplesNacional = receitaTotal * 0.06; // 6% sobre a receita bruta
    const receitaLiquida = receitaTotal - impostoSimplesNacional;

    // Custos Variáveis
    const despesasVariaveisAvulsas = filteredExpenses.filter(e => e.category === 'variavel').reduce((acc, e) => acc + Number(e.amount), 0);
    const despesasVariaveisCaixa = filteredClosings.reduce((acc, c) => acc + Number(c.expenses || 0), 0);
    const custoVariavelTotal = despesasVariaveisAvulsas + despesasVariaveisCaixa;

    // Margem de Contribuição
    const margemContribuicao = receitaLiquida - custoVariavelTotal;

    // Custos Fixos
    const salarioBaseTotal = employees.reduce((acc, emp) => acc + Number(emp.base_salary), 0);
    const bonusMetasTotal = payroll.reduce((acc, emp) => acc + emp.bonus, 0); // Bônus pagos no mês
    const despesasFixas = filteredExpenses.filter(e => e.category === 'fixo').reduce((acc, e) => acc + Number(e.amount), 0);
    const custoFixoTotal = salarioBaseTotal + bonusMetasTotal + despesasFixas;

    // Lucro Líquido
    const lucroLiquido = margemContribuicao - custoFixoTotal;

    const margemContribuicaoPct = receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;
    const lucroLiquidoPct = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

    return {
      filteredSales,
      filteredPackages,
      filteredExpenses,
      filteredClosings,
      receitaFechamentos,
      receitaPassagensBruto,
      receitaEncomendasBruto,
      receitaTotal,
      impostoSimplesNacional,
      receitaLiquida,
      despesasVariaveisAvulsas,
      despesasVariaveisCaixa,
      custoVariavelTotal,
      margemContribuicao,
      margemContribuicaoPct,
      salarioBaseTotal,
      bonusMetasTotal,
      despesasFixas,
      custoFixoTotal,
      lucroLiquido,
      lucroLiquidoPct
    };
  }, [sales, packages, expenses, closings, employees, payroll, currentMonth]);

  const projectionData = useMemo(() => {
    const data = [];
    let currentReceita = dreStats.receitaTotal || 1000; // Base mínima caso esteja zerado
    let currentCustoVariavel = dreStats.custoVariavelTotal || 300;
    let currentCustoFixo = dreStats.custoFixoTotal || 500;

    // Taxa de crescimento projetada: 3% ao mês
    const taxaCrescimento = 1.03;

    for (let i = 1; i <= 6; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
      
      currentReceita *= taxaCrescimento;
      currentCustoVariavel *= taxaCrescimento; // Custos variáveis crescem com a receita
      
      const lucro = currentReceita - currentCustoVariavel - currentCustoFixo;
      
      data.push({
        month: monthName,
        receitas: currentReceita,
        custos: currentCustoVariavel + currentCustoFixo,
        lucro: lucro,
        lucroPct: (lucro / currentReceita) * 100
      });
    }
    return data;
  }, [dreStats, currentMonth]);


  const getCalendarDaysArray = () => {
    const days = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };
  const monthDays = getCalendarDaysArray();

  const handleShiftClick = (emp: DbSeller, dateStr: string, shift: any) => {
    if (isSelectionMode) {
      const cellId = `${emp.id}|${dateStr}`;
      const next = new Set(selectedCells);
      if (next.has(cellId)) {
        next.delete(cellId);
      } else {
        next.add(cellId);
      }
      setSelectedCells(next);
    } else {
      setSelectedEmpForShift(emp);
      setSelectedDateForShift(dateStr);
      setSelectedShift(shift || null);
      setShiftModalOpen(true);
    }
  };

  const handleExportFolhaCSV = () => {
    const monthFormatted = `${String(currentMonth.getMonth()+1).padStart(2, '0')}/${currentMonth.getFullYear()}`;
    let csv = "FECHAMENTO DE FOLHA DE PAGAMENTO - LIFEOS FLOW\n";
    csv += `Mês de Referência:;${monthFormatted}\n\n`;
    csv += "Colaborador;Diárias (Escala);Comissões;Bônus Meta;Trocas (Acerto);Total a Receber\n";

    payroll.forEach(emp => {
      const numToString = (num: number) => num.toFixed(2).replace('.', ',');
      csv += `${emp.name};"${numToString(emp.salarioDiarias)}";"${numToString(emp.comissaoTotal)}";"${numToString(emp.bateuMeta ? emp.bonus : 0)}";"${numToString(emp.saldoTrocas)}";"${numToString(emp.salarioFinal)}"\n`;
    });

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2, '0')}`;
    link.setAttribute("download", `resumo_folha_pagamento_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportEscalaCSV = () => {
    const monthFormatted = `${String(currentMonth.getMonth()+1).padStart(2, '0')}/${currentMonth.getFullYear()}`;
    let csv = "PREVISÃO DE REMUNERAÇÃO DA ESCALA - LIFEOS FLOW\n";
    csv += `Mês de Referência:;${monthFormatted}\n\n`;
    csv += "Colaborador;Dias Inteiros;Meios Dias;Soma (Diárias);Valor Diária;Valor Meia;Total a Receber\n";

    employees.forEach(emp => {
      const empShifts = shifts.filter(s => 
        (s.seller_id === emp.id || s.covered_by_id === emp.id) && 
        isWithinCalendarMonth(s.shift_date, currentMonth)
      );
      let completas = 0;
      let meias = 0;
      
      empShifts.forEach(s => {
        const didIWork = (s.seller_id === emp.id && !s.covered_by_id) || (s.covered_by_id === emp.id);
        if (didIWork) {
          if (s.shift_type === 'completa') completas++;
          else if (s.shift_type === 'manha' || s.shift_type === 'tarde') meias++;
        }
      });
      
      const diaria = Number(emp.base_salary) / 30;
      const meia = diaria / 2;
      const somaDiarias = completas + (meias / 2);
      const previsao = (completas * diaria) + (meias * meia);
      
      if (completas === 0 && meias === 0 && previsao === 0) return;
      
      const numToString = (num: number) => num.toFixed(2).replace('.', ',');
      
      csv += `${emp.name};${completas};${meias};${somaDiarias.toFixed(1).replace('.', ',')};"${numToString(diaria)}";"${numToString(meia)}";"${numToString(previsao)}"\n`;
    });

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2, '0')}`;
    link.setAttribute("download", `resumo_escala_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGridCSV = () => {
    const monthFormatted = `${String(currentMonth.getMonth()+1).padStart(2, '0')}/${currentMonth.getFullYear()}`;
    let csv = "CRONOGRAMA DE ESCALAS COMPLETO - LIFEOS FLOW\n";
    csv += `Mês de Referência:;${monthFormatted}\n\n`;
    
    csv += "Colaborador;";
    // Header
    monthDays.forEach(day => {
      const diaSemana = day.toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', '').toUpperCase();
      csv += `${String(day.getDate()).padStart(2, '0')} (${diaSemana});`;
    });
    csv += "Total Horas\n";

    employees.forEach(emp => {
      let row = `${emp.name};`;
      let totalHours = 0;

      monthDays.forEach(day => {
        const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
        const shift = shifts.find(s => s.seller_id === emp.id && s.shift_date === dateStr);
        
        let val = "-";
        if (shift) {
          if (shift.status === 'falta') {
            val = "Falta";
          } else if (shift.shift_type === 'folga') {
            val = "Folga";
          } else {
            // Check if there are explicit times, otherwise use default times
            if (shift.start_time && shift.end_time) {
              val = `${shift.start_time}-${shift.end_time}`;
            } else if (shift.shift_type === 'completa') {
              val = "06-19h";
            } else if (shift.shift_type === 'manha') {
              val = "06-13h";
            } else if (shift.shift_type === 'tarde') {
              val = "13-19h";
            }
            
            if (shift.shift_type === 'completa') totalHours += 13;
            else if (shift.shift_type === 'manha') totalHours += 7;
            else if (shift.shift_type === 'tarde') totalHours += 6;
          }
        }
        row += `"${val}";`;
      });
      
      row += `${totalHours}h\n`;
      csv += row;
    });

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2, '0')}`;
    link.setAttribute("download", `cronograma_completo_escala_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditSingleSelected = () => {
    if (selectedCells.size !== 1) return;
    const [empId, dateStr] = Array.from(selectedCells)[0].split("|");
    const emp = employees.find(e => e.id === empId);
    const shift = shifts.find(s => s.seller_id === empId && s.shift_date === dateStr);
    
    if (emp) {
      setSelectedEmpForShift(emp);
      setSelectedDateForShift(dateStr);
      setSelectedShift(shift || null);
      setShiftModalOpen(true);
    }
  };

  const handleBulkUpdate = async (type: "completa" | "manha" | "tarde" | "folga", status: "agendado" | "realizado" | "falta") => {
    if (selectedCells.size === 0) return;
    toast.loading(`Aplicando turno...`, { id: 'bulk-shift' });
    try {
      const updates: any[] = [];
      Array.from(selectedCells).forEach(cellId => {
        const [seller_id, shift_date] = cellId.split('|');
        
        updates.push({
          seller_id,
          shift_date,
          shift_type: type,
          status,
          swap_requested: false,
          covered_by_id: null,
          swap_type: null,
          swap_fee: 0
        });
      });

      const { error } = await supabase.from('shifts').upsert(updates, { onConflict: 'seller_id,shift_date' });
      if (error) throw error;
      
      toast.success("Escalas atualizadas com sucesso!", { id: 'bulk-shift' });
      setSelectedCells(new Set());
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao aplicar escalas.", { id: 'bulk-shift' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCells.size === 0) return;
    toast.loading("Limpando escalas...", { id: 'bulk-delete' });
    try {
      const idsToDelete: string[] = [];
      Array.from(selectedCells).forEach(cellId => {
        const [seller_id, shift_date] = cellId.split('|');
        const existing = shifts.find(s => s.seller_id === seller_id && s.shift_date === shift_date);
        if (existing) idsToDelete.push(existing.id);
      });
      
      if (idsToDelete.length > 0) {
        const { error } = await supabase.from('shifts').delete().in('id', idsToDelete);
        if (error) throw error;
      }
      
      toast.success("Escalas removidas!", { id: 'bulk-delete' });
      setSelectedCells(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Erro ao limpar.", { id: 'bulk-delete' });
    }
  };

  return (
    <>
      <style type="text/css" media="print">
        {`@page { size: landscape; margin: 10mm; }`}
      </style>
      <TopBar
        title="Gestão de Recursos Humanos"
        subtitle="Administração de colaboradores, escalas, folhas de pagamento e metas."
        actions={
          activeTab === "colaboradores" ? (
            <button
              onClick={() => {
                setEditingEmp(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all shadow-sm shadow-primary/20"
            >
              <Plus className="size-4" /> Novo Colaborador
            </button>
          ) : activeTab === "despesas" ? (
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-danger-foreground hover:opacity-90 transition-all shadow-sm shadow-danger/20"
            >
              <Plus className="size-4" /> Nova Despesa
            </button>
          ) : null
        }
      />

      <main className="px-4 md:px-8 py-6 md:py-8 space-y-6">
        
        {/* Painel de Presença vs Escala (Apenas visível se for admin ou se houver permissão) */}
        {(role === 'admin' || permissions.includes('view_admin')) && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Activity className="size-5 text-primary" /> Monitor de Atividade em Tempo Real
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {employees.map(emp => {
                const isOnline = onlineUsers.includes(emp.id);
                const todayStr = new Date().toISOString().split("T")[0];
                const shiftToday = shifts.find(s => s.seller_id === emp.id && s.shift_date === todayStr);
                
                const hasShift = shiftToday && shiftToday.shift_type !== 'folga';
                
                let statusColor = "bg-muted border-border text-muted-foreground";
                let statusIcon = <WifiOff className="size-4" />;
                let statusText = "Offline";
                let badge = null;

                if (isOnline && hasShift) {
                  statusColor = "bg-success/10 border-success/30 text-success";
                  statusIcon = <Wifi className="size-4" />;
                  statusText = "Em Turno";
                } else if (isOnline && !hasShift) {
                  statusColor = "bg-warning/10 border-warning/30 text-warning";
                  statusIcon = <Wifi className="size-4" />;
                  statusText = "Online (Folga/Fora de hora)";
                  badge = <AlertCircle className="size-3 ml-auto" />;
                } else if (!isOnline && hasShift) {
                  statusColor = "bg-danger/10 border-danger/30 text-danger";
                  statusIcon = <WifiOff className="size-4" />;
                  statusText = "Faltante / Atrasado";
                  badge = <AlertTriangle className="size-3 ml-auto" />;
                } else {
                  // Offline and no shift
                  statusText = "Descanso";
                }

                return (
                  <div key={emp.id} className={cn("flex items-center gap-3 p-3 rounded-xl border", statusColor)}>
                    <div className="p-2 rounded-full bg-background/50 backdrop-blur-sm">
                      {statusIcon}
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-bold text-sm truncate">{emp.name}</span>
                      <span className="text-xs font-medium opacity-80">{statusText}</span>
                    </div>
                    {badge}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navegação de Abas */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-card border border-border p-1 w-full sm:w-max">
          <button
            onClick={() => setActiveTab("colaboradores")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "colaboradores" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            <Users className="size-4" /> Colaboradores
          </button>
          <button
            onClick={() => setActiveTab("escalas")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "escalas" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            <CalendarIcon className="size-4" /> Escalas
          </button>
          <button
            onClick={() => setActiveTab("folha")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "folha" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            <Wallet className="size-4" /> Folha de Pagamento
          </button>
          <button
            onClick={() => setActiveTab("desempenho")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "desempenho" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            <BarChart3 className="size-4" /> Desempenho
          </button>
          <div className="w-px h-8 bg-border mx-2"></div>
          <button
            onClick={() => setActiveTab("despesas")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "despesas" ? "bg-danger text-danger-foreground shadow-sm" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveTab("dre")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "dre" ? "bg-success text-success-foreground shadow-sm" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            DRE Financeiro
          </button>
        </div>

        {/* Tab: Colaboradores */}
        {activeTab === "colaboradores" && (
          <div className="rounded-xl border border-border bg-card/50 overflow-x-auto backdrop-blur-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/20 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-semibold">Nome / Cargo</th>
                  <th className="px-6 py-3 font-semibold text-center">Salário Fixo Mensal</th>
                  <th className="px-6 py-3 font-semibold text-center">Meta Individual</th>
                  <th className="px-6 py-3 font-semibold text-center">Bônus</th>
                  <th className="px-6 py-3 font-semibold text-center">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.role}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">{formatCurrency(emp.base_salary)}</td>
                    <td className="px-6 py-4 text-center font-mono text-primary">{formatCurrency(emp.sales_goal)}</td>
                    <td className="px-6 py-4 text-center font-mono text-success">{formatCurrency(emp.bonus_amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", emp.active ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                        {emp.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(emp)} className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10">
                          <Edit2 className="size-4" />
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDeleteEmp(emp)} className="p-2 text-muted-foreground hover:text-danger transition-colors rounded-lg hover:bg-danger/10">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Nenhum colaborador cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Folha de Pagamento */}
        {activeTab === "folha" && (
          <div className="rounded-xl border border-border bg-card/50 overflow-x-auto backdrop-blur-sm">
            <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-primary flex items-center gap-2"><Wallet className="size-4" /> Fechamento do Mês Atual</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Soma inteligente de salários, atingimento de metas, comissões e acertos de troca de turno.</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button onClick={handlePrintPDF} className="flex items-center gap-2 px-3 py-1.5 bg-card text-muted-foreground hover:bg-white/5 border border-border rounded-lg text-sm font-medium transition-colors">
                  <Printer className="size-4" /> Imprimir PDF
                </button>
                <button onClick={handleExportFolhaCSV} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-sm font-medium transition-colors">
                  <Download className="size-4" /> Exportar CSV
                </button>
              </div>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/20 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-semibold">Colaborador</th>
                  <th className="px-6 py-3 font-semibold text-center">Diárias (Escala)</th>
                  <th className="px-6 py-3 font-semibold text-center">Comissões</th>
                  <th className="px-6 py-3 font-semibold text-center">Bônus Meta</th>
                  <th className="px-6 py-3 font-semibold text-center">Trocas (Acerto)</th>
                  <th className="px-6 py-3 font-semibold text-right text-primary">A Receber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {payroll.map(emp => (
                  <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-semibold">{emp.name}</td>
                    <td className="px-6 py-4 text-center font-mono">
                       <div className="font-bold">{formatCurrency(emp.salarioDiarias)}</div>
                       <div className="text-[10px] text-muted-foreground">Base: {formatCurrency(emp.base_salary)}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">{formatCurrency(emp.comissaoTotal)}</td>
                    <td className="px-6 py-4 text-center font-mono">
                      {emp.bateuMeta ? (
                        <span className="text-success font-bold">+{formatCurrency(emp.bonus)}</span>
                      ) : (
                        <span className="text-muted-foreground">R$ 0,00</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      {emp.saldoTrocas > 0 ? (
                        <span className="text-success">+{formatCurrency(emp.saldoTrocas)}</span>
                      ) : emp.saldoTrocas < 0 ? (
                        <span className="text-danger">{formatCurrency(emp.saldoTrocas)}</span>
                      ) : (
                        <span className="text-muted-foreground">R$ 0,00</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-lg text-primary">
                      {formatCurrency(emp.salarioFinal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Escalas */}
        {activeTab === "escalas" && (
          <div className="rounded-xl border border-border bg-card/50 overflow-hidden backdrop-blur-sm">
            <div className="p-4 border-b border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold capitalize">Escalas (Período: {period.startStr.split('-').reverse().join('/')} a {period.endStr.split('-').reverse().join('/')})</h3>
                <p className="text-xs text-muted-foreground">Controle de turnos diários e Carga Horária Mensal.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-card border border-border rounded-lg overflow-hidden mr-2">
                  <button onClick={() => setEscalaViewMode('detailed')} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", escalaViewMode === 'detailed' ? "bg-primary text-primary-foreground" : "hover:bg-white/5")}>Detalhada</button>
                  <button onClick={() => setEscalaViewMode('print')} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", escalaViewMode === 'print' ? "bg-primary text-primary-foreground" : "hover:bg-white/5")}>Para Print</button>
                </div>
                {escalaViewMode === 'detailed' && (
                  <>
                    <button
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        if (isSelectionMode) setSelectedCells(new Set());
                      }}
                      className={cn("px-3 py-1.5 border rounded-lg text-sm transition-colors flex items-center gap-2", 
                        isSelectionMode ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-white/5"
                      )}
                    >
                      <CheckCircle2 className="size-4" />
                      <span className="hidden sm:inline">{isSelectionMode ? "Sair da Seleção" : "Seleção Múltipla"}</span>
                    </button>
                    <div className="w-px h-5 bg-border mx-1 hidden md:block"></div>
                    <button onClick={handleExportGridCSV} className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-sm font-medium transition-colors">
                      <Download className="size-4" /> <span className="hidden xl:inline">Exportar</span>
                    </button>
                  </>
                )}
                <div className="w-px h-5 bg-border mx-1 hidden md:block"></div>
                <button onClick={() => { setSelectedCells(new Set()); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); }} className="px-2 sm:px-3 py-1.5 bg-card border border-border rounded-lg text-sm hover:bg-white/5">&larr; <span className="hidden sm:inline">Ant.</span></button>
                <button onClick={() => { setSelectedCells(new Set()); setCurrentMonth(new Date()); }} className="px-2 sm:px-3 py-1.5 bg-card border border-border rounded-lg text-sm hover:bg-white/5">Atual</button>
                <button onClick={() => { setSelectedCells(new Set()); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); }} className="px-2 sm:px-3 py-1.5 bg-card border border-border rounded-lg text-sm hover:bg-white/5"><span className="hidden sm:inline">Próx.</span> &rarr;</button>
              </div>
            </div>
            
            {escalaViewMode === 'detailed' ? (
              <>
                {/* Action Bar Bulk Selection */}
                {selectedCells.size > 0 && (
                  <div className="bg-primary/10 border-b border-primary/20 p-3 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2">
                    <div className="text-sm font-semibold text-primary px-2">
                      {selectedCells.size} dia(s) selecionado(s)
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs text-muted-foreground mr-2">Aplicar:</div>
                      <button onClick={() => handleBulkUpdate("completa", "agendado")} className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded shadow-sm text-xs font-bold hover:bg-primary/30 transition-colors">Integral</button>
                      <button onClick={() => handleBulkUpdate("manha", "agendado")} className="px-3 py-1.5 bg-info/20 text-info border border-info/30 rounded shadow-sm text-xs font-bold hover:bg-info/30 transition-colors">Manhã</button>
                      <button onClick={() => handleBulkUpdate("tarde", "agendado")} className="px-3 py-1.5 bg-info/20 text-info border border-info/30 rounded shadow-sm text-xs font-bold hover:bg-info/30 transition-colors">Tarde</button>
                      <button onClick={() => handleBulkUpdate("folga", "agendado")} className="px-3 py-1.5 bg-muted/30 text-muted-foreground border border-border/50 rounded shadow-sm text-xs font-bold hover:bg-muted/50 transition-colors">Folga</button>
                      <button onClick={() => handleBulkUpdate("completa", "falta")} className="px-3 py-1.5 bg-danger/20 text-danger border border-danger/30 rounded shadow-sm text-xs font-bold hover:bg-danger/30 transition-colors">Falta</button>
                      <div className="w-px h-6 bg-primary/20 mx-1"></div>
                      {selectedCells.size === 1 && (
                        <button onClick={handleEditSingleSelected} className="px-3 py-1.5 bg-white/10 text-foreground border border-border rounded shadow-sm text-xs font-bold hover:bg-white/20 transition-colors">
                          <Edit2 className="size-3 inline mr-1" /> Detalhar (Trocas)
                        </button>
                      )}
                      <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded shadow-sm text-xs font-bold hover:bg-danger/20 transition-colors">Limpar</button>
                      <button onClick={() => setSelectedCells(new Set())} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded ml-2 transition-colors"><X className="size-4" /></button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto relative">
                  <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-left border-r border-border/50 sticky left-0 z-20 bg-muted/20">Colaborador</th>
                        {monthDays.map((day, i) => {
                          const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                          
                          // Filter shifts for this day that mean someone is working
                          const workersToday = shifts.filter(s => 
                            s.shift_date === dateStr && 
                            s.shift_type !== 'folga' && 
                            s.status !== 'falta'
                          );
                          
                          const hasManha = workersToday.some(s => s.shift_type === 'manha' || s.shift_type === 'completa');
                          const hasTarde = workersToday.some(s => s.shift_type === 'tarde' || s.shift_type === 'completa');
                          const hasCoverage = hasManha && hasTarde;
                          
                          let missingText = "";
                          if (!hasManha && !hasTarde) missingText = "Sem Ninguém!";
                          else if (!hasManha) missingText = "Falta Manhã";
                          else if (!hasTarde) missingText = "Falta Tarde";
                          
                          return (
                            <th key={i} title={missingText} className={cn("px-1 py-1 font-semibold min-w-[45px] max-w-[50px] border-r border-border/50 transition-colors relative", !hasCoverage && "bg-danger/20 shadow-inner")}>
                              <div className={cn("text-[9px] uppercase", !hasCoverage ? "text-danger font-bold" : "text-muted-foreground")}>{day.toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', '').substring(0,3)}</div>
                              <div className={cn("text-xs flex flex-col items-center justify-center", !hasCoverage && "text-danger font-bold")}>
                                {day.getDate()}
                                {!hasCoverage && (
                                  <AlertTriangle className="size-3 text-danger mt-1 animate-pulse" />
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {employees.map(emp => {
                        const empShifts = shifts.filter(s => 
                          (s.seller_id === emp.id || s.covered_by_id === emp.id) && 
                          isWithinCalendarMonth(s.shift_date, currentMonth)
                        );
                        
                        let totalHours = 0;
                        let folgasCount = 0;
                        let totalTrabalhados = 0;
                        empShifts.forEach(s => {
                          const didIWork = (s.seller_id === emp.id && !s.covered_by_id) || (s.covered_by_id === emp.id);
                          
                          if (s.shift_type === 'folga' && s.seller_id === emp.id) {
                            folgasCount++;
                          }

                          if (didIWork) {
                            if (s.shift_type === 'completa') {
                              totalHours += 13;
                              totalTrabalhados += 1;
                            } else if (s.shift_type === 'manha') {
                              totalHours += 7;
                              totalTrabalhados += 0.5;
                            } else if (s.shift_type === 'tarde') {
                              totalHours += 6;
                              totalTrabalhados += 0.5;
                            }
                          }
                        });
                        
                        const isVendedor = emp.role.toLowerCase().includes('vendedor');
                        const hasRedFlag = isVendedor && totalTrabalhados > 7;

                        return (
                        <tr key={emp.id}>
                          <td className="px-4 py-3 text-left font-semibold border-r border-border/50 bg-muted/5 min-w-[220px] sticky left-0 z-10">
                            <div className="flex flex-col">
                              <span>{emp.name}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground font-mono">{totalTrabalhados} dias / {totalHours}h</span>
                                {hasRedFlag && (
                                  <span className="text-[9px] bg-danger/20 text-danger px-1.5 py-0.5 rounded font-bold flex items-center gap-1" title="Vendedor não pode exceder 7 dias trabalhados por mês">
                                    <AlertTriangle className="size-3" /> Excedeu 7 Dias
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          {monthDays.map((day, i) => {
                            const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                            const shift = shifts.find(s => s.seller_id === emp.id && s.shift_date === dateStr);
                            
                            const cellId = `${emp.id}|${dateStr}`;
                            const isSelected = selectedCells.has(cellId);
                            
                            return (
                              <td 
                                key={i} 
                                onClick={() => handleShiftClick(emp, dateStr, shift)}
                                className={cn(
                                  "px-0.5 py-1 border-r border-border/50 cursor-pointer transition-colors relative group select-none",
                                  isSelected ? "bg-primary/20 ring-1 ring-inset ring-primary" : "hover:bg-white/[0.05]"
                                )}
                              >
                                {shift ? (
                                  <div className={cn(
                                    "rounded px-0.5 py-1 flex flex-col items-center justify-center text-[9px] font-bold border relative min-h-[36px] w-full",
                                    shift.status === "realizado" ? "bg-success/10 text-success border-success/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]" :
                                    shift.status === "falta" ? "bg-danger/10 text-danger border-danger/30" :
                                    shift.status === "trocado" ? "bg-warning/10 text-warning border-warning/30" :
                                    shift.shift_type === "completa" ? "bg-primary/10 text-primary border-primary/20" :
                                    shift.shift_type === "folga" ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.03)_4px,rgba(255,255,255,0.03)_8px)] text-muted-foreground/60 border-white/5 shadow-inner" :
                                    "bg-info/10 text-info border-info/20"
                                  )}>
                                    {shift.status === "realizado" && (
                                      <div className="absolute -top-1 -right-1 size-2 bg-success rounded-full border border-card"></div>
                                    )}
                                    {shift.status === "falta" ? (
                                      "FAL"
                                    ) : (
                                      <>
                                        {shift.shift_type === "completa" && "INT"}
                                        {shift.shift_type === "manha" && "MAN"}
                                        {shift.shift_type === "tarde" && "TAR"}
                                        {shift.shift_type === "folga" && (
                                          <div className="flex flex-col items-center">
                                            <Coffee className="size-3 mb-0.5 opacity-50" />
                                            <span>FLG</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    
                                    {shift.covered_by_name && (
                                      <div className="mt-0.5 text-[7px] bg-warning/20 text-warning px-0.5 rounded truncate max-w-full leading-tight">
                                        {shift.swap_type === 'time_off' ? 'Flg:' : 'Pg:'} <br/> {shift.covered_by_name.split(" ")[0].substring(0,4)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground/30 font-mono text-center text-xs">-</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legenda para Print da Equipe */}
                <div className="bg-background border-t border-border/50 p-4 flex flex-wrap gap-x-6 gap-y-3 items-center text-xs justify-center text-muted-foreground shadow-inner">
                  <span className="font-bold uppercase tracking-widest text-[10px] text-foreground mr-2">Legenda para a Equipe:</span>
                  <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-primary/20 border border-primary/30"></div> <b>INT</b> = Turno Integral (Dia Todo)</div>
                  <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-info/20 border border-info/30"></div> <b>MAN</b> = Turno da Manhã</div>
                  <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-info/20 border border-info/30"></div> <b>TAR</b> = Turno da Tarde</div>
                  <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)] border border-white/10 flex items-center justify-center"><Coffee className="size-2 text-muted-foreground opacity-50" /></div> <b>FLG</b> = Folga Programada</div>
                  <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-danger/20 border border-danger/30"></div> <b>FAL</b> = Falta</div>
                  <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-warning/20 border border-warning/30"></div> <b>Pg:</b> = Substituindo Alguém (Troca)</div>
                </div>
              </>
            ) : (
              <div className="bg-white text-black p-6 overflow-x-auto print-container rounded-b-xl select-all">
                <div className="text-center mb-6">
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-blue-600">
                    Escala de Trabalho - {currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                  </h2>
                  <p className="text-sm font-medium text-gray-500 mt-1">LifeOs</p>
                </div>
                
                <table className="w-full text-xs sm:text-sm text-center border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 font-black text-left border border-gray-300 text-gray-700 min-w-[120px]">Colaborador</th>
                      {monthDays.map((day, i) => {
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <th key={i} className={cn("p-1.5 border border-gray-300", isWeekend ? "bg-gray-200" : "")}>
                            <div className="text-[9px] uppercase font-bold text-gray-500">{day.toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', '').substring(0,3)}</div>
                            <div className="text-sm font-black text-gray-800">{day.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="p-2 text-left font-bold border border-gray-300 text-gray-800 whitespace-nowrap bg-gray-50/50">
                            {emp.name.split(" ")[0]} {emp.name.split(" ")[1]?.[0] ? `${emp.name.split(" ")[1][0]}.` : ""}
                          </td>
                          {monthDays.map((day, i) => {
                            const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                            const shift = shifts.find(s => s.seller_id === emp.id && s.shift_date === dateStr);
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            
                            let bg = isWeekend ? "bg-gray-100" : "bg-white";
                            let text = "";
                            let colorClass = "";
                            
                            if (shift) {
                              if (shift.status === "falta") { text = "FAL"; colorClass = "text-red-700 bg-red-100 font-bold border-red-200"; }
                              else if (shift.shift_type === "completa") { text = "INT"; colorClass = "text-blue-700 bg-blue-100 font-bold border-blue-200"; }
                              else if (shift.shift_type === "manha") { text = "MAN"; colorClass = "text-green-700 bg-green-100 font-bold border-green-200"; }
                              else if (shift.shift_type === "tarde") { text = "TAR"; colorClass = "text-orange-700 bg-orange-100 font-bold border-orange-200"; }
                              else if (shift.shift_type === "folga") { text = "FLG"; colorClass = "text-gray-500 bg-gray-200 border-gray-300"; }
                            }
                            
                            return (
                              <td key={i} className={cn("p-1 border border-gray-300", bg)}>
                                {shift && text ? (
                                  <div className={cn("rounded-md flex items-center justify-center text-[10px] md:text-xs h-6 md:h-7 min-w-[32px] mx-auto border", colorClass)}>
                                    {text}
                                  </div>
                                ) : (
                                  <div className="h-6 md:h-7 min-w-[32px] mx-auto text-gray-300 flex items-center justify-center">-</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs font-bold text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-1.5"><div className="size-4 rounded-md bg-blue-100 border border-blue-200 flex items-center justify-center text-[8px] text-blue-700">INT</div> Integral</div>
                  <div className="flex items-center gap-1.5"><div className="size-4 rounded-md bg-green-100 border border-green-200 flex items-center justify-center text-[8px] text-green-700">MAN</div> Manhã</div>
                  <div className="flex items-center gap-1.5"><div className="size-4 rounded-md bg-orange-100 border border-orange-200 flex items-center justify-center text-[8px] text-orange-700">TAR</div> Tarde</div>
                  <div className="flex items-center gap-1.5"><div className="size-4 rounded-md bg-gray-200 border border-gray-300 flex items-center justify-center text-[8px] text-gray-500">FLG</div> Folga</div>
                  <div className="flex items-center gap-1.5"><div className="size-4 rounded-md bg-red-100 border border-red-200 flex items-center justify-center text-[8px] text-red-700">FAL</div> Falta</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Escalas - Resumo (Apenas renderiza se a tab for Escalas) */}
        {activeTab === "escalas" && (
          <div className="rounded-xl border border-border bg-card/50 overflow-hidden backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <div 
              className="p-4 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => setIsRemuneracaoOpen(!isRemuneracaoOpen)}
            >
              <div>
                <h3 className="font-semibold text-primary flex items-center gap-2">
                  <Wallet className="size-4" /> Previsão de Remuneração da Escala Atual
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform duration-200", isRemuneracaoOpen ? "rotate-180" : "")} />
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Cálculo baseado no Regime Mensal: Salário Fixo - (Faltas * Diária) + Acertos de Trocas.</p>
              </div>
              {isRemuneracaoOpen && (
                <div className="flex items-center gap-2 print:hidden" onClick={(e) => e.stopPropagation()}>
                  <button onClick={handlePrintPDF} className="flex items-center gap-2 px-3 py-1.5 bg-card text-muted-foreground hover:bg-white/5 border border-border rounded-lg text-sm font-medium transition-colors">
                    <Printer className="size-4" /> Imprimir PDF
                  </button>
                  <button onClick={handleExportEscalaCSV} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-sm font-medium transition-colors">
                    <Download className="size-4" /> Exportar CSV
                  </button>
                </div>
              )}
            </div>
            
            {isRemuneracaoOpen && (
              <div className="overflow-x-auto animate-in slide-in-from-top-2 fade-in duration-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/20 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Colaborador</th>
                    <th className="px-6 py-3 font-semibold text-center">Dias Trabalhados</th>
                    <th className="px-6 py-3 font-semibold text-center">Folgas</th>
                    <th className="px-6 py-3 font-semibold text-center text-danger">Faltas</th>
                    <th className="px-6 py-3 font-semibold text-center">Acerto de Trocas</th>
                    <th className="px-6 py-3 font-semibold text-right text-success">Previsão (Mês Atual)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {employees.map(emp => {
                    const empShifts = shifts.filter(s => 
                      (s.seller_id === emp.id || s.covered_by_id === emp.id) && 
                      isWithinCalendarMonth(s.shift_date, currentMonth)
                    );
                    
                    let trabalhou = 0;
                    let folgas = 0;
                    let faltas = 0;
                    let trocas = 0;
                    
                    empShifts.forEach(s => {
                      if (s.status === 'falta' && s.seller_id === emp.id) {
                        faltas++;
                      } else {
                        if (s.shift_type === 'folga' && s.seller_id === emp.id) folgas++;
                        
                        const didIWork = (s.seller_id === emp.id && !s.covered_by_id) || (s.covered_by_id === emp.id);
                        if (didIWork && s.shift_type !== 'folga') trabalhou++;
                      }
                      
                      if (s.status === 'trocado' && s.covered_by_id && s.swap_fee) {
                        if (s.seller_id === emp.id) trocas -= Number(s.swap_fee);
                        if (s.covered_by_id === emp.id) trocas += Number(s.swap_fee);
                      }
                    });
                    
                    const baseMensal = Number(emp.base_salary) || 0;
                    const diaria = baseMensal / 30;
                    const previsao = baseMensal - (faltas * diaria) + trocas;
                    
                    if (empShifts.length === 0) return null;
                    
                    return (
                      <tr key={emp.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-semibold">{emp.name} <span className="block text-[10px] text-muted-foreground">Base: {formatCurrency(baseMensal)}</span></td>
                        <td className="px-6 py-4 text-center font-mono font-bold">{trabalhou}</td>
                        <td className="px-6 py-4 text-center font-mono">{folgas}</td>
                        <td className="px-6 py-4 text-center font-mono text-danger font-bold">{faltas > 0 ? `-${faltas} (${formatCurrency(faltas * diaria)})` : '0'}</td>
                        <td className="px-6 py-4 text-center font-mono text-warning font-bold">{trocas !== 0 ? (trocas > 0 ? `+${formatCurrency(trocas)}` : formatCurrency(trocas)) : '-'}</td>
                        <td className="px-6 py-4 text-right font-bold text-success font-mono text-lg">{formatCurrency(previsao)}</td>
                      </tr>
                    );
                  })}
                  {employees.every(emp => {
                    const empShifts = shifts.filter(s => s.seller_id === emp.id && isWithinCalendarMonth(s.shift_date, currentMonth));
                    return empShifts.filter(s => s.shift_type !== 'folga' && s.status !== 'falta').length === 0;
                  }) && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Nenhum dia de trabalho lançado na escala selecionada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Desempenho */}
        {activeTab === "desempenho" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm">
              <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 className="size-4 text-primary"/> Faturamento por Colaborador</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                    <RechartsTooltip formatter={(val: number) => formatCurrency(val)} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="total" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm overflow-y-auto max-h-[350px]">
              <h3 className="font-bold mb-4 flex items-center gap-2"><CheckCircle2 className="size-4 text-success"/> Acompanhamento de Metas</h3>
              <div className="space-y-4">
                {payroll.map(emp => {
                  const goal = emp.targetGoal || 1; // Prevent div by zero
                  const pct = emp.targetGoal > 0 ? Math.min((emp.totalVendido / goal) * 100, 100) : 0;
                  return (
                    <div key={emp.id} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{emp.name}</span>
                        <span className="font-mono text-xs">{formatCurrency(emp.totalVendido)} / {formatCurrency(emp.targetGoal || 0)}</span>
                      </div>
                      <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                        <div 
                          className={cn("h-full transition-all duration-1000", pct >= 100 ? "bg-success" : "bg-primary")} 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>{pct.toFixed(1)}% alcançado</span>
                        {pct >= 100 && <span className="text-success font-bold">Meta Batida! (+{formatCurrency(emp.bonus)})</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Despesas */}
        {activeTab === "despesas" && (
          <div className="rounded-xl border border-border bg-card/50 overflow-x-auto backdrop-blur-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/20 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-semibold">Descrição</th>
                  <th className="px-6 py-3 font-semibold text-center">Data</th>
                  <th className="px-6 py-3 font-semibold text-center">Categoria</th>
                  <th className="px-6 py-3 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-semibold">{exp.description}</td>
                    <td className="px-6 py-4 text-center">{new Date(exp.expense_date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium capitalize", exp.category === 'fixo' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning')}>
                        Custo {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-danger font-medium">-{formatCurrency(exp.amount)}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Nenhuma despesa lançada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: DRE */}
        {activeTab === "dre" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* DRE Column */}
              <div className="xl:col-span-2 rounded-xl border border-border bg-card/50 p-6 md:p-8 backdrop-blur-sm shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
                      <BarChart3 className="size-6" /> Demonstração do Resultado
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
                      <p className="text-muted-foreground text-sm">Visão financeira detalhada do mês atual</p>
                      <button onClick={() => setDreDetailsOpen(true)} className="inline-flex w-fit items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-lg text-xs font-semibold">
                        <Search className="size-3.5" /> Auditoria de Lançamentos
                      </button>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto bg-muted/20 sm:bg-transparent p-4 sm:p-0 rounded-xl sm:rounded-none mt-4 sm:mt-0">
                    <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Resultado (EBITDA)</div>
                    <div className={cn("text-3xl font-black font-mono", dreStats.lucroLiquido >= 0 ? "text-success" : "text-danger")}>
                      {formatCurrency(dreStats.lucroLiquido)}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Receitas */}
                  <div className="bg-background/80 rounded-xl border border-border p-5 hover:border-success/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                      <h3 className="font-semibold text-success text-lg flex items-center gap-2"><div className="w-1.5 h-5 bg-success rounded-full"></div> 1. Receitas Operacionais (Fechamento)</h3>
                      <span className="font-mono text-success text-xl sm:text-lg font-bold">{formatCurrency(dreStats.receitaTotal)}</span>
                    </div>
                    <div className="space-y-3 pl-0 sm:pl-4 text-sm text-muted-foreground">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center group gap-1">
                        <span className="group-hover:text-foreground transition-colors">Comissões Calculadas no Caixa</span> 
                        <span className="font-mono group-hover:text-foreground transition-colors">{formatCurrency(dreStats.receitaFechamentos)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center group pt-3 border-t border-border/50 gap-1">
                        <span className="text-xs opacity-70">Referência: Passagens (Bruto)</span> 
                        <span className="font-mono text-xs opacity-70">{formatCurrency(dreStats.receitaPassagensBruto)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center group gap-1">
                        <span className="text-xs opacity-70">Referência: Encomendas (Bruto)</span> 
                        <span className="font-mono text-xs opacity-70">{formatCurrency(dreStats.receitaEncomendasBruto)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deduções e Impostos */}
                  <div className="bg-background/80 rounded-xl border border-border p-5 hover:border-danger/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                      <h3 className="font-semibold text-danger/80 text-lg flex items-center gap-2"><div className="w-1.5 h-5 bg-danger/80 rounded-full"></div> 2. (-) Deduções e Impostos</h3>
                      <span className="font-mono text-danger/80 text-xl sm:text-lg font-bold">-{formatCurrency(dreStats.impostoSimplesNacional)}</span>
                    </div>
                    <div className="space-y-3 pl-0 sm:pl-4 text-sm text-muted-foreground">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center group gap-1">
                        <span className="group-hover:text-foreground transition-colors">Simples Nacional (6%)</span> 
                        <span className="font-mono text-danger group-hover:text-danger/80 transition-colors">-{formatCurrency(dreStats.impostoSimplesNacional)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Custos Variáveis */}
                  <div className="bg-background/80 rounded-xl border border-border p-5 hover:border-warning/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                      <h3 className="font-semibold text-warning text-lg flex items-center gap-2"><div className="w-1.5 h-5 bg-warning rounded-full"></div> 3. (-) Custos Variáveis</h3>
                      <span className="font-mono text-warning text-xl sm:text-lg font-bold">-{formatCurrency(dreStats.custoVariavelTotal)}</span>
                    </div>
                    <div className="space-y-3 pl-0 sm:pl-4 text-sm text-muted-foreground">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center group gap-1">
                        <span className="group-hover:text-foreground transition-colors">Despesas Diárias (Fechamento Caixa)</span> 
                        <span className="font-mono text-danger group-hover:text-danger/80 transition-colors">-{formatCurrency(dreStats.despesasVariaveisCaixa)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center group gap-1">
                        <span className="group-hover:text-foreground transition-colors">Despesas Variáveis (Lançamento Avulso)</span> 
                        <span className="font-mono text-danger group-hover:text-danger/80 transition-colors">-{formatCurrency(dreStats.despesasVariaveisAvulsas)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Margem de Contribuição */}
                  <div className="bg-primary/5 rounded-xl border border-primary/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-primary text-xl">4. (=) Margem de Contribuição</h3>
                      <p className="text-xs text-primary/70 mt-1">Lucro bruto após impostos e custos variáveis</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-primary text-3xl sm:text-2xl font-black">{formatCurrency(dreStats.margemContribuicao)}</div>
                      <div className="text-sm font-bold text-primary/80 mt-1 inline-block bg-primary/10 px-2 py-1 rounded-md">{dreStats.margemContribuicaoPct.toFixed(1)}% da Receita Líq.</div>
                    </div>
                  </div>

                  {/* Custos Fixos */}
                  <div className="bg-background/80 rounded-xl border border-border p-5 hover:border-danger/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                      <h3 className="font-semibold text-danger text-lg flex items-center gap-2"><div className="w-1.5 h-5 bg-danger rounded-full"></div> 5. (-) Custos Fixos e Operacionais</h3>
                      <span className="font-mono text-danger text-xl sm:text-lg font-bold">-{formatCurrency(dreStats.custoFixoTotal)}</span>
                    </div>
                    <div className="space-y-3 pl-0 sm:pl-4 text-sm text-muted-foreground">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center group gap-1">
                        <span className="group-hover:text-foreground transition-colors">Folha de Pagamento (Salários Base)</span> 
                        <span className="font-mono text-danger group-hover:text-danger/80 transition-colors">-{formatCurrency(dreStats.salarioBaseTotal)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center group gap-1">
                        <span className="group-hover:text-foreground transition-colors">Bônus e Metas Pagas</span> 
                        <span className="font-mono text-danger group-hover:text-danger/80 transition-colors">-{formatCurrency(dreStats.bonusMetasTotal)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center group gap-1">
                        <span className="group-hover:text-foreground transition-colors">Despesas Fixas Avulsas (Aluguel, etc)</span> 
                        <span className="font-mono text-danger group-hover:text-danger/80 transition-colors">-{formatCurrency(dreStats.despesasFixas)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lucro Líquido */}
                  <div className={cn("rounded-xl border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6", dreStats.lucroLiquido >= 0 ? "bg-success/10 border-success/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]" : "bg-danger/10 border-danger/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]")}>
                    <div>
                      <h3 className={cn("font-black text-2xl uppercase", dreStats.lucroLiquido >= 0 ? "text-success" : "text-danger")}>
                        6. (=) Resultado Líquido
                      </h3>
                      <div className="mt-2 inline-flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border">
                        <span className="text-sm text-muted-foreground font-medium">Margem da Operação:</span>
                        <span className={cn("font-bold text-base", dreStats.lucroLiquido >= 0 ? "text-success" : "text-danger")}>{dreStats.lucroLiquidoPct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className={cn("w-full md:w-auto text-left md:text-right p-4 md:p-0 rounded-xl md:rounded-none bg-background/50 md:bg-transparent border border-border md:border-none", dreStats.lucroLiquido >= 0 ? "text-success" : "text-danger")}>
                      <span className="font-mono text-4xl md:text-5xl font-black tracking-tight">
                        {formatCurrency(dreStats.lucroLiquido)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Projections */}
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm shadow-sm">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Activity className="size-5 text-primary"/> Projeção 6 Meses</h3>
                  <p className="text-xs text-muted-foreground mb-6">Crescimento estimado de 3% a.m. com custos variáveis proporcionais.</p>
                  
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={projectionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" fontSize={10} tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '8px' }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar yAxisId="left" dataKey="receitas" name="Receitas" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Line yAxisId="left" type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/50 overflow-hidden backdrop-blur-sm shadow-sm">
                  <div className="p-4 border-b border-border bg-muted/10">
                    <h3 className="font-semibold text-sm">Resumo da Projeção</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/20 border-b border-border">
                        <tr>
                          <th className="px-4 py-2 font-medium">Mês</th>
                          <th className="px-4 py-2 font-medium text-right">Receita Estimada</th>
                          <th className="px-4 py-2 font-medium text-right">Lucro Estimado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {projectionData.map((d, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3 font-medium">{d.month}</td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(d.receitas)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-success">{formatCurrency(d.lucro)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      <EmployeeFormModal 
        employee={editingEmp} 
        employeeGoals={editingEmp ? sellerGoals.filter(g => g.seller_id === editingEmp.id).sort((a,b) => a.target_amount - b.target_amount) : []}
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
      <ShiftFormModal 
        shift={selectedShift}
        employee={selectedEmpForShift}
        dateStr={selectedDateForShift}
        open={shiftModalOpen}
        onClose={() => { setShiftModalOpen(false); setSelectedShift(null); }}
      />
      <DreDetailsModal
        open={dreDetailsOpen}
        onClose={() => setDreDetailsOpen(false)}
        currentMonth={currentMonth}
        filteredSales={dreStats.filteredSales}
        filteredPackages={dreStats.filteredPackages}
        filteredExpenses={dreStats.filteredExpenses}
        payroll={payroll}
      />
      <ExpenseFormModal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} />
    </>
  );
}
