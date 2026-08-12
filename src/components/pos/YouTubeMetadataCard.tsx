import { useState } from 'react';
import { 
  Video, Eye, ThumbsUp, MessageSquare, Clock, Calendar, 
  Tag, AlignLeft, Users, Film, ChevronDown, ChevronUp, Link as LinkIcon 
} from 'lucide-react';
import { YouTubeVideoMetadata, YouTubeChannelMetadata } from '@/lib/youtube';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface YouTubeMetadataCardProps {
  videoData?: YouTubeVideoMetadata | null;
  channelData?: YouTubeChannelMetadata | null;
  onAdd?: () => void;
  isAdding?: boolean;
}

export function YouTubeMetadataCard({ videoData, channelData, onAdd, isAdding }: YouTubeMetadataCardProps) {
  const [showFullDesc, setShowFullDesc] = useState(false);

  const formatNumber = (numStr: string) => {
    const num = parseInt(numStr);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd 'de' MMM, yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const parseDuration = (pt: string) => {
    // Converts ISO 8601 duration (PT15M33S) to readable (15:33)
    const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return pt;
    const h = match[1] ? match[1].padStart(2, '0') + ':' : '';
    const m = (match[2] || '0').padStart(2, '0');
    const s = (match[3] || '0').padStart(2, '0');
    return `${h}${m}:${s}`;
  };

  if (videoData) {
    return (
      <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
        <div className="relative aspect-video w-full bg-[#1A1A1E]">
          {videoData.thumbnail ? (
            <img src={videoData.thumbnail} alt={videoData.title} className="w-full h-full object-cover opacity-90" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="size-12 text-[#A1A1AA]/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-[#111113]/50 to-transparent"></div>
          
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div>
              <span className="px-2 py-1 bg-rose-500/80 backdrop-blur-md rounded border border-rose-500 text-[10px] font-bold text-white uppercase tracking-wider mb-2 inline-block shadow-lg">
                Vídeo Encontrado
              </span>
              <h3 className="text-xl md:text-2xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                {videoData.title}
              </h3>
            </div>
            {videoData.duration && (
              <div className="px-2 py-1 bg-black/80 backdrop-blur-md rounded border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 shrink-0">
                <Clock className="size-3 text-rose-400" /> {parseDuration(videoData.duration)}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 md:p-6 space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#1A1A1E] border border-white/5 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-lg"><Eye className="size-4 text-rose-400" /></div>
              <div>
                <div className="text-[10px] font-bold text-[#71717A] uppercase">Views</div>
                <div className="text-sm font-bold text-white">{formatNumber(videoData.viewCount)}</div>
              </div>
            </div>
            <div className="bg-[#1A1A1E] border border-white/5 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg"><ThumbsUp className="size-4 text-cyan-400" /></div>
              <div>
                <div className="text-[10px] font-bold text-[#71717A] uppercase">Curtidas</div>
                <div className="text-sm font-bold text-white">{formatNumber(videoData.likeCount)}</div>
              </div>
            </div>
            <div className="bg-[#1A1A1E] border border-white/5 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg"><MessageSquare className="size-4 text-emerald-400" /></div>
              <div>
                <div className="text-[10px] font-bold text-[#71717A] uppercase">Comentários</div>
                <div className="text-sm font-bold text-white">{formatNumber(videoData.commentCount)}</div>
              </div>
            </div>
            <div className="bg-[#1A1A1E] border border-white/5 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg"><Calendar className="size-4 text-purple-400" /></div>
              <div>
                <div className="text-[10px] font-bold text-[#71717A] uppercase">Publicação</div>
                <div className="text-sm font-bold text-white">{formatDate(videoData.publishedAt)}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#1A1A1E] p-3 rounded-xl border border-white/5">
            <Users className="size-4 text-[#A1A1AA]" />
            <span className="text-xs font-bold text-[#A1A1AA]">Canal:</span>
            <span className="text-xs font-bold text-white">{videoData.channelTitle}</span>
          </div>

          {videoData.tags && videoData.tags.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mb-2 flex items-center gap-1.5"><Tag className="size-3" /> Tags do Vídeo</div>
              <div className="flex flex-wrap gap-2">
                {videoData.tags.slice(0, 10).map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-[#A1A1AA]">#{tag}</span>
                ))}
                {videoData.tags.length > 10 && <span className="px-2 py-1 text-[10px] text-[#71717A]">+{videoData.tags.length - 10}</span>}
              </div>
            </div>
          )}

          {videoData.description && (
            <div className="bg-[#1A1A1E] rounded-xl p-4 border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest flex items-center gap-1.5"><AlignLeft className="size-3" /> Descrição</div>
                <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
                  {showFullDesc ? <><ChevronUp className="size-3" /> Ocultar</> : <><ChevronDown className="size-3" /> Ver mais</>}
                </button>
              </div>
              <p className={cn("text-xs text-[#A1A1AA] whitespace-pre-wrap leading-relaxed", !showFullDesc && "line-clamp-3")}>
                {videoData.description}
              </p>
            </div>
          )}

          {onAdd && (
            <button 
              onClick={onAdd}
              disabled={isAdding}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 transition-all"
            >
              {isAdding ? 'Adicionando...' : <><Video className="size-4" /> Adicionar à Videoteca</>}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (channelData) {
    return (
      <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
        <div className="h-32 w-full bg-gradient-to-r from-cyan-900 to-purple-900 relative">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        <div className="p-5 md:p-6 pt-0 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="size-20 md:size-24 rounded-full border-4 border-[#111113] overflow-hidden bg-[#1A1A1E] -mt-10 md:-mt-12 relative z-10 shadow-xl">
              {channelData.thumbnail ? (
                <img src={channelData.thumbnail} alt={channelData.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Users className="size-8 text-[#A1A1AA]/50" /></div>
              )}
            </div>
            <div className="mt-4">
               <span className="px-2 py-1 bg-cyan-500/20 rounded border border-cyan-500/30 text-[10px] font-bold text-cyan-400 uppercase tracking-wider inline-block">Canal Encontrado</span>
            </div>
          </div>

          <h3 className="text-2xl font-black text-white leading-tight mb-1">{channelData.title}</h3>
          <p className="text-xs font-bold text-[#A1A1AA] mb-6 flex items-center gap-1.5"><LinkIcon className="size-3" /> {channelData.customUrl || channelData.id}</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#1A1A1E] border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center text-center">
              <div className="text-[10px] font-bold text-[#71717A] uppercase mb-1">Inscritos</div>
              <div className="text-sm font-black text-white">{formatNumber(channelData.subscriberCount)}</div>
            </div>
            <div className="bg-[#1A1A1E] border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center text-center">
              <div className="text-[10px] font-bold text-[#71717A] uppercase mb-1">Vídeos</div>
              <div className="text-sm font-black text-white">{formatNumber(channelData.videoCount)}</div>
            </div>
            <div className="bg-[#1A1A1E] border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center text-center">
              <div className="text-[10px] font-bold text-[#71717A] uppercase mb-1">Visualizações</div>
              <div className="text-sm font-black text-white">{formatNumber(channelData.viewCount)}</div>
            </div>
          </div>

          {channelData.description && (
            <div className="bg-[#1A1A1E] rounded-xl p-4 border border-white/5">
              <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest flex items-center gap-1.5 mb-2"><AlignLeft className="size-3" /> Sobre o Canal</div>
              <p className="text-xs text-[#A1A1AA] whitespace-pre-wrap leading-relaxed line-clamp-4">
                {channelData.description}
              </p>
            </div>
          )}

          {onAdd && (
            <button 
              onClick={onAdd}
              disabled={isAdding}
              className="w-full mt-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 transition-all"
            >
              {isAdding ? 'Adicionando...' : <><Film className="size-4" /> Importar Canal</>}
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
