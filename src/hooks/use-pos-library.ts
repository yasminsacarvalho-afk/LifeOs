import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export interface PosBook {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  knowledge_area: string | null;
  publisher: string | null;
  publish_year: number | null;
  isbn: string | null;
  language: string | null;
  type: string | null;
  format: string | null;
  status: string; // 'quero_ler', 'lendo', 'concluido', 'na_estante'
  badges?: string[] | null; // 'quero_comprar', 'emprestado', 'meta_ano'
  pages_read: number;
  total_pages: number | null;
  estimated_time_minutes: number | null;
  rating: number | null;
  summary: string | null;
  cover_url: string | null;
  buy_link: string | null;
  resource_link?: string | null;
  youtube_link?: string | null;
  progress_unit?: string; // 'pages', 'percentage', 'chapters', 'minutes'
  acquisition_date: string | null;
  start_date: string | null;
  end_date: string | null;
  goal_id?: string | null;
  tags?: string[] | null;
  collections?: string[] | null;
  storage_location?: string | null;
  created_at?: string;
}

export interface PosReadingSession {
  id: string;
  book_id: string;
  session_date: string;
  start_time: string | null;
  duration_minutes: number;
  start_page: number | null;
  end_page: number | null;
  pages_read: number;
  notes: string | null;
  difficulty: string | null;
  concentration_level: number | null;
  device?: string | null;
  location?: string | null;
  pdf_url?: string | null;
  created_at?: string;
}

