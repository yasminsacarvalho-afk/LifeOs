import { useState, useEffect } from 'react';
import { Play, X, Maximize2, ExternalLink, Minimize2 } from 'lucide-react';
import { getSafeEmbedUrl } from '@/lib/youtube';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function GlobalPiPPlayer() {
  const [pipData, setPipData] = useState<any>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const handleGlobalPip = (e: any) => {
      setPipData(e.detail);
      setIsMaximized(false);
      toast.success("Vídeo minimizado. Você pode navegar pelo sistema.");
    };
    const handleGlobalPipClose = () => {
      setPipData(null);
    };

    window.addEventListener('global-pip', handleGlobalPip as EventListener);
    window.addEventListener('global-pip-close', handleGlobalPipClose as EventListener);

    return () => {
      window.removeEventListener('global-pip', handleGlobalPip as EventListener);
      window.removeEventListener('global-pip-close', handleGlobalPipClose as EventListener);
    };
  }, []);

  if (!pipData) return null;

  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsMaximized(false)}>
        <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-2xl w-full max-w-4xl flex flex-col gap-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 truncate pr-2">
              <Play className="size-5 text-cyan-500 shrink-0" />
              <span className="truncate">{pipData.title}</span>
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={() => setIsMaximized(false)} 
                title="Minimizar (Picture-in-Picture)"
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[#A1A1AA] hover:text-white transition-colors"
              >
                <Minimize2 className="size-4" />
              </button>
              <button 
                onClick={() => setPipData(null)} 
                title="Fechar"
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[#A1A1AA] hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-[rgba(255,255,255,0.04)] shadow-inner relative group">
             <iframe 
               src={getSafeEmbedUrl(pipData.url, pipData.extra)} 
               className="w-full h-full" 
               allowFullScreen
               allow="autoplay; encrypted-media"
             ></iframe>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[999999] w-80 md:w-96 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-center p-2 border-b border-white/5 bg-[#1A1A1E]">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 truncate pr-2">
          <Play className="size-3 text-cyan-500 shrink-0" />
          <span className="truncate">{pipData.title}</span>
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={() => setIsMaximized(true)} 
            title="Restaurar Tela Cheia"
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[#A1A1AA] hover:text-white transition-colors"
          >
            <Maximize2 className="size-3" />
          </button>
          <button 
            onClick={() => setPipData(null)} 
            title="Fechar"
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[#A1A1AA] hover:text-white transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
      
      <div className="w-full aspect-video bg-black relative group">
         <iframe 
           src={getSafeEmbedUrl(pipData.url, pipData.extra)} 
           className="w-full h-full border-0" 
           allowFullScreen
           allow="autoplay; encrypted-media"
         ></iframe>
         <div className="absolute inset-0 pointer-events-none group-hover:pointer-events-auto" />
      </div>
    </div>
  );
}
