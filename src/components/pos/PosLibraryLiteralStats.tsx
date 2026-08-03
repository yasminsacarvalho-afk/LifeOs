import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { PosBook, PosReadingSession } from '@/hooks/use-pos-library';
import { format, differenceInDays, parseISO, isSameYear, getYear } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  books: PosBook[];
  sessions: PosReadingSession[];
}

const EMOJI_REGEX = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

// Animated Number Component
const AnimatedNumber = ({ value, suffix = "" }: { value: number, suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
       setDisplayValue(end);
       return;
    }
    const duration = 1000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue % 1 === 0 ? displayValue : displayValue.toFixed(1)}{suffix}</span>;
};

export function PosLibraryLiteralStats({ isOpen, onClose, books, sessions }: Props) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    books.forEach(b => {
      if (b.end_date) years.add(getYear(parseISO(b.end_date)));
      if (b.start_date) years.add(getYear(parseISO(b.start_date)));
      if (b.created_at) years.add(getYear(parseISO(b.created_at)));
    });
    sessions.forEach(s => {
      if (s.date) years.add(getYear(parseISO(s.date)));
    });
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [books, sessions]);

  const yearStats = useMemo(() => {
    const yearBooks = books.filter(b => {
      const d = b.end_date || b.start_date || b.created_at;
      if (!d) return false;
      return getYear(parseISO(d)) === selectedYear;
    });

    const yearSessions = sessions.filter(s => {
      if (!s.date) return false;
      return getYear(parseISO(s.date)) === selectedYear;
    });

    // Emojis (Reações)
    const emojiCounts: Record<string, number> = {};
    yearSessions.forEach(s => {
      if (s.notes) {
        const matches = s.notes.match(EMOJI_REGEX);
        if (matches) {
          matches.forEach(e => {
            emojiCounts[e] = (emojiCounts[e] || 0) + 1;
          });
        }
      }
    });
    yearBooks.forEach(b => {
      if (b.summary) {
        const matches = b.summary.match(EMOJI_REGEX);
        if (matches) {
          matches.forEach(e => {
            emojiCounts[e] = (emojiCounts[e] || 0) + 1;
          });
        }
      }
    });

    const sortedEmojis = Object.entries(emojiCounts).sort((a, b) => b[1] - a[1]);
    const topEmoji = sortedEmojis.length > 0 ? sortedEmojis[0] : null;

    // Pages
    const pagesRead = yearSessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
    const completedBooks = yearBooks.filter(b => b.status === 'concluido');
    
    // Days logic
    const isCurrentYear = selectedYear === new Date().getFullYear();
    const daysElapsed = isCurrentYear 
      ? differenceInDays(new Date(), new Date(selectedYear, 0, 1)) + 1 
      : 365;
    
    const pagesPerDay = daysElapsed > 0 ? pagesRead / daysElapsed : 0;
    const projBooks = isCurrentYear && daysElapsed > 0 
      ? Math.round((completedBooks.length / daysElapsed) * 365) 
      : completedBooks.length;

    // Streak
    const sessionDates = Array.from(new Set(yearSessions.map(s => s.date?.split('T')[0]).filter(Boolean))).sort();
    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;
    
    sessionDates.forEach(dateStr => {
       const d = parseISO(dateStr!);
       if (!lastDate) {
         currentStreak = 1;
       } else {
         const diff = differenceInDays(d, lastDate);
         if (diff === 1) {
           currentStreak++;
         } else if (diff > 1) {
           currentStreak = 1;
         }
       }
       if (currentStreak > maxStreak) maxStreak = currentStreak;
       lastDate = d;
    });

    // Ratings & Reviews
    const ratedBooks = completedBooks.filter(b => (b.rating || 0) > 0).length;
    const reviewedBooks = completedBooks.filter(b => b.summary && b.summary.trim().length > 0).length;
    
    const ratingPercent = completedBooks.length > 0 ? (ratedBooks / completedBooks.length) * 100 : 0;
    const reviewPercent = completedBooks.length > 0 ? (reviewedBooks / completedBooks.length) * 100 : 0;

    return {
      topEmoji,
      allEmojis: sortedEmojis.slice(0, 10),
      pagesRead,
      pagesPerDay,
      projBooks,
      maxStreak,
      ratedBooks,
      reviewedBooks,
      completedBooks: completedBooks.length,
      ratingPercent,
      reviewPercent
    };
  }, [books, sessions, selectedYear]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto font-sans animate-in slide-in-from-bottom-full duration-300">
      {/* Safe Area Padding */}
      <div className="pb-[40px]">
        
        {/* Header */}
        <div className="flex items-center px-5 pt-12 pb-4 sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <button onClick={onClose} className="p-2 -ml-2 text-[#111111] hover:bg-black/5 rounded-full transition-colors">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-[28px] font-semibold text-[#111111] tracking-tight flex-1 text-center pr-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            Estatísticas
          </h1>
        </div>

        {/* Year Selector */}
        <div className="mt-6 mb-4 overflow-x-auto custom-scrollbar no-scrollbar pl-5 pr-5">
          <div className="flex items-center gap-2 pb-2 w-max">
            {availableYears.map(year => {
              const isSelected = selectedYear === year;
              return (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`h-[42px] min-w-[92px] px-6 rounded-full text-[15px] transition-all duration-300 ${
                    isSelected 
                      ? 'bg-[#2196F3] text-white font-bold shadow-sm' 
                      : 'bg-[#ECEFF1] text-[#111111] font-medium hover:bg-[#E0E0E0]'
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="px-5 grid grid-cols-2 gap-4">
          
          {/* Card: Maior Reação */}
          <div className="bg-[#F3F4F6] rounded-[22px] p-5 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
            <h3 className="text-[18px] font-semibold text-[#111111] mb-3 w-full text-left">Maior reação</h3>
            <div className="flex-1 flex items-center justify-center">
              {yearStats.topEmoji ? (
                <span className="text-[52px] leading-none animate-bounce">{yearStats.topEmoji[0]}</span>
              ) : (
                <span className="text-[52px] leading-none opacity-30">😶</span>
              )}
            </div>
            <p className="text-[13px] text-[#6B7280] mt-3">
              {yearStats.topEmoji ? `Usado ${yearStats.topEmoji[1]} vezes` : 'Sem reações'}
            </p>
          </div>

          {/* Card: Páginas do ano */}
          <div className="bg-[#F3F4F6] rounded-[22px] p-5 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500 delay-75">
            <h3 className="text-[18px] font-semibold text-[#111111] mb-2">Páginas do ano</h3>
            <div>
              <div className="text-[42px] font-bold text-[#111111] leading-none tracking-tight">
                <AnimatedNumber value={yearStats.pagesRead} />
              </div>
              <p className="text-[15px] text-[#111111] mt-1 font-medium">páginas</p>
            </div>
            <p className="text-[13px] text-[#6B7280] mt-4">
              Média diária <br/>
              <span className="font-semibold text-[#111111]"><AnimatedNumber value={yearStats.pagesPerDay} /> pág/dia</span>
            </p>
          </div>

          {/* Card: Avaliações */}
          <div className="bg-[#F3F4F6] rounded-[22px] p-5 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500 delay-100">
            <h3 className="text-[18px] font-semibold text-[#111111] mb-4">Avaliações</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[13px]">
                <div className="flex items-center gap-1.5 text-[#111111] font-medium"><div className="w-2 h-2 rounded-full bg-[#2196F3]"></div> Feitas</div>
                <span className="font-bold text-[#111111]"><AnimatedNumber value={yearStats.ratedBooks} /></span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <div className="flex items-center gap-1.5 text-[#6B7280] font-medium"><div className="w-2 h-2 rounded-full bg-[#90CAF9]"></div> Lidos</div>
                <span className="font-bold text-[#6B7280]"><AnimatedNumber value={yearStats.completedBooks} /></span>
              </div>
            </div>
            <div className="mt-5 h-1.5 w-full bg-[#ECEFF1] rounded-full overflow-hidden">
              <div className="h-full bg-[#2196F3] rounded-full transition-all duration-1000 ease-out" style={{ width: `${yearStats.ratingPercent}%` }}></div>
            </div>
          </div>

          {/* Card: Resenhas */}
          <div className="bg-[#F3F4F6] rounded-[22px] p-5 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500 delay-150">
            <h3 className="text-[18px] font-semibold text-[#111111] mb-4">Resenhas</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[13px]">
                <div className="flex items-center gap-1.5 text-[#111111] font-medium"><div className="w-2 h-2 rounded-full bg-[#2196F3]"></div> Criadas</div>
                <span className="font-bold text-[#111111]"><AnimatedNumber value={yearStats.reviewedBooks} /></span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <div className="flex items-center gap-1.5 text-[#6B7280] font-medium"><div className="w-2 h-2 rounded-full bg-[#90CAF9]"></div> Lidos</div>
                <span className="font-bold text-[#6B7280]"><AnimatedNumber value={yearStats.completedBooks} /></span>
              </div>
            </div>
            <div className="mt-5 h-1.5 w-full bg-[#ECEFF1] rounded-full overflow-hidden">
              <div className="h-full bg-[#2196F3] rounded-full transition-all duration-1000 ease-out" style={{ width: `${yearStats.reviewPercent}%` }}></div>
            </div>
          </div>

          {/* Card: Dias Seguidos */}
          <div className="bg-[#F3F4F6] rounded-[22px] p-5 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500 delay-200">
            <h3 className="text-[18px] font-semibold text-[#111111] mb-2">Dias seguidos</h3>
            <div>
              <div className="text-[44px] font-bold text-[#111111] leading-none tracking-tight">
                <AnimatedNumber value={yearStats.maxStreak} />
              </div>
              <p className="text-[15px] text-[#111111] mt-1 font-medium">dias lendo</p>
            </div>
            <p className="text-[13px] text-[#6B7280] mt-4 leading-snug">
              Maior sequência<br/>do ano
            </p>
          </div>

          {/* Card: Ritmo de Leitura */}
          <div className="bg-[#F3F4F6] rounded-[22px] p-5 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500 delay-200">
            <h3 className="text-[18px] font-semibold text-[#111111] mb-2 leading-tight">Ritmo de<br/>Leitura</h3>
            <div className="mt-2">
              <div className="text-[32px] font-bold text-[#111111] leading-none tracking-tight">
                <AnimatedNumber value={yearStats.pagesPerDay} />
              </div>
              <p className="text-[13px] text-[#111111] mt-1 font-medium">Páginas/dia</p>
            </div>
            <p className="text-[12px] text-[#2196F3] mt-4 font-semibold leading-snug bg-[#2196F3]/10 px-2 py-1.5 rounded-lg">
              Projeção: {yearStats.projBooks} livros este ano.
            </p>
          </div>
          
          {/* Card Inferior: Minhas Reações */}
          <div className="col-span-2 bg-[#F3F4F6] rounded-[22px] p-5 animate-in fade-in zoom-in-95 duration-500 delay-300">
            <h3 className="text-[18px] font-semibold text-[#111111] mb-4">Minhas reações</h3>
            
            {yearStats.allEmojis.length > 0 ? (
              <div className="flex overflow-x-auto gap-4 pb-2 custom-scrollbar no-scrollbar">
                {yearStats.allEmojis.map(([emoji, count], index) => {
                  const isTop = index === 0;
                  return (
                    <div key={emoji} className="flex flex-col items-center shrink-0">
                      <div className={`size-14 rounded-full flex items-center justify-center text-[28px] mb-2 ${isTop ? 'bg-[#90CAF9] shadow-[0_4px_12px_rgba(33,150,243,0.3)]' : 'bg-white'}`}>
                        {emoji}
                      </div>
                      <span className="text-[15px] font-bold text-[#111111]">{count}</span>
                      {isTop && (
                        <span className="text-[10px] font-semibold text-[#2196F3] mt-1">Mais usada</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex gap-4 opacity-40">
                <div className="flex flex-col items-center">
                  <div className="size-14 rounded-full bg-white flex items-center justify-center text-[28px] mb-2">😶</div>
                  <span className="text-[15px] font-bold text-[#111111]">0</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="size-14 rounded-full bg-white flex items-center justify-center text-[28px] mb-2">💤</div>
                  <span className="text-[15px] font-bold text-[#111111]">0</span>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
