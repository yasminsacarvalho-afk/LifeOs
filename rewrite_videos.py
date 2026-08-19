import re

file_path = "/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/PosStudies.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "Vídeos & Conteúdos"
# We need to replace the entire <details> for Vídeos & Conteúdos

# Find the start of the details block
import sys

lines = content.split('\n')
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "Vídeos & Conteúdos" in line:
        # Go back to find the <details>
        for j in range(i, -1, -1):
            if "<details open" in lines[j]:
                start_idx = j
                break
        
        # Go forward to find the matching </details>
        depth = 0
        for j in range(start_idx, len(lines)):
            if "<details" in lines[j]:
                depth += 1
            if "</details>" in lines[j]:
                depth -= 1
                if depth == 0:
                    end_idx = j
                    break
        break

if start_idx != -1 and end_idx != -1:
    new_block = """                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                      <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                                        <Video className="size-3.5" />
                                                      </div>
                                                      Vídeos & Conteúdos
                                                    </div>
                                                    <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 text-[#71717A] group-hover/summary:text-white" />
                                                  </summary>
                                                  <div className="flex flex-col gap-2">
                                                    {(() => {
                                                       const globalContents = courses.filter(c => c.category === 'Conteúdo');
                                                       if (globalContents.length === 0) {
                                                           return <div className="text-[10px] text-[#71717A] text-center p-3">Nenhum vídeo cadastrado na categoria Conteúdo.</div>;
                                                       }
                                                       return (
                                                         <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                                           {globalContents.map(c => (
                                                             <div key={c.id} className="flex items-center justify-between p-2.5 bg-[#0A0A0C]/50 border border-[rgba(255,255,255,0.03)] rounded-xl group hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all shadow-inner">
                                                               <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer" onClick={() => {
                                                                  let vidUrl = c.course_url;
                                                                  if (!vidUrl) {
                                                                      try {
                                                                          const p = JSON.parse(c.description || '{}');
                                                                          if (p.youtube_channels && p.youtube_channels[0] && p.youtube_channels[0].videos[0]) {
                                                                              vidUrl = p.youtube_channels[0].videos[0].url;
                                                                          }
                                                                      } catch(e) {}
                                                                  }
                                                                  if (vidUrl) {
                                                                      setActiveTopicVideos(prev => prev.some(v => v.url === vidUrl) ? prev : [...prev, { refType: 'video', url: vidUrl, title: c.title }]);
                                                                  } else {
                                                                      toast.error("Nenhum link de vídeo encontrado neste conteúdo.");
                                                                  }
                                                               }}>
                                                                 <div className="w-8 h-8 rounded-lg shrink-0 bg-[#111113] flex items-center justify-center border border-cyan-500/20 shadow-inner group-hover:bg-cyan-500/10 transition-colors">
                                                                   <Play className="size-3.5 text-cyan-400" />
                                                                 </div>
                                                                 <div className="flex flex-col">
                                                                   <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{c.title}</span>
                                                                   <span className="text-[9px] text-[#A1A1AA] mt-0.5 line-clamp-1">{c.instructor || 'Global'}</span>
                                                                 </div>
                                                               </div>
                                                             </div>
                                                           ))}
                                                         </div>
                                                       );
                                                    })()}
                                                  </div>
                                                </details>"""
    
    # Replace the lines
    lines = lines[:start_idx] + new_block.split('\n') + lines[end_idx+1:]
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write('\n'.join(lines))
    print("Successfully replaced.")
else:
    print("Could not find the block.")
