const Papa = require("papaparse");

const text = `
Empresa: Rota Transportes
Bilheteiro: Joao Silva
06/06 14:00 N SAO RIO 15 DI 100,00 10,00 110,00
15:30 VENDA
07/06 15:00 S BSB CWB 04 PIX 200,00 200,00
10:00 VENDA
`;

const parsed = Papa.parse(text, { skipEmptyLines: true });
const lines = parsed.data.map(row => row.filter(c => c && c.trim() !== "").join(" ").trim());
const fullText = lines.join('\n');

const extractField = (label, regexPattern) => {
  const match = fullText.match(new RegExp(regexPattern, 'i'));
  return match ? match[1].trim() : "";
};

console.log("Empresa:", extractField("Empresa", "Empresa\\s*[:,]?\\s*([^\\n]+)"));
console.log("Bilheteiro:", extractField("Bilheteiro", "Bilheteiro\\s*[:,]?\\s*([\\d-]*\\s*[a-zA-ZÀ-ÿ\\s]+)"));
