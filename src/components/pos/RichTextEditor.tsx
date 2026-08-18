import { useEditor, EditorContent } from '@tiptap/react';
import * as Popover from '@radix-ui/react-popover';
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
import Image from '@tiptap/extension-image';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Highlighter, Link as LinkIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Minus,
  Book, Play, X, ChevronRight, FolderOpen, Palette, Type, Code,
  Image as ImageIcon, BookMarked, Smile
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
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
      ReferenceExtension,
      Image.configure({ inline: true, allowBase64: true })
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-notion max-w-none focus:outline-none min-h-full px-6 py-4 text-[15px] text-white relative',
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        editor.chain().focus().setImage({ src: result }).run();
      };
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = '';
  };

  const addImage = () => {
    const choice = window.confirm("Clique 'OK' para enviar um arquivo do seu computador, ou 'Cancelar' para inserir um Link.");
    if (choice) {
      fileInputRef.current?.click();
    } else {
      const url = window.prompt("Insira a URL da imagem:");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  };

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

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const EMOJIS = ["📌", "⚠️", "💡", "✅", "❌", "🔥", "🚀", "⭐", "🔵", "🔴", "🟢", "🟡", "📖", "💻", "🧠", "🎯", "📝", "⚡", "✨", "🏆", "🚩", "🔍", "⏰", "📅", "📊", "🔗", "💬", "📌", "📌"];

  const ToolbarButton = ({ onClick, isActive, icon: Icon, title }: any) => (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "p-1.5 rounded-lg transition-all duration-200 ease-out hover:bg-white/10 text-[#A1A1AA] hover:text-white active:scale-90",
        isActive ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 shadow-inner" : ""
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
    <div className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all duration-300 relative flex flex-col h-full flex-1 min-h-0">
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />
      <div className="flex overflow-x-auto custom-scrollbar flex-nowrap items-center gap-1 p-2 border-b border-[rgba(255,255,255,0.06)] bg-[#111113]/80 backdrop-blur-md shrink-0 sticky top-0 z-10 transition-colors">
        <ToolbarButton title="Título 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={Heading1} />
        <ToolbarButton title="Título 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading2} />
        <ToolbarButton title="Título 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} icon={Heading3} />
        
        <div className="w-px h-5 bg-[#3F3F46] mx-1 self-center shrink-0" />
        
        <button
          type="button"
          title="Adicionar Destaque no Glossário"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 4 }).run(); }}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200 ease-out text-[11px] font-bold shrink-0 mx-1",
            editor.isActive('heading', { level: 4 }) 
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner" 
              : "bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white border border-[rgba(255,255,255,0.05)]"
          )}
        >
          <BookMarked className="size-3" />
          Destaque VIP
        </button>
        
        <div className="w-px h-5 bg-[#3F3F46] mx-1 self-center shrink-0" />
        
        <Popover.Root open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <Popover.Trigger asChild>
            <button
              type="button"
              title="Inserir Ícone/Emoji"
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200 ease-out hover:bg-white/10 text-[#A1A1AA] hover:text-white active:scale-90",
                showEmojiPicker ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 shadow-inner" : ""
              )}
            >
              <Smile className="size-4" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content 
              sideOffset={5} 
              className="w-52 bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl p-2 z-[100000] grid grid-cols-6 gap-1"
            >
              {EMOJIS.map((emoji, idx) => (
                <button 
                  key={idx} 
                  type="button"
                  title="Inserir"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.chain().focus().insertContent(emoji).run();
                    setShowEmojiPicker(false);
                  }}
                  className="w-7 h-7 flex items-center justify-center text-base hover:bg-white/10 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <div className="w-px h-5 bg-[#3F3F46] mx-1 self-center shrink-0" />
        
        <ToolbarButton title="Negrito" onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} />
        <ToolbarButton title="Itálico" onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} />
        <ToolbarButton title="Sublinhado" onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} />
        <ToolbarButton title="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} />
        <ToolbarButton title="Bloco de Código" onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} icon={Code} />
        <ToolbarButton title="Adicionar Imagem" onClick={addImage} isActive={editor.isActive('image')} icon={ImageIcon} />
        
        {/* Text Colors */}
        <div className="flex shrink-0 gap-1.5 items-center px-1 border-r border-[#3F3F46] pr-2 ml-1">
          <Type className="size-3 text-[#A1A1AA] mr-1" />
          <button type="button" onClick={() => editor.chain().focus().setColor('#ef4444').run()} className={cn("size-3.5 rounded-full bg-[#ef4444] border border-black/20 hover:scale-125 hover:shadow-lg transition-all", editor.isActive('textStyle', { color: '#ef4444' }) && "ring-2 ring-white scale-110")} title="Texto Vermelho" />
          <button type="button" onClick={() => editor.chain().focus().setColor('#3b82f6').run()} className={cn("size-3.5 rounded-full bg-[#3b82f6] border border-black/20 hover:scale-125 hover:shadow-lg transition-all", editor.isActive('textStyle', { color: '#3b82f6' }) && "ring-2 ring-white scale-110")} title="Texto Azul" />
          <button type="button" onClick={() => editor.chain().focus().setColor('#10b981').run()} className={cn("size-3.5 rounded-full bg-[#10b981] border border-black/20 hover:scale-125 hover:shadow-lg transition-all", editor.isActive('textStyle', { color: '#10b981' }) && "ring-2 ring-white scale-110")} title="Texto Verde" />
          <button type="button" onClick={() => editor.chain().focus().setColor('#f59e0b').run()} className={cn("size-3.5 rounded-full bg-[#f59e0b] border border-black/20 hover:scale-125 hover:shadow-lg transition-all", editor.isActive('textStyle', { color: '#f59e0b' }) && "ring-2 ring-white scale-110")} title="Texto Laranja" />
          <button type="button" onClick={() => editor.chain().focus().setColor('#a855f7').run()} className={cn("size-3.5 rounded-full bg-[#a855f7] border border-black/20 hover:scale-125 hover:shadow-lg transition-all", editor.isActive('textStyle', { color: '#a855f7' }) && "ring-2 ring-white scale-110")} title="Texto Roxo" />
          <label className="relative cursor-pointer size-4 rounded-full border border-white/20 flex items-center justify-center hover:scale-125 transition-all overflow-hidden shadow-sm" title="Cor Personalizada">
             <div className="absolute inset-0 bg-gradient-to-tr from-rose-500 via-cyan-500 to-purple-500" />
             <input type="color" className="absolute opacity-0 w-8 h-8 cursor-pointer" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
          </label>
          <button type="button" onClick={() => editor.chain().focus().unsetColor().run()} className="size-4 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 text-white transition-all hover:scale-110" title="Limpar Cor">
             <X className="size-3" />
          </button>
        </div>

        {/* Highlights */}
        <div className="flex shrink-0 gap-1.5 items-center px-1 ml-1">
          <Highlighter className="size-3 text-[#A1A1AA] mr-1" />
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className={cn("size-3.5 rounded-full bg-[#fef08a] border border-black/20 hover:scale-125 hover:shadow-lg transition-all", editor.isActive('highlight', { color: '#fef08a' }) && "ring-2 ring-white scale-110")} title="Marca-texto Amarelo" />
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()} className={cn("size-3.5 rounded-full bg-[#bbf7d0] border border-black/20 hover:scale-125 hover:shadow-lg transition-all", editor.isActive('highlight', { color: '#bbf7d0' }) && "ring-2 ring-white scale-110")} title="Marca-texto Verde" />
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#bfdbfe' }).run()} className={cn("size-3.5 rounded-full bg-[#bfdbfe] border border-black/20 hover:scale-125 hover:shadow-lg transition-all", editor.isActive('highlight', { color: '#bfdbfe' }) && "ring-2 ring-white scale-110")} title="Marca-texto Azul" />
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fbcfe8' }).run()} className={cn("size-3.5 rounded-full bg-[#fbcfe8] border border-black/20 hover:scale-125 hover:shadow-lg transition-all", editor.isActive('highlight', { color: '#fbcfe8' }) && "ring-2 ring-white scale-110")} title="Marca-texto Rosa" />
          <label className="relative cursor-pointer size-4 rounded-full border border-white/20 flex items-center justify-center hover:scale-125 transition-all overflow-hidden shadow-sm" title="Marca-texto Personalizado">
             <div className="absolute inset-0 bg-gradient-to-tr from-yellow-300 via-green-300 to-pink-300 opacity-80" />
             <input type="color" className="absolute opacity-0 w-8 h-8 cursor-pointer" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
          </label>
          <button type="button" onClick={() => editor.chain().focus().unsetHighlight().run()} className="size-4 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 text-white transition-all hover:scale-110" title="Limpar Marca-texto">
             <X className="size-3" />
          </button>
        </div>
        
        <div className="w-px h-5 bg-[#3F3F46] mx-1 self-center shrink-0 ml-2" />

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
        
        <ToolbarButton title="Alinhar à Esquerda" onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} />
        <ToolbarButton title="Centralizar" onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} />
        <ToolbarButton title="Alinhar à Direita" onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} />
        <ToolbarButton title="Justificar" onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={AlignJustify} />
        
        <div className="w-px h-5 bg-[#3F3F46] mx-1 self-center shrink-0" />
        
        <ToolbarButton title="Lista de Marcadores" onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} />
        <ToolbarButton title="Lista Numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} />
        <ToolbarButton title="Lista de Tarefas" onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} icon={CheckSquare} />
        <ToolbarButton title="Linha Horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} />
      </div>
      
      <EditorContent 
        editor={editor} 
        className="flex-1 overflow-y-auto custom-scrollbar min-h-0 cursor-text" 
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            editor.chain().focus('end').run();
          }
        }} 
      />

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
