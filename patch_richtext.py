import re

file_path = "/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/PosStudies.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to find where RichTextEditor is called at line 3658 and 2292
import sys
lines = content.split('\n')

# First, insert a memoized global videos list near the top of the component
# We can do this right after `const availableVideos = (() => { ... })();`

start_idx = -1
for i, line in enumerate(lines):
    if "const availableVideos = (() => {" in line:
        # Find the end of this block
        depth = 0
        for j in range(i, len(lines)):
            if "{" in lines[j]: depth += 1
            if "}" in lines[j]:
                depth -= 1
                if depth == 0 and "})();" in lines[j]:
                    start_idx = j
                    break
        break

if start_idx != -1:
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
       if (vidUrl) {
           // check if already exists to prevent duplicates
           if (!combined.some(v => v.url === vidUrl)) {
               combined.push({ url: vidUrl, title: c.title, channelName: c.instructor || 'Conteúdo', refType: 'video' });
           }
       }
    });
    return combined;
  })();
"""
    lines.insert(start_idx + 1, global_videos_code)
    
    # Now replace availableVideos={availableVideos} with availableVideos={allAvailableVideosForEditor}
    # But only inside RichTextEditor tags
    for i in range(len(lines)):
        if "availableVideos={availableVideos}" in lines[i]:
            lines[i] = lines[i].replace("availableVideos={availableVideos}", "availableVideos={allAvailableVideosForEditor}")
            
    with open(file_path, "w", encoding="utf-8") as f:
        f.write('\n'.join(lines))
    print("Patched PosStudies.tsx")
else:
    print("Could not find availableVideos block")

# Now let's patch RichTextEditor.tsx to rename the tab
file_path_rte = "/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/RichTextEditor.tsx"
with open(file_path_rte, "r", encoding="utf-8") as f:
    content_rte = f.read()

content_rte = content_rte.replace("<Play className=\"size-3\"/> Videoteca", "<Play className=\"size-3\"/> Vídeos & Conteúdos")
with open(file_path_rte, "w", encoding="utf-8") as f:
    f.write(content_rte)
print("Patched RichTextEditor.tsx")

