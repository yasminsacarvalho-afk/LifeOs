import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Plus, Wallet, ShieldAlert, TrendingUp, TrendingDown, RefreshCw, Calendar, Edit2, Trash2, PieChart, Info, BookOpen, Target, ChevronLeft, ChevronRight, Calculator, X, Settings, Activity, BellRing, CheckCircle2, AlertTriangle, CheckSquare, Search, Filter, Copy, ArrowLeft, LayoutGrid, List, LayoutTemplate, Database, PiggyBank, Building2, CreditCard, Receipt } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from "recharts";
import { useTreasuryRealtime, type TreasuryAccount } from "@/hooks/use-treasury-realtime";
import { TreasuryAccountModal } from "@/components/TreasuryAccountModal";
import { usePosFinance } from "@/hooks/use-pos-finance";
export const Route = createFileRoute("/finance")({
  component: FinanceDashboard,
});

const glossaryTerms = [
  { term: "CAPEX", full: "Capital Expenditure", meaning: "Gastos com investimentos de longo prazo (equipamentos, veículos, software, reformas, etc.)." },
  { term: "OPEX", full: "Operational Expenditure", meaning: "Despesas operacionais do dia a dia (salários, aluguel, internet, energia, marketing, etc.)." },
  { term: "EBITDA", full: "Earnings Before Interest, Taxes, Depreciation and Amortization", meaning: "Lucro operacional antes de juros, impostos, depreciação e amortização. Mede a geração operacional de caixa." },
  { term: "Break-even", full: "Ponto de Equilíbrio", meaning: "Momento em que receitas = despesas. Nem lucro nem prejuízo." },
  { term: "ROI", full: "Return on Investment", meaning: "Retorno sobre investimento. Ex.: investiu R$ 1.000 e ganhou R$ 300 → ROI = 30%." },
  { term: "ROE", full: "Return on Equity", meaning: "Retorno sobre o patrimônio líquido dos sócios." },
  { term: "ROA", full: "Return on Assets", meaning: "Retorno sobre os ativos da empresa." },
  { term: "CAC", full: "Customer Acquisition Cost", meaning: "Custo para adquirir um cliente." },
  { term: "LTV", full: "Lifetime Value", meaning: "Valor total que um cliente gera durante sua vida útil na empresa." },
  { term: "MRR", full: "Monthly Recurring Revenue", meaning: "Receita recorrente mensal. Muito usada em SaaS." },
  { term: "ARR", full: "Annual Recurring Revenue", meaning: "Receita recorrente anual." },
  { term: "Churn", full: "Taxa de Cancelamento", meaning: "Percentual de clientes que cancelam." },
  { term: "Burn Rate", full: "Queima de Caixa", meaning: "Quanto a empresa consome de caixa por mês." },
  { term: "Runway", full: "Pista Financeira", meaning: "Quantos meses a empresa consegue sobreviver com o caixa atual." },
  { term: "CMV", full: "Custo da Mercadoria Vendida", meaning: "Custo dos produtos vendidos." },
  { term: "CPV", full: "Custo do Produto Vendido", meaning: "Similar ao CMV para indústrias." },
  { term: "CSV", full: "Custo do Serviço Vendido", meaning: "Muito usado em empresas de serviço." },
  { term: "DRE", full: "Demonstração do Resultado do Exercício", meaning: "Relatório de receitas, despesas e lucro." },
  { term: "FC", full: "Fluxo de Caixa", meaning: "Entradas e saídas de dinheiro." },
  { term: "FCL", full: "Fluxo de Caixa Livre", meaning: "Caixa que sobra após investimentos e despesas." },
  { term: "Margem Bruta", full: "Receita - Custos Diretos", meaning: "Mostra quanto sobra antes das despesas operacionais." },
  { term: "Margem Líquida", full: "Lucro Líquido ÷ Receita", meaning: "Quanto sobra de lucro efetivo." },
  { term: "Payback", full: "Retorno do Investimento", meaning: "Tempo necessário para recuperar um investimento." },
  { term: "Markup", full: "Índice de Precificação", meaning: "Quanto adicionar ao custo para formar o preço de venda." },
  { term: "Ticket Médio", full: "Receita ÷ Nº de Vendas", meaning: "Valor médio de cada venda." }
];

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  context: 'personal' | 'business';
  description: string;
  category: string;
  amount: number;
  date: string;
  paid: boolean;
  is_recurring: boolean;
};

const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value) + '%';
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value);
};

const isCaixinha = (cat: string) => {
  const c = cat.toLowerCase();
  return c.includes('caixinha') || c.includes('reserva') || c.includes('investimento');
};

// Helper robusto para evitar bugs de fuso horário UTC (dia 1 virando dia 31 do mês anterior)
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
};

