import { useState, useEffect } from "react";
import { PosLibraryGraph } from "./PosLibraryGraph";
import { PosLibraryAchievements } from "./PosLibraryAchievements";
import { usePosLibrary } from "@/hooks/use-pos-library";
import { 
  Plus, Trash2, BookOpen, Star, Play, Pause, Bookmark, Brain, Sparkles, 
  TrendingUp, Clock, Calendar as CalendarIcon, AlignLeft, Target, CheckCircle2, Edit2, RotateCcw, X, ExternalLink
} from "lucide-react";
import { format, isToday, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePosGoals } from "@/hooks/use-pos-goals";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function PosLibrary() {
  const { books, sessions, loading, addBook, updateBook, deleteBook, addReadingSession, resetBookProgress, deleteReadingSession } = usePosLibrary();
  const { goals } = usePosGoals();
  const [isCreating, setIsCreating] = useState(false);
  const [activeSessionBook, setActiveSessionBook] = useState<string | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [viewHistoryBookId, setViewHistoryBookId] = useState<string | null>(null);
  const [editBookData, setEditBookData] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Persistent Active Sessions
  const [activeSessions, setActiveSessions] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('voyage_active_reading_sessions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [finishingSessionId, setFinishingSessionId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Update timer every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const saveActiveSessions = (sessions: any[]) => {
    setActiveSessions(sessions);
    localStorage.setItem('voyage_active_reading_sessions', JSON.stringify(sessions));
  };

  const startReadingSession = (book: any) => {
    const existing = activeSessions.find(s => s.bookId === book.id);
    if (existing) {
       alert("Você já tem uma sessão ativa para este livro!");
       return;
    }
    const newSession = {
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      bookId: book.id,
      bookTitle: book.title,
      startTime: Date.now(),
      notes: ""
    };
    saveActiveSessions([...activeSessions, newSession]);
    
    if (book.drive_link || book.buy_link) {
      window.open(book.drive_link || book.buy_link, '_blank');
    }
  };

  const cancelReadingSession = (id: string) => {
    saveActiveSessions(activeSessions.filter(s => s.id !== id));
  };

  const openFinishSession = (session: any) => {
    const diffMs = Date.now() - session.startTime;
    const durationMinutes = Math.max(1, Math.round(diffMs / 60000));
    setFinishingSessionId(session.id);
    setNewSession({ duration_minutes: durationMinutes, pages_read: 0, concentration_level: 8, notes: session.notes || "" });
  };

  const handleLogActiveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishingSessionId) return;
    const session = activeSessions.find(s => s.id === finishingSessionId);
    if (!session) return;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const deviceName = isMobile ? "Celular/Tablet" : "PC/Desktop";
    const userLocation = Intl.DateTimeFormat().resolvedOptions().timeZone || "Desconhecido";
    
    const startDate = new Date(session.startTime);
    const timeStr = `${startDate.getHours().toString().padStart(2,'0')}:${startDate.getMinutes().toString().padStart(2,'0')}`;

    await addReadingSession({ 
      ...newSession, 
      book_id: session.bookId, 
      session_date: format(startDate, 'yyyy-MM-dd'),
      start_time: timeStr,
      device: deviceName,
      location: userLocation
    } as any);
    
    cancelReadingSession(session.id);
    setFinishingSessionId(null);
  };

  const [newBook, setNewBook] = useState({
    title: "", author: "", category: "Negócios", knowledge_area: "Estratégia",
    format: "fisico", status: "quero_ler", total_pages: 0, language: "pt-br", start_date: format(new Date(), 'yyyy-MM-dd'), end_date: "", goal_id: "", buy_link: ""
  });

  const getSafeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return parseISO(`${dateStr.split('T')[0]}T12:00:00`);
  };

  const [newSession, setNewSession] = useState({
    duration_minutes: 30, pages_read: 15, concentration_level: 8, notes: ""
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title) return;
    const payload: any = { ...newBook };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    if (!payload.goal_id) delete payload.goal_id;
    await addBook(payload);
    setIsCreating(false);
    setNewBook({ ...newBook, title: "", author: "", total_pages: 0, start_date: format(new Date(), 'yyyy-MM-dd'), end_date: "", goal_id: "" });
  };

  const handleLogSession = async (e: React.FormEvent) => {
    // Legacy generic session logging if needed, replaced by active session flow
    e.preventDefault();
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookId || !editBookData) return;
    const payload = { ...editBookData };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    if (!payload.goal_id) delete payload.goal_id;
    await updateBook(editingBookId, payload);
    setEditingBookId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'quero_ler': return <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">Quero Ler</span>;
      case 'lendo': return <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">Lendo</span>;
      case 'concluido': return <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">Concluído</span>;
      case 'pausado': return <span className="text-[10px] uppercase font-bold text-[#A1A1AA] bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded">Pausado</span>;
      case 'abandonado': return <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">Abandonado</span>;
      default: return null;
    }
  };

  const totalPagesRead = sessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
  const totalBooksCompleted = books.filter(b => b.status === 'concluido').length;
  
  const totalSessionMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const totalSessionPages = sessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
  const readingSpeed = totalSessionMinutes > 0 ? Math.round((totalSessionPages / (totalSessionMinutes / 60))) : 0;

  const currentBooks = books.filter(b => b.status === 'lendo');

  const chartData = [
    { day: '01', pages: 12 }, { day: '02', pages: 25 }, { day: '03', pages: 10 },
    { day: '04', pages: 40 }, { day: '05', pages: 15 }, { day: '06', pages: 30 }, { day: '07', pages: 22 }
  ];

  const filteredBooks = books.filter(b => {
    if (filterStatus !== 'todos' && b.status !== filterStatus) return false;
    if (filterCategory !== 'todas' && b.knowledge_area !== filterCategory) return false;
    if (searchQuery && !b.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
             <BookOpen className="size-6 text-rose-500" /> Acervo & Evolução Intelectual
          </h2>
          <p className="text-[#A1A1AA] text-sm mt-1">Rastreabilidade completa de leitura, resumos e métricas de absorção.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:bg-rose-500 transition-colors"
        >
          <Plus className="size-4" /> Registrar Obra
        </button>
      </div>



      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
          <div className="w-full md:max-w-4xl max-h-[90vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 md:zoom-in-95">
            <div className="p-5 md:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <BookOpen className="size-5 text-rose-500" /> Registrar Nova Obra
               </h3>
               <button type="button" onClick={() => setIsCreating(false)} className="p-2 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-500 rounded-full transition-colors">
                 <X className="size-5" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
              <form onSubmit={handleCreate}>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
                  <div className="md:col-span-3">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Título</label>
                    <input 
                      type="text" required value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                      placeholder="Ex: A Arte da Guerra"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Autor</label>
                    <input 
                      type="text" required value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                      placeholder="Sun Tzu"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Formato</label>
                    <select 
                      value={newBook.format} onChange={e => setNewBook({...newBook, format: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    >
                      <option value="fisico">Físico</option>
                      <option value="digital">Kindle/E-book</option>
                      <option value="audiobook">Audiobook</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Páginas Totais</label>
                    <input 
                      type="number" min="1" required value={newBook.total_pages || ''} onChange={e => setNewBook({...newBook, total_pages: Number(e.target.value)})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Área do Conhecimento</label>
                    <select 
                      value={newBook.knowledge_area} onChange={e => setNewBook({...newBook, knowledge_area: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    >
                      <option value="Negócios">Negócios</option>
                      <option value="Filosofia">Filosofia</option>
                      <option value="Tecnologia">Tecnologia</option>
                      <option value="Finanças">Finanças</option>
                      <option value="Psicologia">Psicologia</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Status Inicial</label>
                    <select 
                      value={newBook.status} onChange={e => setNewBook({...newBook, status: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    >
                      <option value="quero_ler">Quero Ler (Wishlist)</option>
                      <option value="lendo">Lendo Atualmente</option>
                      <option value="concluido">Já Concluído</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 flex items-center gap-1"><CalendarIcon className="size-3" /> Início da Leitura</label>
                    <input 
                      type="date" value={newBook.start_date} onChange={e => setNewBook({...newBook, start_date: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 flex items-center gap-1"><Target className="size-3" /> Meta de Conclusão</label>
                    <input 
                      type="date" value={newBook.end_date} onChange={e => setNewBook({...newBook, end_date: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Vincular Meta Estratégica (Opcional)</label>
                    <select 
                      value={newBook.goal_id || ''} onChange={e => setNewBook({...newBook, goal_id: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    >
                      <option value="">Nenhuma Meta Vinculada</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Link do Drive / Arquivo (Opcional)</label>
                    <input 
                      type="url" value={newBook.buy_link || ''} onChange={e => setNewBook({...newBook, buy_link: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-4 md:py-3 rounded-xl text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Cancelar</button>
                  <button type="submit" className="px-6 py-4 md:py-3 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)]">Adicionar à Biblioteca</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingBookId && editBookData && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
          <div className="w-full md:max-w-4xl max-h-[90vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 md:zoom-in-95">
            <div className="p-5 md:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Edit2 className="size-5 text-rose-500" /> Editando Obra
               </h3>
               <button type="button" onClick={() => setEditingBookId(null)} className="p-2 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-500 rounded-full transition-colors">
                 <X className="size-5" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
              <form onSubmit={handleUpdateBook}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Título</label>
                    <input type="text" value={editBookData.title} onChange={e => setEditBookData({...editBookData, title: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Autor</label>
                    <input type="text" value={editBookData.author || ''} onChange={e => setEditBookData({...editBookData, author: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Status</label>
                    <select value={editBookData.status} onChange={e => setEditBookData({...editBookData, status: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500">
                      <option value="quero_ler">Quero Ler</option>
                      <option value="lendo">Lendo Atualmente</option>
                      <option value="concluido">Já Concluído</option>
                      <option value="pausado">Pausado</option>
                      <option value="abandonado">Abandonado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Formato</label>
                    <select value={editBookData.format} onChange={e => setEditBookData({...editBookData, format: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500">
                      <option value="fisico">Livro Físico</option>
                      <option value="ebook">E-book</option>
                      <option value="audiobook">Audiobook</option>
                      <option value="pdf">PDF / Artigo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Páginas Totais</label>
                    <input type="number" value={editBookData.total_pages || ''} onChange={e => setEditBookData({...editBookData, total_pages: Number(e.target.value)})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Início da Leitura</label>
                    <input type="date" value={editBookData.start_date ? editBookData.start_date.split('T')[0] : ''} onChange={e => setEditBookData({...editBookData, start_date: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Meta de Conclusão</label>
                    <input type="date" value={editBookData.end_date ? editBookData.end_date.split('T')[0] : ''} onChange={e => setEditBookData({...editBookData, end_date: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Meta Estratégica</label>
                    <select value={editBookData.goal_id || ''} onChange={e => setEditBookData({...editBookData, goal_id: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500">
                      <option value="">Nenhuma</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Link do Drive / Arquivo</label>
                    <input type="url" value={editBookData.buy_link || ''} onChange={e => setEditBookData({...editBookData, buy_link: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" placeholder="https://..." />
                  </div>
                </div>
                <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                  <button type="button" onClick={() => setEditingBookId(null)} className="px-6 py-4 md:py-3 rounded-xl text-sm font-medium text-[#A1A1AA] hover:bg-[#1A1A1E]">Cancelar</button>
                  <button type="submit" className="px-6 py-4 md:py-3 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)]">Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {currentBooks.map(currentBook => {
        let cbPercent = 0, cbPagesReadToday = 0, cbTotalMinutes = 0, cbPagesPerDay = 0, cbRemainingDaysToFinish = 0, cbStreak = 0;
        
        cbPercent = currentBook.total_pages ? Math.min(100, Math.round((currentBook.pages_read / currentBook.total_pages) * 100)) : 0;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const cbSessions = sessions.filter(s => s.book_id === currentBook.id);
        cbPagesReadToday = cbSessions.filter(s => s.session_date === todayStr).reduce((acc, s) => acc + (s.pages_read || 0), 0);
        cbTotalMinutes = cbSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
        
        if (currentBook.end_date && currentBook.total_pages) {
           const end = getSafeDate(currentBook.end_date);
           const now = new Date();
           if (end) {
              const remainingPages = Math.max(0, currentBook.total_pages - currentBook.pages_read);
              const remainingDays = Math.max(1, differenceInDays(end, now));
              cbPagesPerDay = Math.ceil(remainingPages / remainingDays);
           }
        }

        const sessionDates = [...new Set(cbSessions.map(s => s.session_date))].sort().reverse();
        let currentCheckDate = new Date();
        
        if (sessionDates.includes(format(currentCheckDate, 'yyyy-MM-dd'))) {
          cbStreak++;
          currentCheckDate.setDate(currentCheckDate.getDate() - 1);
        } else {
          currentCheckDate.setDate(currentCheckDate.getDate() - 1);
          if (sessionDates.includes(format(currentCheckDate, 'yyyy-MM-dd'))) {
             cbStreak++;
             currentCheckDate.setDate(currentCheckDate.getDate() - 1);
          }
        }
        
        while (sessionDates.includes(format(currentCheckDate, 'yyyy-MM-dd'))) {
          cbStreak++;
          currentCheckDate.setDate(currentCheckDate.getDate() - 1);
        }

        const totalSessionPagesCb = cbSessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
        if (cbTotalMinutes > 0 && totalSessionPagesCb > 0) {
           const pagesPerMinute = totalSessionPagesCb / cbTotalMinutes;
           const remainingPages = Math.max(0, (currentBook.total_pages || 0) - currentBook.pages_read);
           const remainingMinutes = remainingPages / pagesPerMinute;
           cbRemainingDaysToFinish = Math.ceil(remainingMinutes / 30);
        } else if (cbPagesPerDay > 0) {
           const remainingPages = Math.max(0, (currentBook.total_pages || 0) - currentBook.pages_read);
           cbRemainingDaysToFinish = Math.ceil(remainingPages / cbPagesPerDay);
        }

        return (
          <div key={currentBook.id} className="bg-[#111113]/60 backdrop-blur-2xl rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 md:p-8 flex flex-col gap-6 border border-[rgba(255,255,255,0.08)] mb-8 mt-8 animate-in fade-in relative overflow-hidden">
            {/* Ambient glow inside the card */}
            <div className="absolute -top-40 -right-40 size-80 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="flex justify-between items-center relative z-10">
               <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                 📖 Leitura Atual
               </h3>
               <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/20 shadow-glow-sm">
                 {cbPercent}%
               </span>
            </div>
            
            <div className="flex gap-4 md:gap-5 relative z-10">
               <div className="w-20 h-28 md:w-24 md:h-36 bg-black/50 rounded-lg flex-shrink-0 border border-[rgba(255,255,255,0.05)] flex items-center justify-center overflow-hidden relative shadow-lg">
                 <BookOpen className="size-8 text-[#3F3F46] absolute" />
                 <div className={cn("absolute inset-0 opacity-20", 
                    currentBook.knowledge_area === 'Negócios' ? 'bg-blue-500' :
                    currentBook.knowledge_area === 'Filosofia' ? 'bg-amber-500' :
                    'bg-rose-500'
                 )} />
               </div>
               <div className="flex flex-col justify-center">
                 <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">{currentBook.knowledge_area || 'Geral'}</p>
                 <h4 className="text-xl md:text-2xl font-black text-white leading-tight mb-1 line-clamp-2">{currentBook.title}</h4>
                 <p className="text-sm font-medium text-[#71717A]">{currentBook.author}</p>
               </div>
            </div>
            
            <div className="relative z-10">
               <div className="flex justify-between text-[11px] font-bold text-[#71717A] mb-2 uppercase tracking-widest">
                 <span>Progresso</span>
                 <span>{currentBook.pages_read} / {currentBook.total_pages || '?'} páginas ({cbPercent}%)</span>
               </div>
               <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)]">
                 <div className="h-full bg-rose-500 rounded-full transition-all shadow-[0_0_10px_rgba(225,29,72,0.5)]" style={{ width: `${cbPercent}%` }}></div>
               </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative z-10">
               <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col items-start hover:bg-black/40 transition-colors shadow-inner">
                 <div className="flex items-center gap-1.5 text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest mb-2"><TrendingUp className="size-3 text-orange-400" /> Sequência</div>
                 <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1">{cbStreak} <span className="text-xs font-bold text-[#71717A]">dias</span></div>
               </div>
               <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col items-start hover:bg-black/40 transition-colors shadow-inner">
                 <div className="flex items-center gap-1.5 text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest mb-2"><BookOpen className="size-3 text-blue-400" /> Lidas Hoje</div>
                 <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1">{cbPagesReadToday} <span className="text-xs font-bold text-[#71717A]">págs</span></div>
               </div>
               <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col items-start hover:bg-black/40 transition-colors shadow-inner">
                 <div className="flex items-center gap-1.5 text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest mb-2"><Clock className="size-3 text-emerald-400" /> Tempo Total</div>
                 <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1">{cbTotalMinutes} <span className="text-xs font-bold text-[#71717A]">min</span></div>
               </div>
               <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col items-start hover:bg-black/40 transition-colors shadow-inner">
                 <div className="flex items-center gap-1.5 text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest mb-2"><Target className="size-3 text-rose-400" /> Meta Diária</div>
                 <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1">{cbPagesPerDay || '-'} <span className="text-xs font-bold text-[#71717A]">págs</span></div>
               </div>
            </div>
            
            <div className="bg-rose-950/30 backdrop-blur-md p-4 rounded-xl border border-rose-500/20 flex items-center gap-3 relative z-10">
               <div className="bg-black/50 p-2 rounded-lg border border-[rgba(255,255,255,0.05)] shrink-0">
                 <Brain className="size-4 text-rose-400" />
               </div>
               <div className="text-rose-200/90 text-sm font-medium">
                 {currentBook.end_date && currentBook.total_pages && getSafeDate(currentBook.end_date) ? (
                   <div className="flex flex-col gap-1.5">
                     <span>Para concluir até <strong className="text-rose-100">{format(getSafeDate(currentBook.end_date)!, "dd/MM/yyyy")}</strong>, você precisa ler <strong className="text-white bg-rose-500/30 px-2 py-0.5 rounded">{cbPagesPerDay} páginas por dia</strong>.</span>
                     {cbRemainingDaysToFinish > 0 && (
                       <span className="text-[11px] opacity-70">Ritmo atual: previsão de conclusão em {cbRemainingDaysToFinish} dias.</span>
                     )}
                   </div>
                 ) : (
                   cbRemainingDaysToFinish > 0 
                     ? `Mantendo este ritmo, você conclui em ${cbRemainingDaysToFinish} dias. (Defina uma Data de Conclusão para calcular a meta diária)` 
                     : "Falta muito pouco! Mantenha o ritmo para concluir em breve."
                 )}
               </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 pt-2 relative z-10">
               <button 
                 onClick={() => startReadingSession(currentBook)}
                 className="flex-1 bg-rose-600 text-white font-bold py-3.5 rounded-xl hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all flex items-center justify-center gap-2"
               >
                 <Play className="size-4" fill="currentColor" /> Continuar Lendo
               </button>
               {currentBook.buy_link && (
                 <a href={currentBook.buy_link} target="_blank" rel="noopener noreferrer" className="flex-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold py-3.5 rounded-xl hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2">
                   <ExternalLink className="size-4" /> Acessar Arquivo
                 </a>
               )}
               <button 
                 onClick={() => { setEditingBookId(currentBook.id); setEditBookData(currentBook); }}
                 className="flex-1 bg-white/5 text-white border border-white/10 font-bold py-3.5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
               >
                 Ver Detalhes
               </button>
            </div>
          </div>
        );
      })}

      {/* Tabela de Sessões Ativas Seguras */}
      {activeSessions.length > 0 && (
         <div className="mt-2 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Play className="size-5 text-rose-500" fill="currentColor" /> Sessões em Andamento (Seguras)
            </h3>
            <div className="space-y-3">
               {activeSessions.map(session => {
                  const elapsedMinutes = Math.max(0, Math.floor((now - session.startTime) / 60000));
                  return (
                    <div key={session.id} className="bg-[#111113] border border-rose-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(225,29,72,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="flex size-2 rounded-full bg-rose-500 animate-pulse"></span>
                             <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Gravando Sessão</span>
                          </div>
                          <h4 className="text-white font-bold text-lg">{session.bookTitle}</h4>
                          <p className="text-sm text-[#A1A1AA] mt-1 flex items-center gap-2">
                             <Clock className="size-4" /> Iniciado às {format(new Date(session.startTime), 'HH:mm')} ({elapsedMinutes} min. lidos)
                          </p>
                       </div>
                       
                       <div className="flex gap-2">
                          <button onClick={() => cancelReadingSession(session.id)} className="px-4 py-2.5 rounded-xl bg-[#1A1A1E] text-[#A1A1AA] hover:text-white hover:bg-white/10 text-sm font-bold border border-[rgba(255,255,255,0.05)] transition-colors">
                             Cancelar
                          </button>
                          <button onClick={() => openFinishSession(session)} className="px-6 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-500 text-sm font-bold shadow-lg transition-colors flex items-center gap-2">
                             <CheckCircle2 className="size-4" /> Concluir Leitura
                          </button>
                       </div>
                    </div>
                  )
               })}
            </div>
         </div>
      )}

      {/* Modal Concluir Sessão */}
      {finishingSessionId && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
          <form onSubmit={handleLogActiveSession} className="bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-t-3xl sm:rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-lg relative animate-in slide-in-from-bottom duration-300">
            <button type="button" onClick={() => setFinishingSessionId(null)} className="absolute top-6 right-6 text-[#71717A] hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="size-4"/></button>
            <h3 className="text-xl font-bold text-white mb-6 border-b border-[rgba(255,255,255,0.06)] pb-4 flex items-center gap-2">
               <AlignLeft className="size-5 text-rose-500" /> Registrar Leitura
            </h3>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Páginas Lidas Hoje</label>
                   <input 
                     type="number" min="1" required value={newSession.pages_read || ''} onChange={e => setNewSession({...newSession, pages_read: Number(e.target.value)})}
                     className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 focus:outline-none transition-colors"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Duração (Minutos)</label>
                   <input 
                     type="number" min="1" required value={newSession.duration_minutes || ''} onChange={e => setNewSession({...newSession, duration_minutes: Number(e.target.value)})}
                     className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 focus:outline-none transition-colors"
                   />
                 </div>
              </div>
              
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Anotações / Resumo</label>
                <textarea 
                  value={newSession.notes} onChange={e => setNewSession({...newSession, notes: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 focus:outline-none transition-colors min-h-[120px] custom-scrollbar"
                  placeholder="O que você aprendeu hoje? Faça um resumo..."
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2">
                 Salvar Sessão <Target className="size-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historico & Acervo */}
      <div className="mt-4 md:mt-8">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Bookmark className="size-5 text-rose-500" /> Histórico & Acervo
            </h3>
            
            <div className="flex flex-col md:flex-row gap-3">
              <input 
                 type="text"
                 placeholder="Buscar livro..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
              />
              <select 
                 value={filterStatus}
                 onChange={e => setFilterStatus(e.target.value)}
                 className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
              >
                 <option value="todos">Todos os Status</option>
                 <option value="quero_ler">Quero Ler</option>
                 <option value="lendo">Lendo</option>
                 <option value="concluido">Concluído</option>
                 <option value="pausado">Pausado</option>
                 <option value="abandonado">Abandonado</option>
              </select>
              <select 
                 value={filterCategory}
                 onChange={e => setFilterCategory(e.target.value)}
                 className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
              >
                 <option value="todas">Todas as Áreas</option>
                 <option value="Negócios">Negócios</option>
                 <option value="Filosofia">Filosofia</option>
                 <option value="Tecnologia">Tecnologia</option>
                 <option value="Finanças">Finanças</option>
                 <option value="Psicologia">Psicologia</option>
              </select>
            </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredBooks.map(book => (
             <div key={book.id} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.1)] transition-colors flex flex-col relative group">
                <div className="flex justify-between items-start mb-4">
                  <div className="pr-4">
                    <div className="flex items-center gap-2 mb-2">
                       {getStatusBadge(book.status)}
                       <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-bold">{book.knowledge_area}</span>
                    </div>
                    <h4 className="text-lg font-bold text-white line-clamp-2">{book.title}</h4>
                    <p className="text-sm text-[#71717A] mt-1">{book.author}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                     {book.buy_link && (
                       <a href={book.buy_link} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors" title="Acessar Livro/Drive">
                         <ExternalLink className="size-3.5" />
                       </a>
                     )}
                     <button onClick={() => { setViewHistoryBookId(book.id); }} className="p-1.5 hover:bg-white/10 rounded-lg text-[#71717A] hover:text-cyan-400 transition-colors" title="Ver Histórico"><Clock className="size-3.5" /></button>
                     <button onClick={() => { setEditingBookId(book.id); setEditBookData(book); }} className="p-1.5 hover:bg-white/10 rounded-lg text-[#71717A] hover:text-white transition-colors" title="Editar"><Edit2 className="size-3.5" /></button>
                     <button onClick={() => { if(window.confirm('Tem certeza que deseja zerar o progresso de leitura?')) resetBookProgress(book.id); }} className="p-1.5 hover:bg-white/10 rounded-lg text-[#71717A] hover:text-amber-500 transition-colors" title="Zerar Progresso"><RotateCcw className="size-3.5" /></button>
                     <button onClick={() => { if(window.confirm('Tem certeza que deseja excluir esta obra?')) deleteBook(book.id); }} className="p-1.5 hover:bg-white/10 rounded-lg text-[#71717A] hover:text-rose-500 transition-colors" title="Excluir"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.04)]">
                  <div className="flex justify-between text-[11px] font-bold text-[#71717A] mb-2 uppercase tracking-widest">
                     <span>{book.pages_read} / {book.total_pages || '?'} págs</span>
                     <span>{book.total_pages ? Math.round((book.pages_read / book.total_pages)*100) : 0}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1A1A1E] rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)] mb-4">
                     <div className={cn("h-full rounded-full", book.status === 'concluido' ? "bg-emerald-500" : "bg-rose-500")} style={{ width: `${book.total_pages ? Math.min(100, (book.pages_read / book.total_pages)*100) : 0}%`}}></div>
                  </div>
                  
                  {book.status !== 'concluido' && book.status !== 'abandonado' ? (
                     book.status === 'lendo' ? (
                       <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full flex items-center justify-center gap-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                          <Play className="size-3" fill="currentColor" /> Ver no Leitor Principal
                       </button>
                     ) : (
                       <button onClick={() => { updateBook(book.id, { status: 'lendo' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full flex items-center justify-center gap-2 bg-white/5 text-white hover:bg-white/10 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                          <BookOpen className="size-3" /> Começar a Ler
                       </button>
                     )
                  ) : (
                     <div className="w-full flex items-center justify-center gap-2 bg-white/5 text-[#71717A] px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                        {book.status === 'concluido' ? <CheckCircle2 className="size-3" /> : null} {book.status === 'concluido' ? 'Concluído' : 'Abandonado'}
                     </div>
                  )}
                </div>
             </div>
           ))}
           {filteredBooks.length === 0 && !loading && (
             <div className="col-span-full py-12 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-3xl">
                <Bookmark className="size-10 text-[#71717A] mx-auto mb-3" />
                <p className="text-[#A1A1AA]">Nenhuma obra encontrada no histórico com os filtros atuais.</p>
             </div>
           )}
         </div>
      </div>

      {/* Modal Histórico de Leitura */}
      {viewHistoryBookId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95">
             <div className="p-5 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center bg-[#1A1A1E] rounded-t-3xl">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="size-5 text-cyan-400" /> Histórico de Sessões
                </h3>
                <button onClick={() => setViewHistoryBookId(null)} className="p-2 bg-white/5 hover:bg-white/10 text-[#A1A1AA] hover:text-white rounded-full transition-colors">
                  <X className="size-4" />
                </button>
             </div>
             <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                {sessions.filter(s => s.book_id === viewHistoryBookId).length === 0 ? (
                   <div className="text-center py-10 text-[#71717A] border border-dashed border-[rgba(255,255,255,0.05)] rounded-2xl">
                     <AlignLeft className="size-8 mx-auto mb-3 opacity-50" />
                     <p>Nenhuma sessão registrada para esta obra ainda.</p>
                   </div>
                ) : (
                   sessions.filter(s => s.book_id === viewHistoryBookId).map(session => (
                     <div key={session.id} className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-3">
                           <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-[#A1A1AA] bg-black/30 px-3 py-1 rounded-lg border border-[rgba(255,255,255,0.03)]">
                               {format(parseISO(`${session.session_date}T12:00:00`), "dd 'de' MMM, yyyy", { locale: ptBR })} {session.start_time ? `às ${session.start_time}` : ''}
                             </span>
                             {(session.device || session.location) && (
                               <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#71717A] uppercase tracking-wider font-bold">
                                 {session.device && <span>• {session.device}</span>}
                                 {session.location && <span>• {session.location}</span>}
                               </div>
                             )}
                           </div>
                           <div className="flex gap-2 items-center">
                             <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">+{session.pages_read} págs</span>
                             <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">{session.duration_minutes} min</span>
                             <button onClick={() => { if(window.confirm('Excluir esta sessão de leitura? As páginas serão subtraídas do total.')) deleteReadingSession(session.id); }} className="p-1 hover:bg-rose-500/20 rounded text-[#71717A] hover:text-rose-500 transition-colors ml-2">
                               <Trash2 className="size-3.5" />
                             </button>
                           </div>
                        </div>
                        {(session.device || session.location) && (
                          <div className="sm:hidden flex items-center gap-2 text-[10px] text-[#71717A] uppercase tracking-wider font-bold mb-3">
                            {session.device && <span>{session.device}</span>}
                            {session.location && <span>• {session.location}</span>}
                          </div>
                        )}
                        {session.notes && (
                           <div className="text-sm text-[#D4D4D8] leading-relaxed bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.02)]">
                             {session.notes}
                           </div>
                        )}
                     </div>
                   ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* Achievements / Conquistas */}
      <PosLibraryAchievements books={books} sessions={sessions} />

      {/* Brain Graph - Moved to Bottom */}
      <div className="mt-8 md:mt-12">
         <PosLibraryGraph books={books} sessions={sessions} />
      </div>

    </div>
  );
}
