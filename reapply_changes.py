import re
import sys

file_path = "/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/PosStudies.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Branding text replacements
content = content.replace("Academia Operacional", "O Polimata")
content = content.replace("Ecossistema de Alta Performance", "Foco, Disciplina e Constancia")

# 2. Re-add the "Vídeos & Conteúdos" block
# We insert it BEFORE "Materiais Anexos"
# Let's find "Materiais Anexos"
block_to_insert = """                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
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
                                                    })()}
                                                  </div>
                                                </details>

                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                      <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                                        <FolderOpen className="size-3.5" />
                                                      </div>
                                                      Materiais Anexos"""

if "Vídeos & Conteúdos" not in content:
    content = content.replace("""                                                <details open className="group [&_summary::-webkit-details-marker]:hidden">
                                                  <summary className="text-[11px] text-[#A1A1AA] hover:text-white uppercase tracking-widest font-bold mb-3 flex items-center justify-between cursor-pointer list-none transition-colors group/summary bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                      <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 group-hover/summary:scale-110 transition-transform">
                                                        <FolderOpen className="size-3.5" />
                                                      </div>
                                                      Materiais Anexos""", block_to_insert)

# 3. Add allAvailableVideosForEditor
global_videos_code = """
  const allAvailableVideosForEditor = (() => {
    let combined = [...availableVideos];
    const globalContents = courses.filter(c => c.category === 'Conteúdo');
    globalContents.forEach(c => {
       let vidUrl = c.course_url;
       if (!vidUrl) {
           try {
               const p = JSON.parse(c.description || '{}');
               if (p.youtube_channels && p.youtube_channels[0] && p.youtube_channels[0].videos[0]) {
                   vidUrl = p.youtube_channels[0].videos[0].url;
               }
           } catch(e) {}
       }
       if (vidUrl && !combined.some(v => v.url === vidUrl)) {
           combined.push({ url: vidUrl, title: c.title, channelName: c.instructor || 'Conteúdo', refType: 'video' });
       }
    });
    return combined;
  })();
"""

if "allAvailableVideosForEditor" not in content:
    content = content.replace("    return vids;\n  })();", "    return vids;\n  })();\n" + global_videos_code)

# 4. Inject availableVideos={allAvailableVideosForEditor} into RichTextEditor
lines = content.split('\n')
for i in range(len(lines)):
    if "<RichTextEditor" in lines[i] or "<RichTextEditor " in lines[i] or "RichTextEditor" in lines[i]:
        pass # Wait, let's just do regex

content = re.sub(r'availableVideos=\{availableVideos\}', r'availableVideos={allAvailableVideosForEditor}', content)

# Check if there are RichTextEditor tags missing availableVideos and add it.
# There is one for 'videotecaNotes'
content = content.replace(
    'RichTextEditor content={videotecaNotes} onChange={setVideotecaNotes} placeholder="Escreva suas anotações aqui..." />',
    'RichTextEditor content={videotecaNotes} onChange={setVideotecaNotes} placeholder="Escreva suas anotações aqui..." availableVideos={allAvailableVideosForEditor} />'
)

# And for topics without availableVideos (the first RichTextEditor)
content = content.replace(
    '<RichTextEditor \n                      initialValue={selectedCourse.study_notes || ""}',
    '<RichTextEditor \n                      availableVideos={allAvailableVideosForEditor}\n                      initialValue={selectedCourse.study_notes || ""}'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

# 5. Patch RichTextEditor.tsx (rename "Videoteca" to "Vídeos & Conteúdos")
file_path_rte = "/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/RichTextEditor.tsx"
with open(file_path_rte, "r", encoding="utf-8") as f:
    content_rte = f.read()

content_rte = content_rte.replace("<Play className=\"size-3\"/> Videoteca", "<Play className=\"size-3\"/> Vídeos & Conteúdos")
with open(file_path_rte, "w", encoding="utf-8") as f:
    f.write(content_rte)

print("All changes reapplied successfully.")
