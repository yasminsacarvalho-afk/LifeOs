const fs = require('fs');
const file = 'src/routes/finance.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.startsWith('function AnnualFinanceView'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith('function FinanceDashboard'));

if (startIdx !== -1 && endIdx !== -1) {
  const newComp = `function AnnualFinanceView({ transactions, activeContext, year }: { transactions: Transaction[], activeContext: 'business' | 'personal', year: number }) {
  const yearTransactions = transactions.filter(t => t.context === activeContext && new Date(t.date).getFullYear() === year);
  const allPastTx = transactions.filter(t => t.context === activeContext && new Date(t.date).getFullYear() <= year);

  // 1. DADOS BASE E RECEITA LÍQUIDA
  const totalIncome = yearTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
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
  const totalAtivos = allPastTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
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
  const futureIncomes = transactions.filter(t => t.context === activeContext && t.type === 'income' && !t.paid);
  const futureExpenses = transactions.filter(t => t.context === activeContext && t.type === 'expense' && !t.paid);
  
  const aReceberAtrasado = futureIncomes.filter(t => new Date(t.date) < today).reduce((s, t) => s + t.amount, 0);
  const aReceber7d = futureIncomes.filter(t => new Date(t.date) >= today && new Date(t.date) <= new Date(today.getTime() + 7 * 86400000)).reduce((s, t) => s + t.amount, 0);
  const aReceber30d = futureIncomes.filter(t => new Date(t.date) > new Date(today.getTime() + 7 * 86400000) && new Date(t.date) <= new Date(today.getTime() + 30 * 86400000)).reduce((s, t) => s + t.amount, 0);
  
  const aPagarAtrasado = futureExpenses.filter(t => new Date(t.date) < today).reduce((s, t) => s + t.amount, 0);
  const aPagar7d = futureExpenses.filter(t => new Date(t.date) >= today && new Date(t.date) <= new Date(today.getTime() + 7 * 86400000)).reduce((s, t) => s + t.amount, 0);
  const aPagar30d = futureExpenses.filter(t => new Date(t.date) > new Date(today.getTime() + 7 * 86400000) && new Date(t.date) <= new Date(today.getTime() + 30 * 86400000)).reduce((s, t) => s + t.amount, 0);

  // 6. CHARTS DATA
  let acmPatrimonio = totalAtivos - totalPassivos - (totalIncome - totalExpense); // start of year estimate
  const monthlyData = Array.from({ length: 12 }).map((_, i) => {
    const monthTx = yearTransactions.filter(t => new Date(t.date).getMonth() === i);
    const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
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
  const incomeByCategory = yearTransactions.filter(t => t.type === 'income').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string, number>);

  const sortedExpenses = Object.entries(expenseByCategory).sort((a,b) => b[1] - a[1]);
  const sortedIncomes = Object.entries(incomeByCategory).sort((a,b) => b[1] - a[1]);

  const COLORS = ['#F43F5E', '#EBB52C', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#2DD4BF', '#FBBF24', '#A78BFA'];
  const INCOME_COLORS = ['#10B981', '#3B82F6', '#2DD4BF', '#FBBF24', '#8B5CF6', '#EC4899', '#A78BFA', '#F97316', '#EBB52C', '#F43F5E'];

  const expensePieData = sortedExpenses.map(([key, val]) => { const perc = totalExpense > 0 ? formatNumber((val / totalExpense) * 100) : "0,0"; return { name: \`\${key} (\${perc}%)\`, value: val, category: key, perc }; });
  const incomePieData = sortedIncomes.map(([key, val]) => { const perc = totalIncome > 0 ? formatNumber((val / totalIncome) * 100) : "0,0"; return { name: \`\${key} (\${perc}%)\`, value: val, category: key, perc }; });

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
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Margem Líquida</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-light text-white">{formatNumber(margemLiquidaPerc)}%</div>
            <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold", getAlertProps(margemLiquidaPerc, 20, 10))}>Status</div>
          </div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Índice Liquidez</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-light text-white">{liquidez === 999 ? '∞' : formatNumber(liquidez)}</div>
            <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold", getAlertProps(liquidez, 1.5, 1))}>Status</div>
          </div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">Runway (Caixa)</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-light text-white">{runway === 999 ? '∞' : Math.floor(runway)} <span className="text-xs">m</span></div>
            <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold", getAlertProps(runway, 6, 3))}>Status</div>
          </div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 shadow-xl">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-1">MRR (Recorrente)</div>
          <div className="text-2xl font-light text-[#3B82F6]">{formatBRL(mrr)}</div>
        </div>
      </div>

      {/* Main Financial Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500"><TrendingUp className="size-32 text-white" /></div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> Receita Líquida (Ano)
          </div>
          <div className="text-3xl font-light text-white tracking-tight"><span className="font-bold">{formatBRL(receitaLiquida)}</span></div>
          <div className="text-[10px] text-[#555] mt-3 uppercase tracking-wider">Bruto: {formatBRL(totalIncome)}</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500"><Wallet className="size-32 text-white" /></div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EBB52C]"></span> Lucro Líquido (Ano)
          </div>
          <div className="text-3xl font-light text-[#EBB52C] tracking-tight"><span className="font-bold">{formatBRL(lucroLiquido)}</span></div>
          <div className="text-[10px] text-[#555] mt-3 uppercase tracking-wider">Despesas: {formatBRL(totalExpense)}</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500"><ShieldAlert className="size-32 text-white" /></div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#888] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span> Patrimônio Líquido
          </div>
          <div className="text-3xl font-light text-[#3B82F6] tracking-tight"><span className="font-bold">{formatBRL(patrimonioLiquido)}</span></div>
          <div className="text-[10px] text-[#555] mt-3 uppercase tracking-wider">Ativos Totais - Passivos</div>
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
              <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} stroke="#888" tickFormatter={(v) => \`R$\${v/1000}k\`} />
              <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} stroke="#3B82F6" tickFormatter={(v) => \`R$\${v/1000}k\`} />
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
                    <Cell key={\`cell-\${index}\`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {incomePieData.map((item, index) => (
              <div key={item.category} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: INCOME_COLORS[index % INCOME_COLORS.length] }}></div>
                  <span className="text-[#aaa]">{item.category}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-emerald-400 font-medium block">{formatBRL(item.value)}</span>
                  <span className="text-[10px] text-[#555]">{item.perc}% do total</span>
                </div>
              </div>
            ))}
            {incomePieData.length === 0 && <div className="text-[#555] text-xs">Nenhuma receita registrada.</div>}
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-rose-500 text-sm uppercase tracking-widest border-b border-[#222] pb-3 mb-4">Composição de Despesas</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {expensePieData.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {expensePieData.map((item, index) => (
              <div key={item.category} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-[#aaa]">{item.category}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-rose-500 font-medium block">{formatBRL(item.value)}</span>
                  <span className="text-[10px] text-[#555]">{item.perc}% do total</span>
                </div>
              </div>
            ))}
            {expensePieData.length === 0 && <div className="text-[#555] text-xs">Nenhuma despesa registrada.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
`
lines.splice(startIdx, endIdx - startIdx, newComp);
fs.writeFileSync(file, lines.join('\n'));
console.log('Update complete');
} else {
console.log('Failed to find indices', startIdx, endIdx);
}
