import { useState, useEffect, useRef } from 'react';
import { Play, X, Maximize2, ExternalLink, Minimize2, GripHorizontal } from 'lucide-react';
import { getSafeEmbedUrl } from '@/lib/youtube';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function GlobalPiPPlayer() {
  const [pipData, setPipData] = useState<any>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

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
    <div 
      className={cn(
        "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[999999] min-w-[250px] max-w-[90vw] bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl flex flex-col",
        isDragging ? "transition-none" : "transition-transform duration-200 ease-out",
        !position.x && !position.y && "animate-in slide-in-from-bottom-5"
      )}
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        resize: 'both',
        overflow: 'hidden',
        width: '384px' // default width (similar to w-96)
      }}
    >
      <div 
        className="flex justify-between items-center p-2 border-b border-white/5 bg-[#1A1A1E] cursor-move select-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 truncate pr-2">
          <GripHorizontal className="size-3 text-[#71717A] shrink-0" />
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
      
      <div className="w-full flex-1 bg-black relative min-h-[150px]">
         <iframe 
           src={getSafeEmbedUrl(pipData.url, pipData.extra)} 
           className="absolute inset-0 w-full h-full border-0" 
           allowFullScreen
           allow="autoplay; encrypted-media"
         ></iframe>
         {isDragging && <div className="absolute inset-0 z-50 pointer-events-auto cursor-grabbing" />}
      </div>
    </div>
  );
}
