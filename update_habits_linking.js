const fs = require('fs');
const path = './src/components/pos/PosHabits.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace(
  'import { usePosLibrary } from "@/hooks/use-pos-library";',
  'import { usePosLibrary } from "@/hooks/use-pos-library";\nimport { usePosStudies } from "@/hooks/use-pos-studies";\nimport { usePosAgenda } from "@/hooks/use-pos-agenda";'
);

// 2. Add icons to lucide imports
content = content.replace(
  'Pause, Play, BookOpen, X',
  'Pause, Play, BookOpen, X, GraduationCap, Calendar as CalendarIconLucide' // using GraduationCap and avoiding conflict
);

// 3. Add hooks to component
content = content.replace(
  'const { books, addReadingSession } = usePosLibrary();',
  'const { books, addReadingSession } = usePosLibrary();\n  const { courses } = usePosStudies();\n  const { events } = usePosAgenda();'
);

// 4. Update newHabit state default values
const regexNewHabit = /goal_id: "", book_id: "", days_of_week: \[\]/;
const newValues = 'goal_id: "", book_id: "", course_id: "", event_id: "", days_of_week: []';
content = content.replace(new RegExp('goal_id: "", book_id: "", days_of_week: \\[\\]', 'g'), newValues);

// Update setEditingHabitId calls and initial state:
content = content.replace(/goal_id: "", book_id: "", days_of_week: \[\] as any\[\]/g, 'goal_id: "", book_id: "", course_id: "", event_id: "", days_of_week: [] as any[]');

// Update the Edit button payload
content = content.replace(
  'book_id: habit.book_id || "",',
  'book_id: habit.book_id || "",\n                           course_id: habit.course_id || "",\n                           event_id: habit.event_id || "",'
);

// Update the handleCreate payload cleaner
content = content.replace(
  'if (!payload.book_id) delete payload.book_id;',
  'if (!payload.book_id) delete payload.book_id;\n    if (!payload.course_id) delete payload.course_id;\n    if (!payload.event_id) delete payload.event_id;'
);

// 5. Add UI Dropdowns for Course and Event inside the grid
const linkingSection = `
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Vincular Livro (Opcional)</label>
              <select 
                value={newHabit.book_id || ''} onChange={e => setNewHabit({...newHabit, book_id: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="">Nenhum Livro</option>
                {books.filter(b => b.status === 'lendo' || b.status === 'quero_ler').map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
          </div>
`;
const newLinkingSection = `
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Vincular Livro (Opcional)</label>
              <select 
                value={newHabit.book_id || ''} onChange={e => setNewHabit({...newHabit, book_id: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="">Nenhum Livro</option>
                {books.filter(b => b.status === 'lendo' || b.status === 'quero_ler').map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Vincular Curso (Opcional)</label>
              <select 
                value={newHabit.course_id || ''} onChange={e => setNewHabit({...newHabit, course_id: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="">Nenhum Curso</option>
                {courses.filter(c => c.status !== 'concluido').map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Vincular Compromisso (Opcional)</label>
              <select 
                value={newHabit.event_id || ''} onChange={e => setNewHabit({...newHabit, event_id: e.target.value})}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
              >
                <option value="">Nenhum Evento</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
          </div>
`;
content = content.replace(linkingSection, newLinkingSection);

// Make the linking grid a 2-column or 3-column instead of 3-column because we added more fields.
// The original was grid-cols-1 md:grid-cols-3
content = content.replace(
  'className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-4 bg-[#1A1A1E]/50 rounded-xl border border-[rgba(255,255,255,0.02)]"',
  'className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 p-4 bg-[#1A1A1E]/50 rounded-xl border border-[rgba(255,255,255,0.02)]"'
);

// 6. Add tags to the habit card
const bookTag = `
                  {habit.book_id && (
                     <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                       <BookOpen className="size-3 text-emerald-400" />
                       <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest truncate">Leitura: {books.find(b => b.id === habit.book_id)?.title || 'Desconhecida'}</span>
                     </div>
                  )}`;
                  
const newTags = `
                  {habit.book_id && (
                     <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                       <BookOpen className="size-3 text-emerald-400" />
                       <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest truncate">Leitura: {books.find(b => b.id === habit.book_id)?.title || 'Desconhecida'}</span>
                     </div>
                  )}
                  {habit.course_id && (
                     <div className="mb-4 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                       <GraduationCap className="size-3 text-cyan-400" />
                       <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest truncate">Curso: {courses.find(c => c.id === habit.course_id)?.title || 'Desconhecido'}</span>
                     </div>
                  )}
                  {habit.event_id && (
                     <div className="mb-4 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                       <CalendarIconLucide className="size-3 text-indigo-400" />
                       <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest truncate">Agenda: {events.find(e => e.id === habit.event_id)?.title || 'Desconhecido'}</span>
                     </div>
                  )}`;

content = content.replace(bookTag, newTags);

fs.writeFileSync(path, content, 'utf8');
