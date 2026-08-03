import { useState, useMemo } from 'react';
import { PosBook, PosReadingSession } from '@/hooks/use-pos-library';
import { BookOpen, Brain, Network, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PosLibraryGraphProps {
  books: PosBook[];
  sessions: PosReadingSession[];
}

interface Node {
  id: string;
  label: string;
  type: 'category' | 'book' | 'note';
  group: string;
  x: number;
  y: number;
  radius: number;
  data?: any;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

export function PosLibraryGraph({ books, sessions }: PosLibraryGraphProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const { nodes, links } = useMemo(() => {
    const newNodes: Node[] = [];
    const newLinks: Link[] = [];

    const notesWithText = sessions.filter(s => s.notes && s.notes.trim().length > 0);
    const relevantBooks = books.filter(b => 
      notesWithText.some(n => n.book_id === b.id) || 
      b.status === 'concluido'
    );

    const categories = Array.from(new Set(relevantBooks.map(b => b.knowledge_area || 'Geral')));
    
    const cx = 400;
    const cy = 400;
    const catRadius = 120;
    const bookRadius = 260;

    categories.forEach((cat, i) => {
      const catAngle = (i / categories.length) * 2 * Math.PI;
      newNodes.push({
        id: `cat-${cat}`,
        label: cat,
        type: 'category',
        group: cat,
        x: cx + catRadius * Math.cos(catAngle),
        y: cy + catRadius * Math.sin(catAngle),
        radius: 35
      });

      const catBooks = relevantBooks.filter(b => (b.knowledge_area || 'Geral') === cat);
      catBooks.forEach((book, j) => {
         const spread = 0.8; // radians
         const bookAngle = catAngle - (spread/2) + (catBooks.length > 1 ? (j / (catBooks.length - 1)) * spread : 0);
         
         const bx = cx + bookRadius * Math.cos(bookAngle);
         const by = cy + bookRadius * Math.sin(bookAngle);

         newNodes.push({
           id: `book-${book.id}`,
           label: book.title,
           type: 'book',
           group: cat,
           x: bx, y: by,
           radius: 20,
           data: book
         });

         newLinks.push({
           source: `cat-${cat}`,
           target: `book-${book.id}`,
           value: 2
         });
      });
    });


    
    notesWithText.forEach((session) => {
      const bookNode = newNodes.find(n => n.id === `book-${session.book_id}`);
      if (bookNode) {
        const bookNotes = notesWithText.filter(s => s.book_id === session.book_id);
        const noteIndex = bookNotes.indexOf(session);
        const noteAngle = (noteIndex / bookNotes.length) * 2 * Math.PI;
        const noteDist = 45;

        newNodes.push({
          id: `note-${session.id}`,
          label: 'Anotação',
          type: 'note',
          group: bookNode.group,
          x: bookNode.x + noteDist * Math.cos(noteAngle),
          y: bookNode.y + noteDist * Math.sin(noteAngle),
          radius: 8,
          data: session
        });

        newLinks.push({
          source: `book-${session.book_id}`,
          target: `note-${session.id}`,
          value: 1
        });
      }
    });

    return { nodes: newNodes, links: newLinks };
  }, [books, sessions]);

  const getNodeColor = (group: string, type: string) => {
    const colors: Record<string, string> = {
      'Negócios': '#3B82F6',
      'Filosofia': '#F59E0B',
      'Tecnologia': '#8B5CF6',
      'Finanças': '#10B981',
      'Psicologia': '#EC4899',
      'Geral': '#6B7280'
    };
    const base = colors[group] || '#e11d48'; // default rose
    if (type === 'note') return `${base}80`;
    return base;
  };

  return (
    <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl overflow-hidden mt-8 flex flex-col transition-all duration-500 shadow-2xl mb-8">
      {/* HEADER */}
      <div 
        className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
           <Network className="size-6 text-rose-500" />
           <h3 className="text-xl font-bold text-white tracking-tight">Gráfico Neural (Inspetor de Conhecimento)</h3>
        </div>
        <div className="p-2 bg-white/5 rounded-full text-white shrink-0">
           {isExpanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
        </div>
      </div>
      
      {/* EXPANDED CONTENT */}
      {isExpanded && (
        <div className="p-6 md:p-8 pt-0 border-t border-[rgba(255,255,255,0.06)] animate-in fade-in duration-500 flex flex-col xl:flex-row gap-6 h-[600px] mt-4">
      {/* Graphic Area */}
      <div className="flex-1 relative bg-black/40 rounded-2xl border border-[rgba(255,255,255,0.04)] overflow-auto custom-scrollbar flex items-center justify-center">
        <svg viewBox="0 0 800 800" className="w-full h-full min-w-[600px] min-h-[600px]">
          <defs>
            <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(225,29,72,0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="800" height="800" fill="url(#bgGlow)" />
          
          {links.map((link, i) => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            if (!source || !target) return null;
            return (
              <line 
                key={i} 
                x1={source.x} y1={source.y} x2={target.x} y2={target.y} 
                stroke="rgba(255,255,255,0.1)" strokeWidth={link.value} 
              />
            );
          })}

          {nodes.map(node => (
            <g 
              key={node.id} 
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer transition-transform hover:scale-110"
              onClick={() => setSelectedNode(node)}
            >
              <circle 
                r={node.radius} 
                fill={getNodeColor(node.group, node.type)} 
                className={cn("transition-all duration-300", selectedNode?.id === node.id ? "stroke-white stroke-[3px]" : "stroke-black/50 stroke-[2px]")}
                style={{
                  filter: selectedNode?.id === node.id ? `drop-shadow(0 0 10px ${getNodeColor(node.group, node.type)})` : 'none'
                }}
              />
              {node.type === 'category' && (
                <text 
                  textAnchor="middle" dy=".3em" 
                  fill="white" className="text-[10px] font-bold uppercase tracking-widest pointer-events-none"
                >
                  {node.label.substring(0, 3)}
                </text>
              )}
            </g>
          ))}
        </svg>

        <div className="absolute top-4 left-4 flex gap-2">
           <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.1)] flex items-center gap-2">
             <Network className="size-3 text-rose-500" />
             <span className="text-[10px] text-white font-bold uppercase tracking-widest">Brain Graph</span>
           </div>
        </div>
      </div>

      {/* Side Panel for Details */}
      <div className="w-full xl:w-[380px] flex flex-col gap-4">
         <div className="bg-[#1A1A1E] rounded-2xl p-6 border border-[rgba(255,255,255,0.04)] h-full flex flex-col">
            <h3 className="text-[#A1A1AA] text-[10px] uppercase font-bold tracking-widest mb-6 flex items-center gap-2">
               <Brain className="size-4 text-emerald-500" /> Inspetor de Conhecimento
            </h3>
            
            {selectedNode ? (
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 animate-in fade-in">
                  {selectedNode.type === 'category' && (
                     <div>
                       <div className="inline-block px-2 py-1 rounded bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest mb-4">Categoria / Área</div>
                       <h4 className="text-3xl font-black text-white mb-2">{selectedNode.label}</h4>
                       <p className="text-sm text-[#A1A1AA]">Visualizando todas as obras e ramificações de anotações relacionadas a esta área do conhecimento no seu cérebro digital.</p>
                     </div>
                  )}
                  {selectedNode.type === 'book' && selectedNode.data && (
                     <div>
                       <div className="inline-block px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest mb-4">Obra Literária</div>
                       <h4 className="text-2xl font-black text-white mb-2 leading-tight">{selectedNode.label}</h4>
                       <p className="text-sm text-[#71717A] mb-6 font-medium">{selectedNode.data.author}</p>
                       <div className="bg-black/30 p-4 rounded-xl border border-[rgba(255,255,255,0.05)] mb-6 flex justify-between items-center shadow-inner">
                          <span className="text-xs text-[#A1A1AA] font-bold uppercase tracking-widest">Páginas Lidas</span>
                          <span className="text-lg font-black text-white">{selectedNode.data.pages_read} / {selectedNode.data.total_pages || '?'}</span>
                       </div>
                       {selectedNode.data.summary && (
                          <div>
                            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mb-2 block">Resumo / Tese</span>
                            <p className="text-sm text-white/80 leading-relaxed italic border-l-2 border-rose-500 pl-4 py-1">{selectedNode.data.summary}</p>
                          </div>
                       )}
                     </div>
                  )}
                  {selectedNode.type === 'note' && selectedNode.data && (
                     <div>
                       <div className="inline-block px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-4">Insight da Leitura</div>
                       <div className="flex items-center gap-2 text-xs text-[#A1A1AA] font-bold tracking-widest uppercase mb-4">
                          <BookOpen className="size-3" /> Sessão de {selectedNode.data.session_date.split('-').reverse().join('/')}
                       </div>
                       <div className="bg-[#111113] p-5 rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-inner">
                         <p className="text-[15px] text-white leading-relaxed">{selectedNode.data.notes}</p>
                       </div>
                     </div>
                  )}
               </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 px-4">
                  <Network className="size-12 text-[#71717A] mb-4" />
                  <p className="text-sm text-[#A1A1AA]">Navegue pelo seu gráfico neural de conhecimento.<br/><br/>Clique em um nó para explorar a tese, os livros e os insights capturados.</p>
               </div>
            )}
          </div>
       </div>
       </div>
       )}
    </div>
  );
}
