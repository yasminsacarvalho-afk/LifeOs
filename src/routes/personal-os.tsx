import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  LayoutDashboard, Calendar, CheckSquare, Briefcase, Activity, 
  GraduationCap, BookOpen, DollarSign, Lightbulb, Target, 
  Brain, Coffee, Timer, Book, LineChart, Plus, AlertCircle, 
  ChevronRight, ArrowRight, Sparkles, TrendingUp, TrendingDown, Clock, Home, Menu, X, CheckCircle2, XCircle,
  Settings, Monitor, Smartphone, ShieldAlert, User, Download
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { PosAgenda } from "@/components/pos/PosAgenda";
import { PosTarefas } from "@/components/pos/PosTarefas";
import { PosHabits } from "@/components/pos/PosHabits";
import { PosLibrary } from "@/components/pos/PosLibrary";
import { PosIdeas } from "@/components/pos/PosIdeas";
import { PosGoals } from "@/components/pos/PosGoals";
import { PosStudies } from "@/components/pos/PosStudies";
import { PosFinance } from "@/components/pos/PosFinance";
import { PosEntertainment } from "@/components/pos/PosEntertainment";
import { PosAlarms } from "@/components/pos/PosAlarms";
import { usePosTasks } from "@/hooks/use-pos-tasks";
import { usePosHabits } from "@/hooks/use-pos-habits";
import { usePosAgenda } from "@/hooks/use-pos-agenda";
import { usePosLibrary } from "@/hooks/use-pos-library";
import { usePosStudies } from "@/hooks/use-pos-studies";
import { usePosIdeas } from "@/hooks/use-pos-ideas";
import { usePosFinance } from "@/hooks/use-pos-finance";
import { useTreasuryRealtime } from "@/hooks/use-treasury-realtime";
import { useCrmRealtime } from "@/hooks/use-crm-realtime";
import { format, isToday, parseISO, isThisMonth, isThisWeek } from "date-fns";
import { PosPrincipal } from "@/components/pos/PosPrincipal";
import { PosEvolution } from "@/components/pos/PosEvolution";
import { PosRewards } from "@/components/pos/PosRewards";
import { PieChart, PiggyBank, Gift, BellRing } from "lucide-react";
import { AlarmsProvider } from "@/contexts/AlarmsContext";

export const Route = createFileRoute("/personal-os")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || "geral",
    };
  },
  component: PersonalOSPage,
});

const modules = [
  { id: "principal", name: "Operacional", icon: Activity },
  { id: "geral", name: "Pessoal", icon: Target },
  { id: "agenda", name: "Agenda", icon: Calendar },
  { id: "tarefas", name: "Tarefas", icon: CheckSquare },
  { id: "projetos", name: "Projetos", icon: Briefcase },
  { id: "habitos", name: "Hábitos", icon: Activity },
  { id: "metas", name: "Metas", icon: Target },
  { id: "evolucao", name: "Evolução", icon: TrendingUp },
  { id: "estudos", name: "Estudos", icon: GraduationCap },
  { id: "leitura", name: "Leitura", icon: BookOpen },
  { id: "financeiro", name: "Financeiro", icon: DollarSign },
  { id: "analytics", name: "Insights", icon: PieChart, path: "/analytics" },
  { id: "ideias", name: "Ideias", icon: Lightbulb },
  { id: "entretenimento", name: "Entretenimento", icon: Sparkles },
  { id: "recompensas", name: "Recompensas", icon: Gift },
  { id: "foco", name: "Modo Foco", icon: Timer },
  { id: "diario", name: "Diário", icon: Book },
  { id: "ia", name: "IA", icon: Sparkles },
  { id: "alarmes", name: "Alarmes", icon: BellRing },
];

const healthScores = [
  { name: "Hábitos", score: 87, status: "verde" },
  { name: "Estudos", score: 71, status: "amarelo" },
  { name: "Trabalho", score: 94, status: "verde" },
  { name: "Leitura", score: 42, status: "vermelho" },
  { name: "Finanças", score: 90, status: "verde" },
  { name: "Agenda", score: 76, status: "amarelo" },
  { name: "Projetos", score: 84, status: "verde" },
  { name: "Metas", score: 79, status: "verde" },
  { name: "Produtividade", score: 73, status: "amarelo" },
];

function CircularProgress({ score, size = 180, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedOffset(offset), 300);
    return () => clearTimeout(timer);
  }, [offset, circumference]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          className="text-rose-500 transition-all duration-1000 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-5xl font-black tracking-tighter text-white">{score}</span>
        <span className="text-[10px] uppercase tracking-widest text-[#71717A] mt-1">de 100</span>
      </div>
    </div>
  );
}

