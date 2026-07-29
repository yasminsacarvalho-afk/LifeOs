import { useState, useMemo } from 'react';
import { PosBook, PosReadingSession } from '@/hooks/use-pos-library';
import { 
  Award, Trophy, Medal, Star, Flame, Crown, Book, FileText, 
  Clock, CalendarDays, Library, Globe, GraduationCap, Target 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PosLibraryAchievementsProps {
  books: PosBook[];
  sessions: PosReadingSession[];
}

export function PosLibraryAchievements({ books, sessions }: PosLibraryAchievementsProps) {
  const [activeTab, setActiveTab] = useState<string>('livros');

  const { metrics, achievementGroups, colorMap } = useMemo(() => {
    const totalPages = sessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
    const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    const completedBooks = books.filter(b => b.status === 'concluido');
    const totalCompleted = completedBooks.length;
    const maxSessionPages = sessions.length > 0 ? Math.max(...sessions.map(s => s.pages_read || 0)) : 0;
    const uniqueCategories = new Set(books.filter(b => b.knowledge_area).map(b => b.knowledge_area)).size;
    const uniqueAuthors = new Set(books.filter(b => b.author).map(b => b.author)).size;
    const uniqueLanguages = new Set(books.filter(b => b.language).map(b => b.language)).size;
    const notesCount = sessions.filter(s => s.notes && s.notes.trim().length > 0).length;
    const summariesCount = books.filter(b => b.summary && b.summary.trim().length > 0).length;
    const ratingsCount = books.filter(b => (b.rating || 0) > 0).length;

    // Simple Streak Logic
    const uniqueDates = [...new Set(sessions.map(s => s.session_date))].sort().reverse();
    let currentStreak = 0;
    let checkDate = new Date();
    
    if (uniqueDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
      if (uniqueDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
    while (uniqueDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const maxStreak = Math.max(currentStreak, uniqueDates.length > 0 ? 1 : 0); // Simplified

    const getBooksByCategory = (cat: string) => books.filter(b => b.knowledge_area === cat).length;

    const isNightReader = sessions.some(s => s.start_time && parseInt(s.start_time.split(':')[0]) >= 21) || sessions.length > 15;
    
    // Evaluate Groups
    const groups = [
      {
        id: 'livros',
        label: 'Livros',
        icon: <Book className="size-4" />,
        color: 'rose',
        items: [
          { title: 'Primeiro Livro', desc: 'Sua jornada começou.', target: 1, current: totalCompleted, icon: <Medal /> },
          { title: '10 Livros Lidos', desc: 'Formando o hábito.', target: 10, current: totalCompleted, icon: <Star /> },
          { title: '50 Livros Lidos', desc: 'Devorador de obras.', target: 50, current: totalCompleted, icon: <Award /> },
          { title: '100 Livros Lidos', desc: 'Um mestre literário.', target: 100, current: totalCompleted, icon: <Trophy /> },
          { title: 'Total Lidos', desc: 'Registro histórico geral.', target: totalCompleted || 1, current: totalCompleted, icon: <Crown />, hideProgress: true },
        ]
      },
      {
        id: 'paginas',
        label: 'Páginas',
        icon: <FileText className="size-4" />,
        color: 'amber',
        items: [
          { title: '100 Páginas', desc: 'Centenas de ideias.', target: 100, current: totalPages, icon: <Star /> },
          { title: '1.000 Páginas', desc: 'Milhares de palavras.', target: 1000, current: totalPages, icon: <Medal /> },
          { title: '5.000 Páginas', desc: 'Mar de conhecimento.', target: 5000, current: totalPages, icon: <Award /> },
          { title: '10.000 Páginas', desc: 'Lenda da leitura.', target: 10000, current: totalPages, icon: <Trophy /> },
          { title: 'Total Lidas', desc: 'Todas as páginas somadas.', target: totalPages || 1, current: totalPages, icon: <Crown />, hideProgress: true },
        ]
      },
      {
        id: 'tempo',
        label: 'Tempo',
        icon: <Clock className="size-4" />,
        color: 'blue',
        items: [
          { title: '10 Horas', desc: 'Foco inicial.', target: 600, current: totalMinutes, icon: <Star />, suffix: 'm' },
          { title: '50 Horas', desc: 'Mente treinada.', target: 3000, current: totalMinutes, icon: <Medal />, suffix: 'm' },
          { title: '100 Horas', desc: 'Imersão profunda.', target: 6000, current: totalMinutes, icon: <Award />, suffix: 'm' },
          { title: '500 Horas', desc: 'Sábio do tempo.', target: 30000, current: totalMinutes, icon: <Trophy />, suffix: 'm' },
          { title: 'Tempo Total', desc: 'Em minutos gastos.', target: totalMinutes || 1, current: totalMinutes, icon: <Crown />, hideProgress: true, suffix: 'm' },
        ]
      },
      {
        id: 'consistencia',
        label: 'Consistência',
        icon: <Flame className="size-4" />,
        color: 'orange',
        items: [
          { title: 'Leitura Diária', desc: 'Leu hoje.', target: 1, current: currentStreak > 0 ? 1 : 0, icon: <Star /> },
          { title: 'Sequência de 7 Dias', desc: 'Uma semana perfeita.', target: 7, current: currentStreak, icon: <Flame /> },
          { title: 'Sequência de 30 Dias', desc: 'Um mês implacável.', target: 30, current: currentStreak, icon: <Award /> },
          { title: 'Sequência de 100 Dias', desc: 'O hábito supremo.', target: 100, current: currentStreak, icon: <Trophy /> },
          { title: 'Maior Sequência', desc: 'Seu recorde pessoal.', target: maxStreak || 1, current: maxStreak, icon: <Crown />, hideProgress: true },
        ]
      },
      {
        id: 'categorias',
        label: 'Por Categoria',
        icon: <Library className="size-4" />,
        color: 'purple',
        items: [
          { title: 'Filosofia', desc: 'Obras filosóficas lidas.', target: 5, current: getBooksByCategory('Filosofia'), icon: <Book /> },
          { title: 'Psicologia', desc: 'Mente e comportamento.', target: 5, current: getBooksByCategory('Psicologia'), icon: <Book /> },
          { title: 'Negócios', desc: 'Estratégia e empresas.', target: 5, current: getBooksByCategory('Negócios'), icon: <Book /> },
          { title: 'Finanças', desc: 'Inteligência Financeira.', target: 5, current: getBooksByCategory('Finanças'), icon: <Book /> },
          { title: 'Tecnologia', desc: 'Inovação e sistemas.', target: 5, current: getBooksByCategory('Tecnologia'), icon: <Book /> },
        ]
      },
      {
        id: 'diversidade',
        label: 'Diversidade',
        icon: <Globe className="size-4" />,
        color: 'emerald',
        items: [
          { title: '3 Categorias', desc: 'Variando o conhecimento.', target: 3, current: uniqueCategories, icon: <Globe /> },
          { title: '10 Categorias', desc: 'Polímata moderno.', target: 10, current: uniqueCategories, icon: <Award /> },
          { title: '5 Autores Diferentes', desc: 'Novas perspectivas.', target: 5, current: uniqueAuthors, icon: <Medal /> },
          { title: '2 Idiomas', desc: 'Leitura poliglotica.', target: 2, current: uniqueLanguages, icon: <Trophy /> },
        ]
      },
      {
        id: 'aprendizado',
        label: 'Aprendizado',
        icon: <GraduationCap className="size-4" />,
        color: 'cyan',
        items: [
          { title: '10 Anotações', desc: 'Registrando insights.', target: 10, current: notesCount, icon: <FileText /> },
          { title: '50 Anotações', desc: 'Cérebro digital ativo.', target: 50, current: notesCount, icon: <Award /> },
          { title: '5 Resumos', desc: 'Sínteses criadas.', target: 5, current: summariesCount, icon: <Medal /> },
          { title: 'Todos Avaliados', desc: '10 livros com nota.', target: 10, current: ratingsCount, icon: <Star /> },
        ]
      },
      {
        id: 'especiais',
        label: 'Especiais',
        icon: <Target className="size-4" />,
        color: 'indigo',
        items: [
          { title: 'Maratonista', desc: '+50 páginas em 1 sessão.', target: 50, current: maxSessionPages, icon: <Flame /> },
          { title: 'Leitor Noturno', desc: 'Foco na madrugada.', target: 1, current: isNightReader ? 1 : 0, icon: <Star /> },
          { title: 'Reler um Livro', desc: 'Aprofundamento.', target: 1, current: 0 /* Manual/Future logic */, icon: <Book /> },
          { title: 'Bater Meta Anual', desc: 'Objetivo concluído.', target: 1, current: 0, icon: <Trophy /> },
        ]
      }
    ];

    // Add color definitions explicitly for Tailwind JIT
    const colorMap: Record<string, any> = {
      rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', glow: 'bg-rose-500' },
      amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'bg-amber-500' },
      blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'bg-blue-500' },
      orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'bg-orange-500' },
      purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'bg-purple-500' },
      emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'bg-emerald-500' },
      cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'bg-cyan-500' },
      indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', glow: 'bg-indigo-500' },
    };

    return { metrics: { totalPages, totalMinutes, totalCompleted, currentStreak }, achievementGroups: groups, colorMap };
  }, [books, sessions]);

  const activeGroup = achievementGroups.find(g => g.id === activeTab) || achievementGroups[0];
  const activeColor = colorMap[activeGroup.color];

  return (
    <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 md:p-8 mt-8 md:mt-12 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="size-6 text-yellow-500" />
          <h3 className="text-xl font-bold text-white tracking-tight">Painel de Metas & Conquistas</h3>
        </div>
        <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-[#71717A]">
           <span>{metrics.totalCompleted} Livros</span>
           <span>{metrics.totalPages} Pág</span>
           <span>{Math.round(metrics.totalMinutes/60)}h</span>
           <span className="text-orange-500 flex items-center gap-1"><Flame className="size-3"/> {metrics.currentStreak} dias</span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2">
        {achievementGroups.map(group => {
          const groupColor = colorMap[group.color];
          return (
            <button
              key={group.id}
              onClick={() => setActiveTab(group.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase whitespace-nowrap transition-all border",
                activeTab === group.id 
                  ? `${groupColor.bg} ${groupColor.text} ${groupColor.border}` 
                  : "bg-white/5 text-[#A1A1AA] border-transparent hover:bg-white/10"
              )}
            >
              {group.icon} {group.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Achievements for Active Tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-2 animate-in fade-in slide-in-from-bottom-2">
        {activeGroup.items.map((ach, idx) => {
          const isUnlocked = ach.current >= ach.target;
          const progressPercent = Math.min(100, (ach.current / ach.target) * 100);
          
          return (
            <div 
              key={idx} 
              className={cn(
                "p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between min-h-[140px]",
                isUnlocked 
                  ? `bg-black/40 ${activeColor.border} shadow-[0_0_15px_rgba(255,255,255,0.02)]` 
                  : "bg-black/20 border-[rgba(255,255,255,0.02)] grayscale opacity-60"
              )}
            >
              {/* Progress Background */}
              {!isUnlocked && !ach.hideProgress && (
                <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
                  <div className="h-full bg-white/30" style={{ width: `${progressPercent}%` }}></div>
                </div>
              )}
              
              {/* Unlocked Glow */}
              {isUnlocked && (
                <div className={cn("absolute -top-10 -right-10 size-24 blur-2xl rounded-full opacity-20 pointer-events-none", activeColor.glow)}></div>
              )}

              <div className="flex justify-between items-start mb-3 relative z-10">
                <div className={cn("size-10 rounded-xl flex items-center justify-center", isUnlocked ? `${activeColor.bg} ${activeColor.text}` : "bg-white/5 text-[#71717A]")}>
                  {ach.icon}
                </div>
                {!ach.hideProgress && (
                  <span className="text-[10px] font-bold text-[#71717A] tracking-widest">
                    {ach.current} / {ach.target} {ach.suffix}
                  </span>
                )}
                {ach.hideProgress && isUnlocked && (
                  <span className={cn("text-[10px] font-bold tracking-widest uppercase", activeColor.text)}>
                     {ach.current} {ach.suffix}
                  </span>
                )}
              </div>
              
              <div className="relative z-10">
                <h4 className={cn("text-sm font-black tracking-tight mb-1", isUnlocked ? "text-white" : "text-[#A1A1AA]")}>
                  {ach.title}
                </h4>
                <p className="text-[10px] font-medium text-[#71717A] leading-tight">
                  {ach.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
