const fs = require('fs');
const file = 'src/routes/billing.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('type Tab = "vendas" | "fechamentos" | "gestao";', 'type Tab = "vendas" | "fechamentos" | "analise";');
content = content.replace('const [activeTab, setActiveTab] = useState<Tab>("vendas");', `const [activeTab, setActiveTab] = useState<Tab>("vendas");\n  const [analiseDate, setAnaliseDate] = useState<string>(todayStr || "");\n  const [analiseNotes, setAnaliseNotes] = useState<string>("");\n  const [analiseTopLine, setAnaliseTopLine] = useState<string>("");\n  const [analiseTopCity, setAnaliseTopCity] = useState<string>("");\n  const [analiseClima, setAnaliseClima] = useState<string>("");`);

content = content.replace(/<button[\s\S]*?onClick=\{\(\) => setActiveTab\("gestao"\)\}[\s\S]*?Gestão Financeira\n\s*<\/button>/m, `<button
            onClick={() => setActiveTab("analise")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
              activeTab === "analise"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <PieChart className="size-4 shrink-0" /> Análise Diária (Diário de Bordo)
          </button>`);

const startIndex = content.indexOf('{activeTab === "gestao" && (');
if (startIndex !== -1) {
    let openBrackets = 0;
    let endIndex = -1;
    let foundContent = false;
    
    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') {
            openBrackets++;
            foundContent = true;
        } else if (content[i] === '}') {
            openBrackets--;
        }
        
        if (foundContent && openBrackets === 0) {
            endIndex = i + 1;
            break;
        }
    }
    
    if (endIndex !== -1) {
        while (content[endIndex] === ' ' || content[endIndex] === '\n') endIndex++;
        if (content[endIndex] === ')') endIndex++;
        
        const newBlock = `{activeTab === "analise" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-3xl border border-border">
               <div>
                 <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                   <Lightbulb className="size-6 text-[#8A05BE]" /> Diário Analítico da Operação
                 </h2>
                 <p className="text-sm text-muted-foreground mt-1">
                   Registre informações qualitativas de um dia específico para gerar análises minuciosas futuras.
                 </p>
               </div>
               <div className="w-full md:w-auto">
                 <input
                   type="date"
                   value={analiseDate}
                   onChange={(e) => setAnaliseDate(e.target.value)}
                   className="w-full md:w-auto rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold focus:border-primary focus:outline-none transition-all shadow-sm"
                 />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
                 <h3 className="font-bold text-lg border-b border-border/50 pb-3">Resumo Quantitativo</h3>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-muted/30 p-4 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Total de Vendas</div>
                      <div className="text-2xl font-black text-foreground">
                        {sales.filter(s => s.sale_date === analiseDate).length}
                      </div>
                   </div>
                   <div className="bg-muted/30 p-4 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Volume R$</div>
                      <div className="text-2xl font-black text-success">
                        R$ {sales.filter(s => s.sale_date === analiseDate).reduce((acc, curr) => acc + (curr.amount || 0), 0).toFixed(2)}
                      </div>
                   </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-border/50">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Linhas que mais Venderam</label>
                      <input 
                        type="text" 
                        value={analiseTopLine}
                        onChange={(e) => setAnaliseTopLine(e.target.value)}
                        placeholder="Ex: 08:30 (Eunápolis x Porto Seguro)..." 
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Cidades com Maior Movimento</label>
                      <input 
                        type="text" 
                        value={analiseTopCity}
                        onChange={(e) => setAnaliseTopCity(e.target.value)}
                        placeholder="Ex: Teixeira de Freitas, Itabuna..." 
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                      />
                    </div>
                 </div>
               </div>

               <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6 flex flex-col">
                 <h3 className="font-bold text-lg border-b border-border/50 pb-3">Fatores Externos & Ocorrências</h3>
                 
                 <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Clima e Ações Locais</label>
                    <input 
                      type="text" 
                      value={analiseClima}
                      onChange={(e) => setAnaliseClima(e.target.value)}
                      placeholder="Ex: Muita chuva / Ação da Gontijo / Feriado na cidade" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors"
                    />
                 </div>
                 
                 <div className="flex-1 flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Análise Livre (Histórico Completo)</label>
                    <textarea 
                      value={analiseNotes}
                      onChange={(e) => setAnaliseNotes(e.target.value)}
                      placeholder="Descreva aqui o comportamento geral do dia. Por exemplo: Tivemos problemas com o carro 2045 na parte da manhã, o que diminuiu as vendas do guichê 2..."
                      className="w-full flex-1 min-h-[150px] bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-[#8A05BE] focus:outline-none transition-colors resize-none"
                    ></textarea>
                 </div>
               </div>
            </div>

            <div className="flex justify-end">
               <button 
                 onClick={() => {
                   const payload = {
                     topLine: analiseTopLine,
                     topCity: analiseTopCity,
                     clima: analiseClima,
                     notes: analiseNotes
                   };
                   localStorage.setItem(\`diario_bordo_\${analiseDate}\`, JSON.stringify(payload));
                   alert("Análise Diária salva com sucesso! Estes dados ficarão armazenados para geração futura de relatórios.");
                 }}
                 className="bg-[#8A05BE] hover:bg-[#8A05BE]/90 text-white font-bold px-8 py-3 rounded-2xl shadow-lg transition-all active:scale-95"
               >
                 Salvar Análise do Dia
               </button>
            </div>
            
            <div className="hidden">
              {React.useEffect(() => {
                if (analiseDate) {
                  try {
                    const data = localStorage.getItem(\`diario_bordo_\${analiseDate}\`);
                    if (data) {
                      const parsed = JSON.parse(data);
                      setAnaliseTopLine(parsed.topLine || "");
                      setAnaliseTopCity(parsed.topCity || "");
                      setAnaliseClima(parsed.clima || "");
                      setAnaliseNotes(parsed.notes || "");
                    } else {
                      setAnaliseTopLine("");
                      setAnaliseTopCity("");
                      setAnaliseClima("");
                      setAnaliseNotes("");
                    }
                  } catch (e) {}
                }
              }, [analiseDate])}
            </div>
          </div>
        )}`;
        content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
    }
}

if (!content.includes("import React")) {
   content = content.replace('import { useState, useMemo } from "react";', 'import React, { useState, useMemo } from "react";');
}

fs.writeFileSync(file, content);
console.log('Patched billing.tsx successfully.');
