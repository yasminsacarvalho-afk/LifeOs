import { useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePosTasks } from "@/hooks/use-pos-tasks";
import { usePosHabits } from "@/hooks/use-pos-habits";
import { usePosLibrary } from "@/hooks/use-pos-library";
import { usePosStudies } from "@/hooks/use-pos-studies";
import { usePosAgenda } from "@/hooks/use-pos-agenda";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export function PosHeatmap() {
  const { tasks } = usePosTasks();
  const { logs: habitLogs } = usePosHabits();
  const { sessions: readingSessions } = usePosLibrary();
  const { sessions: studySessions } = usePosStudies();
  const { events } = usePosAgenda();

  const totalDays = 140; // Approx 20 weeks
  
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    
    const addPoints = (dateStr: string | null | undefined, points: number = 1) => {
      if (!dateStr) return;
      const key = dateStr.split('T')[0];
      map.set(key, (map.get(key) || 0) + points);
    };

    tasks.filter(t => t.status === 'concluida').forEach(t => {
      addPoints(t.deadline);
    });

    habitLogs.filter(l => l.status === 'concluido' || l.status === 'parcial').forEach(l => {
      addPoints(l.log_date);
    });

    readingSessions.forEach(s => {
      addPoints(s.session_date);
    });

    studySessions.forEach(s => {
      addPoints(s.session_date);
    });

    events.forEach(e => {
      addPoints(e.event_date);
    });

    return map;
  }, [tasks, habitLogs, readingSessions, studySessions, events]);

  const weeks = useMemo(() => {
    const today = startOfDay(new Date());
    const days = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      days.push(subDays(today, i));
    }

    const wk: (Date | null)[][] = [];
    const oldestDayOfWeek = days[0].getDay();
    
    let currentWeek: (Date | null)[] = Array(oldestDayOfWeek).fill(null);
    
    days.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        wk.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0 && currentWeek.length < 7) {
      const padding = Array(7 - currentWeek.length).fill(null);
      wk.push([...currentWeek, ...padding]);
    }
    
    return wk;
  }, [totalDays]);

  const getIntensityColor = (count: number) => {
    if (count === 0) return "bg-[#1A1A1E] border-[rgba(255,255,255,0.03)]";
    if (count <= 2) return "bg-rose-500/20 border-rose-500/30";
    if (count <= 4) return "bg-rose-500/40 border-rose-500/50";
    if (count <= 6) return "bg-rose-500/70 border-rose-500/80";
    return "bg-rose-500 border-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.4)]";
  };

  return (
    <div className="bg-[#0A0A0C]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-[24px] p-6 mb-8 w-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Activity className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Life Heatmap</h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">Intensidade de execução em todo o Personal OS</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-1.5">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((day, dIdx) => {
                if (!day) return <div key={`empty-${dIdx}`} className="w-[14px] h-[14px]" />;
                const dateStr = format(day, 'yyyy-MM-dd');
                const count = activityMap.get(dateStr) || 0;
                
                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "w-[14px] h-[14px] rounded-[3px] border transition-colors cursor-pointer relative group",
                      getIntensityColor(count)
                    )}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-md text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      <span className="font-bold text-rose-400">{count} execuções</span> em {format(day, "dd 'de' MMM", {locale: ptBR})}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-[#A1A1AA] font-bold">
        <span>Menos</span>
        <div className="flex gap-1">
          <div className="w-[14px] h-[14px] rounded-[3px] bg-[#1A1A1E] border border-[rgba(255,255,255,0.03)]" />
          <div className="w-[14px] h-[14px] rounded-[3px] bg-rose-500/20 border border-rose-500/30" />
          <div className="w-[14px] h-[14px] rounded-[3px] bg-rose-500/40 border border-rose-500/50" />
          <div className="w-[14px] h-[14px] rounded-[3px] bg-rose-500/70 border border-rose-500/80" />
          <div className="w-[14px] h-[14px] rounded-[3px] bg-rose-500 border border-rose-400" />
        </div>
        <span>Mais</span>
      </div>
    </div>
  );
}
