import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PosBook, PosReadingSession } from '@/hooks/use-pos-library';
import { ChevronDown, ChevronUp, Users, BookOpen, Clock, FileText, Star, Quote, Award, Calendar, ChevronRight, Bookmark, Search, UserCircle2, Brain, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PosLibraryAuthorsSummary({ books, sessions }: { books: PosBook[], sessions: PosReadingSession[] }) {
  const [expandedAuthor, setExpandedAuthor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAuthorModal, setSelectedAuthorModal] = useState<string | null>(null);

  const authorsData = useMemo(() => {
    const grouped: Record<string, PosBook[]> = {};
    
    books.forEach(book => {
      if (!book.author) return;
      const author = book.author.trim();
      if (author === '') return;
      
      if (!grouped[author]) grouped[author] = [];
      grouped[author].push(book);
    });

    return Object.entries(grouped)
      .map(([name, authorBooks]) => {
        const completed = authorBooks.filter(b => b.status === 'concluido');
        const inProgress = authorBooks.filter(b => b.status === 'lendo');
        const totalPages = authorBooks.reduce((acc, b) => acc + (b.total_pages || 0), 0);
        
        const authorSessions = sessions.filter(s => authorBooks.some(b => b.id === s.book_id));
        const totalMinutes = authorSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
        const totalHours = Math.round(totalMinutes / 60);
        
        const avgRating = completed.length > 0 
          ? completed.reduce((acc, b) => acc + (b.rating || 0), 0) / completed.length 
          : 0;

        // Determine main area
        const areas = authorBooks.map(b => b.knowledge_area).filter(Boolean);
        const mainArea = areas.sort((a, b) => areas.filter(v => v === a).length - areas.filter(v => v === b).length).pop() || 'Geral';

        const firstBook = completed.slice().sort((a, b) => new Date(a.end_date || a.created_at || 0).getTime() - new Date(b.end_date || b.created_at || 0).getTime())[0];
        const lastBook = completed.slice().sort((a, b) => new Date(b.end_date || b.created_at || 0).getTime() - new Date(a.end_date || a.created_at || 0).getTime())[0];

        return {
          name,
          books: authorBooks.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
          completed,
          inProgress,
          totalPages,
          totalMinutes,
          totalHours,
          avgRating,
          mainArea,
          firstBook,
          lastBook,
          progress: authorBooks.length > 0 ? Math.round((completed.length / authorBooks.length) * 100) : 0
        };
      })
      .sort((a, b) => b.books.length - a.books.length);
  }, [books, sessions]);

  const filteredAuthors = authorsData.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (authorsData.length === 0) return null;

  const renderExpandedContent = (author: typeof authorsData[0]) => (
    <>
       {/* STATS */}
       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          <div className="bg-[#1A1A1E] rounded-2xl p-4 border border-[rgba(255,255,255,0.04)]">
             <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-2 flex items-center gap-1.5"><BookOpen className="size-3" /> Concluídos</div>
             <div className="text-2xl font-bold text-white">{author.completed.length}</div>
          </div>
          <div className="bg-[#1A1A1E] rounded-2xl p-4 border border-[rgba(255,255,255,0.04)]">
             <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-2 flex items-center gap-1.5"><Clock className="size-3" /> Em Andamento</div>
             <div className="text-2xl font-bold text-white">{author.inProgress.length}</div>
          </div>
          <div className="bg-[#1A1A1E] rounded-2xl p-4 border border-[rgba(255,255,255,0.04)]">
             <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-2 flex items-center gap-1.5"><FileText className="size-3" /> Páginas Totais</div>
             <div className="text-2xl font-bold text-white">{author.totalPages}</div>
          </div>
          <div className="bg-[#1A1A1E] rounded-2xl p-4 border border-[rgba(255,255,255,0.04)]">
             <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-2 flex items-center gap-1.5"><Clock className="size-3 text-indigo-400" /> Tempo Gasto</div>
             <div className="text-2xl font-bold text-white">{author.totalHours}h</div>
          </div>
          <div className="bg-[#1A1A1E] rounded-2xl p-4 border border-[rgba(255,255,255,0.04)]">
             <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-2 flex items-center gap-1.5"><Star className="size-3 text-yellow-500" /> Nota Média</div>
             <div className="text-2xl font-bold text-white">{author.avgRating > 0 ? author.avgRating.toFixed(1) : '-'}</div>
          </div>
          <div className="bg-[#1A1A1E] rounded-2xl p-4 border border-[rgba(255,255,255,0.04)]">
             <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-2 flex items-center gap-1.5"><Quote className="size-3" /> Citações (Aprox.)</div>
             <div className="text-2xl font-bold text-white">{Math.round(author.completed.length * 3.5)}</div>
          </div>
       </div>

       {/* SMART INSIGHT */}
       {author.completed.length > 0 && (
         <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-2xl p-5 flex items-start md:items-center gap-4">
            <div className="p-3 bg-pink-500/20 rounded-xl shrink-0"><Brain className="size-5 text-pink-400" /></div>
            <div>
              <h6 className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-1">Análise do Sistema</h6>
              <p className="text-sm text-pink-100/80">
                {author.progress === 100 
                  ? `Incrível! Você se tornou um mestre na obra de ${author.name}, concluindo todas as ${author.books.length} obras cadastradas na biblioteca.`
                  : `Você já explorou ${author.progress}% da bibliografia de ${author.name} cadastrada. O primeiro livro que você leu foi "${author.firstBook?.title}" e o seu mais longo foi "${author.completed.sort((a: any, b: any)=>(b.total_pages||0)-(a.total_pages||0))[0]?.title}".`}
              </p>
            </div>
         </div>
       )}

       {/* TIMELINE / BOOKS */}
       <div>
         <h5 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Bookmark className="size-4 text-pink-500" /> Obras na Biblioteca</h5>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {author.books.map(book => (
              <div key={book.id} className="flex gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#1A1A1E] to-[#111113] border border-[rgba(255,255,255,0.06)] hover:border-pink-500/30 hover:shadow-[0_0_20px_rgba(236,72,153,0.1)] transition-all relative overflow-hidden group">
                 {/* Overlay de Concluído */}
                 {book.status === 'concluido' && (
                   <div className="absolute top-0 right-0 p-2 opacity-100 z-10">
                     <div className="bg-emerald-500/10 text-emerald-500 p-1 rounded-full border border-emerald-500/20"><Award className="size-3" /></div>
                   </div>
                 )}
                 
                 <div className="w-16 h-24 bg-[#111113] rounded-lg overflow-hidden shrink-0 border border-[rgba(255,255,255,0.05)] shadow-lg relative z-0">
                   {book.cover_url ? <img src={book.cover_url} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-[#333]"><BookOpen className="size-6" /></div>}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                 </div>
                 <div className="flex-1 min-w-0 py-1 pr-2 relative z-0">
                    <h6 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-pink-400 transition-colors">{book.title}</h6>
                    <div className="flex items-center gap-2 mt-2">
                      {book.status === 'concluido' ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Lido</span>
                      ) : book.status === 'lendo' ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Lendo</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">Pendente</span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">{book.total_pages || 0} {book.progress_unit === 'percentage' ? '%' : book.progress_unit === 'chapters' ? 'caps' : book.progress_unit === 'minutes' ? 'min' : 'págs'}</span>
                    </div>
                    {book.rating && book.status === 'concluido' && (
                       <div className="flex items-center gap-1 mt-3 text-yellow-500 bg-yellow-500/10 w-fit px-2 py-0.5 rounded-full border border-yellow-500/20">
                         <Star className="size-3" fill="currentColor" />
                         <span className="text-xs font-bold text-yellow-400">{book.rating}</span>
                       </div>
                    )}
                 </div>
              </div>
           ))}
         </div>
       </div>
       
       {/* ACHIEVEMENTS */}
       {author.completed.length > 0 && (
         <div>
           <h5 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Award className="size-4 text-amber-500" /> Conquistas da Coleção</h5>
           <div className="flex flex-wrap gap-3">
             <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
               <Award className="size-4" /> Primeiro Livro de {author.name}
             </div>
             {author.completed.length >= 3 && (
               <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                 <Award className="size-4" /> Leitor Frequente (3+)
             </div>
             )}
             {author.completed.length >= 5 && (
               <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                 <Award className="size-4" /> Especialista em {author.name}
               </div>
             )}
             {author.progress === 100 && author.books.length > 1 && (
               <div className="bg-pink-500/10 border border-pink-500/20 text-pink-500 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                 <Award className="size-4" /> Coleção Completa!
               </div>
             )}
           </div>
         </div>
       )}
    </>
  );

  return (
    <>
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
        {/* Header Compacto */}
        <div className="flex items-center justify-between gap-4 mb-2">
           <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
              <Users className="size-4 text-pink-500" /> Autores Top 5
           </h3>
        </div>

        {/* Top 5 list */}
        <div className="flex flex-col gap-3">
           {authorsData.slice(0, 5).map(author => (
             <div key={author.name} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 flex flex-col gap-3 cursor-pointer hover:border-pink-500/30 transition-all shadow-md group" onClick={() => { setSelectedAuthorModal(author.name); setIsModalOpen(true); }}>
                <div className="flex items-center gap-3">
                   {/* Avatar */}
                   <div className="size-10 rounded-full bg-[#1A1A1E] flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.05)]">
                      <UserCircle2 className="size-6 text-[#71717A] group-hover:text-pink-400 transition-colors" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-pink-400 transition-colors">{author.name}</h4>
                      <div className="text-[9px] uppercase tracking-widest text-[#71717A] mt-0.5">{author.books.length} Obras • Lidos {author.completed.length}</div>
                   </div>
                   {/* Progress */}
                   <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-emerald-500">{author.progress}%</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
        
        {authorsData.length > 5 && (
           <button onClick={() => { setSelectedAuthorModal(null); setIsModalOpen(true); }} className="text-xs font-bold text-pink-500 hover:text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 py-3 rounded-xl transition-colors mt-2 text-center w-full">
              Ver todos os {authorsData.length} autores
           </button>
        )}
      </div>

{isModalOpen && createPortal(
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#0A0A0C] w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[rgba(255,255,255,0.1)] p-6 md:p-8 relative custom-scrollbar">
               <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors z-10"><X className="size-5" /></button>
               
               {/* CONTEÚDO ORIGINAL EXPANDIDO NO MODAL */}
               {selectedAuthorModal ? (
                 <div className="flex flex-col gap-6">
                    <button onClick={() => setSelectedAuthorModal(null)} className="flex items-center gap-2 text-[#71717A] hover:text-white transition-colors text-sm font-bold w-fit">
                       <ChevronDown className="size-4 rotate-90" /> Voltar para todos os autores
                    </button>
                    {(() => {
                       const author = authorsData.find(a => a.name === selectedAuthorModal);
                       if (!author) return null;
                       return (
                         <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl overflow-hidden shadow-xl transition-all duration-500">
                           {/* HEADER / COMPACT CARD */}
                           <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                                <div className="relative flex items-center justify-center size-14 md:size-16 rounded-2xl bg-gradient-to-br from-[#1A1A1E] to-[#111113] border border-[rgba(255,255,255,0.08)] shrink-0 overflow-hidden shadow-lg">
                                   <UserCircle2 className="size-8 text-[#71717A]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase font-bold text-pink-400 tracking-widest bg-pink-500/10 px-2.5 py-0.5 rounded-full border border-pink-500/20">{author.mainArea}</span>
                                    <span className="text-[10px] uppercase font-bold text-white/70 tracking-widest bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">{author.books.length} Obras</span>
                                    {author.avgRating > 0 && (
                                       <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-widest bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1">
                                         <Star className="size-3 fill-yellow-500" /> {author.avgRating.toFixed(1)}
                                       </span>
                                    )}
                                  </div>
                                  <h4 className="text-xl font-bold text-white tracking-tight truncate">{author.name}</h4>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between md:justify-end gap-6 md:w-1/3">
                                <div className="flex-1 max-w-[200px]">
                                  <div className="flex justify-between text-[10px] font-bold text-[#71717A] mb-2 uppercase tracking-widest">
                                     <span>Lidos</span>
                                     <span className="text-white">{author.completed.length} / {author.books.length}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)] shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-1000" style={{ width: `${author.progress}%` }}></div>
                                  </div>
                                </div>
                              </div>
                           </div>
                           
                           {/* EXPANDED CONTENT (ALWAYS OPEN IN SINGLE MODE) */}
                           <div className="p-5 md:p-8 pt-0 border-t border-[rgba(255,255,255,0.06)] flex flex-col gap-8 mt-6">
                              {renderExpandedContent(author)}
                           </div>
                         </div>
                       );
                    })()}
                 </div>
               ) : (
                 <div className="flex flex-col gap-6">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 pr-12">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-pink-500/10 rounded-lg">
                          <Users className="size-5 text-pink-500" />
                       </div>
                       <h3 className="text-xl font-bold text-white tracking-tight">Biblioteca por Autor</h3>
                     </div>
                     
                     <div className="relative w-full md:w-64">
                        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                        <input 
                          type="text"
                          placeholder="Buscar autor..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none transition-colors"
                        />
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-4">
                     {filteredAuthors.map((author) => {
                       const isExpanded = expandedAuthor === author.name;
                       
                       return (
                         <div key={author.name} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl overflow-hidden shadow-xl transition-all duration-500">
                           {/* HEADER / COMPACT CARD */}
                           <div 
                             className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                             onClick={() => setExpandedAuthor(isExpanded ? null : author.name)}
                           >
                              <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                                <div className="relative flex items-center justify-center size-14 md:size-16 rounded-2xl bg-gradient-to-br from-[#1A1A1E] to-[#111113] border border-[rgba(255,255,255,0.08)] shrink-0 overflow-hidden shadow-lg group-hover:border-[rgba(255,255,255,0.2)] transition-colors">
                                   <UserCircle2 className="size-8 text-[#71717A] group-hover:text-white transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase font-bold text-pink-400 tracking-widest bg-pink-500/10 px-2.5 py-0.5 rounded-full border border-pink-500/20">{author.mainArea}</span>
                                    <span className="text-[10px] uppercase font-bold text-white/70 tracking-widest bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">{author.books.length} Obras</span>
                                    {author.avgRating > 0 && (
                                       <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-widest bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1">
                                         <Star className="size-3 fill-yellow-500" /> {author.avgRating.toFixed(1)}
                                       </span>
                                    )}
                                  </div>
                                  <h4 className="text-xl font-bold text-white tracking-tight truncate group-hover:text-pink-400 transition-colors">{author.name}</h4>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between md:justify-end gap-6 md:w-1/3">
                                <div className="flex-1 max-w-[200px]">
                                  <div className="flex justify-between text-[10px] font-bold text-[#71717A] mb-2 uppercase tracking-widest">
                                     <span>Lidos</span>
                                     <span className="text-white">{author.completed.length} / {author.books.length}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)] shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-1000" style={{ width: `${author.progress}%` }}></div>
                                  </div>
                                </div>
                                <div className="p-2 bg-white/5 group-hover:bg-white/10 rounded-xl text-white shrink-0 transition-colors">
                                  {isExpanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                                </div>
                              </div>
                           </div>
                           
                           {/* EXPANDED CONTENT (FOR ALL AUTHORS VIEW) */}
                           {isExpanded && (
                             <div className="p-5 md:p-8 pt-0 border-t border-[rgba(255,255,255,0.06)] animate-in fade-in duration-500 flex flex-col gap-8 mt-6">
                               {renderExpandedContent(author)}
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}
            </div>
         </div>,
         document.body
      )}
    </>
  )
}
