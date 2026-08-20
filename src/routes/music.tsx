import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { 
  Home, Search, Library, Heart, Disc, Mic2, Play, Plus, 
  Trash2, ChevronLeft, ChevronRight, Bell, MoreVertical, Clock, ListMusic, Edit3, Shuffle, ChevronUp, ChevronDown, Edit, BarChart2
} from "lucide-react";
import { usePosMusic, MusicTrack } from "@/hooks/use-pos-music";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getMediaThumbnail } from "@/lib/youtube";

export const Route = createFileRoute("/music")({
  component: MusicAppPage,
});

function MusicAppPage() {
  const router = useRouter();
  const { 
    playlists, standaloneTracks, addPlaylist, removePlaylist, 
    addTrack, removeTrack, addStandaloneTrack, removeStandaloneTrack,
    removeTrackByUrl, updateTrackByUrl, updatePlaylist, playHistory, logPlay
  } = usePosMusic();
  
  const [activeView, setActiveView] = useState<'home' | 'playlist' | 'liked' | 'library' | 'search' | 'stats'>('home');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  
  const [playlistBeingEdited, setPlaylistBeingEdited] = useState<string | null>(null);
  const [editPlaylistTitleInput, setEditPlaylistTitleInput] = useState('');
  const [editPlaylistDescInput, setEditPlaylistDescInput] = useState('');
  const [editPlaylistCoverInput, setEditPlaylistCoverInput] = useState('');
  
  const [trackBeingEdited, setTrackBeingEdited] = useState<MusicTrack | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editTags, setEditTags] = useState('');

  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [trackAddMode, setTrackAddMode] = useState<'new' | 'library'>('new');
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('');
  const [newTrackGenre, setNewTrackGenre] = useState('');
  const [newTrackTags, setNewTrackTags] = useState('');

  const [nowPlayingUrl, setNowPlayingUrl] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  const globalAllTracksMap = new Map<string, MusicTrack>();
  standaloneTracks.forEach(t => globalAllTracksMap.set(t.url, t));
  playlists.forEach(p => p.tracks.forEach(t => globalAllTracksMap.set(t.url, t)));
  const globalAllTracks = Array.from(globalAllTracksMap.values());
  
  const globalUniqueArtists = Array.from(new Set(globalAllTracks.map(t => t.artist?.trim()).filter(a => a && a !== 'Artista Desconhecido'))).sort();
  const globalUniqueGenres = Array.from(new Set(globalAllTracks.map(t => t.genre?.trim()).filter(Boolean))).sort();
  const globalUniqueTags = Array.from(new Set(globalAllTracks.flatMap(t => t.tags || []))).sort();

  const handleShufflePlay = (tracks: MusicTrack[]) => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled, 0);
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle) return;
    const cover = 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=400&auto=format&fit=crop';
    addPlaylist(newPlaylistTitle, cover);
    setIsAddingPlaylist(false);
    setNewPlaylistTitle('');
  };

  const openEditPlaylistModal = () => {
    if (!activePlaylist) return;
    setPlaylistBeingEdited(activePlaylist.id);
    setEditPlaylistTitleInput(activePlaylist.title);
    setEditPlaylistDescInput(activePlaylist.description || '');
    setEditPlaylistCoverInput(activePlaylist.cover_url);
  };

  const handleEditPlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistBeingEdited) return;
    updatePlaylist(playlistBeingEdited, {
      title: editPlaylistTitleInput || 'Playlist sem nome',
      description: editPlaylistDescInput,
      cover_url: editPlaylistCoverInput || 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=400&auto=format&fit=crop'
    });
    setPlaylistBeingEdited(null);
  };

  const handleMoveTrack = (trackId: string, direction: 'up' | 'down') => {
    if (!activePlaylistId || !activePlaylist) return;
    const tracks = [...activePlaylist.tracks];
    const index = tracks.findIndex(t => t.id === trackId);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      [tracks[index - 1], tracks[index]] = [tracks[index], tracks[index - 1]];
    } else if (direction === 'down' && index < tracks.length - 1) {
      [tracks[index + 1], tracks[index]] = [tracks[index], tracks[index + 1]];
    } else {
      return;
    }
    
    updatePlaylist(activePlaylistId, { tracks });
  };

  const openEditModal = (track: MusicTrack) => {
    setTrackBeingEdited(track);
    setEditTitle(track.title);
    setEditArtist(track.artist || '');
    setEditUrl(track.url);
    setEditGenre(track.genre || '');
    setEditTags(track.tags ? track.tags.join(', ') : '');
  };

  const handleUpdateTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackBeingEdited || !editUrl) return;
    
    let thumbnail = trackBeingEdited.thumbnail;
    if (editUrl !== trackBeingEdited.url) {
      thumbnail = getMediaThumbnail(editUrl);
    }

    updateTrackByUrl(trackBeingEdited.url, {
      title: editTitle || 'Faixa Desconhecida',
      artist: editArtist || 'Artista Desconhecido',
      url: editUrl,
      thumbnail,
      genre: editGenre || undefined,
      tags: editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : undefined
    });

    setTrackBeingEdited(null);
  };

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackUrl) return;

    const thumbnail = getMediaThumbnail(newTrackUrl);

    const trackData = {
      title: newTrackTitle || 'Faixa Desconhecida',
      artist: newTrackArtist || 'Artista Desconhecido',
      url: newTrackUrl,
      thumbnail,
      genre: newTrackGenre || undefined,
      tags: newTrackTags ? newTrackTags.split(',').map(t => t.trim()).filter(Boolean) : undefined
    };

    if (activeView === 'playlist' && activePlaylistId) {
      addTrack(activePlaylistId, trackData);
    } else if (activeView === 'liked') {
      addStandaloneTrack(trackData);
    }

    setIsAddingTrack(false);
    setNewTrackUrl('');
    setNewTrackTitle('');
    setNewTrackArtist('');
    setNewTrackGenre('');
    setNewTrackTags('');
  };

  const playTrack = (track: MusicTrack, queue?: MusicTrack[], currentIndex?: number) => {
    logPlay(track);
    setNowPlayingUrl(track.url);
    window.dispatchEvent(new CustomEvent('global-pip', { 
      detail: { url: track.url, title: track.title, extra: 'autoplay=1', queue, currentIndex } 
    }));
  };

  const playCollection = (tracks: MusicTrack[], startIndex: number = 0) => {
    if (tracks.length === 0) {
      toast.error('Nenhuma música encontrada!');
      return;
    }
    playTrack(tracks[startIndex], tracks, startIndex);
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      
      <datalist id="artist-suggestions">
        {globalUniqueArtists.map(artist => <option key={artist} value={artist} />)}
      </datalist>
      <datalist id="genre-suggestions">
        {globalUniqueGenres.map(genre => <option key={genre} value={genre} />)}
      </datalist>
      <datalist id="tag-suggestions">
        {globalUniqueTags.map(tag => <option key={tag} value={tag} />)}
      </datalist>

      {/* --------------------------- */}
      {/* SIDEBAR (EXCLUSIVA DE MÚSICA) */}
      {/* --------------------------- */}
      <aside className="hidden md:flex flex-col w-[260px] h-full bg-black shrink-0 pt-6 px-4">
        {/* Logo / Back to System */}
        <Link to="/personal-os" search={{ tab: 'geral' }} className="flex items-center gap-2 mb-8 px-2 group cursor-pointer hover:opacity-80 transition-opacity">
          <div className="size-8 rounded-full bg-white flex items-center justify-center text-black font-black text-sm group-hover:scale-105 transition-transform">
            LO
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Voltar ao OS</span>
        </Link>

        {/* Main Nav */}
        <nav className="flex flex-col gap-1 mb-8">
          <button onClick={() => setActiveView('home')} className={cn("flex items-center gap-4 px-3 py-2 rounded-md font-bold text-sm transition-colors", activeView === 'home' ? "text-white" : "text-[#B3B3B3] hover:text-white")}>
            <Home className={cn("size-6", activeView === 'home' && "fill-current")} /> Início
          </button>
          <button onClick={() => setActiveView('search')} className={cn("flex items-center gap-4 px-3 py-2 rounded-md font-bold text-sm transition-colors", activeView === 'search' ? "text-white" : "text-[#B3B3B3] hover:text-white")}>
            <Search className={cn("size-6", activeView === 'search' && "text-white")} /> Explorar
          </button>
          <button onClick={() => setActiveView('library')} className={cn("flex items-center gap-4 px-3 py-2 rounded-md font-bold text-sm transition-colors", activeView === 'library' ? "text-white" : "text-[#B3B3B3] hover:text-white")}>
            <Library className={cn("size-6", activeView === 'library' && "fill-current")} /> Biblioteca
          </button>
        </nav>

        {/* Sub-sections */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
          
          <button onClick={() => setActiveView('liked')} className={cn("flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors", activeView === 'liked' ? "text-white bg-white/10" : "text-[#B3B3B3] hover:text-white hover:bg-white/5")}>
            <Heart className="size-5 text-[#1DB954]" fill="currentColor" /> Músicas Curtidas
          </button>
          
          <div className="flex items-center justify-between px-3 mt-4 mb-2 group">
            <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest">Playlists</span>
            <button onClick={() => setIsAddingPlaylist(true)} className="text-[#A1A1AA] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="size-4" />
            </button>
          </div>
          
          {playlists.map(p => (
            <button 
              key={p.id}
              onClick={() => { setActiveView('playlist'); setActivePlaylistId(p.id); }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors truncate",
                activeView === 'playlist' && activePlaylistId === p.id ? "text-white bg-white/10" : "text-[#B3B3B3] hover:text-white hover:bg-white/5"
              )}
            >
              <ListMusic className="size-4 shrink-0" />
              <span className="truncate">{p.title}</span>
            </button>
          ))}

          <div className="flex items-center px-3 mt-4 mb-2">
            <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest">Álbuns</span>
          </div>
          <button onClick={() => toast.info('Salvar álbuns inteiros em breve.')} className="flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors text-[#B3B3B3] hover:text-white hover:bg-white/5">
            <Disc className="size-4 shrink-0" />
            <span className="truncate">Álbuns Salvos (0)</span>
          </button>

          {(() => {
            const allTracksMap = new Map<string, MusicTrack>();
            standaloneTracks.forEach(t => allTracksMap.set(t.url, t));
            playlists.forEach(p => p.tracks.forEach(t => allTracksMap.set(t.url, t)));
            const allTracks = Array.from(allTracksMap.values());
            const uniqueArtists = Array.from(new Set(allTracks.map(t => t.artist?.trim()).filter(a => a && a !== 'Artista Desconhecido'))).sort();
            
            return (
              <>
                <div className="flex items-center px-3 mt-4 mb-2">
                  <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest">Artistas ({uniqueArtists.length})</span>
                </div>
                {uniqueArtists.length === 0 ? (
                  <button className="flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors text-[#B3B3B3] hover:text-white hover:bg-white/5 cursor-default">
                    <Mic2 className="size-4 shrink-0" />
                    <span className="truncate">Nenhum cadastrado</span>
                  </button>
                ) : (
                  uniqueArtists.slice(0, 10).map((artist, i) => (
                    <button key={i} onClick={() => { setActiveView('search'); setSearchQuery(artist); }} className="flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors text-[#B3B3B3] hover:text-white hover:bg-white/5 truncate">
                      <Mic2 className="size-4 shrink-0" />
                      <span className="truncate">{artist}</span>
                    </button>
                  ))
                )}
                {uniqueArtists.length > 10 && (
                  <button onClick={() => { setActiveView('search'); setSearchQuery(''); }} className="flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors text-[#A1A1AA] hover:text-white hover:bg-white/5 ml-4">
                    <span className="truncate">Ver todos...</span>
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </aside>

      {/* --------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* --------------------------- */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#121212] sm:m-2 sm:rounded-lg overflow-hidden relative">
        
        {/* TOPBAR */}
        <div className={cn("h-16 flex items-center justify-between px-6 sticky top-0 z-50 transition-all duration-300", isScrolled ? "bg-[#121212] shadow-lg border-b border-white/5" : "bg-transparent")}>
          <div className="flex items-center gap-2">
            <button className="size-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors">
              <ChevronLeft className="size-5" />
            </button>
            <button className="size-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors">
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="flex-1 max-w-md mx-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-black group-focus-within:text-black transition-colors" />
              <input 
                type="text" 
                placeholder="O que você quer ouvir?"
                className="w-full bg-white border border-transparent rounded-full py-2.5 pl-11 pr-4 text-sm text-black focus:outline-none transition-all placeholder:text-black/60 font-medium shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="size-8 rounded-full bg-black/50 hover:bg-black flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors">
              <Bell className="size-4" />
            </button>
            <button className="flex items-center gap-2 bg-black/50 hover:bg-[#282828] p-1 pr-3 rounded-full transition-colors border border-white/5">
              <div className="size-7 rounded-full bg-gradient-to-tr from-[#1DB954] to-emerald-400 p-[1px]">
                 <div className="w-full h-full bg-[#111113] rounded-full flex items-center justify-center text-[10px] font-black text-white">BA</div>
              </div>
              <span className="text-sm font-bold text-white">Bruno ▼</span>
            </button>
          </div>
        </div>

        {/* CONTENT SCROLL */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative pb-32" onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 40)}>
          
          {/* HOME VIEW */}
          {activeView === 'home' && (
            <div className="px-6 md:px-8 pt-6">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-6">Boa tarde</h2>

              {(() => {
                const allTracksMap = new Map<string, MusicTrack>();
                standaloneTracks.forEach(t => allTracksMap.set(t.url, t));
                playlists.forEach(p => p.tracks.forEach(t => allTracksMap.set(t.url, t)));
                const allTracks = Array.from(allTracksMap.values());
                const uniqueArtists = new Set(allTracks.map(t => t.artist?.trim()).filter(a => a && a !== 'Artista Desconhecido'));
                const uniqueGenres = new Set(allTracks.map(t => t.genre?.trim()).filter(Boolean));

                const trackCounts = new Map<string, { track: MusicTrack, count: number }>();
                playHistory.forEach(entry => {
                  if (!trackCounts.has(entry.track.url)) trackCounts.set(entry.track.url, { track: entry.track, count: 0 });
                  trackCounts.get(entry.track.url)!.count++;
                });
                const topPlayed = Array.from(trackCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);

                return (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-white/5 rounded-lg p-4 flex flex-col items-center justify-center border border-white/10 shadow-lg">
                        <ListMusic className="size-6 text-[#1DB954] mb-2" />
                        <span className="text-2xl font-black text-white">{allTracks.length}</span>
                        <span className="text-xs text-[#A1A1AA] font-medium uppercase tracking-widest mt-1">Músicas</span>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 flex flex-col items-center justify-center border border-white/10 shadow-lg">
                        <Mic2 className="size-6 text-[#1DB954] mb-2" />
                        <span className="text-2xl font-black text-white">{uniqueArtists.size}</span>
                        <span className="text-xs text-[#A1A1AA] font-medium uppercase tracking-widest mt-1">Cantores</span>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 flex flex-col items-center justify-center border border-white/10 shadow-lg">
                        <Disc className="size-6 text-[#1DB954] mb-2" />
                        <span className="text-2xl font-black text-white">{uniqueGenres.size}</span>
                        <span className="text-xs text-[#A1A1AA] font-medium uppercase tracking-widest mt-1">Gêneros</span>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 flex flex-col items-center justify-center border border-white/10 shadow-lg">
                        <Play className="size-6 text-[#1DB954] mb-2" />
                        <span className="text-2xl font-black text-white">{playHistory.length}</span>
                        <span className="text-xs text-[#A1A1AA] font-medium uppercase tracking-widest mt-1">Reproduções</span>
                      </div>
                    </div>

                    {topPlayed.length > 0 && (
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-4">Mais Ouvidas</h2>
                        <div className="flex flex-col gap-1">
                          {topPlayed.map((item, idx) => {
                            const isPlaying = nowPlayingUrl === item.track.url;
                            return (
                              <div key={item.track.id + idx} onDoubleClick={() => playTrack(item.track, topPlayed.map(i => i.track), idx)} className="grid grid-cols-[16px_1fr_60px] md:grid-cols-[16px_4fr_2fr_60px] gap-4 px-4 py-2 hover:bg-white/10 rounded-md group transition-colors items-center cursor-pointer">
                                <div className={cn("text-sm text-center relative font-medium group-hover:text-white", isPlaying ? "text-[#1DB954]" : "text-[#A1A1AA]")}>
                                  <span className="group-hover:opacity-0">{isPlaying ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="animate-pulse mx-auto"><rect x="2" y="10" width="4" height="14"/><rect x="10" y="2" width="4" height="22"/><rect x="18" y="14" width="4" height="10"/></svg> : idx + 1}</span>
                                  <button onClick={(e) => { e.stopPropagation(); playTrack(item.track, topPlayed.map(i => i.track), idx); }} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white">
                                    <Play className="size-4" fill="currentColor" />
                                  </button>
                                </div>
                                
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="size-10 bg-black shrink-0 overflow-hidden rounded">
                                    <img src={item.track.thumbnail} alt={item.track.title} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="truncate flex flex-col justify-center">
                                    <p className={cn("text-[15px] font-normal truncate group-hover:underline", isPlaying ? "text-[#1DB954]" : "text-white")}>{item.track.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                                      <p className="text-[#A1A1AA] text-xs truncate group-hover:text-white transition-colors shrink-0">{item.track.artist || 'Artista Desconhecido'}</p>
                                      {item.track.genre && <span className="text-[10px] bg-white/10 text-[#A1A1AA] px-1.5 py-0.5 rounded shrink-0">{item.track.genre}</span>}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="hidden md:flex items-center text-[13px] text-[#A1A1AA] truncate group-hover:text-white transition-colors">
                                  {item.count} plays
                                </div>
                                
                                <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); openEditModal(item.track); }} className="text-[#A1A1AA] hover:text-white" title="Editar"><Edit3 className="size-4" /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
                <div onClick={() => setActiveView('liked')} className="flex items-center bg-white/5 hover:bg-white/20 transition-colors rounded-md overflow-hidden cursor-pointer group h-16 shadow-md">
                  <div className="w-16 h-full bg-gradient-to-br from-[#4F378B] to-[#ffffff] flex items-center justify-center shrink-0 shadow-inner">
                    <Heart className="size-6 text-white" fill="white" />
                  </div>
                  <div className="flex-1 px-4 font-bold text-white truncate text-sm">Músicas Curtidas</div>
                  <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="size-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                      <Play className="size-5 ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>
                {playlists.slice(0, 7).map(p => (
                  <div key={p.id} onClick={() => { setActiveView('playlist'); setActivePlaylistId(p.id); }} className="flex items-center bg-white/5 hover:bg-white/20 transition-colors rounded-md overflow-hidden cursor-pointer group h-16 shadow-md">
                    <div className="w-16 h-full bg-[#282828] shrink-0">
                      <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 px-4 font-bold text-white truncate text-sm">{p.title}</div>
                    <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); playCollection(p.tracks); }} className="size-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                        <Play className="size-5 ml-1" fill="currentColor" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-white hover:underline cursor-pointer mb-6">Suas Playlists</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {playlists.map(playlist => (
                    <div key={playlist.id} onClick={() => { setActiveView('playlist'); setActivePlaylistId(playlist.id); }} className="bg-[#181818] hover:bg-[#282828] p-4 rounded-md cursor-pointer group transition-colors shadow-md">
                      <div className="relative aspect-square w-full rounded-md overflow-hidden mb-4 bg-[#333] shadow-lg">
                        <img src={playlist.cover_url} alt={playlist.title} className="w-full h-full object-cover" />
                        <button onClick={(e) => { e.stopPropagation(); playCollection(playlist.tracks); }} className="absolute bottom-2 right-2 size-12 bg-[#1DB954] text-black rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105">
                          <Play className="size-6 ml-1" fill="currentColor" />
                        </button>
                      </div>
                      <h4 className="text-white font-bold truncate text-base mb-1">{playlist.title}</h4>
                      <p className="text-[#A1A1AA] text-sm truncate font-medium">Por Bruno Abreu</p>
                    </div>
                  ))}
                </div>
              </div>

              {globalUniqueGenres.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-white hover:underline cursor-pointer mb-6">Coleções por Gênero</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {globalUniqueGenres.map(genre => {
                      const tracks = globalAllTracks.filter(t => t.genre === genre);
                      return (
                        <div key={genre} onClick={() => { setActiveView('search'); setSearchQuery(genre); }} className="bg-[#181818] hover:bg-[#282828] p-4 rounded-md cursor-pointer group transition-colors shadow-md">
                          <div className="relative aspect-square w-full rounded-md overflow-hidden mb-4 bg-gradient-to-br from-[#4F378B] to-[#121212] shadow-lg flex items-center justify-center">
                            <Disc className="size-16 text-white/50 group-hover:text-white transition-colors" />
                            <button onClick={(e) => { e.stopPropagation(); playCollection(tracks); }} className="absolute bottom-2 right-2 size-12 bg-[#1DB954] text-black rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105">
                              <Play className="size-6 ml-1" fill="currentColor" />
                            </button>
                          </div>
                          <h4 className="text-white font-bold truncate text-base mb-1">{genre}</h4>
                          <p className="text-[#A1A1AA] text-sm truncate font-medium">{tracks.length} músicas</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {globalUniqueTags.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-white hover:underline cursor-pointer mb-6">Suas Coleções (Tags)</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {globalUniqueTags.map(tag => {
                      const tracks = globalAllTracks.filter(t => t.tags?.includes(tag));
                      return (
                        <div key={tag} onClick={() => { setActiveView('search'); setSearchQuery(tag); }} className="bg-[#181818] hover:bg-[#282828] p-4 rounded-md cursor-pointer group transition-colors shadow-md">
                          <div className="relative aspect-square w-full rounded-md overflow-hidden mb-4 bg-gradient-to-br from-emerald-600 to-[#121212] shadow-lg flex items-center justify-center">
                            <span className="text-5xl font-black text-white/50 group-hover:text-white transition-colors">#</span>
                            <button onClick={(e) => { e.stopPropagation(); playCollection(tracks); }} className="absolute bottom-2 right-2 size-12 bg-[#1DB954] text-black rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105">
                              <Play className="size-6 ml-1" fill="currentColor" />
                            </button>
                          </div>
                          <h4 className="text-white font-bold truncate text-base mb-1 capitalize">{tag}</h4>
                          <p className="text-[#A1A1AA] text-sm truncate font-medium">{tracks.length} músicas</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* LIBRARY VIEW (ALL SONGS) */}
          {activeView === 'library' && (
            <div className="flex flex-col min-h-full pb-8">
              {(() => {
                // Get all tracks from standalone and playlists, deduplicated by URL
                const allTracksMap = new Map<string, MusicTrack>();
                standaloneTracks.forEach(t => allTracksMap.set(t.url, t));
                playlists.forEach(p => p.tracks.forEach(t => allTracksMap.set(t.url, t)));
                const allTracks = Array.from(allTracksMap.values());

                return (
                  <>
                    <div className="relative flex items-end px-6 md:px-8 pb-6 pt-24 bg-gradient-to-b from-[#4F378B] to-[#121212] transition-colors duration-500">
                      <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-6 w-full">
                        <div className="w-48 h-48 md:w-60 md:h-60 shrink-0 shadow-[0_4px_60px_rgba(0,0,0,0.5)] bg-gradient-to-br from-[#4F378B] to-[#ffffff] flex items-center justify-center">
                           <Library className="size-20 text-white" />
                        </div>
                        <div className="flex flex-col gap-2 flex-1 mt-4 md:mt-0">
                           <span className="text-sm font-bold text-white uppercase tracking-wider">Acervo Geral</span>
                           <h1 className="text-5xl md:text-[80px] font-black text-white tracking-tighter leading-none mb-2">Biblioteca</h1>
                           <div className="flex items-center gap-1.5 mt-2 text-sm text-white font-bold">
                             <div className="size-6 rounded-full overflow-hidden bg-white/20"><img src="https://avatars.githubusercontent.com/u/1?v=4" alt="Bruno" className="w-full h-full object-cover" /></div>
                             <span className="hover:underline cursor-pointer">Bruno Abreu</span>
                             <span className="text-[#B3B3B3] font-normal">• {allTracks.length} músicas</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 md:px-8 py-6 flex items-center gap-6 bg-gradient-to-b from-black/20 to-[#121212] relative z-10">
                      <button onClick={() => playCollection(allTracks)} className="size-14 bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 transition-all text-black rounded-full flex items-center justify-center shadow-lg">
                        <Play className="size-6 ml-1" fill="currentColor" />
                      </button>
                      <button onClick={() => handleShufflePlay(allTracks)} className="size-10 flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors" title="Ordem Aleatória">
                        <Shuffle className="size-6" />
                      </button>
                      <button onClick={() => setIsAddingTrack(!isAddingTrack)} className="flex items-center gap-2 px-4 py-2 bg-transparent text-white border border-white/30 rounded-full hover:border-white hover:scale-105 transition-all text-sm font-bold ml-4">
                        <Plus className="size-4" />
                        Adicionar Música
                      </button>
                    </div>

                    {isAddingTrack && (
                      <div className="px-6 md:px-8 mb-8">
                        <div className="bg-white/10 p-6 rounded-xl max-w-2xl border border-white/10 shadow-xl">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold text-lg">Adicionar Música ao Acervo</h3>
                          </div>
                          
                          <p className="text-[#A1A1AA] text-sm mb-4">Cole o link de qualquer vídeo ou música do YouTube abaixo para adicionar à sua biblioteca (como música avulsa).</p>
                          <form onSubmit={handleAddTrack} className="flex flex-col gap-3">
                            <div className="flex flex-col md:flex-row gap-3">
                              <input 
                                type="text" required
                                placeholder="Nome da Música"
                                value={newTrackTitle} onChange={e => setNewTrackTitle(e.target.value)}
                                className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                              />
                              <input 
                                type="text" required
                                placeholder="Cantor/Artista"
                                list="artist-suggestions"
                                value={newTrackArtist} onChange={e => setNewTrackArtist(e.target.value)}
                                className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                              />
                              <input 
                                type="url" required
                                placeholder="Link do YouTube (https://...)"
                                value={newTrackUrl} onChange={e => setNewTrackUrl(e.target.value)}
                                className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                              />
                            </div>
                            <div className="flex flex-col md:flex-row gap-3 mt-1">
                              <input 
                                type="text"
                                placeholder="Gênero (ex: Pop, Rock)"
                                list="genre-suggestions"
                                value={newTrackGenre} onChange={e => setNewTrackGenre(e.target.value)}
                                className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                              />
                              <input 
                                type="text"
                                placeholder="Tags (separadas por vírgula)"
                                list="tag-suggestions"
                                value={newTrackTags} onChange={e => setNewTrackTags(e.target.value)}
                                className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                              />
                            </div>
                            <div className="flex justify-end mt-2">
                              <button type="submit" className="px-8 py-3 bg-[#1DB954] text-black font-bold text-sm rounded-full hover:bg-[#1ed760] transition-colors">
                                Salvar Música
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    <div className="px-6 md:px-8">
                      <div className="grid grid-cols-[16px_1fr_40px] md:grid-cols-[16px_4fr_2fr_40px] gap-4 px-4 py-2 border-b border-white/10 text-[#A1A1AA] text-[13px] font-medium tracking-widest mb-4">
                        <div className="text-center">#</div>
                        <div>Título</div>
                        <div className="hidden md:flex items-center gap-1">Álbum</div>
                        <div className="flex items-center justify-center"><Clock className="size-4" /></div>
                      </div>

                      <div className="flex flex-col gap-1">
                        {allTracks.length === 0 ? (
                          <div className="py-12 text-center text-[#A1A1AA] italic">Você ainda não tem nenhuma música salva.</div>
                        ) : (
                          allTracks.map((track, idx) => {
                            const isPlaying = nowPlayingUrl === track.url;
                            return (
                              <div key={track.id + idx} onDoubleClick={() => playTrack(track, allTracks, idx)} className="grid grid-cols-[16px_1fr_40px] md:grid-cols-[16px_4fr_2fr_40px] gap-4 px-4 py-2 hover:bg-white/10 rounded-md group transition-colors items-center cursor-pointer">
                                <div className={cn("text-sm text-center relative font-medium group-hover:text-white", isPlaying ? "text-[#1DB954]" : "text-[#A1A1AA]")}>
                                  <span className="group-hover:opacity-0">{isPlaying ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="animate-pulse mx-auto"><rect x="2" y="10" width="4" height="14"/><rect x="10" y="2" width="4" height="22"/><rect x="18" y="14" width="4" height="10"/></svg> : idx + 1}</span>
                                  <button onClick={(e) => { e.stopPropagation(); playTrack(track, allTracks, idx); }} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white">
                                    <Play className="size-4" fill="currentColor" />
                                  </button>
                                </div>
                                
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="size-10 bg-black shrink-0 overflow-hidden rounded">
                                    <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="truncate flex flex-col justify-center">
                                    <p className={cn("text-[15px] font-normal truncate group-hover:underline", isPlaying ? "text-[#1DB954]" : "text-white")}>{track.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                                      <p className="text-[#A1A1AA] text-xs truncate group-hover:text-white transition-colors shrink-0">{track.artist || 'Artista Desconhecido'}</p>
                                      {track.genre && <span className="text-[10px] bg-white/10 text-[#A1A1AA] px-1.5 py-0.5 rounded shrink-0">{track.genre}</span>}
                                      {track.tags && track.tags.slice(0,2).map(tag => (
                                        <span key={tag} className="text-[10px] bg-[#1DB954]/20 text-[#1DB954] px-1.5 py-0.5 rounded shrink-0">#{tag}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="hidden md:flex items-center text-[13px] text-[#A1A1AA] truncate group-hover:text-white transition-colors">
                                  Acervo
                                </div>
                                
                                <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); openEditModal(track); }} className="text-[#A1A1AA] hover:text-white" title="Editar"><Edit3 className="size-4" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); removeTrackByUrl(track.url); }} className="text-[#A1A1AA] hover:text-rose-500" title="Excluir"><Trash2 className="size-4" /></button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* STATS / WRAPPED VIEW */}
          {activeView === 'stats' && (
            <div className="px-6 md:px-8 pt-6 pb-8 min-h-full">
              <h2 className="text-3xl font-black text-white mb-2">Seu Perfil Musical</h2>
              <p className="text-[#A1A1AA] text-sm mb-8">Baseado no seu histórico de reproduções ({playHistory.length} faixas tocadas).</p>
              
              {(() => {
                const trackCounts = new Map<string, { track: MusicTrack, count: number }>();
                const artistCounts = new Map<string, number>();

                playHistory.forEach(entry => {
                  const url = entry.track.url;
                  const artist = entry.track.artist || 'Artista Desconhecido';
                  
                  if (!trackCounts.has(url)) trackCounts.set(url, { track: entry.track, count: 0 });
                  trackCounts.get(url)!.count++;

                  artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
                });

                const topTracks = Array.from(trackCounts.values()).sort((a, b) => b.count - a.count).slice(0, 10);
                const topArtists = Array.from(artistCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

                return (
                  <div className="flex flex-col gap-10">
                    <section>
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><BarChart2 className="size-5 text-[#1DB954]" /> Top Artistas</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {topArtists.length === 0 && <p className="text-[#A1A1AA] text-sm col-span-5">Nenhum dado suficiente.</p>}
                        {topArtists.map(([artist, count], idx) => (
                          <div key={artist} className="bg-[#181818] hover:bg-[#282828] transition-colors p-4 rounded-xl flex flex-col items-center text-center gap-3">
                            <div className="size-24 rounded-full bg-gradient-to-br from-[#1DB954] to-black flex items-center justify-center text-4xl shadow-lg relative">
                              🎧
                              <div className="absolute -top-2 -right-2 size-8 bg-black border-2 border-[#121212] rounded-full flex items-center justify-center text-xs font-bold text-white">{idx + 1}º</div>
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm line-clamp-1">{artist}</p>
                              <p className="text-xs text-[#A1A1AA] mt-1">{count} plays</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <section>
                        <h3 className="text-xl font-bold text-white mb-4">Top 10 Músicas</h3>
                        <div className="flex flex-col gap-2">
                          {topTracks.length === 0 && <p className="text-[#A1A1AA] text-sm">Nenhum dado suficiente.</p>}
                          {topTracks.map((item, idx) => (
                            <div key={item.track.id + idx} onClick={() => playTrack(item.track, topTracks.map(t => t.track), idx)} className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-md cursor-pointer transition-colors group">
                              <span className="text-[#A1A1AA] font-bold w-4 text-right text-sm">{idx + 1}</span>
                              <img src={item.track.thumbnail} alt="cover" className="size-10 rounded object-cover" />
                              <div className="flex-1 truncate">
                                <p className="text-white text-sm font-medium truncate group-hover:underline">{item.track.title}</p>
                                <p className="text-xs text-[#A1A1AA] truncate">{item.track.artist || 'Artista Desconhecido'}</p>
                              </div>
                              <span className="text-xs text-[#A1A1AA] font-medium">{item.count} plays</span>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold text-white mb-4">Histórico Recente</h3>
                        <div className="flex flex-col gap-2">
                          {playHistory.length === 0 && <p className="text-[#A1A1AA] text-sm">Nenhum histórico disponível.</p>}
                          {playHistory.slice(0, 10).map((entry, idx) => (
                            <div key={entry.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-md">
                              <div className="size-10 bg-black/20 rounded flex items-center justify-center shrink-0">
                                <Clock className="size-4 text-[#A1A1AA]" />
                              </div>
                              <div className="flex-1 truncate">
                                <p className="text-white text-sm font-medium truncate">{entry.track.title}</p>
                                <p className="text-xs text-[#A1A1AA] truncate">{new Date(entry.playedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* SEARCH VIEW */}
          {activeView === 'search' && (
            <div className="px-6 md:px-8 pt-6 pb-8 min-h-full">
              <div className="sticky top-0 z-10 pt-4 pb-6 bg-[#121212]">
                <div className="relative max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#A1A1AA]" />
                  <input
                    type="text"
                    placeholder="O que você quer ouvir?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#242424] text-white placeholder-[#A1A1AA] rounded-full py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-white border border-transparent transition-all"
                  />
                </div>
              </div>

              {(() => {
                const allTracksMap = new Map<string, MusicTrack>();
                standaloneTracks.forEach(t => allTracksMap.set(t.url, t));
                playlists.forEach(p => p.tracks.forEach(t => allTracksMap.set(t.url, t)));
                const allTracks = Array.from(allTracksMap.values());
                
                const filteredTracks = searchQuery 
                  ? allTracks.filter(t => {
                      const q = searchQuery.toLowerCase();
                      const matchTitle = t.title.toLowerCase().includes(q);
                      const matchArtist = t.artist?.toLowerCase().includes(q);
                      const matchGenre = t.genre?.toLowerCase().includes(q);
                      const matchTags = t.tags?.some(tag => tag.toLowerCase().includes(q));
                      return matchTitle || matchArtist || matchGenre || matchTags;
                    })
                  : [];

                if (!searchQuery) {
                  return (
                    <div className="flex flex-col items-center justify-center mt-20 text-[#A1A1AA]">
                      <Search className="size-16 mb-4 opacity-20" />
                      <h3 className="text-xl font-bold text-white mb-2">Busque por faixas e artistas</h3>
                      <p className="text-sm">Encontre suas músicas favoritas no seu acervo local.</p>
                    </div>
                  );
                }

                return (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-6">Resultados da busca</h3>
                    <div className="flex flex-col gap-1">
                      {filteredTracks.length === 0 ? (
                        <p className="text-[#A1A1AA] text-sm">Nenhum resultado encontrado para "{searchQuery}".</p>
                      ) : (
                        filteredTracks.map((track, idx) => {
                          const isPlaying = nowPlayingUrl === track.url;
                          return (
                            <div key={track.id + idx} onDoubleClick={() => playTrack(track, filteredTracks, idx)} className="grid grid-cols-[16px_1fr_40px] md:grid-cols-[16px_4fr_2fr_40px] gap-4 px-4 py-2 hover:bg-white/10 rounded-md group transition-colors items-center cursor-pointer">
                              <div className={cn("text-sm text-center relative font-medium group-hover:text-white", isPlaying ? "text-[#1DB954]" : "text-[#A1A1AA]")}>
                                <span className="group-hover:opacity-0">{isPlaying ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="animate-pulse mx-auto"><rect x="2" y="10" width="4" height="14"/><rect x="10" y="2" width="4" height="22"/><rect x="18" y="14" width="4" height="10"/></svg> : idx + 1}</span>
                                <button onClick={(e) => { e.stopPropagation(); playTrack(track, filteredTracks, idx); }} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white">
                                  <Play className="size-4" fill="currentColor" />
                                </button>
                              </div>
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="size-10 bg-black shrink-0 overflow-hidden rounded">
                                  <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="truncate flex flex-col justify-center">
                                  <p className={cn("text-[15px] font-normal truncate group-hover:underline", isPlaying ? "text-[#1DB954]" : "text-white")}>{track.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                                    <p className="text-[#A1A1AA] text-xs truncate group-hover:text-white transition-colors shrink-0">{track.artist || 'Artista Desconhecido'}</p>
                                    {track.genre && <span className="text-[10px] bg-white/10 text-[#A1A1AA] px-1.5 py-0.5 rounded shrink-0">{track.genre}</span>}
                                    {track.tags && track.tags.slice(0,2).map(tag => (
                                      <span key={tag} className="text-[10px] bg-[#1DB954]/20 text-[#1DB954] px-1.5 py-0.5 rounded shrink-0">#{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="hidden md:flex items-center text-[13px] text-[#A1A1AA] truncate group-hover:text-white transition-colors">Acervo</div>
                              <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); openEditModal(track); }} className="text-[#A1A1AA] hover:text-white" title="Editar"><Edit3 className="size-4" /></button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* PLAYLIST / LIKED VIEW */}
          {(activeView === 'playlist' || activeView === 'liked') && (
            <div className="flex flex-col min-h-full pb-8">
              {(() => {
                const isLiked = activeView === 'liked';
                const title = isLiked ? 'Músicas Curtidas' : activePlaylist?.title;
                const coverUrl = isLiked ? 'https://misc.scdn.co/liked-songs/liked-songs-300.png' : activePlaylist?.cover_url;
                const tracks = isLiked ? standaloneTracks : (activePlaylist?.tracks || []);
                const gradientFrom = isLiked ? 'from-[#4F378B]' : 'from-[#535353]';

                return (
                  <>
                    <div className={`relative flex items-end px-6 md:px-8 pb-6 pt-24 bg-gradient-to-b ${gradientFrom} to-[#121212] transition-colors duration-500`}>
                      <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-6 w-full">
                        <div className="w-48 h-48 md:w-60 md:h-60 shrink-0 shadow-[0_4px_60px_rgba(0,0,0,0.5)] group bg-[#282828]">
                           {coverUrl ? <img src={coverUrl} alt={title} className="w-full h-full object-cover shadow-2xl" /> : <div className="w-full h-full flex items-center justify-center bg-[#282828]"><ListMusic className="size-16 text-[#B3B3B3]" /></div>}
                        </div>
                        <div className="flex flex-col gap-2 flex-1 mt-4 md:mt-0">
                           <span className="text-sm font-bold text-white uppercase tracking-wider">{isLiked ? 'Playlist' : 'Playlist Pública'}</span>
                           <h1 className="text-5xl md:text-[80px] font-black text-white tracking-tighter leading-none mb-2">{title}</h1>
                           <div className="flex items-center gap-1.5 mt-2 text-sm text-white font-bold">
                             <div className="size-6 rounded-full overflow-hidden bg-white/20"><img src="https://avatars.githubusercontent.com/u/1?v=4" alt="Bruno" className="w-full h-full object-cover" /></div>
                             <span className="hover:underline cursor-pointer">Bruno Abreu</span>
                             <span className="text-[#B3B3B3] font-normal">• {tracks.length} músicas</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 md:px-8 py-6 flex items-center gap-6 bg-gradient-to-b from-black/20 to-[#121212] relative z-10">
                      <button onClick={() => playCollection(tracks)} className="size-14 bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 transition-all text-black rounded-full flex items-center justify-center shadow-lg">
                        <Play className="size-6 ml-1" fill="currentColor" />
                      </button>
                      <button onClick={() => handleShufflePlay(tracks)} className="size-10 flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors" title="Ordem Aleatória">
                        <Shuffle className="size-6" />
                      </button>
                      <button onClick={() => setIsAddingTrack(!isAddingTrack)} className="flex items-center gap-2 px-4 py-2 bg-transparent text-white border border-white/30 rounded-full hover:border-white hover:scale-105 transition-all text-sm font-bold ml-4">
                        <Plus className="size-4" />
                        Adicionar Música
                      </button>
                      
                      {!isLiked && activePlaylist && (
                        <>
                          <button onClick={() => openEditPlaylistModal()} className="p-2 text-[#A1A1AA] hover:text-white transition-colors ml-auto border border-transparent hover:border-white/20 rounded-lg" title="Editar Playlist">
                            <Edit className="size-5" />
                          </button>
                          <button onClick={() => { removePlaylist(activePlaylist.id); setActiveView('home'); setActivePlaylistId(null); }} className="p-2 text-[#A1A1AA] hover:text-rose-500 transition-colors border border-transparent hover:border-white/20 rounded-lg" title="Excluir Playlist">
                            <Trash2 className="size-5" />
                          </button>
                        </>
                      )}
                    </div>

                    {isAddingTrack && (
                      <div className="px-6 md:px-8 mb-8">
                        <div className="bg-white/10 p-6 rounded-xl max-w-2xl border border-white/10 shadow-xl">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold text-lg">Adicionar Música</h3>
                            {!isLiked && (
                              <div className="flex items-center bg-black/50 rounded-lg p-1">
                                <button 
                                  onClick={() => setTrackAddMode('new')} 
                                  className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-colors", trackAddMode === 'new' ? "bg-white/20 text-white" : "text-[#B3B3B3] hover:text-white")}
                                >
                                  Novo Link YouTube
                                </button>
                                <button 
                                  onClick={() => setTrackAddMode('library')} 
                                  className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-colors", trackAddMode === 'library' ? "bg-white/20 text-white" : "text-[#B3B3B3] hover:text-white")}
                                >
                                  Puxar da Biblioteca
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {trackAddMode === 'new' || isLiked ? (
                            <>
                              <p className="text-[#A1A1AA] text-sm mb-4">Cole o link de qualquer vídeo ou música do YouTube abaixo para adicionar à sua biblioteca.</p>
                              <form onSubmit={handleAddTrack} className="flex flex-col gap-3">
                                <div className="flex flex-col md:flex-row gap-3">
                                  <input 
                                    type="text" required
                                    placeholder="Nome da Música"
                                    value={newTrackTitle} onChange={e => setNewTrackTitle(e.target.value)}
                                    className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                                  />
                                  <input 
                                    type="text" required
                                    placeholder="Cantor/Artista"
                                    list="artist-suggestions"
                                    value={newTrackArtist} onChange={e => setNewTrackArtist(e.target.value)}
                                    className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                                  />
                                  <input 
                                    type="url" required
                                    placeholder="Link do YouTube (https://...)"
                                    value={newTrackUrl} onChange={e => setNewTrackUrl(e.target.value)}
                                    className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                                  />
                                </div>
                                <div className="flex flex-col md:flex-row gap-3 mt-1">
                                  <input 
                                    type="text"
                                    placeholder="Gênero (ex: Pop, Rock)"
                                    list="genre-suggestions"
                                    value={newTrackGenre} onChange={e => setNewTrackGenre(e.target.value)}
                                    className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                                  />
                                  <input 
                                    type="text"
                                    placeholder="Tags (separadas por vírgula)"
                                    list="tag-suggestions"
                                    value={newTrackTags} onChange={e => setNewTrackTags(e.target.value)}
                                    className="flex-1 bg-black border border-white/20 focus:border-white rounded-md py-3 px-4 text-sm text-white focus:outline-none"
                                  />
                                </div>
                                <div className="flex justify-end mt-2">
                                  <button type="submit" className="px-8 py-3 bg-[#1DB954] text-black font-bold text-sm rounded-full hover:bg-[#1ed760] transition-colors">
                                    Salvar Música
                                  </button>
                                </div>
                              </form>
                            </>
                          ) : (
                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                              {standaloneTracks.length === 0 ? (
                                <p className="text-[#A1A1AA] text-sm text-center py-8 italic">Sua biblioteca (Músicas Curtidas) está vazia.</p>
                              ) : (
                                standaloneTracks.map(track => {
                                  // Verify if track is already in this playlist
                                  const alreadyIn = activePlaylist?.tracks.some(t => t.url === track.url);
                                  return (
                                    <div key={track.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-md group">
                                      <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="size-10 bg-black shrink-0 overflow-hidden rounded">
                                          <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="truncate flex flex-col justify-center">
                                          <p className="text-white text-sm font-normal truncate">{track.title}</p>
                                          <p className="text-[#A1A1AA] text-xs mt-0.5 truncate">{track.artist || 'Artista Desconhecido'}</p>
                                        </div>
                                      </div>
                                      {alreadyIn ? (
                                        <span className="text-xs font-bold text-[#A1A1AA] uppercase px-3">Adicionada</span>
                                      ) : (
                                        <button 
                                          onClick={() => activePlaylistId && addTrack(activePlaylistId, track)} 
                                          className="px-4 py-1.5 bg-transparent border border-white/20 text-white font-bold text-xs rounded-full hover:border-white transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                          Adicionar
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="px-6 md:px-8">
                      <div className="grid grid-cols-[16px_1fr_40px] md:grid-cols-[16px_4fr_2fr_40px] gap-4 px-4 py-2 border-b border-white/10 text-[#A1A1AA] text-[13px] font-medium tracking-widest mb-4">
                        <div className="text-center">#</div>
                        <div>Título</div>
                        <div className="hidden md:flex items-center gap-1">Álbum</div>
                        <div className="flex items-center justify-center"><Clock className="size-4" /></div>
                      </div>

                      <div className="flex flex-col gap-1">
                        {tracks.length === 0 ? (
                          <div className="py-12 text-center text-[#A1A1AA] italic">Nenhuma faixa encontrada.</div>
                        ) : (
                          tracks.map((track, idx) => {
                            const isPlaying = nowPlayingUrl === track.url;
                            return (
                              <div key={track.id} onDoubleClick={() => playTrack(track, tracks, idx)} className="grid grid-cols-[16px_1fr_40px] md:grid-cols-[16px_4fr_2fr_40px] gap-4 px-4 py-2 hover:bg-white/10 rounded-md group transition-colors items-center cursor-pointer">
                                <div className={cn("text-sm text-center relative font-medium group-hover:text-white", isPlaying ? "text-[#1DB954]" : "text-[#A1A1AA]")}>
                                  <span className="group-hover:opacity-0">{isPlaying ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="animate-pulse mx-auto"><rect x="2" y="10" width="4" height="14"/><rect x="10" y="2" width="4" height="22"/><rect x="18" y="14" width="4" height="10"/></svg> : idx + 1}</span>
                                  <button onClick={(e) => { e.stopPropagation(); playTrack(track, tracks, idx); }} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white">
                                    <Play className="size-4" fill="currentColor" />
                                  </button>
                                </div>
                                
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="size-10 bg-black shrink-0 overflow-hidden rounded">
                                    <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="truncate flex flex-col justify-center">
                                    <p className={cn("text-[15px] font-normal truncate group-hover:underline", isPlaying ? "text-[#1DB954]" : "text-white")}>{track.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                                      <p className="text-[#A1A1AA] text-xs truncate group-hover:text-white transition-colors shrink-0">{track.artist || 'Artista Desconhecido'}</p>
                                      {track.genre && <span className="text-[10px] bg-white/10 text-[#A1A1AA] px-1.5 py-0.5 rounded shrink-0">{track.genre}</span>}
                                      {track.tags && track.tags.slice(0,2).map(tag => (
                                        <span key={tag} className="text-[10px] bg-[#1DB954]/20 text-[#1DB954] px-1.5 py-0.5 rounded shrink-0">#{tag}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="hidden md:flex items-center text-[13px] text-[#A1A1AA] truncate group-hover:text-white transition-colors">
                                  Single
                                </div>
                                
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!isLiked && (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); handleMoveTrack(track.id, 'up'); }} className="text-[#A1A1AA] hover:text-white" title="Mover para cima"><ChevronUp className="size-4" /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleMoveTrack(track.id, 'down'); }} className="text-[#A1A1AA] hover:text-white" title="Mover para baixo"><ChevronDown className="size-4" /></button>
                                    </>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); openEditModal(track); }} className="text-[#A1A1AA] hover:text-white ml-2"><Edit3 className="size-4" /></button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); isLiked ? removeStandaloneTrack(track.id) : activePlaylistId && removeTrack(activePlaylistId, track.id) }}
                                    className="text-[#A1A1AA] hover:text-rose-500"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      {/* Modal Criar Playlist */}
      {isAddingPlaylist && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsAddingPlaylist(false)}>
          <div className="bg-[#282828] rounded-xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-6">Nova Playlist</h3>
            <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-4">
              <input 
                type="text" required placeholder="Nome"
                value={newPlaylistTitle} onChange={e => setNewPlaylistTitle(e.target.value)}
                className="w-full bg-[#3E3E3E] rounded-md p-3 text-sm text-white focus:outline-none"
              />
              <div className="flex gap-4 mt-4 justify-end">
                <button type="button" onClick={() => setIsAddingPlaylist(false)} className="px-6 py-2 bg-transparent text-white font-bold rounded-full">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-[#1DB954] text-black font-bold rounded-full">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Música */}
      {trackBeingEdited && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setTrackBeingEdited(null)}>
          <div className="bg-[#282828] rounded-xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-6">Editar Música</h3>
            <form onSubmit={handleUpdateTrack} className="flex flex-col gap-4">
              <input 
                type="text" required placeholder="Nome da Música"
                value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="w-full bg-[#3E3E3E] rounded-md p-3 text-sm text-white focus:outline-none"
              />
              <input 
                type="text" required placeholder="Cantor/Artista"
                list="artist-suggestions"
                value={editArtist} onChange={e => setEditArtist(e.target.value)}
                className="w-full bg-[#3E3E3E] rounded-md p-3 text-sm text-white focus:outline-none"
              />
              <input 
                type="url" required placeholder="URL do YouTube"
                value={editUrl} onChange={e => setEditUrl(e.target.value)}
                className="w-full bg-[#3E3E3E] rounded-md p-3 text-sm text-white focus:outline-none"
              />
              <input 
                type="text" placeholder="Gênero (ex: Pop, Rock)"
                list="genre-suggestions"
                value={editGenre} onChange={e => setEditGenre(e.target.value)}
                className="w-full bg-[#3E3E3E] rounded-md p-3 text-sm text-white focus:outline-none"
              />
              <input 
                type="text" placeholder="Tags (separadas por vírgula)"
                list="tag-suggestions"
                value={editTags} onChange={e => setEditTags(e.target.value)}
                className="w-full bg-[#3E3E3E] rounded-md p-3 text-sm text-white focus:outline-none"
              />
              <div className="flex gap-4 mt-4 justify-end">
                <button type="button" onClick={() => setTrackBeingEdited(null)} className="px-6 py-2 bg-transparent text-white font-bold rounded-full">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-[#1DB954] text-black font-bold rounded-full">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Playlist */}
      {playlistBeingEdited && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setPlaylistBeingEdited(null)}>
          <div className="bg-[#282828] rounded-xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-6">Editar Detalhes da Playlist</h3>
            <form onSubmit={handleEditPlaylistSubmit} className="flex flex-col gap-4">
              <input 
                type="text" required placeholder="Nome da Playlist"
                value={editPlaylistTitleInput} onChange={e => setEditPlaylistTitleInput(e.target.value)}
                className="w-full bg-[#3E3E3E] rounded-md p-3 text-sm text-white focus:outline-none"
              />
              <textarea 
                placeholder="Adicione uma descrição opcional"
                value={editPlaylistDescInput} onChange={e => setEditPlaylistDescInput(e.target.value)}
                className="w-full bg-[#3E3E3E] rounded-md p-3 text-sm text-white focus:outline-none resize-none h-24"
              />
              <input 
                type="url" placeholder="URL de Capa Personalizada (opcional)"
                value={editPlaylistCoverInput} onChange={e => setEditPlaylistCoverInput(e.target.value)}
                className="w-full bg-[#3E3E3E] rounded-md p-3 text-sm text-white focus:outline-none"
              />
              <div className="flex gap-4 mt-4 justify-end">
                <button type="button" onClick={() => setPlaylistBeingEdited(null)} className="px-6 py-2 bg-transparent text-white font-bold rounded-full">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-[#1DB954] text-black font-bold rounded-full">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
