import React, { useState } from 'react';
import { PlaySquare, Youtube, Plus, Trash2, Check, Search, ExternalLink, Video, Mic, Hash } from 'lucide-react';
import { usePosContent, ContentItem } from '@/hooks/use-pos-content';
import { toast } from 'sonner';

export function PosContent() {
  const { items, addItem, removeItem, markAsFinished } = usePosContent();
  const [activeTab, setActiveTab] = useState<'to_consume' | 'channels' | 'history'>('to_consume');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'video' | 'channel' | 'podcast'>('video');

  const extractYouTubeInfo = (url: string) => {
    let videoId = '';
    let isChannel = url.includes('/channel/') || url.includes('/c/') || url.includes('/@');
    
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    
    return { videoId, isChannel };
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl && !newTitle) return;

    const { videoId, isChannel } = extractYouTubeInfo(newUrl);
    
    let platform: 'youtube' | 'spotify' | 'other' = 'other';
    if (newUrl.includes('youtube.com') || newUrl.includes('youtu.be')) platform = 'youtube';
    else if (newUrl.includes('spotify.com')) platform = 'spotify';

    let finalType = newType;
    if (isChannel) finalType = 'channel';

    let thumbnail = '';
    if (videoId) {
      thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    } else if (platform === 'youtube' && isChannel) {
      // Placeholder genérico para canais se não tivermos a foto
      thumbnail = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop';
    } else if (platform === 'spotify') {
      thumbnail = 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=400&auto=format&fit=crop';
    } else {
      thumbnail = 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?q=80&w=400&auto=format&fit=crop';
    }

    addItem({
      title: newTitle || 'Conteúdo Sem Título',
      url: newUrl,
      type: finalType,
      status: 'to_consume',
      platform,
      thumbnail
    });

    setIsAddOpen(false);
    setNewUrl('');
    setNewTitle('');
    setNewType('video');
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'to_consume') return matchesSearch && i.status !== 'finished' && i.type !== 'channel';
    if (activeTab === 'channels') return matchesSearch && i.type === 'channel';
    if (activeTab === 'history') return matchesSearch && i.status === 'finished';
    return false;
  });

  return (
    <div className="relative p-4 md:p-10 max-w-[1400px] mx-auto flex flex-col gap-6 md:gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 animate-in fade-in slide-in-from-left-8 duration-1000 relative z-10">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white flex items-center gap-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
             <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-[0_0_30px_rgba(239,68,68,0.15)] relative group">
                <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-md group-hover:bg-red-500/40 transition-colors"></div>
                <PlaySquare className="size-6 md:size-8 text-red-400 relative z-10" /> 
             </div>
             Conteúdo
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base mt-3 max-w-2xl font-medium tracking-wide">
            Sua curadoria de vídeos, podcasts e canais para acompanhar e assistir.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="bg-[#111113] border border-red-500/30 px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.1)] flex items-center gap-3">
            <Youtube className="size-5 text-red-500" />
            <div>
              <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest leading-none mb-1">Na Fila</div>
              <div className="text-xl font-black text-white leading-none">{items.filter(i => i.status !== 'finished' && i.type !== 'channel').length}</div>
            </div>
          </div>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-xl transition-colors font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.3)]"
          >
            <Plus className="size-4" /> Novo Conteúdo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 relative z-10 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('to_consume')}
          className={`pb-4 whitespace-nowrap flex items-center gap-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'to_consume' ? 'border-red-500 text-white' : 'border-transparent text-muted-foreground hover:text-white'}`}
        >
          <Video className="size-4" /> Para Assistir
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          className={`pb-4 whitespace-nowrap flex items-center gap-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'channels' ? 'border-orange-500 text-white' : 'border-transparent text-muted-foreground hover:text-white'}`}
        >
          <Hash className="size-4" /> Canais / Criadores
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 whitespace-nowrap flex items-center gap-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'history' ? 'border-zinc-500 text-white' : 'border-transparent text-muted-foreground hover:text-white'}`}
        >
          <Check className="size-4" /> Já Vistos
        </button>
      </div>

      <div className="relative z-10 flex flex-col gap-8">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar conteúdos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-red-500 outline-none transition-colors"
          />
        </div>

        {/* Grid de Conteúdos */}
        {filteredItems.length === 0 ? (
          <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center flex flex-col items-center justify-center bg-[#111113]/50">
            <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <PlaySquare className="size-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhum conteúdo encontrado nesta aba.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-[#111113] border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-red-500/30 transition-all group relative shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <Trash2 className="size-4" />
                </button>
                <div className="h-44 relative bg-black/50">
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-transparent to-transparent"></div>
                  
                  {/* Platform Badge */}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                    {item.platform === 'youtube' ? <Youtube className="size-3 text-red-500" /> : <Mic className="size-3 text-emerald-500" />}
                    <span className="text-[9px] font-bold text-white uppercase tracking-widest">{item.platform}</span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="text-base font-bold text-white mb-4 line-clamp-2 leading-snug">{item.title}</h4>
                  
                  <div className="mt-auto flex flex-col gap-2">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer" className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-2 rounded-xl flex justify-center items-center gap-2 transition-colors text-xs border border-white/5">
                        <ExternalLink className="size-3" /> Acessar Link
                      </a>
                    )}
                    {item.status !== 'finished' && item.type !== 'channel' && (
                      <button onClick={() => markAsFinished(item.id)} className="w-full bg-red-500/20 text-red-400 font-bold py-2 rounded-xl hover:bg-red-500 hover:text-white transition-colors flex justify-center items-center gap-2 text-xs border border-red-500/30">
                        <Check className="size-3" /> Concluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#09090B] border border-[#1C1C21] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#1C1C21] flex items-center justify-between shrink-0 bg-[#0A0A0C]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Youtube className="size-4 text-red-400" />
                Adicionar Novo Conteúdo
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-[#6F6F6F] hover:text-white transition-colors p-2 bg-[#1A1A1E] rounded-full">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 flex flex-col gap-5">
              <div>
                 <label className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1.5 block">URL / Link</label>
                 <input 
                    type="url" 
                    placeholder="https://youtube.com/watch?v=..." 
                    value={newUrl} 
                    onChange={e => setNewUrl(e.target.value)} 
                    className="w-full bg-[#111113] border border-[#1C1C21] text-sm text-white px-4 py-3 rounded-xl focus:border-red-500 outline-none transition-colors" 
                 />
                 <p className="text-[10px] text-muted-foreground mt-1.5">A capa será extraída automaticamente de links do YouTube.</p>
              </div>
              <div>
                 <label className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1.5 block">Título (Opcional se tiver Link)</label>
                 <input 
                    type="text" 
                    placeholder="Nome do vídeo ou canal" 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)} 
                    className="w-full bg-[#111113] border border-[#1C1C21] text-sm text-white px-4 py-3 rounded-xl focus:border-red-500 outline-none transition-colors" 
                 />
              </div>
              <div>
                 <label className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-1.5 block">Tipo de Conteúdo</label>
                 <div className="flex gap-2">
                   <button 
                     type="button"
                     onClick={() => setNewType('video')}
                     className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${newType === 'video' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-[#111113] border-white/10 text-muted-foreground hover:text-white'}`}
                   >Vídeo</button>
                   <button 
                     type="button"
                     onClick={() => setNewType('podcast')}
                     className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${newType === 'podcast' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-[#111113] border-white/10 text-muted-foreground hover:text-white'}`}
                   >Podcast</button>
                   <button 
                     type="button"
                     onClick={() => setNewType('channel')}
                     className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${newType === 'channel' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-[#111113] border-white/10 text-muted-foreground hover:text-white'}`}
                   >Canal</button>
                 </div>
              </div>
              <button type="submit" className="w-full text-white font-bold py-3 rounded-xl transition-colors mt-2 bg-red-600 hover:bg-red-500">
                 Salvar na Fila
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
