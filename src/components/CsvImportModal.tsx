import { useState, useRef, useEffect } from "react";
import { X, UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnersRealtime } from "@/hooks/use-partners-realtime";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CsvImportModal({ open, onClose, onSuccess }: Props) {
  const { partners } = usePartnersRealtime();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  
  const [previewSales, setPreviewSales] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [reportSummary, setReportSummary] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [overrideDate, setOverrideDate] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [defaultCompanyId, setDefaultCompanyId] = useState("");
  const [defaultSellerId, setDefaultSellerId] = useState("");
  const [dbSellers, setDbSellers] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      supabase.from("sellers").select("id, name").then(({ data }) => {
        if (data) setDbSellers(data);
      });
      setDefaultCompanyId("");
      setDefaultSellerId("");
      setError(null);
      setSuccessCount(null);
      setPreviewSales([]);
      setSelectedRows([]);
      setReportSummary(null);
      setImporting(false);
      setProgress(0);
      setOverrideDate("");
    }
  }, [open]);

  if (!open) return null;

  const processSmartReport = (text: string) => {
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    const lines = (parsed.data as string[][]).map(row => row.filter(c => c && c.trim() !== "").join(" ").trim());
    
    const fullText = lines.join('\n');

    const parseNum = (val: any) => {
      if (!val) return 0;
      const v = String(val).replace(/R\$|\s/gi, '').trim();
      if (!v || v === '-') return 0;
      const isNegative = v.startsWith('-') || v.endsWith('-');
      const cleanV = v.replace(/-/g, '');
      let parsed = 0;
      if (cleanV.includes(',') && cleanV.includes('.')) parsed = parseFloat(cleanV.replace(/\./g, '').replace(',', '.'));
      else if (cleanV.includes(',')) parsed = parseFloat(cleanV.replace(',', '.'));
      else parsed = parseFloat(cleanV);
      if (isNaN(parsed)) return 0;
      return isNegative ? -parsed : parsed;
    };

    const extractField = (label: string, regexPattern: string) => {
      const match = fullText.match(new RegExp(regexPattern, 'i'));
      return match ? match[1].trim() : "";
    };

    const company_name = extractField("Empresa", "Empresa\\s*[:,]?\\s*([^\\n]+)") || "Avulso";
    const point_of_sale = extractField("Ponto de Venda", "Ponto de Venda\\s*[:,]?\\s*([\\d-]*\\s*[a-zA-ZÀ-ÿ\\s]+)") || "";
    const seller_name = extractField("Bilheteiro", "Bilheteiro\\s*[:,]?\\s*([\\d-]*\\s*[a-zA-ZÀ-ÿ\\s]+)") || "Sem Vendedor";

    let quantidade_vendas = 0;
    let valor_total_vendas = 0;
    let total_geral = 0;
    let receitas_extras = 0;

    for (const line of lines) {
      const l = line.toLowerCase();
      if (l.includes("total vendas")) {
        const nums = line.match(/-?[\d]+(?:[.,][\d]{3})*(?:[.,]\d+)?-?/g) || line.split(/\s+/).filter(p => /^[\d.,]+$/.test(p));
        if (nums && nums.length > 0) {
          quantidade_vendas = parseInt(nums[0]);
          valor_total_vendas = parseNum(nums[nums.length - 1]);
        }
      }
      if (l.includes("total geral")) {
        const nums = line.match(/-?[\d]+(?:[.,][\d]{3})*(?:[.,]\d+)?-?/g) || line.split(/\s+/).filter(p => /^[\d.,]+$/.test(p));
        if (nums) total_geral = parseNum(nums[nums.length - 1]);
      }
      if (l.includes("movimentacao financeira") || l.includes("receitas extras")) {
        const nums = line.match(/-?[\d]+(?:[.,][\d]{3})*(?:[.,]\d+)?-?/g) || line.split(/\s+/).filter(p => /^[\d.,]+$/.test(p));
        if (nums) receitas_extras = parseNum(nums[nums.length - 1]);
      }
    }

    let exp_dinheiro = 0, exp_debito = 0, exp_credito = 0, exp_pix = 0;
    let inFpBlock = false;
    for (const line of lines) {
       const l = line.toLowerCase();
       if (l.includes("formas de pagamento") || l.includes("forma de pagamento")) inFpBlock = true;
       if (inFpBlock && (l.includes("total vendas") || l.includes("dt serviço") || l.includes("resumo"))) inFpBlock = false;
       
       if (inFpBlock) {
          const nums = line.match(/-?[\d]+(?:[.,][\d]{3})*(?:[.,]\d+)?-?/g);
          if (nums && nums.length > 0) {
             const val = parseNum(nums[nums.length - 1]);
             if (l.includes("dinheiro") || l.includes(" di ")) exp_dinheiro = val;
             if (l.includes("debito") || l.includes("débito") || l.includes(" de ")) exp_debito = val;
             if (l.includes("credito") || l.includes("crédito") || l.includes(" cr ")) exp_credito = val;
             if (l.includes("pix") || l.includes(" pi ")) exp_pix = val;
          }
       }
    }

    const payloads = [];
    const dateRegex = /^(\d{2}\/\d{2})/;

    const mapPaymentMethod = (code: string) => {
      if (!code) return "Dinheiro";
      const c = code.toUpperCase();
      if (c === "DE") return "Débito";
      if (c === "DI") return "Dinheiro";
      if (c === "PI" || c === "PIX") return "Pix";
      if (c === "CC" || c === "CR") return "Crédito";
      return code;
    };

    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (dateRegex.test(line)) {
        const parts = line.split(/\s+/);
        const data_viagem = parts[0];
        const codigo_servico = parts[1] || "";
        const tipo_passagem = parts[2] || "";
        const codigo_origem = parts[3] || "";
        const codigo_destino = parts[4] || "";
        const poltrona = parts[5] || "";
        let raw_fp = parts[6] || "";
        if (raw_fp === "-") raw_fp = parts[7] !== "-" ? parts[7] : "DI";
        
        const forma_pagamento = mapPaymentMethod(raw_fp);

        const numbers = line.match(/-?[\d]+(?:[.,][\d]{3})*(?:[.,]\d+)?-?(?=\s|$)/g)?.filter(n => n.includes(',') || n.includes('.')) || [];
        let tarifa = 0;
        let taxas = 0;
        let valor_total = 0;

        if (numbers.length >= 2) {
            tarifa = parseNum(numbers[0]);
            valor_total = parseNum(numbers[numbers.length - 1]);
            taxas = Math.max(0, valor_total - tarifa);
        } else if (numbers.length === 1) {
            tarifa = parseNum(numbers[0]);
            valor_total = tarifa;
        }

        let hora_venda = "";
        let operation_type = "VENDA";
        
        const timeRegex = /\b(\d{2}:\d{2}(?::\d{2})?)\b/g;
        const allTimes = [];
        
        const currentTimes = line.match(timeRegex) || [];
        allTimes.push(...currentTimes);

        if (i + 1 < lines.length) {
            const nextLine = lines[i+1];
            const ops = ["VENDA", "CANCELAMENTO", "DEVOLUCAO", "ESTORNO", "REMARCACAO"];
            const nextLineUpper = nextLine.toUpperCase();
            
            for (const op of ops) {
                if (nextLineUpper.includes(op)) {
                    operation_type = op;
                    break;
                }
            }

            const nextTimes = nextLine.match(timeRegex) || [];
            allTimes.push(...nextTimes);
        }

        if (allTimes.length > 0) {
            // A hora da venda costuma ser a última registrada na leitura do bloco (depois do serviço)
            hora_venda = allTimes[allTimes.length - 1];
            
            // Prevenir de pegar o código do serviço se for igual
            if (hora_venda === codigo_servico && allTimes.length > 1) {
                hora_venda = allTimes[allTimes.length - 2];
            } else if (hora_venda === codigo_servico && allTimes.length === 1) {
                // Se só tem 1 e é o serviço, então não temos a hora da venda explícita
                hora_venda = "";
            }
        }

        const currentYear = new Date().getFullYear();
        const [day, month] = data_viagem.split('/');
        let saleDate = `${currentYear}-${month}-${day}`;
        
        // Aplica a data forçada antes de importar, se fornecida
        if (overrideDate) {
           saleDate = overrideDate;
        }

        let companyId = defaultCompanyId || null;
        let finalCompanyName = company_name;
        let finalCommissionRate = 0;
        
        if (!defaultCompanyId) {
          const normCsv = normalize(company_name);
          const matchedCompany = partners.find(p => {
            const normDb = normalize(p.name);
            return normDb === normCsv || normDb.includes(normCsv) || normCsv.includes(normDb);
          });
          if (matchedCompany) {
            companyId = matchedCompany.id;
            finalCompanyName = matchedCompany.name;
            finalCommissionRate = Number(matchedCompany.comissao || 0);
          }
        } else {
          const defaultPartner = partners.find(p => p.id === defaultCompanyId);
          if (defaultPartner) {
            finalCompanyName = defaultPartner.name;
            finalCommissionRate = Number(defaultPartner.comissao || 0);
          }
        }

        let sellerId = defaultSellerId || null;
        let finalSellerName = seller_name;
        if (!defaultSellerId) {
          const normCsv = normalize(seller_name);
          const matchedSeller = dbSellers.find(s => {
            const normDb = normalize(s.name);
            return normDb === normCsv || normDb.includes(normCsv) || normCsv.includes(normDb);
          });
          if (matchedSeller) {
            sellerId = matchedSeller.id;
            finalSellerName = matchedSeller.name;
          }
        } else {
          finalSellerName = dbSellers.find(s => s.id === defaultSellerId)?.name || "Sem Vendedor";
        }

        const baseAmount = tarifa || valor_total;
        const calculatedCommission = baseAmount * (finalCommissionRate / 100);

        payloads.push({
          amount: baseAmount,
          tarifa: tarifa,
          taxas: taxas,
          commission_amount: calculatedCommission,
          sale_date: saleDate,
          payment_method: forma_pagamento,
          sales_channel: point_of_sale || "Balcão",
          company_id: companyId,
          seller_id: sellerId,
          hr: hora_venda || codigo_servico,
          fp1: raw_fp, // Guarda o codigo original
          ori: codigo_origem,
          des: codigo_destino,
          poltrona: poltrona,
          codigo_servico: codigo_servico,
          tipo_passagem: tipo_passagem,
          operation_type: operation_type,
          _original_date: saleDate, // Salva para não perder
          _companyName: finalCompanyName,
          _sellerName: finalSellerName,
          _commissionPercent: finalCommissionRate
        });
      }
    }

    if (payloads.length === 0) {
      throw new Error(`Nenhuma venda válida foi encontrada. (Tente abrir o arquivo e verificar se as linhas de venda começam com DD/MM).`);
    }

    const total_vendas_calculado = payloads.reduce((acc, curr) => acc + curr.amount, 0);

    setReportSummary({
      quantidade_vendas: payloads.length,
      valor_total_vendas: total_vendas_calculado,
      total_geral,
      receitas_extras,
      ticket_medio: payloads.length > 0 ? total_vendas_calculado / payloads.length : 0,
      total_taxas: payloads.reduce((acc, curr) => acc + curr.taxas, 0),
      expected_fp: {
         dinheiro: exp_dinheiro,
         debito: exp_debito,
         credito: exp_credito,
         pix: exp_pix
      }
    });

    setPreviewSales(payloads);
    setSelectedRows([]);
  };

  const handleOverrideDate = (newDate: string) => {
    setOverrideDate(newDate);
    if (!newDate) {
      // Restore original
      setPreviewSales(prev => prev.map(s => ({ ...s, sale_date: s._original_date })));
    } else {
      // Force new date
      setPreviewSales(prev => prev.map(s => ({ ...s, sale_date: newDate })));
    }
  };

  const processStructuredJSON = (data: any[]) => {
    const payloads: any[] = [];
    let exp_dinheiro = 0, exp_debito = 0, exp_credito = 0, exp_pix = 0;
    let total_vendas_calculado = 0;
    let total_taxas = 0;

    const parseNum = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const v = String(val).replace(/R\$|\s/gi, '').trim();
      if (!v || v === '-') return 0;
      const cleanV = v.replace(/-/g, '');
      let parsed = 0;
      if (cleanV.includes(',') && cleanV.includes('.')) parsed = parseFloat(cleanV.replace(/\./g, '').replace(',', '.'));
      else if (cleanV.includes(',')) parsed = parseFloat(cleanV.replace(',', '.'));
      else parsed = parseFloat(cleanV);
      return (v.startsWith('-') || v.endsWith('-')) ? -parsed : parsed;
    };

    const mapPaymentMethod = (code: string) => {
      if (!code) return "Dinheiro";
      const c = code.toString().toUpperCase();
      if (c === "DE" || c.includes("DÉBITO") || c.includes("DEBITO")) return "Débito";
      if (c === "DI" || c.includes("DINHEIRO")) return "Dinheiro";
      if (c === "PI" || c.includes("PIX")) return "Pix";
      if (c === "CC" || c === "CR" || c.includes("CRÉDITO") || c.includes("CREDITO")) return "Crédito";
      return code;
    };

    const resolveCompany = (row: any) => {
      const serv = String(row.servico || "").trim();
      const serie = String(row.n_serie || "").trim();
      let expectedName = "Avulso";
      
      if ((serv.startsWith("10") || serv.startsWith("12")) && serie.startsWith("86")) {
         expectedName = "ROTA";
      } else if (serv.startsWith("89") && serie.startsWith("19")) {
         expectedName = "EXPRESSO BRASILEIRO";
      }
      
      if (expectedName !== "Avulso") {
         const matched = partners.find(p => p.name.toUpperCase().includes(expectedName));
         if (matched) return matched;
      }
      
      return partners.find(p => p.id === defaultCompanyId) || null;
    };

    const currentYear = new Date().getFullYear();

    for (const row of data) {
      // 1. Integridade: Tratamento estrito como string para IDs para não perder zero
      const servico = String(row.servico || "").trim();
      const n_serie = String(row.n_serie || "").trim();
      const n_passagem = String(row.n_passagem || "").trim();
      const bpe = String(row.bpe || "").trim();
      const hr_venda = String(row.horario_venda || "").trim();
      const fp = String(row.forma_pagamento || "").trim();

      if (!row.data_viagem && !servico) continue;
      
      let saleDate = "";
      if (row.data_viagem) {
        const parts = String(row.data_viagem).split('/');
        if (parts.length >= 2) {
          saleDate = `${currentYear}-${parts[1]}-${parts[0]}`;
        }
      }
      if (overrideDate) saleDate = overrideDate;

      // 3. Tipagem: Tarifas puramente floats
      const tarifa = parseNum(row.tarifa);
      const valor_total = parseNum(row.valor_total);
      const baseAmount = tarifa || valor_total || 0;
      const taxas = parseNum(row.taxas) || Math.max(0, valor_total - baseAmount) || 0;
      
      const pm = mapPaymentMethod(fp);

      if (pm === 'Dinheiro') exp_dinheiro += baseAmount;
      if (pm === 'Débito') exp_debito += baseAmount;
      if (pm === 'Crédito') exp_credito += baseAmount;
      if (pm === 'Pix') exp_pix += baseAmount;
      
      total_vendas_calculado += baseAmount;
      total_taxas += taxas;

      // 2. Serviço e Empresa Auto-detectado
      const partner = resolveCompany(row);
      const finalCommissionRate = partner ? Number(partner.comissao || 0) : 0;
      const calculatedCommission = baseAmount * (finalCommissionRate / 100);

      payloads.push({
        amount: baseAmount,
        tarifa: tarifa || baseAmount,
        taxas: taxas,
        commission_amount: calculatedCommission,
        sale_date: saleDate,
        payment_method: pm, // Sigla mapeada para o sistema entender
        sales_channel: "Sistema (JSON)",
        company_id: partner ? partner.id : (defaultCompanyId || null),
        seller_id: defaultSellerId || null,
        hr: hr_venda,
        fp1: fp, // Sigla Exata da Venda mantida no banco
        ori: String(row.origem || ""),
        des: String(row.destino || ""),
        poltrona: String(row.poltrona || ""),
        codigo_servico: servico,
        tipo_passagem: n_passagem, // Usando a coluna tipo_passagem para guardar n_passagem
        operation_type: String(row.operacao || "VENDA"),
        bpe: bpe, // Em caso de suporte futuro a esta coluna no backend
        n_serie: n_serie,
        _original_date: saleDate,
        _companyName: partner ? partner.name : "Avulso (Não Mapeado)",
        _sellerName: dbSellers.find(s => s.id === defaultSellerId)?.name || "Sem Vendedor",
        _commissionPercent: finalCommissionRate
      });
    }

    if (payloads.length === 0) {
      throw new Error(`Nenhum objeto com 'data_viagem' e 'servico' foi encontrado no JSON/CSV.`);
    }

    setReportSummary({
      quantidade_vendas: payloads.length,
      valor_total_vendas: total_vendas_calculado,
      total_geral: total_vendas_calculado + total_taxas,
      receitas_extras: 0,
      ticket_medio: payloads.length > 0 ? total_vendas_calculado / payloads.length : 0,
      total_taxas: total_taxas,
      expected_fp: {
         dinheiro: exp_dinheiro,
         debito: exp_debito,
         credito: exp_credito,
         pix: exp_pix
      }
    });

    setPreviewSales(payloads);
    setSelectedRows([]);
  };

  const safeJSONParse = (rawText: string) => {
    // 1 & 2. Limpeza estrita (BOM, invisíveis, trim)
    // Remove BOM (\uFEFF) e caracteres de controle invisíveis, exceto quebras de linha e tabs necessários
    const cleanedText = rawText.replace(/^\uFEFF/, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();

    try {
      // 3. Tenta o parse envolto em Try/Catch de proteção
      const parsed = JSON.parse(cleanedText);
      
      // 4. Valida se o resultado é de fato uma estrutura de Array válida
      if (!Array.isArray(parsed)) {
        throw new Error("O JSON foi lido, mas não é uma Array (lista) de objetos. Formato rejeitado.");
      }
      
      return parsed;
    } catch (err: any) {
      // Captura o erro detalhado e exibe a exata posição e caractere que causou o problema
      console.error("Falha de Middleware na sanitização do JSON:", err.message);
      
      const match = err.message.match(/position\s+(\d+)/i);
      if (match && match[1]) {
        const pos = parseInt(match[1], 10);
        const charAtPos = cleanedText.charAt(pos) || 'Fim do Arquivo';
        const context = cleanedText.substring(Math.max(0, pos - 15), Math.min(cleanedText.length, pos + 15));
        throw new Error(`Parse Crash! O JSON quebrou na posição ${pos} (Caractere '${charAtPos}'). Contexto próximo: "...${context}..."`);
      }
      
      throw new Error("O arquivo JSON é inválido ou possui sintaxe quebrada: " + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      
      if (file.name.toLowerCase().endsWith('.json')) {
        try {
          const jsonPayload = safeJSONParse(text);
          processStructuredJSON(jsonPayload);
          setLoading(false);
          return;
        } catch (err: any) {
          setError(err.message);
          setLoading(false);
          return;
        }
      }

      // Try CSV with headers first
      const parsedWithHeader = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsedWithHeader.data && parsedWithHeader.data.length > 0 && 
         (parsedWithHeader.data[0] as any).hasOwnProperty('data_viagem') && 
         (parsedWithHeader.data[0] as any).hasOwnProperty('servico')) {
         processStructuredJSON(parsedWithHeader.data);
      } else {
         // Fallback to unstructured SmartReport
         processSmartReport(text);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao ler o arquivo.");
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    setError(null);
    let successCount = 0;
    let skippedCount = 0;
    let lastError = null;

    // 4. EVITAR DUPLICIDADE (Trava de Segurança)
    // Coleta as datas únicas do lote atual
    const uniqueDates = Array.from(new Set(previewSales.map(s => s.sale_date)));
    
    // Busca as vendas existentes nessas datas para comparar e dar skip
    const { data: existingSales } = await supabase
      .from("sales")
      .select("id, tipo_passagem, codigo_servico, poltrona, hr")
      .in("sale_date", uniqueDates);

    for (let i = 0; i < previewSales.length; i++) {
       const sale = previewSales[i];
       
       // Verificação rigorosa de duplicidade por BPE / N_PASSAGEM (armazenado em tipo_passagem)
       // Se o JSON não fornecer, tenta travar por Serviço + Poltrona + Hora
       const isDuplicate = existingSales?.some(ex => {
         const matchPassagem = ex.tipo_passagem && sale.tipo_passagem && ex.tipo_passagem === sale.tipo_passagem;
         const matchPoltrona = !sale.tipo_passagem && ex.codigo_servico === sale.codigo_servico && ex.poltrona === sale.poltrona && ex.hr === sale.hr;
         return matchPassagem || matchPoltrona;
       });

       if (isDuplicate) {
         skippedCount++;
         setProgress(Math.round(((i + 1) / previewSales.length) * 100));
         continue; // Dá SKIP
       }

       const payload = {
          amount: sale.amount,
          commission_amount: sale.commission_amount,
          sale_date: sale.sale_date,
          payment_method: sale.payment_method,
          sales_channel: sale.sales_channel,
          company_id: sale.company_id,
          seller_id: sale.seller_id,
          tarifa: sale.tarifa,
          taxas: sale.taxas,
          hr: sale.hr,
          fp1: sale.fp1, // 2. Sigla Exata!
          fp2: sale.fp2,
          ori: sale.ori,
          des: sale.des,
          poltrona: sale.poltrona,
          codigo_servico: sale.codigo_servico,
          tipo_passagem: sale.tipo_passagem, // (Que guarda o n_passagem)
          operation_type: sale.operation_type
       };

       const { error: insertError } = await supabase.from("sales").insert(payload as any);
       if (!insertError) {
          successCount++;
       } else {
          console.error("Error inserting sale:", insertError);
          lastError = insertError.message;
       }
       
       setProgress(Math.round(((i + 1) / previewSales.length) * 100));
    }

    if (lastError && successCount === 0) {
       setError(`Falha ao salvar. Erro do Supabase: ${lastError} (${skippedCount} ignoradas por duplicidade).`);
       setImporting(false);
       return;
    } else if (lastError) {
       setError(`Atenção: ${successCount} salvas, ${skippedCount} ignoradas. Último erro: ${lastError}`);
    } else if (skippedCount > 0) {
       // Sucesso, mas com alguns pulos
       setError(`Aviso: ${skippedCount} vendas foram ignoradas (SKIP) pois já existiam no banco de dados!`);
    }

    setSuccessCount(successCount);
    setImporting(false);
    
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className={cn("w-full rounded-3xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden transition-all", previewSales.length > 0 ? "max-w-4xl" : "max-w-md")}>
        
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Importar Relatório de Vendas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Leitura Inteligente</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading || importing} className="rounded-full p-2 bg-card hover:bg-muted border border-border transition-colors">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm p-3 rounded-lg flex items-start gap-2 mb-4 animate-in slide-in-from-top-2">
               <AlertTriangle className="size-4 shrink-0 mt-0.5" />
               <div className="font-semibold">{error}</div>
            </div>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm p-3 rounded-lg flex items-start gap-2 mb-4 animate-in slide-in-from-top-2">
               <AlertTriangle className="size-4 shrink-0 mt-0.5" />
               <div className="font-semibold">{error}</div>
            </div>
          )}

          {successCount !== null && successCount > 0 ? (
             <div className="text-center space-y-3 py-6 animate-in zoom-in-95">
                <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center text-success mb-2">
                   <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{successCount} vendas importadas com sucesso!</h3>
                <p className="text-sm text-muted-foreground">Concluindo processo...</p>
             </div>
          ) : previewSales.length > 0 ? (
             <div className="space-y-4 animate-in slide-in-from-right-4">
                {reportSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex flex-col justify-center">
                      <p className="text-[10px] uppercase font-bold text-primary/70">Qtd Vendas</p>
                      <p className="text-xl font-black text-primary">{reportSummary.quantidade_vendas}</p>
                    </div>
                    <div className="bg-muted p-3 rounded-xl border border-border flex flex-col justify-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Valor Total (Tarifas)</p>
                      <p className="text-lg font-bold">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reportSummary.valor_total_vendas)}</p>
                    </div>
                    <div className="bg-muted p-3 rounded-xl border border-border flex flex-col justify-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Médio</p>
                      <p className="text-lg font-bold">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reportSummary.ticket_medio)}</p>
                    </div>
                    <div className="bg-muted p-3 rounded-xl border border-border flex flex-col justify-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Taxas/Seguro</p>
                      <p className="text-lg font-bold text-danger">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reportSummary.total_taxas)}</p>
                    </div>
                    <div className="bg-[#8A05BE]/10 border border-[#8A05BE]/20 p-3 rounded-xl flex flex-col justify-center col-span-2 md:col-span-1">
                      <p className="text-[10px] uppercase font-bold text-[#8A05BE]">Total Comissão Estimada</p>
                      <p className="text-xl font-black text-[#8A05BE]">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(previewSales.reduce((sum, s) => sum + s.commission_amount, 0))}</p>
                    </div>
                  </div>
                )}

                {previewSales.length > 0 && (() => {
                  const din = previewSales.filter(s => s.payment_method === 'Dinheiro').reduce((acc, curr) => acc + curr.amount, 0);
                  const deb = previewSales.filter(s => s.payment_method === 'Débito').reduce((acc, curr) => acc + curr.amount, 0);
                  const cred = previewSales.filter(s => s.payment_method === 'Crédito').reduce((acc, curr) => acc + curr.amount, 0);
                  const pix = previewSales.filter(s => s.payment_method === 'Pix').reduce((acc, curr) => acc + curr.amount, 0);
                  
                  const renderFpBlock = (label: string, actual: number, expected: number, colorClass: string) => {
                     const isDivergent = expected > 0 && Math.abs(actual - expected) > 0.01;
                     return (
                       <div className="flex-1 text-center border-r border-border/50 px-2 last:border-0 relative">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">{label}</div>
                          <div className={cn("font-mono text-sm font-bold", colorClass)}>
                             R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(actual)}
                          </div>
                          {isDivergent && (
                             <div className="mt-1 flex flex-col items-center">
                                <span className="bg-danger/10 text-danger text-[9px] px-1 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                                  <AlertTriangle className="size-3" /> Divergência
                                </span>
                                <span className="text-[9px] text-muted-foreground mt-0.5">
                                  PDF diz: R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(expected)}
                                </span>
                             </div>
                          )}
                       </div>
                     );
                  };

                  return (
                    <div className="flex flex-wrap gap-2 md:gap-4 p-3 bg-muted/20 border border-border rounded-xl">
                       {renderFpBlock('Dinheiro', din, reportSummary.expected_fp?.dinheiro || 0, 'text-success')}
                       {renderFpBlock('Débito', deb, reportSummary.expected_fp?.debito || 0, 'text-foreground')}
                       {renderFpBlock('Crédito', cred, reportSummary.expected_fp?.credito || 0, 'text-foreground')}
                       {renderFpBlock('Pix', pix, reportSummary.expected_fp?.pix || 0, 'text-info')}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border">
                   <div className="text-sm font-medium">As datas vieram erradas?</div>
                   <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Forçar Data:</span>
                      <input 
                        type="date" 
                        value={overrideDate}
                        onChange={(e) => handleOverrideDate(e.target.value)}
                        className="text-sm bg-card border border-border rounded-md px-2 py-1.5 focus:border-primary focus:outline-none"
                      />
                   </div>
                </div>

                <div className="rounded-xl border border-border overflow-hidden bg-background relative">
                   
                   {selectedRows.length > 0 && (
                     <div className="absolute top-0 left-0 right-0 bg-primary/10 border-b border-primary/20 p-2 flex items-center justify-between z-20 backdrop-blur-md">
                       <span className="text-sm font-bold text-primary pl-2">{selectedRows.length} linhas selecionadas</span>
                       <div className="flex items-center gap-3 pr-2">
                         <select 
                           onChange={(e) => {
                             if (!e.target.value) return;
                             setPreviewSales(prev => prev.map((s, idx) => selectedRows.includes(idx) ? {...s, payment_method: e.target.value, fp1: e.target.value} : s));
                             e.target.value = "";
                           }}
                           className="text-xs bg-card border border-border text-foreground rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                         >
                           <option value="">Alterar Pagamento...</option>
                           <option value="Dinheiro">Dinheiro</option>
                           <option value="Débito">Débito</option>
                           <option value="Crédito">Crédito</option>
                           <option value="Pix">Pix</option>
                         </select>
                         <button 
                           onClick={() => {
                             setPreviewSales(prev => prev.filter((_, idx) => !selectedRows.includes(idx)));
                             setSelectedRows([]);
                           }}
                           className="text-xs font-bold bg-danger/10 text-danger hover:bg-danger/20 px-3 py-1.5 rounded-lg transition-colors"
                         >
                           Excluir Selecionadas
                         </button>
                       </div>
                     </div>
                   )}

                   <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                               <th className="px-4 py-2 w-10">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedRows.length === previewSales.length && previewSales.length > 0}
                                    onChange={(e) => setSelectedRows(e.target.checked ? previewSales.map((_, i) => i) : [])}
                                    className="rounded border-border bg-card text-primary focus:ring-primary"
                                  />
                               </th>
                               <th className="px-4 py-2">Data</th>
                               <th className="px-4 py-2">Serviço / Hora</th>
                               <th className="px-4 py-2">PO</th>
                               <th className="px-4 py-2">Origem/Destino</th>
                               <th className="px-4 py-2">Empresa</th>
                               <th className="px-4 py-2">Vendedor</th>
                               <th className="px-4 py-2">FP1</th>
                               <th className="px-4 py-2 text-right">Tarifa</th>
                               <th className="px-4 py-2 text-right">Valor Venda</th>
                               <th className="px-4 py-2 text-right">Taxas (R$)</th>
                               <th className="px-4 py-2 text-right">Comissão (R$)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-border">
                            {previewSales.map((s, i) => (
                               <tr key={i} className={cn("hover:bg-muted/20 transition-colors cursor-pointer", selectedRows.includes(i) ? "bg-primary/5 hover:bg-primary/10" : "")} onClick={() => setSelectedRows(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}>
                                  <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                                     <input 
                                       type="checkbox" 
                                       checked={selectedRows.includes(i)}
                                       onChange={(e) => setSelectedRows(prev => e.target.checked ? [...prev, i] : prev.filter(x => x !== i))}
                                       className="rounded border-border bg-card text-primary focus:ring-primary"
                                     />
                                  </td>
                                  <td className="px-4 py-2 font-mono text-xs">
                                     <div className="flex items-center gap-2">
                                        {s.sale_date.split('-').reverse().join('/')}
                                        {s.operation_type !== 'VENDA' && (
                                           <span className="bg-danger/10 text-danger px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider">
                                              {s.operation_type}
                                           </span>
                                        )}
                                     </div>
                                  </td>
                                  <td className="px-4 py-2 text-xs">{s.codigo_servico || "-"} {s.hr ? `(${s.hr})` : ""}</td>
                                  <td className="px-4 py-2 text-xs font-mono">{s.poltrona || "-"}</td>
                                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                                     {s.ori && s.des ? `${s.ori} → ${s.des}` : (s.ori || s.des || "-")}
                                  </td>
                                  <td className="px-4 py-2 font-medium">
                                     {s._companyName}
                                     {s._commissionPercent > 0 && <span className="ml-2 text-[10px] bg-[#8A05BE]/10 text-[#8A05BE] font-bold px-1.5 py-0.5 rounded">{s._commissionPercent}%</span>}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-muted-foreground">{s._sellerName}</td>
                                  <td className="px-4 py-2 text-xs whitespace-nowrap">{s.payment_method}</td>
                                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.tarifa)}</td>
                                  <td className="px-4 py-2 text-right font-mono text-success font-semibold">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.amount)}</td>
                                  <td className="px-4 py-2 text-right font-mono text-danger">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.taxas)}</td>
                                  <td className="px-4 py-2 text-right font-mono text-warning">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.commission_amount)}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                   <button 
                      onClick={() => setPreviewSales([])} 
                      disabled={importing}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                   >
                      Voltar e escolher outro
                   </button>
                   
                   <button
                      onClick={handleConfirmImport}
                      disabled={importing}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                   >
                      {importing ? (
                         <>
                            <Loader2 className="size-4 animate-spin" />
                            Importando... {progress}%
                         </>
                      ) : (
                         <>
                            <Save className="size-4" />
                            Confirmar {previewSales.length} Vendas
                         </>
                      )}
                   </button>
                </div>
                
                {importing && (
                   <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                   </div>
                )}
             </div>
          ) : (
            <>
              <div className="pt-2 border-t border-border/50 mt-4">
                <div className="text-sm font-semibold mb-3">Opções de Importação</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Empresa Padrão</label>
                    <select
                      value={defaultCompanyId}
                      onChange={(e) => setDefaultCompanyId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">Detecção Automática</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Vendedor Padrão</label>
                    <select
                      value={defaultSellerId}
                      onChange={(e) => setDefaultSellerId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">Detecção Automática</option>
                      {dbSellers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Forçar Data do Relatório</label>
                    <input
                      type="date"
                      value={overrideDate}
                      onChange={(e) => setOverrideDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className={cn("flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors bg-card hover:bg-muted/30", loading ? "opacity-50 pointer-events-none" : "border-primary/50 hover:border-primary")}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {loading ? (
                      <Loader2 className="size-8 text-primary animate-spin mb-3" />
                    ) : (
                      <UploadCloud className="size-8 text-primary mb-3" />
                    )}
                    <p className="mb-2 text-sm text-muted-foreground font-semibold">
                      {loading ? "Processando Inteligência..." : "Clique para importar CSV"}
                    </p>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".csv, .json" 
                    className="hidden"  
                    onChange={handleFileUpload} 
                    disabled={loading}
                  />
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
