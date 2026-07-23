import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkFinancials() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const currentStartDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00.000Z`;
  const lastStartDate = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01T00:00:00.000Z`;

  const { data: currentSales } = await supabase.from('sales').select('amount').gte('created_at', currentStartDate);
  const { data: lastSales } = await supabase.from('sales').select('amount').gte('created_at', lastStartDate).lt('created_at', currentStartDate);
  
  const { data: currentPackages } = await supabase.from('packages').select('price').gte('created_at', currentStartDate);
  const { data: lastPackages } = await supabase.from('packages').select('price').gte('created_at', lastStartDate).lt('created_at', currentStartDate);

  const { data: expenses } = await supabase.from('expenses').select('amount, category').gte('expense_date', currentStartDate.split('T')[0]);

  const { data: cashClosings } = await supabase.from('cash_closings').select('actual_cash, expected_cash').order('created_at', { ascending: false }).limit(5);

  const currentSalesTotal = (currentSales || []).reduce((sum, s) => sum + Number(s.amount), 0) + (currentPackages || []).reduce((sum, p) => sum + Number(p.price), 0);
  const lastSalesTotal = (lastSales || []).reduce((sum, s) => sum + Number(s.amount), 0) + (lastPackages || []).reduce((sum, p) => sum + Number(p.price), 0);
  const opex = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
  
  const growth = lastSalesTotal > 0 ? ((currentSalesTotal - lastSalesTotal) / lastSalesTotal) * 100 : 0;

  console.log('--- RELATORIO ---');
  console.log(`Receita Mês Atual: R$ ${currentSalesTotal.toFixed(2)}`);
  console.log(`Receita Mês Anterior: R$ ${lastSalesTotal.toFixed(2)}`);
  console.log(`Crescimento (Taxa de Aumento de Receita): ${growth.toFixed(2)}%`);
  console.log(`Despesas Lançadas (Mês Atual): R$ ${opex.toFixed(2)}`);
  
  console.log('Últimos fechamentos de caixa:');
  (cashClosings || []).forEach((c, i) => {
    console.log(`[${i+1}] Físico: R$ ${c.actual_cash} | Esperado: R$ ${c.expected_cash} | Dif: R$ ${(c.actual_cash - c.expected_cash).toFixed(2)}`);
  });
}

checkFinancials();
