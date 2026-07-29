import React, { useState } from "react";
import { format, isThisMonth, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  DollarSign, Plus, X, Trash2, TrendingDown, 
  CreditCard, Wallet, Receipt, Activity, Edit2,
  ArrowUp, ArrowDown, Layers, RefreshCcw, Clock3, Clock, BarChart3, CheckCircle2, Mic, MicOff, Building2
} from "lucide-react";
import { usePosFinance, PosCreditCard } from "@/hooks/use-pos-finance";
import { useTreasuryRealtime } from "@/hooks/use-treasury-realtime";
import { FinanceDashboard } from "@/routes/finance";

interface KpiCardProps {
  type: "receitas" | "despesas" | "parceladas" | "recorrentes" | "atrasadas" | "pagas";
  badgeText: string;
  value?: number;
  subtitle?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  children?: React.ReactNode;
}

function FinancialKpiCard({ type, badgeText, value, subtitle, emptyTitle, emptySubtitle, children }: KpiCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStyles = () => {
    switch(type) {
      case "receitas": return { icon: <ArrowUp className="size-6" />, color: "text-[#22C55E]", bg: "bg-[#22C55E]/12", badgeBg: "bg-[#22C55E]/12" };
      case "despesas": return { icon: <ArrowDown className="size-6" />, color: "text-[#EF4444]", bg: "bg-[#EF4444]/12", badgeBg: "bg-[#EF4444]/12" };
      case "parceladas": return { icon: <Layers className="size-6" />, color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/12", badgeBg: "bg-[#3B82F6]/12" };
      case "recorrentes": return { icon: <RefreshCcw className="size-6" />, color: "text-[#A855F7]", bg: "bg-[#A855F7]/12", badgeBg: "bg-[#A855F7]/12" };
      case "atrasadas": return { icon: <Clock3 className="size-6" />, color: "text-[#F87171]", bg: "bg-[#F87171]/12", badgeBg: "bg-[#F87171]/12" };
      case "pagas": return { icon: <Clock className="size-6" />, color: "text-[#22C55E]", bg: "bg-[#22C55E]/12", badgeBg: "bg-[#22C55E]/12" };
      default: return { icon: <Activity className="size-6" />, color: "text-white", bg: "bg-white/10", badgeBg: "bg-white/10" };
    }
  };

  const styles = getStyles();
  const hasData = value !== undefined && value !== null && !isNaN(value);

  return (
    <div className="bg-[#17171A] border border-[rgba(255,255,255,0.05)] rounded-[22px] p-6 min-h-[180px] flex flex-col justify-between hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.08)] active:scale-[0.99] transition-all duration-180 w-full group cursor-default">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className={cn("size-[52px] rounded-2xl flex items-center justify-center shrink-0", styles.bg, styles.color)}>
          {styles.icon}
        </div>
        <div className={cn("px-[14px] py-[8px] rounded-full text-[12px] font-semibold leading-none", styles.badgeBg, styles.color)}>
          {badgeText}
        </div>
      </div>

      {/* Content */}
      <div className="mt-auto flex flex-col justify-end">
        {hasData ? (
          <div>
            <div className="text-[40px] font-bold text-white leading-none tracking-tight">
              {formatCurrency(value)}
            </div>
            {subtitle && (
              <div className="text-[15px] text-[#A1A1AA] mt-1 font-normal">
                {subtitle}
              </div>
            )}
            {children}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="size-10 md:size-[48px] rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center shrink-0">
                <BarChart3 className="size-[18px] text-[#9CA3AF]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[16px] md:text-[20px] font-semibold text-white leading-tight">
                  {emptyTitle || "Sem dados"}
                </span>
                <span className="text-[12px] md:text-[14px] text-[#9CA3AF] font-normal leading-tight mt-0.5">
                  {emptySubtitle || "Nenhuma informação disponível"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export function PosFinance() {
  const { 
    budgets, creditCards, expenses, loading, 
    addBudget, deleteBudget, 
    addCreditCard, updateCreditCard, deleteCreditCard,
    addExpense, deleteExpense 
  } = usePosFinance();
  
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    
    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      
      const numbers = text.match(/\d+(?:[.,]\d+)?/g);
      let title = text;
      let amount = newExpense.amount;
      
      if (numbers && numbers.length > 0) {
        amount = numbers[numbers.length - 1].replace(',', '.');
        title = text.replace(numbers[numbers.length - 1], '').replace(/reais|centavos|de|por/gi, '').trim();
      }
      
      setNewExpense(prev => ({
        ...prev,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        amount: amount
      }));
    };
    
    recognition.start();
  };

  const { accounts: treasuryAccounts } = useTreasuryRealtime();
  const saldoTesouraria = treasuryAccounts.reduce((acc, a) => acc + Number(a.balance), 0);

  // Form states
  const [newBudget, setNewBudget] = useState({ name: "", amount_limit: "" });
  const [newExpense, setNewExpense] = useState({ title: "", amount: "", budget_id: "", card_id: "", payment_method: "dinheiro", expense_date: format(new Date(), 'yyyy-MM-dd') });
  const [newCard, setNewCard] = useState({ name: "", limit_amount: "", closing_day: "", due_day: "" });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.name || !newBudget.amount_limit) return;
    
    await addBudget({
      name: newBudget.name,
      amount_limit: Number(newBudget.amount_limit)
    });
    
    setIsBudgetModalOpen(false);
    setNewBudget({ name: "", amount_limit: "" });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount || !newExpense.budget_id) return;

    let finalTitle = newExpense.title;
    if (newExpense.payment_method === 'cartao') {
      finalTitle += ' (💳 Cartão)';
    } else {
      finalTitle += ' (💵 Dinheiro/Pix)';
    }

    await addExpense({
      title: finalTitle,
      amount: Number(newExpense.amount),
      budget_id: newExpense.budget_id,
      card_id: newExpense.payment_method === 'cartao' && newExpense.card_id ? newExpense.card_id : null,
      expense_date: newExpense.expense_date
    });

    setIsExpenseModalOpen(false);
    setNewExpense({ title: "", amount: "", budget_id: "", card_id: "", payment_method: "dinheiro", expense_date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.name || !newCard.limit_amount || !newCard.closing_day || !newCard.due_day) return;

    await addCreditCard({
      name: newCard.name,
      limit_amount: Number(newCard.limit_amount),
      closing_day: Number(newCard.closing_day),
      due_day: Number(newCard.due_day)
    });

    setIsCardModalOpen(false);
    setNewCard({ name: "", limit_amount: "", closing_day: "", due_day: "" });
  };

  // Calculations for current month
  const currentMonthExpenses = expenses.filter(e => {
    if (!e.expense_date) return false;
    return isThisMonth(parseISO(e.expense_date));
  });

  const totalBudgetLimit = budgets.reduce((acc, b) => acc + (b.amount_limit || 0), 0);
  const totalSpent = currentMonthExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const remainingTotal = totalBudgetLimit - totalSpent;
  const totalPercent = totalBudgetLimit > 0 ? (totalSpent / totalBudgetLimit) * 100 : 0;

  const getBudgetCategoriesWithSpent = () => {
    return budgets.map(b => {
      const spent = currentMonthExpenses.filter(e => e.budget_id === b.id).reduce((acc, e) => acc + (e.amount || 0), 0);
      const remaining = b.amount_limit - spent;
      const percent = b.amount_limit > 0 ? (spent / b.amount_limit) * 100 : 0;
      
      let status = "verde";
      if (percent > 90) status = "vermelho";
      else if (percent > 70) status = "amarelo";

      return { ...b, spent, remaining, percent, status };
    });
  };

  const budgetsWithStats = getBudgetCategoriesWithSpent();

  // Cards calculation
  const getCardsWithStats = () => {
    return creditCards.map(c => {
      const invoiceTotal = currentMonthExpenses.filter(e => e.card_id === c.id).reduce((acc, e) => acc + (e.amount || 0), 0);
      const percent = c.limit_amount > 0 ? (invoiceTotal / c.limit_amount) * 100 : 0;
      const available = c.limit_amount - invoiceTotal;

      let status = "verde";
      if (percent > 90) status = "vermelho";
      else if (percent > 75) status = "amarelo";

      return { ...c, invoiceTotal, available, percent, status };
    });
  };

  const cardsWithStats = getCardsWithStats();
  const totalInvoice = cardsWithStats.reduce((acc, c) => acc + c.invoiceTotal, 0);

  const getIconForCategory = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('cart') || n.includes('card')) return <CreditCard className="size-5" />;
    if (n.includes('casa') || n.includes('conta')) return <Receipt className="size-5" />;
    if (n.includes('lazer') || n.includes('passeio')) return <Activity className="size-5" />;
    return <Wallet className="size-5" />;
  };

  return (
    <div className="w-full pb-24 relative overflow-x-hidden">
      
      {/* Finance Dashboard Integration */}
      <div className="w-full relative mt-2 mb-2">
        <FinanceDashboard 
          hideHeader={true} 
          onNewBudget={() => setIsBudgetModalOpen(true)}
          onNewCard={() => setIsCardModalOpen(true)}
          onNewPersonalExpense={() => {
            if (budgets.length === 0) {
              alert("Crie um orçamento primeiro!");
              return;
            }
            setNewExpense(prev => ({ ...prev, budget_id: budgets[0].id }));
            setIsExpenseModalOpen(true);
          }}
        />
      </div>

      {/* Personal Finance Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-[rgba(255,255,255,0.06)] flex-1"></div>
          <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest px-2">Gestão Pessoal</span>
          <div className="h-px bg-[rgba(255,255,255,0.06)] flex-1"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Budgets & Credit Cards */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          
          {/* Budgets Progress */}
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-white tracking-tight flex items-center gap-2">
                <Wallet className="size-5 text-emerald-500" /> Meus Orçamentos
              </h3>
            </div>

            {/* Global Overview */}
            {budgetsWithStats.length > 0 && (
              <div className="mb-8 p-5 bg-[#17171A] rounded-2xl border border-[rgba(255,255,255,0.03)]">
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] uppercase text-[#A1A1AA] font-bold tracking-widest mb-1">Gasto Global Mês</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalSpent)}</p>
                    <p className="text-xs text-[#71717A] mt-1">de {formatCurrency(totalBudgetLimit)} no total</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase text-[#A1A1AA] font-bold tracking-widest mb-1">Disponível Total</p>
                    <p className={cn("text-xl font-medium", remainingTotal < 0 ? "text-rose-500" : "text-emerald-500")}>
                      {formatCurrency(remainingTotal)}
                    </p>
                    <p className="text-xs text-[#71717A] mt-1">{totalPercent.toFixed(1)}% utilizado</p>
                  </div>
                </div>
                <div className="h-2 w-full bg-[#27272A] rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-700", totalPercent > 90 ? "bg-rose-500" : (totalPercent > 70 ? "bg-amber-500" : "bg-emerald-500"))}
                    style={{ width: `${Math.min(totalPercent, 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="text-[#A1A1AA] text-sm animate-pulse">Carregando orçamentos...</div>
            ) : budgetsWithStats.length === 0 ? (
              <div className="text-center p-8 bg-[#111113] border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl">
                <Wallet className="size-10 text-[#71717A] mx-auto mb-3" />
                <p className="text-[#A1A1AA] text-sm">Nenhum orçamento definido.</p>
                <button onClick={() => setIsBudgetModalOpen(true)} className="mt-4 text-rose-500 text-sm font-medium">Definir Orçamento</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {budgetsWithStats.map(budget => {
                  const recentBudgetExpenses = currentMonthExpenses.filter(e => e.budget_id === budget.id).slice(0, 2);
                  return (
                    <div key={budget.id} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.1)] transition-colors relative group flex flex-col justify-between">
                      <div>
                        <button 
                          onClick={() => deleteBudget(budget.id)}
                          className="absolute top-4 right-4 p-1.5 text-[#71717A] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        
                        <div className="flex gap-4 items-center mb-4">
                          <div className={cn("p-3 rounded-xl text-white", budget.percent > 90 ? "bg-rose-500/20 text-rose-500" : "bg-[#1A1A1E]")}>
                            {getIconForCategory(budget.name)}
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-white">{budget.name}</h4>
                            <p className="text-xs text-[#A1A1AA]">{formatCurrency(budget.amount_limit)} / mês</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-[#A1A1AA]">Gasto: {formatCurrency(budget.spent)}</span>
                            <span className={cn("font-medium", budget.percent > 90 ? "text-rose-500" : (budget.percent > 70 ? "text-amber-500" : "text-emerald-500"))}>
                              Restam {formatCurrency(budget.remaining > 0 ? budget.remaining : 0)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-700", budget.percent > 90 ? "bg-rose-500" : (budget.percent > 70 ? "bg-amber-500" : "bg-emerald-500"))}
                              style={{ width: `${Math.min(budget.percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {recentBudgetExpenses.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.04)]">
                          <p className="text-[10px] uppercase text-[#71717A] font-semibold mb-2 tracking-wider">Últimos Gastos</p>
                          <div className="flex flex-col gap-2">
                            {recentBudgetExpenses.map(exp => (
                              <div key={exp.id} className="flex justify-between items-center text-xs">
                                <span className="text-[#A1A1AA] truncate pr-2">{exp.title}</span>
                                <span className="text-white font-medium whitespace-nowrap">{formatCurrency(exp.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Faturas e Cartões */}
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl p-6 shadow-xl relative mt-2">
            <h3 className="text-lg font-medium text-white tracking-tight mb-4 flex items-center gap-2">
              <CreditCard className="size-5 text-[#3B82F6]" /> Faturas e Cartões
            </h3>

            {loading ? (
              <div className="text-[#A1A1AA] text-sm animate-pulse">Carregando cartões...</div>
            ) : cardsWithStats.length === 0 ? (
              <div className="text-center p-8 bg-[#111113] border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl">
                <CreditCard className="size-10 text-[#71717A] mx-auto mb-3" />
                <p className="text-[#A1A1AA] text-sm">Nenhum cartão cadastrado.</p>
                <button onClick={() => setIsCardModalOpen(true)} className="mt-4 text-[#3B82F6] text-sm font-medium">Cadastrar Cartão</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cardsWithStats.map(card => (
                  <div key={card.id} className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.1)] transition-colors relative group">
                    <button 
                      onClick={() => deleteCreditCard(card.id)}
                      className="absolute top-4 right-4 p-1.5 text-[#71717A] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-rose-500/10"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    
                    <div className="flex gap-4 items-center mb-4">
                      <div className="p-3 rounded-xl bg-[#1A1A1E] text-white">
                        <CreditCard className="size-5 text-[#3B82F6]" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-white">{card.name}</h4>
                        <p className="text-[10px] text-[#A1A1AA]">
                          Vencimento: dia {card.due_day}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-[#A1A1AA]">Fatura: <span className="text-white font-semibold">{formatCurrency(card.invoiceTotal)}</span></span>
                        <span className={cn("font-medium", card.percent > 90 ? "text-rose-500" : (card.percent > 75 ? "text-amber-500" : "text-emerald-500"))}>
                          Limite: {formatCurrency(card.limit_amount)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-700", card.percent > 90 ? "bg-rose-500" : (card.percent > 75 ? "bg-amber-500" : "bg-[#3B82F6]"))}
                          style={{ width: `${Math.min(card.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Insights & Recent Expenses */}
        <div className="col-span-1 flex flex-col gap-6">
          
          {/* AI Insights - Martin */}
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-16 bg-blue-500/10 blur-[60px] w-32 h-32 rounded-full pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="size-8 rounded-full bg-[#1A1A1E] flex items-center justify-center text-xs font-bold text-white border border-[rgba(255,255,255,0.1)] shadow-inner">
                M
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-none mb-1">Martin</h3>
                <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Analista Financeiro</p>
              </div>
            </div>

            <div className="space-y-5 relative z-10">
              {/* Insight 1: Metas de Receita */}
              <div>
                <h4 className="text-[11px] font-bold text-white mb-2 uppercase tracking-widest flex items-center gap-2">
                  <ArrowUp className="size-3 text-emerald-500" /> Metas de receita
                </h4>
                <div className="bg-[#17171A] rounded-xl p-4 border border-[rgba(255,255,255,0.03)] group transition-colors hover:border-[rgba(255,255,255,0.08)]">
                  <p className="text-sm text-[#A1A1AA] mb-3">Nenhuma meta de receita definida.</p>
                  <p className="text-xs text-white leading-relaxed font-medium pl-3 border-l-2 border-emerald-500/50 italic">
                    "Defina uma meta nas categorias de receita — eu acompanho as entradas e comemoro com você quando bater."
                  </p>
                </div>
              </div>

              {/* Insight 2: Mês contra Mês */}
              <div>
                <h4 className="text-[11px] font-bold text-white mb-2 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="size-3 text-[#3B82F6]" /> Mês contra mês
                </h4>
                <div className="bg-[#17171A] rounded-xl p-4 border border-[rgba(255,255,255,0.03)] group transition-colors hover:border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] mb-2 font-semibold uppercase tracking-wider">
                    <span>Despesas</span>
                    <span>Receitas</span>
                  </div>
                  <p className="text-sm text-[#A1A1AA] mb-3">Sem base de comparação em {format(subMonths(new Date(), 1), "MMMM", {locale: ptBR})}.</p>
                  <p className="text-xs text-white leading-relaxed font-medium pl-3 border-l-2 border-[#3B82F6]/50 italic">
                    "Quando {format(subMonths(new Date(), 1), "MMMM", {locale: ptBR})} tiver registros, eu comparo mês contra mês por categoria."
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-white tracking-tight mb-4 flex items-center gap-2">
              Despesas Recentes
            </h3>
          
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.04)] rounded-3xl overflow-hidden h-fit">
            {expenses.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#A1A1AA]">Nenhuma despesa registrada.</div>
            ) : (
              <div className="flex flex-col">
                {expenses.slice(0, 15).map((expense, i) => {
                  const budget = budgets.find(b => b.id === expense.budget_id);
                  const card = creditCards.find(c => c.id === expense.card_id);
                  
                  return (
                    <div key={expense.id} className={cn("flex items-center justify-between p-4 group", i !== expenses.length - 1 && "border-b border-[rgba(255,255,255,0.02)]")}>
                      <div className="flex items-center gap-3 w-full overflow-hidden pr-2">
                        <div className="size-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                          <TrendingDown className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white truncate">{expense.title}</div>
                          <div className="text-[10px] text-[#A1A1AA] mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="bg-[#1A1A1E] px-1.5 py-0.5 rounded text-[9px] truncate max-w-[80px]">{budget?.name || 'Geral'}</span>
                            {card && (
                              <span className="bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1 truncate max-w-[80px]">
                                <CreditCard className="size-2.5 shrink-0" /> {card.name}
                              </span>
                            )}
                            <span className="shrink-0">{format(parseISO(expense.expense_date), "dd/MM")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-sm font-semibold text-white whitespace-nowrap">
                          {formatCurrency(expense.amount)}
                        </div>
                        <button 
                          onClick={() => deleteExpense(expense.id)}
                          className="p-1.5 text-[#71717A] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
      {/* Create Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0">
          <div className="bg-[#070707] w-full max-w-md rounded-t-[28px] sm:rounded-[28px] border border-[rgba(255,255,255,0.06)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <div className="p-6 border-b border-[rgba(255,255,255,0.05)] flex justify-between items-center bg-[#17171A]">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-[#22C55E]/10 rounded-xl flex items-center justify-center text-[#22C55E]">
                  <Wallet className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Novo Orçamento</h3>
              </div>
              <button onClick={() => setIsBudgetModalOpen(false)} className="size-10 flex items-center justify-center text-[#A1A1AA] hover:text-white rounded-full bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddBudget} className="p-8 flex flex-col gap-6">
              <div>
                <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Nome da Categoria</label>
                <input 
                  type="text" 
                  value={newBudget.name}
                  onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                  className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#22C55E] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors"
                  placeholder="Ex: Lazer, Casa"
                  required
                />
              </div>
              
              <div>
                <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Limite Mensal (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newBudget.amount_limit}
                  onChange={(e) => setNewBudget({ ...newBudget, amount_limit: e.target.value })}
                  className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#22C55E] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors"
                  placeholder="1500.00"
                  required
                />
              </div>

              <div className="mt-2 flex justify-end">
                <button 
                  type="submit"
                  className="h-[46px] px-7 bg-[#171717] hover:bg-[#232323] border border-[rgba(255,255,255,0.08)] rounded-[14px] text-white font-medium flex items-center gap-2 transition-colors w-full justify-center"
                >
                  <CheckCircle2 className="size-5" /> Salvar Orçamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0">
          <div className="bg-[#070707] w-full max-w-md rounded-t-[28px] sm:rounded-[28px] border border-[rgba(255,255,255,0.06)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <div className="p-6 border-b border-[rgba(255,255,255,0.05)] flex justify-between items-center bg-[#17171A]">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-[#EF4444]/10 rounded-xl flex items-center justify-center text-[#EF4444]">
                  <ArrowDown className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Nova Despesa</h3>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="size-10 flex items-center justify-center text-[#A1A1AA] hover:text-white rounded-full bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-8 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-[#A1A1AA] uppercase">Descrição & Valor Rápido</label>
                  <button 
                    type="button" 
                    onClick={toggleListening}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                      isListening ? "bg-rose-500 text-white animate-pulse" : "bg-[#1A1A1E] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]"
                    )}
                  >
                    {isListening ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                    {isListening ? "Ouvindo..." : "Falar Despesa"}
                  </button>
                </div>
                <input 
                  type="text" 
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#EF4444] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors"
                  placeholder="Ex: Jantar restaurante"
                  required
                />
              </div>

              <div>
                <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#EF4444] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors"
                  placeholder="150.00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Orçamento</label>
                  <select 
                    value={newExpense.budget_id}
                    onChange={(e) => setNewExpense({ ...newExpense, budget_id: e.target.value })}
                    className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#EF4444] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors appearance-none"
                    required
                  >
                    <option value="" disabled>Selecione...</option>
                    {budgets.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Forma de Pagamento</label>
                  <select 
                    value={newExpense.payment_method}
                    onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                    className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#EF4444] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors appearance-none"
                    required
                  >
                    <option value="dinheiro">💵 Dinheiro / Pix</option>
                    <option value="cartao">💳 Cartão de Crédito</option>
                  </select>
                </div>
              </div>

              {newExpense.payment_method === 'cartao' && (
                <div>
                  <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Selecione o Cartão / Banco</label>
                  <select 
                    value={newExpense.card_id}
                    onChange={(e) => setNewExpense({ ...newExpense, card_id: e.target.value })}
                    className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors appearance-none"
                    required
                  >
                    <option value="" disabled>Escolha um cartão...</option>
                    {creditCards.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Data</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                    className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#EF4444] rounded-[14px] h-[52px] pl-12 pr-4 text-base text-white outline-none transition-colors dark-date-input"
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#71717A]">
                     <Clock className="size-5" />
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <button 
                  type="submit"
                  className="h-[46px] px-7 bg-[#171717] hover:bg-[#232323] border border-[rgba(255,255,255,0.08)] rounded-[14px] text-white font-medium flex items-center gap-2 transition-colors w-full justify-center"
                >
                  <CheckCircle2 className="size-5" /> Registrar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Credit Card Modal */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0">
          <div className="bg-[#070707] w-full max-w-md rounded-t-[28px] sm:rounded-[28px] border border-[rgba(255,255,255,0.06)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <div className="p-6 border-b border-[rgba(255,255,255,0.05)] flex justify-between items-center bg-[#17171A]">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center text-[#3B82F6]">
                  <CreditCard className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Novo Cartão / Banco
                </h3>
              </div>
              <button onClick={() => setIsCardModalOpen(false)} className="size-10 flex items-center justify-center text-[#A1A1AA] hover:text-white rounded-full bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveCard} className="p-8 flex flex-col gap-6">
              <div>
                <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Nome do Cartão/Banco</label>
                <input 
                  type="text" 
                  value={newCard.name}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                  className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors"
                  placeholder="Ex: Nubank, Itaú Black"
                  required
                />
              </div>
              
              <div>
                <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Limite Total (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newCard.limit_amount}
                  onChange={(e) => setNewCard({ ...newCard, limit_amount: e.target.value })}
                  className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors"
                  placeholder="5000.00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Dia Fechamento</label>
                  <input 
                    type="number" 
                    min="1" max="31"
                    value={newCard.closing_day}
                    onChange={(e) => setNewCard({ ...newCard, closing_day: e.target.value })}
                    className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-[#A1A1AA] mb-2 uppercase block">Dia Vencimento</label>
                  <input 
                    type="number" 
                    min="1" max="31"
                    value={newCard.due_day}
                    onChange={(e) => setNewCard({ ...newCard, due_day: e.target.value })}
                    className="w-full bg-[#1C1C1F] border border-transparent focus:border-[#3B82F6] rounded-[14px] h-[52px] px-4 text-base text-white outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <button 
                  type="submit"
                  className="h-[46px] px-7 bg-[#171717] hover:bg-[#232323] border border-[rgba(255,255,255,0.08)] rounded-[14px] text-white font-medium flex items-center gap-2 transition-colors w-full justify-center"
                >
                  <CheckCircle2 className="size-5" />
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
