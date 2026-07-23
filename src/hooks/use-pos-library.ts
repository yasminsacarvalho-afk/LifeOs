import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  status: string; // 'quero_ler', 'lendo', 'pausado', 'concluido', 'abandonado'
  pages_read: number;
  total_pages: number | null;
  estimated_time_minutes: number | null;
  rating: number | null;
  summary: string | null;
  cover_url: string | null;
  buy_link: string | null;
  acquisition_date: string | null;
  start_date: string | null;
  end_date: string | null;
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

      if (booksData) setBooks(booksData);
      if (sessionsData) setSessions(sessionsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addBook = async (book: Partial<PosBook>) => {
    try {
      const { data, error } = await supabase
        .from('pos_library')
        .insert([{ ...book, pages_read: 0, status: book.status || 'quero_ler' }])
        .select()
        .single();

      if (error) throw error;
      if (data) setBooks([data, ...books]);
      toast.success("Livro adicionado ao acervo!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao adicionar livro: " + error.message);
      return null;
    }
  };

  const updateBook = async (id: string, updates: Partial<PosBook>) => {
    try {
      const { data, error } = await supabase
        .from('pos_library')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) setBooks(books.map(b => b.id === id ? data : b));
      toast.success("Acervo atualizado!");
    } catch (error: any) {
      toast.error("Erro ao atualizar livro: " + error.message);
    }
  };

  const deleteBook = async (id: string) => {
    try {
      const { error } = await supabase.from('pos_library').delete().eq('id', id);
      if (error) throw error;
      setBooks(books.filter(b => b.id !== id));
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
        setSessions([data, ...sessions]);
        
        // Auto-update book progress
        const book = books.find(b => b.id === session.book_id);
        if (book) {
           const newPagesRead = (book.pages_read || 0) + (session.pages_read || 0);
           const isFinished = book.total_pages && newPagesRead >= book.total_pages;
           const newStatus = isFinished ? 'concluido' : 'lendo';
           await updateBook(book.id, { pages_read: newPagesRead, status: newStatus });
        }
        toast.success(`Sessão salva! ${session.pages_read} páginas absorvidas.`);
      }
      return data;
    } catch (error: any) {
      toast.error("Erro ao registrar leitura: " + error.message);
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

      // 2. Resetar os dados do livro
      const { data: bookData, error: bookError } = await supabase
        .from('pos_library')
        .update({ pages_read: 0, status: 'quero_ler' })
        .eq('id', bookId)
        .select()
        .single();

      if (bookError) throw bookError;

      if (bookData) {
        setBooks(books.map(b => b.id === bookId ? bookData : b));
        setSessions(sessions.filter(s => s.book_id !== bookId));
        toast.success("Registro de leitura zerado com sucesso.");
      }
    } catch (error: any) {
      toast.error("Erro ao resetar registro: " + error.message);
    }
  };

  return { books, sessions, loading, addBook, updateBook, deleteBook, addReadingSession, resetBookProgress };
}
