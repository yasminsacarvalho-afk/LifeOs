import { useState } from "react";
import { usePosAgenda } from "@/hooks/use-pos-agenda";
import { usePosTasks } from "@/hooks/use-pos-tasks";
import {
  Calendar as CalendarIcon, Clock, Plus, Video, Briefcase, 
  MapPin, CheckCircle2, Circle, Trash2, ChevronLeft, ChevronRight,
  Coffee, CalendarDays, X
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
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
          <div className="w-full md:max-w-3xl max-h-[90vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 md:zoom-in-95">
            <div className="p-5 md:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <CalendarDays className="size-5 text-rose-500" /> Agendar Compromisso
               </h3>
               <button type="button" onClick={() => setIsCreating(false)} className="p-2 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-500 rounded-full transition-colors">
                 <X className="size-5" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
              <form onSubmit={handleCreate}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Título do Evento</label>
                    <input required type="text" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500" placeholder="Ex: Reunião de Diretoria" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Data</label>
                    <input required type="date" value={newEvent.event_date} onChange={e=>setNewEvent({...newEvent, event_date: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Tipo</label>
                    <select value={newEvent.type} onChange={e=>setNewEvent({...newEvent, type: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500">
                      <option value="reuniao">Reunião</option>
                      <option value="call">Call / Alinhamento</option>
                      <option value="foco">Trabalho Focado</option>
                      <option value="pessoal">Pessoal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Início (Opcional)</label>
                    <input type="time" value={newEvent.start_time} onChange={e=>setNewEvent({...newEvent, start_time: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Término (Opcional)</label>
                    <input type="time" value={newEvent.end_time} onChange={e=>setNewEvent({...newEvent, end_time: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Descrição / Links</label>
                    <input type="text" value={newEvent.description} onChange={e=>setNewEvent({...newEvent, description: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500" placeholder="Link do meet, pauta..." />
                  </div>
                </div>
                <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                   <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-4 md:py-3 rounded-xl text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Cancelar</button>
                   <button type="submit" className="px-6 py-4 md:py-3 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)]">Agendar Evento</button>
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
