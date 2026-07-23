import { useState } from "react";
import { usePosStudies } from "@/hooks/use-pos-studies";
import { 
  GraduationCap, Plus, Play, BookOpen, Clock, Trophy, Flame, Target, 
  Trash2, Award, Zap, Brain, Calendar as CalendarIcon, CheckCircle2
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function PosStudies() {
  const { courses, sessions, loading, addCourse, deleteCourse, addSession } = usePosStudies();
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [activeCourseLog, setActiveCourseLog] = useState<string | null>(null);

  const [newCourse, setNewCourse] = useState({
    title: "", knowledge_area: "Tecnologia", category: "Programação", platform: "",
    total_hours: 0, deadline: "", level: "intermediario"
  });

  const [newSession, setNewSession] = useState({
    duration_minutes: 60, module_name: "", class_name: "", summary: "", difficulty: "media", personal_rating: 10
  });

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title) return;
    const coursePayload: any = { ...newCourse };
    if (!coursePayload.deadline) {
      delete coursePayload.deadline;
    }
    await addCourse(coursePayload);
    setIsCreatingCourse(false);
    setNewCourse({ ...newCourse, title: "", platform: "", total_hours: 0, deadline: "" });
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourseLog) return;
    await addSession({ 
      ...newSession, 
      course_id: activeCourseLog, 
      session_date: format(new Date(), 'yyyy-MM-dd') 
    } as any);
    setActiveCourseLog(null);
    setNewSession({ ...newSession, module_name: "", class_name: "", summary: "", duration_minutes: 60 });
  };

  const totalXP = sessions.reduce((acc, s) => acc + (s.xp_earned || 0), 0);
  const userLevel = Math.floor(Math.sqrt(totalXP / 100)) + 1;
  const currentLevelXP = Math.pow(userLevel - 1, 2) * 100;
  const nextLevelXP = Math.pow(userLevel, 2) * 100;
  const levelProgress = Math.min(100, Math.round(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100));

  const totalHours = Number(courses.reduce((acc, c) => acc + (c.completed_hours || 0), 0).toFixed(1));
  const activeCourses = courses.filter(c => c.status !== 'concluido').length;

  // Mock data for Recharts (could be calculated from sessions)
  const chartData = [
    { name: 'Seg', hours: 1.5 }, { name: 'Ter', hours: 2 }, { name: 'Qua', hours: 0 },
    { name: 'Qui', hours: 3 }, { name: 'Sex', hours: 1 }, { name: 'Sab', hours: 4 }, { name: 'Dom', hours: 2.5 }
  ];

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
             <GraduationCap className="size-6 text-cyan-500" /> Academia Operacional
          </h2>
          <p className="text-[#A1A1AA] text-sm mt-1">Gestão de estudos, evolução técnica e ganho de XP.</p>
        </div>
        <button 
          onClick={() => setIsCreatingCourse(!isCreatingCourse)}
          className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(8,145,178,0.2)] hover:bg-cyan-500 transition-colors"
        >
          <Plus className="size-4" /> Cadastrar Curso
        </button>
      </div>

      {/* GAMIFICATION & DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* User Level Card */}
        <div className="col-span-1 md:col-span-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
             <Trophy className="size-32 text-cyan-500" />
           </div>
           
           <div className="flex items-center justify-between mb-6 relative z-10">
             <div className="flex items-center gap-3">
               <div className="size-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-glow-accent-cyan">
                 <Zap className="size-6 text-cyan-400" />
               </div>
               <div>
                 <h3 className="text-sm font-bold uppercase tracking-widest text-[#71717A]">Nível Atual</h3>
                 <div className="text-2xl font-black text-white">Level {userLevel}</div>
               </div>
             </div>
             <div className="text-right">
               <div className="text-2xl font-black text-cyan-400">{totalXP} <span className="text-sm font-bold text-[#A1A1AA]">XP</span></div>
             </div>
           </div>

           <div className="relative z-10">
             <div className="flex justify-between text-[11px] font-bold text-[#71717A] mb-2 uppercase tracking-widest">
               <span>Progresso para o Nível {userLevel + 1}</span>
               <span>{levelProgress}%</span>
             </div>
             <div className="h-2 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
               <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${levelProgress}%` }}></div>
             </div>
           </div>
        </div>

        {/* Global KPIs */}
        <div className="col-span-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 flex flex-col justify-center">
           <h3 className="text-[#71717A] text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Clock className="size-3"/> Horas de Voo</h3>
           <div className="text-5xl font-black text-white tracking-tighter">{totalHours}h</div>
           <div className="text-sm font-medium text-[#A1A1AA] mt-1">{activeCourses} trilhas ativas</div>
        </div>

        {/* Chart */}
        <div className="col-span-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 flex flex-col justify-between">
           <h3 className="text-[#71717A] text-[11px] font-bold uppercase tracking-widest mb-4">Volume Semanal</h3>
           <div className="h-[80px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <Tooltip cursor={{fill: '#1A1A1E'}} contentStyle={{ backgroundColor: '#111113', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                 <Bar dataKey="hours" fill="#06b6d4" radius={[4,4,0,0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* FORMULÁRIO DE CURSO */}
      {isCreatingCourse && (
        <form onSubmit={handleCreateCourse} className="bg-[#111113] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-[rgba(255,255,255,0.06)] pb-4">Mapeamento de Trilha</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Nome do Curso / Trilha</label>
              <input 
                type="text" required value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="Ex: Formação Node.js Avançada"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Área</label>
              <select 
                value={newCourse.knowledge_area} onChange={e => setNewCourse({...newCourse, knowledge_area: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
              >
                <option value="Tecnologia">Tecnologia</option>
                <option value="Negócios">Negócios</option>
                <option value="Finanças">Finanças</option>
                <option value="Idiomas">Idiomas</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Carga Horária (Estimada)</label>
              <input 
                type="number" min="1" required value={newCourse.total_hours || ''} onChange={e => setNewCourse({...newCourse, total_hours: Number(e.target.value)})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="Ex: 40"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreatingCourse(false)} className="px-6 py-3 rounded-xl text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Cancelar</button>
            <button type="submit" className="px-6 py-3 rounded-xl text-sm font-bold bg-cyan-600 text-white hover:bg-cyan-500 shadow-md">Iniciar Trilha</button>
          </div>
        </form>
      )}

      {/* RENDER DOS CURSOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center p-10"><div className="size-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : courses.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-[#111113] border border-dashed border-[rgba(255,255,255,0.06)] rounded-3xl">
            <Brain className="size-12 text-[#71717A] mx-auto mb-4" />
            <p className="text-[#A1A1AA]">Nenhum curso matriculado. Inicie uma trilha para ganhar XP.</p>
          </div>
        ) : (
          courses.map(course => {
            const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
            const isCompleted = course.status === 'concluido';
            
            // Ascii progress bar generator
            const barLength = 10;
            const filledLength = Math.round((percent / 100) * barLength);
            const asciiBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

            return (
              <div key={course.id} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 hover:border-[rgba(255,255,255,0.1)] transition-all flex flex-col group relative overflow-hidden">
                {isCompleted && (
                  <div className="absolute -right-4 -top-4 opacity-5">
                    <Award className="size-32 text-emerald-500" />
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border",
                    isCompleted ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-cyan-400 border-cyan-400/20 bg-cyan-400/10"
                  )}>
                    {course.knowledge_area}
                  </span>
                  <button onClick={() => deleteCourse(course.id)} className="opacity-0 group-hover:opacity-100 text-[#71717A] hover:text-rose-500 transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <h3 className={cn("font-bold text-xl tracking-tight leading-tight mb-6 relative z-10", isCompleted ? "text-white" : "text-white")}>
                  {course.title}
                </h3>

                {/* Progress ASCII */}
                <div className="mb-6 bg-[#1A1A1E] p-3 rounded-xl border border-[rgba(255,255,255,0.02)] relative z-10">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className={cn(isCompleted ? "text-emerald-500" : "text-cyan-400")}>{asciiBar}</span>
                    <span className="font-bold text-white">{percent}%</span>
                  </div>
                  <div className="text-[10px] text-[#71717A] font-bold uppercase tracking-widest mt-1">
                    {course.completed_hours}h / {course.total_hours}h
                  </div>
                </div>

                {/* Ações */}
                <div className="mt-auto relative z-10">
                  {!isCompleted ? (
                    activeCourseLog === course.id ? (
                      <form onSubmit={handleLogSession} className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 animate-in slide-in-from-bottom-2">
                         <div className="flex items-center gap-3 mb-3">
                           <input type="number" min="1" required value={newSession.duration_minutes} onChange={e => setNewSession({...newSession, duration_minutes: Number(e.target.value)})} className="w-20 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded text-xs px-2 py-1 text-white focus:outline-none focus:border-cyan-500" placeholder="Minutos" />
                           <span className="text-xs text-[#71717A] font-bold">Minutos focados</span>
                         </div>
                         <input type="text" required value={newSession.summary} onChange={e => setNewSession({...newSession, summary: e.target.value})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded text-xs px-3 py-2 text-white mb-3 focus:outline-none focus:border-cyan-500" placeholder="Resumo rápido do que aprendeu..." />
                         <div className="flex gap-2">
                           <button type="button" onClick={() => setActiveCourseLog(null)} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#A1A1AA] bg-[#111113] hover:bg-[#27272A]">Cancelar</button>
                           <button type="submit" className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-950 bg-cyan-500 hover:bg-cyan-400">Salvar Sessão (+XP)</button>
                         </div>
                      </form>
                    ) : (
                      <button onClick={() => setActiveCourseLog(course.id)} className="w-full flex items-center justify-center gap-2 bg-[#1A1A1E] text-white hover:bg-[#27272A] border border-[rgba(255,255,255,0.04)] px-4 py-3 rounded-xl text-sm font-bold transition-colors">
                        <Play className="size-4" /> Registrar Sessão de Estudo
                      </button>
                    )
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-3 rounded-xl text-sm font-bold">
                      <CheckCircle2 className="size-4" /> Curso Finalizado
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
