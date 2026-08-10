import { useState } from "react";
import { Droplet, Moon, Dumbbell, Flame, Check, X, Plus, Minus } from "lucide-react";
import { usePosHealth } from "@/hooks/use-pos-health";
import { cn } from "@/lib/utils";

export function PosHealth() {
  const { getLog, updateLog, todayStr } = usePosHealth();
  const log = getLog(todayStr);

  return (
    <div className="p-4 md:p-10 max-w-[1400px] mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Flame className="size-8 text-rose-500" /> Health OS
        </h2>
        <p className="text-[#A1A1AA] text-sm mt-2 max-w-xl leading-relaxed">
          Sua performance operacional depende da sua máquina física. Controle seu treino, hidratação e sono para manter os níveis de XP multiplicados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Treino (Workout) */}
        <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] hover:border-rose-500/30 transition-colors rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Dumbbell className="size-32 text-rose-500 transform rotate-12" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
                <Dumbbell className="size-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Treino de Hoje</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <button 
                  onClick={() => updateLog(todayStr, { workoutDone: true })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border text-sm font-bold transition-all",
                    log.workoutDone ? "bg-rose-500/20 border-rose-500/50 text-rose-500" : "bg-[#1A1A1E] border-[rgba(255,255,255,0.05)] text-white hover:bg-[#27272A]"
                  )}
                >
                  <Check className="size-4" /> Concluído
                </button>
                <button 
                  onClick={() => updateLog(todayStr, { workoutDone: false, workoutType: null })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border text-sm font-bold transition-all",
                    !log.workoutDone ? "bg-[#27272A] border-[rgba(255,255,255,0.1)] text-[#A1A1AA]" : "bg-[#1A1A1E] border-[rgba(255,255,255,0.05)] text-[#71717A] hover:bg-[#27272A]"
                  )}
                >
                  <X className="size-4" /> Descanso
                </button>
              </div>

              {log.workoutDone && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest block mb-2">Tipo de Treino</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Musculação - Peito e Tríceps"
                    value={log.workoutType || ''}
                    onChange={(e) => updateLog(todayStr, { workoutType: e.target.value })}
                    className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Água (Water) */}
        <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] hover:border-[#38bdf8]/30 transition-colors rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Droplet className="size-32 text-[#38bdf8] transform rotate-12" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#38bdf8]/10 rounded-xl text-[#38bdf8]">
                <Droplet className="size-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Hidratação</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-4">Copos d'água (250ml)</div>
              <div className="flex items-center gap-6 mb-6">
                <button 
                  onClick={() => updateLog(todayStr, { waterGlasses: Math.max(0, log.waterGlasses - 1) })}
                  className="size-12 rounded-full border border-[rgba(255,255,255,0.1)] bg-[#1A1A1E] flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition-all"
                >
                  <Minus className="size-5" />
                </button>
                
                <div className="text-5xl font-black text-white tracking-tighter w-16 text-center">
                  {log.waterGlasses}
                </div>
                
                <button 
                  onClick={() => updateLog(todayStr, { waterGlasses: log.waterGlasses + 1 })}
                  className="size-12 rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/10 flex items-center justify-center text-[#38bdf8] hover:bg-[#38bdf8]/20 transition-all shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                >
                  <Plus className="size-5" />
                </button>
              </div>

              <div className="w-full bg-[#1A1A1E] h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#38bdf8]/50 to-[#38bdf8] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (log.waterGlasses / 8) * 100)}%` }}
                />
              </div>
              <div className="w-full flex justify-between mt-2 text-[10px] font-bold text-[#A1A1AA] uppercase">
                <span>0L</span>
                <span>Meta: 2L</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sono (Sleep) */}
        <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] hover:border-indigo-500/30 transition-colors rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Moon className="size-32 text-indigo-400 transform -rotate-12" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Moon className="size-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Descanso e Sono</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest block mb-3">Horas de Sono</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0" max="12" step="0.5"
                    value={log.sleepHours}
                    onChange={(e) => updateLog(todayStr, { sleepHours: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                  <span className="font-mono font-bold text-lg w-12 text-right text-indigo-400">{log.sleepHours}h</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest block mb-3">Qualidade</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ruim', label: 'Ruim' },
                    { id: 'regular', label: 'Regular' },
                    { id: 'bom', label: 'Bom' },
                    { id: 'excelente', label: 'Excelente' }
                  ].map(q => (
                    <button
                      key={q.id}
                      onClick={() => updateLog(todayStr, { sleepQuality: q.id as any })}
                      className={cn(
                        "py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center",
                        log.sleepQuality === q.id 
                          ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" 
                          : "bg-[#1A1A1E] border-[rgba(255,255,255,0.05)] text-[#71717A] hover:bg-[#27272A] hover:text-white"
                      )}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
