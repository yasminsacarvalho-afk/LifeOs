import { useState, useEffect } from "react";
import { useTripsRealtime } from "@/hooks/use-trips-realtime";
import { ArrowDown, ArrowUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export function GlobalNextTripTicker() {
  const { trips } = useTripsRealtime();
  const [now, setNow] = useState(new Date());
  const [isNativeEnabled, setIsNativeEnabled] = useState(() => localStorage.getItem('lifeos_native_trip_ticker') === 'true');

  useEffect(() => {
    const handlePref = () => setIsNativeEnabled(localStorage.getItem('lifeos_native_trip_ticker') === 'true');
    window.addEventListener('lifeos_ticker_pref_changed', handlePref);
    return () => window.removeEventListener('lifeos_ticker_pref_changed', handlePref);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayWeekDay = now.getDay();
  
  const pendingTrips = trips.filter(t => {
    const runsToday = t.operating_days ? t.operating_days.includes(todayWeekDay) : true;
    return runsToday && t.status !== "checked-in";
  });

  const nextDescendo = pendingTrips
    .filter(t => t.direction === "descendo")
    .sort((a, b) => new Date(a.raw_scheduled_departure!).getTime() - new Date(b.raw_scheduled_departure!).getTime())[0];

  const nextSubindo = pendingTrips
    .filter(t => t.direction === "subindo")
    .sort((a, b) => new Date(a.raw_scheduled_departure!).getTime() - new Date(b.raw_scheduled_departure!).getTime())[0];

  const formatCountdown = (seconds: number) => {
    const sign = seconds < 0 ? "-" : "";
    const abs = Math.abs(seconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    if (h > 0) return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!isNativeEnabled) return;
    
    const sendNotif = async () => {
      let bodyStr = '';
      if (nextDescendo) {
         const diffD = Math.round((new Date(nextDescendo.raw_scheduled_departure!).getTime() - Date.now()) / 1000);
         bodyStr += `Descendo: ${formatCountdown(diffD)}\n`;
      }
      if (nextSubindo) {
         const diffS = Math.round((new Date(nextSubindo.raw_scheduled_departure!).getTime() - Date.now()) / 1000);
         bodyStr += `Subindo: ${formatCountdown(diffS)}`;
      }
      
      if (!bodyStr) return;
      
      try {
        let perm = await isPermissionGranted();
        if (!perm) perm = (await requestPermission()) === 'granted';
        if (perm) {
          sendNotification({ title: 'Monitor de Frota', body: bodyStr.trim() });
        }
      } catch(e) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification('Monitor de Frota', { 
             body: bodyStr.trim(), 
             tag: 'fleet-monitor', 
             silent: true, 
             renotify: false 
          });
        }
      }
    };

    sendNotif();
    const id = setInterval(sendNotif, 60000); // 1 min
    return () => clearInterval(id);
  }, [isNativeEnabled, nextDescendo, nextSubindo]);

  if (!isNativeEnabled) return null;
  if (!nextDescendo && !nextSubindo) return null;

  const renderTickerItem = (trip: any, label: string, icon: any, colorClass: string, bgClass: string) => {
    if (!trip) return null;
    const sched = new Date(trip.raw_scheduled_departure!).getTime();
    const diffSec = Math.round((sched - now.getTime()) / 1000);
    const isDelayed = diffSec < 0;
    const isImminent = diffSec >= 0 && diffSec <= 900; // 15 mins

    let stateClass = "border-[rgba(255,255,255,0.06)]";
    let textClass = "text-white";
    if (isDelayed) {
      stateClass = "border-rose-500/30 bg-rose-500/5";
      textClass = "text-rose-500";
    } else if (isImminent) {
      stateClass = "border-amber-500/30 bg-amber-500/5";
      textClass = "text-amber-500";
    }

    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-colors", stateClass)}>
        <div className={cn("flex items-center justify-center p-1 rounded-full", bgClass, colorClass)}>
          {icon}
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none mb-0.5">
             <span className={cn("text-[9px] uppercase font-bold tracking-widest", colorClass)}>{label}</span>
             <span className="text-[9px] font-mono opacity-60">{trip.code}</span>
          </div>
          <div className="flex items-center gap-1 leading-none">
            <Clock className={cn("size-3", textClass)} />
            <span className={cn("text-xs font-black tabular-nums tracking-tight", textClass)}>
              {formatCountdown(diffSec)}
            </span>
            <span className="text-[10px] opacity-50 ml-0.5">({trip.departure})</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="hidden lg:flex items-center gap-3 mr-2 animate-in fade-in">
      {renderTickerItem(nextDescendo, "Descendo", <ArrowDown className="size-3" />, "text-cyan-400", "bg-cyan-500/20")}
      {renderTickerItem(nextSubindo, "Subindo", <ArrowUp className="size-3" />, "text-orange-400", "bg-orange-500/20")}
    </div>
  );
}
