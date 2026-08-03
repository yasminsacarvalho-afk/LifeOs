import { PosBook } from "@/hooks/use-pos-library";
import { Cloud, Search, MoreHorizontal, Heart, X, BookOpen, FileText, ChevronDown } from "lucide-react";
import { useState } from "react";
import { DriveCover } from "./PosLibraryMetrics";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  files: any[];
  books: PosBook[];
  onClose: () => void;
  onOpenBook?: (id: string) => void;
  onRegisterBook?: (f: any, coverUrl?: string, author?: string) => void;
  isEpub: boolean;
}

export function PosSkeuomorphicLibrary({ title, files, books, onClose, onOpenBook, onRegisterBook, isEpub }: Props) {
  const [search, setSearch] = useState("");
  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  
  const totalBytes = filtered.reduce((acc, f) => acc + (f.size || 0), 0);
  const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#1a0f0a] flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-500">
      {/* Blurred background bookshelf */}
      <div className="absolute inset-0 opacity-30 blur-md pointer-events-none" style={{
         backgroundImage: 'url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop")',
         backgroundSize: 'cover',
         backgroundPosition: 'center'
      }}></div>

      {/* Main Furniture */}
      <div className="relative w-full max-w-7xl h-full max-h-[90vh] rounded-[28px] bg-[#3a2418] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1)] border-[4px] border-[#2d1b11] flex flex-col overflow-hidden">
         {/* Top Bar (Wood) */}
         <div className="h-[95px] md:h-[110px] shrink-0 bg-gradient-to-b from-[#4a2e1d] to-[#3a2418] border-b border-[#2d1b11] flex items-center px-6 relative shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-20">
            {/* Lamps */}
            <div className="absolute top-0 left-[20%] w-16 h-6 bg-gradient-to-b from-[#B67A4A] to-[#8A4A24] rounded-b-full shadow-[0_40px_50px_rgba(255,223,168,0.4)] z-20 flex justify-center">
              <div className="w-8 h-2 bg-[#FFDFA8] mt-4 rounded-full blur-[2px] opacity-80"></div>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-6 bg-gradient-to-b from-[#B67A4A] to-[#8A4A24] rounded-b-full shadow-[0_40px_50px_rgba(255,223,168,0.4)] z-20 flex justify-center">
              <div className="w-8 h-2 bg-[#FFDFA8] mt-4 rounded-full blur-[2px] opacity-80"></div>
            </div>
            <div className="absolute top-0 right-[20%] w-16 h-6 bg-gradient-to-b from-[#B67A4A] to-[#8A4A24] rounded-b-full shadow-[0_40px_50px_rgba(255,223,168,0.4)] z-20 flex justify-center">
              <div className="w-8 h-2 bg-[#FFDFA8] mt-4 rounded-full blur-[2px] opacity-80"></div>
            </div>

            {/* Cloud Button */}
            <div className="size-12 rounded bg-gradient-to-br from-[#8b2323] to-[#5c1c1c] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),0_4px_8px_rgba(0,0,0,0.6)] border border-[#3a1111] flex items-center justify-center mr-4">
              <Cloud className="text-white size-6 drop-shadow-md" />
            </div>

            <div className="flex flex-col z-30">
               <h1 className="text-3xl md:text-4xl font-black text-[#1a0f0a]" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.05), -1px -1px 0px rgba(0,0,0,0.8)' }}>
                 {title}
               </h1>
               <div className="mt-1 bg-white/10 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] max-w-fit">
                 <span className="text-xs text-white/90">Visualize todos os seus arquivos sincronizados diretamente de suas pastas do Google Drive.</span>
               </div>
            </div>

            {/* MacOS Buttons */}
            <div className="absolute top-4 right-6 flex gap-2">
               <button onClick={onClose} className="size-4 rounded-md bg-red-500 shadow-[inset_0_2px_2px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.4)] border border-red-700 hover:brightness-110"></button>
               <button onClick={onClose} className="size-4 rounded-md bg-yellow-500 shadow-[inset_0_2px_2px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.4)] border border-yellow-700 hover:brightness-110"></button>
               <button onClick={onClose} className="size-4 rounded-md bg-green-500 shadow-[inset_0_2px_2px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.4)] border border-green-700 hover:brightness-110"></button>
            </div>
         </div>

         {/* Toolbar */}
         <div className="h-[80px] shrink-0 bg-[#3a2418] border-b-2 border-[#22130b] px-6 flex items-center gap-6 relative z-10 shadow-sm">
            {/* Search */}
            <div className="flex-1 max-w-2xl bg-white/10 backdrop-blur-md rounded border-t border-[#110905] border-b border-[rgba(255,255,255,0.1)] shadow-[inset_0_4px_6px_rgba(0,0,0,0.4)] h-[50px] flex items-center px-4">
               <Search className="size-5 text-[#8A6244] drop-shadow" />
               <input 
                 type="text" 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 placeholder="Digite para pesquisar..." 
                 className="bg-transparent border-none outline-none text-[#EBD8BF] ml-3 flex-1 placeholder:text-[#8A6244] font-bold text-sm" 
               />
               <div className="size-8 rounded-full bg-gradient-to-b from-[#B67A4A] to-[#8A4A24] border border-[#5c3722] shadow-[inset_0_2px_2px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,0,0,0.5)]"></div>
            </div>

            {/* Filter */}
            <div className="h-[50px] bg-gradient-to-b from-[#B67A4A] to-[#8A4A24] rounded border border-[#5c3722] px-4 flex items-center gap-3 shadow-[0_4px_6px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]">
               <div className="size-6 rounded-full bg-gradient-to-br from-[#d4a883] to-[#8A4A24] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] border border-[#5c3722]"></div>
               <span className="text-[#2d1b11] font-black text-sm tracking-wide" style={{ textShadow: '0px 1px 0px rgba(255,255,255,0.2)' }}>Sort by Title</span>
               <ChevronDown className="size-4 text-[#2d1b11] drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]" />
            </div>
         </div>

         {/* Books Grid */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#22130b] shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
               {filtered.map((f, i) => {
                  let fileId = "";
                  const match = f.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                  if (match) fileId = match[1];
                  const linkedBook = books.find(b => b.resource_link === f.url || (fileId && b.resource_link && b.resource_link.includes(fileId)));
                  
                  return (
                     <div key={f.url} className="bg-[#180d07] rounded-xl shadow-[inset_0_12px_24px_rgba(0,0,0,0.9),inset_0_-2px_4px_rgba(255,255,255,0.03)] border-t border-l border-r border-[#0a0502] border-b border-[#2d1b11] p-4 flex flex-col items-center h-[340px] relative group overflow-visible">
                        
                        {/* Book 3D Cover */}
                        <div className="relative mt-4 flex-1 w-full max-w-[150px] perspective-[1000px] hover:scale-110 hover:-translate-y-4 transition-all duration-300 z-10">
                           <div className="w-full h-full shadow-[-15px_15px_20px_rgba(0,0,0,0.7)] rounded-r-md rounded-l-sm overflow-hidden border-l-[8px] border-black/60 border-y border-r border-white/5 relative bg-[#2d1b11]">
                             <DriveCover 
                               file={f} 
                               isEpub={isEpub}
                               isPdf={!isEpub}
                               fileId={fileId}
                               className="w-full h-full object-cover rounded-r-md"
                               fallbackClassName={`w-full h-full bg-gradient-to-br flex items-center justify-center rounded-r-md ${isEpub ? 'from-[#3A2418] to-[#1e1008]' : 'from-[#5c1c1c] to-[#3a1111]'}`}
                             />
                             {/* Gloss effect */}
                             <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/30 pointer-events-none"></div>
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-white/30 to-transparent pointer-events-none"></div>
                           </div>
                           
                           {/* Action Overlay */}
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-2 backdrop-blur-sm rounded-r-md rounded-l-sm border-l-[8px] border-black/60">
                              {linkedBook ? (
                                <button onClick={() => onOpenBook?.(linkedBook.id)} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded shadow-[0_4px_8px_rgba(0,0,0,0.5)] border border-emerald-500/30 text-xs">Ver Obra</button>
                              ) : (
                                <button onClick={() => {
                                   const cleanName = f.name.replace(/^arquivos\//, '').replace(/\.(epub|mobi|pdf)$/i, '').replace(/^(Vol\.?|Patrística Vol\.?)\s*\d+(_\d+)?\s*[-–]\s*/i, '').trim();
                                   fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanName)}&maxResults=1`)
                                     .then(r => r.json())
                                     .then(data => {
                                        const info = data.items?.[0]?.volumeInfo;
                                        let cover = f.thumbnail || (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : "");
                                        if (info?.imageLinks?.thumbnail) {
                                           cover = info.imageLinks.thumbnail.replace('http:', 'https:').replace('&edge=curl', '');
                                        }
                                        onRegisterBook?.(f, cover, info?.authors?.[0] || "");
                                     })
                                     .catch(() => {
                                        onRegisterBook?.(f, f.thumbnail || (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : ""), "");
                                     });
                                }} className="w-full bg-gradient-to-b from-[#C88758] to-[#B67A4A] hover:from-[#d4a883] hover:to-[#C88758] text-white font-bold py-2.5 rounded shadow-[0_4px_8px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-[#5c3722] text-xs">Registrar</button>
                              )}
                           </div>
                        </div>

                        {/* Bottom Paper Card */}
                        <div className="w-[115%] h-[80px] bg-gradient-to-br from-[#F7F0E7] to-[#EBD8BF] shadow-[0_10px_20px_rgba(0,0,0,0.7)] rounded mt-4 p-3 flex flex-col justify-between border border-[#d4c3ab] relative z-20 group-hover:-translate-y-1 transition-transform">
                           <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-4 bg-gradient-to-b from-[#F7F0E7] to-[#EBD8BF] rounded-t-sm shadow-[0_-2px_4px_rgba(0,0,0,0.2)] border-x border-t border-[#d4c3ab]"></div>
                           <span className="text-[#3A2418] font-black text-xs leading-tight line-clamp-2 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
                             {f.name.replace(/^arquivos\//, '')}
                           </span>
                           <div className="flex justify-between items-end">
                             <span className="text-[#8A6244] text-[10px] font-bold">{(f.size / (1024*1024)).toFixed(1)} MB</span>
                             <div className="flex gap-1.5">
                               <div className="size-6 rounded-full bg-gradient-to-b from-[#C88758] to-[#B67A4A] flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-[#5c3722] cursor-pointer hover:brightness-110">
                                 <Heart className="size-3 text-white drop-shadow" />
                               </div>
                               <div className="size-6 rounded-full bg-gradient-to-b from-[#C88758] to-[#B67A4A] flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-[#5c3722] cursor-pointer hover:brightness-110">
                                 <MoreHorizontal className="size-3 text-white drop-shadow" />
                               </div>
                             </div>
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Bottom Bar */}
         <div className="h-[70px] shrink-0 bg-gradient-to-t from-[#22130b] to-[#3a2418] border-t-2 border-[#4a2e1d] flex items-center justify-between px-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)] relative z-20">
            <div className="bg-[#EBD8BF] px-4 py-2 rounded shadow-[inset_0_1px_3px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.4)] text-[#3A2418] text-xs font-bold border border-[#d4c3ab]">
               {filtered.length} Obras • {totalGb} GB Total
            </div>
            <span className="text-3xl font-serif italic font-black text-[#1a0f0a] tracking-wider hidden sm:block" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.1), -1px -1px 0px rgba(0,0,0,0.8)' }}>
               Google Drive
            </span>
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-inner">
               <span className="text-white/80 font-medium text-xs">Armazenamento em Nuvem</span>
               <div className="w-8 h-8 rounded-full bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center border border-gray-200">
                 {/* Google Drive Logo representation */}
                 <div className="relative w-4 h-4">
                   <div className="absolute top-[2px] left-[3px] w-[6px] h-[10px] bg-[#34A853] -rotate-[60deg] rounded-sm"></div>
                   <div className="absolute top-[2px] right-[3px] w-[6px] h-[10px] bg-[#4285F4] rotate-[60deg] rounded-sm"></div>
                   <div className="absolute bottom-[0px] left-[5px] w-[6px] h-[10px] bg-[#FBBC05] rounded-sm rotate-90"></div>
                 </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
