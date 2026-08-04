import { PosBook, PosReadingSession } from "@/hooks/use-pos-library";
import { Star, User, Bookmark, TrendingUp, Zap, Clock, BookOpen, Timer, Quote, BarChart2, Library, Tags, Users, Cloud, FileText, Check, Search, ExternalLink } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PosLibraryMetricsProps {
  books: PosBook[];
  sessions: PosReadingSession[];
  onOpenBook?: (bookId: string) => void;
  onRegisterBook?: (file: any, coverUrl?: string, author?: string) => void;
}

export const DriveCover = ({ file, isEpub, isPdf, fileId, className, fallbackClassName }: any) => {
  const initialThumb = file.thumbnail || (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : null);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialThumb);
  const [hasError, setHasError] = useState(!initialThumb);

  useEffect(() => {
    if (isEpub && !file.thumbnail) {
      let cleanName = file.name.replace(/^arquivos\//, '').replace(/\.(epub|mobi|pdf)$/i, '').trim();
      // Limpar prefixos comuns que quebram a busca (ex: "Vol. 1 - ", "Patrística Vol. 34 - ")
      cleanName = cleanName.replace(/^(Vol\.?|Patrística Vol\.?)\s*\d+(_\d+)?\s*[-–]\s*/i, '').trim();

      const fetchCover = async () => {
        try {
          const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanName)}&maxResults=1`);
          const gData = await gRes.json();

          if (gData.items && gData.items[0].volumeInfo.imageLinks?.thumbnail) {
            let url = gData.items[0].volumeInfo.imageLinks.thumbnail;
            url = url.replace('http:', 'https:').replace('&edge=curl', '');
            setCoverUrl(url);
            setHasError(false);
            return; // Sucesso com Google
          }

          // Fallback para OpenLibrary
          const olRes = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(cleanName)}&limit=1`);
          const olData = await olRes.json();
          const doc = olData.docs?.find((d: any) => d.cover_i);
          if (doc) {
            setCoverUrl(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`);
            setHasError(false);
            return;
          }
        } catch (e) {
          console.error("Erro ao buscar capa:", e);
        }
      };

      fetchCover();
    }
  }, [file.name, isEpub, file.thumbnail]);

  if (hasError || !coverUrl) {
    return (
      <div className={fallbackClassName}>
        {isPdf ? <FileText className="size-10 opacity-70" /> : <BookOpen className="size-10 opacity-70" />}
      </div>
    );
  }

  return (
    <img
      src={coverUrl}
      alt="Capa"
      className={className}
      onError={() => setHasError(true)}
    />
  );
}


export function PosLibraryMetrics({ books, sessions, onOpenBook, onRegisterBook }: PosLibraryMetricsProps) {
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [driveSearch, setDriveSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [driveData, setDriveData] = useState<{ pdfs: any[], epubs: any[] }>(() => {
    try {
      const cached = localStorage.getItem('lifeos_drive_files_data');
      return cached ? JSON.parse(cached) : { pdfs: [], epubs: [] };
    } catch { return { pdfs: [], epubs: [] }; }
  });

  useEffect(() => {
    const fetchDriveCount = async () => {
      try {
        const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_UPLOADER_URL;
        if (!driveUrl) return;
        const res = await fetch(driveUrl);
        const data = await res.json();
        if (data.success && data.files) {
          const pdfs = data.files.filter((f: any) => f.origin === 'pdf' || f.name.toLowerCase().includes('.pdf'));
          const epubs = data.files.filter((f: any) => f.origin === 'epub' || f.name.toLowerCase().includes('.epub') || f.name.toLowerCase().includes('.mobi'));

          setDriveData({ pdfs, epubs });
          localStorage.setItem('lifeos_drive_files_data', JSON.stringify({ pdfs, epubs }));
        }
      } catch (error) {
        console.error("Erro ao puxar métrica do Drive:", error);
      }
    };
    fetchDriveCount();
  }, []);

  // 1. Livro mais bem avaliado
  const ratedBooks = books.filter(b => b.rating && b.rating > 0);
  const bestRatedBook = ratedBooks.length > 0
    ? ratedBooks.reduce((prev, current) => ((prev.rating || 0) > (current.rating || 0)) ? prev : current)
    : (books.length > 0 ? books.reduce((prev, current) => (prev.pages_read > current.pages_read) ? prev : current) : null);

  // 2. Autores em destaque
  const authorCounts = books.reduce((acc, book) => {
    if (book.author) {
      acc[book.author] = (acc[book.author] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const topAuthorRegistered = Object.keys(authorCounts).sort((a, b) => authorCounts[b] - authorCounts[a])[0] || "N/A";

  const readAuthorCounts = books.filter(b => b.status === 'concluido').reduce((acc, book) => {
    if (book.author) {
      acc[book.author] = (acc[book.author] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const topAuthorRead = Object.keys(readAuthorCounts).sort((a, b) => readAuthorCounts[b] - readAuthorCounts[a])[0] || topAuthorRegistered;

  // 3. Gênero favorito
  const genreCounts = books.reduce((acc, book) => {
    const genre = book.knowledge_area || book.category;
    if (genre) {
      acc[genre] = (acc[genre] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const topGenre = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a])[0] || "N/A";

  // 4. Maior sequência de leitura (Global)
  const uniqueDates = [...new Set(sessions.map(s => s.session_date))].sort();
  let maxStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;

  uniqueDates.forEach(dateStr => {
    const date = new Date(dateStr + 'T12:00:00');
    if (!previousDate) {
      currentStreak = 1;
    } else {
      const diff = differenceInDays(date, previousDate);
      if (diff === 1) {
        currentStreak++;
      } else if (diff > 1) {
        currentStreak = 1;
      }
    }
    if (currentStreak > maxStreak) maxStreak = currentStreak;
    previousDate = date;
  });

  // 5 e 6. Livro mais rápido e mais demorado de concluir
  const completedBooks = books.filter(b => b.status === 'concluido' && b.start_date && b.end_date);
  let fastestBook = null;
  let slowestBook = null;
  let minDays = Infinity;
  let maxDays = -Infinity;

  completedBooks.forEach(book => {
    if (book.start_date && book.end_date) {
      const start = new Date(book.start_date);
      const end = new Date(book.end_date);
      const days = differenceInDays(end, start);
      if (days >= 0) {
        if (days < minDays) { minDays = days; fastestBook = book; }
        if (days > maxDays) { maxDays = days; slowestBook = book; }
      }
    }
  });

  // 7. Total de páginas
  const totalPages = sessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);

  // 8. Total de horas
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // 9. Total de citações (Sessões com anotações)
  const totalNotes = sessions.filter(s => s.notes && s.notes.trim().length > 0).length;

  // 10. Nota média dos livros
  const avgRating = ratedBooks.length > 0
    ? (ratedBooks.reduce((acc, b) => acc + (b.rating || 0), 0) / ratedBooks.length).toFixed(1)
    : "N/A";

  const metrics = [
    { label: "Mais Bem Avaliado", value: bestRatedBook?.title || "Nenhum", icon: Star, color: "text-amber-400", description: "O livro com a nota mais alta da sua biblioteca." },
    { label: "Autor Mais Lido", value: topAuthorRead, icon: User, color: "text-blue-400", description: "O autor com a maior quantidade de obras que você já concluiu." },
    { label: "Mais Cadastrados", value: topAuthorRegistered, icon: Library, color: "text-indigo-400", description: "O autor com o maior número total de livros na sua biblioteca (lidos ou não)." },
    { id: "genre", label: "Gênero Favorito", value: topGenre, icon: Bookmark, color: "text-purple-400", description: "A categoria ou área de conhecimento com a maior presença na sua coleção." },
    { id: "streak", label: "Maior Sequência", value: `${maxStreak} dias`, icon: TrendingUp, color: "text-emerald-400", description: "Sua maior sequência contínua de dias em que você registrou alguma leitura." },
    { id: "fastest", label: "Mais Rápido", value: fastestBook ? `${fastestBook.title} (${minDays}d)` : "Nenhum", icon: Zap, color: "text-yellow-400", description: "O livro que você concluiu no menor intervalo de tempo (da data de início à data de conclusão)." },
    { id: "slowest", label: "Mais Demorado", value: slowestBook ? `${slowestBook.title} (${maxDays}d)` : "Nenhum", icon: Clock, color: "text-rose-400", description: "O livro que levou o maior tempo desde a data de início até ser concluído." },
    { id: "pages", label: "Total de Páginas", value: totalPages, icon: BookOpen, color: "text-cyan-400", description: "A soma de todas as páginas lidas em todas as sessões registradas." },
    { id: "hours", label: "Total de Horas", value: `${totalHours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`, icon: Timer, color: "text-purple-400", description: "O tempo total gasto lendo, somando a duração de todas as sessões." },
    { id: "notes", label: "Total de Citações", value: totalNotes, icon: Quote, color: "text-pink-400", description: "O número total de sessões que contêm alguma anotação ou citação." },
    { id: "rating", label: "Nota Média", value: avgRating, icon: BarChart2, color: "text-teal-400", description: "A média aritmética de todas as avaliações que você já atribuiu aos livros." },
    { id: "total", label: "Livros Cadastrados", value: books.length, icon: Library, color: "text-orange-400", description: "A quantidade absoluta de livros inseridos na sua biblioteca." },
    { id: "cats", label: "Categorias", value: Object.keys(genreCounts).length, icon: Tags, color: "text-fuchsia-400", description: "O número total de áreas de conhecimento ou gêneros distintos catalogados." },
    { id: "authors", label: "Total de Autores", value: Object.keys(authorCounts).length, icon: Users, color: "text-sky-400", description: "A quantidade total de autores únicos registrados na sua coleção." },
    { id: "drive_pdf", label: "Biblioteca PDF", value: driveData.pdfs.length, icon: Cloud, color: "text-red-400", description: "O total de PDFs armazenados de forma nativa nas suas pastas do Drive." },
    { id: "drive_epub", label: "Biblioteca ePub", value: driveData.epubs.length, icon: Cloud, color: "text-indigo-400", description: "O total de ePubs/MOBI armazenados de forma nativa nas suas pastas do Drive." },
  ];

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div
              key={i}
              onClick={() => setSelectedMetric(metric)}
              className="bg-[#111113]/80 backdrop-blur-md border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex flex-col justify-between hover:bg-[#1A1A1E] hover:border-[rgba(255,255,255,0.1)] transition-colors group relative overflow-hidden cursor-pointer"
            >
              {/* Subtle background glow */}
              <div className={`absolute -right-4 -top-4 size-16 ${metric.color} opacity-5 blur-[20px] rounded-full group-hover:opacity-10 transition-opacity`}></div>

              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-black/50 border border-[rgba(255,255,255,0.05)]">
                  <Icon className={`size-4 ${metric.color}`} />
                </div>
                <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest leading-tight">{metric.label}</span>
              </div>
              <div className="text-white font-black text-sm md:text-base leading-tight truncate" title={metric.value.toString()}>
                {metric.value}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedMetric} onOpenChange={(open) => {
        if (!open) {
          setSelectedMetric(null);
          setDriveSearch("");
          setVisibleCount(12);
        }
      }}>
        <DialogContent className={`bg-[#111113] border-[rgba(255,255,255,0.1)] text-white ${selectedMetric?.id?.startsWith('drive_') ? 'sm:max-w-4xl' : 'sm:max-w-md'}`}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-black/50 border border-[rgba(255,255,255,0.05)]">
                {selectedMetric && <selectedMetric.icon className={`size-6 ${selectedMetric.color}`} />}
              </div>
              <DialogTitle className="text-xl">{selectedMetric?.label}</DialogTitle>
            </div>
            <DialogDescription className="text-[#A1A1AA] text-sm">
              {selectedMetric?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedMetric?.id === "drive_pdf" || selectedMetric?.id === "drive_epub" ? (
             <div className="mt-4">
               <div className="mb-4 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#71717A]" />
                 <input 
                   type="text" 
                   value={driveSearch}
                   onChange={e => setDriveSearch(e.target.value)}
                   placeholder="Filtrar por título..."
                   className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-[#71717A]"
                 />
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedMetric.id === "drive_pdf" && driveData.pdfs.length === 0 && <div className="col-span-full text-center text-white/50 py-8">Nenhum PDF encontrado na pasta.</div>}
                  {selectedMetric.id === "drive_epub" && driveData.epubs.length === 0 && <div className="col-span-full text-center text-white/50 py-8">Nenhum ePub encontrado na pasta.</div>}
                  
                  {(() => {
                    const filesList = selectedMetric.id === "drive_pdf" ? driveData.pdfs : driveData.epubs;
                    const filtered = filesList.filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase()));
                    const displayed = filtered.slice(0, visibleCount);
                    
                    const totalBytes = filtered.reduce((acc, f) => acc + (f.size || 0), 0);
                    const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
                    
                    return (
                      <>
                        {displayed.map(f => {
                           let fileId = "";
                           const match = f.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                           if (match) fileId = match[1];
                           
                           const linkedBook = books.find(b => b.resource_link === f.url || (fileId && b.resource_link && b.resource_link.includes(fileId)));
                           
                           return (
                           <div key={f.url} className="group relative overflow-hidden rounded-2xl bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] hover:border-indigo-500/30 transition-all h-64 flex flex-col">
                              {/* Background */}
                              <div className="absolute inset-0 z-0">
                                 <DriveCover 
                                    file={f} 
                                    isEpub={selectedMetric.id === 'drive_epub'}
                                    isPdf={selectedMetric.id === 'drive_pdf'}
                                    fileId={fileId}
                                    className="w-full h-full object-cover opacity-10 group-hover:opacity-20 blur-xl transition-opacity"
                                    fallbackClassName="hidden"
                                 />
                                 <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-[#111113]/80 to-transparent"></div>
                              </div>
                              
                              <div className="relative z-10 flex flex-col h-full p-4 justify-between">
                                <div className="flex justify-between items-start">
                                  <DriveCover 
                                    file={f} 
                                    isEpub={selectedMetric.id === 'drive_epub'}
                                    isPdf={selectedMetric.id === 'drive_pdf'}
                                    fileId={fileId}
                                    className="w-24 h-36 object-cover rounded shadow-lg border border-[rgba(255,255,255,0.1)] mb-1 shrink-0"
                                    fallbackClassName={`flex items-center justify-center w-24 h-36 rounded-lg bg-black/50 border border-[rgba(255,255,255,0.05)] shrink-0 mb-1 ${selectedMetric.id === 'drive_pdf' ? 'text-red-400' : 'text-indigo-400'}`}
                                  />
                                  
                                  {linkedBook && (
                                     <div className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1 backdrop-blur-sm shadow-xl">
                                       <Check className="size-3" /> No Sistema
                                     </div>
                                  )}
                                </div>
                                
                                <div className="mt-auto">
                                  <span className="text-sm text-white font-bold line-clamp-2 leading-tight drop-shadow-md mb-1" title={f.name}>
                                    {f.name.replace(/^arquivos\//, '')}
                                  </span>
                                  <span className="text-xs font-medium text-[#71717A]">
                                    {(f.size / (1024*1024)).toFixed(1)} MB
                                  </span>
                                </div>
                              </div>
                              
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity p-4">
                                 {linkedBook ? (
                                    <button onClick={() => { setSelectedMetric(null); onOpenBook?.(linkedBook.id); }} className="w-full py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-emerald-600 transition-colors">
                                      Ver Obra
                                    </button>
                                 ) : (
                                    <button onClick={() => { 
                                       setSelectedMetric(null); 
                                       let cleanName = f.name.replace(/^arquivos\//, '').replace(/\.(epub|mobi|pdf)$/i, '').trim();
                                       cleanName = cleanName.replace(/^(Vol\.?|Patrística Vol\.?)\s*\d+(_\d+)?\s*[-–]\s*/i, '').trim();
                                       
                                       fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanName)}&maxResults=1`)
                                         .then(r => r.json())
                                         .then(data => {
                                            const info = data.items?.[0]?.volumeInfo;
                                            let cover = f.thumbnail || (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : "");
                                            if (info?.imageLinks?.thumbnail) {
                                               cover = info.imageLinks.thumbnail.replace('http:', 'https:').replace('&edge=curl', '');
                                            }
                                            onRegisterBook?.(f, cover, info?.authors?.[0] || "");
                                         })
                                         .catch(() => {
                                            onRegisterBook?.(f, f.thumbnail || (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : ""), "");
                                         });
                                    }} className="w-full py-2 bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-indigo-600 transition-colors">
                                      Registrar Obra
                                    </button>
                                 )}
                                 <a href={f.url} target="_blank" rel="noreferrer" className="w-full py-2 bg-white/10 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                                   Ler no Drive <ExternalLink className="size-3" />
                                 </a>
                              </div>
                           </div>
                        )})}
                        {visibleCount < filtered.length && (
                          <div className="col-span-full flex justify-center mt-2 mb-4">
                            <button 
                              onClick={() => setVisibleCount(prev => prev + 12)}
                              className="bg-white/5 hover:bg-white/10 text-white text-sm font-bold py-2.5 px-6 rounded-full transition-colors flex items-center gap-2"
                            >
                              Ver Mais ({filtered.length - visibleCount} restantes)
                            </button>
                          </div>
                        )}
                        <div className="col-span-full flex flex-col sm:flex-row items-center justify-between mt-4 p-4 rounded-xl bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] shadow-inner">
                           <div className="flex flex-col mb-3 sm:mb-0">
                              <span className="text-white font-bold">{filtered.length} Obras Sincronizadas</span>
                              <span className="text-[#71717A] text-xs">Armazenamento: {totalGb} GB Total</span>
                           </div>
                           <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
                                 <svg viewBox="0 0 87.3 78" className="w-4 h-4">
                                    <path d="M58.3 64.9l29-50.3H29.1z" fill="#FBBC04" />
                                    <path d="M58.2 64.9L29.1 14.6 0 64.9z" fill="#4285F4" />
                                    <path d="M0 64.9L14.6 90h58.2z" fill="#34A853" />
                                 </svg>
                              </div>
                              <span className="text-sm font-bold text-white/90">Google Drive</span>
                           </div>
                        </div>
                      </>
                    );
                  })()}
               </div>
             </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
              <span className="text-3xl font-black">{selectedMetric?.value}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
