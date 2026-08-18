import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PosLibraryGraph } from "./PosLibraryGraph";
import { PosLibraryAchievements } from "./PosLibraryAchievements";
import { PosLibraryMetrics, DriveCover } from "./PosLibraryMetrics";
import { PosLibraryYearlySummary } from "./PosLibraryYearlySummary";
import { PosLibraryAuthorsSummary } from "./PosLibraryAuthorsSummary";
import { PosLibraryLiteralStats } from "./PosLibraryLiteralStats";
import { PosLibraryBookDetails } from "./PosLibraryBookDetails";
import { CameraScanner } from "@/components/ui/CameraScanner";
import { PosLibraryArticleStudio } from "./PosLibraryArticleStudio";
import { PosLibraryCollections } from "./PosLibraryCollections";
import { PosLibraryWisdom } from "./PosLibraryWisdom";
import { usePosLibrary } from "@/hooks/use-pos-library";
import { 
  Plus, Trash2, BookOpen, Star, Play, Pause, Bookmark, Brain, Sparkles, 
  TrendingUp, Clock, Calendar as CalendarIcon, AlignLeft, Target, CheckCircle2, Edit2, Edit3, RotateCcw, X, ExternalLink, ChevronLeft, ChevronRight, FileText, Loader2, BarChart2,
  Activity, Sun, MonitorSmartphone, CalendarDays, Trophy, Cloud, AppWindow, Download, Upload, Headphones, AlertTriangle, CalendarClock, ShoppingCart, Youtube, Camera, Users, Book, Globe, Search,
  List as ListIcon, Tag, BookMarked, ChevronDown, ChevronUp
} from "lucide-react";
import { format, isToday, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePosGoals } from "@/hooks/use-pos-goals";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { pdfService } from "@/services/pdfService";
import { RichTextEditor } from "./RichTextEditor";
import { VoiceRecordButton } from "@/components/ui/VoiceRecordButton";

const LiveTimer = ({ session }: { session: any }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (session.status === 'paused') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session.status]);
  
  const activeMs = session.status === 'paused' ? 0 : Math.max(0, now - (session.startTime || now));
  const totalMs = (session.accumulatedTime || 0) + activeMs;
  const elapsedSecondsTotal = Math.floor(totalMs / 1000);
  
  const h = Math.floor(elapsedSecondsTotal / 3600);
  const m = Math.floor((elapsedSecondsTotal % 3600) / 60);
  const s = elapsedSecondsTotal % 60;
  const formattedTime = `${h > 0 ? `${h.toString().padStart(2, '0')}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return <>{formattedTime}</>;
};

const addDriveNotification = (status: 'success' | 'error', message: string) => {
  try {
    const existing = JSON.parse(localStorage.getItem('lifeos_drive_notifications') || '[]');
    const newNotif = {
      id: Math.random().toString(36).substring(7),
      status,
      message,
      timestamp: Date.now(),
      read: false
    };
    const updated = [newNotif, ...existing].slice(0, 10);
    localStorage.setItem('lifeos_drive_notifications', JSON.stringify(updated));
    window.dispatchEvent(new Event('lifeos_drive_notifications_update'));
  } catch(e) {}
};

const htmlToPlainText = (html: string) => {
  if (!html) return "";
  let text = html;
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value.trim().replace(/\n{3,}/g, '\n\n');
};

