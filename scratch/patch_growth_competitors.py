import re

with open("src/routes/growth.tsx", "r") as f:
    content = f.read()

# 1. Update interface
type_def = """interface CompetitorPrice {
  id: string;
  competitor: string;
  service: string;
  competitorPrice: number;
  competitorClass: string;
  ourPrice: number;
  ourClass: string;
  difference: number;
  notes: string;
  ourNotes: string;
  lastChecked: string;
  customFields?: Record<string, string>;
}"""
content = re.sub(r'interface CompetitorPrice \{[^}]+\}', type_def, content)

# 2. Update default state
if "ourNotes: \"Poltrona Leito com Água\"" not in content:
    content = content.replace(
        'competitor: "Viação Cometa", service: "SP -> RJ (Convencional)", competitorPrice: 120.50, ourPrice: 105.00, difference: -15.50, notes: "Eles não servem lanche."',
        'competitor: "Viação Cometa", service: "SP -> RJ", competitorPrice: 120.50, competitorClass: "Convencional", ourPrice: 105.00, ourClass: "Semi-Leito", difference: -15.50, notes: "Sem lanche", ourNotes: "Poltrona Leito com Água"'
    )

# 3. Update table headers
headers = """                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Concorrente</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Rota / Serviço</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-danger bg-danger/5 border-l border-danger/10 text-right">O Deles (Preço / Classe)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-success bg-success/5 border-r border-success/10 text-right">O Nosso (Preço / Classe)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Vantagem de Preço</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-[300px]">Comparativo (Diferenciais / Critérios)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Ações</th>"""

content = re.sub(
    r'<th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Concorrente</th>\s*<th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Serviço / Pacote</th>[\s\S]*?<th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Ações</th>',
    headers,
    content
)

# 4. Update table row
row_find = r'<td className="p-4 font-bold flex items-center gap-3">[\s\S]*?<td className="p-4">\s*<div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">[\s\S]*?<\/td>'

row_replace = """<td className="p-4 font-bold flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <Store className="size-4 text-muted-foreground" />
                          </div>
                          {price.competitor}
                        </td>
                        <td className="p-4 font-medium text-sm">{price.service}</td>
                        <td className="p-4 text-right bg-danger/5 border-l border-danger/10">
                          <div className="font-mono font-bold text-muted-foreground line-through opacity-80">{formatCurrency(price.competitorPrice)}</div>
                          <div className="text-[10px] uppercase font-bold text-danger mt-1">{price.competitorClass}</div>
                        </td>
                        <td className="p-4 text-right bg-success/5 border-r border-success/10">
                          <div className="font-mono font-bold text-foreground">{formatCurrency(price.ourPrice)}</div>
                          <div className="text-[10px] uppercase font-bold text-success mt-1">{price.ourClass}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border",
                            isSame ? "bg-muted/10 text-muted-foreground border-white/10" :
                            !isCheaper ? "bg-success/10 text-success border-success/20" :
                            "bg-warning/10 text-warning border-warning/20"
                          )}>
                            {!isSame && (!isCheaper ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />)}
                            {!isSame ? `${formatCurrency(Math.abs(price.difference))}` : "Empatado"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          <div className="flex flex-col gap-2">
                            {price.notes && (
                              <div className="flex items-start gap-2 bg-danger/5 p-2 rounded border border-danger/10">
                                <span className="font-bold text-danger uppercase text-[9px] mt-0.5 min-w-[40px]">Deles:</span> 
                                <span>{price.notes}</span>
                              </div>
                            )}
                            {price.ourNotes && (
                              <div className="flex items-start gap-2 bg-success/5 p-2 rounded border border-success/10">
                                <span className="font-bold text-success uppercase text-[9px] mt-0.5 min-w-[40px]">Nosso:</span> 
                                <span className="text-foreground">{price.ourNotes}</span>
                              </div>
                            )}
                            {price.customFields && Object.keys(price.customFields).length > 0 && (
                              <div className="mt-1 pt-1 border-t border-white/5 flex flex-col gap-1">
                                {Object.entries(price.customFields).map(([k, v]) => (
                                  <div key={k} className="flex justify-between items-center bg-black/40 px-2 py-1 rounded text-[10px]">
                                    <span className="font-bold text-muted-foreground">{k}:</span>
                                    <span className="text-foreground">{v}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => { setEditingPrice(price); setIsPriceModalOpen(true); }} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-3.5" /></button>
                             <button onClick={() => handleDeletePrice(price.id)} className="p-1.5 bg-danger/10 hover:bg-danger/20 rounded-md text-danger transition-colors"><Trash2 className="size-3.5" /></button>
                           </div>
                        </td>"""

content = re.sub(row_find, row_replace, content)

with open("src/routes/growth.tsx", "w") as f:
    f.write(content)

print("Competitor tracking logic updated.")
