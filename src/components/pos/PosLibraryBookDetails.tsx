import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PosBook, PosReadingSession } from '@/hooks/use-pos-library';
import {
  ChevronLeft, MoreHorizontal, BookOpen, Star, Play, Pause, Bookmark, Brain, Sparkles,
  TrendingUp, Clock, Calendar as CalendarIcon, AlignLeft, Target, CheckCircle2, Edit2, RotateCcw, X, ExternalLink, ChevronRight, FileText, Loader2, Heart, Share2, Trash2, Check, Download, AlertTriangle, MapPin, Smartphone, ShoppingCart, Youtube, Cloud, Upload
} from "lucide-react";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "./RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  book: PosBook;
  sessions: PosReadingSession[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<PosBook>) => void;
  onDelete: (id: string) => void;
  onAddSession: (session: Partial<PosReadingSession>) => void;
  onEdit?: () => void;
}

export function PosLibraryBookDetails({ book, sessions, onClose, onUpdate, onDelete, onAddSession, onEdit }: Props) {
  const [activeTab, setActiveTab] = useState<'geral' | 'leitura' | 'resenha' | 'historico'>('geral');
  const [showMenu, setShowMenu] = useState(false);
  const [synopsis, setSynopsis] = useState<string>('');
  const [isExpandedSynopsis, setIsExpandedSynopsis] = useState(false);
  const [globalRating, setGlobalRating] = useState<{ rating: number, count: number } | null>(null);
  const [localPagesRead, setLocalPagesRead] = useState(book.pages_read || 0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: book.rating || 0 });
  const [driveFileInfo, setDriveFileInfo] = useState<{ size?: number, type?: string, found: boolean } | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_UPLOADER_URL;
      let finalUrl = "";

      if (driveUrl) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });
        reader.readAsDataURL(file);
        const base64Data = await base64Promise;

        const response = await fetch(driveUrl, {
          method: "POST",
          body: JSON.stringify({
            base64: base64Data,
            filename: file.name,
            mimeType: file.type || 'application/octet-stream'
          }),
          headers: { 'Content-Type': 'text/plain' }
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        finalUrl = result.url;
      } else {
        const fileExt = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${safeName}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `arquivos/${fileName}`;

        const { error } = await supabase.storage.from('livros').upload(filePath, file);
        if (error) throw error;

        const { data } = supabase.storage.from('livros').getPublicUrl(filePath);
        finalUrl = data.publicUrl;
      }

      onUpdate(book.id, { resource_link: finalUrl });
      toast.success("Arquivo enviado com sucesso!");
    } catch (err: any) {
      toast.error(`Falha ao subir arquivo: ${err.message || "Erro desconhecido"}.`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    const checkDrive = async () => {
      if (!book.resource_link) return;
      const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_UPLOADER_URL;
      if (!driveUrl) return;

      setIsDriveLoading(true);
      try {
        const res = await fetch(driveUrl);
        const data = await res.json();
        if (data.success && data.files) {
          // Extrai o ID do link se for drive.google.com/file/d/ID/view
          let fileId = "";
          const match = book.resource_link.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match) fileId = match[1];

          const file = data.files.find((f: any) => f.url === book.resource_link || (fileId && f.url && f.url.includes(fileId)));
          if (file) {
            let type = "Desconhecido";
            if (file.name.toLowerCase().endsWith('.pdf')) type = 'PDF';
            else if (file.name.toLowerCase().endsWith('.epub')) type = 'ePub';
            else if (file.name.toLowerCase().endsWith('.mobi')) type = 'MOBI';
            else if (file.mimeType && file.mimeType.includes('document')) type = 'Google Docs';
            else if (file.url.includes('docs.google.com')) type = 'Google Docs';
            else if (file.name) type = file.name.split('.').pop()?.toUpperCase() || 'Drive File';

            setDriveFileInfo({ size: file.size ? Number(file.size) : undefined, type, found: true });
          } else {
            if (book.resource_link.includes('drive.google.com') || book.resource_link.includes('docs.google.com')) {
              setDriveFileInfo({ type: book.resource_link.includes('docs') ? 'Google Docs' : 'Google Drive (Link)', found: false });
            } else {
              setDriveFileInfo({ type: 'Link Externo', found: false });
            }
          }
        }
      } catch (e) {
        if (book.resource_link.includes('drive.google.com') || book.resource_link.includes('docs.google.com')) {
          setDriveFileInfo({ type: book.resource_link.includes('docs') ? 'Google Docs' : 'Google Drive (Link)', found: false });
        }
      } finally {
        setIsDriveLoading(false);
      }
    };
    checkDrive();
  }, [book.resource_link]);

  // Debounce saving pages
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localPagesRead !== book.pages_read) {
        onUpdate(book.id, { pages_read: localPagesRead });
        // Also log a quick session if changed
        if (localPagesRead > (book.pages_read || 0)) {
          const pagesDiff = localPagesRead - (book.pages_read || 0);
          onAddSession({
            book_id: book.id,
            session_date: format(new Date(), 'yyyy-MM-dd'),
            start_time: format(new Date(), 'HH:mm'),
            duration_minutes: pagesDiff > 20 ? 30 : 15,
            pages_read: pagesDiff,
            notes: "Atualização rápida via controle de leitura",
            device: "Celular/Tablet",
            location: "Local"
          });
        }
      }
    }, 1500);
    return () => clearTimeout(handler);
  }, [localPagesRead, book.pages_read, book.id]);

  useEffect(() => {
    // Fetch Google Books data
    const fetchGoogleBooks = async () => {
      if (!book.title) return;
      try {
        const query = encodeURIComponent(`${book.title} ${book.author || ''}`);
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const volumeInfo = data.items[0].volumeInfo;
          if (volumeInfo.description) setSynopsis(volumeInfo.description);
          if (volumeInfo.averageRating) setGlobalRating({ rating: volumeInfo.averageRating, count: volumeInfo.ratingsCount || 0 });
        }
      } catch (e) { console.error(e); }
    };
    fetchGoogleBooks();
  }, [book.title, book.author]);

  const bookSessions = useMemo(() => {
    return sessions.filter(s => s.book_id === book.id).sort((a, b) => new Date(b.created_at || b.session_date).getTime() - new Date(a.created_at || a.session_date).getTime());
  }, [sessions, book.id]);

  const stats = useMemo(() => {
    const totalSessionMin = bookSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    const totalSessionPages = bookSessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);

    let speed = 0;
    if (totalSessionMin > 0 && totalSessionPages > 0) {
      speed = totalSessionPages / (totalSessionMin / 60);
    }

    const percent = book.total_pages ? Math.min(100, Math.round((localPagesRead / book.total_pages) * 100)) : 0;
    const remainingPages = book.total_pages ? Math.max(0, book.total_pages - localPagesRead) : 0;

    const daysReading = book.start_date ? Math.max(1, differenceInDays(new Date(), parseISO(book.start_date)) + 1) : 1;
    const pagesPerDay = daysReading > 0 ? localPagesRead / daysReading : 0;

    const estRemainingDays = pagesPerDay > 0 ? Math.ceil(remainingPages / pagesPerDay) : 0;
    const estFinishDate = estRemainingDays > 0 ? addDays(new Date(), estRemainingDays) : null;

    let maxSession = 0;
    let minSession = 9999;
    bookSessions.forEach(s => {
      if ((s.pages_read || 0) > maxSession) maxSession = s.pages_read || 0;
      if ((s.pages_read || 0) < minSession && (s.pages_read || 0) > 0) minSession = s.pages_read || 0;
    });
    if (minSession === 9999) minSession = 0;

    return {
      percent, remainingPages, speed, daysReading, pagesPerDay, estRemainingDays, estFinishDate,
      totalSessionMin, maxSession, minSession, sessionsCount: bookSessions.length
    };
  }, [book, localPagesRead, bookSessions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quero_ler': return 'bg-blue-500 text-white';
      case 'lendo': return 'bg-amber-500 text-white';
      case 'concluido': return 'bg-emerald-500 text-white';
      case 'na_estante': return 'bg-[#71717A] text-white';
      default: return 'bg-[#3F3F46] text-white';
    }
  };

  const statusLabels: Record<string, string> = {
    'lendo': 'Lendo Atualmente', 'quero_ler': 'Quero Ler', 'concluido': 'Lido', 'na_estante': 'Na Estante'
  };

  const handleStatusChange = (newStatus: string) => {
    const updates: Partial<PosBook> = { status: newStatus };
    if (newStatus === 'concluido') {
      updates.end_date = format(new Date(), 'yyyy-MM-dd');
      updates.pages_read = book.total_pages || localPagesRead;
      setLocalPagesRead(book.total_pages || localPagesRead);
    }
    if (newStatus === 'lendo' && !book.start_date) {
      updates.start_date = format(new Date(), 'yyyy-MM-dd');
    }
    onUpdate(book.id, updates);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir "${book.title}" da sua biblioteca? Isso apagará todo o histórico de leitura e anotações permanentemente.`)) {
      onDelete(book.id);
      onClose();
    }
  };

  const handleAddPages = (amount: number) => {
    const max = book.total_pages || 9999;
    setLocalPagesRead(prev => Math.min(max, prev + amount));
  };

  const handleShare = async () => {
    setShowMenu(false);
    const shareText = `📚 Estou lendo: ${book.title}\n👤 Autor: ${book.author || 'Desconhecido'}\n📈 Progresso: ${localPagesRead}/${book.total_pages || '?'} ${book.progress_unit === 'percentage' ? '%' : book.progress_unit === 'chapters' ? 'caps' : book.progress_unit === 'minutes' ? 'min' : 'páginas'}\n\nAcompanhando na Biblioteca Operacional`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: shareText,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareText);
          toast.success("Texto copiado para a área de transferência!");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Texto copiado para a área de transferência!");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-300">
      <div className="w-full h-[100dvh] sm:h-[90vh] max-h-[100dvh] sm:max-h-[90vh] sm:max-w-3xl lg:max-w-4xl bg-[#09090B] flex flex-col font-sans sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 relative border-0 sm:border border-[rgba(255,255,255,0.06)]">

        {/* Header */}
        <div className="flex-none flex items-center justify-between px-4 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#09090B] z-20">
          <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors flex-none">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-white truncate px-4 text-center flex-1">
            {book.title}
          </h1>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
              <MoreHorizontal size={24} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 top-12 w-56 bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="py-1">
                    {book.buy_link && <a href={book.buy_link} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5"><ExternalLink size={16} /> Comprar / Ver online</a>}
                    <button onClick={() => { setShowMenu(false); if (onEdit) onEdit(); else document.getElementById('edit-book-btn')?.click(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5"><Edit2 size={16} /> Editar livro</button>
                    <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5"><Share2 size={16} /> Compartilhar card</button>
                    <button onClick={() => { setShowMenu(false); alert("Exportado! (Em breve)"); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5"><Download size={16} /> Exportar anotações</button>
                    <div className="h-px w-full bg-[rgba(255,255,255,0.1)] my-1"></div>
                    <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 hover:bg-rose-500/10"><Trash2 size={16} /> Excluir da biblioteca</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-32">
          {/* Book Hero */}
          <div className="px-6 py-6 flex flex-col md:flex-row gap-6 items-center md:items-start bg-gradient-to-b from-[#111113] to-[#09090B] border-b border-[rgba(255,255,255,0.06)]">
            <div className="w-24 h-36 md:w-32 md:h-48 rounded-lg overflow-hidden shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] relative group">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1A1A1E] flex flex-col items-center justify-center text-[#3F3F46]">
                  <BookOpen size={32} />
                </div>
              )}
              <button onClick={() => setIsFavorite(!isFavorite)} className="absolute top-1.5 right-1.5 p-1.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-rose-500 transition-colors">
                <Heart size={16} className={isFavorite ? "fill-rose-500 text-rose-500" : ""} />
              </button>
            </div>

            <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1 tracking-tight leading-tight">{book.title}</h2>
              <p className="text-[#A1A1AA] text-sm md:text-base font-medium mb-3">{book.author}</p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                {book.category && <span className="bg-[#1A1A1E] text-[#A1A1AA] border border-[rgba(255,255,255,0.1)] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">{book.category}</span>}
                {book.knowledge_area && <span className="bg-[#1A1A1E] text-[#A1A1AA] border border-[rgba(255,255,255,0.1)] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">{book.knowledge_area}</span>}
                {book.format && <span className="bg-white/5 text-white/70 border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">{book.format}</span>}
                {book.total_pages && <span className="bg-white/5 text-white/70 border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">{book.total_pages} {book.progress_unit === 'percentage' ? '%' : book.progress_unit === 'chapters' ? 'caps' : book.progress_unit === 'minutes' ? 'min' : 'págs'}</span>}
              </div>

              {((book.collections && book.collections.length > 0) || (book.tags && book.tags.length > 0) || (book.badges && book.badges.length > 0)) && (
                <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-4">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    {book.collections?.map((col, idx) => (
                      <span key={`col-${idx}`} className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">{col}</span>
                    ))}
                    {book.tags?.map((tag, idx) => (
                      <span key={`tag-${idx}`} className="bg-white/5 text-[#A1A1AA] border border-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">#{tag}</span>
                    ))}
                  </div>

                  {book.badges && book.badges.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      {book.badges.includes('quero_comprar') && (
                        <span className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.1)] text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"><ShoppingCart size={10} /> Quero Comprar</span>
                      )}
                      {book.badges.includes('emprestado') && (
                        <span className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.1)] text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"><Check size={10} /> Emprestado</span>
                      )}
                      {book.badges.includes('meta_ano') && (
                        <span className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.1)] text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"><Target size={10} /> Meta Anual</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                {/* Status Dropdown */}
                <div className="relative w-full md:w-48 shrink-0">
                  <select
                    value={book.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={cn("w-full appearance-none rounded-xl px-4 py-2.5 text-center font-bold text-sm outline-none cursor-pointer border border-[rgba(255,255,255,0.1)] transition-colors shadow-sm", getStatusColor(book.status))}
                  >
                    {Object.entries(statusLabels).map(([val, label]) => (
                      <option key={val} value={val} className="bg-[#1A1A1E] text-white py-2">{label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" size={16} />
                </div>

                {/* Global Rating vs Local */}
                <div className="flex items-center gap-4 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2.5 w-full md:w-auto">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-widest mb-0.5">Sua Avaliação</span>
                    <div className="flex items-center gap-0.5 cursor-pointer" onClick={() => setShowReviewModal(true)}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={14} className={star <= (book.rating || 0) ? "fill-yellow-500 text-yellow-500" : "text-[#3F3F46]"} />
                      ))}
                    </div>
                  </div>
                  <div className="w-px h-6 bg-[rgba(255,255,255,0.1)]"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-widest mb-0.5">Comunidade</span>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="fill-blue-400 text-blue-400" />
                      <span className="text-white font-bold text-xs">{globalRating?.rating || 'N/A'}</span>
                      <span className="text-[#71717A] text-[10px]">({globalRating?.count || 0})</span>
                    </div>
                  </div>
                </div>

                {/* Resource Links */}
                <div className="flex items-center gap-2">
                  {book.buy_link && (
                    <a href={book.buy_link} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 rounded-xl transition-colors" title="Comprar Livro">
                      <ShoppingCart size={16} />
                    </a>
                  )}
                  {book.resource_link && (
                    <a href={book.resource_link} download target="_blank" rel="noopener noreferrer" className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-colors" title="Baixar / Abrir Arquivo (PDF/EPUB)">
                      <Download size={16} />
                    </a>
                  )}
                  {book.youtube_link && (
                    <a href={book.youtube_link} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors" title="Ver Review no YouTube">
                      <Youtube size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reading Controls (Only if Lendo) */}
          {book.status === 'lendo' && (
            <div className="p-6 bg-gradient-to-b from-[#111113] to-transparent border-b border-[rgba(255,255,255,0.04)]">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Progresso Atual</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{localPagesRead}</span>
                    <span className="text-[#71717A] font-bold">/ {book.total_pages || '?'} {book.progress_unit === 'percentage' ? '%' : book.progress_unit === 'chapters' ? 'caps' : book.progress_unit === 'minutes' ? 'min' : 'págs'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full text-lg font-black shadow-glow-sm">
                    {stats.percent}%
                  </span>
                </div>
              </div>

              <input
                type="range" min="0" max={book.total_pages || 1000}
                value={localPagesRead}
                onChange={(e) => setLocalPagesRead(Number(e.target.value))}
                className="w-full h-2 bg-[#27272A] rounded-full appearance-none mb-6 accent-orange-500"
              />

              <div className="flex gap-3">
                <button onClick={() => handleAddPages(1)} className="flex-1 bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors shadow-sm">+1 Pág</button>
                <button onClick={() => handleAddPages(5)} className="flex-1 bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors shadow-sm">+5 Págs</button>
                <button onClick={() => handleAddPages(10)} className="flex-1 bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors shadow-sm">+10 Págs</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-[#111113] p-3 rounded-xl border border-[rgba(255,255,255,0.04)] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1">Estimativa de Término</span>
                  <span className="text-white font-bold">{stats.estFinishDate ? format(stats.estFinishDate, 'dd MMM', { locale: ptBR }) : '--'}</span>
                </div>
                <div className="bg-[#111113] p-3 rounded-xl border border-[rgba(255,255,255,0.04)] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1">Restam</span>
                  <span className="text-white font-bold">{stats.estRemainingDays} dias</span>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-[rgba(255,255,255,0.06)] px-6 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('geral')} className={cn("px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors", activeTab === 'geral' ? "border-rose-500 text-white" : "border-transparent text-[#71717A] hover:text-[#A1A1AA]")}>Visão Geral</button>
            <button onClick={() => setActiveTab('leitura')} className={cn("px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors", activeTab === 'leitura' ? "border-rose-500 text-white" : "border-transparent text-[#71717A] hover:text-[#A1A1AA]")}>Aba de Leitura</button>
            <button onClick={() => setActiveTab('resenha')} className={cn("px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors", activeTab === 'resenha' ? "border-rose-500 text-white" : "border-transparent text-[#71717A] hover:text-[#A1A1AA]")}>Resenha & Notas</button>
            <button onClick={() => setActiveTab('historico')} className={cn("px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors", activeTab === 'historico' ? "border-rose-500 text-white" : "border-transparent text-[#71717A] hover:text-[#A1A1AA]")}>Histórico de Leitura</button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'geral' && (
              <div className="space-y-8 animate-in fade-in">
                {/* Sinopse */}
                {synopsis && (
                  <div>
                    <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest mb-3">Sinopse</h3>
                    <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] p-4 rounded-2xl relative">
                      <p className={cn("text-[#A1A1AA] text-sm leading-relaxed", !isExpandedSynopsis && synopsis.length > 250 && "line-clamp-4")}>
                        {synopsis.replace(/<[^>]+>/g, '')}
                      </p>
                      {synopsis.length > 250 && (
                        <button onClick={() => setIsExpandedSynopsis(!isExpandedSynopsis)} className="text-rose-500 text-xs font-bold uppercase tracking-widest mt-2 hover:text-rose-400">
                          {isExpandedSynopsis ? "Ler menos" : "Ler mais"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Estatísticas Avançadas */}
                <div>
                  <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest mb-3">Estatísticas da Leitura</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] p-4 rounded-2xl flex flex-col">
                      <Clock size={16} className="text-emerald-500 mb-2" />
                      <span className="text-white font-bold text-lg">{stats.daysReading} <span className="text-xs text-[#71717A] font-normal">dias</span></span>
                      <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Em Leitura</span>
                    </div>
                    <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] p-4 rounded-2xl flex flex-col">
                      <TrendingUp size={16} className="text-blue-500 mb-2" />
                      <span className="text-white font-bold text-lg">{stats.pagesPerDay.toFixed(1)} <span className="text-xs text-[#71717A] font-normal">pág/dia</span></span>
                      <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Média Diária</span>
                    </div>
                    <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] p-4 rounded-2xl flex flex-col">
                      <Activity size={16} className="text-orange-500 mb-2" />
                      <span className="text-white font-bold text-lg">{stats.speed > 0 ? stats.speed.toFixed(1) : '-'} <span className="text-xs text-[#71717A] font-normal">pág/h</span></span>
                      <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Velocidade Média</span>
                    </div>
                    <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] p-4 rounded-2xl flex flex-col">
                      <CalendarIcon size={16} className="text-purple-500 mb-2" />
                      <span className="text-white font-bold text-lg">{stats.sessionsCount} <span className="text-xs text-[#71717A] font-normal">sessões</span></span>
                      <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Realizadas</span>
                    </div>
                  </div>
                </div>

                {/* Disponibilidade de Download */}
                {book.resource_link && (
                  <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400">
                        <Download className="size-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Pronto para Download</h4>
                        <p className="text-xs text-blue-400 font-medium">O arquivo {driveFileInfo?.type || 'digital'} está disponível na nuvem.</p>
                      </div>
                    </div>
                    <a href={book.resource_link} download target="_blank" rel="noopener noreferrer" className="w-full md:w-auto text-center bg-blue-500 hover:bg-blue-600 text-white text-xs md:text-sm font-bold px-4 md:px-5 py-2.5 rounded-xl transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                      Baixar Arquivo
                    </a>
                  </div>
                )}

                {/* Informações Metadados */}
                <div>
                  <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest mb-3">Detalhes Técnicos</h3>
                  <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-4 divide-y divide-[rgba(255,255,255,0.04)]">
                    {book.publisher && <div className="py-2 flex justify-between gap-4"><span className="text-[#71717A] text-sm shrink-0">Editora</span><span className="text-white text-sm font-medium text-right line-clamp-2">{book.publisher}</span></div>}
                    {book.publish_year && <div className="py-2 flex justify-between gap-4"><span className="text-[#71717A] text-sm shrink-0">Ano</span><span className="text-white text-sm font-medium text-right line-clamp-1">{book.publish_year}</span></div>}
                    {book.isbn && <div className="py-2 flex justify-between gap-4"><span className="text-[#71717A] text-sm shrink-0">ISBN</span><span className="text-white text-sm font-medium text-right line-clamp-1">{book.isbn}</span></div>}
                    {book.language && <div className="py-2 flex justify-between gap-4"><span className="text-[#71717A] text-sm shrink-0">Idioma</span><span className="text-white text-sm font-medium text-right line-clamp-1">{book.language}</span></div>}
                    <div className="py-2 flex justify-between gap-4"><span className="text-[#71717A] text-sm shrink-0">Adicionado</span><span className="text-white text-sm font-medium text-right line-clamp-1">{book.created_at ? format(new Date(book.created_at), 'dd MMM yyyy', { locale: ptBR }) : '--'}</span></div>
                    {book.start_date && <div className="py-2 flex justify-between gap-4"><span className="text-[#71717A] text-sm shrink-0">Início</span><span className="text-white text-sm font-medium text-right line-clamp-1">{format(parseISO(book.start_date.split('T')[0]), 'dd MMM yyyy', { locale: ptBR })}</span></div>}
                    {book.end_date && <div className="py-2 flex justify-between gap-4"><span className="text-[#71717A] text-sm shrink-0">Meta / Conclusão</span><span className="text-white text-sm font-medium text-right line-clamp-1">{format(parseISO(book.end_date.split('T')[0]), 'dd MMM yyyy', { locale: ptBR })}</span></div>}

                    {book.resource_link && (
                      <>
                        <div className="py-2 flex justify-between mt-2 pt-2 border-t border-[rgba(255,255,255,0.02)]">
                          <span className="text-[#71717A] text-sm flex items-center gap-1.5"><Cloud size={14} className="text-blue-400" /> Status do Arquivo</span>
                          <span className="text-white text-sm font-medium">
                            {book.resource_link.includes('drive.google') || book.resource_link.includes('docs.google') ? 'Armazenado no Drive' : 'Link Externo'}
                          </span>
                        </div>
                        {isDriveLoading && (
                          <div className="py-2 flex justify-between"><span className="text-[#71717A] text-sm">Sincronizando Drive...</span><span className="text-white text-sm font-medium"><Loader2 size={14} className="animate-spin text-blue-400" /></span></div>
                        )}
                        {driveFileInfo && driveFileInfo.type && (
                          <div className="py-2 flex justify-between"><span className="text-[#71717A] text-sm">Formato Identificado</span><span className="text-white text-sm font-medium">{driveFileInfo.type}</span></div>
                        )}
                        {driveFileInfo && driveFileInfo.size !== undefined && !isNaN(driveFileInfo.size) && (
                          <div className="py-2 flex justify-between"><span className="text-[#71717A] text-sm">Tamanho no Drive</span><span className="text-white text-sm font-medium">{(driveFileInfo.size / (1024 * 1024)).toFixed(2)} MB</span></div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leitura' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest mb-3">Leitura Digital e Arquivos</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Download */}
                  <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 flex flex-col items-center text-center hover:border-blue-500/30 transition-colors">
                    <div className="bg-blue-500/10 p-4 rounded-full text-blue-400 mb-4">
                      <Download size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">Baixar no Dispositivo</h4>
                    <p className="text-[#A1A1AA] text-sm mb-6">Baixe o arquivo para ler no seu celular, tablet ou PC de forma offline e rápida.</p>
                    {book.resource_link ? (
                      <a href={book.resource_link} download target="_blank" rel="noopener noreferrer" className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                        <Smartphone size={18} /> Baixar Livro
                      </a>
                    ) : (
                      <button disabled className="w-full bg-[#1A1A1E] text-[#71717A] border border-[rgba(255,255,255,0.06)] text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                        Nenhum arquivo anexado
                      </button>
                    )}
                  </div>

                  {/* Card Upload */}
                  <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 flex flex-col items-center text-center hover:border-emerald-500/30 transition-colors relative">
                    <div className="bg-emerald-500/10 p-4 rounded-full text-emerald-500 mb-4">
                      <Upload size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">Subir Arquivo (Upload)</h4>
                    <p className="text-[#A1A1AA] text-sm mb-6">Anexe o PDF ou EPUB para sincronizar com a sua nuvem e manter sempre seguro.</p>

                    <button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 relative overflow-hidden">
                      {isUploading ? (
                        <><Loader2 className="animate-spin" size={18} /> Enviando...</>
                      ) : (
                        <><Cloud size={18} /> Fazer Upload (PDF/EPUB)</>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.epub,.mobi"
                        onChange={handleUpload}
                        disabled={isUploading}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        title="Clique para subir um arquivo"
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'resenha' && (
              <div className="animate-in fade-in space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest">Resenha & Fichamento</h3>
                  <button onClick={() => setShowReviewModal(true)} className="bg-[#1A1A1E] text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-[rgba(255,255,255,0.06)] hover:bg-white/10 transition-colors">
                    Avaliar Livro
                  </button>
                </div>
                <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 min-h-[400px]">
                  <RichTextEditor
                    initialContent={book.summary || ''}
                    onChange={(html) => onUpdate(book.id, { summary: html })}
                    placeholder="Escreva suas considerações completas aqui..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'historico' && (
              <div className="animate-in fade-in relative">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-rose-500/20"></div>

                <div className="space-y-6">
                  {book.end_date && (
                    <div className="relative pl-10">
                      <div className="absolute left-2.5 top-1 w-3 h-3 bg-emerald-500 rounded-full border-[3px] border-[#09090B]"></div>
                      <p className="text-white font-bold text-sm">Concluído</p>
                      <p className="text-[#71717A] text-xs">{format(parseISO(book.end_date), 'dd/MM/yyyy')}</p>
                    </div>
                  )}

                  {bookSessions.map((session, i) => (
                    <div key={session.id} className="relative pl-10">
                      <div className="absolute left-3 top-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#09090B]"></div>
                      <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-xl p-4 shadow-sm hover:border-rose-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-white font-bold text-sm">Sessão {bookSessions.length - i}</p>
                            <p className="text-[#71717A] text-[10px] font-bold uppercase tracking-widest">{format(parseISO(session.session_date), 'dd/MM/yyyy')} às {session.start_time}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-rose-400 font-bold text-sm">+{session.pages_read} {book.progress_unit === 'percentage' ? '%' : book.progress_unit === 'chapters' ? 'caps' : book.progress_unit === 'minutes' ? 'min' : 'págs'}</p>
                            <p className="text-[#71717A] text-[10px] font-bold uppercase tracking-widest">{session.duration_minutes} min</p>
                          </div>
                        </div>

                        {(session.device || session.location || session.difficulty || session.concentration_level) && (
                          <div className="mt-2 mb-1 flex flex-wrap gap-2">
                            {session.device && (
                              <span className="bg-[#1A1A1E] text-[#A1A1AA] border border-[rgba(255,255,255,0.04)] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <Smartphone size={12} /> {session.device}
                              </span>
                            )}
                            {session.location && (
                              <span className="bg-[#1A1A1E] text-[#A1A1AA] border border-[rgba(255,255,255,0.04)] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <MapPin size={12} /> {session.location}
                              </span>
                            )}
                            {session.difficulty && (
                              <span className="bg-[#1A1A1E] text-[#A1A1AA] border border-[rgba(255,255,255,0.04)] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <Brain size={12} /> Nível: {session.difficulty}
                              </span>
                            )}
                            {session.concentration_level && (
                              <span className="bg-[#1A1A1E] text-[#A1A1AA] border border-[rgba(255,255,255,0.04)] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <Target size={12} /> Foco: {session.concentration_level}/10
                              </span>
                            )}
                          </div>
                        )}
                        {session.notes && (
                          <div className="mt-3 bg-[#1A1A1E] p-3 rounded-lg border border-[rgba(255,255,255,0.02)]">
                            <p className="text-[#A1A1AA] text-xs leading-relaxed whitespace-pre-wrap">{session.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {book.start_date && (
                    <div className="relative pl-10">
                      <div className="absolute left-2.5 top-1 w-3 h-3 bg-blue-500 rounded-full border-[3px] border-[#09090B]"></div>
                      <p className="text-white font-bold text-sm">Iniciado</p>
                      <p className="text-[#71717A] text-xs">{format(parseISO(book.start_date), 'dd/MM/yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#111113] w-full max-w-lg rounded-3xl border border-[rgba(255,255,255,0.1)] p-6 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-white mb-6">Avaliação do Livro</h3>

              <div className="flex flex-col items-center justify-center mb-6">
                <span className="text-5xl font-black text-yellow-500 mb-2">{reviewData.rating > 0 ? reviewData.rating : '-'}</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star} size={32}
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className={cn("cursor-pointer transition-colors", star <= reviewData.rating ? "fill-yellow-500 text-yellow-500" : "text-[#3F3F46] hover:text-yellow-500/50")}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button onClick={() => setShowReviewModal(false)} className="px-5 py-3 rounded-xl text-sm font-bold text-[#A1A1AA] hover:bg-white/5 transition-colors">Cancelar</button>
                <button onClick={() => { onUpdate(book.id, { rating: reviewData.rating }); setShowReviewModal(false); }} className="px-5 py-3 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors">Salvar Avaliação</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    , document.body);
}

// ChevronDown icon missing in lucide-react import
function ChevronDown(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6" /></svg>
}
function Activity(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
}
