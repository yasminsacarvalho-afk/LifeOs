import React, { useState, useEffect, Fragment } from "react";
import { usePosStudies } from "@/hooks/use-pos-studies";
import { usePosLibrary } from "@/hooks/use-pos-library";
import { 
  GraduationCap, Plus, Play, BookOpen, Clock, Trophy, Flame, Target, 
  Trash2, Award, Zap, Brain, Calendar as CalendarIcon, CheckCircle2,
  ChevronDown, ChevronUp, Search, Filter, LayoutGrid, List as ListIcon,
  ChevronRight, BookMarked, Book, Sparkles, FileText, Library, CheckSquare,
  TrendingUp, BarChart2, Video, PenTool, LayoutTemplate, Layers, AlertCircle,
  MoreVertical, Share2, Star, FolderOpen, ArrowLeft, Download, X, UploadCloud, Loader2, ExternalLink, Link as LinkIcon, Pause, XCircle, Edit2, Camera, Headphones, Music, CloudRain, Minimize2, Maximize2, ArrowUpRight, Tag, LayoutPanelLeft, LayoutPanelTop, GripVertical, GripHorizontal, Settings2, MonitorPlay
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getSafeEmbedUrl, extractVideoMetadata, extractChannelMetadata, YouTubeVideoMetadata, YouTubeChannelMetadata } from "@/lib/youtube";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "./RichTextEditor";
import { VoiceRecordButton } from "@/components/ui/VoiceRecordButton";
import { YouTubeMetadataCard } from "./YouTubeMetadataCard";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

const KpiCard = ({ icon, label, value, sub }: any) => (
  <div className="bg-[#111113] p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] shadow-lg hover:border-[rgba(255,255,255,0.1)] transition-colors flex flex-col">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 bg-white/5 rounded-lg">{icon}</div>
      <span className="text-[10px] uppercase font-bold tracking-widest text-[#71717A] truncate">{label}</span>
    </div>
    <div className="text-xl font-black text-white">{value}</div>
    {sub && <div className="text-[10px] font-bold text-[#A1A1AA] mt-1">{sub}</div>}
  </div>
);

const getThumbnail = (url: string) => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
    return url;
  }
  return null;
};

