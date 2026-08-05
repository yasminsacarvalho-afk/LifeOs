import React, { useState, useEffect } from "react";
import { BellRing, Plus, Trash2, Power, Search, Volume2, Edit2, Copy, Play, Pause, Clock, Check, VolumeX, Volume1, Smartphone, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes, differenceInHours, addDays, set } from "date-fns";
import { useAlarms, ALARM_SOUNDS, PosAlarm, playSynthAlarm } from "@/contexts/AlarmsContext";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export interface PosTimer {
  id: string;
  label: string;
  durationMinutes: number;
  endTime: number | null;
  remainingSeconds: number;
  status: 'idle' | 'running' | 'paused';
}

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function PosAlarms() {
  const { alarms, addAlarm, updateAlarm, toggleAlarm, deleteAlarm, testSound, stopTestSound } = useAlarms();
  
  // Timer State (Local to this tab for now)
  const [timers, setTimers] = useState<PosTimer[]>(() => {
    try {
      const stored = localStorage.getItem('lifeos_timers');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<'alarmes'|'timers'>('alarmes');
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<PosAlarm>>({
    time: "06:00",
    label: "Despertador",
    days: [1,2,3,4,5],
    sound: "radar",
    volume: 80,
    vibration: true
  });

  const [showTimerModal, setShowTimerModal] = useState(false);
  const [newTimer, setNewTimer] = useState({ minutes: 25, label: 'Foco (Pomodoro)' });

  // Update current time and timers
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCurrentTime(new Date());

      // Update Timers
      setTimers(prev => {
        let changed = false;
        const next = prev.map(t => {
          if (t.status === 'running' && t.endTime) {
            const rem = Math.max(0, Math.floor((t.endTime - Date.now()) / 1000));
            if (rem === 0) {
              changed = true;
              triggerTimerNotification(t.label, t.durationMinutes);
              return { ...t, status: 'idle', remainingSeconds: t.durationMinutes * 60, endTime: null };
            }
            if (rem !== t.remainingSeconds) {
              changed = true;
              return { ...t, remainingSeconds: rem };
            }
          }
          return t;
        });
        if (changed) localStorage.setItem('lifeos_timers', JSON.stringify(next));
        return changed ? next : prev;
      });

    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const triggerTimerNotification = async (label: string, mins: number) => {
    try {
      let perm = await isPermissionGranted();
      if (!perm) perm = (await requestPermission()) === 'granted';
      if (perm) sendNotification({ title: `Temporizador: ${label}`, body: `O tempo de ${mins} min acabou!` });
    } catch {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Temporizador: ${label}`, { body: `O tempo de ${mins} min acabou!` });
      }
    }
    
    // Toca som alto para o temporizador usando Web Audio API
    const synth = playSynthAlarm('buzzer', 100);
    
    // Pequeno delay para garantir que o som comece antes de travar a thread com o alert
    setTimeout(() => {
       alert(`⏳ TEMPORIZADOR: ${label} finalizado!`);
       synth.stop();
    }, 100);
  };

  // -------------------------
  // TIMERS LOGIC
  // -------------------------
  const saveTimers = (updated: PosTimer[]) => {
    setTimers(updated);
    localStorage.setItem('lifeos_timers', JSON.stringify(updated));
  };
  const handleAddTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const newT: PosTimer = {
      id: newId, label: newTimer.label, durationMinutes: newTimer.minutes,
      remainingSeconds: newTimer.minutes * 60, endTime: null, status: 'idle'
    };
    saveTimers([...timers, newT]);
    setShowTimerModal(false);
  };
  const toggleTimerState = (id: string) => {
    saveTimers(timers.map(t => {
      if (t.id !== id) return t;
      if (t.status === 'running') return { ...t, status: 'paused', endTime: null };
      return { ...t, status: 'running', endTime: Date.now() + (t.remainingSeconds * 1000) };
    }));
  };
  const resetTimer = (id: string) => {
    saveTimers(timers.map(t => t.id === id ? { ...t, status: 'idle', remainingSeconds: t.durationMinutes * 60, endTime: null } : t));
  };

  // -------------------------
  // ALARMS LOGIC
  // -------------------------
  const handleOpenModal = (alarm?: PosAlarm) => {
    if (alarm) {
      setEditingId(alarm.id);
      setFormData(alarm);
    } else {
      setEditingId(null);
      setFormData({ time: "06:00", label: "Novo Alarme", days: [1,2,3,4,5], sound: "radar", volume: 80, vibration: true });
    }
    setShowModal(true);
  };

  const handleSaveAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    stopTestSound();
    if (editingId) {
      updateAlarm(editingId, formData);
    } else {
      addAlarm({
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        enabled: true,
        snoozedUntil: null,
        ...formData
      } as PosAlarm);
    }
    setShowModal(false);
  };

  const handleDuplicate = (alarm: PosAlarm) => {
    addAlarm({
      ...alarm,
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      label: `${alarm.label} (Cópia)`
    });
  };

  const toggleDay = (day: number) => {
    setFormData(prev => {
      const days = prev.days || [];
      return { ...prev, days: days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort() };
    });
  };

  const setPresetDays = (preset: 'all'|'weekdays'|'weekends'|'once') => {
    if (preset === 'once') setFormData(prev => ({ ...prev, days: [] }));
    if (preset === 'all') setFormData(prev => ({ ...prev, days: [0,1,2,3,4,5,6] }));
    if (preset === 'weekdays') setFormData(prev => ({ ...prev, days: [1,2,3,4,5] }));
    if (preset === 'weekends') setFormData(prev => ({ ...prev, days: [0,6] }));
  };

  const getNextAlarmText = (alarm: PosAlarm) => {
    if (!alarm.enabled) return "Desativado";
    if (alarm.snoozedUntil) {
      const diff = Math.max(0, differenceInMinutes(new Date(alarm.snoozedUntil), new Date()));
      return `Em Soneca (Toca em ${diff}m)`;
    }

    const [h, m] = alarm.time.split(':').map(Number);
    let nextDate = set(new Date(), { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
    
    if (nextDate <= new Date()) {
      nextDate = addDays(nextDate, 1);
    }

    // Adjust for specific days
    if (alarm.days.length > 0) {
      let daysChecked = 0;
      while (!alarm.days.includes(nextDate.getDay()) && daysChecked < 7) {
        nextDate = addDays(nextDate, 1);
        daysChecked++;
      }
    }

    const diffHours = differenceInHours(nextDate, new Date());
    const diffMins = differenceInMinutes(nextDate, new Date()) % 60;
    
    if (diffHours === 0 && diffMins === 0) return "Toca em menos de 1 minuto";
    if (diffHours === 0) return `Toca em ${diffMins} min`;
    return `Toca em ${diffHours}h ${diffMins}m`;
  };

  const filteredAlarms = alarms.filter(a => a.label.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-32 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3 drop-shadow-sm">
            <BellRing className="size-8 md:size-10 text-rose-500" /> 
            Central de Alarmes
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base mt-2">
            Configure alertas programados para sua rotina.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-gradient-to-br from-[#111113] to-[#0A0A0C] border border-[rgba(255,255,255,0.08)] rounded-2xl px-6 py-4 shadow-xl">
          <Clock className="size-6 text-[#38bdf8]" />
          <div className="text-3xl md:text-4xl font-bold tabular-nums text-white tracking-tighter drop-shadow-md">
            {format(currentTime, 'HH:mm')}
            <span className="text-sm md:text-base text-[#71717A] ml-1 font-mono tracking-normal">:{format(currentTime, 'ss')}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between border-b border-[rgba(255,255,255,0.06)] mb-8 pb-4">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('alarmes')}
            className={cn("pb-2 text-sm font-bold uppercase tracking-widest transition-colors relative", activeTab === 'alarmes' ? "text-rose-500" : "text-[#71717A] hover:text-white")}
          >
            Despertadores
            {activeTab === 'alarmes' && <div className="absolute -bottom-4 left-0 w-full h-0.5 bg-rose-500 rounded-t-full shadow-[0_-2px_10px_rgba(244,63,94,0.5)]"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('timers')}
            className={cn("pb-2 text-sm font-bold uppercase tracking-widest transition-colors relative", activeTab === 'timers' ? "text-rose-500" : "text-[#71717A] hover:text-white")}
          >
            Temporizadores
            {activeTab === 'timers' && <div className="absolute -bottom-4 left-0 w-full h-0.5 bg-rose-500 rounded-t-full shadow-[0_-2px_10px_rgba(244,63,94,0.5)]"></div>}
          </button>
        </div>

        {activeTab === 'alarmes' && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#71717A]" />
            <input 
              type="text" 
              placeholder="Pesquisar alarmes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none transition-colors"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {activeTab === 'alarmes' ? (
          <>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-transparent border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-rose-500/50 hover:bg-rose-500/5 rounded-[32px] p-6 flex flex-col items-center justify-center min-h-[240px] transition-all group"
            >
              <div className="size-16 rounded-full bg-[#1A1A1E] group-hover:bg-rose-500/20 flex items-center justify-center mb-4 transition-colors">
                <Plus className="size-8 text-[#71717A] group-hover:text-rose-500" />
              </div>
              <span className="text-[#A1A1AA] group-hover:text-white font-medium text-lg">Criar Novo Alarme</span>
            </button>

            {filteredAlarms.map(alarm => (
              <div key={alarm.id} className={cn("bg-gradient-to-br from-[#111113] to-[#0A0A0C] border rounded-[32px] p-6 flex flex-col transition-all relative overflow-hidden group", alarm.enabled ? "border-rose-500/20 shadow-[0_10px_30px_-10px_rgba(225,29,72,0.15)]" : "border-[rgba(255,255,255,0.05)] opacity-60")}>
                {alarm.enabled && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-400"></div>}
                {alarm.snoozedUntil && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 animate-pulse"></div>}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-col">
                    <span className={cn("text-5xl font-black tracking-tighter tabular-nums drop-shadow-md", alarm.enabled ? "text-white" : "text-[#71717A]")}>{alarm.time}</span>
                    <span className="text-base font-bold text-[#A1A1AA] mt-1 line-clamp-1">{alarm.label}</span>
                  </div>
                  
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={alarm.enabled} onChange={() => toggleAlarm(alarm.id)} />
                    <div className="w-14 h-7 bg-[#1A1A1E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-500 shadow-inner"></div>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-6">
                  {alarm.days.length === 0 ? (
                    <span className="text-xs font-bold bg-[#1A1A1E] text-[#A1A1AA] px-3 py-1 rounded-md">Apenas 1 vez</span>
                  ) : (
                    WEEK_DAYS.map((d, i) => (
                      <span key={i} className={cn("text-[10px] w-6 h-6 flex items-center justify-center rounded-md font-bold transition-colors", alarm.days.includes(i) ? (alarm.enabled ? "bg-rose-500/20 text-rose-400" : "bg-[#1A1A1E] text-white") : "text-[#3F3F46]")}>
                        {d}
                      </span>
                    ))
                  )}
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  <p className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/10 w-fit flex items-center gap-1.5">
                    <Clock className="size-3" /> {getNextAlarmText(alarm)}
                  </p>
                  
                  <div className="pt-4 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenModal(alarm)} className="p-2 bg-[#1A1A1E] text-[#A1A1AA] hover:text-white hover:bg-rose-500/20 rounded-xl transition-colors" title="Editar">
                        <Edit2 className="size-4" />
                      </button>
                      <button onClick={() => handleDuplicate(alarm)} className="p-2 bg-[#1A1A1E] text-[#A1A1AA] hover:text-white hover:bg-rose-500/20 rounded-xl transition-colors" title="Duplicar">
                        <Copy className="size-4" />
                      </button>
                    </div>
                    <button onClick={() => deleteAlarm(alarm.id)} className="p-2 bg-[#1A1A1E] text-[#71717A] hover:bg-rose-500/20 hover:text-rose-500 rounded-xl transition-colors" title="Excluir">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          /* TIMERS TAB */
          <>
            <button 
              onClick={() => setShowTimerModal(true)}
              className="bg-transparent border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-amber-500/50 hover:bg-amber-500/5 rounded-[32px] p-6 flex flex-col items-center justify-center min-h-[240px] transition-all group"
            >
              <div className="size-16 rounded-full bg-[#1A1A1E] group-hover:bg-amber-500/20 flex items-center justify-center mb-4 transition-colors">
                <Plus className="size-8 text-[#71717A] group-hover:text-amber-500" />
              </div>
              <span className="text-[#A1A1AA] group-hover:text-white font-medium text-lg">Criar Temporizador</span>
            </button>

            {timers.map(timer => {
              const isRunning = timer.status === 'running';
              const progress = ((timer.durationMinutes * 60 - timer.remainingSeconds) / (timer.durationMinutes * 60)) * 100;
              const m = Math.floor(timer.remainingSeconds / 60).toString().padStart(2, '0');
              const s = (timer.remainingSeconds % 60).toString().padStart(2, '0');
              
              return (
                <div key={timer.id} className={cn("bg-gradient-to-br from-[#111113] to-[#0A0A0C] border rounded-[32px] p-6 flex flex-col transition-all relative overflow-hidden", isRunning ? "border-amber-500/30 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.15)]" : "border-[rgba(255,255,255,0.06)]")}>
                  {isRunning && <div className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${progress}%` }}></div>}
                  
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex flex-col">
                      <span className={cn("text-6xl font-black tracking-tighter tabular-nums drop-shadow-lg", isRunning ? "text-amber-500" : "text-white")}>{m}:{s}</span>
                      <span className="text-sm font-bold text-[#A1A1AA] mt-2 tracking-wide uppercase">{timer.label}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-[rgba(255,255,255,0.04)] flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleTimerState(timer.id)}
                        className={cn("flex-1 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center transition-all", 
                          isRunning ? "bg-[#1A1A1E] text-amber-500 hover:bg-amber-500/20" : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-[1.02] shadow-lg")}
                      >
                        {isRunning ? <><Pause className="size-4 mr-2"/> Pausar</> : timer.remainingSeconds < timer.durationMinutes * 60 ? <><Play className="size-4 mr-2"/> Retomar</> : <><Play className="size-4 mr-2"/> Iniciar</>}
                      </button>
                      <button onClick={() => resetTimer(timer.id)} disabled={timer.status === 'idle' && timer.remainingSeconds === timer.durationMinutes * 60} className="p-4 bg-[#1A1A1E] text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-2xl transition-colors disabled:opacity-50">
                        <Clock className="size-5" />
                      </button>
                      <button onClick={() => setTimers(timers.filter(t => t.id !== timer.id))} className="p-4 bg-[#1A1A1E] text-[#71717A] hover:bg-rose-500/20 hover:text-rose-500 rounded-2xl transition-colors">
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

      {/* MODAL CRIAR/EDITAR ALARME */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-[32px] w-full max-w-md p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-black text-white mb-6 tracking-tight flex items-center gap-2">
              <BellRing className="size-6 text-rose-500" /> {editingId ? "Editar Alarme" : "Novo Alarme"}
            </h3>
            
            <form onSubmit={handleSaveAlarm} className="flex flex-col gap-6">
              
              <div className="flex flex-col items-center">
                <input 
                  type="time" 
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                  className="w-full bg-transparent border-none text-7xl font-black text-center text-white focus:outline-none focus:ring-0 mb-2"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">Nome do Alarme</label>
                <input 
                  type="text" 
                  value={formData.label}
                  onChange={e => setFormData({...formData, label: e.target.value})}
                  placeholder="Ex: Acordar, Reunião, Tomar Remédio"
                  className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest block">Repetição</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPresetDays('weekdays')} className="text-[10px] bg-[#1A1A1E] hover:bg-rose-500/20 text-white px-2 py-1 rounded">Dias Úteis</button>
                    <button type="button" onClick={() => setPresetDays('once')} className="text-[10px] bg-[#1A1A1E] hover:bg-rose-500/20 text-white px-2 py-1 rounded">1 Vez</button>
                  </div>
                </div>
                <div className="flex justify-between gap-1.5">
                  {WEEK_DAYS.map((d, i) => (
                    <button 
                      key={i} type="button" onClick={() => toggleDay(i)}
                      className={cn("flex-1 aspect-square rounded-xl font-bold text-xs transition-colors", formData.days?.includes(i) ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]" : "bg-[#111113] text-[#71717A] border border-[rgba(255,255,255,0.06)] hover:bg-[#1A1A1E]")}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex flex-col gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest block mb-2 flex justify-between">
                    <span>Som do Alarme</span>
                    <button type="button" onClick={() => testSound(formData.sound!, formData.volume!)} className="text-rose-500 flex items-center gap-1 hover:text-white"><Play className="size-3"/> Testar</button>
                  </label>
                  <select 
                    value={formData.sound}
                    onChange={e => setFormData({...formData, sound: e.target.value})}
                    className="w-full bg-[#1A1A1E] border-none rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  >
                    {ALARM_SOUNDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                   <label className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest block mb-2 flex items-center gap-2">
                     <Volume2 className="size-3"/> Volume: {formData.volume}%
                   </label>
                   <input 
                     type="range" min="10" max="100" step="10"
                     value={formData.volume}
                     onChange={e => setFormData({...formData, volume: Number(e.target.value)})}
                     className="w-full accent-rose-500"
                   />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.04)]">
                   <label className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest flex items-center gap-2 cursor-pointer" onClick={() => setFormData({...formData, vibration: !formData.vibration})}>
                     <Smartphone className="size-3"/> Vibração
                   </label>
                   <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.vibration} onChange={() => setFormData({...formData, vibration: !formData.vibration})} />
                    <div className="w-9 h-5 bg-[#1A1A1E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <button type="button" onClick={() => { setShowModal(false); stopTestSound(); }} className="flex-1 py-4 rounded-xl text-sm font-bold bg-[#111113] text-white hover:bg-[#1A1A1E]">Cancelar</button>
                <button type="submit" className="flex-1 py-4 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)]">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRIAR TIMER */}
      {showTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Criar Temporizador</h3>
            <form onSubmit={handleAddTimer} className="flex flex-col gap-5">
              <div>
                <label className="text-[11px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">Duração (Minutos)</label>
                <input type="number" min="1" max="1440" value={newTimer.minutes} onChange={e => setNewTimer({...newTimer, minutes: Number(e.target.value)})} className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-4 text-3xl font-black text-center text-white focus:outline-none focus:border-amber-500" required />
              </div>
              <div>
                <label className="text-[11px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">Nome (Etiqueta)</label>
                <input type="text" value={newTimer.label} onChange={e => setNewTimer({...newTimer, label: e.target.value})} placeholder="Ex: Foco, Cozinhar" className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-amber-500" required />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowTimerModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-[#111113] text-white hover:bg-[#1A1A1E]">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
