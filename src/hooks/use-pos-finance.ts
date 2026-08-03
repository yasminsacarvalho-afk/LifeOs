import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export interface PosBudget {
  id: string;
  name: string;
  amount_limit: number;
  period: string;
  created_at?: string;
}

export interface PosCreditCard {
  id: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  created_at?: string;
}

export interface PosExpense {
  id: string;
  budget_id: string;
  card_id?: string | null;
  title: string;
  amount: number;
  expense_date: string;
  created_at?: string;
}

export function usePosFinance() {
  const [budgets, setBudgets] = useState<PosBudget[]>([]);
  const [creditCards, setCreditCards] = useState<PosCreditCard[]>([]);
  const [expenses, setExpenses] = useState<PosExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      
      const [budgetsRes, cardsRes, expensesRes] = await Promise.all([
        supabase.from('pos_budgets').select('*').order('created_at', { ascending: true }),
        supabase.from('pos_credit_cards').select('*').order('created_at', { ascending: true }),
        supabase.from('pos_expenses').select('*').order('expense_date', { ascending: false })
      ]);

      if (budgetsRes.error && budgetsRes.error.code !== '42P01') {
        console.error("Error fetching budgets:", budgetsRes.error);
      }
      if (cardsRes.error && cardsRes.error.code !== '42P01') {
        console.error("Error fetching cards:", cardsRes.error);
      }
      if (expensesRes.error && expensesRes.error.code !== '42P01') {
        console.error("Error fetching expenses:", expensesRes.error);
      }

      if (budgetsRes.data) setBudgets(budgetsRes.data);
      if (cardsRes.data) setCreditCards(cardsRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addBudget = async (budget: Partial<PosBudget>) => {
    try {
      const { data, error } = await supabase
        .from('pos_budgets')
        .insert([{ ...budget, period: budget.period || 'mensal' }])
        .select()
        .single();

      if (error) throw error;
      if (data) setBudgets([...budgets, data]);
      toast.success("Orçamento criado!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao criar orçamento: " + error.message);
      return null;
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const { error } = await supabase.from('pos_budgets').delete().eq('id', id);
      if (error) throw error;
      setBudgets(budgets.filter(b => b.id !== id));
      toast.success("Orçamento removido!");
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const addCreditCard = async (card: Partial<PosCreditCard>) => {
    try {
      const { data, error } = await supabase
        .from('pos_credit_cards')
        .insert([card])
        .select()
        .single();

      if (error) throw error;
      if (data) setCreditCards([...creditCards, data]);
      toast.success("Cartão adicionado!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao adicionar cartão: " + error.message);
      return null;
    }
  };

  const updateCreditCard = async (id: string, updates: Partial<PosCreditCard>) => {
    try {
      const { data, error } = await supabase
        .from('pos_credit_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCreditCards(creditCards.map(c => c.id === id ? data : c));
        toast.success("Cartão atualizado!");
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar cartão: " + error.message);
    }
  };

  const deleteCreditCard = async (id: string) => {
    try {
      const { error } = await supabase.from('pos_credit_cards').delete().eq('id', id);
      if (error) throw error;
      setCreditCards(creditCards.filter(c => c.id !== id));
      toast.success("Cartão removido!");
    } catch (error: any) {
      toast.error("Erro ao remover cartão: " + error.message);
    }
  };

  const addExpense = async (expense: Partial<PosExpense>) => {
    try {
      const payload: any = {
        ...expense,
        expense_date: expense.expense_date || format(new Date(), 'yyyy-MM-dd')
      };
      
      if (payload.card_id === "") {
        payload.card_id = null;
      }
      
      if (!payload.budget_id) {
        payload.budget_id = null;
      }

      let { data, error } = await supabase
        .from('pos_expenses')
        .insert([payload])
        .select()
        .single();

      // Fallback for schema cache issue
      if (error && error.message.includes("Could not find the 'card_id' column")) {
        console.warn("Schema cache missing card_id, retrying without it...");
        delete payload.card_id;
        
        const retry = await supabase
          .from('pos_expenses')
          .insert([payload])
          .select()
          .single();
          
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      if (data) {
        setExpenses([data, ...expenses]);
        
        // Sincroniza com Lançamentos Recentes (financial_records)
        try {
          const budget = budgets.find(b => b.id === expense.budget_id);
          const categoryName = budget ? budget.name : "Sem Orçamento";
          
          await supabase.from('financial_records').insert([{
            type: 'expense',
            context: 'personal',
            description: expense.title || 'Despesa Pessoal',
            category: categoryName,
            amount: expense.amount || 0,
            date: payload.expense_date,
            paid: payload.card_id ? false : true,
            is_recurring: false
          }]);
        } catch (syncErr) {
          console.error("Erro ao sincronizar com Lançamentos Recentes:", syncErr);
        }
      }
      toast.success("Despesa registrada!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao registrar: " + error.message);
      return null;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('pos_expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
      toast.success("Despesa removida!");
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  return { 
    budgets, 
    creditCards,
    expenses, 
    loading, 
    addBudget, 
    deleteBudget, 
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    addExpense, 
    deleteExpense, 
    fetchFinanceData 
  };
}
