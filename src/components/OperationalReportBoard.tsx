import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Smartphone, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  MapPin, 
  Route, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight,
  Save,
  FileJson,
  Loader2,
  Trash2,
  Database,
  X,
  Trophy
} from 'lucide-react';
import { useCityCodesRealtime } from '@/hooks/use-city-codes-realtime';
import { cn } from '@/lib/utils';
import { useOperationalReports } from '@/hooks/use-operational-reports';
import { useTripsRealtime } from '@/hooks/use-trips-realtime';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ReportData {
  faturamento_por_empresa: {
    empresas: { nome: string; faturamento: number; passagens: number }[];
    total_passagens: { faturamento: number; bilhetes: number };
  };
  formas_pagamento: {
    dinheiro?: { faturamento: number; observacao?: string; bilhetes?: number };
    cartoes_credito_debito?: { faturamento: number; bilhetes?: number; observacao?: string };
    pix?: { faturamento: number; bilhetes?: number; observacao?: string };
    carteira_digital?: { faturamento: number; bilhetes?: number; observacao?: string };
  };
  ocorrencias_e_movimentacoes_extras: {
    movimentacoes_extras_saldo_liquido: number;
    detalhes: { tipo: string; valor: number; forma_pagamento: string; registros: number }[];
    total_geral_caixa: number;
  };
  detalhe_servicos_linhas: { servico: string; passagens: number; faturamento: number; observacao?: string; empresa?: string }[];
  mapeamento_destinos: { codigo_destino: string; passagens: number; faturamento: number; observacao?: string; nome_destino?: string }[];
}

const formatCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function aggregateReportData(reports: ReportData[]): ReportData | null {
  if (!reports || reports.length === 0) return null;

  const result: ReportData = {
    faturamento_por_empresa: { empresas: [], total_passagens: { faturamento: 0, bilhetes: 0 } },
    formas_pagamento: {},
    ocorrencias_e_movimentacoes_extras: { movimentacoes_extras_saldo_liquido: 0, detalhes: [], total_geral_caixa: 0 },
    detalhe_servicos_linhas: [],
    mapeamento_destinos: []
  };

  const empresasMap = new Map<string, any>();
  const detalhesExtrasMap = new Map<string, any>();
  const linhasMap = new Map<string, any>();
  const destinosMap = new Map<string, any>();

  for (const r of reports) {
    if (r.faturamento_por_empresa?.empresas) {
      r.faturamento_por_empresa.empresas.forEach(e => {
        if (!empresasMap.has(e.nome)) empresasMap.set(e.nome, { nome: e.nome, faturamento: 0, passagens: 0 });
        const current = empresasMap.get(e.nome);
        current.faturamento += e.faturamento;
        current.passagens += e.passagens;
      });
    }
    if (r.faturamento_por_empresa?.total_passagens) {
      result.faturamento_por_empresa.total_passagens.faturamento += (r.faturamento_por_empresa.total_passagens.faturamento || 0);
      result.faturamento_por_empresa.total_passagens.bilhetes += (r.faturamento_por_empresa.total_passagens.bilhetes || 0);
    }

    const fpKeys = ['dinheiro', 'cartoes_credito_debito', 'pix', 'carteira_digital'] as const;
    if (r.formas_pagamento) {
      fpKeys.forEach(k => {
        if (r.formas_pagamento[k]) {
          if (!result.formas_pagamento[k]) result.formas_pagamento[k] = { faturamento: 0, bilhetes: 0 };
          result.formas_pagamento[k]!.faturamento += (r.formas_pagamento[k]?.faturamento || 0);
          if (r.formas_pagamento[k]?.bilhetes !== undefined) {
             result.formas_pagamento[k]!.bilhetes = (result.formas_pagamento[k]!.bilhetes || 0) + (r.formas_pagamento[k]!.bilhetes || 0);
          }
        }
      });
    }

    if (r.ocorrencias_e_movimentacoes_extras) {
      result.ocorrencias_e_movimentacoes_extras.movimentacoes_extras_saldo_liquido += (r.ocorrencias_e_movimentacoes_extras.movimentacoes_extras_saldo_liquido || 0);
      result.ocorrencias_e_movimentacoes_extras.total_geral_caixa += (r.ocorrencias_e_movimentacoes_extras.total_geral_caixa || 0);
      if (r.ocorrencias_e_movimentacoes_extras.detalhes) {
        r.ocorrencias_e_movimentacoes_extras.detalhes.forEach(d => {
          const key = `${d.tipo}-${d.forma_pagamento}`;
          if (!detalhesExtrasMap.has(key)) detalhesExtrasMap.set(key, { ...d, registros: 0, valor: 0 });
          const current = detalhesExtrasMap.get(key);
          current.registros += (d.registros || 0);
          current.valor += (d.valor || 0);
        });
      }
    }

    if (r.detalhe_servicos_linhas) {
      r.detalhe_servicos_linhas.forEach(s => {
        if (!linhasMap.has(s.servico)) linhasMap.set(s.servico, { ...s, faturamento: 0, passagens: 0 });
        const current = linhasMap.get(s.servico);
        current.faturamento += (s.faturamento || 0);
        current.passagens += (s.passagens || 0);
      });
    }

    if (r.mapeamento_destinos) {
      r.mapeamento_destinos.forEach(d => {
        if (!destinosMap.has(d.codigo_destino)) destinosMap.set(d.codigo_destino, { ...d, faturamento: 0, passagens: 0 });
        const current = destinosMap.get(d.codigo_destino);
        current.faturamento += (d.faturamento || 0);
        current.passagens += (d.passagens || 0);
      });
    }
  }

  result.faturamento_por_empresa.empresas = Array.from(empresasMap.values());
  result.ocorrencias_e_movimentacoes_extras.detalhes = Array.from(detalhesExtrasMap.values());
  result.detalhe_servicos_linhas = Array.from(linhasMap.values());
  result.mapeamento_destinos = Array.from(destinosMap.values());

  return result;
}

