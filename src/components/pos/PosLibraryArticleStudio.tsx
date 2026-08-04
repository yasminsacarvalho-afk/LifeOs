import React, { useState, useEffect } from 'react';
import { X, Edit3, Plus, Trash2, FileText, Youtube, BookOpen, AlignLeft, Target, GitMerge, DownloadCloud, PlayCircle, Network, HardDrive, Type } from 'lucide-react';
import { PosBook } from '@/hooks/use-pos-library';
import { RichTextEditor } from './RichTextEditor';
import { toast } from 'sonner';
import { PosLibraryInvestigationBoard } from './PosLibraryInvestigationBoard';
import { pdfService } from '@/services/pdfService';

interface ArticleVideo {
  id: string;
  title: string;
  url: string;
  description: string;
}

interface ArticleCitation {
  id: string;
  text: string;
  author: string;
}

interface Article {
  id: string;
  title: string;
  bookIds: string[];
  videos: ArticleVideo[];
  citationsList: ArticleCitation[];
  thesis: string;
  antithesis: string;
  synthesis: string;
  content: string;
  nodes?: any[];
  edges?: any[];
  timeline?: any[];
  updatedAt: number;
}

interface PosLibraryArticleStudioProps {
  isOpen: boolean;
  onClose: () => void;
  books: PosBook[];
  sessions: any[];
}

const htmlToPlainText = (html: string) => {
  if (!html) return "";
  let text = html.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value.trim().replace(/\n{3,}/g, '\n\n');
};

