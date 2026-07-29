import { useState } from "react";
import { usePosStudies } from "@/hooks/use-pos-studies";
import { 
  GraduationCap, Plus, Play, BookOpen, Clock, Trophy, Flame, Target, 
  Trash2, Award, Zap, Brain, Calendar as CalendarIcon, CheckCircle2,
  ChevronDown, Search, Filter, LayoutGrid, List as ListIcon,
  ChevronRight, BookMarked, Sparkles, FileText, Library, CheckSquare,
  TrendingUp, BarChart2, Video, PenTool, LayoutTemplate, Layers, AlertCircle,
  MoreVertical, Share2, Star, FolderOpen, ArrowLeft, Download, X
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const KpiCard = ({ icon, label, value, sub }: any) => (
  <div className="bg-[#111113] p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] shadow-lg hover:border-[rgba(255,255,255,0.1)] transition-colors flex flex-col">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 bg-white/5 rounded-lg">{icon}</div>
      <span className="text-[10px] uppercase font-bold tracking-widest text-[#71717A] truncate">{label}</span>
    </div>
    <div className="text-xl font-black text-white">{value}</div>
    {sub && <div className="text-[10px] font-bold text-[#A1A1AA] mt-1">{sub}</div>}
  </div>
);

export function PosStudies() {
  const { courses, sessions, loading, addCourse, updateCourse, deleteCourse, addSession } = usePosStudies();
  const [activeTab, setActiveTab] = useState("Visão Geral");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseTab, setCourseTab] = useState("Módulos");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggingSession, setIsLoggingSession] = useState(false);
  const [newSession, setNewSession] = useState({
    duration_minutes: 60,
    module_name: '',
    class_name: '',
    summary: ''
  });

  const initialCourseState = {
    title: "", knowledge_area: "Tecnologia", category: "Programação", platform: "", instructor: "", course_url: "",
    total_hours: 0, deadline: "", level: "intermediario"
  };
  const [newCourse, setNewCourse] = useState(initialCourseState);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title) return;
    const coursePayload: any = { ...newCourse };
    if (!coursePayload.deadline) {
      delete coursePayload.deadline;
    }
    
    if (isEditingCourse && selectedCourseId) {
      await updateCourse(selectedCourseId, coursePayload);
    } else {
      await addCourse(coursePayload);
    }
    setIsCreatingCourse(false);
    setIsEditingCourse(false);
    setNewCourse(initialCourseState);
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    
    await addSession({
        course_id: selectedCourseId,
        session_date: format(new Date(), 'yyyy-MM-dd'),
        duration_minutes: newSession.duration_minutes,
        module_name: newSession.module_name,
        class_name: newSession.class_name,
        summary: newSession.summary
    });
    
    setIsLoggingSession(false);
    setNewSession({ duration_minutes: 60, module_name: '', class_name: '', summary: '' });
  };

  const totalXP = sessions.reduce((acc, s) => acc + (s.xp_earned || 0), 0);
  const userLevel = Math.floor(Math.sqrt(Math.max(0, totalXP) / 100)) + 1;
  const currentLevelXP = Math.pow(userLevel - 1, 2) * 100;
  const nextLevelXP = Math.pow(userLevel, 2) * 100;
  const levelProgress = Math.min(100, Math.max(0, Math.round(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100))) || 0;

  const totalHours = Number(courses.reduce((acc, c) => acc + (c.completed_hours || 0), 0).toFixed(1));
  const activeCoursesCount = courses.filter(c => c.status !== 'concluido').length;
  const completedCoursesCount = courses.filter(c => c.status === 'concluido').length;

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const activeCourses = courses.filter(c => c.status !== 'concluido');
  const recentCourses = activeCourses.slice(0, 3);

  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Superior KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <KpiCard icon={<Zap className="size-4 text-cyan-400"/>} label="Nível" value={`Lvl ${userLevel}`} />
        <KpiCard icon={<Trophy className="size-4 text-yellow-400"/>} label="XP Total" value={totalXP} sub="Evolução Contínua" />
        <KpiCard icon={<Clock className="size-4 text-emerald-400"/>} label="Horas" value={`${totalHours}h`} sub="Estudadas" />
        <KpiCard icon={<Flame className="size-4 text-rose-500"/>} label="Sessões" value={sessions.length} sub="Registros" />
        <KpiCard icon={<BookOpen className="size-4 text-blue-400"/>} label="Ativos" value={activeCoursesCount} sub="Cursos" />
        <KpiCard icon={<Award className="size-4 text-purple-400"/>} label="Concluídos" value={completedCoursesCount} sub="Cursos" />
        <KpiCard icon={<Library className="size-4 text-orange-400"/>} label="Média" value="N/A" sub="Desempenho" />
        <KpiCard icon={<TrendingUp className="size-4 text-indigo-400"/>} label="Meta" value="60h" sub="Neste Mês" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Card de Evolução */}
        <div className="xl:col-span-2 bg-[#111113] rounded-3xl p-6 md:p-8 border border-[rgba(255,255,255,0.04)] shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[240px]">
          <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
            <Brain className="size-64 text-cyan-500" />
          </div>
          <div className="relative z-10 w-full max-w-2xl">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target className="size-5 text-rose-500" /> Meta de Evolução
                </h3>
                <p className="text-sm text-[#A1A1AA] mt-1">Evolua seu personagem consumindo conhecimento.</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-cyan-400">{totalXP}</span>
                <span className="text-sm font-bold text-[#A1A1AA]"> / {nextLevelXP} XP</span>
              </div>
            </div>
            
            <div className="h-4 w-full bg-[#1A1A1E] rounded-full overflow-hidden mb-2 border border-white/5 shadow-inner relative">
              <div 
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                style={{ width: `${levelProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-bold text-[#71717A] uppercase tracking-widest">
              <span>{levelProgress}% Concluído</span>
              <span>Nível {userLevel + 1} em breve</span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
               <div className="bg-[#1A1A1E] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                 <div>
                   <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Meta Mensal de Horas</div>
                   <div className="text-lg font-bold text-white mt-1">42h <span className="text-xs text-[#A1A1AA]">/ 60h</span></div>
                 </div>
                 <div className="size-10 rounded-full border-4 border-emerald-500/20 flex items-center justify-center border-t-emerald-500">
                    <span className="text-xs font-bold text-emerald-500">70%</span>
                 </div>
               </div>
               <div className="bg-[#1A1A1E] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                 <div>
                   <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Disciplinas Concluídas</div>
                   <div className="text-lg font-bold text-white mt-1">3 <span className="text-xs text-[#A1A1AA]">/ 8</span></div>
                 </div>
                 <div className="size-10 rounded-full border-4 border-rose-500/20 flex items-center justify-center border-t-rose-500">
                    <span className="text-xs font-bold text-rose-500">37%</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Insights & Metas */}
        <div className="bg-[#111113] rounded-3xl p-6 border border-[rgba(255,255,255,0.04)] shadow-xl flex flex-col">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-yellow-400" /> Insights & Lembretes
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
             <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-start">
               <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
               <div>
                 <div className="text-xs font-bold text-rose-400">Prova de Algoritmos</div>
                 <div className="text-[10px] text-rose-500/70 mt-0.5">Faltam 3 dias. Revise Árvores Binárias.</div>
               </div>
             </div>
             <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex gap-3 items-start">
               <TrendingUp className="size-4 text-cyan-500 shrink-0 mt-0.5" />
               <div>
                 <div className="text-xs font-bold text-cyan-400">Melhor Horário de Estudo</div>
                 <div className="text-[10px] text-cyan-500/70 mt-0.5">Você rende 40% mais entre as 20h e 22h.</div>
               </div>
             </div>
             <div className="p-3 bg-[#1A1A1E] border border-white/5 rounded-xl flex gap-3 items-start">
               <BookMarked className="size-4 text-[#A1A1AA] shrink-0 mt-0.5" />
               <div>
                 <div className="text-xs font-bold text-white">Curso Abandonado?</div>
                 <div className="text-[10px] text-[#A1A1AA] mt-0.5">Você não acessa "React Avançado" há 12 dias.</div>
               </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Continuar Aprendendo (Real Data) */}
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Play className="size-5 text-emerald-500" /> Continuar Aprendendo
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {recentCourses.length === 0 ? (
           <div className="col-span-full p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm">
             Nenhum curso em andamento no momento. Inicie uma trilha!
           </div>
         ) : recentCourses.map((c) => {
           const percent = c.total_hours ? Math.min(100, Math.round((c.completed_hours / c.total_hours) * 100)) : 0;
           return (
             <div key={c.id} onClick={() => setSelectedCourseId(c.id)} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all group cursor-pointer shadow-lg flex flex-col">
               <div className="h-24 w-full relative overflow-hidden bg-gradient-to-br from-[#1A1A1E] to-[#111113] flex items-center justify-center">
                 <div className="absolute inset-0 bg-gradient-to-t from-[#111113] to-transparent z-10"></div>
                 <GraduationCap className="size-10 text-cyan-500/20 group-hover:scale-110 transition-transform duration-500" />
                 <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2">
                   <span className="px-2 py-0.5 bg-black/50 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider">{c.platform || "Plataforma"}</span>
                 </div>
               </div>
               <div className="p-5 flex-1 flex flex-col">
                 <h4 className="font-bold text-white text-lg leading-tight mb-1 line-clamp-2">{c.title}</h4>
                 <p className="text-xs text-[#A1A1AA] mb-4 flex items-center gap-1.5"><PenTool className="size-3" /> {c.instructor || "Professor"}</p>
                 
                 <div className="mt-auto">
                   <div className="flex justify-between items-end mb-2">
                     <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">{c.completed_hours}h / {c.total_hours}h</div>
                     <div className="text-xs font-bold text-cyan-400">{percent}%</div>
                   </div>
                   <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden mb-4">
                     <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percent}%` }}></div>
                   </div>
                   <button onClick={() => {
                     setSelectedCourseId(c.id);
                     setIsLoggingSession(true);
                   }} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-white transition-all flex items-center justify-center gap-2">
                     <Play className="size-3 fill-white" /> Continuar Curso
                   </button>
                 </div>
               </div>
             </div>
           );
         })}
      </div>
    </div>
  );

  const renderCoursesList = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
         <div className="relative w-full max-w-md">
           <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
           <input 
             type="text" 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Buscar cursos, áreas, etc..." 
             className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
           />
         </div>
         <div className="flex gap-2">
           <button className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111113] text-xs font-bold text-white hover:bg-[#1A1A1E] flex items-center gap-2">
             <Filter className="size-3" /> Filtros
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
         {courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.knowledge_area?.toLowerCase().includes(searchQuery.toLowerCase())).map(course => {
            const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
            const isCompleted = course.status === 'concluido';
            return (
              <div 
                key={course.id} 
                onClick={() => setSelectedCourseId(course.id)}
                className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all group cursor-pointer shadow-lg flex flex-col"
              >
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className={cn(
                      "text-[9px] uppercase font-bold px-2 py-1 rounded border tracking-widest",
                      isCompleted ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-cyan-400 border-cyan-400/20 bg-cyan-400/10"
                    )}>
                      {course.knowledge_area}
                    </span>
                    <button className="text-[#71717A] hover:text-white"><MoreVertical className="size-4" /></button>
                  </div>
                  <h4 className="font-bold text-white text-base leading-tight mb-4">{course.title}</h4>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between items-end mb-2">
                      <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">{course.completed_hours}h / {course.total_hours}h</div>
                      <div className="text-xs font-bold text-white">{percent}%</div>
                    </div>
                    <div className="h-1 w-full bg-[#1A1A1E] rounded-full overflow-hidden mb-4">
                      <div className={cn("h-full rounded-full", isCompleted ? "bg-emerald-500" : "bg-cyan-500")} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
         })}
       </div>
    </div>
  );

  const renderCourseDetails = () => {
    if (!selectedCourse) return null;
    const percent = selectedCourse.total_hours ? Math.min(100, Math.round((selectedCourse.completed_hours / selectedCourse.total_hours) * 100)) : 0;
    
    return (
      <div className="animate-in fade-in slide-in-from-right-8 duration-500">
        <button onClick={() => setSelectedCourseId(null)} className="flex items-center gap-2 text-sm font-bold text-[#A1A1AA] hover:text-white mb-6 transition-colors">
          <ArrowLeft className="size-4" /> Voltar para Cursos
        </button>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Content */}
          <div className="flex-1 w-full">
            <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl p-6 md:p-10 shadow-xl mb-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-32 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none"></div>
               <div className="relative z-10">
                 <div className="flex gap-2 mb-4">
                   <span className="px-2.5 py-1 bg-[#1A1A1E] border border-white/5 rounded text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">{selectedCourse.knowledge_area}</span>
                   <span className="px-2.5 py-1 bg-[#1A1A1E] border border-white/5 rounded text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">{selectedCourse.category}</span>
                 </div>
                 <div className="flex justify-between items-start gap-4">
                   <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6 max-w-3xl">
                     {selectedCourse.title}
                   </h1>
                   <div className="flex items-center gap-2 relative z-20">
                     <button 
                       onClick={() => {
                         setNewCourse(selectedCourse as any);
                         setIsEditingCourse(true);
                         setIsCreatingCourse(true);
                       }} 
                       className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-cyan-400 border border-white/5 transition-colors shadow-lg"
                       title="Editar Curso"
                     >
                       <PenTool className="size-4" />
                     </button>
                     <button 
                       onClick={async () => {
                         if (confirm("Tem certeza que deseja excluir este curso?")) {
                           await deleteCourse(selectedCourse.id);
                           setSelectedCourseId(null);
                         }
                       }} 
                       className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-rose-500 border border-white/5 transition-colors shadow-lg"
                       title="Excluir Curso"
                     >
                       <Trash2 className="size-4" />
                     </button>
                   </div>
                 </div>
                 
                 <div className="flex flex-wrap gap-6 mb-8">
                   <div className="flex items-center gap-2 text-sm text-[#A1A1AA]"><PenTool className="size-4 text-cyan-500"/> {selectedCourse.instructor || "Sem instrutor"}</div>
                   <div className="flex items-center gap-2 text-sm text-[#A1A1AA]"><LayoutTemplate className="size-4 text-emerald-500"/> {selectedCourse.platform || "Desconhecida"}</div>
                   <div className="flex items-center gap-2 text-sm text-[#A1A1AA]"><Clock className="size-4 text-rose-500"/> {selectedCourse.total_hours}h totais</div>
                   {selectedCourse.course_url && (
                     <a href={selectedCourse.course_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-cyan-400 hover:underline font-bold z-20 relative">
                       <Play className="size-4"/> Acessar Plataforma
                     </a>
                   )}
                 </div>

                  <div className="flex items-center gap-4 bg-[#1A1A1E] p-4 rounded-2xl border border-white/5 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-[#71717A] uppercase tracking-widest">Progresso Geral</span>
                        <span className="text-sm font-bold text-white">{percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-[#111113] rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                    <button onClick={() => setIsLoggingSession(true)} className="shrink-0 w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all">
                      <Play className="size-4 fill-white" /> Registrar Sessão
                    </button>
                  </div>
               </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-[rgba(255,255,255,0.06)] pb-2 overflow-x-auto hide-scrollbar">
               {["Visão Geral", "Módulos", "Anotações", "Flashcards", "Inteligência Artificial"].map(tab => (
                 <button 
                   key={tab}
                   onClick={() => setCourseTab(tab)}
                   className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap", courseTab === tab ? "bg-white/10 text-white" : "text-[#71717A] hover:text-white")}
                 >
                   {tab === "Inteligência Artificial" ? <span className="flex items-center gap-2"><Sparkles className="size-4 text-cyan-400" /> IA</span> : tab}
                 </button>
               ))}
            </div>

            {/* Sub-tab content real sessions */}
             {courseTab === "Módulos" && (
               <div className="space-y-4">
                  {sessions.filter(s => s.course_id === selectedCourse.id).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm">
                       Nenhuma sessão registrada. Clique em "Registrar Sessão" para anotar seu progresso.
                    </div>
                  ) : sessions.filter(s => s.course_id === selectedCourse.id).map(session => (
                    <div key={session.id} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                        <h4 className="font-bold text-white text-base md:text-lg">{session.class_name || 'Sessão sem título'}</h4>
                        <div className="flex items-center gap-2 shrink-0">
                           <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">+{session.xp_earned} XP</span>
                           <span className="text-xs font-bold text-[#A1A1AA] bg-[#1A1A1E] px-2 py-1 rounded">{session.duration_minutes}m</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                         {session.module_name && (
                           <div className="flex items-center gap-2 text-xs text-[#71717A] uppercase tracking-widest font-bold">
                             <Layers className="size-3" /> Módulo: {session.module_name}
                           </div>
                         )}
                         {session.summary && (
                           <div className="bg-[#1A1A1E] p-4 rounded-xl border border-[rgba(255,255,255,0.02)] text-sm text-[#A1A1AA] leading-relaxed">
                             {session.summary}
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
               </div>
             )}

            {courseTab === "Inteligência Artificial" && (
              <div className="grid grid-cols-2 gap-4">
                <button className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 p-6 rounded-3xl hover:border-cyan-500/50 transition-all text-left group">
                  <div className="size-10 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-110 transition-transform"><FileText className="size-5" /></div>
                  <h4 className="font-bold text-white mb-2">Resumir Aula</h4>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">Gera um resumo automático e estruturado com os pontos principais da última aula assistida.</p>
                </button>
                <button className="bg-gradient-to-br from-rose-900/30 to-purple-900/30 border border-rose-500/20 p-6 rounded-3xl hover:border-rose-500/50 transition-all text-left group">
                  <div className="size-10 bg-rose-500/20 rounded-xl flex items-center justify-center mb-4 text-rose-400 group-hover:scale-110 transition-transform"><Layers className="size-5" /></div>
                  <h4 className="font-bold text-white mb-2">Criar Flashcards</h4>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">Extrai conceitos chave e gera flashcards para revisão espaçada (Anki style).</p>
                </button>
                <button className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 p-6 rounded-3xl hover:border-emerald-500/50 transition-all text-left group">
                  <div className="size-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition-transform"><CheckSquare className="size-5" /></div>
                  <h4 className="font-bold text-white mb-2">Gerar Quiz</h4>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">Cria 5 questões de múltipla escolha para validar seu entendimento do módulo atual.</p>
                </button>
                <button className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/20 p-6 rounded-3xl hover:border-yellow-500/50 transition-all text-left group">
                  <div className="size-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4 text-yellow-400 group-hover:scale-110 transition-transform"><Target className="size-5" /></div>
                  <h4 className="font-bold text-white mb-2">Plano de Estudos</h4>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">Monta um cronograma ideal para finalizar o curso com base no seu ritmo de aprendizado.</p>
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
             <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Informações</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">Status</div>
                    <div className="text-sm font-bold text-white capitalize">{selectedCourse.status}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">Último Acesso</div>
                    <div className="text-sm font-bold text-white">Hoje, 14:30</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">Tempo Restante</div>
                    <div className="text-sm font-bold text-white">{selectedCourse.total_hours ? selectedCourse.total_hours - selectedCourse.completed_hours : 0}h estimadas</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">XP Recebido</div>
                    <div className="text-sm font-bold text-cyan-400">+1250 XP</div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                   <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-colors">
                     <Download className="size-4" /> Certificado (Bloqueado)
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-24 text-white font-sans">
      
      {/* HERO HEADER */}
      <div className="flex flex-col gap-4 bg-[#0A0A0A] p-6 md:p-10 rounded-3xl border border-[rgba(255,255,255,0.04)] shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute -top-20 -right-20 p-32 bg-cyan-500/10 blur-[100px] w-96 h-96 rounded-full pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 z-10 relative">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <GraduationCap className="size-8 md:size-10 text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
              Academia Operacional
            </h1>
            <p className="text-sm md:text-base text-[#A1A1AA] mt-3 max-w-xl leading-relaxed">
              Gerencie cursos, faculdade, certificações e toda sua evolução acadêmica. Um verdadeiro sistema operacional para seus estudos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative group">
               <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all shadow-lg">
                 <Plus className="size-4" /> Novo <ChevronDown className="size-4 opacity-50" />
               </button>
               {/* Dropdown menu mock */}
               <div className="absolute right-0 top-full mt-2 w-56 bg-[#111113] border border-[#222] rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 transform origin-top-right scale-95 group-hover:scale-100">
                  <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">📘 Curso</button>
                  <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">🎓 Faculdade</button>
                  <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">📜 Certificação</button>
                  <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">🗺️ Trilha</button>
                  <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">📚 Disciplina</button>
                  <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">🔬 Projeto Acadêmico</button>
               </div>
            </div>
            <button 
              onClick={() => setIsCreatingCourse(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus className="size-4" /> Novo Curso
            </button>
          </div>
        </div>

        {/* TABS NAVEGAÇÃO */}
        <div className="flex items-center gap-1 overflow-x-auto pt-4 mt-4 border-t border-[rgba(255,255,255,0.04)] hide-scrollbar z-10 relative">
          {["Visão Geral", "Cursos", "Faculdade", "Certificações", "Trilhas", "Projetos", "Concluídos"].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedCourseId(null); }}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                activeTab === tab ? "bg-white/10 text-white shadow-md" : "text-[#71717A] hover:text-white hover:bg-white/5"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* MODAL CRIAÇÃO REAL */}
      {isCreatingCourse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleCreateCourse} className="bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-3xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button type="button" onClick={() => { setIsCreatingCourse(false); setIsEditingCourse(false); setNewCourse(initialCourseState); }} className="absolute top-6 right-6 text-[#71717A] hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="size-4"/></button>
            <h3 className="text-xl font-bold text-white mb-6 border-b border-[rgba(255,255,255,0.06)] pb-4 flex items-center gap-2">
               <BookOpen className="size-5 text-cyan-500" /> {isEditingCourse ? "Editar Curso" : "Cadastrar Novo Curso"}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Nome do Curso / Trilha</label>
                <input 
                  type="text" required value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: Formação Node.js Avançada"
                />
              </div>
              
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Plataforma</label>
                <input 
                  type="text" value={newCourse.platform} onChange={e => setNewCourse({...newCourse, platform: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: Udemy, Rocketseat..."
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Professor</label>
                <input 
                  type="text" value={newCourse.instructor} onChange={e => setNewCourse({...newCourse, instructor: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Nome do Instrutor"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Área</label>
                <select 
                  value={newCourse.knowledge_area} onChange={e => setNewCourse({...newCourse, knowledge_area: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                >
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="Negócios">Negócios</option>
                  <option value="Finanças">Finanças</option>
                  <option value="Idiomas">Idiomas</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Carga Horária Estimada (h)</label>
                <input 
                  type="number" min="1" required value={newCourse.total_hours || ''} onChange={e => setNewCourse({...newCourse, total_hours: Number(e.target.value)})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: 40"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Link de Acesso (URL)</label>
                <input 
                  type="url" value={newCourse.course_url} onChange={e => setNewCourse({...newCourse, course_url: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="https://"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-4 border-t border-[rgba(255,255,255,0.06)] pt-6">
              <button type="button" onClick={() => { setIsCreatingCourse(false); setIsEditingCourse(false); setNewCourse(initialCourseState); }} className="px-6 py-3 rounded-xl text-sm font-bold text-[#A1A1AA] hover:bg-white/5 transition-colors">Cancelar</button>
              <button type="submit" className="px-8 py-3 rounded-xl text-sm font-bold bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2">
                 Salvar Curso <ChevronRight className="size-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTENT ROUTING */}
      {selectedCourseId ? (
         renderCourseDetails()
      ) : activeTab === "Visão Geral" ? (
         renderDashboard()
      ) : activeTab === "Cursos" ? (
         renderCoursesList()
      ) : (
         <div className="p-20 text-center flex flex-col items-center justify-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-3xl bg-[#111113]">
            <Layers className="size-16 text-[#333] mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Módulo em Desenvolvimento</h2>
            <p className="text-[#71717A] max-w-md mx-auto">A aba "{activeTab}" está recebendo melhorias para suportar o novo design system. Em breve ela estará disponível com integrações avançadas.</p>
         </div>
      )}

      {/* MODAL REGISTRO DE SESSÃO */}
      {isLoggingSession && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
          <form onSubmit={handleLogSession} className="bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-t-3xl sm:rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-lg relative animate-in slide-in-from-bottom duration-300">
            <button type="button" onClick={() => setIsLoggingSession(false)} className="absolute top-6 right-6 text-[#71717A] hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="size-4"/></button>
            <h3 className="text-xl font-bold text-white mb-6 border-b border-[rgba(255,255,255,0.06)] pb-4 flex items-center gap-2">
               <FileText className="size-5 text-cyan-500" /> Registrar Sessão de Estudo
            </h3>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Módulo (Opcional)</label>
                   <input 
                     type="text" value={newSession.module_name} onChange={e => setNewSession({...newSession, module_name: e.target.value})}
                     className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                     placeholder="Ex: Módulo 1"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Duração (Minutos)</label>
                   <input 
                     type="number" min="1" required value={newSession.duration_minutes || ''} onChange={e => setNewSession({...newSession, duration_minutes: Number(e.target.value)})}
                     className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                     placeholder="Ex: 60"
                   />
                 </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Nome da Aula / Tópico</label>
                <input 
                  type="text" required value={newSession.class_name} onChange={e => setNewSession({...newSession, class_name: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: Introdução a Componentes"
                />
              </div>
              
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Anotações / Resumo</label>
                <textarea 
                  value={newSession.summary} onChange={e => setNewSession({...newSession, summary: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors min-h-[120px] custom-scrollbar"
                  placeholder="O que você aprendeu hoje? Faça um resumo..."
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2">
                 Salvar Sessão e Ganhar XP <Trophy className="size-4" />
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
