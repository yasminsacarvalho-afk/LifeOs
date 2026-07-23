import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OperationalReportData {
  faturamento_por_empresa: any;
  formas_pagamento: any;
  ocorrencias_e_movimentacoes_extras: any;
  detalhe_servicos_linhas: any;
  mapeamento_destinos: any;
}

export interface OperationalReport {
  id: string;
  report_date: string;
  empresa: string;
  report_data: OperationalReportData;
  created_at: string;
  updated_at: string;
}

export function aggregateReportData(reports: OperationalReportData[]): OperationalReportData | null {
  if (!reports || reports.length === 0) return null;

  const result: OperationalReportData = {
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
      r.faturamento_por_empresa.empresas.forEach((e: any) => {
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
        r.ocorrencias_e_movimentacoes_extras.detalhes.forEach((d: any) => {
          const key = `${d.tipo}-${d.forma_pagamento}`;
          if (!detalhesExtrasMap.has(key)) detalhesExtrasMap.set(key, { ...d, registros: 0, valor: 0 });
          const current = detalhesExtrasMap.get(key);
          current.registros += (d.registros || 0);
          current.valor += (d.valor || 0);
        });
      }
    }

    if (r.detalhe_servicos_linhas) {
      r.detalhe_servicos_linhas.forEach((s: any) => {
        if (!linhasMap.has(s.servico)) linhasMap.set(s.servico, { ...s, faturamento: 0, passagens: 0 });
        const current = linhasMap.get(s.servico);
        current.faturamento += (s.faturamento || 0);
        current.passagens += (s.passagens || 0);
      });
    }

    if (r.mapeamento_destinos) {
      r.mapeamento_destinos.forEach((d: any) => {
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

export function useOperationalReports() {
  const [reports, setReports] = useState<OperationalReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('operational_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (error) {
        console.error('Error fetching operational reports:', error);
      } else {
        setReports(data || []);
      }
    } catch (e) {
      console.error('Error in useOperationalReports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const saveReport = async (date: string, empresa: string, reportData: OperationalReportData) => {
    try {
      // Check if report for this date and company already exists
      const existing = reports.find(r => r.report_date === date && r.empresa === empresa);
      
      let error;
      if (existing) {
        // Merge existing report data with the new report data
        const mergedData = aggregateReportData([existing.report_data, reportData]);
        
        const { error: updateError } = await supabase
          .from('operational_reports')
          .update({ report_data: mergedData, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('operational_reports')
          .insert([{ report_date: date, empresa, report_data: reportData }]);
        error = insertError;
      }

      if (error) throw error;
      
      await fetchReports();
      return { success: true };
    } catch (e: any) {
      console.error('Error saving report:', e);
      return { success: false, error: e.message };
    }
  };

  const deleteReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from('operational_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchReports();
      return { success: true };
    } catch (e: any) {
      console.error('Error deleting report:', e);
      return { success: false, error: e.message };
    }
  };

  return {
    reports,
    isLoading,
    saveReport,
    deleteReport,
    refetch: fetchReports
  };
}
