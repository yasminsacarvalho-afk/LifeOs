import { useState, useMemo } from 'react';
import { PosBook, PosReadingSession } from '@/hooks/use-pos-library';
import { 
  Award, Trophy, Medal, Star, Flame, Crown, Book, FileText, 
  Clock, CalendarDays, Library, Globe, GraduationCap, Target,
  ChevronDown, ChevronUp, X, ChevronRight, Brain, Lightbulb, PenTool, Edit3, Compass, History, Hash, Coffee, Moon, Sun, Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PosLibraryAchievementsProps {
  books: PosBook[];
  sessions: PosReadingSession[];
}

export function PosLibraryAchievements({ books, sessions }: PosLibraryAchievementsProps) {
  const [activeTab, setActiveTab] = useState<string>('quantidade');
  const [isExpanded, setIsExpanded] = useState(false);

  const { metrics, achievementGroups, colorMap } = useMemo(() => {
    const totalPages = sessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
    const completedBooks = books.filter(b => b.status === 'concluido');
    const totalCompleted = completedBooks.length;
    
    // Streaks
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

    const morningSessions = sessions.filter(s => s.start_time && parseInt(s.start_time.split(':')[0]) < 8);
    const morningDays = new Set(morningSessions.map(s => s.session_date)).size;
    
    const nightSessions = sessions.filter(s => s.start_time && parseInt(s.start_time.split(':')[0]) >= 22);
    const nightDays = new Set(nightSessions.map(s => s.session_date)).size;
    
    const thisYear = new Date().getFullYear();
    const monthsReadThisYear = new Set(sessions.filter(s => s.session_date.startsWith(thisYear.toString())).map(s => s.session_date.substring(5, 7))).size;

    const notesCount = sessions.filter(s => s.notes && s.notes.trim().length > 0).length;
    const summariesCount = books.filter(b => b.summary && b.summary.trim().length > 0).length;
    
    // Estimations
    const highlightsCount = sessions.reduce((acc, s) => acc + (s.notes?.split('\n').length || 0), 0) * 2; 
    const insightsCount = summariesCount * 5 + notesCount;
    const hasMindMap = false; 
    const relatedBooks = false; 

    // Authors
    const getAuthorCount = (name: string) => completedBooks.filter(b => b.author?.toLowerCase().includes(name.toLowerCase())).length;
    const plataoBooks = getAuthorCount('Platão') || getAuthorCount('Platao');
    const aristotelesBooks = getAuthorCount('Aristóteles') || getAuthorCount('Aristoteles');
    const agostinhoBooks = getAuthorCount('Agostinho');
    const aquinoBooks = getAuthorCount('Aquino');

    // Diversity
    const uniqueAuthorsCount = new Set(completedBooks.filter(b => b.author).map(b => b.author)).size;
    const uniqueCategories = new Set(completedBooks.filter(b => b.knowledge_area).map(b => b.knowledge_area)).size;
    const uniqueLanguages = new Set(completedBooks.filter(b => b.language).map(b => b.language)).size;

    const completedThisYear = completedBooks.filter(b => b.end_date?.startsWith(thisYear.toString())).length;

    const hasSprint = sessions.some(s => s.duration_minutes > 0 && s.pages_read > 150); // Proxy
    const bigBook = completedBooks.filter(b => (b.total_pages || 0) > 800).length;
    
    const hasTenMinForThirtyDays = currentStreak >= 30; // Proxy
    
    const ratingsCount = books.filter(b => (b.rating || 0) > 0).length;
    
    const hasDiscoveredNewAuthor = uniqueAuthorsCount > 1;
    const hasClassic = books.some(b => b.is_classic);

    const groups = [
      {
        id: 'quantidade',
        label: 'Quantidade',
        icon: <Library className="size-4" />,
        color: 'rose',
        items: [
          { title: 'Primeiro Passo', desc: 'Leia seu primeiro livro.', target: 1, current: totalCompleted, icon: <Book /> },
          { title: 'Aprendiz', desc: '5 livros concluídos.', target: 5, current: totalCompleted, icon: <Star /> },
          { title: 'Estudioso', desc: '10 livros concluídos.', target: 10, current: totalCompleted, icon: <Medal /> },
          { title: 'Acadêmico', desc: '25 livros concluídos.', target: 25, current: totalCompleted, icon: <GraduationCap /> },
          { title: 'Mestre da Biblioteca', desc: '50 livros concluídos.', target: 50, current: totalCompleted, icon: <Crown /> },
          { title: 'Lenda da Leitura', desc: '100 livros concluídos.', target: 100, current: totalCompleted, icon: <Globe /> },
          { title: 'Imortal', desc: '500 livros concluídos.', target: 500, current: totalCompleted, icon: <Trophy /> },
        ]
      },
      {
        id: 'consistencia',
        label: 'Consistência',
        icon: <Flame className="size-4" />,
        color: 'orange',
        items: [
          { title: 'Semana Perfeita', desc: '7 dias seguidos lendo.', target: 7, current: currentStreak, icon: <Flame /> },
          { title: 'Mês Focado', desc: '30 dias seguidos.', target: 30, current: currentStreak, icon: <Flame /> },
          { title: 'Hábito Supremo', desc: '100 dias seguidos.', target: 100, current: currentStreak, icon: <Flame /> },
          { title: 'Leitor Matinal', desc: 'Ler antes das 8h por 15 dias.', target: 15, current: morningDays, icon: <Sun /> },
          { title: 'Coruja Literária', desc: 'Ler após 22h por 20 dias.', target: 20, current: nightDays, icon: <Moon /> },
          { title: 'Nunca Parei', desc: 'Ler pelo menos uma vez em todos os meses do ano.', target: 12, current: monthsReadThisYear, icon: <CalendarDays /> },
        ]
      },
      {
        id: 'paginas',
        label: 'Páginas',
        icon: <FileText className="size-4" />,
        color: 'amber',
        items: [
          { title: 'Primeiras 100 páginas', desc: 'Um ótimo começo.', target: 100, current: totalPages, icon: <FileText /> },
          { title: '1.000 páginas', desc: 'Milhares de palavras absorvidas.', target: 1000, current: totalPages, icon: <FileText /> },
          { title: '5.000 páginas', desc: 'Devorador de textos.', target: 5000, current: totalPages, icon: <FileText /> },
          { title: '10.000 páginas', desc: 'Uma montanha de páginas.', target: 10000, current: totalPages, icon: <FileText /> },
          { title: 'Biblioteca Ambulante', desc: '50.000 páginas.', target: 50000, current: totalPages, icon: <FileText /> },
        ]
      },
      {
        id: 'conhecimento',
        label: 'Conhecimento',
        icon: <Brain className="size-4" />,
        color: 'cyan',
        items: [
          { title: 'Primeira Anotação', desc: 'Criar a primeira anotação.', target: 1, current: notesCount, icon: <Edit3 /> },
          { title: 'Atenção aos Detalhes', desc: 'Fazer 100 marcações.', target: 100, current: highlightsCount, icon: <PenTool /> },
          { title: 'Mente Brilhante', desc: 'Registrar 50 insights.', target: 50, current: insightsCount, icon: <Lightbulb /> },
          { title: 'Sintetizador', desc: 'Escrever 25 resumos.', target: 25, current: summariesCount, icon: <FileText /> },
          { title: 'Mapeamento', desc: 'Criar seu primeiro mapa mental.', target: 1, current: hasMindMap ? 1 : 0, icon: <Brain /> },
          { title: 'Conexões', desc: 'Relacionar dois livros diferentes.', target: 1, current: relatedBooks ? 1 : 0, icon: <Hash /> },
        ]
      },
      {
        id: 'filosofia',
        label: 'Filosofia',
        icon: <Crown className="size-4" />,
        color: 'purple',
        items: [
          { title: 'O Mundo das Ideias', desc: 'Primeiro livro de Platão.', target: 1, current: plataoBooks, icon: <Trophy /> },
          { title: 'O Primeiro Motor', desc: 'Primeiro livro de Aristóteles.', target: 1, current: aristotelesBooks, icon: <Trophy /> },
          { title: 'Cidade de Deus', desc: 'Primeiro livro de Santo Agostinho.', target: 1, current: agostinhoBooks, icon: <Trophy /> },
          { title: 'Suma Teológica', desc: 'Primeiro livro de Tomás de Aquino.', target: 1, current: aquinoBooks, icon: <Trophy /> },
          { title: 'A Obra de uma Vida', desc: 'Concluir uma coleção completa de um autor.', target: 1, current: 0, icon: <Crown /> }, // Manual for now
        ]
      },
      {
        id: 'diversidade',
        label: 'Diversidade',
        icon: <Globe className="size-4" />,
        color: 'emerald',
        items: [
          { title: 'Viajante Literário', desc: 'Ler autores de 5 países.', target: 5, current: uniqueAuthorsCount >= 5 ? 5 : uniqueAuthorsCount, icon: <Globe /> },
          { title: 'Cidadão do Mundo', desc: 'Ler autores de 10 países.', target: 10, current: uniqueAuthorsCount >= 10 ? 10 : uniqueAuthorsCount, icon: <Globe /> },
          { title: 'Viajante do Tempo', desc: 'Ler livros escritos em 3 séculos diferentes.', target: 3, current: 1, icon: <History /> }, // Placeholder
          { title: 'Mente Aberta', desc: 'Ler 10 gêneros diferentes.', target: 10, current: uniqueCategories, icon: <Library /> },
          { title: 'Poliglota', desc: 'Ler um livro em outro idioma.', target: 1, current: uniqueLanguages > 1 ? 1 : 0, icon: <Globe /> },
        ]
      },
      {
        id: 'metas',
        label: 'Metas Anuais',
        icon: <Target className="size-4" />,
        color: 'blue',
        items: [
          { title: 'Leitor Regular', desc: '12 livros no ano.', target: 12, current: completedThisYear, icon: <Medal /> },
          { title: 'Leitor Dedicado', desc: '24 livros no ano.', target: 24, current: completedThisYear, icon: <Medal /> },
          { title: 'Leitor Voraz', desc: '36 livros no ano.', target: 36, current: completedThisYear, icon: <Medal /> },
          { title: 'Um Por Semana', desc: '52 livros no ano.', target: 52, current: completedThisYear, icon: <Crown /> },
          { title: 'Máquina de Leitura', desc: '100 livros no ano.', target: 100, current: completedThisYear, icon: <Trophy /> },
        ]
      },
      {
        id: 'desafios',
        label: 'Desafios',
        icon: <Flame className="size-4" />,
        color: 'rose',
        items: [
          { title: 'Sprint Literária', desc: 'Terminar um livro em 24h.', target: 1, current: hasSprint ? 1 : 0, icon: <Flame /> },
          { title: 'Maratona', desc: 'Terminar um livro em um fim de semana.', target: 1, current: hasSprint ? 1 : 0, icon: <Target /> },
          { title: 'Persistência', desc: 'Concluir um livro com mais de 800 páginas.', target: 1, current: bigBook, icon: <Crown /> },
          { title: 'Pequenos Passos', desc: 'Ler 10 minutos por 30 dias seguidos.', target: 1, current: hasTenMinForThirtyDays ? 1 : 0, icon: <Clock /> },
        ]
      },
      {
        id: 'colecoes',
        label: 'Coleções',
        icon: <Library className="size-4" />,
        color: 'indigo',
        items: [
          { title: 'Fã Número Um', desc: 'Complete todos os livros de um autor.', target: 1, current: 0, icon: <Star /> },
          { title: 'Trilogia', desc: 'Complete uma trilogia.', target: 1, current: 0, icon: <Book /> },
          { title: 'Épico', desc: 'Complete uma saga.', target: 1, current: 0, icon: <Book /> },
          { title: 'Curador', desc: 'Leia todos os livros de uma lista personalizada.', target: 1, current: 0, icon: <Library /> },
        ]
      },
      {
        id: 'reflexao',
        label: 'Reflexão',
        icon: <PenTool className="size-4" />,
        color: 'orange',
        items: [
          { title: 'Crítico Literário', desc: 'Escreva sua primeira resenha.', target: 1, current: ratingsCount, icon: <Edit3 /> },
          { title: 'Influenciador', desc: 'Receba 100 curtidas nas suas resenhas.', target: 100, current: 0, icon: <Star /> }, // Social placeholder
          { title: 'Compartilhar Sabedoria', desc: 'Compartilhe sua primeira citação.', target: 1, current: 0, icon: <Lightbulb /> },
          { title: 'Guardião de Frases', desc: 'Salve 500 citações.', target: 500, current: highlightsCount, icon: <Bookmark /> },
        ]
      },
      {
        id: 'exploracao',
        label: 'Exploração',
        icon: <Compass className="size-4" />,
        color: 'emerald',
        items: [
          { title: 'Novos Horizontes', desc: 'Descobrir um autor novo.', target: 1, current: hasDiscoveredNewAuthor ? 1 : 0, icon: <Compass /> },
          { title: 'Recomendação de IA', desc: 'Ler um livro recomendado pela IA.', target: 1, current: 0, icon: <Brain /> },
          { title: 'Oitocentista', desc: 'Ler um livro publicado antes de 1900.', target: 1, current: 0, icon: <History /> },
          { title: 'O Clássico', desc: 'Ler um clássico.', target: 1, current: hasClassic ? 1 : 0, icon: <Crown /> },
          { title: 'Aclamado', desc: 'Ler um livro vencedor de prêmio.', target: 1, current: 0, icon: <Trophy /> },
        ]
      }
    ];

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

    return { metrics: { totalPages, totalCompleted, currentStreak }, achievementGroups: groups, colorMap };
  }, [books, sessions]);

  const activeGroup = achievementGroups.find(g => g.id === activeTab) || achievementGroups[0];
  const activeColor = colorMap[activeGroup.color];

  return (
    <>
      <div 
        className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl overflow-hidden flex flex-col shadow-xl cursor-pointer hover:bg-[rgba(255,255,255,0.02)] hover:border-amber-500/30 group transition-all duration-300 h-full justify-center"
        onClick={() => setIsExpanded(true)}
      >
        <div className="p-5 md:p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Trophy className="size-5 text-yellow-500 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-white tracking-widest uppercase group-hover:text-amber-400 transition-colors">Sala de Troféus</h3>
            </div>
            <div className="p-2 bg-white/5 rounded-full text-white shrink-0 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors">
               <ChevronRight className="size-4" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
             <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{metrics.totalCompleted} Livros</span>
             <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{metrics.totalPages} Pág</span>
             <span className="bg-orange-500/10 text-orange-500 px-2 py-1 rounded border border-orange-500/20 flex items-center gap-1"><Flame className="size-3"/> {metrics.currentStreak} dias</span>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsExpanded(false)} />
          <div className="relative z-10 w-full max-w-5xl bg-[#0A0A0C]/95 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 md:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            <div className="flex items-start justify-between mb-8 pb-6 border-b border-[rgba(255,255,255,0.05)] shrink-0">
               <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-4">
                     <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                        <Trophy className="size-8 text-amber-500" /> 
                     </div>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">Sala de Troféus</span>
                  </h2>
                  <p className="text-[#A1A1AA] mt-3 font-medium tracking-wide">
                     Acompanhe suas conquistas literárias e marcos de evolução.
                  </p>
               </div>
               <button onClick={() => setIsExpanded(false)} className="p-3 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-400 rounded-xl transition-colors border border-[rgba(255,255,255,0.05)]">
                 <X className="size-6" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
              <div className="flex flex-wrap gap-2 pb-2 shrink-0">
                {achievementGroups.map(group => {
                  const groupColor = colorMap[group.color];
                  return (
                    <button
                      key={group.id}
                      onClick={() => setActiveTab(group.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-all border",
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

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-2 animate-in fade-in slide-in-from-bottom-2 pb-4">
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
                      {!isUnlocked && (
                        <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
                          <div className="h-full bg-white/30" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                      )}
                      
                      {isUnlocked && (
                        <div className={cn("absolute -top-10 -right-10 size-24 blur-2xl rounded-full opacity-20 pointer-events-none", activeColor.glow)}></div>
                      )}

                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", isUnlocked ? `${activeColor.bg} ${activeColor.text}` : "bg-white/5 text-[#71717A]")}>
                          {ach.icon}
                        </div>
                        <span className="text-[9px] font-bold text-[#71717A] tracking-widest text-right leading-tight ml-2">
                          {ach.current} / {ach.target}
                        </span>
                      </div>
                      
                      <div className="relative z-10">
                        <h4 className={cn("text-xs font-black tracking-tight mb-1 leading-tight", isUnlocked ? "text-white" : "text-[#A1A1AA]")}>
                          {ach.title}
                        </h4>
                        <p className="text-[9px] font-medium text-[#71717A] leading-tight line-clamp-2">
                          {ach.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
