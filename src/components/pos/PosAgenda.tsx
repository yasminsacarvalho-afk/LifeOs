import { useState } from "react";
import { usePosAgenda } from "@/hooks/use-pos-agenda";
import { usePosTasks } from "@/hooks/use-pos-tasks";
import {
  Calendar as CalendarIcon, Clock, Plus, Video, Briefcase, 
  MapPin, CheckCircle2, Circle, Trash2, ChevronLeft, ChevronRight,
  Coffee, CalendarDays, X, Search, Repeat
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO, isToday, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function PosAgenda() {
  const { events, addEvent, updateEvent, deleteEvent, loading: loadingEvents } = usePosAgenda();
  const { tasks, updateTask, loading: loadingTasks } = usePosTasks();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreating, setIsCreating] = useState(false);
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
    setIsCreating(false);
    setNewEvent({...newEvent, title: "", description: ""});
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
      isTask: false
    }));
    
    const dayTasks = tasks.filter(t => {
      const d = getSafeDate(t.deadline);
      return d && isSameDay(d, date);
    }).map(t => ({
      ...t,
      isTask: true,
      start_time: t.due_time || '23:59', // put at end of day if no time
      type: t.category || 'tarefa'
    }));

    // @ts-ignore
    const merged = [...dayEvents, ...dayTasks].sort((a: any, b: any) => {
      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    return merged;
  };

  const getTypeIcon = (type: string, isTask: boolean) => {
    if (isTask) return <CheckCircle2 className="size-3" />;
    if (type === 'reuniao' || type === 'call') return <Video className="size-3" />;
    if (type === 'foco' || type === 'deepwork') return <Briefcase className="size-3" />;
    if (type === 'pessoal') return <Coffee className="size-3" />;
    return <CalendarIcon className="size-3" />;
  };

  const getTypeColor = (type: string, isTask: boolean) => {
    if (isTask) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
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
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:bg-rose-500 transition-colors"
          >
            <Plus className="size-4" /> Novo Evento
          </button>
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

      {/* WEEK CALENDAR */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {weekDays.map(day => {
          const items = getDayItems(day);
          const isTodayFlag = isToday(day);
          
          return (
            <div key={day.toISOString()} className={cn("flex flex-col h-full bg-[#111113] border rounded-3xl overflow-hidden transition-all", isTodayFlag ? "border-rose-500/50 shadow-[0_0_30px_rgba(79,70,229,0.05)]" : "border-[rgba(255,255,255,0.06)]")}>
              {/* Day Header */}
              <div className={cn("p-4 border-b flex justify-between items-center", isTodayFlag ? "bg-rose-500/10 border-rose-500/20" : "bg-[#1A1A1E] border-[rgba(255,255,255,0.04)]")}>
                <div>
                  <div className={cn("text-[10px] uppercase font-bold tracking-widest", isTodayFlag ? "text-rose-400" : "text-[#71717A]")}>
                    {format(day, 'EEEE', {locale: ptBR}).split('-')[0]}
                  </div>
                  <div className={cn("text-2xl font-black tracking-tighter", isTodayFlag ? "text-rose-400" : "text-white")}>
                    {format(day, 'dd')}
                  </div>
                </div>
                {items.length > 0 && (
                  <div className="size-6 rounded-full bg-[#111113] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px] font-bold text-[#A1A1AA]">
                    {items.length}
                  </div>
                )}
              </div>
              
              {/* Day Content */}
              <div className="p-3 flex flex-col gap-2 flex-1 min-h-[300px]">
                {items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                    <CalendarIcon className="size-6 text-[#71717A] mb-2" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#71717A]">Livre</span>
                  </div>
                ) : (
                  items.map((item: any) => (
                    <div key={item.id} className={cn(
                      "group p-3 rounded-2xl border transition-all flex flex-col gap-2 relative",
                      item.isTask 
                        ? (item.status === 'concluida' ? "bg-[#111113] border-emerald-500/20 opacity-50" : "bg-[#111113] border-[#27272A] hover:border-[#3F3F46]")
                        : "bg-[#1A1A1E] border-[rgba(255,255,255,0.06)] shadow-sm hover:border-rose-500/30 hover:bg-[#1A1A1E]/80"
                    )}>
                      
                      <div className="flex justify-between items-start gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 border", getTypeColor(item.type, item.isTask))}>
                          {getTypeIcon(item.type, item.isTask)}
                          {item.isTask ? 'Tarefa' : item.type}
                        </span>
                        
                        {item.start_time && item.start_time !== '23:59' && (
                          <span className="text-[10px] font-bold text-[#A1A1AA] bg-[#111113] px-1.5 py-0.5 rounded flex items-center gap-1 border border-[rgba(255,255,255,0.06)]">
                            <Clock className="size-2.5" /> {item.start_time.substring(0,5)}
                          </span>
                        )}
                      </div>

                      <h4 className={cn("text-sm font-bold leading-tight mt-1", item.isTask && item.status === 'concluida' ? "text-[#71717A] line-through" : "text-white")}>
                        {item.title}
                      </h4>
                      
                      {!item.isTask && item.description && (
                         <p className="text-xs text-[#71717A] truncate mt-1">{item.description}</p>
                      )}

                      {/* Actions overlay */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[#1A1A1E] p-1 rounded-lg border border-[rgba(255,255,255,0.1)] shadow-xl">
                        {item.isTask ? (
                          <button onClick={() => updateTask(item.id, {status: item.status === 'concluida' ? 'pendente' : 'concluida'})} className="p-1 hover:text-emerald-400 text-[#71717A]"><CheckCircle2 className="size-3.5" /></button>
                        ) : (
                          <>
                            <button onClick={() => deleteEvent(item.id)} className="p-1 hover:text-rose-400 text-[#71717A]"><Trash2 className="size-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
}