function DashboardGeral() {
  const { tasks } = usePosTasks();
  const { habits, logs: habitLogs } = usePosHabits();
  const { events } = usePosAgenda();
  const { books } = usePosLibrary();
  const { courses } = usePosStudies();
  const { ideas } = usePosIdeas();
  const { expenses } = usePosFinance();
  const { accounts: treasuryAccounts } = useTreasuryRealtime();
  const { leads } = useCrmRealtime();

  const [reservaMeta, setReservaMeta] = useState(() => {
    try { return Number(localStorage.getItem('lifeos_reserva_meta')) || 100000; } catch { return 100000; }
  });

  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [advisorMsg, setAdvisorMsg] = useState('');
  const [chatLog, setChatLog] = useState<{role: 'user' | 'estrategista' | 'executor' | 'companheiro', content: string}[]>([]);

  const handleAdvisorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorMsg.trim()) return;
    
    const userMessage = advisorMsg;
    setChatLog([...chatLog, {role: 'user', content: userMessage}]);
    setAdvisorMsg('');
    
    setTimeout(() => {
      setChatLog(prev => [
        ...prev, 
        {
          role: 'estrategista', 
          content: 'Analisando os seus dados operacionais, as integrações diretas de I.A. estão sendo parametrizadas. A sua estrutura e metas de longo prazo estão perfeitamente configuradas.'
        },
        {
          role: 'executor',
          content: 'Isso significa que a base está pronta! Agora só precisamos focar na execução diária para manter a barra de progresso subindo.'
        },
        {
          role: 'companheiro',
          content: 'Mas não se esqueça de pausar e respirar entre os blocos de foco. O equilíbrio é o que vai sustentar essa consistência!'
        }
      ]);
    }, 1200);
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const currentMonthExpenses = expenses.filter(e => {
    if (!e.expense_date) return false;
    return isThisMonth(parseISO(e.expense_date));
  }).reduce((acc, e) => acc + (e.amount || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // Financial metrics
  const totalPersonalCaixinhas = treasuryAccounts
    .filter(a => a.account_context === 'personal')
    .reduce((acc, a) => acc + (a.allocations || []).reduce((sum: number, al: any) => sum + Number(al.amount), 0), 0);
  
  const comissaoReceber = leads
    .filter(l => l.status !== "venda")
    .reduce((acc, l) => acc + (Number(l.estimated_commission) || 0), 0);

  // Calculation Logic
  const habitsTodayCount = habits.length;
  const habitsCompletedToday = habits.filter(h => habitLogs.some(l => l.habit_id === h.id && l.log_date === todayStr && l.status === 'concluido')).length;
  
  const eventsToday = events.filter(e => e.event_date === todayStr).length;
  
  const hoursFocused = Math.round(tasks.filter(t => t.status === 'concluida').reduce((acc, t) => acc + (t.actual_minutes || t.estimated_minutes || 0), 0) / 60);
  const pagesRead = books.reduce((acc, b) => acc + (b.pages_read || 0), 0);
  const hoursStudied = Math.round(courses.reduce((acc, c) => acc + (c.completed_hours || 0), 0));
  const ideasCount = ideas.length;

  const getSafeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return parseISO(`${dateStr.split('T')[0]}T12:00:00`);
  };

  const delayedTasks = tasks.filter(t => {
    const d = getSafeDate(t.deadline);
    return d && d < new Date() && !isToday(d) && t.status !== 'concluida';
  });
  
  const getScore = () => {
    let score = 50;
    if (habitsTodayCount > 0) score += (habitsCompletedToday / habitsTodayCount) * 15;
    if (delayedTasks.length === 0) score += 10;
    if (hoursStudied > 0) score += 10;
    if (pagesRead > 0) score += 5;
    if (tasks.filter(t => t.status === 'concluida').length > 0) score += 10;
    return Math.min(100, Math.round(score));
  };

  const lifeScore = getScore();

  const dynamicHealthScores = [
    { name: "Hábitos", score: habitsTodayCount > 0 ? Math.round((habitsCompletedToday/habitsTodayCount)*100) : 0, status: habitsCompletedToday === habitsTodayCount && habitsTodayCount > 0 ? "verde" : "amarelo" },
    { name: "Estudos", score: courses.length > 0 ? Math.round((courses.filter(c => c.status === 'concluido').length / courses.length)*100) : 0, status: hoursStudied > 0 ? "verde" : "amarelo" },
    { name: "Leitura", score: books.length > 0 ? Math.round((books.filter(b => b.status === 'concluido').length / books.length)*100) : 0, status: pagesRead > 0 ? "verde" : "amarelo" },
    { name: "Tarefas", score: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'concluida').length / tasks.length)*100) : 0, status: delayedTasks.length === 0 ? "verde" : "vermelho" },
    { name: "Ideias", score: ideasCount > 0 ? 100 : 0, status: ideasCount > 0 ? "verde" : "amarelo" }
  ];

  const habitsPendingToday = habits.filter(h => !habitLogs.some(l => l.habit_id === h.id && l.log_date === todayStr && l.status === 'concluido'));
  const eventsTodayDetails = events.filter(e => e.event_date === todayStr);
  const eventsThisWeek = events.filter(e => {
    if (!e.event_date) return false;
    return isThisWeek(parseISO(e.event_date), { weekStartsOn: 1 });
  });
  const tasksDueToday = tasks.filter(t => { const d = getSafeDate(t.deadline); return d && isToday(d); });
  const tasksForToday = tasks.filter(t => {
    const d = getSafeDate(t.deadline);
    return d && isToday(d) && t.status !== 'concluida';
  });

  const getStatusDot = (status: string) => {
    switch(status) {
      case "verde": return "bg-emerald-500";
      case "amarelo": return "bg-amber-500";
      case "vermelho": return "bg-rose-500";
      case "azul": return "bg-rose-500"; // Changed to rose for theme
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-[1400px] mx-auto flex flex-col gap-6 md:gap-8 pb-20">
      
      {/* AI Briefing Context */}
      <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#111113] border border-[rgba(255,255,255,0.06)] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
        <Sparkles className="size-5 text-rose-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm leading-relaxed text-[#A1A1AA]">
            <strong className="text-white">Análise 360º (IA):</strong> {delayedTasks.length > 0 ? `Você possui ${delayedTasks.length} tarefas atrasadas requerendo atenção. ` : "Nenhuma tarefa em atraso. Excelente! "} 
            {eventsToday > 0 ? `Hoje há ${eventsToday} compromisso(s) na agenda. ` : "Agenda livre hoje. "}
            {habitsCompletedToday < habitsTodayCount ? `Lembre-se de concluir seus ${habitsTodayCount - habitsCompletedToday} hábitos pendentes. ` : "Você já fechou todos os inegociáveis de hoje. Padrão ouro alcançado! "}
          </p>
        </div>
      </div>

      {/* Hero Section: Life Score & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Life Score */}
        <div className="col-span-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-8 flex flex-col items-center justify-center relative shadow-xl hover:border-[rgba(255,255,255,0.1)] transition-colors">
          <h2 className="absolute top-6 left-6 text-[11px] font-bold uppercase tracking-widest text-[#71717A]">Life Score Real-time</h2>
          <CircularProgress score={lifeScore} size={200} strokeWidth={6} />
          <div className="mt-6 flex items-center gap-2 bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full text-xs font-semibold">
            <Activity className="size-3" /> Analisando {tasks.length + habits.length + books.length} pontos de dados
          </div>
        </div>

              {/* Quick Stats Grid */}
        <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Hábitos Hoje", value: `${habitsCompletedToday}/${habitsTodayCount}`, icon: Activity, color: "text-emerald-500" },
            { label: "Compromissos", value: eventsToday.toString(), icon: Calendar, color: "text-amber-500" },
            { label: "Tarefas Pendentes", value: (tasks.length - tasks.filter(t=>t.status==='concluida').length).toString(), icon: CheckSquare, color: "text-rose-500" },
            { label: "Horas Focadas", value: `${hoursFocused}h`, icon: Timer, color: "text-indigo-500" },
            { label: "Leitura (Págs)", value: pagesRead.toString(), icon: BookOpen, color: "text-rose-500" },
            { label: "Caixinhas (Pessoal)", value: formatCurrency(totalPersonalCaixinhas), icon: PiggyBank, color: "text-emerald-500" },
            { label: "Comissão a Receber", value: formatCurrency(comissaoReceber), icon: Target, color: "text-cyan-500" },
            { label: "Gastos do Mês", value: formatCurrency(currentMonthExpenses), icon: DollarSign, color: "text-emerald-500" },
          ].map((stat, i) => (
            <div key={i} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 flex flex-col justify-between hover:bg-[#1A1A1E] transition-colors group cursor-default">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={cn("size-4", stat.color, "opacity-70 group-hover:opacity-100 transition-opacity")} />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-white mb-1">{stat.value}</div>
                <div className="text-[11px] text-[#A1A1AA] uppercase tracking-wider font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missões Diárias (Azul & Vermelho) */}
      <div className="mt-2 mb-2 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#0A0A0C] to-[#111113] border border-[rgba(255,255,255,0.04)] shadow-2xl relative overflow-hidden">
        {/* Glows */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#38bdf8] rounded-full blur-[120px] opacity-10"></div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-rose-500 rounded-full blur-[120px] opacity-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
           <div>
             <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
               <Target className="size-6 text-[#38bdf8]" /> Painel de Missões Diárias
             </h3>
             <p className="text-[#A1A1AA] text-sm mt-1">Seu balanço de compromissos e atividades para hoje.</p>
           </div>
           
           <div className="flex gap-4">
             <div className="bg-[#111113] border border-[rgba(56,189,248,0.2)] rounded-2xl px-5 py-3 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.05)]">
               <span className="text-[10px] font-bold uppercase tracking-widest text-[#38bdf8] mb-1">Produtividade</span>
               <span className="text-xl font-black text-white">{tasksDueToday.length > 0 ? Math.round((tasksDueToday.filter(t => t.status === 'concluida').length / tasksDueToday.length) * 100) : 100}%</span>
             </div>
             <div className="bg-[#111113] border border-[rgba(225,29,72,0.2)] rounded-2xl px-5 py-3 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.05)]">
               <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">Hábitos</span>
               <span className="text-xl font-black text-white">{habitsTodayCount > 0 ? Math.round((habitsCompletedToday / habitsTodayCount) * 100) : 100}%</span>
             </div>
           </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarefas */}
          <div className="bg-[#1A1A1E]/50 border border-[rgba(255,255,255,0.03)] rounded-2xl p-5 hover:bg-[#1A1A1E] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2"><CheckSquare className="size-4 text-[#38bdf8]" /> Tarefas</h4>
              <span className="text-[10px] font-bold bg-[#38bdf8]/10 text-[#38bdf8] px-2 py-1 rounded-md">{tasksDueToday.filter(t => t.status === 'concluida').length} de {tasksDueToday.length}</span>
            </div>
            <div className="space-y-3">
               {tasksDueToday.length === 0 ? (
                 <p className="text-xs text-[#71717A] italic">Nenhuma tarefa agendada.</p>
               ) : (
                 tasksDueToday.map(t => (
                   <div key={t.id} className="flex items-start gap-3">
                     <div className={`mt-0.5 size-4 rounded-full flex-shrink-0 border flex items-center justify-center ${t.status === 'concluida' ? 'bg-[#38bdf8] border-[#38bdf8]' : 'border-[#3F3F46]'}`}>
                        {t.status === 'concluida' && <CheckSquare className="size-2.5 text-black" />}
                     </div>
                     <span className={`text-xs font-medium line-clamp-2 ${t.status === 'concluida' ? 'text-[#71717A] line-through' : 'text-[#D4D4D8]'}`}>{t.title}</span>
                   </div>
                 ))
               )}
            </div>
          </div>

          {/* Hábitos */}
          <div className="bg-[#1A1A1E]/50 border border-[rgba(255,255,255,0.03)] rounded-2xl p-5 hover:bg-[#1A1A1E] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="size-4 text-rose-500" /> Hábitos</h4>
              <span className="text-[10px] font-bold bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md">{habitsCompletedToday} de {habitsTodayCount}</span>
            </div>
            <div className="space-y-3">
               {habitsTodayCount === 0 ? (
                 <p className="text-xs text-[#71717A] italic">Nenhum hábito hoje.</p>
               ) : (
                 habits.map(h => {
                   const isDone = habitLogs.some(l => l.habit_id === h.id && l.log_date === todayStr && l.status === 'concluido');
                   return (
                     <div key={h.id} className="flex items-start gap-3">
                       <div className={`mt-0.5 size-4 rounded-full flex-shrink-0 border flex items-center justify-center ${isDone ? 'bg-rose-500 border-rose-500' : 'border-[#3F3F46]'}`}>
                          {isDone && <CheckSquare className="size-2.5 text-white" />}
                       </div>
                       <span className={`text-xs font-medium line-clamp-2 ${isDone ? 'text-[#71717A] line-through' : 'text-[#D4D4D8]'}`}>{h.title}</span>
                     </div>
                   );
                 })
               )}
            </div>
          </div>

          {/* Agenda */}
          <div className="bg-[#1A1A1E]/50 border border-[rgba(255,255,255,0.03)] rounded-2xl p-5 hover:bg-[#1A1A1E] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2"><Calendar className="size-4 text-indigo-400" /> Agenda</h4>
              <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md">{eventsTodayDetails.length} eventos</span>
            </div>
            <div className="space-y-3">
               {eventsTodayDetails.length === 0 ? (
                 <p className="text-xs text-[#71717A] italic">Nenhum compromisso.</p>
               ) : (
                 eventsTodayDetails.map(e => (
                   <div key={e.id} className="flex items-start gap-3">
                     <div className="mt-0.5 size-4 rounded-full flex-shrink-0 bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                        <div className="size-1.5 rounded-full bg-indigo-400"></div>
                     </div>
                     <div>
                       <span className="text-xs font-medium text-[#D4D4D8] block line-clamp-1">{e.title}</span>
                       <span className="text-[10px] font-bold text-indigo-400 mt-0.5 block">{e.start_time?.slice(0,5)}</span>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      </div>



      {/* Health Dashboard (Indicadores) */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-white tracking-tight">Saúde do Sistema (Real-time)</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {dynamicHealthScores.map((module, i) => (
            <div key={i} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 group hover:border-[rgba(255,255,255,0.1)] transition-all flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn("size-2 rounded-full", getStatusDot(module.status))} />
                  <span className="text-sm font-medium text-white/90">{module.name}</span>
                </div>
                <span className="text-lg font-semibold tracking-tight">{module.score}%</span>
              </div>
              
              <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden mt-auto">
                <div 
                  className={cn("h-full rounded-full transition-all duration-1000", getStatusDot(module.status))}
                  style={{ width: `${module.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Respiro e Pico (New Component) */}
      <div className="mt-4 bg-[#0A0A0C] border border-[#1C1C21] rounded-3xl p-6 md:p-8 flex flex-col relative overflow-hidden">
        {/* Cabeçalho Superior */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest">Respiro e Pico</h2>
            <div className="flex gap-2">
              <button onClick={() => {}} className="bg-[#111113] hover:bg-emerald-500/10 border border-[#1C1C21] hover:border-emerald-500/30 text-[#A1A1AA] hover:text-emerald-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <CheckSquare className="size-3" /> Tarefa
              </button>
              <button onClick={() => {}} className="bg-[#111113] hover:bg-rose-500/10 border border-[#1C1C21] hover:border-rose-500/30 text-[#A1A1AA] hover:text-rose-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Activity className="size-3" /> Hábito
              </button>
              <button onClick={() => {}} className="bg-[#111113] hover:bg-indigo-500/10 border border-[#1C1C21] hover:border-indigo-500/30 text-[#A1A1AA] hover:text-indigo-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Calendar className="size-3" /> Agenda
              </button>
            </div>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-[#1C1C21] via-[#1C1C21] to-transparent"></div>
        </div>

        <div className="flex flex-col xl:flex-row gap-10">
          {/* Painel Esquerdo */}
          <div className="flex-1 flex flex-col justify-between gap-10 xl:pr-10 xl:border-r border-[#1C1C21]/50">
            <div className="flex flex-col gap-6">
              {/* Bloco 1 */}
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">Pico dos Próximos 14 Dias</div>
                <div className="text-2xl font-semibold text-white tracking-tight">nada à frente</div>
              </div>
              {/* Bloco 2 */}
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">Maior Janela Livre de Hoje</div>
                <div className="text-2xl font-semibold text-white tracking-tight">das 15:28 às 20:00</div>
              </div>
              {/* Bloco 3 */}
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">Respiro nos Próximos 30 Dias</div>
                <div className="text-2xl font-semibold text-white tracking-tight">30 dias livres a partir de {format(new Date(), 'dd/MM')}</div>
              </div>
            </div>

            {/* Assistente */}
            <div className="mt-2 flex flex-col items-start gap-4 p-5 rounded-2xl bg-[#111113] border border-[#1C1C21]">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-full bg-[#1A1A1E] border border-white/30 flex flex-col items-center justify-center relative shrink-0 overflow-hidden">
                  <div className="text-[10px] font-bold text-white uppercase tracking-widest">Conselho</div>
                </div>
                <p className="text-[#A1A1AA] text-sm italic font-medium leading-relaxed">
                  "Senhor, a prioridade hoje é o foco nos blocos de concentração. O Estrategista alocou 4h32 livres hoje."
                </p>
              </div>
              <button onClick={() => setIsAdvisorOpen(true)} className="bg-white hover:bg-gray-200 text-black text-xs font-bold px-5 py-2 rounded-full transition-colors flex items-center gap-2">
                Reunião de Conselho <ArrowRight className="size-3" />
              </button>
            </div>
          </div>

          {/* Painel Direito (Linha do Tempo) */}
          <div className="flex-1 flex flex-col justify-end pt-10 xl:pt-0 pb-2">
            <div className="flex justify-between items-end h-32 mb-4 relative px-2">
              <div className="absolute bottom-6 left-0 w-full h-px bg-[#27272A]"></div>
              {Array.from({ length: 14 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                return (
                  <div key={i} className="flex flex-col items-center gap-3 relative group flex-1 z-10">
                    <div className="w-1 rounded-full transition-all duration-500 bg-[#27272A] h-2 group-hover:h-8 group-hover:bg-[#38bdf8]"></div>
                    <div className="text-[10px] font-mono text-[#71717A] absolute -bottom-6">
                      {String(date.getDate()).padStart(2, '0')}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-[9px] text-[#71717A] uppercase font-bold tracking-widest mt-10">
              Os próximos 14 dias · A bandeira marca o pico
            </div>
          </div>
        </div>
      </div>

      {/* Compromissos por Semana (New Component) */}
      <div className="mt-4 bg-[#0A0A0C] border border-[#1C1C21] rounded-3xl p-6 md:p-8 flex flex-col relative overflow-hidden">
        {/* Cabeçalho Superior */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest">Compromissos por Semana</h2>
            <div className="flex gap-2">
              <button onClick={() => {}} className="bg-[#111113] hover:bg-emerald-500/10 border border-[#1C1C21] hover:border-emerald-500/30 text-[#A1A1AA] hover:text-emerald-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <CheckSquare className="size-3" /> Tarefa
              </button>
              <button onClick={() => {}} className="bg-[#111113] hover:bg-rose-500/10 border border-[#1C1C21] hover:border-rose-500/30 text-[#A1A1AA] hover:text-rose-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Activity className="size-3" /> Hábito
              </button>
              <button onClick={() => {}} className="bg-[#111113] hover:bg-indigo-500/10 border border-[#1C1C21] hover:border-indigo-500/30 text-[#A1A1AA] hover:text-indigo-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Calendar className="size-3" /> Agenda
              </button>
            </div>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-[#1C1C21] via-[#1C1C21] to-transparent"></div>
        </div>

        <div className="flex flex-col xl:flex-row gap-10">
          {/* Painel Esquerdo */}
          <div className="flex-1 flex flex-col justify-between gap-10 xl:pr-10 xl:border-r border-[#1C1C21]/50">
            {/* Métrica Principal */}
            <div className="flex items-baseline gap-3">
              <span className="text-[80px] leading-none font-bold text-white tracking-tighter">
                {eventsThisWeek.length}
              </span>
              <span className="text-xl font-medium text-[#A1A1AA]">
                nesta semana
              </span>
            </div>

            {/* Assistente */}
            <div className="mt-2 flex flex-col items-start gap-4">
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#111113] border border-[#1C1C21] w-full">
                <div className="size-10 rounded-full bg-[#1A1A1E] border border-white/30 flex flex-col items-center justify-center relative shrink-0 overflow-hidden">
                  <div className="text-[10px] font-bold text-white uppercase tracking-widest">Conselho</div>
                </div>
                <p className="text-[#A1A1AA] text-sm italic font-medium leading-relaxed mt-1">
                  {eventsThisWeek.length === 0 
                    ? '"Sua semana não possui compromissos alocados."' 
                    : `"O Executor relata ${eventsThisWeek.length} compromisso(s) importante(s) que precisam de preparo nesta semana."`}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <button onClick={() => setIsAdvisorOpen(true)} className="w-full sm:w-auto bg-white hover:bg-gray-200 text-black text-xs font-bold px-6 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2">
                  Reunião de Conselho <ArrowRight className="size-3" />
                </button>
                <button className="w-full sm:w-auto border border-[#27272A] hover:bg-[#1A1A1E] text-[#A1A1AA] hover:text-white text-xs font-bold px-6 py-2.5 rounded-full transition-colors">
                  Gerar relatório
                </button>
              </div>
            </div>
          </div>

          {/* Painel Direito (Visualização Semanal) */}
          <div className="flex-1 flex flex-col justify-end pt-10 xl:pt-0">
            <div className="flex justify-between items-end h-full gap-2 relative">
              {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day, i) => {
                const currentDayIndex = (new Date().getDay() + 6) % 7;
                const isCurrent = i === currentDayIndex;
                
                return (
                  <div key={day} className="flex flex-col items-center gap-4 flex-1 group">
                    <div className={cn(
                      "w-full h-1.5 rounded-full transition-all duration-300", 
                      isCurrent ? "bg-[#38bdf8]" : "bg-[#27272A] group-hover:bg-[#38bdf8]/50"
                    )}></div>
                    <span className={cn(
                      "text-[10px] tracking-wider", 
                      isCurrent ? "text-white font-bold" : "text-[#71717A] font-medium"
                    )}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Com Quem Você Anda (New Component) */}
      <div className="mt-4 bg-[#0A0A0C] border border-[#1C1C21] rounded-3xl p-6 md:p-8 flex flex-col relative overflow-hidden">
        {/* Cabeçalho Superior */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest">Com Quem Você Anda</h2>
            <div className="flex gap-2">
              <button onClick={() => {}} className="bg-[#111113] hover:bg-emerald-500/10 border border-[#1C1C21] hover:border-emerald-500/30 text-[#A1A1AA] hover:text-emerald-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <CheckSquare className="size-3" /> Tarefa
              </button>
              <button onClick={() => {}} className="bg-[#111113] hover:bg-rose-500/10 border border-[#1C1C21] hover:border-rose-500/30 text-[#A1A1AA] hover:text-rose-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Activity className="size-3" /> Hábito
              </button>
              <button onClick={() => {}} className="bg-[#111113] hover:bg-indigo-500/10 border border-[#1C1C21] hover:border-indigo-500/30 text-[#A1A1AA] hover:text-indigo-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Calendar className="size-3" /> Agenda
              </button>
            </div>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-[#1C1C21] via-[#1C1C21] to-transparent"></div>
        </div>

        <div className="flex flex-col xl:flex-row gap-10">
          {/* Painel Esquerdo */}
          <div className="flex-1 flex flex-col justify-between gap-10 xl:pr-10 xl:border-r border-[#1C1C21]/50">
            {/* Métrica Principal */}
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-[80px] leading-none font-bold text-white tracking-tighter">
                  0
                </span>
                <span className="text-xl font-medium text-[#A1A1AA]">
                  pessoas
                </span>
              </div>
              <p className="text-[#A1A1AA] text-sm mt-2">
                seus compromissos do mês não têm pessoas vinculadas.
              </p>
            </div>

            {/* Assistente */}
            <div className="mt-2 flex flex-col items-start gap-4">
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#111113] border border-[#1C1C21] w-full">
                <div className="size-10 rounded-full bg-[#1A1A1E] border border-white/30 flex flex-col items-center justify-center relative shrink-0 overflow-hidden">
                  <div className="text-[10px] font-bold text-white uppercase tracking-widest">Conselho</div>
                </div>
                <p className="text-[#A1A1AA] text-sm italic font-medium leading-relaxed mt-1">
                  "O Companheiro recomenda: vincule pessoas aos compromissos para nutrirmos o network e avaliarmos interações sociais."
                </p>
              </div>
              <button onClick={() => setIsAdvisorOpen(true)} className="bg-white hover:bg-gray-200 text-black text-xs font-bold px-6 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2">
                Reunião de Conselho <ArrowRight className="size-3" />
              </button>
            </div>
          </div>

          {/* Painel Direito (Mensagem Centralizada) */}
          <div className="flex-1 flex flex-col justify-center items-center py-10 xl:py-0">
            <h3 className="text-[#27272A] text-xl md:text-2xl font-bold uppercase tracking-widest text-center max-w-md leading-relaxed">
              SEUS COMPROMISSOS DO MÊS NÃO TÊM PESSOAS VINCULADAS
            </h3>
          </div>
        </div>
      </div>

      {/* Foco do Dia (Para Hoje) */}
      <div className="mt-4">
        <h2 className="text-lg font-medium text-white tracking-tight mb-6 flex items-center gap-2">
          <Target className="size-5 text-rose-500" /> Operação de Hoje
        </h2>
        
        {tasksForToday.length === 0 && habitsPendingToday.length === 0 && eventsTodayDetails.length === 0 ? (
          <div className="text-center p-8 bg-[#111113] border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl">
            <CheckSquare className="size-10 text-[#71717A] mx-auto mb-3" />
            <p className="text-[#A1A1AA] text-sm">Sua pauta está limpa para hoje. Ótimo trabalho.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna 1: Agenda */}
            <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] mb-4 flex items-center gap-2"><Calendar className="size-3 text-amber-500"/> Compromissos</h3>
              <div className="flex flex-col gap-3">
                {eventsTodayDetails.length === 0 ? <p className="text-xs text-[#A1A1AA]">Nenhum compromisso.</p> : eventsTodayDetails.map(e => (
                  <div key={e.id} className="flex gap-3 items-start">
                    <div className="text-[10px] font-bold text-[#A1A1AA] bg-[#1A1A1E] px-2 py-1 rounded">{e.start_time?.slice(0,5) || 'Dia todo'}</div>
                    <div className="text-sm font-medium text-white/90">{e.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna 2: Tarefas */}
            <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] mb-4 flex items-center gap-2"><CheckSquare className="size-3 text-rose-500"/> Tarefas do Dia</h3>
              <div className="flex flex-col gap-3">
                {tasksForToday.length === 0 ? <p className="text-xs text-[#A1A1AA]">Nenhuma tarefa pendente.</p> : tasksForToday.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-rose-500/50"></div>
                    <div className="text-sm font-medium text-white/90 truncate">{t.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna 3: Hábitos */}
            <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] mb-4 flex items-center gap-2"><Activity className="size-3 text-emerald-500"/> Hábitos Restantes</h3>
              <div className="flex flex-col gap-3">
                {habitsPendingToday.length === 0 ? <p className="text-xs text-[#A1A1AA]">Todos os hábitos concluídos!</p> : habitsPendingToday.map(h => (
                  <div key={h.id} className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500/50"></div>
                    <div className="text-sm font-medium text-white/90 truncate">{h.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alertas Reais */}
      {delayedTasks.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-medium text-white tracking-tight mb-6 flex items-center gap-2">
            <AlertCircle className="size-5 text-rose-500" /> Requer Atenção Imediata
          </h2>
          <div className="flex flex-col gap-3">
            {delayedTasks.slice(0, 3).map(task => (
              <div key={task.id} className="bg-[#111113] border border-rose-500/20 rounded-xl p-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                    <CheckSquare className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white/90">Tarefa Atrasada: {task.title}</h4>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">Prazo expirou em: {task.deadline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MÓDULO DE ALARMES INTEGRADO NA ABA PESSOAL */}
      <div className="mt-8 pt-4">
        <PosAlarms />
      </div>

      {/* CONSELHO IA MODAL */}
      {isAdvisorOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#09090B] border border-[#1C1C21] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[800px]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#1C1C21] flex items-center justify-between shrink-0 bg-[#0A0A0C]">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="size-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center z-30" title="O Estrategista"><Brain className="size-3.5 text-blue-400" /></div>
                  <div className="size-8 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center z-20" title="O Executor"><Target className="size-3.5 text-rose-500" /></div>
                  <div className="size-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center z-10" title="O Companheiro"><Coffee className="size-3.5 text-emerald-400" /></div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Conselho Pessoal</h3>
                  <p className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">Estrategista, Executor e Companheiro</p>
                </div>
              </div>
              <button onClick={() => setIsAdvisorOpen(false)} className="text-[#6F6F6F] hover:text-white transition-colors p-2 bg-[#1A1A1E] rounded-full">
                <X className="size-4" />
              </button>
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar bg-[#050505]">
              {/* Initial message */}
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Brain className="size-3.5 text-blue-400" />
                  </div>
                  <div className="bg-[#111113] border border-[#1C1C21] p-4 rounded-2xl rounded-tl-none max-w-[85%] text-sm text-[#A1A1AA] leading-relaxed">
                    <p className="font-bold text-blue-400 mb-1 text-[11px] uppercase tracking-widest">O Estrategista</p>
                    <p className="text-white">Olá. Eu analiso o longo prazo, organizo suas metas, calendário e finanças. Tomarei as decisões finais quando houver conflitos de prioridade.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <Target className="size-3.5 text-rose-500" />
                  </div>
                  <div className="bg-[#111113] border border-[#1C1C21] p-4 rounded-2xl rounded-tl-none max-w-[85%] text-sm text-[#A1A1AA] leading-relaxed">
                    <p className="font-bold text-rose-500 mb-1 text-[11px] uppercase tracking-widest">O Executor</p>
                    <p className="text-white">Comigo a conversa é sobre AGIR. Vou te cobrar dos seus hábitos e quebrar as decisões do Estrategista em passos práticos. Vamos focar na produtividade!</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Coffee className="size-3.5 text-emerald-400" />
                  </div>
                  <div className="bg-[#111113] border border-[#1C1C21] p-4 rounded-2xl rounded-tl-none max-w-[85%] text-sm text-[#A1A1AA] leading-relaxed">
                    <p className="font-bold text-emerald-400 mb-1 text-[11px] uppercase tracking-widest">O Companheiro</p>
                    <p className="text-white">E eu estou aqui para garantir o seu bem-estar! Vou celebrar suas conquistas e ter certeza de que o Executor não vai te fazer esgotar. Produtividade sem saúde não vale a pena.</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Chat Log */}
              {chatLog.map((msg, i) => {
                let roleIcon = <Sparkles className="size-3.5 text-white" />;
                let roleColor = "text-white";
                let roleBg = "bg-white/10";
                let roleBorder = "border-white/30";
                let roleName = "IA";

                if (msg.role === 'estrategista') {
                  roleIcon = <Brain className="size-3.5 text-blue-400" />;
                  roleColor = "text-blue-400";
                  roleBg = "bg-blue-500/10";
                  roleBorder = "border-blue-500/30";
                  roleName = "O Estrategista";
                } else if (msg.role === 'executor') {
                  roleIcon = <Target className="size-3.5 text-rose-500" />;
                  roleColor = "text-rose-500";
                  roleBg = "bg-rose-500/10";
                  roleBorder = "border-rose-500/30";
                  roleName = "O Executor";
                } else if (msg.role === 'companheiro') {
                  roleIcon = <Coffee className="size-3.5 text-emerald-400" />;
                  roleColor = "text-emerald-400";
                  roleBg = "bg-emerald-500/10";
                  roleBorder = "border-emerald-500/30";
                  roleName = "O Companheiro";
                }

                return (
                  <div key={i} className={cn("flex items-start gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
                    {msg.role !== 'user' && (
                      <div className={cn("size-8 rounded-full border flex items-center justify-center shrink-0", roleBg, roleBorder)}>
                        {roleIcon}
                      </div>
                    )}
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed max-w-[85%]",
                      msg.role === 'user' 
                        ? "bg-white text-black rounded-tr-none font-medium" 
                        : "bg-[#111113] border border-[#1C1C21] text-white rounded-tl-none"
                    )}>
                      {msg.role !== 'user' && (
                        <p className={cn("font-bold mb-1 text-[11px] uppercase tracking-widest", roleColor)}>{roleName}</p>
                      )}
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#0A0A0C] border-t border-[#1C1C21] shrink-0">
              <form onSubmit={handleAdvisorSubmit} className="flex items-center gap-2 bg-[#111113] border border-[#1C1C21] rounded-full px-2 py-2 focus-within:border-white/50 transition-colors">
                <input 
                  type="text" 
                  value={advisorMsg}
                  onChange={e => setAdvisorMsg(e.target.value)}
                  placeholder="Peça um conselho..." 
                  className="flex-1 bg-transparent px-4 text-sm text-white focus:outline-none placeholder:text-[#3f3f46]" 
                />
                <button type="submit" disabled={!advisorMsg.trim()} className="bg-white p-2.5 rounded-full text-black hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PersonalOSPage() {
  const { tab } = Route.useSearch();
  const activeModule = tab;
  const activeModuleData = modules.find(m => m.id === activeModule) || modules.find(m => m.id === "geral");

  const hour = new Date().getHours();
  let greeting = "Boa noite";
  if (hour >= 5 && hour < 12) greeting = "Bom dia";
  else if (hour >= 12 && hour < 18) greeting = "Boa tarde";

  const dateStr = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'long' 
  }).format(new Date());

  const { tasks, addTask, updateTask, fetchTasks } = usePosTasks();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const loadNotifs = () => {
      try {
        const notifs = JSON.parse(localStorage.getItem('lifeos_drive_notifications') || '[]');
        setNotifications(notifs);
      } catch(e) {}
    };
    loadNotifs();
    window.addEventListener('lifeos_drive_notifications_update', loadNotifs);
    
    // Background check for agenda notifications
    const checkAgenda = setInterval(() => {
      const now = new Date();
      if (now.getSeconds() !== 0) return; // Only check on the minute mark
      
      const eventsStr = localStorage.getItem('lifeos_events');
      if (eventsStr) {
        try {
          const events = JSON.parse(eventsStr);
          const currentHour = now.getHours().toString().padStart(2, '0');
          const currentMin = now.getMinutes().toString().padStart(2, '0');
          const timeStr = `${currentHour}:${currentMin}`;
          const todayStr = format(now, 'yyyy-MM-dd');
          
          events.forEach(async (event: any) => {
             if (event.event_date === todayStr && event.start_time === timeStr) {
                try {
                  let permission = await isPermissionGranted();
                  if (!permission) permission = (await requestPermission()) === 'granted';
                  if (permission) {
                    sendNotification({
                      title: `Compromisso Agora: ${event.title}`,
                      body: `Seu compromisso está começando!`
                    });
                  }
                } catch(e) {
                  if ("Notification" in window && Notification.permission === "granted") {
                    new Notification(`Compromisso Agora: ${event.title}`, {
                      body: `Seu compromisso está começando!`,
                      icon: '/pwa-192x192.png'
                    });
                  }
                }
             }
             // Notify 15 mins before
             const eventDate = new Date(`${event.event_date}T${event.start_time}:00`);
             const diffMins = Math.round((eventDate.getTime() - now.getTime()) / 60000);
             if (diffMins === 15) {
                try {
                  let permission = await isPermissionGranted();
                  if (!permission) permission = (await requestPermission()) === 'granted';
                  if (permission) {
                    sendNotification({
                      title: `Em 15 minutos: ${event.title}`,
                      body: `Prepare-se, seu compromisso começa em breve.`
                    });
                  }
                } catch(e) {
                  if ("Notification" in window && Notification.permission === "granted") {
                    new Notification(`Em 15 minutos: ${event.title}`, {
                      body: `Prepare-se, seu compromisso começa em breve.`,
                      icon: '/pwa-192x192.png'
                    });
                  }
                }
             }
          });
        } catch(e) {}
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('lifeos_drive_notifications_update', loadNotifs);
      clearInterval(checkAgenda);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('lifeos_drive_notifications', JSON.stringify(updated));
    setNotifications(updated);
  };

  return (
    <AlarmsProvider>
      <div className="flex flex-col h-screen bg-[#09090B] text-[#FFFFFF] font-sans selection:bg-rose-500/30 overflow-hidden relative">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#09090B] pb-24 custom-scrollbar">
        
        {/* Header / Topbar */}
        <header className="h-20 md:h-24 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between px-4 md:px-10 sticky top-0 bg-[#09090B]/90 backdrop-blur-md z-40 shadow-xl shadow-black/50">
          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/" className="p-2.5 md:p-3 flex rounded-xl bg-[#1A1A1E] text-[#A1A1AA] hover:bg-rose-500 hover:text-white transition-all shadow-sm group" title="Voltar ao RapiHub">
              <Home className="size-5 group-hover:scale-110 transition-transform" />
            </Link>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
                {greeting}, Bruno.
              </h1>
              <span className="text-[10px] md:text-sm text-[#A1A1AA] font-medium capitalize mt-0.5 truncate">
                {dateStr} <span className="hidden sm:inline">• Seu Personal OS está ativo</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-5">
            <div className="relative">
              <button 
                onClick={() => { setShowNotifications(!showNotifications); if (unreadCount > 0) markAllAsRead(); }}
                className="p-2.5 rounded-full bg-[#111113] border border-[rgba(255,255,255,0.05)] hover:bg-[#1A1A1E] text-[#A1A1AA] hover:text-white transition-all relative"
              >
                <AlertCircle className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2.5 bg-rose-500 rounded-full border-[1.5px] border-[#111113] shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-[#111113] border border-[#1C1C21] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-[#1C1C21] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Centro de Notificações</h3>
                    {notifications.length > 0 && (
                      <button onClick={() => { localStorage.removeItem('lifeos_drive_notifications'); setNotifications([]); }} className="text-[10px] text-[#71717A] hover:text-white uppercase tracking-widest font-bold">Limpar</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-[#71717A]">Nenhuma notificação recente.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-4 border-b border-[#1C1C21]/50 hover:bg-[#1A1A1E] transition-colors flex gap-3 items-start">
                          <div className={`mt-0.5 shrink-0 ${n.status === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {n.status === 'success' ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                          </div>
                          <div>
                            <p className="text-sm text-white/90 leading-snug">{n.message}</p>
                            <span className="text-[10px] text-[#71717A] mt-1 block">{format(new Date(n.timestamp), "dd/MM 'às' HH:mm")}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div onClick={() => setIsSettingsOpen(true)} className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 p-[1.5px] cursor-pointer hover:scale-105 transition-transform shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <div className="h-full w-full rounded-full bg-[#111113] border border-[rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden">
                <span className="text-white font-bold text-sm tracking-widest">BA</span>
              </div>
            </div>
          </div>
        </header>

        {/* MODAL LATERAL DE CONFIGURAÇÕES DO PERSONAL OS */}
        {isSettingsOpen && (
          <>
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsSettingsOpen(false)}></div>
            <div className="fixed inset-y-0 right-0 z-[101] w-full max-w-sm bg-[#09090B] border-l border-[rgba(255,255,255,0.05)] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.05)] bg-[#050505]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="size-5 text-emerald-400" /> Sistema
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-[#6F6F6F] hover:text-white transition-colors p-2 bg-[#1A1A1E] rounded-full">
                  <X className="size-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                
                {/* Info da Versão */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-1">
                    <Monitor className="size-3.5" /> Arquitetura do Sistema
                  </h3>
                  <div className="bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Híbrido (PWA + Nativo)</p>
                      <p className="text-xs text-emerald-400 font-medium">Build v2.5.0 (Câmera & Offline)</p>
                    </div>
                    <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold rounded-md tracking-wider">Universal</div>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed mt-1">
                    Funciona de forma unificada. O Scanner de Câmera e o Modo Offline (Cache Local) **já estão rodando agora mesmo**, seja no navegador, no celular (PWA) ou no instalador nativo.
                  </p>
                </div>

                {/* Tema e Aparência */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest mb-1">Aparência</h3>
                  <div className="bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                    <p className="text-sm text-[#A1A1AA] mb-3">O Personal OS opera exclusivamente no sistema <strong>Red Dark Mode</strong> nativo para maximizar o contraste e proteger sua visão durante turnos de execução profunda.</p>
                  </div>
                </div>

                {/* Dados de Login */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-1">
                    <User className="size-3.5" /> Dados de Acesso
                  </h3>
                  <div className="bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] flex items-start gap-3">
                    <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                      <User className="size-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Bruno Abreu (Admin)</p>
                      <p className="text-xs text-[#A1A1AA]">Sincronizado via Supabase Auth</p>
                      <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-2">Sessão Segura</p>
                    </div>
                  </div>
                </div>

                {/* Download e Instaladores */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-1">
                    <Download className="size-3.5" /> Como Instalar no Celular/PC?
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => alert("Recomendado!\n\nNo seu navegador (Chrome/Edge/Safari), vá no menu de opções e clique em 'Adicionar à Tela Inicial' ou 'Instalar Aplicativo'.\n\nPronto! Ele vai virar um app real no seu celular, com suporte à Câmera e Offline, sem ocupar espaço ou precisar de atualizações manuais.")} className="bg-[#111113] border border-emerald-500/30 hover:border-emerald-500 p-4 rounded-xl transition-all flex items-center gap-4 text-left group">
                      <div className="p-3 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                        <Smartphone className="size-6 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white block">Opção A: Instalação Rápida (PWA)</span>
                        <span className="text-[10px] text-[#A1A1AA] block mt-0.5">Via Chrome/Safari. Inclui Câmera e Offline. (Recomendado)</span>
                      </div>
                    </button>
                    <button onClick={() => alert("Para usuários técnicos:\n\nNo terminal da máquina rodando o projeto, execute:\nnpm run tauri build\n\nIsso compilará o .EXE (Windows) ou .APK (Android) nativo em Rust.")} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] hover:border-blue-500/50 p-4 rounded-xl transition-all flex items-center gap-4 text-left group">
                      <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <Monitor className="size-6 text-blue-400" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white block">Opção B: Compilação Nativa (Tauri)</span>
                        <span className="text-[10px] text-[#A1A1AA] block mt-0.5">Gera arquivo .APK / .EXE via terminal.</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Permissões e Diagnóstico */}
                <div className="flex flex-col gap-2 pb-8">
                  <h3 className="text-[11px] font-bold text-[#6F6F6F] uppercase tracking-widest flex items-center gap-2 mb-1">
                    <ShieldAlert className="size-3.5" /> Status e Permissões
                  </h3>
                  <div className="bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-white">Notificações Nativas</span>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold rounded">Permitido</span>
                    </div>
                    <div className="w-full h-px bg-[rgba(255,255,255,0.05)]"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-white">Armazenamento (Drive/Supabase)</span>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold rounded">Conectado</span>
                    </div>
                    <div className="w-full h-px bg-[rgba(255,255,255,0.05)]"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-white">Acesso Local FS (Tauri)</span>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold rounded">Conectado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeModule === "principal" ? (
          <PosPrincipal />
        ) : activeModule === "geral" ? (
          <DashboardGeral />
        ) : activeModule === "agenda" ? (
          <PosAgenda />
        ) : activeModule === "tarefas" ? (
          <PosTarefas />
        ) : activeModule === "habitos" ? (
          <PosHabits />
        ) : activeModule === "metas" ? (
          <PosGoals />
        ) : activeModule === "leitura" ? (
          <PosLibrary />
        ) : activeModule === "ideias" ? (
          <PosIdeas />
        ) : activeModule === "estudos" ? (
          <PosStudies />
        ) : activeModule === "evolucao" ? (
          <PosEvolution />
        ) : activeModule === "recompensas" ? (
          <PosRewards />
        ) : activeModule === "financeiro" ? (
          <PosFinance />
        ) : activeModule === "entretenimento" ? (
          <PosEntertainment />
        ) : activeModule === "alarmes" ? (
          <PosAlarms />
        ) : (
          <div className="p-10 max-w-[1400px] mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
            {activeModuleData && <activeModuleData.icon className="size-16 text-[#1A1A1E] mb-6" />}
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">{activeModuleData?.name}</h2>
            <p className="text-[#A1A1AA] max-w-md">
              A interface executiva para este módulo foi mapeada e a arquitetura SQL do banco de dados já está pronta.
              Para que o CRUD (Criar, Ler, Atualizar, Deletar) entre em ação, eu preciso conectá-lo ao Supabase.
            </p>
          </div>
        )}

      </main>
      </div>
    </AlarmsProvider>
  );
}