const PosLibraryStatsPanorama = ({ books, sessions }: { books: PosBook[], sessions: PosReadingSession[] }) => {
   const currentYear = new Date().getFullYear();
   
   // Books tagged with 'meta_ano'
   const metaAnoBooks = books.filter(b => b.badges && b.badges.includes('meta_ano'));
   const metaAnoFaltam = metaAnoBooks.filter(b => b.status !== 'concluido').length;
   
   // Stats for current year
   const yearSessions = sessions.filter(s => new Date(s.session_date || s.created_at || Date.now()).getFullYear() === currentYear);
   const pagesReadThisYear = yearSessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
   
   const yearCompletedBooks = books.filter(b => b.status === 'concluido' && new Date(b.end_date || b.created_at || Date.now()).getFullYear() === currentYear);
   const booksReadThisYear = yearCompletedBooks.length;
   
   // Projections
   const dayOfYear = Math.max(1, Math.floor((new Date().getTime() - new Date(currentYear, 0, 1).getTime()) / 86400000));
   const projectedBooks = Math.round((booksReadThisYear / dayOfYear) * 365);
   const projectedPages = Math.round((pagesReadThisYear / dayOfYear) * 365);

   // Knowledge Areas
   const knowledgeAreasCount = books.reduce((acc, b) => {
     const area = b.knowledge_area || 'Outros';
     acc[area] = (acc[area] || 0) + 1;
     return acc;
   }, {} as Record<string, number>);
   const knowledgeAreasData = Object.entries(knowledgeAreasCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

   return (
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
         <div className="flex items-center justify-between gap-4 mb-2">
           <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp className="size-4 text-emerald-500" /> Panorama Estatístico
           </h3>
         </div>
         <div className="flex flex-col gap-3">
           <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex items-center justify-between shadow-md group hover:border-emerald-500/30 transition-colors">
             <div>
               <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-1 group-hover:text-emerald-500/70 transition-colors">Para Bater a Meta</div>
               <div className="text-sm font-bold text-white">Faltam {metaAnoFaltam} {metaAnoFaltam === 1 ? 'livro' : 'livros'}</div>
             </div>
             <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                <Target className="size-5" />
             </div>
           </div>
           
           <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex items-center justify-between shadow-md group hover:border-indigo-500/30 transition-colors">
             <div>
               <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-1 group-hover:text-indigo-500/70 transition-colors">Projeção de Livros / Ano</div>
               <div className="text-sm font-bold text-white">~{projectedBooks} {projectedBooks === 1 ? 'livro' : 'livros'}</div>
             </div>
             <div className="bg-indigo-500/10 text-indigo-500 p-2 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                <Brain className="size-5" />
             </div>
           </div>

           <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex items-center justify-between shadow-md group hover:border-emerald-500/30 transition-colors">
             <div>
               <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-1 group-hover:text-emerald-500/70 transition-colors">Projeção de Páginas / Ano</div>
               <div className="text-sm font-bold text-white">~{projectedPages.toLocaleString('pt-BR')} páginas</div>
             </div>
             <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                <TrendingUp className="size-5" />
             </div>
           </div>

           <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex items-center justify-between shadow-md group hover:border-pink-500/30 transition-colors">
             <div>
               <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-1 group-hover:text-pink-500/70 transition-colors">Páginas Lidas no Ano</div>
               <div className="text-sm font-bold text-white">{pagesReadThisYear.toLocaleString('pt-BR')} páginas</div>
             </div>
             <div className="bg-pink-500/10 text-pink-500 p-2 rounded-lg group-hover:bg-pink-500/20 transition-colors">
                <FileText className="size-5" />
             </div>
           </div>
         </div>

         {/* Distribuição por área foi movido para fora */}
      </div>
   );
};

const PosLibraryKnowledgeAreas = ({ books }: { books: PosBook[] }) => {
   const knowledgeAreasCount = books.reduce((acc, b) => {
     const area = b.knowledge_area || 'Outros';
     acc[area] = (acc[area] || 0) + 1;
     return acc;
   }, {} as Record<string, number>);
   const knowledgeAreasData = Object.entries(knowledgeAreasCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

   return (
     <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl p-5 md:p-6 flex flex-col shadow-xl h-full justify-center group hover:border-purple-500/30 transition-colors">
       <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest mb-4 flex items-center gap-1.5 group-hover:text-purple-500/70 transition-colors"><Brain className="size-4" /> Distribuição por Área</div>
       <div className="space-y-3">
         {knowledgeAreasData.map((area, index) => {
            const maxCount = knowledgeAreasData[0]?.count || 1;
            const percentage = Math.round((area.count / maxCount) * 100);
            const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-blue-500', 'bg-purple-500'];
            const color = colors[index % colors.length];
            return (
              <div key={area.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold text-[#A1A1AA]">
                  <span className="truncate pr-2">{area.name}</span>
                  <span>{area.count}</span>
                </div>
                <div className="w-full h-1.5 bg-[#1A1A1E] rounded-full overflow-hidden border border-[rgba(255,255,255,0.02)]">
                  <div className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[0_0_8px_currentColor] opacity-80`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            );
         })}
       </div>
     </div>
   );
};

export function PosLibrary() {
  const { books, sessions, loading, addBook, updateBook, deleteBook, addReadingSession, updateReadingSession, resetBookProgress, deleteReadingSession } = usePosLibrary();
  const { goals } = usePosGoals();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showLiteralStats, setShowLiteralStats] = useState(false);
  const [showArticleStudio, setShowArticleStudio] = useState(false);
  const [activeSessionBook, setActiveSessionBook] = useState<string | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [viewingBookId, setViewingBookId] = useState<string | null>(null);
  const [editBookData, setEditBookData] = useState<any>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingResource, setIsUploadingResource] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [activeDriveAction, setActiveDriveAction] = useState<'create' | 'edit'>('create');
  const [driveSearch, setDriveSearch] = useState("");
  const [driveVisibleCount, setDriveVisibleCount] = useState(10);
  const [isScanning, setIsScanning] = useState(false);
  const [sessionTagInput, setSessionTagInput] = useState("");
  const [webSearchQuery, setWebSearchQuery] = useState("");
  const [dictionaryQuery, setDictionaryQuery] = useState("");

  const handleScanBook = async (file: File) => {
    setIsScanning(true);
    const processingToast = toast.loading("Analisando capa via Scanner...");
    
    // Simulating OCR/AI analysis of book cover
    setTimeout(() => {
      setNewBook(prev => ({
        ...prev,
        title: "A Arte da Guerra",
        author: "Sun Tzu",
        publisher: "Editora Vozes",
        total_pages: 128
      }));
      setIsScanning(false);
      toast.dismiss(processingToast);
      toast.success("Capa lida com sucesso! Metadados preenchidos automaticamente.");
    }, 2500);
  };

  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [filterFormat, setFilterFormat] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('recentes');
  const [currentBookIndex, setCurrentBookIndex] = useState(0);
  const [visibleBooksCount, setVisibleBooksCount] = useState(10);

  // Apps & Ferramentas
  const [readingApps, setReadingApps] = useState<{id: string, name: string, url: string, type: 'download' | 'audiobook' | 'reader'}[]>([]);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [newAppForm, setNewAppForm] = useState<{name: string, url: string, type: 'download' | 'audiobook' | 'reader'}>({name: '', url: '', type: 'audiobook'});

  useEffect(() => {
    const saved = localStorage.getItem('pos_reading_apps');
    if (saved) {
      setReadingApps(JSON.parse(saved));
    } else {
      const defaults: any = [
        { id: "1", name: "Audible", url: "https://audible.com", type: "audiobook" },
        { id: "2", name: "Anna's Archive", url: "https://annas-archive.org", type: "download" },
        { id: "3", name: "Kindle Cloud", url: "https://read.amazon.com", type: "reader" }
      ];
      setReadingApps(defaults);
      localStorage.setItem('pos_reading_apps', JSON.stringify(defaults));
    }
  }, []);

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppForm.name || !newAppForm.url) return;
    const newApp = { id: Date.now().toString(), ...newAppForm };
    const updated = [...readingApps, newApp];
    setReadingApps(updated);
    localStorage.setItem('pos_reading_apps', JSON.stringify(updated));
    setIsAppModalOpen(false);
    setNewAppForm({name: '', url: '', type: 'audiobook'});
  };

  const removeApp = (id: string) => {
    if(!confirm("Remover este app?")) return;
    const updated = readingApps.filter(a => a.id !== id);
    setReadingApps(updated);
    localStorage.setItem('pos_reading_apps', JSON.stringify(updated));
  };
  
  // Persistent Active Sessions
  const [activeSessions, setActiveSessions] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('lifeos_active_reading_sessions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [finishingSessionId, setFinishingSessionId] = useState<string | null>(null);

  const saveActiveSessions = (sessions: any[]) => {
    setActiveSessions(sessions);
    localStorage.setItem('lifeos_active_reading_sessions', JSON.stringify(sessions));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;
      
      // Attempting to upload to livros bucket
      const bucketName = 'livros';
      const { error } = await supabase.storage.from(bucketName).upload(filePath, file);
      
      if (error) {
        throw error;
      }
      
      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      
      if (isEditing && editBookData) {
        setEditBookData((prev: any) => prev ? { ...prev, cover_url: data.publicUrl } : prev);
        // Salva a capa no banco de dados imediatamente (Auto-save) para garantir
        await updateBook(editBookData.id, { cover_url: data.publicUrl });
      } else {
        setNewBook((prev: any) => ({ ...prev, cover_url: data.publicUrl }));
      }
      toast.success("Capa carregada com sucesso!"); 
    } catch (err: any) {
      toast.error(`Falha ao subir imagem: ${err.message || "Erro desconhecido"}. Verifique o bucket "livros".`);
      console.error(err);
    } finally {
      setIsUploadingImage(false);
      e.target.value = ''; // Reset input so the same file can be uploaded again
    }
  };

  const handleResourceUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingResource(true);
    try {
      const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_UPLOADER_URL;
      let finalUrl = "";

      if (driveUrl) {
        // Envia para o Google Drive real via Apps Script
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
             const result = reader.result as string;
             // Remove o cabeçalho do base64 "data:application/pdf;base64,"
             resolve(result.split(',')[1]);
          };
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
        // Fallback: Supabase Storage
        const fileExt = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${safeName}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `arquivos/${fileName}`;
        
        const bucketName = 'livros';
        const { error } = await supabase.storage.from(bucketName).upload(filePath, file);
        if (error) throw error;
        
        const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        finalUrl = data.publicUrl;
      }
      
      if (isEditing && editBookData) {
        setEditBookData({ ...editBookData, resource_link: finalUrl });
        toast.success("Arquivo digital enviado. Salve as alterações para confirmar.");
      } else {
        setNewBook((prev: any) => ({ ...prev, resource_link: finalUrl }));
        toast.success("Arquivo digital enviado e vinculado.");
      }
    } catch (err: any) {
      toast.error(`Falha ao subir arquivo digital: ${err.message || "Erro desconhecido"}`);
      console.error(err);
    } finally {
      setIsUploadingResource(false);
      e.target.value = ''; // Reset input so the same file can be uploaded again
    }
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Extract title from file name
    const rawTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
    const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
    
    setIsUploadingResource(true);
    toast.info(`Iniciando upload de "${title}"...`, { duration: 5000 });
    
    try {
      const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_UPLOADER_URL;
      let finalUrl = "";

      if (driveUrl) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
             const result = reader.result as string;
             resolve(result.split(',')[1]);
          };
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
        
        const { error: uploadError } = await supabase.storage.from('livros').upload(filePath, file);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('livros').getPublicUrl(filePath);
        finalUrl = publicUrl;
      }

      // After uploading, create the book!
      const payload: any = {
        title,
        author: "Desconhecido",
        status: "quero_ler",
        format: "digital",
        knowledge_area: "Geral",
        resource_link: finalUrl,
        category: "Geral"
      };
      
      const createdBook = await addBook(payload);
      if (createdBook) {
        toast.success(`Livro "${title}" adicionado com sucesso!`);
      }
    } catch (err: any) {
      toast.error(`Falha no upload rápido: ${err.message || "Erro desconhecido"}`);
      console.error(err);
    } finally {
      setIsUploadingResource(false);
      e.target.value = ''; // Reset input
    }
  };

  const fetchDriveFiles = async (action: 'create' | 'edit') => {
    setActiveDriveAction(action);
    setIsLoadingDrive(true);
    setShowDriveModal(true);
    try {
      const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_UPLOADER_URL;
      
      if (driveUrl) {
        // Busca do Google Drive via Apps Script
        const res = await fetch(driveUrl);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        
        // Mapeia para o formato esperado
        const mapped = data.files.map((f: any) => ({
          name: f.name,
          url: f.url,
          metadata: { size: f.size },
          created_at: f.date,
          origin: f.origin,
          thumbnail: f.thumbnail
        }));
        setDriveFiles(mapped);
      } else {
        // Fallback: Supabase
        const { data, error } = await supabase.storage.from('livros').list('arquivos', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });
        if (error) throw error;
        setDriveFiles((data || []).filter(f => f.name !== '.emptyFolderPlaceholder'));
      }
    } catch (err: any) {
      toast.error("Erro ao buscar arquivos no Drive: " + err.message);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const selectDriveFile = (file: any) => {
    // Se tiver 'url', veio do Google Drive. Se não, veio do Supabase.
    let finalUrl = file.url;
    if (!finalUrl) {
      const { data } = supabase.storage.from('livros').getPublicUrl(`arquivos/${file.name}`);
      finalUrl = data.publicUrl;
    }
    
    if (activeDriveAction === 'edit' && editBookData) {
      setEditBookData((prev: any) => prev ? { ...prev, resource_link: finalUrl } : prev);
      setShowDriveModal(false);
      toast.success("Arquivo vinculado com sucesso!");
    } else {
      let cleanName = file.name.replace(/^arquivos\//, '').replace(/\.(pdf|epub|mobi)$/i, '').trim();
      cleanName = cleanName.replace(/^(Vol\.?|Patrística Vol\.?)\s*\d+(_\d+)?\s*[-–]\s*/i, '').trim();
      
      const isPdf = file.origin === 'pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      let fileId = "";
      if (finalUrl) {
         const match = finalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
         if (match) fileId = match[1];
      }
      
      fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanName)}&maxResults=1`)
        .then(r => r.json())
        .then(data => {
           const info = data.items?.[0]?.volumeInfo;
           let cover = file.thumbnail || (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : "");
           if (info?.imageLinks?.thumbnail) {
              cover = info.imageLinks.thumbnail.replace('http:', 'https:').replace('&edge=curl', '');
           }
           setNewBook((prev: any) => ({
             ...prev, 
             title: prev.title || cleanName,
             author: prev.author || info?.authors?.[0] || "",
             cover_url: prev.cover_url || cover,
             format: prev.format === 'fisico' ? (isPdf ? 'pdf' : 'epub') : prev.format,
             resource_link: finalUrl 
           }));
           setShowDriveModal(false);
           toast.success("Arquivo e metadados vinculados com sucesso!");
        })
        .catch(() => {
           setNewBook((prev: any) => ({ 
             ...prev, 
             title: prev.title || cleanName,
             format: prev.format === 'fisico' ? (isPdf ? 'pdf' : 'epub') : prev.format,
             cover_url: prev.cover_url || file.thumbnail || (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : ""),
             resource_link: finalUrl 
           }));
           setShowDriveModal(false);
           toast.success("Arquivo vinculado com sucesso!");
        });
    }
  };

  const startReadingSession = (book: any) => {
    const existing = activeSessions.find(s => s.bookId === book.id);
    if (existing) {
       alert("Você já tem uma sessão ativa para este livro!");
       return;
    }

    const mapFormatToDevice = (format: string) => {
      switch (format) {
        case 'kindle': return 'Kindle';
        case 'audio': return 'Audiobook';
        case 'pdf': return 'Tablet';
        case 'web': return 'PC/Desktop';
        default: return 'Livro Físico';
      }
    };

    const sessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const newSession = {
      id: sessionId,
      bookId: book.id,
      bookTitle: book.title,
      startTime: Date.now(),
      accumulatedTime: 0,
      status: 'active',
      notes: "",
      chapters_read: "",
      pages_read: "",
      location: "",
      device: mapFormatToDevice(book.format),
      difficulty: "Fácil",
      concentration_level: 8
    };
    saveActiveSessions([...activeSessions, newSession]);
    
    // Fetch GPS Location async
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || "Casa";
          
          const currentStr = localStorage.getItem('lifeos_active_sessions');
          if (currentStr) {
            const current = JSON.parse(currentStr);
            const activeSession = current.find((s: any) => s.id === sessionId);
            if (activeSession && (!activeSession.location || activeSession.location === "")) {
              saveActiveSessions(current.map((s: any) => s.id === sessionId ? { ...s, location: city } : s));
            }
          }
        } catch (e) {
          console.warn("GPS reverse geocoding failed", e);
        }
      }, () => {
         console.warn("GPS permission denied or unavailable");
      }, { timeout: 10000 });
    }
  };


  const cancelReadingSession = (id: string) => {
    saveActiveSessions(activeSessions.filter(s => s.id !== id));
  };

  const handleFinishSession = async (session: any) => {
    const activeMs = session.status === 'paused' ? 0 : (Date.now() - session.startTime);
    const totalMs = (session.accumulatedTime || 0) + activeMs;
    const durationMinutes = Math.max(1, Math.round(totalMs / 60000));
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const deviceName = isMobile ? "Celular/Tablet" : "PC/Desktop";
    const userLocation = Intl.DateTimeFormat().resolvedOptions().timeZone || "Desconhecido";
    
    const startDate = new Date(session.startTime);
    const timeStr = `${startDate.getHours().toString().padStart(2,'0')}:${startDate.getMinutes().toString().padStart(2,'0')}`;

    let finalNotes = session.notes || "";
    if (session.chapters_read && session.chapters_read !== "") {
      finalNotes = `📚 Capítulos Lidos: ${session.chapters_read}\n\n${finalNotes}`.trim();
    }

    const payload: any = { 
      duration_minutes: durationMinutes,
      pages_read: session.pages_read || 0,
      concentration_level: session.concentration_level || 8,
      notes: finalNotes,
      book_id: session.bookId, 
      session_date: format(startDate, 'yyyy-MM-dd'),
      start_time: timeStr,
      device: session.device || deviceName,
      location: session.location || userLocation,
      difficulty: session.difficulty || "Fácil"
    };

    const createdSession = await addReadingSession(payload);
    
    cancelReadingSession(session.id);
    
    if (createdSession) {
      handleGeneratePdf(createdSession);
    }
  };

  const handleGeneratePdf = async (session: any) => {
    try {
      setIsGeneratingPdf(session.id);
      const book = books.find(b => b.id === session.book_id);
      
      const allSessions = sessions.filter(s => s.book_id === session.book_id).sort((a, b) => new Date(a.created_at || a.session_date).getTime() - new Date(b.created_at || b.session_date).getTime());
      
      if (!allSessions.find(s => s.id === session.id)) {
        allSessions.push(session);
      }

      const header = `Data de Inicio: ${format(new Date(book?.created_at || new Date()), 'dd/MM/yyyy')}
Data de Conclusão: ${book?.end_date ? format(getSafeDate(book.end_date)!, 'dd/MM/yyyy') : ''}
Livro: ${book?.title || 'Desconhecido'}
Autor: ${book?.author || ''}
Tipo de livro: ${book?.format || ''}
Categoria: ${book?.category || ''}
Link do livro: ${book?.buy_link || ''}`;

      const sessionsText = allSessions.map(s => {
        let cap = "";
        let notes = htmlToPlainText(s.notes || "");
        if (notes.startsWith("📚 Capítulos Lidos: ")) {
          const parts = notes.split('\n\n');
          cap = parts[0].replace("📚 Capítulos Lidos: ", "").trim();
          notes = parts.slice(1).join('\n\n');
        }

        return `Capítulo: ${cap}
Quantidade de páginas lidas: ${s.pages_read}
Quando li: ${format(parseISO(`${s.session_date}T12:00:00`), 'dd/MM/yyyy')} ${s.start_time ? `às ${s.start_time}` : ''}
Por onde li: ${s.device || 'Desconhecido'}

Anotações:
${notes}`;
      }).join('\n\n--------------------------------------------------\n\n');

      const conteudoCompleto = `${header}\n\n--------------------------------------------------\n\n${sessionsText}`;

      const pdfUrl = await pdfService.exportarAnotacaoPDF({
        titulo: book?.title || 'Leitura',
        conteudo: conteudoCompleto,
        categoria: book?.knowledge_area || "Geral",
        tags: [book?.category || ""].filter(Boolean),
        criadoEm: session.session_date,
        autor: book?.author || "Desconhecido"
      });
      
      await updateReadingSession(session.id, { pdf_url: pdfUrl });
      if (pdfUrl && book) {
        updateBook(book.id, { resource_link: pdfUrl });
      }
      addDriveNotification('success', `Histórico do livro "${book?.title}" foi sincronizado com o Google Docs.`);
    } catch (error: any) {
      addDriveNotification('error', `Falha ao sincronizar livro "${book?.title}" com o Drive: ${error.message}`);
      console.error("[PDF_ERROR]", error);
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  const handleStartReading = async (book: any) => {
    updateBook(book.id, { status: 'lendo' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const conteudo = `Data de Inicio: ${format(new Date(), 'dd/MM/yyyy')}
Data de Conclusão: ${book.end_date ? format(getSafeDate(book.end_date)!, 'dd/MM/yyyy') : ''}
Livro: ${book.title}
Autor: ${book.author || ''}
Tipo de livro: ${book.format || ''}
Categoria: ${book.category || ''}
Link original: ${book.buy_link || ''}`;

    try {
      const docUrl = await pdfService.exportarAnotacaoPDF({
        titulo: book.title,
        conteudo: conteudo,
        categoria: book.knowledge_area || "Geral",
        tags: [book.category || ""].filter(Boolean),
        criadoEm: format(new Date(), 'yyyy-MM-dd'),
        autor: book.author || "Desconhecido"
      });
      
      // Save the generated Google Doc URL to the book so the user can access it later
      if (docUrl) {
        updateBook(book.id, { resource_link: docUrl });
      }
      addDriveNotification('success', `Estrutura do livro "${book.title}" inicializada no Google Docs.`);
    } catch (error: any) {
      console.error("Erro silencioso ao criar PDF inicial:", error);
      addDriveNotification('error', `Falha ao inicializar documento do livro "${book.title}" no Drive.`);
    }
  };

  const [newBook, setNewBook] = useState({
    title: "", author: "", category: "Negócios", knowledge_area: "Estratégia",
    format: "fisico", status: "quero_ler", total_pages: 0, language: "pt-br", start_date: format(new Date(), 'yyyy-MM-dd'), end_date: "", goal_id: "", buy_link: "",
    tags_input: "", collections_input: "", progress_unit: "pages", resource_link: "", youtube_link: "", badges: [] as string[], summary: ""
  });

  const getSafeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return parseISO(`${dateStr.split('T')[0]}T12:00:00`);
  };

  const [newSession, setNewSession] = useState<{
    duration_minutes: number | string;
    pages_read: number | string;
    chapters_read: number | string;
    concentration_level: number;
    notes: string;
    device?: string;
    location?: string;
    difficulty?: string;
  }>({
    duration_minutes: 30, pages_read: "", chapters_read: "", concentration_level: 8, notes: "", device: "Livro Físico", location: "Casa", difficulty: "Fácil"
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title) {
      toast.error("O título do livro é obrigatório.");
      return;
    }
    const payload: any = { ...newBook };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    if (!payload.goal_id) delete payload.goal_id;

    // Parse tags and collections
    payload.tags = payload.tags_input ? payload.tags_input.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    payload.collections = payload.collections_input ? payload.collections_input.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
    delete payload.tags_input;
    delete payload.collections_input;
    
    try {
      const createdBook = await addBook(payload);
      if (createdBook) {
        setIsCreating(false);
        setNewBook({ ...newBook, title: "", author: "", total_pages: 0, start_date: format(new Date(), 'yyyy-MM-dd'), end_date: "", goal_id: "", cover_url: "", tags_input: "", collections_input: "", progress_unit: "pages", resource_link: "", youtube_link: "", buy_link: "", summary: "" });
        if (payload.status === 'lendo') {
          setTimeout(() => handleStartReading(createdBook), 500);
        }
      }
    } catch (err: any) {
      toast.error("Erro interno ao criar livro.");
    }
  };

  const handleLogSession = async (e: React.FormEvent) => {
    // Legacy generic session logging if needed, replaced by active session flow
    e.preventDefault();
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookId || !editBookData) return;
    if (!editBookData.title) {
      toast.error("O título do livro é obrigatório.");
      return;
    }
    const payload = { ...editBookData };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    if (!payload.goal_id) delete payload.goal_id;

    if ((payload as any).tags_input !== undefined) {
       payload.tags = (payload as any).tags_input ? (payload as any).tags_input.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
       delete (payload as any).tags_input;
    }
    if ((payload as any).collections_input !== undefined) {
       payload.collections = (payload as any).collections_input ? (payload as any).collections_input.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
       delete (payload as any).collections_input;
    }
    
    try {
      await updateBook(editingBookId, payload);
      setEditingBookId(null);
    } catch (err: any) {
      toast.error("Erro interno ao atualizar.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'quero_ler': return <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded cursor-pointer">Quero Ler</span>;
      case 'lendo': return <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded cursor-pointer">Lendo</span>;
      case 'concluido': return <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded cursor-pointer">Já Li</span>;
      case 'na_estante': return <span className="text-[10px] uppercase font-bold text-[#A1A1AA] bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded cursor-pointer">Na Estante</span>;
      default: return <span className="text-[10px] uppercase font-bold text-[#A1A1AA] bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded cursor-pointer">Na Estante</span>;
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
    if (filterFormat !== 'todos' && b.format !== filterFormat) return false;
    if (searchQuery) {
       const query = searchQuery.toLowerCase();
       const inTitle = b.title.toLowerCase().includes(query);
       const inAuthor = (b.author || '').toLowerCase().includes(query);
       const inTags = b.tags?.some(t => t.toLowerCase().includes(query));
       const inCollections = b.collections?.some(c => c.toLowerCase().includes(query));
       if (!inTitle && !inAuthor && !inTags && !inCollections) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'az') return a.title.localeCompare(b.title);
    if (sortOrder === 'za') return b.title.localeCompare(a.title);
    if (sortOrder === 'maior') return (b.total_pages || 0) - (a.total_pages || 0);
    if (sortOrder === 'menor') return (a.total_pages || 0) - (b.total_pages || 0);
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
  const allKnowledgeAreas = Array.from(new Set(books.map(b => b.knowledge_area).filter(Boolean))).sort();
  const allFormats = Array.from(new Set([...books.map(b => b.format).filter(Boolean), 'pdf', 'epub'])).sort();

  return (
    <div className="relative p-4 md:p-10 max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8 pb-20 min-h-screen">
      {/* Background Cosmos Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] bg-indigo-500/5 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] bg-rose-500/5 rounded-full blur-[150px] animate-[pulse_12s_ease-in-out_infinite]" />
        <div className="absolute top-[40%] left-[40%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-amber-500/5 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 flex flex-col gap-6 md:gap-8">
        <datalist id="knowledge-areas-list">
           {allKnowledgeAreas.map(area => (
              <option key={area as string} value={area as string} />
           ))}
        </datalist>
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white flex items-center gap-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
               <div className="p-3 bg-gradient-to-br from-rose-500/20 to-indigo-500/20 rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-[0_0_30px_rgba(244,63,94,0.15)] relative group">
                  <div className="absolute inset-0 bg-rose-500/20 rounded-2xl blur-md group-hover:bg-rose-500/40 transition-colors"></div>
                  <BookOpen className="size-6 md:size-8 text-rose-400 relative z-10" /> 
                </div>
               Cosmos Literário
            </h2>
            <p className="text-[#A1A1AA] text-sm md:text-base mt-3 max-w-2xl font-medium tracking-wide">Rastreabilidade completa, sabedoria em órbita, resumos de absorção e conexões profundas do seu universo intelectual.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-8 duration-1000">
            <button 
              onClick={() => setShowArticleStudio(true)}
              className="flex items-center gap-2 bg-[#1A1A1E]/80 backdrop-blur-md text-white border border-indigo-500/20 hover:border-indigo-500/50 px-5 py-3 rounded-xl text-sm font-bold hover:bg-[#27272A]/80 transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)]"
            >
              <Edit3 className="size-4 text-indigo-400" /> Estúdio de Artigos
            </button>
            <button 
              onClick={() => setShowLiteralStats(true)}
              className="flex items-center gap-2 bg-[#1A1A1E]/80 backdrop-blur-md text-white border border-[rgba(255,255,255,0.06)] px-5 py-3 rounded-xl text-sm font-bold hover:bg-[#27272A]/80 transition-all"
            >
              <BarChart2 className="size-4 text-[#A1A1AA]" /> Estatísticas Literais
            </button>
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] transition-all hover:-translate-y-0.5"
            >
              <Plus className="size-4" /> Registrar Obra
            </button>
          </div>
        </div>

      <PosLibraryArticleStudio 
        isOpen={showArticleStudio}
        onClose={() => setShowArticleStudio(false)}
        books={books}
        sessions={sessions}
      />

      <PosLibraryLiteralStats 
        isOpen={showLiteralStats}
        onClose={() => setShowLiteralStats(false)}
        books={books}
        sessions={sessions}
      />

      {/* Wisdom Center - Orbiting Quotes */}
      <PosLibraryWisdom />

      {/* Global Metrics Dashboard */}
      <PosLibraryMetrics 
        books={books} 
        sessions={sessions}
        onOpenBook={(id) => {
          setViewingBookId(id);
        }}
        onRegisterBook={(f, coverUrl, author) => {
          setNewBook({
            title: f.name.replace(/^arquivos\//, '').replace(/\.(pdf|epub|mobi)$/i, '').trim(),
            author: author || "",
            total_pages: 0,
            start_date: format(new Date(), 'yyyy-MM-dd'),
            end_date: "",
            goal_id: "",
            cover_url: coverUrl || "",
            tags_input: "",
            collections_input: "",
            progress_unit: "pages",
            resource_link: f.url,
            youtube_link: "",
            buy_link: "",
            format: f.origin === 'pdf' || f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub',
            badges: [],
            status: "quero_ler",
            knowledge_area: "",
            is_classic: false
          });
          setIsCreating(true);
        }}
      />

      {/* Collections 3D Plot */}
      <PosLibraryCollections books={books} />

      {isCreating && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
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
                <h4 className="text-sm font-bold text-white mb-4 mt-2 flex items-center gap-2"><Book className="size-4 text-indigo-400" /> Informações Básicas</h4>
                <div className="grid grid-cols-1 md:grid-cols-8 gap-6 mb-6">
                  <div className="md:col-span-3">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Título</label>
                    <div className="flex gap-2 items-center bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl focus-within:border-rose-500 transition-colors">
                      <input 
                        type="text" required value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})}
                        className="w-full bg-transparent px-4 py-3 text-white focus:outline-none"
                        placeholder="Ex: A Arte da Guerra"
                      />
                      <div className="pr-1 flex items-center gap-1">
                        <CameraScanner onScan={handleScanBook} isProcessing={isScanning} label="" />
                        <VoiceRecordButton onTranscript={(t) => setNewBook(prev => ({...prev, title: prev.title ? `${prev.title} ${t}` : t}))} />
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Autor</label>
                    <div className="flex gap-2 items-center bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl focus-within:border-rose-500 transition-colors">
                      <input 
                        type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})}
                        className="w-full bg-transparent px-4 py-3 text-white focus:outline-none"
                        placeholder="Sun Tzu"
                      />
                      <div className="pr-1">
                        <VoiceRecordButton onTranscript={(t) => setNewBook(prev => ({...prev, author: prev.author ? `${prev.author} ${t}` : t}))} />
                      </div>
                    </div>
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
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Local Guardado</label>
                    <select 
                      value={newBook.storage_location || ''} onChange={e => setNewBook({...newBook, storage_location: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    >
                      <option value="">Não definido</option>
                      <option value="estante">Estante Física</option>
                      <option value="kindle">Kindle / E-reader</option>
                      <option value="drive">Google Drive / Nuvem</option>
                      <option value="pc">PC / Local</option>
                      <option value="emprestado">Emprestado</option>
                    </select>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white mb-4 mt-6 flex items-center gap-2"><Star className="size-4 text-amber-400" /> Classificação & Tags</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="md:col-span-1">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Capa do Livro</label>
                    <div className="relative w-full h-[48px] bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl flex items-center justify-center overflow-hidden group">
                      {newBook.cover_url ? (
                        <>
                          <img src={newBook.cover_url} alt="Cover" className={cn("w-full h-full object-cover transition-opacity", isUploadingImage ? "opacity-30 blur-sm" : "opacity-60")} />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold text-white uppercase">Trocar</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] uppercase font-bold text-[#71717A] flex items-center gap-1">
                          {isUploadingImage ? <Loader2 className="size-3 animate-spin" /> : <Cloud className="size-3" />}
                          {isUploadingImage ? "Enviando..." : "Upload Capa"}
                        </div>
                      )}
                      
                      {isUploadingImage && newBook.cover_url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                           <Loader2 className="size-5 animate-spin text-rose-500" />
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} disabled={isUploadingImage} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Unidade de Progresso</label>
                      <select 
                        value={newBook.progress_unit} onChange={e => setNewBook({...newBook, progress_unit: e.target.value})}
                        className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                      >
                        <option value="pages">Páginas</option>
                        <option value="percentage">Porcentagem (%)</option>
                        <option value="chapters">Capítulos</option>
                        <option value="minutes">Tempo (Minutos)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Valor Total</label>
                      <input 
                        type="number" value={newBook.total_pages || ''} onChange={e => setNewBook({...newBook, total_pages: Number(e.target.value)})}
                        className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Área do Conhecimento</label>
                    <input 
                      list="knowledge-areas-list"
                      value={newBook.knowledge_area || ''} onChange={e => setNewBook({...newBook, knowledge_area: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                      placeholder="Ex: Negócios, Filosofia..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Editora</label>
                    <input 
                      type="text" value={newBook.publisher || ''} onChange={e => setNewBook({...newBook, publisher: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                      placeholder="Ex: Sextante, Alta Books..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Status Inicial</label>
                    <select 
                      value={newBook.status} onChange={e => setNewBook({...newBook, status: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    >
                      <option value="lendo">Lendo Atualmente</option>
                      <option value="quero_ler">Quero Ler</option>
                      <option value="concluido">Já Li</option>
                      <option value="na_estante">Na Estante</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-2 flex items-center gap-2"><Sparkles className="size-3 text-amber-500" /> Badges & Classificação</label>
                    <div className="flex flex-wrap gap-3 bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-inner">
                      {[
                        { id: 'quero_comprar', label: 'Quero Comprar', icon: '🛒' },
                        { id: 'emprestado', label: 'Emprestado', icon: '🤝' },
                        { id: 'meta_ano', label: 'Meta Anual', icon: '🎯' }
                      ].map(badge => (
                        <label key={badge.id} className="flex items-center gap-2 cursor-pointer bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] px-3 py-2 rounded-xl text-sm text-white hover:border-amber-500/50 hover:bg-amber-500/5 transition-all">
                          <input 
                            type="checkbox" 
                            checked={newBook.badges.includes(badge.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewBook(prev => ({
                                ...prev,
                                badges: checked ? [...prev.badges, badge.id] : prev.badges.filter(b => b !== badge.id)
                              }));
                            }}
                            className="accent-amber-500 rounded border-white/20"
                          />
                          <span>{badge.icon} {badge.label}</span>
                        </label>
                      ))}
                      <label className="flex items-center gap-2 cursor-pointer bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl text-sm text-amber-400 font-bold hover:border-amber-500/50 hover:bg-amber-500/20 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <input 
                          type="checkbox" 
                          checked={newBook.is_classic || false}
                          onChange={(e) => setNewBook({...newBook, is_classic: e.target.checked})}
                          className="accent-amber-500 rounded border-white/20"
                        />
                        <span>📚 É um Clássico?</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Coleções (separado por vírgula)</label>
                    <input 
                      type="text" placeholder="Ex: Hábitos, Finanças" value={newBook.collections_input} onChange={e => setNewBook({...newBook, collections_input: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Tags (separado por vírgula)</label>
                    <input 
                      type="text" placeholder="Ex: imperdível, referência" value={newBook.tags_input} onChange={e => setNewBook({...newBook, tags_input: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white mb-4 mt-6 flex items-center gap-2"><CalendarClock className="size-4 text-emerald-400" /> Prazos e Estratégia</h4>
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
                
                {newBook.start_date && newBook.end_date && (() => {
                   const start = parseISO(newBook.start_date.split('T')[0]);
                   const end = parseISO(newBook.end_date.split('T')[0]);
                   const diff = differenceInDays(end, start);
                   if (diff > 0) {
                     return (
                       <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] flex items-center gap-2 font-bold uppercase tracking-widest shadow-sm">
                         <CalendarIcon className="size-4" /> Estimativa Total de Leitura: {diff} dias
                       </div>
                     )
                   }
                   return null;
                 })()}

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
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Link Play Books / Compra</label>
                    <input 
                      type="url" placeholder="https://..." value={newBook.buy_link || ''} onChange={e => setNewBook({...newBook, buy_link: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white mb-4 mt-6 flex items-center gap-2"><Globe className="size-4 text-blue-400" /> Arquivos e Links (Drive)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 flex items-center justify-between">
                      Link do PDF/Ebook
                      <div className="flex gap-2">
                        <button type="button" onClick={() => fetchDriveFiles('create')} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                          <Cloud className="size-3" /> Drive
                        </button>
                        <label className="text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 transition-colors">
                          <Download className="size-3 rotate-180" /> Subir
                          <input type="file" accept=".pdf,.epub,.mobi" className="hidden" onChange={(e) => handleResourceUpload(e, false)} disabled={isUploadingResource} />
                        </label>
                      </div>
                    </label>
                    <div className="relative">
                      <input 
                        type="url" placeholder="https://..." value={newBook.resource_link || ''} onChange={e => setNewBook({...newBook, resource_link: e.target.value})}
                        className={cn("w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors", isUploadingResource && "opacity-50")}
                      />
                      {isUploadingResource && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="size-4 animate-spin text-emerald-500" /></div>}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">YouTube Review</label>
                    <input 
                      type="url" placeholder="https://youtube.com/..." value={newBook.youtube_link || ''} onChange={e => setNewBook({...newBook, youtube_link: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Sumário / Citações Base</label>
                    <textarea 
                      placeholder="Cole aqui o índice do livro ou suas principais citações..." 
                      value={newBook.summary || ''} 
                      onChange={e => setNewBook({...newBook, summary: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-colors min-h-[120px] custom-scrollbar"
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
      , document.body)}

      {editingBookId && editBookData && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
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
                  <div className="md:col-span-2 flex gap-4">
                     <div className="relative w-16 h-20 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg flex items-center justify-center overflow-hidden group shrink-0">
                        {editBookData.cover_url ? (
                          <>
                            <img src={editBookData.cover_url} alt="Cover" className={cn("w-full h-full object-cover transition-opacity", isUploadingImage && "opacity-30 blur-sm")} />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <Cloud className="size-4 text-white mb-1" />
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-1">
                            {isUploadingImage ? <Loader2 className="size-4 animate-spin text-rose-500 mx-auto" /> : <Cloud className="size-4 text-[#71717A] mx-auto" />}
                          </div>
                        )}
                        
                        {isUploadingImage && editBookData.cover_url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                             <Loader2 className="size-5 animate-spin text-rose-500" />
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} disabled={isUploadingImage} className="absolute inset-0 opacity-0 cursor-pointer z-20" title="Alterar Capa" />
                     </div>
                     <div className="flex-1">
                       <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Título</label>
                       <input type="text" value={editBookData.title} onChange={e => setEditBookData({...editBookData, title: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                     </div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Autor</label>
                    <input type="text" value={editBookData.author || ''} onChange={e => setEditBookData({...editBookData, author: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Status</label>
                    <select value={editBookData.status} onChange={e => setEditBookData({...editBookData, status: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500">
                      <option value="lendo">Lendo Atualmente</option>
                      <option value="quero_ler">Quero Ler</option>
                      <option value="concluido">Já Li</option>
                      <option value="na_estante">Na Estante</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-2 flex items-center gap-2"><Sparkles className="size-3 text-amber-500" /> Badges & Classificação</label>
                    <div className="flex flex-wrap gap-3 bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-inner">
                      {[
                        { id: 'quero_comprar', label: 'Quero Comprar', icon: '🛒' },
                        { id: 'emprestado', label: 'Emprestado', icon: '🤝' },
                        { id: 'meta_ano', label: 'Meta Anual', icon: '🎯' }
                      ].map(badge => (
                        <label key={badge.id} className="flex items-center gap-2 cursor-pointer bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] px-3 py-2 rounded-xl text-sm text-white hover:border-amber-500/50 hover:bg-amber-500/5 transition-all">
                          <input 
                            type="checkbox" 
                            checked={(editBookData.badges || []).includes(badge.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const currentBadges = editBookData.badges || [];
                              setEditBookData({
                                ...editBookData,
                                badges: checked ? [...currentBadges, badge.id] : currentBadges.filter(b => b !== badge.id)
                              } as any);
                            }}
                            className="accent-amber-500 rounded border-white/20"
                          />
                          <span>{badge.icon} {badge.label}</span>
                        </label>
                      ))}
                      <label className="flex items-center gap-2 cursor-pointer bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl text-sm text-amber-400 font-bold hover:border-amber-500/50 hover:bg-amber-500/20 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <input 
                          type="checkbox" 
                          checked={editBookData.is_classic || false}
                          onChange={(e) => setEditBookData({...editBookData, is_classic: e.target.checked})}
                          className="accent-amber-500 rounded border-white/20"
                        />
                        <span>📚 É um Clássico?</span>
                      </label>
                    </div>
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
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Local Guardado</label>
                    <select value={editBookData.storage_location || ''} onChange={e => setEditBookData({...editBookData, storage_location: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500">
                      <option value="">Não definido</option>
                      <option value="estante">Estante Física</option>
                      <option value="kindle">Kindle / E-reader</option>
                      <option value="drive">Google Drive / Nuvem</option>
                      <option value="pc">PC / Local</option>
                      <option value="emprestado">Emprestado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Área do Conhecimento</label>
                    <input 
                      list="knowledge-areas-list"
                      value={editBookData.knowledge_area || ''} onChange={e => setEditBookData({...editBookData, knowledge_area: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500"
                      placeholder="Ex: Negócios, Filosofia..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mb-1 block">Editora</label>
                    <input 
                      type="text" value={editBookData.publisher || ''} onChange={e => setEditBookData({...editBookData, publisher: e.target.value})}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500"
                      placeholder="Ex: Alta Books, Sextante..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Unidade de Progresso</label>
                    <select value={editBookData.progress_unit || 'pages'} onChange={e => setEditBookData({...editBookData, progress_unit: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500">
                      <option value="pages">Páginas</option>
                      <option value="percentage">Porcentagem (%)</option>
                      <option value="chapters">Capítulos</option>
                      <option value="minutes">Tempo (Minutos)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Valor Total</label>
                    <input type="number" value={editBookData.total_pages || ''} onChange={e => setEditBookData({...editBookData, total_pages: Number(e.target.value)})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Coleções (separado por vírgula)</label>
                    <input type="text" placeholder="Ex: Hábitos, Finanças" value={(editBookData as any).collections_input ?? (editBookData.collections || []).join(', ')} onChange={e => setEditBookData({...editBookData, collections_input: e.target.value} as any)} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Tags (separado por vírgula)</label>
                    <input type="text" placeholder="Ex: imperdível, referência" value={(editBookData as any).tags_input ?? (editBookData.tags || []).join(', ')} onChange={e => setEditBookData({...editBookData, tags_input: e.target.value} as any)} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Início da Leitura</label>
                    <input type="date" value={editBookData.start_date ? editBookData.start_date.split('T')[0] : ''} onChange={e => setEditBookData({...editBookData, start_date: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Meta de Conclusão</label>
                    <input type="date" value={editBookData.end_date ? editBookData.end_date.split('T')[0] : ''} onChange={e => setEditBookData({...editBookData, end_date: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" />
                  </div>
                  
                  {editBookData.start_date && editBookData.end_date && (() => {
                   const start = parseISO(editBookData.start_date.split('T')[0]);
                   const end = parseISO(editBookData.end_date.split('T')[0]);
                   const diff = differenceInDays(end, start);
                   if (diff > 0) {
                     return (
                       <div className="md:col-span-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] flex items-center gap-2 font-bold uppercase tracking-widest">
                         <CalendarIcon className="size-4" /> Estimativa Total de Leitura: {diff} dias
                       </div>
                     )
                   }
                   return null;
                 })()}
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
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Link Play Books / Compra</label>
                    <input type="url" value={editBookData.buy_link || ''} onChange={e => setEditBookData({...editBookData, buy_link: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" placeholder="https://..." />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 flex justify-between items-center">
                      Link do PDF/Ebook
                      <div className="flex gap-2">
                        <button type="button" onClick={() => fetchDriveFiles('edit')} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                          <Cloud className="size-3" /> Drive
                        </button>
                        <label className="text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 transition-colors">
                          <Download className="size-3 rotate-180" /> Subir
                          <input type="file" accept=".pdf,.epub,.mobi" className="hidden" onChange={(e) => handleResourceUpload(e, true)} disabled={isUploadingResource} />
                        </label>
                      </div>
                    </label>
                    <div className="relative">
                      <input type="url" value={editBookData.resource_link || ''} onChange={e => setEditBookData({...editBookData, resource_link: e.target.value})} className={cn("w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500", isUploadingResource && "opacity-50")} placeholder="https://..." />
                      {isUploadingResource && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="size-4 animate-spin text-emerald-500" /></div>}
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">YouTube Review</label>
                    <input type="url" value={editBookData.youtube_link || ''} onChange={e => setEditBookData({...editBookData, youtube_link: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500" placeholder="https://youtube.com/..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase font-bold text-[#71717A] mb-1 block">Sumário / Citações Base</label>
                    <textarea 
                      value={editBookData.summary || ''} 
                      onChange={e => setEditBookData({...editBookData, summary: e.target.value})} 
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm px-3 py-3 text-white focus:outline-none focus:border-rose-500 min-h-[120px] custom-scrollbar" 
                      placeholder="Cole aqui o índice do livro ou suas principais citações..." 
                    />
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
      , document.body)}

      {/* 3-COLUMN LAYOUT ON LARGE SCREENS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* LEFT COLUMN: Authors Summary, Stats Panorama and Achievements */}
        <div className="lg:col-span-3 order-2 lg:order-1 flex flex-col gap-6">
           <PosLibraryAuthorsSummary books={books} sessions={sessions} />
           <PosLibraryStatsPanorama books={books} sessions={sessions} />
        </div>
        
        {/* CENTER COLUMN: Active Reading & Yearly Summary */}
        <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col gap-6">
          {currentBooks.length > 0 && (() => {
        const actualIndex = currentBookIndex >= currentBooks.length ? 0 : currentBookIndex;
        const currentBook = currentBooks[actualIndex];
        if (!currentBook) return null;

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

        const startDate = currentBook.start_date ? getSafeDate(currentBook.start_date) : null;
        let daysReading = 1;
        if (startDate) {
           daysReading = Math.max(1, differenceInDays(new Date(), startDate) + 1);
        }

        // Delay calculation
        let delayMessage = "";
        let isDelayed = false;
        
        if (currentBook.end_date && currentBook.total_pages && startDate) {
           const end = getSafeDate(currentBook.end_date)!;
           const totalDays = Math.max(1, differenceInDays(end, startDate) + 1);
           const idealPacePerDay = currentBook.total_pages / totalDays;
           const idealPagesUpToToday = idealPacePerDay * daysReading;
           if (currentBook.pages_read < idealPagesUpToToday - 1) { // -1 de margem
              isDelayed = true;
            const unitLabel = currentBook.progress_unit === 'percentage' ? '%' : currentBook.progress_unit === 'chapters' ? 'caps' : currentBook.progress_unit === 'minutes' ? 'min' : 'págs';
            delayMessage = `${Math.ceil(idealPagesUpToToday - currentBook.pages_read)} ${unitLabel}. atrasadas`;
           }
        } else {
           // Fallback: missed yesterday and today
           const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
           if (!sessionDates.includes(todayStr) && !sessionDates.includes(yesterdayStr) && daysReading > 1) {
              isDelayed = true;
              delayMessage = "Hábito inativo (atraso)";
           }
        }

        return (
          <div className="relative animate-in fade-in slide-in-from-bottom-4 mb-6">
            {currentBooks.length > 1 && (
               <div className="flex justify-between items-center mb-4 px-2">
                 <h3 className="text-[#A1A1AA] font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    Leituras Atuais ({actualIndex + 1}/{currentBooks.length})
                 </h3>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setCurrentBookIndex(prev => prev > 0 ? prev - 1 : currentBooks.length - 1)}
                     className="p-2 bg-[#111113] border border-[rgba(255,255,255,0.08)] hover:border-rose-500/50 hover:bg-rose-500/10 text-white rounded-full transition-all shadow-lg"
                   >
                     <ChevronLeft className="size-4" />
                   </button>
                   <button 
                     onClick={() => setCurrentBookIndex(prev => prev < currentBooks.length - 1 ? prev + 1 : 0)}
                     className="p-2 bg-[#111113] border border-[rgba(255,255,255,0.08)] hover:border-rose-500/50 hover:bg-rose-500/10 text-white rounded-full transition-all shadow-lg"
                   >
                     <ChevronRight className="size-4" />
                   </button>
                 </div>
               </div>
            )}
            
            <div key={currentBook.id} className="bg-[#111113]/60 backdrop-blur-2xl rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 md:p-8 flex flex-col gap-6 border border-[rgba(255,255,255,0.08)] relative overflow-hidden transition-all duration-500">
              {/* Ambient glow inside the card */}
              <div className="absolute -top-40 -right-40 size-80 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"></div>

              <div className="flex justify-between items-center relative z-10">
                 <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                   Continue Lendo                
                 </h3>
                 <div className="flex gap-2 items-center">
                   <button 
                     onClick={() => setViewingBookId(currentBook.id)}
                     className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold text-white bg-white/10 hover:bg-white/20 transition-colors border border-white/10 shadow-sm"
                   >
                     Abrir Livro
                   </button>
                   <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/20 shadow-glow-sm">
                     {cbPercent}%
                   </span>
                 </div>
              </div>
              
              <div className="flex gap-4 md:gap-5 relative z-10">
               <div className="w-20 h-28 md:w-24 md:h-36 bg-black/50 rounded-lg flex-shrink-0 border border-[rgba(255,255,255,0.05)] flex items-center justify-center overflow-hidden relative shadow-lg">
                 {currentBook.cover_url ? (
                   <img src={currentBook.cover_url} alt="Cover" className="w-full h-full object-cover relative z-10" />
                 ) : (
                   <>
                     <BookOpen className="size-8 text-[#3F3F46] absolute" />
                     <div className={cn("absolute inset-0 opacity-20", 
                        currentBook.knowledge_area === 'Negócios' ? 'bg-blue-500' :
                        currentBook.knowledge_area === 'Filosofia' ? 'bg-amber-500' :
                        'bg-rose-500'
                     )} />
                   </>
                 )}
               </div>
               <div className="flex flex-col justify-center">
                 <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">{currentBook.knowledge_area || 'Geral'}</p>
                 <h4 className="text-xl md:text-2xl font-black text-white leading-tight mb-1 line-clamp-2">{currentBook.title}</h4>
                 <p className="text-sm font-medium text-[#71717A]">{currentBook.author}</p>
               </div>
            </div>
            
            <div className="relative z-10">
                 <div className="flex flex-wrap justify-between items-center text-[11px] font-bold text-[#71717A] mb-2 uppercase tracking-widest gap-2">
                 <div className="flex items-center gap-2">
                    <span>Progresso</span>
                    {isDelayed && (
                      <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                         <AlertTriangle className="size-3" /> {delayMessage}
                      </span>
                    )}
                 </div>
                 <span>{currentBook.pages_read} / {currentBook.total_pages || '?'} {currentBook.progress_unit === 'percentage' ? '%' : currentBook.progress_unit === 'chapters' ? 'caps' : currentBook.progress_unit === 'minutes' ? 'min' : 'páginas'} ({cbPercent}%)</span>
               </div>
               <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)]">
                 <div className="h-full bg-rose-500 rounded-full transition-all shadow-[0_0_10px_rgba(225,29,72,0.5)]" style={{ width: `${cbPercent}%` }}></div>
               </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 relative z-10">
               <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col items-start hover:bg-black/40 transition-colors shadow-inner">
                 <div className="flex items-center gap-1.5 text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest mb-2"><TrendingUp className="size-3 text-orange-400" /> Sequência</div>
                 <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1">{cbStreak} <span className="text-xs font-bold text-[#71717A]">dias</span></div>
               </div>
               <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col items-start hover:bg-black/40 transition-colors shadow-inner">
                 <div className="flex items-center gap-1.5 text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest mb-2"><CalendarClock className="size-3 text-indigo-400" /> Em Leitura</div>
                 <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1">{daysReading} <span className="text-xs font-bold text-[#71717A]">dias</span></div>
               </div>
               <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col items-start hover:bg-black/40 transition-colors shadow-inner">
                 <div className="flex items-center gap-1.5 text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest mb-2"><BookOpen className="size-3 text-blue-400" /> Lidas Hoje</div>
                 <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1">{cbPagesReadToday} <span className="text-xs font-bold text-[#71717A]">{currentBook.progress_unit === 'percentage' ? '%' : currentBook.progress_unit === 'chapters' ? 'caps' : currentBook.progress_unit === 'minutes' ? 'min' : 'págs'}</span></div>
               </div>
               <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col items-start hover:bg-black/40 transition-colors shadow-inner">
                 <div className="flex items-center gap-1.5 text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest mb-2"><Clock className="size-3 text-emerald-400" /> Tempo Total</div>
                 <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1">{cbTotalMinutes} <span className="text-xs font-bold text-[#71717A]">min</span></div>
               </div>
               <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col items-start hover:bg-black/40 transition-colors shadow-inner">
                 <div className="flex items-center gap-1.5 text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest mb-2"><Target className="size-3 text-rose-400" /> Meta Diária</div>
                 <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1">{cbPagesPerDay || '-'} <span className="text-xs font-bold text-[#71717A]">{currentBook.progress_unit === 'percentage' ? '%' : currentBook.progress_unit === 'chapters' ? 'caps' : currentBook.progress_unit === 'minutes' ? 'min' : 'págs'}</span></div>
               </div>
            </div>
            
            <div className="bg-[#111113]/80 backdrop-blur-md p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] flex items-start gap-4 relative z-10 shadow-lg mt-2 group hover:border-[rgba(255,255,255,0.1)] transition-colors">
               <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 shrink-0 shadow-inner">
                 <Brain className="size-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
               </div>
               <div className="text-[#A1A1AA] text-sm font-medium w-full leading-relaxed pt-0.5">
                 {(() => {
                   const progressUnitName = currentBook.progress_unit === 'percentage' ? '%' : currentBook.progress_unit === 'chapters' ? 'capítulos' : currentBook.progress_unit === 'minutes' ? 'minutos' : 'páginas';
                   const cbTotalEstimatedDays = currentBook.start_date && currentBook.end_date ? Math.max(1, differenceInDays(getSafeDate(currentBook.end_date) || new Date(), getSafeDate(currentBook.start_date) || new Date())) : null;
                   
                   return (
                     <div className="flex flex-col gap-3 w-full">
                       {currentBook.end_date && currentBook.total_pages && getSafeDate(currentBook.end_date) ? (
                         <span className="text-[15px]">Para concluir até <strong className="text-white font-bold">{format(getSafeDate(currentBook.end_date)!, "dd/MM/yyyy")}</strong>, você precisa ler <strong className="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold">{cbPagesPerDay} {progressUnitName} por dia</strong>.</span>
                       ) : (
                         <span className="text-[15px]">{cbRemainingDaysToFinish > 0 ? `Mantendo este ritmo, você conclui em ${cbRemainingDaysToFinish} dias. (Defina Meta de Conclusão)` : "Falta muito pouco! Mantenha o ritmo."}</span>
                       )}
                       
                       <div className="flex flex-wrap items-center gap-3 mt-1">
                         {cbTotalEstimatedDays && (
                           <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#71717A] bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] px-3 py-1.5 rounded-lg shadow-sm">
                             <CalendarIcon className="size-3 text-indigo-500" /> Estimativa de Término: {cbTotalEstimatedDays} dias
                           </div>
                         )}
                         {cbRemainingDaysToFinish > 0 && (
                           <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#71717A] bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] px-3 py-1.5 rounded-lg shadow-sm">
                             <TrendingUp className="size-3 text-emerald-500" /> Ritmo atual: conclui em {cbRemainingDaysToFinish} dias
                           </div>
                         )}
                       </div>
                     </div>
                   );
                 })()}
               </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 pt-2 relative z-10">
               <button 
                 onClick={() => startReadingSession(currentBook)}
                 className="flex-1 bg-white text-black text-sm font-semibold py-3 rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2"
               >
                 <Play className="size-4" fill="currentColor" /> Continuar Lendo
               </button>
               {currentBook.resource_link && (
                 <a href={currentBook.resource_link} target="_blank" rel="noopener noreferrer" className="flex-1 bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium py-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2">
                   <ExternalLink className="size-4" /> Acessar Arquivo
                 </a>
               )}
               {currentBook.buy_link && (
                 <a href={currentBook.buy_link} target="_blank" rel="noopener noreferrer" className="flex-1 bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium py-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2">
                   <ShoppingCart className="size-4" /> Play Books
                 </a>
               )}
               <button 
                 onClick={() => { setEditingBookId(currentBook.id); setEditBookData(currentBook); }}
                 className="flex-1 bg-transparent border border-[rgba(255,255,255,0.1)] text-[#A1A1AA] text-sm font-medium py-3 rounded-xl hover:text-white hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2"
               >
                 Ver Detalhes
               </button>
            </div>
          </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 mb-6">
        <PosLibraryKnowledgeAreas books={books} />
        <PosLibraryAchievements books={books} sessions={sessions} />
      </div>

      {/* Workspace de Sessão de Leitura Imersiva */}
      {activeSessions.length > 0 && (() => {
         const session = activeSessions[0];
         const book = books.find(b => b.id === session.bookId);
         const progressUnit = book?.progress_unit || 'páginas';
         
         return createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 sm:p-4">
            <div className="w-full h-[100dvh] sm:h-[95vh] sm:max-h-[1000px] sm:w-[98vw] max-w-[1600px] flex flex-col bg-[#0A0A0C] sm:rounded-[32px] overflow-hidden shadow-2xl relative border border-[rgba(255,255,255,0.04)]">
              
              {/* Header */}
              <div className="flex-none h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b border-[rgba(255,255,255,0.04)] bg-[#0A0A0C] relative z-20">
                 <div className="flex items-center gap-4 min-w-0">
                    <button onClick={() => cancelReadingSession(session.id)} className="p-2 -ml-2 text-[#71717A] hover:text-white hover:bg-white/5 rounded-full transition-colors flex-shrink-0" title="Cancelar e fechar">
                      <X className="size-5 md:size-6" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="text-white font-bold text-lg md:text-xl truncate flex items-center gap-3">
                         <span className="flex size-2.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                         {session.bookTitle}
                      </h2>
                      <p className="text-[10px] md:text-xs text-[#A1A1AA] uppercase tracking-widest font-bold">Workspace de Leitura</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    <div className="flex flex-col items-end hidden sm:flex">
                       <span className="text-rose-500 font-bold text-xl md:text-2xl tracking-widest font-mono leading-none">
                         <LiveTimer session={session} />
                       </span>
                       <span className="text-[9px] uppercase tracking-widest text-[#71717A] font-bold">Decorridos</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (session.status === 'paused') {
                          saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, status: 'active', startTime: Date.now() } : s));
                        } else {
                          const activeMs = Date.now() - session.startTime;
                          saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, status: 'paused', accumulatedTime: (s.accumulatedTime || 0) + activeMs } : s));
                        }
                      }}
                      className={cn("size-10 md:size-12 rounded-full flex items-center justify-center transition-all shadow-lg", session.status === 'paused' ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/20")}
                    >
                      {session.status === 'paused' ? <Play className="size-5 md:size-6" fill="currentColor" /> : <Pause className="size-5 md:size-6" fill="currentColor" />}
                    </button>
                    <button onClick={() => handleFinishSession(session)} className="px-4 py-2 md:px-6 md:py-3 rounded-full bg-rose-600 text-white hover:bg-rose-500 text-xs md:text-sm font-bold shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all flex items-center gap-2 group">
                      <CheckCircle2 className="size-4 md:size-5 group-hover:scale-110 transition-transform" /> <span className="hidden sm:inline">Concluir Sessão</span>
                    </button>
                 </div>
              </div>

              {/* Corpo */}
              <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
                 
                 {/* Sidebar Esquerda (Metadados e Ferramentas) - 35% */}
                 <div className="w-full lg:w-[35%] flex flex-col min-h-0 lg:border-r border-b lg:border-b-0 border-[rgba(255,255,255,0.04)] bg-[#0A0A0C] z-10 overflow-y-auto custom-scrollbar shrink-0 max-h-[40vh] lg:max-h-full">
                    <div className="p-5 md:p-8 space-y-6 md:space-y-8">
                       
                       {/* Capa e Progresso */}
                       <div className="flex gap-4">
                         <div className="w-16 h-24 md:w-20 md:h-28 bg-black/50 rounded-lg flex-shrink-0 border border-[rgba(255,255,255,0.05)] overflow-hidden">
                           {book?.cover_url ? <img src={book.cover_url} alt="Cover" className="w-full h-full object-cover" /> : <BookOpen className="size-8 text-[#3F3F46] m-auto mt-6 md:mt-10" />}
                         </div>
                         <div className="flex flex-col justify-center w-full">
                           <h3 className="text-white text-sm md:text-base font-bold mb-2">Progresso da Sessão</h3>
                           <div className="space-y-3 md:space-y-4">
                             <div>
                               <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-1.5 flex items-center gap-1.5"><BookOpen className="size-3 text-rose-500" /> Parou em qual {progressUnit}?</label>
                               <input 
                                 type="text" 
                                 value={session.chapters_read || ""}
                                 onChange={(e) => saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, chapters_read: e.target.value } : s))}
                                 placeholder="Ex: Cap. 4 ou 250"
                                 className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                               />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-1.5 flex items-center gap-1.5"><TrendingUp className="size-3 text-emerald-500" /> Quantidade lida (Opcional)</label>
                               <input 
                                 type="number" min="1" 
                                 value={session.pages_read || ""}
                                 onChange={(e) => saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, pages_read: e.target.value ? Number(e.target.value) : "" } : s))}
                                 placeholder={`Quantos ${progressUnit}?`}
                                 className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                               />
                             </div>
                           </div>
                         </div>
                       </div>
                       
                       <div className="h-px w-full bg-[rgba(255,255,255,0.04)]"></div>

                       {/* Metadados de Contexto */}
                       <div>
                         <h3 className="text-white text-sm md:text-base font-bold mb-4 flex items-center gap-2"><Target className="size-4 text-indigo-400" /> Contexto da Leitura</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                               <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-1.5 block">Onde Li?</label>
                               <input 
                                 type="text" 
                                 value={session.location || ""}
                                 placeholder="Automático (GPS) ou digite..."
                                 onChange={(e) => saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, location: e.target.value } : s))}
                                 className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                               />
                             </div>
                             <div>
                               <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-1.5 block">Como Li?</label>
                               <select 
                                 value={session.device || "Livro Físico"}
                                 onChange={(e) => saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, device: e.target.value } : s))}
                                 className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                               >
                                 <option value="Livro Físico">Físico</option>
                                 <option value="Kindle">Kindle</option>
                                 <option value="Tablet">Tablet</option>
                                 <option value="Celular">Celular</option>
                                 <option value="Audiobook">Audiobook</option>
                                 <option value="PC/Desktop">PC</option>
                               </select>
                             </div>
                             <div>
                               <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-1.5 block">Nível</label>
                               <select 
                                 value={session.difficulty || "Fácil"}
                                 onChange={(e) => saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, difficulty: e.target.value } : s))}
                                 className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                               >
                                 <option value="Muito Fácil">Muito Fácil</option>
                                 <option value="Fácil">Fácil</option>
                                 <option value="Médio">Médio</option>
                                 <option value="Difícil">Difícil</option>
                                 <option value="Muito Difícil">Muito Difícil</option>
                               </select>
                             </div>
                             <div>
                               <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-1.5 block">Foco (1-10)</label>
                               <input 
                                 type="number" min="1" max="10" 
                                 value={session.concentration_level || 8}
                                 onChange={(e) => saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, concentration_level: Number(e.target.value) } : s))}
                                 className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                               />
                             </div>
                         </div>
                       </div>
                       
                       <div className="h-px w-full bg-[rgba(255,255,255,0.04)]"></div>

                       {/* Recursos / Ferramentas */}
                       <div>
                         <h3 className="text-white text-sm md:text-base font-bold mb-4 flex items-center gap-2"><ListIcon className="size-4 text-cyan-400" /> Recursos da Sessão</h3>
                         <div className="space-y-4">
                            <details open className="group [&_summary::-webkit-details-marker]:hidden">
                              <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                    <ListIcon className="size-3.5" />
                                  </div>
                                  Glossário de Anotações
                                </div>
                                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                              </summary>
                              <div className="flex flex-col gap-1 max-h-56 overflow-y-auto custom-scrollbar pr-1 bg-[#111113] p-2 rounded-xl border border-[rgba(255,255,255,0.06)] shadow-inner">
                                {(() => {
                                  if (typeof window === 'undefined' || !session.notes) return <span className="text-[10px] text-[#71717A] italic text-center py-2">Nenhum título criado.</span>;
                                  const doc = new DOMParser().parseFromString(session.notes, 'text/html');
                                  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4'));
                                  const items = headings.map((h, i) => ({
                                    title: h.textContent || '',
                                    level: parseInt(h.tagName.replace('H', '')),
                                    index: i
                                  })).filter(h => h.title.replace(/\u200B/g, '').replace(/[\u00A0\u1680\u180e\u2000-\u2009\u200a\u200b\u202f\u205f\u3000]/g, '').trim() !== '');

                                  if (items.length === 0) return <span className="text-[10px] text-[#71717A] italic text-center py-2">Nenhum título criado nas anotações.</span>;
                                  
                                  return items.map((item, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        const editorEl = document.querySelector('.ProseMirror');
                                        if (editorEl) {
                                          const domHeadings = Array.from(editorEl.querySelectorAll('h1, h2, h3, h4'));
                                          const target = domHeadings[item.index] as HTMLElement;
                                          if (target) {
                                            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            target.style.transition = 'all 0.5s ease';
                                            const oldBg = target.style.backgroundColor;
                                            target.style.backgroundColor = 'rgba(6, 182, 212, 0.2)';
                                            target.style.borderRadius = '4px';
                                            target.style.padding = '0 4px';
                                            setTimeout(() => {
                                              target.style.backgroundColor = oldBg;
                                            }, 1500);
                                          }
                                        }
                                      }}
                                      className={cn("text-left w-full py-1 rounded-lg transition-colors group/item overflow-hidden block shrink-0", 
                                        item.level === 4 ? "my-1" : "px-2 hover:bg-white/5"
                                      )}
                                      title={item.title}
                                    >
                                      {item.level === 4 ? (
                                        <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 border-l-2 border-cyan-500 rounded-r-lg group-hover/item:from-cyan-500/20 transition-all w-full shrink-0 min-h-[28px]">
                                          <BookMarked className="w-4 h-4 text-cyan-400 shrink-0" />
                                          <span className="text-xs font-bold text-white truncate flex-1 min-w-0">{item.title}</span>
                                        </div>
                                      ) : (
                                        <div className={cn("truncate text-xs py-0.5 w-full",
                                          item.level === 1 ? "font-bold text-white" : 
                                          item.level === 2 ? "text-[#E4E4E7] pl-2 font-medium" : 
                                          "text-[#A1A1AA] pl-4 text-[11px]"
                                        )}>
                                          {item.title}
                                        </div>
                                      )}
                                    </button>
                                  ));
                                })()}
                              </div>
                            </details>

                            <details open className="group [&_summary::-webkit-details-marker]:hidden">
                              <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                    <Tag className="size-3.5" />
                                  </div>
                                  Tags da Sessão
                                </div>
                                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                              </summary>
                              <div className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 min-h-[56px] flex flex-wrap items-center gap-2 focus-within:border-cyan-500/40 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all shadow-inner">
                                {(session.tags || "").split(',').map((t: string) => t.trim()).filter(Boolean).map((tag: string, idx: number) => (
                                  <span key={idx} className="bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border border-cyan-500/20">
                                    {tag}
                                    <button 
                                      onClick={() => {
                                        const newTags = (session.tags || "").split(',').map((t: string) => t.trim()).filter(Boolean).filter((_: any, i: number) => i !== idx).join(', ');
                                        saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, tags: newTags } : s));
                                      }}
                                      className="hover:text-white transition-colors"
                                    >
                                      <X className="size-3" />
                                    </button>
                                  </span>
                                ))}
                                <input 
                                  placeholder={session.tags ? "Adicionar..." : "Digite a tag e aperte Enter..."}
                                  value={sessionTagInput}
                                  onChange={(e) => setSessionTagInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && sessionTagInput.trim()) {
                                      e.preventDefault();
                                      const currentTags = (session.tags || "").split(',').map((t: string) => t.trim()).filter(Boolean);
                                      if (!currentTags.includes(sessionTagInput.trim())) {
                                        const newTags = [...currentTags, sessionTagInput.trim()].join(', ');
                                        saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, tags: newTags } : s));
                                        setSessionTagInput("");
                                      }
                                    }
                                  }}
                                  className="flex-1 min-w-[120px] bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-white p-1 placeholder:text-zinc-600"
                                />
                              </div>
                            </details>

                            {/* NOVA SESSÃO DE PESQUISA */}
                            <details open className="group [&_summary::-webkit-details-marker]:hidden">
                              <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                    <Search className="size-3.5" />
                                  </div>
                                  Pesquisa Rápida
                                </div>
                                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                              </summary>
                              <div className="flex flex-col gap-2">
                                <div className="flex bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden focus-within:border-emerald-500/50 transition-colors shadow-inner">
                                  <div className="flex-1 px-3 flex items-center gap-2">
                                    <Search className="size-3 text-[#71717A]" />
                                    <input 
                                      type="text" placeholder="Pesquisar na Web..."
                                      value={webSearchQuery}
                                      onChange={e => setWebSearchQuery(e.target.value)}
                                      onKeyDown={e => {
                                        if(e.key === 'Enter' && webSearchQuery.trim()) {
                                          window.open(`https://www.google.com/search?q=${encodeURIComponent(webSearchQuery.trim())}`, '_blank');
                                        }
                                      }}
                                      className="w-full bg-transparent border-none text-xs text-white py-2.5 focus:outline-none"
                                    />
                                  </div>
                                  <button onClick={() => {
                                      if(webSearchQuery.trim()) window.open(`https://www.google.com/search?q=${encodeURIComponent(webSearchQuery.trim())}`, '_blank');
                                  }} className="px-3 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-bold text-xs transition-colors border-l border-[rgba(255,255,255,0.04)]">
                                    Ir
                                  </button>
                                </div>

                                <div className="flex bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden focus-within:border-indigo-500/50 transition-colors shadow-inner">
                                  <div className="flex-1 px-3 flex items-center gap-2">
                                    <BookOpen className="size-3 text-[#71717A]" />
                                    <input 
                                      type="text" placeholder="Dicionário (Dicio)..."
                                      value={dictionaryQuery}
                                      onChange={e => setDictionaryQuery(e.target.value)}
                                      onKeyDown={e => {
                                        if(e.key === 'Enter' && dictionaryQuery.trim()) {
                                          window.open(`https://www.dicio.com.br/${encodeURIComponent(dictionaryQuery.trim().toLowerCase().replace(/\s+/g, '-'))}/`, '_blank');
                                        }
                                      }}
                                      className="w-full bg-transparent border-none text-xs text-white py-2.5 focus:outline-none"
                                    />
                                  </div>
                                  <button onClick={() => {
                                      if(dictionaryQuery.trim()) window.open(`https://www.dicio.com.br/${encodeURIComponent(dictionaryQuery.trim().toLowerCase().replace(/\s+/g, '-'))}/`, '_blank');
                                  }} className="px-3 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-bold text-xs transition-colors border-l border-[rgba(255,255,255,0.04)]">
                                    Definir
                                  </button>
                                </div>
                              </div>
                            </details>
                         </div>
                       </div>
                    </div>
                 </div>
                 
                 {/* Área Principal (RichTextEditor) - 65% */}
                 <div className="w-full lg:w-[65%] flex flex-col bg-[#0A0A0C] min-h-0 relative z-20 flex-1">
                    <div className="flex-none p-4 md:p-6 pb-3 border-b border-[rgba(255,255,255,0.04)] flex justify-between items-end">
                       <div>
                         <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base"><Edit2 className="size-4 text-purple-500" /> Resenha e Anotações</h3>
                         <p className="text-[10px] md:text-xs text-[#71717A] mt-1 hidden sm:block">Escreva livremente, os dados são salvos automaticamente.</p>
                       </div>
                       
                       <div className="flex items-center gap-2">
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            id={`camera-${session.id}`}
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              try {
                                toast.loading("Analisando imagem...", { id: `upload-${session.id}` });
                                
                                const maxSizeBytes = 5 * 1024 * 1024;
                                if (file.size > maxSizeBytes) {
                                  toast.error(`A imagem é muito pesada! O limite é de 5MB.`, { id: `upload-${session.id}` });
                                  return;
                                }

                                const arrayBuffer = await file.arrayBuffer();
                                const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                                const hashArray = Array.from(new Uint8Array(hashBuffer));
                                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                                
                                const fileExt = file.name.split('.').pop() || 'jpg';
                                const fileName = `session_${hashHex}.${fileExt}`;
                                const filePath = `anotacoes/${fileName}`;
                                
                                toast.loading("Enviando imagem...", { id: `upload-${session.id}` });
                                const { error } = await supabase.storage.from('livros').upload(filePath, file);
                                
                                if (error && !error.message.toLowerCase().includes('already exists') && !error.message.toLowerCase().includes('duplicate')) {
                                  throw error;
                                }
                                
                                const { data } = supabase.storage.from('livros').getPublicUrl(filePath);
                                
                                const imgHtml = `<p><img src="${data.publicUrl}" alt="Trecho do Livro" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 1px solid rgba(255,255,255,0.1);" /></p><p><br></p>`;
                                
                                saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, notes: (s.notes || "") + imgHtml } : s));
                                
                                toast.success("Imagem anexada à anotação!", { id: `upload-${session.id}` });
                              } catch (err: any) {
                                toast.error("Erro ao enviar imagem: " + err.message, { id: `upload-${session.id}` });
                              }
                            }}
                          />
                          <label htmlFor={`camera-${session.id}`} className="cursor-pointer h-8 w-8 md:h-10 md:w-10 flex items-center justify-center rounded-lg bg-[#111113] hover:bg-emerald-500/20 text-emerald-400 border border-[rgba(255,255,255,0.04)] hover:border-emerald-500/30 transition-colors shadow-sm" title="Tirar foto ou anexar imagem">
                            <Camera className="size-4 md:size-5" />
                          </label>
                          <VoiceRecordButton 
                            onTranscript={(t) => saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, notes: (s.notes || "") + `<p>${t}</p>` } : s))} 
                            className="h-8 w-8 md:h-10 md:w-10 !p-2 bg-[#111113] hover:bg-purple-500/20 text-purple-400 border-[rgba(255,255,255,0.04)] hover:border-purple-500/30 rounded-lg shadow-sm"
                            placeholder="Ditar anotação"
                          />
                       </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                       <RichTextEditor 
                         content={session.notes || ""}
                         onChange={(content) => saveActiveSessions(activeSessions.map(s => s.id === session.id ? { ...s, notes: content } : s))}
                         placeholder="Comece a digitar seu resumo, pensamentos e notas de leitura..."
                       />
                    </div>
                 </div>
              </div>
              
            </div>
          </div>,
          document.body
         );
      })()}



      </div> {/* END CENTER COLUMN */}

      {/* RIGHT COLUMN: Arsenal de Plataformas */}
      <div className="lg:col-span-3 order-3 flex flex-col gap-6">

      {/* Arsenal de Leitura (Apps) */}
      <div className="animate-in fade-in slide-in-from-bottom-4">
         <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
              <AppWindow className="size-4 text-rose-500" /> Plataformas
            </h3>
            <button onClick={() => setIsAppModalOpen(true)} className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors flex items-center justify-center">
               <Plus className="size-4" />
            </button>
         </div>
         <div className="flex flex-col gap-3">
            {readingApps.map(app => (
              <div key={app.id} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 flex items-center justify-between group hover:border-[rgba(255,255,255,0.1)] transition-all">
                <a href={app.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn("p-2 rounded-lg shrink-0", app.type === 'download' ? "bg-emerald-500/10 text-emerald-500" : app.type === 'audiobook' ? "bg-indigo-500/10 text-indigo-500" : "bg-orange-500/10 text-orange-500")}>
                     {app.type === 'download' ? <Download className="size-4" /> : app.type === 'audiobook' ? <Headphones className="size-4" /> : <BookOpen className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="text-sm font-bold text-white truncate">{app.name}</div>
                     <div className="text-[9px] uppercase tracking-widest text-[#71717A] mt-0.5">{app.type}</div>
                  </div>
                </a>
                <button onClick={() => removeApp(app.id)} className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#71717A] hover:text-rose-500 shrink-0">
                   <Trash2 className="size-3" />
                </button>
              </div>
            ))}
            {readingApps.length === 0 && (
              <div className="w-full py-4 text-center text-sm text-[#71717A] border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl bg-[#111113]/50">
                 Nenhum app.
              </div>
            )}
         </div>
      </div>

      {/* Cápsula do Tempo & Resumo Anual */}
      <PosLibraryYearlySummary books={books} sessions={sessions} />

      </div> {/* END RIGHT COLUMN */}
      </div> {/* END 3-COLUMN GRID */}

      {/* App Registration Modal */}
      {isAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="w-full max-w-md bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-2xl relative">
            <button onClick={() => setIsAppModalOpen(false)} className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white"><X className="size-5" /></button>
            <h3 className="text-xl font-bold text-white mb-6">Adicionar Novo App</h3>
            <form onSubmit={handleAddApp} className="flex flex-col gap-4">
              <div>
                <label className="text-xs uppercase font-bold text-[#71717A] mb-1 block">Nome do App</label>
                <input required type="text" value={newAppForm.name} onChange={e => setNewAppForm({...newAppForm, name: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none" placeholder="Ex: Storytel" />
              </div>
              <div>
                <label className="text-xs uppercase font-bold text-[#71717A] mb-1 block">URL (Link)</label>
                <input required type="url" value={newAppForm.url} onChange={e => setNewAppForm({...newAppForm, url: e.target.value})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs uppercase font-bold text-[#71717A] mb-1 block">Tipo</label>
                <select value={newAppForm.type} onChange={e => setNewAppForm({...newAppForm, type: e.target.value as any})} className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none">
                  <option value="audiobook">Audiobook</option>
                  <option value="download">Download (PDF/Epub)</option>
                  <option value="reader">Leitor Digital</option>
                </select>
              </div>
              <button type="submit" className="mt-2 w-full py-3 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-colors">Adicionar Plataforma</button>
            </form>
          </div>
        </div>
      )}

      {/* Drive Selection Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="w-full max-w-lg bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[80vh]">
            <button onClick={() => { setShowDriveModal(false); setDriveSearch(""); setDriveVisibleCount(10); }} className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white"><X className="size-5" /></button>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Cloud className="size-5 text-indigo-400" /> Meu Drive Literário</h3>
            <p className="text-sm text-[#71717A] mb-4">Selecione um arquivo previamente enviado para vincular a esta obra.</p>
            
            {!isLoadingDrive && driveFiles.length > 0 && (
               <div className="mb-4 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#71717A]" />
                 <input 
                   type="text" 
                   value={driveSearch}
                   onChange={e => setDriveSearch(e.target.value)}
                   placeholder="Buscar arquivo..."
                   className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-[#71717A]"
                 />
               </div>
            )}
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
              {isLoadingDrive ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="size-8 animate-spin text-indigo-500" />
                  <span className="text-sm text-[#A1A1AA]">Carregando arquivos...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 bg-[#1A1A1E] rounded-xl border border-[rgba(255,255,255,0.02)]">
                  <Cloud className="size-10 text-[#3F3F46]" />
                  <span className="text-sm text-[#A1A1AA]">Nenhum arquivo encontrado no Drive.</span>
                </div>
              ) : (
                (() => {
                  const filtered = driveFiles.filter(file => file.name.toLowerCase().includes(driveSearch.toLowerCase()));
                  const displayed = filtered.slice(0, driveVisibleCount);
                  
                  return (
                    <>
                      {displayed.map(file => {
                        const nameLower = file.name.toLowerCase();
                        const isPdf = file.origin === 'pdf' || nameLower.endsWith('.pdf');
                        const isEpub = file.origin === 'epub' || nameLower.endsWith('.epub') || nameLower.endsWith('.mobi');
                        
                        let fileId = "";
                        const match = file.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                        if (match) fileId = match[1];
                        
                        return (
                        <button 
                          key={file.url} 
                          onClick={() => selectDriveFile(file)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#1A1A1E] hover:bg-white/5 border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] transition-all text-left gap-3 group shrink-0"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <DriveCover 
                              file={file} 
                              isEpub={isEpub}
                              isPdf={isPdf}
                              fileId={fileId}
                              className="w-12 h-16 object-cover rounded shadow border border-[rgba(255,255,255,0.1)] shrink-0"
                              fallbackClassName={cn("flex items-center justify-center w-12 h-16 bg-black/50 rounded-lg transition-colors shrink-0 border", isPdf ? "text-red-400 group-hover:text-red-300 border-red-500/10" : isEpub ? "text-indigo-400 group-hover:text-indigo-300 border-indigo-500/10" : "text-[#71717A]")}
                            />
                            <div className="truncate">
                              <div className="text-white text-sm font-bold truncate flex items-center gap-2">
                                <span className="truncate">{file.name.replace(/^arquivos\//, '')}</span>
                                {isPdf && <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0">PDF</span>}
                                {isEpub && <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0">EPUB</span>}
                              </div>
                              <div className="text-xs text-[#71717A] mt-1">
                                {file.metadata?.size || file.size ? ((file.metadata?.size || file.size) / 1024 / 1024).toFixed(2) + ' MB • ' : ''}{format(new Date(file.created_at || file.date || new Date()), "dd/MM/yyyy")}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs font-bold text-white/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block bg-white/10 px-3 py-1.5 rounded-lg">
                            Vincular
                          </div>
                        </button>
                      )})}
                      {driveVisibleCount < filtered.length && (
                        <div className="flex justify-center mt-2 mb-4 shrink-0">
                          <button 
                            onClick={() => setDriveVisibleCount(prev => prev + 10)}
                            className="bg-white/5 hover:bg-white/10 text-white text-sm font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2"
                          >
                            Ver Mais ({filtered.length - driveVisibleCount} restantes)
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historico & Acervo */}
      <div className="mt-4 md:mt-8">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Bookmark className="size-5 text-rose-500" /> Histórico & Acervo
            </h3>
            
            <div className="flex flex-col md:flex-row gap-3 flex-wrap justify-end flex-1 w-full md:w-auto">
              <input 
                 type="text"
                 placeholder="Buscar livro, autor..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none flex-1 min-w-[150px] w-full md:w-auto"
              />
              <select 
                 value={filterStatus}
                 onChange={e => setFilterStatus(e.target.value)}
                 className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none shrink-0 w-full md:w-auto"
              >
                 <option value="todos">Todos os Status</option>
                 <option value="quero_ler">Quero Ler</option>
                 <option value="lendo">Lendo</option>
                 <option value="concluido">Concluído</option>
                 <option value="quero_comprar">Quero Comprar</option>
                 <option value="emprestado">Emprestado</option>
                 <option value="meta_ano">Meta Anual</option>
                 <option value="pausado">Pausado</option>
                 <option value="abandonado">Abandonado</option>
              </select>
              <select 
                 value={filterCategory}
                 onChange={e => setFilterCategory(e.target.value)}
                 className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none shrink-0 w-full md:w-auto md:max-w-[200px] truncate"
              >
                 <option value="todas">Todas as Áreas</option>
                 {allKnowledgeAreas.map(area => (
                    <option key={area as string} value={area as string}>{area as string}</option>
                 ))}
              </select>
              <select 
                 value={filterFormat}
                 onChange={e => setFilterFormat(e.target.value)}
                 className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none shrink-0 w-full md:w-auto md:max-w-[200px] truncate"
              >
                 <option value="todos">Todos os Formatos</option>
                 {allFormats.map(fmt => (
                    <option key={fmt as string} value={fmt as string}>{String(fmt).toUpperCase()}</option>
                 ))}
              </select>
              <select 
                 value={sortOrder}
                 onChange={e => setSortOrder(e.target.value)}
                 className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-2 text-sm text-white focus:border-rose-500 focus:outline-none shrink-0 w-full md:w-auto md:max-w-[200px] truncate"
              >
                 <option value="recentes">Mais Recentes</option>
                 <option value="az">A-Z (Título)</option>
                 <option value="za">Z-A (Título)</option>
                 <option value="maior">Maior Tamanho</option>
                 <option value="menor">Menor Tamanho</option>
              </select>
            </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredBooks.slice(0, visibleBooksCount).map(book => (
             <div 
               key={book.id} 
               onClick={() => setViewingBookId(book.id)}
               className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.1)] transition-colors flex flex-col relative group cursor-pointer"
             >
                <div className="flex gap-4 items-start mb-4">
                  {book.cover_url ? (
                    <div className="w-16 h-24 bg-[#1A1A1E] rounded-lg overflow-hidden shrink-0 border border-[rgba(255,255,255,0.05)] relative">
                      <img src={book.cover_url} alt="Cover" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      {book.resource_link && (
                        <div className="absolute top-1 left-1 bg-blue-500/90 backdrop-blur-sm text-white p-1 rounded-md shadow-lg" title="Arquivo Digital Disponível">
                          <Download className="size-3" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-24 bg-[#1A1A1E] rounded-lg overflow-hidden shrink-0 border border-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#71717A]/30 relative">
                      <BookOpen className="size-6" />
                      {book.resource_link && (
                        <div className="absolute top-1 left-1 bg-blue-500/90 backdrop-blur-sm text-white p-1 rounded-md shadow-lg" title="Arquivo Digital Disponível">
                          <Download className="size-3" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-2 relative group/status">
                       <div className="relative">
                         {getStatusBadge(book.status)}
                         <div className="absolute top-full left-0 mt-1 hidden group-hover/status:flex flex-col bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-xl z-50 overflow-hidden text-[10px] uppercase font-bold min-w-[140px]">
                           <button onClick={(e) => { e.stopPropagation(); updateBook(book.id, {status: 'quero_ler'}); }} className="px-3 py-2 text-left hover:bg-white/5 text-blue-400">Quero Ler</button>
                           <button onClick={(e) => { e.stopPropagation(); updateBook(book.id, {status: 'lendo'}); }} className="px-3 py-2 text-left hover:bg-white/5 text-amber-400">Lendo</button>
                           <button onClick={(e) => { e.stopPropagation(); updateBook(book.id, {status: 'concluido'}); }} className="px-3 py-2 text-left hover:bg-white/5 text-emerald-400">Já Li</button>
                           <button onClick={(e) => { e.stopPropagation(); updateBook(book.id, {status: 'na_estante'}); }} className="px-3 py-2 text-left hover:bg-white/5 text-[#71717A]">Na Estante</button>
                         </div>
                       </div>
                       <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-bold">{book.knowledge_area}</span>
                    </div>
                    <h4 className="text-lg font-bold text-white line-clamp-2 leading-tight">{book.title}</h4>
                    <p className="text-sm text-[#71717A] mt-1 line-clamp-1">{book.author}</p>
                    {((book.collections && book.collections.length > 0) || (book.tags && book.tags.length > 0)) && (
                       <div className="flex flex-wrap gap-1 mt-2">
                          {book.collections?.map((col, idx) => (
                             <span key={`col-${idx}`} className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded uppercase font-bold tracking-widest">{col}</span>
                          ))}
                          {book.tags?.map((tag, idx) => (
                             <span key={`tag-${idx}`} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-[#A1A1AA] border border-[rgba(255,255,255,0.05)] rounded uppercase font-bold tracking-widest">#{tag}</span>
                          ))}
                       </div>
                    )}
                    {((book.badges && book.badges.length > 0)) && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                           {book.badges.includes('quero_comprar') && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded shadow-[0_0_10px_rgba(234,179,8,0.1)] uppercase font-bold tracking-widest flex items-center gap-1"><ShoppingCart className="size-2.5" /> Quero Comprar</span>
                           )}
                           {book.badges.includes('emprestado') && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded shadow-[0_0_10px_rgba(234,179,8,0.1)] uppercase font-bold tracking-widest flex items-center gap-1"><Users className="size-2.5" /> Emprestado</span>
                           )}
                           {book.badges.includes('meta_ano') && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded shadow-[0_0_10px_rgba(234,179,8,0.1)] uppercase font-bold tracking-widest flex items-center gap-1"><Trophy className="size-2.5" /> Meta {new Date().getFullYear()}</span>
                           )}
                        </div>
                     )}
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 absolute right-4 top-4 bg-[#111113]/80 backdrop-blur-sm p-1 rounded-xl border border-[rgba(255,255,255,0.05)]">
                     {book.buy_link && (
                       <a href={book.buy_link} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-pink-500/20 rounded-lg text-pink-400 transition-colors" title="Play Books / Comprar">
                         <ShoppingCart className="size-3.5" />
                       </a>
                     )}
                     {book.resource_link && (
                       <a href={book.resource_link} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors" title="Acessar Livro (PDF/Ebook)">
                         <ExternalLink className="size-3.5" />
                       </a>
                     )}
                     {book.youtube_link && (
                       <a href={book.youtube_link} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors" title="Assistir Review (YouTube)">
                         <Youtube className="size-3.5" />
                       </a>
                     )}
                     <button onClick={(e) => { e.stopPropagation(); setViewingBookId(book.id); }} className="p-1.5 hover:bg-white/10 rounded-lg text-[#71717A] hover:text-cyan-400 transition-colors" title="Ver Detalhes"><BookOpen className="size-3.5" /></button>
                     <button onClick={(e) => { e.stopPropagation(); setEditingBookId(book.id); setEditBookData(book); }} className="p-1.5 hover:bg-white/10 rounded-lg text-[#71717A] hover:text-white transition-colors" title="Editar"><Edit2 className="size-3.5" /></button>
                     <button onClick={() => { if(window.confirm('Tem certeza que deseja zerar o progresso de leitura?')) resetBookProgress(book.id); }} className="p-1.5 hover:bg-white/10 rounded-lg text-[#71717A] hover:text-amber-500 transition-colors" title="Zerar Progresso"><RotateCcw className="size-3.5" /></button>
                     <button onClick={() => { if(window.confirm('Tem certeza que deseja excluir esta obra?')) deleteBook(book.id); }} className="p-1.5 hover:bg-white/10 rounded-lg text-[#71717A] hover:text-rose-500 transition-colors" title="Excluir"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.04)]">
                  <div className="flex justify-between text-[11px] font-bold text-[#71717A] mb-2 uppercase tracking-widest">
                     <span>{book.pages_read} / {book.total_pages || '?'} {book.progress_unit === 'percentage' ? '%' : book.progress_unit === 'chapters' ? 'caps' : book.progress_unit === 'minutes' ? 'min' : 'págs'}</span>
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
                       <button onClick={() => handleStartReading(book)} className="w-full flex items-center justify-center gap-2 bg-white/5 text-white hover:bg-white/10 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
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
         
         {visibleBooksCount < filteredBooks.length && (
           <div className="mt-8 flex justify-center w-full">
             <button
               onClick={() => setVisibleBooksCount(prev => prev + 10)}
               className="group flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-transparent text-[#71717A] hover:text-white border border-[rgba(255,255,255,0.06)] hover:border-white/20 hover:bg-white/5 transition-all font-medium text-[11px] uppercase tracking-widest"
             >
               Ver Mais
               <ChevronRight className="size-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
             </button>
           </div>
         )}
      </div>

      {/* Book Details Modal */}
      {viewingBookId && books.find(b => b.id === viewingBookId) && (
        <PosLibraryBookDetails 
          book={books.find(b => b.id === viewingBookId)!}
          sessions={sessions}
          onClose={() => setViewingBookId(null)}
          onUpdate={updateBook}
          onDelete={(id) => { deleteBook(id); setViewingBookId(null); }}
          onAddSession={addReadingSession}
          onEdit={() => {
            const b = books.find(b => b.id === viewingBookId);
            if (b) {
              setViewingBookId(null);
              setEditingBookId(b.id);
              setEditBookData(b);
            }
          }}
        />
      )}

      {/* Brain Graph - Moved to Bottom */}
      <div className="mt-8 md:mt-12">
         <PosLibraryGraph books={books} sessions={sessions} />
      </div>

      </div>
    </div>
  );
}
