with open("src/components/pos/PosStudies.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

insert_idx = -1
for i, line in enumerate(lines):
    if 'courseTab === "Diário de Bordo"' in line:
        insert_idx = i
        break

if insert_idx != -1:
    music_jsx = """
             {courseTab === "Músicas" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Headphones className="size-4 text-emerald-500" /> Suas Playlists
                    </h4>
                    <button onClick={() => setIsAddingMusicPlaylist(!isAddingMusicPlaylist)} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
                      <Plus className="size-3" /> Adicionar Playlist
                    </button>
                  </div>
                  
                  {isAddingMusicPlaylist && (
                    <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] p-4 rounded-xl flex flex-col sm:flex-row gap-4 animate-in fade-in mb-4">
                      <input 
                        type="text" placeholder="Nome da Playlist (Ex: Lo-Fi Study)"
                        value={newMusicPlaylist.name} onChange={e => setNewMusicPlaylist({...newMusicPlaylist, name: e.target.value})}
                        className="flex-1 bg-[#0A0A0C] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                      <input 
                        type="url" placeholder="Capa URL (Opcional)"
                        value={newMusicPlaylist.cover_url} onChange={e => setNewMusicPlaylist({...newMusicPlaylist, cover_url: e.target.value})}
                        className="flex-1 bg-[#0A0A0C] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                      <button onClick={() => {
                        if (!newMusicPlaylist.name) return;
                        let s: any = {};
                        try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                        if (!s.music_playlists) s.music_playlists = [];
                        s.music_playlists.push({ id: Date.now().toString(), name: newMusicPlaylist.name, cover_url: newMusicPlaylist.cover_url, musics: [] });
                        updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                        setNewMusicPlaylist({ name: '', cover_url: '' });
                        setIsAddingMusicPlaylist(false);
                      }} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors w-full sm:w-auto">
                        Salvar
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    {(() => {
                      let playlists: any[] = [];
                      try { playlists = JSON.parse(selectedCourse.description || '{}').music_playlists || []; } catch(e){}
                      
                      if (playlists.length === 0 && !isAddingMusicPlaylist) {
                        return <div className="p-8 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl text-[#A1A1AA] text-sm bg-[#1A1A1E]">Nenhuma playlist adicionada. Crie playlists com links do YouTube para estudar com foco.</div>;
                      }

                      return playlists.map((pl, idx) => (
                        <div key={pl.id || idx} className={cn("bg-[#1A1A1E] border rounded-xl overflow-hidden transition-all duration-300", expandedMusicPlaylistId === (pl.id || idx) ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "border-[rgba(255,255,255,0.06)]")}>
                           <div 
                             onClick={() => setExpandedMusicPlaylistId(expandedMusicPlaylistId === (pl.id || idx) ? null : (pl.id || idx))}
                             className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                           >
                             <div className="flex items-center gap-3">
                               {pl.cover_url ? (
                                 <img src={pl.cover_url} alt={pl.name} className="w-10 h-10 rounded-lg object-cover" />
                               ) : (
                                 <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Music className="size-4 text-[#A1A1AA]" /></div>
                               )}
                               <div>
                                 <span className="font-bold text-white block">{pl.name}</span>
                                 <span className="text-[10px] text-[#A1A1AA]">{pl.musics?.length || 0} faixas</span>
                               </div>
                             </div>
                             <div className="flex items-center gap-2">
                               <button onClick={(e) => {
                                 e.stopPropagation();
                                 setIsAddingTrackToPlaylist(pl.id || idx);
                                 setExpandedMusicPlaylistId(pl.id || idx);
                               }} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-colors">
                                 + Música
                               </button>
                               <button onClick={(e) => {
                                 e.stopPropagation();
                                 if(confirm("Excluir esta playlist e todas as músicas dela?")) {
                                   let s: any = {};
                                   try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                   if (s.music_playlists) {
                                     s.music_playlists = s.music_playlists.filter((_:any, i:number) => i !== idx);
                                     updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                                   }
                                 }
                               }} className="p-2 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-colors">
                                 <Trash2 className="size-4" />
                               </button>
                               <ChevronDown className={cn("size-4 text-[#71717A] transition-transform", expandedMusicPlaylistId === (pl.id || idx) && "rotate-180")} />
                             </div>
                           </div>

                           {/* Conteúdo da Playlist */}
                           <div className={cn("grid transition-all duration-300", expandedMusicPlaylistId === (pl.id || idx) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                             <div className="overflow-hidden">
                               <div className="p-4 pt-0 border-t border-[rgba(255,255,255,0.06)] mt-2">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                                   
                                   {isAddingTrackToPlaylist === (pl.id || idx) && (
                                     <div className="col-span-full bg-[#111113] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row gap-3">
                                       <input type="text" placeholder="Título da Música" value={newTrackTitle} onChange={e => setNewTrackTitle(e.target.value)} className="flex-1 bg-[#0A0A0C] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                                       <input type="url" placeholder="URL (YouTube)" value={newTrackUrl} onChange={e => {
                                         setNewTrackUrl(e.target.value);
                                         if (!newTrackTitle && e.target.value) {
                                            // set a dummy title
                                         }
                                       }} className="flex-1 bg-[#0A0A0C] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                                       <button onClick={() => {
                                         if (!newTrackTitle || !newTrackUrl) return;
                                         let s: any = {};
                                         try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                         if (s.music_playlists && s.music_playlists[idx]) {
                                           if (!s.music_playlists[idx].musics) s.music_playlists[idx].musics = [];
                                           const autoThumb = getYouTubeThumbnail(newTrackUrl);
                                           s.music_playlists[idx].musics.push({ id: Date.now().toString(), title: newTrackTitle, url: newTrackUrl, cover_url: autoThumb || '' });
                                           updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                                           setNewTrackTitle(''); setNewTrackUrl(''); setIsAddingTrackToPlaylist(null);
                                         }
                                       }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors w-full sm:w-auto">Salvar</button>
                                     </div>
                                   )}

                                   {pl.musics?.map((trk: any, tIdx: number) => {
                                     const cover = trk.cover_url || getYouTubeThumbnail(trk.url);
                                     return (
                                       <div key={trk.id || tIdx} className="group relative bg-[#0A0A0C] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] transition-colors flex flex-col">
                                         <div className="relative aspect-video w-full bg-[#111113] cursor-pointer" onClick={() => {
                                            // Play using activeVideotecaVideos logic, since it already plays YouTube URLs in a modal!
                                            setActiveVideotecaVideos([{...trk, channelName: pl.name, channelIdx: idx, videoIdx: tIdx}]);
                                         }}>
                                           {cover ? (
                                             <img src={cover} alt={trk.title} className="w-full h-full object-cover" />
                                           ) : (
                                             <div className="w-full h-full flex items-center justify-center"><Headphones className="size-6 text-[#A1A1AA]" /></div>
                                           )}
                                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                             <div className="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                               <Play className="size-4 ml-1" fill="currentColor" />
                                             </div>
                                           </div>
                                         </div>
                                         <div className="p-3 flex items-start justify-between gap-2">
                                           <span className="text-xs font-bold text-white line-clamp-2 pr-2">{trk.title}</span>
                                           <div className="flex flex-col gap-2 shrink-0">
                                             <button onClick={() => {
                                               let s: any = {};
                                               try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                               if (s.music_playlists && s.music_playlists[idx] && s.music_playlists[idx].musics) {
                                                 const newTitle = prompt("Renomear Música:", trk.title);
                                                 if (newTitle && newTitle.trim() !== '') {
                                                   s.music_playlists[idx].musics[tIdx].title = newTitle.trim();
                                                   updateCourse(selectedCourse.id, { description: JSON.stringify(s) }, false);
                                                 }
                                               }
                                             }} className="text-[#A1A1AA] hover:text-white transition-colors" title="Renomear">
                                               <Edit2 className="size-3.5" />
                                             </button>
                                             <button onClick={() => {
                                               let s: any = {};
                                               try { s = JSON.parse(selectedCourse.description || '{}'); } catch(e){}
                                               if (s.music_playlists && s.music_playlists[idx] && s.music_playlists[idx].musics) {
                                                 s.music_playlists[idx].musics = s.music_playlists[idx].musics.filter((_:any, i:number) => i !== tIdx);
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
                                   {(!pl.musics || pl.musics.length === 0) && (
                                     <div className="col-span-full py-4 text-center text-[10px] text-[#71717A] uppercase font-bold tracking-widest">Nenhuma música salva nesta playlist.</div>
                                   )}
                                 </div>
                               </div>
                             </div>
                           </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
             )}
\n"""
    lines.insert(insert_idx, music_jsx)
    with open("src/components/pos/PosStudies.tsx", "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Injected successfully at line", insert_idx)
else:
    print("Failed")
