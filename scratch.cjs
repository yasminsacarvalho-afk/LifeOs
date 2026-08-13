const fs = require('fs');
const file = '/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/PosStudies.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove layout toggle
content = content.replace(
    /\{\/\* LAYOUT TOGGLE \*\/\}\s*<button onClick=\{\(\) => setWorkspaceLayoutMode[^>]+>\s*\{workspaceLayoutMode[^}]+\}\s*<\/button>/g,
    ''
);

// Outer PanelGroup
content = content.replace(
    /<PanelGroup direction=\{workspaceLayoutMode\} className="flex-1 min-h-0 w-full pb-6">/g,
    '<div className="flex-1 min-h-0 w-full pb-6 flex flex-col lg:flex-row gap-6">'
);

// Inner PanelGroup
content = content.replace(
    /<PanelGroup direction="horizontal" className="h-full min-h-\[300px\]">/g,
    '<div className="flex flex-col md:flex-row w-full gap-4 overflow-x-auto min-h-[300px] pb-2">'
);

// Panels
content = content.replace(
    /<Panel defaultSize=\{70\} minSize=\{30\} className="flex flex-col relative h-full gap-4 overflow-y-auto custom-scrollbar pr-2">/g,
    '<div className="flex-1 flex flex-col relative h-full gap-4 overflow-y-auto custom-scrollbar pr-2">'
);

content = content.replace(
    /<Panel minSize=\{20\} className="rounded-xl overflow-hidden bg-black border border-white\/5 shadow-inner flex flex-col animate-in fade-in zoom-in-95 duration-300">/g,
    '<div className="flex-1 rounded-xl overflow-hidden bg-black border border-white/5 shadow-inner flex flex-col animate-in fade-in zoom-in-95 duration-300 min-w-[300px]">'
);

content = content.replace(
    /<Panel defaultSize=\{30\} minSize=\{20\} className="space-y-6 bg-black\/20 p-5 rounded-3xl border border-white\/5 overflow-y-auto custom-scrollbar">/g,
    '<div className="w-full lg:w-[350px] shrink-0 space-y-6 bg-black/20 p-5 rounded-3xl border border-white/5 overflow-y-auto custom-scrollbar">'
);

// Replace Panel closing tags with div closing tags
// BUT ONLY within the modal logic. Actually, are there other PanelGroups in PosStudies.tsx?
// Let's check by regex counting:
const panelGroupCount = (content.match(/<\/PanelGroup>/g) || []).length;
console.log("Found </PanelGroup> count:", panelGroupCount);
if (panelGroupCount > 0) {
    content = content.replace(/<\/PanelGroup>/g, '</div>');
}

const panelCount = (content.match(/<\/Panel>/g) || []).length;
console.log("Found </Panel> count:", panelCount);
if (panelCount > 0) {
    content = content.replace(/<\/Panel>/g, '</div>');
}

// Remove PanelResizeHandle
content = content.replace(/<PanelResizeHandle[^>]+>/g, '');

// Remove Fragment wrappers that we used for PanelResizeHandle inside the loop
// <Fragment key={idx}> -> <div key={idx} className="flex-1 flex"> or just we don't need the Fragment anymore, we can put the key on the inner div
content = content.replace(
    /<Fragment key=\{idx\}>/g,
    ''
);
content = content.replace(
    /<\/Fragment>/g,
    ''
);
// But wait! If we remove Fragment, we need to add `key={idx}` to the div that replaced the inner Panel.
content = content.replace(
    /<div className="flex-1 rounded-xl overflow-hidden bg-black border border-white\/5 shadow-inner flex flex-col animate-in fade-in zoom-in-95 duration-300 min-w-\[300px\]">/g,
    '<div key={`video-${idx}`} className="flex-1 rounded-xl overflow-hidden bg-black border border-white/5 shadow-inner flex flex-col animate-in fade-in zoom-in-95 duration-300 min-w-[300px]">'
);

fs.writeFileSync(file, content);
console.log('Modified successfully.');
