import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Building2, 
  Calendar, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Trash2,
  Ticket,
  Activity,
  Calculator,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { useCashClosingsRealtime } from "@/hooks/use-cash-closings-realtime";
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/reconcile")({
  component: ReconcilePage,
});

function ReconcilePage() {
  const { partners } = usePartnersRealtime();
  const { closings } = useCashClosingsRealtime();
  const { sales } = useSalesRealtime();
  const queryClient = useQueryClient();
  const [localComissoes, setLocalComissoes] = useState<Record<string, number>>({});
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  });

  // Query to get the realized commissions from financial_records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['financial_records', 'commissions', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('category', 'Comissão Realizada')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (error) {
        console.error("Error fetching realized commissions:", error);
        return [];
      }
      return data || [];
    }
  });

  const saveCommission = useMutation({
    mutationFn: async ({ companyId, amount, passagens, seguros, internet, existingId }: { companyId: string, amount: number, passagens: number, seguros: number, internet: number, existingId?: string }) => {
      const payload = {
        amount,
        notes: companyId,
        date: endDate,
        description: `Comissão Realizada - ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')} [P:${passagens}|S:${seguros}|I:${internet}]`,
        category: 'Comissão Realizada',
        type: 'income',
        context: 'business',
        paid: true,
      };

      if (existingId) {
        const { error } = await supabase.from('financial_records').update(payload).eq('id', existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('financial_records').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_records', 'commissions'] });
    },
    onError: (error) => {
      console.error("Failed to save commission:", error);
      alert("Erro ao salvar a comissão: " + error.message);
    }
  });

  const handleSave = (companyId: string, amount: number, passagens: number, seguros: number, internet: number, existingId?: string) => {
    if (isNaN(amount)) return;
    saveCommission.mutate({ companyId, amount, passagens, seguros, internet, existingId });
  };

  const deleteCommission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial_records', 'commissions'] })
  });

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja apagar o registro informado?")) {
      deleteCommission.mutate(id);
    }
  };

  const periodStr = useMemo(() => {
    const s = startDate.split('-').reverse().slice(0, 2).join('/');
    const e = endDate.split('-').reverse().slice(0, 2).join('/');
    return `${s} a ${e}`;
  }, [startDate, endDate]);

  const daysInPeriod = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Aggregate expected commissions and sales from cash closings for the selected period
  const expectedDataByCompany = useMemo(() => {
    const map = new Map<string, { commission: number, sales: number }>();
    
    closings.forEach(c => {
      if (c.closing_date && c.closing_date >= startDate && c.closing_date <= endDate) {
        if (c.company_settlements && Array.isArray(c.company_settlements)) {
          c.company_settlements.forEach((s: any) => {
            const current = map.get(s.company_id) || { commission: 0, sales: 0 };
            current.commission += Number(s.commission || 0);
            current.sales += Number(s.total || 0);
            map.set(s.company_id, current);
          });
        }
      }
    });
    
    return map;
  }, [closings, startDate, endDate]);

  const salesDataByCompany = useMemo(() => {
    const map = new Map<string, { count: number, total: number }>();
    sales.forEach(s => {
      if (s.sale_date >= startDate && s.sale_date <= endDate && s.company_id) {
        const current = map.get(s.company_id) || { count: 0, total: 0 };
        current.count += 1;
        current.total += Number(s.amount || 0);
        map.set(s.company_id, current);
      }
    });
    return map;
  }, [sales, startDate, endDate]);

  const reconciliationData = useMemo(() => {
    return partners.map(partner => {
      const expectedData = expectedDataByCompany.get(partner.id) || { commission: 0, sales: 0 };
      const expected = expectedData.commission;
      const expectedSales = expectedData.sales;
      
      const record = records.find((r: any) => r.notes === partner.id);
      const realized = record ? Number(record.amount || 0) : null;
      
      let passagens = "";
      let seguros = "";
      let internet = "";
      
      if (record && record.description) {
        const pMatch = record.description.match(/P:([\d.]+)/);
        const sMatch = record.description.match(/S:([\d.]+)/);
        const iMatch = record.description.match(/I:([\d.]+)/);
        if (pMatch) passagens = pMatch[1];
        if (sMatch) seguros = sMatch[1];
        if (iMatch) internet = iMatch[1];
      }
      
      const realizedSales = (Number(passagens) || 0) + (Number(seguros) || 0) + (Number(internet) || 0);
      const salesDifference = realizedSales - expectedSales;
      const difference = realized !== null ? realized - expected : 0;
      const status = realized === null ? 'pending' : (difference >= -0.5 && difference <= 0.5 ? 'match' : (difference > 0 ? 'surplus' : 'shortage'));

      const sData = salesDataByCompany.get(partner.id) || { count: 0, total: 0 };
      const avgTicket = sData.count > 0 ? sData.total / sData.count : 0;
      const dailyAvg = expectedSales / daysInPeriod;

      return {
        partner,
        expected,
        expectedSales,
        realized,
        realizedSales,
        passagens,
        seguros,
        internet,
        recordId: record?.id,
        difference,
        salesDifference,
        status,
        avgTicket,
        dailyAvg
      };
    }).sort((a, b) => b.expected - a.expected);
  }, [partners, expectedDataByCompany, records, salesDataByCompany, daysInPeriod]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
        <div>
          <Link to="/finance" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 bg-muted/30 px-3 py-1.5 rounded-full hover:bg-muted/50 w-fit">
            <ChevronLeft className="size-4" />
            Voltar para Gestão Financeira
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <TrendingUp className="size-8 text-primary" />
            Meta & Realizado
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare a comissão esperada (via fechamentos) com a comissão real repassada pelas empresas.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-card border border-border p-2 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground ml-1" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-sm text-foreground font-medium focus:outline-none focus:ring-0"
            />
          </div>
          <span className="text-muted-foreground text-sm font-medium">até</span>
          <div className="flex items-center gap-2">
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-sm text-foreground font-medium focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <Calculator className="size-24" />
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Vendas Esperadas (Total)
          </div>
          <div className="font-mono text-lg lg:text-xl font-bold text-foreground truncate">
            {formatCurrency(reconciliationData.reduce((acc, row) => acc + row.expectedSales, 0))}
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <DollarSign className="size-24" />
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Comissão Esperada
          </div>
          <div className="font-mono text-lg lg:text-xl font-bold text-foreground truncate">
            {formatCurrency(reconciliationData.reduce((acc, row) => acc + row.expected, 0))}
          </div>
        </div>

        <div className="bg-[#8A05BE]/5 p-4 rounded-xl border border-[#8A05BE]/20 shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <CheckCircle2 className="size-24" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A05BE] mb-1">
            Comissão Recebida (Total)
          </div>
          <div className="font-mono text-lg lg:text-xl font-black text-[#8A05BE] truncate">
            {formatCurrency(reconciliationData.reduce((acc, row) => {
              const localVal = localComissoes[row.partner.id];
              const val = localVal !== undefined ? localVal : (row.realized || 0);
              return acc + val;
            }, 0))}
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <Activity className="size-24" />
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Média Diária (Global)
          </div>
          <div className="font-mono text-lg lg:text-xl font-bold text-foreground truncate">
            {formatCurrency(reconciliationData.reduce((acc, row) => acc + row.expectedSales, 0) / daysInPeriod)}
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <Ticket className="size-24" />
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Ticket Médio (Global)
          </div>
          <div className="font-mono text-lg lg:text-xl font-bold text-foreground truncate">
            {(() => {
              let totalCount = 0;
              let totalAmount = 0;
              salesDataByCompany.forEach(d => { totalCount += d.count; totalAmount += d.total; });
              return formatCurrency(totalCount > 0 ? totalAmount / totalCount : 0);
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Building2 className="size-5 text-primary" /> 
                Conciliação por Empresa - {periodStr}
              </h2>
            </div>
            
            <div className="divide-y divide-border">
              {reconciliationData.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma empresa cadastrada ou sem dados para o período.
                </div>
              ) : (
                reconciliationData.map((row) => (
                  <CompanyReconcileRow 
                    key={row.partner.id} 
                    row={row} 
                    onSave={handleSave} 
                    onDelete={handleDelete} 
                    onComissaoChange={(val) => setLocalComissoes(prev => ({...prev, [row.partner.id]: val}))}
                  />
                ))
              )}
            </div>
            
            <div className="bg-muted/10 p-4 border-t border-border text-center text-xs text-muted-foreground">
              Os valores "Realizados" preenchidos aqui também serão automaticamente registrados como "Receita" no módulo de Gestão Financeira, na categoria "Comissão Realizada".
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyReconcileRow({ row, onSave, onDelete, onComissaoChange }: { row: any, onSave: any, onDelete: any, onComissaoChange: (val: number) => void }) {
  const [passagens, setPassagens] = useState(row.passagens || "");
  const [seguros, setSeguros] = useState(row.seguros || "");
  const [internet, setInternet] = useState(row.internet || "");
  const [comissao, setComissao] = useState(row.realized !== null ? String(row.realized) : "");
  const [isDirty, setIsDirty] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleValChange = (type: 'p'|'s'|'i', val: string) => {
    let p = type === 'p' ? val : passagens;
    let s = type === 's' ? val : seguros;
    let i = type === 'i' ? val : internet;
    
    if (type === 'p') setPassagens(val);
    if (type === 's') setSeguros(val);
    if (type === 'i') setInternet(val);

    const totalComissao = (Number(p) || 0) + (Number(s) || 0) + (Number(i) || 0);
    setComissao(totalComissao > 0 ? totalComissao.toFixed(2) : "");
    onComissaoChange(totalComissao);
    
    setIsDirty(true);
  };

  const handleSaveClick = () => {
    if (comissao === "" || isNaN(Number(comissao))) return;
    
    onSave(
      row.partner.id, 
      Number(comissao), 
      Number(passagens) || 0, 
      Number(seguros) || 0, 
      Number(internet) || 0, 
      row.recordId
    );
    
    setIsDirty(false);
  };

  return (
    <div className="p-5 flex flex-col lg:flex-row items-center justify-between gap-6 hover:bg-muted/5 transition-colors">
      
      <div className="flex items-center gap-4 w-full lg:w-[240px] shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md shrink-0" style={{ backgroundColor: row.partner.color || '#333' }}>
          {row.partner.name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg leading-tight truncate max-w-[180px]" title={row.partner.name}>{row.partner.name}</h3>
          <p className="text-xs text-muted-foreground flex flex-col">
            <span>Comissão: {row.partner.comissao || 0}%</span>
            <span className="text-[10px] text-muted-foreground/70 mt-1">
              Ticket: <strong className="text-foreground/80">{formatCurrency(row.avgTicket)}</strong>
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              Venda/Dia: <strong className="text-foreground/80">{formatCurrency(row.dailyAvg)}</strong>
            </span>
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end w-full">
        
        <div className="bg-muted/30 p-2 rounded-xl border border-border/50 text-center relative overflow-hidden group h-[62px] flex flex-col justify-center">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Meta Esperada
          </div>
          <div className="font-mono text-sm font-medium text-foreground">
            {formatCurrency(row.expected)}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Passagens (R$)</label>
          <input 
            type="number" step="0.01" placeholder="0.00"
            value={passagens}
            onChange={(e) => handleValChange('p', e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Seguros (R$)</label>
          <input 
            type="number" step="0.01" placeholder="0.00"
            value={seguros}
            onChange={(e) => handleValChange('s', e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Internet (R$)</label>
          <input 
            type="number" step="0.01" placeholder="0.00"
            value={internet}
            onChange={(e) => handleValChange('i', e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono focus:border-[#8A05BE] focus:ring-1 focus:ring-[#8A05BE] outline-none transition-all"
          />
        </div>

        <div className="bg-[#8A05BE]/5 p-2 rounded-xl border border-[#8A05BE]/20 text-center shadow-inner relative h-[62px] flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A05BE] mb-1">
            Comissão Final
          </div>
          <input 
            type="number" step="0.01" placeholder="0.00"
            value={comissao}
            onChange={(e) => {
              setComissao(e.target.value);
              onComissaoChange(Number(e.target.value) || 0);
              setIsDirty(true);
            }}
            className="w-full bg-transparent border-none text-center font-mono text-base font-bold text-[#8A05BE] focus:outline-none focus:ring-0 p-0"
          />
        </div>
      </div>

      <div className="w-full lg:w-[160px] shrink-0 h-full flex flex-col justify-center">
        {isDirty ? (
          <button 
            onClick={handleSaveClick}
            className="bg-primary text-primary-foreground hover:bg-primary/90 p-3 rounded-xl border border-primary/20 flex items-center justify-center w-full font-bold shadow-md transition-all active:scale-95"
          >
            Salvar
          </button>
        ) : (
          <>
            {row.status === 'pending' && (
          <div className="bg-muted p-2 rounded-xl border border-border/50 flex items-center justify-center h-full">
            <div className="text-[11px] font-medium text-muted-foreground">Aguardando repasse</div>
          </div>
        )}
        
        {row.status === 'match' && (
          <div className="bg-success/10 p-2 rounded-xl border border-success/30 flex items-center justify-center h-full text-success gap-2">
            <CheckCircle2 className="size-4" />
            <div className="text-[11px] font-bold">Valor Bateu!</div>
          </div>
        )}

        {row.status === 'surplus' && (
          <div className="bg-info/10 p-2 rounded-xl border border-info/30 flex flex-col items-center justify-center h-full text-info">
            <div className="text-[10px] font-semibold uppercase mb-0.5">A Maior</div>
            <div className="font-mono font-bold text-sm">+{formatCurrency(row.difference)}</div>
          </div>
        )}

        {row.status === 'shortage' && (
          <div className="bg-danger/10 p-2 rounded-xl border border-danger/30 flex flex-col items-center justify-center h-full text-danger">
            <div className="text-[10px] font-semibold uppercase mb-0.5 flex items-center gap-1">
              <AlertTriangle className="size-3" /> A Menor
            </div>
            <div className="font-mono font-bold text-sm">{formatCurrency(row.difference)}</div>
          </div>
        )}
          </>
        )}
        
        {!isDirty && row.recordId && (
          <button 
            onClick={() => onDelete(row.recordId)}
            className="mt-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 hover:text-danger flex items-center justify-center gap-1 w-full p-1.5 rounded hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="size-3" /> Limpar
          </button>
        )}
      </div>

    </div>
  );
}
