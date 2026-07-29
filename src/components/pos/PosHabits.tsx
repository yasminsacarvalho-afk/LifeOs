import { useState } from "react";
import { usePosHabits } from "@/hooks/use-pos-habits";
import { usePosGoals } from "@/hooks/use-pos-goals";
import { usePosLibrary } from "@/hooks/use-pos-library";
import { usePosStudies } from "@/hooks/use-pos-studies";
import { usePosAgenda } from "@/hooks/use-pos-agenda";
import { 
  Plus, Trash2, CheckCircle2, Circle, Flame, Activity, TrendingUp, 
  Calendar as CalendarIcon, Clock, Target, Edit2, Sparkles, AlertCircle, BarChart3, Pause, Play, BookOpen, X, GraduationCap, CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const evolutionData = [
  { day: 'Seg', score: 65 }, { day: 'Ter', score: 70 }, { day: 'Qua', score: 68 },
  { day: 'Qui', score: 85 }, { day: 'Sex', score: 90 }, { day: 'Sab', score: 95 }, { day: 'Dom', score: 100 }
];

export function PosHabits() {
  const { habits, logs, loading, addHabit, updateHabit, deleteHabit, toggleHabitToday, logHabitPartial } = usePosHabits();
  const [isCreating, setIsCreating] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [newHabit, setNewHabit] = useState({
    title: "", category: "Saúde", icon: "Activity", color: "blue",
    description: "", objective: "", frequency: "diaria",
    goal_type: "conclusao", goal_value: 0, unit: "", preferred_time: "08:00", priority: "alta",
    goal_id: "", book_id: "", course_id: "", event_id: "", days_of_week: [] as any[]
  });

  const { goals, addGoal } = usePosGoals();
  const { books, addReadingSession } = usePosLibrary();
  const { courses } = usePosStudies();
  const { events } = usePosAgenda();

  const allCategories = ["Saúde", "Intelecto", "Trabalho", "Espiritualidade", ...new Set(habits.map(h => h.category))].filter(Boolean);
  const uniqueCategories = [...new Set(allCategories)];

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabit.title) return;
    const payload: any = { ...newHabit };
    if (!payload.goal_id) delete payload.goal_id;
    if (!payload.book_id) delete payload.book_id;
    if (!payload.course_id) delete payload.course_id;
    if (!payload.event_id) delete payload.event_id;
    if (payload.days_of_week && payload.days_of_week.length === 0) delete payload.days_of_week;
    
    if (editingHabitId) {
       await updateHabit(editingHabitId, payload);
    } else {
       await addHabit(payload);
    }
    setIsCreating(false);
    setEditingHabitId(null);
    setNewHabit({ title: "", category: "Saúde", icon: "Activity", color: "blue", description: "", objective: "", frequency: "diaria", goal_type: "conclusao", goal_value: 0, unit: "", preferred_time: "08:00", priority: "alta", goal_id: "", book_id: "", course_id: "", event_id: "", days_of_week: [] });
  };

  const isHabitCompletedToday = (habitId: string) => {
    const log = logs.find(l => l.habit_id === habitId && l.log_date === today);
    return log?.status === 'concluido';
  };

  const getHabitLogToday = (habitId: string) => {
    return logs.find(l => l.habit_id === habitId && l.log_date === today);
  };

  const isHabitScheduledForDate = (habit: any, dateStr: string) => {
    if (habit.status === 'pausado') return false;
    if (habit.frequency === 'diaria') return true;
    if (habit.frequency === 'dias_semana' && habit.days_of_week) {
       const dStr = format(new Date(dateStr), 'EE', { locale: ptBR });
       const mapDays: any = { 'seg': 'Seg', 'ter': 'Ter', 'qua': 'Qua', 'qui': 'Qui', 'sex': 'Sex', 'sáb': 'Sab', 'dom': 'Dom' };
       const dayFormatted = mapDays[dStr.toLowerCase()] || 'Seg';
       return habit.days_of_week.includes(dayFormatted);
    }
    if (habit.frequency === 'dias_mes' && habit.days_of_week) {
       const dayNum = format(new Date(dateStr), 'd');
       return habit.days_of_week.includes(dayNum);
    }
    return true;
  };

  const isHabitScheduledForToday = (habit: any) => isHabitScheduledForDate(habit, today);

  const getCompletionRate = () => {
    const scheduledToday = habits.filter(h => isHabitScheduledForToday(h));
    if (scheduledToday.length === 0) return 0;
    const completed = scheduledToday.filter(h => isHabitCompletedToday(h.id)).length;
    return Math.round((completed / scheduledToday.length) * 100);
  };

  const habitsToRender = habits.filter(habit => {
    if (selectedCategory === "Hoje") return isHabitScheduledForToday(habit);
    if (selectedCategory === "Todas") return true;
    return habit.category === selectedCategory;
  });

  const renderHistory = (habit: any) => {
    const isExpanded = expandedHistory[habit.id] || false;
    const daysCount = isExpanded ? 30 : 7;
    const days = Array.from({length: daysCount}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (daysCount - 1 - i));
      return format(d, 'yyyy-MM-dd');
    });

    const totalDone = logs.filter(l => l.habit_id === habit.id && l.status === 'concluido').length;

    return (
      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
        <div className="flex justify-between items-center mb-3">
           <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-bold">Últimos {daysCount} dias</span>
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-mono text-emerald-500 font-bold">{totalDone} execuções totais</span>
             <button 
               onClick={(e) => { e.stopPropagation(); setExpandedHistory(prev => ({...prev, [habit.id]: !isExpanded})); }} 
               className="text-[9px] font-bold uppercase tracking-widest bg-[#1A1A1E] text-[#A1A1AA] hover:text-white px-2 py-1 rounded-md transition-colors border border-[rgba(255,255,255,0.05)]"
             >
               {isExpanded ? "Ver Semana" : "Ver Mês"}
             </button>
           </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {days.map(d => {
            const isDone = logs.find(l => l.habit_id === habit.id && l.log_date === d && l.status === 'concluido');
            const isToday = d === today;
            const isScheduled = isHabitScheduledForDate(habit, d);
            const isMissed = !isDone && isScheduled && d < today;

            return (
               <div key={d} title={`${format(new Date(d), 'dd/MM/yyyy')}${isScheduled ? ' (Agendado)' : ' (Não agendado)'}`} className={cn(
                 "w-full aspect-square max-w-[28px] sm:max-w-[32px] rounded-lg flex items-center justify-center text-[10px] font-bold border transition-colors",
                 isDone ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]" : 
                 isMissed ? "bg-rose-500/10 text-rose-500 border-rose-500/30" :
                 !isScheduled ? "border-dashed border-[rgba(255,255,255,0.05)] bg-transparent text-[#71717A]/50" :
                 isToday ? "border-rose-500/50 text-rose-500 bg-rose-500/10" : "border-[rgba(255,255,255,0.05)] bg-[#1A1A1E] text-[#71717A]"
               )}>
                 {format(new Date(d), 'dd')}
               </div>
            )
          })}
        </div>
      </div>
    )
  };

  const getEvolutionData = () => {
    return Array.from({length: 7}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayLabel = format(d, 'EE', { locale: ptBR });

      const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, dateStr));
      
      const completedCount = scheduledHabits.filter(h => {
        return logs.some(l => l.habit_id === h.id && l.log_date === dateStr && l.status === 'concluido');
      }).length;

      const score = scheduledHabits.length > 0 ? Math.round((completedCount / scheduledHabits.length) * 100) : 0;

      return {
        day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1, 3),
        score
      };
    });
  };

  const dynamicEvolutionData = habits.length > 0 ? getEvolutionData() : evolutionData;

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20">
      
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="size-6 text-rose-500" /> Gestão de Hábitos Avançada
          </h2>
          <p className="text-[#A1A1AA] text-sm mt-1">Consistência, padrões e inteligência de execução diária.</p>
        </div>
        <button 
          onClick={() => {
             setIsCreating(!isCreating);
             setEditingHabitId(null);
             setNewHabit({ title: "", category: "Saúde", icon: "Activity", color: "blue", description: "", objective: "", frequency: "diaria", goal_type: "conclusao", goal_value: 0, unit: "", preferred_time: "08:00", priority: "alta", goal_id: "", book_id: "", course_id: "", event_id: "", days_of_week: [] });
          }}
          className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:bg-rose-600 transition-colors"
        >
          <Plus className="size-4" /> Novo Hábito
        </button>
      </div>

      {/* DASHBOARD EXECUTIVO DE HÁBITOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* BIG KPI */}
        <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-[#111113] to-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50"></div>
          
          <h3 className="text-[#A1A1AA] text-[11px] font-bold uppercase tracking-widest mb-4">Progresso do Dia</h3>
          
          <div className="relative flex items-center justify-center">
            {/* Background Circle */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
              {/* Progress Circle */}
              <circle 
                cx="64" cy="64" r="56" 
                stroke="currentColor" 
                strokeWidth="12" 
                fill="none" 
                strokeDasharray="351.858"
                strokeDashoffset={351.858 - (351.858 * getCompletionRate()) / 100}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000 ease-out",
                  getCompletionRate() >= 80 ? "text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" : 
                  getCompletionRate() >= 50 ? "text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" : 
                  "text-rose-500 drop-shadow-[0_0_12px_rgba(225,29,72,0.5)]"
                )}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white tracking-tighter">{getCompletionRate()}%</span>
            </div>
          </div>
          
          <div className="mt-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 border border-[rgba(255,255,255,0.05)] text-xs font-semibold">
             {getCompletionRate() >= 80 ? (
               <><TrendingUp className="size-3 text-emerald-500"/> <span className="text-emerald-500">Excelente</span></>
             ) : getCompletionRate() >= 50 ? (
               <><Activity className="size-3 text-amber-500"/> <span className="text-amber-500">No Caminho</span></>
             ) : (
               <><Target className="size-3 text-rose-500"/> <span className="text-rose-500">Atenção</span></>
             )}
          </div>
        </div>

        {/* AI ANALYSIS CARD */}
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-[#111113] to-rose-900/10 border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-glow-accent">
           <div className="flex items-center gap-2 mb-2">
             <Sparkles className="size-4 text-rose-400" />
             <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Análise de Padrões (IA)</span>
           </div>
           <p className="text-sm text-white/90 leading-relaxed font-medium">
             Você possui uma taxa de <strong className="text-emerald-400">92% de sucesso</strong> nos hábitos agendados para antes das 09:00h. No entanto, o hábito "Leitura Técnica" à noite foi abandonado nos últimos 3 dias. 
           </p>
           <div className="mt-4 flex gap-2">
             <button className="text-[10px] uppercase font-bold bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg hover:bg-rose-500/30 transition-colors">
               Reagendar Leitura para Manhã
             </button>
           </div>
        </div>

        {/* EVOLUTION CHART */}
        <div className="col-span-1 md:col-span-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 flex flex-col justify-between">
           <h3 className="text-[#71717A] text-[11px] font-bold uppercase tracking-widest mb-4">Evolução Semanal</h3>
           <div className="h-[80px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={dynamicEvolutionData}>
                 <defs>
                   <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <Tooltip contentStyle={{ backgroundColor: '#111113', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                 <Area type="monotone" dataKey="score" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO (MODAL) */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
          <div className="w-full md:max-w-4xl max-h-[90vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 md:zoom-in-95">
            
            <div className="p-5 md:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Sparkles className="size-5 text-rose-500" /> Engenharia do Hábito
               </h3>
               <button type="button" onClick={() => { setIsCreating(false); setEditingHabitId(null); setNewHabit({ title: "", category: "Saúde", icon: "Activity", color: "blue", description: "", objective: "", frequency: "diaria", goal_type: "conclusao", goal_value: 0, unit: "", preferred_time: "08:00", priority: "alta", goal_id: "", book_id: "", course_id: "", event_id: "", days_of_week: [] }); }} className="p-2 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-500 rounded-full transition-colors">
                 <X className="size-5" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
              <form onSubmit={handleCreate}>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Nome do Hábito</label>
              <input 
                type="text" required value={newHabit.title} onChange={e => setNewHabit({...newHabit, title: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                placeholder="Ex: Treinar, Ler, Beber Água"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Categoria</label>
              <input 
                type="text" list="habit-categories" required value={newHabit.category} onChange={e => setNewHabit({...newHabit, category: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                placeholder="Ex: Saúde, Finanças..."
              />
              <datalist id="habit-categories">
                {uniqueCategories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Prioridade</label>
              <select 
                value={newHabit.priority} onChange={e => setNewHabit({...newHabit, priority: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="alta">Alta (Inegociável)</option>
                <option value="media">Média (Importante)</option>
                <option value="baixa">Baixa (Desejável)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
             <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Objetivo (Por que fazer isso?)</label>
              <input 
                type="text" value={newHabit.objective} onChange={e => setNewHabit({...newHabit, objective: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                placeholder="Ex: Ter mais energia ao longo do dia"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Horário Preferencial</label>
              <input 
                type="time" value={newHabit.preferred_time} onChange={e => setNewHabit({...newHabit, preferred_time: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Frequência</label>
              <select 
                value={newHabit.frequency} onChange={e => setNewHabit({...newHabit, frequency: e.target.value, days_of_week: []})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="diaria">Todos os Dias</option>
                <option value="dias_semana">Dias da Semana Específicos</option>
                <option value="dias_mes">Dias do Mês Específicos</option>
                <option value="dias_ano">Dias do Ano Específicos</option>
                <option value="vezes_semana">Vezes por Semana</option>
                <option value="vezes_mes">Vezes por Mês</option>
              </select>
            </div>
          </div>

          {newHabit.frequency !== 'diaria' && (
            <div className="grid grid-cols-1 mb-6">
              <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                {newHabit.frequency === 'dias_semana' && (
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-rose-400 font-bold mb-3 block">Selecione os Dias da Semana</label>
                    <div className="flex flex-wrap gap-2">
                      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(dia => (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => {
                            const newDays = newHabit.days_of_week.includes(dia) 
                              ? newHabit.days_of_week.filter(d => d !== dia) 
                              : [...newHabit.days_of_week, dia];
                            setNewHabit({...newHabit, days_of_week: newDays});
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${newHabit.days_of_week.includes(dia) ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#1A1A1E] text-[#71717A] hover:bg-[#1A1A1E]/80 border border-[rgba(255,255,255,0.06)]'}`}
                        >
                          {dia}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {newHabit.frequency === 'dias_mes' && (
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-rose-400 font-bold mb-3 block">Dias do Mês (1-31, separados por vírgula)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 5, 15, 30" 
                      value={newHabit.days_of_week.join(', ')} 
                      onChange={e => setNewHabit({...newHabit, days_of_week: e.target.value.split(',').map(v => v.trim()).filter(v => v)})}
                      className="w-full max-w-md bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                )}
                {newHabit.frequency === 'dias_ano' && (
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-rose-400 font-bold mb-3 block">Datas Específicas (DD/MM, separadas por vírgula)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 01/01, 12/10, 25/12" 
                      value={newHabit.days_of_week.join(', ')} 
                      onChange={e => setNewHabit({...newHabit, days_of_week: e.target.value.split(',').map(v => v.trim()).filter(v => v)})}
                      className="w-full max-w-md bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                )}
                {(newHabit.frequency === 'vezes_semana' || newHabit.frequency === 'vezes_mes') && (
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-rose-400 font-bold mb-3 block">Quantidade de Vezes</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" min="1"
                        placeholder="Ex: 3" 
                        value={newHabit.days_of_week[0] || ''} 
                        onChange={e => setNewHabit({...newHabit, days_of_week: [e.target.value]})}
                        className="w-32 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                      />
                      <span className="text-sm text-[#A1A1AA] font-medium">vezes por {newHabit.frequency === 'vezes_semana' ? 'semana' : 'mês'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 p-4 bg-[#1A1A1E]/50 rounded-xl border border-[rgba(255,255,255,0.02)]">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Tipo de Meta</label>
              <select 
                value={newHabit.goal_type} onChange={e => setNewHabit({...newHabit, goal_type: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="conclusao">Apenas Concluir (Check)</option>
                <option value="tempo">Tempo Executado</option>
                <option value="quantidade">Quantidade Alvo</option>
              </select>
            </div>
            
            {newHabit.goal_type !== 'conclusao' && (
              <>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Meta (Número)</label>
                  <input 
                    type="number" min="1" value={newHabit.goal_value || ''} onChange={e => setNewHabit({...newHabit, goal_value: Number(e.target.value)})}
                    className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    placeholder="Ex: 30"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Unidade</label>
                  <input 
                    type="text" value={newHabit.unit} onChange={e => setNewHabit({...newHabit, unit: e.target.value})}
                    className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    placeholder="Ex: Minutos, Páginas, Litros"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Vincular Meta Estratégica</label>
              <select 
                value={newHabit.goal_id || ''} 
                onChange={async e => {
                  if (e.target.value === "new") {
                    const title = window.prompt("Qual o nome da nova Meta Estratégica?");
                    if (title) {
                      const newGoal = await addGoal({
                        title, type: 'habito', reason: '', deadline: null, progress_percentage: 0, milestones: null, status: 'em_andamento'
                      });
                      if (newGoal) setNewHabit({...newHabit, goal_id: newGoal.id});
                    }
                  } else {
                    setNewHabit({...newHabit, goal_id: e.target.value});
                  }
                }}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="">Nenhuma Meta Vinculada</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
                <option value="new" className="text-rose-400 font-bold">+ Criar Nova Meta Rápida</option>
              </select>
            </div>
            
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Vincular Livro (Opcional)</label>
              <select 
                value={newHabit.book_id || ''} onChange={e => setNewHabit({...newHabit, book_id: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="">Nenhum Livro</option>
                {books.filter(b => b.status === 'lendo' || b.status === 'quero_ler').map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Vincular Curso (Opcional)</label>
              <select 
                value={newHabit.course_id || ''} onChange={e => setNewHabit({...newHabit, course_id: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="">Nenhum Curso</option>
                {courses.filter(c => c.status !== 'concluido').map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Vincular Agenda (Opcional)</label>
              <select 
                value={newHabit.event_id || ''} onChange={e => setNewHabit({...newHabit, event_id: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="">Nenhum Compromisso</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
          </div>
                <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                  <button type="button" onClick={() => { setIsCreating(false); setEditingHabitId(null); setNewHabit({ title: "", category: "Saúde", icon: "Activity", color: "blue", description: "", objective: "", frequency: "diaria", goal_type: "conclusao", goal_value: 0, unit: "", preferred_time: "08:00", priority: "alta", goal_id: "", book_id: "", course_id: "", event_id: "", days_of_week: [] }); }} className="w-full md:w-auto px-6 py-3.5 bg-[#1A1A1E] hover:bg-[#27272A] text-white font-bold rounded-xl transition-all border border-[rgba(255,255,255,0.06)]">
                    Cancelar
                  </button>
                  <button type="submit" className="w-full md:w-auto px-8 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-5" /> {editingHabitId ? "Salvar Alterações" : "Ativar Hábito"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FILTRO E LISTAGEM */}
      <div className="mt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarIcon className="size-5 text-[#A1A1AA]" /> 
            {selectedCategory === "Todas" ? "Todos os Hábitos" : selectedCategory === "Hoje" ? "Para Executar Hoje" : `Categoria: ${selectedCategory}`}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 bg-[#111113] p-1 rounded-xl border border-[rgba(255,255,255,0.06)]">
            {["Hoje", "Todas", ...uniqueCategories].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  selectedCategory === cat 
                    ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]"
                    : "text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1E]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><div className="size-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : habitsToRender.length === 0 ? (
          <div className="text-center p-12 bg-[#111113] border border-dashed border-[rgba(255,255,255,0.06)] rounded-3xl">
            <Activity className="size-12 text-[#71717A] mx-auto mb-4" />
            <p className="text-[#A1A1AA] max-w-md mx-auto">Nenhum hábito encontrado para esta visualização.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {habitsToRender.map(habit => {
              const isCompleted = isHabitCompletedToday(habit.id);
              const logToday = getHabitLogToday(habit.id);
              const isPaused = habit.status === 'pausado';

              return (
                <div key={habit.id} className={cn(
                  "bg-[#111113] border rounded-2xl p-6 flex flex-col justify-between group transition-all relative overflow-hidden",
                  isPaused ? "opacity-50 grayscale border-[rgba(255,255,255,0.02)]" : 
                  isCompleted ? "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.05)]" : "border-[rgba(255,255,255,0.06)] hover:border-rose-500/30"
                )}>
                  {/* Status & Actions */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-wrap gap-2">
                      <span className={cn(
                        "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                        habit.priority === 'alta' ? 'bg-rose-500/10 text-rose-500' : 'bg-[#1A1A1E] text-[#A1A1AA]'
                      )}>
                        {habit.category}
                      </span>
                      {habit.frequency && habit.frequency !== 'diaria' && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">
                          {habit.frequency === 'dias_semana' ? 'Dias da Semana' : 
                           habit.frequency === 'dias_mes' ? 'Dias do Mês' : 
                           habit.frequency === 'dias_ano' ? 'Dias do Ano' : 
                           habit.frequency === 'vezes_semana' ? `${habit.days_of_week?.[0] || 'X'}x Semana` : 
                           habit.frequency === 'vezes_mes' ? `${habit.days_of_week?.[0] || 'X'}x Mês` : habit.frequency}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        setNewHabit({
                           title: habit.title || "",
                           category: habit.category || "Saúde",
                           icon: habit.icon || "Activity",
                           color: habit.color || "blue",
                           description: habit.description || "",
                           objective: habit.objective || "",
                           frequency: habit.frequency || "diaria",
                           goal_type: habit.goal_type || "conclusao",
                           goal_value: habit.goal_value || 0,
                           unit: habit.unit || "",
                           preferred_time: habit.preferred_time || "08:00",
                           priority: habit.priority || "alta",
                           goal_id: habit.goal_id || "",
                           book_id: habit.book_id || "",
                           course_id: habit.course_id || "",
                           event_id: habit.event_id || "",
                           days_of_week: habit.days_of_week || []
                        } as any);
                        setEditingHabitId(habit.id);
                        setIsCreating(true);
                      }} className="text-[#71717A] hover:text-cyan-500 p-1">
                        <Edit2 className="size-3.5" />
                      </button>
                      <button onClick={() => updateHabit(habit.id, { status: isPaused ? 'ativo' : 'pausado' })} className="text-[#71717A] hover:text-amber-500 p-1">
                        {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                      </button>
                      <button onClick={() => { if(window.confirm('Tem certeza que deseja excluir este hábito e todo seu histórico?')) deleteHabit(habit.id); }} className="text-[#71717A] hover:text-rose-500 p-1">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Clickable Area */}
                  <button 
                    onClick={() => !isPaused && habit.goal_type === 'conclusao' && toggleHabitToday(habit.id)} 
                    disabled={isPaused || habit.goal_type !== 'conclusao'}
                    className={cn("flex flex-col text-left focus:outline-none flex-1", (isPaused || habit.goal_type !== 'conclusao') && "cursor-default")}
                  >
                    <div className="flex items-center gap-4 mb-2">
                      {habit.goal_type === 'conclusao' && (
                        <div className={cn("shrink-0 transition-transform", isCompleted && "scale-110")}>
                          {isCompleted ? <CheckCircle2 className="size-8 text-emerald-500 drop-shadow-md" /> : <Circle className="size-8 text-[#71717A]" />}
                        </div>
                      )}
                      <div>
                        <h3 className={cn("font-bold text-xl tracking-tight leading-tight", isCompleted ? "text-[#A1A1AA]" : "text-white")}>
                          {habit.title}
                        </h3>
                        {habit.objective && (
                          <p className="text-[11px] text-[#71717A] mt-1 line-clamp-1">{habit.objective}</p>
                        )}
                      </div>
                    </div>
                  </button>

                  {habit.goal_id && (
                     <div className="mb-4 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                       <Target className="size-3 text-indigo-400" />
                       <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest truncate">Meta: {goals.find(g => g.id === habit.goal_id)?.title || 'Desconhecida'}</span>
                     </div>
                  )}

                  {habit.book_id && (
                     <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                       <BookOpen className="size-3 text-emerald-400" />
                       <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest truncate">Leitura: {books.find(b => b.id === habit.book_id)?.title || 'Desconhecida'}</span>
                     </div>
                  )}
                  {habit.course_id && (
                     <div className="mb-4 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                       <GraduationCap className="size-3 text-cyan-400" />
                       <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest truncate">Curso: {courses.find(c => c.id === habit.course_id)?.title || 'Desconhecido'}</span>
                     </div>
                  )}
                  {habit.event_id && (
                     <div className="mb-4 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                       <CalendarIcon className="size-3 text-indigo-400" />
                       <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest truncate">Agenda: {events.find(e => e.id === habit.event_id)?.title || 'Desconhecido'}</span>
                     </div>
                  )}

                  {/* Input Quantidade / Tempo (Progressivo) */}
                  {!isPaused && habit.goal_type !== 'conclusao' && (
                     <div className="mt-4 mb-2 flex flex-col gap-3 bg-[#1A1A1E] p-3 rounded-xl border border-[rgba(255,255,255,0.02)]">
                       <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-[#A1A1AA]">Progresso Diário</span>
                         <span className="text-xs font-mono font-bold text-cyan-400">
                           {logToday?.value_achieved || 0} <span className="text-[#71717A]">/ {habit.goal_value} {habit.unit}</span>
                         </span>
                       </div>
                       
                       <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                         <div className="h-full bg-cyan-500 transition-all duration-700" style={{ width: `${Math.min(100, ((logToday?.value_achieved || 0) / (habit.goal_value || 1)) * 100)}%` }}></div>
                       </div>
                       
                       <div className="flex items-center gap-2 mt-1">
                         <input 
                           type="number"
                           placeholder="+ Adicionar..."
                           className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                           onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                const addVal = Number(e.currentTarget.value);
                                if (addVal !== 0) {
                                  const current = logToday?.value_achieved || 0;
                                  const newVal = Math.max(0, current + addVal);
                                  const status = newVal >= (habit.goal_value || 0) ? 'concluido' : 'parcial';
                                  await logHabitPartial(habit.id, newVal, status);
                                  e.currentTarget.value = '';
                                  
                                  if (habit.book_id && addVal > 0) {
                                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                                    await addReadingSession({ 
                                      book_id: habit.book_id,
                                      pages_read: addVal,
                                      duration_minutes: 30,
                                      session_date: todayStr,
                                      notes: `Registrado via módulo de Hábitos (${habit.title})`
                                    });
                                  }
                                }
                              }
                           }}
                         />
                         <button 
                            className="bg-[#111113] hover:bg-cyan-500/20 text-cyan-500 border border-[rgba(255,255,255,0.06)] hover:border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1"
                            onClick={async (e) => {
                              const inputEl = e.currentTarget.previousElementSibling as HTMLInputElement;
                              const addVal = Number(inputEl.value);
                              if (addVal !== 0) {
                                const current = logToday?.value_achieved || 0;
                                const newVal = Math.max(0, current + addVal);
                                const status = newVal >= (habit.goal_value || 0) ? 'concluido' : 'parcial';
                                await logHabitPartial(habit.id, newVal, status);
                                inputEl.value = '';
                                
                                if (habit.book_id && addVal > 0) {
                                  const todayStr = format(new Date(), 'yyyy-MM-dd');
                                  await addReadingSession({ 
                                    book_id: habit.book_id,
                                    pages_read: addVal,
                                    duration_minutes: 30,
                                    session_date: todayStr,
                                    notes: `Registrado via módulo de Hábitos (${habit.title})`
                                  });
                                }
                              }
                            }}
                         >
                            <Plus className="size-3" /> Somar
                         </button>
                         {isCompleted && <CheckCircle2 className="size-4 text-emerald-500 shrink-0 ml-1" />}
                       </div>
                     </div>
                  )}

                  {/* Streaks & Time Info */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(255,255,255,0.04)]">
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1.5 bg-[#1A1A1E] px-2.5 py-1 rounded-md" title="Sequência Atual">
                        <Flame className={cn("size-3.5", habit.current_streak >= 3 ? "text-orange-500" : "text-[#71717A]")} />
                        <span className="text-xs font-bold text-white">{habit.current_streak}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#1A1A1E] px-2.5 py-1 rounded-md" title="Melhor Sequência">
                        <BarChart3 className="size-3.5 text-rose-500" />
                        <span className="text-xs font-bold text-white">{habit.best_streak}</span>
                      </div>
                    </div>
                    {habit.preferred_time && (
                      <div className="flex items-center gap-1 text-[10px] text-[#71717A] font-medium">
                        <Clock className="size-3" /> {habit.preferred_time.slice(0,5)}
                      </div>
                    )}
                  </div>

                  {/* Render History */}
                  {selectedCategory !== "Hoje" && renderHistory(habit)}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