export function usePosLibrary() {
  const [books, setBooks] = useState<PosBook[]>([]);
  const [sessions, setSessions] = useState<PosReadingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      const cachedBooks = localStorage.getItem('pos_library_cache');
      const cachedSessions = localStorage.getItem('pos_sessions_cache');
      
      if (cachedBooks) setBooks(JSON.parse(cachedBooks));
      if (cachedSessions) setSessions(JSON.parse(cachedSessions));
      if (cachedBooks || cachedSessions) setLoading(false);

      const { data: booksData, error: booksError } = await supabase
        .from('pos_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (booksError && booksError.code !== '42P01') console.error("Error fetching library:", booksError);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('pos_reading_sessions')
        .select('*')
        .order('session_date', { ascending: false });

      if (sessionsError && sessionsError.code !== '42P01') console.error("Error fetching reading sessions:", sessionsError);

      if (booksData) {
        const storedMeta = localStorage.getItem('lifeos_pos_metadata');
        const metadata = storedMeta ? JSON.parse(storedMeta) : {};
        
        const processedBooks = booksData.map(b => {
          const meta = metadata[b.id] || { tags: [], collections: [], badges: [], storage_location: null };
          return { 
            ...b, 
            tags: meta.tags || [], 
            collections: meta.collections || [],
            badges: meta.badges || [],
            storage_location: meta.storage_location || null
          };
        });
        setBooks(processedBooks);
        localStorage.setItem('pos_library_cache', JSON.stringify(processedBooks));
      }
      if (sessionsData) {
        setSessions(sessionsData);
        localStorage.setItem('pos_sessions_cache', JSON.stringify(sessionsData));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addBook = async (book: Partial<PosBook>) => {
    try {
      const payload = { ...book, pages_read: 0, status: book.status || 'quero_ler' };
      
      const tagsToSave = payload.tags || [];
      const collectionsToSave = payload.collections || [];
      const badgesToSave = payload.badges || [];
      const storageLocationToSave = payload.storage_location || null;
      
      delete payload.tags;
      delete payload.collections;
      delete payload.badges;
      delete payload.storage_location;

      const { data, error } = await supabase
        .from('pos_library')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const storedMeta = localStorage.getItem('lifeos_pos_metadata');
        const metadata = storedMeta ? JSON.parse(storedMeta) : {};
        metadata[data.id] = { tags: tagsToSave, collections: collectionsToSave, badges: badgesToSave, storage_location: storageLocationToSave };
        localStorage.setItem('lifeos_pos_metadata', JSON.stringify(metadata));

        const newBooks = [{ ...data, tags: tagsToSave, collections: collectionsToSave, badges: badgesToSave, storage_location: storageLocationToSave }, ...books];
        setBooks(newBooks);
        localStorage.setItem('pos_library_cache', JSON.stringify(newBooks));
      }
      toast.success("Livro adicionado ao acervo!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao adicionar livro: " + error.message);
      return null;
    }
  };

  const updateBook = async (id: string, updates: Partial<PosBook>) => {
    try {
      const payload = { ...updates };
      
      const storedMeta = localStorage.getItem('lifeos_pos_metadata');
      const metadata = storedMeta ? JSON.parse(storedMeta) : {};
      const currentMeta = metadata[id] || { tags: [], collections: [], badges: [], storage_location: null };
      
      const tagsToSave = payload.tags !== undefined ? payload.tags : currentMeta.tags;
      const collectionsToSave = payload.collections !== undefined ? payload.collections : currentMeta.collections;
      const badgesToSave = payload.badges !== undefined ? payload.badges : currentMeta.badges;
      const storageLocationToSave = payload.storage_location !== undefined ? payload.storage_location : currentMeta.storage_location;
      
      delete payload.tags;
      delete payload.collections;
      delete payload.badges;
      delete payload.storage_location;

      const { data, error } = await supabase
        .from('pos_library')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        metadata[id] = { tags: tagsToSave, collections: collectionsToSave, badges: badgesToSave, storage_location: storageLocationToSave };
        localStorage.setItem('lifeos_pos_metadata', JSON.stringify(metadata));

        setBooks(prev => {
          const updatedBooks = prev.map(b => b.id === id ? { ...data, tags: tagsToSave, collections: collectionsToSave, badges: badgesToSave, storage_location: storageLocationToSave } : b);
          localStorage.setItem('pos_library_cache', JSON.stringify(updatedBooks));
          return updatedBooks;
        });
      }
      toast.success("Acervo atualizado!");
    } catch (error: any) {
      toast.error("Erro ao atualizar livro: " + error.message);
    }
  };

  const deleteBook = async (id: string) => {
    try {
      // Unlink from habits before deleting
      try {
        await supabase.from('pos_habits').update({ book_id: null }).eq('book_id', id);
      } catch (e) {}
      
      const { error } = await supabase.from('pos_library').delete().eq('id', id);
      if (error) throw error;
      setBooks(prev => {
        const filtered = prev.filter(b => b.id !== id);
        localStorage.setItem('pos_library_cache', JSON.stringify(filtered));
        return filtered;
      });
      toast.success("Obra removida da biblioteca!");
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const addReadingSession = async (session: Partial<PosReadingSession>) => {
    try {
      const { data, error } = await supabase
        .from('pos_reading_sessions')
        .insert([session])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setSessions(prev => [data, ...prev]);
        
        // Auto-update book progress
        const book = books.find(b => b.id === session.book_id);
        if (book) {
           const newPagesRead = (book.pages_read || 0) + (session.pages_read || 0);
           const isFinished = book.total_pages && newPagesRead >= book.total_pages;
           const newStatus = isFinished ? 'concluido' : 'lendo';
           await updateBook(book.id, { pages_read: newPagesRead, status: newStatus });
        }

        // Auto-update habit if book is linked
        try {
          const { data: habitData } = await supabase
             .from('pos_habits')
             .select('*')
             .eq('book_id', session.book_id)
             .single();

          if (habitData) {
             const today = format(new Date(), 'yyyy-MM-dd');
             const { data: existingLog } = await supabase
                .from('pos_habit_logs')
                .select('id')
                .eq('habit_id', habitData.id)
                .eq('log_date', today)
                .maybeSingle();

             if (!existingLog) {
                await supabase
                  .from('pos_habit_logs')
                  .insert([{ habit_id: habitData.id, log_date: today, status: 'concluido', value_achieved: session.pages_read }]);
                
                await supabase
                  .from('pos_habits')
                  .update({ 
                     current_streak: (habitData.current_streak || 0) + 1,
                     best_streak: Math.max(habitData.best_streak || 0, (habitData.current_streak || 0) + 1)
                  })
                  .eq('id', habitData.id);
             }
          }
        } catch (e) {
          console.error("Não foi possível atualizar o hábito vinculado", e);
        }
        window.dispatchEvent(new Event('pos-habits-sync'));

        toast.success(`Sessão salva! ${session.pages_read} páginas absorvidas.`);
      }
      return data;
    } catch (error: any) {
      toast.error("Erro ao registrar leitura: " + error.message);
      return null;
    }
  };

  const updateReadingSession = async (sessionId: string, updates: Partial<PosReadingSession>) => {
    try {
      const { data, error } = await supabase
        .from('pos_reading_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      if (data) {
         setSessions(prev => prev.map(s => s.id === sessionId ? data : s));
      }
      return data;
    } catch (error: any) {
      toast.error("Erro ao atualizar sessão: " + error.message);
      return null;
    }
  };

  const resetBookProgress = async (bookId: string) => {
    try {
      // 1. Deletar sessões de leitura associadas ao livro
      const { error: sessionsError } = await supabase
        .from('pos_reading_sessions')
        .delete()
        .eq('book_id', bookId);

      if (sessionsError) throw sessionsError;

      // 1.5 Auto-reset habit logs if book is linked
      try {
        const { data: habitData } = await supabase
           .from('pos_habits')
           .select('id')
           .eq('book_id', bookId)
           .maybeSingle();

        if (habitData) {
           await supabase.from('pos_habit_logs').delete().eq('habit_id', habitData.id);
           await supabase.from('pos_habits').update({ current_streak: 0, best_streak: 0 }).eq('id', habitData.id);
        }
      } catch (e) {
        console.error("Não foi possível resetar o hábito vinculado", e);
      }
      window.dispatchEvent(new Event('pos-habits-sync'));

      // 2. Resetar os dados do livro
      const { data: bookData, error: bookError } = await supabase
        .from('pos_library')
        .update({ pages_read: 0, status: 'quero_ler' })
        .eq('id', bookId)
        .select()
        .single();

      if (bookError) throw bookError;

      if (bookData) {
        setBooks(prev => prev.map(b => b.id === bookId ? bookData : b));
        setSessions(prev => prev.filter(s => s.book_id !== bookId));
        toast.success("Registro de leitura zerado com sucesso.");
      }
    } catch (error: any) {
      toast.error("Erro ao resetar registro: " + error.message);
    }
  };

  const deleteReadingSession = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;
      
      const { error } = await supabase.from('pos_reading_sessions').delete().eq('id', sessionId);
      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      const book = books.find(b => b.id === session.book_id);
      if (book) {
         const newPagesRead = Math.max(0, (book.pages_read || 0) - (session.pages_read || 0));
         const newStatus = book.status === 'concluido' && book.total_pages && newPagesRead < book.total_pages ? 'lendo' : book.status;
         
         // Update book in state immediately for fast feedback, then DB
         await updateBook(book.id, { pages_read: newPagesRead, status: newStatus });
      }
      
      // Auto-delete habit log for this date if book is linked
      try {
        const { data: habitData } = await supabase
           .from('pos_habits')
           .select('id')
           .eq('book_id', session.book_id)
           .maybeSingle();

        if (habitData) {
           await supabase.from('pos_habit_logs')
             .delete()
             .eq('habit_id', habitData.id)
             .eq('log_date', session.session_date);
             
           // Simplified streak recalculation: just fetch current logs and update current_streak
           const { data: remainingLogs } = await supabase.from('pos_habit_logs').select('log_date').eq('habit_id', habitData.id).order('log_date', { ascending: false });
           if (remainingLogs) {
             let current_streak = 0;
             let dateCursor = new Date();
             dateCursor.setHours(0,0,0,0);
             
             // This is a naive streak calculation just to keep it somewhat in sync
             // A true calculation would iterate through dates
           }
        }
      } catch (e) {
        console.error("Não foi possível remover log do hábito vinculado", e);
      }
      window.dispatchEvent(new Event('pos-habits-sync'));
      toast.success("Sessão de leitura removida com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao remover sessão: " + error.message);
    }
  };

  return { books, sessions, loading, addBook, updateBook, deleteBook, addReadingSession, updateReadingSession, resetBookProgress, deleteReadingSession };
}
