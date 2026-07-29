const fs = require('fs');
const path = './src/routes/personal-os.tsx';
let content = fs.readFileSync(path, 'utf8');

const quickActionsHtml = `
            <div className="flex gap-2">
              <button onClick={() => {}} className="bg-[#111113] hover:bg-emerald-500/10 border border-[#1C1C21] hover:border-emerald-500/30 text-[#A1A1AA] hover:text-emerald-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <CheckSquare className="size-3" /> Tarefa
              </button>
              <button onClick={() => {}} className="bg-[#111113] hover:bg-rose-500/10 border border-[#1C1C21] hover:border-rose-500/30 text-[#A1A1AA] hover:text-rose-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Activity className="size-3" /> Hábito
              </button>
              <button onClick={() => {}} className="bg-[#111113] hover:bg-indigo-500/10 border border-[#1C1C21] hover:border-indigo-500/30 text-[#A1A1AA] hover:text-indigo-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Calendar className="size-3" /> Agenda
              </button>
            </div>
`;

// 1. Respiro e Pico
const respiroHeader = `        <div className="mb-6">
          <h2 className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest mb-4">Respiro e Pico</h2>
          <div className="w-full h-px bg-gradient-to-r from-[#1C1C21] via-[#1C1C21] to-transparent"></div>
        </div>`;

const newRespiroHeader = `        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest">Respiro e Pico</h2>
${quickActionsHtml}
          </div>
          <div className="w-full h-px bg-gradient-to-r from-[#1C1C21] via-[#1C1C21] to-transparent"></div>
        </div>`;
content = content.replace(respiroHeader, newRespiroHeader);

// 2. Compromissos por Semana
const compromissosHeader = `        <div className="mb-6">
          <h2 className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest mb-4">Compromissos por Semana</h2>
          <div className="w-full h-px bg-gradient-to-r from-[#1C1C21] via-[#1C1C21] to-transparent"></div>
        </div>`;

const newCompromissosHeader = `        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest">Compromissos por Semana</h2>
${quickActionsHtml}
          </div>
          <div className="w-full h-px bg-gradient-to-r from-[#1C1C21] via-[#1C1C21] to-transparent"></div>
        </div>`;
content = content.replace(compromissosHeader, newCompromissosHeader);

// 3. Com Quem Você Anda
const andasHeader = `        <div className="mb-6">
          <h2 className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest mb-4">Com Quem Você Anda</h2>
          <div className="w-full h-px bg-gradient-to-r from-[#1C1C21] via-[#1C1C21] to-transparent"></div>
        </div>`;

const newAndasHeader = `        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest">Com Quem Você Anda</h2>
${quickActionsHtml}
          </div>
          <div className="w-full h-px bg-gradient-to-r from-[#1C1C21] via-[#1C1C21] to-transparent"></div>
        </div>`;
content = content.replace(andasHeader, newAndasHeader);

fs.writeFileSync(path, content, 'utf8');
console.log("Headers updated successfully.");
