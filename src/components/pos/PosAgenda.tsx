import { useState, useEffect } from "react";
import { usePosAgenda } from "@/hooks/use-pos-agenda";
import { usePosTasks } from "@/hooks/use-pos-tasks";
import { usePosHabits } from "@/hooks/use-pos-habits";
import { usePosLibrary } from "@/hooks/use-pos-library";
import { usePosStudies } from "@/hooks/use-pos-studies";
import {
  Calendar as CalendarIcon, Clock, Plus, Video, Briefcase, 
  MapPin, CheckCircle2, Circle, Trash2, ChevronLeft, ChevronRight,
  Coffee, CalendarDays, X, Search, Repeat, Flame, BookOpen, GraduationCap, Gift, Settings, Cloud, RefreshCw, ExternalLink
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO, isToday, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PosHeatmap } from "./PosHeatmap";

export function PosAgenda() {
  const { events, addEvent, updateEvent, deleteEvent, loading: loadingEvents } = usePosAgenda();
  const { tasks, updateTask, loading: loadingTasks } = usePosTasks();
  const { habits, logs: habitLogs } = usePosHabits();
  const { books, sessions: readingSessions } = usePosLibrary();
  const { courses, sessions: studySessions } = usePosStudies();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreating, setIsCreating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Google Integrations
  const [gasUrl, setGasUrl] = useState(localStorage.getItem('gas_integration_url') || '');
  const [tempUrl, setTempUrl] = useState(gasUrl);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [googleTasks, setGoogleTasks] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (gasUrl) {
       syncGoogleData();
    }
  }, [gasUrl]);

  const syncGoogleData = async () => {
    if (!gasUrl) return;
    setIsSyncing(true);
    try {
      const response = await fetch(gasUrl);
      const data = await response.json();
      if (data.events) setGoogleEvents(data.events);
      if (data.tasks) setGoogleTasks(data.tasks);
      toast.success("Agenda sincronizada com o Google!");
    } catch (err) {
      console.error("Erro ao sincronizar com Google:", err);
      toast.error("Falha ao puxar dados do Google. Verifique a URL do Apps Script.");
    } finally {
      setIsSyncing(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportAllToGoogle = async () => {
     if (!gasUrl) {
       toast.error("Configure a integração primeiro.");
       return;
     }
     setIsExporting(true);
     
     const todayStr = format(new Date(), 'yyyy-MM-dd');
     
     const futureEvents = events.filter(e => e.event_date && e.event_date >= todayStr);
     
     if (futureEvents.length === 0) {
        toast.info("Nenhum evento futuro (a partir de hoje) para exportar.");
        setIsExporting(false);
        return;
     }

     toast.info(`Iniciando exportação de ${futureEvents.length} eventos para o Google...`);
     
     let successCount = 0;
     for (const e of futureEvents) {
        try {
           const startDate = new Date(`${e.event_date}T${e.start_time || '00:00'}:00`);
           const endDate = new Date(`${e.event_date}T${e.end_time || '23:59'}:00`);
           
           const url = new URL(gasUrl);
           url.searchParams.append('action', 'createEvent');
           url.searchParams.append('title', e.title);
           if(e.description) url.searchParams.append('description', e.description);
           url.searchParams.append('start', startDate.toISOString());
           url.searchParams.append('end', endDate.toISOString());
           
           const response = await fetch(url.toString());
           const result = await response.json();
           
           if (result.success) {
             successCount++;
           } else {
             console.error("Script error:", result);
             toast.error(`Erro do Google: ${result.error || 'Desconhecido'}`);
           }
           
           await new Promise(r => setTimeout(r, 600)); // Delay p/ não travar o Google
        } catch (err) {
           console.error("Erro exportando evento:", err);
        }
     }
     
     toast.success(`${successCount} eventos exportados com sucesso! Verifique seu celular.`);
     setIsExporting(false);
     setTimeout(syncGoogleData, 2000);
  };

  const handleSaveConfig = () => {
    localStorage.setItem('gas_integration_url', tempUrl);
    setGasUrl(tempUrl);
    setShowConfig(false);
  };
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: "09:00",
    end_time: "10:00",
    type: "reuniao",
    status: "agendado"
  });

  // Switch states
  const [syncGoogle, setSyncGoogle] = useState(false);
  const [syncMeet, setSyncMeet] = useState(false);
  const [repeatEvent, setRepeatEvent] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) return;
    
    const payload: any = { ...newEvent };
    if (!payload.start_time) delete payload.start_time;
    if (!payload.end_time) delete payload.end_time;
    
    await addEvent(payload);

    if (syncGoogle && gasUrl) {
       try {
         const startDate = new Date(`${payload.event_date}T${payload.start_time || '00:00'}:00`);
         const endDate = new Date(`${payload.event_date}T${payload.end_time || '23:59'}:00`);
         
         const url = new URL(gasUrl);
         url.searchParams.append('action', 'createEvent');
         url.searchParams.append('title', payload.title);
         if(payload.description) url.searchParams.append('description', payload.description);
         url.searchParams.append('start', startDate.toISOString());
         url.searchParams.append('end', endDate.toISOString());

         fetch(url.toString()).then(async (res) => {
            const data = await res.json();
            if (data.success) {
               toast.success("Evento enviado para o Google Agenda!");
            } else {
               toast.error(`Google recusou: ${data.error || 'Erro interno no Apps Script'}`);
            }
            setTimeout(syncGoogleData, 2000); // refresh after brief delay
         }).catch(err => {
            console.error(err);
            toast.error("Ocorreu um erro ao enviar para o Google Agenda.");
         });
       } catch (err) {
         console.error("Erro ao montar URL pro Google:", err);
         toast.error("Ocorreu um erro ao preparar o envio.");
       }
    }
    
    setIsCreating(false);
    setNewEvent({...newEvent, title: "", description: ""});
    setSyncGoogle(false);
  };

  const getSafeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return parseISO(`${dateStr.split('T')[0]}T12:00:00`);
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const getDayItems = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    
    const dayEvents = events.filter(e => e.event_date === dayStr).map(e => ({
      ...e,
      itemType: 'evento'
    }));
    
    const dayTasks = tasks.filter(t => {
      const d = getSafeDate(t.deadline);
      return d && isSameDay(d, date);
    }).map(t => ({
      ...t,
      itemType: 'tarefa',
      start_time: t.due_time || '23:59', // put at end of day if no time
      type: t.category || 'tarefa'
    }));

    const dayHabits = habitLogs.filter(l => l.log_date === dayStr).map(l => {
      const habit = habits.find(h => h.id === l.habit_id);
      return {
        id: `habit_${l.id}`,
        title: habit ? habit.title : 'Hábito',
        start_time: '23:59',
        itemType: 'habito',
        type: 'habito',
        status: l.status,
      };
    });

    const dayReading = readingSessions.filter(s => s.session_date === dayStr).map(s => {
      const book = books.find(b => b.id === s.book_id);
      return {
        id: `read_${s.id}`,
        title: book ? `Leitura: ${book.title}` : 'Sessão de Leitura',
        start_time: s.start_time || '23:59',
        itemType: 'leitura',
        type: 'leitura'
      };
    });

    const dayStudies = studySessions.filter(s => s.session_date === dayStr).map(s => {
      const course = courses.find(c => c.id === s.course_id);
      return {
        id: `study_${s.id}`,
        title: course ? `Estudo: ${course.title}` : 'Sessão de Estudo',
        start_time: s.start_time || '23:59',
        itemType: 'curso',
        type: 'curso'
      };
    });

    const dayGoogleEvents = googleEvents.filter(e => {
       if (!e.start_time) return false;
       return e.start_time.startsWith(dayStr);
    }).map(e => ({
       ...e,
       id: `g_event_${e.id}`,
       itemType: 'evento_google',
       type: 'reuniao',
       start_time: e.is_all_day ? '00:00' : e.start_time.split('T')[1]?.substring(0,5) || '12:00'
    }));

    const dayGoogleTasks = googleTasks.filter(t => {
       if (!t.due) return false;
       return t.due.startsWith(dayStr);
    }).map(t => ({
       ...t,
       id: `g_task_${t.id}`,
       itemType: 'tarefa_google',
       type: 'tarefa',
       start_time: '23:59'
    }));

    // @ts-ignore
    const merged = [...dayEvents, ...dayTasks, ...dayHabits, ...dayReading, ...dayStudies, ...dayGoogleEvents, ...dayGoogleTasks].sort((a: any, b: any) => {
      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    return merged;
  };

  const getTypeIcon = (itemType: string, type: string) => {
    if (itemType === 'tarefa') return <CheckCircle2 className="size-3" />;
    if (itemType === 'habito') return <Flame className="size-3" />;
    if (itemType === 'leitura') return <BookOpen className="size-3" />;
    if (itemType === 'curso') return <GraduationCap className="size-3" />;
    if (itemType === 'evento_google') return <CalendarDays className="size-3 text-blue-400" />;
    if (itemType === 'tarefa_google') return <CheckCircle2 className="size-3 text-emerald-400" />;
    if (type === 'aniversario') return <Gift className="size-3" />;
    if (type === 'reuniao' || type === 'call') return <Video className="size-3" />;
    if (type === 'foco' || type === 'deepwork') return <Briefcase className="size-3" />;
    if (type === 'pessoal') return <Coffee className="size-3" />;
    return <CalendarIcon className="size-3" />;
  };

  const getTypeColor = (itemType: string, type: string) => {
    if (itemType === 'tarefa') return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    if (itemType === 'habito') return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    if (itemType === 'leitura') return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
    if (itemType === 'curso') return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
    if (itemType === 'evento_google') return "text-blue-400 bg-blue-500/10 border-blue-500/30 shadow-[inset_0_1px_3px_rgba(59,130,246,0.2)]";
    if (itemType === 'tarefa_google') return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[inset_0_1px_3px_rgba(16,185,129,0.2)]";
    if (type === 'aniversario') return "text-pink-400 bg-pink-400/10 border-pink-400/20";
    if (type === 'reuniao' || type === 'call') return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    if (type === 'foco' || type === 'deepwork') return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    if (type === 'pessoal') return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    return "text-[#A1A1AA] bg-[#1A1A1E] border-[rgba(255,255,255,0.06)]";
  };

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Agenda Inteligente</h1>
          <p className="text-[#A1A1AA] mt-1 text-sm">Visão unificada de compromissos e prazos operacionais.</p>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-1">
            <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-2 text-[#71717A] hover:text-white rounded-lg hover:bg-[#1A1A1E] transition-colors"><ChevronLeft className="size-4" /></button>
            <span className="text-xs font-bold uppercase tracking-widest text-white px-2">
              {format(weekStart, "dd MMM", {locale: ptBR})} - {format(addDays(weekStart, 6), "dd MMM", {locale: ptBR})}
            </span>
            <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-2 text-[#71717A] hover:text-white rounded-lg hover:bg-[#1A1A1E] transition-colors"><ChevronRight className="size-4" /></button>
          </div>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#A1A1AA] hover:text-white bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl hover:bg-[#1A1A1E] transition-colors">
            Hoje
          </button>
          <div className="flex gap-2 border-l border-white/10 pl-4 ml-2">
            <button 
              onClick={() => setShowConfig(true)}
              className="size-10 rounded-xl bg-[#111113] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1E] transition-colors"
              title="Configurar Integração Google"
            >
              <Settings className="size-4" />
            </button>
            {gasUrl && (
              <button 
                onClick={syncGoogleData}
                disabled={isSyncing}
                className={cn("size-10 rounded-xl border flex items-center justify-center transition-colors", isSyncing ? "bg-blue-500/20 border-blue-500/40 text-blue-400 cursor-not-allowed" : "bg-[#111113] border-[rgba(255,255,255,0.06)] text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1E]")}
                title="Sincronizar Google"
              >
                <RefreshCw className={cn("size-4", isSyncing && "animate-spin")} />
              </button>
            )}
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(225,29,72,0.2)] hover:bg-rose-500 transition-colors"
            >
              <Plus className="size-4" /> Novo
            </button>
          </div>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-[90vw] h-[90vh] max-w-[1200px] bg-[#070707] border border-[rgba(255,255,255,0.06)] rounded-[28px] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="h-[88px] md:h-[96px] px-8 border-b border-[rgba(255,255,255,0.05)] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-[14px] bg-[#EEF4FF] flex items-center justify-center shrink-0">
                  <CalendarIcon className="size-6 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="text-[24px] font-bold text-white leading-tight">Novo Compromisso</h3>
                  <p className="text-[15px] font-normal text-[#A1A1AA]">Agende um novo evento</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCreating(false)} 
                className="size-10 rounded-full bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] flex items-center justify-center transition-colors shrink-0"
              >
                <X className="size-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <form onSubmit={handleCreate} className="h-full flex flex-col">
                <div className="flex flex-col lg:flex-row gap-10 flex-1">
                  
                  {/* Left Column (65%) */}
                  <div className="w-full lg:w-[65%] flex flex-col gap-7">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-1.5 rounded-full bg-[#3B82F6]" />
                      <h4 className="text-[13px] font-semibold uppercase tracking-wider text-[#CFCFCF]">Informações Básicas</h4>
                    </div>

                    <div className="flex flex-col gap-[10px]">
                      <label className="text-[13px] font-semibold uppercase text-[#71717A]">Descrição</label>
                      <input 
                        required 
                        type="text" 
                        value={newEvent.title} 
                        onChange={e=>setNewEvent({...newEvent, title: e.target.value})} 
                        className="h-[52px] w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] px-[18px] text-[16px] font-medium text-white placeholder-[#71717A] outline-none transition-colors" 
                        placeholder="Ex: Reunião com cliente" 
                      />
                    </div>

                    <div className="flex flex-col gap-[10px]">
                      <label className="text-[13px] font-semibold uppercase text-[#71717A]">Data</label>
                      <div className="relative">
                        <div className="absolute left-[18px] top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none">
                          <CalendarIcon className="size-5" />
                        </div>
                        <input 
                          required 
                          type="date" 
                          value={newEvent.event_date} 
                          onChange={e=>setNewEvent({...newEvent, event_date: e.target.value})} 
                          className="h-[52px] w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] pl-[50px] pr-[18px] text-[16px] font-medium text-white outline-none transition-colors dark-date-input" 
                        />
                      </div>
                    </div>

                    <div className="flex gap-7">
                      <div className="flex flex-col gap-[10px] w-1/2">
                        <label className="text-[13px] font-semibold uppercase text-[#71717A]">Início</label>
                        <div className="relative">
                          <input 
                            type="time" 
                            value={newEvent.start_time} 
                            onChange={e=>setNewEvent({...newEvent, start_time: e.target.value})} 
                            className="h-[52px] w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] px-[18px] text-[16px] font-medium text-white outline-none transition-colors dark-time-input" 
                          />
                          <div className="absolute right-[18px] top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none">
                            <Clock className="size-5" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-[10px] w-1/2">
                        <label className="text-[13px] font-semibold uppercase text-[#71717A]">Término</label>
                        <div className="relative">
                          <input 
                            type="time" 
                            value={newEvent.end_time} 
                            onChange={e=>setNewEvent({...newEvent, end_time: e.target.value})} 
                            className="h-[52px] w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] px-[18px] text-[16px] font-medium text-white outline-none transition-colors dark-time-input" 
                          />
                          <div className="absolute right-[18px] top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none">
                            <Clock className="size-5" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-[10px] mt-2">
                      <label className="text-[13px] font-semibold uppercase text-[#71717A]">Tipo</label>
                      <select 
                        value={newEvent.type} 
                        onChange={e=>setNewEvent({...newEvent, type: e.target.value})} 
                        className="h-[52px] w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] px-[18px] text-[16px] font-medium text-white outline-none transition-colors appearance-none"
                      >
                        <option value="reuniao">Reunião</option>
                        <option value="call">Call / Alinhamento</option>
                        <option value="foco">Trabalho Focado</option>
                        <option value="pessoal">Pessoal</option>
                        <option value="aniversario">Aniversário</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Column (35%) */}
                  <div className="w-full lg:w-[35%] flex flex-col gap-6">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="size-1.5 rounded-full bg-[#3B82F6]" />
                      <h4 className="text-[13px] font-semibold uppercase tracking-wider text-[#CFCFCF]">Opções Adicionais</h4>
                    </div>

                    <div className="flex flex-col gap-6">
                      {/* Lembrete */}
                      <div className="bg-[#1C1C1F] rounded-[18px] p-[18px] border border-[rgba(255,255,255,0.05)] flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
                            <Clock className="size-5" />
                          </div>
                          <div>
                            <h5 className="text-[16px] font-semibold text-white">Lembrete</h5>
                          </div>
                        </div>
                        <select className="h-[42px] w-full bg-[#232326] border border-transparent rounded-[12px] px-3 text-[14px] font-medium text-white outline-none transition-colors appearance-none mt-1">
                          <option>30 minutos antes</option>
                          <option>1 hora antes</option>
                          <option>1 dia antes</option>
                        </select>
                      </div>

                      {/* Vincular Pessoas */}
                      <div className="bg-[#1C1C1F] rounded-[18px] p-[18px] border border-[#3B82F6] flex flex-col gap-3">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="p-2 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
                            <Briefcase className="size-5" />
                          </div>
                          <div>
                            <h5 className="text-[16px] font-semibold text-white">Vincular Pessoas</h5>
                          </div>
                        </div>
                        <p className="text-[14px] font-normal text-[#A1A1AA]">Nenhuma pessoa vinculada.</p>
                        <div className="relative mt-1">
                          <input 
                            type="text" 
                            placeholder="Busque por nome ou documento" 
                            className="h-[42px] w-full bg-[#2A2A2D] border border-transparent focus:border-[#3B82F6] rounded-[12px] pl-[14px] pr-10 text-[14px] font-medium text-white placeholder-[#71717A] outline-none transition-colors" 
                          />
                          <div className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none">
                            <Search className="size-4" />
                          </div>
                        </div>
                      </div>

                      {/* Google Agenda */}
                      <div className="bg-[#1C1C1F] rounded-[18px] p-[18px] border border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[#22C55E]/10 text-[#22C55E]">
                            <CalendarIcon className="size-5" />
                          </div>
                          <div>
                            <h5 className="text-[16px] font-semibold text-white">Google Agenda</h5>
                            <p className="text-[14px] font-normal text-[#A1A1AA]">Sincronize este compromisso.</p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSyncGoogle(!syncGoogle)}
                          className={cn("w-[44px] h-[24px] rounded-full relative transition-colors duration-200 shrink-0", syncGoogle ? "bg-[#3B82F6]" : "bg-[#4A4A4A]")}
                        >
                          <div className={cn("size-[20px] rounded-full bg-white absolute top-[2px] transition-transform duration-200", syncGoogle ? "translate-x-[22px]" : "translate-x-[2px]")} />
                        </button>
                      </div>

                      {/* Google Meet */}
                      <div className="bg-[#1C1C1F] rounded-[18px] p-[18px] border border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[#14B8A6]/10 text-[#14B8A6]">
                            <Video className="size-5" />
                          </div>
                          <div>
                            <h5 className="text-[16px] font-semibold text-white">Google Meet</h5>
                            <p className="text-[14px] font-normal text-[#A1A1AA]">Gerar link de reunião.</p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSyncMeet(!syncMeet)}
                          className={cn("w-[44px] h-[24px] rounded-full relative transition-colors duration-200 shrink-0", syncMeet ? "bg-[#3B82F6]" : "bg-[#4A4A4A]")}
                        >
                          <div className={cn("size-[20px] rounded-full bg-white absolute top-[2px] transition-transform duration-200", syncMeet ? "translate-x-[22px]" : "translate-x-[2px]")} />
                        </button>
                      </div>

                      {/* Repetir */}
                      <div className="bg-[#1C1C1F] rounded-[18px] p-[18px] border border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6]">
                            <Repeat className="size-5" />
                          </div>
                          <div>
                            <h5 className="text-[16px] font-semibold text-white">Repetir</h5>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setRepeatEvent(!repeatEvent)}
                          className={cn("w-[44px] h-[24px] rounded-full relative transition-colors duration-200 shrink-0", repeatEvent ? "bg-[#3B82F6]" : "bg-[#4A4A4A]")}
                        >
                          <div className={cn("size-[20px] rounded-full bg-white absolute top-[2px] transition-transform duration-200", repeatEvent ? "translate-x-[22px]" : "translate-x-[2px]")} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer / Submit */}
                <div className="mt-8 flex justify-end shrink-0 pt-4 pb-2">
                  <button 
                    type="submit" 
                    className="h-[46px] px-7 bg-[#171717] hover:bg-[#232323] border border-[rgba(255,255,255,0.08)] rounded-[14px] text-white font-medium flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="size-5" /> Salvar Compromisso
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-[90vw] max-w-lg bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-[24px] shadow-2xl p-6 relative">
            <button onClick={() => setShowConfig(false)} className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white"><X className="size-5" /></button>
            <div className="flex items-center gap-4 mb-6">
              <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Cloud className="size-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Integração Google</h3>
                <p className="text-sm text-[#A1A1AA]">Agenda & Tarefas</p>
              </div>
            </div>
            
            <div className="mb-6 space-y-4">
               <p className="text-sm text-[#E4E4E7]">
                 Para habilitar a integração, cole abaixo a URL do seu aplicativo da Web do Google Apps Script configurado para buscar seus eventos e tarefas.
               </p>
               <input 
                 type="text" 
                 value={tempUrl}
                 onChange={e => setTempUrl(e.target.value)}
                 placeholder="https://script.google.com/macros/s/.../exec"
                 className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
               />
               <a href="#" className="text-blue-400 text-xs hover:underline flex items-center gap-1">
                  Ler instruções de implantação <ExternalLink className="size-3" />
               </a>
            </div>

            <div className="flex flex-col gap-3">
               {gasUrl && (
                  <button 
                    onClick={exportAllToGoogle} 
                    disabled={isExporting}
                    className={cn("w-full py-3 rounded-xl text-sm font-bold shadow-lg transition-colors border", isExporting ? "bg-[#1A1A1E] text-[#A1A1AA] border-[rgba(255,255,255,0.05)] cursor-wait" : "bg-[#111113] border-blue-500/30 text-blue-400 hover:bg-blue-500/10")}
                  >
                     {isExporting ? "Exportando para o Google..." : "Exportar Eventos Antigos para o Google"}
                  </button>
               )}
               <div className="flex justify-end gap-3 mt-2 border-t border-[rgba(255,255,255,0.05)] pt-4">
                 <button onClick={() => setShowConfig(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-[#A1A1AA] hover:text-white transition-colors">Cancelar</button>
                 <button onClick={handleSaveConfig} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg transition-colors">Salvar e Sincronizar</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* HEATMAP */}
      <PosHeatmap />

      {/* WEEK CALENDAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDays.map(day => {
          const items = getDayItems(day);
          const isTodayFlag = isToday(day);
          
          return (
            <div key={day.toISOString()} className={cn("flex flex-col h-full bg-[#0A0A0C]/80 backdrop-blur-xl border rounded-[24px] overflow-hidden transition-all duration-300", isTodayFlag ? "border-rose-500/30 shadow-[0_8px_30px_rgba(225,29,72,0.1)] ring-1 ring-rose-500/20" : "border-[rgba(255,255,255,0.04)] shadow-lg hover:border-[rgba(255,255,255,0.08)]")}>
              {/* Day Header */}
              <div className={cn("px-5 py-4 flex justify-between items-center", isTodayFlag ? "bg-gradient-to-br from-rose-500/10 to-transparent border-b border-rose-500/20" : "bg-[#111113]/50 border-b border-[rgba(255,255,255,0.03)]")}>
                <div>
                  <div className={cn("text-[10px] uppercase font-bold tracking-[0.2em] mb-0.5", isTodayFlag ? "text-rose-400" : "text-[#71717A]")}>
                    {format(day, 'EEEE', {locale: ptBR}).split('-')[0]}
                  </div>
                  <div className={cn("text-3xl font-black tracking-tighter leading-none", isTodayFlag ? "text-white" : "text-[#E4E4E7]")}>
                    {format(day, 'dd')}
                  </div>
                </div>
                {items.length > 0 && (
                  <div className={cn("size-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-inner border", isTodayFlag ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-[#1A1A1E] text-[#A1A1AA] border-[rgba(255,255,255,0.05)]")}>
                    {items.length}
                  </div>
                )}
              </div>
              
              {/* Day Content */}
              <div className="p-4 flex flex-col flex-1 min-h-[300px] bg-gradient-to-b from-[#0F0F12] to-transparent">
                {items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                    <CalendarIcon className="size-6 text-[#71717A] mb-2" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#71717A]">Livre</span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {(() => {
                      const eventsList = items.filter((i:any) => i.itemType === 'evento');
                      const tasksList = items.filter((i:any) => i.itemType === 'tarefa');
                      const habitsList = items.filter((i:any) => i.itemType === 'habito');
                      const readList = items.filter((i:any) => i.itemType === 'leitura');
                      const courseList = items.filter((i:any) => i.itemType === 'curso');

                      const renderGroup = (title: string, groupItems: any[], IconCmp: any, colorClass: string, isTodayFlag: boolean) => {
                        if (groupItems.length === 0) return null;
                        return (
                          <details className="group bg-[#121214] border border-[rgba(255,255,255,0.03)] rounded-2xl overflow-hidden mb-3 hover:border-[rgba(255,255,255,0.08)] transition-all shadow-sm">
                            <summary className="list-none p-3.5 flex items-center justify-between cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors select-none">
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl border flex items-center justify-center shadow-inner", colorClass)}>
                                  <IconCmp className="size-4" />
                                </div>
                                <div>
                                  <span className="text-[13px] font-bold text-[#E4E4E7] block leading-tight">{title}</span>
                                  <span className="text-[10px] font-medium text-[#71717A] mt-0.5 block">{groupItems.length} {groupItems.length === 1 ? 'item' : 'itens'}</span>
                                </div>
                              </div>
                              <div className="size-6 rounded-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] flex items-center justify-center group-hover:bg-[#27272A] transition-colors">
                                <ChevronRight className="size-3.5 text-[#71717A] group-open:rotate-90 transition-transform duration-300" />
                              </div>
                            </summary>
                            <div className="p-3 bg-[#0A0A0C]/50 flex flex-col gap-2 border-t border-[rgba(255,255,255,0.02)]">
                              {groupItems.map(item => (
                                <div key={item.id} className={cn(
                                  "group/item p-3 rounded-xl border transition-all flex flex-col gap-2 relative backdrop-blur-md",
                                  item.itemType === 'tarefa' 
                                    ? (item.status === 'concluida' ? "bg-emerald-500/5 border-emerald-500/10 opacity-60" : "bg-[#111113] border-[#27272A] hover:border-emerald-500/30")
                                    : item.itemType !== 'evento'
                                      ? "bg-[#111113]/50 border-[rgba(255,255,255,0.02)] opacity-70 hover:opacity-100 hover:border-[rgba(255,255,255,0.06)]" 
                                      : "bg-[#17171A] border-[rgba(255,255,255,0.06)] shadow-sm hover:border-rose-500/40 hover:bg-[#1A1A1E]"
                                )}>
                                  <div className="flex justify-between items-start gap-2">
                                    <span className={cn("px-2 py-0.5 rounded-md text-[9px] uppercase font-bold tracking-widest flex items-center gap-1.5 border shadow-inner", getTypeColor(item.itemType, item.type))}>
                                      {getTypeIcon(item.itemType, item.type)}
                                      {item.itemType === 'evento' ? item.type : item.itemType}
                                    </span>
                                    
                                    {item.start_time && item.start_time !== '23:59' && (
                                      <span className="text-[10px] font-bold text-[#A1A1AA] bg-[#09090B] px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-[rgba(255,255,255,0.06)]">
                                        <Clock className="size-3" /> {item.start_time.substring(0,5)}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className={cn("text-[13px] font-bold leading-snug mt-1", (item.itemType === 'tarefa' || item.itemType === 'habito') && (item.status === 'concluida' || item.status === 'concluido') ? "text-[#71717A] line-through" : "text-[#F4F4F5]")}>
                                    {item.title}
                                  </h4>
                                  
                                  {item.itemType === 'evento' && item.description && (
                                    <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5 leading-relaxed">{item.description}</p>
                                  )}

                                  <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1 bg-[#1A1A1E]/90 backdrop-blur-md p-1 rounded-lg border border-[rgba(255,255,255,0.1)] shadow-xl">
                                    {item.itemType === 'tarefa' ? (
                                      <button onClick={() => updateTask(item.id, {status: item.status === 'concluida' ? 'pendente' : 'concluida'})} className="p-1 hover:text-emerald-400 text-[#71717A] transition-colors"><CheckCircle2 className="size-3.5" /></button>
                                    ) : item.itemType === 'evento' ? (
                                      <button onClick={() => deleteEvent(item.id)} className="p-1 hover:text-rose-400 text-[#71717A] transition-colors"><Trash2 className="size-3.5" /></button>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      };

                      return (
                        <>
                          {renderGroup("Eventos", eventsList, CalendarIcon, "text-blue-400 bg-blue-400/10 border-blue-400/20", isTodayFlag)}
                          {renderGroup("Eventos (Google)", items.filter((i:any) => i.itemType === 'evento_google'), CalendarIcon, "text-blue-400 bg-blue-500/10 border-blue-500/30", isTodayFlag)}
                          {renderGroup("Tarefas", tasksList, CheckCircle2, "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", isTodayFlag)}
                          {renderGroup("Tarefas (Google)", items.filter((i:any) => i.itemType === 'tarefa_google'), CheckCircle2, "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", isTodayFlag)}
                          {renderGroup("Hábitos", habitsList, Flame, "text-orange-500 bg-orange-500/10 border-orange-500/20", isTodayFlag)}
                          {renderGroup("Estudos", courseList, GraduationCap, "text-indigo-400 bg-indigo-400/10 border-indigo-400/20", isTodayFlag)}
                          {renderGroup("Leitura", readList, BookOpen, "text-cyan-400 bg-cyan-400/10 border-cyan-400/20", isTodayFlag)}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
}