export function PosLibraryArticleStudio({ isOpen, onClose, books, sessions }: PosLibraryArticleStudioProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<'write' | 'board'>('write');
  
  useEffect(() => {
    const stored = localStorage.getItem('lifeos_articles');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const migrated = parsed.map((a: any) => ({
          ...a,
          bookIds: a.bookIds || (a.bookId ? [a.bookId] : []),
          videos: a.videos || [],
          citationsList: a.citationsList || [],
          nodes: a.nodes || [],
          edges: a.edges || [],
          timeline: a.timeline || []
        }));
        setArticles(migrated);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveArticles = (newArticles: Article[]) => {
    setArticles(newArticles);
    localStorage.setItem('lifeos_articles', JSON.stringify(newArticles));
  };

  const handleCreateNew = () => {
    const newArticle: Article = {
      id: Math.random().toString(36).substring(7),
      title: 'Nova Síntese Intelectual',
      bookIds: [],
      videos: [],
      citationsList: [],
      thesis: '',
      antithesis: '',
      synthesis: '',
      content: '',
      nodes: [],
      edges: [],
      timeline: [],
      updatedAt: Date.now()
    };
    saveArticles([newArticle, ...articles]);
    setActiveArticleId(newArticle.id);
    setEditorTab('write');
  };

  const activeArticle = articles.find(a => a.id === activeArticleId);

  const updateActiveArticle = (changes: Partial<Article>) => {
    if (!activeArticle) return;
    const updated = { ...activeArticle, ...changes, updatedAt: Date.now() };
    const newArticles = articles.map(a => a.id === activeArticle.id ? updated : a);
    saveArticles(newArticles);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Deseja deletar este artigo permanentemente?")) {
      const newArticles = articles.filter(a => a.id !== id);
      saveArticles(newArticles);
      if (activeArticleId === id) setActiveArticleId(null);
      toast.success("Artigo deletado");
    }
  };

  const handleAddBook = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bookId = e.target.value;
    if (!bookId || !activeArticle) return;
    if (!activeArticle.bookIds.includes(bookId)) {
      updateActiveArticle({ bookIds: [...activeArticle.bookIds, bookId] });
    }
    e.target.value = ''; // reset select
  };

  const handleRemoveBook = (bookId: string) => {
    if (!activeArticle) return;
    updateActiveArticle({ bookIds: activeArticle.bookIds.filter(id => id !== bookId) });
  };

  const pullCitationsFromBooks = () => {
    if (!activeArticle || activeArticle.bookIds.length === 0) {
      toast.error("Selecione ao menos um livro para puxar citações.");
      return;
    }
    
    const relevantSessions = sessions.filter(s => activeArticle.bookIds.includes(s.book_id) && s.notes && s.notes.trim().length > 0);
    
    if (relevantSessions.length === 0) {
      toast.info("Nenhuma anotação encontrada nas sessões de leitura dos livros selecionados.");
      return;
    }

    const newCitations: ArticleCitation[] = [];
    
    activeArticle.bookIds.forEach(bookId => {
      const book = books.find(b => b.id === bookId);
      const bookSessions = relevantSessions.filter(s => s.book_id === bookId);
      
      bookSessions.forEach(s => {
        newCitations.push({
          id: Math.random().toString(36).substring(7),
          text: s.notes,
          author: book?.title || 'Autor Desconhecido'
        });
      });
    });

    updateActiveArticle({ citationsList: [...activeArticle.citationsList, ...newCitations] });
    toast.success(`${newCitations.length} anotações importadas com sucesso!`);
  };

  const handleAddVideo = () => {
    if (!activeArticle) return;
    const newVideo: ArticleVideo = { id: Math.random().toString(36).substring(7), title: 'Novo Vídeo', url: '', description: '' };
    updateActiveArticle({ videos: [...activeArticle.videos, newVideo] });
  };

  const handleUpdateVideo = (id: string, changes: Partial<ArticleVideo>) => {
    if (!activeArticle) return;
    const updatedVideos = activeArticle.videos.map(v => v.id === id ? { ...v, ...changes } : v);
    updateActiveArticle({ videos: updatedVideos });
  };

  const handleRemoveVideo = (id: string) => {
    if (!activeArticle) return;
    updateActiveArticle({ videos: activeArticle.videos.filter(v => v.id !== id) });
  };

  const handleAddManualCitation = () => {
    if (!activeArticle) return;
    const newCit: ArticleCitation = { id: Math.random().toString(36).substring(7), text: '', author: '' };
    updateActiveArticle({ citationsList: [...activeArticle.citationsList, newCit] });
  };

  const handleUpdateCitation = (id: string, changes: Partial<ArticleCitation>) => {
    if (!activeArticle) return;
    const updated = activeArticle.citationsList.map(c => c.id === id ? { ...c, ...changes } : c);
    updateActiveArticle({ citationsList: updated });
  };

  const handleRemoveCitation = (id: string) => {
    if (!activeArticle) return;
    updateActiveArticle({ citationsList: activeArticle.citationsList.filter(c => c.id !== id) });
  };

  const handleSyncToDrive = async () => {
    if (!activeArticle) return;
    
    const plainText = htmlToPlainText(activeArticle.content);
    
    let fullContent = `TÍTULO: ${activeArticle.title}\n`;
    fullContent += `DATA: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    
    fullContent += `--- ESTRUTURA DIALÉTICA ---\n\n`;
    if (activeArticle.thesis) fullContent += `[Tese]:\n${activeArticle.thesis}\n\n`;
    if (activeArticle.antithesis) fullContent += `[Antítese]:\n${activeArticle.antithesis}\n\n`;
    if (activeArticle.synthesis) fullContent += `[Síntese]:\n${activeArticle.synthesis}\n\n`;
    
    if (activeArticle.citationsList && activeArticle.citationsList.length > 0) {
      fullContent += `--- REPOSITÓRIO DE CITAÇÕES ---\n\n`;
      activeArticle.citationsList.forEach((cit, index) => {
        fullContent += `Citação ${index + 1} (${cit.author}):\n"${cit.text}"\n\n`;
      });
    }
    
    if (activeArticle.nodes && activeArticle.nodes.length > 0) {
      fullContent += `--- QUADRO DE INVESTIGAÇÃO (NODES) ---\n\n`;
      activeArticle.nodes.forEach((node: any) => {
        fullContent += `- [${node.data.label}]\n`;
        if (node.data.description) fullContent += `  ${node.data.description}\n`;
      });
      fullContent += `\n`;
    }
    
    fullContent += `--- ESCRITA MINUCIOSA (ARTIGO FINAL) ---\n\n`;
    fullContent += plainText ? plainText : "(Nenhum conteúdo final escrito ainda.)";

    if (fullContent.length < 50) {
      toast.error("O conteúdo gerado está muito curto para exportar.");
      return;
    }

    try {
      const syncPromise = pdfService.exportarAnotacaoPDF({
        titulo: activeArticle.title || 'Síntese Intelectual',
        conteudo: fullContent,
        categoria: "Síntese",
        tags: ["Artigo"],
        criadoEm: new Date().toISOString(),
        autor: "Eu"
      });

      toast.promise(syncPromise, {
        loading: 'Sincronizando com Google Drive...',
        success: (url) => {
          if (url) {
             window.open(url as string, '_blank');
             return 'Documento criado e sincronizado com sucesso no Drive!';
          }
          return 'Documento criado, mas nenhum link retornado.';
        },
        error: 'Falha ao sincronizar'
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao tentar sincronizar.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full h-full md:w-[98vw] md:h-[96vh] md:rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[#050505] flex flex-col md:flex-row overflow-hidden shadow-2xl relative">
        
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        {/* SIDEBAR */}
        <div className="w-full md:w-80 border-r border-[rgba(255,255,255,0.04)] bg-[#0A0A0C]/80 backdrop-blur-md flex flex-col shrink-0 z-10">
          <div className="p-6 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
            <h2 className="text-white font-bold tracking-widest uppercase flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-indigo-500/10 rounded-md border border-indigo-500/20">
                 <Edit3 className="size-4 text-indigo-400" />
              </div>
              Estúdio
            </h2>
            <button onClick={onClose} className="md:hidden p-2 bg-[#1A1A1E] text-[#A1A1AA] hover:text-white rounded-full">
              <X className="size-4" />
            </button>
          </div>
          
          <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
            <button 
              onClick={handleCreateNew}
              className="w-full bg-gradient-to-r from-indigo-600/10 to-purple-600/10 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 hover:from-indigo-600/20 hover:to-purple-600/20 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-300"
            >
              <Plus className="size-4" /> Nova Síntese
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {articles.length === 0 && (
              <div className="text-center p-6 text-[#A1A1AA] text-sm">
                Nenhuma síntese criada ainda. Comece a estruturar suas ideias.
              </div>
            )}
            {articles.map(article => (
              <div 
                key={article.id}
                onClick={() => setActiveArticleId(article.id)}
                className={`p-4 rounded-xl cursor-pointer border transition-all duration-300 flex flex-col gap-1.5 group ${
                  activeArticleId === article.id 
                    ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                    : 'bg-[#0F0F13] border-[rgba(255,255,255,0.02)] hover:border-indigo-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-white line-clamp-1 leading-tight">{article.title || 'Sem Título'}</h4>
                  <button onClick={(e) => handleDelete(article.id, e)} className="text-[#71717A] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#A1A1AA] font-mono">
                  <div className="size-1.5 rounded-full bg-indigo-500/50"></div>
                  {new Date(article.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN EDITOR AREA */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
          <div className="absolute top-6 right-6 z-20 hidden md:block">
            <button onClick={onClose} className="p-3 bg-[#111113]/80 backdrop-blur-md border border-[rgba(255,255,255,0.06)] text-[#A1A1AA] hover:text-white hover:bg-rose-500 hover:border-rose-500 rounded-full transition-all duration-300 shadow-xl group">
              <X className="size-5 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
          
          {!activeArticle ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="size-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-indigo-500/30 relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
                  <Edit3 className="size-10 text-indigo-400 relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Laboratório de Síntese</h3>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  Estruture artigos e redações. Conecte múltiplos livros, extraia citações reais das suas sessões de leitura, linque vídeos do YouTube e consolide sua escrita minuciosamente.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="px-6 md:px-10 pt-8 pb-4 shrink-0 border-b border-[rgba(255,255,255,0.06)] bg-[#050505]">
                 <input 
                   type="text" 
                   value={activeArticle.title}
                   onChange={e => updateActiveArticle({ title: e.target.value })}
                   placeholder="Título da Tese ou Artigo..."
                   className="w-full bg-transparent text-3xl md:text-5xl font-black text-white focus:outline-none placeholder:text-[#27272A] tracking-tight mb-6"
                 />
                 
                 <div className="flex gap-6">
                   <button 
                     onClick={() => setEditorTab('write')}
                     className={`pb-3 text-sm font-bold tracking-widest uppercase transition-colors border-b-2 flex items-center gap-2 ${editorTab === 'write' ? 'text-indigo-400 border-indigo-500' : 'text-[#71717A] border-transparent hover:text-white'}`}
                   >
                     <Edit3 className="size-4" /> Redação & Síntese
                   </button>
                   <button 
                     onClick={() => setEditorTab('board')}
                     className={`pb-3 text-sm font-bold tracking-widest uppercase transition-colors border-b-2 flex items-center gap-2 ${editorTab === 'board' ? 'text-emerald-400 border-emerald-500' : 'text-[#71717A] border-transparent hover:text-white'}`}
                   >
                     <Network className="size-4" /> Quadro de Investigação
                   </button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-12 pb-40">
                {editorTab === 'write' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Referências */}
                    <div className="flex flex-col gap-6 p-6 bg-[#0F0F13] border border-[rgba(255,255,255,0.04)] rounded-2xl shadow-inner">
                      {/* Livros Referência */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs uppercase font-bold text-[#A1A1AA] tracking-widest flex items-center gap-2">
                            <BookOpen className="size-4 text-emerald-500" /> Referências Literárias
                          </label>
                          {activeArticle.bookIds.length > 0 && (
                            <button 
                              onClick={pullCitationsFromBooks}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <DownloadCloud className="size-3" /> Puxar Anotações & Citações
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          {activeArticle.bookIds.map(id => {
                            const book = books.find(b => b.id === id);
                            return (
                              <div key={id} className="flex items-center gap-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.1)] px-3 py-1.5 rounded-lg text-sm text-white">
                                <span className="truncate max-w-[200px]">{book?.title || 'Desconhecido'}</span>
                                <button onClick={() => handleRemoveBook(id)} className="text-[#71717A] hover:text-rose-500"><X className="size-3" /></button>
                              </div>
                            );
                          })}
                          <select 
                            onChange={handleAddBook}
                            className="bg-transparent text-emerald-500 text-sm font-bold border border-dashed border-emerald-500/30 rounded-lg px-3 py-1.5 focus:outline-none hover:border-emerald-500/60 transition-colors cursor-pointer"
                          >
                            <option value="" className="bg-[#111113]">+ Adicionar Livro</option>
                            {books.filter(b => !activeArticle.bookIds.includes(b.id)).map(b => (
                              <option key={b.id} value={b.id} className="bg-[#111113]">{b.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="h-px w-full bg-[rgba(255,255,255,0.04)]"></div>
                      
                      {/* Vídeos e Links */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs uppercase font-bold text-[#A1A1AA] tracking-widest flex items-center gap-2">
                            <Youtube className="size-4 text-rose-500" /> Referências em Vídeo (YouTube)
                          </label>
                          <button 
                            onClick={handleAddVideo}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Plus className="size-3" /> Adicionar Link
                          </button>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          {activeArticle.videos.map((vid, idx) => (
                            <div key={vid.id} className="flex flex-col gap-3 bg-[#131316] border border-[rgba(255,255,255,0.04)] p-4 rounded-xl relative group">
                              <button onClick={() => handleRemoveVideo(vid.id)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
                                <X className="size-3" />
                              </button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 bg-[#0A0A0C] border border-[rgba(255,255,255,0.02)] rounded-lg p-2">
                                  <Type className="size-4 text-rose-500 shrink-0" />
                                  <input 
                                    type="text" value={vid.title} onChange={e => handleUpdateVideo(vid.id, { title: e.target.value })}
                                    placeholder="Nome ou Título do Vídeo..."
                                    className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-[#3F3F46]"
                                  />
                                </div>
                                <div className="flex items-center gap-2 bg-[#0A0A0C] border border-[rgba(255,255,255,0.02)] rounded-lg p-2">
                                  <PlayCircle className="size-4 text-rose-500 shrink-0" />
                                  <input 
                                    type="text" value={vid.url} onChange={e => handleUpdateVideo(vid.id, { url: e.target.value })}
                                    placeholder="Link do vídeo (ex: ou link do minuto)..."
                                    className="w-full bg-transparent text-sm text-[#A1A1AA] focus:outline-none placeholder:text-[#3F3F46]"
                                  />
                                </div>
                              </div>
                              <textarea 
                                value={vid.description} onChange={e => handleUpdateVideo(vid.id, { description: e.target.value })}
                                placeholder="Descrição, citações e detalhamento do argumento deste vídeo..."
                                className="w-full bg-[#0A0A0C] border border-[rgba(255,255,255,0.02)] rounded-lg p-3 text-xs text-[#D4D4D8] focus:outline-none resize-none h-20 custom-scrollbar placeholder:text-[#3F3F46]"
                              />
                            </div>
                          ))}
                          {activeArticle.videos.length === 0 && (
                            <div className="text-xs text-[#71717A] italic">Nenhum vídeo vinculado.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DIALÉTICA */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Target className="size-5 text-purple-400" /> Estrutura Dialética
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-[#0F0F13] border border-blue-500/20 rounded-2xl p-5 flex flex-col gap-4 group focus-within:border-blue-500/50 transition-all shadow-inner relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[40px] rounded-full pointer-events-none"></div>
                          <h3 className="text-xs uppercase tracking-widest font-black text-blue-400 flex items-center gap-2 relative z-10">
                            <AlignLeft className="size-4" /> Tese
                          </h3>
                          <textarea 
                            value={activeArticle.thesis}
                            onChange={e => updateActiveArticle({ thesis: e.target.value })}
                            placeholder="A afirmação central. Qual é a principal ideia que está sendo proposta?"
                            className="w-full bg-transparent text-sm text-[#D4D4D8] focus:outline-none resize-none h-40 custom-scrollbar placeholder:text-[#3F3F46] relative z-10 font-medium leading-relaxed"
                          />
                        </div>
                        
                        <div className="bg-[#0F0F13] border border-rose-500/20 rounded-2xl p-5 flex flex-col gap-4 group focus-within:border-rose-500/50 transition-all shadow-inner relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-[40px] rounded-full pointer-events-none"></div>
                          <h3 className="text-xs uppercase tracking-widest font-black text-rose-400 flex items-center gap-2 relative z-10">
                            <Target className="size-4" /> Antítese
                          </h3>
                          <textarea 
                            value={activeArticle.antithesis}
                            onChange={e => updateActiveArticle({ antithesis: e.target.value })}
                            placeholder="A contradição. Qual é a crítica ou argumento oposto à sua tese?"
                            className="w-full bg-transparent text-sm text-[#D4D4D8] focus:outline-none resize-none h-40 custom-scrollbar placeholder:text-[#3F3F46] relative z-10 font-medium leading-relaxed"
                          />
                        </div>

                        <div className="bg-[#0F0F13] border border-emerald-500/20 rounded-2xl p-5 flex flex-col gap-4 group focus-within:border-emerald-500/50 transition-all shadow-inner relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none"></div>
                          <h3 className="text-xs uppercase tracking-widest font-black text-emerald-400 flex items-center gap-2 relative z-10">
                            <GitMerge className="size-4" /> Síntese
                          </h3>
                          <textarea 
                            value={activeArticle.synthesis}
                            onChange={e => updateActiveArticle({ synthesis: e.target.value })}
                            placeholder="A resolução. Qual conclusão superadora resolve o conflito entre Tese e Antítese?"
                            className="w-full bg-transparent text-sm text-[#D4D4D8] focus:outline-none resize-none h-40 custom-scrollbar placeholder:text-[#3F3F46] relative z-10 font-medium leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* CITAÇÕES RAW */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <FileText className="size-5 text-amber-400" /> Repositório de Citações
                        </h3>
                        <button 
                          onClick={handleAddManualCitation}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus className="size-3" /> Citação Manual
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeArticle.citationsList.map((cit) => (
                          <div key={cit.id} className="bg-[#0F0F13] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex flex-col gap-3 relative group shadow-inner">
                            <button onClick={() => handleRemoveCitation(cit.id)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
                              <X className="size-3" />
                            </button>
                            <input 
                              type="text" value={cit.author} onChange={e => handleUpdateCitation(cit.id, { author: e.target.value })}
                              placeholder="Autor, Livro ou Fonte..."
                              className="w-full bg-transparent text-xs font-bold text-emerald-400 focus:outline-none placeholder:text-[#3F3F46]"
                            />
                            <textarea 
                              value={cit.text} onChange={e => handleUpdateCitation(cit.id, { text: e.target.value })}
                              placeholder="Texto exato da citação..."
                              className="w-full bg-[#1A1A1E]/50 rounded-lg p-3 text-sm text-[#E4E4E7] focus:outline-none resize-none h-24 custom-scrollbar placeholder:text-[#3F3F46] font-serif italic"
                            />
                          </div>
                        ))}
                        {activeArticle.citationsList.length === 0 && (
                          <div className="md:col-span-2 text-xs text-[#71717A] italic text-center p-6 border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl">
                            O repositório está vazio. Utilize o botão "Puxar Anotações" nas referências literárias ou crie uma citação manual.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ESCRITA MINUCIOSA (A4 PAPER) */}
                    <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Edit3 className="size-6 text-indigo-400" /> Escrita Minuciosa (Artigo Final)
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#71717A] bg-[#1A1A1E] px-3 py-1.5 rounded-full font-medium">Draft guardado localmente</span>
                          <button 
                            onClick={handleSyncToDrive}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          >
                            <HardDrive className="size-4" /> Sincronizar p/ Drive (Texto Limpo)
                          </button>
                        </div>
                      </div>
                      
                      <div className="w-full py-6">
                        <div className="bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden min-h-[500px] shadow-2xl">
                            <RichTextEditor 
                              content={activeArticle.content}
                              onChange={(html) => updateActiveArticle({ content: html })}
                            />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {editorTab === 'board' && (
                  <div className="w-full h-full min-h-[70vh] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
                    <PosLibraryInvestigationBoard
                      nodes={activeArticle.nodes || []}
                      edges={activeArticle.edges || []}
                      onChange={(nodes, edges) => updateActiveArticle({ nodes, edges })}
                      timeline={activeArticle.timeline || []}
                      onTimelineSave={(snapName) => {
                        const newTimeline = [...(activeArticle.timeline || []), {
                          name: snapName,
                          timestamp: Date.now(),
                          nodes: activeArticle.nodes || [],
                          edges: activeArticle.edges || []
                        }];
                        updateActiveArticle({ timeline: newTimeline });
                        toast.success("Snapshot salvo na linha do tempo!");
                      }}
                      availableBooks={books.filter(b => activeArticle.bookIds.includes(b.id)).map(b => ({ id: b.id, title: b.title }))}
                      availableVideos={activeArticle.videos.map(v => ({ id: v.id, title: v.title || 'Vídeo sem título', description: v.description }))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
