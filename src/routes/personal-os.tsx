import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  LayoutDashboard, Calendar, CheckSquare, Briefcase, Activity, 
  GraduationCap, BookOpen, DollarSign, Lightbulb, Target, 
  Brain, Coffee, Timer, Book, LineChart, Plus, AlertCircle, 
  ChevronRight, Sparkles, TrendingUp, TrendingDown, Clock, Home, Menu, X
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PosAgenda } from "@/components/pos/PosAgenda";
import { PosTarefas } from "@/components/pos/PosTarefas";
import { PosHabits } from "@/components/pos/PosHabits";
import { PosLibrary } from "@/components/pos/PosLibrary";
import { PosIdeas } from "@/components/pos/PosIdeas";
import { PosGoals } from "@/components/pos/PosGoals";
import { PosStudies } from "@/components/pos/PosStudies";
import { usePosTasks } from "@/hooks/use-pos-tasks";
import { usePosHabits } from "@/hooks/use-pos-habits";
import { usePosAgenda } from "@/hooks/use-pos-agenda";
import { usePosLibrary } from "@/hooks/use-pos-library";
import { usePosStudies } from "@/hooks/use-pos-studies";
import { usePosIdeas } from "@/hooks/use-pos-ideas";
import { format, isToday, parseISO } from "date-fns";

export const Route = createFileRoute("/personal-os")({
  component: PersonalOSPage,
});

const modules = [
  { id: "geral", name: "Dashboard", icon: LayoutDashboard },
  { id: "agenda", name: "Agenda", icon: Calendar },
  { id: "tarefas", name: "Tarefas", icon: CheckSquare },
  { id: "projetos", name: "Projetos", icon: Briefcase },
  { id: "habitos", name: "Hábitos", icon: Activity },
  { id: "metas", name: "Metas", icon: Target },
  { id: "estudos", name: "Estudos", icon: GraduationCap },
  { id: "leitura", name: "Leitura", icon: BookOpen },
  { id: "empresas", name: "Empresas", icon: Briefcase },
  { id: "financeiro", name: "Financeiro", icon: DollarSign },
  { id: "ideias", name: "Ideias", icon: Lightbulb },
  { id: "foco", name: "Modo Foco", icon: Timer },
  { id: "diario", name: "Diário", icon: Book },
  { id: "ia", name: "IA", icon: Sparkles },
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

  const todayStr = format(new Date(), 'yyyy-MM-dd');

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
            { label: "Estudos (Horas)", value: `${hoursStudied}h`, icon: GraduationCap, color: "text-cyan-500" },
            { label: "Ideias", value: ideasCount.toString(), icon: Lightbulb, color: "text-yellow-500" },
            { label: "Projetos", value: "Em Breve", icon: Briefcase, color: "text-rose-500" },
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
    </div>
  );
}

function PersonalOSPage() {
  const [activeModule, setActiveModule] = useState("geral");
  const activeModuleData = modules.find(m => m.id === activeModule);

  return (
    <div className="flex flex-col h-screen bg-[#09090B] text-[#FFFFFF] font-sans selection:bg-rose-500/30 overflow-hidden relative">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#09090B] pb-24 custom-scrollbar">
        
        {/* Header / Topbar */}
        <header className="h-16 md:h-20 border-b border-[rgba(255,255,255,0.02)] flex items-center justify-between px-4 md:px-10 sticky top-0 bg-[#09090B]/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3 md:gap-4">
            <Link to="/" className="p-2 flex rounded-xl text-[#71717A] hover:bg-[#1A1A1E] hover:text-white transition-colors" title="Voltar ao RapiHub">
              <Home className="size-5" />
            </Link>
            <h1 className="text-lg md:text-xl font-semibold tracking-tight text-white/90">Bom dia, Bruno.</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-[#1A1A1E] text-[#A1A1AA] transition-colors relative">
              <AlertCircle className="size-5" />
              <span className="absolute top-1 right-1 size-2 bg-rose-500 rounded-full border border-[#09090B]"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1px]">
              <div className="h-full w-full rounded-full bg-[#111113] border border-[rgba(255,255,255,0.1)]"></div>
            </div>
          </div>
        </header>

        {activeModule === "geral" ? (
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

      {/* Bottom Floating Navigation (Dock) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F11]/80 backdrop-blur-2xl border-t border-[rgba(255,255,255,0.06)] pb-safe">
        <div className="max-w-[1400px] mx-auto px-2 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar justify-start md:justify-center px-2">
            {modules.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 min-w-[72px] px-2 py-2 rounded-xl transition-all duration-300 relative group shrink-0",
                  activeModule === m.id
                    ? "text-rose-500"
                    : "text-[#71717A] hover:text-white hover:bg-[#1A1A1E]"
                )}
              >
                {activeModule === m.id && (
                  <span className="absolute -top-3 w-8 h-1 bg-rose-500 rounded-b-full shadow-[0_0_10px_rgba(225,29,72,0.5)]"></span>
                )}
                <div className={cn(
                  "p-2 rounded-lg transition-all duration-300",
                  activeModule === m.id ? "bg-rose-500/10" : "bg-transparent group-hover:bg-[#27272A]/50"
                )}>
                  <m.icon className="size-5" />
                </div>
                <span className="text-[10px] font-medium tracking-wide">{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
