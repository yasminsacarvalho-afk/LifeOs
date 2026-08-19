import re

file_path = "/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/PosStudies.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "const globalContents = courses.filter(c => c.category === 'Conteúdo');"

import sys
lines = content.split('\n')

start_idx = -1
for i, line in enumerate(lines):
    if start_marker in line:
        start_idx = i - 1
        break

if start_idx != -1:
    end_idx = -1
    depth = 0
    # Find matching </details> or the end of the block
    for i in range(start_idx, len(lines)):
        if "})()}" in lines[i]:
            end_idx = i + 1
            break

    if end_idx != -1:
        new_code = """                                                    {(() => {
                                                       const globalContents = courses.filter(c => c.category === 'Conteúdo');
                                                       if (globalContents.length === 0) {
                                                           return <div className="text-[10px] text-[#71717A] text-center p-3">Nenhum vídeo cadastrado na categoria Conteúdo.</div>;
                                                       }
                                                       return (
                                                         <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                                           {globalContents.map(c => {
                                                              let vidUrl = c.course_url;
                                                              if (!vidUrl) {
                                                                  try {
                                                                      const p = JSON.parse(c.description || '{}');
                                                                      if (p.youtube_channels && p.youtube_channels[0] && p.youtube_channels[0].videos[0]) {
                                                                          vidUrl = p.youtube_channels[0].videos[0].url;
                                                                      }
                                                                  } catch(e) {}
                                                              }
                                                              const thumb = c.cover_url || (vidUrl ? getThumbnail(vidUrl) : null);
                                                              
                                                              return (
                                                              <div key={c.id} className="flex items-center justify-between p-2.5 bg-[#0A0A0C]/50 border border-[rgba(255,255,255,0.03)] rounded-xl group hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all shadow-inner">
                                                                <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer" onClick={() => {
                                                                   if (vidUrl) {
                                                                       setActiveTopicVideos(prev => prev.some(v => v.url === vidUrl) ? prev : [...prev, { refType: 'video', url: vidUrl, title: c.title }]);
                                                                   } else {
                                                                       toast.error("Nenhum link de vídeo encontrado neste conteúdo.");
                                                                   }
                                                                }}>
                                                                  {thumb ? (
                                                                     <div className="w-12 h-8 rounded shrink-0 bg-[#27272A] overflow-hidden border border-white/5 relative">
                                                                       <img src={thumb} alt="thumb" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                                       <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                                                           <Play className="size-3 text-white shadow-sm opacity-80 group-hover:scale-110 transition-transform" />
                                                                       </div>
                                                                     </div>
                                                                  ) : (
                                                                     <div className="w-8 h-8 rounded-lg shrink-0 bg-[#111113] flex items-center justify-center border border-cyan-500/20 shadow-inner group-hover:bg-cyan-500/10 transition-colors">
                                                                       <Play className="size-3.5 text-cyan-400" />
                                                                     </div>
                                                                  )}
                                                                  <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{c.title}</span>
                                                                    <span className="text-[9px] text-[#A1A1AA] mt-0.5 line-clamp-1">{c.instructor || 'Conteúdo'}</span>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                           )})}
                                                         </div>
                                                       );
                                                    })()}"""
        
        lines = lines[:start_idx] + new_code.split('\n') + lines[end_idx:]
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write('\n'.join(lines))
        print("Thumbnail code applied.")
    else:
        print("End block not found.")
else:
    print("Start marker not found.")
