import React, { useState, useMemo } from 'react';
import { PosBook } from '@/hooks/use-pos-library';
import { Layers, BookMarked, X } from 'lucide-react';

interface PosLibraryCollectionsProps {
  books: PosBook[];
}

export function PosLibraryCollections({ books }: PosLibraryCollectionsProps) {
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  // Extrair e contar coleções, além de salvar as capas dos livros
  const collectionsMap: Record<string, { count: number; covers: string[] }> = {};
  
  books.forEach(b => {
    if (b.collections && Array.isArray(b.collections)) {
      b.collections.forEach(c => {
        if (!c) return;
        if (!collectionsMap[c]) {
          collectionsMap[c] = { count: 0, covers: [] };
        }
        collectionsMap[c].count += 1;
        if (b.cover_url && collectionsMap[c].covers.length < 3) {
          // Salvar as primeiras 3 capas encontradas para a coleção
          collectionsMap[c].covers.push(b.cover_url);
        }
      });
    }
  });

  const collectionsList = Object.entries(collectionsMap).sort((a, b) => b[1].count - a[1].count);

  const collectionBooks = useMemo(() => {
    if (!activeCollection) return [];
    return books.filter(b => b.collections && Array.isArray(b.collections) && b.collections.includes(activeCollection));
  }, [books, activeCollection]);

  if (collectionsList.length === 0) return null;

  return (
    <div className="w-full mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="size-5 text-indigo-400" /> Suas Coleções
        </h3>
        <div className="h-px bg-gradient-to-r from-indigo-500/20 to-transparent flex-1 ml-6"></div>
      </div>

      {/* Grid 3D Container */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 p-4">
        {collectionsList.map(([name, data], idx) => {
          const { count, covers } = data;
          
          // Cores dinâmicas para fallback caso a coleção não tenha livros com capa
          const colors = [
            'from-indigo-600 to-purple-900 border-indigo-500/50 shadow-indigo-900/50',
            'from-emerald-600 to-teal-900 border-emerald-500/50 shadow-emerald-900/50',
            'from-rose-600 to-red-900 border-rose-500/50 shadow-rose-900/50',
            'from-amber-600 to-orange-900 border-amber-500/50 shadow-amber-900/50',
            'from-cyan-600 to-blue-900 border-cyan-500/50 shadow-cyan-900/50',
            'from-fuchsia-600 to-pink-900 border-fuchsia-500/50 shadow-fuchsia-900/50',
          ];
          const colorSet = colors[idx % colors.length];

          return (
            <div 
              key={name}
              className="relative group h-48 md:h-56 cursor-pointer"
              style={{ perspective: '1000px' }}
              onClick={() => setActiveCollection(name)}
            >
              {/* O Card 3D em si */}
              <div 
                className={`w-full h-full absolute inset-0 ${covers.length > 0 ? 'bg-[#0A0A0C] border-[rgba(255,255,255,0.05)]' : `bg-gradient-to-br ${colorSet}`} rounded-2xl border flex flex-col justify-between p-4 transition-all duration-500 ease-out overflow-hidden`}
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: 'rotateX(15deg) rotateY(-15deg) translateZ(0)',
                  boxShadow: '-10px 15px 25px -5px rgba(0,0,0,0.8), inset 0 0 10px rgba(255,255,255,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(30px)';
                  e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.9), inset 0 0 20px rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'rotateX(15deg) rotateY(-15deg) translateZ(0)';
                  e.currentTarget.style.boxShadow = '-10px 15px 25px -5px rgba(0,0,0,0.8), inset 0 0 10px rgba(255,255,255,0.1)';
                }}
              >
                {/* Múltiplas Capas (Até 3) */}
                {covers.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center transition-transform duration-700 pointer-events-none group-hover:scale-105" style={{ transformStyle: 'preserve-3d' }}>
                    {covers.map((cov, i) => (
                      <div 
                        key={i}
                        className="absolute w-20 h-32 md:w-24 md:h-36 rounded-lg shadow-2xl bg-cover bg-center border border-white/20 transition-all duration-700"
                        style={{ 
                          backgroundImage: `url(${cov})`,
                          transform: `rotate(${(i - (covers.length - 1) / 2) * 15}deg) translateX(${(i - (covers.length - 1) / 2) * 30}px) translateZ(${i * 15}px)`,
                          zIndex: i
                        }}
                      />
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/40 to-transparent z-10" />
                  </div>
                )}

                {/* Ícone flutuante interno */}
                <div 
                  className="bg-black/40 w-fit p-2 rounded-lg backdrop-blur-md relative z-10 border border-[rgba(255,255,255,0.05)] shadow-lg"
                  style={{ transform: 'translateZ(20px)' }}
                >
                  <BookMarked className="size-5 text-white/90" />
                </div>
                
                {/* Textos flutuantes internos */}
                <div className="relative z-10" style={{ transform: 'translateZ(30px)' }}>
                  <h4 className="text-white font-black text-lg md:text-xl leading-tight line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-indigo-300 transition-colors">
                    {name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-px bg-white/20 flex-1"></div>
                    <p className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                      {count} {count === 1 ? 'Livro' : 'Livros'}
                    </p>
                  </div>
                </div>

                {/* Brilho reflexivo sobre o vidro */}
                <div 
                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
                  style={{ transform: 'translateZ(40px)' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal da Coleção */}
      {activeCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm" onClick={() => setActiveCollection(null)} />
           <div className="relative z-10 w-full max-w-5xl bg-[#0A0A0C]/90 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
             
             <div className="flex items-start justify-between mb-8 pb-6 border-b border-[rgba(255,255,255,0.05)]">
                <div>
                   <h2 className="text-3xl md:text-4xl font-black text-white flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                         <Layers className="size-8 text-indigo-400" /> 
                      </div>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{activeCollection}</span>
                   </h2>
                   <p className="text-[#A1A1AA] mt-3 font-medium tracking-wide">
                      Você tem <strong className="text-white">{collectionBooks.length}</strong> {collectionBooks.length === 1 ? 'livro' : 'livros'} nesta coleção.
                   </p>
                </div>
                <button onClick={() => setActiveCollection(null)} className="p-3 bg-[#1A1A1E] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-400 rounded-xl transition-colors border border-[rgba(255,255,255,0.05)]">
                  <X className="size-6" />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
                   {collectionBooks.map(book => (
                      <div key={book.id} className="flex flex-col gap-4 group cursor-pointer" onClick={() => {
                        // Se o usuário quiser ir para os detalhes, podemos disparar um scroll pra seção Histórico ou fechar e abrir.
                        // No momento apenas mantemos a visualização visual.
                      }}>
                         <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#111113] border border-[rgba(255,255,255,0.05)] relative shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                            {book.cover_url ? (
                              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:brightness-110" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/10 bg-gradient-to-br from-[#111113] to-[#1A1A1E]">
                                <BookMarked className="size-12" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                              <span className="text-xs font-black uppercase tracking-widest text-indigo-400 drop-shadow-md">Parte da Coleção</span>
                            </div>
                         </div>
                         <div className="px-1">
                            <h4 className="text-sm md:text-base font-bold text-white line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors drop-shadow-md">{book.title}</h4>
                            <p className="text-xs text-[#A1A1AA] mt-1.5 font-medium tracking-wide line-clamp-1">{book.author}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

           </div>
        </div>
      )}
    </div>
  );
}
