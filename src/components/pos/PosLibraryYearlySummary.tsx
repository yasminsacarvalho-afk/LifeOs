import React, { useState, useMemo } from 'react';
import { PosBook, PosReadingSession } from '@/hooks/use-pos-library';
import { ChevronDown, ChevronUp, Share2, Download, FileText, BookOpen, Clock, Calendar, Flame, Star, Quote, Edit3, Users, Globe, Tags, Award, TrendingUp, Zap, Brain, Lightbulb, Map, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';

export function PosLibraryYearlySummary({ books, sessions }: { books: PosBook[], sessions: PosReadingSession[] }) {
  const [selectedYearModal, setSelectedYearModal] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Group books by year based on end_date or updated_at
  const booksByYear = useMemo(() => {
    const grouped: Record<string, PosBook[]> = {};
    books.forEach(book => {
      if (book.status !== 'concluido' && book.status !== 'lendo') return;
      const year = book.end_date ? new Date(book.end_date).getFullYear().toString() : new Date(book.created_at || Date.now()).getFullYear().toString();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(book);
    });
    // Sort years descending
    return Object.entries(grouped).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [books]);

  if (booksByYear.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-2">
         <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
            <Map className="size-4 text-indigo-500" /> Cápsula do Tempo
         </h3>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
         {booksByYear.map(([year, yearBooks]) => {
            const completed = yearBooks.filter(b => b.status === 'concluido');
            const yearSessions = sessions.filter(s => new Date(s.session_date || s.created_at || Date.now()).getFullYear().toString() === year);
            const totalHours = Math.round(yearSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / 60);

            return (
              <div 
                key={year}
                onClick={() => setSelectedYearModal(year)}
                className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:border-indigo-500/30 group transition-all shadow-md"
              >
                 <div className="flex items-center gap-4">
                    <div className="size-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-lg group-hover:scale-110 transition-transform">
                       {year}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-1 group-hover:text-indigo-500/70 transition-colors">Resumo Anual</div>
                       <div className="text-sm font-bold text-white truncate">{completed.length} livros • {totalHours}h</div>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg group-hover:bg-indigo-500/10 transition-colors">
                       <ChevronDown className="size-4 text-[#71717A] -rotate-90 group-hover:text-indigo-500 transition-colors" />
                    </div>
                 </div>
              </div>
            );
         })}
      </div>

      {selectedYearModal && (() => {
         const year = selectedYearModal;
         const yearBooks = booksByYear.find(b => b[0] === year)?.[1] || [];
         
         // --- Calculate Stats ---
         const completed = yearBooks.filter(b => b.status === 'concluido');
         const reading = yearBooks.filter(b => b.status === 'lendo');
         
         const yearSessions = sessions.filter(s => new Date(s.session_date || s.created_at || Date.now()).getFullYear().toString() === year);
         const totalMinutes = yearSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
         const totalHours = Math.round(totalMinutes / 60);
         const totalPages = completed.reduce((acc, b) => acc + (b.total_pages || 0), 0) + yearSessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
         
         const daysRead = new Set(yearSessions.map(s => s.session_date?.split('T')[0])).size;
         const avgRating = completed.reduce((acc, b) => acc + (b.rating || 0), 0) / (completed.length || 1);
         const authors = new Set(yearBooks.map(b => b.author).filter(Boolean));
         
         const genresMap: Record<string, { count: number, pages: number, color: string }> = {};
         const colors = ['bg-blue-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-rose-500', 'bg-cyan-500'];
         yearBooks.forEach(b => {
           const area = b.knowledge_area || 'Outros';
           if (!genresMap[area]) {
             genresMap[area] = { count: 0, pages: 0, color: colors[Object.keys(genresMap).length % colors.length] };
           }
           genresMap[area].count++;
           genresMap[area].pages += b.total_pages || 0;
         });

         const displayedBooks = selectedGenre ? yearBooks.filter(b => (b.knowledge_area || 'Outros') === selectedGenre) : yearBooks;

         const chartData = Array.from({length: 12}, (_, i) => {
           const monthName = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i];
           return { month: monthName, books: 0, pages: 0, hours: 0, monthIndex: i };
         });

         yearSessions.forEach(s => {
           const date = s.session_date ? parseISO(`${s.session_date}T12:00:00`) : (s.created_at ? parseISO(s.created_at) : null);
           if (date) {
             const m = date.getMonth();
             chartData[m].pages += (s.pages_read || 0);
             chartData[m].hours += ((s.duration_minutes || 0) / 60);
           }
         });

         completed.forEach(b => {
            const date = b.end_date ? parseISO(`${b.end_date}T12:00:00`) : null;
            if (date) {
              const m = date.getMonth();
              chartData[m].books += 1;
            }
         });

         chartData.forEach(d => d.hours = Math.round(d.hours * 10) / 10);

         return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
               <div className="bg-[#0A0A0C] w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[rgba(255,255,255,0.1)] p-6 md:p-8 relative custom-scrollbar">
                  <button onClick={() => setSelectedYearModal(null)} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors z-10">
                     <X className="size-5" />
                  </button>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[rgba(255,255,255,0.06)] pb-6 pr-12">
                     <div className="flex items-center gap-6">
                        <div className="relative flex items-center justify-center size-16 md:size-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                           <span className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">{year}</span>
                        </div>
                        <div>
                           <h4 className="text-xl md:text-2xl font-bold text-white tracking-tight">Retrospectiva Literária</h4>
                           <p className="text-[#A1A1AA] text-xs md:text-sm mt-1">{completed.length} livros lidos • {totalHours} horas de leitura</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-white/5 text-[#71717A] hover:text-white rounded-lg transition-colors" title="Exportar Relatório"><Download className="size-4" /></button>
                        <button className="p-2 hover:bg-white/5 text-[#71717A] hover:text-white rounded-lg transition-colors" title="Compartilhar"><Share2 className="size-4" /></button>
                     </div>
                  </div>

                  <div className="flex flex-col gap-10">
                     {/* STATS GRID */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#1A1A1E] rounded-2xl p-5 border border-[rgba(255,255,255,0.04)]">
                           <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-3 flex items-center gap-1.5"><BookOpen className="size-3" /> Concluídos</div>
                           <div className="text-3xl font-bold text-white">{completed.length}</div>
                        </div>
                        <div className="bg-[#1A1A1E] rounded-2xl p-5 border border-[rgba(255,255,255,0.04)]">
                           <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-3 flex items-center gap-1.5"><Clock className="size-3" /> Tempo Total</div>
                           <div className="text-3xl font-bold text-white">{totalHours}h</div>
                        </div>
                        <div className="bg-[#1A1A1E] rounded-2xl p-5 border border-[rgba(255,255,255,0.04)]">
                           <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-3 flex items-center gap-1.5"><FileText className="size-3" /> Páginas Lidas</div>
                           <div className="text-3xl font-bold text-white">{totalPages}</div>
                        </div>
                        <div className="bg-[#1A1A1E] rounded-2xl p-5 border border-[rgba(255,255,255,0.04)]">
                           <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-3 flex items-center gap-1.5"><Calendar className="size-3" /> Dias de Leitura</div>
                           <div className="text-3xl font-bold text-white">{daysRead}</div>
                        </div>
                        <div className="bg-[#1A1A1E] rounded-2xl p-5 border border-[rgba(255,255,255,0.04)]">
                           <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-3 flex items-center gap-1.5"><Flame className="size-3 text-orange-500" /> Maior Sequência</div>
                           <div className="text-3xl font-bold text-white">14 <span className="text-sm font-medium text-[#71717A]">dias</span></div>
                        </div>
                        <div className="bg-[#1A1A1E] rounded-2xl p-5 border border-[rgba(255,255,255,0.04)]">
                           <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-3 flex items-center gap-1.5"><Star className="size-3 text-yellow-500" /> Nota Média</div>
                           <div className="text-3xl font-bold text-white">{avgRating.toFixed(1)} <span className="text-sm font-medium text-[#71717A]">/ 5</span></div>
                        </div>
                        <div className="bg-[#1A1A1E] rounded-2xl p-5 border border-[rgba(255,255,255,0.04)]">
                           <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-3 flex items-center gap-1.5"><Quote className="size-3" /> Citações</div>
                           <div className="text-3xl font-bold text-white">42</div>
                        </div>
                        <div className="bg-[#1A1A1E] rounded-2xl p-5 border border-[rgba(255,255,255,0.04)]">
                           <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-3 flex items-center gap-1.5"><Users className="size-3" /> Autores Diferentes</div>
                           <div className="text-3xl font-bold text-white">{authors.size}</div>
                        </div>
                     </div>

                     {/* GENRES */}
                     <div>
                       <h5 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Tags className="size-4 text-rose-500" /> Gêneros Explorados</h5>
                       <div className="flex flex-wrap gap-3">
                         <button 
                           onClick={() => setSelectedGenre(null)} 
                           className={cn("px-4 py-2 rounded-full text-xs font-bold border transition-all", selectedGenre === null ? "bg-white text-black border-white" : "bg-[#1A1A1E] text-[#A1A1AA] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)]")}
                         >
                            Todos os Livros ({yearBooks.length})
                         </button>
                         {Object.entries(genresMap).map(([genre, data]) => (
                           <button 
                             key={genre}
                             onClick={() => setSelectedGenre(genre)}
                             className={cn("px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-2", selectedGenre === genre ? `${data.color}/20 text-white border-${data.color.replace('bg-', '')}` : "bg-[#1A1A1E] text-[#A1A1AA] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)]")}
                           >
                             <span className={cn("size-2 rounded-full", data.color)}></span>
                             {genre} ({data.count})
                           </button>
                         ))}
                       </div>
                     </div>

                     {/* CHARTS */}
                     <div>
                       <h5 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp className="size-4 text-emerald-500" /> Evolução de {year}</h5>
                       <div className="h-[250px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <XAxis dataKey="month" stroke="#71717A" fontSize={10} tickLine={false} axisLine={false} />
                              <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#111113', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                              <Bar dataKey="pages" fill="#6366F1" radius={[4, 4, 0, 0]} name="Páginas Lidas" />
                            </BarChart>
                         </ResponsiveContainer>
                       </div>
                     </div>

                     {/* AWARDS & HIGHLIGHTS */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-5 text-center relative overflow-hidden group">
                           <Award className="size-8 text-amber-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                           <div className="text-[9px] uppercase font-bold text-amber-500/70 tracking-widest mb-1">Livro Favorito</div>
                           <div className="text-sm font-bold text-amber-100 line-clamp-2">{completed.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]?.title || 'Nenhum'}</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-5 text-center relative overflow-hidden group">
                           <FileText className="size-8 text-blue-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                           <div className="text-[9px] uppercase font-bold text-blue-500/70 tracking-widest mb-1">Livro Mais Longo</div>
                           <div className="text-sm font-bold text-blue-100 line-clamp-2">{completed.sort((a, b) => (b.total_pages || 0) - (a.total_pages || 0))[0]?.title || 'Nenhum'}</div>
                        </div>
                        <div className="bg-gradient-to-br from-rose-500/20 to-pink-600/20 border border-rose-500/30 rounded-2xl p-5 text-center relative overflow-hidden group">
                           <Zap className="size-8 text-rose-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                           <div className="text-[9px] uppercase font-bold text-rose-500/70 tracking-widest mb-1">Livro Mais Rápido</div>
                           <div className="text-sm font-bold text-rose-100 line-clamp-2">{completed[completed.length-1]?.title || 'Nenhum'}</div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-5 text-center relative overflow-hidden group">
                           <Brain className="size-8 text-emerald-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                           <div className="text-[9px] uppercase font-bold text-emerald-500/70 tracking-widest mb-1">Maior Impacto</div>
                           <div className="text-sm font-bold text-emerald-100 line-clamp-2">{completed[0]?.title || 'Nenhum'}</div>
                        </div>
                     </div>

                     {/* BOOK LIST */}
                     <div>
                       <h5 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><BookOpen className="size-4 text-blue-500" /> Biblioteca de {year} ({displayedBooks.length})</h5>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {displayedBooks.map(book => (
                            <div key={book.id} className="flex gap-4 p-4 rounded-2xl bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] transition-colors">
                               <div className="w-16 h-24 bg-[#111113] rounded-lg overflow-hidden shrink-0 border border-[rgba(255,255,255,0.05)]">
                                 {book.cover_url ? <img src={book.cover_url} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#333]"><BookOpen className="size-6" /></div>}
                               </div>
                               <div className="flex-1 min-w-0 py-1">
                                  <h6 className="text-sm font-bold text-white line-clamp-1">{book.title}</h6>
                                  <div className="text-xs text-[#A1A1AA] mt-1 line-clamp-1">{book.author}</div>
                                  <div className="flex items-center gap-3 mt-3">
                                     {book.rating ? (
                                       <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                                          <Star className="size-3" fill="currentColor" /> {book.rating}
                                       </div>
                                     ) : null}
                                     <div className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">
                                       {book.total_pages} Páginas
                                     </div>
                                  </div>
                               </div>
                            </div>
                         ))}
                       </div>
                     </div>

                  </div>
               </div>
            </div>
         );
      })()}
    </div>
  )
}