export function PosStudies() {
  const { courses, sessions, loading, addCourse, updateCourse, deleteCourse, addSession } = usePosStudies();
  const { books, sessions: readingSessions } = usePosLibrary();
  const [activeTab, setActiveTab] = useState("Visão Geral");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => {
    try { const saved = localStorage.getItem('pos_selectedCourseId'); return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
  });
  const [desktopFocusMode, setDesktopFocusMode] = useState<"both" | "media" | "notes">(() => {
    try { const saved = localStorage.getItem('pos_desktopFocusMode'); return saved ? JSON.parse(saved) : "both"; } catch (e) { return "both"; }
  });
  const [courseTab, setCourseTab] = useState("Módulos");
  const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveModuleIndex(null);
  }, [selectedCourseId, courseTab]);

  useEffect(() => {
    // Reset workspace states when switching between courses/tracks
    setExpandedTopicId(null);
    setActiveTopicVideos([]);
  }, [selectedCourseId]);

  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [referenceModalTarget, setReferenceModalTarget] = useState<{ mIdx: number, tIdx: number } | null>(null);
  const [referenceSearchQuery, setReferenceSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterArea, setFilterArea] = useState("todas");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [expandedTopicId, setExpandedTopicId] = useState<number | string | null>(() => {
    try { const saved = localStorage.getItem('pos_expandedTopicId'); return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
  });
  const [workspaceLayoutMode, setWorkspaceLayoutMode] = useState<"horizontal" | "vertical">("horizontal");
  const [isLoggingSession, setIsLoggingSession] = useState(false);
  const [newSession, setNewSession] = useState({
    duration_minutes: 60,
    module_name: '',
    class_name: '',
    summary: ''
  });

  const [expandedChannelId, setExpandedChannelId] = useState<number | null>(null);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', cover_url: '' });
  const [isAddingVideoToChannel, setIsAddingVideoToChannel] = useState<number | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [activeTopicVideos, setActiveTopicVideos] = useState<any[]>(() => {
    try { const saved = localStorage.getItem('pos_activeTopicVideos'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try { const saved = localStorage.getItem('pos_isSidebarOpen'); return saved !== null ? JSON.parse(saved) : true; } catch (e) { return true; }
  });
  const [isWorkspaceHeaderOpen, setIsWorkspaceHeaderOpen] = useState(() => {
    try { const saved = localStorage.getItem('pos_isWorkspaceHeaderOpen'); return saved !== null ? JSON.parse(saved) : true; } catch (e) { return true; }
  });
  
  // Mobile Tab Navigation State for Workspace
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<"media" | "notes" | "resources">("notes");

  // Videoteca Workspace States
  const [activeVideotecaVideos, setActiveVideotecaVideos] = useState<any[]>(() => {
    try { const saved = localStorage.getItem('pos_activeVideotecaVideos'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
  });
  const [videotecaNotes, setVideotecaNotes] = useState('');
  const [videotecaTags, setVideotecaTags] = useState<string[]>([]);
  const [newVideotecaTag, setNewVideotecaTag] = useState('');
  const [isSelectingSecondVideo, setIsSelectingSecondVideo] = useState(false);
  const [activeSettingsTopicIdx, setActiveSettingsTopicIdx] = useState<number | null>(null);
  const [activeSettingsVideotecaIdx, setActiveSettingsVideotecaIdx] = useState<number | null>(null);

  const [videoMetadata, setVideoMetadata] = useState<YouTubeVideoMetadata | null>(null);
  const [channelMetadata, setChannelMetadata] = useState<YouTubeChannelMetadata | null>(null);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [metadataSearchUrl, setMetadataSearchUrl] = useState('');
  
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [dictionaryQuery, setDictionaryQuery] = useState('');

  const [activeTopicTimer, setActiveTopicTimer] = useState<string | number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isPomodoroMode, setIsPomodoroMode] = useState(() => {
    try { const saved = localStorage.getItem('pos_isPomodoroMode'); return saved ? JSON.parse(saved) : false; } catch (e) { return false; }
  });
  const [pomodoroTargetSeconds, setPomodoroTargetSeconds] = useState(25 * 60); // 25 min default
  const [localNotes, setLocalNotes] = useState("");
  const [localTags, setLocalTags] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { localStorage.setItem('pos_expandedTopicId', JSON.stringify(expandedTopicId)); }, [expandedTopicId]);
  useEffect(() => { localStorage.setItem('pos_activeTopicVideos', JSON.stringify(activeTopicVideos)); }, [activeTopicVideos]);
  useEffect(() => { localStorage.setItem('pos_isSidebarOpen', JSON.stringify(isSidebarOpen)); }, [isSidebarOpen]);
  useEffect(() => { localStorage.setItem('pos_isWorkspaceHeaderOpen', JSON.stringify(isWorkspaceHeaderOpen)); }, [isWorkspaceHeaderOpen]);
  useEffect(() => { localStorage.setItem('pos_activeVideotecaVideos', JSON.stringify(activeVideotecaVideos)); }, [activeVideotecaVideos]);
  useEffect(() => { localStorage.setItem('pos_isPomodoroMode', JSON.stringify(isPomodoroMode)); }, [isPomodoroMode]);
  
  useEffect(() => { 
    if (selectedCourseId) {
      localStorage.setItem('pos_selectedCourseId', JSON.stringify(selectedCourseId));
    } else {
      localStorage.removeItem('pos_selectedCourseId');
    }
  }, [selectedCourseId]);

  useEffect(() => { localStorage.setItem('pos_desktopFocusMode', JSON.stringify(desktopFocusMode)); }, [desktopFocusMode]);

  const syncChannelRef = React.useRef<BroadcastChannel | null>(null);

  // Sync workspace notes across tabs
  useEffect(() => {
    const channel = new BroadcastChannel('workspace_sync');
    syncChannelRef.current = channel;
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'SYNC_NOTES' && payload.topicId === expandedTopicId) {
        setLocalNotes(payload.notes);
      }
    };
    return () => {
      channel.close();
      if (syncChannelRef.current === channel) {
        syncChannelRef.current = null;
      }
    };
  }, [expandedTopicId]);

  // Derived state
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  const availableVideos = (() => {
    let vids: any[] = [];
    if (selectedCourse?.description) {
      try {
        const p = JSON.parse(selectedCourse.description);
        if (p.youtube_channels) {
          p.youtube_channels.forEach((ch:any) => {
            if (ch.videos) vids.push(...ch.videos.map((v:any) => ({...v, channelName: ch.name})));
          });
        }
      } catch(e){}
    }
    return vids;
  })();


  const [previewReference, setPreviewReference] = useState<any>(null);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);

  // Auto-save debounced for localNotes (Google Docs style)
  useEffect(() => {
    if (expandedTopicId === null || !selectedCourse) return;
    
    const timeoutId = setTimeout(() => {
       let currentMIdx = -1;
       let currentTIdx = -1;
       
       let mods: any[] = [];
       try { mods = typeof selectedCourse.next_topics === 'string' ? JSON.parse(selectedCourse.next_topics) : (selectedCourse.next_topics || []); } catch(e){}
       
       mods.forEach((mod: any, m: number) => {
         mod.topics?.forEach((top: any, t: number) => {
           if ((top.id || t) === expandedTopicId) {
             currentMIdx = m;
             currentTIdx = t;
           }
         });
       });
       
       if (currentMIdx !== -1 && currentTIdx !== -1) {
         const currentNotes = mods[currentMIdx].topics[currentTIdx].notes || "";
         if (currentNotes !== localNotes) {
            mods[currentMIdx].topics[currentTIdx].notes = localNotes;
            updateCourse(selectedCourse.id, { next_topics: JSON.stringify(mods) }, false);
         }
       }
    }, 1500);
    
    return () => clearTimeout(timeoutId);
  }, [localNotes, expandedTopicId, selectedCourse]);

  const handleSaveVideotecaNotes = () => {
     if (!selectedCourse || activeVideotecaVideos.length === 0) return;
     const primary = activeVideotecaVideos[0];
     if (primary.channelIdx === undefined || primary.videoIdx === undefined) return;

     let s: any = {};
     try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
     if (s.youtube_channels && s.youtube_channels[primary.channelIdx] && s.youtube_channels[primary.channelIdx].videos) {
         s.youtube_channels[primary.channelIdx].videos[primary.videoIdx].notes = videotecaNotes;
         s.youtube_channels[primary.channelIdx].videos[primary.videoIdx].tags = videotecaTags;
         updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
         toast.success("Anotações salvas com sucesso!");
     }
  };

  useEffect(() => {
    const handleRefClick = (e: any) => {
      if (e.detail.refType === 'video') {
         setActiveTopicVideos(prev => prev.some(v => v.url === e.detail.url) ? prev : [...prev, e.detail]);
      } else {
         setPreviewReference(e.detail);
      }
    };
    window.addEventListener('reference-click', handleRefClick as EventListener);
    return () => window.removeEventListener('reference-click', handleRefClick as EventListener);
  }, []);


  const availableBookQuotes = (() => {
    const quotes: any[] = [];
    readingSessions.forEach(rs => {
      if (rs.notes) {
        const b = books.find(book => book.id === rs.book_id);
        quotes.push({ id: `quote-${rs.id}`, book_id: rs.book_id, title: b ? b.title : 'Desconhecido', text: rs.notes });
      }
    });
    return quotes;
  })();


  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTopicTimer !== null && !isTimerPaused) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (isPomodoroMode && next >= pomodoroTargetSeconds) {
            // Pomodoro terminou!
            setIsTimerPaused(true);
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(e => console.log('Audio play failed', e));
            } catch(e) {}
            toast.success("🍅 Pomodoro concluído! Hora de uma pausa.", { icon: "🎉" });
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTopicTimer, isTimerPaused, isPomodoroMode, pomodoroTargetSeconds]);

  const initialCourseState = {
    title: "", knowledge_area: "Tecnologia", category: "Curso", status: "fila", platform: "", instructor: "", course_url: "",
    total_hours: 0, deadline: "", level: "intermediario"
  };
  const [newCourse, setNewCourse] = useState(initialCourseState);

  const handleMetadataSearch = async (url: string) => {
    if (!url) return;
    setIsSearchingMetadata(true);
    setVideoMetadata(null);
    setChannelMetadata(null);
    try {
      if (url.includes('/channel/') || url.includes('/@') || url.includes('/c/') || url.includes('/user/')) {
        const channel = await extractChannelMetadata(url);
        if (channel) {
          setChannelMetadata(channel);
          toast.success("Canal encontrado com sucesso!");
        }
      } else {
        const video = await extractVideoMetadata(url);
        if (video) {
          setVideoMetadata(video);
          toast.success("Vídeo encontrado com sucesso!");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao buscar informações do YouTube. Verifique sua chave de API.");
    } finally {
      setIsSearchingMetadata(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title) return;
    const coursePayload: any = { ...newCourse };
    if (!coursePayload.deadline) {
      delete coursePayload.deadline;
    }
    
    let success = false;
    if (isEditingCourse && selectedCourseId) {
      const res = await updateCourse(selectedCourseId, coursePayload);
      if (res !== false) success = true;
    } else {
      const res = await addCourse(coursePayload);
      if (res) success = true;
    }
    
    if (success) {
      setIsCreatingCourse(false);
      setIsEditingCourse(false);
      setNewCourse(initialCourseState);
    }
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    
    await addSession({
        course_id: selectedCourseId,
        session_date: format(new Date(), 'yyyy-MM-dd'),
        duration_minutes: newSession.duration_minutes,
        module_name: newSession.module_name,
        class_name: newSession.class_name,
        summary: newSession.summary
    });
    
    setIsLoggingSession(false);
    setNewSession({ duration_minutes: 60, module_name: '', class_name: '', summary: '' });
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>, modIdx: number, topicIdx: number) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourseId || !selectedCourse) return;

    setIsUploading(true);
    try {
      const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_UPLOADER_URL;
      if (!driveUrl) throw new Error("URL do Google Drive não configurada no ambiente.");

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const currentTopics = JSON.parse(selectedCourse.next_topics || '[]');
      const moduleTitle = currentTopics[modIdx]?.title || 'Módulo Geral';

      const response = await fetch(driveUrl, {
        method: "POST",
        body: JSON.stringify({
           base64: base64Data,
           filename: file.name,
           mimeType: file.type || 'application/octet-stream',
           path: ["Academia Operacional", selectedCourse.title, moduleTitle]
        }),
        headers: { 'Content-Type': 'text/plain' }
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      
      // Update the topic source with the Drive URL
      if (currentTopics[modIdx] && currentTopics[modIdx].topics[topicIdx]) {
         if (!currentTopics[modIdx].topics[topicIdx].materials) {
            currentTopics[modIdx].topics[topicIdx].materials = [];
         }
         currentTopics[modIdx].topics[topicIdx].materials.push({ name: file.name, url: result.url, type: 'file' });
         await updateCourse(selectedCourseId, { next_topics: JSON.stringify(currentTopics) });
         // toast.success is handled implicitly by updateCourse, but we can be explicit
      }

    } catch (err: any) {
      toast.error(`Falha ao subir arquivo para o Drive: ${err.message || "Erro desconhecido"}.`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleExportNotesToDrive = async () => {
    if (!selectedCourse) return;
    try {
      const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_UPLOADER_URL;
      if (!driveUrl) throw new Error("URL do Google Drive não configurada no ambiente.");
      toast.loading("Exportando anotações para o Drive...", { id: 'export-notes' });

      let htmlContent = `<html><head><meta charset="utf-8"><title>Anotações: ${selectedCourse.title}</title><style>body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; } h1 { color: #111; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; } h2 { color: #222; margin-top: 30px; } h3 { color: #444; } img { max-width: 100%; border-radius: 8px; } blockquote { border-left: 4px solid #e5e7eb; padding-left: 16px; color: #4b5563; }</style></head><body>`;
      htmlContent += `<h1>📘 ${selectedCourse.title}</h1>`;
      htmlContent += `<p><strong>Área:</strong> ${selectedCourse.knowledge_area} | <strong>Plataforma:</strong> ${selectedCourse.platform || 'N/A'}</p>`;
      
      let modules = [];
      try { modules = JSON.parse(selectedCourse.next_topics || '[]'); } catch(e){}
      
      let hasNotes = false;
      modules.forEach((mod: any) => {
         let modHtml = `<h2>📁 Módulo: ${mod.title}</h2>`;
         let hasModNotes = false;
         
         if (mod.topics) {
            mod.topics.forEach((topic: any) => {
               if (topic.notes && topic.notes.trim() !== '') {
                  hasNotes = true;
                  hasModNotes = true;
                  modHtml += `<h3>📝 Aula: ${topic.title}</h3>`;
                  if (topic.tags) modHtml += `<p><small>Tags: ${topic.tags}</small></p>`;
                  modHtml += `<div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">${topic.notes}</div>`;
               }
            });
         }
         if (hasModNotes) htmlContent += modHtml;
      });

      if (!hasNotes) {
         toast.error("Nenhuma anotação encontrada neste curso para exportar.", { id: 'export-notes' });
         return;
      }

      htmlContent += `</body></html>`;
      const base64Data = btoa(unescape(encodeURIComponent(htmlContent)));

      const response = await fetch(driveUrl, {
        method: "POST",
        body: JSON.stringify({
           base64: base64Data,
           filename: `Anotacoes_${selectedCourse.title.replace(/[^a-z0-9]/gi, '_')}.html`,
           mimeType: 'text/html',
           path: ["Academia Operacional", selectedCourse.title]
        }),
        headers: { 'Content-Type': 'text/plain' }
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      toast.success("Anotações exportadas para o Drive com sucesso!", { id: 'export-notes' });
    } catch (err: any) {
      console.error(err);
      toast.error(`Falha ao exportar anotações: ${err.message || "Erro desconhecido"}.`, { id: 'export-notes' });
    }
  };

  const totalXP = sessions.reduce((acc, s) => acc + (s.xp_earned || 0), 0);
  const userLevel = Math.floor(Math.sqrt(Math.max(0, totalXP) / 100)) + 1;
  const currentLevelXP = Math.pow(userLevel - 1, 2) * 100;
  const nextLevelXP = Math.pow(userLevel, 2) * 100;
  const levelProgress = Math.min(100, Math.max(0, Math.round(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100))) || 0;

  const totalHours = Number(courses.reduce((acc, c) => acc + (c.completed_hours || 0), 0).toFixed(1));
  const activeCoursesCount = courses.filter(c => c.status !== 'concluido').length;
  const completedCoursesCount = courses.filter(c => c.status === 'concluido').length;

  const activeCourses = courses.filter(c => c.status !== 'concluido');
  const recentCourses = activeCourses.filter(c => c.status === 'em_andamento');

  const getTabStats = () => {
    if (activeTab === "Visão Geral") return null;
    let tabCourses = [];
    if (activeTab === "Concluídos") {
       tabCourses = courses.filter(c => c.status === 'concluido');
    } else if (activeTab === "Cursos") {
       tabCourses = courses.filter(c => !['Faculdade', 'Disciplina', 'Certificação', 'Trilha', 'Projeto Acadêmico'].includes(c.category || '') && c.status !== 'concluido');
    } else if (activeTab === "Faculdade") {
       tabCourses = courses.filter(c => ['Faculdade', 'Disciplina'].includes(c.category || '') && c.status !== 'concluido');
    } else if (activeTab === "Certificações") {
       tabCourses = courses.filter(c => c.category === 'Certificação' && c.status !== 'concluido');
    } else if (activeTab === "Trilhas") {
       tabCourses = courses.filter(c => c.category === 'Trilha' && c.status !== 'concluido');
    } else if (activeTab === "Projetos") {
       tabCourses = courses.filter(c => c.category === 'Projeto Acadêmico' && c.status !== 'concluido');
    }
    
    const itemsCount = tabCourses.length;
    const tabHours = Number(tabCourses.reduce((acc, c) => acc + (c.completed_hours || 0), 0).toFixed(1));
    const tabTotalHours = Number(tabCourses.reduce((acc, c) => acc + (c.total_hours || 0), 0).toFixed(1));
    
    let totalTopics = 0;
    let completedTopics = 0;
    
    tabCourses.forEach(c => {
      const mods = JSON.parse(c.next_topics || '[]');
      mods.forEach((m: any) => {
        if (m.topics) {
          totalTopics += m.topics.length;
          completedTopics += m.topics.filter((t: any) => t.completed).length;
        }
      });
    });

    const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    
    const tabCourseIds = tabCourses.map(c => c.id);
    const tabSessions = sessions.filter(s => tabCourseIds.includes(s.course_id));
    const sessionsCount = tabSessions.length;
    const xpEarned = tabSessions.reduce((acc, s) => acc + (s.xp_earned || 0), 0);

    return { itemsCount, tabHours, tabTotalHours, totalTopics, completedTopics, completionRate, sessionsCount, xpEarned };
  };

  const tabStats = getTabStats();

  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Superior KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <KpiCard icon={<Zap className="size-4 text-cyan-400"/>} label="Nível" value={`Lvl ${userLevel}`} />
        <KpiCard icon={<Trophy className="size-4 text-yellow-400"/>} label="XP Total" value={totalXP} sub="Evolução Contínua" />
        <KpiCard icon={<Clock className="size-4 text-emerald-400"/>} label="Horas" value={`${totalHours}h`} sub="Estudadas" />
        <KpiCard icon={<Flame className="size-4 text-rose-500"/>} label="Sessões" value={sessions.length} sub="Registros" />
        <KpiCard icon={<BookOpen className="size-4 text-blue-400"/>} label="Ativos" value={activeCoursesCount} sub="Cursos" />
        <KpiCard icon={<Award className="size-4 text-purple-400"/>} label="Concluídos" value={completedCoursesCount} sub="Cursos" />
        <KpiCard icon={<Library className="size-4 text-orange-400"/>} label="Média" value="N/A" sub="Desempenho" />
        <KpiCard icon={<TrendingUp className="size-4 text-indigo-400"/>} label="Meta" value="60h" sub="Neste Mês" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Card de Evolução */}
        <div className="xl:col-span-2 bg-[#111113] rounded-3xl p-6 md:p-8 border border-[rgba(255,255,255,0.04)] shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[240px]">
          <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
            <Brain className="size-64 text-cyan-500" />
          </div>
          <div className="relative z-10 w-full max-w-2xl">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target className="size-5 text-rose-500" /> Meta de Evolução
                </h3>
                <p className="text-sm text-[#A1A1AA] mt-1">Evolua seu personagem consumindo conhecimento.</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-cyan-400">{totalXP}</span>
                <span className="text-sm font-bold text-[#A1A1AA]"> / {nextLevelXP} XP</span>
              </div>
            </div>
            
            <div className="h-4 w-full bg-[#1A1A1E] rounded-full overflow-hidden mb-2 border border-white/5 shadow-inner relative">
              <div 
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                style={{ width: `${levelProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-bold text-[#71717A] uppercase tracking-widest">
              <span>{levelProgress}% Concluído</span>
              <span>Nível {userLevel + 1} em breve</span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
               <div className="bg-[#1A1A1E] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                 <div>
                   <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Meta Mensal de Horas</div>
                   <div className="text-lg font-bold text-white mt-1">42h <span className="text-xs text-[#A1A1AA]">/ 60h</span></div>
                 </div>
                 <div className="size-10 rounded-full border-4 border-emerald-500/20 flex items-center justify-center border-t-emerald-500">
                    <span className="text-xs font-bold text-emerald-500">70%</span>
                 </div>
               </div>
               <div className="bg-[#1A1A1E] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                 <div>
                   <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Disciplinas Concluídas</div>
                   <div className="text-lg font-bold text-white mt-1">3 <span className="text-xs text-[#A1A1AA]">/ 8</span></div>
                 </div>
                 <div className="size-10 rounded-full border-4 border-rose-500/20 flex items-center justify-center border-t-rose-500">
                    <span className="text-xs font-bold text-rose-500">37%</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Insights & Metas */}
        <div className="bg-[#111113] rounded-3xl p-6 border border-[rgba(255,255,255,0.04)] shadow-xl flex flex-col">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-yellow-400" /> Insights & Lembretes
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
             <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-start">
               <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
               <div>
                 <div className="text-xs font-bold text-rose-400">Prova de Algoritmos</div>
                 <div className="text-[10px] text-rose-500/70 mt-0.5">Faltam 3 dias. Revise Árvores Binárias.</div>
               </div>
             </div>
             <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex gap-3 items-start">
               <TrendingUp className="size-4 text-cyan-500 shrink-0 mt-0.5" />
               <div>
                 <div className="text-xs font-bold text-cyan-400">Melhor Horário de Estudo</div>
                 <div className="text-[10px] text-cyan-500/70 mt-0.5">Você rende 40% mais entre as 20h e 22h.</div>
               </div>
             </div>
             <div className="p-3 bg-[#1A1A1E] border border-white/5 rounded-xl flex gap-3 items-start">
               <BookMarked className="size-4 text-[#A1A1AA] shrink-0 mt-0.5" />
               <div>
                 <div className="text-xs font-bold text-white">Curso Abandonado?</div>
                 <div className="text-[10px] text-[#A1A1AA] mt-0.5">Você não acessa "React Avançado" há 12 dias.</div>
               </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Continuar Aprendendo (Real Data) */}
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Play className="size-5 text-emerald-500" /> Continuar Aprendendo
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {recentCourses.length === 0 ? (
           <div className="col-span-full p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm">
             Nenhum curso em andamento no momento. Inicie uma trilha!
           </div>
         ) : recentCourses.map((c) => {
           const percent = c.total_hours ? Math.min(100, Math.round((c.completed_hours / c.total_hours) * 100)) : 0;
           return (
             <div key={c.id} onClick={() => setSelectedCourseId(c.id)} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all group cursor-pointer shadow-lg flex flex-col">
               <div className="h-24 w-full relative overflow-hidden bg-gradient-to-br from-[#1A1A1E] to-[#111113] flex items-center justify-center">
                 <div className="absolute inset-0 bg-gradient-to-t from-[#111113] to-transparent z-10"></div>
                 {(() => {
                    try {
                      const p = JSON.parse(c.description || '{}');
                      if (p.cover_url) return <img src={p.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500 z-0" />;
                    } catch(e) {}
                    return <GraduationCap className="size-10 text-cyan-500/20 group-hover:scale-110 transition-transform duration-500 z-0" />;
                 })()}
                 <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2">
                   <span className="px-2 py-0.5 bg-cyan-500/20 backdrop-blur-md rounded border border-cyan-500/30 text-[9px] font-bold text-cyan-400 uppercase tracking-wider">{c.knowledge_area || "Área"}</span>
                   <span className="px-2 py-0.5 bg-black/50 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider">{c.platform || "Plataforma"}</span>
                 </div>
               </div>
               <div className="p-5 flex-1 flex flex-col">
                 <h4 className="font-bold text-white text-lg leading-tight mb-1 line-clamp-2">{c.title}</h4>
                 <p className="text-xs text-[#A1A1AA] mb-3 flex items-center gap-1.5"><PenTool className="size-3" /> {c.instructor || "Professor"}</p>
                 
                 {(() => {
                   try {
                     const sched = JSON.parse(c.description || '{}');
                     if (sched.days && sched.days.length > 0) {
                       const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                       const daysStr = sched.days.map((d:number) => dayNames[d]).join(', ');
                       return (
                         <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-bold mb-4 bg-purple-500/10 w-fit px-2 py-1 rounded border border-purple-500/20">
                           <CalendarIcon className="size-3"/> 
                           {daysStr} às {sched.time || '19:00'}
                         </div>
                       );
                     }
                   } catch(e) {}
                   return null;
                 })()}

                 <div className="mt-auto">
                   <div className="flex justify-between items-end mb-2">
                     <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">{c.completed_hours}h / {c.total_hours}h</div>
                     <div className="text-xs font-bold text-cyan-400">{percent}%</div>
                   </div>
                   <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden mb-4">
                     <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percent}%` }}></div>
                   </div>
                   <button onClick={() => {
                     setSelectedCourseId(c.id);
                     setIsLoggingSession(true);
                   }} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-white transition-all flex items-center justify-center gap-2">
                     <Play className="size-3 fill-white" /> Continuar Curso
                   </button>
                 </div>
               </div>
             </div>
           );
         })}
      </div>
    </div>
  );

  const renderIntelligenceReport = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="bg-[#0A0A0A] p-6 md:p-10 rounded-3xl border border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-[120px] w-96 h-96 rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <Brain className="size-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Inteligência sobre você</h2>
            <p className="text-sm text-indigo-400 font-bold uppercase tracking-widest mt-1">Relatório semanal de aprendizagem</p>
          </div>
        </div>

        <div className="bg-[#111113] border border-white/5 p-6 rounded-2xl mb-8 relative z-10">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><CalendarIcon className="size-4 text-[#A1A1AA]"/> Todo domingo:</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-[#1A1A1E] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
               <Clock className="size-6 text-cyan-400 mb-2" />
               <span className="text-2xl font-black text-white">6h20</span>
               <span className="text-xs text-[#A1A1AA] font-bold uppercase mt-1">Estudadas</span>
            </div>
            <div className="bg-[#1A1A1E] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
               <Brain className="size-6 text-purple-400 mb-2" />
               <span className="text-2xl font-black text-white">43</span>
               <span className="text-xs text-[#A1A1AA] font-bold uppercase mt-1">Conceitos<br/>Aprendidos</span>
            </div>
            <div className="bg-[#1A1A1E] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
               <CheckSquare className="size-6 text-emerald-400 mb-2" />
               <span className="text-2xl font-black text-white">81</span>
               <span className="text-xs text-[#A1A1AA] font-bold uppercase mt-1">Questões<br/>Respondidas</span>
            </div>
            <div className="bg-[#1A1A1E] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
               <Target className="size-6 text-blue-400 mb-2" />
               <span className="text-2xl font-black text-white">76%</span>
               <span className="text-xs text-[#A1A1AA] font-bold uppercase mt-1">De Acerto</span>
            </div>
            <div className="bg-[#1A1A1E] p-4 rounded-xl border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)] flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
               <Flame className="size-6 text-orange-500 mb-2" />
               <span className="text-2xl font-black text-orange-400">7 dias</span>
               <span className="text-xs text-orange-500/80 font-bold uppercase mt-1">Consecutivos</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6">
            <Sparkles className="size-4 text-amber-400" /> E principalmente:
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0 w-fit"><TrendingUp className="size-5 text-emerald-400" /></div>
              <div>
                <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-widest mb-2">Evolução Máxima</h4>
                <p className="text-white text-sm">Você está evoluindo mais em <span className="font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">Lógica de Programação</span>.</p>
              </div>
            </div>
            
            <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex flex-col gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg shrink-0 w-fit"><AlertCircle className="size-5 text-rose-400" /></div>
              <div>
                <h4 className="font-bold text-rose-400 text-xs uppercase tracking-widest mb-2">Ponto de Atenção</h4>
                <p className="text-white text-sm">Seu maior ponto fraco é <span className="font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">Gestão de Tempo</span>.</p>
              </div>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex flex-col gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg shrink-0 w-fit"><CheckCircle2 className="size-5 text-amber-400" /></div>
              <div>
                <h4 className="font-bold text-amber-400 text-xs uppercase tracking-widest mb-2">Negligência Detectada</h4>
                <p className="text-white text-sm">Você está negligenciando <span className="font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">Revisão Ativa</span>.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCoursesList = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
         <div className="relative w-full max-w-md">
           <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
           <input 
             type="text" 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Buscar cursos, áreas, etc..." 
             className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
           />
         </div>
         <div className="flex gap-2 relative">
            <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={cn("px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111113] text-xs font-bold text-white hover:bg-[#1A1A1E] flex items-center gap-2", showFilterMenu && "bg-[#1A1A1E] border-cyan-500/30")}>
              <Filter className="size-3" /> Filtros {(filterStatus !== "todos" || filterArea !== "todas") && <span className="w-2 h-2 rounded-full bg-cyan-500 ml-1 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>}
            </button>
            {showFilterMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest px-2 py-1 mb-1">Status</div>
                 <button onClick={() => { setFilterStatus("todos"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", filterStatus === "todos" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}>Todos</button>
                 <button onClick={() => { setFilterStatus("em_andamento"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", filterStatus === "em_andamento" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}>Em Andamento</button>
                 <button onClick={() => { setFilterStatus("fila"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", filterStatus === "fila" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}>Na Fila</button>
                 <button onClick={() => { setFilterStatus("pausado"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", filterStatus === "pausado" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}>Pausados</button>
                 
                 <div className="h-px bg-white/5 w-full my-2"></div>
                 
                 <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest px-2 py-1 mb-1">Área</div>
                 <button onClick={() => { setFilterArea("todas"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", filterArea === "todas" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}>Todas as Áreas</button>
                 <button onClick={() => { setFilterArea("Tecnologia"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", filterArea === "Tecnologia" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}>Tecnologia</button>
                 <button onClick={() => { setFilterArea("Negócios"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", filterArea === "Negócios" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}>Negócios</button>
                 <button onClick={() => { setFilterArea("Finanças"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", filterArea === "Finanças" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}>Finanças</button>
                 <button onClick={() => { setFilterArea("Idiomas"); setShowFilterMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", filterArea === "Idiomas" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}>Idiomas</button>
              </div>
            )}
          </div>
       </div>

       {activeTab === "Trilhas" ? (
         <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {(() => {
              const trilhas = courses.filter(c => {
                 const searchMatch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.knowledge_area?.toLowerCase().includes(searchQuery.toLowerCase());
                 if (!searchMatch) return false;
                 if (filterStatus !== "todos" && c.status !== filterStatus) return false;
                 if (filterArea !== "todas" && c.knowledge_area !== filterArea) return false;
                 return c.category === 'Trilha' && c.status !== 'concluido';
              });

              // Group by knowledge_area
              const grouped = trilhas.reduce((acc, course) => {
                 const area = course.knowledge_area || 'Outras Áreas';
                 if (!acc[area]) acc[area] = [];
                 acc[area].push(course);
                 return acc;
              }, {} as Record<string, typeof courses>);

              if (Object.keys(grouped).length === 0) {
                 return <div className="p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm">Nenhuma trilha encontrada.</div>;
              }

              
              return Object.entries(grouped).map(([area, areaCourses]) => (
                 <div key={area} className="space-y-4">
                    <h3 className="text-xl md:text-2xl font-black text-white px-3 border-l-4 border-cyan-500 flex items-center gap-2">
                      
                       {area} <span className="text-xs font-bold text-[#71717A] bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{areaCourses.length}</span>
                    </h3>
                    <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x snap-mandatory">
                       {areaCourses.map(course => {
                          const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
                          return (
                            <div 
                              key={course.id} 
                              onClick={() => setSelectedCourseId(course.id)}
                              className="snap-start shrink-0 w-[280px] md:w-[320px] bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all group cursor-pointer shadow-lg flex flex-col"
                            >
                              <div className="h-40 w-full relative overflow-hidden bg-gradient-to-br from-[#1A1A1E] to-[#111113] flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-transparent to-transparent z-10"></div>
                                {(() => {
                                   try {
                                     const p = JSON.parse(course.description || '{}');
                                     if (p.cover_url) return <img src={p.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 z-0" />;
                                   } catch(e) {}
                                   return <GraduationCap className="size-12 text-cyan-500/20 group-hover:scale-125 transition-transform duration-700 z-0" />;
                                })()}
                                <div className="absolute top-3 right-3 z-20">
                                    <button className="text-[#A1A1AA] hover:text-white bg-black/50 p-1.5 rounded-md backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all"><MoreVertical className="size-4" /></button>
                                </div>
                                <div className="absolute bottom-3 left-4 z-20 flex flex-col items-start gap-1">
                                  {course.instructor && (
                                      <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider">{course.instructor}</span>
                                  )}
                                  <span className="px-2 py-0.5 bg-cyan-500/20 backdrop-blur-md rounded border border-cyan-500/30 text-[9px] font-bold text-cyan-400 uppercase tracking-wider">Trilha</span>
                                </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-[#111113] to-[#0A0A0C]">
                                <h4 className="font-bold text-white text-base leading-tight mb-4 group-hover:text-cyan-400 transition-colors line-clamp-2">{course.title}</h4>
                                <div className="mt-auto">
                                  <div className="flex justify-between items-end mb-2">
                                    <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">{course.completed_hours}h / {course.total_hours}h</div>
                                    <div className="text-xs font-bold text-cyan-400">{percent}%</div>
                                  </div>
                                  <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden mb-2">
                                    <div className="h-full bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${percent}%` }}></div>
                                  </div>
                                </div>
                                </div>
                            </div>
                          );
                       })}
                    </div>
                 </div>
              ));
            })()}
         </div>
       ) : (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
         {courses.filter(c => {
             const searchMatch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.knowledge_area?.toLowerCase().includes(searchQuery.toLowerCase());
             if (!searchMatch) return false;
             
             if (filterStatus !== "todos" && c.status !== filterStatus && activeTab !== "Concluídos") return false;
             if (filterArea !== "todas" && c.knowledge_area !== filterArea) return false;
             
             if (activeTab === "Cursos") return !['Faculdade', 'Disciplina', 'Certificação', 'Trilha', 'Projeto Acadêmico'].includes(c.category || '') && c.status !== 'concluido';
             if (activeTab === "Faculdade") return ['Faculdade', 'Disciplina'].includes(c.category || '') && c.status !== 'concluido';
             if (activeTab === "Certificações") return c.category === 'Certificação' && c.status !== 'concluido';
             if (activeTab === "Trilhas") return false; // This case is already handled above
             if (activeTab === "Projetos") return c.category === 'Projeto Acadêmico' && c.status !== 'concluido';
             if (activeTab === "Concluídos") return c.status === 'concluido';
             
             return true;
         }).map(course => {
            const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
            const isCompleted = course.status === 'concluido';
            return (
              <div 
                key={course.id} 
                onClick={() => setSelectedCourseId(course.id)}
                className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all group cursor-pointer shadow-lg flex flex-col"
              >
                <div className="h-24 w-full relative overflow-hidden bg-gradient-to-br from-[#1A1A1E] to-[#111113] flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111113] to-transparent z-10"></div>
                  {(() => {
                     try {
                       const p = JSON.parse(course.description || '{}');
                       if (p.cover_url) return <img src={p.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500 z-0" />;
                     } catch(e) {}
                     return <GraduationCap className="size-10 text-cyan-500/20 group-hover:scale-110 transition-transform duration-500 z-0" />;
                  })()}
                  <div className="absolute top-3 right-3 z-20">
                     <button className="text-[#71717A] hover:text-white bg-black/50 p-1 rounded-md backdrop-blur-md border border-white/10"><MoreVertical className="size-4" /></button>
                  </div>
                  <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 backdrop-blur-md rounded border text-[9px] font-bold uppercase tracking-wider",
                      isCompleted ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/20" : "text-cyan-400 border-cyan-500/30 bg-cyan-500/20"
                    )}>
                      {course.knowledge_area || "Área"}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="font-bold text-white text-base leading-tight mb-4">{course.title}</h4>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between items-end mb-2">
                      <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">{course.completed_hours}h / {course.total_hours}h</div>
                      <div className="text-xs font-bold text-white">{percent}%</div>
                    </div>
                    <div className="h-1 w-full bg-[#1A1A1E] rounded-full overflow-hidden mb-4">
                      <div className={cn("h-full rounded-full", isCompleted ? "bg-emerald-500" : "bg-cyan-500")} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
         })}
       </div>
       )}
    </div>
  );

  const renderCourseDetails = () => {
    if (!selectedCourse) return null;
    const percent = selectedCourse.total_hours ? Math.min(100, Math.round((selectedCourse.completed_hours / selectedCourse.total_hours) * 100)) : 0;
    
    let coverUrl = "";
    try { const p = JSON.parse(selectedCourse.description || '{}'); coverUrl = p.cover_url || ""; } catch(e){}

    return (
      <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col min-h-screen">
        
        {/* Universal Top Controls: Back Button and Sub-tabs */}
        <div className="flex flex-col gap-4 mb-6">
           <button onClick={() => setSelectedCourseId(null)} className="flex items-center gap-2 text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors w-fit">
             <ArrowLeft className="size-4" /> Voltar para Trilha
           </button>
           <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-2 overflow-x-auto hide-scrollbar">
              {["Visão Geral", "Módulos", "Videoteca", "Diário de Bordo", "Inteligência Artificial"].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setCourseTab(tab)}
                  className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap", courseTab === tab ? "bg-white/10 text-white" : "text-[#71717A] hover:text-white")}
                >
                  {tab === "Inteligência Artificial" ? <span className="flex items-center gap-2"><Sparkles className="size-4 text-cyan-400" /> IA</span> : 
                   tab === "Videoteca" ? <span className="flex items-center gap-2"><Video className="size-4 text-rose-500" /> {tab}</span> : tab}
                </button>
              ))}
           </div>
        </div>

        <div className={courseTab === "Visão Geral" ? "w-full" : "flex flex-col lg:flex-row gap-6 items-start"}>
          <div className="flex-1 w-full flex flex-col gap-6">
            {courseTab !== "Visão Geral" && (
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl overflow-hidden shadow-2xl mb-6 relative group">
             {/* Background Cover Image with Gradients */}
             {coverUrl ? (
               <>
                 <div className="absolute inset-0 z-0">
                   <img src={coverUrl} alt="Cover" className="w-full h-full object-cover opacity-60" />
                 </div>
                 <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#111113] via-[#111113]/80 to-transparent"></div>
                 <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#111113] to-transparent"></div>
               </>
             ) : (
               <div className="absolute top-0 right-0 p-32 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
             )}

             <div className="relative z-10 p-6 md:p-10 pt-16 md:pt-20">
               {/* Rest of Header Info */}
               <div className="flex gap-2 mb-4">
                 <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm shadow-lg">{selectedCourse.knowledge_area}</span>
                 <span className="px-3 py-1 bg-black/50 border border-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm shadow-lg">{selectedCourse.category}</span>
               </div>
               
               <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                 <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl drop-shadow-xl">
                   {selectedCourse.title}
                 </h1>
                 <div className="flex items-center gap-2 relative z-20 shrink-0 mt-2 md:mt-0">
                   <button 
                     onClick={() => {
                       setNewCourse(selectedCourse as any);
                       setIsEditingCourse(true);
                       setIsCreatingCourse(true);
                     }} 
                     className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-cyan-400 border border-white/10 transition-colors shadow-lg"
                     title="Editar Curso"
                   >
                     <PenTool className="size-4" />
                   </button>
                   <button 
                     onClick={async () => {
                       if (confirm("Tem certeza que deseja excluir este curso?")) {
                         await deleteCourse(selectedCourse.id);
                         setSelectedCourseId(null);
                       }
                     }} 
                     className="p-2.5 bg-rose-500/20 hover:bg-rose-500/30 backdrop-blur-md rounded-xl text-rose-400 border border-rose-500/20 transition-colors shadow-lg"
                     title="Excluir Curso"
                   >
                     <Trash2 className="size-4" />
                   </button>
                 </div>
               </div>
               
               <div className="flex flex-wrap gap-4 mb-8">
                 <div className="flex items-center gap-1.5 text-xs font-bold text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm"><PenTool className="size-3.5 text-cyan-500"/> {selectedCourse.instructor || "Sem instrutor"}</div>
                 <div className="flex items-center gap-1.5 text-xs font-bold text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm"><LayoutTemplate className="size-3.5 text-emerald-500"/> {selectedCourse.platform || "Desconhecida"}</div>
                 <div className="flex items-center gap-1.5 text-xs font-bold text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm"><Clock className="size-3.5 text-rose-500"/> {selectedCourse.total_hours}h totais</div>
                 {(() => {
                   try {
                     const sched = JSON.parse(selectedCourse.description || '{}');
                     if (sched.days && sched.days.length > 0) {
                       const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                       const daysStr = sched.days.map((d:number) => dayNames[d]).join(', ');
                       return (
                         <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 backdrop-blur-sm">
                           <CalendarIcon className="size-3.5"/> 
                           {daysStr} às {sched.time || '19:00'}
                         </div>
                       );
                     }
                   } catch(e) {
                     if (selectedCourse.description) {
                       return <div className="flex items-center gap-1.5 text-xs font-bold text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm"><CalendarIcon className="size-3.5 text-purple-500"/> {selectedCourse.description}</div>
                     }
                   }
                   return null;
                 })()}
                 {selectedCourse.course_url && (
                   <a href={selectedCourse.course_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-white bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm transition-colors font-bold z-20 relative">
                     <Play className="size-3.5 text-cyan-400"/> Acessar Plataforma
                   </a>
                 )}
               </div>

                <div className="flex items-center gap-4 bg-black/50 p-4 rounded-2xl border border-white/10 backdrop-blur-md flex-wrap mt-auto">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Progresso Geral</span>
                      <span className="text-sm font-bold text-white">{percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#1A1A1E] rounded-full overflow-hidden shadow-inner border border-white/5">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                  <button onClick={() => setIsLoggingSession(true)} className="shrink-0 w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all">
                    <Play className="size-4 fill-white" /> Registrar Sessão
                  </button>
                </div>
             </div>
          </div>
        )}

            {/* Sub-tab content real sessions */}
             {courseTab === "Visão Geral" && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {/* Minimal Header for Visão Geral Context */}
                  <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 pb-4 border-b border-white/5">
                    <div>
                      <h1 className="text-3xl font-black text-white drop-shadow-md">{selectedCourse.title}</h1>
                      <div className="flex gap-2 mt-3">
                         <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold uppercase tracking-widest">{selectedCourse.knowledge_area}</span>
                         <span className="px-2.5 py-1 bg-[#1A1A1E] text-[#A1A1AA] rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/5">{selectedCourse.category}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleExportNotesToDrive}
                        className="p-2 bg-[#111113] hover:bg-[#1A1A1E] rounded-xl text-emerald-400 border border-emerald-500/20 transition-colors shadow-sm"
                        title="Exportar Anotações para o Drive"
                      >
                        <UploadCloud className="size-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setNewCourse(selectedCourse as any);
                          setIsEditingCourse(true);
                          setIsCreatingCourse(true);
                        }} 
                        className="p-2 bg-[#1A1A1E] hover:bg-[#27272A] rounded-xl text-cyan-400 border border-white/5 transition-colors shadow-sm"
                        title="Editar Curso"
                      >
                        <PenTool className="size-4" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm("Tem certeza que deseja excluir este curso?")) {
                            await deleteCourse(selectedCourse.id);
                            setSelectedCourseId(null);
                          }
                        }} 
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-500 border border-rose-500/10 transition-colors shadow-sm"
                        title="Excluir Curso"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Top Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {/* Metric 1: Tempo Investido */}
                     <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="text-[10px] uppercase font-bold text-[#A1A1AA] flex items-center gap-1.5"><Clock className="size-3 text-cyan-500" /> Tempo Gasto</div>
                        <div className="text-2xl font-black text-white mt-2">{selectedCourse.completed_hours}h</div>
                     </div>
                     
                     {/* Metric 2: Dias Ativos */}
                     <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-4 flex flex-col justify-between">
                        <div className="text-[10px] uppercase font-bold text-[#A1A1AA] flex items-center gap-1.5"><CalendarIcon className="size-3 text-cyan-500" /> Dias Ativos</div>
                        <div className="text-2xl font-black text-white mt-2">
                          {new Set(sessions.filter(s => s.course_id === selectedCourse.id).map(s => s.session_date)).size}
                        </div>
                     </div>
                     
                     {/* Metric 3: Tópicos Batidos */}
                     <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-4 flex flex-col justify-between">
                        <div className="text-[10px] uppercase font-bold text-[#A1A1AA] flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /> Tópicos Batidos</div>
                        <div className="text-2xl font-black text-white mt-2">
                          {(() => {
                             let count = 0;
                             try {
                               const mods = JSON.parse(selectedCourse.next_topics || '[]');
                               mods.forEach((m:any) => { count += m.topics?.filter((t:any) => t.status === 'concluido').length || 0; });
                             } catch(e){}
                             return count;
                          })()}
                        </div>
                     </div>
                     
                     {/* Metric 4: XP Acumulado */}
                     <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-4 flex flex-col justify-between">
                        <div className="text-[10px] uppercase font-bold text-[#A1A1AA] flex items-center gap-1.5"><Zap className="size-3 text-yellow-500" /> XP Ganho</div>
                        <div className="text-2xl font-black text-white mt-2">
                          {sessions.filter(s => s.course_id === selectedCourse.id).reduce((acc, s) => acc + (s.xp_earned || 0), 0)}
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Left Column: O que já aprendi */}
                    <div className="flex flex-col space-y-6">
                      <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg">
                         <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Brain className="size-4 text-cyan-500" /> Conhecimento Adquirido (O que já aprendi)
                         </h4>
                         <div className="flex flex-col gap-2">
                           {(() => {
                              let tags = new Set<string>();
                              let topics: string[] = [];
                              try {
                                const mods = JSON.parse(selectedCourse.next_topics || '[]');
                                mods.forEach((m:any) => { 
                                  m.topics?.filter((t:any) => t.status === 'concluido').forEach((t:any) => {
                                    topics.push(t.title);
                                    if (t.tags) {
                                       t.tags.split(',').forEach((tag: string) => tags.add(tag.trim().toLowerCase()));
                                    }
                                  });
                                });
                              } catch(e){}
                              
                              if (topics.length === 0) return <span className="text-xs text-[#A1A1AA] italic">Nenhum tópico concluído ainda. Volte à aba Módulos e comece a avançar!</span>;
                              
                              return (
                                <>
                                  <div className="w-full mb-3 flex flex-wrap gap-1.5">
                                    {Array.from(tags).filter(t => t).map(tag => (
                                      <span key={tag} className="px-2 py-1 bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">#{tag}</span>
                                    ))}
                                  </div>
                                  <ul className="space-y-2 w-full mt-2">
                                    {topics.map((t, idx) => (
                                      <li key={idx} className="text-sm text-[#A1A1AA] flex items-center gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:bg-emerald-500 before:rounded-full">
                                        {t}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              );
                           })()}
                         </div>
                      </div>
                      
                      <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg">
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Target className="size-4 text-cyan-500" /> Projeção de Conclusão
                        </h4>
                        {(() => {
                          const diasAtivos = new Set(sessions.filter(s => s.course_id === selectedCourse.id).map(s => s.session_date)).size;
                          if (diasAtivos < 2 || !selectedCourse.total_hours) {
                            return <div className="text-xs text-[#A1A1AA] p-4 bg-[#1A1A1E] rounded-xl border border-[rgba(255,255,255,0.02)]">Estude por pelo menos 2 dias e garanta que o curso tenha uma "Carga Horária Total" cadastrada para a I.A. calcular sua projeção de fim.</div>;
                          }
                          const avgHoursPerDay = selectedCourse.completed_hours / diasAtivos;
                          const remainingHours = selectedCourse.total_hours - selectedCourse.completed_hours;
                          const projectedDays = Math.ceil(remainingHours / avgHoursPerDay);
                          
                          return (
                            <div className="flex flex-col gap-3 p-4 bg-[#1A1A1E] rounded-xl border border-[rgba(255,255,255,0.02)]">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-[#A1A1AA]">Ritmo Atual de Estudo:</span>
                                <span className="text-white font-bold">{avgHoursPerDay.toFixed(1)}h / dia ativo</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-[#A1A1AA]">Previsão de Fim:</span>
                                <span className="text-cyan-400 font-bold">~ {projectedDays} sessões restantes</span>
                              </div>
                              <div className="w-full bg-[#111113] h-2 rounded-full mt-2 overflow-hidden border border-[rgba(255,255,255,0.02)]">
                                <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (selectedCourse.completed_hours / selectedCourse.total_hours)*100)}%` }}></div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Right Column: Setup & Info */}
                    <div className="flex flex-col space-y-6">
                      
                      {(() => {
                         let goals = "";
                         try { goals = JSON.parse(selectedCourse.description || '{}').goals || ""; } catch(e){}
                         if (goals) {
                           return (
                             <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg">
                               <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                 <Target className="size-4 text-rose-500" /> Metas do Estudo
                               </h4>
                               <p className="text-sm text-[#A1A1AA] whitespace-pre-wrap">{goals}</p>
                             </div>
                           );
                         }
                         return null;
                      })()}
                      
                      <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg">
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                          <CalendarIcon className="size-4 text-purple-500" /> Planejamento (Agenda)
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayStr, idx) => {
                               let sched = { days: [] as number[], time: "19:00" };
                               try { const p = JSON.parse(selectedCourse.description || '{}'); if (p.days) sched = p; } catch(e){}
                               const isSelected = sched.days.includes(idx);
                               return (
                                 <button 
                                   key={idx} type="button" 
                                   onClick={async () => {
                                      let s = { days: [] as number[], time: "19:00" };
                                      try { const p = JSON.parse(selectedCourse.description || '{}'); if (p.days) s = p; } catch(e){}
                                      if (s.days.includes(idx)) s.days = s.days.filter((d:number) => d !== idx);
                                      else s.days.push(idx);
                                      await updateCourse(selectedCourse.id, { description: JSON.stringify(s) });
                                   }}
                                   className={cn("w-full aspect-square sm:aspect-auto sm:h-9 rounded-lg text-[9px] sm:text-[10px] flex items-center justify-center font-bold transition-all border", isSelected ? "bg-purple-500 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "bg-[#1A1A1E] text-[#71717A] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2]")}
                                 >
                                   <span className="hidden sm:inline">{dayStr}</span>
                                   <span className="sm:hidden">{dayStr.charAt(0)}</span>
                                 </button>
                               )
                            })}
                          </div>
                          <div className="relative">
                             <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#71717A]" />
                             <input type="time" 
                               value={(() => { try { const p = JSON.parse(selectedCourse.description || '{}'); return p.time || "19:00"; } catch(e){ return "19:00"; } })()}
                               onChange={async e => {
                                 let s = { days: [] as number[], time: "19:00" };
                                 try { const p = JSON.parse(selectedCourse.description || '{}'); if (p.days) s = p; } catch(e){}
                                 s.time = e.target.value;
                                 await updateCourse(selectedCourse.id, { description: JSON.stringify(s) });
                               }}
                               className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white focus:border-purple-500 focus:outline-none transition-colors"
                             />
                          </div>
                          <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
                            As sessões aparecerão automaticamente na <b>Agenda Inteligente</b> nestes dias.
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg h-full">
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                          <LinkIcon className="size-4 text-cyan-500" /> Links & Acessos
                        </h4>
                        <div className="space-y-4">
                          {selectedCourse.course_url ? (
                            <a href={selectedCourse.course_url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between p-3 bg-[#1A1A1E] hover:bg-[#27272A] rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-colors group">
                              <span className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300">Plataforma do Curso</span>
                              <ExternalLink className="size-3 text-cyan-500" />
                            </a>
                          ) : (
                            <span className="text-xs text-[#71717A] italic block p-3 bg-[#1A1A1E] rounded-xl border border-[rgba(255,255,255,0.02)]">Nenhum link principal (Plataforma) configurado.</span>
                          )}
                          
                          {/* General Source list from ALL topics (if any) */}
                          <div className="border-t border-[rgba(255,255,255,0.04)] pt-4">
                            <h5 className="text-[10px] text-[#A1A1AA] uppercase font-bold mb-3 tracking-widest">Recursos Fixados das Aulas</h5>
                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                              {(() => {
                                let allSources: {title: string, url: string, tag: string}[] = [];
                                try {
                                  const mods = JSON.parse(selectedCourse.next_topics || '[]');
                                  mods.forEach((m:any) => { 
                                    m.topics?.filter((t:any) => t.source).forEach((t:any) => {
                                      allSources.push({ title: t.title, url: t.source, tag: m.title });
                                    });
                                  });
                                } catch(e){}
                                
                                if (allSources.length === 0) return <span className="text-[10px] text-[#71717A] italic block p-3 bg-[#1A1A1E] rounded-lg border border-[rgba(255,255,255,0.02)]">Nenhum material anexado nas aulas. Vá na aba Módulos e faça o Upload/Link.</span>;
                                
                                return allSources.map((src, i) => (
                                  <a key={i} href={src.url.startsWith('http') ? src.url : `https://${src.url}`} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1 p-2 bg-[#1A1A1E] hover:bg-cyan-500/10 border border-[rgba(255,255,255,0.02)] hover:border-cyan-500/30 rounded-lg transition-colors">
                                    <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">{src.tag}</span>
                                    <span className="text-xs text-[#A1A1AA] group-hover:text-white truncate flex items-center gap-1.5">
                                      <LinkIcon className="size-3" /> {src.title}
                                    </span>
                                  </a>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nova Linha: Progresso dos Módulos e Histórico Recente */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Progresso por Módulo */}
                    <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg h-full">
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <FolderOpen className="size-4 text-cyan-500" /> Saúde dos Módulos
                      </h4>
                      <div className="space-y-5">
                        {(() => {
                          let mods: any[] = [];
                          try { mods = JSON.parse(selectedCourse.next_topics || '[]'); } catch(e){}
                          if (mods.length === 0) return <span className="text-xs text-[#A1A1AA] italic p-3 bg-[#1A1A1E] block rounded-lg border border-[rgba(255,255,255,0.02)]">Nenhum módulo criado na Grade Curricular.</span>;
                          
                          return mods.map((m: any, i: number) => {
                             const tTotal = m.topics?.length || 0;
                             const tDone = m.topics?.filter((t:any) => t.status === 'concluido').length || 0;
                             const pct = tTotal > 0 ? Math.round((tDone / tTotal) * 100) : 0;
                             return (
                               <div key={i} className="flex flex-col gap-2">
                                 <div className="flex justify-between items-center text-xs">
                                   <span className="text-[#A1A1AA] font-bold truncate max-w-[200px]">{m.title}</span>
                                   <span className="text-white font-bold bg-[#1A1A1E] px-2 py-0.5 rounded-md border border-[rgba(255,255,255,0.04)]">{pct}%</span>
                                 </div>
                                 <div className="w-full bg-[#1A1A1E] h-1.5 rounded-full overflow-hidden border border-[rgba(255,255,255,0.02)]">
                                   <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${pct}%` }}></div>
                                 </div>
                               </div>
                             );
                          });
                        })()}
                      </div>
                    </div>
                    
                    {/* Últimas Sessões */}
                    <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg h-full">
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Clock className="size-4 text-cyan-500" /> Atividade Recente
                      </h4>
                      <div className="space-y-3">
                        {(() => {
                          const courseSessions = sessions.filter(s => s.course_id === selectedCourse.id).sort((a,b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
                          if (courseSessions.length === 0) return <span className="text-xs text-[#A1A1AA] italic p-3 bg-[#1A1A1E] block rounded-lg border border-[rgba(255,255,255,0.02)]">Nenhuma sessão registrada neste curso. Vá em Módulos e inicie uma Sessão!</span>;
                          
                          return courseSessions.slice(0, 4).map((s, i) => (
                             <div key={i} className="flex flex-col gap-2 p-3 bg-[#1A1A1E] rounded-xl border border-[rgba(255,255,255,0.04)] hover:bg-[#27272A] transition-colors">
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-cyan-500 font-bold tracking-widest uppercase flex items-center gap-1.5"><CalendarIcon className="size-3"/> {format(parseISO(s.session_date), "dd 'de' MMM", {locale: ptBR})}</span>
                                 <span className="text-[10px] text-yellow-500 font-bold flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20"><Zap className="size-3"/> +{s.xp_earned} XP</span>
                               </div>
                               <div>
                                 <div className="text-sm text-white font-bold">{s.class_name || s.module_name || "Sessão de Estudo"}</div>
                                 <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest mt-1">{s.duration_minutes} min investidos</div>
                               </div>
                             </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Canais e Vídeos Consumidos (Videoteca Resumo) */}
                  <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg mt-6">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Video className="size-4 text-rose-500" /> Videoteca (Canais & Vídeos Consumidos)
                    </h4>
                    <div className="space-y-4">
                      {(() => {
                        let channels: any[] = [];
                        try { channels = JSON.parse(selectedCourse.description || '{}').youtube_channels || []; } catch(e){}
                        
                        if (channels.length === 0) {
                          return <span className="text-xs text-[#A1A1AA] italic block p-3 bg-[#1A1A1E] rounded-lg border border-[rgba(255,255,255,0.02)]">Nenhum canal adicionado à videoteca deste curso.</span>;
                        }

                        return channels.map((ch, idx) => (
                          <div key={ch.id || idx} className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
                            <div className="p-4 flex items-center gap-4 bg-[#111113]/50">
                               <div className="size-10 rounded-lg bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                 {ch.cover_url ? <img src={ch.cover_url} alt={ch.name} className="w-full h-full object-cover" /> : <Video className="size-5 text-rose-500/50" />}
                               </div>
                               <div>
                                 <h5 className="font-bold text-white text-sm">{ch.name}</h5>
                                 <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest">{ch.videos?.length || 0} vídeos salvos</span>
                               </div>
                            </div>
                            {ch.videos && ch.videos.length > 0 && (
                               <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                 {ch.videos.map((vid: any, vIdx: number) => {
                                   const thumb = getThumbnail(vid.url);
                                   return (
                                     <a key={vid.id || vIdx} href={vid.url} target="_blank" rel="noopener noreferrer" className="group block relative rounded-lg overflow-hidden border border-[rgba(255,255,255,0.04)] aspect-video bg-black/40">
                                        {thumb ? (
                                          <img src={thumb} alt={vid.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center"><Play className="size-8 text-white/20" /></div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-3">
                                          <span className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-rose-400 transition-colors">{vid.title}</span>
                                        </div>
                                     </a>
                                   );
                                 })}
                               </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  
                  {/* Tags do Curso */}
                  <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg mt-6">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Tag className="size-4 text-purple-500" /> Tags do Curso
                    </h4>
                    {(() => {
                      let mods = [];
                      try {
                        const parsed = JSON.parse(selectedCourse.next_topics || '[]');
                        mods = (parsed.length > 0 && !parsed[0].topics) ? [{ id: 'default', title: 'Módulo Geral', topics: parsed }] : parsed;
                      } catch(e) {}
                      
                      const allTags = new Set<string>();
                      mods.forEach((m: any) => {
                        m.topics?.forEach((t: any) => {
                          if (t.tags) {
                            t.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean).forEach((tag: string) => allTags.add(tag));
                          }
                        });
                      });
                      
                      const tagsArray = Array.from(allTags);
                      
                      if (tagsArray.length === 0) {
                        return <span className="text-xs text-[#A1A1AA] italic block p-3 bg-[#1A1A1E] rounded-lg border border-[rgba(255,255,255,0.02)]">Nenhuma tag criada neste curso ainda.</span>;
                      }
                      
                      return (
                        <div className="flex flex-wrap gap-2">
                          {tagsArray.map((tag, idx) => (
                            <span key={idx} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
               </div>
             )}

             {courseTab === "Módulos" && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-[rgba(255,255,255,0.06)] pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Layers className="size-5 text-cyan-500" /> Módulos</h3>
                        <p className="text-xs text-[#A1A1AA] mt-1">Estruture o curso em módulos e tópicos. Anexe links, tags e gere materiais com IA.</p>
                      </div>
                      <button onClick={() => {
                        const moduleTitle = prompt("Qual o nome do novo Módulo?");
                        if (moduleTitle) {
                          let current = [];
                          try {
                            const parsed = JSON.parse(selectedCourse.next_topics || '[]');
                            current = (parsed.length > 0 && !parsed[0].topics) ? [{ id: Date.now(), title: 'Módulo Geral', topics: parsed }] : parsed;
                          } catch(e) {}
                          const updated = [...current, { id: Date.now(), title: moduleTitle, topics: [] }];
                          updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) });
                        }
                      }} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                        <Plus className="size-4" /> Novo Módulo
                      </button>
                    </div>

                    {/* Lógica de Renderização e Progresso */}
                    {(() => {
                      let modules = [];
                      try {
                        const parsed = JSON.parse(selectedCourse.next_topics || '[]');
                        modules = (parsed.length > 0 && !parsed[0].topics) ? [{ id: 'default', title: 'Módulo Geral', topics: parsed }] : parsed;
                      } catch(e) {}

                      let totalTopics = 0;
                      let completedTopics = 0;
                      modules.forEach((m: any) => {
                        totalTopics += m.topics?.length || 0;
                        completedTopics += m.topics?.filter((t: any) => t.status === 'concluido').length || 0;
                      });
                      
                      const topicPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
                      
                      const getStatusColor = (status: string) => {
                        switch(status) {
                          case 'concluido': return 'bg-emerald-500 border-emerald-500 text-white';
                          case 'avançando': return 'bg-cyan-500 border-cyan-500 text-white';
                          case 'revisando': return 'bg-yellow-500 border-yellow-500 text-white';
                          default: return 'bg-[#1A1A1E] border-[#3F3F46] text-transparent hover:border-cyan-500';
                        }
                      };

                      const getStatusLabel = (status: string) => {
                        switch(status) {
                          case 'concluido': return 'Concluído';
                          case 'avançando': return 'Avançando';
                          case 'revisando': return 'Revisando';
                          default: return 'Pendente';
                        }
                      };

                      const cycleStatus = (current: string) => {
                        const cycle = ['pendente', 'avançando', 'revisando', 'concluido'];
                        return cycle[(cycle.indexOf(current || 'pendente') + 1) % cycle.length];
                      };

                      return (
                        <>
                          <div className="mb-6 bg-[#1A1A1E] p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-end mb-2">
                               <div className="text-[10px] uppercase tracking-widest font-bold text-[#71717A]">Progresso da Grade</div>
                               <div className="text-sm font-bold text-cyan-400">{completedTopics} de {totalTopics} Tópicos ({topicPercent}%)</div>
                            </div>
                            <div className="h-2 w-full bg-[#111113] rounded-full overflow-hidden">
                               <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${topicPercent}%` }}></div>
                            </div>
                          </div>

                          {activeModuleIndex === null ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {modules.length === 0 ? (
                                <div className="col-span-full p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm">
                                  Nenhum módulo cadastrado. Comece criando um módulo para estruturar seus tópicos.
                                </div>
                              ) : modules.map((mod: any, mIdx: number) => {
                                const tTotal = mod.topics?.length || 0;
                                const tDone = mod.topics?.filter((t:any) => t.status === 'concluido').length || 0;
                                const pct = tTotal > 0 ? Math.round((tDone / tTotal) * 100) : 0;
                                return (
                                  <div key={mod.id || mIdx} onClick={() => setActiveModuleIndex(mIdx)} className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:border-cyan-500/50 transition-all flex flex-col h-[240px]">
                                    <div className="h-32 w-full relative bg-gradient-to-br from-[#1A1A1E] to-[#111113] overflow-hidden flex items-center justify-center">
                                      {mod.cover_url ? (
                                        <img src={mod.cover_url} alt={mod.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                      ) : (
                                        <Layers className="size-10 text-cyan-500/20 group-hover:scale-110 transition-transform duration-500" />
                                      )}
                                      <div className="absolute top-2 right-2 z-10 flex gap-2">
                                        <button onClick={(e) => {
                                          e.stopPropagation();
                                          const url = prompt("URL da Capa do Módulo (Imagem):", mod.cover_url || '');
                                          if (url !== null) {
                                            const updated = [...modules];
                                            updated[mIdx].cover_url = url;
                                            updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) });
                                          }
                                        }} className="p-1.5 bg-black/50 hover:bg-cyan-500/80 rounded-lg text-white backdrop-blur-sm border border-white/10 transition-colors" title="Capa">
                                          <Camera className="size-3" />
                                        </button>
                                        <button onClick={(e) => {
                                          e.stopPropagation();
                                          if(confirm("Excluir este módulo inteiro e seus tópicos?")) {
                                            const updated = modules.filter((_: any, i: number) => i !== mIdx);
                                            updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) });
                                          }
                                        }} className="p-1.5 bg-black/50 hover:bg-rose-500/80 rounded-lg text-rose-400 hover:text-white backdrop-blur-sm border border-white/10 transition-colors" title="Excluir">
                                          <Trash2 className="size-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="p-4 flex flex-col justify-between flex-1 bg-[#111113]">
                                      <h4 className="text-sm font-bold text-white truncate">{mod.title}</h4>
                                      <div className="mt-auto pt-2">
                                        <div className="flex justify-between items-end mb-1.5">
                                          <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest">{tTotal} aulas</span>
                                          <span className="text-[10px] font-bold text-cyan-400">{pct}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden shadow-inner border border-white/5">
                                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                              <button onClick={() => setActiveModuleIndex(null)} className="flex items-center gap-2 text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors mb-2 w-fit bg-white/5 px-3 py-2 rounded-lg border border-white/10 hover:border-white/20">
                                <ArrowLeft className="size-4" /> Voltar para Grade de Módulos
                              </button>
                              
                              {modules.map((mod: any, mIdx: number) => {
                                if (mIdx !== activeModuleIndex) return null;
                                return (
                                  <div key={mod.id || mIdx} className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden shadow-lg mb-6 group transition-all hover:border-cyan-500/20">
                                    <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#1A1A1E] to-[#111113] border-b border-white/5 relative">
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-l-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                      <h4 className="text-base font-black text-white flex items-center gap-3">
                                        <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20 shadow-inner">
                                          <FolderOpen className="size-4 text-cyan-400" />
                                        </div>
                                        {mod.title}
                                      </h4>
                                  <div className="flex items-center gap-2 relative z-10">
                                    <button onClick={() => {
                                      const topicTitle = prompt("Nome do novo tópico/aula:");
                                      if (topicTitle) {
                                        const updated = [...modules];
                                        updated[mIdx].topics = [...(updated[mIdx].topics || []), { id: Date.now(), title: topicTitle, status: 'pendente', source: '' }];
                                        updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) });
                                      }
                                    }} className="text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/10 px-2 py-1.5 rounded transition-colors uppercase tracking-widest flex items-center gap-1">
                                      <Plus className="size-3" /> Add Tópico
                                    </button>
                                    <button onClick={() => {
                                      if(confirm("Excluir este módulo inteiro e seus tópicos?")) {
                                        const updated = modules.filter((_: any, i: number) => i !== mIdx);
                                        updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) });
                                      }
                                    }} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded transition-colors">
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="p-4 space-y-2 bg-[#0A0A0B]/50">
                                  {(!mod.topics || mod.topics.length === 0) ? (
                                    <p className="text-xs text-[#71717A] italic px-2">Módulo vazio. Adicione tópicos.</p>
                                  ) : mod.topics.map((topic: any, tIdx: number) => (
                                    <div key={topic.id || tIdx} className="group/topic flex flex-col bg-[#111113] hover:bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] hover:border-cyan-500/30 rounded-xl transition-all overflow-hidden shadow-sm">
                                      
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const updated = [...modules];
                                              updated[mIdx].topics[tIdx].status = cycleStatus(topic.status);
                                              updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) });
                                            }}
                                            className={`shrink-0 size-5 rounded-full border-2 flex items-center justify-center transition-all ${getStatusColor(topic.status)} z-10`}
                                            title={`Status atual: ${getStatusLabel(topic.status)}. Clique para mudar.`}
                                          >
                                            {topic.status === 'concluido' && <CheckSquare className="size-3" />}
                                            {topic.status === 'avançando' && <Flame className="size-3" />}
                                            {topic.status === 'revisando' && <BookOpen className="size-3" />}
                                          </button>
                                          <div className="flex flex-col cursor-pointer flex-1 min-w-0" onClick={() => {
                                             if (expandedTopicId === (topic.id || tIdx)) {
                                                setExpandedTopicId(null);
                                             } else {
                                                setExpandedTopicId(topic.id || tIdx);
                                                setLocalNotes(topic.notes || '');
                                                setLocalTags(topic.tags || '');
                                             }
                                          }}>
                                            <span className={`text-sm font-bold truncate ${topic.status === 'concluido' ? 'text-[#71717A] line-through' : 'text-white'}`}>{topic.title}</span>
                                            <span className={`text-[10px] uppercase tracking-widest font-bold mt-0.5 ${
                                              topic.status === 'concluido' ? 'text-emerald-500' :
                                              topic.status === 'avançando' ? 'text-cyan-400' :
                                              topic.status === 'revisando' ? 'text-yellow-400' : 'text-[#71717A]'
                                            }`}>{getStatusLabel(topic.status)}</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-9 sm:ml-0 shrink-0">
                                          {topic.source ? (
                                            <a href={topic.source.startsWith('http') ? topic.source : `https://${topic.source}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20 hover:bg-cyan-400/20 transition-colors flex items-center gap-1">
                                              <Share2 className="size-3" /> Fonte
                                            </a>
                                          ) : (
                                            <span className="text-[10px] text-[#3F3F46] px-2 py-1 italic">Sem fonte</span>
                                          )}
                                          <button onClick={(e) => {
                                            e.stopPropagation();
                                            const src = prompt("Cole o link (YouTube, PDF, Drive) da fonte de estudo:", topic.source || '');
                                            if (src !== null) {
                                              const updated = [...modules];
                                              updated[mIdx].topics[tIdx].source = src;
                                              updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) });
                                            }
                                          }} className="opacity-0 group-hover/topic:opacity-100 p-1.5 text-[#A1A1AA] hover:text-white bg-white/5 rounded-lg transition-all" title="Adicionar/Editar Link">
                                            <PenTool className="size-3.5" />
                                          </button>
                                          <label className="opacity-0 group-hover/topic:opacity-100 p-1.5 text-cyan-400 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/30 rounded-lg transition-all cursor-pointer" title="Fazer Upload de PDF/Material">
                                            {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
                                            <input type="file" className="hidden" disabled={isUploading} onChange={(e) => handleMaterialUpload(e, mIdx, tIdx)} />
                                          </label>
                                          <button onClick={(e) => {
                                            e.stopPropagation();
                                            if(confirm("Remover este tópico?")) {
                                              const updated = [...modules];
                                              updated[mIdx].topics = updated[mIdx].topics.filter((_: any, i: number) => i !== tIdx);
                                              updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) });
                                            }
                                          }} className="opacity-0 group-hover/topic:opacity-100 p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all">
                                            <Trash2 className="size-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* EXPANDED WORKSPACE MODAL */}
                                      {expandedTopicId === (topic.id || tIdx) && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 lg:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => { e.stopPropagation(); setExpandedTopicId(null); }}>
                                          <div className="bg-[#0A0A0C] border-0 lg:border border-white/5 rounded-none lg:rounded-3xl p-3 lg:p-8 w-full max-w-[100vw] lg:max-w-[90vw] h-[100dvh] lg:h-[95vh] flex flex-col gap-3 lg:gap-6 shadow-2xl relative overflow-hidden shadow-cyan-900/20" onClick={(e) => e.stopPropagation()}>
                                            
                                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none rounded-t-3xl"></div>

                                            {/* Header do Modal */}
                                            <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 transition-all duration-300", isWorkspaceHeaderOpen ? "pb-6 border-b border-white/5" : "pb-0 mb-2 justify-end")}>
                                              {isWorkspaceHeaderOpen && (
                                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                  <div className="flex items-center gap-3 mb-2">
                                                     <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] uppercase font-black tracking-widest rounded border border-cyan-500/20 flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.15)]"><Layers className="size-3" /> WORKSPACE</span>
                                                     <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest flex items-center gap-1.5"><FolderOpen className="size-3" /> {mod.title}</span>
                                                  </div>
                                                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">{topic.title}</h2>
                                                </div>
                                              )}
                                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto mt-4 sm:mt-0 justify-end">
                                                {isWorkspaceHeaderOpen && (
                                                  <div className="flex flex-wrap items-center gap-2 mr-0 sm:mr-2 border-r-0 sm:border-r border-white/10 pr-0 sm:pr-4 w-full sm:w-auto justify-end">
                                                    {activeTopicTimer === (topic.id || tIdx) ? (
                                                      <div className="flex flex-wrap items-center justify-center gap-2 bg-black/40 p-1.5 rounded-2xl sm:rounded-full border border-white/5 backdrop-blur-md w-full sm:w-auto">
                                                        <div className="px-4 py-1.5 bg-cyan-900/30 rounded-full flex items-center justify-center min-w-[95px] shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]">
                                                           <span className={cn("text-lg font-mono font-bold tracking-wider", isTimerPaused ? "text-[#71717A] animate-pulse" : (isPomodoroMode ? "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" : "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"))}>
                                                             {isPomodoroMode ? (
                                                               `${String(Math.floor(Math.max(0, pomodoroTargetSeconds - elapsedSeconds) / 60)).padStart(2, '0')}:${String(Math.max(0, pomodoroTargetSeconds - elapsedSeconds) % 60).padStart(2, '0')}`
                                                             ) : (
                                                               `${String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`
                                                             )}
                                                           </span>
                                                        </div>
                                                        <button onClick={() => setIsTimerPaused(!isTimerPaused)} className="p-2.5 hover:bg-white/10 rounded-full text-white transition-colors" title={isTimerPaused ? "Retomar" : "Pausar"}>
                                                          {isTimerPaused ? <Play className="size-4 fill-white" /> : <Pause className="size-4 fill-white" />}
                                                        </button>
                                                        <button onClick={() => {
                                                           if (confirm("Cancelar a sessão atual? O tempo não será salvo.")) {
                                                              setActiveTopicTimer(null);
                                                              setElapsedSeconds(0);
                                                              setIsTimerPaused(false);
                                                           }
                                                        }} className="p-2.5 hover:bg-rose-500/20 text-rose-500 rounded-full transition-colors" title="Cancelar">
                                                          <XCircle className="size-4" />
                                                        </button>
                                                        <button onClick={async () => {
                                                           const durationMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
                                                           await addSession({
                                                              course_id: selectedCourse.id,
                                                              session_date: format(new Date(), 'yyyy-MM-dd'),
                                                              duration_minutes: durationMinutes,
                                                              module_name: mod.title,
                                                              class_name: topic.title,
                                                              summary: topic.notes || 'Sessão focada na ferramenta Topic Workspace.'
                                                           });
                                                           setActiveTopicTimer(null);
                                                           setElapsedSeconds(0);
                                                           setIsTimerPaused(false);
                                                        }} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                                                          <CheckCircle2 className="size-4" /> Concluir
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
                                                        <button onClick={() => {
                                                           setActiveTopicTimer(topic.id || tIdx);
                                                           setElapsedSeconds(0);
                                                           setIsTimerPaused(false);
                                                        }} className={cn("px-5 py-2.5 hover:brightness-110 text-black rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all", isPomodoroMode ? "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]")}>
                                                          <Play className="size-4 fill-black" /> Iniciar Sessão
                                                        </button>
                                                        <button 
                                                          onClick={() => setIsPomodoroMode(!isPomodoroMode)}
                                                          className={cn("px-3 py-2.5 rounded-full text-xs font-bold transition-colors border", isPomodoroMode ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-white/5 text-[#A1A1AA] border-white/5 hover:text-white")}
                                                          title="Alternar entre Timer Crescente e Pomodoro (25m)"
                                                        >
                                                          {isPomodoroMode ? "🍅 Pomodoro" : "⏱️ Timer"}
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                                  
                                                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                                                  {/* FOCUS MODE */}
                                                  {isWorkspaceHeaderOpen && (
                                                    <div className="hidden lg:flex items-center gap-1 bg-[#1A1A1E] p-1 rounded-xl border border-white/5 mr-2 animate-in fade-in duration-300">
                                                      <button onClick={() => setDesktopFocusMode("media")} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors", desktopFocusMode === "media" ? "bg-cyan-500/20 text-cyan-400" : "text-[#71717A] hover:text-white")} title="Modo Foco: Apenas Mídia">Mídia</button>
                                                      <button onClick={() => setDesktopFocusMode("both")} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors", desktopFocusMode === "both" ? "bg-white/10 text-white" : "text-[#71717A] hover:text-white")} title="Visão Padrão">Dividido</button>
                                                      <button onClick={() => setDesktopFocusMode("notes")} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors", desktopFocusMode === "notes" ? "bg-purple-500/20 text-purple-400" : "text-[#71717A] hover:text-white")} title="Modo Foco: Apenas Anotações">Anotações</button>
                                                      <div className="w-px h-4 bg-white/10 mx-1"></div>
                                                      <button onClick={() => window.open(window.location.href, '_blank')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#71717A] hover:text-white transition-colors flex items-center gap-1.5" title="Abrir Workspace em Nova Aba">
                                                        <ExternalLink className="size-3" /> Pop-out
                                                      </button>
                                                    </div>
                                                  )}
                                                  <button onClick={() => setIsWorkspaceHeaderOpen(!isWorkspaceHeaderOpen)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white backdrop-blur-md" title={isWorkspaceHeaderOpen ? "Ocultar Cabeçalho" : "Mostrar Cabeçalho"}>
                                                    {isWorkspaceHeaderOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                                  </button>
                                                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={cn("px-4 py-2 bg-black/40 border border-white/10 hover:bg-white/10 text-white rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]")} title="Recursos e Ferramentas">
                                                    <LayoutPanelLeft className={cn("size-4", isSidebarOpen ? "text-cyan-500" : "text-[#A1A1AA]")} />
                                                    <span className="hidden sm:inline">{isSidebarOpen ? "Ocultar" : "Recursos"}</span>
                                                  </button>
                                                  <button onClick={() => setExpandedTopicId(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white backdrop-blur-md">
                                                    <X className="size-5" />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div className="flex-1 min-h-0 w-full pb-0 md:pb-6 flex flex-col lg:flex-row gap-6">
                                              <div className={cn("flex-1 flex-col relative h-full gap-4 overflow-y-auto custom-scrollbar pr-2 lg:flex", (mobileWorkspaceTab === "media" || mobileWorkspaceTab === "notes") ? "flex" : "hidden lg:flex")}>
                                                {activeTopicVideos.length > 0 ? (
                                                  <div className={cn("flex-col md:flex-row w-full gap-4 overflow-x-auto min-h-[300px] pb-2 shrink-0 lg:flex", mobileWorkspaceTab === "media" ? "flex" : "hidden", desktopFocusMode === "notes" ? "lg:hidden" : "lg:flex")}>
                                                    {activeTopicVideos.map((video, idx) => (
                                                      
                                                        <div key={`video-${idx}`} className="flex-1 rounded-xl overflow-hidden bg-black border border-white/5 shadow-inner flex flex-col animate-in fade-in zoom-in-95 duration-300 min-w-[300px] shrink-0">
                                                        <div className="flex items-center justify-between p-2 bg-[#1A1A1E] border-b border-white/5">
                                                          <span className="text-[10px] font-bold text-white uppercase tracking-widest px-2 truncate flex-1">{video.title}</span>
                                                          <div className="flex items-center gap-1">
                                                            <button onClick={() => setActiveSettingsTopicIdx(activeSettingsTopicIdx === idx ? null : idx)} className={cn("p-1.5 rounded-lg transition-colors", activeSettingsTopicIdx === idx ? "bg-white/20 text-white" : "bg-white/5 hover:bg-white/10 text-[#A1A1AA]")} title="Configurações do Visualizador">
                                                              <Settings2 className="size-3" />
                                                            </button>
                                                            <button onClick={() => {
                                                              const isAudio = video.url.toLowerCase().endsWith('.mp3') || (video.title || "").toLowerCase().endsWith('.mp3') || (video.url.includes('drive.google.com') && (video.title || "").toLowerCase().includes('audio'));
                                                              window.dispatchEvent(new CustomEvent(isAudio ? 'global-audio' : 'global-pip', { detail: video }));
                                                              setActiveTopicVideos(prev => prev.filter((_, i) => i !== idx));
                                                            }} className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors flex items-center gap-1" title="Minimizar (PiP)">
                                                              <Minimize2 className="size-3" />
                                                            </button>
                                                            <button onClick={() => setActiveTopicVideos(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-colors" title="Fechar Vídeo">
                                                              <X className="size-3" />
                                                            </button>
                                                          </div>
                                                        </div>
                                                        
                                                        {activeSettingsTopicIdx === idx && (
                                                          <div className="p-4 bg-[#0A0A0C] border-b border-white/5 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div className="flex flex-col gap-2">
                                                              <div className="flex items-center justify-between">
                                                                <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Tamanho (Altura Máxima)</label>
                                                                <span className="text-xs font-mono text-cyan-400">{video.maxHeight || 65}vh</span>
                                                              </div>
                                                              <input type="range" min="30" max="100" value={video.maxHeight || 65} onChange={(e) => {
                                                                const newVids = [...activeTopicVideos];
                                                                newVids[idx].maxHeight = parseInt(e.target.value);
                                                                setActiveTopicVideos(newVids);
                                                              }} className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                              <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Formato (Proporção)</label>
                                                              <div className="flex items-center gap-2">
                                                                <button onClick={() => { const newVids = [...activeTopicVideos]; newVids[idx].aspectRatio = '16/9'; setActiveTopicVideos(newVids); }} className={cn("flex-1 py-1.5 text-xs font-bold rounded border transition-colors", (!video.aspectRatio || video.aspectRatio === '16/9') ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-white/5 text-[#A1A1AA] border-white/10 hover:bg-white/10")}>16:9 (Vídeo)</button>
                                                                <button onClick={() => { const newVids = [...activeTopicVideos]; newVids[idx].aspectRatio = '1/1.414'; setActiveTopicVideos(newVids); }} className={cn("flex-1 py-1.5 text-xs font-bold rounded border transition-colors", video.aspectRatio === '1/1.414' ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-white/5 text-[#A1A1AA] border-white/10 hover:bg-white/10")}>A4 (Retrato)</button>
                                                                <button onClick={() => { const newVids = [...activeTopicVideos]; newVids[idx].aspectRatio = 'auto'; setActiveTopicVideos(newVids); }} className={cn("flex-1 py-1.5 text-xs font-bold rounded border transition-colors", video.aspectRatio === 'auto' ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-white/5 text-[#A1A1AA] border-white/10 hover:bg-white/10")}>Livre</button>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )}

                                                        <div className="w-full relative mx-auto bg-black flex items-center justify-center transition-all duration-300" style={{ 
                                                            maxHeight: `${video.maxHeight || 65}vh`, 
                                                            maxWidth: (video.aspectRatio || '16/9') === 'auto' ? '100%' : `calc(${video.maxHeight || 65}vh * ${(video.aspectRatio || '16/9') === '16/9' ? 1.7778 : (video.aspectRatio || '16/9') === '1/1.414' ? 0.707 : 1})`,
                                                            aspectRatio: (video.aspectRatio || '16/9') === 'auto' ? 'auto' : (video.aspectRatio || '16/9') 
                                                          }}>
                                                          {(() => {
                                                             const u = video.url.toLowerCase();
                                                             const t = (video.title || "").toLowerCase();
                                                             let finalUrl = video.url;
                                                             const isDrive = finalUrl.includes('drive.google.com');
                                                             
                                                             if (isDrive && finalUrl.includes('/view')) {
                                                                finalUrl = finalUrl.replace(/\/view.*/, '/preview');
                                                             }
                                                             
                                                             const isAudio = u.endsWith('.mp3') || t.endsWith('.mp3') || (isDrive && (t.includes('audio') || u.includes('audio')));
                                                             
                                                             if (isAudio && !isDrive) {
                                                               return (
                                                                 <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#111] to-black">
                                                                    <div className="size-24 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                                                                      <Music className="size-10 text-cyan-400" />
                                                                    </div>
                                                                    <CustomAudioPlayer src={finalUrl} className="w-full max-w-md" />
                                                                 </div>
                                                               );
                                                             }
                                                             
                                                             if (isDrive || u.endsWith('.pdf')) {
                                                               return (
                                                                  <iframe src={finalUrl} className="absolute inset-0 w-full h-full border-0 bg-white" allow="autoplay; fullscreen; picture-in-picture" />
                                                               );
                                                             }
                                                             
                                                             return (
                                                               <iframe 
                                                                 src={getSafeEmbedUrl(finalUrl, video.extra)}
                                                                 className="absolute inset-0 w-full h-full border-0"
                                                                 allow="autoplay; fullscreen; picture-in-picture"
                                                               ></iframe>
                                                             );
                                                          })()}
                                                        </div>
                                                        </div>

                                                      
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className={cn("flex-col items-center justify-center p-8 text-center text-[#A1A1AA] bg-[#1A1A1E] border border-dashed border-white/10 rounded-2xl w-full min-h-[150px] shrink-0", mobileWorkspaceTab === "media" ? "flex lg:hidden" : "hidden", desktopFocusMode === "notes" ? "lg:hidden" : "")}>
                                                    <Video className="size-8 mb-2 opacity-50 mx-auto" />
                                                    <p className="text-xs font-bold">Nenhuma mídia anexa.</p>
                                                    <p className="text-[10px] mt-1">Abra os "Recursos" para reproduzir vídeos, PDFs ou músicas.</p>
                                                  </div>
                                                )}
                                                <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2", mobileWorkspaceTab === "notes" ? "flex" : "hidden", desktopFocusMode === "media" ? "lg:hidden" : "lg:flex")}>
                                                  <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold flex items-center gap-2">
                                                    <Edit2 className="size-3 text-purple-500" /> Anotações / Resumo (Salvas Automático)
                                                  </label>
                                                  <div className="flex items-center gap-2">
                                                    <input 
                                                      type="file" 
                                                      accept="image/*" 
                                                      capture="environment"
                                                      id={`camera-${topic.id || tIdx}`}
                                                      className="hidden"
                                                      onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        
                                                        try {
                                                          toast.loading("Analisando imagem...", { id: `upload-${topic.id || tIdx}` });
                                                          
                                                          const maxSizeBytes = 5 * 1024 * 1024; // 5MB
                                                          if (file.size > maxSizeBytes) {
                                                            toast.error(`A imagem é muito pesada! O limite é de 5MB.`, { id: `upload-${topic.id || tIdx}` });
                                                            return;
                                                          }

                                                          const arrayBuffer = await file.arrayBuffer();
                                                          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                                                          const hashArray = Array.from(new Uint8Array(hashBuffer));
                                                          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                                                          
                                                          const fileExt = file.name.split('.').pop() || 'jpg';
                                                          const fileName = `session_${hashHex}.${fileExt}`;
                                                          const filePath = `anotacoes/${fileName}`;
                                                          
                                                          toast.loading("Enviando imagem...", { id: `upload-${topic.id || tIdx}` });
                                                          const { error } = await supabase.storage.from('livros').upload(filePath, file);
                                                          
                                                          if (error && !error.message.toLowerCase().includes('already exists') && !error.message.toLowerCase().includes('duplicate')) {
                                                            throw error;
                                                          }
                                                          
                                                          const { data } = supabase.storage.from('livros').getPublicUrl(filePath);
                                                          
                                                          const imgHtml = `<p><img src="${data.publicUrl}" alt="Anotação" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 1px solid rgba(255,255,255,0.1);" /></p><p><br></p>`;
                                                          
                                                          setLocalNotes(prev => prev + imgHtml);
                                                          
                                                          toast.success("Imagem anexada à anotação!", { id: `upload-${topic.id || tIdx}` });
                                                        } catch (err: any) {
                                                          toast.error("Erro ao enviar imagem: " + err.message, { id: `upload-${topic.id || tIdx}` });
                                                        }
                                                      }}
                                                    />
                                                    <label htmlFor={`camera-${topic.id || tIdx}`} className="cursor-pointer h-6 w-6 flex items-center justify-center rounded-md bg-[#1A1A1E] hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors" title="Tirar foto ou anexar imagem">
                                                      <Camera className="size-3.5" />
                                                    </label>
                                                    <VoiceRecordButton 
                                                      onTranscript={(t) => setLocalNotes(prev => prev + `<p>${t}</p>`)} 
                                                      className="h-6 w-6 !p-1 bg-[#1A1A1E] hover:bg-purple-500/20 text-purple-400 border-purple-500/20"
                                                      placeholder="Ditar anotação"
                                                    />
                                                  </div>
                                                </div>
                                                <div 
                                                  className={cn("rounded-2xl overflow-hidden border border-white/5 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all bg-[#0A0A0C] flex-1 flex-col group relative min-h-[400px] lg:flex", mobileWorkspaceTab === "notes" ? "flex" : "hidden", desktopFocusMode === "media" ? "lg:hidden" : "lg:flex")}
                                                  onBlur={() => {
                                                    const updated = [...modules];
                                                    updated[mIdx].topics[tIdx].notes = localNotes;
                                                    updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                  }}
                                                >
                                                  <RichTextEditor 
                                                    content={localNotes}
                                                    onChange={(content) => {
                                                      setLocalNotes(content);
                                                      if (syncChannelRef.current) {
                                                        syncChannelRef.current.postMessage({ type: 'SYNC_NOTES', payload: { topicId: expandedTopicId, notes: content } });
                                                      }
                                                    }}
                                                    availableBooks={availableBookQuotes.filter(q => (topic.books || []).includes(q.book_id))}
                                                    availableVideos={availableVideos}
                                                    availableMaterials={topic.materials || []}
                                                  />
                                                </div>
                                              </div>
                                              {isSidebarOpen && (
                                                <div className={cn("w-full lg:w-[350px] shrink-0 bg-black/20 p-5 rounded-3xl border border-white/5 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 fade-in duration-300 lg:block", mobileWorkspaceTab === "resources" ? "block" : "hidden", desktopFocusMode !== "both" ? "lg:hidden" : "lg:block")}>
                                                  <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                                                      <LayoutPanelLeft className="size-4 text-cyan-500" /> Recursos e Ferramentas
                                                    </div>
                                                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-[#A1A1AA] hover:text-white transition-colors" title="Esconder">
                                                      <X className="size-3.5" />
                                                    </button>
                                                  </div>
                                                  <div className="space-y-6">
                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[10px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-2 flex items-center justify-between cursor-pointer list-none transition-colors">
                                                    <div className="flex items-center gap-1">
                                                      <Tag className="size-3 text-cyan-500" /> Tags da Aula
                                                    </div>
                                                    <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                                                  </summary>
                                                  <div className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] rounded-xl p-2 min-h-[46px] flex flex-wrap items-center gap-2 focus-within:border-cyan-500/50 transition-colors">
                                                    {localTags.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                                                      <span key={idx} className="bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border border-cyan-500/20">
                                                        {tag}
                                                        <button 
                                                          onClick={() => {
                                                            const newTags = localTags.split(',').map(t => t.trim()).filter(Boolean).filter((_, i) => i !== idx).join(', ');
                                                            setLocalTags(newTags);
                                                            const updated = [...modules];
                                                            updated[mIdx].topics[tIdx].tags = newTags;
                                                            updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                          }}
                                                          className="hover:text-white transition-colors"
                                                        >
                                                          <X className="size-3" />
                                                        </button>
                                                      </span>
                                                    ))}
                                                    <input 
                                                      placeholder={localTags ? "Adicionar..." : "Digite a tag e aperte Enter..."}
                                                      value={tagInput}
                                                      onChange={(e) => setTagInput(e.target.value)}
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && tagInput.trim()) {
                                                          e.preventDefault();
                                                          const currentTags = localTags.split(',').map(t => t.trim()).filter(Boolean);
                                                          if (!currentTags.includes(tagInput.trim())) {
                                                            const newTags = [...currentTags, tagInput.trim()].join(', ');
                                                            setLocalTags(newTags);
                                                            setTagInput("");
                                                            const updated = [...modules];
                                                            updated[mIdx].topics[tIdx].tags = newTags;
                                                            updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                          }
                                                        }
                                                      }}
                                                      className="flex-1 min-w-[120px] bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-white p-1 placeholder:text-zinc-600"
                                                    />
                                                  </div>
                                                </details>

                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[10px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-2 flex items-center justify-between cursor-pointer list-none transition-colors">
                                                    <div className="flex items-center gap-1">
                                                      <Book className="size-3 text-emerald-500"/> Referências Literárias
                                                    </div>
                                                    <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    <div className="relative">
                                                      <select 
                                                        className="w-full appearance-none bg-[#1A1A1E] hover:bg-[#27272A] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 pr-10 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all cursor-pointer shadow-sm"
                                                        onChange={(e) => {
                                                          const val = e.target.value;
                                                          if (!val) return;
                                                          const updated = [...modules];
                                                          if (!updated[mIdx].topics[tIdx].books) updated[mIdx].topics[tIdx].books = [];
                                                          if (!updated[mIdx].topics[tIdx].books.includes(val)) {
                                                             updated[mIdx].topics[tIdx].books.push(val);
                                                             updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                          }
                                                          e.target.value = "";
                                                        }}
                                                      >
                                                        <option value="" className="bg-[#111113] text-[#A1A1AA] font-normal">Acervo</option>
                                                        {books.map(b => (
                                                          <option key={b.id} value={b.id} className="bg-[#111113] text-white py-2">{b.title}</option>
                                                        ))}
                                                      </select>
                                                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#A1A1AA] pointer-events-none" />
                                                    </div>
                                                    
                                                    {topic.books && topic.books.length > 0 && (
                                                      <div className="flex flex-col gap-2 mt-1">
                                                        {topic.books.map((bookId: string) => {
                                                           const b = books.find(r => r.id === bookId);
                                                           if (!b) return null;
                                                           return (
                                                             <div key={bookId} className="flex items-center justify-between p-3 bg-[#1A1A1E] border border-[rgba(255,255,255,0.08)] rounded-xl group hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all shadow-sm">
                                                               <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer" onClick={() => {
                                                                  const event = new CustomEvent('reference-click', { detail: { refType: 'book', title: b.title, id: b.id } });
                                                                  window.dispatchEvent(event);
                                                               }}>
                                                                 <div className="w-9 h-9 rounded-lg shrink-0 bg-[#111113] flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:bg-emerald-500/10 transition-colors">
                                                                   <Book className="size-4 text-emerald-400" />
                                                                 </div>
                                                                 <div className="flex flex-col">
                                                                   <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{b.title}</span>
                                                                   <span className="text-[10px] text-[#A1A1AA] mt-0.5">Clique para ver citações</span>
                                                                 </div>
                                                               </div>
                                                               <button onClick={() => {
                                                                  const updated = [...modules];
                                                                  updated[mIdx].topics[tIdx].books = updated[mIdx].topics[tIdx].books.filter((id: string) => id !== bookId);
                                                                  updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                               }} className="p-2 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0" title="Remover livro">
                                                                 <Trash2 className="size-4" />
                                                               </button>
                                                             </div>
                                                           );
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                </details>

                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[10px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-2 flex items-center justify-between cursor-pointer list-none transition-colors">
                                                    <div className="flex items-center gap-1">
                                                      <FolderOpen className="size-3 text-cyan-500"/> Materiais Anexos
                                                    </div>
                                                    <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    {topic.source && !(topic.materials && topic.materials.length > 0) && (
                                                      <div className="flex items-center justify-between p-3 bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] rounded-xl">
                                                        <button onClick={(e) => {
                                                           e.preventDefault();
                                                           const u = topic.source.toLowerCase();
                                                           if (u.endsWith('.mp3') || u.endsWith('.pdf') || u.endsWith('.mp4') || u.includes('drive.google.com') || u.includes('youtu')) {
                                                             setActiveTopicVideos(prev => prev.some(v => v.url === topic.source) ? prev : [...prev, { refType: 'video', url: topic.source, title: "Anexo Antigo", extra: { mIdx, tIdx, isSource: true } }]);
                                                           } else {
                                                             window.open(topic.source.startsWith('http') ? topic.source : `https://${topic.source}`, '_blank');
                                                           }
                                                        }} className="text-xs font-bold text-cyan-400 hover:underline truncate max-w-[150px] flex items-center gap-1.5 text-left">
                                                          <ExternalLink className="size-3" /> Anexo Antigo
                                                        </button>
                                                        <button onClick={() => {
                                                           const updated = [...modules];
                                                           updated[mIdx].topics[tIdx].source = "";
                                                           updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                        }} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded transition-colors" title="Remover anexo">
                                                          <Trash2 className="size-3.5" />
                                                        </button>
                                                      </div>
                                                    )}
                                                    
                                                    {topic.materials?.map((mat: any, i: number) => {
                                                      const thumb = getThumbnail(mat.url);
                                                      return (
                                                      <div key={i} className="flex items-center justify-between p-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] rounded-xl group hover:border-[rgba(255,255,255,0.1)] transition-colors">
                                                        <button onClick={(e) => {
                                                           e.preventDefault();
                                                           const u = mat.url.toLowerCase();
                                                           if (u.endsWith('.mp3') || u.endsWith('.pdf') || u.endsWith('.mp4') || u.includes('drive.google.com') || u.includes('youtu') || n.endsWith('.pdf') || n.endsWith('.mp3') || n.endsWith('.mp4')) {
                                                             setActiveTopicVideos(prev => prev.some(v => v.url === mat.url) ? prev : [...prev, { refType: 'video', url: mat.url, title: mat.name || "Material Anexo", extra: { mIdx, tIdx, mArrayIdx: i, isMaterial: true } }]);
                                                           } else {
                                                             window.open(mat.url.startsWith('http') ? mat.url : `https://${mat.url}`, '_blank');
                                                           }
                                                        }} className="flex items-center gap-3 overflow-hidden flex-1 text-left" title={mat.name}>
                                                          {thumb ? (
                                                             <div className="w-12 h-8 rounded shrink-0 bg-[#27272A] overflow-hidden border border-white/5">
                                                               <img src={thumb} alt="thumb" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                             </div>
                                                          ) : (
                                                             <div className="w-8 h-8 rounded shrink-0 bg-white/5 flex items-center justify-center">
                                                               {mat.type === 'file' ? <FileText className="size-3.5 text-purple-400" /> : <LinkIcon className="size-3.5 text-cyan-400" />}
                                                             </div>
                                                          )}
                                                          <span className="text-xs font-bold text-gray-300 group-hover:text-cyan-400 truncate pr-2">{mat.name || "Material Anexo"}</span>
                                                        </button>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                          <button onClick={(e) => {
                                                             e.stopPropagation();
                                                             const newName = window.prompt("Novo nome para o material:", mat.name || "");
                                                             if (newName && newName.trim()) {
                                                                const updated = [...modules];
                                                                updated[mIdx].topics[tIdx].materials[i].name = newName.trim();
                                                                updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                             }
                                                          }} className="text-purple-400/50 hover:text-purple-400 hover:bg-purple-500/10 p-1.5 rounded transition-colors" title="Renomear anexo">
                                                            <Edit2 className="size-3.5" />
                                                          </button>
                                                          <button onClick={(e) => {
                                                             e.stopPropagation();
                                                             const updated = [...modules];
                                                             updated[mIdx].topics[tIdx].materials = updated[mIdx].topics[tIdx].materials.filter((_: any, idx: number) => idx !== i);
                                                             updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                          }} className="text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded transition-colors" title="Remover anexo">
                                                            <Trash2 className="size-3.5" />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    )})}

                                                    <div className="flex gap-2 mt-1">
                                                      <button onClick={() => {
                                                        const src = prompt("Cole o link (YouTube, Drive):");
                                                        if (src) {
                                                          const matName = prompt("Qual o nome desse material/link?") || "Link Externo";
                                                          const updated = [...modules];
                                                          if (!updated[mIdx].topics[tIdx].materials) updated[mIdx].topics[tIdx].materials = [];
                                                          updated[mIdx].topics[tIdx].materials.push({ name: matName, url: src, type: 'link' });
                                                          updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                        }
                                                      }} className="flex-1 py-2 bg-[#1A1A1E] hover:bg-[#27272A] border border-[rgba(255,255,255,0.04)] rounded-xl text-[10px] font-bold text-[#A1A1AA] hover:text-white transition-colors flex items-center justify-center gap-1.5">
                                                        <LinkIcon className="size-3" /> Add Link
                                                      </button>
                                                      <label className="flex-1 py-2 bg-[#1A1A1E] hover:bg-[#27272A] border border-[rgba(255,255,255,0.04)] rounded-xl text-[10px] font-bold text-[#A1A1AA] hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                                                        {isUploading ? <Loader2 className="size-3 animate-spin" /> : <UploadCloud className="size-3" />} Add Arquivo
                                                        <input type="file" className="hidden" disabled={isUploading} onChange={(e) => handleMaterialUpload(e, mIdx, tIdx)} />
                                                      </label>
                                                      <button onClick={() => setReferenceModalTarget({ mIdx, tIdx })} className="flex-1 py-2 bg-[#1A1A1E] hover:bg-[#27272A] border border-[rgba(255,255,255,0.04)] rounded-xl text-[10px] font-bold text-amber-500/70 hover:text-amber-400 transition-colors flex items-center justify-center gap-1.5">
                                                        <Search className="size-3" /> Puxar Ref.
                                                      </button>
                                                    </div>
                                                  </div>
                                                </details>

                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[10px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-2 flex items-center justify-between cursor-pointer list-none transition-colors">
                                                    <div className="flex items-center gap-1">
                                                      <Video className="size-3 text-cyan-500"/> Videoteca (Trilha)
                                                    </div>
                                                    <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    {availableVideos && availableVideos.length > 0 ? (
                                                      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar w-[100%]">
                                                        {availableVideos.map((vid: any, idx: number) => {
                                                          const thumb = getThumbnail(vid.url);
                                                          return (
                                                            <div key={idx} className="w-32 shrink-0 bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] hover:border-cyan-500/30 rounded-xl overflow-hidden group cursor-pointer transition-colors" onClick={() => {
                                                               const event = new CustomEvent('reference-click', { detail: { refType: 'video', title: vid.title, url: vid.url, id: vid.id } });
                                                               window.dispatchEvent(event);
                                                            }}>
                                                              <div className="h-20 relative bg-black">
                                                                {thumb ? <img src={thumb} alt="thumb" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /> : <Play className="size-6 text-white/20 absolute inset-0 m-auto" />}
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                                                  <Play className="size-6 text-white" />
                                                                </div>
                                                              </div>
                                                              <div className="p-2">
                                                                <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight" title={vid.title}>{vid.title}</p>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    ) : (
                                                       <div className="text-[10px] text-[#71717A] italic py-2 border border-dashed border-white/5 rounded-lg text-center bg-[#111113]">Nenhum vídeo salvo na Videoteca.</div>
                                                    )}
                                                  </div>
                                                </details>

                                                {/* NOVA SESSÃO DE PESQUISA */}
                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[10px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-2 flex items-center justify-between cursor-pointer list-none transition-colors">
                                                    <div className="flex items-center gap-1">
                                                      <Search className="size-3 text-emerald-500"/> Pesquisa Rápida
                                                    </div>
                                                    <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    <div className="flex bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
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
                                                      }} className="px-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold text-xs transition-colors border-l border-[rgba(255,255,255,0.04)]">
                                                        Ir
                                                      </button>
                                                    </div>

                                                    <div className="flex bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
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
                                                      }} className="px-3 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-bold text-xs transition-colors border-l border-[rgba(255,255,255,0.04)]">
                                                        Definir
                                                      </button>
                                                    </div>
                                                  </div>
                                                </details>

                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[10px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-2 flex items-center justify-between cursor-pointer list-none transition-colors">
                                                    <div className="flex items-center gap-1">
                                                      <Sparkles className="size-3 text-cyan-500"/> Laboratório I.A.
                                                    </div>
                                                    <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    <button onClick={() => window.open('https://notebooklm.google.com/', '_blank')} className="w-full py-3 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/20 hover:border-cyan-500/50 rounded-xl text-xs font-bold text-cyan-400 transition-colors flex items-center justify-center gap-1.5" title="Abrir NotebookLM para gerar resumos/slides">
                                                      <LayoutTemplate className="size-3.5" /> NotebookLM (Slides)
                                                    </button>
                                                    <button onClick={() => window.open('https://notebooklm.google.com/', '_blank')} className="w-full py-3 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/20 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-400 transition-colors flex items-center justify-center gap-1.5" title="Abrir NotebookLM para gerar quiz baseado nas notas">
                                                      <Brain className="size-3.5" /> NotebookLM (Quiz)
                                                    </button>
                                                  </div>
                                                </details>

                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[10px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-2 flex items-center justify-between cursor-pointer list-none transition-colors">
                                                    <div className="flex items-center gap-1">
                                                      <Headphones className="size-3 text-cyan-500"/> Músicas (Foco)
                                                    </div>
                                                    <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    <button onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('reference-click', { detail: { refType: 'video', title: 'Lofi Gospel', url: 'https://www.youtube.com/watch?v=srxN4L1n5p4', id: 'srxN4L1n5p4' } }));
                                                    }} className="w-full py-2.5 bg-[#1A1A1E] hover:bg-[#27272A] border border-[rgba(255,255,255,0.04)] rounded-xl text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-2 px-3 text-left">
                                                      <Music className="size-3.5 text-purple-400" /> <span className="flex-1 truncate">Gospel</span>
                                                    </button>
                                                    <button onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('reference-click', { detail: { refType: 'video', title: 'Som de Chuva', url: 'https://www.youtube.com/watch?v=mPZkdNFkNps', id: 'mPZkdNFkNps' } }));
                                                    }} className="w-full py-2.5 bg-[#1A1A1E] hover:bg-[#27272A] border border-[rgba(255,255,255,0.04)] rounded-xl text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-2 px-3 text-left">
                                                      <CloudRain className="size-3.5 text-blue-400" /> <span className="flex-1 truncate">Som de Chuva</span>
                                                    </button>
                                                    <button onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('reference-click', { detail: { refType: 'video', title: 'Som Ambiente (Lofi)', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', id: 'jfKfPfyJRdk' } }));
                                                    }} className="w-full py-2.5 bg-[#1A1A1E] hover:bg-[#27272A] border border-[rgba(255,255,255,0.04)] rounded-xl text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-2 px-3 text-left">
                                                      <Headphones className="size-3.5 text-emerald-400" /> <span className="flex-1 truncate">Som Ambiente</span>
                                                    </button>
                                                  </div>
                                                </details>
                                                </div>
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* MOBILE BOTTOM TABS */}
                                            <div className="flex lg:hidden items-center justify-between bg-[#111113] p-1.5 rounded-t-2xl border-t border-white/5 mt-auto shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sticky bottom-0 z-[100] gap-2 pb-safe">
                                              <button onClick={() => setMobileWorkspaceTab("media")} className={cn("flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors", mobileWorkspaceTab === "media" ? "text-cyan-400 bg-cyan-400/10" : "text-[#71717A] hover:text-white hover:bg-white/5")}>
                                                <Video className="size-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Mídia</span>
                                              </button>
                                              <button onClick={() => setMobileWorkspaceTab("notes")} className={cn("flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors", mobileWorkspaceTab === "notes" ? "text-purple-400 bg-purple-400/10" : "text-[#71717A] hover:text-white hover:bg-white/5")}>
                                                <Edit2 className="size-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Anotações</span>
                                              </button>
                                              <button onClick={() => setMobileWorkspaceTab("resources")} className={cn("flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors", mobileWorkspaceTab === "resources" ? "text-emerald-400 bg-emerald-400/10" : "text-[#71717A] hover:text-white hover:bg-white/5")}>
                                                <LayoutPanelLeft className="size-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Recursos</span>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
               </div>
             )}

             {courseTab === "Videoteca" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {activeVideotecaVideos.length > 0 ? (
                    <div className="fixed inset-0 z-[200] bg-[#050505] overflow-y-auto w-full h-full p-4 md:p-8 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                      {/* WORKSPACE HEADER */}
                      <div className="flex items-center justify-between bg-[#1A1A1E] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                        <div className="flex items-center gap-4">
                          <button onClick={() => { setActiveVideotecaVideos([]); setVideotecaNotes(''); setVideotecaTags([]); }} className="text-[#A1A1AA] hover:text-white transition-colors bg-white/5 p-2 rounded-lg">
                            <ArrowLeft className="size-4" />
                          </button>
                          <div>
                            <h3 className="text-white font-bold text-lg">{activeVideotecaVideos[0].video.title}</h3>
                            <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">{activeVideotecaVideos[0].channelName || 'Videoteca'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {activeVideotecaVideos.length < 2 && (
                             <button onClick={() => setIsSelectingSecondVideo(true)} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                               <Plus className="size-3" /> Segundo Vídeo
                             </button>
                           )}
                           <button onClick={handleSaveVideotecaNotes} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2">
                             <Save className="size-3.5" /> Salvar Notas
                           </button>
                        </div>
                      </div>

                      {/* WORKSPACE GRID */}
                      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4 items-start min-h-[60vh]">
                        {/* LEFT COLUMN: VIDEOS */}
                        <div className="flex flex-col gap-4">
                          {activeVideotecaVideos.map((av, idx) => (
                            <div key={idx} className="relative bg-black rounded-xl border border-white/5 shadow-inner overflow-hidden flex flex-col">
                              <div className="flex items-center justify-between p-2 bg-[#1A1A1E] border-b border-white/5 relative z-20">
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest px-2 truncate flex-1">{av.video.title}</span>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setActiveSettingsVideotecaIdx(activeSettingsVideotecaIdx === idx ? null : idx)} className={cn("p-1.5 rounded-lg transition-colors", activeSettingsVideotecaIdx === idx ? "bg-white/20 text-white" : "bg-white/5 hover:bg-white/10 text-[#A1A1AA]")} title="Configurações do Visualizador">
                                    <Settings2 className="size-3" />
                                  </button>
                                  {idx === 1 && (
                                    <button onClick={() => {
                                        const newVids = [...activeVideotecaVideos];
                                        newVids.splice(1, 1);
                                        setActiveVideotecaVideos(newVids);
                                    }} className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-colors" title="Fechar Vídeo">
                                      <X className="size-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {activeSettingsVideotecaIdx === idx && (
                                <div className="p-4 bg-[#0A0A0C] border-b border-white/5 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Tamanho (Altura Máxima)</label>
                                      <span className="text-xs font-mono text-cyan-400">{av.maxHeight || 70}vh</span>
                                    </div>
                                    <input type="range" min="30" max="100" value={av.maxHeight || 70} onChange={(e) => {
                                      const newVids = [...activeVideotecaVideos];
                                      newVids[idx].maxHeight = parseInt(e.target.value);
                                      setActiveVideotecaVideos(newVids);
                                    }} className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Formato (Proporção)</label>
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => { const newVids = [...activeVideotecaVideos]; newVids[idx].aspectRatio = '16/9'; setActiveVideotecaVideos(newVids); }} className={cn("flex-1 py-1.5 text-xs font-bold rounded border transition-colors", (!av.aspectRatio || av.aspectRatio === '16/9') ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-white/5 text-[#A1A1AA] border-white/10 hover:bg-white/10")}>16:9 (Vídeo)</button>
                                      <button onClick={() => { const newVids = [...activeVideotecaVideos]; newVids[idx].aspectRatio = '1/1.414'; setActiveVideotecaVideos(newVids); }} className={cn("flex-1 py-1.5 text-xs font-bold rounded border transition-colors", av.aspectRatio === '1/1.414' ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-white/5 text-[#A1A1AA] border-white/10 hover:bg-white/10")}>A4 (Retrato)</button>
                                      <button onClick={() => { const newVids = [...activeVideotecaVideos]; newVids[idx].aspectRatio = 'auto'; setActiveVideotecaVideos(newVids); }} className={cn("flex-1 py-1.5 text-xs font-bold rounded border transition-colors", av.aspectRatio === 'auto' ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-white/5 text-[#A1A1AA] border-white/10 hover:bg-white/10")}>Livre</button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="w-full relative mx-auto bg-black flex items-center justify-center transition-all duration-300" style={{ 
                                  maxHeight: `${av.maxHeight || 70}vh`, 
                                  maxWidth: (av.aspectRatio || '16/9') === 'auto' ? '100%' : `calc(${av.maxHeight || 70}vh * ${(av.aspectRatio || '16/9') === '16/9' ? 1.7778 : (av.aspectRatio || '16/9') === '1/1.414' ? 0.707 : 1})`,
                                  aspectRatio: (av.aspectRatio || '16/9') === 'auto' ? 'auto' : (av.aspectRatio || '16/9') 
                                }}>
                                {(() => {
                                   const u = av.video.url.toLowerCase();
                                   if (u.endsWith('.mp3') || (u.includes('drive.google.com') && u.includes('audio'))) {
                                     return (
                                       <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#111] to-black">
                                          <div className="size-24 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                                            <Music className="size-10 text-cyan-400" />
                                          </div>
                                          <audio controls src={av.video.url} className="w-full max-w-sm outline-none" />
                                       </div>
                                     );
                                   }
                                   if (u.endsWith('.pdf')) {
                                     return (
                                        <iframe src={av.video.url} className="absolute inset-0 w-full h-full border-0 bg-white" />
                                     );
                                   }
                                   return (
                                     <iframe 
                                       src={getSafeEmbedUrl(av.video.url, '')}
                                       className="absolute inset-0 w-full h-full border-0"
                                       allow="autoplay; fullscreen; picture-in-picture"
                                     ></iframe>
                                   );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* RIGHT COLUMN: NOTES & TAGS */}
                        <div className="flex flex-col gap-4 h-full">
                           <div className="flex-1 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden flex flex-col min-h-[400px]">
                             <div className="p-3 border-b border-[rgba(255,255,255,0.06)] bg-[#111113] flex items-center justify-between">
                               <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-bold flex items-center gap-1.5">
                                 <FileText className="size-3 text-emerald-500" /> Anotações do Vídeo
                               </span>
                             </div>
                             <div className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                               <RichTextEditor content={videotecaNotes} onChange={setVideotecaNotes} placeholder="Escreva suas anotações aqui..." />
                             </div>
                           </div>
                           
                           {/* TAGS */}
                           <div className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                              <label className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                                <Tag className="size-3 text-purple-500" /> Tags de Estudo
                              </label>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {videotecaTags.map((tag, i) => (
                                  <span key={i} className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md text-xs font-bold flex items-center gap-1.5">
                                    {tag}
                                    <button onClick={() => setVideotecaTags(videotecaTags.filter((_, idx) => idx !== i))} className="text-purple-400 hover:text-white"><X className="size-3"/></button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  type="text" placeholder="Adicionar nova tag..."
                                  value={newVideotecaTag} onChange={e => setNewVideotecaTag(e.target.value)}
                                  onKeyDown={e => {
                                    if(e.key === 'Enter' && newVideotecaTag.trim()) {
                                      e.preventDefault();
                                      if(!videotecaTags.includes(newVideotecaTag.trim())) {
                                        setVideotecaTags([...videotecaTags, newVideotecaTag.trim()]);
                                      }
                                      setNewVideotecaTag('');
                                    }
                                  }}
                                  className="flex-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                                />
                                <button onClick={() => {
                                  if(newVideotecaTag.trim() && !videotecaTags.includes(newVideotecaTag.trim())) {
                                    setVideotecaTags([...videotecaTags, newVideotecaTag.trim()]);
                                    setNewVideotecaTag('');
                                  }
                                }} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-colors">Adicionar</button>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                          <Video className="size-4 text-rose-500" /> Canais e Playlists
                        </h4>
                        <button onClick={() => setIsAddingChannel(!isAddingChannel)} className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
                          <Plus className="size-3" /> Adicionar Canal
                        </button>
                      </div>
                  
                  {isAddingChannel && (
                    <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] p-4 rounded-xl flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-2 mb-4">
                      <input 
                        type="text" placeholder="Nome do Canal (Ex: Curso em Vídeo)"
                        value={newChannel.name} onChange={e => setNewChannel({...newChannel, name: e.target.value})}
                        className="flex-1 bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
                      />
                      <input 
                        type="url" placeholder="Capa do Canal (URL da Imagem) - Opcional"
                        value={newChannel.cover_url} onChange={e => setNewChannel({...newChannel, cover_url: e.target.value})}
                        className="flex-1 bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
                      />
                      <button onClick={() => {
                        if (!newChannel.name) return;
                        let s: any = {};
                        try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                        if (!s.youtube_channels) s.youtube_channels = [];
                        s.youtube_channels.push({ id: Date.now(), name: newChannel.name, cover_url: newChannel.cover_url, videos: [] });
                        updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                        setNewChannel({ name: '', cover_url: '', url: '' });
                        setIsAddingChannel(false);
                      }} className="bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors w-full sm:w-auto">
                        Salvar
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    {(() => {
                      let channels: any[] = [];
                      try { channels = JSON.parse(selectedCourse.description || '{}').youtube_channels || []; } catch(e){}
                      
                      if (channels.length === 0 && !isAddingChannel) {
                        return <div className="p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm bg-[#1A1A1E]">Nenhum canal adicionado. Registre canais do YouTube para integrar vídeos diretamente às suas anotações.</div>;
                      }

                      return channels.map((ch, idx) => (
                        <div key={ch.id || idx} className={cn("bg-[#1A1A1E] border rounded-xl overflow-hidden transition-all duration-300", expandedChannelId === (ch.id || idx) ? "border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)]" : "border-[rgba(255,255,255,0.06)]")}>
                           <div 
                             onClick={() => setExpandedChannelId(expandedChannelId === (ch.id || idx) ? null : (ch.id || idx))}
                             className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                           >
                             <div className="flex items-center gap-4">
                               <div className="size-12 rounded-lg bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                 {ch.cover_url ? <img src={ch.cover_url} alt={ch.name} className="w-full h-full object-cover" /> : <Video className="size-5 text-rose-500/50" />}
                               </div>
                               <div>
                                 <h5 className="font-bold text-white text-base leading-tight">{ch.name}</h5>
                                 <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest">{ch.videos?.length || 0} vídeos salvos</span>
                               </div>
                             </div>
                             <div className="flex items-center gap-3">
                               <button onClick={(e) => {
                                 e.stopPropagation();
                                 if(confirm("Excluir este canal e todos os vídeos dele?")) {
                                   let s: any = {};
                                   try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                   if (s.youtube_channels) {
                                     s.youtube_channels = s.youtube_channels.filter((_:any, i:number) => i !== idx);
                                     updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                                   }
                                 }
                               }} className="p-2 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-colors">
                                 <Trash2 className="size-4" />
                               </button>
                               <ChevronDown className={cn("size-5 text-[#A1A1AA] transition-transform duration-300", expandedChannelId === (ch.id || idx) && "rotate-180 text-rose-400")} />
                             </div>
                           </div>

                           <div className={cn("grid transition-all duration-300 ease-in-out", expandedChannelId === (ch.id || idx) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                             <div className="overflow-hidden">
                               <div className="p-4 pt-0 border-t border-[rgba(255,255,255,0.06)] bg-[#111113]/50">
                                 <div className="flex justify-between items-center my-4">
                                   <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-widest">Mídias do Canal</span>
                                   <button onClick={() => setIsAddingVideoToChannel(isAddingVideoToChannel === idx ? null : idx)} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-xs font-bold transition-colors">
                                     + Adicionar Mídia (Vídeo/Áudio/PDF)
                                   </button>
                                 </div>
                                 
                                 {isAddingVideoToChannel === idx && (
                                   <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 bg-[#1A1A1E] border border-cyan-500/20 rounded-xl">
                                     <input type="text" placeholder="Título (Ex: Aula 1 - Base)" value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} className="flex-1 bg-[#111113] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                                     <input type="url" placeholder="URL da Mídia (YouTube, .mp3, .pdf)" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} className="flex-1 bg-[#111113] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                                     <button onClick={() => {
                                       if (!newVideoTitle || !newVideoUrl) return;
                                       let s: any = {};
                                       try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                       if (s.youtube_channels && s.youtube_channels[idx]) {
                                         if (!s.youtube_channels[idx].videos) s.youtube_channels[idx].videos = [];
                                         s.youtube_channels[idx].videos.push({ id: Date.now().toString(), title: newVideoTitle, url: newVideoUrl });
                                         updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                                         setNewVideoTitle(''); setNewVideoUrl(''); setIsAddingVideoToChannel(null);
                                       }
                                     }} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-colors w-full sm:w-auto">Salvar</button>
                                   </div>
                                 )}

                                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                   {ch.videos?.map((vid: any, vIdx: number) => {
                                     const thumb = getThumbnail(vid.url);
                                     return (
                                       <div key={vid.id || vIdx} className="bg-[#1A1A1E] border border-white/5 rounded-xl overflow-hidden group hover:border-cyan-500/30 transition-colors shadow-sm">
                                         <div className="h-24 bg-black relative flex items-center justify-center group-hover:opacity-90 cursor-pointer" onClick={() => {
                                             setActiveVideotecaVideos([{ channelIdx: idx, videoIdx: vIdx, video: vid, channelName: ch.name }]);
                                             setVideotecaNotes(vid.notes || '');
                                             setVideotecaTags(vid.tags || []);
                                         }}>
                                           {thumb ? <img src={thumb} alt="thumb" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" /> : <Play className="size-6 text-white/20" />}
                                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                              <Play className="size-8 text-white drop-shadow-lg" />
                                           </div>
                                         </div>
                                         <div className="p-3 flex items-start justify-between">
                                           <span className="text-xs font-bold text-white line-clamp-2 pr-2">{vid.title}</span>
                                           <button onClick={() => {
                                             let s: any = {};
                                             try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                             if (s.youtube_channels && s.youtube_channels[idx] && s.youtube_channels[idx].videos) {
                                               s.youtube_channels[idx].videos = s.youtube_channels[idx].videos.filter((_:any, i:number) => i !== vIdx);
                                               updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                                             }
                                           }} className="text-rose-500/50 hover:text-rose-500 transition-colors">
                                             <Trash2 className="size-3.5" />
                                           </button>
                                         </div>
                                       </div>
                                     );
                                   })}
                                   {(!ch.videos || ch.videos.length === 0) && (
                                     <div className="col-span-full py-4 text-center text-[10px] text-[#71717A] uppercase font-bold tracking-widest">Nenhum vídeo salvo neste canal.</div>
                                   )}
                                 </div>
                               </div>
                             </div>
                           </div>
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

             {courseTab === "Diário de Bordo" && (
               <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">Sessões Realizadas</h4>
                    <span className="text-[10px] text-[#A1A1AA] bg-[#111113] px-2 py-1 rounded-md border border-white/5">{sessions.filter(s => s.course_id === selectedCourse.id).length} registros</span>
                  </div>
                  {sessions.filter(s => s.course_id === selectedCourse.id).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm">
                       Nenhuma sessão registrada. Clique em "Registrar Sessão" para anotar seu progresso e ganhar XP.
                    </div>
                  ) : sessions.filter(s => s.course_id === selectedCourse.id).map(session => (
                    <div key={session.id} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                        <h4 className="font-bold text-white text-base md:text-lg">{session.class_name || 'Sessão sem título'}</h4>
                        <div className="flex items-center gap-2 shrink-0">
                           <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">+{session.xp_earned} XP</span>
                           <span className="text-xs font-bold text-[#A1A1AA] bg-[#1A1A1E] px-2 py-1 rounded border border-white/5">{session.duration_minutes}m</span>
                           <span className="text-[10px] font-bold text-[#71717A] uppercase">{format(parseISO(session.session_date), 'dd/MM')}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                         {session.module_name && (
                           <div className="flex items-center gap-2 text-[10px] text-cyan-500 uppercase tracking-widest font-bold">
                             <Layers className="size-3" /> Módulo: {session.module_name}
                           </div>
                         )}
                         {session.summary && (
                           <div className="bg-[#1A1A1E] p-4 rounded-xl border border-[rgba(255,255,255,0.02)] text-sm text-[#A1A1AA] leading-relaxed relative">
                             <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 rounded-l-xl"></div>
                             {session.summary}
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
               </div>
             )}

            {courseTab === "Inteligência Artificial" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 p-6 rounded-3xl hover:border-cyan-500/50 transition-all text-left group">
                  <div className="size-10 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-110 transition-transform"><FileText className="size-5" /></div>
                  <h4 className="font-bold text-white mb-2">Resumir Aula</h4>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">Gera um resumo automático e estruturado com os pontos principais da última aula assistida.</p>
                </button>
                <button className="bg-gradient-to-br from-rose-900/30 to-purple-900/30 border border-rose-500/20 p-6 rounded-3xl hover:border-rose-500/50 transition-all text-left group">
                  <div className="size-10 bg-rose-500/20 rounded-xl flex items-center justify-center mb-4 text-rose-400 group-hover:scale-110 transition-transform"><Layers className="size-5" /></div>
                  <h4 className="font-bold text-white mb-2">Criar Flashcards</h4>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">Extrai conceitos chave e gera flashcards para revisão espaçada (Anki style).</p>
                </button>
                <button className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 p-6 rounded-3xl hover:border-emerald-500/50 transition-all text-left group">
                  <div className="size-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition-transform"><CheckSquare className="size-5" /></div>
                  <h4 className="font-bold text-white mb-2">Gerar Quiz</h4>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">Cria 5 questões de múltipla escolha para validar seu entendimento do módulo atual.</p>
                </button>
                <button className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/20 p-6 rounded-3xl hover:border-yellow-500/50 transition-all text-left group">
                  <div className="size-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4 text-yellow-400 group-hover:scale-110 transition-transform"><Target className="size-5" /></div>
                  <h4 className="font-bold text-white mb-2">Plano de Estudos</h4>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">Monta um cronograma ideal para finalizar o curso com base no seu ritmo de aprendizado.</p>
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {courseTab !== "Visão Geral" && (
            <div className="w-full lg:w-80 shrink-0 space-y-6">
             <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Informações</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">Status</div>
                    <div className="text-sm font-bold text-white capitalize">{selectedCourse.status}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">Último Acesso</div>
                    <div className="text-sm font-bold text-white">Hoje, 14:30</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">Tempo Restante</div>
                    <div className="text-sm font-bold text-white">{selectedCourse.total_hours ? selectedCourse.total_hours - selectedCourse.completed_hours : 0}h estimadas</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest mb-1">XP Recebido</div>
                    <div className="text-sm font-bold text-cyan-400">+1250 XP</div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                   <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-colors">
                     <Download className="size-4" /> Certificado (Bloqueado)
                   </button>
                </div>
             </div>

             {(() => {
                let allBooks: string[] = [];
                let allMaterials: any[] = [];
                let allLinks: any[] = [];
                let allVideos: any[] = [];
                let allChannels: any[] = [];

                try {
                  const parsed = JSON.parse(selectedCourse.next_topics || '[]');
                  const modulesArray = (parsed.length > 0 && !parsed[0].topics) ? [{ topics: parsed }] : parsed;
                  
                  modulesArray.forEach((m: any) => {
                    m.topics?.forEach((t: any) => {
                      if (t.books) {
                          t.books.forEach((bId: string) => {
                             if (!allBooks.includes(bId)) allBooks.push(bId);
                          });
                      }
                      if (t.materials) {
                          t.materials.forEach((mat: any) => {
                             if (!allMaterials.find(x => x.url === mat.url)) allMaterials.push(mat);
                          });
                      }
                      if (t.source) {
                          if (!allLinks.find(x => x.url === t.source)) allLinks.push({ name: t.title, url: t.source });
                      }
                    });
                  });
                } catch(e) {}

                try {
                   const desc = JSON.parse(selectedCourse.description || '{}');
                   if (desc.youtube_channels) {
                     allChannels = desc.youtube_channels;
                     desc.youtube_channels.forEach((ch: any) => {
                        if (ch.videos) {
                           ch.videos.forEach((v: any) => allVideos.push(v));
                        }
                     });
                   }
                } catch(e) {}

                if (allBooks.length === 0 && allChannels.length === 0 && allVideos.length === 0 && allMaterials.length === 0 && allLinks.length === 0) {
                   return null; 
                }

                return (
                  <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl p-6 shadow-lg">
                    <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                       <Library className="size-4 text-emerald-500" /> Materiais em Uso
                    </h3>
                    
                    <div className="space-y-5">
                       {/* Livros */}
                       {allBooks.length > 0 && (
                         <div>
                            <h4 className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5"><Book className="size-3 text-emerald-400" /> Livros Associados</h4>
                            <div className="flex flex-col gap-3">
                               {allBooks.map((bId) => {
                                  const b = books.find(book => book.id === bId);
                                  if (!b) return null;
                                  return (
                                    <div key={bId} className="flex items-center gap-3 bg-[#1A1A1E] p-2 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all group cursor-pointer" onClick={() => {
                                      const event = new CustomEvent('reference-click', { detail: { refType: 'book', title: b.title, id: b.id } });
                                      window.dispatchEvent(event);
                                    }}>
                                       <div className="w-10 h-14 rounded overflow-hidden bg-black shrink-0 relative border border-white/10 group-hover:border-emerald-500/50 transition-colors shadow-sm">
                                         {b.cover_url ? (
                                           <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                         ) : (
                                           <div className="w-full h-full flex items-center justify-center bg-emerald-500/10">
                                             <Book className="size-4 text-emerald-500" />
                                           </div>
                                         )}
                                       </div>
                                       <div className="flex flex-col min-w-0 flex-1">
                                          <span className="text-xs text-white truncate font-bold group-hover:text-emerald-400 transition-colors">{b.title}</span>
                                          <span className="text-[10px] text-[#A1A1AA] truncate mt-0.5">{b.author || 'Livro'}</span>
                                       </div>
                                    </div>
                                  );
                               })}
                            </div>
                         </div>
                       )}

                       {/* Canais e Videos */}
                       {(allChannels.length > 0 || allVideos.length > 0) && (
                         <div>
                            <h4 className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5"><Video className="size-3 text-rose-400" /> Videoteca</h4>
                            <div className="flex flex-col gap-3">
                               {allChannels.length > 0 && (
                                 <div className="flex flex-wrap gap-1.5 mb-1">
                                    {allChannels.map((ch: any) => (
                                      <span key={ch.id} className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                                        <Video className="size-3" /> {ch.name}
                                      </span>
                                    ))}
                                 </div>
                               )}
                               {allVideos.length > 0 && (
                                  <div className="grid grid-cols-2 gap-3 mt-1">
                                    {allVideos.slice(0, 4).map((v: any, i: number) => {
                                      let videoId = "";
                                      try { 
                                        if (v.url.includes("v=")) videoId = v.url.split("v=")[1].split("&")[0];
                                        else if (v.url.includes("youtu.be/")) videoId = v.url.split("youtu.be/")[1].split("?")[0];
                                      } catch(e){}
                                      return (
                                        <div key={i} className="flex flex-col gap-2 group cursor-pointer" onClick={() => {
                                           const event = new CustomEvent('reference-click', { detail: { refType: 'video', title: v.title, url: v.url } });
                                           window.dispatchEvent(event);
                                        }}>
                                          <div className="aspect-video rounded-lg overflow-hidden bg-black relative border border-white/10 group-hover:border-rose-500/50 transition-colors shadow-sm">
                                            {videoId ? (
                                              <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt={v.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center bg-rose-500/10">
                                                <Video className="size-5 text-rose-500" />
                                              </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                               <Play className="size-6 text-white fill-white drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                                            </div>
                                          </div>
                                          <span className="text-[10px] text-white font-medium line-clamp-2 leading-tight group-hover:text-rose-400 transition-colors" title={v.title}>{v.title}</span>
                                        </div>
                                      );
                                    })}
                                    {allVideos.length > 4 && (
                                       <div className="col-span-2 text-center text-[10px] text-[#A1A1AA] italic mt-1 bg-white/5 py-2 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setCourseTab("Videoteca")}>
                                         Ver todos os {allVideos.length} vídeos salvos
                                       </div>
                                    )}
                                  </div>
                               )}
                            </div>
                         </div>
                       )}

                       {/* Anexos e Links */}
                       {(allMaterials.length > 0 || allLinks.length > 0) && (
                         <div>
                            <h4 className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><LinkIcon className="size-3 text-cyan-400" /> Anexos e Links</h4>
                            <div className="flex flex-col gap-2">
                               {allMaterials.map((mat, i) => (
                                 <a key={`m-${i}`} href={mat.url.startsWith('http') ? mat.url : `https://${mat.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#1A1A1E] p-2.5 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-colors group">
                                    <div className="size-7 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                                      {mat.type === 'file' ? <FileText className="size-3.5 text-cyan-500" /> : <LinkIcon className="size-3.5 text-cyan-500" />}
                                    </div>
                                    <span className="text-xs text-white truncate font-medium group-hover:text-cyan-400 transition-colors">{mat.name || 'Link'}</span>
                                 </a>
                               ))}
                               {allLinks.map((link, i) => (
                                 <a key={`l-${i}`} href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#1A1A1E] p-2.5 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-colors group">
                                    <div className="size-7 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                                      <ExternalLink className="size-3.5 text-cyan-500" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                       <span className="text-xs text-white truncate font-medium group-hover:text-cyan-400 transition-colors">{link.name}</span>
                                       <span className="text-[10px] text-[#71717A] uppercase">Fonte</span>
                                    </div>
                                 </a>
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                  </div>
                );
             })()}
             
             {/* Outros Estudos */}
             <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl p-6 shadow-lg">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                   <GraduationCap className="size-4 text-purple-500" /> Outros Estudos
                </h3>
                <div className="flex flex-col gap-3">
                   {courses.filter(c => c.id !== selectedCourse.id && c.status === 'em andamento').slice(0, 4).map(c => (
                     <div key={c.id} className="group cursor-pointer p-3 bg-[#1A1A1E] border border-white/5 rounded-xl hover:border-purple-500/30 transition-all flex items-center justify-between" onClick={() => setSelectedCourseId(c.id)}>
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="size-8 bg-purple-500/10 rounded-lg flex items-center justify-center shrink-0">
                              <BookOpen className="size-4 text-purple-500" />
                           </div>
                           <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">{c.title}</span>
                              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">{c.category}</span>
                           </div>
                        </div>
                        <ChevronRight className="size-4 text-[#71717A] group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                     </div>
                   ))}
                   {courses.filter(c => c.id !== selectedCourse.id && c.status === 'em andamento').length === 0 && (
                      <p className="text-xs text-[#71717A] italic text-center py-2">Nenhum outro estudo em andamento.</p>
                   )}
                </div>
             </div>
          </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-24 text-white font-sans">
      
      {/* HERO HEADER */}
      {!selectedCourseId && (
        <div className="flex flex-col gap-4 bg-[#0A0A0A] p-6 md:p-10 rounded-3xl border border-[rgba(255,255,255,0.04)] shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute -top-20 -right-20 p-32 bg-cyan-500/10 blur-[100px] w-96 h-96 rounded-full pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 z-10 relative">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <GraduationCap className="size-8 md:size-10 text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
              {activeTab === "Visão Geral" ? "Academia Operacional" : 
                activeTab === "Concluídos" ? "Histórico de Conclusões" :
                activeTab}
            </h1>
            {activeTab === "Visão Geral" ? (
              <p className="text-sm md:text-base text-[#A1A1AA] mt-3 max-w-xl leading-relaxed">
                Gerencie cursos, faculdade, certificações e toda sua evolução acadêmica. Um verdadeiro sistema operacional para seus estudos.
              </p>
            ) : tabStats && (
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="flex items-center gap-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] px-3 py-1.5 rounded-lg text-xs font-bold text-[#A1A1AA]">
                  <BookMarked className="size-3.5 text-cyan-400" /> {tabStats.itemsCount} Itens
                </div>
                <div className="flex items-center gap-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] px-3 py-1.5 rounded-lg text-xs font-bold text-[#A1A1AA]">
                  <TrendingUp className="size-3.5 text-emerald-400" /> {tabStats.tabHours}h Estudadas
                </div>
                <div className="flex items-center gap-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] px-3 py-1.5 rounded-lg text-xs font-bold text-[#A1A1AA]">
                  <CheckSquare className="size-3.5 text-purple-400" /> {tabStats.completedTopics} / {tabStats.totalTopics} Tópicos
                </div>
                <div className="flex items-center gap-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] px-3 py-1.5 rounded-lg text-xs font-bold text-[#A1A1AA]">
                  <BarChart2 className="size-3.5 text-blue-400" /> {tabStats.completionRate}% Concluído
                </div>
                <div className="flex items-center gap-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] px-3 py-1.5 rounded-lg text-xs font-bold text-[#A1A1AA]">
                  <Sparkles className="size-3.5 text-amber-400" /> {tabStats.xpEarned} XP Acumulado
                </div>
                <div className="flex items-center gap-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] px-3 py-1.5 rounded-lg text-xs font-bold text-[#A1A1AA]">
                  <Layers className="size-3.5 text-rose-400" /> {tabStats.sessionsCount} Sessões Feitas
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative group">
               <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all shadow-lg">
                 <Plus className="size-4" /> Novo <ChevronDown className="size-4 opacity-50" />
               </button>
               {/* Dropdown menu */}
               <div className="absolute right-0 top-full pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                 <div className="bg-[#111113] border border-[#222] rounded-2xl shadow-2xl p-2 transform origin-top-right scale-95 group-hover:scale-100 transition-all">
                  <button onClick={() => { setNewCourse({...initialCourseState, category: 'Curso'}); setIsCreatingCourse(true); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">📘 Curso</button>
                  <button onClick={() => { setNewCourse({...initialCourseState, category: 'Faculdade'}); setIsCreatingCourse(true); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">🎓 Faculdade</button>
                  <button onClick={() => { setNewCourse({...initialCourseState, category: 'Certificação'}); setIsCreatingCourse(true); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">📜 Certificação</button>
                  <button onClick={() => { setNewCourse({...initialCourseState, category: 'Trilha'}); setIsCreatingCourse(true); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">🗺️ Trilha</button>
                  <button onClick={() => { setNewCourse({...initialCourseState, category: 'Disciplina'}); setIsCreatingCourse(true); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">📚 Disciplina</button>
                  <button onClick={() => { setNewCourse({...initialCourseState, category: 'Projeto Acadêmico'}); setIsCreatingCourse(true); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-xl transition-colors">🔬 Projeto Acadêmico</button>
                 </div>
               </div>
            </div>
            <button 
              onClick={() => setIsCreatingCourse(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus className="size-4" /> Novo Curso
            </button>
          </div>
        </div>

        {/* TABS NAVEGAÇÃO */}
        <div className="flex items-center gap-1 overflow-x-auto pt-4 mt-4 border-t border-[rgba(255,255,255,0.04)] hide-scrollbar z-10 relative">
          {["Visão Geral", "Cursos", "Faculdade", "Certificações", "Trilhas", "Projetos", "Concluídos", "Inteligência"].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedCourseId(null); }}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                activeTab === tab ? "bg-white/10 text-white shadow-md" : "text-[#71717A] hover:text-white hover:bg-white/5"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* MODAL CRIAÇÃO REAL */}
      {isCreatingCourse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleCreateCourse} className="bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-3xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button type="button" onClick={() => { setIsCreatingCourse(false); setIsEditingCourse(false); setNewCourse(initialCourseState); }} className="absolute top-6 right-6 text-[#71717A] hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="size-4"/></button>
            <h3 className="text-xl font-bold text-white mb-6 border-b border-[rgba(255,255,255,0.06)] pb-4 flex items-center gap-2">
               <BookOpen className="size-5 text-cyan-500" /> {isEditingCourse ? "Editar Curso" : "Cadastrar Novo Curso"}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Nome do Curso / Trilha</label>
                <input 
                  type="text" required value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: Formação Node.js Avançada"
                />
              </div>
              
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Plataforma</label>
                <input 
                  type="text" value={newCourse.platform} onChange={e => setNewCourse({...newCourse, platform: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: Udemy, Rocketseat..."
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Professor</label>
                <input 
                  type="text" value={newCourse.instructor} onChange={e => setNewCourse({...newCourse, instructor: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Nome do Instrutor"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Status</label>
                <select 
                  value={newCourse.status} onChange={e => setNewCourse({...newCourse, status: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                >
                  <option value="fila">Na Fila (Planejado)</option>
                  <option value="em_andamento">Ativo (Estou Fazendo)</option>
                  <option value="pausado">Pausado</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Tipo (Categoria)</label>
                <select 
                  value={newCourse.category} onChange={e => setNewCourse({...newCourse, category: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                >
                  <option value="Curso">Curso</option>
                  <option value="Faculdade">Faculdade</option>
                  <option value="Certificação">Certificação</option>
                  <option value="Trilha">Trilha</option>
                  <option value="Disciplina">Disciplina</option>
                  <option value="Projeto Acadêmico">Projeto Acadêmico</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Área</label>
                <select 
                  value={newCourse.knowledge_area} onChange={e => setNewCourse({...newCourse, knowledge_area: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                >
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="Negócios">Negócios</option>
                  <option value="Finanças">Finanças</option>
                  <option value="Idiomas">Idiomas</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Carga Horária Estimada (h)</label>
                <input 
                  type="number" min="1" required value={newCourse.total_hours || ''} onChange={e => setNewCourse({...newCourse, total_hours: Number(e.target.value)})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: 40"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Dias da Semana & Horário (Agenda Inteligente)</label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full sm:flex-1">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayStr, idx) => {
                       let sched = { days: [] as number[], time: "19:00" };
                       try { const p = JSON.parse(newCourse.description || '{}'); if (p.days) sched = p; } catch(e){}
                       const isSelected = sched.days.includes(idx);
                       return (
                         <button 
                           key={idx} type="button" 
                           onClick={() => {
                              let s = { days: [] as number[], time: "19:00" };
                              try { const p = JSON.parse(newCourse.description || '{}'); if (p.days) s = p; } catch(e){}
                              if (s.days.includes(idx)) s.days = s.days.filter((d:number) => d !== idx);
                              else s.days.push(idx);
                              setNewCourse({...newCourse, description: JSON.stringify(s)});
                           }}
                           className={cn("w-full aspect-square sm:aspect-auto sm:h-10 rounded-xl text-[9px] sm:text-[11px] flex items-center justify-center font-bold transition-all border", isSelected ? "bg-purple-500 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "bg-[#1A1A1E] text-[#71717A] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2]")}
                         >
                           <span className="hidden sm:inline">{dayStr}</span>
                           <span className="sm:hidden">{dayStr.charAt(0)}</span>
                         </button>
                       )
                    })}
                  </div>
                  <div className="w-full sm:w-auto relative shrink-0">
                     <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#71717A]" />
                     <input type="time" 
                       value={(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.time || "19:00"; } catch(e){ return "19:00"; } })()}
                       onChange={e => {
                         let s = { days: [] as number[], time: "19:00" };
                         try { const p = JSON.parse(newCourse.description || '{}'); if (p.days) s = p; } catch(e){}
                         s.time = e.target.value;
                         setNewCourse({...newCourse, description: JSON.stringify(s)});
                       }}
                       className="w-full sm:max-w-[140px] bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-white focus:border-purple-500 focus:outline-none transition-colors"
                     />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Link de Acesso (URL)</label>
                <input 
                  type="url" value={newCourse.course_url} onChange={e => setNewCourse({...newCourse, course_url: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="https://"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Metas / Objetivos do Estudo</label>
                <textarea 
                  value={(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.goals || ""; } catch(e){ return ""; } })()}
                  onChange={e => {
                     let s: any = { days: [] as number[], time: "19:00" };
                     try { const p = JSON.parse(newCourse.description || '{}'); if (p.days) s = p; } catch(e){}
                     s.goals = e.target.value;
                     setNewCourse({...newCourse, description: JSON.stringify(s)});
                  }}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors min-h-[80px]"
                  placeholder="O que você quer alcançar ao concluir este estudo?"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Capa do Curso (URL da Imagem)</label>
                <input 
                  type="url" 
                  value={(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.cover_url || ""; } catch(e){ return ""; } })()}
                  onChange={e => {
                     let s: any = { days: [] as number[], time: "19:00" };
                     try { const p = JSON.parse(newCourse.description || '{}'); if (p.days) s = p; } catch(e){}
                     s.cover_url = e.target.value;
                     setNewCourse({...newCourse, description: JSON.stringify(s)});
                  }}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-4 border-t border-[rgba(255,255,255,0.06)] pt-6">
              <button type="button" onClick={() => { setIsCreatingCourse(false); setIsEditingCourse(false); setNewCourse(initialCourseState); }} className="px-6 py-3 rounded-xl text-sm font-bold text-[#A1A1AA] hover:bg-white/5 transition-colors">Cancelar</button>
              <button type="submit" className="px-8 py-3 rounded-xl text-sm font-bold bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2">
                 Salvar Curso <ChevronRight className="size-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTENT ROUTING */}
      {selectedCourseId ? (
         renderCourseDetails()
      ) : activeTab === "Visão Geral" ? (
         renderDashboard()
      ) : activeTab === "Inteligência" ? (
         renderIntelligenceReport()
      ) : (
         renderCoursesList()
      )}

      {/* MODAL SELECIONAR SEGUNDO VÍDEO */}
      {isSelectingSecondVideo && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-t-3xl sm:rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-2xl relative animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh]">
            <button type="button" onClick={() => setIsSelectingSecondVideo(false)} className="absolute top-6 right-6 text-[#71717A] hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="size-4"/></button>
            
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
               <Video className="size-5 text-cyan-500" /> Adicionar Segundo Vídeo
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 min-h-[300px]">
              
              {/* Canais da Videoteca */}
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-[#A1A1AA] mb-3">Da Videoteca</h4>
                <div className="space-y-2">
                  {(() => {
                    let channels: any[] = [];
                    try { channels = JSON.parse(selectedCourse?.description || '{}').youtube_channels || []; } catch(e){}
                    if (channels.length === 0) return <div className="text-[10px] text-[#71717A]">Nenhum vídeo salvo na Videoteca.</div>;
                    
                    return channels.map((ch, cIdx) => (
                      <div key={cIdx} className="mb-4">
                        <span className="text-xs font-bold text-white mb-2 block">{ch.name}</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ch.videos?.map((vid: any, vIdx: number) => (
                            <button key={vIdx} onClick={() => {
                               setActiveVideotecaVideos([...activeVideotecaVideos, { channelIdx: cIdx, videoIdx: vIdx, video: vid, channelName: ch.name }]);
                               setIsSelectingSecondVideo(false);
                            }} className="text-left bg-[#1A1A1E] border border-white/5 p-2 rounded-lg hover:border-cyan-500/50 transition-colors flex items-center gap-2 group">
                               <Play className="size-4 text-cyan-500/50 group-hover:text-cyan-400 shrink-0" />
                               <span className="text-xs text-[#A1A1AA] group-hover:text-white truncate">{vid.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              
              {/* Músicas de Foco */}
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-[#A1A1AA] mb-3">Músicas (Foco)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                   <button onClick={() => {
                       setActiveVideotecaVideos([...activeVideotecaVideos, { channelIdx: undefined, videoIdx: undefined, video: { title: 'Lofi Gospel', url: 'https://www.youtube.com/watch?v=srxN4L1n5p4' }, channelName: 'Foco' }]);
                       setIsSelectingSecondVideo(false);
                   }} className="text-left bg-[#1A1A1E] border border-white/5 p-3 rounded-lg hover:border-purple-500/50 transition-colors flex flex-col gap-1 items-center justify-center group">
                      <Music className="size-5 text-purple-400 mb-1" />
                      <span className="text-xs font-bold text-[#A1A1AA] group-hover:text-white">Gospel Lofi</span>
                   </button>
                   <button onClick={() => {
                       setActiveVideotecaVideos([...activeVideotecaVideos, { channelIdx: undefined, videoIdx: undefined, video: { title: 'Som de Chuva', url: 'https://www.youtube.com/watch?v=mPZkdNFkNps' }, channelName: 'Foco' }]);
                       setIsSelectingSecondVideo(false);
                   }} className="text-left bg-[#1A1A1E] border border-white/5 p-3 rounded-lg hover:border-blue-500/50 transition-colors flex flex-col gap-1 items-center justify-center group">
                      <CloudRain className="size-5 text-blue-400 mb-1" />
                      <span className="text-xs font-bold text-[#A1A1AA] group-hover:text-white">Som de Chuva</span>
                   </button>
                   <button onClick={() => {
                       setActiveVideotecaVideos([...activeVideotecaVideos, { channelIdx: undefined, videoIdx: undefined, video: { title: 'Som Ambiente', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' }, channelName: 'Foco' }]);
                       setIsSelectingSecondVideo(false);
                   }} className="text-left bg-[#1A1A1E] border border-white/5 p-3 rounded-lg hover:border-emerald-500/50 transition-colors flex flex-col gap-1 items-center justify-center group">
                      <Headphones className="size-5 text-emerald-400 mb-1" />
                      <span className="text-xs font-bold text-[#A1A1AA] group-hover:text-white">Som Ambiente</span>
                   </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO DE SESSÃO */}
      {isLoggingSession && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
          <form onSubmit={handleLogSession} className="bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-t-3xl sm:rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-lg relative animate-in slide-in-from-bottom duration-300">
            <button type="button" onClick={() => setIsLoggingSession(false)} className="absolute top-6 right-6 text-[#71717A] hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="size-4"/></button>
            <h3 className="text-xl font-bold text-white mb-6 border-b border-[rgba(255,255,255,0.06)] pb-4 flex items-center gap-2">
               <FileText className="size-5 text-cyan-500" /> Registrar Sessão de Estudo
            </h3>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Módulo (Opcional)</label>
                   <input 
                     type="text" value={newSession.module_name} onChange={e => setNewSession({...newSession, module_name: e.target.value})}
                     className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                     placeholder="Ex: Módulo 1"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Duração (Minutos)</label>
                   <input 
                     type="number" min="1" required value={newSession.duration_minutes || ''} onChange={e => setNewSession({...newSession, duration_minutes: Number(e.target.value)})}
                     className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                     placeholder="Ex: 60"
                   />
                 </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Nome da Aula / Tópico</label>
                <input 
                  type="text" required value={newSession.class_name} onChange={e => setNewSession({...newSession, class_name: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: Introdução a Componentes"
                />
              </div>
              
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Anotações / Resumo</label>
                <textarea 
                  value={newSession.summary} onChange={e => setNewSession({...newSession, summary: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors min-h-[120px] custom-scrollbar"
                  placeholder="O que você aprendeu hoje? Faça um resumo..."
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2">
                 Salvar Sessão e Ganhar XP <Trophy className="size-4" />
              </button>
            </div>
          </form>
        </div>
      )}


      {/* Preview Reference Overlay */}
      {/* MODAL PUXAR REFERÊNCIA */}
      {referenceModalTarget && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-t-3xl sm:rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-2xl relative animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh]">
            <button type="button" onClick={() => setReferenceModalTarget(null)} className="absolute top-6 right-6 text-[#71717A] hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="size-4"/></button>
            
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               <FolderOpen className="size-5 text-amber-500" /> Puxar Referência
            </h3>
            <p className="text-sm text-[#A1A1AA] mb-6">Busque por materiais e links anexados em outras trilhas e cursos.</p>
            
            <div className="relative mb-6 shrink-0">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input 
                type="text" 
                placeholder="Buscar por nome do material, curso ou tópico..."
                value={referenceSearchQuery}
                onChange={e => setReferenceSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 min-h-[300px]">
              {(() => {
                 const allMats: any[] = [];
                 courses.forEach(c => {
                    let t = [];
                    try { t = JSON.parse(c.next_topics || '[]'); } catch(e){}
                    t.forEach((mod: any) => {
                       mod.topics?.forEach((top: any) => {
                          if (top.source) allMats.push({ course: c.title, topic: top.title, name: "Anexo Antigo", url: top.source, type: 'link' });
                          top.materials?.forEach((m: any) => {
                             allMats.push({ course: c.title, topic: top.title, name: m.name, url: m.url, type: m.type });
                          });
                       });
                    });
                 });
                 
                 const filtered = allMats.filter(m => 
                   m.name.toLowerCase().includes(referenceSearchQuery.toLowerCase()) || 
                   m.course.toLowerCase().includes(referenceSearchQuery.toLowerCase()) ||
                   m.topic.toLowerCase().includes(referenceSearchQuery.toLowerCase())
                 );

                 if (filtered.length === 0) {
                   return <div className="text-center text-[#A1A1AA] py-10 text-sm">Nenhum material encontrado nas suas trilhas e cursos.</div>;
                 }

                 return filtered.map((m, idx) => (
                   <div key={idx} className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] p-3 rounded-xl flex items-center justify-between group hover:border-amber-500/30 transition-colors">
                     <div className="flex flex-col overflow-hidden mr-4">
                       <span className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                         {m.type === 'file' ? <FileText className="size-3 text-purple-400" /> : <LinkIcon className="size-3 text-cyan-400" />}
                         {m.name}
                       </span>
                       <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest mt-1 truncate">
                         {m.course} <ChevronRight className="inline size-3" /> {m.topic}
                       </span>
                     </div>
                     <button onClick={() => {
                        if (!selectedCourse) return;
                        const mIdx = referenceModalTarget.mIdx;
                        const tIdx = referenceModalTarget.tIdx;
                        let t = [];
                        try { t = JSON.parse(selectedCourse.next_topics || '[]'); } catch(e){}
                        if (!t[mIdx].topics[tIdx].materials) t[mIdx].topics[tIdx].materials = [];
                        
                        // Check if already exists
                        if (!t[mIdx].topics[tIdx].materials.find((ext: any) => ext.url === m.url)) {
                           t[mIdx].topics[tIdx].materials.push({ name: m.name, url: m.url, type: m.type });
                           updateCourse(selectedCourse.id, { next_topics: JSON.stringify(t) }, false);
                           toast.success("Referência adicionada com sucesso!");
                        } else {
                           toast.info("Este material já está anexado a este tópico.");
                        }
                        setReferenceModalTarget(null);
                     }} className="px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white font-bold text-xs rounded-lg transition-colors shrink-0">
                       Importar
                     </button>
                   </div>
                 ));
              })()}
            </div>
          </div>
        </div>
      )}

      {previewReference && (
        <div className={`fixed z-[9999] transition-all duration-300 ${isPreviewMinimized ? 'bottom-4 right-4 w-[384px] rounded-xl shadow-2xl border border-white/10' : 'inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'}`}>
          <div className={`bg-[#111113] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-[rgba(255,255,255,0.08)] ${isPreviewMinimized ? 'h-[216px]' : ''}`}>
            <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#1A1A1E]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#71717A] bg-white/5 px-2 py-1 rounded">
                  {previewReference.refType === 'book' ? 'Citação' : 'Vídeo'}
                </span>
                <span className="text-sm font-bold text-white truncate max-w-[200px]">{previewReference.title}</span>
              </div>
              <div className="flex items-center gap-1">
                {previewReference.refType === 'video' && (
                   <button onClick={() => {
                     window.dispatchEvent(new CustomEvent('global-pip', { detail: previewReference }));
                     setPreviewReference(null);
                     setIsPreviewMinimized(false);
                   }} title="Global PiP" className="p-1.5 bg-white/5 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors text-xs font-bold px-3">
                     Puxar para Global
                   </button>
                )}
                <button 
                  onClick={() => setIsPreviewMinimized(!isPreviewMinimized)} 
                  title={isPreviewMinimized ? "Maximizar" : "Minimizar (Picture-in-Picture)"}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-[#A1A1AA] hover:text-white rounded-lg transition-colors"
                >
                  {isPreviewMinimized ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
                </button>
                <button 
                  onClick={() => { setPreviewReference(null); setIsPreviewMinimized(false); }}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            
            <div className={`p-6 overflow-y-auto ${isPreviewMinimized ? 'hidden' : 'max-h-[70vh]'}`}>
              {previewReference.refType === 'video' ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/5 shadow-inner relative">
                  <iframe 
                    src={getSafeEmbedUrl(previewReference.url, previewReference.extra)}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture"
                  ></iframe>
                </div>
              ) : (
                <div className="bg-[#1A1A1E] p-6 rounded-xl border border-white/5">
                  <blockquote className="text-lg text-white font-medium italic border-l-4 border-emerald-500 pl-4">
                    <div dangerouslySetInnerHTML={{ __html: previewReference.extra }} />
                  </blockquote>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
