import re

with open("src/components/CsvImportModal.tsx", "r") as f:
    content = f.read()

# 1. Update the input accept attribute to support .json and .csv
content = content.replace(
    'accept=".csv"',
    'accept=".csv, .json"'
)

# 2. Add processStructuredJSON method and update handleFileUpload
new_methods = """
  const processStructuredJSON = (data: any[]) => {
    const payloads: any[] = [];
    let exp_dinheiro = 0, exp_debito = 0, exp_credito = 0, exp_pix = 0;
    let total_vendas_calculado = 0;
    let total_taxas = 0;

    const parseNum = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const v = String(val).replace(/R\\$|\\s/gi, '').trim();
      if (!v || v === '-') return 0;
      const cleanV = v.replace(/-/g, '');
      let parsed = 0;
      if (cleanV.includes(',') && cleanV.includes('.')) parsed = parseFloat(cleanV.replace(/\\./g, '').replace(',', '.'));
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

    const partner = partners.find(p => p.id === defaultCompanyId);
    const finalCommissionRate = partner ? Number(partner.comissao || 0) : 0;
    const currentYear = new Date().getFullYear();

    for (const row of data) {
      if (!row.data_viagem && !row.servico) continue;
      
      let saleDate = "";
      if (row.data_viagem) {
        const parts = row.data_viagem.split('/');
        if (parts.length >= 2) {
          saleDate = `${currentYear}-${parts[1]}-${parts[0]}`;
        }
      }
      if (overrideDate) saleDate = overrideDate;

      const tarifa = parseNum(row.tarifa);
      const valor_total = parseNum(row.valor_total);
      const baseAmount = tarifa || valor_total || 0;
      const taxas = parseNum(row.taxas) || Math.max(0, valor_total - baseAmount) || 0;
      const calculatedCommission = baseAmount * (finalCommissionRate / 100);
      const pm = mapPaymentMethod(row.forma_pagamento);

      if (pm === 'Dinheiro') exp_dinheiro += baseAmount;
      if (pm === 'Débito') exp_debito += baseAmount;
      if (pm === 'Crédito') exp_credito += baseAmount;
      if (pm === 'Pix') exp_pix += baseAmount;
      
      total_vendas_calculado += baseAmount;
      total_taxas += taxas;

      payloads.push({
        amount: baseAmount,
        tarifa: tarifa || baseAmount,
        taxas: taxas,
        commission_amount: calculatedCommission,
        sale_date: saleDate,
        payment_method: pm,
        sales_channel: "Sistema",
        company_id: defaultCompanyId || null,
        seller_id: defaultSellerId || null,
        hr: row.horario_venda || "",
        fp1: row.forma_pagamento,
        ori: row.origem || "",
        des: row.destino || "",
        poltrona: row.poltrona || "",
        codigo_servico: row.servico || "",
        tipo_passagem: row.n_passagem || "",
        operation_type: row.operacao || "VENDA",
        _original_date: saleDate,
        _companyName: partner ? partner.name : "Avulso (Escolha no Filtro)",
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      
      if (file.name.toLowerCase().endsWith('.json')) {
        try {
          const jsonPayload = JSON.parse(text);
          if (Array.isArray(jsonPayload)) {
            processStructuredJSON(jsonPayload);
            setLoading(false);
            return;
          }
        } catch (err) {
          throw new Error("O arquivo JSON é inválido ou mal formatado.");
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
"""

content = re.sub(
    r'  const handleFileUpload = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]+?  \};\n',
    new_methods,
    content
)

with open("src/components/CsvImportModal.tsx", "w") as f:
    f.write(content)

print("Import JSON schema logic added.")
