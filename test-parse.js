const fs = require('fs');

const text = `
Empresa: Viação Exemplo   Bilheteiro: João   Ponto de Venda: Guichê 1
Dt Serviço TP Ori Des PO FP1 FP2 FP3 Aut./NSU Tarifa Taxas
08/06 14:30 N 1 2 12 DI - - - 100,00 15,00
08/06 15:00 N 1 2 12 DI - - 1234 50.00 0.00
10/06 08:00 N 1 2 12 CC DI - 9999 150 10
`;

const lines = text.split('\n');
const dateRegex = /^(\d{2}\/\d{2})/;
const payloads = [];

const parseNum = (val) => {
  if (!val) return 0;
  const v = String(val).replace(/R\$|\s/gi, '').trim();
  if (!v || v === '-') return 0;
  let parsed = 0;
  if (v.includes(',') && v.includes('.')) parsed = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  else if (v.includes(',')) parsed = parseFloat(v.replace(',', '.'));
  else parsed = parseFloat(v);
  return isNaN(parsed) ? 0 : parsed;
};

for (const line of lines) {
  const trimmed = line.trim();
  if (dateRegex.test(trimmed)) {
     const parts = trimmed.split(/\s+/);
     
     // Capturar valores financeiros no final da linha (Tarifa, Taxas, Total)
     const numbers = parts.filter(p => /^[\d.,]+$/.test(p) && p.includes(','));
     
     console.log("Line:", trimmed);
     console.log("Numbers found:", numbers);
  }
}
