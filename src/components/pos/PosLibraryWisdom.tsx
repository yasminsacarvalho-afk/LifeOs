import React, { useState, useEffect } from 'react';
import { Quote, Plus, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface WisdomQuote {
  id: string;
  text: string;
  author: string;
}

export function PosLibraryWisdom() {
  const [quotes, setQuotes] = useState<WisdomQuote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('lifeos_wisdom_quotes');
    if (saved) {
      setQuotes(JSON.parse(saved));
    } else {
      const defaultQuotes = [
        { id: '1', text: 'A leitura de todos os bons livros é uma conversação com as mais honestas pessoas dos séculos passados.', author: 'René Descartes' }
      ];
      setQuotes(defaultQuotes);
      localStorage.setItem('lifeos_wisdom_quotes', JSON.stringify(defaultQuotes));
    }
  }, []);

  useEffect(() => {
    if (quotes.length <= 1 || isAdding) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % quotes.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [quotes.length, isAdding]);

  const saveQuotes = (newQuotes: WisdomQuote[]) => {
    setQuotes(newQuotes);
    localStorage.setItem('lifeos_wisdom_quotes', JSON.stringify(newQuotes));
  };

  const handleAdd = () => {
    if (!newText.trim()) return;
    const newQuote = {
      id: Math.random().toString(36).substring(7),
      text: newText,
      author: newAuthor || 'Desconhecido'
    };
    const updated = [...quotes, newQuote];
    saveQuotes(updated);
    setNewText('');
    setNewAuthor('');
    setIsAdding(false);
    setCurrentIndex(updated.length - 1);
    toast.success("Citação adicionada com sucesso!");
  };

  const handleDelete = (id: string) => {
    const updated = quotes.filter(q => q.id !== id);
    saveQuotes(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
    toast.success("Citação removida.");
  };

  if (quotes.length === 0 && !isAdding) {
    return (
      <div className="w-full flex justify-center mb-8">
         <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-500/50 hover:text-amber-400 transition-colors">
            <Plus className="size-3" /> Adicionar Sabedoria
         </button>
      </div>
    );
  }

  const activeQuote = quotes[currentIndex];

  return (
    <div className="w-full mb-12 mt-4 relative flex flex-col items-center justify-center min-h-[120px]">
      
      {/* Background Orbit/Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full pointer-events-none z-0">
         <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-amber-500/5 rounded-full blur-[60px] animate-[pulse_4s_ease-in-out_infinite]" />
         <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-rose-500/5 rounded-full blur-[70px] animate-[pulse_6s_ease-in-out_infinite_1s]" />
      </div>

      {!isAdding ? (
        <div className="relative z-10 w-full max-w-3xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-1000 group">
           <Quote className="size-6 text-amber-500/30 mb-3 animate-[bounce_4s_infinite]" />
           
           <div key={activeQuote?.id} className="animate-in fade-in slide-in-from-bottom-2 duration-1000">
             <p className="text-xl md:text-2xl font-serif text-[#E4E4E7] italic leading-relaxed mb-4 drop-shadow-lg font-medium px-4">
               "{activeQuote?.text}"
             </p>
             <div className="flex items-center justify-center gap-4">
               <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/30"></div>
               <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-black text-amber-500/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                 {activeQuote?.author}
               </span>
               <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/30"></div>
             </div>
           </div>

           {/* Hover Controls */}
           <div className="flex items-center gap-4 mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute -bottom-10">
             <button onClick={() => setCurrentIndex((prev) => (prev - 1 + quotes.length) % quotes.length)} className="text-[#71717A] hover:text-white text-xs">&larr; Ant</button>
             <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-amber-500/50 hover:text-amber-400 bg-amber-500/5 px-3 py-1.5 rounded-full border border-amber-500/10 hover:border-amber-500/30 transition-all shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                <Plus className="size-3" /> Adicionar Ideia
             </button>
             <button onClick={() => activeQuote && handleDelete(activeQuote.id)} className="text-[#71717A] hover:text-rose-500 transition-colors p-1" title="Deletar Citação"><Trash2 className="size-3.5" /></button>
             <button onClick={() => setCurrentIndex((prev) => (prev + 1) % quotes.length)} className="text-[#71717A] hover:text-white text-xs">Próx &rarr;</button>
           </div>
        </div>
      ) : (
        <div className="relative z-20 w-full max-w-xl bg-[#0A0A0C]/90 backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
           <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2 uppercase tracking-widest"><Quote className="size-4" /> Registrar Sabedoria</h4>
              <button onClick={() => setIsAdding(false)} className="text-[#71717A] hover:text-white"><X className="size-4" /></button>
           </div>
           <textarea 
             value={newText} onChange={e => setNewText(e.target.value)}
             placeholder="A citação, reflexão ou ideia do autor..."
             className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none resize-none h-28 mb-3 font-serif italic leading-relaxed"
           />
           <input 
             type="text" value={newAuthor} onChange={e => setNewAuthor(e.target.value)}
             placeholder="Nome do Autor (ex: Sêneca, Platão, Marcus Aurelius)..."
             className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none mb-6 uppercase tracking-widest font-bold"
           />
           <div className="flex justify-end">
             <button 
               onClick={handleAdd}
               className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(217,119,6,0.3)] transition-all flex items-center gap-2"
             >
               Guardar no Cosmos <Plus className="size-3" />
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
