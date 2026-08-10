import { useState, useEffect } from "react";
import { format } from "date-fns";

export interface HealthLog {
  date: string;
  waterGlasses: number;
  sleepHours: number;
  sleepQuality: 'ruim' | 'regular' | 'bom' | 'excelente' | null;
  workoutDone: boolean;
  workoutType: string | null;
}

export function usePosHealth() {
  const [logs, setLogs] = useState<Record<string, HealthLog>>({});

  useEffect(() => {
    const saved = localStorage.getItem('lifeos_pos_health_logs');
    if (saved) {
      setLogs(JSON.parse(saved));
    }

    const handleSync = () => {
      const updated = localStorage.getItem('lifeos_pos_health_logs');
      if (updated) setLogs(JSON.parse(updated));
    };

    window.addEventListener('pos-health-sync', handleSync);
    return () => window.removeEventListener('pos-health-sync', handleSync);
  }, []);

  const saveLogs = (newLogs: Record<string, HealthLog>) => {
    setLogs(newLogs);
    localStorage.setItem('lifeos_pos_health_logs', JSON.stringify(newLogs));
    window.dispatchEvent(new Event('pos-health-sync'));
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const getLog = (date: string = todayStr): HealthLog => {
    return logs[date] || {
      date,
      waterGlasses: 0,
      sleepHours: 0,
      sleepQuality: null,
      workoutDone: false,
      workoutType: null
    };
  };

  const updateLog = (date: string, updates: Partial<HealthLog>) => {
    const current = getLog(date);
    const updated = { ...current, ...updates, date };
    saveLogs({ ...logs, [date]: updated });
  };

  return { logs, getLog, updateLog, todayStr };
}
