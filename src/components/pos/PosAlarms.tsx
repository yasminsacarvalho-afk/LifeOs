import { useState, useEffect } from "react";
import { Bell, BellRing, Clock, Plus, Trash2, Power, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export interface PosAlarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  days: number[]; // 0 = Sunday, 1 = Monday...
}

export interface PosTimer {
  id: string;
  label: string;
  durationMinutes: number;
  endTime: number | null; // null se pausado
  remainingSeconds: number; // quando pausado guarda o tempo restante
  status: 'idle' | 'running' | 'paused';
}

export function PosAlarms() {
  const [alarms, setAlarms] = useState<PosAlarm[]>(() => {
    try {
      const stored = localStorage.getItem('lifeos_alarms');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [timers, setTimers] = useState<PosTimer[]>(() => {
    try {
      const stored = localStorage.getItem('lifeos_timers');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Tabs for Alarm/Timer view
  const [activeTab, setActiveTab] = useState<'alarmes'|'timers'>('alarmes');

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [showNewTimerModal, setShowNewTimerModal] = useState(false);
  
  const [newAlarm, setNewAlarm] = useState({ time: '06:00', label: 'Acordar', days: [1,2,3,4,5] });
  const [newTimer, setNewTimer] = useState({ minutes: 25, label: 'Foco (Pomodoro)' });

  // Update current time every second and check alarms/timers
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const timeStr = `${currentHours}:${currentMinutes}`;
      const currentDay = now.getDay();
      
      // Checa alarmes quando vira o minuto
      if (now.getSeconds() === 0) {
        alarms.forEach(alarm => {
          if (alarm.enabled && alarm.time === timeStr && alarm.days.includes(currentDay)) {
            triggerNotification(`Alarme: ${alarm.label}`, `Seu alarme de ${alarm.time} está tocando!`);
          }
        });
      }

      // Atualiza Temporizadores
      setTimers(prev => {
        let changed = false;
        const next = prev.map(t => {
          if (t.status === 'running' && t.endTime) {
            const rem = Math.max(0, Math.floor((t.endTime - Date.now()) / 1000));
            if (rem === 0) {
              changed = true;
              triggerNotification(`Temporizador: ${t.label}`, `O tempo de ${t.durationMinutes} minutos acabou!`);
              return { ...t, status: 'idle', remainingSeconds: t.durationMinutes * 60, endTime: null };
            }
            if (rem !== t.remainingSeconds) {
              changed = true;
              return { ...t, remainingSeconds: rem };
            }
          }
          return t;
        });
        if (changed) {
          localStorage.setItem('lifeos_timers', JSON.stringify(next));
        }
        return changed ? next : prev;
      });

    }, 1000);
    return () => clearInterval(timerInterval);
  }, [alarms]);

  const triggerNotification = async (title: string, body: string) => {
    try {
      // Tenta usar a API nativa do Tauri (Desktop/Mobile)
      let permissionGranted = await isPermissionGranted();
      
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      
      if (permissionGranted) {
        sendNotification({ 
          title, 
          body 
        });
      }
    } catch (e) {
      // Fallback para Web (quando estiver rodando só no navegador)
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png'
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
               new Notification(title, { body });
            }
          });
        }
      }
    }
    
    // Alerta fallback para a interface (útil se o app estiver aberto)
    alert(`⏰ ${title} - ${body}`);
  };

  const saveAlarms = (updated: PosAlarm[]) => {
    setAlarms(updated);
    localStorage.setItem('lifeos_alarms', JSON.stringify(updated));
  };

  const saveTimers = (updated: PosTimer[]) => {
    setTimers(updated);
    localStorage.setItem('lifeos_timers', JSON.stringify(updated));
  };

  const toggleAlarm = (id: string) => {
    saveAlarms(alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const deleteAlarm = (id: string) => {
    saveAlarms(alarms.filter(a => a.id !== id));
  };

  const addAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    const newA: PosAlarm = {
      id: crypto.randomUUID(),
      time: newAlarm.time,
      label: newAlarm.label,
      enabled: true,
      days: newAlarm.days
    };
    saveAlarms([...alarms, newA].sort((a,b) => a.time.localeCompare(b.time)));
    setShowNewModal(false);
  };

  const addTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const newT: PosTimer = {
      id: crypto.randomUUID(),
      label: newTimer.label,
      durationMinutes: newTimer.minutes,
      remainingSeconds: newTimer.minutes * 60,
      endTime: null,
      status: 'idle'
    };
    saveTimers([...timers, newT]);
    setShowNewTimerModal(false);
  };

  const deleteTimer = (id: string) => {
    saveTimers(timers.filter(t => t.id !== id));
  };

  const toggleTimerState = (id: string) => {
    saveTimers(timers.map(t => {
      if (t.id !== id) return t;
      if (t.status === 'running') {
        // Pause
        return { ...t, status: 'paused', endTime: null };
      } else {
        // Start or Resume
        return { ...t, status: 'running', endTime: Date.now() + (t.remainingSeconds * 1000) };
      }
    }));
  };

  const resetTimer = (id: string) => {
    saveTimers(timers.map(t => {
      if (t.id !== id) return t;
      return { ...t, status: 'idle', remainingSeconds: t.durationMinutes * 60, endTime: null };
    }));
  };

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleDay = (day: number) => {
    setNewAlarm(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day].sort()
    }));
  };

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto pb-32 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <BellRing className="size-8 text-rose-500" /> 
            Despertador & Alarmes
          </h2>
          <p className="text-[#A1A1AA] text-sm mt-2">
            Configure alarmes recorrentes. {("Notification" in window && Notification.permission !== "granted") && <span className="text-amber-500 cursor-pointer" onClick={() => Notification.requestPermission()}>Clique aqui para permitir notificações.</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl px-6 py-4 shadow-xl">
          <Clock className="size-5 text-[#38bdf8]" />
          <div className="text-3xl font-bold tabular-nums text-white tracking-tight">
            {format(currentTime, 'HH:mm')}
            <span className="text-sm text-[#71717A] ml-1 font-mono">:{format(currentTime, 'ss')}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[rgba(255,255,255,0.06)] mb-8">
        <button 
          onClick={() => setActiveTab('alarmes')}
          className={cn("pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative", activeTab === 'alarmes' ? "text-rose-500" : "text-[#71717A] hover:text-white")}
        >
          Despertadores
          {activeTab === 'alarmes' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('timers')}
          className={cn("pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative", activeTab === 'timers' ? "text-rose-500" : "text-[#71717A] hover:text-white")}
        >
          Temporizadores
          {activeTab === 'timers' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></div>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {activeTab === 'alarmes' ? (
          <>
            <button 
              onClick={() => setShowNewModal(true)}
              className="bg-transparent border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-rose-500/50 hover:bg-rose-500/5 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[220px] transition-all group"
            >
              <div className="size-12 rounded-full bg-[#1A1A1E] group-hover:bg-rose-500/20 flex items-center justify-center mb-3 transition-colors">
                <Plus className="size-6 text-[#71717A] group-hover:text-rose-500" />
              </div>
              <span className="text-[#A1A1AA] group-hover:text-white font-medium">Novo Alarme</span>
            </button>

            {alarms.map(alarm => (
              <div key={alarm.id} className={cn("bg-[#111113] border rounded-3xl p-6 flex flex-col transition-all relative overflow-hidden", alarm.enabled ? "border-[rgba(255,255,255,0.1)] shadow-xl" : "border-transparent opacity-60")}>
                {alarm.enabled && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>}
                
                <div className="flex items-start justify-between mb-6">
                  <div className="flex flex-col">
                    <span className={cn("text-4xl font-black tracking-tighter tabular-nums", alarm.enabled ? "text-white" : "text-[#71717A]")}>{alarm.time}</span>
                    <span className="text-sm font-bold text-[#A1A1AA] mt-1">{alarm.label}</span>
                  </div>
                  <button 
                    onClick={() => toggleAlarm(alarm.id)}
                    className={cn("p-3 rounded-full transition-colors", alarm.enabled ? "bg-rose-500/10 text-rose-500" : "bg-[#1A1A1E] text-[#71717A]")}
                  >
                    <Power className="size-6" />
                  </button>
                </div>

                <div className="mt-auto pt-6 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {weekDays.map((d, i) => (
                      <span key={i} className={cn("text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold", alarm.days.includes(i) ? (alarm.enabled ? "bg-[#1A1A1E] text-white" : "bg-[#1A1A1E] text-[#71717A]") : "text-[#3F3F46]")}>
                        {d}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => deleteAlarm(alarm.id)} className="text-[#3F3F46] hover:text-rose-500 transition-colors p-2">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <button 
              onClick={() => setShowNewTimerModal(true)}
              className="bg-transparent border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-amber-500/50 hover:bg-amber-500/5 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[220px] transition-all group"
            >
              <div className="size-12 rounded-full bg-[#1A1A1E] group-hover:bg-amber-500/20 flex items-center justify-center mb-3 transition-colors">
                <Plus className="size-6 text-[#71717A] group-hover:text-amber-500" />
              </div>
              <span className="text-[#A1A1AA] group-hover:text-white font-medium">Novo Temporizador</span>
            </button>

            {timers.map(timer => {
              const isRunning = timer.status === 'running';
              const progress = ((timer.durationMinutes * 60 - timer.remainingSeconds) / (timer.durationMinutes * 60)) * 100;
              
              return (
                <div key={timer.id} className={cn("bg-[#111113] border rounded-3xl p-6 flex flex-col transition-all relative overflow-hidden", isRunning ? "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-[rgba(255,255,255,0.06)]")}>
                  {isRunning && <div className="absolute top-0 left-0 h-1 bg-amber-500 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }}></div>}
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col">
                      <span className={cn("text-5xl font-black tracking-tighter tabular-nums", isRunning ? "text-amber-500" : "text-white")}>{formatTimerDisplay(timer.remainingSeconds)}</span>
                      <span className="text-sm font-bold text-[#A1A1AA] mt-2">{timer.label}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.04)] flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleTimerState(timer.id)}
                        className={cn("flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center transition-colors", 
                          isRunning ? "bg-[#1A1A1E] text-amber-500 hover:bg-amber-500/20" : "bg-amber-500 text-white hover:bg-amber-600")}
                      >
                        {isRunning ? "Pausar" : timer.remainingSeconds < timer.durationMinutes * 60 ? "Retomar" : "Iniciar"}
                      </button>
                      <button 
                        onClick={() => resetTimer(timer.id)}
                        disabled={timer.status === 'idle' && timer.remainingSeconds === timer.durationMinutes * 60}
                        className="p-3 bg-[#1A1A1E] text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Zerar Temporizador"
                      >
                        <Clock className="size-5" />
                      </button>
                      <button 
                        onClick={() => deleteTimer(timer.id)} 
                        className="p-3 bg-[#1A1A1E] text-[#71717A] hover:bg-rose-500/20 hover:text-rose-500 rounded-xl transition-colors"
                        title="Apagar Temporizador"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Configurar Alarme</h3>
            
            <form onSubmit={addAlarm} className="flex flex-col gap-5">
              <div>
                <label className="text-[11px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">Horário</label>
                <input 
                  type="time" 
                  value={newAlarm.time}
                  onChange={e => setNewAlarm({...newAlarm, time: e.target.value})}
                  className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-4 text-3xl font-black text-center text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">Nome (Etiqueta)</label>
                <input 
                  type="text" 
                  value={newAlarm.label}
                  onChange={e => setNewAlarm({...newAlarm, label: e.target.value})}
                  placeholder="Ex: Acordar, Reunião, Tomar Remédio"
                  className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">Dias da Semana</label>
                <div className="flex justify-between gap-2">
                  {weekDays.map((d, i) => (
                    <button 
                      key={i} 
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn("size-10 rounded-full font-bold text-xs transition-colors", newAlarm.days.includes(i) ? "bg-rose-500 text-white" : "bg-[#111113] text-[#71717A] border border-[rgba(255,255,255,0.06)]")}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-[#111113] text-white hover:bg-[#1A1A1E]">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-600">Salvar Alarme</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Criar Temporizador</h3>
            
            <form onSubmit={addTimer} className="flex flex-col gap-5">
              <div>
                <label className="text-[11px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">Duração (Minutos)</label>
                <input 
                  type="number" 
                  min="1"
                  max="1440"
                  value={newTimer.minutes}
                  onChange={e => setNewTimer({...newTimer, minutes: Number(e.target.value)})}
                  className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-4 text-3xl font-black text-center text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">Nome (Etiqueta)</label>
                <input 
                  type="text" 
                  value={newTimer.label}
                  onChange={e => setNewTimer({...newTimer, label: e.target.value})}
                  placeholder="Ex: Foco, Cozinhar, Estudar"
                  className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowNewTimerModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-[#111113] text-white hover:bg-[#1A1A1E]">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600">Criar Temporizador</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
