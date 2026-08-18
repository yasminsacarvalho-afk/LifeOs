import React, { useState, useEffect, Fragment } from "react";
import { usePosStudies } from "@/hooks/use-pos-studies";
import { usePosLibrary } from "@/hooks/use-pos-library";
import { 
  GraduationCap, Plus, Play, BookOpen, Clock, Trophy, Flame, Target, 
  Trash2, Award, Zap, Brain, Calendar as CalendarIcon, CheckCircle2,
  ChevronDown, ChevronUp, Search, Filter, LayoutGrid, List as ListIcon,
  ChevronRight, BookMarked, Book, Sparkles, FileText, Library, CheckSquare,
  TrendingUp, BarChart2, Video, PenTool, LayoutTemplate, Layers, AlertCircle,
  MoreVertical, Share2, Star, FolderOpen, ArrowLeft, Download, X, UploadCloud, Loader2, ExternalLink, Link as LinkIcon, Pause, XCircle, Edit2, Camera, Headphones, Music, CloudRain, Minimize2, Maximize2, ArrowUpRight, Tag, LayoutPanelLeft, LayoutPanelTop, GripVertical, GripHorizontal, Settings2, MonitorPlay, History, Edit3, Globe, User, Table2, ImageIcon, GitMerge, CalendarDays, FastForward, Pin, Tablet, HardDrive, Cloud, Users
} from "lucide-react";
import { format, isToday, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subMonths, addMonths, isSameMonth, isSameDay } from "date-fns";
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
  const [topicViewMode, setTopicViewMode] = useState<"lista" | "grade">("lista");
  const [viewMode, setViewMode] = useState<"cards" | "lista" | "kanban" | "tabela" | "galeria" | "timeline" | "calendario" | "por_area">(() => {
    try { const saved = localStorage.getItem('pos_viewMode'); return saved ? JSON.parse(saved) : "cards"; } catch(e) { return "cards"; }
  });
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
  const [coverMode, setCoverMode] = useState<"url" | "upload">("url");
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const [portraitMode, setPortraitMode] = useState<"url" | "upload">("url");
  const portraitInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [referenceModalTarget, setReferenceModalTarget] = useState<{ mIdx: number, tIdx: number } | null>(null);
  const [referenceSearchQuery, setReferenceSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterArea, setFilterArea] = useState("todas");
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
  const [selectedOverviewChannel, setSelectedOverviewChannel] = useState<any>(null);
  const [selectedOverviewMentor, setSelectedOverviewMentor] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
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
  const [newVideoCoverUrl, setNewVideoCoverUrl] = useState('');
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
  const [isPomodoroMode, setIsPomodoroMode] = useState(false);
  
  const [pomodoroPhase, setPomodoroPhase] = useState<'study' | 'short_break' | 'long_break'>('study');
  const [pomodoroCyclesCompleted, setPomodoroCyclesCompleted] = useState(0);
  const [sessionAccumulatedSeconds, setSessionAccumulatedSeconds] = useState(0);
  
  const POMODORO_STUDY_SECONDS = 25 * 60;
  const POMODORO_SHORT_BREAK_SECONDS = 5 * 60;
  const POMODORO_LONG_BREAK_SECONDS = 15 * 60;

  const [localNotes, setLocalNotes] = useState("");
  const [localTags, setLocalTags] = useState("");
  const [tagInput, setTagInput] = useState("");

  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isNextTopicPromptOpen, setIsNextTopicPromptOpen] = useState(false);
  
  const [topicContentMode, setTopicContentMode] = useState<'notes' | 'exercises'>('notes');
  const [newExerciseQ, setNewExerciseQ] = useState("");
  const [newExerciseA, setNewExerciseA] = useState("");
  const [revealedExercises, setRevealedExercises] = useState<number[]>([]);

  // Area modal states
  const [areaModalData, setAreaModalData] = useState<{ area: string, courses: any[] } | null>(null);
  const [areaModalSearch, setAreaModalSearch] = useState("");
  const [areaModalStatus, setAreaModalStatus] = useState("todos");
  const [areaModalDuration, setAreaModalDuration] = useState("todos");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isGlobalSearchOpen) {
        setIsGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobalSearchOpen]);

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
  useEffect(() => { localStorage.setItem('pos_viewMode', JSON.stringify(viewMode)); }, [viewMode]);

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

  const globalSearchResults = React.useMemo(() => {
    if (!globalSearchQuery || globalSearchQuery.trim().length < 2) return [];
    
    const query = globalSearchQuery.toLowerCase().trim();
    const results: any[] = [];
    
    courses.forEach(course => {
      // Check course level
      if (course.title.toLowerCase().includes(query) || (course.category && course.category.toLowerCase().includes(query))) {
        results.push({
          type: 'course',
          courseId: course.id,
          title: course.title,
          subtitle: course.category || "Estudo",
          matchType: 'Título do Curso'
        });
      }
      
      // Check modules and topics
      try {
        const mods = JSON.parse(course.next_topics || '[]');
        mods.forEach((mod: any) => {
          mod.topics?.forEach((top: any, tIdx: number) => {
            const topId = top.id || tIdx;
            
            const titleMatch = top.title?.toLowerCase().includes(query);
            const tagsMatch = top.tags?.toLowerCase().includes(query);
            
            // Extract plain text from notes for searching
            let plainNotes = "";
            if (top.notes) {
               // simple regex to strip html
               plainNotes = top.notes.replace(/<[^>]+>/g, ' ').toLowerCase();
            }
            const notesMatch = plainNotes.includes(query);
            
            if (titleMatch || tagsMatch || notesMatch) {
               let snippet = "";
               if (notesMatch) {
                 const matchIdx = plainNotes.indexOf(query);
                 const start = Math.max(0, matchIdx - 30);
                 const end = Math.min(plainNotes.length, matchIdx + query.length + 30);
                 snippet = "..." + plainNotes.substring(start, end).replace(/\s+/g, ' ') + "...";
               } else if (tagsMatch) {
                 snippet = `Tag: ${top.tags}`;
               }
               
               results.push({
                 type: 'topic',
                 courseId: course.id,
                 courseTitle: course.title,
                 topicId: topId,
                 title: top.title,
                 subtitle: mod.title,
                 matchType: titleMatch ? 'Título' : (notesMatch ? 'Anotações' : 'Tags'),
                 snippet
               });
            }
          });
        });
      } catch (e) {}
    });
    
    return results.slice(0, 30); // Max 30 results for performance
  }, [globalSearchQuery, courses]);


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
          
          if (isPomodoroMode) {
             const target = pomodoroPhase === 'study' ? POMODORO_STUDY_SECONDS : 
                            pomodoroPhase === 'short_break' ? POMODORO_SHORT_BREAK_SECONDS : 
                            POMODORO_LONG_BREAK_SECONDS;
             if (next >= target) {
               setIsTimerPaused(true);
               try {
                 const audio = new Audio('/notification.mp3');
                 audio.play().catch(e => console.log('Audio play failed', e));
               } catch(e) {}
               
               if (pomodoroPhase === 'study') {
                  const newCycles = pomodoroCyclesCompleted + 1;
                  setPomodoroCyclesCompleted(newCycles);
                  setSessionAccumulatedSeconds(s => s + target);
                  
                  if (newCycles % 4 === 0) {
                     setPomodoroPhase('long_break');
                     toast.success("🍅 Ciclo completo! Hora de uma pausa longa (15m).", { icon: "🎉" });
                  } else {
                     setPomodoroPhase('short_break');
                     toast.success("🍅 Pomodoro concluído! Hora de uma pausa curta (5m).", { icon: "☕" });
                  }
               } else {
                  setPomodoroPhase('study');
                  toast.success("⏰ Pausa finalizada! De volta aos estudos.", { icon: "🚀" });
               }
               return 0; // reset elapsed for the next phase
             }
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTopicTimer, isTimerPaused, isPomodoroMode, pomodoroPhase, pomodoroCyclesCompleted]);

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
  const handleShareCourse = async (course: any) => {
    try {
      let token = course.share_token;
      if (!token || !course.is_public) {
        token = token || crypto.randomUUID();
        const success = await updateCourse(course.id, { is_public: true, share_token: token }, false);
        if (!success) throw new Error("Falha ao atualizar curso para público.");
      }
      const shareUrl = `${window.location.origin}/public/course/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link público copiado! Qualquer pessoa com este link terá acesso somente leitura.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao compartilhar.");
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

  const totalRegisteredHours = courses.reduce((acc, c) => acc + (c.total_hours || 0), 0);
  const globalHoursPercent = totalRegisteredHours ? Math.round((totalHours / totalRegisteredHours) * 100) : 0;
  
  const totalItemsCount = courses.length;
  const itemsPercent = totalItemsCount ? Math.round((completedCoursesCount / totalItemsCount) * 100) : 0;

  const activeCourses = courses.filter(c => c.status !== 'concluido');
  const recentCourses = activeCourses.filter(c => c.status === 'em_andamento');

  const getTabStats = () => {
    if (activeTab === "Visão Geral") return null;
    let tabCourses = [];
    if (activeTab === "Concluídos") {
       tabCourses = courses.filter(c => c.status === 'concluido');
    } else if (activeTab === "Cursos") {
       tabCourses = courses.filter(c => !['Faculdade', 'Disciplina', 'Certificação', 'Trilha', 'Projeto Acadêmico', 'Documentário', 'Biografia', 'Conteúdo'].includes(c.category || '') && c.status !== 'concluido');
    } else if (activeTab === "Faculdade") {
       tabCourses = courses.filter(c => ['Faculdade', 'Disciplina'].includes(c.category || '') && c.status !== 'concluido');
    } else if (activeTab === "Certificações") {
       tabCourses = courses.filter(c => c.category === 'Certificação' && c.status !== 'concluido');
    } else if (activeTab === "Trilhas") {
       tabCourses = courses.filter(c => c.category === 'Trilha' && c.status !== 'concluido');
    } else if (activeTab === "Projetos") {
       tabCourses = courses.filter(c => c.category === 'Projeto Acadêmico' && c.status !== 'concluido');
    } else if (activeTab === "Documentários") {
       tabCourses = courses.filter(c => c.category === 'Documentário' && c.status !== 'concluido');
    } else if (activeTab === "Biografias") {
       tabCourses = courses.filter(c => c.category === 'Biografia' && c.status !== 'concluido');
    } else if (activeTab === "Conteúdos") {
       tabCourses = courses.filter(c => c.category === 'Conteúdo' && c.status !== 'concluido');
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
  const allKnowledgeAreas = Array.from(new Set(courses.map(c => c.knowledge_area).filter(Boolean)));

  const renderDashboard = () => {
    const allInstructors = Array.from(new Set(courses.flatMap(c => 
      c.instructor ? c.instructor.split(',').map(i => i.trim()).filter(Boolean) : []
    )));
    const allChannels: any[] = [];
    courses.forEach(c => {
      try {
        const desc = JSON.parse(c.description || '{}');
        if (desc.youtube_channels) {
          desc.youtube_channels.forEach((ch: any) => {
            if (!allChannels.find(x => x.name === ch.name)) {
              allChannels.push(ch);
            }
          });
        }
      } catch(e) {}
    });
    const insights: React.ReactNode[] = [];
    
    // Insight 1: Deadlines
    const upcomingDeadlines = courses.filter(c => {
      if (c.status !== 'concluido' && c.deadline) {
        try {
          const d = parseISO(c.deadline);
          if (isSameMonth(d, new Date()) || d < new Date()) return true;
        } catch(e){}
      }
      return false;
    });

    if (upcomingDeadlines.length > 0) {
      const c = upcomingDeadlines[0];
      const isLate = parseISO(c.deadline) < new Date();
      insights.push(
        <div key="deadline" className={cn("p-3 border rounded-xl flex gap-3 items-start", isLate ? "bg-rose-500/10 border-rose-500/20" : "bg-amber-500/10 border-amber-500/20")}>
          <AlertCircle className={cn("size-4 shrink-0 mt-0.5", isLate ? "text-rose-500" : "text-amber-500")} />
          <div>
            <div className={cn("text-xs font-bold", isLate ? "text-rose-400" : "text-amber-400")}>{isLate ? "Prazo Vencido!" : "Prazo Próximo"}</div>
            <div className={cn("text-[10px] mt-0.5", isLate ? "text-rose-500/70" : "text-amber-500/70")}>O prazo para "{c.title}" é {c.deadline}.</div>
          </div>
        </div>
      );
    }

    // Insight 2: Performance
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentSess = sessions.filter(s => new Date(s.created_at || new Date()) > oneWeekAgo);
    
    if (recentSess.length >= 5) {
      insights.push(
        <div key="perf" className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex gap-3 items-start">
          <TrendingUp className="size-4 text-cyan-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-cyan-400">Ritmo Acelerado</div>
            <div className="text-[10px] text-cyan-500/70 mt-0.5">Você realizou {recentSess.length} sessões de foco nos últimos 7 dias. Continue assim!</div>
          </div>
        </div>
      );
    } else {
       insights.push(
        <div key="perf" className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-3 items-start">
          <TrendingUp className="size-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-indigo-400">Retome o Foco</div>
            <div className="text-[10px] text-indigo-400/70 mt-0.5">Sua frequência de estudo está baixa essa semana. Que tal um Pomodoro agora?</div>
          </div>
        </div>
      );
    }

    // Insight 3: Abandoned or In Progress
    const inProgress = courses.filter(c => c.status === 'em_andamento');
    if (inProgress.length > 3) {
      insights.push(
        <div key="abandon" className="p-3 bg-[#1A1A1E] border border-white/5 rounded-xl flex gap-3 items-start">
          <BookMarked className="size-4 text-[#A1A1AA] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-white">Foco Disperso?</div>
            <div className="text-[10px] text-[#A1A1AA] mt-0.5">Você tem {inProgress.length} materiais iniciados ao mesmo tempo. Tente concluir um antes de começar outro.</div>
          </div>
        </div>
      );
    } else if (inProgress.length > 0) {
       const oldest = inProgress.sort((a,b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())[0];
       insights.push(
        <div key="abandon" className="p-3 bg-[#1A1A1E] border border-white/5 rounded-xl flex gap-3 items-start">
          <BookMarked className="size-4 text-[#A1A1AA] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-white">Termine o que começou</div>
            <div className="text-[10px] text-[#A1A1AA] mt-0.5">Não esqueça de finalizar "{oldest.title}".</div>
          </div>
        </div>
      );
    } else {
       insights.push(
        <div key="abandon" className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3 items-start">
          <BookMarked className="size-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-emerald-400">Tudo em Dia</div>
            <div className="text-[10px] text-emerald-500/70 mt-0.5">Você não tem pendências em andamento. Inicie uma nova jornada!</div>
          </div>
        </div>
      );
    }

    return (
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
               <div className="bg-gradient-to-br from-[#1A1A1E] to-[#111113] p-4 rounded-2xl border border-emerald-500/10 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                 <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-[20px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
                 <div className="flex items-center justify-between relative z-10">
                   <div>
                     <div className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.2em] mb-1">Carga Horária</div>
                     <div className="text-xl font-black text-white">{Math.round(totalHours)}h <span className="text-xs font-medium text-[#A1A1AA]">/ {Math.round(totalRegisteredHours)}h</span></div>
                   </div>
                   <div className="size-11 rounded-full border-[3px] border-emerald-500/20 flex items-center justify-center border-t-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-[#0A0A0A]">
                      <span className="text-[10px] font-bold text-emerald-400">{globalHoursPercent}%</span>
                   </div>
                 </div>
               </div>

               <div className="bg-gradient-to-br from-[#1A1A1E] to-[#111113] p-4 rounded-2xl border border-purple-500/10 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                 <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/5 rounded-full blur-[20px] pointer-events-none group-hover:bg-purple-500/10 transition-colors"></div>
                 <div className="flex items-center justify-between relative z-10">
                   <div>
                     <div className="text-[10px] font-black text-purple-400/70 uppercase tracking-[0.2em] mb-1">Materiais Prontos</div>
                     <div className="text-xl font-black text-white">{completedCoursesCount} <span className="text-xs font-medium text-[#A1A1AA]">/ {totalItemsCount}</span></div>
                   </div>
                   <div className="size-11 rounded-full border-[3px] border-purple-500/20 flex items-center justify-center border-t-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-[#0A0A0A]">
                      <span className="text-[10px] font-bold text-purple-400">{itemsPercent}%</span>
                   </div>
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
             {insights}
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
                     const p = JSON.parse(c.description || '{}');
                     if (p.text_description) {
                       return <p className="text-xs text-[#71717A] mb-3 line-clamp-2">{p.text_description}</p>;
                     }
                   } catch (e) {}
                   return null;
                 })()}
                 
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

       {/* Retorne Aonde Parou (Últimas Sessões) */}
       <h3 className="text-lg font-bold text-white mb-4 mt-12 flex items-center gap-2">
         <History className="size-5 text-blue-500" /> Retorne Aonde Parou
       </h3>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {sessions.length === 0 ? (
            <div className="col-span-full p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm">
              Nenhuma sessão de estudo registrada ainda. Inicie um estudo e registre sua primeira sessão!
            </div>
         ) : sessions.slice(0, 3).map((session) => {
            const relatedCourse = courses.find(c => c.id === session.course_id);
            return (
              <div key={session.id} onClick={() => { if (relatedCourse) setSelectedCourseId(relatedCourse.id); }} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 hover:border-blue-500/30 transition-all group cursor-pointer shadow-lg flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 bg-blue-500/5 blur-[40px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">{format(new Date(session.session_date), "dd 'de' MMM", {locale: ptBR})}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">{session.duration_minutes} min</div>
                </div>
                <h4 className="font-bold text-white text-base leading-tight group-hover:text-blue-400 transition-colors line-clamp-1 relative z-10">{session.class_name || session.module_name || 'Sessão de Estudo'}</h4>
                <div className="text-xs text-[#A1A1AA] line-clamp-1 flex items-center gap-1.5 relative z-10"><BookOpen className="size-3" /> {relatedCourse?.title || 'Material Desconhecido'}</div>
                {session.summary && <div className="mt-2 text-xs text-[#71717A] italic line-clamp-2 border-l-2 border-blue-500/20 pl-2 relative z-10">{session.summary}</div>}
              </div>
            );
         })}
       </div>

       {/* Últimos Escritos (Estúdio) */}
       <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
               <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.1)]"><Edit3 className="size-5 text-indigo-500" /></div>
               Últimos Escritos
             </h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
             {(() => {
               try {
                 const s = localStorage.getItem('lifeos_articles');
                 const parsed = s ? JSON.parse(s) : [];
                 const recentArticles = parsed.sort((a: any, b: any) => b.updatedAt - a.updatedAt).slice(0, 3);
                 
                 if (recentArticles.length === 0) {
                   return (
                      <div className="col-span-full p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-3xl text-[#A1A1AA] text-sm bg-[#111113]">
                        Nenhum texto escrito ou alterado recentemente.
                      </div>
                   );
                 }
                 return recentArticles.map((article: any) => (
                      <div key={article.id} onClick={() => setIsArticleStudioOpen(true)} className="bg-[#111113] border border-white/5 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group cursor-pointer shadow-lg flex flex-col h-full relative overflow-hidden hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-700"></div>
                        <div className="flex items-center justify-between mb-5 relative z-10">
                          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform"><FileText className="size-4" /></div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] bg-[#1A1A1E] px-2 py-1 rounded-md border border-white/5 group-hover:text-indigo-400 transition-colors">
                            {format(new Date(article.updatedAt), "dd MMM", {locale: ptBR})}
                          </div>
                        </div>
                        <h4 className="font-bold text-white text-lg leading-tight group-hover:text-indigo-400 transition-colors line-clamp-2 relative z-10 mb-3">{article.title || 'Artigo sem título'}</h4>
                        <div className="text-xs text-[#A1A1AA] line-clamp-3 relative z-10 leading-relaxed mt-auto">{article.content ? article.content.replace(/<[^>]*>?/gm, '') : 'Nenhum conteúdo.'}</div>
                      </div>
                 ));
               } catch(e) {
                 return null;
               }
             })()}
           </div>
       </div>

       {/* O Ecossistema (Áreas, Professores, Canais) */}
       <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
           <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
               <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.1)]"><Globe className="size-5 text-emerald-500" /></div>
               Ecossistema de Aprendizado
             </h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Áreas Card */}
              <div className="bg-[#111113] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-cyan-500/30 transition-all shadow-lg hover:shadow-[0_0_40px_rgba(6,182,212,0.05)] flex flex-col">
                  <div className="absolute top-0 right-0 p-24 bg-cyan-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors duration-700"></div>
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20"><Layers className="size-6 text-cyan-400 group-hover:scale-110 transition-transform duration-500" /></div>
                    <div>
                      <h4 className="font-bold text-white text-lg md:text-xl tracking-tight">Áreas Exploradas</h4>
                      <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mt-0.5">{allKnowledgeAreas.length} Mapeadas no Cérebro</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 relative z-10 mt-auto">
                     {allKnowledgeAreas.length === 0 ? <span className="text-xs text-[#71717A] italic">Nenhuma área definida ainda.</span> : allKnowledgeAreas.map((area, idx) => (
                        <div key={idx} className="px-3 py-1.5 bg-[#1A1A1E] border border-white/5 text-[#A1A1AA] hover:text-cyan-400 hover:bg-cyan-500/5 text-xs font-bold rounded-xl shadow-sm hover:border-cyan-500/30 transition-all cursor-default flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                          {String(area)}
                        </div>
                     ))}
                  </div>
              </div>

              {/* Mentors Card */}
              <div className="bg-[#111113] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-violet-500/30 transition-all shadow-lg hover:shadow-[0_0_40px_rgba(139,92,246,0.05)] flex flex-col">
                  <div className="absolute top-0 right-0 p-24 bg-violet-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-violet-500/10 transition-colors duration-700"></div>
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20"><GraduationCap className="size-6 text-violet-400 group-hover:scale-110 transition-transform duration-500" /></div>
                    <div>
                      <h4 className="font-bold text-white text-lg md:text-xl tracking-tight">Mentores & Professores</h4>
                      <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mt-0.5">{allInstructors.length} Guias Conectados</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 relative z-10 mt-auto">
                     {allInstructors.length === 0 ? <span className="text-xs text-[#71717A] italic">Nenhum professor registrado.</span> : allInstructors.map((inst, idx) => (
                        <div key={idx} onClick={() => setSelectedOverviewMentor(String(inst))} className="px-3 py-1.5 bg-[#1A1A1E] border border-white/5 text-[#A1A1AA] hover:text-violet-400 hover:bg-violet-500/5 text-xs font-bold rounded-xl shadow-sm hover:border-violet-500/30 transition-all cursor-pointer flex items-center gap-2 group/inst">
                          <div className="size-4 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover/inst:scale-110 transition-transform">
                            <User className="size-2.5 text-white" />
                          </div>
                          <span className="truncate">{String(inst)}</span>
                        </div>
                     ))}
                  </div>
              </div>

              {/* Channels Card */}
              <div className="bg-[#111113] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-rose-500/30 transition-all shadow-lg hover:shadow-[0_0_40px_rgba(244,63,94,0.05)] md:col-span-2 xl:col-span-1 flex flex-col">
                  <div className="absolute top-0 right-0 p-24 bg-rose-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-rose-500/10 transition-colors duration-700"></div>
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20"><MonitorPlay className="size-6 text-rose-400 group-hover:scale-110 transition-transform duration-500" /></div>
                    <div>
                      <h4 className="font-bold text-white text-lg md:text-xl tracking-tight">Canais da Videoteca</h4>
                      <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mt-0.5">{allChannels.length} Assinaturas Mapeadas</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-3 gap-3 relative z-10 mt-auto">
                     {allChannels.length === 0 ? <span className="text-xs text-[#71717A] italic col-span-full">Nenhum canal na videoteca ainda.</span> : allChannels.slice(0, 9).map((ch, idx) => (
                        <div key={idx} onClick={() => setSelectedOverviewChannel(ch)} className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 text-center hover:border-rose-500/30 hover:bg-white/5 transition-all group/ch cursor-pointer">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-black border-2 border-white/5 group-hover/ch:border-rose-500/50 group-hover/ch:scale-110 transition-all shadow-md">
                            {ch.cover_url ? <img src={ch.cover_url} alt={ch.name} className="w-full h-full object-cover" /> : <MonitorPlay className="size-4 m-auto mt-2.5 text-white/20" />}
                          </div>
                          <div className="text-[9px] font-bold text-[#71717A] group-hover/ch:text-rose-300 line-clamp-2 leading-tight px-1 w-full">{ch.name}</div>
                        </div>
                     ))}
                     {allChannels.length > 9 && (
                        <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-all opacity-50">
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                             <MoreVertical className="size-4 text-[#A1A1AA]"/>
                          </div>
                          <div className="text-[9px] font-bold text-[#71717A]">+{allChannels.length - 9}</div>
                        </div>
                     )}
                  </div>
              </div>
           </div>
       </div>

       {selectedOverviewChannel && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOverviewChannel(null)}></div>
           <div className="bg-[#111113] border border-white/10 rounded-3xl p-6 md:p-8 relative z-10 w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
             <button onClick={() => setSelectedOverviewChannel(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">
               <X className="size-5" />
             </button>
             
             <div className="flex items-center gap-5 mb-8">
               <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black border border-white/10 shrink-0">
                  {selectedOverviewChannel.cover_url ? (
                    <img src={selectedOverviewChannel.cover_url} className="w-full h-full object-cover" />
                  ) : (
                    <MonitorPlay className="size-8 m-auto mt-4 text-white/20" />
                  )}
               </div>
               <div>
                 <h2 className="text-2xl font-black text-white tracking-tight">{selectedOverviewChannel.name}</h2>
                 <p className="text-xs text-[#A1A1AA] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5"><MonitorPlay className="size-3" /> Radiografia do Canal</p>
               </div>
             </div>

             <div className="space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar">
               {(() => {
                 const channelVideos: any[] = [];
                 courses.forEach(course => {
                   try {
                     const desc = JSON.parse(course.description || '{}');
                     if (desc.youtube_channels) {
                       const ch = desc.youtube_channels.find((c:any) => c.name === selectedOverviewChannel.name);
                       if (ch && ch.videos) {
                         ch.videos.forEach((v:any) => {
                            const hasDirectNotes = !!v.notes && v.notes.length > 10;
                            let hasReferences = false;
                            try {
                               const articles = JSON.parse(localStorage.getItem('lifeos_articles') || '[]');
                               hasReferences = articles.some((a:any) => a.content && a.content.includes(v.id));
                            } catch(e){}

                            channelVideos.push({
                               ...v,
                               courseName: course.title,
                               courseId: course.id,
                               hasAnnotations: hasDirectNotes || hasReferences
                            });
                         });
                       }
                     }
                   } catch(e){}
                 });

                 if (channelVideos.length === 0) {
                   return (
                     <div className="text-center p-10 bg-[#1A1A1E] rounded-3xl border border-dashed border-white/10">
                       <MonitorPlay className="size-8 text-[#A1A1AA] mx-auto mb-3 opacity-30" />
                       <p className="text-sm font-bold text-white">Nenhum vídeo salvo neste canal.</p>
                     </div>
                   );
                 }

                 return channelVideos.map((vid, i) => {
                   let thumbId = vid.url.split('v=')[1];
                   if(!thumbId) thumbId = vid.url.split('/').pop();
                   if(thumbId && thumbId.includes('&')) thumbId = thumbId.split('&')[0];
                   
                   return (
                     <div key={i} className="bg-[#1A1A1E] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all group shadow-sm">
                       <div className="w-16 h-12 rounded-lg bg-[#111113] border border-white/5 overflow-hidden shrink-0 relative group-hover:border-rose-500/20 transition-colors">
                         {thumbId ? <img src={`https://img.youtube.com/vi/${thumbId}/mqdefault.jpg`} className="w-full h-full object-cover" /> : <Video className="size-4 text-[#A1A1AA] m-auto mt-4" />}
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <Play className="size-4 text-white" />
                         </div>
                       </div>
                       <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-white text-sm truncate group-hover:text-rose-400 transition-colors" title={vid.title}>{vid.title}</h4>
                         <div className="text-[10px] text-[#A1A1AA] font-bold tracking-wider mt-1.5 truncate">
                           Aplicado em: <span className="text-white bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md ml-1">{vid.courseName}</span>
                         </div>
                       </div>
                       {vid.hasAnnotations && (
                         <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0" title="Possui marcações de estudo conectadas">
                           <PenTool className="size-3.5 text-emerald-400" />
                         </div>
                       )}
                     </div>
                   );
                 });
               })()}
             </div>
           </div>
         </div>
       )}

       {selectedOverviewMentor && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOverviewMentor(null)}></div>
           <div className="bg-[#111113] border border-white/10 rounded-3xl p-6 md:p-8 relative z-10 w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
             <button onClick={() => setSelectedOverviewMentor(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">
               <X className="size-5" />
             </button>
             
             <div className="flex items-center gap-5 mb-8">
               <div className="w-16 h-16 rounded-2xl overflow-hidden bg-violet-500/10 border border-violet-500/20 shrink-0 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                  <User className="size-8 text-violet-400" />
               </div>
               <div>
                 <h2 className="text-2xl font-black text-white tracking-tight">{selectedOverviewMentor}</h2>
                 <p className="text-xs text-[#A1A1AA] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5"><GraduationCap className="size-3" /> Radiografia do Mentor</p>
               </div>
             </div>

             <div className="space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar">
               {(() => {
                 const mentorCourses = courses.filter(c => 
                   c.instructor && c.instructor.split(',').map(i => i.trim()).includes(selectedOverviewMentor as string)
                 );

                 if (mentorCourses.length === 0) {
                   return (
                     <div className="text-center p-10 bg-[#1A1A1E] rounded-3xl border border-dashed border-white/10">
                       <GraduationCap className="size-8 text-[#A1A1AA] mx-auto mb-3 opacity-30" />
                       <p className="text-sm font-bold text-white">Nenhum material salvo para este mentor.</p>
                     </div>
                   );
                 }

                 return mentorCourses.map((course, i) => {
                   let coverUrl = "";
                   try { coverUrl = JSON.parse(course.description || '{}').cover_url || ""; } catch(e){}
                   
                   const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
                   const statusColor = course.status === 'concluido' ? 'text-emerald-400' : course.status === 'em_andamento' ? 'text-cyan-400' : 'text-amber-400';
                   const statusBg = course.status === 'concluido' ? 'bg-emerald-500/10' : course.status === 'em_andamento' ? 'bg-cyan-500/10' : 'bg-amber-500/10';

                   return (
                     <div key={course.id} className="bg-[#1A1A1E] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group shadow-sm cursor-pointer" onClick={() => { setSelectedCourseId(course.id); setSelectedOverviewMentor(null); }}>
                       <div className="w-16 h-16 rounded-xl bg-[#111113] border border-white/5 overflow-hidden shrink-0 relative group-hover:border-violet-500/20 transition-colors">
                         {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <BookOpen className="size-6 text-[#A1A1AA] m-auto mt-5" />}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="text-[10px] text-[#A1A1AA] font-bold tracking-widest uppercase mb-1 flex flex-wrap items-center gap-2">
                           <span className={cn("px-1.5 py-0.5 rounded", statusBg, statusColor)}>{course.status.replace('_', ' ')}</span>
                           <span>• {course.knowledge_area || "Sem Área"}</span>
                           <span className="opacity-50 text-white">• {course.category || "Estudo"}</span>
                         </div>
                         <h4 className="font-bold text-white text-sm truncate group-hover:text-violet-400 transition-colors" title={course.title}>{course.title}</h4>
                         <div className="mt-2 flex items-center gap-2">
                           <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-violet-500 rounded-full" style={{ width: `${percent}%` }}></div>
                           </div>
                           <span className="text-[9px] font-bold text-[#A1A1AA]">{percent}%</span>
                         </div>
                       </div>
                       <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors shrink-0">
                          <ChevronRight className="size-4 text-[#A1A1AA] group-hover:text-violet-400 transition-colors" />
                       </div>
                     </div>
                   );
                 });
               })()}
             </div>
           </div>
         </div>
       )}

    </div>
    );
  };

  const renderIntelligenceReport = () => {
    // 1. Cálculos Reais
    const totalCourseHours = courses.reduce((acc, c) => acc + (c.completed_hours || 0), 0);
    const totalReadingHours = Math.round(readingSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / 60);
    const totalStudyHours = totalCourseHours + totalReadingHours;

    const totalCompleted = courses.filter(c => c.status === 'concluido').length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentStudySessions = sessions.filter(s => new Date(s.created_at || new Date()) > oneWeekAgo).length;
    const recentReadingSessions = readingSessions.filter(s => new Date(s.created_at || new Date()) > oneWeekAgo).length;
    const totalRecentSessions = recentStudySessions + recentReadingSessions;

    const areaHours: Record<string, number> = {};
    courses.forEach(c => {
      if (c.knowledge_area) {
        areaHours[c.knowledge_area] = (areaHours[c.knowledge_area] || 0) + (c.completed_hours || 0);
      }
    });
    const maxAreaEntries = Object.entries(areaHours).sort((a, b) => b[1] - a[1]);
    const maxArea = maxAreaEntries.length > 0 ? maxAreaEntries[0][0] : "Exploração Geral";
    const weakestArea = maxAreaEntries.length > 1 ? maxAreaEntries[maxAreaEntries.length - 1][0] : "Nenhuma";

    const totalTopics = courses.reduce((acc, c) => {
      let count = 0;
      try {
         const t = JSON.parse(c.next_topics || '[]');
         t.forEach((m:any) => count += (m.topics?.length || 0));
      } catch(e){}
      return acc + count;
    }, 0);

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div className="bg-[#0A0A0A] p-6 md:p-10 rounded-3xl border border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-[120px] w-96 h-96 rounded-full pointer-events-none"></div>
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <Brain className="size-8 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Inteligência sobre você</h2>
              <p className="text-sm text-indigo-400 font-bold uppercase tracking-widest mt-1">Análise Dinâmica de Produtividade</p>
            </div>
          </div>

          <div className="bg-[#111113] border border-white/5 p-6 rounded-2xl mb-8 relative z-10">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><CalendarIcon className="size-4 text-[#A1A1AA]"/> Desempenho Global:</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1A1A1E] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                 <Clock className="size-6 text-cyan-400 mb-2" />
                 <span className="text-2xl font-black text-white">{totalStudyHours}h</span>
                 <span className="text-xs text-[#A1A1AA] font-bold uppercase mt-1">Estudadas</span>
              </div>
              <div className="bg-[#1A1A1E] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                 <Brain className="size-6 text-purple-400 mb-2" />
                 <span className="text-2xl font-black text-white">{totalTopics}</span>
                 <span className="text-xs text-[#A1A1AA] font-bold uppercase mt-1">Tópicos<br/>Explorados</span>
              </div>
              <div className="bg-[#1A1A1E] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                 <CheckSquare className="size-6 text-emerald-400 mb-2" />
                 <span className="text-2xl font-black text-white">{totalCompleted}</span>
                 <span className="text-xs text-[#A1A1AA] font-bold uppercase mt-1">Materiais<br/>Concluídos</span>
              </div>
              <div className="bg-[#1A1A1E] p-4 rounded-xl border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)] flex flex-col items-center justify-center text-center">
                 <Flame className="size-6 text-orange-500 mb-2" />
                 <span className="text-2xl font-black text-orange-400">{totalRecentSessions}</span>
                 <span className="text-xs text-orange-500/80 font-bold uppercase mt-1">Sessões na<br/>Última Semana</span>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6">
              <Sparkles className="size-4 text-amber-400" /> Diagnóstico Baseado nos seus Dados:
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0 w-fit"><TrendingUp className="size-5 text-emerald-400" /></div>
                <div>
                  <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-widest mb-2">Evolução Máxima</h4>
                  <p className="text-white text-sm">Sua maior concentração de horas está em <span className="font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">{maxArea}</span>.</p>
                </div>
              </div>
              
              <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex flex-col gap-3">
                <div className="p-2 bg-rose-500/20 rounded-lg shrink-0 w-fit"><AlertCircle className="size-5 text-rose-400" /></div>
                <div>
                  <h4 className="font-bold text-rose-400 text-xs uppercase tracking-widest mb-2">Ponto de Atenção</h4>
                  <p className="text-white text-sm">A área com menor dedicação ativa no momento é <span className="font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">{weakestArea}</span>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
            <button onClick={() => { setShowViewMenu(!showViewMenu); setShowFilterMenu(false); }} className={cn("px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111113] text-xs font-bold text-white hover:bg-[#1A1A1E] flex items-center gap-2", showViewMenu && "bg-[#1A1A1E] border-cyan-500/30")}>
              <LayoutGrid className="size-3" /> Visualização
            </button>
            {showViewMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest px-2 py-1 mb-1">Layout</div>
                 <button onClick={() => { setViewMode("cards"); setShowViewMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2", viewMode === "cards" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}><LayoutGrid className="size-3"/> Cards</button>
                 <button onClick={() => { setViewMode("por_area"); setShowViewMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2", viewMode === "por_area" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}><Layers className="size-3"/> Por Área</button>
                 <button onClick={() => { setViewMode("lista"); setShowViewMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2", viewMode === "lista" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}><ListIcon className="size-3"/> Lista</button>
                 <button onClick={() => { setViewMode("kanban"); setShowViewMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2", viewMode === "kanban" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}><LayoutTemplate className="size-3"/> Kanban</button>
                 <button onClick={() => { setViewMode("tabela"); setShowViewMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2", viewMode === "tabela" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}><Table2 className="size-3"/> Tabela</button>
                 <button onClick={() => { setViewMode("galeria"); setShowViewMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2", viewMode === "galeria" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}><ImageIcon className="size-3"/> Galeria</button>
                 <button onClick={() => { setViewMode("timeline"); setShowViewMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2", viewMode === "timeline" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}><GitMerge className="size-3"/> Timeline</button>
                 <button onClick={() => { setViewMode("calendario"); setShowViewMenu(false); }} className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2", viewMode === "calendario" ? "bg-cyan-500/10 text-cyan-400" : "text-white hover:bg-white/5")}><CalendarDays className="size-3"/> Calendário</button>
              </div>
            )}
            <button onClick={() => { setShowFilterMenu(!showFilterMenu); setShowViewMenu(false); }} className={cn("px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111113] text-xs font-bold text-white hover:bg-[#1A1A1E] flex items-center gap-2", showFilterMenu && "bg-[#1A1A1E] border-cyan-500/30")}>
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

       {(() => {
         const filteredList = courses.filter(c => {
             const searchMatch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.knowledge_area?.toLowerCase().includes(searchQuery.toLowerCase());
             if (!searchMatch) return false;
             
             if (filterStatus !== "todos" && c.status !== filterStatus && activeTab !== "Concluídos") return false;
             if (filterArea !== "todas" && c.knowledge_area !== filterArea) return false;
             
             if (activeTab === "Cursos") return !['Faculdade', 'Disciplina', 'Certificação', 'Trilha', 'Projeto Acadêmico', 'Documentário', 'Biografia', 'Conteúdo'].includes(c.category || '') && c.status !== 'concluido';
             if (activeTab === "Faculdade") return ['Faculdade', 'Disciplina'].includes(c.category || '') && c.status !== 'concluido';
             if (activeTab === "Certificações") return c.category === 'Certificação' && c.status !== 'concluido';
             if (activeTab === "Trilhas") return c.category === 'Trilha' && c.status !== 'concluido';
             if (activeTab === "Projetos") return c.category === 'Projeto Acadêmico' && c.status !== 'concluido';
             if (activeTab === "Documentários") return c.category === 'Documentário' && c.status !== 'concluido';
             if (activeTab === "Biografias") return c.category === 'Biografia' && c.status !== 'concluido';
             if (activeTab === "Conteúdos") return c.category === 'Conteúdo' && c.status !== 'concluido';
             if (activeTab === "Concluídos") return c.status === 'concluido';
             
             return true;
         });

         if (filteredList.length === 0) {
           return <div className="p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm">Nenhum material encontrado com os filtros atuais.</div>;
         }

         if (activeTab === "Conteúdos") {
            return (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 animate-in fade-in duration-500">
                 {filteredList.map(course => {
                    let thumbUrl = null;
                    if (course.course_url) {
                       if (course.course_url.includes('youtube.com') || course.course_url.includes('youtu.be')) {
                          let thumbId = course.course_url.split('v=')[1];
                          if(!thumbId) thumbId = course.course_url.split('/').pop();
                          if(thumbId && thumbId.includes('&')) thumbId = thumbId.split('&')[0];
                          if(thumbId) thumbUrl = `https://img.youtube.com/vi/${thumbId}/maxresdefault.jpg`;
                       }
                    }
                    if (!thumbUrl) {
                       try { const p = JSON.parse(course.description || '{}'); if (p.cover_url) thumbUrl = p.cover_url; } catch(e){}
                    }

                    return (
                       <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className="group cursor-pointer flex flex-col gap-3 w-full">
                          {/* Thumbnail Container */}
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#0A0A0C] border border-[rgba(255,255,255,0.04)] shadow-lg group-hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all duration-500">
                             {thumbUrl ? (
                                <>
                                  <img src={thumbUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-[#111113]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"></div>
                                </>
                             ) : (
                                <MonitorPlay className="size-10 text-[#A1A1AA]/30 absolute inset-0 m-auto" />
                             )}
                             {/* Floating Play Icon on Hover */}
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 z-10">
                                <div className="w-14 h-14 rounded-full bg-cyan-500/90 shadow-[0_0_20px_rgba(6,182,212,0.6)] backdrop-blur-md flex items-center justify-center">
                                   <Play className="size-6 text-white ml-1 fill-white" />
                                </div>
                             </div>
                             {/* Time indicator */}
                             {course.total_hours > 0 && (
                                <div className="absolute bottom-2 right-2 bg-black/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 shadow-lg z-20">
                                   {course.total_hours}:00
                                </div>
                             )}
                          </div>
                          {/* Info Container */}
                          <div className="flex gap-3 px-1 mt-1">
                             {/* Channel/Area Avatar */}
                             <div className="shrink-0 mt-0.5">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center text-cyan-400 font-bold text-xs uppercase shadow-inner group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-shadow duration-300">
                                   {(course.knowledge_area || "C").charAt(0)}
                                </div>
                             </div>
                             {/* Texts */}
                             <div className="flex flex-col overflow-hidden">
                                <h3 className="text-sm font-semibold text-[#E4E4E7] leading-tight line-clamp-2 group-hover:text-cyan-400 transition-colors duration-300">
                                   {course.title}
                                </h3>
                                <div className="flex items-center gap-1 mt-1.5 text-[12px] text-[#A1A1AA] truncate">
                                   <span className="truncate">{course.knowledge_area || "Conteúdo Variado"}</span>
                                   <span className="shrink-0">•</span>
                                   <span className="capitalize shrink-0">{course.status.replace('_', ' ')}</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    )
                 })}
               </div>
            );
         }

         if (viewMode === "por_area" || (viewMode === "cards" && activeTab === "Trilhas")) {
            const grouped = filteredList.reduce((acc, course) => {
                 const area = course.knowledge_area || 'Outras Áreas';
                 if (!acc[area]) acc[area] = [];
                 acc[area].push(course);
                 return acc;
              }, {} as Record<string, typeof courses>);

              return (
                 <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {Object.entries(grouped).map(([area, areaCourses]) => (
                       <div key={area} className="space-y-4">
                          <h3 className="text-xl md:text-2xl font-black text-white px-3 border-l-4 border-cyan-500 flex items-center gap-2">
                             {area} <span className="text-xs font-bold text-[#71717A] bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{areaCourses.length}</span>
                             {areaCourses.length > 0 && (
                               <button 
                                 onClick={() => { setAreaModalData({ area, courses: areaCourses }); setAreaModalSearch(""); setAreaModalStatus("todos"); setAreaModalDuration("todos"); }}
                                 className="ml-auto text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                               >
                                 Ver Todos <ArrowUpRight className="size-3" />
                               </button>
                             )}
                          </h3>
                          <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x snap-mandatory">
                             {areaCourses.map(course => {
                                if (course.category === 'Conteúdo') {
                                  let thumbUrl = null;
                                  if (course.course_url) {
                                     if (course.course_url.includes('youtube.com') || course.course_url.includes('youtu.be')) {
                                        let thumbId = course.course_url.split('v=')[1];
                                        if(!thumbId) thumbId = course.course_url.split('/').pop();
                                        if(thumbId && thumbId.includes('&')) thumbId = thumbId.split('&')[0];
                                        if(thumbId) thumbUrl = `https://img.youtube.com/vi/${thumbId}/maxresdefault.jpg`;
                                     }
                                  }
                                  if (!thumbUrl) {
                                     try { const p = JSON.parse(course.description || '{}'); if (p.cover_url) thumbUrl = p.cover_url; } catch(e){}
                                  }
                                  return (
                                    <div key={course.id} onClick={() => {
                                        setSelectedCourseId(course.id);
                                        setCourseTab("Diário de Bordo");
                                        if (course.course_url) {
                                            window.dispatchEvent(new CustomEvent('global-pip', { detail: { url: course.course_url, title: course.title, refType: 'video' } }));
                                        }
                                    }} className="snap-start shrink-0 w-[280px] md:w-[320px] bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all group cursor-pointer shadow-lg flex flex-col h-[320px]">
                                       <div className="h-44 w-full relative overflow-hidden bg-[#0A0A0A] flex items-center justify-center">
                                          {thumbUrl ? (
                                             <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 z-0" />
                                          ) : (
                                             <MonitorPlay className="size-10 text-[#A1A1AA]/30 z-0" />
                                          )}
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                             <div className="w-12 h-12 rounded-full bg-cyan-500/90 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                                                <Play className="size-5 text-white ml-1" />
                                             </div>
                                          </div>
                                          <div className="absolute top-3 left-3 flex gap-2 z-20">
                                             <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider">{course.knowledge_area || "Mídia"}</span>
                                          </div>
                                       </div>
                                       <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-[#111113] to-[#0A0A0C] z-20">
                                          <h4 className="font-bold text-base text-white leading-tight line-clamp-3 group-hover:text-cyan-400 transition-colors">{course.title}</h4>
                                          <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                                             <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                                                <MonitorPlay className="size-3" /> Assistir / Anotar
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                  );
                                }

                                const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
                                return (
                                  <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className="snap-start shrink-0 w-[280px] md:w-[320px] bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all group cursor-pointer shadow-lg flex flex-col">
                                    <div className="h-40 w-full relative overflow-hidden bg-gradient-to-br from-[#1A1A1E] to-[#111113] flex items-center justify-center">
                                      <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-transparent to-transparent z-10"></div>
                                      {(() => {
                                         try {
                                           const p = JSON.parse(course.description || '{}');
                                           if (p.cover_url) return <img src={p.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 z-0" />;
                                         } catch(e) {}
                                         return <Layers className="size-16 text-cyan-500/20 group-hover:scale-110 transition-transform duration-500 z-0" />;
                                      })()}
                                      <div className="absolute top-4 left-4 z-20">
                                        <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm shadow-lg">{course.knowledge_area || "Área"}</span>
                                      </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col bg-gradient-to-b from-[#111113] to-[#0A0A0C]">
                                      <h4 className="font-bold text-white text-xl leading-tight mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">{course.title}</h4>
                                      <div className="mt-auto pt-4">
                                        <div className="flex justify-between items-end mb-2">
                                          <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">{course.completed_hours}h / {course.total_hours}h</div>
                                          <div className="text-sm font-bold text-cyan-400">{percent}%</div>
                                        </div>
                                        <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden mb-4">
                                          <div className="h-full bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${percent}%` }}></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                             })}
                          </div>
                       </div>
                    ))}
                 </div>
              );
         }

         if (viewMode === "cards") {
           // Original grid logic
           return (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
               {filteredList.map(course => {
                  if (course.category === 'Conteúdo') {
                    let thumbUrl = null;
                    if (course.course_url) {
                       if (course.course_url.includes('youtube.com') || course.course_url.includes('youtu.be')) {
                          let thumbId = course.course_url.split('v=')[1];
                          if(!thumbId) thumbId = course.course_url.split('/').pop();
                          if(thumbId && thumbId.includes('&')) thumbId = thumbId.split('&')[0];
                          if(thumbId) thumbUrl = `https://img.youtube.com/vi/${thumbId}/maxresdefault.jpg`;
                       }
                    }
                    if (!thumbUrl) {
                       try { const p = JSON.parse(course.description || '{}'); if (p.cover_url) thumbUrl = p.cover_url; } catch(e){}
                    }
                    return (
                      <div key={course.id} onClick={() => {
                          setSelectedCourseId(course.id);
                          setCourseTab("Diário de Bordo");
                          if (course.course_url) {
                              window.dispatchEvent(new CustomEvent('global-pip', { detail: { url: course.course_url, title: course.title, refType: 'video' } }));
                          }
                      }} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all group cursor-pointer shadow-lg flex flex-col h-full min-h-[260px]">
                         <div className="h-40 w-full relative overflow-hidden bg-[#0A0A0A] flex items-center justify-center shrink-0">
                            {thumbUrl ? (
                               <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 z-0" />
                            ) : (
                               <MonitorPlay className="size-10 text-[#A1A1AA]/30 z-0" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                               <div className="w-12 h-12 rounded-full bg-cyan-500/90 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                                  <Play className="size-5 text-white ml-1" />
                               </div>
                            </div>
                            <div className="absolute top-3 left-3 flex gap-2 z-20">
                               <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider">{course.knowledge_area || "Mídia"}</span>
                            </div>
                         </div>
                         <div className="p-4 flex-1 flex flex-col bg-gradient-to-b from-[#111113] to-[#0A0A0C] z-20">
                            <h4 className="font-bold text-sm text-white leading-tight line-clamp-3 group-hover:text-cyan-400 transition-colors">{course.title}</h4>
                            <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                               <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                                  <MonitorPlay className="size-3" /> Assistir / Anotar
                               </div>
                            </div>
                         </div>
                      </div>
                    );
                  }

                  const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
                  const isCompleted = course.status === 'concluido';
                  return (
                    <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all group cursor-pointer shadow-lg flex flex-col">
                      <div className="h-24 w-full relative overflow-hidden bg-gradient-to-br from-[#1A1A1E] to-[#111113] flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111113] to-transparent z-10"></div>
                        {(() => {
                           try {
                             const p = JSON.parse(course.description || '{}');
                             if (p.cover_url) return <img src={p.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500 z-0" />;
                           } catch(e) {}
                           return <GraduationCap className="size-10 text-cyan-500/20 group-hover:scale-110 transition-transform duration-500 z-0" />;
                        })()}
                        <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2">
                          {course.knowledge_area && <span className="px-2 py-0.5 bg-cyan-500/20 backdrop-blur-md rounded border border-cyan-500/30 text-[9px] font-bold text-cyan-400 uppercase tracking-wider">{course.knowledge_area}</span>}
                          {(() => {
                             try {
                               const p = JSON.parse(course.description || '{}');
                               if (p.price || p.purchase_type || p.purchased !== undefined) {
                                  const formatLabel = p.purchase_type === 'mensalidade' ? '/mês' : p.purchase_type === '1_ano' ? ' (1 Ano)' : '';
                                  return (
                                    <span className={cn("px-2 py-0.5 backdrop-blur-md rounded border text-[9px] font-bold uppercase tracking-wider", p.purchased ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-amber-500/20 border-amber-500/30 text-amber-400")}>
                                      {p.purchased ? 'Comprado' : (p.price ? `R$ ${p.price}${formatLabel}` : 'Quero Comprar')}
                                    </span>
                                  );
                               }
                             } catch(e) {}
                             return null;
                          })()}
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h4 className={cn("font-bold text-base leading-tight mb-1 group-hover:text-cyan-400 transition-colors line-clamp-2", isCompleted ? "text-[#A1A1AA]" : "text-white")}>{course.title}</h4>
                        <div className="mt-auto pt-4">
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
           );
         }

         if (viewMode === "lista") {
           return (
             <div className="flex flex-col gap-2 animate-in fade-in duration-500">
               {filteredList.map(course => {
                  const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
                  const isCompleted = course.status === 'concluido';
                  return (
                    <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-xl p-4 flex items-center justify-between hover:border-cyan-500/30 transition-all group cursor-pointer shadow-sm">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-[#1A1A1E] border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {(() => {
                             try {
                               const p = JSON.parse(course.description || '{}');
                               if (p.cover_url) return <img src={p.cover_url} alt="Cover" className="w-full h-full object-cover" />;
                             } catch(e) {}
                             return <BookOpen className="size-4 text-[#A1A1AA]" />;
                          })()}
                        </div>
                        <div>
                          <h4 className={cn("font-bold text-sm leading-tight group-hover:text-cyan-400 transition-colors", isCompleted ? "text-[#A1A1AA]" : "text-white")}>{course.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {course.knowledge_area && <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">{course.knowledge_area}</span>}
                            <span className="text-[#A1A1AA] text-[10px]">•</span>
                            {course.instructor && <span className="text-[10px] text-[#A1A1AA]">{course.instructor}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="hidden md:block w-32">
                           <div className="flex justify-between items-end mb-1">
                             <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest">{course.completed_hours}h / {course.total_hours}h</div>
                             <div className="text-[10px] font-bold text-white">{percent}%</div>
                           </div>
                           <div className="h-1 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
                             <div className={cn("h-full rounded-full", isCompleted ? "bg-emerald-500" : "bg-cyan-500")} style={{ width: `${percent}%` }}></div>
                           </div>
                        </div>
                        <div className="text-[10px] uppercase font-bold text-[#71717A] w-20 text-right">
                          {course.status.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  );
               })}
             </div>
           );
         }

         if (viewMode === "tabela") {
           return (
             <div className="w-full overflow-x-auto bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl animate-in fade-in duration-500">
               <table className="w-full text-left text-sm text-[#A1A1AA]">
                 <thead className="text-[10px] uppercase tracking-widest bg-[#1A1A1E] text-[#71717A]">
                   <tr>
                     <th className="px-6 py-4 font-bold rounded-tl-2xl">Material</th>
                     <th className="px-6 py-4 font-bold">Área</th>
                     <th className="px-6 py-4 font-bold">Status</th>
                     <th className="px-6 py-4 font-bold">Progresso</th>
                     <th className="px-6 py-4 font-bold rounded-tr-2xl">Horas</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                   {filteredList.map(course => {
                      const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
                      return (
                        <tr key={course.id} onClick={() => setSelectedCourseId(course.id)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                          <td className="px-6 py-4 font-bold text-white group-hover:text-cyan-400">{course.title}</td>
                          <td className="px-6 py-4">{course.knowledge_area || '-'}</td>
                          <td className="px-6 py-4">
                             <span className={cn("px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded bg-white/5", course.status === 'concluido' ? "text-emerald-400" : course.status === 'em_andamento' ? "text-cyan-400" : "text-[#A1A1AA]")}>
                               {course.status.replace('_', ' ')}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                               <div className="w-full max-w-[100px] h-1.5 bg-[#1A1A1E] rounded-full overflow-hidden">
                                 <div className={cn("h-full rounded-full", course.status === 'concluido' ? "bg-emerald-500" : "bg-cyan-500")} style={{ width: `${percent}%` }}></div>
                               </div>
                               <span className="text-[10px] font-bold text-white">{percent}%</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-[#A1A1AA] text-xs">{course.completed_hours}h / {course.total_hours}h</td>
                        </tr>
                      );
                   })}
                 </tbody>
               </table>
             </div>
           );
         }

         if (viewMode === "galeria") {
           return (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 animate-in fade-in duration-500">
               {filteredList.map(course => {
                  return (
                    <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className="aspect-[2/3] bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all group cursor-pointer relative">
                      {(() => {
                         try {
                           const p = JSON.parse(course.description || '{}');
                           if (p.cover_url) return <img src={p.cover_url} alt={course.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />;
                         } catch(e) {}
                         return <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1E]"><Book className="size-8 text-[#71717A]/30 group-hover:scale-125 transition-transform duration-500" /></div>;
                      })()}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/40 to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                        <h4 className="font-serif font-bold text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0px] group-hover:text-white/95 text-[16px] md:text-[20px] leading-tight line-clamp-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.15)] uppercase tracking-[0.1em] transition-all duration-500">
                          {course.title}
                        </h4>
                        <div className="h-0.5 w-8 bg-cyan-500 mt-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
                      </div>
                    </div>
                  );
               })}
             </div>
           );
         }

         if (viewMode === "kanban") {
           const columns = [
             { id: 'fila', title: 'Na Fila', courses: filteredList.filter(c => c.status === 'fila') },
             { id: 'em_andamento', title: 'Em Andamento', courses: filteredList.filter(c => c.status === 'em_andamento') },
             { id: 'pausado', title: 'Pausado', courses: filteredList.filter(c => c.status === 'pausado') },
             { id: 'concluido', title: 'Concluído', courses: filteredList.filter(c => c.status === 'concluido') }
           ];
           return (
             <div className="flex gap-4 overflow-x-auto pb-6 animate-in fade-in duration-500 items-start">
               {columns.map(col => (
                 <div key={col.id} className="min-w-[280px] md:min-w-[320px] w-full bg-[#111113]/50 border border-[rgba(255,255,255,0.04)] rounded-2xl p-4 flex flex-col gap-3">
                   <div className="flex justify-between items-center px-1 mb-2">
                     <h4 className="text-xs font-bold uppercase tracking-widest text-white">{col.title}</h4>
                     <span className="text-[10px] font-bold text-[#71717A] bg-[#1A1A1E] px-2 py-0.5 rounded-md border border-white/5">{col.courses.length}</span>
                   </div>
                   {col.courses.map(course => {
                     const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
                     return (
                       <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className="bg-[#1A1A1E] border border-white/5 rounded-xl p-4 hover:border-cyan-500/30 transition-all cursor-pointer group shadow-sm flex flex-col gap-3">
                         <div className="flex items-start gap-3">
                           {(() => {
                              try {
                                const p = JSON.parse(course.description || '{}');
                                if (p.cover_url) return <img src={p.cover_url} alt="Cover" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />;
                              } catch(e) {}
                              return <div className="w-10 h-10 rounded-md bg-[#111113] border border-white/5 flex items-center justify-center flex-shrink-0"><BookOpen className="size-4 text-[#A1A1AA]" /></div>;
                           })()}
                           <div>
                             <h5 className="text-sm font-bold text-white leading-tight group-hover:text-cyan-400 transition-colors line-clamp-2">{course.title}</h5>
                             {course.knowledge_area && <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest">{course.knowledge_area}</span>}
                           </div>
                         </div>
                         <div className="h-1 w-full bg-[#111113] rounded-full overflow-hidden mt-1">
                           <div className={cn("h-full rounded-full", course.status === 'concluido' ? "bg-emerald-500" : "bg-cyan-500")} style={{ width: `${percent}%` }}></div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               ))}
             </div>
           );
         }

         if (viewMode === "timeline") {
           // Basic timeline based on created_at (ascending to show a journey)
           const timelineList = [...filteredList].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
           return (
             <div className="relative pl-6 md:pl-8 border-l-2 border-[#1A1A1E] space-y-8 py-4 animate-in fade-in duration-500">
               {timelineList.map((course, idx) => {
                 const isCompleted = course.status === 'concluido';
                 return (
                   <div key={course.id} className="relative group cursor-pointer" onClick={() => setSelectedCourseId(course.id)}>
                     <div className={cn("absolute -left-[31px] md:-left-[39px] w-4 h-4 rounded-full border-4 border-[#0A0A0C] transition-colors", isCompleted ? "bg-emerald-500 group-hover:bg-emerald-400" : "bg-[#71717A] group-hover:bg-cyan-500")}></div>
                     <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 hover:border-cyan-500/30 transition-all shadow-md">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1">{course.created_at ? format(new Date(course.created_at), "dd 'de' MMM, yyyy", {locale: ptBR}) : "Sem data de criação"}</div>
                        <h4 className={cn("font-bold text-lg leading-tight mb-2 group-hover:text-cyan-400 transition-colors", isCompleted ? "text-[#A1A1AA]" : "text-white")}>{course.title}</h4>
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 bg-white/5 rounded border border-white/10 text-[9px] font-bold text-[#A1A1AA] uppercase tracking-wider">{course.knowledge_area || "Área"}</span>
                          <span className="px-2 py-0.5 bg-white/5 rounded border border-white/10 text-[9px] font-bold text-[#A1A1AA] uppercase tracking-wider">{course.status.replace('_', ' ')}</span>
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           );
         }

         if (viewMode === "calendario") {
           const monthStart = startOfMonth(currentCalendarMonth);
           const monthEnd = endOfMonth(monthStart);
           const startDate = startOfWeek(monthStart);
           const endDate = endOfWeek(monthEnd);

           const dateFormat = "d";
           const rows = [];
           let days = [];
           let day = startDate;
           let formattedDate = "";

           while (day <= endDate) {
             for (let i = 0; i < 7; i++) {
               formattedDate = format(day, dateFormat);
               const cloneDay = day;
               
               const dayCourses = filteredList.filter(c => {
                 if (c.deadline) {
                   try {
                     return isSameDay(parseISO(c.deadline), cloneDay);
                   } catch(e) { return false; }
                 }
                 return false;
               });

               days.push(
                 <div
                   key={day.toString()}
                   onClick={() => setSelectedCalendarDay(cloneDay)}
                   className={cn(
                     "min-h-[100px] md:min-h-[120px] p-2 border-r border-b border-[rgba(255,255,255,0.05)] hover:bg-white/5 transition-colors cursor-pointer group flex flex-col gap-1 relative overflow-hidden",
                     !isSameMonth(day, monthStart) ? "opacity-30 bg-[#0A0A0A]" : "bg-[#111113]",
                     isToday(day) ? "bg-indigo-500/10" : ""
                   )}
                 >
                   {isToday(day) && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>}
                   <div className="flex justify-between items-start">
                     <span className={cn(
                       "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mt-1 ml-1 transition-colors",
                       isToday(day) ? "bg-indigo-500 text-white" : "text-[#A1A1AA] group-hover:text-white"
                     )}>
                       {formattedDate}
                     </span>
                     {dayCourses.length > 0 && (
                       <span className="text-[9px] font-bold bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-sm mt-1 mr-1">
                         {dayCourses.length} {dayCourses.length === 1 ? 'item' : 'itens'}
                       </span>
                     )}
                   </div>
                   
                   <div className="flex-1 overflow-y-auto hide-scrollbar space-y-1 mt-2 px-1">
                     {dayCourses.slice(0, 3).map((course) => (
                       <div key={course.id} className="text-[9px] font-bold text-white bg-[#1A1A1E] border border-white/5 hover:border-indigo-500/30 px-1.5 py-1 rounded truncate transition-colors">
                         {course.title}
                       </div>
                     ))}
                     {dayCourses.length > 3 && (
                       <div className="text-[9px] text-[#71717A] font-bold text-center mt-1 hover:text-white transition-colors">+ {dayCourses.length - 3} mais</div>
                     )}
                   </div>
                 </div>
               );
               day = addDays(day, 1);
             }
             rows.push(
               <div className="grid grid-cols-7" key={day.toString()}>
                 {days}
               </div>
             );
             days = [];
           }

           return (
             <>
               <div className="animate-in fade-in duration-500 bg-[#0A0A0A] border border-[rgba(255,255,255,0.04)] rounded-3xl overflow-hidden shadow-2xl relative mb-8">
                  <div className="absolute top-0 left-0 w-full h-32 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                  
                  <div className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-[rgba(255,255,255,0.04)] relative z-10 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                        <CalendarDays className="size-6 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white capitalize tracking-tight">{format(currentCalendarMonth, "MMMM yyyy", { locale: ptBR })}</h3>
                        <p className="text-[10px] text-indigo-400/80 uppercase tracking-widest font-bold mt-1">Sua Agenda de Prazos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-[#111113] p-1.5 rounded-2xl border border-white/5">
                      <button onClick={() => setCurrentCalendarMonth(subMonths(currentCalendarMonth, 1))} className="p-2.5 rounded-xl bg-transparent text-[#A1A1AA] hover:bg-[#1A1A1E] hover:text-white transition-colors">
                        <ChevronDown className="size-5 rotate-90" />
                      </button>
                      <button onClick={() => setCurrentCalendarMonth(new Date())} className="px-4 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-colors">
                        Hoje
                      </button>
                      <button onClick={() => setCurrentCalendarMonth(addMonths(currentCalendarMonth, 1))} className="p-2.5 rounded-xl bg-transparent text-[#A1A1AA] hover:bg-[#1A1A1E] hover:text-white transition-colors">
                        <ChevronDown className="size-5 -rotate-90" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#111113] relative z-10 border-t border-l border-[rgba(255,255,255,0.02)]">
                    <div className="grid grid-cols-7 border-b border-[rgba(255,255,255,0.05)] bg-[#1A1A1E]">
                      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                        <div key={d} className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] border-r border-[rgba(255,255,255,0.05)]">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col border-b border-[rgba(255,255,255,0.05)]">
                      {rows}
                    </div>
                  </div>
               </div>

               {selectedCalendarDay && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                   <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCalendarDay(null)}></div>
                   <div className="bg-[#111113] border border-white/10 rounded-3xl p-6 md:p-8 relative z-10 w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
                     <button onClick={() => setSelectedCalendarDay(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">
                       <X className="size-5" />
                     </button>
                     
                     <div className="flex items-center gap-5 mb-8">
                       <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black text-2xl shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                         {format(selectedCalendarDay, "d")}
                       </div>
                       <div>
                         <h2 className="text-2xl font-black text-white capitalize tracking-tight">{format(selectedCalendarDay, "MMMM, yyyy", { locale: ptBR })}</h2>
                         <p className="text-xs text-[#A1A1AA] font-bold uppercase tracking-widest mt-1">{format(selectedCalendarDay, "EEEE", { locale: ptBR })}</p>
                       </div>
                     </div>

                     <div className="space-y-3 max-h-[50vh] overflow-y-auto hide-scrollbar">
                       {(() => {
                         const dayCourses = filteredList.filter(c => {
                           if (c.deadline) {
                             try { return isSameDay(parseISO(c.deadline), selectedCalendarDay); } catch(e) { return false; }
                           }
                           return false;
                         });

                         if (dayCourses.length === 0) {
                           return (
                             <div className="text-center p-10 bg-[#1A1A1E] rounded-3xl border border-dashed border-white/10">
                               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                  <Sparkles className="size-8 text-[#A1A1AA] opacity-50" />
                               </div>
                               <p className="text-base font-bold text-white">Nenhum prazo agendado</p>
                               <p className="text-xs text-[#71717A] mt-2">Seu dia está livre para focar em outras demandas criativas ou descansar.</p>
                             </div>
                           );
                         }

                         return dayCourses.map(course => {
                           let coverUrl = "";
                           try { coverUrl = JSON.parse(course.description || '{}').cover_url || ""; } catch(e){}
                           
                           return (
                             <div key={course.id} className="bg-[#1A1A1E] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group cursor-pointer shadow-sm" onClick={() => { setSelectedCourseId(course.id); setSelectedCalendarDay(null); }}>
                               <div className="w-14 h-14 rounded-xl bg-[#111113] border border-white/5 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-indigo-500/20 transition-colors">
                                 {coverUrl ? (
                                   <img src={coverUrl} className="w-full h-full object-cover" />
                                 ) : (
                                   <BookOpen className="size-5 text-[#A1A1AA] group-hover:text-indigo-400" />
                                 )}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1.5 group-hover:text-indigo-400/80 transition-colors">{course.knowledge_area || "Exploração Geral"}</div>
                                 <h4 className="font-bold text-white text-sm truncate group-hover:text-indigo-400 transition-colors">{course.title}</h4>
                               </div>
                               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors shrink-0">
                                  <ChevronRight className="size-4 text-[#A1A1AA] group-hover:text-indigo-400 transition-colors" />
                               </div>
                             </div>
                           );
                         });
                       })()}
                     </div>
                   </div>
                 </div>
               )}
             </>
           );
         }

         return null;
       })()}
    </div>
  );

  const renderCourseDetails = () => {
    if (!selectedCourse) return null;

    if (selectedCourse.category === 'Conteúdo') {
      let embedUrl = "";
      if (selectedCourse.course_url) {
         if (selectedCourse.course_url.includes('youtube') || selectedCourse.course_url.includes('youtu.be')) {
            embedUrl = selectedCourse.course_url.replace('watch?v=', 'embed/').split('&')[0];
            if (embedUrl.includes('youtu.be/')) embedUrl = embedUrl.replace('youtu.be/', 'youtube.com/embed/');
         } else if (selectedCourse.course_url.includes('spotify')) {
            embedUrl = selectedCourse.course_url.replace('/episode/', '/embed/episode/').replace('/show/', '/embed/show/').replace('/track/', '/embed/track/');
         }
      }

      return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col min-h-screen pb-20 w-full max-w-[1200px] mx-auto">
           <button onClick={() => setSelectedCourseId(null)} className="flex items-center gap-2 text-sm font-bold text-[#A1A1AA] hover:text-white transition-all w-fit mb-6 mt-2 group bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
             <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Voltar
           </button>
           
           <div className="flex flex-col gap-6 w-full">
             {/* Premium YouTube Player Section */}
             <div className="w-full aspect-video bg-[#0A0A0C] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.06)] relative group">
                {embedUrl ? (
                   <iframe src={embedUrl} className="w-full h-full border-0 bg-[#0A0A0C] relative z-10" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen></iframe>
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-[#71717A] gap-4 relative z-10">
                      <MonitorPlay className="size-16 opacity-20" />
                      <p className="text-sm">Nenhum vídeo ou áudio compatível encontrado neste conteúdo.</p>
                      {selectedCourse.course_url && (
                        <a href={selectedCourse.course_url} target="_blank" className="text-cyan-400 hover:underline font-bold">Abrir Link Original</a>
                      )}
                   </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none z-0"></div>
             </div>

             {/* Info Section */}
             <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                   <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-md">{selectedCourse.title}</h1>
                   <div className="flex gap-2 items-center flex-wrap justify-end">
                     <button 
                       onClick={() => handleShareCourse(selectedCourse)} 
                       className="flex items-center gap-2 px-5 py-2.5 bg-[#111113] hover:bg-indigo-500/10 text-[#A1A1AA] hover:text-indigo-400 border border-white/10 hover:border-indigo-500/30 rounded-2xl transition-all shadow-xl hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] text-sm font-bold shrink-0"
                       title="Compartilhar Publicamente (Somente Leitura)"
                     >
                       <Share2 className="size-4" /> Compartilhar
                     </button>
                     <button 
                        onClick={() => {
                           if (selectedCourse.course_url) {
                              window.dispatchEvent(new CustomEvent('global-pip', { detail: { url: selectedCourse.course_url, title: selectedCourse.title, refType: 'video' } }));
                           }
                        }} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#111113] hover:bg-cyan-500/10 text-[#A1A1AA] hover:text-cyan-400 border border-white/10 hover:border-cyan-500/30 rounded-2xl transition-all shadow-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] text-sm font-bold shrink-0"
                     >
                        <Minimize2 className="size-4" /> Minimizar (PiP)
                     </button>
                   </div>
                </div>
                <div className="flex items-center gap-4 border-b border-[rgba(255,255,255,0.06)] pb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xl uppercase shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                         {(selectedCourse.knowledge_area || "C").charAt(0)}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[#E4E4E7] font-bold text-base">{selectedCourse.knowledge_area || "Conteúdo Variado"}</span>
                         <span className="text-xs text-[#71717A] font-medium tracking-wide uppercase">{selectedCourse.status.replace('_', ' ')} • {selectedCourse.completed_hours || "0"} visualizações</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Comments / Notes Section */}
             <div className="mt-4">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 drop-shadow-md">
                   <span className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                      <Edit3 className="size-5 text-cyan-400" />
                   </span>
                   Suas Anotações
                </h3>
                <div className="bg-[#0A0A0C] rounded-3xl border border-[rgba(255,255,255,0.06)] shadow-2xl overflow-hidden transition-all duration-500 hover:border-white/10">
                   <RichTextEditor 
                      initialValue={selectedCourse.study_notes || ""} 
                      onChange={(val) => updateCourse(selectedCourse.id, { study_notes: val })} 
                   />
                </div>
             </div>
           </div>
        </div>
      );
    }

    const percent = selectedCourse.total_hours ? Math.min(100, Math.round((selectedCourse.completed_hours / selectedCourse.total_hours) * 100)) : 0;
    
    let coverUrl = "";
    let portraitUrl = "";
    try { 
      const p = JSON.parse(selectedCourse.description || '{}'); 
      coverUrl = p.cover_url || ""; 
      portraitUrl = p.portrait_url || coverUrl;
    } catch(e){}

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
                 {selectedCourse.platform && (
                   <span className="px-3 py-1 bg-black/50 border border-white/10 text-[#A1A1AA] rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm shadow-lg">{selectedCourse.platform}</span>
                 )}
               </div>
               
               <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                 <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl drop-shadow-xl">
                   {selectedCourse.title}
                 </h1>
                 {(() => {
                   try {
                     const p = JSON.parse(selectedCourse.description || '{}');
                     if (p.text_description) {
                       return <p className="text-sm md:text-base text-[#A1A1AA] mt-4 max-w-3xl leading-relaxed">{p.text_description}</p>;
                     }
                   } catch (e) {}
                   return null;
                 })()}
                 <div className="flex items-center gap-2 relative z-20 shrink-0 mt-2 md:mt-0">
                   <button 
                     onClick={() => handleShareCourse(selectedCourse)} 
                     className="p-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 backdrop-blur-md rounded-xl text-indigo-400 border border-indigo-500/20 transition-colors shadow-lg"
                     title="Compartilhar Curso Publicamente (Somente Leitura)"
                   >
                     <Share2 className="size-4" />
                   </button>
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

                  {/* Portrait Cover Image */}
                  {portraitUrl && (
                    <div className="w-full flex justify-center py-4">
                       <div className="w-[200px] md:w-[240px] aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] relative group">
                          <img src={portraitUrl} alt="Capa Retrato" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                       </div>
                    </div>
                  )}

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
                  
                  {/* OBRAS BASE (LIVROS) */}
                  <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg relative z-20">
                     <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 border-b border-[rgba(255,255,255,0.06)] pb-4">
                       <div>
                         <h3 className="text-lg font-bold text-white flex items-center gap-2"><Book className="size-5 text-emerald-500" /> Obras Base (Livros)</h3>
                         <p className="text-xs text-[#A1A1AA] mt-1">Selecione os livros e obras da sua biblioteca de leitura que norteiam este estudo.</p>
                       </div>
                       <div className="relative group">
                         <button className="bg-[#1A1A1E] border border-white/5 hover:border-emerald-500/50 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                           <Plus className="size-4 text-emerald-400" /> Adicionar Obra
                         </button>
                         {/* Dropdown de Livros */}
                         <div className="absolute right-0 top-full mt-2 w-[300px] bg-[#111113] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 transform origin-top-right">
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1">
                               {books.length === 0 ? (
                                  <div className="text-xs text-[#71717A] p-4 text-center">Nenhum livro na sua biblioteca. Adicione-os primeiro na aba "Leitura".</div>
                               ) : books.map(book => {
                                  let baseBooks: string[] = [];
                                  try { const p = JSON.parse(selectedCourse.description || '{}'); baseBooks = p.base_books || []; } catch(e){}
                                  const isSelected = baseBooks.includes(book.id);
                                  if (isSelected) return null;
                                  return (
                                    <button key={book.id} onClick={async () => {
                                       let s: any = { days: [] as number[], time: "19:00" };
                                       try { const p = JSON.parse(selectedCourse.description || '{}'); if (p.days) s = p; } catch(err){}
                                       s.base_books = baseBooks;
                                       s.base_books.push(book.id);
                                       await updateCourse(selectedCourse.id, { description: JSON.stringify(s) });
                                    }} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors text-left group/btn">
                                       <div className="w-8 h-10 bg-[#1A1A1E] rounded overflow-hidden shrink-0 border border-white/5">
                                          {book.cover_url ? <img src={book.cover_url} className="w-full h-full object-cover opacity-80 group-hover/btn:opacity-100"/> : <Book className="size-3 text-emerald-500 m-auto mt-3"/>}
                                       </div>
                                       <div className="flex flex-col flex-1 min-w-0">
                                         <span className="text-sm text-white font-bold truncate group-hover/btn:text-emerald-400">{book.title}</span>
                                         <span className="text-[10px] text-[#A1A1AA] truncate">{book.author}</span>
                                       </div>
                                    </button>
                                  );
                               })}
                            </div>
                         </div>
                       </div>
                     </div>

                     {/* Livros Selecionados */}
                     {(() => {
                        let baseBooks: string[] = [];
                        try { const p = JSON.parse(selectedCourse.description || '{}'); baseBooks = p.base_books || []; } catch(e){}
                        if (baseBooks.length === 0) return <div className="text-sm text-[#A1A1AA] italic p-4 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-xl">Nenhuma obra base vinculada. Use o botão acima para adicionar.</div>;
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                             {baseBooks.map(bId => {
                                const b = books.find(book => book.id === bId);
                                if (!b) return null;
                                return (
                                  <div key={bId} className="flex items-center gap-4 bg-transparent p-2 rounded-2xl hover:bg-white/5 transition-colors relative group">
                                     <button onClick={async () => {
                                        let s: any = { days: [] as number[], time: "19:00" };
                                        try { const p = JSON.parse(selectedCourse.description || '{}'); if (p.days) s = p; } catch(err){}
                                        s.base_books = baseBooks.filter(id => id !== bId);
                                        await updateCourse(selectedCourse.id, { description: JSON.stringify(s) });
                                     }} className="absolute -top-1 -right-1 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg scale-75 hover:scale-100 z-10" title="Remover"><X className="size-3"/></button>
                                     <div className="w-16 h-24 bg-[#0A0A0C] rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-[0_8px_16px_rgba(0,0,0,0.4)] group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)] group-hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => {
                                         const event = new CustomEvent('reference-click', { detail: { refType: 'book', title: b.title, id: b.id } });
                                         window.dispatchEvent(event);
                                     }}>
                                        {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"/> : <Book className="size-6 text-emerald-500/50 m-auto mt-8"/>}
                                     </div>
                                     <div className="flex flex-col min-w-0 flex-1 justify-center py-1">
                                       <span className="text-[15px] text-white/90 font-medium truncate group-hover:text-white transition-colors cursor-pointer drop-shadow-sm" onClick={() => {
                                           const event = new CustomEvent('reference-click', { detail: { refType: 'book', title: b.title, id: b.id } });
                                           window.dispatchEvent(event);
                                       }}>{b.title}</span>
                                       <span className="text-xs text-[#71717A] truncate font-light mt-0.5">{b.author}</span>
                                       <div className="flex flex-wrap items-center gap-3 mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                          {b.format && (
                                             <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-emerald-400">
                                                {b.format.toLowerCase().includes('fisico') || b.format.toLowerCase().includes('físico') ? <Book className="size-3"/> : <Tablet className="size-3"/>}
                                                {b.format}
                                             </span>
                                          )}
                                          {b.storage_location && (
                                             <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-cyan-400">
                                                {b.storage_location.toLowerCase().includes('drive') ? <Cloud className="size-3"/> : 
                                                 b.storage_location.toLowerCase().includes('estante') ? <Library className="size-3"/> :
                                                 b.storage_location.toLowerCase().includes('emprestado') ? <Users className="size-3"/> :
                                                 <HardDrive className="size-3"/>}
                                                {b.storage_location}
                                             </span>
                                          )}
                                       </div>
                                     </div>
                                  </div>
                                );
                             })}
                          </div>
                        );
                     })()}
                  </div>

                  <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-[rgba(255,255,255,0.06)] pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Layers className="size-5 text-cyan-500" /> Módulos</h3>
                        <p className="text-xs text-[#A1A1AA] mt-1">Estruture o curso em módulos e tópicos. Anexe links, tags e gere materiais com IA.</p>
                      </div>
                      {activeModuleIndex === null && (
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
                      )}
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
                      let revisingTopics = 0;
                      let advancingTopics = 0;
                      modules.forEach((m: any) => {
                        totalTopics += m.topics?.length || 0;
                        completedTopics += m.topics?.filter((t: any) => t.status === 'concluido').length || 0;
                        revisingTopics += m.topics?.filter((t: any) => t.status === 'revisando').length || 0;
                        advancingTopics += m.topics?.filter((t: any) => t.status === 'avançando').length || 0;
                      });
                      
                      const topicPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
                      const revisingPercent = totalTopics > 0 ? Math.round((revisingTopics / totalTopics) * 100) : 0;
                      const advancingPercent = totalTopics > 0 ? Math.round((advancingTopics / totalTopics) * 100) : 0;
                      
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
                          <div className="mb-6 bg-[#111113] p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-lg relative overflow-hidden group hover:border-[rgba(255,255,255,0.1)] transition-all duration-500">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 via-emerald-500 to-yellow-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex flex-col md:flex-row justify-between md:items-end mb-5 gap-4 pl-3">
                              <div>
                                 <div className="text-[10px] uppercase tracking-widest font-bold text-[#71717A] mb-1">Progresso da Grade Curricular</div>
                                 <div className="text-3xl font-black text-white flex items-baseline gap-2">
                                   {topicPercent}% <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest">Concluído</span>
                                 </div>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs font-bold">
                                {completedTopics > 0 && (
                                  <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                    <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-white">{completedTopics}</span>
                                    <span className="text-emerald-400/70 uppercase tracking-wider text-[9px]">Concluídos</span>
                                  </div>
                                )}
                                {revisingTopics > 0 && (
                                  <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-xl border border-yellow-500/20">
                                    <div className="size-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                                    <span className="text-white">{revisingTopics}</span>
                                    <span className="text-yellow-400/70 uppercase tracking-wider text-[9px]">Em Revisão</span>
                                  </div>
                                )}
                                {advancingTopics > 0 && (
                                  <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20">
                                    <div className="size-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                                    <span className="text-white">{advancingTopics}</span>
                                    <span className="text-cyan-400/70 uppercase tracking-wider text-[9px]">Avançando</span>
                                  </div>
                                )}
                                {totalTopics > 0 && (completedTopics === 0 && revisingTopics === 0 && advancingTopics === 0) && (
                                  <div className="flex items-center gap-2 bg-[#1A1A1E] px-3 py-1.5 rounded-xl border border-[rgba(255,255,255,0.04)]">
                                    <div className="size-2 rounded-full bg-[#71717A]"></div>
                                    <span className="text-white">{totalTopics}</span>
                                    <span className="text-[#71717A] uppercase tracking-wider text-[9px]">Pendentes</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="h-2 w-full bg-[#1A1A1E] rounded-full overflow-hidden flex border border-white/5 ml-3 max-w-[calc(100%-12px)] shadow-inner">
                              <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${topicPercent}%` }}></div>
                              <div className="h-full bg-yellow-500 transition-all duration-1000 ease-out opacity-90" style={{ width: `${revisingPercent}%` }}></div>
                              <div className="h-full bg-cyan-500 transition-all duration-1000 ease-out opacity-80" style={{ width: `${advancingPercent}%` }}></div>
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
                                          const newName = prompt("Renomear Módulo:", mod.title);
                                          if (newName && newName.trim() !== '') {
                                            const updated = [...modules];
                                            updated[mIdx].title = newName.trim();
                                            updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                          }
                                        }} className="p-1.5 bg-black/50 hover:bg-cyan-500/80 rounded-lg text-white backdrop-blur-sm border border-white/10 transition-colors opacity-0 group-hover:opacity-100" title="Renomear Módulo">
                                          <Edit2 className="size-3" />
                                        </button>
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
                                        <button onClick={(e) => {
                                          e.stopPropagation();
                                          const newName = prompt("Renomear Módulo:", mod.title);
                                          if (newName && newName.trim() !== '') {
                                            const updated = [...modules];
                                            updated[mIdx].title = newName.trim();
                                            updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                          }
                                        }} className="p-1.5 hover:bg-white/10 text-[#71717A] hover:text-white rounded-lg transition-colors" title="Renomear Módulo">
                                          <Edit2 className="size-3" />
                                        </button>
                                      </h4>
                                  <div className="flex items-center gap-2 relative z-10">
                                    <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1 mr-2">
                                      <button onClick={() => setTopicViewMode('lista')} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-colors ${topicViewMode === 'lista' ? 'bg-[#1A1A1E] text-white' : 'text-[#71717A] hover:text-white'}`}>Lista</button>
                                      <button onClick={() => setTopicViewMode('grade')} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-colors ${topicViewMode === 'grade' ? 'bg-[#1A1A1E] text-white' : 'text-[#71717A] hover:text-white'}`}>Grade</button>
                                    </div>
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

                                <div className={`p-4 bg-[#0A0A0B]/50 ${topicViewMode === 'grade' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}`}>
                                  {(!mod.topics || mod.topics.length === 0) ? (
                                    <p className="text-xs text-[#71717A] italic px-2">Módulo vazio. Adicione tópicos.</p>
                                  ) : mod.topics.map((topic: any, tIdx: number) => (
                                    <div key={topic.id || tIdx} className={`group/topic flex flex-col bg-[#111113] hover:bg-[#1A1A1E] border border-[rgba(255,255,255,0.04)] hover:border-cyan-500/30 rounded-xl transition-all overflow-hidden shadow-sm ${topicViewMode === 'grade' ? 'min-h-[140px]' : ''}`}>
                                      
                                      <div className={`flex ${topicViewMode === 'grade' ? 'flex-col items-start h-full' : 'flex-col sm:flex-row sm:items-center'} justify-between gap-3 p-4 flex-1`}>
                                        <div className="flex items-start gap-4 w-full">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const updated = [...modules];
                                              updated[mIdx].topics[tIdx].status = cycleStatus(topic.status);
                                              updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) });
                                            }}
                                            className={`shrink-0 size-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${getStatusColor(topic.status)} z-10`}
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
                                            <div className="flex items-center gap-2 w-full">
                                              <span className={`text-sm font-bold leading-tight ${topicViewMode === 'grade' ? 'line-clamp-2' : 'truncate'} ${topic.status === 'concluido' ? 'text-[#71717A] line-through' : 'text-white'}`}>{topic.title}</span>
                                              <button onClick={(e) => {
                                                e.stopPropagation();
                                                const newName = prompt("Renomear tópico:", topic.title);
                                                if (newName && newName.trim() !== '') {
                                                  const updated = [...modules];
                                                  updated[mIdx].topics[tIdx].title = newName.trim();
                                                  updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                }
                                              }} className="opacity-0 group-hover/topic:opacity-100 p-1 text-[#71717A] hover:text-white hover:bg-white/10 rounded transition-all shrink-0" title="Renomear Tópico">
                                                <Edit2 className="size-3" />
                                              </button>
                                            </div>
                                            <span className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${
                                              topic.status === 'concluido' ? 'text-emerald-500' :
                                              topic.status === 'avançando' ? 'text-cyan-400' :
                                              topic.status === 'revisando' ? 'text-yellow-400' : 'text-[#71717A]'
                                            }`}>{getStatusLabel(topic.status)}</span>
                                          </div>
                                        </div>

                                        {topicViewMode === 'grade' ? (
                                          <div className="flex flex-col gap-2 w-full mt-auto pt-4 border-t border-[rgba(255,255,255,0.04)] text-[10px] text-[#A1A1AA]">
                                            <div className="flex items-center justify-between group-hover/topic:text-white transition-colors">
                                              <span className="flex items-center gap-1.5"><FolderOpen className="size-3 text-cyan-500" /> Recursos</span>
                                              <span className="font-bold">{(() => {
                                                const rCount = (topic.source ? 1 : 0) + (topic.materials ? topic.materials.length : 0);
                                                return rCount > 0 ? `${rCount} ${rCount === 1 ? 'item' : 'itens'}` : 'Vazio';
                                              })()}</span>
                                            </div>
                                            <div className="flex items-center justify-between group-hover/topic:text-white transition-colors">
                                              <span className="flex items-center gap-1.5"><FileText className="size-3 text-purple-500" /> Glossário (Painel)</span>
                                              <span className="font-bold">{(() => {
                                                if (!topic.notes) return 'Vazio';
                                                const matches = topic.notes.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g);
                                                const count = matches ? matches.filter((m: string) => m.replace(/<[^>]+>/g, '').trim().length > 0).length : 0;
                                                return count > 0 ? `${count} ${count === 1 ? 'item' : 'itens'}` : 'Vazio';
                                              })()}</span>
                                            </div>
                                          </div>
                                        ) : (
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
                                        )}
                                      </div>
                                      
                                      {/* EXPANDED WORKSPACE MODAL */}
                                      {expandedTopicId === (topic.id || tIdx) && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 lg:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => { e.stopPropagation(); setExpandedTopicId(null); }}>
                                          <div className="bg-[#0A0A0C] border-0 lg:border border-white/5 rounded-none lg:rounded-3xl p-3 lg:p-8 w-full max-w-[100vw] lg:max-w-[90vw] h-[100dvh] lg:h-[95vh] flex flex-col gap-3 lg:gap-6 shadow-2xl relative overflow-hidden shadow-cyan-900/20" onClick={(e) => e.stopPropagation()}>
                                            
                                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none rounded-t-3xl"></div>

                                            {/* PROMPT DE PRÓXIMO TÓPICO */}
                                            {isNextTopicPromptOpen && (
                                              <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsNextTopicPromptOpen(false)}>
                                                <div className="bg-[#111113] border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                                  <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 border border-cyan-500/20">
                                                    <FastForward className="size-8 text-cyan-400" />
                                                  </div>
                                                  <h3 className="text-xl font-black text-white mb-2">Próximo Tópico</h3>
                                                  <p className="text-sm text-[#A1A1AA] mb-6">Antes de avançar, como fica o status deste tópico que você estava estudando?</p>
                                                  
                                                  <div className="flex flex-col gap-3 w-full">
                                                    <button onClick={() => {
                                                       const updated = [...modules];
                                                       updated[mIdx].topics[tIdx].status = 'concluido';
                                                       updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                       
                                                       let nextId = null;
                                                       if (tIdx < mod.topics.length - 1) {
                                                         nextId = mod.topics[tIdx + 1].id || (tIdx + 1);
                                                       } else if (mIdx < modules.length - 1 && modules[mIdx + 1].topics?.length > 0) {
                                                         nextId = modules[mIdx + 1].topics[0].id || 0;
                                                       }
                                                       
                                                       setIsNextTopicPromptOpen(false);
                                                       if (nextId !== null) {
                                                         setExpandedTopicId(nextId);
                                                       } else {
                                                         setExpandedTopicId(null);
                                                         toast.success("Parabéns! Você chegou ao fim da trilha.");
                                                       }
                                                    }} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                                      <CheckSquare className="size-4" /> Marcar como Concluído
                                                    </button>
                                                    
                                                    <button onClick={() => {
                                                       const updated = [...modules];
                                                       updated[mIdx].topics[tIdx].status = 'revisando';
                                                       updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                       
                                                       let nextId = null;
                                                       if (tIdx < mod.topics.length - 1) {
                                                         nextId = mod.topics[tIdx + 1].id || (tIdx + 1);
                                                       } else if (mIdx < modules.length - 1 && modules[mIdx + 1].topics?.length > 0) {
                                                         nextId = modules[mIdx + 1].topics[0].id || 0;
                                                       }
                                                       
                                                       setIsNextTopicPromptOpen(false);
                                                       if (nextId !== null) {
                                                         setExpandedTopicId(nextId);
                                                       } else {
                                                         setExpandedTopicId(null);
                                                         toast.success("Fim da trilha alcançado.");
                                                       }
                                                    }} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                                      <BookOpen className="size-4" /> Deixar para Revisar
                                                    </button>
                                                    
                                                    <button onClick={() => {
                                                       let nextId = null;
                                                       if (tIdx < mod.topics.length - 1) {
                                                         nextId = mod.topics[tIdx + 1].id || (tIdx + 1);
                                                       } else if (mIdx < modules.length - 1 && modules[mIdx + 1].topics?.length > 0) {
                                                         nextId = modules[mIdx + 1].topics[0].id || 0;
                                                       }
                                                       setIsNextTopicPromptOpen(false);
                                                       if (nextId !== null) {
                                                         setExpandedTopicId(nextId);
                                                       } else {
                                                         setExpandedTopicId(null);
                                                       }
                                                    }} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors">
                                                      Apenas Avançar (Manter Status)
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

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
                                                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                                                  {/* FOCUS MODE */}
                                                  {isWorkspaceHeaderOpen && (
                                                    <div className="hidden lg:flex items-center gap-1 bg-[#1A1A1E] p-1 rounded-xl border border-white/5 mr-2 animate-in fade-in duration-300">
                                                      <button onClick={() => setDesktopFocusMode("media")} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors", desktopFocusMode === "media" ? "bg-cyan-500/20 text-cyan-400" : "text-[#71717A] hover:text-white")} title="Modo Foco: Apenas Mídia">Mídia</button>
                                                      <button onClick={() => setDesktopFocusMode("both")} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors", desktopFocusMode === "both" ? "bg-white/10 text-white" : "text-[#71717A] hover:text-white")} title="Visão Padrão">Dividido</button>
                                                      <button onClick={() => setDesktopFocusMode("notes")} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors", desktopFocusMode === "notes" ? "bg-purple-500/20 text-purple-400" : "text-[#71717A] hover:text-white")} title="Modo Foco: Apenas Anotações">Anotações</button>
                                                    </div>
                                                  )}
                                                  <button onClick={() => setIsWorkspaceHeaderOpen(!isWorkspaceHeaderOpen)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white backdrop-blur-md" title={isWorkspaceHeaderOpen ? "Ocultar Cabeçalho" : "Mostrar Cabeçalho"}>
                                                    {isWorkspaceHeaderOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                                  </button>
                                                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={cn("px-4 py-2 bg-black/40 border border-white/10 hover:bg-white/10 text-white rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]")} title="Recursos e Ferramentas">
                                                    <LayoutPanelLeft className={cn("size-4", isSidebarOpen ? "text-cyan-500" : "text-[#A1A1AA]")} />
                                                    <span className="hidden sm:inline">{isSidebarOpen ? "Ocultar" : "Recursos"}</span>
                                                  </button>
                                                  <button onClick={() => setIsNextTopicPromptOpen(true)} className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 hover:border-emerald-400 hover:text-emerald-300 text-emerald-400 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]" title="Próximo Tópico">
                                                    <span className="hidden sm:inline">Avançar</span>
                                                    <FastForward className="size-4" />
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
                                                  <div className="flex bg-[#1A1A1E] p-1 rounded-lg border border-white/5">
                                                    <button onClick={() => setTopicContentMode('notes')} className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors flex items-center gap-2", topicContentMode === 'notes' ? "bg-white/10 text-white shadow-sm" : "text-[#71717A] hover:text-[#A1A1AA]")}>
                                                      <Edit2 className="size-3" /> Anotações
                                                    </button>
                                                    <button onClick={() => setTopicContentMode('exercises')} className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors flex items-center gap-2", topicContentMode === 'exercises' ? "bg-cyan-500/20 text-cyan-400 shadow-sm" : "text-[#71717A] hover:text-[#A1A1AA]")}>
                                                      <Brain className="size-3" /> Flashcards
                                                    </button>
                                                  </div>
                                                  {topicContentMode === 'notes' && (
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
                                                  )}
                                                </div>
                                                {topicContentMode === 'notes' ? (
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
                                                ) : (
                                                  <div className={cn("rounded-2xl overflow-y-auto custom-scrollbar border border-white/5 p-4 sm:p-6 transition-all bg-[#0A0A0C] flex-1 flex-col group relative min-h-[400px] lg:flex", mobileWorkspaceTab === "notes" ? "flex" : "hidden", desktopFocusMode === "media" ? "lg:hidden" : "lg:flex")}>
                                                    <div className="flex flex-col h-full gap-6">
                                                      <div className="bg-[#111113] border border-white/5 p-4 rounded-xl shadow-inner shrink-0">
                                                        <h4 className="text-sm font-black text-white mb-3 flex items-center gap-2"><Plus className="size-4 text-cyan-400" /> Criar Novo Flashcard</h4>
                                                        <div className="flex flex-col gap-3">
                                                          <textarea 
                                                            placeholder="Frente (Pergunta, Termo, ou Frase para traduzir)..." 
                                                            className="w-full bg-[#1A1A1E] text-sm text-white rounded-lg p-3 border border-white/5 focus:border-cyan-500/50 focus:outline-none resize-none min-h-[60px]"
                                                            value={newExerciseQ}
                                                            onChange={e => setNewExerciseQ(e.target.value)}
                                                          />
                                                          <textarea 
                                                            placeholder="Verso (Resposta ou Tradução)..." 
                                                            className="w-full bg-[#1A1A1E] text-sm text-white rounded-lg p-3 border border-white/5 focus:border-cyan-500/50 focus:outline-none resize-none min-h-[60px]"
                                                            value={newExerciseA}
                                                            onChange={e => setNewExerciseA(e.target.value)}
                                                          />
                                                          <button 
                                                            onClick={() => {
                                                              if (!newExerciseQ.trim() || !newExerciseA.trim()) return;
                                                              const updated = [...modules];
                                                              const ex = { id: Date.now(), q: newExerciseQ.trim(), a: newExerciseA.trim() };
                                                              if (!updated[mIdx].topics[tIdx].exercises) updated[mIdx].topics[tIdx].exercises = [];
                                                              updated[mIdx].topics[tIdx].exercises.push(ex);
                                                              updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                              setNewExerciseQ("");
                                                              setNewExerciseA("");
                                                            }}
                                                            disabled={!newExerciseQ.trim() || !newExerciseA.trim()}
                                                            className="self-end px-4 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                          >
                                                            <CheckSquare className="size-3.5" /> Salvar Card
                                                          </button>
                                                        </div>
                                                      </div>

                                                      <div className="flex-1 flex flex-col gap-4">
                                                        {topic.exercises && topic.exercises.length > 0 ? (
                                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {topic.exercises.map((ex: any, exIdx: number) => {
                                                              const isRevealed = revealedExercises.includes(ex.id);
                                                              return (
                                                                <div key={ex.id || exIdx} className="bg-[#1A1A1E] border border-white/5 rounded-xl overflow-hidden flex flex-col h-[200px] relative group shadow-lg">
                                                                  <button 
                                                                    onClick={() => {
                                                                      if (confirm("Excluir este flashcard?")) {
                                                                        const updated = [...modules];
                                                                        updated[mIdx].topics[tIdx].exercises = updated[mIdx].topics[tIdx].exercises.filter((e: any) => e.id !== ex.id);
                                                                        updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                                      }
                                                                    }}
                                                                    className="absolute top-2 right-2 p-1.5 bg-black/40 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-rose-500/20 z-10"
                                                                    title="Excluir"
                                                                  >
                                                                    <Trash2 className="size-3" />
                                                                  </button>
                                                                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-center relative overflow-y-auto">
                                                                    <div className="absolute top-2 left-2 text-[9px] font-black uppercase text-[#71717A] tracking-widest flex items-center gap-1"><BookOpen className="size-3" /> Frente</div>
                                                                    <p className="text-sm font-medium text-white break-words w-full">{ex.q}</p>
                                                                  </div>
                                                                  <div className={cn("flex-1 p-4 flex flex-col items-center justify-center text-center relative overflow-y-auto transition-all duration-300 border-t border-white/5", isRevealed ? "bg-[#111113]" : "bg-black cursor-pointer hover:bg-white/5")} onClick={() => { if (!isRevealed) setRevealedExercises([...revealedExercises, ex.id]) }}>
                                                                    {isRevealed ? (
                                                                      <>
                                                                        <div className="absolute top-2 left-2 text-[9px] font-black uppercase text-cyan-500/50 tracking-widest flex items-center gap-1"><CheckCircle2 className="size-3" /> Verso</div>
                                                                        <p className="text-sm font-bold text-cyan-400 break-words w-full">{ex.a}</p>
                                                                      </>
                                                                    ) : (
                                                                      <p className="text-xs font-bold text-[#A1A1AA] flex items-center gap-2"><CheckSquare className="size-4 text-cyan-500/50" /> Clique para revelar resposta</p>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                        ) : (
                                                          <div className="flex flex-col items-center justify-center h-[200px] text-center p-8 bg-[#1A1A1E] border border-dashed border-white/10 rounded-xl">
                                                            <Brain className="size-8 text-[#A1A1AA] mb-3 opacity-50" />
                                                            <p className="text-sm font-bold text-white mb-1">Nenhum Flashcard</p>
                                                            <p className="text-xs text-[#71717A] max-w-[200px] mx-auto">Crie perguntas acima para começar a testar seus conhecimentos neste tópico.</p>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                              {isSidebarOpen && (
                                                <div className={cn("w-full lg:w-[320px] xl:w-[350px] shrink-0 bg-gradient-to-b from-[#111113]/95 to-[#0A0A0C]/95 backdrop-blur-2xl p-5 rounded-3xl border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 fade-in duration-300 lg:flex flex-col gap-6", mobileWorkspaceTab === "resources" ? "flex" : "hidden", desktopFocusMode !== "both" ? "lg:hidden" : "lg:flex")}>
                                                  <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.06)] relative shrink-0">
                                                    <div className="absolute bottom-0 left-0 w-16 h-[1px] bg-gradient-to-r from-cyan-500 to-transparent"></div>
                                                    <div className="flex items-center gap-3">
                                                      <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20 shadow-inner">
                                                        <LayoutPanelLeft className="size-4 text-cyan-400" />
                                                      </div>
                                                      <div>
                                                        <h3 className="text-sm font-black text-white tracking-wide">Recursos</h3>
                                                        <p className="text-[10px] text-[#A1A1AA] uppercase tracking-widest mt-0.5">Painel Auxiliar</p>
                                                      </div>
                                                    </div>
                                                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-[#A1A1AA] hover:text-white transition-all hover:rotate-90" title="Esconder">
                                                      <X className="size-4" />
                                                    </button>
                                                  </div>
                                                  
                                                  <div className="space-y-6 flex-1">
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
                                                  <div className="flex flex-col gap-1 max-h-56 overflow-y-auto custom-scrollbar pr-1 bg-[#0A0A0C]/50 p-2 rounded-xl border border-[rgba(255,255,255,0.03)] shadow-inner">
                                                    {(() => {
                                                      if (typeof window === 'undefined' || !localNotes) return <span className="text-[10px] text-[#71717A] italic text-center py-2">Nenhum título criado.</span>;
                                                      const doc = new DOMParser().parseFromString(localNotes, 'text/html');
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
                                                      Tags da Aula
                                                    </div>
                                                    <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                                                  </summary>
                                                  <div className="w-full bg-[#0A0A0C]/50 border border-[rgba(255,255,255,0.03)] rounded-xl p-3 min-h-[56px] flex flex-wrap items-center gap-2 focus-within:border-cyan-500/40 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all shadow-inner">
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
                                                  <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                      <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                                        <Book className="size-3.5" />
                                                      </div>
                                                      Referências Literárias
                                                    </div>
                                                    <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                                                  </summary>
                                                  <div className="flex flex-col gap-3">
                                                    <div className="relative">
                                                      <select 
                                                        className="w-full appearance-none bg-[#1A1A1E] hover:bg-[#27272A] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 pr-10 text-sm font-bold text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer shadow-sm"
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
                                                             <div key={bookId} className="flex items-center justify-between p-3 bg-[#0A0A0C]/50 border border-[rgba(255,255,255,0.03)] rounded-xl group hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all shadow-inner">
                                                               <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer" onClick={() => {
                                                                  const event = new CustomEvent('reference-click', { detail: { refType: 'book', title: b.title, id: b.id } });
                                                                  window.dispatchEvent(event);
                                                               }}>
                                                                 <div className="w-9 h-9 rounded-lg shrink-0 bg-[#111113] flex items-center justify-center border border-cyan-500/20 shadow-inner group-hover:bg-cyan-500/10 transition-colors">
                                                                   <Book className="size-4 text-cyan-400" />
                                                                 </div>
                                                                 <div className="flex flex-col">
                                                                   <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors truncate">{b.title}</span>
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
                                                  <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                      <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                                        <FolderOpen className="size-3.5" />
                                                      </div>
                                                      Materiais Anexos
                                                    </div>
                                                    <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    {topic.source && !(topic.materials && topic.materials.length > 0) && (
                                                      <div className="flex items-center justify-between p-3 bg-[#0A0A0C]/50 border border-[rgba(255,255,255,0.03)] rounded-xl shadow-inner">
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
                                                      <div key={i} className="flex items-center justify-between p-2 bg-[#0A0A0C]/50 border border-[rgba(255,255,255,0.03)] rounded-xl shadow-inner group hover:border-[rgba(255,255,255,0.1)] transition-colors">
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
                                                      }} className="flex-1 py-2 bg-[#0A0A0C]/50 hover:bg-cyan-500/10 border border-[rgba(255,255,255,0.03)] hover:border-cyan-500/30 rounded-xl text-[10px] font-bold text-[#A1A1AA] hover:text-cyan-400 transition-colors flex items-center justify-center gap-1.5 shadow-inner">
                                                        <LinkIcon className="size-3" /> Add Link
                                                      </button>
                                                      <label className="flex-1 py-2 bg-[#0A0A0C]/50 hover:bg-cyan-500/10 border border-[rgba(255,255,255,0.03)] hover:border-cyan-500/30 rounded-xl text-[10px] font-bold text-[#A1A1AA] hover:text-cyan-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-inner">
                                                        {isUploading ? <Loader2 className="size-3 animate-spin" /> : <UploadCloud className="size-3" />} Add Arquivo
                                                        <input type="file" className="hidden" disabled={isUploading} onChange={(e) => handleMaterialUpload(e, mIdx, tIdx)} />
                                                      </label>
                                                      <button onClick={() => setReferenceModalTarget({ mIdx, tIdx })} className="flex-1 py-2 bg-[#0A0A0C]/50 hover:bg-amber-500/10 border border-[rgba(255,255,255,0.03)] hover:border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-500/70 hover:text-amber-400 transition-colors flex items-center justify-center gap-1.5 shadow-inner">
                                                        <Search className="size-3" /> Puxar Ref.
                                                      </button>
                                                    </div>
                                                  </div>
                                                </details>

                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                      <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                                        <Video className="size-3.5" />
                                                      </div>
                                                      Videoteca (Trilha)
                                                    </div>
                                                    <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    {availableVideos && availableVideos.length > 0 ? (() => {
                                                        const pinnedUrls = topic.topic_videos || [];
                                                        const sortedVids = [...availableVideos].sort((a, b) => {
                                                            const aPin = pinnedUrls.includes(a.url) ? 1 : 0;
                                                            const bPin = pinnedUrls.includes(b.url) ? 1 : 0;
                                                            return bPin - aPin;
                                                        });
                                                        return (
                                                      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar w-[100%]">
                                                        {sortedVids.map((vid: any, idx: number) => {
                                                          const thumb = getThumbnail(vid.url);
                                                          const isPinned = pinnedUrls.includes(vid.url);
                                                          return (
                                                            <div key={idx} className={cn("w-32 shrink-0 bg-[#0A0A0C]/50 shadow-inner rounded-xl overflow-hidden group transition-colors relative", isPinned ? "border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "border border-[rgba(255,255,255,0.03)] hover:border-cyan-500/30")}>
                                                              {isPinned && (
                                                                <div className="absolute top-1 left-1 z-10 bg-cyan-500 text-black text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-md flex items-center gap-1 pointer-events-none">
                                                                  <CheckSquare className="size-2.5" /> Aula do Tópico
                                                                </div>
                                                              )}
                                                              <button onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 let newPinned = [...pinnedUrls];
                                                                 if (isPinned) newPinned = newPinned.filter(u => u !== vid.url);
                                                                 else newPinned.push(vid.url);
                                                                 
                                                                 const updated = [...modules];
                                                                 updated[mIdx].topics[tIdx].topic_videos = newPinned;
                                                                 updateCourse(selectedCourse.id, { next_topics: JSON.stringify(updated) }, false);
                                                              }} className={cn("absolute top-1 right-1 z-20 p-1.5 rounded border backdrop-blur-md transition-all shadow-sm", isPinned ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400 hover:bg-rose-500/80 hover:text-white hover:border-rose-500" : "bg-black/60 border-white/10 text-white/50 hover:text-white opacity-0 group-hover:opacity-100")} title={isPinned ? "Desvincular deste tópico" : "Vincular como aula deste tópico"}>
                                                                <Pin className="size-3" />
                                                              </button>
                                                              <div className="h-20 relative bg-black cursor-pointer" onClick={() => {
                                                                 const event = new CustomEvent('reference-click', { detail: { refType: 'video', title: vid.title, url: vid.url, id: vid.id } });
                                                                 window.dispatchEvent(event);
                                                              }}>
                                                                {thumb ? <img src={thumb} alt="thumb" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /> : <Play className="size-6 text-white/20 absolute inset-0 m-auto" />}
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                                                  <Play className="size-6 text-white" />
                                                                </div>
                                                              </div>
                                                              <div className="p-2 cursor-pointer" onClick={() => {
                                                                 const event = new CustomEvent('reference-click', { detail: { refType: 'video', title: vid.title, url: vid.url, id: vid.id } });
                                                                 window.dispatchEvent(event);
                                                              }}>
                                                                <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight" title={vid.title}>{vid.title}</p>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    )})() : (
                                                       <div className="text-[10px] text-[#71717A] italic py-2 border border-dashed border-white/5 rounded-lg text-center bg-[#111113]">Nenhum vídeo salvo na Videoteca.</div>
                                                    )}
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
                                                      }} className="px-3 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-bold text-xs transition-colors border-l border-[rgba(255,255,255,0.04)]">
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
                                                      }} className="px-3 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-bold text-xs transition-colors border-l border-[rgba(255,255,255,0.04)]">
                                                        Definir
                                                      </button>
                                                    </div>
                                                  </div>
                                                </details>

                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                      <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                                        <Sparkles className="size-3.5" />
                                                      </div>
                                                      Laboratório I.A.
                                                    </div>
                                                    <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    <button onClick={() => window.open('https://notebooklm.google.com/', '_blank')} className="w-full py-3 bg-[#0A0A0C]/50 shadow-inner hover:bg-cyan-500/10 border border-[rgba(255,255,255,0.03)] hover:border-cyan-500/30 rounded-full text-xs font-bold text-cyan-400 transition-colors flex items-center justify-center gap-1.5" title="Abrir NotebookLM para gerar resumos/slides">
                                                      <LayoutTemplate className="size-3.5" /> NotebookLM (Slides)
                                                    </button>
                                                    <button onClick={() => window.open('https://notebooklm.google.com/', '_blank')} className="w-full py-3 bg-[#0A0A0C]/50 shadow-inner hover:bg-cyan-500/10 border border-[rgba(255,255,255,0.03)] hover:border-cyan-500/30 rounded-full text-xs font-bold text-cyan-400 transition-colors flex items-center justify-center gap-1.5" title="Abrir NotebookLM para gerar quiz baseado nas notas">
                                                      <Brain className="size-3.5" /> NotebookLM (Quiz)
                                                    </button>
                                                  </div>
                                                </details>

                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                      <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                                        <Headphones className="size-3.5" />
                                                      </div>
                                                      Músicas (Foco)
                                                    </div>
                                                    <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    <button onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('reference-click', { detail: { refType: 'video', title: 'Lofi Gospel', url: 'https://www.youtube.com/watch?v=srxN4L1n5p4', id: 'srxN4L1n5p4' } }));
                                                    }} className="w-full py-2.5 bg-[#0A0A0C]/50 shadow-inner hover:bg-cyan-500/10 border border-[rgba(255,255,255,0.03)] hover:border-cyan-500/30 rounded-full text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-2 px-4 text-left">
                                                      <Music className="size-3.5 text-cyan-400" /> <span className="flex-1 truncate">Gospel</span>
                                                    </button>
                                                    <button onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('reference-click', { detail: { refType: 'video', title: 'Som de Chuva', url: 'https://www.youtube.com/watch?v=mPZkdNFkNps', id: 'mPZkdNFkNps' } }));
                                                    }} className="w-full py-2.5 bg-[#0A0A0C]/50 shadow-inner hover:bg-cyan-500/10 border border-[rgba(255,255,255,0.03)] hover:border-cyan-500/30 rounded-full text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-2 px-4 text-left">
                                                      <CloudRain className="size-3.5 text-cyan-400" /> <span className="flex-1 truncate">Som de Chuva</span>
                                                    </button>
                                                    <button onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('reference-click', { detail: { refType: 'video', title: 'Som Ambiente (Lofi)', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', id: 'jfKfPfyJRdk' } }));
                                                    }} className="w-full py-2.5 bg-[#0A0A0C]/50 shadow-inner hover:bg-cyan-500/10 border border-[rgba(255,255,255,0.03)] hover:border-cyan-500/30 rounded-full text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-2 px-4 text-left">
                                                      <Headphones className="size-3.5 text-cyan-400" /> <span className="flex-1 truncate">Som Ambiente</span>
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
                                              <button onClick={() => setMobileWorkspaceTab("notes")} className={cn("flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors", mobileWorkspaceTab === "notes" ? "text-cyan-400 bg-cyan-400/10" : "text-[#71717A] hover:text-white hover:bg-white/5")}>
                                                <Edit2 className="size-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Anotações</span>
                                              </button>
                                              <button onClick={() => setMobileWorkspaceTab("resources")} className={cn("flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors", mobileWorkspaceTab === "resources" ? "text-cyan-400 bg-cyan-400/10" : "text-[#71717A] hover:text-white hover:bg-white/5")}>
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
                                     <input type="url" placeholder="Capa/Thumbnail (Opcional)" value={newVideoCoverUrl} onChange={e => setNewVideoCoverUrl(e.target.value)} className="flex-1 bg-[#111113] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                                     <button onClick={() => {
                                       if (!newVideoTitle || !newVideoUrl) return;
                                       let s: any = {};
                                       try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                       if (s.youtube_channels && s.youtube_channels[idx]) {
                                         if (!s.youtube_channels[idx].videos) s.youtube_channels[idx].videos = [];
                                         s.youtube_channels[idx].videos.push({ id: Date.now().toString(), title: newVideoTitle, url: newVideoUrl, cover_url: newVideoCoverUrl });
                                         updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                                         setNewVideoTitle(''); setNewVideoUrl(''); setNewVideoCoverUrl(''); setIsAddingVideoToChannel(null);
                                       }
                                     }} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-colors w-full sm:w-auto">Salvar</button>
                                   </div>
                                 )}

                                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                   {ch.videos?.map((vid: any, vIdx: number) => {
                                     const thumb = vid.cover_url || getThumbnail(vid.url);
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
                                         <div className="p-3 flex items-start justify-between gap-2">
                                           <span className="text-xs font-bold text-white line-clamp-2 pr-2">{vid.title}</span>
                                           <div className="flex flex-col gap-2 shrink-0">
                                             <button onClick={() => {
                                               let s: any = {};
                                               try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                               if (s.youtube_channels && s.youtube_channels[idx] && s.youtube_channels[idx].videos) {
                                                 const newTitle = prompt("Renomear Mídia:", vid.title);
                                                 if (newTitle && newTitle.trim() !== '') {
                                                   s.youtube_channels[idx].videos[vIdx].title = newTitle.trim();
                                                   updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                                                 }
                                               }
                                             }} className="text-[#A1A1AA] hover:text-white transition-colors" title="Renomear">
                                               <Edit2 className="size-3.5" />
                                             </button>
                                             <button onClick={() => {
                                               let s: any = {};
                                               try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                               if (s.youtube_channels && s.youtube_channels[idx] && s.youtube_channels[idx].videos) {
                                                 s.youtube_channels[idx].videos = s.youtube_channels[idx].videos.filter((_:any, i:number) => i !== vIdx);
                                                 updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                                               }
                                             }} className="text-rose-500/50 hover:text-rose-500 transition-colors" title="Excluir">
                                               <Trash2 className="size-3.5" />
                                             </button>
                                           </div>
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
              {/* Sidebar Portrait Cover */}
              {portraitUrl && (
                <div className="w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] relative group mb-6">
                  <img src={portraitUrl} alt="Capa Retrato" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                </div>
              )}

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
                                    <div key={bId} className="flex items-center gap-3 bg-transparent p-2 rounded-xl hover:bg-white/5 transition-all group cursor-pointer" onClick={() => {
                                      const event = new CustomEvent('reference-click', { detail: { refType: 'book', title: b.title, id: b.id } });
                                      window.dispatchEvent(event);
                                    }}>
                                       <div className="w-12 h-16 rounded overflow-hidden bg-black shrink-0 relative border border-white/5 shadow-md group-hover:-translate-y-0.5 group-hover:shadow-lg transition-all duration-300">
                                         {b.cover_url ? (
                                           <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                         ) : (
                                           <div className="w-full h-full flex items-center justify-center bg-emerald-500/10">
                                             <Book className="size-5 text-emerald-500/50" />
                                           </div>
                                         )}
                                       </div>
                                       <div className="flex flex-col min-w-0 flex-1 justify-center py-1">
                                          <span className="text-[13px] text-white/90 truncate font-medium group-hover:text-emerald-400 transition-colors drop-shadow-sm">{b.title}</span>
                                          <span className="text-[10px] text-[#71717A] truncate font-light mt-0.5">{b.author || 'Livro'}</span>
                                          <div className="flex flex-wrap items-center gap-2 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                             {b.format && (
                                                <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-widest text-emerald-400">
                                                   {b.format.toLowerCase().includes('fisico') || b.format.toLowerCase().includes('físico') ? <Book className="size-2.5"/> : <Tablet className="size-2.5"/>}
                                                   {b.format}
                                                </span>
                                             )}
                                             {b.storage_location && (
                                                <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-widest text-cyan-400">
                                                   {b.storage_location.toLowerCase().includes('drive') ? <Cloud className="size-2.5"/> : 
                                                    b.storage_location.toLowerCase().includes('estante') ? <Library className="size-2.5"/> :
                                                    b.storage_location.toLowerCase().includes('emprestado') ? <Users className="size-2.5"/> :
                                                    <HardDrive className="size-2.5"/>}
                                                   {b.storage_location}
                                                </span>
                                             )}
                                          </div>
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
        <div className="flex flex-col gap-4 bg-gradient-to-br from-[#0A0A0A] to-[#111113] p-8 md:p-12 rounded-[2rem] border border-[rgba(255,255,255,0.05)] shadow-2xl relative overflow-hidden mb-10 group/hero">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent blur-[100px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/4 group-hover/hero:scale-110 group-hover/hero:opacity-70 transition-all duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-500/5 to-transparent blur-[80px] rounded-full pointer-events-none transform -translate-x-1/3 translate-y-1/3"></div>
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-8 z-10 relative">
          <div>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.1)] relative overflow-hidden group/icon backdrop-blur-sm">
                 <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-transparent opacity-0 group-hover/icon:opacity-100 transition-opacity duration-500"></div>
                 <GraduationCap className="size-8 md:size-10 text-cyan-400 relative z-10 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)] group-hover/icon:scale-110 transition-transform duration-500" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400 tracking-tighter drop-shadow-sm pb-1">
                  {activeTab === "Visão Geral" ? "Academia Operacional" : 
                    activeTab === "Concluídos" ? "Histórico de Conclusões" :
                    activeTab}
                </h1>
                {activeTab === "Visão Geral" && (
                  <div className="text-[9px] md:text-[11px] text-cyan-400/80 font-black uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                    Ecossistema de Alta Performance
                  </div>
                )}
              </div>
            </div>
            {activeTab !== "Visão Geral" && tabStats && (
              <div className="flex flex-wrap items-center gap-3 mt-6 ml-24">
                <div className="flex items-center gap-2 bg-[#1A1A1E] border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#A1A1AA] shadow-sm">
                  <BookMarked className="size-3.5 text-cyan-400" /> {tabStats.itemsCount} Itens
                </div>
                <div className="flex items-center gap-2 bg-[#1A1A1E] border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#A1A1AA] shadow-sm">
                  <TrendingUp className="size-3.5 text-emerald-400" /> {tabStats.tabHours}h Estudadas
                </div>
                <div className="flex items-center gap-2 bg-[#1A1A1E] border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#A1A1AA] shadow-sm">
                  <CheckSquare className="size-3.5 text-purple-400" /> {tabStats.completedTopics} / {tabStats.totalTopics} Tópicos
                </div>
                <div className="flex items-center gap-2 bg-[#1A1A1E] border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#A1A1AA] shadow-sm">
                  <BarChart2 className="size-3.5 text-blue-400" /> {tabStats.completionRate}% Concluído
                </div>
                <div className="flex items-center gap-2 bg-[#1A1A1E] border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#A1A1AA] shadow-sm">
                  <Sparkles className="size-3.5 text-amber-400" /> {tabStats.xpEarned} XP Acumulado
                </div>
                <div className="flex items-center gap-2 bg-[#1A1A1E] border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#A1A1AA] shadow-sm">
                  <Layers className="size-3.5 text-rose-400" /> {tabStats.sessionsCount} Sessões
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button 
              onClick={() => setIsGlobalSearchOpen(true)}
              className="flex items-center gap-2 px-5 py-3.5 bg-[#111113] hover:bg-[#1A1A1E] text-[#A1A1AA] hover:text-white rounded-2xl text-sm font-bold transition-all border border-white/10"
              title="Buscar em todos os materiais"
            >
              <Search className="size-4" /> Buscar... <kbd className="hidden md:inline-block ml-2 text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/5 font-mono">Cmd+K</kbd>
            </button>
            <button 
              onClick={() => setIsCreatingCourse(true)}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:-translate-y-0.5 border border-white/10"
            >
              <Plus className="size-5" /> Novo Curso
            </button>
          </div>
        </div>

        {/* TABS NAVEGAÇÃO */}
        <div className="flex items-center gap-1 overflow-x-auto pt-4 mt-4 border-t border-[rgba(255,255,255,0.04)] hide-scrollbar z-10 relative">
          {["Visão Geral", "Cursos", "Faculdade", "Certificações", "Trilhas", "Projetos", "Documentários", "Biografias", "Conteúdos", "Concluídos", "Inteligência"].map(tab => (
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

      {/* MODAL ÁREA VER TODOS */}
      {areaModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAreaModalData(null)}></div>
          <div className="relative bg-[#0A0A0C] border border-white/10 rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#111113] shrink-0">
               <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                    {(areaModalData.area || "C").charAt(0)}
                  </div>
                  {areaModalData.area} <span className="text-sm font-bold text-[#71717A] bg-white/5 px-3 py-1 rounded-full">{areaModalData.courses.length} itens</span>
               </h2>
               <button onClick={() => setAreaModalData(null)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
                  <X className="size-6" />
               </button>
            </div>
            
            <div className="p-6 border-b border-white/5 bg-[#111113]/50 flex flex-col md:flex-row gap-4 shrink-0">
               <div className="flex-1 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                 <input 
                   type="text" 
                   placeholder="Buscar por título..."
                   value={areaModalSearch}
                   onChange={e => setAreaModalSearch(e.target.value)}
                   className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                 />
               </div>
               <div className="flex flex-col sm:flex-row gap-4">
                 <select 
                   value={areaModalStatus}
                   onChange={e => setAreaModalStatus(e.target.value)}
                   className="bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-[#A1A1AA] focus:text-white focus:border-cyan-500 outline-none"
                 >
                   <option value="todos">Todos os Status</option>
                   <option value="fila">Na Fila (Planejado)</option>
                   <option value="em_andamento">Em Andamento</option>
                   <option value="concluido">Concluídos</option>
                 </select>
                 <select 
                   value={areaModalDuration}
                   onChange={e => setAreaModalDuration(e.target.value)}
                   className="bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-[#A1A1AA] focus:text-white focus:border-cyan-500 outline-none"
                 >
                   <option value="todos">Qualquer Duração</option>
                   <option value="curto">Curtos ({"<"} 10h)</option>
                   <option value="medio">Médios (10 - 40h)</option>
                   <option value="longo">Longos ({">"} 40h)</option>
                 </select>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0C] custom-scrollbar">
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                 {(() => {
                    const filtered = areaModalData.courses.filter(c => {
                       if (areaModalSearch && !c.title.toLowerCase().includes(areaModalSearch.toLowerCase())) return false;
                       if (areaModalStatus !== "todos" && c.status !== areaModalStatus) return false;
                       if (areaModalDuration !== "todos") {
                          const h = c.total_hours || 0;
                          if (areaModalDuration === "curto" && h >= 10) return false;
                          if (areaModalDuration === "medio" && (h < 10 || h > 40)) return false;
                          if (areaModalDuration === "longo" && h <= 40) return false;
                       }
                       return true;
                    });
                    
                    if (filtered.length === 0) return <div className="col-span-full py-12 text-center text-gray-500 text-sm font-bold uppercase tracking-widest">Nenhum item encontrado com esses filtros.</div>;

                    return filtered.map(course => {
                       const percent = course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100)) : 0;
                       let coverUrl = null;
                       if (course.category === 'Conteúdo' && course.course_url) {
                          if (course.course_url.includes('youtube') || course.course_url.includes('youtu.be')) {
                             let thumbId = course.course_url.includes('v=') ? course.course_url.split('v=')[1]?.split('&')[0] : course.course_url.split('/').pop()?.split('&')[0];
                             if(thumbId) coverUrl = `https://img.youtube.com/vi/${thumbId}/maxresdefault.jpg`;
                          }
                       }
                       if (!coverUrl) {
                          try { const p = JSON.parse(course.description || '{}'); if (p.cover_url) coverUrl = p.cover_url; } catch(e){}
                       }

                       return (
                         <div key={course.id} onClick={() => { setAreaModalData(null); setSelectedCourseId(course.id); }} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all group cursor-pointer shadow-lg flex flex-col h-full min-h-[220px]">
                           <div className="h-32 w-full relative overflow-hidden bg-gradient-to-br from-[#1A1A1E] to-[#111113] flex items-center justify-center shrink-0">
                             {coverUrl ? (
                                <img src={coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 z-0" />
                             ) : (
                                <Layers className="size-10 text-cyan-500/20 group-hover:scale-110 transition-transform duration-500 z-0" />
                             )}
                             <div className="absolute top-2 left-2 flex gap-1 z-20">
                                <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider">{course.category}</span>
                             </div>
                           </div>
                           <div className="p-4 flex-1 flex flex-col">
                             <h4 className="font-bold text-sm text-white leading-tight mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">{course.title}</h4>
                             <div className="mt-auto pt-4 border-t border-white/5">
                               {course.category !== 'Conteúdo' ? (
                                 <>
                                   <div className="flex justify-between items-end mb-1.5">
                                     <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">{course.completed_hours}h / {course.total_hours}h</div>
                                     <div className="text-[10px] font-bold text-cyan-400">{percent}%</div>
                                   </div>
                                   <div className="h-1 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
                                     <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percent}%` }}></div>
                                   </div>
                                 </>
                               ) : (
                                 <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                                   <MonitorPlay className="size-3" /> Assistir
                                 </div>
                               )}
                             </div>
                           </div>
                         </div>
                       );
                    });
                 })()}
               </div>
            </div>
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
                  type="text" list="platform-options" value={newCourse.platform} onChange={e => setNewCourse({...newCourse, platform: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: Duolingo, Udemy, Youtube..."
                />
                <datalist id="platform-options">
                  <option value="Duolingo" />
                  <option value="Udemy" />
                  <option value="Rocketseat" />
                  <option value="Alura" />
                  <option value="Coursera" />
                  <option value="YouTube" />
                  <option value="Faculdade / Universidade" />
                  <option value="DIO" />
                  <option value="Kiwify" />
                  <option value="Hotmart" />
                  <option value="Pluralsight" />
                  <option value="edX" />
                </datalist>
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
                  <option value="Documentário">Documentário</option>
                  <option value="Biografia">Biografia</option>
                  <option value="Conteúdo">Conteúdo (Vídeos, Podcasts)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Área</label>
                <input 
                  type="text" list="area-options" value={newCourse.knowledge_area} onChange={e => setNewCourse({...newCourse, knowledge_area: e.target.value})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: Tecnologia, Finanças..."
                />
                <datalist id="area-options">
                  <option value="Tecnologia" />
                  <option value="Negócios" />
                  <option value="Finanças" />
                  <option value="Idiomas" />
                  <option value="Desenvolvimento Pessoal" />
                  {allKnowledgeAreas.filter(a => !["Tecnologia", "Negócios", "Finanças", "Idiomas", "Desenvolvimento Pessoal"].includes(String(a))).map((area, idx) => (
                    <option key={idx} value={String(area)} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Carga Horária Estimada (h)</label>
                <input 
                  type="number" min="1" required value={newCourse.total_hours || ''} onChange={e => setNewCourse({...newCourse, total_hours: Number(e.target.value)})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: 40"
                />
              </div>

              <div className="md:col-span-2 border-t border-[rgba(255,255,255,0.06)] pt-6 mt-2 mb-2">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Informações de Compra (Wishlist)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Situação</label>
                    <select
                      value={(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.purchased ? 'comprado' : 'quero_comprar'; } catch(e){ return 'quero_comprar'; } })()}
                      onChange={e => {
                        let s: any = {};
                        try { s = JSON.parse(newCourse.description || '{}'); } catch(e){}
                        s.purchased = e.target.value === 'comprado';
                        setNewCourse({...newCourse, description: JSON.stringify(s)});
                      }}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors"
                    >
                      <option value="quero_comprar">Quero Comprar</option>
                      <option value="comprado">Já Comprei</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Preço (R$)</label>
                    <input 
                      type="number" step="0.01" min="0" 
                      value={(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.price || ''; } catch(e){ return ''; } })()}
                      onChange={e => {
                        let s: any = {};
                        try { s = JSON.parse(newCourse.description || '{}'); } catch(e){}
                        s.price = e.target.value ? Number(e.target.value) : undefined;
                        setNewCourse({...newCourse, description: JSON.stringify(s)});
                      }}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors"
                      placeholder="Ex: 497.00"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Formato de Acesso</label>
                    <select
                      value={(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.purchase_type || 'vitalicio'; } catch(e){ return 'vitalicio'; } })()}
                      onChange={e => {
                        let s: any = {};
                        try { s = JSON.parse(newCourse.description || '{}'); } catch(e){}
                        s.purchase_type = e.target.value;
                        setNewCourse({...newCourse, description: JSON.stringify(s)});
                      }}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors"
                    >
                      <option value="vitalicio">Vitalício</option>
                      <option value="1_ano">Acesso por 1 Ano</option>
                      <option value="mensalidade">Mensalidade (Assinatura)</option>
                      <option value="gratuito">Gratuito</option>
                    </select>
                  </div>
                </div>
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
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Descrição da Trilha / Curso (Opcional)</label>
                <textarea 
                  value={(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.text_description || ""; } catch(e){ return ""; } })()}
                  onChange={e => {
                     let s: any = { days: [] as number[], time: "19:00" };
                     try { const p = JSON.parse(newCourse.description || '{}'); if (p.days) s = p; } catch(e){}
                     s.text_description = e.target.value;
                     setNewCourse({...newCourse, description: JSON.stringify(s)});
                  }}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors min-h-[60px] mb-4"
                  placeholder="Sobre o que é esta trilha ou curso?"
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
                <div className="flex items-center justify-between mb-2">
                   <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">Capa do Curso</label>
                   <div className="flex items-center gap-2 bg-[#1A1A1E] p-1 rounded-lg border border-white/5">
                      <button type="button" onClick={() => setCoverMode("url")} className={cn("text-[10px] px-3 py-1 font-bold rounded-md transition-all", coverMode === "url" ? "bg-cyan-500/20 text-cyan-400" : "text-[#71717A] hover:text-white")}>Link (URL)</button>
                      <button type="button" onClick={() => setCoverMode("upload")} className={cn("text-[10px] px-3 py-1 font-bold rounded-md transition-all", coverMode === "upload" ? "bg-cyan-500/20 text-cyan-400" : "text-[#71717A] hover:text-white")}>Upload Foto</button>
                   </div>
                </div>
                {coverMode === "url" ? (
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
                ) : (
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => coverInputRef.current?.click()} className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm font-bold text-white hover:border-cyan-500 transition-colors flex-1 justify-center shadow-inner">
                       <UploadCloud className="size-5 text-cyan-500" /> 
                       {(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.cover_url?.startsWith('data:image') ? "Trocar Foto..." : "Selecionar Foto..."; } catch(e){ return "Selecionar Foto..."; } })()}
                    </button>
                    {(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.cover_url?.startsWith('data:image') ? <div className="h-[46px] aspect-video rounded-lg overflow-hidden shrink-0 border border-white/10"><img src={p.cover_url} className="w-full h-full object-cover"/></div> : null; } catch(e){ return null; } })()}
                    <input 
                       type="file" accept="image/*" ref={coverInputRef} className="hidden"
                       onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                             const reader = new FileReader();
                             reader.onload = (ev) => {
                                let s: any = { days: [] as number[], time: "19:00" };
                                try { const p = JSON.parse(newCourse.description || '{}'); if (p.days) s = p; } catch(err){}
                                s.cover_url = ev.target?.result as string;
                                setNewCourse({...newCourse, description: JSON.stringify(s)});
                             };
                             reader.readAsDataURL(file);
                          }
                       }}
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                   <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">Capa Retrato (Lateral)</label>
                   <div className="flex items-center gap-2 bg-[#1A1A1E] p-1 rounded-lg border border-white/5">
                      <button type="button" onClick={() => setPortraitMode("url")} className={cn("text-[10px] px-3 py-1 font-bold rounded-md transition-all", portraitMode === "url" ? "bg-cyan-500/20 text-cyan-400" : "text-[#71717A] hover:text-white")}>Link (URL)</button>
                      <button type="button" onClick={() => setPortraitMode("upload")} className={cn("text-[10px] px-3 py-1 font-bold rounded-md transition-all", portraitMode === "upload" ? "bg-cyan-500/20 text-cyan-400" : "text-[#71717A] hover:text-white")}>Upload Foto</button>
                   </div>
                </div>
                {portraitMode === "url" ? (
                  <input 
                    type="url" 
                    value={(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.portrait_url || ""; } catch(e){ return ""; } })()}
                    onChange={e => {
                       let s: any = { days: [] as number[], time: "19:00" };
                       try { const p = JSON.parse(newCourse.description || '{}'); if (p.days) s = p; } catch(e){}
                       s.portrait_url = e.target.value;
                       setNewCourse({...newCourse, description: JSON.stringify(s)});
                    }}
                    className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                    placeholder="https://... (Deixe em branco para usar a capa principal)"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => portraitInputRef.current?.click()} className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm font-bold text-white hover:border-cyan-500 transition-colors flex-1 justify-center shadow-inner">
                       <UploadCloud className="size-5 text-cyan-500" /> 
                       {(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.portrait_url?.startsWith('data:image') ? "Trocar Foto Retrato..." : "Selecionar Foto Retrato..."; } catch(e){ return "Selecionar Foto Retrato..."; } })()}
                    </button>
                    {(() => { try { const p = JSON.parse(newCourse.description || '{}'); return p.portrait_url?.startsWith('data:image') ? <div className="h-[46px] w-[34px] rounded-lg overflow-hidden shrink-0 border border-white/10"><img src={p.portrait_url} className="w-full h-full object-cover"/></div> : null; } catch(e){ return null; } })()}
                    <input 
                       type="file" accept="image/*" ref={portraitInputRef} className="hidden"
                       onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                             const reader = new FileReader();
                             reader.onload = (ev) => {
                                let s: any = { days: [] as number[], time: "19:00" };
                                try { const p = JSON.parse(newCourse.description || '{}'); if (p.days) s = p; } catch(err){}
                                s.portrait_url = ev.target?.result as string;
                                setNewCourse({...newCourse, description: JSON.stringify(s)});
                             };
                             reader.readAsDataURL(file);
                          }
                       }}
                    />
                  </div>
                )}
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

      {/* GLOBAL SEARCH MODAL */}
      {isGlobalSearchOpen && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh] p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsGlobalSearchOpen(false)}>
          <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative flex items-center px-4 border-b border-white/5 bg-[#111113]">
               <Search className="size-5 text-[#71717A] shrink-0" />
               <input 
                 autoFocus
                 type="text" 
                 value={globalSearchQuery}
                 onChange={e => setGlobalSearchQuery(e.target.value)}
                 placeholder="O que você quer estudar ou revisar hoje? (Cursos, Módulos, Tags, Anotações...)"
                 className="w-full bg-transparent border-none px-4 py-5 text-lg text-white focus:outline-none focus:ring-0 placeholder-[#71717A]"
               />
               <button onClick={() => setIsGlobalSearchOpen(false)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[#A1A1AA] hover:text-white transition-colors shrink-0">
                 <kbd className="text-[10px] font-mono px-1.5">ESC</kbd>
               </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#0A0A0C]/50">
               {globalSearchQuery.trim().length > 0 && globalSearchQuery.trim().length < 2 && (
                  <div className="p-8 text-center text-[#71717A] text-sm">Digite pelo menos 2 caracteres...</div>
               )}
               
               {globalSearchQuery.trim().length >= 2 && globalSearchResults.length === 0 && (
                  <div className="p-12 flex flex-col items-center justify-center text-[#71717A]">
                     <Search className="size-10 mb-4 opacity-20" />
                     <p className="text-sm font-bold">Nenhum resultado encontrado.</p>
                     <p className="text-xs mt-1">Tente usar outros termos.</p>
                  </div>
               )}

               {globalSearchResults.length > 0 && (
                 <div className="p-2 space-y-1">
                   {globalSearchResults.map((res, i) => (
                      <div 
                        key={`${res.type}-${res.courseId}-${res.topicId || i}`}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedCourseId(res.courseId);
                          if (res.type === 'topic') {
                            setCourseTab('Módulos');
                            setExpandedTopicId(res.topicId);
                          } else if (res.type === 'course') {
                            setCourseTab('Módulos');
                          }
                          setIsGlobalSearchOpen(false);
                          setGlobalSearchQuery("");
                        }}
                      >
                         <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 bg-[#1A1A1E] rounded-lg border border-white/5 shrink-0 group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-colors">
                              {res.type === 'course' ? <BookOpen className="size-4" /> : <FileText className="size-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-2 mb-0.5">
                                 <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">{res.title}</span>
                                 <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-[#1A1A1E] text-[#A1A1AA] border border-white/5 shrink-0">{res.matchType}</span>
                               </div>
                               <div className="text-[10px] text-[#71717A] uppercase tracking-widest font-bold truncate">
                                  {res.type === 'topic' ? `${res.courseTitle} • ${res.subtitle}` : res.subtitle}
                               </div>
                               {res.snippet && (
                                 <div className="mt-1.5 text-xs text-[#A1A1AA] italic line-clamp-2 leading-relaxed pl-2 border-l-2 border-white/10 group-hover:border-cyan-500/30">
                                    "{res.snippet}"
                                 </div>
                               )}
                            </div>
                         </div>
                         <div className="hidden sm:flex shrink-0">
                            <div className="w-8 h-8 rounded-full bg-[#1A1A1E] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-white/5 group-hover:border-cyan-500/30 group-hover:text-cyan-400">
                               <ChevronRight className="size-4" />
                            </div>
                         </div>
                      </div>
                   ))}
                 </div>
               )}
            </div>
            
            <div className="p-3 border-t border-white/5 bg-[#111113] flex items-center justify-between text-[10px] text-[#71717A] uppercase tracking-widest font-bold">
               <div className="flex items-center gap-3">
                 <span className="flex items-center gap-1"><kbd className="bg-[#1A1A1E] px-1 rounded border border-white/5 font-mono">↑↓</kbd> Navegar</span>
                 <span className="flex items-center gap-1"><kbd className="bg-[#1A1A1E] px-1 rounded border border-white/5 font-mono">Enter</kbd> Selecionar</span>
               </div>
               <div>{globalSearchResults.length} resultados</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
