import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Highlighter, Link as LinkIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Minus,
  Book, Play, X, ChevronRight, FolderOpen, Palette, Type, Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

const ReferenceComponent = (props: any) => {
  const { node } = props;
  const { refType, title, extra, url } = node.attrs;
  
  const getColors = () => {
    if (refType === 'book') return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20";
    if (refType === 'material') return "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 hover:bg-fuchsia-500/20";
    return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20";
  };
  
  const getIcon = () => {
    if (refType === 'book') return <Book className="size-3" />;
    if (refType === 'material') return <FolderOpen className="size-3" />;
    return <Play className="size-3" />;
  };

  return (
    <NodeViewWrapper className="inline-block mx-1 align-middle">
      <span 
        onClick={() => {
          if (refType === 'material' && url) {
             window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
          } else {
             const event = new CustomEvent('reference-click', { detail: node.attrs });
             window.dispatchEvent(event);
          }
        }}
        className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-sm hover:shadow-md", getColors())}
      >
        {getIcon()}
        {title} {extra && <span className="opacity-70 font-normal ml-1">({extra})</span>}
      </span>
    </NodeViewWrapper>
  );
}

const ReferenceExtension = Node.create({
  name: 'reference',
  group: 'inline',
  inline: true,
  selectable: true,
  draggable: true,
  
  addAttributes() {
    return {
      refType: { default: 'book' },
      title: { default: '' },
      url: { default: '' },
      extra: { default: '' },
      id: { default: '' }
    }
  },
  
  parseHTML() {
    return [{ tag: 'span[data-type="reference"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'reference' })]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ReferenceComponent)
  }
});

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  availableBooks?: any[];
  availableVideos?: any[];
  availableMaterials?: any[];
}

export function RichTextEditor({ content, onChange, placeholder, availableBooks, availableVideos, availableMaterials }: RichTextEditorProps) {
  const [slashMenu, setSlashMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    query: string;
    range: { from: number; to: number } | null;
  }>({ visible: false, x: 0, y: 0, query: '', range: null });

  const [activeStep, setActiveStep] = useState<'menu' | 'book-prompt' | 'video-prompt'>('menu');
  const [activeFilter, setActiveFilter] = useState<'quotes'|'videos'|'materials'>('quotes');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [extraInput, setExtraInput] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontFamily,
      Color,
      ReferenceExtension
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-notion max-w-none focus:outline-none min-h-[120px] px-6 py-4 text-[15px] text-white relative',
      },
      handleKeyDown: (view, event) => {
        if (slashMenu.visible) {
          if (event.key === 'Escape') {
            setSlashMenu(prev => ({ ...prev, visible: false }));
            setActiveStep('menu');
            return true;
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastUpdateRef.current = html;
      
      // Debounce the onChange callback to prevent parent re-renders on every keystroke
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onChange(html);
      }, 500);
      
      const { state } = editor;
      const { selection } = state;
      
      if (!selection.empty) {
        setSlashMenu(prev => ({ ...prev, visible: false }));
        return;
      }

      const $pos = selection.$anchor;
      const textBefore = $pos.parent.textBetween(Math.max(0, $pos.parentOffset - 25), $pos.parentOffset, null, '\ufffc');
      const match = textBefore.match(/(?:\s|^)(\/[^\s]*)$/);
      
      if (match) {
        const coords = editor.view.coordsAtPos(selection.from);
        setSlashMenu({
          visible: true,
          x: coords.left,
          y: coords.bottom,
          query: match[1].slice(1),
          range: { from: selection.from - match[1].length, to: selection.from }
        });
      } else {
        if (activeStep === 'menu') {
          setSlashMenu(prev => ({ ...prev, visible: false }));
        }
      }
    },
  });

  const lastUpdateRef = useRef(content);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpar timeout no unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Only update content from props if the user is NOT actively typing
      // This prevents cursor jumping and text loss from stale React state updates
      if (!editor.isFocused) {
        editor.commands.setContent(content, false);
        lastUpdateRef.current = content;
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  const handleSelectItem = (type: 'book' | 'video', item: any) => {
    setSelectedItem({ type, ...item });
    setActiveStep(type === 'book' ? 'book-prompt' : 'video-prompt');
    setExtraInput(item.text || "");
  }

  const handleInsert = () => {
    if (slashMenu.range) {
      editor.chain().focus().deleteRange(slashMenu.range).insertContent({
        type: 'reference',
        attrs: {
          refType: selectedItem.type,
          title: selectedItem.title,
          url: selectedItem.url || '',
          id: selectedItem.id,
          extra: extraInput
        }
      }).insertContent(' ').run();
    }
    setSlashMenu(prev => ({ ...prev, visible: false }));
    setActiveStep('menu');
  }

  const ToolbarButton = ({ onClick, isActive, icon: Icon }: any) => (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "p-1.5 rounded-lg transition-colors hover:bg-white/10 text-[#A1A1AA] hover:text-white",
        isActive ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30" : ""
      )}
    >
      <Icon className="size-4" />
    </button>
  );

  const queryLower = (slashMenu?.query || "").toLowerCase();

  const filteredBooks = availableBooks?.filter(b => 
    (b?.title || "").toLowerCase().includes(queryLower) || 
    (b?.text || "").toLowerCase().includes(queryLower)
  ) || [];
  
  const filteredVideos = availableVideos?.filter(v => 
    (v?.title || "").toLowerCase().includes(queryLower)
  ) || [];
  
  const filteredMaterials = availableMaterials?.filter(m => 
    (m?.name || "").toLowerCase().includes(queryLower)
  ) || [];
  
  const showMenu = slashMenu.visible;

  return (
    <div className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden focus-within:border-rose-500 transition-colors relative flex flex-col h-full">
      <div className="flex overflow-x-auto custom-scrollbar flex-nowrap items-center gap-1 p-2 border-b border-[rgba(255,255,255,0.06)] bg-[#111113]/50 shrink-0">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={Heading1} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading2} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} icon={Heading3} />
        
        <div className="w-px h-5 bg-[#3F3F46] mx-1 self-center shrink-0" />
        
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} icon={Code} />
        
        {/* Text Colors */}
        <div className="flex shrink-0 gap-1.5 items-center px-1 border-r border-[#3F3F46] pr-2">
          <Type className="size-3 text-[#A1A1AA] mr-1" />
          <button type="button" onClick={() => editor.chain().focus().setColor('#ef4444').run()} className={cn("size-3.5 rounded-full bg-[#ef4444] border border-black/20 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#ef4444' }) && "ring-2 ring-white")} title="Texto Vermelho" />
          <button type="button" onClick={() => editor.chain().focus().setColor('#3b82f6').run()} className={cn("size-3.5 rounded-full bg-[#3b82f6] border border-black/20 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#3b82f6' }) && "ring-2 ring-white")} title="Texto Azul" />
          <button type="button" onClick={() => editor.chain().focus().setColor('#10b981').run()} className={cn("size-3.5 rounded-full bg-[#10b981] border border-black/20 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#10b981' }) && "ring-2 ring-white")} title="Texto Verde" />
          <button type="button" onClick={() => editor.chain().focus().setColor('#f59e0b').run()} className={cn("size-3.5 rounded-full bg-[#f59e0b] border border-black/20 hover:scale-110 transition-transform", editor.isActive('textStyle', { color: '#f59e0b' }) && "ring-2 ring-white")} title="Texto Laranja" />
          <button type="button" onClick={() => editor.chain().focus().unsetColor().run()} className="size-4 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 text-white transition-colors" title="Limpar Cor">
             <X className="size-3" />
          </button>
        </div>

        {/* Highlights */}
        <div className="flex shrink-0 gap-1.5 items-center px-1">
          <Highlighter className="size-3 text-[#A1A1AA] mr-1" />
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className={cn("size-3.5 rounded-full bg-[#fef08a] border border-black/20 hover:scale-110 transition-transform", editor.isActive('highlight', { color: '#fef08a' }) && "ring-2 ring-white")} title="Marca-texto Amarelo" />
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()} className={cn("size-3.5 rounded-full bg-[#bbf7d0] border border-black/20 hover:scale-110 transition-transform", editor.isActive('highlight', { color: '#bbf7d0' }) && "ring-2 ring-white")} title="Marca-texto Verde" />
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#bfdbfe' }).run()} className={cn("size-3.5 rounded-full bg-[#bfdbfe] border border-black/20 hover:scale-110 transition-transform", editor.isActive('highlight', { color: '#bfdbfe' }) && "ring-2 ring-white")} title="Marca-texto Azul" />
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fbcfe8' }).run()} className={cn("size-3.5 rounded-full bg-[#fbcfe8] border border-black/20 hover:scale-110 transition-transform", editor.isActive('highlight', { color: '#fbcfe8' }) && "ring-2 ring-white")} title="Marca-texto Rosa" />
          <button type="button" onClick={() => editor.chain().focus().unsetHighlight().run()} className="size-4 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 text-white transition-colors" title="Limpar Marca-texto">
             <X className="size-3" />
          </button>
        </div>
        
        <div className="w-px h-5 bg-[#3F3F46] mx-1 self-center shrink-0" />

        {/* Fonts */}
        <select 
           onChange={(e) => {
             if (e.target.value) {
               editor.chain().focus().setFontFamily(e.target.value).run();
             } else {
               editor.chain().focus().unsetFontFamily().run();
             }
           }}
           className="bg-transparent shrink-0 text-xs text-[#A1A1AA] hover:text-white outline-none border-none cursor-pointer px-1 h-8"
           title="Fonte"
        >
           <option value="" className="bg-[#111113]">Padrão</option>
           <option value="Inter" className="bg-[#111113]">Inter</option>
           <option value="ui-serif, Georgia, serif" className="bg-[#111113]">Serif</option>
           <option value="ui-monospace, monospace" className="bg-[#111113]">Mono</option>
           <option value="'Comic Sans MS', 'Comic Sans', cursive" className="bg-[#111113]">Comic</option>
        </select>
        
        <div className="w-px h-5 bg-[#3F3F46] mx-1 self-center shrink-0" />
        
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={AlignJustify} />
        
        <div className="w-px h-5 bg-[#3F3F46] mx-1 self-center shrink-0" />
        
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} icon={CheckSquare} />
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} />
      </div>
      
      <EditorContent editor={editor} className="custom-scrollbar" />

      {showMenu && (
        <div 
          className="fixed z-[99999] w-80 bg-[#111113]/95 backdrop-blur-md border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-100"
          style={{ top: slashMenu.y + 10, left: slashMenu.x }}
        >
          {activeStep === 'menu' && (
            <>
              <div className="flex border-b border-white/5 p-1 bg-[#1A1A1E]">
                <button onClick={() => setActiveFilter('quotes')} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5", activeFilter === 'quotes' ? "bg-emerald-500/20 text-emerald-400" : "text-[#71717A] hover:text-[#A1A1AA]")}><Book className="size-3"/> Citações</button>
                <button onClick={() => setActiveFilter('videos')} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5", activeFilter === 'videos' ? "bg-cyan-500/20 text-cyan-400" : "text-[#71717A] hover:text-[#A1A1AA]")}><Play className="size-3"/> Videoteca</button>
                <button onClick={() => setActiveFilter('materials')} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5", activeFilter === 'materials' ? "bg-fuchsia-500/20 text-fuchsia-400" : "text-[#71717A] hover:text-[#A1A1AA]")}><FolderOpen className="size-3"/> Anexos</button>
              </div>
              
              <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {activeFilter === 'quotes' && (
                  filteredBooks.length > 0 ? filteredBooks.map(book => (
                    <button 
                      key={book.id}
                      onClick={() => handleSelectItem('book', book)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-500/10 transition-colors flex flex-col gap-1 border border-transparent hover:border-emerald-500/20"
                    >
                      <span className="text-[10px] text-emerald-400 font-bold truncate">{book.title}</span>
                      <span className="text-xs text-[#A1A1AA] line-clamp-2 leading-snug">{book.text}</span>
                    </button>
                  )) : (
                    <div className="text-center py-4 text-xs text-[#71717A]">Nenhuma citação encontrada.</div>
                  )
                )}

                {activeFilter === 'videos' && (
                  filteredVideos.length > 0 ? filteredVideos.map(vid => (
                    <button 
                      key={vid.id}
                      onClick={() => handleSelectItem('video', vid)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-colors flex flex-col gap-1 border border-transparent hover:border-cyan-500/20"
                    >
                      <span className="text-xs text-cyan-400 font-bold truncate">{vid.title}</span>
                      <span className="text-[10px] text-[#A1A1AA] truncate">{vid.channelName || "Vídeo"}</span>
                    </button>
                  )) : (
                    <div className="text-center py-4 text-xs text-[#71717A]">Nenhum vídeo encontrado.</div>
                  )
                )}

                {activeFilter === 'materials' && (
                  filteredMaterials.length > 0 ? filteredMaterials.map(mat => (
                    <button 
                      key={mat.url}
                      onClick={() => {
                        editor.chain().focus().deleteRange(slashMenu.range!).insertContent({
                          type: 'reference',
                          attrs: { refType: 'material', title: mat.name || "Material Anexo", url: mat.url, extra: '' }
                        }).insertContent(' ').run();
                        setSlashMenu(prev => ({ ...prev, visible: false }));
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-fuchsia-500/10 transition-colors flex items-center gap-2 border border-transparent hover:border-fuchsia-500/20"
                    >
                      <FolderOpen className="size-4 text-fuchsia-500 shrink-0" />
                      <span className="text-xs text-fuchsia-400 font-bold truncate">{mat.name || "Material Anexo"}</span>
                    </button>
                  )) : (
                    <div className="text-center py-4 text-xs text-[#71717A]">Nenhum anexo disponível neste tópico.</div>
                  )
                )}
              </div>
            </>
          )}
          
          {activeStep !== 'menu' && (
            <div className="p-4 bg-[#111113]">
              <div className="text-sm font-bold text-white mb-2 flex items-center justify-between">
                <span className="truncate pr-2">{selectedItem?.title}</span>
                <button onClick={() => { setActiveStep('menu'); setExtraInput(''); }} className="text-[#A1A1AA] hover:text-white p-1 rounded-md hover:bg-white/10"><X className="size-4" /></button>
              </div>
              <p className="text-xs text-[#A1A1AA] mb-3">
                {activeStep === 'book-prompt' ? "Ajuste a citação ou adicione a página (opcional):" : "Insira o minuto exato para este vídeo (ex: 12:30):"}
              </p>
              <div className="flex gap-2">
                <input 
                  autoFocus
                  type="text"
                  value={extraInput}
                  onChange={e => setExtraInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleInsert();
                    if (e.key === 'Escape') setActiveStep('menu');
                  }}
                  placeholder={activeStep === 'book-prompt' ? "Ex: pág 42..." : "Ex: 05:15"}
                  className="flex-1 bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
                />
                <button 
                  onClick={handleInsert} 
                  className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-3 flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
