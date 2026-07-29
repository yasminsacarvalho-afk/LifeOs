const fs = require('fs');
const path = './src/routes/personal-os.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace Jarvis with Kodah
content = content.replace(/Jarvis/g, 'Kodah');
content = content.replace(/jarvis/g, 'kodah');
content = content.replace(/J\.A\.R\.V\.I\.S/g, 'K.O.D.A.H');

// 2. Add Daily Commitments Board
// We'll insert it right after the Hero Section closing div.
const heroSectionEndStr = `        </div>
      </div>`;

const newWidget = `
      {/* Missões Diárias (Azul & Vermelho) */}
      <div className="mt-2 mb-2 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#0A0A0C] to-[#111113] border border-[rgba(255,255,255,0.04)] shadow-2xl relative overflow-hidden">
        {/* Glows */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#38bdf8] rounded-full blur-[120px] opacity-10"></div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-rose-500 rounded-full blur-[120px] opacity-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
           <div>
             <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
               <Target className="size-6 text-[#38bdf8]" /> Painel de Missões Diárias
             </h3>
             <p className="text-[#A1A1AA] text-sm mt-1">Seu balanço de compromissos e atividades para hoje.</p>
           </div>
           
           <div className="flex gap-4">
             <div className="bg-[#111113] border border-[rgba(56,189,248,0.2)] rounded-2xl px-5 py-3 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.05)]">
               <span className="text-[10px] font-bold uppercase tracking-widest text-[#38bdf8] mb-1">Produtividade</span>
               <span className="text-xl font-black text-white">{tasksDueToday.length > 0 ? Math.round((tasksDueToday.filter(t => t.status === 'concluida').length / tasksDueToday.length) * 100) : 100}%</span>
             </div>
             <div className="bg-[#111113] border border-[rgba(225,29,72,0.2)] rounded-2xl px-5 py-3 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.05)]">
               <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">Hábitos</span>
               <span className="text-xl font-black text-white">{habitsTodayCount > 0 ? Math.round((habitsCompletedToday / habitsTodayCount) * 100) : 100}%</span>
             </div>
           </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarefas */}
          <div className="bg-[#1A1A1E]/50 border border-[rgba(255,255,255,0.03)] rounded-2xl p-5 hover:bg-[#1A1A1E] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2"><CheckSquare className="size-4 text-[#38bdf8]" /> Tarefas</h4>
              <span className="text-[10px] font-bold bg-[#38bdf8]/10 text-[#38bdf8] px-2 py-1 rounded-md">{tasksDueToday.filter(t => t.status === 'concluida').length} de {tasksDueToday.length}</span>
            </div>
            <div className="space-y-3">
               {tasksDueToday.length === 0 ? (
                 <p className="text-xs text-[#71717A] italic">Nenhuma tarefa agendada.</p>
               ) : (
                 tasksDueToday.map(t => (
                   <div key={t.id} className="flex items-start gap-3">
                     <div className={\`mt-0.5 size-4 rounded-full flex-shrink-0 border flex items-center justify-center \${t.status === 'concluida' ? 'bg-[#38bdf8] border-[#38bdf8]' : 'border-[#3F3F46]'}\`}>
                        {t.status === 'concluida' && <CheckSquare className="size-2.5 text-black" />}
                     </div>
                     <span className={\`text-xs font-medium line-clamp-2 \${t.status === 'concluida' ? 'text-[#71717A] line-through' : 'text-[#D4D4D8]'}\`}>{t.title}</span>
                   </div>
                 ))
               )}
            </div>
          </div>

          {/* Hábitos */}
          <div className="bg-[#1A1A1E]/50 border border-[rgba(255,255,255,0.03)] rounded-2xl p-5 hover:bg-[#1A1A1E] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="size-4 text-rose-500" /> Hábitos</h4>
              <span className="text-[10px] font-bold bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md">{habitsCompletedToday} de {habitsTodayCount}</span>
            </div>
            <div className="space-y-3">
               {habitsTodayCount === 0 ? (
                 <p className="text-xs text-[#71717A] italic">Nenhum hábito hoje.</p>
               ) : (
                 habits.map(h => {
                   const isDone = habitLogs.some(l => l.habit_id === h.id && l.log_date === todayStr && l.status === 'concluido');
                   return (
                     <div key={h.id} className="flex items-start gap-3">
                       <div className={\`mt-0.5 size-4 rounded-full flex-shrink-0 border flex items-center justify-center \${isDone ? 'bg-rose-500 border-rose-500' : 'border-[#3F3F46]'}\`}>
                          {isDone && <CheckSquare className="size-2.5 text-white" />}
                       </div>
                       <span className={\`text-xs font-medium line-clamp-2 \${isDone ? 'text-[#71717A] line-through' : 'text-[#D4D4D8]'}\`}>{h.title}</span>
                     </div>
                   );
                 })
               )}
            </div>
          </div>

          {/* Agenda */}
          <div className="bg-[#1A1A1E]/50 border border-[rgba(255,255,255,0.03)] rounded-2xl p-5 hover:bg-[#1A1A1E] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2"><Calendar className="size-4 text-indigo-400" /> Agenda</h4>
              <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md">{eventsTodayDetails.length} eventos</span>
            </div>
            <div className="space-y-3">
               {eventsTodayDetails.length === 0 ? (
                 <p className="text-xs text-[#71717A] italic">Nenhum compromisso.</p>
               ) : (
                 eventsTodayDetails.map(e => (
                   <div key={e.id} className="flex items-start gap-3">
                     <div className="mt-0.5 size-4 rounded-full flex-shrink-0 bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                        <div className="size-1.5 rounded-full bg-indigo-400"></div>
                     </div>
                     <div>
                       <span className="text-xs font-medium text-[#D4D4D8] block line-clamp-1">{e.title}</span>
                       <span className="text-[10px] font-bold text-indigo-400 mt-0.5 block">{e.start_time?.slice(0,5)}</span>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      </div>
`;

// Insert the calculation for tasksDueToday before tasksForToday
content = content.replace(
  'const tasksForToday = tasks.filter(t => {',
  'const tasksDueToday = tasks.filter(t => { const d = getSafeDate(t.deadline); return d && isToday(d); });\n  const tasksForToday = tasks.filter(t => {'
);

// Insert the widget
content = content.replace(heroSectionEndStr, heroSectionEndStr + "\n" + newWidget);

fs.writeFileSync(path, content, 'utf8');