function AnnualFinanceView({ transactions, activeContext, year }: { transactions: Transaction[], activeContext: 'business' | 'personal', year: number }) {
  const yearTransactions = transactions.filter(t => t.context === activeContext && new Date(t.date).getFullYear() === year);
  const allPastTx = transactions.filter(t => t.context === activeContext && new Date(t.date).getFullYear() <= year);

  // 1. DADOS BASE E RECEITA LÍQUIDA (Excluindo resgates de Caixinhas das receitas)
  const totalIncome = yearTransactions.filter(t => t.type === 'income' && !isCaixinha(t.category)).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = yearTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  const impostosTaxas = yearTransactions.filter(t => t.type === 'expense' && ['Impostos', 'Taxas', 'Estornos', 'Taxa de Cartão'].includes(t.category)).reduce((s, t) => s + t.amount, 0);
  const receitaLiquida = totalIncome - impostosTaxas;
  const lucroLiquido = receitaLiquida - (totalExpense - impostosTaxas);
  const margemLiquidaPerc = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

  // 2. CAPITAL DE GIRO E LIQUIDEZ (Estimativa base)
  const ativoCirculante = yearTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0); // simplificação para Ativos no ano
  const passivoCirculante = yearTransactions.filter(t => t.type === 'expense' && !t.paid).reduce((sum, t) => sum + t.amount, 0);
  const capitalDeGiro = ativoCirculante - passivoCirculante;
  const liquidez = passivoCirculante > 0 ? ativoCirculante / passivoCirculante : 999;

  // 3. PATRIMÔNIO E RUNWAY
  const totalAtivos = allPastTx.filter(t => t.type === 'income' && !isCaixinha(t.category)).reduce((sum, t) => sum + t.amount, 0);
  const totalPassivos = allPastTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const patrimonioLiquido = totalAtivos - totalPassivos;
  const burnRate = totalExpense / 12;
  const runway = burnRate > 0 ? patrimonioLiquido / burnRate : 999;

  // 4. SAAS METRICS
  const recurringIncomes = yearTransactions.filter(t => t.type === 'income' && (t.is_recurring || t.category === 'Assinaturas' || t.category === 'MRR'));
  const mrr = recurringIncomes.reduce((sum, t) => sum + t.amount, 0) / 12;
  const arr = mrr * 12;

  // 5. CONTAS A PAGAR / RECEBER
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureIncomes = transactions.filter(t => t.context === activeContext && t.type === 'income' && !t.paid);
  const futureExpenses = transactions.filter(t => t.context === activeContext && t.type === 'expense' && !t.paid);
  
  const aReceberAtrasado = futureIncomes.filter(t => parseLocalDate(t.date) < today).reduce((s, t) => s + t.amount, 0);
  const aReceber7d = futureIncomes.filter(t => parseLocalDate(t.date) >= today && parseLocalDate(t.date) <= new Date(today.getTime() + 7 * 86400000)).reduce((s, t) => s + t.amount, 0);
  const aReceber30d = futureIncomes.filter(t => parseLocalDate(t.date) > new Date(today.getTime() + 7 * 86400000) && parseLocalDate(t.date) <= new Date(today.getTime() + 30 * 86400000)).reduce((s, t) => s + t.amount, 0);
  
  const aPagarAtrasado = futureExpenses.filter(t => parseLocalDate(t.date) < today).reduce((s, t) => s + t.amount, 0);
  const aPagar7d = futureExpenses.filter(t => parseLocalDate(t.date) >= today && parseLocalDate(t.date) <= new Date(today.getTime() + 7 * 86400000)).reduce((s, t) => s + t.amount, 0);
  const aPagar30d = futureExpenses.filter(t => parseLocalDate(t.date) > new Date(today.getTime() + 7 * 86400000) && parseLocalDate(t.date) <= new Date(today.getTime() + 30 * 86400000)).reduce((s, t) => s + t.amount, 0);

  const pendentesPagar = futureExpenses.reduce((s, t) => s + t.amount, 0);
  const pendentesReceber = futureIncomes.reduce((s, t) => s + t.amount, 0);
  const caixaAtual = allPastTx.filter(t => t.paid && t.type === 'income').reduce((s, t) => s + t.amount, 0) - allPastTx.filter(t => t.paid && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const caixaProjetado = caixaAtual + pendentesReceber - pendentesPagar;

  // 6. CHARTS DATA
  let acmPatrimonio = totalAtivos - totalPassivos - (totalIncome - totalExpense); // start of year estimate
  const monthlyData = Array.from({ length: 12 }).map((_, i) => {
    const monthTxInc = yearTransactions.filter(t => parseLocalDate(t.date).getMonth() === i && t.type === 'income' && !isCaixinha(t.category));
    const monthTxExp = yearTransactions.filter(t => parseLocalDate(t.date).getMonth() === i && t.type === 'expense');
    const income = monthTxInc.reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTxExp.reduce((sum, t) => sum + t.amount, 0);
    const saldo = income - expense;
    acmPatrimonio += saldo;
    return {
      name: new Date(year, i, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      Receitas: income,
      Despesas: expense,
      Saldo: saldo,
      Patrimonio: acmPatrimonio
    };
  });

  const expenseByCategory = yearTransactions.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string, number>);
  const incomeByCategory = yearTransactions.filter(t => t.type === 'income' && !isCaixinha(t.category)).reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string, number>);

  const sortedExpenses = Object.entries(expenseByCategory).sort((a,b) => b[1] - a[1]);
  const sortedIncomes = Object.entries(incomeByCategory).sort((a,b) => b[1] - a[1]);

  const COLORS = ['#F43F5E', '#EBB52C', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#2DD4BF', '#FBBF24', '#A78BFA'];
  const INCOME_COLORS = ['#10B981', '#3B82F6', '#2DD4BF', '#FBBF24', '#8B5CF6', '#EC4899', '#A78BFA', '#F97316', '#EBB52C', '#F43F5E'];

  const getCategoryFlow = (category: string, type: 'income' | 'expense') => {
    return Array.from({ length: 12 }).map((_, i) => {
      const monthTx = yearTransactions.filter(t => parseLocalDate(t.date).getMonth() === i && t.type === type && t.category === category);
      return monthTx.reduce((sum, t) => sum + t.amount, 0);
    });
  };

  const expensePieData = sortedExpenses.map(([key, val]) => { 
    const perc = totalExpense > 0 ? formatNumber((val / totalExpense) * 100) : "0,0"; 
    return { name: `${key} (${perc}%)`, value: val, category: key, perc, flow: getCategoryFlow(key, 'expense') }; 
  });
  
  const incomePieData = sortedIncomes.map(([key, val]) => { 
    const perc = totalIncome > 0 ? formatNumber((val / totalIncome) * 100) : "0,0"; 
    return { name: `${key} (${perc}%)`, value: val, category: key, perc, flow: getCategoryFlow(key, 'income') }; 
  });

  // 7. ALERTAS INTELIGENTES
  const getAlertProps = (val: number, greenThresh: number, yellowThresh: number, inverted = false) => {
    let color = 'text-rose-500 bg-rose-500/10 border border-rose-500/20';
    if (inverted) {
      if (val <= greenThresh) color = 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20';
      else if (val <= yellowThresh) color = 'text-[#EBB52C] bg-[#EBB52C]/10 border border-[#EBB52C]/20';
    } else {
      if (val >= greenThresh) color = 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20';
      else if (val >= yellowThresh) color = 'text-[#EBB52C] bg-[#EBB52C]/10 border border-[#EBB52C]/20';
    }
    return color;
  };

  return (
    <div className="space-y-6">
      {/* SaaS & C-Level Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl group hover:border-[#333] transition-colors cursor-help" title="Percentual de lucro gerado para cada R$ 1,00 de receita após descontar custos operacionais.">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Margem Líquida</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-light text-white">{formatNumber(margemLiquidaPerc)}%</div>
            <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold", getAlertProps(margemLiquidaPerc, 20, 10))}>Status</div>
          </div>
          <div className="text-[10px] text-[#555] mt-2">(Lucro / Receita) x 100</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl group hover:border-[#333] transition-colors cursor-help" title="Capacidade de pagar as dívidas de curto prazo. Valores maiores que 1 indicam saúde positiva.">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Índice Liquidez</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-light text-white">{liquidez === 999 ? '∞' : formatNumber(liquidez)}</div>
            <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold", getAlertProps(liquidez, 1.5, 1))}>Status</div>
          </div>
          <div className="text-[10px] text-[#555] mt-2">Ativos / Passivos Pendentes</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl group hover:border-[#333] transition-colors cursor-help" title="Quantos meses a empresa consegue operar sem faturar nada, utilizando apenas o caixa atual.">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Runway (Caixa)</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-light text-white">{runway === 999 ? '∞' : Math.floor(runway)} <span className="text-xs">m</span></div>
            <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold", getAlertProps(runway, 6, 3))}>Status</div>
          </div>
          <div className="text-[10px] text-[#555] mt-2">Meses de Sobrevivência</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl group hover:border-[#333] transition-colors cursor-help" title="Receita Recorrente Mensal. Baseada em assinaturas e contratos fixos.">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">MRR (Recorrente)</div>
          <div className="text-2xl font-light text-[#3B82F6]">{formatBRL(mrr)}</div>
          <div className="text-[10px] text-[#555] mt-2">Receita Mensal Previsível</div>
        </div>
      </div>

      {/* Caixa & Projeções (Operational Cash KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl group hover:border-[#333] transition-colors cursor-help" title="Saldo atual efetivamente em conta.">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Caixa Atual</div>
          <div className="text-2xl font-light text-white">{formatBRL(caixaAtual)}</div>
          <div className="text-[10px] text-[#555] mt-2">Saldo Global Executado</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl group hover:border-[#333] transition-colors cursor-help" title="Saldo previsto após recebimentos e pagamentos pendentes.">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Caixa Projetado</div>
          <div className="text-2xl font-light text-white">{formatBRL(caixaProjetado)}</div>
          <div className="text-[10px] text-[#555] mt-2">Projeção Futura (Op.)</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl group hover:border-[#333] transition-colors cursor-help" title="Soma total das despesas ainda não pagas.">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Total A Pagar</div>
          <div className="text-2xl font-light text-rose-500">{formatBRL(pendentesPagar)}</div>
          <div className="text-[10px] text-[#555] mt-2">Pendências Abertas</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl group hover:border-[#333] transition-colors cursor-help" title="Soma total das receitas ainda não recebidas.">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Total A Receber</div>
          <div className="text-2xl font-light text-emerald-500">{formatBRL(pendentesReceber)}</div>
          <div className="text-[10px] text-[#555] mt-2">Receitas a Entrar</div>
        </div>
      </div>

      {/* Main Financial Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-[#333] transition-colors cursor-help" title="Total faturado no ano, descontando impostos, taxas de cartão e estornos.">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500"><TrendingUp className="size-32 text-white" /></div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> Receita Líquida (Ano)
          </div>
          <div className="text-3xl font-light text-white tracking-tight"><span className="font-bold">{formatBRL(receitaLiquida)}</span></div>
          <div className="text-[10px] text-[#555] mt-3 uppercase tracking-wider">Bruto Realizado: {formatBRL(totalIncome)}</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-[#333] transition-colors cursor-help" title="Resultado final de caixa: Receita Líquida menos todas as Despesas (fixas e variáveis).">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500"><Wallet className="size-32 text-white" /></div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EBB52C]"></span> Lucro Líquido (Ano)
          </div>
          <div className="text-3xl font-light text-[#EBB52C] tracking-tight"><span className="font-bold">{formatBRL(lucroLiquido)}</span></div>
          <div className="text-[10px] text-[#555] mt-3 uppercase tracking-wider">Despesas Totais: {formatBRL(totalExpense)}</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-[#333] transition-colors cursor-help" title="Riqueza real acumulada da empresa. Soma histórica de todas as entradas menos as saídas de caixa.">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500"><ShieldAlert className="size-32 text-white" /></div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span> Patrimônio Líquido
          </div>
          <div className="text-3xl font-light text-[#3B82F6] tracking-tight"><span className="font-bold">{formatBRL(patrimonioLiquido)}</span></div>
          <div className="text-[10px] text-[#555] mt-3 uppercase tracking-wider">Ativos Totais Acumulados - Passivos</div>
        </div>
      </div>

      {/* Accounts Payable and Receivable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-widest border-b border-[#222] pb-3 mb-4 flex justify-between">
            <span>Contas a Receber</span>
            <span className="text-[#888] text-xs">Abertas: {futureIncomes.length}</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              <span className="text-rose-500 text-xs font-bold uppercase tracking-widest">Em Atraso</span>
              <span className="font-mono text-rose-500 font-bold">{formatBRL(aReceberAtrasado)}</span>
            </div>
            <div className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#333]">
              <span className="text-[#aaa] text-xs font-bold uppercase tracking-widest">Próximos 7 Dias</span>
              <span className="font-mono text-emerald-400 font-bold">{formatBRL(aReceber7d)}</span>
            </div>
            <div className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#333]">
              <span className="text-[#aaa] text-xs font-bold uppercase tracking-widest">Próximos 30 Dias</span>
              <span className="font-mono text-[#EBB52C] font-bold">{formatBRL(aReceber30d)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-rose-500 text-sm uppercase tracking-widest border-b border-[#222] pb-3 mb-4 flex justify-between">
            <span>Contas a Pagar</span>
            <span className="text-[#888] text-xs">Abertas: {futureExpenses.length}</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              <span className="text-rose-500 text-xs font-bold uppercase tracking-widest">Em Atraso</span>
              <span className="font-mono text-rose-500 font-bold">{formatBRL(aPagarAtrasado)}</span>
            </div>
            <div className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#333]">
              <span className="text-[#aaa] text-xs font-bold uppercase tracking-widest">Próximos 7 Dias</span>
              <span className="font-mono text-[#EBB52C] font-bold">{formatBRL(aPagar7d)}</span>
            </div>
            <div className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#333]">
              <span className="text-[#aaa] text-xs font-bold uppercase tracking-widest">Próximos 30 Dias</span>
              <span className="font-mono text-[#aaa] font-bold">{formatBRL(aPagar30d)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-[#EBB52C] text-sm uppercase tracking-widest mb-6">Receitas x Despesas e Evolução de Patrimônio</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#888" />
              <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} stroke="#888" tickFormatter={(v) => `R$${v/1000}k`} />
              <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} stroke="#3B82F6" tickFormatter={(v) => `R$${v/1000}k`} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#222', borderRadius: '8px', color: '#fff' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar yAxisId="left" dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar yAxisId="left" dataKey="Despesas" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="Patrimonio" name="Patrimônio Acum." stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#0a0a0a', stroke: '#3B82F6', strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Composition Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-widest border-b border-[#222] pb-3 mb-4">Composição de Receitas</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={incomePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {incomePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {incomePieData.map((item, index) => (
              <div key={item.category} className="flex justify-between items-center text-xs p-2 rounded-xl bg-[#1a1a1a]/50 hover:bg-[#222] transition-colors border border-transparent hover:border-[#333]">
                <div className="flex items-center gap-2 w-1/3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: INCOME_COLORS[index % INCOME_COLORS.length] }}></div>
                  <span className="text-[#aaa] truncate" title={item.category}>{item.category}</span>
                </div>
                
                <div className="flex items-end justify-center gap-[2px] h-6 w-24 opacity-70 hover:opacity-100 transition-opacity">
                  {item.flow.map((v, i) => (
                    <div 
                      key={i} 
                      className="w-full bg-emerald-400 rounded-t-[1px] cursor-help" 
                      style={{ height: `${Math.max((v / (Math.max(...item.flow) || 1)) * 100, 5)}%`, opacity: v > 0 ? 1 : 0.15 }} 
                      title={`${new Date(year, i, 1).toLocaleDateString('pt-BR', {month: 'short'}).replace('.', '')}: ${formatBRL(v)}`}
                    ></div>
                  ))}
                </div>

                <div className="text-right w-1/3">
                  <span className="font-mono text-emerald-400 font-medium block truncate">{formatBRL(item.value)}</span>
                  <span className="text-[10px] text-[#555]">{item.perc}% do total</span>
                </div>
              </div>
            ))}
            {incomePieData.length === 0 && <div className="text-[#555] text-xs text-center py-4">Nenhuma receita registrada.</div>}
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-rose-500 text-sm uppercase tracking-widest border-b border-[#222] pb-3 mb-4">Composição de Despesas</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {expensePieData.map((item, index) => (
              <div key={item.category} className="flex justify-between items-center text-xs p-2 rounded-xl bg-[#1a1a1a]/50 hover:bg-[#222] transition-colors border border-transparent hover:border-[#333]">
                <div className="flex items-center gap-2 w-1/3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-[#aaa] truncate" title={item.category}>{item.category}</span>
                </div>
                
                <div className="flex items-end justify-center gap-[2px] h-6 w-24 opacity-70 hover:opacity-100 transition-opacity">
                  {item.flow.map((v, i) => (
                    <div 
                      key={i} 
                      className="w-full bg-rose-500 rounded-t-[1px] cursor-help" 
                      style={{ height: `${Math.max((v / (Math.max(...item.flow) || 1)) * 100, 5)}%`, opacity: v > 0 ? 1 : 0.15 }} 
                      title={`${new Date(year, i, 1).toLocaleDateString('pt-BR', {month: 'short'}).replace('.', '')}: ${formatBRL(v)}`}
                    ></div>
                  ))}
                </div>

                <div className="text-right w-1/3">
                  <span className="font-mono text-rose-500 font-medium block truncate">{formatBRL(item.value)}</span>
                  <span className="text-[10px] text-[#555]">{item.perc}% do total</span>
                </div>
              </div>
            ))}
            {expensePieData.length === 0 && <div className="text-[#555] text-xs text-center py-4">Nenhuma despesa registrada.</div>}
          </div>
        </div>
      </div>

      {/* Detailed Expense Analysis Board */}
      {activeContext === 'personal' && (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-rose-500 text-sm uppercase tracking-widest border-b border-[#222] pb-3 mb-6 flex items-center gap-2">
            <TrendingDown className="size-4" /> Análise Detalhada de Despesas
          </h3>
          
          <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="text-[#888] uppercase tracking-wider text-[10px] border-b border-[#333]">
                  <th className="pb-3 pl-2 font-bold w-1/4">Despesa</th>
                  <th className="pb-3 text-center font-bold w-1/4">Comportamento Anual</th>
                  <th className="pb-3 text-right font-bold w-[12%]">Pico (Maior)</th>
                  <th className="pb-3 text-right font-bold w-[12%]">Mínimo (Menor)</th>
                  <th className="pb-3 text-right font-bold w-[12%]">Média Mensal</th>
                  <th className="pb-3 pr-2 text-right font-bold w-[12%]">Total Gasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {expensePieData.map((item, index) => {
                  const maxVal = Math.max(...item.flow);
                  const minVal = Math.min(...item.flow.filter(v => v > 0)) || 0;
                  
                  const maxMonthIdx = item.flow.indexOf(maxVal);
                  const minMonthIdx = item.flow.indexOf(minVal);
                  
                  const maxMonthName = maxVal > 0 ? new Date(year, maxMonthIdx, 1).toLocaleDateString('pt-BR', {month: 'short'}).replace('.','') : '-';
                  const minMonthName = minVal > 0 ? new Date(year, minMonthIdx, 1).toLocaleDateString('pt-BR', {month: 'short'}).replace('.','') : '-';
                  
                  const avgVal = item.value / 12;

                  return (
                    <tr key={item.category} className="hover:bg-[#1a1a1a] transition-colors group">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="font-bold text-[#ccc] group-hover:text-white transition-colors">{item.category}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-end justify-center gap-1 h-8 w-full opacity-60 group-hover:opacity-100 transition-opacity">
                          {item.flow.map((v, i) => (
                            <div 
                              key={i} 
                              className="flex-1 bg-rose-500 rounded-t-sm cursor-help" 
                              style={{ height: `${Math.max((v / (maxVal || 1)) * 100, 5)}%`, opacity: v > 0 ? 1 : 0.1 }} 
                              title={`${new Date(year, i, 1).toLocaleDateString('pt-BR', {month: 'short'}).replace('.', '')}: ${formatBRL(v)}`}
                            ></div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="font-mono text-rose-500 font-bold">{maxVal > 0 ? formatBRL(maxVal) : '-'}</div>
                        {maxVal > 0 && <div className="text-[10px] text-[#555] uppercase mt-1">Mês: {maxMonthName}</div>}
                      </td>
                      <td className="py-4 text-right">
                        <div className="font-mono text-emerald-400 font-medium">{minVal > 0 ? formatBRL(minVal) : '-'}</div>
                        {minVal > 0 && <div className="text-[10px] text-[#555] uppercase mt-1">Mês: {minMonthName}</div>}
                      </td>
                      <td className="py-4 text-right">
                        <div className="font-mono text-[#EBB52C] font-bold">{formatBRL(avgVal)}</div>
                        <div className="text-[10px] text-[#555] mt-1">/ mês</div>
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <div className="font-mono text-white font-bold text-base">{formatBRL(item.value)}</div>
                        <div className="text-[10px] text-[#888] mt-1">{item.perc}% do orçamento</div>
                      </td>
                    </tr>
                  );
                })}
              {expensePieData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#555] italic">Nenhuma despesa registrada neste ano.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function FinanceDashboard({ 
  hideHeader = false,
  onNewBudget,
  onNewPersonalExpense,
  onNewCard
}: { 
  hideHeader?: boolean;
  onNewBudget?: () => void;
  onNewPersonalExpense?: () => void;
  onNewCard?: () => void;
}) {
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [activeContext, setActiveContext] = useState<'personal' | 'business'>('business');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSimulatorActive, setIsSimulatorActive] = useState(false);
  const [simulatedTransactions, setSimulatedTransactions] = useState<Transaction[]>([]);
  const [reservaMeta, setReservaMeta] = useState(10000);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { closings } = useCashClosingsRealtime();
  const { sales } = useSalesRealtime();
  const { partners } = usePartnersRealtime();
  
  const { accounts: treasuryAccounts, refetch: refetchTreasury, loading: loadingTreasury } = useTreasuryRealtime();
  const [isTreasuryModalOpen, setIsTreasuryModalOpen] = useState(false);
  const [editingTreasuryAcc, setEditingTreasuryAcc] = useState<TreasuryAccount | null>(null);

  const { creditCards: personalCards, expenses: personalExpenses, budgets: personalBudgets } = usePosFinance();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isCaixaProjetadoModalOpen, setIsCaixaProjetadoModalOpen] = useState(false);
  const [isDfcModalOpen, setIsDfcModalOpen] = useState(false);
  const [isCaixinhasModalOpen, setIsCaixinhasModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');
  const [modalType, setModalType] = useState<'income'|'expense'>('income');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  
  // Caixinha CRUD State
  const [isCaixinhaFormOpen, setIsCaixinhaFormOpen] = useState(false);
  const [caixinhaFormName, setCaixinhaFormName] = useState('');
  const [caixinhaFormAmount, setCaixinhaFormAmount] = useState('');
  const [caixinhaFormType, setCaixinhaFormType] = useState<'aporte' | 'resgate'>('aporte');
  const [caixinhaFormAccountId, setCaixinhaFormAccountId] = useState('');
  const [isSavingCaixinha, setIsSavingCaixinha] = useState(false);
  
  const [filterSearch, setFilterSearch] = useState('');
  const [filterType, setFilterType] = useState<'all'|'income'|'expense'>('all');
  const [filterStatus, setFilterStatus] = useState<'all'|'paid'|'pending'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [transactionViewMode, setTransactionViewMode] = useState<'table' | 'grid' | 'kanban'>('table');
  const [sortColumn, setSortColumn] = useState<'date' | 'description' | 'category' | 'paid' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const handleSort = (column: 'date' | 'description' | 'category' | 'paid' | 'amount') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  };
  
  const [isProLaboreModalOpen, setIsProLaboreModalOpen] = useState(false);
  const [proLaboreConfig, setProLaboreConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('voyage_prolabore_config');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      enabled: true,
      type: 'teto', // 'sustentavel', 'teto', 'fixo', 'total_sobra'
      tetoValue: 2500,
      fixoValue: 3000,
    };
  });

  useEffect(() => {
    localStorage.setItem('voyage_prolabore_config', JSON.stringify(proLaboreConfig));
  }, [proLaboreConfig]);

  const [bankConfig, setBankConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('voyage_bank_config');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      bankName: 'Nubank / CDI',
      yieldRate: 1.0, // 1% ao mês
    };
  });

  useEffect(() => {
    localStorage.setItem('voyage_bank_config', JSON.stringify(bankConfig));
  }, [bankConfig]);


  const [tesourariaTab, setTesourariaTab] = useState<'config' | 'lab'>('config');
  const [isKpiConfigOpen, setIsKpiConfigOpen] = useState(false);
  
  const [kpiExplanation, setKpiExplanation] = useState<{title: string, color: string, kidExplanation: string, adultExplanation: string} | null>(null);
  
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [tasks, setTasks] = useState<{id: string, text: string, done: boolean, urgency: 'low'|'medium'|'high', createdAt: string}[]>(() => {
    try {
      const saved = localStorage.getItem('voyage_finance_tasks');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskUrgency, setNewTaskUrgency] = useState<'low'|'medium'|'high'>('medium');

  useEffect(() => {
    localStorage.setItem('voyage_finance_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!newTaskText.trim()) return;
    setTasks([{ 
      id: Math.random().toString(36).substring(7), 
      text: newTaskText, 
      done: false, 
      urgency: newTaskUrgency, 
      createdAt: new Date().toISOString() 
    }, ...tasks]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Cross-reference computations
  const currentMonthPrefix = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  
  const totalInvoices = activeContext === 'personal'
    ? personalCards.map(c => personalExpenses.filter(e => e.card_id === c.id && e.expense_date?.startsWith(currentMonthPrefix)).reduce((sum, e) => sum + e.amount, 0)).reduce((a, b) => a + b, 0)
    : treasuryAccounts.filter(a => a.account_context === 'business').reduce((acc, a) => acc + Number(a.invoice_amount || 0), 0);

  const totalTreasury = treasuryAccounts.filter(a => a.account_context === activeContext).reduce((acc, a) => acc + Number(a.current_balance || 0), 0);
  const totalCaixinhas = treasuryAccounts.filter(a => a.account_context === activeContext).reduce((acc, a) => acc + (a.allocations || []).reduce((sum, al) => sum + Number(al.amount), 0), 0);
  const totalBudgets = activeContext === 'personal' ? personalBudgets.reduce((sum, b) => sum + (b.amount_limit || 0), 0) : 0;


  const [visibleKPIs, setVisibleKPIs] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('voyage_visible_kpis');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      vendas: true, comissoes: true, caixa: true, projetado: true, dfc: true,
      lucro: true, seguro: true, evolucao: true, indice: true, saude: true, reserva: true, despesas: true, receber: true, liquidez_total: true
    };
  });

  useEffect(() => {
    localStorage.setItem('voyage_visible_kpis', JSON.stringify(visibleKPIs));
  }, [visibleKPIs]);

  const toggleKPI = (key: string) => {
    setVisibleKPIs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [labIdeas, setLabIdeas] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('voyage_lab_ideas');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      { id: '1', name: 'Tráfego Pago (Ads)', type: 'ads', investimento: 1000, roi: 3 },
      { id: '2', name: 'Nova Máquina', type: 'capex', investimento: 5000, retornoMensal: 1000 }
    ];
  });

  useEffect(() => {
    localStorage.setItem('voyage_lab_ideas', JSON.stringify(labIdeas));
  }, [labIdeas]);

  const addLabIdea = (type: 'ads' | 'capex') => {
    const newIdea = type === 'ads' 
      ? { id: Math.random().toString(36).substring(7), name: 'Nova Campanha', type, investimento: 1000, roi: 2 }
      : { id: Math.random().toString(36).substring(7), name: 'Novo Equipamento', type, investimento: 5000, retornoMensal: 1000 };
    setLabIdeas([newIdea, ...labIdeas]);
  };

  const updateLabIdea = (id: string, field: string, value: any) => {
    setLabIdeas(ideas => ideas.map(i => i.id === id ? { ...i, [field]: value } : i));
  };
  
  const removeLabIdea = (id: string) => {
    setLabIdeas(ideas => ideas.filter(i => i.id !== id));
  };

  const [form, setForm] = useState({
    description: '',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paid: true,
    is_recurring: false,
    reservePercentage: 0,
    treasury_account_id: ''
  });

  const defaultCategories = {
    expense: ['Cartão de Crédito', 'Aluguel', 'Água', 'Luz', 'Internet', 'Faculdade', 'Empréstimos', 'Impostos', 'Dízimo', 'Funcionários', 'CAPEX / Aquisições', 'Perda Operacional', 'Outros'],
    income: ['Salário Pró-Labore', 'Venda de Serviços', 'Empréstimos Recebidos', 'Caixa Inicial', 'Investimentos', 'Outros']
  };

  const [categories, setCategories] = useState<{expense: string[], income: string[]}>(() => {
    try {
      const saved = localStorage.getItem('voyage_financial_categories');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return defaultCategories;
  });

  useEffect(() => {
    localStorage.setItem('voyage_financial_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    fetchTransactions();
    
    const channel = supabase
      .channel("schema-db-changes-financial")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "financial_records",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTransactions((prev) => {
              if (prev.some(t => t.id === payload.new.id)) return prev;
              return [payload.new as Transaction, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setTransactions((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Transaction) : t))
            );
          } else if (payload.eventType === "DELETE") {
            setTransactions((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchTransactions() {
    const { data, error } = await supabase.from('financial_records').select('*').order('date', { ascending: false });
    if (!error && data) {
      setTransactions(data as any);
    } else {
      console.warn("Table financial_records might not exist yet. Please run the SQL migration.");
    }
  }

  const parseAmount = (val: string) => {
    let clean = val.trim();
    if (!clean) return 0;
    
    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      if ((clean.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(clean)) {
        clean = clean.replace(/\./g, ''); 
      }
    }
    return Number(clean) || 0;
  };

  const handleSave = async () => {
    const totalAmount = parseAmount(form.amount);
    const isIncome = modalType === 'income';
    const hasReserve = isIncome && form.reservePercentage > 0 && !editingId;
    
      if (editingId) {
        const payload = { ...form, amount: totalAmount, type: modalType, context: activeContext };
        delete payload.reservePercentage;
        if (!payload.treasury_account_id) delete payload.treasury_account_id;
      
      if (isSimulatorActive) {
        setSimulatedTransactions(simulatedTransactions.map(t => t.id === editingId ? { ...t, ...payload } : t));
        setTransactions(transactions.map(t => t.id === editingId ? { ...t, ...payload } : t));
      } else {
        setTransactions(transactions.map(t => t.id === editingId ? { ...t, ...payload } : t));
        if (editingId.length > 20) {
          await supabase.from('financial_records').update(payload).eq('id', editingId);
        }
      }
      setEditingId(null);
      setIsModalOpen(false);
      setForm({...form, description: '', amount: '', reservePercentage: 0});
      return;
    }

    let txsToInsert = [];
    
    if (hasReserve) {
      const reserveAmount = totalAmount * (form.reservePercentage / 100);
      const mainAmount = totalAmount - reserveAmount;
      
      txsToInsert.push({
        ...form,
        amount: mainAmount,
        type: modalType,
        context: activeContext,
        treasury_account_id: form.treasury_account_id || null
      });
      
      txsToInsert.push({
        ...form,
        amount: reserveAmount,
        category: 'Investimentos', // This category goes to Reserva Financeira
        description: form.description + ' (Parte Reserva)',
        type: modalType,
        context: activeContext,
        treasury_account_id: form.treasury_account_id || null
      });
    } else {
      txsToInsert.push({
        ...form,
        amount: totalAmount,
        type: modalType,
        context: activeContext,
        treasury_account_id: form.treasury_account_id || null
      });
    }

    // Clean up extra fields
    txsToInsert = txsToInsert.map(tx => {
      const { reservePercentage, ...rest } = tx;
      return rest;
    });

    if (isSimulatorActive) {
      setSimulatedTransactions([...simulatedTransactions, ...txsToInsert.map(t => ({ ...t, id: Math.random().toString() }))]);
    } else {
      const { data, error } = await supabase.from('financial_records').insert(txsToInsert).select();
      if (error) {
        console.error("Supabase Error:", error);
        alert('Erro ao salvar no banco. Verifique se você rodou o script SQL (alter_financial_records.sql).');
      }
      if (data && data.length > 0) {
        setTransactions(prev => {
          const newTxs = data.filter(d => !prev.some(p => p.id === d.id));
          return [...newTxs, ...prev];
        });
      }
      
      setIsModalOpen(false);
      setForm({...form, description: '', amount: '', reservePercentage: 0, treasury_account_id: ''});
    }
    
    setIsModalOpen(false);
    setForm({...form, description: '', amount: '', reservePercentage: 0});
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      if (isSimulatorActive) {
        setSimulatedTransactions(simulatedTransactions.filter(t => t.id !== id));
      }
      setTransactions(transactions.filter(t => t.id !== id));
      if (!isSimulatorActive && id.length > 20) {
        await supabase.from('financial_records').delete().eq('id', id);
      }
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Tem certeza que deseja excluir ${selectedIds.length} registro(s)?`)) {
      if (isSimulatorActive) {
        setSimulatedTransactions(simulatedTransactions.filter(t => !selectedIds.includes(t.id)));
      }
      setTransactions(transactions.filter(t => !selectedIds.includes(t.id)));
      
      const idsToDelete = selectedIds.filter(id => id.length > 20); // only real records
      if (!isSimulatorActive && idsToDelete.length > 0) {
        await supabase.from('financial_records').delete().in('id', idsToDelete);
      }
      setSelectedIds([]);
    }
  };

  const handleBulkStatusChange = async (newStatus: boolean) => {
    if (selectedIds.length === 0) return;
    
    if (isSimulatorActive) {
      setSimulatedTransactions(simulatedTransactions.map(t => selectedIds.includes(t.id) ? { ...t, paid: newStatus } : t));
    }
    setTransactions(transactions.map(t => selectedIds.includes(t.id) ? { ...t, paid: newStatus } : t));
    
    const idsToUpdate = selectedIds.filter(id => id.length > 20); // only real records
    if (!isSimulatorActive && idsToUpdate.length > 0) {
      await supabase.from('financial_records').update({ paid: newStatus }).in('id', idsToUpdate);
    }
    
    setSelectedIds([]);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  
  const toggleAllSelection = (currentTransactions: Transaction[]) => {
    const allIds = currentTransactions.map(t => t.id);
    if (selectedIds.length === allIds.length && allIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };


  const handleCloneMonth = async () => {
    if(!confirm('Deseja clonar TODOS os lançamentos deste mês para o mês seguinte?')) return;
    
    const monthTx = transactions.filter(t => 
      t.context === activeContext && 
      parseLocalDate(t.date).getMonth() === selectedDate.getMonth() && 
      parseLocalDate(t.date).getFullYear() === selectedDate.getFullYear() &&
      !t.id.startsWith('auto-')
    );

    if (monthTx.length === 0) {
      alert('Nenhum lançamento encontrado neste mês para clonar.');
      return;
    }

    const txsToInsert = monthTx.map(t => {
      const d = new Date(t.date);
      d.setMonth(d.getMonth() + 1);
      
      const { id, created_at, ...rest } = t as any;
      
      return {
        ...rest,
        date: d.toISOString(),
        paid: false
      };
    });

    if (isSimulatorActive) {
      setSimulatedTransactions([...simulatedTransactions, ...txsToInsert.map(t => ({ ...t, id: Math.random().toString() })) as Transaction[]]);
    } else {
      const { data, error } = await supabase.from('financial_records').insert(txsToInsert).select();
      if (!error && data) {
        setTransactions([...transactions, ...data as any[]]);
      }
    }
    
    const nextMonth = new Date(selectedDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setSelectedDate(nextMonth);
  };

  const togglePaidStatus = async (t: Transaction) => {
    const newPaid = !t.paid;
    
    // Update local state optimistically
    if (isSimulatorActive) {
      setSimulatedTransactions(simulatedTransactions.map(st => st.id === t.id ? { ...st, paid: newPaid } : st));
    }
    setTransactions(transactions.map(tr => tr.id === t.id ? { ...tr, paid: newPaid } : tr));
    
    if (!isSimulatorActive && t.id.length > 20) { // Check if not a simulated random id
      await supabase.from('financial_records').update({ paid: newPaid }).eq('id', t.id);
    }
  };

  const handleSaveCaixinha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixinhaFormName || !caixinhaFormAmount) return;
    
    setIsSavingCaixinha(true);
    try {
      const type = caixinhaFormType === 'aporte' ? 'expense' : 'income';
      const category = 'Caixinha';
      const amount = Number(caixinhaFormAmount);
      
      const payload = {
        type,
        context: activeContext,
        category,
        description: caixinhaFormName,
        amount,
        date: new Date().toISOString().split('T')[0], // Sempre data atual para aporte/resgate livre
        paid: true,
        is_recurring: false,
        treasury_account_id: caixinhaFormAccountId || null
      };
      
      const { data, error } = await supabase.from('financial_records').insert(payload).select();
      if (error) throw error;
      
      if (data && data.length > 0) {
        setTransactions(prev => {
          const newTxs = data.filter(d => !prev.some(p => p.id === d.id));
          return [...newTxs, ...prev];
        });
      }
      
      setCaixinhaFormName('');
      setCaixinhaFormAmount('');
      setIsCaixinhaFormOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar operação da caixinha.");
    } finally {
      setIsSavingCaixinha(false);
    }
  };

  const allData = isSimulatorActive ? [...transactions, ...simulatedTransactions] : transactions;
  
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  let injectedTransactions = allData.filter(t => !ignoredIds.includes(t.id));

  // --- 1. Rendimentos e Cashback Automáticos ---
  const allBizPastPaid = injectedTransactions.filter(t => t.context === 'business' && t.paid && new Date(t.date) < new Date(currentYear, currentMonth, 1));
  const bizCaixaAnterior = allBizPastPaid.filter(t => t.type === 'income').reduce((a,b)=>a+b.amount,0) - allBizPastPaid.filter(t => t.type === 'expense').reduce((a,b)=>a+b.amount,0);

  const bizTxIni = injectedTransactions.filter(t => t.context === 'business' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear);

  if (bankConfig.yieldRate > 0 && bizCaixaAnterior > 0) {
    const yieldAmount = bizCaixaAnterior * (bankConfig.yieldRate / 100);
    injectedTransactions.push({
      id: 'auto-yield-biz',
      type: 'income',
      context: 'business',
      description: `Rendimento de Caixa (${bankConfig.bankName}) - ${bankConfig.yieldRate}% a.m.`,
      category: 'Investimentos',
      amount: yieldAmount,
      date: `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-28`,
      paid: true,
      is_recurring: false
    });
  }


  // --- 2. Pro-Labore Automático ---
  if (proLaboreConfig.enabled) {
    // Re-filter bizTx to include the newly injected yield and cashback!
    const bizTx = injectedTransactions.filter(t => t.context === 'business' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear);
    const bizInc = bizTx.filter(t => t.type === 'income').reduce((a,b)=>a+b.amount,0);
    const bizExpExcl = bizTx.filter(t => t.type === 'expense' && t.category !== 'Pró-Labore / Distribuição').reduce((a,b)=>a+b.amount,0);
    const bizOpex = bizTx.filter(t => t.type === 'expense' && t.category !== 'CAPEX / Aquisições' && t.category !== 'Pró-Labore / Distribuição').reduce((a,b)=>a+b.amount,0);
    const bizSobra = bizInc - bizExpExcl;
    
    // Caixa business
    const allBizPastPaid = injectedTransactions.filter(t => t.context === 'business' && t.paid && new Date(t.date) < new Date(currentYear, currentMonth, 1));
    const bizCaixaAnterior = allBizPastPaid.filter(t => t.type === 'income').reduce((a,b)=>a+b.amount,0) - allBizPastPaid.filter(t => t.type === 'expense').reduce((a,b)=>a+b.amount,0);
    const bizCaixaAtual = bizCaixaAnterior + bizTx.filter(t=>t.type==='income'&&t.paid).reduce((a,b)=>a+b.amount,0) - bizTx.filter(t=>t.type==='expense'&&t.paid&&t.category!=='Pró-Labore / Distribuição').reduce((a,b)=>a+b.amount,0);

    let plAmount = 0;
    if (proLaboreConfig.type === 'fixo') {
      plAmount = proLaboreConfig.fixoValue;
    } else if (proLaboreConfig.type === 'total_sobra') {
      plAmount = bizSobra > 0 ? bizSobra : 0;
    } else if (proLaboreConfig.type === 'teto') {
      plAmount = bizSobra > 0 ? Math.min(bizSobra, proLaboreConfig.tetoValue) : 0;
    } else if (proLaboreConfig.type === 'sustentavel') {
      const excessoCaixa = bizCaixaAtual - (bizOpex * 3);
      if (excessoCaixa > 0 && bizSobra > 0) {
        plAmount = Math.min(Math.min(bizSobra, excessoCaixa), proLaboreConfig.tetoValue);
      }
    }

    if (plAmount > 0) {
      const plDate = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-28`;
      injectedTransactions.push({
        id: 'auto-pl-biz', type: 'expense', context: 'business', description: 'Pró-Labore Automático (Regra: ' + proLaboreConfig.type + ')', category: 'Pró-Labore / Distribuição', amount: plAmount, date: plDate, paid: true, is_recurring: false
      });
      injectedTransactions.push({
        id: 'auto-pl-pers', type: 'income', context: 'personal', description: 'Pró-Labore (Origem: Empresa)', category: 'Salário Pró-Labore', amount: plAmount, date: plDate, paid: true, is_recurring: false
      });
    }
  }

  const ctxData = injectedTransactions.filter(t => t.context === activeContext);

  const currentMonthData = ctxData.filter(t => {
    const d = parseLocalDate(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const realToday = new Date();
  const realCurrentYear = realToday.getFullYear();
  const realCurrentMonth = realToday.getMonth();

  const realCurrentMonthStart = new Date(realCurrentYear, realCurrentMonth, 1);
  const selectedMonthStart = new Date(currentYear, currentMonth, 1);

  // Contas genuinamente atrasadas (meses ANTERIORES ao mês real atual que ainda não foram pagas)
  // Fix: Usar realCurrentMonthStart evita duplicidade quando projetamos meses futuros
  const overdueIncomes = ctxData.filter(t => t.type === 'income' && !t.paid && !isCaixinha(t.category) && parseLocalDate(t.date) < realCurrentMonthStart);
  const overdueExpenses = ctxData.filter(t => t.type === 'expense' && !t.paid && !isCaixinha(t.category) && parseLocalDate(t.date) < realCurrentMonthStart);

  // Ativos e Passivos EXCLUSIVOS do mês (para a tela de Resultado Operacional)
  const ativosDoMes = currentMonthData.filter(t => t.type === 'income' && !isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0);
  const passivosDoMes = currentMonthData.filter(t => t.type === 'expense' && !isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0);

  // Ativos e Passivos TOTAIS (Mês + Atrasados, usados para a matemática de Caixa Projetado)
  const totalAtivos = ativosDoMes + overdueIncomes.reduce((acc, t) => acc + t.amount, 0);
  const totalPassivos = passivosDoMes + overdueExpenses.reduce((acc, t) => acc + t.amount, 0);
  
  const depositosCaixinhaMes = currentMonthData.filter(t => t.type === 'expense' && isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0);
  const resgatesCaixinhaMes = currentMonthData.filter(t => t.type === 'income' && isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0);
  
  let caixaAnterior = 0;
  
  if (selectedMonthStart > realCurrentMonthStart) {
    // Para meses futuros: Saldo Real até hoje + Projeção (tudo pago ou não) dos meses intermediários
    const pastPaidTx = ctxData.filter(t => t.paid && !isCaixinha(t.category) && parseLocalDate(t.date) < realCurrentMonthStart);
    caixaAnterior = pastPaidTx.filter(t => t.type === 'income').reduce((a,b) => a + b.amount, 0) - 
                    pastPaidTx.filter(t => t.type === 'expense').reduce((a,b) => a + b.amount, 0);

    const intermediateTx = ctxData.filter(t => {
      const d = parseLocalDate(t.date);
      return !isCaixinha(t.category) && d >= realCurrentMonthStart && d < selectedMonthStart;
    });
    
    caixaAnterior += intermediateTx.filter(t => t.type === 'income').reduce((a,b) => a + b.amount, 0) -
                     intermediateTx.filter(t => t.type === 'expense').reduce((a,b) => a + b.amount, 0);
  } else {
    // Para o mês atual ou passado: Saldo Real (apenas pagos) até o início do mês selecionado
    const pastPaidTxSelected = ctxData.filter(t => t.paid && !isCaixinha(t.category) && parseLocalDate(t.date) < selectedMonthStart);
    caixaAnterior = pastPaidTxSelected.filter(t => t.type === 'income').reduce((a,b) => a + b.amount, 0) - 
                    pastPaidTxSelected.filter(t => t.type === 'expense').reduce((a,b) => a + b.amount, 0);
  }
  
  const caixaAtual = caixaAnterior + 
    currentMonthData.filter(t => t.type === 'income' && t.paid && !isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0) -
    currentMonthData.filter(t => t.type === 'expense' && t.paid && !isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0);

  // Valores Pendentes combinados (Mês atual + Atrasados)
  const incomePendenteMes = currentMonthData.filter(t => t.type === 'income' && !t.paid && !isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0);
  const incomeAtrasado = overdueIncomes.reduce((acc, t) => acc + t.amount, 0);
  const pendentesReceber = incomePendenteMes + incomeAtrasado;

  const expensePendenteMes = currentMonthData.filter(t => t.type === 'expense' && !t.paid && !isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0);
  const expenseAtrasado = overdueExpenses.reduce((acc, t) => acc + t.amount, 0);
  const pendentesPagar = expensePendenteMes + expenseAtrasado;

  const allTxAtSelected = ctxData.filter(t => {
    const d = parseLocalDate(t.date);
    return d.getFullYear() < currentYear || (d.getFullYear() === currentYear && d.getMonth() <= currentMonth);
  });
  
  const allIncomesSelected = allTxAtSelected.filter(t => t.type === 'income' && !isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0);
  const allExpensesSelected = allTxAtSelected.filter(t => t.type === 'expense' && !isCaixinha(t.category)).reduce((acc, t) => acc + t.amount, 0);
  
  const caixaAcumulado = allIncomesSelected - allExpensesSelected;

  // Caixa Projetado leva em conta apenas operação, caixinhas são estritamente virtuais e não alteram saldo
  const caixaProjetado = caixaAnterior + totalAtivos - totalPassivos;
  
  const lucroOperacional = ativosDoMes - passivosDoMes;
  const evolucaoPatrimonial = caixaAnterior === 0 ? (caixaAtual > 0 ? 100 : 0) : ((caixaAtual - caixaAnterior) / Math.abs(caixaAnterior)) * 100;
  
  const indiceSeguranca = totalPassivos > 0 ? (caixaAtual / totalPassivos) : 0;
  const proLaboreSeguro = lucroOperacional > 0 ? lucroOperacional * 0.65 : 0; // 65% do lucro

  const saudeFinanceira = totalPassivos > 0 ? (caixaProjetado / totalPassivos) * 100 : 100;
  
  let saudeClass = "Crítica";
  let saudeColor = "text-danger";
  if (saudeFinanceira >= 200) { saudeClass = "Excelente"; saudeColor = "text-success"; }
  else if (saudeFinanceira >= 150) { saudeClass = "Boa"; saudeColor = "text-success"; }
  else if (saudeFinanceira >= 100) { saudeClass = "Atenção"; saudeColor = "text-warning"; }

  // Caixinhas e Reserva Financeira Dinâmicas
  const caixinhas = Object.entries(
    ctxData
      .filter(t => 
        t.category.toLowerCase().includes('caixinha') || 
        t.category.toLowerCase().includes('reserva') || 
        t.category.toLowerCase().includes('investimento')
      )
      .reduce((acc, t) => {
        const val = t.type === 'expense' ? t.amount : -t.amount;
        
        let caixinhaName = t.category;
        if (t.category.toLowerCase().trim() === 'caixinha' || t.category.toLowerCase().trim() === 'reserva' || t.category.toLowerCase().trim() === 'investimento') {
          caixinhaName = t.description && t.description.trim() !== '' ? t.description : t.category;
        }
        
        if (!acc[caixinhaName]) acc[caixinhaName] = { amount: 0, accountId: t.treasury_account_id };
        acc[caixinhaName].amount += val;
        if (t.treasury_account_id) acc[caixinhaName].accountId = t.treasury_account_id;
        return acc;
      }, {} as Record<string, { amount: number, accountId: string | null }>)
  ).map(([name, data]) => ({ name, amount: data.amount, accountId: data.accountId })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  const acumuladoReserva = caixinhas.reduce((a, b) => a + b.amount, 0);
  const percentualReserva = reservaMeta > 0 ? Math.min(100, (acumuladoReserva / reservaMeta) * 100) : 0;

  // Chart Data (Visão Anual - Janeiro a Dezembro do ano atual)
  const startOfYear = new Date(currentYear, 0, 1);
  const pastPaidTxYear = ctxData.filter(t => t.paid && !isCaixinha(t.category) && parseLocalDate(t.date) < startOfYear);
  let accumulatedCashYear = pastPaidTxYear.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0) -
                            pastPaidTxYear.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

  const chartData = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(currentYear, i, 1);
    const mStr = d.toLocaleDateString('pt-BR', { month: 'short' });
    
    // Simulate recurring
    const monthTx = ctxData.filter(t => {
      const td = parseLocalDate(t.date);
      return (td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()) || (t.is_recurring && td < d);
    });

    const inc = monthTx.filter(t => t.type === 'income' && !isCaixinha(t.category)).reduce((a, b) => a + b.amount, 0);
    const exp = monthTx.filter(t => t.type === 'expense' && !isCaixinha(t.category)).reduce((a, b) => a + b.amount, 0);
    
    // O caixa projetado precisa considerar TUDO exceto caixinhas
    const incReal = monthTx.filter(t => t.type === 'income' && !isCaixinha(t.category)).reduce((a, b) => a + b.amount, 0);
    const expReal = monthTx.filter(t => t.type === 'expense' && !isCaixinha(t.category)).reduce((a, b) => a + b.amount, 0);
    accumulatedCashYear += (incReal - expReal);

    return {
      name: mStr,
      Ativos: inc,
      Passivos: exp,
      Projetado: accumulatedCashYear
    };
  });

  const alertas = [];
  if (caixaProjetado < 0) alertas.push("Caixa futuro está projetado para ficar negativo!");
  if (totalPassivos > totalAtivos) alertas.push("Passivos superaram os ativos deste mês.");
  const proximos7Dias = new Date();
  proximos7Dias.setDate(proximos7Dias.getDate() + 7);
  const contasVencendo = currentMonthData.filter(t => t.type === 'expense' && !t.paid && !isCaixinha(t.category) && parseLocalDate(t.date) <= proximos7Dias);
  if (contasVencendo.length > 0) alertas.push(`Existem ${contasVencendo.length} contas vencendo nos próximos 7 dias.`);

  const expenseByCategory = currentMonthData
    .filter(t => t.type === 'expense' && !isCaixinha(t.category))
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalExpensesAmount = currentMonthData.filter(t => t.type === 'expense' && !isCaixinha(t.category)).reduce((sum, t) => sum + t.amount, 0);

  const pieChartData = Object.keys(expenseByCategory).map(key => {
    const val = expenseByCategory[key];
    const perc = totalExpensesAmount > 0 ? formatNumber((val / totalExpensesAmount) * 100) : "0,0";
    return {
      name: `${key} (${perc}%)`,
      value: val
    };
  }).sort((a,b) => b.value - a.value);

  const COLORS = ['#F43F5E', '#EBB52C', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#2DD4BF', '#FBBF24', '#A78BFA'];

  const incomeByCategory = currentMonthData
    .filter(t => t.type === 'income' && !isCaixinha(t.category))
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalIncomeAmount = currentMonthData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

  const incomePieChartData = Object.keys(incomeByCategory).map(key => {
    const val = incomeByCategory[key];
    const perc = totalIncomeAmount > 0 ? formatNumber((val / totalIncomeAmount) * 100) : "0,0";
    return {
      name: `${key} (${perc}%)`,
      value: val
    };
  }).sort((a,b) => b.value - a.value);

  const INCOME_COLORS = ['#10B981', '#3B82F6', '#2DD4BF', '#FBBF24', '#8B5CF6', '#EC4899', '#A78BFA', '#F97316', '#EBB52C', '#F43F5E'];

  const totalAtivosMes = currentMonthData.filter(t => t.type === 'income' && !isCaixinha(t.category)).reduce((sum, t) => sum + t.amount, 0);
  const totalPassivosMes = currentMonthData.filter(t => t.type === 'expense' && !isCaixinha(t.category)).reduce((sum, t) => sum + t.amount, 0);

  const consumoRendaPieChartData = Object.keys(expenseByCategory).map(key => {
    const val = expenseByCategory[key];
    const perc = totalAtivosMes > 0 ? formatNumber((val / totalAtivosMes) * 100) : "0,0";
    return {
      name: `${key} (${perc}%)`,
      value: val
    };
  }).sort((a,b) => b.value - a.value);

  if (totalAtivosMes > totalPassivosMes) {
    const sobra = totalAtivosMes - totalPassivosMes;
    const perc = formatNumber((sobra / totalAtivosMes) * 100);
    consumoRendaPieChartData.push({
      name: `Sobra de Caixa (${perc}%)`,
      value: sobra
    });
  }

  // To differentiate the "Sobra" visually, we can just use the same COLORS array but it'll pick the next color.
  // Actually, let's keep it simple.

  // CFO Metrics Calculation (Adapts to Active Tab: Business or Personal)
  const cfoCurrentMonthData = injectedTransactions.filter(t => t.context === activeContext && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear);
  const cfoTotalAtivos = cfoCurrentMonthData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const cfoTotalPassivos = cfoCurrentMonthData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const cfoLucroOperacional = cfoTotalAtivos - cfoTotalPassivos;

  const allCfoPastPaidGlobal = injectedTransactions.filter(t => t.context === activeContext && t.paid && new Date(t.date) < new Date(currentYear, currentMonth, 1));
  const cfoCaixaAnteriorGlobal = allCfoPastPaidGlobal.filter(t => t.type === 'income').reduce((a,b)=>a+b.amount,0) - allCfoPastPaidGlobal.filter(t => t.type === 'expense').reduce((a,b)=>a+b.amount,0);
  const cfoCaixaAtualGlobal = cfoCaixaAnteriorGlobal + cfoCurrentMonthData.filter(t=>t.type==='income'&&t.paid).reduce((a,b)=>a+b.amount,0) - cfoCurrentMonthData.filter(t=>t.type==='expense'&&t.paid).reduce((a,b)=>a+b.amount,0);

  const opex = cfoCurrentMonthData.filter(t => t.type === 'expense' && t.category !== 'CAPEX / Aquisições' && t.category !== 'Pró-Labore / Distribuição').reduce((sum, t) => sum + t.amount, 0);
  const capex = cfoCurrentMonthData.filter(t => t.type === 'expense' && t.category === 'CAPEX / Aquisições').reduce((sum, t) => sum + t.amount, 0);
  const impostos = cfoCurrentMonthData.filter(t => t.type === 'expense' && t.category === 'Impostos').reduce((sum, t) => sum + t.amount, 0);
  
  const ebitda = cfoTotalAtivos - (opex - impostos);
  const margemLiquida = cfoTotalAtivos > 0 ? (cfoLucroOperacional / cfoTotalAtivos) * 100 : 0;
  const burnRate = cfoTotalPassivos;
  const runway = burnRate > 0 ? (cfoCaixaAtualGlobal / burnRate) : 999;
  const capitalGiroIdeal = opex * 3;

  const proLaboreDistribuido = cfoCurrentMonthData.filter(t => t.category === 'Pró-Labore / Distribuição').reduce((sum, t) => sum + t.amount, 0);
  const lucroRetido = cfoLucroOperacional; 

  return (
    <div className="w-full text-[#FAFAFA] font-sans selection:bg-[#EBB52C]/30 selection:text-[#EBB52C]">
      {!hideHeader && (
      <header className="px-4 md:px-8 py-6 border-b border-[rgba(255,255,255,0.02)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-30 bg-[#09090B]/95 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 bg-[#111] border border-[#222] rounded-xl text-[#888] hover:text-white hover:bg-[#222] transition-colors cursor-pointer group" title="Voltar ao Início">
            <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-2xl font-light text-white tracking-tight">Dashboard <span className="font-bold text-[#EBB52C]">Principal</span></h1>
            <p className="text-[10px] text-[#888] mt-1 uppercase tracking-widest">Inteligência Financeira Avançada</p>
          </div>
        </div>
        
        {/* Month Selector */}
        <div className="flex items-center gap-4 bg-[#111] border border-[#222] rounded-xl p-1 shadow-inner absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden lg:flex">
          <button 
            onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }}
            className="p-2 text-[#888] hover:text-white transition-colors hover:bg-[#222] rounded-lg"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="w-32 text-center flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-[#EBB52C] uppercase tracking-widest">{selectedDate.getFullYear()}</span>
            <span className="text-sm font-medium text-white capitalize">
              {selectedDate.toLocaleDateString('pt-BR', { month: 'long' })}
            </span>
          </div>
          <button 
             onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }}
            className="p-2 text-[#888] hover:text-white transition-colors hover:bg-[#222] rounded-lg"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex bg-[#111] p-1 rounded-full border border-[#222] shadow-inner gap-1">
          <div className="flex bg-[#1a1a1a] rounded-full p-0.5">
            <button 
              onClick={() => setViewMode('monthly')}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", viewMode === 'monthly' ? "bg-[#333] text-white shadow-md" : "text-[#888] hover:text-white")}
            >
              Mensal
            </button>
            <button 
              onClick={() => setViewMode('annual')}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", viewMode === 'annual' ? "bg-[#333] text-white shadow-md" : "text-[#888] hover:text-white")}
            >
              Anual
            </button>
          </div>
          
          <div className="w-px bg-[#333] my-2 mx-1 hidden sm:block"></div>

          <div className="flex">
            <button 
              onClick={() => setActiveContext('business')}
              className={cn("px-4 sm:px-6 py-1.5 rounded-full text-xs font-bold transition-all", activeContext === 'business' ? "bg-[#EBB52C] text-black shadow-md" : "text-[#888] hover:text-white")}
            >
              🏢 Empresa
            </button>
            <button 
              onClick={() => setActiveContext('personal')}
              className={cn("px-4 sm:px-6 py-1.5 rounded-full text-xs font-bold transition-all", activeContext === 'personal' ? "bg-[#EBB52C] text-black shadow-md" : "text-[#888] hover:text-white")}
            >
              👤 Pessoal
            </button>
          </div>
        </div>
      </header>
      )}

      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {viewMode === 'annual' ? (
          <AnnualFinanceView 
            transactions={transactions}
            activeContext={activeContext}
            year={selectedDate.getFullYear()}
          />
        ) : (
          <>
            {hideHeader ? (
              <div className="flex flex-col gap-4 mb-2 bg-[#0A0A0A] p-4 md:p-6 rounded-3xl border border-[rgba(255,255,255,0.04)] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-16 bg-rose-500/10 blur-[100px] w-64 h-64 rounded-full pointer-events-none"></div>
            
            {/* Top Row: Greeting left, Avatar right */}
            <div className="flex justify-between items-center w-full z-10 relative">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Bom dia, Bruno</h1>
                <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5 capitalize">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • <span className="text-emerald-400 font-medium">Personal OS Ativo</span></p>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative p-2 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors border border-[rgba(255,255,255,0.1)]">
                  <BellRing className="size-5 text-[#A1A1AA] hover:text-white" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#09090B]"></span>
                </button>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 p-0.5 shadow-lg shadow-rose-500/20">
                  <div className="w-full h-full rounded-full bg-[#1A1A1E] border-2 border-[#09090B] overflow-hidden flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm font-bold tracking-wider">BA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row: Centralized Month Selector and Filters */}
            <div className="flex flex-col items-center justify-center gap-3 w-full mt-2 z-10 relative">
              <div className="flex items-center justify-between gap-4 bg-[#111] border border-[#222] rounded-xl p-1 shadow-inner w-full max-w-[280px]">
                <button 
                  onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }}
                  className="p-1.5 text-[#888] hover:text-white transition-colors hover:bg-[#222] rounded-lg"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <div className="text-center flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{selectedDate.getFullYear()}</span>
                  <span className="text-sm font-bold text-white capitalize leading-none mt-0.5">
                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long' })}
                  </span>
                </div>
                <button 
                  onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }}
                  className="p-1.5 text-[#888] hover:text-white transition-colors hover:bg-[#222] rounded-lg"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex bg-[#111] p-1 rounded-full border border-[#222] shadow-inner gap-1">
                  <button 
                    onClick={() => setViewMode('monthly')}
                    className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", viewMode === 'monthly' ? "bg-[#333] text-white shadow-md" : "text-[#888] hover:text-white")}
                  >
                    Mensal
                  </button>
                  <button 
                    onClick={() => setViewMode('annual')}
                    className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", viewMode === 'annual' ? "bg-[#333] text-white shadow-md" : "text-[#888] hover:text-white")}
                  >
                    Anual
                  </button>
                </div>

                <div className="flex bg-[#111] p-1 rounded-full border border-[#222] shadow-inner gap-1">
                  <button 
                    onClick={() => setActiveContext('business')}
                    className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", activeContext === 'business' ? "bg-rose-500 text-white shadow-md" : "text-[#888] hover:text-white")}
                  >
                    🏢 Empresa
                  </button>
                  <button 
                    onClick={() => setActiveContext('personal')}
                    className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", activeContext === 'personal' ? "bg-rose-500 text-white shadow-md" : "text-[#888] hover:text-white")}
                  >
                    👤 Pessoal
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Action Buttons in a single line */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 z-10 relative w-full">
              {activeContext === 'business' && (
                <button 
                  onClick={() => { setEditingId(null); setModalType('expense'); setForm({...form, description: '', amount: '', reservePercentage: 0, category: 'CAPEX / Aquisições'}); setIsModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all shadow-lg"
                >
                  <Plus className="size-3.5 shrink-0" /> CAPEX
                </button>
              )}
              
              <button 
                onClick={handleCloneMonth}
                title="Clonar lançamentos"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20 transition-all shadow-lg"
              >
                <Copy className="size-3.5 shrink-0" /> Clonar Mês
              </button>
              
              <button 
                onClick={() => { setIsCaixinhasModalOpen(true); setIsCaixinhaFormOpen(true); setCaixinhaFormName(''); setCaixinhaFormAmount(''); setCaixinhaFormType('aporte'); }}
                title="Criar ou adicionar fundos a uma caixinha/reserva"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[#EBB52C]/30 bg-[#EBB52C]/10 text-[#EBB52C] hover:bg-[#EBB52C]/20 transition-all shadow-lg"
              >
                <PiggyBank className="size-3.5 shrink-0" /> Caixinha
              </button>
              
              <button 
                onClick={() => { setEditingId(null); setModalType('income'); setForm({...form, description: '', amount: '', reservePercentage: 0, category: ''}); setIsModalOpen(true); }}
                className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg", activeContext === 'personal' ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20" : "bg-[#EBB52C] text-black hover:bg-[#d4a327] shadow-[#EBB52C]/20")}
              >
                <Plus className="size-3.5 shrink-0" /> Nova Receita
              </button>
              
              <button 
                onClick={() => { 
                  if (activeContext === 'personal' && onNewPersonalExpense) {
                    onNewPersonalExpense();
                  } else {
                    setEditingId(null); setModalType('expense'); setForm({...form, description: '', amount: '', reservePercentage: 0, category: ''}); setIsModalOpen(true); 
                  }
                }}
                className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg text-white", activeContext === 'personal' ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20")}
              >
                <Plus className="size-3.5 shrink-0" /> Nova Despesa
              </button>

              {onNewBudget && activeContext === 'personal' && (
                <button 
                  onClick={onNewBudget}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[#333] bg-[#111] text-white hover:bg-[#222] transition-all"
                >
                  <Wallet className="size-3.5 shrink-0" /> Orçamento
                </button>
              )}

              {onNewCard && activeContext === 'personal' && (
                <button 
                  onClick={onNewCard}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[#333] bg-[#111] text-white hover:bg-[#222] transition-all"
                >
                  <CreditCard className="size-3.5 shrink-0" /> Cartão
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Inline Month Selector for regular Finance View */}
            <div className="flex items-center justify-between gap-4 bg-[#111] border border-[#222] rounded-xl p-1 shadow-inner mb-4 max-w-[280px] mx-auto lg:hidden">
              <button 
                onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }}
                className="p-3 text-[#888] hover:text-white transition-colors hover:bg-[#222] rounded-lg"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="text-center flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-[#EBB52C] uppercase tracking-widest">{selectedDate.getFullYear()}</span>
                <span className="text-sm font-medium text-white capitalize">
                  {selectedDate.toLocaleDateString('pt-BR', { month: 'long' })}
                </span>
              </div>
              <button 
                onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }}
                className="p-3 text-[#888] hover:text-white transition-colors hover:bg-[#222] rounded-lg"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>

            {/* Header Controls for regular Finance View */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button 
                  onClick={() => setIsSimulatorActive(!isSimulatorActive)}
                  className={cn("flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border flex-1 justify-center md:flex-none backdrop-blur-md shadow-lg", isSimulatorActive ? "bg-[#EBB52C]/20 border-[#EBB52C] text-[#EBB52C]" : "bg-white/5 hover:bg-white/10 border-white/10 text-[#aaa]")}
                >
                  <Calculator className="size-4 shrink-0" />
                  <span className="hidden sm:inline">{isSimulatorActive ? "Sair do Simulador" : "Simulador de Cenários"}</span>
                  <span className="sm:hidden">{isSimulatorActive ? "Sair" : "Simular"}</span>
                </button>
                <button 
                  onClick={() => setIsGlossaryOpen(true)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border bg-white/5 hover:bg-white/10 border-white/10 text-[#aaa] flex-1 justify-center md:flex-none backdrop-blur-md shadow-lg"
                >
                  <BookOpen className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Dicionário CFO</span>
                  <span className="sm:hidden">Dicionário</span>
                </button>
                <button 
                  onClick={() => setIsCategoriesModalOpen(true)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border bg-white/5 hover:bg-white/10 border-white/10 text-[#aaa] flex-1 justify-center md:flex-none backdrop-blur-md shadow-lg"
                >
                  <Database className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Categorias</span>
                  <span className="sm:hidden">Categorias</span>
                </button>
                <button 
                  onClick={() => setIsProLaboreModalOpen(true)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border bg-white/5 hover:bg-white/10 border-white/10 text-[#aaa] flex-1 justify-center md:flex-none backdrop-blur-md shadow-lg"
                >
                  <Wallet className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Tesouraria & Pró-Labore</span>
                  <span className="sm:hidden">Tesouraria</span>
                </button>
                <button 
                  onClick={() => setIsTasksOpen(true)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border bg-white/5 hover:bg-white/10 border-white/10 text-[#aaa] flex-1 justify-center md:flex-none relative backdrop-blur-md shadow-lg"
                >
                  <CheckSquare className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Tarefas / Pendências</span>
                  <span className="sm:hidden">Tarefas</span>
                  {tasks.filter(t => !t.done).length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {tasks.filter(t => !t.done).length}
                    </span>
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {activeContext === 'business' && (
                  <button 
                    onClick={() => { setEditingId(null); setModalType('expense'); setForm({...form, description: '', amount: '', reservePercentage: 0, category: 'CAPEX / Aquisições'}); setIsModalOpen(true); }}
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 rounded-lg text-[10px] md:text-xs font-bold border border-[#EBB52C]/30 bg-[#EBB52C]/10 text-[#EBB52C] hover:bg-[#EBB52C]/20 transition-all shadow-lg shadow-[#EBB52C]/5 flex-1 justify-center md:flex-none"
                  >
                    <Plus className="size-3 md:size-4 shrink-0" /> CAPEX
                  </button>
                )}
                <button 
                  onClick={handleCloneMonth}
                  title="Clonar lançamentos deste mês para o mês seguinte"
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 rounded-lg text-[10px] md:text-xs font-bold border border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20 transition-all shadow-lg shadow-[#3B82F6]/5 flex-1 justify-center md:flex-none"
                >
                  <Copy className="size-3 md:size-4 shrink-0" /> Clonar Mês
                </button>
                <button 
                  onClick={() => { setIsCaixinhasModalOpen(true); setIsCaixinhaFormOpen(true); setCaixinhaFormName(''); setCaixinhaFormAmount(''); setCaixinhaFormType('aporte'); }}
                  title="Criar ou adicionar fundos a uma caixinha/reserva"
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 rounded-lg text-[10px] md:text-xs font-bold border border-[#EBB52C]/30 bg-[#EBB52C]/10 text-[#EBB52C] hover:bg-[#EBB52C]/20 transition-all shadow-lg shadow-[#EBB52C]/5 flex-1 justify-center md:flex-none"
                >
                  <PiggyBank className="size-3 md:size-4 shrink-0" /> <span className="hidden sm:inline">Aporte Caixinha</span><span className="sm:hidden">Caixinha</span>
                </button>
                <button 
                  onClick={() => { setEditingId(null); setModalType('income'); setForm({...form, description: '', amount: '', reservePercentage: 0, category: ''}); setIsModalOpen(true); }}
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 rounded-lg text-[10px] md:text-xs font-bold bg-[#EBB52C] text-black hover:bg-[#d4a327] transition-all shadow-lg shadow-[#EBB52C]/20 flex-1 justify-center md:flex-none"
                >
                  <Plus className="size-3 md:size-4 shrink-0" /> <span className="hidden sm:inline">Nova Receita</span><span className="sm:hidden">Receita</span>
                </button>
                <button 
                  onClick={() => { 
                    if (activeContext === 'personal' && onNewPersonalExpense) {
                      onNewPersonalExpense();
                    } else {
                      setEditingId(null); setModalType('expense'); setForm({...form, description: '', amount: '', reservePercentage: 0, category: ''}); setIsModalOpen(true); 
                    }
                  }}
                  className={cn("flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 rounded-lg text-[10px] md:text-xs font-bold transition-all shadow-lg flex-1 justify-center md:flex-none", 
                    activeContext === 'personal' && onNewPersonalExpense
                      ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20"
                      : "border border-[#333] bg-[#111] text-white hover:bg-[#222]"
                  )}
                >
                  <Plus className="size-3 md:size-4 shrink-0" /> <span className="hidden sm:inline">Nova Despesa</span><span className="sm:hidden">Despesa</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tesouraria e Caixinhas Bancárias */}
        <section id="tesouraria" className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-black/60 p-8 backdrop-blur-2xl shadow-2xl mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <Wallet className="size-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Tesouraria & Caixinhas
                </h2>
                <p className="text-sm text-muted-foreground">Distribuição de capital, caixinhas de reserva e cruzamento consolidado de saldos.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingTreasuryAcc(null);
                setIsTreasuryModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg"
            >
              <Plus className="size-4" /> Adicionar Conta
            </button>
          </div>

          {/* Cross-Reference Global View */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4">
            <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><Building2 className="size-3 text-emerald-500" /> Saldo Global</p>
              <p className="text-2xl font-bold text-white">
                {totalTreasury.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Soma de todas as contas ({activeContext === 'personal' ? 'Pessoal' : 'Empresa'})</p>
            </div>
            
            <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><CreditCard className="size-3 text-rose-500" /> Faturas e Passivos</p>
              <p className="text-2xl font-bold text-rose-500">
                {totalInvoices.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeContext === 'personal' ? 'Total atual dos cartões de crédito' : 'Próximas faturas a pagar'}
              </p>
            </div>

            <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><PiggyBank className="size-3 text-[#EBB52C]" /> Caixinhas (Reserva)</p>
              <p className="text-2xl font-bold text-[#EBB52C]">
                {totalCaixinhas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Capital alocado e protegido</p>
            </div>

            <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><Activity className="size-3 text-[#3B82F6]" /> Liquidez Livre</p>
              <p className="text-2xl font-bold text-[#3B82F6]">
                {(totalTreasury - totalCaixinhas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Disponível para uso imediato</p>
            </div>
          </div>
          
          {loadingTreasury ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Carregando contas...</div>
          ) : treasuryAccounts.filter(a => a.account_context === activeContext).length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
              <div className="p-4 bg-white/5 rounded-full inline-flex mb-4">
                <Wallet className="size-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-white/60 text-sm mb-4">Nenhuma conta cadastrada no contexto {activeContext === 'business' ? 'Empresarial' : 'Pessoal'}.</p>
              <button 
                onClick={() => { setEditingTreasuryAcc(null); setIsTreasuryModalOpen(true); }} 
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all shadow-lg border border-white/5"
              >
                Comece a mapear seus bancos
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
               {treasuryAccounts.filter(a => a.account_context === activeContext).map((acc) => {
                 let themeColors = { bg: "bg-[#009EE3]", text: "text-[#009EE3]", border: "border-[#009EE3]" };
                 if (acc.theme === 'purple') themeColors = { bg: "bg-[#8A05BE]", text: "text-[#8A05BE]", border: "border-[#8A05BE]" };
                 if (acc.theme === 'orange') themeColors = { bg: "bg-[#FF7A00]", text: "text-[#FF7A00]", border: "border-[#FF7A00]" };
                 if (acc.theme === 'emerald') themeColors = { bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500" };
                 if (acc.theme === 'rose') themeColors = { bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500" };
                 if (acc.theme === 'gray') themeColors = { bg: "bg-gray-400", text: "text-gray-400", border: "border-gray-500" };

                 const totalAllocations = (acc.allocations || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

                 return (
                   <div 
                     key={acc.id} 
                     onClick={() => { setEditingTreasuryAcc(acc); setIsTreasuryModalOpen(true); }}
                     className={`bg-[#0a0a0a]/80 backdrop-blur-md border ${themeColors.border}/20 hover:${themeColors.border}/60 rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 cursor-pointer shadow-2xl hover:shadow-[0_0_30px_-5px_${themeColors.border.replace('border-[','').replace(']','')}] hover:-translate-y-1`}
                   >
                      <div className={`absolute -right-10 -top-10 w-32 h-32 ${themeColors.bg} rounded-full blur-[60px] opacity-10 group-hover:opacity-30 transition-opacity duration-500`} />
                      
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${themeColors.bg}/10 ${themeColors.text} border border-white/5`}>
                            <Building2 className="size-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-white leading-tight">{acc.bank_name}</h3>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{acc.account_purpose || 'Sem propósito definido'}</p>
                          </div>
                        </div>
                        <Edit2 className="size-4 text-white/20 group-hover:text-white/80 transition-colors" />
                      </div>
                      
                      <div className="space-y-4 mt-6 relative z-10">
                         {(acc.allocations || []).slice(0, 3).map(alloc => (
                           <div key={alloc.id} className="flex justify-between items-center text-sm" title={alloc.purpose}>
                              <span className="text-white/70 truncate mr-2">{alloc.name}</span>
                              <span className="font-semibold text-white whitespace-nowrap">
                                {(Number(alloc.amount) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                           </div>
                         ))}
                         
                         {(acc.allocations || []).length > 3 && (
                           <div className="text-xs text-muted-foreground italic text-center pt-1">
                             + {(acc.allocations || []).length - 3} outra(s)
                           </div>
                         )}

                         {(acc.allocations || []).length === 0 && (
                           <div className="text-xs text-muted-foreground italic">Sem caixinhas criadas.</div>
                         )}

                         <div className="flex justify-between items-center text-sm pt-4 border-t border-white/5 mt-4">
                            <span className="text-white/50 font-medium text-xs">Total em Caixinhas</span>
                            <span className="font-mono text-white/90">
                              {totalAllocations.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                         </div>
                         <div className="flex justify-between items-center text-sm bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-white/80 font-bold text-xs uppercase tracking-wider">Caixa Atual (Total)</span>
                            <span className={`font-mono font-bold ${themeColors.text} text-lg`}>
                              {(Number(acc.current_balance) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                         </div>
                         <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Livre p/ Uso</span>
                            <span className="font-mono font-bold text-white/40 text-xs">
                              {((Number(acc.current_balance) || 0) - totalAllocations).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                         </div>
                         
                         {acc.account_type === 'credit' && (
                           <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                              <div className="flex justify-between items-center">
                                 <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500/80">Próxima Fatura</span>
                                 <span className="font-mono font-bold text-rose-400 text-sm">
                                   {(Number(acc.invoice_amount) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                 </span>
                              </div>
                              {acc.invoice_date && (
                                <div className="flex justify-between items-center">
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vencimento</span>
                                   <span className="font-mono text-white/70 text-xs">
                                     {acc.invoice_date.split('-').reverse().join('/')}
                                   </span>
                                </div>
                              )}
                           </div>
                         )}
                      </div>
                   </div>
                 );
               })}
            </div>
          )}
        </section>

        {/* Alertas Inteligentes */}
        {alertas.length > 0 && (
          <div className="bg-[#EBB52C]/10 border border-[#EBB52C]/20 rounded-2xl p-5 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#EBB52C]" />
            <div className="font-bold text-[#EBB52C] flex items-center gap-2 text-sm tracking-wide uppercase">
              <ShieldAlert className="size-4" /> Alertas de Inteligência
            </div>
            <ul className="list-disc list-inside text-sm text-[#ccc] space-y-1">
              {alertas.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}

        {/* KPIs */}
        {(() => {
          const currentMonthSales = sales.filter(s => {
             if (!s.sale_date) return false;
             const [y, m, d] = s.sale_date.split('-');
             return (Number(m) - 1) === currentMonth && Number(y) === currentYear;
          });
          
          const getDynamicCommission = (sale: any) => {
             const partner = partners.find(p => p.id === sale.company_id);
             const rate = partner ? Number(partner.comissao || 0) : 0;
             if (rate === 0 && sale.commission_amount) return Number(sale.commission_amount);
             return Number(sale.amount || 0) * (rate / 100);
          };

          const totalVendasMes = currentMonthSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          const totalComissaoMes = currentMonthSales.reduce((sum, s) => sum + getDynamicCommission(s), 0);

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-[#111] border border-[#222] p-2 px-4 rounded-xl">
                <span className="text-xs font-bold text-[#888] uppercase tracking-widest">Painel de Indicadores</span>
                <div className="relative">
                  <button onClick={() => setIsKpiConfigOpen(!isKpiConfigOpen)} className="flex items-center gap-2 text-xs font-bold text-[#aaa] hover:text-white bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#333] transition-colors">
                    <Settings className="size-3" /> Configurar KPIs
                  </button>
                  {isKpiConfigOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#111] border border-[#333] rounded-xl shadow-2xl z-50 p-3 flex flex-col gap-2">
                      <div className="text-[10px] text-[#888] font-bold uppercase tracking-widest mb-1 pb-2 border-b border-[#222]">Indicadores Visíveis</div>
                      {[
                        { id: 'vendas', label: 'Vendas Fechamento' },
                        { id: 'comissoes', label: 'Comissões Fechamento' },
                        { id: 'receber', label: 'Total a Receber' },
                        { id: 'despesas', label: 'Total a Pagar' },
                        { id: 'caixa', label: 'Caixa Atual' },
                        { id: 'dfc', label: 'Caixa Acumulado (DFC)' },
                        { id: 'projetado', label: 'Caixa Projetado' },
                        { id: 'lucro', label: 'Lucro Operacional' },
                        { id: 'seguro', label: 'Pró-Labore / Aporte Seguro' },
                        { id: 'evolucao', label: 'Evolução Patrimonial' },
                        { id: 'indice', label: 'Índice Segurança' },
                        { id: 'saude', label: 'Saúde Financeira' },
                        { id: 'reserva', label: 'Reservas & Caixinhas' },
                        { id: 'liquidez_total', label: 'Liquidez Total (Caixa + Reservas)' },
                      ].map(kpi => (
                        <label key={kpi.id} className="flex items-center gap-2 text-xs text-[#ccc] hover:text-white cursor-pointer">
                          <input type="checkbox" checked={visibleKPIs[kpi.id]} onChange={() => toggleKPI(kpi.id)} className="rounded text-[#EBB52C] bg-[#1a1a1a] border-[#333] focus:ring-[#EBB52C]" />
                          {kpi.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4">
              {visibleKPIs.vendas && (
              <div 
                className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
                onClick={() => setKpiExplanation({
                  title: 'Total Vendas (Mês)',
                  color: 'text-blue-500',
                  kidExplanation: 'Imagine que você tem uma barraca de limonada. Esse número é todo o dinheiro que as pessoas te entregaram hoje comprando limonada, antes de você pagar pelos limões e pelo gelo!',
                  adultExplanation: 'Faturamento Bruto (Competência). A soma do valor integral de todos os contratos/vendas registrados no mês selecionado, independentemente de já terem sido recebidos em caixa.'
                })}
              >
                <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><TrendingUp className="size-24 text-white" /></div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Total Vendas</div>
                  <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
                </div>
                <div className="text-xl xl:text-2xl font-light text-white tracking-tight"><span className="font-bold">{formatBRL(totalVendasMes)}</span></div>
              </div>
              )}

              {visibleKPIs.comissoes && (
              <div 
                className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
                onClick={() => setKpiExplanation({
                  title: 'Total Comissões (Mês)',
                  color: 'text-rose-400',
                  kidExplanation: 'Sabe o seu amigo que te ajudou a vender as limonadas? Esse é o dinheiro que você prometeu dar para ele como prêmio pela ajuda.',
                  adultExplanation: 'Comissões Passivas. Custo Variável (COGS) calculado automaticamente com base nas vendas do mês e no percentual de comissão cadastrado para cada parceiro/motorista.'
                })}
              >
                <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><Wallet className="size-24 text-white" /></div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Total Comissões</div>
                  <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
                </div>
                <div className="text-xl xl:text-2xl font-light text-rose-400 tracking-tight"><span className="font-bold">{formatBRL(totalComissaoMes)}</span></div>
              </div>
              )}

          {visibleKPIs.caixa && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setKpiExplanation({
              title: 'Caixa Atual',
              color: 'text-[#EBB52C]',
              kidExplanation: 'É exatamente as moedinhas e notas que você tem dentro do seu cofrinho neste exato segundo. Se você abrir ele agora, é isso que vai achar!',
              adultExplanation: 'Disponibilidade Imediata (Liquidez). O saldo real do banco, calculado somando o Saldo Inicial do mês com as Receitas Efetivamente Pagas, e subtraindo as Despesas Efetivamente Pagas.'
            })}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><Wallet className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#EBB52C]"></span> Caixa Atual</div>
              <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
            </div>
            <div className="text-xl xl:text-2xl font-light text-white tracking-tight"><span className="font-bold">{formatBRL(caixaAtual)}</span></div>
          </div>
          )}

          {visibleKPIs.dfc && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setIsDfcModalOpen(true)}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><Wallet className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Caixa Acumulado
              </div>
              <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
            </div>
            <div className="text-xl xl:text-2xl font-light text-emerald-400 tracking-tight"><span className="font-bold">{formatBRL(caixaAcumulado)}</span></div>
            <div className="text-[10px] text-[#555] mt-3 uppercase tracking-wider group-hover:text-[#888] transition-colors" title="Como seu dinheiro foi acumulado até este mês (Caixa Inicial + Sobras).">Clique para entender o DFC</div>
          </div>
          )}
          
          {visibleKPIs.projetado && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setIsCaixaProjetadoModalOpen(true)}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><Target className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("w-1.5 h-1.5 rounded-full", caixaProjetado < 0 ? "bg-red-500" : "bg-[#EBB52C]")}></span> Caixa Projetado (Mês)
              </div>
              <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
            </div>
            <div className={cn("text-xl xl:text-2xl font-light tracking-tight", caixaProjetado < 0 ? "text-red-400" : "text-white")}><span className="font-bold">{formatBRL(caixaProjetado)}</span></div>
            <div className="text-[10px] text-[#555] mt-3 uppercase tracking-wider group-hover:text-[#888] transition-colors" title="Estimativa do saldo de caixa ao final do mês atual.">Clique para entender o cálculo</div>
          </div>
          )}

          {visibleKPIs.lucro && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setKpiExplanation({
              title: 'Lucro Operacional',
              color: 'text-[#10B981]',
              kidExplanation: 'Você vendeu as limonadas e pagou os limões. O que sobrou na sua mão, limpinho e que ninguém pode te tirar, é o seu Lucro!',
              adultExplanation: 'EBITDA / Resultado Operacional Líquido. É o total de todas as Receitas (Ativos) do mês, menos todas as Despesas (Passivos) do mês, independente de já estarem pagos.'
            })}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><TrendingUp className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> Lucro Operacional</div>
              <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
            </div>
            <div className={cn("text-xl xl:text-2xl font-light tracking-tight", lucroOperacional >= 0 ? "text-white" : "text-rose-500")}><span className="font-bold">{formatBRL(lucroOperacional)}</span></div>
          </div>
          )}

          {visibleKPIs.despesas && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setKpiExplanation({
              title: 'Total a Pagar',
              color: 'text-rose-500',
              kidExplanation: 'São as continhas que você prometeu pagar mas ainda não entregou o dinheiro. Você sabe que vai ter que tirar do cofrinho logo logo!',
              adultExplanation: 'Contas a Pagar (AP). O montante exato de dinheiro que já foi faturado ou previsto como despesa, mas cujo pagamento financeiro ainda não foi efetuado. Inclui atrasados.'
            })}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><TrendingDown className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Total a Pagar</div>
              <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
            </div>
            <div className="text-xl xl:text-2xl font-light text-rose-500 tracking-tight"><span className="font-bold">{formatBRL(pendentesPagar)}</span></div>
          </div>
          )}

          {visibleKPIs.receber && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setKpiExplanation({
              title: 'Total a Receber',
              color: 'text-emerald-400',
              kidExplanation: 'Seu amigo prometeu te dar 10 reais, mas ainda não deu. O dinheiro já é seu, só falta ele colocar na sua mão. Esse é o seu "a receber"!',
              adultExplanation: 'Contas a Receber (AR). O montante exato de dinheiro que já foi faturado ou previsto, mas cujo recebimento financeiro ainda não foi confirmado/efetivado. Inclui atrasados.'
            })}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><TrendingUp className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Total a Receber</div>
              <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
            </div>
            <div className="text-xl xl:text-2xl font-light text-emerald-400 tracking-tight"><span className="font-bold">{formatBRL(pendentesReceber)}</span></div>
          </div>
          )}

          {visibleKPIs.seguro && (
          <div 
            className="bg-gradient-to-br from-[#111] to-[#0a0f0d] border border-[#10B981]/20 rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setKpiExplanation({
              title: activeContext === 'business' ? 'Pró-Labore Seguro' : 'Aporte Seguro',
              color: 'text-[#10B981]',
              kidExplanation: 'Do dinheiro que sobrou da sua mesada, essa é a quantidade máxima que você pode gastar com doces sem correr o risco de ficar sem dinheiro para o lanche da escola.',
              adultExplanation: 'Margem de Retirada Segura. Representa 65% do Lucro Operacional. É o limite recomendado para saque ou reinvestimento, deixando 35% como retenção de capital de giro.'
            })}
          >
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#10B981]/70 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> {activeContext === 'business' ? 'Pró-Labore Seguro' : 'Aporte Seguro'}</div>
              <Info className="size-3 text-[#10B981]/50 group-hover:text-[#10B981] transition-colors" />
            </div>
            <div className="text-xl xl:text-2xl font-light text-[#10B981] tracking-tight"><span className="font-bold">{formatBRL(proLaboreSeguro)}</span></div>
          </div>
          )}

          {visibleKPIs.evolucao && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setKpiExplanation({
              title: 'Evolução Patrimonial',
              color: evolucaoPatrimonial >= 0 ? 'text-[#10B981]' : 'text-rose-500',
              kidExplanation: 'Se você tinha 10 moedas mês passado e agora tem 12 moedas, o seu cofrinho cresceu um pouquinho! Esse número mostra o quanto você ficou "mais rico" (ou mais pobre) em relação ao mês anterior.',
              adultExplanation: 'Variação Relativa de Caixa (MoM - Month over Month). Mostra a diferença percentual do seu Caixa Atual comparado ao saldo real que você tinha no último dia do mês passado.'
            })}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><TrendingUp className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className={cn("w-1.5 h-1.5 rounded-full", evolucaoPatrimonial >= 0 ? "bg-[#10B981]" : "bg-rose-500")}></span> Evolução Patrimonial</div>
              <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
            </div>
            <div className={cn("text-xl xl:text-2xl font-bold tracking-tight", evolucaoPatrimonial >= 0 ? "text-[#10B981]" : "text-rose-500")}>{evolucaoPatrimonial > 0 ? "+" : ""}{formatPercent(evolucaoPatrimonial)}</div>
          </div>
          )}

          {visibleKPIs.indice && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setKpiExplanation({
              title: 'Índice de Segurança',
              color: 'text-blue-500',
              kidExplanation: 'Se você parar de ganhar mesada hoje, por quantos meses você ainda conseguiria comprar todos os seus doces só usando o dinheiro que já tem guardado? Esse número é a resposta!',
              adultExplanation: 'Múltiplo de Runway (Sobrevivência). Indica quantas vezes o seu saldo bancário atual consegue cobrir o custo total das despesas previstas do mês (Caixa Atual ÷ Despesas Totais).'
            })}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><ShieldAlert className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Índice Segurança</div>
              <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
            </div>
            <div className="text-xl xl:text-2xl font-light text-white tracking-tight"><span className="font-bold">{formatNumber(indiceSeguranca)}</span>x</div>
          </div>
          )}
          
          {visibleKPIs.saude && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setKpiExplanation({
              title: 'Saúde Financeira',
              color: 'text-emerald-500',
              kidExplanation: 'É como a bateria do seu celular! Se estiver perto de 100%, você está super tranquilo. Se cair muito, você precisa correr para achar um carregador (ganhar mais dinheiro ou gastar menos)!',
              adultExplanation: 'Score de Solvência Operacional de Curto Prazo. Mede a capacidade projetada da empresa de honrar os compromissos do mês e gerar reserva (Caixa Projetado ÷ Total de Passivos).'
            })}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><Activity className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Saúde Financeira</div>
              <Info className="size-3 text-[#555] group-hover:text-[#aaa] transition-colors" />
            </div>
            <div className={cn("text-xl xl:text-2xl font-bold tracking-tight", saudeColor)}>{formatNumber(saudeFinanceira)}%</div>
          </div>
          )}
          
          {visibleKPIs.reserva && (
          <div 
            className="bg-gradient-to-br from-[#111] to-[#1a1608] border border-[#EBB52C]/20 rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group flex flex-col justify-between min-h-[160px] cursor-pointer hover:border-[#EBB52C]/40 transition-colors"
            onClick={() => setIsCaixinhasModalOpen(true)}
          >
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#EBB52C]/70 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#EBB52C]"></span> Reservas & Caixinhas</div>
                <Info className="size-3 text-[#EBB52C]/50 group-hover:text-[#EBB52C] transition-colors" />
              </div>
              <div className="text-xl xl:text-2xl font-light text-[#EBB52C] tracking-tight"><span className="font-bold">{formatBRL(acumuladoReserva)}</span></div>
            </div>
            
            <div className="my-4 space-y-2">
              {caixinhas.slice(0, 3).map(c => (
                <div key={c.name} className="flex justify-between items-center text-xs">
                  <span className="text-[#888] truncate pr-2 max-w-[140px]" title={c.name}>{c.name}</span>
                  <span className="font-mono text-[#EBB52C]">{formatBRL(c.amount)}</span>
                </div>
              ))}
              {caixinhas.length > 3 && <div className="text-[10px] text-[#555] text-right italic pt-1">+ {caixinhas.length - 3} outras caixinhas...</div>}
              {caixinhas.length === 0 && <div className="text-[10px] text-[#555] italic pt-2">Nenhuma caixinha criada ainda. Para criar, adicione uma Receita com 'Caixinha' no nome da categoria.</div>}
            </div>

            <div className="mt-auto pt-4 border-t border-[#333]/50">
              <div className="h-1 bg-[#222] rounded-full overflow-hidden">
                <div className="h-full bg-[#EBB52C] shadow-[0_0_10px_#EBB52C]" style={{ width: `${percentualReserva}%` }} />
              </div>
              <div className="text-[10px] text-[#888] mt-1.5 text-right uppercase tracking-wider">Meta Total: <span className="font-mono font-bold text-white">{formatPercent(percentualReserva)}</span> de {formatBRL(reservaMeta)}</div>
            </div>
          </div>
          )}
          {visibleKPIs.liquidez_total && (
          <div 
            className="bg-[#111] border border-[#222] rounded-2xl p-4 2xl:p-5 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-[#333] transition-colors"
            onClick={() => setKpiExplanation({
              title: 'Liquidez Total (Caixa + Reservas)',
              color: 'text-[#EBB52C]',
              kidExplanation: 'É todo o dinheirinho que você tem no bolso agora, somado com tudo o que está guardado no seu cofrinho!',
              adultExplanation: 'A soma do Caixa Livre atual com o valor total acumulado em todas as Reservas e Caixinhas. Representa a liquidez imediata global da empresa.'
            })}
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><Database className="size-24 text-white" /></div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#EBB52C]"></span> Liquidez Total</div>
              <Info className="size-3 text-[#555] group-hover:text-[#888] transition-colors" />
            </div>
            <div className="text-xl xl:text-2xl font-light text-[#EBB52C] tracking-tight"><span className="font-bold">{formatBRL(caixaAtual + acumuladoReserva)}</span></div>
            <div className="text-[10px] text-[#555] mt-3 flex justify-between uppercase tracking-wider">
              <span>Caixa Livre: {formatBRL(caixaAtual)}</span>
            </div>
            <div className="text-[10px] text-[#555] mt-1 flex justify-between uppercase tracking-wider">
              <span>Reservas: {formatBRL(acumuladoReserva)}</span>
            </div>
            <div className="text-[9px] text-[#888] mt-2 pt-2 border-t border-[#333]/50 flex justify-between items-center uppercase tracking-wider">
              <span>Proj. (+ Reservas):</span>
              <span className="font-mono text-[#aaa] font-bold">{formatBRL(caixaProjetado + acumuladoReserva)}</span>
            </div>
          </div>
          )}
            </div>
        </div>
        );})()}

        {/* Governança Corporativa CNPJ */}
        {activeContext === 'business' && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="size-5 text-indigo-400" /> Governança Corporativa (CNPJ)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(() => {
                // Ganhos da Rota: Receitas operacionais (excluindo rendimentos/cashbacks automáticos)
                const ganhosRota = currentMonthData.filter(t => 
                  t.type === 'income' && 
                  !isCaixinha(t.category) && 
                  !t.category.toLowerCase().includes('investimento') && 
                  !t.category.toLowerCase().includes('cashback') && 
                  !t.category.toLowerCase().includes('rendimento')
                ).reduce((a, b) => a + b.amount, 0);

                const simplesNacional = ganhosRota * 0.06;
                const lucroOperacional = ativosDoMes - passivosDoMes;
                
                // Retenção CAPEX: 50% do que sobra (Lucro Operacional)
                const provisaoCapex = lucroOperacional > 0 ? lucroOperacional * 0.50 : 0;
                
                // Transferência: Somente o Lucro Líquido Operacional
                const transferenciaDespesas = lucroOperacional > 0 ? lucroOperacional : 0;
                
                return (
                  <>
                    <div className="bg-[#111] border border-[#222] rounded-xl p-5 relative overflow-hidden group hover:border-[#333] transition-colors">
                      <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><Target className="size-24 text-white" /></div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Provisão Simples Nacional (6%)
                      </div>
                      <div className="text-2xl font-light text-rose-400 tracking-tight"><span className="font-bold">{formatBRL(simplesNacional)}</span></div>
                      <div className="text-[10px] text-[#555] mt-2 uppercase tracking-wider">Imposto sobre ganhos da rota ({formatBRL(ganhosRota)})</div>
                    </div>

                    <div className="bg-[#111] border border-[#222] rounded-xl p-5 relative overflow-hidden group hover:border-[#333] transition-colors">
                      <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><RefreshCw className="size-24 text-white" /></div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Transferir para Conta Despesas
                      </div>
                      <div className="text-2xl font-light text-blue-400 tracking-tight"><span className="font-bold">{formatBRL(transferenciaDespesas)}</span></div>
                      <div className="text-[10px] text-[#555] mt-2 uppercase tracking-wider">Somente o Lucro Líquido Operacional</div>
                    </div>

                    <div className="bg-[#111] border border-[#222] rounded-xl p-5 relative overflow-hidden group hover:border-[#333] transition-colors">
                      <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><TrendingUp className="size-24 text-white" /></div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sugestão de Retenção CAPEX
                      </div>
                      <div className="text-2xl font-light text-emerald-400 tracking-tight"><span className="font-bold">{formatBRL(provisaoCapex)}</span></div>
                      <div className="text-[10px] text-[#555] mt-2 uppercase tracking-wider">50% do que sobra (Lucro Líquido)</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Monthly Summary & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl p-6 lg:col-span-1 space-y-6">
            <h3 className="font-bold text-[#EBB52C] text-sm uppercase tracking-widest border-b border-[#222] pb-3">Resultado do Mês</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#888] text-sm">Ativos (Receitas)</span>
                <span className="font-mono text-emerald-400 font-medium">+ {formatBRL(ativosDoMes)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888] text-sm">Passivos (Despesas)</span>
                <span className="font-mono text-rose-500 font-medium">- {formatBRL(passivosDoMes)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-[#222]">
              <span className="font-bold text-white text-sm">Líquido Operacional</span>
              <span className={cn("font-mono font-bold text-xl tracking-tight", ativosDoMes - passivosDoMes >= 0 ? "text-[#EBB52C]" : "text-rose-500")}>
                {formatBRL(ativosDoMes - passivosDoMes)}
              </span>
            </div>
            <div className="mt-8 pt-6 border-t border-[#222] bg-gradient-to-b from-[#111] to-[#0a0a0a]">
               <h4 className="font-bold text-[10px] text-[#555] uppercase tracking-widest mb-4">Relatório Anual Sintético</h4>
               <ul className="text-xs space-y-3 text-[#aaa]">
                 <li className="flex justify-between items-center border-b border-[#222] pb-2">Evolução de Caixa <span className="font-mono text-emerald-400">{evolucaoPatrimonial > 0 ? '+' : ''}{formatPercent(evolucaoPatrimonial)}</span></li>
                 <li className="flex justify-between items-center border-b border-[#222] pb-2">Saúde Média <span className="font-bold text-[#EBB52C]">{saudeClass}</span></li>
                 <li className="flex justify-between items-center pb-2">Reserva Acumulada <span className="font-mono text-white">{formatNumber(percentualReserva)}%</span></li>
               </ul>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1A1A1E] to-[#111113] border border-[rgba(255,255,255,0.06)] rounded-3xl shadow-2xl p-6 lg:p-8 lg:col-span-2 relative overflow-hidden group">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-white text-base md:text-lg tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-[#EBB52C]/10 text-[#EBB52C] rounded-xl border border-[#EBB52C]/20">
                    <Activity className="size-5" />
                  </div>
                  Projeção de Fluxo <span className="text-[#71717A] font-normal text-sm ml-1 hidden sm:inline">/ Ano Atual</span>
                </h3>
              </div>
              
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAtivos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.3}/>
                      </linearGradient>
                      <linearGradient id="colorPassivos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="#71717A" dy={10} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#71717A" tickFormatter={(v) => `R$${v/1000}k`} dx={-10} />
                    <Tooltip 
                      formatter={(v: number) => formatBRL(v)} 
                      contentStyle={{ backgroundColor: 'rgba(23, 23, 26, 0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '16px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: '12px 16px' }}
                      itemStyle={{ fontWeight: '600', fontSize: '13px', paddingTop: '4px' }}
                      labelStyle={{ color: '#A1A1AA', fontSize: '12px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: '500' }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="Ativos" fill="url(#colorAtivos)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Passivos" fill="url(#colorPassivos)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Line type="monotone" name="Caixa Acumulado" dataKey="Projetado" stroke="#EBB52C" strokeWidth={3} dot={{ r: 4, fill: '#17171A', stroke: '#EBB52C', strokeWidth: 2 }} activeDot={{ r: 7, fill: '#EBB52C', stroke: '#fff', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Categoria and Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl p-6 lg:col-span-1">
            <h3 className="font-bold text-[#10B981] text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
              <PieChart className="size-4" /> Receitas por Categoria
            </h3>
            <div className="h-[300px]">
              {incomePieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={incomePieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {incomePieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(v: number) => formatBRL(v)} 
                      contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px', fontSize: '11px', color: '#ccc' }} 
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-[#555]">Nenhuma receita no mês</div>
              )}
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl p-6 lg:col-span-1">
            <h3 className="font-bold text-[#EBB52C] text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
              <PieChart className="size-4" /> Despesas por Categoria
            </h3>
            <div className="h-[300px]">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(v: number) => formatBRL(v)} 
                      contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px', fontSize: '11px', color: '#ccc' }} 
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-[#555]">Nenhuma despesa no mês</div>
              )}
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl p-6 lg:col-span-1">
            <h3 className="font-bold text-blue-400 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
              <PieChart className="size-4" /> Consumo da Renda
            </h3>
            <div className="h-[300px]">
              {consumoRendaPieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={consumoRendaPieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {consumoRendaPieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name.startsWith('Sobra de Caixa') ? '#10B981' : COLORS[index % COLORS.length]} 
                          stroke="rgba(0,0,0,0.5)" 
                          strokeWidth={2} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(v: number) => formatBRL(v)} 
                      contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px', fontSize: '11px', color: '#ccc' }} 
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-[#555]">Nenhum dado no mês</div>
              )}
            </div>
          </div>
        </div>

        {/* Lançamentos Recentes */}
        <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden">
          <div className="p-5 border-b border-[#222] bg-[#141414] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-white tracking-tight">Lançamentos Recentes</h3>
              <div className="hidden sm:flex bg-[#0a0a0a] border border-[#222] rounded-lg p-1 gap-1">
                <button onClick={() => setTransactionViewMode('table')} className={cn("p-1.5 rounded-md transition-colors", transactionViewMode === 'table' ? "bg-[#333] text-white" : "text-[#555] hover:text-[#aaa]")} title="Tabela"><List className="size-4" /></button>
                <button onClick={() => setTransactionViewMode('grid')} className={cn("p-1.5 rounded-md transition-colors", transactionViewMode === 'grid' ? "bg-[#333] text-white" : "text-[#555] hover:text-[#aaa]")} title="Grid"><LayoutGrid className="size-4" /></button>
                <button onClick={() => setTransactionViewMode('kanban')} className={cn("p-1.5 rounded-md transition-colors", transactionViewMode === 'kanban' ? "bg-[#333] text-white" : "text-[#555] hover:text-[#aaa]")} title="Kanban"><LayoutTemplate className="size-4" /></button>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 ml-2">
                  <button 
                    onClick={() => handleBulkStatusChange(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 rounded-lg text-xs font-bold transition-colors hover:bg-[#10B981]/20"
                    title="Marcar selecionados como Pagos"
                  >
                    <CheckCircle2 className="size-3.5 hidden sm:block" /> <span className="hidden sm:block">Pago</span><span className="sm:hidden"><CheckCircle2 className="size-3.5" /></span>
                  </button>
                  <button 
                    onClick={() => handleBulkStatusChange(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 rounded-lg text-xs font-bold transition-colors hover:bg-[#F59E0B]/20"
                    title="Marcar selecionados como Pendentes"
                  >
                    <AlertTriangle className="size-3.5 hidden sm:block" /> <span className="hidden sm:block">Pendente</span><span className="sm:hidden"><AlertTriangle className="size-3.5" /></span>
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-xs font-bold transition-colors hover:bg-rose-500/20"
                  >
                    <Trash2 className="size-3.5 hidden sm:block" /> <span className="hidden sm:block">Excluir ({selectedIds.length})</span><span className="sm:hidden"><Trash2 className="size-3.5" /></span>
                  </button>
                  <button 
                    onClick={() => {
                      setIgnoredIds(prev => [...prev, ...selectedIds]);
                      setSelectedIds([]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 rounded-lg text-xs font-bold transition-colors hover:bg-[#8b5cf6]/20"
                    title="Ocultar selecionados temporariamente (Simulação)"
                  >
                    <Activity className="size-3.5 hidden sm:block" /> <span className="hidden sm:block">Ignorar ({selectedIds.length})</span><span className="sm:hidden"><Activity className="size-3.5" /></span>
                  </button>
                </div>
              )}
              {ignoredIds.length > 0 && (
                <button
                  onClick={() => setIgnoredIds([])}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-xs font-bold transition-colors hover:bg-blue-500/20 ml-2"
                  title="Restaurar transações ocultas e recalcular dashboard"
                >
                  <RefreshCw className="size-3.5 hidden sm:block" /> <span className="hidden sm:block">Fim da Simulação ({ignoredIds.length})</span><span className="sm:hidden"><RefreshCw className="size-3.5" /></span>
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#555]" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#EBB52C] transition-colors"
                />
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="flex-1 sm:w-32 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EBB52C] transition-colors appearance-none cursor-pointer"
                >
                  <option value="all">Tipo (Todos)</option>
                  <option value="income">Receitas</option>
                  <option value="expense">Despesas</option>
                </select>
                
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="flex-1 sm:w-32 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EBB52C] transition-colors appearance-none cursor-pointer"
                >
                  <option value="all">Status (Todos)</option>
                  <option value="paid">Pagos</option>
                  <option value="pending">Pendentes</option>
                </select>

                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="flex-1 sm:w-32 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EBB52C] transition-colors appearance-none cursor-pointer"
                >
                  <option value="all">Categoria (Todas)</option>
                  {Array.from(new Set([...categories.expense, ...categories.income])).sort().map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="w-full">
            {(() => {
                  const filteredTransactions = currentMonthData.filter(t => {
                    const matchSearch = filterSearch ? (t.description.toLowerCase().includes(filterSearch.toLowerCase()) || t.category.toLowerCase().includes(filterSearch.toLowerCase())) : true;
                    const matchType = filterType === 'all' ? true : t.type === filterType;
                    const matchStatus = filterStatus === 'all' ? true : filterStatus === 'paid' ? t.paid : !t.paid;
                    const matchCategory = filterCategory === 'all' ? true : t.category === filterCategory;
                    const matchCaixinha = !isCaixinha(t.category);
                    return matchSearch && matchType && matchStatus && matchCategory && matchCaixinha;
                  });

                  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                  const netBalance = totalIncome - totalExpense;
                  const uniqueCategories = new Set(filteredTransactions.map(t => t.category)).size;

                  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
                    let valA: any, valB: any;
                    if (sortColumn === 'date') { valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime(); }
                    else if (sortColumn === 'description') { valA = a.description.toLowerCase(); valB = b.description.toLowerCase(); }
                    else if (sortColumn === 'category') { valA = a.category.toLowerCase(); valB = b.category.toLowerCase(); }
                    else if (sortColumn === 'amount') { valA = a.amount; valB = b.amount; }
                    else if (sortColumn === 'paid') { valA = a.paid ? 1 : 0; valB = b.paid ? 1 : 0; }
                    
                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                  });

                  const renderCard = (t: Transaction) => (
                    <div key={t.id} className={cn("bg-[#1a1a1a] border rounded-xl p-4 transition-colors group flex flex-col h-full relative", selectedIds.includes(t.id) ? "border-[#EBB52C]" : "border-[#333] hover:border-[#444]")}>
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelection(t.id)} className="rounded bg-[#0a0a0a] border-[#333] text-[#EBB52C] focus:ring-[#EBB52C] size-4 cursor-pointer" />
                      </div>
                      <div className="flex justify-between items-start mb-3 pr-6">
                        <div className="space-y-1">
                          <div className="text-[#888] text-[10px] uppercase font-bold tracking-widest">{t.category}</div>
                          <div className="font-medium text-white line-clamp-2" title={t.description}>{t.description}</div>
                        </div>
                        <div className={cn("text-right font-mono font-medium", t.type === 'income' ? 'text-[#10B981]' : 'text-rose-500')}>
                          {t.type === 'income' ? '+' : '-'} {formatBRL(t.amount)}
                        </div>
                      </div>
                      <div className="flex justify-between items-end mt-auto pt-3 border-t border-[#333]/50">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#aaa] text-[10px]">{t.date.split('-').reverse().join('/')}</span>
                          <button 
                            onClick={() => togglePaidStatus(t)}
                            title="Clique para alterar o status"
                            className="transition-transform hover:scale-105 active:scale-95"
                          >
                            {t.paid ? (
                              <span className="bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-[#10B981]/20 hover:bg-[#10B981]/20 transition-colors">Pago</span>
                            ) : (
                              <span className="bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-[#F59E0B]/20 hover:bg-[#F59E0B]/20 transition-colors">Pendente</span>
                            )}
                          </button>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => {
                               setEditingId(t.id);
                               setModalType(t.type);
                               setForm({
                                 description: t.description,
                                 category: t.category,
                                 amount: t.amount.toString(),
                                 date: t.date,
                                 paid: t.paid,
                                 is_recurring: t.is_recurring,
                                 reservePercentage: 0
                               });
                               setIsModalOpen(true);
                             }}
                             className="p-1 text-[#888] hover:text-[#EBB52C] transition-colors rounded hover:bg-[#EBB52C]/10"
                             title="Editar"
                           >
                             <Edit2 className="size-3.5" />
                           </button>
                           <button 
                             onClick={() => handleDelete(t.id)}
                             className="p-1 text-[#888] hover:text-rose-500 transition-colors rounded hover:bg-rose-500/10"
                             title="Excluir"
                           >
                             <Trash2 className="size-3.5" />
                           </button>
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <div className="flex flex-col h-full">
                      {transactionViewMode === 'table' && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-[#0a0a0a] text-[10px] uppercase font-bold text-[#888] tracking-widest border-b border-[#222]">
                              <tr>
                                <th className="px-6 py-4 font-medium w-10 text-center">
                                  <input type="checkbox" checked={selectedIds.length === sortedTransactions.length && sortedTransactions.length > 0} onChange={() => toggleAllSelection(sortedTransactions)} className="rounded bg-[#0a0a0a] border-[#333] text-[#EBB52C] focus:ring-[#EBB52C] size-4 cursor-pointer" />
                                </th>
                                <th className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors select-none group" onClick={() => handleSort('date')}>Data <span className="text-xs">{sortColumn === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-50">↕</span>}</span></th>
                                <th className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors select-none group" onClick={() => handleSort('description')}>Descrição <span className="text-xs">{sortColumn === 'description' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-50">↕</span>}</span></th>
                                <th className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors select-none group" onClick={() => handleSort('category')}>Categoria <span className="text-xs">{sortColumn === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-50">↕</span>}</span></th>
                                <th className="px-6 py-4 font-medium text-center cursor-pointer hover:text-white transition-colors select-none group" onClick={() => handleSort('paid')}>Status <span className="text-xs">{sortColumn === 'paid' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-50">↕</span>}</span></th>
                                <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-white transition-colors select-none group" onClick={() => handleSort('amount')}>Valor <span className="text-xs">{sortColumn === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-50">↕</span>}</span></th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222]">
                              {sortedTransactions.length === 0 && (
                                <tr><td colSpan={7} className="p-8 text-center text-[#555]">Nenhum lançamento encontrado.</td></tr>
                              )}
                              {sortedTransactions.map(t => (
                                <tr key={t.id} className={cn("transition-colors", selectedIds.includes(t.id) ? "bg-[#EBB52C]/10" : "hover:bg-[#1a1a1a]")}>
                                  <td className="px-6 py-4 text-center">
                                    <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelection(t.id)} className="rounded bg-[#0a0a0a] border-[#333] text-[#EBB52C] focus:ring-[#EBB52C] size-4 cursor-pointer" />
                                  </td>
                                  <td className="px-6 py-4 font-mono text-[#aaa] text-xs">{t.date.split('-').reverse().join('/')}</td>
                                  <td className="px-6 py-4 font-medium text-white">{t.description}</td>
                                  <td className="px-6 py-4 text-[#888] text-xs">{t.category}</td>
                                  <td className="px-6 py-4 text-center">
                                    <button 
                                      onClick={() => togglePaidStatus(t)}
                                      title="Clique para alterar o status"
                                      className="transition-transform hover:scale-105 active:scale-95"
                                    >
                                      {t.paid ? (
                                        <span className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-[#10B981]/20 hover:bg-[#10B981]/20 transition-colors">Pago</span>
                                      ) : (
                                        <span className="bg-[#F59E0B]/10 text-[#F59E0B] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-[#F59E0B]/20 hover:bg-[#F59E0B]/20 transition-colors">Pendente</span>
                                      )}
                                    </button>
                                  </td>
                                  <td className={cn("px-6 py-4 text-right font-mono font-medium", t.type === 'income' ? 'text-[#10B981]' : 'text-rose-500')}>
                                    {t.type === 'income' ? '+' : '-'} {formatBRL(t.amount)}
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                    <button 
                                      onClick={() => {
                                        setEditingId(t.id);
                                        setModalType(t.type);
                                        setForm({
                                          description: t.description,
                                          category: t.category,
                                          amount: t.amount.toString(),
                                          date: t.date,
                                          paid: t.paid,
                                          is_recurring: t.is_recurring,
                                          reservePercentage: 0
                                        });
                                        setIsModalOpen(true);
                                      }}
                                      className="p-1.5 text-[#888] hover:text-[#EBB52C] transition-colors rounded hover:bg-[#EBB52C]/10"
                                      title="Editar"
                                    >
                                      <Edit2 className="size-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(t.id)}
                                      className="p-1.5 text-[#888] hover:text-rose-500 transition-colors rounded hover:bg-rose-500/10"
                                      title="Excluir"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {transactionViewMode === 'grid' && (
                        <div className="p-6">
                           {sortedTransactions.length === 0 ? (
                             <div className="p-8 text-center text-[#555]">Nenhum lançamento encontrado.</div>
                           ) : (
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                               {sortedTransactions.map(renderCard)}
                             </div>
                           )}
                        </div>
                      )}

                      {transactionViewMode === 'kanban' && (
                        <div className="p-6 overflow-x-auto">
                          <div className="flex gap-6 min-w-max">
                            {/* Column 1: A Receber (Pendentes) */}
                            <div className="w-80 flex flex-col gap-3">
                               <div className="font-bold text-[#EBB52C] uppercase tracking-widest text-[10px] pb-2 border-b border-[#EBB52C]/20 flex justify-between items-center">
                                 A Receber (Pendentes)
                                 <span className="bg-[#EBB52C]/10 text-[#EBB52C] px-2 py-0.5 rounded-full">{sortedTransactions.filter(t => t.type === 'income' && !t.paid).length}</span>
                               </div>
                               <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: '600px' }}>
                                 {sortedTransactions.filter(t => t.type === 'income' && !t.paid).map(renderCard)}
                                 {sortedTransactions.filter(t => t.type === 'income' && !t.paid).length === 0 && <div className="text-center text-[#555] text-xs py-4">Nenhum item</div>}
                               </div>
                            </div>
                            
                            {/* Column 2: Recebidos (Pagos) */}
                            <div className="w-80 flex flex-col gap-3">
                               <div className="font-bold text-[#10B981] uppercase tracking-widest text-[10px] pb-2 border-b border-[#10B981]/20 flex justify-between items-center">
                                 Recebidos
                                 <span className="bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full">{sortedTransactions.filter(t => t.type === 'income' && t.paid).length}</span>
                               </div>
                               <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: '600px' }}>
                                 {sortedTransactions.filter(t => t.type === 'income' && t.paid).map(renderCard)}
                                 {sortedTransactions.filter(t => t.type === 'income' && t.paid).length === 0 && <div className="text-center text-[#555] text-xs py-4">Nenhum item</div>}
                               </div>
                            </div>

                            {/* Column 3: A Pagar (Pendentes) */}
                            <div className="w-80 flex flex-col gap-3">
                               <div className="font-bold text-rose-500 uppercase tracking-widest text-[10px] pb-2 border-b border-rose-500/20 flex justify-between items-center">
                                 A Pagar (Pendentes)
                                 <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full">{sortedTransactions.filter(t => t.type === 'expense' && !t.paid).length}</span>
                               </div>
                               <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: '600px' }}>
                                 {sortedTransactions.filter(t => t.type === 'expense' && !t.paid).map(renderCard)}
                                 {sortedTransactions.filter(t => t.type === 'expense' && !t.paid).length === 0 && <div className="text-center text-[#555] text-xs py-4">Nenhum item</div>}
                               </div>
                            </div>

                            {/* Column 4: Pagos (Despesas) */}
                            <div className="w-80 flex flex-col gap-3">
                               <div className="font-bold text-[#888] uppercase tracking-widest text-[10px] pb-2 border-b border-[#333] flex justify-between items-center">
                                 Contas Pagas
                                 <span className="bg-[#333] text-[#aaa] px-2 py-0.5 rounded-full">{sortedTransactions.filter(t => t.type === 'expense' && t.paid).length}</span>
                               </div>
                               <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: '600px' }}>
                                 {sortedTransactions.filter(t => t.type === 'expense' && t.paid).map(renderCard)}
                                 {sortedTransactions.filter(t => t.type === 'expense' && t.paid).length === 0 && <div className="text-center text-[#555] text-xs py-4">Nenhum item</div>}
                               </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Footer Totals */}
                      {sortedTransactions.length > 0 && (
                        <div className="bg-[#141414] font-bold text-xs border-t border-[#222] p-4 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex gap-4 sm:gap-8">
                            <span className="text-[#888] font-mono">{sortedTransactions.length} item(s)</span>
                            <span className="text-[#888]">{uniqueCategories} categ.</span>
                          </div>
                          <div className={cn("text-right font-mono text-sm sm:text-base", netBalance >= 0 ? "text-[#10B981]" : "text-rose-500")}>
                            {netBalance >= 0 ? '+' : ''}{formatBRL(netBalance)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
            })()}
          </div>
        </div>

        {/* Inteligência CFO */}
        <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden mt-6">
          <div className="p-5 border-b border-[#222] bg-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="size-5 text-[#EBB52C]" />
              <h3 className="font-bold text-white tracking-tight">Inteligência CFO <span className="text-[#888] font-normal hidden md:inline-block">- Métricas Avançadas e Saúde Estrutural</span></h3>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="text-[10px] text-[#888] font-bold uppercase tracking-widest">{activeContext === 'business' ? 'EBITDA' : 'Poder de Poupança'}</div>
              <div className={cn("text-xl font-light", ebitda >= 0 ? "text-emerald-400" : "text-rose-500")}>{formatBRL(ebitda)}</div>
              <div className="text-xs text-[#555]">{activeContext === 'business' ? 'Geração de Caixa Operacional' : 'Geração de Caixa Livre'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-[#888] font-bold uppercase tracking-widest">Margem Líquida</div>
              <div className={cn("text-xl font-light", margemLiquida >= 0 ? "text-emerald-400" : "text-rose-500")}>{formatPercent(margemLiquida)}</div>
              <div className="text-xs text-[#555]">Lucro Líquido / Receita</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-[#888] font-bold uppercase tracking-widest">Burn Rate</div>
              <div className="text-xl font-light text-rose-500">{formatBRL(burnRate)}</div>
              <div className="text-xs text-[#555]">Consumo de Caixa / Mês</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-[#888] font-bold uppercase tracking-widest">Runway</div>
              <div className={cn("text-xl font-light", runway > 6 ? "text-emerald-400" : runway > 3 ? "text-[#EBB52C]" : "text-rose-500")}>{runway === 999 ? '∞' : formatNumber(runway)} meses</div>
              <div className="text-xs text-[#555]">{activeContext === 'business' ? 'Pista Financeira com Caixa Atual' : 'Sobrevivência com Caixa Atual'}</div>
            </div>
            <div className="space-y-1 pt-4 border-t border-[#222]">
              <div className="text-[10px] text-[#888] font-bold uppercase tracking-widest">{activeContext === 'business' ? 'OPEX' : 'Despesas Correntes'}</div>
              <div className="text-xl font-light text-[#aaa]">{formatBRL(opex)}</div>
              <div className="text-xs text-[#555]">{activeContext === 'business' ? 'Despesas Operacionais (Fixo)' : 'Gastos Básicos Mensais'}</div>
            </div>
            <div className="space-y-1 pt-4 border-t border-[#222]">
              <div className="text-[10px] text-[#888] font-bold uppercase tracking-widest">{activeContext === 'business' ? 'CAPEX' : 'Bens / Aquisições'}</div>
              <div className="text-xl font-light text-[#aaa]">{formatBRL(capex)}</div>
              <div className="text-xs text-[#555]">{activeContext === 'business' ? 'Investimentos (Ativos)' : 'Compras de Valor Elevado'}</div>
            </div>
            <div className="col-span-1 sm:col-span-2 lg:col-span-2 space-y-1 bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#333] p-5 rounded-xl shadow-inner flex flex-col justify-center">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                <div className="text-[10px] text-[#EBB52C] font-bold uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="size-3" /> {activeContext === 'business' ? 'Capital de Giro Ideal (3x OPEX)' : 'Reserva de Emergência Ideal (3x Despesas)'}
                </div>
                {cfoCaixaAtualGlobal >= capitalGiroIdeal ? (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Aprovado</span>
                ) : (
                  <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Risco</span>
                )}
              </div>
              <div className="flex items-end gap-3">
                <div className="text-3xl font-light text-white tracking-tight">{formatBRL(capitalGiroIdeal)}</div>
              </div>
              <div className="text-xs mt-2 font-mono">
                {cfoCaixaAtualGlobal >= capitalGiroIdeal ? (
                  <span className="text-[#888]">O caixa atual ({formatBRL(cfoCaixaAtualGlobal)}) cobre com segurança o valor ideal.</span>
                ) : (
                  <span className="text-[#888]">
                    Faltam <span className="text-rose-500 font-bold">{formatBRL(capitalGiroIdeal - cfoCaixaAtualGlobal)}</span> para blindar as despesas por 3 meses.
                  </span>
                )}
              </div>
            </div>
            {proLaboreDistribuido > 0 && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-gradient-to-r from-[#EBB52C]/10 to-[#10B981]/10 border border-[#222] p-5 rounded-xl shadow-inner flex flex-col md:flex-row justify-between md:items-center gap-6 mt-2">
                <div>
                  <div className="text-[10px] text-[#EBB52C] font-bold uppercase tracking-widest flex items-center gap-2 mb-1">
                    <Settings className="size-3" /> Pró-Labore Distribuído
                  </div>
                  <div className="text-3xl font-light text-white tracking-tight">{formatBRL(proLaboreDistribuido)}</div>
                  <div className="text-xs mt-1 text-[#aaa]">Enviado para sua aba Pessoal.</div>
                </div>
                <div className="md:text-right">
                  <div className="text-[10px] text-[#10B981] font-bold uppercase tracking-widest flex items-center md:justify-end gap-2 mb-1">
                    <ShieldAlert className="size-3" /> Lucro Retido (Sobra Real)
                  </div>
                  <div className="text-3xl font-light text-white tracking-tight">{formatBRL(lucroRetido)}</div>
                  <div className="text-xs mt-1 text-[#aaa]">Permaneceu seguro no caixa da empresa.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tesouraria & Caixinhas - Visualização Inferior */}
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-bold tracking-tight text-white mb-6 flex items-center gap-2">
            <Database className="size-5 text-[#EBB52C]" /> Tesouraria & Caixinhas
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Contas Bancárias (Tesouraria) */}
            {treasuryAccounts.filter(a => a.account_context === activeContext).map(acc => {
              const isCredit = acc.account_type === 'credit';
              const displayBalance = isCredit ? Number(acc.invoice_amount || 0) : Number(acc.current_balance || 0);
              
              return (
                <div key={acc.id} className="bg-[#111] border border-[#333] rounded-2xl p-5 hover:border-[#EBB52C]/50 transition-all shadow-lg group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-[#EBB52C]/10 transition-colors">
                      <Wallet className="size-5 text-white group-hover:text-[#EBB52C] transition-colors" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-white text-sm truncate" title={acc.bank_name}>{acc.bank_name}</div>
                      <div className="text-[10px] text-[#888] uppercase tracking-widest">
                        {isCredit ? 'Cartão' : 'Conta'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-[10px] text-[#888] uppercase tracking-widest">{isCredit ? 'Fatura Atual' : 'Saldo Atual'}</div>
                      {isCredit && acc.invoice_date && (
                        <div className="text-[10px] text-[#555] font-mono">Vence: {acc.invoice_date.split('-').reverse().join('/')}</div>
                      )}
                    </div>
                    <div className={cn("text-2xl font-light tracking-tight", isCredit ? "text-rose-500" : (displayBalance >= 0 ? "text-white" : "text-rose-500"))}>
                      {formatBRL(displayBalance)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Caixinhas */}
            {caixinhas.map((c, i) => (
              <div key={`caixinha-${i}`} className="bg-[#111] border border-[#333] rounded-2xl p-5 hover:border-[#10B981]/50 transition-all shadow-lg group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-[#10B981]/10 transition-colors">
                    <PiggyBank className="size-5 text-white group-hover:text-[#10B981] transition-colors" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-white text-sm truncate" title={c.name}>{c.name}</div>
                    <div className="text-[10px] text-[#888] uppercase tracking-widest truncate">Caixinha {c.accountId ? `(${treasuryAccounts.find(a => a.id === c.accountId)?.bank_name})` : ''}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#888] uppercase tracking-widest mb-1">Total Guardado</div>
                  <div className="text-2xl font-light tracking-tight text-white">
                    {formatBRL(c.amount)}
                  </div>
                </div>
              </div>
            ))}
            
            {treasuryAccounts.filter(a => a.account_context === activeContext).length === 0 && caixinhas.length === 0 && (
              <div className="col-span-full text-center py-8 text-[#555] text-sm bg-[#111] border border-dashed border-[#333] rounded-2xl">
                Nenhuma conta ou caixinha configurada neste contexto.
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111] border border-[#333] w-full max-w-md rounded-2xl shadow-2xl flex flex-col p-8 space-y-6 text-white">
            <h2 className="text-xl font-light tracking-tight text-white border-b border-[#222] pb-4">
              <span className="font-bold text-[#EBB52C]">{editingId ? 'Editar' : 'Nova'} {modalType === 'income' ? 'Receita' : 'Despesa'}</span>
              {isSimulatorActive && " 🧪"}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Descrição</label>
                <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full mt-1 p-3 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:border-[#EBB52C] focus:outline-none transition-colors" placeholder="Ex: Conta de Luz" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Categoria</label>
                <input list="categoriesList" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full mt-1 p-3 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:border-[#EBB52C] focus:outline-none transition-colors" placeholder="Selecione ou digite nova..." />
                <datalist id="categoriesList">
                  {categories[modalType].map(c => <option key={c} value={c} />)}
                  {Array.from(new Set(transactions.filter(t => t.type === modalType).map(t => t.category))).filter(c => !categories[modalType].includes(c)).map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Valor (R$)</label>
                  <input type="text" inputMode="decimal" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full mt-1 p-3 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:border-[#EBB52C] focus:outline-none transition-colors" placeholder="0.00" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full mt-1 p-3 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:border-[#EBB52C] focus:outline-none transition-colors" />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-1">Conta Bancária / Destino</label>
                <select 
                  value={form.treasury_account_id}
                  onChange={e => setForm({...form, treasury_account_id: e.target.value})}
                  className="w-full p-3 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:border-[#EBB52C] focus:outline-none transition-colors appearance-none"
                >
                  <option value="">Não especificado (Caixa Geral)</option>
                  {treasuryAccounts.filter(a => a.account_context === activeContext).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bank_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-3 border-t border-[#222]">
                <label className="flex items-center gap-2 text-sm font-medium text-[#aaa] cursor-pointer hover:text-white transition-colors">
                  <input type="checkbox" checked={form.paid} onChange={e => setForm({...form, paid: e.target.checked})} className="rounded text-[#EBB52C] focus:ring-[#EBB52C] bg-[#0a0a0a] border-[#333] size-4" />
                  {modalType === 'income' ? 'Já Recebido' : 'Já Pago'}
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-[#aaa] cursor-pointer hover:text-white transition-colors">
                  <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({...form, is_recurring: e.target.checked})} className="rounded text-[#EBB52C] focus:ring-[#EBB52C] bg-[#0a0a0a] border-[#333] size-4" />
                  Mensal Recorrente
                </label>
              </div>
              
              {modalType === 'income' && !editingId && (
                <div className="pt-4 border-t border-[#222]">
                  <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest flex justify-between">
                    <span>Destinar parte para Reserva/Caixa (%)</span>
                    <span className="text-[#EBB52C] font-mono">{form.reservePercentage}%</span>
                  </label>
                  <input type="range" min="0" max="100" step="5" value={form.reservePercentage} onChange={e => setForm({...form, reservePercentage: Number(e.target.value)})} className="w-full mt-2 accent-[#EBB52C]" />
                  {form.reservePercentage > 0 && form.amount && (
                    <div className="text-xs text-[#aaa] mt-3 p-3 bg-[#0a0a0a] rounded-lg border border-[#333] font-mono flex flex-col gap-1 shadow-inner">
                      <div className="flex justify-between items-center"><span className="text-[#888]">Caixa Geral:</span> <span className="text-emerald-400 font-bold">+ {formatBRL(Number(form.amount) * (1 - form.reservePercentage / 100))}</span></div>
                      <div className="flex justify-between items-center"><span className="text-[#888]">Reserva Financeira:</span> <span className="text-[#EBB52C] font-bold">+ {formatBRL(Number(form.amount) * (form.reservePercentage / 100))}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-[#888] hover:text-white hover:bg-[#222] transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[#EBB52C] text-black hover:bg-[#d4a327] transition-colors shadow-lg shadow-[#EBB52C]/20">Salvar Registro</button>
            </div>
          </div>
        </div>
      )}

      {/* PRO-LABORE MODAL */}
      {isProLaboreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 w-full max-w-xl rounded-3xl shadow-[0_0_80px_rgba(235,181,44,0.05)] flex flex-col p-5 sm:p-8 space-y-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#EBB52C]/10 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-2xl font-light tracking-tight text-white flex items-center gap-2">
                <Wallet className="size-6 text-[#EBB52C]" />
                <span className="font-bold text-[#EBB52C]">Tesouraria<span className="font-light text-white ml-1">Black</span></span>
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setTesourariaTab('config')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", tesourariaTab === 'config' ? "bg-[#EBB52C] text-black shadow-md" : "bg-[#1a1a1a] text-[#888] hover:text-white")}>Regras</button>
                <button onClick={() => setTesourariaTab('lab')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", tesourariaTab === 'lab' ? "bg-emerald-500 text-black shadow-md" : "bg-[#1a1a1a] text-[#888] hover:text-emerald-400")}>Laboratório 🧪</button>
              </div>
            </div>
            
            <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
              {tesourariaTab === 'config' ? (
                <>
                  {/* RENDIMENTO E CASHBACK */}
                  <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#222] pb-2">
                  <TrendingUp className="text-emerald-400 size-4" />
                  <h3 className="text-sm font-bold text-white tracking-widest uppercase">Inteligência de Caixa</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-1">Banco / Corretora</label>
                    <input 
                      type="text" 
                      value={bankConfig.bankName} 
                      onChange={e => setBankConfig({...bankConfig, bankName: e.target.value})} 
                      className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:border-[#EBB52C] focus:outline-none focus:bg-white/10 transition-colors shadow-inner" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-1">Rendimento Automático (% a.m.)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={bankConfig.yieldRate} 
                      onChange={e => setBankConfig({...bankConfig, yieldRate: Number(e.target.value)})} 
                      className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:border-[#EBB52C] focus:outline-none focus:bg-white/10 transition-colors shadow-inner" 
                    />
                  </div>
                </div>
                
              </div>

              {/* PRO LABORE */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 border-b border-[#222] pb-2">
                  <Target className="text-[#EBB52C] size-4" />
                  <h3 className="text-sm font-bold text-white tracking-widest uppercase">Distribuição de Lucros</h3>
                </div>

                <label className="flex items-center gap-3 p-4 border border-white/10 rounded-xl bg-white/5 cursor-pointer hover:border-[#EBB52C]/50 hover:bg-white/10 transition-all shadow-lg">
                  <input 
                    type="checkbox" 
                    checked={proLaboreConfig.enabled} 
                    onChange={e => setProLaboreConfig({...proLaboreConfig, enabled: e.target.checked})} 
                    className="rounded text-[#EBB52C] focus:ring-[#EBB52C] bg-black/50 border-white/20 size-5 shrink-0" 
                  />
                  <div>
                    <div className="font-bold text-sm text-white">Ativar Pró-Labore Automático</div>
                    <div className="text-xs text-[#888]">Transfere automaticamente o lucro excedente para o dashboard pessoal.</div>
                  </div>
                </label>

                {proLaboreConfig.enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-2 block">Estratégia de Distribuição</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'sustentavel', label: 'Sustentável', desc: 'Apenas excesso após Capital de Giro' },
                        { id: 'total_sobra', label: 'Total da Sobra', desc: 'Todo lucro operacional (Ativos - Passivos)' },
                        { id: 'teto', label: 'Sobra com Teto', desc: 'Lucro até um teto máximo definido' },
                        { id: 'fixo', label: 'Fixo', desc: 'Valor fixo independente de lucro/prejuízo' }
                      ].map(opt => (
                        <div 
                          key={opt.id}
                          onClick={() => setProLaboreConfig({...proLaboreConfig, type: opt.id})}
                          className={cn("p-3 rounded-xl border cursor-pointer transition-all", proLaboreConfig.type === opt.id ? "bg-[#EBB52C]/20 border-[#EBB52C] text-[#EBB52C] shadow-[0_0_15px_rgba(235,181,44,0.2)]" : "bg-white/5 border-white/10 text-[#aaa] hover:border-white/30 hover:bg-white/10")}
                        >
                          <div className="font-bold text-sm">{opt.label}</div>
                          <div className="text-[10px] mt-1 opacity-70">{opt.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(proLaboreConfig.type === 'teto' || proLaboreConfig.type === 'sustentavel') && (
                    <div>
                      <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Teto Máximo (R$)</label>
                      <input 
                        type="number" 
                        value={proLaboreConfig.tetoValue} 
                        onChange={e => setProLaboreConfig({...proLaboreConfig, tetoValue: Number(e.target.value)})} 
                        className="w-full mt-1 p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:border-[#EBB52C] focus:outline-none focus:bg-white/10 transition-colors shadow-inner" 
                      />
                    </div>
                  )}

                  {proLaboreConfig.type === 'fixo' && (
                    <div>
                      <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Valor Fixo (R$)</label>
                      <input 
                        type="number" 
                        value={proLaboreConfig.fixoValue} 
                        onChange={e => setProLaboreConfig({...proLaboreConfig, fixoValue: Number(e.target.value)})} 
                        className="w-full mt-1 p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:border-[#EBB52C] focus:outline-none focus:bg-white/10 transition-colors shadow-inner" 
                      />
                    </div>
                  )}
                </div>
              )}
              </div>
              </>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  {/* LABORATÓRIO */}
                  <div className="bg-gradient-to-r from-emerald-900/40 to-blue-900/40 p-5 rounded-2xl border border-white/10 flex justify-between items-center shadow-inner">
                    <div>
                      <div className="text-[10px] text-emerald-400/80 mb-1 font-bold tracking-widest uppercase">Caixa Disponível</div>
                      <div className="text-3xl font-light text-white drop-shadow-md">{formatBRL(bizCaixaAtualGlobal)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => addLabIdea('ads')} className="px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-colors">+ Ads</button>
                      <button onClick={() => addLabIdea('capex')} className="px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500/20 transition-colors">+ CAPEX</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {labIdeas.map(idea => (
                      <div key={idea.id} className="border border-white/10 p-5 rounded-2xl bg-white/5 relative group backdrop-blur-sm shadow-xl">
                        <button onClick={() => removeLabIdea(idea.id)} className="absolute top-4 right-4 text-[#555] hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                          <X className="size-4" />
                        </button>
                        
                        <div className="flex items-center gap-2 border-b border-[#222] pb-3 mb-4">
                          {idea.type === 'ads' ? <TrendingUp className="text-emerald-400 size-4" /> : <Target className="text-blue-400 size-4" />}
                          <input 
                            type="text" 
                            value={idea.name} 
                            onChange={e => updateLabIdea(idea.id, 'name', e.target.value)} 
                            className="bg-transparent text-sm font-bold text-white tracking-widest uppercase focus:outline-none focus:border-b focus:border-[#EBB52C]"
                          />
                        </div>

                        {idea.type === 'ads' ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-1">Investimento (R$)</label>
                                <input type="number" value={idea.investimento} onChange={e => updateLabIdea(idea.id, 'investimento', Number(e.target.value))} className="w-full p-3 border border-white/10 rounded-xl bg-black/40 text-white focus:border-emerald-500 focus:outline-none transition-colors shadow-inner" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-1">Retorno (ROAS)</label>
                                <input type="number" step="0.1" value={idea.roi} onChange={e => updateLabIdea(idea.id, 'roi', Number(e.target.value))} className="w-full p-3 border border-white/10 rounded-xl bg-black/40 text-white focus:border-emerald-500 focus:outline-none transition-colors shadow-inner" />
                              </div>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex justify-between items-center">
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Lucro Projetado da Operação</span>
                              <span className="text-lg text-emerald-400 font-bold">+ {formatBRL(idea.investimento * idea.roi - idea.investimento)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-1">Custo Total (R$)</label>
                                <input type="number" value={idea.investimento} onChange={e => updateLabIdea(idea.id, 'investimento', Number(e.target.value))} className="w-full p-3 border border-white/10 rounded-xl bg-black/40 text-white focus:border-blue-500 focus:outline-none transition-colors shadow-inner" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-1">Receita Mensal (R$)</label>
                                <input type="number" value={idea.retornoMensal} onChange={e => updateLabIdea(idea.id, 'retornoMensal', Number(e.target.value))} className="w-full p-3 border border-white/10 rounded-xl bg-black/40 text-white focus:border-blue-500 focus:outline-none transition-colors shadow-inner" />
                              </div>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex justify-between items-center">
                              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Tempo de Payback Estimado</span>
                              <span className="text-lg text-blue-400 font-bold">{idea.retornoMensal > 0 ? formatNumber(idea.investimento / idea.retornoMensal) : '∞'} meses</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {labIdeas.length === 0 && (
                      <div className="text-center p-8 text-[#555] border border-dashed border-[#333] rounded-xl">
                        Nenhuma simulação salva. Crie uma nova acima.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-[#222]">
              <button onClick={() => setIsProLaboreModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[#EBB52C] text-black hover:bg-[#d4a327] transition-colors shadow-lg shadow-[#EBB52C]/20">Concluído</button>
            </div>
          </div>
        </div>
      )}

      {/* GLOSSARY MODAL */}
      {isGlossaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111] border border-[#333] w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
            <div className="flex justify-between items-center p-6 border-b border-[#222]">
              <h2 className="text-xl font-light tracking-tight flex items-center gap-3">
                <BookOpen className="text-[#EBB52C] size-6" /> 
                <span className="font-bold text-[#EBB52C]">Dicionário do CFO</span>
              </h2>
              <button onClick={() => setIsGlossaryOpen(false)} className="p-2 text-[#888] hover:text-white rounded-lg hover:bg-[#222] transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333] flex gap-3 text-sm text-[#ccc] mb-6">
                <Info className="size-5 text-[#EBB52C] shrink-0" />
                <p>Consulte este glossário rápido sempre que tiver dúvidas sobre os termos financeiros utilizados em relatórios gerenciais e de governança corporativa.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {glossaryTerms.map((g, i) => (
                  <div key={i} className="bg-[#0a0a0a] border border-[#222] p-4 rounded-xl hover:border-[#333] transition-colors">
                    <div className="flex items-baseline gap-2 mb-2">
                      <h4 className="font-bold text-[#EBB52C] text-sm">{g.term}</h4>
                      <span className="text-[10px] text-[#666] italic">{g.full}</span>
                    </div>
                    <p className="text-xs text-[#aaa] leading-relaxed">{g.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Tarefas */}
      {isTasksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-[#222] flex justify-between items-center bg-gradient-to-r from-[#1a1a1a] to-[#111]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckSquare className="size-5 text-[#EBB52C]" /> Action Items
                </h2>
                <p className="text-xs text-[#888] mt-1 flex items-center gap-2">
                  {tasks.filter(t => t.done).length} de {tasks.length} concluídas
                  <span className="w-16 h-1.5 bg-[#222] rounded-full overflow-hidden ml-2">
                    <span className="block h-full bg-[#EBB52C] transition-all" style={{width: `${tasks.length > 0 ? (tasks.filter(t => t.done).length / tasks.length) * 100 : 0}%`}}></span>
                  </span>
                </p>
              </div>
              <button onClick={() => setIsTasksOpen(false)} className="p-2 text-[#888] hover:text-white hover:bg-[#222] rounded-xl transition-all">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="flex flex-col gap-3 bg-[#1a1a1a] p-4 rounded-2xl border border-[#222]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                    placeholder="Adicionar nova pendência..."
                    className="flex-1 bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#EBB52C] transition-colors"
                  />
                  <button 
                    onClick={addTask}
                    className="bg-[#EBB52C] text-black px-4 rounded-xl font-bold hover:bg-[#d4a327] transition-all flex items-center gap-2 shadow-lg shadow-[#EBB52C]/20"
                  >
                    <Plus className="size-5" /> <span className="hidden sm:inline text-sm">Adicionar</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(urg => (
                    <button
                      key={urg}
                      onClick={() => setNewTaskUrgency(urg)}
                      className={cn(
                        "text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg border transition-all",
                        newTaskUrgency === urg 
                          ? (urg === 'high' ? 'bg-rose-500/20 border-rose-500/50 text-rose-500' : urg === 'medium' ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500')
                          : "bg-transparent border-[#333] text-[#666] hover:border-[#555]"
                      )}
                    >
                      {urg === 'high' ? '🔴 Alta' : urg === 'medium' ? '🟡 Média' : '🟢 Baixa'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center text-[#555] py-12 flex flex-col items-center gap-3">
                    <CheckCircle2 className="size-12 text-[#222]" />
                    <span className="text-sm">Nenhuma pendência registrada.<br/>Você está em dia!</span>
                  </div>
                ) : (
                  tasks.map(task => {
                    const d = new Date(task.createdAt || new Date().toISOString());
                    const timeAgo = Math.floor((new Date().getTime() - d.getTime()) / 60000);
                    const timeStr = timeAgo < 1 ? 'agora mesmo' : timeAgo < 60 ? `${timeAgo}m atrás` : timeAgo < 1440 ? `${Math.floor(timeAgo/60)}h atrás` : `${Math.floor(timeAgo/1440)}d atrás`;

                    return (
                      <div key={task.id} className={cn(
                        "group flex items-start gap-3 p-4 rounded-2xl border transition-all duration-300", 
                        task.done ? "bg-[#111] border-[#222] opacity-60" : "bg-gradient-to-r from-[#1a1a1a] to-[#111] border-[#333] hover:border-[#555] shadow-sm"
                      )}>
                        <button 
                          onClick={() => toggleTask(task.id)} 
                          className={cn("mt-0.5 size-5 rounded-md flex items-center justify-center border shrink-0 transition-all duration-300", task.done ? "bg-[#10B981] border-[#10B981] text-white" : "border-[#555] text-transparent hover:border-[#EBB52C]")}
                        >
                          <CheckSquare className="size-3" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm transition-all duration-300 leading-snug break-words", task.done ? "text-[#666] line-through" : "text-[#eee]")}>
                            {task.text}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border", 
                              task.urgency === 'high' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                              task.urgency === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                              'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            )}>
                              {task.urgency === 'high' ? 'Alta' : task.urgency === 'medium' ? 'Média' : 'Baixa'}
                            </span>
                            <span className="text-[10px] text-[#666] font-mono flex items-center gap-1">
                              <Calendar className="size-3" /> {timeStr}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-[#666] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {kpiExplanation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in zoom-in duration-200" onClick={() => setKpiExplanation(null)}>
          <div className="bg-[#111] border border-[#333] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center p-5 border-b border-[#222] bg-[#141414]`}>
              <h3 className={`font-bold text-lg tracking-tight ${kpiExplanation.color}`}>{kpiExplanation.title}</h3>
              <button onClick={() => setKpiExplanation(null)} className="text-[#888] hover:text-white transition-colors p-2 hover:bg-[#222] rounded-full">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#EBB52C] uppercase tracking-widest flex items-center gap-2">
                  <span>🧸</span> Explicação para Crianças (5 anos)
                </h4>
                <p className="text-white text-[15px] leading-relaxed bg-[#1a1a1a] p-4 rounded-xl border border-[#333] shadow-inner">
                  {kpiExplanation.kidExplanation}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-widest flex items-center gap-2">
                  <span>📊</span> Cálculo de CFO (Técnico)
                </h4>
                <p className="text-[#aaa] text-xs leading-relaxed pl-1 border-l-2 border-[#333]">
                  {kpiExplanation.adultExplanation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Caixa Projetado Modal */}
      {isCaixaProjetadoModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-[#333] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-[#222] bg-[#141414]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EBB52C]/10 flex items-center justify-center">
                  <Target className="size-5 text-[#EBB52C]" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight">O que é o Caixa Projetado?</h3>
                  <p className="text-[#888] text-xs">Entenda como esse cálculo protege sua operação</p>
                </div>
              </div>
              <button onClick={() => setIsCaixaProjetadoModalOpen(false)} className="text-[#888] hover:text-white transition-colors p-2 hover:bg-[#222] rounded-full">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <p className="text-[#ccc] text-sm leading-relaxed">
                O <strong>Caixa Projetado (Mês)</strong> é uma simulação de como o saldo das suas contas bancárias vai terminar no último dia deste mês. Ele é a sua principal ferramenta de "previsão do futuro".
              </p>
              
              <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-[#EBB52C] uppercase tracking-widest border-b border-[#333] pb-2">Como ele é calculado?</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-[#222] pb-2">
                    <span className="text-[#888]">1. Caixa Atual (Dinheiro em conta agora)</span>
                    <span className="font-mono text-white">{formatBRL(caixaAtual)}</span>
                  </div>
                  <div className="border-b border-[#222] pb-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#888]">2. O que falta entrar</span>
                      <span className="font-mono text-emerald-400">+ {formatBRL(pendentesReceber)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-[#555] pl-4">
                      <span>↳ Entradas previstas para o mês</span>
                      <span className="font-mono">{formatBRL(incomePendenteMes)}</span>
                    </div>
                    {incomeAtrasado > 0 && (
                      <div className="flex justify-between items-center text-[10px] text-emerald-500/70 pl-4">
                        <span>↳ Entradas atrasadas (meses anteriores)</span>
                        <span className="font-mono">{formatBRL(incomeAtrasado)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-b border-[#222] pb-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#888]">3. O que falta sair</span>
                      <span className="font-mono text-rose-500">- {formatBRL(pendentesPagar)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-[#555] pl-4">
                      <span>↳ Despesas previstas para o mês</span>
                      <span className="font-mono">{formatBRL(expensePendenteMes)}</span>
                    </div>
                    {expenseAtrasado > 0 && (
                      <div className="flex justify-between items-center text-[10px] text-rose-500/70 pl-4">
                        <span>↳ Despesas atrasadas (meses anteriores)</span>
                        <span className="font-mono">{formatBRL(expenseAtrasado)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-base pt-2">
                    <span className="font-bold text-white">= Caixa Projetado</span>
                    <span className={cn("font-mono font-bold text-lg", caixaProjetado < 0 ? "text-rose-500" : "text-[#EBB52C]")}>
                      {formatBRL(caixaProjetado)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl p-4 text-sm text-[#10B981]">
                <strong>Dica de Gestão:</strong> Se o Caixa Projetado estiver negativo, significa que as contas que você ainda precisa pagar neste mês superam o dinheiro que você tem + o que vai entrar. É um sinal de alerta para acelerar as vendas ou adiar alguma despesa!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Caixa Acumulado Modal (DFC) */}
      {isDfcModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-[#333] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-[#222] bg-[#141414]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Wallet className="size-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight">O que é o Caixa Acumulado?</h3>
                  <p className="text-[#888] text-xs">Demonstrativo de Fluxo de Caixa (DFC)</p>
                </div>
              </div>
              <button onClick={() => setIsDfcModalOpen(false)} className="text-[#888] hover:text-white transition-colors p-2 hover:bg-[#222] rounded-full">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <p className="text-[#ccc] text-sm leading-relaxed">
                O <strong>Caixa Acumulado</strong> simula o saldo que você terá ao final do mês que está visualizando. 
                Ele pega o que você tem hoje (Caixa Atual) e soma as <strong>sobras</strong> de todos os meses até chegar lá.
              </p>
              
              <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-[#EBB52C] uppercase tracking-widest border-b border-[#333] pb-2">Como chegamos neste valor?</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-[#222] pb-2">
                    <span className="text-[#888]">1. Histórico de Entradas (Tudo até {selectedDate.toLocaleDateString('pt-BR', {month: 'long'})})</span>
                    <span className="font-mono text-emerald-400">
                      + {formatBRL(allIncomesSelected)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-[#222] pb-2">
                    <span className="text-[#888]">2. Histórico de Saídas (Tudo até {selectedDate.toLocaleDateString('pt-BR', {month: 'long'})})</span>
                    <span className="font-mono text-rose-500">
                      - {formatBRL(allExpensesSelected)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-base pt-2">
                    <span className="font-bold text-white">= Caixa Acumulado</span>
                    <span className={cn("font-mono font-bold text-lg", caixaAcumulado < 0 ? "text-rose-500" : "text-emerald-400")}>
                      {formatBRL(caixaAcumulado)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl p-4 text-sm text-[#10B981]">
                <strong>Entendendo a matemática:</strong> Se você selecionou Setembro, nós pegamos tudo que você efetivamente recebeu e pagou até hoje, mais o lucro ou prejuízo previsto de todos os meses pelo caminho (inclusive Setembro).
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Caixinhas Modal */}
      {isCaixinhasModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 w-full max-w-2xl rounded-3xl shadow-[0_0_80px_rgba(235,181,44,0.08)] flex flex-col max-h-[90vh] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#EBB52C]/10 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
            
            <div className="flex justify-between items-center p-6 sm:p-8 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EBB52C]/20 to-[#EBB52C]/5 border border-[#EBB52C]/20 flex items-center justify-center shadow-lg shadow-[#EBB52C]/10">
                  <Database className="size-6 text-[#EBB52C]" />
                </div>
                <div>
                  <h3 className="text-2xl font-light tracking-tight text-white flex items-center gap-2">
                    <span className="font-bold text-[#EBB52C]">Reservas</span><span className="font-light text-white">& Caixinhas</span>
                  </h3>
                  <p className="text-[#EBB52C]/80 text-sm font-medium mt-0.5 tracking-wide">Total guardado: {formatBRL(acumuladoReserva)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isCaixinhaFormOpen && (
                  <button 
                    onClick={() => {
                      setCaixinhaFormName('');
                      setCaixinhaFormAmount('');
                      setCaixinhaFormType('aporte');
                      setIsCaixinhaFormOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#EBB52C]/10 text-[#EBB52C] hover:bg-[#EBB52C] hover:text-black hover:shadow-[0_0_15px_rgba(235,181,44,0.3)] rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus className="size-4 shrink-0" /> <span className="hidden sm:inline">Nova Caixinha</span>
                  </button>
                )}
                <button onClick={() => { setIsCaixinhasModalOpen(false); setIsCaixinhaFormOpen(false); }} className="text-[#888] hover:text-white transition-all p-2 hover:bg-white/10 rounded-xl">
                  <X className="size-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar relative z-10">
              {!isCaixinhaFormOpen && (
                <p className="text-[#aaa] text-sm leading-relaxed mb-6 bg-white/5 p-4 rounded-2xl border border-white/5">
                  Este é o dinheiro que você separou da sua operação diária. Ele fica "guardado" e <strong>não entra</strong> no cálculo de Lucro Operacional ou Despesas do mês.
                </p>
              )}
              
              {isCaixinhaFormOpen ? (
                <form onSubmit={handleSaveCaixinha} className="bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/10 mb-6 animate-in fade-in zoom-in-95 duration-300 shadow-xl relative overflow-hidden">
                  <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] -z-10 pointer-events-none", caixinhaFormType === 'aporte' ? "bg-emerald-500/20" : "bg-rose-500/20")}></div>
                  
                  <h4 className="text-base font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-white/5">
                    {caixinhaFormType === 'aporte' ? (
                      <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><TrendingUp className="size-5 text-emerald-400" /></div>
                    ) : (
                      <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20"><TrendingDown className="size-5 text-rose-400" /></div>
                    )}
                    {caixinhaFormType === 'aporte' ? 'Novo Aporte (Guardar Dinheiro)' : 'Novo Resgate (Retirar Dinheiro)'}
                  </h4>
                  
                  <div className="space-y-5 relative z-10">
                    <div>
                      <label className="text-[10px] text-[#888] font-bold uppercase tracking-widest mb-1.5 block">Nome da Caixinha</label>
                      <input 
                        required
                        type="text" 
                        value={caixinhaFormName}
                        onChange={e => setCaixinhaFormName(e.target.value)}
                        placeholder="Ex: Reserva de Emergência"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#EBB52C] focus:bg-white/5 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-[10px] text-[#888] font-bold uppercase tracking-widest mb-1.5 block">Valor (R$)</label>
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          min="0.01"
                          value={caixinhaFormAmount}
                          onChange={e => setCaixinhaFormAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#EBB52C] focus:bg-white/5 focus:outline-none transition-all shadow-inner font-mono"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] text-[#888] font-bold uppercase tracking-widest mb-1.5 block">Vincular a qual Banco?</label>
                        <div className="relative">
                          <select 
                            value={caixinhaFormAccountId}
                            onChange={e => setCaixinhaFormAccountId(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#EBB52C] focus:bg-white/5 focus:outline-none transition-all appearance-none shadow-inner pr-10"
                          >
                            <option value="">Não especificado (Caixa Geral)</option>
                            {treasuryAccounts.filter(a => a.account_context === activeContext).map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.bank_name}</option>
                            ))}
                          </select>
                          <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#888] pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5 mt-6">
                      <button 
                        type="button"
                        onClick={() => setIsCaixinhaFormOpen(false)}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-[#aaa] text-sm font-bold hover:bg-white/5 hover:text-white transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={isSavingCaixinha}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-black text-sm font-bold transition-all disabled:opacity-50 shadow-lg",
                          caixinhaFormType === 'aporte' 
                            ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20"
                            : "bg-[#EBB52C] hover:bg-[#d4a327] shadow-[#EBB52C]/20"
                        )}
                      >
                        {isSavingCaixinha ? 'Salvando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {caixinhas.length > 0 ? (
                    caixinhas.map((c, i) => (
                      <div key={i} className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-[#EBB52C]/30 hover:bg-white/10 transition-all duration-300 gap-4 shadow-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#EBB52C]/10 flex items-center justify-center text-[#EBB52C] shrink-0 border border-[#EBB52C]/20 shadow-inner group-hover:scale-110 transition-transform">
                            <PiggyBank className="size-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-lg">{c.name}</span>
                            {c.accountId && (
                              <span className="text-[10px] text-[#888] font-bold tracking-widest uppercase mt-0.5 flex items-center gap-1.5">
                                <Wallet className="size-3" />
                                Banco: {treasuryAccounts.find(a => a.id === c.accountId)?.bank_name || 'Desconhecido'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="font-mono text-xl font-bold text-[#EBB52C] drop-shadow-md">{formatBRL(c.amount)}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setCaixinhaFormName(c.name);
                                setCaixinhaFormAmount('');
                                setCaixinhaFormType('aporte');
                                setCaixinhaFormAccountId(c.accountId || '');
                                setIsCaixinhaFormOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                              title="Fazer novo aporte"
                            >
                              + Aporte
                            </button>
                            <button 
                              onClick={() => {
                                setCaixinhaFormName(c.name);
                                setCaixinhaFormAmount('');
                                setCaixinhaFormType('resgate');
                                setCaixinhaFormAccountId(c.accountId || '');
                                setIsCaixinhaFormOpen(true);
                              }}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                              title="Resgatar valor"
                            >
                              - Resgate
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-[#555] border border-dashed border-white/10 rounded-3xl bg-white/5">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <PiggyBank className="size-8 opacity-40" />
                      </div>
                      <p className="text-white/60 mb-2">Nenhuma caixinha registrada ainda.</p>
                      <button 
                        onClick={() => {
                          setCaixinhaFormName('');
                          setCaixinhaFormAmount('');
                          setCaixinhaFormType('aporte');
                          setIsCaixinhaFormOpen(true);
                        }}
                        className="mt-4 px-6 py-3 bg-[#EBB52C] text-black rounded-xl text-sm font-bold hover:bg-[#d4a327] transition-all shadow-lg shadow-[#EBB52C]/20"
                      >
                        Criar Primeira Caixinha
                      </button>
                    </div>
                  )}
                  
                  {/* Histórico de Movimentações */}
                  <div className="mt-10 pt-8 border-t border-white/5">
                    <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
                      <List className="size-4 text-[#EBB52C]" /> Histórico de Movimentações
                    </h4>
                    <div className="space-y-3">
                      {ctxData.filter(t => isCaixinha(t.category)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                        <div key={t.id} className="group flex justify-between items-center p-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl hover:border-white/20 transition-all duration-300">
                          <div>
                            <div className="text-sm font-bold text-white mb-1">{t.description || t.category}</div>
                            <div className="text-[10px] text-[#888] font-medium tracking-wide uppercase flex items-center gap-1.5">
                              <Calendar className="size-3" /> {t.date.split('-').reverse().join('/')} <span className="text-white/20">•</span> {t.type === 'expense' ? 'Aporte' : 'Resgate'}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={cn("font-mono text-sm font-bold px-3 py-1 rounded-lg border", t.type === 'expense' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border-rose-400/20')}>
                              {t.type === 'expense' ? '+' : '-'} {formatBRL(t.amount)}
                            </span>
                            <button 
                              onClick={() => handleDelete(t.id)}
                              className="p-2 text-[#555] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              title="Excluir movimentação"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {ctxData.filter(t => isCaixinha(t.category)).length === 0 && (
                        <div className="text-center py-8 text-[#555] text-xs bg-white/5 rounded-2xl border border-white/5">Nenhum histórico encontrado.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categories CRUD Modal */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-[#333] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-[#222] bg-[#1a1608]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EBB52C]/10 flex items-center justify-center">
                  <Database className="size-5 text-[#EBB52C]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#EBB52C] text-lg tracking-tight">Configuração de Categorias</h3>
                  <p className="text-[#EBB52C]/70 text-xs">Crie, edite e gerencie suas categorias financeiras</p>
                </div>
              </div>
              <button onClick={() => setIsCategoriesModalOpen(false)} className="text-[#888] hover:text-white transition-colors p-2 hover:bg-[#222] rounded-full">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs font-bold text-[#888] uppercase tracking-wider">Nova Categoria</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="Ex: Fornecedores"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white focus:border-[#EBB52C] focus:outline-none transition-colors"
                  />
                </div>
                <div className="w-full sm:w-auto space-y-1">
                  <label className="text-xs font-bold text-[#888] uppercase tracking-wider">Tipo</label>
                  <select
                    value={newCategoryType}
                    onChange={e => setNewCategoryType(e.target.value as 'income' | 'expense')}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white focus:border-[#EBB52C] focus:outline-none transition-colors appearance-none"
                  >
                    <option value="expense">Despesa (Saída)</option>
                    <option value="income">Receita (Entrada)</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (!newCategoryName.trim()) return;
                    setCategories(prev => ({
                      ...prev,
                      [newCategoryType]: [...prev[newCategoryType], newCategoryName.trim()]
                    }));
                    setNewCategoryName('');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-[#EBB52C] text-black font-bold rounded-lg hover:bg-[#EBB52C]/90 transition-colors"
                >
                  Adicionar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                    <TrendingUp className="size-4" /> Receitas
                  </h4>
                  <div className="space-y-2">
                    {categories.income.map(cat => (
                      <div key={cat} className="flex justify-between items-center p-2 bg-[#1a1a1a] border border-[#333] rounded-lg">
                        <span className="text-sm text-[#ddd]">{cat}</span>
                        <button 
                          onClick={() => setCategories(prev => ({ ...prev, income: prev.income.filter(c => c !== cat) }))}
                          className="p-1.5 text-[#555] hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
                    <TrendingDown className="size-4" /> Despesas
                  </h4>
                  <div className="space-y-2">
                    {categories.expense.map(cat => (
                      <div key={cat} className="flex justify-between items-center p-2 bg-[#1a1a1a] border border-[#333] rounded-lg">
                        <span className="text-sm text-[#ddd]">{cat}</span>
                        <button 
                          onClick={() => setCategories(prev => ({ ...prev, expense: prev.expense.filter(c => c !== cat) }))}
                          className="p-1.5 text-[#555] hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <TreasuryAccountModal 
        open={isTreasuryModalOpen}
        account={editingTreasuryAcc}
        onClose={() => setIsTreasuryModalOpen(false)}
        onSuccess={refetchTreasury}
      />

    </div>
  );
}
