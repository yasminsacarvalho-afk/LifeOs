import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { BellRing, X, Zzz, Clock, Volume2, Power } from 'lucide-react';
import { format, addMinutes } from 'date-fns';

export interface PosAlarm {
  id: string;
  time: string; // "HH:mm"
  label: string;
  enabled: boolean;
  days: number[]; // 0=Dom, 1=Seg... vazio = dispara 1 vez e desativa
  sound: string;
  volume: number;
  vibration: boolean;
  snoozedUntil: number | null; // timestamp se estiver em soneca
}

export const ALARM_SOUNDS = [
  { id: 'radar', name: 'Digital (Radar)', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
  { id: 'classic', name: 'Relógio Clássico', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
  { id: 'buzzer', name: 'Buzzer Alto', url: 'https://actions.google.com/sounds/v1/alarms/buzzer_alarm.ogg' },
];

interface AlarmsContextType {
  alarms: PosAlarm[];
  saveAlarms: (alarms: PosAlarm[]) => void;
  toggleAlarm: (id: string) => void;
  deleteAlarm: (id: string) => void;
  addAlarm: (alarm: PosAlarm) => void;
  updateAlarm: (id: string, updated: Partial<PosAlarm>) => void;
  snoozeAlarm: (id: string, minutes: number) => void;
  stopAlarm: (id: string) => void;
  ringingAlarm: PosAlarm | null;
  testSound: (soundId: string, volume: number) => void;
  stopTestSound: () => void;
}

const AlarmsContext = createContext<AlarmsContextType | undefined>(undefined);

export const useAlarms = () => {
  const context = useContext(AlarmsContext);
  if (!context) throw new Error("useAlarms must be used within AlarmsProvider");
  return context;
};

export const AlarmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alarms, setAlarms] = useState<PosAlarm[]>(() => {
    try {
      const stored = localStorage.getItem('lifeos_alarms_v2');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [ringingAlarm, setRingingAlarm] = useState<PosAlarm | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  const saveAlarms = (newAlarms: PosAlarm[]) => {
    setAlarms(newAlarms);
    localStorage.setItem('lifeos_alarms_v2', JSON.stringify(newAlarms));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const timeStr = `${currentHours}:${currentMinutes}`;
      const currentDay = now.getDay();
      const currentTimestamp = now.getTime();

      // Checa a cada segundo (mas só dispara no segundo 0 para evitar múltiplos disparos no mesmo minuto, exceto snooze)
      let shouldCheckRegularAlarms = now.getSeconds() === 0;

      alarms.forEach(alarm => {
        if (!alarm.enabled) return;

        let shouldRing = false;

        // Verifica Soneca
        if (alarm.snoozedUntil && currentTimestamp >= alarm.snoozedUntil) {
          shouldRing = true;
        } 
        // Verifica Horário Normal
        else if (shouldCheckRegularAlarms && alarm.time === timeStr && !alarm.snoozedUntil) {
          // Se não tem dias definidos (toca apenas uma vez), ou se o dia atual está no array
          if (alarm.days.length === 0 || alarm.days.includes(currentDay)) {
             shouldRing = true;
          }
        }

        if (shouldRing && !ringingAlarm) {
           triggerAlarmUI(alarm);
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [alarms, ringingAlarm]);

  const triggerAlarmUI = async (alarm: PosAlarm) => {
    setRingingAlarm(alarm);
    
    // Notificação do Sistema
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) permissionGranted = (await requestPermission()) === 'granted';
      if (permissionGranted) {
        sendNotification({ title: `Alarme: ${alarm.label}`, body: `Está na hora: ${alarm.time}` });
      }
    } catch {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Alarme: ${alarm.label}`, { body: `Está na hora: ${alarm.time}` });
      }
    }

    // Vibração (Mobile Web API)
    if (alarm.vibration && "vibrate" in navigator) {
      navigator.vibrate([500, 500, 500, 500, 500]);
    }

    // Áudio
    const soundData = ALARM_SOUNDS.find(s => s.id === alarm.sound) || ALARM_SOUNDS[0];
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(soundData.url);
    audio.loop = true;
    audio.volume = alarm.volume / 100;
    audioRef.current = audio;
    audio.play().catch(e => console.error("Autoplay bloqueado", e));
  };

  const stopAlarm = (id: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setRingingAlarm(null);

    // Se o alarme for "Apenas uma vez" (days.length === 0), desativar ele
    saveAlarms(alarms.map(a => {
      if (a.id === id) {
        return { ...a, snoozedUntil: null, enabled: a.days.length > 0 };
      }
      return a;
    }));
  };

  const snoozeAlarm = (id: string, minutes: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setRingingAlarm(null);
    const snoozeTime = addMinutes(new Date(), minutes).getTime();
    saveAlarms(alarms.map(a => a.id === id ? { ...a, snoozedUntil: snoozeTime } : a));
  };

  const toggleAlarm = (id: string) => {
    saveAlarms(alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled, snoozedUntil: null } : a));
  };

  const deleteAlarm = (id: string) => {
    saveAlarms(alarms.filter(a => a.id !== id));
  };

  const addAlarm = (alarm: PosAlarm) => {
    saveAlarms([...alarms, alarm]);
  };

  const updateAlarm = (id: string, updated: Partial<PosAlarm>) => {
    saveAlarms(alarms.map(a => a.id === id ? { ...a, ...updated } : a));
  };

  const testSound = (soundId: string, volume: number) => {
    stopTestSound();
    const soundData = ALARM_SOUNDS.find(s => s.id === soundId) || ALARM_SOUNDS[0];
    const audio = new Audio(soundData.url);
    audio.volume = volume / 100;
    testAudioRef.current = audio;
    audio.play().catch(e => console.error(e));
  };

  const stopTestSound = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current = null;
    }
  };

  return (
    <AlarmsContext.Provider value={{
      alarms, saveAlarms, toggleAlarm, deleteAlarm, addAlarm, updateAlarm, 
      snoozeAlarm, stopAlarm, ringingAlarm, testSound, stopTestSound
    }}>
      {children}
      
      {/* Modal Tela Cheia do Alarme Tocando */}
      {ringingAlarm && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none"></div>
          
          <div className="flex flex-col items-center justify-center text-center relative z-10 w-full max-w-lg bg-[#111113]/80 border border-rose-500/30 p-8 md:p-12 rounded-[40px] shadow-[0_0_100px_rgba(225,29,72,0.3)]">
            <BellRing className="size-16 text-rose-500 animate-bounce mb-6" />
            
            <h2 className="text-7xl md:text-8xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg mb-4">
              {format(new Date(), 'HH:mm')}
            </h2>
            
            <p className="text-2xl md:text-3xl font-bold text-rose-400 mb-12 tracking-tight">
              {ringingAlarm.label}
            </p>

            <div className="w-full grid grid-cols-2 gap-4 mb-6">
               <button 
                 onClick={() => snoozeAlarm(ringingAlarm.id, 5)}
                 className="col-span-1 bg-[#1A1A1E] hover:bg-[#2A2A2E] text-white border border-[rgba(255,255,255,0.1)] py-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition-colors"
               >
                 <Zzz className="size-5 text-amber-400" /> Soneca 5m
               </button>
               <button 
                 onClick={() => snoozeAlarm(ringingAlarm.id, 10)}
                 className="col-span-1 bg-[#1A1A1E] hover:bg-[#2A2A2E] text-white border border-[rgba(255,255,255,0.1)] py-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition-colors"
               >
                 <Zzz className="size-5 text-amber-400" /> Soneca 10m
               </button>
            </div>

            <button 
              onClick={() => stopAlarm(ringingAlarm.id)}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(225,29,72,0.5)] hover:scale-105 transition-all"
            >
              <Power className="size-6" /> PARAR ALARME
            </button>
          </div>
        </div>
      )}
    </AlarmsContext.Provider>
  );
};
