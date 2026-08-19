import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type PosStudyCourse } from "@/hooks/use-pos-studies";
import { Clock, GraduationCap, Play, LayoutTemplate, AlertTriangle, ArrowLeft, PlayCircle, BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicStudentView({ token }: { token: string }) {
  const [course, setCourse] = useState<PosStudyCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from('pos_studies')
          .select('*')
          .eq('share_token', token)
          .eq('is_public', true)
          .single();
          
        if (fetchErr) throw fetchErr;
        if (!data) throw new Error("Trilha não encontrada ou não é pública.");
        
        setCourse(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro ao carregar a trilha.");
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [token]);

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="size-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (error || !course) return <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-white p-4"><AlertTriangle className="size-12 text-rose-500 mb-4" /><h1 className="text-xl font-bold mb-2">Ops! Algo deu errado.</h1><p className="text-gray-400">{error || "Não foi possível carregar a trilha. Verifique se o link está correto e se a trilha foi compartilhada publicamente."}</p></div>;

  let modules = [];
  try {
    modules = JSON.parse(course.next_topics || '[]');
  } catch(e) {}
  
  const activeModule = modules[activeModuleIdx] || null;
  const activeTopic = activeModule?.topics?.[activeTopicIdx] || null;

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-[#111113]/80 backdrop-blur-md flex items-center px-4 md:px-8 shrink-0 z-50 sticky top-0">
        <div className="flex-1 flex items-center gap-4">
          <div className="size-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg">
            <GraduationCap className="size-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold truncate max-w-sm md:max-w-xl">{course.title}</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">{course.instructor || 'O Polimata'}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Sidebar (Modules) */}
        <aside className="w-full lg:w-80 border-r border-white/10 bg-[#111113] flex flex-col shrink-0 overflow-y-auto custom-scrollbar lg:h-[calc(100vh-4rem)]">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Conteúdo da Trilha</h2>
            <div className="flex items-center gap-2">
               <div className="flex-1 h-1 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${course.total_hours ? Math.min(100, Math.round((course.completed_hours / course.total_hours)*100)) : 0}%` }}></div>
               </div>
            </div>
          </div>
          
          <div className="flex-1 py-4">
            {modules.length === 0 ? (
               <div className="px-4 py-8 text-center text-gray-500 text-sm">Nenhum módulo cadastrado.</div>
            ) : (
               modules.map((m: any, mIdx: number) => (
                 <div key={mIdx} className="mb-4 px-2">
                   <h3 className="px-3 mb-2 text-xs font-bold text-white uppercase tracking-widest">{m.name || `Módulo ${mIdx+1}`}</h3>
                   <div className="space-y-1">
                     {(m.topics || []).map((t: any, tIdx: number) => {
                        const isSelected = activeModuleIdx === mIdx && activeTopicIdx === tIdx;
                        return (
                          <button 
                            key={tIdx}
                            onClick={() => { setActiveModuleIdx(mIdx); setActiveTopicIdx(tIdx); }}
                            className={cn("w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-start gap-3", isSelected ? "bg-cyan-500/10 text-cyan-400" : "text-gray-400 hover:bg-white/5 hover:text-white")}
                          >
                            <PlayCircle className={cn("size-4 shrink-0 mt-0.5", isSelected ? "text-cyan-400" : "text-gray-500")} />
                            <span className="flex-1 leading-tight">{t.name}</span>
                          </button>
                        );
                     })}
                   </div>
                 </div>
               ))
            )}
          </div>
        </aside>

        {/* Workspace Area */}
        <main className="flex-1 flex flex-col bg-[#09090B] overflow-y-auto custom-scrollbar lg:h-[calc(100vh-4rem)] relative">
          {activeTopic ? (
             <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 pb-32">
               
               {/* Topic Info */}
               <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white mb-2">{activeTopic.name}</h1>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{activeModule?.name}</p>
               </div>

               {/* Video Embed */}
               {activeTopic.video_url && activeTopic.video_url.includes('youtube') && (
                 <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                   <iframe 
                      src={activeTopic.video_url.replace("watch?v=", "embed/")} 
                      className="w-full h-full" 
                      allowFullScreen 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                   ></iframe>
                 </div>
               )}
               {activeTopic.video_url && !activeTopic.video_url.includes('youtube') && (
                 <div className="p-6 rounded-2xl border border-white/10 bg-[#111113] flex flex-col items-center justify-center text-center">
                    <ExternalLink className="size-8 text-cyan-500 mb-3" />
                    <p className="text-sm font-bold text-white mb-2">Este tópico possui um link de aula externa.</p>
                    <a href={activeTopic.video_url} target="_blank" rel="noreferrer" className="text-xs px-4 py-2 mt-2 bg-cyan-500 text-white rounded-lg font-bold hover:bg-cyan-400 transition-colors">Abrir Aula</a>
                 </div>
               )}

               {/* Notes / Context */}
               {activeTopic.notes && (
                 <div className="prose prose-invert prose-cyan max-w-none prose-sm md:prose-base bg-[#111113] border border-white/10 rounded-2xl p-6 md:p-8">
                   <div className="whitespace-pre-wrap">{activeTopic.notes}</div>
                 </div>
               )}

               {/* Materials */}
               {activeTopic.materials && activeTopic.materials.length > 0 && (
                 <div className="mt-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><BookOpen className="size-4 text-cyan-400" /> Materiais Complementares</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeTopic.materials.map((m: any, idx: number) => (
                         <a key={idx} href={m.url} target="_blank" rel="noreferrer" className="p-4 rounded-xl border border-white/10 bg-[#111113] hover:border-cyan-500/30 transition-colors flex items-center gap-3 group shadow-md">
                           <div className="p-2 bg-white/5 rounded-lg text-gray-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                              <BookOpen className="size-4" />
                           </div>
                           <div className="flex-1 overflow-hidden">
                             <p className="text-xs font-bold text-white truncate">{m.name || "Material"}</p>
                             <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{m.type || 'Documento'}</p>
                           </div>
                         </a>
                      ))}
                    </div>
                 </div>
               )}

             </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                <PlayCircle className="size-12 mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest text-center">Selecione um tópico no menu lateral para começar.</p>
             </div>
          )}
        </main>
      </div>
    </div>
  );
}