export function OperationalReportBoard() {
  const { reports, isLoading: isReportsLoading, saveReport, deleteReport } = useOperationalReports();
  const { trips } = useTripsRealtime();
  const { cityCodes } = useCityCodesRealtime();
  const [viewStartDate, setViewStartDate] = useState<string>('');
  const [viewEndDate, setViewEndDate] = useState<string>('');
  const [viewCompany, setViewCompany] = useState<string>('all');
  const [activeReports, setActiveReports] = useState<any[]>([]);
  const [data, setData] = useState<ReportData | null>(null);

  const [jsonInput, setJsonInput] = useState('');
  const [inputDate, setInputDate] = useState(new Date().toISOString().split("T")[0]);
  const [inputEmpresa, setInputEmpresa] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [servicosSort, setServicosSort] = useState<'default' | 'fat_desc' | 'qtd_desc'>('default');

  // Sync state with database reports
  useEffect(() => {
    if (reports.length > 0) {
      if (!viewStartDate || !viewEndDate) {
        setViewStartDate(reports[0].report_date);
        setViewEndDate(reports[0].report_date);
        return;
      }
      
      const filtered = reports.filter(r => {
        return r.report_date >= viewStartDate && 
               r.report_date <= viewEndDate && 
               (viewCompany === 'all' || r.empresa === viewCompany);
      });
      
      setActiveReports(filtered);
      setData(aggregateReportData(filtered.map(r => r.report_data)));
    } else {
      setData(null);
      setActiveReports([]);
    }
  }, [reports, viewStartDate, viewEndDate, viewCompany]);

  const destinationsStudy = React.useMemo(() => {
    const map = new Map<string, { city: string, code: Set<string>, qtd: number, valor: number, history: { date: string, qtd: number, valor: number, company: string }[] }>();
    
    activeReports.forEach(a => {
      const mapeamento = a.report_data?.mapeamento_destinos || [];
      const linhas = a.report_data?.detalhe_servicos_linhas || [];
      
      const processItem = (rawName: string, dCode: string, qty: number, val: number, empresa: string) => {
          if (!rawName && dCode === "--") return;
          
          let city = rawName;
          let code = "--";
          
          const searchUpper = rawName.toUpperCase();
          const noAccentSearch = searchUpper.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          const dictionaryMatch = cityCodes.find(c => {
             const cUpper = c.city_name.toUpperCase();
             const cNoAccent = cUpper.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
             return c.code.toUpperCase() === searchUpper || 
                    cUpper === searchUpper || 
                    cNoAccent === noAccentSearch ||
                    c.code.toUpperCase() === noAccentSearch;
          });
          
          if (dictionaryMatch) {
             city = dictionaryMatch.city_name;
             code = dictionaryMatch.code;
          } else {
            const match = trips.find(t => {
               const tNormCode = (t.destination_code || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
               const tNormCity = (t.destination || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
               return tNormCode === noAccentSearch || tNormCity === noAccentSearch ||
                      t.destination_code?.toUpperCase() === searchUpper || 
                      t.origin_code?.toUpperCase() === searchUpper || 
                      t.destination?.toUpperCase() === searchUpper || 
                      t.origin?.toUpperCase() === searchUpper;
            });
            
            if (match) {
               if (match.destination_code?.toUpperCase() === searchUpper) {
                 city = match.destination;
                 code = match.destination_code;
               } else if (match.origin_code?.toUpperCase() === searchUpper) {
                 city = match.origin;
                 code = match.origin_code;
               } else if (match.destination?.toUpperCase() === searchUpper) {
                 city = match.destination;
                 code = match.destination_code || "--";
               } else if (match.origin?.toUpperCase() === searchUpper) {
                 city = match.origin;
                 code = match.origin_code || "--";
               }
            }
          }
          
          const key = city.toUpperCase();
          
          if (!map.has(key)) {
             map.set(key, { city, code: new Set<string>(), qtd: 0, valor: 0, history: [] });
          }
          const current = map.get(key)!;
          if (code && code !== "--") current.code.add(code);
          current.qtd += qty;
          current.valor += val;
          
          if (qty > 0 || val > 0) {
            current.history.push({
              date: a.report_date,
              qtd: qty,
              valor: val,
              company: empresa
            });
          }
      };

      if (Array.isArray(mapeamento) && mapeamento.length > 0) {
        mapeamento.forEach((d: any) => {
          if (!d.nome_destino && !d.codigo_destino) return;
          const rawName = (d.nome_destino || `Cod. ${d.codigo_destino}`).trim().replace(/\s*-\s*[A-Za-z]{2}\s*$/, "");
          processItem(rawName, d.codigo_destino || "--", parseInt(d.passagens) || 0, parseFloat(d.faturamento) || 0, "Geral");
        });
      } else if (Array.isArray(linhas) && linhas.length > 0) {
        linhas.forEach((l: any) => {
          if (!l.servico) return;
          const parts = l.servico.split(/ x /i);
          let rawName = l.servico;
          if (parts.length > 1) {
             rawName = parts[1].replace(/\d{2}:\d{2}/, '').trim(); 
          } else {
             rawName = rawName.replace(/\d{2}:\d{2}/, '').trim();
          }
          processItem(rawName, "--", parseInt(l.passagens) || 0, parseFloat(l.faturamento) || 0, l.empresa || "Geral");
        });
      }
    });

    return Array.from(map.values()).map(v => {
      const companyCount = new Map<string, number>();
      v.history.forEach(h => {
        companyCount.set(h.company, (companyCount.get(h.company) || 0) + h.qtd);
      });
      let bestCompany = "--";
      let maxQtd = 0;
      companyCount.forEach((qtd, comp) => {
        if (qtd > maxQtd) {
          maxQtd = qtd;
          bestCompany = comp;
        }
      });

      return {
        city: v.city,
        code: v.code.size > 0 ? Array.from(v.code).join(" / ") : "--",
        qtd: v.qtd,
        valor: v.valor,
        bestCompany,
        history: v.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
    }).sort((a, b) => b.qtd - a.qtd);
  }, [activeReports, trips, cityCodes]);

  const handleSave = async () => {
    if (!inputDate) {
      setError('Por favor, informe a data do relatório.');
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      setIsSaving(true);
      setError('');
      
      const extractedEmpresa = inputEmpresa.trim() || parsed.empresa || parsed.faturamento_por_empresa?.empresas?.[0]?.nome || 'Geral';
      
      const result = await saveReport(inputDate, extractedEmpresa, parsed);
      
      if (result.success) {
        setIsEditing(false);
      } else {
        setError(`Erro ao salvar no banco: ${result.error}`);
      }
    } catch (e) {
      setError('JSON inválido. Verifique o formato e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDemo = () => {
    const demoData = {
      "faturamento_por_empresa": {
        "empresas": [
          {
            "nome": "Rota Transportes",
            "faturamento": 2408.92,
            "passagens": 93
          },
          {
            "nome": "Viação Cidade Sol",
            "faturamento": 66.53,
            "passagens": 3
          },
          {
            "nome": "Expresso Brasileiro",
            "faturamento": 0.00,
            "passagens": 0
          }
        ],
        "total_passagens": {
          "faturamento": 2475.45,
          "bilhetes": 96
        }
      },
      "formas_pagamento": {
        "dinheiro": {
          "faturamento": 1725.60,
          "observacao": "Líder absoluto de movimentação no balcão"
        },
        "cartoes_credito_debito": {
          "faturamento": 728.35,
          "bilhetes": 43
        },
        "pix": {
          "faturamento": 21.50,
          "bilhetes": 1
        },
        "carteira_digital": {
          "faturamento": 0.00,
          "bilhetes": 0
        }
      },
      "ocorrencias_e_movimentacoes_extras": {
        "movimentacoes_extras_saldo_liquido": -79.80,
        "detalhes": [
          {
            "tipo": "Multa Recebida",
            "valor": 19.95,
            "forma_pagamento": "cartao",
            "registros": 1
          },
          {
            "tipo": "Despesa com Passagem",
            "valor": -99.75,
            "forma_pagamento": "dinheiro",
            "registros": 1
          }
        ],
        "total_geral_caixa": 2395.65
      },
      "detalhe_servicos_linhas": [
        { "servico": "1218701", "passagens": 2, "faturamento": 537.78, "observacao": "Maior faturamento por trecho longo" },
        { "servico": "10055", "passagens": 26, "faturamento": 341.29, "observacao": "Maior volume do dia" },
        { "servico": "10037", "passagens": 5, "faturamento": 222.76 },
        { "servico": "10026", "passagens": 6, "faturamento": 214.73 },
        { "servico": "10052", "passagens": 10, "faturamento": 206.99 },
        { "servico": "10259", "passagens": 6, "faturamento": 173.48 },
        { "servico": "11077", "passagens": 10, "faturamento": 153.76 },
        { "servico": "10041", "passagens": 6, "faturamento": 120.74 },
        { "servico": "10018", "passagens": 5, "faturamento": 91.67 },
        { "servico": "11065", "passagens": 1, "faturamento": 68.01 },
        { "servico": "12224", "passagens": 3, "faturamento": 58.40 },
        { "servico": "10255", "passagens": 4, "faturamento": 55.69 },
        { "servico": "12223", "passagens": 3, "faturamento": 44.35 },
        { "servico": "10260", "passagens": 2, "faturamento": 44.35 },
        { "servico": "88432", "empresa": "Cidade Sol", "passagens": 2, "faturamento": 44.35 },
        { "servico": "10057", "passagens": 2, "faturamento": 31.54 },
        { "servico": "10257", "passagens": 1, "faturamento": 22.18 },
        { "servico": "89026", "empresa": "Cidade Sol", "passagens": 1, "faturamento": 22.18 },
        { "servico": "10038", "passagens": 1, "faturamento": 21.19 }
      ],
      "mapeamento_destinos": [
        { "codigo_destino": "0143", "passagens": 45, "faturamento": 685.53, "observacao": "Maior fluxo regional" },
        { "codigo_destino": "0230", "passagens": 2, "faturamento": 537.78 },
        { "codigo_destino": "0147", "passagens": 24, "faturamento": 507.12 },
        { "codigo_destino": "0145", "passagens": 12, "faturamento": 210.54 },
        { "codigo_destino": "0049", "passagens": 4, "faturamento": 143.91 },
        { "codigo_destino": "0082", "passagens": 2, "faturamento": 202.31 },
        { "codigo_destino": "0881", "passagens": 1, "faturamento": 68.01 },
        { "codigo_destino": "0001", "passagens": 1, "faturamento": 59.14 },
        { "codigo_destino": "0140", "nome_destino": "Vitória da Conquista", "passagens": 1, "faturamento": 24.64 },
        { "codigo_destino": "0146", "passagens": 1, "faturamento": 12.07 },
        { "codigo_destino": "0144", "passagens": 3, "faturamento": 24.40 }
      ]
    };
    setJsonInput(JSON.stringify(demoData, null, 2));
    setInputDate(new Date().toISOString().split("T")[0]);
    setInputEmpresa('');
  };

  if (isManageOpen) {
    return (
      <div className="rounded-3xl border border-[var(--primary)]/20 bg-black/60 p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden min-h-[500px]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[200px] bg-[var(--primary)]/10 blur-[80px] pointer-events-none rounded-full" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[var(--primary)]/20 rounded-xl">
              <Database className="size-6 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Gerenciar Relatórios</h2>
              <p className="text-sm text-muted-foreground">Visualize e exclua relatórios importados anteriormente.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsManageOpen(false)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative z-10 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {reports.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground italic border border-dashed border-white/10 rounded-2xl">
               Nenhum relatório importado.
             </div>
          ) : (
            reports.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div>
                  <div className="font-bold text-white text-lg">{r.empresa}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="text-[var(--primary)] font-mono">{r.report_date}</span>
                    <span>•</span>
                    <span>Importado em: {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (confirm('Tem certeza que deseja excluir este relatório?')) {
                      const res = await deleteReport(r.id);
                      if (!res.success) alert('Erro ao excluir: ' + res.error);
                    }
                  }}
                  className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                  title="Excluir Relatório"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (!data || isEditing) {
    return (
      <div className="rounded-3xl border border-[var(--primary)]/20 bg-black/60 p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[200px] bg-[var(--primary)]/10 blur-[80px] pointer-events-none rounded-full" />
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[var(--primary)]/20 rounded-xl">
              <FileJson className="size-6 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Importador de Análise</h2>
              <p className="text-sm text-muted-foreground">Cole o JSON do relatório operacional para renderizar o quadro.</p>
            </div>
          </div>
          {data && (
            <button 
              onClick={() => setIsEditing(false)}
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Data de Referência</label>
              <input 
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none transition-colors text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Empresa (Opcional)</label>
              <input 
                type="text"
                placeholder="Ex: Rota Transportes"
                value={inputEmpresa}
                onChange={(e) => setInputEmpresa(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none transition-colors text-white"
              />
            </div>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="{ ... cole o JSON aqui ... }"
            className="w-full h-64 bg-black/50 border border-white/10 rounded-xl p-4 text-sm font-mono text-white/80 focus:outline-none focus:border-[var(--primary)]/50 focus:ring-1 focus:ring-[var(--primary)]/50 transition-all resize-none"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <button
              disabled={isSaving}
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--accent)] disabled:opacity-50 text-white rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(138,5,190,0.4)]"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 
              {isSaving ? "Salvando..." : "Processar e Salvar Relatório"}
            </button>
            <button
              onClick={handleLoadDemo}
              className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-medium transition-all"
            >
              Carregar Dados de Exemplo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Cores da paleta Fintech Black
  const PIE_COLORS = ["var(--primary)", "var(--accent)", "var(--accent)", "var(--primary)"];

  // Dados para Gráficos
  const empresasChartData = data.faturamento_por_empresa.empresas.filter(e => e.faturamento > 0).map(e => ({
    name: e.nome,
    value: e.faturamento
  }));

  const pagamentoChartData = [
    { name: 'Dinheiro', value: data.formas_pagamento.dinheiro?.faturamento || 0 },
    { name: 'Cartão', value: data.formas_pagamento.cartoes_credito_debito?.faturamento || 0 },
    { name: 'Pix', value: data.formas_pagamento.pix?.faturamento || 0 },
    { name: 'Digital', value: data.formas_pagamento.carteira_digital?.faturamento || 0 },
  ].filter(p => p.value > 0);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
               Quadro Operacional Detalhado
             </h2>
             {reports.length > 0 && (
               <div className="flex items-center gap-2">
                 <input 
                   type="date"
                   value={viewStartDate}
                   onChange={(e) => setViewStartDate(e.target.value)}
                   className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-[var(--primary)] font-bold focus:outline-none"
                 />
                 <span className="text-white/50 text-xs">até</span>
                 <input 
                   type="date"
                   value={viewEndDate}
                   onChange={(e) => setViewEndDate(e.target.value)}
                   className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-[var(--primary)] font-bold focus:outline-none"
                 />
                 <select
                   value={viewCompany}
                   onChange={(e) => setViewCompany(e.target.value)}
                   className="bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-[var(--primary)] font-bold focus:outline-none max-w-[150px]"
                 >
                   <option value="all">Todas as Empresas</option>
                   {Array.from(new Set(reports.map(r => r.empresa))).map(emp => (
                     <option key={emp} value={emp}>{emp}</option>
                   ))}
                 </select>
               </div>
             )}
          </div>
          <p className="text-sm text-muted-foreground">Visão consolidada do caixa, pagamentos e desempenho das linhas.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsManageOpen(true)}
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
          >
            <Database className="size-3.5" /> Gerenciar Importações
          </button>
          <button 
            onClick={() => {
              setJsonInput("");
              setInputDate(new Date().toISOString().split("T")[0]);
              setInputEmpresa("");
              setIsEditing(true);
            }}
            className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] bg-[var(--primary)]/10 px-4 py-2 rounded-lg border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-all"
          >
            + Novo Relatório
          </button>
          {data && activeReports.length === 1 && (
            <>
              <button 
                onClick={() => {
                  const currentReport = activeReports[0];
                  setJsonInput(JSON.stringify(data, null, 2));
                  setInputDate(currentReport?.report_date || new Date().toISOString().split("T")[0]);
                  setInputEmpresa(currentReport?.empresa || "");
                  setIsEditing(true);
                }}
                className="text-xs font-bold uppercase tracking-widest text-white bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
              >
                Editar Atual
              </button>
              <button 
                onClick={async () => {
                  if (confirm('Tem certeza que deseja excluir este relatório?')) {
                    const res = await deleteReport(activeReports[0].id);
                    if (!res.success) alert('Erro ao excluir: ' + res.error);
                  }
                }}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-danger bg-danger/10 px-4 py-2 rounded-lg border border-danger/20 hover:bg-danger/20 transition-all"
              >
                <Trash2 className="size-3.5" /> Excluir
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* KPI: Faturamento Total */}
        <div className="rounded-2xl border border-[var(--primary)]/30 bg-black/60 p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(138,5,190,0.05)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="bg-[var(--primary)]/20 p-2.5 rounded-lg text-[var(--primary)]">
              <Banknote className="size-5" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Faturamento (Passagens)</h3>
          <p className="text-3xl font-bold text-white mt-1 font-mono tracking-tighter">
            {formatCurrency(data.faturamento_por_empresa.total_passagens.faturamento)}
          </p>
          <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="size-4 text-success" /> {data.faturamento_por_empresa.total_passagens.bilhetes} bilhetes emitidos
          </div>
        </div>

        {/* KPI: Dinheiro (Líder) */}
        <div className="rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-success/20 p-2.5 rounded-lg text-success">
              <Wallet className="size-5" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dinheiro em Espécie</h3>
          <p className="text-3xl font-bold text-white mt-1 font-mono tracking-tighter">
            {formatCurrency(data.formas_pagamento.dinheiro?.faturamento || 0)}
          </p>
          <div className="mt-3 text-xs text-muted-foreground leading-tight bg-white/5 p-2 rounded">
            {data.formas_pagamento.dinheiro?.observacao || "Movimentação em balcão"}
          </div>
        </div>

        {/* KPI: Outros Pagamentos */}
        <div className="rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-primary/20 p-2.5 rounded-lg text-primary">
              <CreditCard className="size-5" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cartão / Pix</h3>
          <p className="text-3xl font-bold text-white mt-1 font-mono tracking-tighter">
            {formatCurrency((data.formas_pagamento.cartoes_credito_debito?.faturamento || 0) + (data.formas_pagamento.pix?.faturamento || 0))}
          </p>
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1"><CreditCard className="size-3" /> {data.formas_pagamento.cartoes_credito_debito?.bilhetes || 0}</span>
            <span className="flex items-center gap-1"><Smartphone className="size-3" /> {data.formas_pagamento.pix?.bilhetes || 0}</span>
          </div>
        </div>

        {/* KPI: Total Geral Caixa */}
        <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(138,5,190,0.1)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-[var(--accent)]/20 p-2.5 rounded-lg text-[var(--primary)]">
              <TrendingUp className="size-5" />
            </div>
            {data.ocorrencias_e_movimentacoes_extras.movimentacoes_extras_saldo_liquido < 0 && (
               <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded">
                 {formatCurrency(data.ocorrencias_e_movimentacoes_extras.movimentacoes_extras_saldo_liquido)}
               </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Total Geral do Caixa</h3>
          <p className="text-3xl font-bold text-white mt-1 font-mono tracking-tighter">
            {formatCurrency(data.ocorrencias_e_movimentacoes_extras.total_geral_caixa)}
          </p>
          <div className="mt-3 text-xs text-muted-foreground">
            Inclui saldo líquido de ocorrências extras
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Faturamento por Empresa */}
        <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-xl flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
            <Building2 className="size-4" /> Share por Empresa
          </h3>
          <div className="flex-1 flex items-center justify-center gap-8">
            <div className="w-1/2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={empresasChartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {empresasChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#0A0A0A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-4">
              {data.faturamento_por_empresa.empresas.sort((a,b) => b.faturamento - a.faturamento).map((emp, i) => (
                <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                      {emp.nome}
                    </div>
                    <div className="text-xs text-muted-foreground ml-4">{emp.passagens} passagens</div>
                  </div>
                  <div className="font-mono text-sm font-bold text-white/90">
                    {formatCurrency(emp.faturamento)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ocorrências e Movimentações Extras */}
        <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <AlertCircle className="size-4" /> Movimentações Extras
            </h3>
            <span className={cn("text-xs font-bold px-2 py-1 rounded-md bg-black border", data.ocorrencias_e_movimentacoes_extras.movimentacoes_extras_saldo_liquido < 0 ? "text-danger border-danger/30" : "text-success border-success/30")}>
               Saldo: {formatCurrency(data.ocorrencias_e_movimentacoes_extras.movimentacoes_extras_saldo_liquido)}
            </span>
          </div>
          
          <div className="space-y-3 overflow-y-auto pr-2 max-h-48 custom-scrollbar">
             {data.ocorrencias_e_movimentacoes_extras.detalhes.map((detalhe, i) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                 <div className="flex flex-col">
                   <span className="text-sm font-medium text-white">{detalhe.tipo}</span>
                   <span className="text-xs text-muted-foreground flex items-center gap-1 uppercase">
                     {detalhe.forma_pagamento} • {detalhe.registros} reg.
                   </span>
                 </div>
                 <div className={cn("font-mono text-sm font-bold", detalhe.valor < 0 ? "text-danger" : "text-success")}>
                   {detalhe.valor < 0 ? "" : "+"}{formatCurrency(detalhe.valor)}
                 </div>
               </div>
             ))}
             {data.ocorrencias_e_movimentacoes_extras.detalhes.length === 0 && (
               <div className="text-sm text-muted-foreground text-center py-8 italic">
                 Nenhuma movimentação extra registrada.
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         {/* Detalhe de Serviços / Linhas */}
         <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-xl">
           <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
             <Route className="size-4" /> Top Serviços (Linhas)
           </h3>
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-white/10">
                   <th className="pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Serviço</th>
                   <th 
                     className="pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right cursor-pointer select-none hover:text-white transition-colors"
                     onDoubleClick={() => setServicosSort(s => s === 'qtd_desc' ? 'default' : 'qtd_desc')}
                     title="Duplo clique para ordenar"
                   >
                     Qtd {servicosSort === 'qtd_desc' ? '↓' : ''}
                   </th>
                   <th 
                     className="pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right cursor-pointer select-none hover:text-white transition-colors"
                     onDoubleClick={() => setServicosSort(s => s === 'fat_desc' ? 'default' : 'fat_desc')}
                     title="Duplo clique para ordenar"
                   >
                     Faturamento {servicosSort === 'fat_desc' ? '↓' : ''}
                   </th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {[...data.detalhe_servicos_linhas].sort((a,b)=>{if(servicosSort==='fat_desc')return b.faturamento-a.faturamento;if(servicosSort==='qtd_desc')return b.passagens-a.passagens;return 0;}).slice(0, 10).map((srv, i) => {
                   const matchedTrip = trips.find(t => t.code === srv.servico || (t.route_name && t.route_name.includes(srv.servico)));
                   const displayName = matchedTrip 
                     ? (matchedTrip.route_name || `${matchedTrip.origin} x ${matchedTrip.destination} ${matchedTrip.departure || ''}`.trim())
                     : srv.servico;

                   return (
                     <tr key={i} className="hover:bg-white/5 transition-colors group">
                       <td className="py-3 px-2">
                         <div className="font-mono text-sm font-bold text-white line-clamp-1" title={displayName}>{displayName}</div>
                         <div className="flex gap-2 items-center mt-0.5">
                           {matchedTrip && <span className="text-[9px] uppercase tracking-widest bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground">{srv.servico}</span>}
                           {srv.observacao && <span className="text-[10px] text-warning">{srv.observacao}</span>}
                         </div>
                       </td>
                       <td className="py-3 px-2 text-right text-sm text-muted-foreground">{srv.passagens}</td>
                       <td className="py-3 px-2 text-right font-mono text-sm font-medium text-white">{formatCurrency(srv.faturamento)}</td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
         </div>

         {/* Termômetro de Destinos - NOVO DASHBOARD */}
        <section id="termometro" className="relative overflow-hidden rounded-3xl border border-[#8A05BE]/40 bg-black/80 p-8 backdrop-blur-2xl shadow-[0_0_40px_rgba(138,5,190,0.15)] mt-4">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#8A05BE]/10 blur-[100px] rounded-full pointer-events-none -z-10" />
          
          <div className="mb-8 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
               <div className="bg-[#8A05BE]/20 p-3 rounded-2xl border border-[#8A05BE]/30 shadow-inner">
                 <MapPin className="size-8 text-[#8A05BE]" />
               </div>
               <div>
                 <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Termômetro de Destinos</h2>
                 <p className="text-base text-muted-foreground mt-1 font-medium">Análise de performance das cidades mais procuradas e vendidas neste período.</p>
               </div>
            </div>
          </div>

          <div className="flex flex-col gap-8 relative z-10">
            {/* Top 5 Cards Row */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="size-5 text-warning" /> Top 5 Destinos
              </h3>
              
              {destinationsStudy.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-muted-foreground italic bg-black/20">
                   Nenhum destino registrado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {destinationsStudy.slice(0, 5).map((dest, i) => (
                    <div key={i} className="bg-black/40 border border-white/10 rounded-2xl p-4 relative overflow-hidden group hover:border-[#8A05BE]/40 transition-all hover:shadow-[0_0_20px_rgba(138,5,190,0.1)] flex flex-col justify-between">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <MapPin className="size-24 text-[#8A05BE]" />
                      </div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-3 w-full">
                          <div className={cn("text-lg font-extrabold flex items-center justify-center w-8 h-8 rounded-full shrink-0", i === 0 ? "bg-warning/20 text-warning" : i === 1 ? "bg-zinc-300/20 text-zinc-300" : i === 2 ? "bg-amber-600/20 text-amber-600" : "bg-white/10 text-white")}>
                            #{i + 1}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-base font-bold text-white truncate w-full" title={dest.city}>{dest.city}</h4>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded truncate inline-block max-w-full">{dest.code}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3 relative z-10">
                        <div className="flex justify-between items-end border-b border-white/5 pb-2">
                          <div>
                            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Volume</div>
                            <div className="text-lg font-black text-white leading-none">{dest.qtd.toLocaleString('pt-BR')} <span className="text-[9px] text-muted-foreground font-medium">vendas</span></div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Fat.</div>
                            <div className="text-lg font-black text-success leading-none">{formatCurrency(dest.valor)}</div>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5 pt-1">
                           <div className="flex justify-between items-center">
                             <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Parceiro</span>
                             <span className="text-[10px] font-semibold text-white truncate max-w-[90px]" title={dest.bestCompany}>{dest.bestCompany}</span>
                           </div>
                           <div className="flex justify-between items-center">
                             <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Ticket</span>
                             <span className="text-[10px] font-bold text-[#8A05BE]">{dest.qtd > 0 ? formatCurrency(dest.valor / dest.qtd) : 'N/A'}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

         {/* Mapeamento de Destinos */}
         <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-xl">
           <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
             <MapPin className="size-4" /> Mapeamento de Destinos
           </h3>
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-white/10">
                   <th className="pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Destino</th>
                   <th className="pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Passagens</th>
                   <th className="pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Receita</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {data.mapeamento_destinos.slice(0, 10).map((dest, i) => (
                   <tr key={i} className="hover:bg-white/5 transition-colors group">
                     <td className="py-3 px-2">
                       <div className="font-mono text-sm font-bold text-white">{dest.nome_destino || `Cód. ${dest.codigo_destino}`}</div>
                       {dest.observacao && <div className="text-[10px] text-[var(--primary)] mt-0.5">{dest.observacao}</div>}
                     </td>
                     <td className="py-3 px-2 text-right text-sm text-muted-foreground">{dest.passagens}</td>
                     <td className="py-3 px-2 text-right font-mono text-sm font-medium text-white">{formatCurrency(dest.faturamento)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
      </div>
    </div>
  );
}
