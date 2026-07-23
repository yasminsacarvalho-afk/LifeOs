import re

with open("src/routes/analytics.tsx", "r") as f:
    content = f.read()

# 1. Update weekdayStats useMemo
hook_regex = re.compile(r'  const weekdayStats = useMemo\(\(\) => \{\n.*?return Object\.entries\(daysMap\).*?\.sort\(\(a, b\) => b\.revenue - a\.revenue\);\n  \}, \[filteredClosings, filteredTrips, salesByDate\]\);', re.DOTALL)

new_hook = """  const weekdayStats = useMemo(() => {
    const daysMap: Record<string, { count: number, revenue: number, drivers: Set<string>, companies: Record<string, number> }> = {
      "Domingo": { count: 0, revenue: 0, drivers: new Set(), companies: {} },
      "Segunda-feira": { count: 0, revenue: 0, drivers: new Set(), companies: {} },
      "Terça-feira": { count: 0, revenue: 0, drivers: new Set(), companies: {} },
      "Quarta-feira": { count: 0, revenue: 0, drivers: new Set(), companies: {} },
      "Quinta-feira": { count: 0, revenue: 0, drivers: new Set(), companies: {} },
      "Sexta-feira": { count: 0, revenue: 0, drivers: new Set(), companies: {} },
      "Sábado": { count: 0, revenue: 0, drivers: new Set(), companies: {} },
    };

    filteredClosings.forEach(c => {
      if (!c.closing_date) return;
      const dateObj = new Date(c.closing_date + "T12:00:00"); 
      if (isNaN(dateObj.getTime())) return;
      const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      
      let calculatedTotal = 0;
      if (c.company_settlements && Array.isArray(c.company_settlements)) {
        c.company_settlements.forEach((s: any) => {
          calculatedTotal += Number(s.total || 0);
        });
      } else if (c.company_totals) {
         Object.values(c.company_totals).forEach((val: any) => {
            calculatedTotal += Number(val || 0);
         });
      }

      const salesCount = salesByDate.get(c.closing_date) || 0;
      
      if (daysMap[capitalizedDay]) {
        daysMap[capitalizedDay].count += salesCount;
        daysMap[capitalizedDay].revenue += calculatedTotal;
        
        if (c.company_settlements && Array.isArray(c.company_settlements)) {
          c.company_settlements.forEach((s: any) => {
            const compName = s.company_name;
            if (compName) {
               daysMap[capitalizedDay].companies[compName] = (daysMap[capitalizedDay].companies[compName] || 0) + Number(s.total || 0);
            }
          });
        }
      }
    });

    filteredTrips.forEach(t => {
      const d = t.raw_scheduled_departure || t.created_at;
      if (!d) return;
      const dateObj = new Date(d.replace(" ", "T")); 
      if (isNaN(dateObj.getTime())) return;
      const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      if (daysMap[capitalizedDay] && t.driver_name) {
        const parts = t.driver_name.split(' ');
        const shortName = parts.length > 1 ? `${parts[0]} ${parts[1]}` : parts[0];
        daysMap[capitalizedDay].drivers.add(shortName);
      }
    });

    return Object.entries(daysMap)
      .map(([day, stats]) => {
         let topComp = "N/A";
         let maxRev = 0;
         Object.entries(stats.companies).forEach(([name, rev]) => {
            if (rev > maxRev) {
               maxRev = rev;
               topComp = name;
            }
         });
         return { day, count: stats.count, revenue: stats.revenue, drivers: Array.from(stats.drivers), topCompany: topComp, topCompanyRev: maxRev };
      })
      .filter(x => x.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredClosings, filteredTrips, salesByDate]);"""

content = hook_regex.sub(new_hook, content, count=1)

# 2. Update the UI rendering part for weekdayStats
ui_regex = re.compile(r'<div className="space-y-4">\n\s*\{weekdayStats\.length > 0 \? weekdayStats\.map\(\(w, i\) => \(\n.*?\}\)\) : \(\n\s*<div className="text-center py-6 text-muted-foreground italic text-sm">Sem dados suficientes no período\.</div>\n\s*\)\}\n\s*</div>', re.DOTALL)

new_ui = """<div className="space-y-4">
                {weekdayStats.length > 0 ? weekdayStats.map((w, i) => (
                  <div key={w.day} className="flex flex-col gap-3 p-4 rounded-xl bg-background/50 border border-border/50 shadow-sm relative overflow-hidden hover:bg-white/[0.02] transition-colors">
                    {i === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>}
                    {i === weekdayStats.length - 1 && weekdayStats.length > 1 && <div className="absolute top-0 left-0 w-1 h-full bg-danger"></div>}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm", i === 0 ? "bg-success/20 text-success" : i === weekdayStats.length - 1 ? "bg-danger/20 text-danger" : "bg-muted text-muted-foreground")}>
                          #{i+1}
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-2">
                             {w.day}
                             {i === 0 && <span className="text-[9px] uppercase font-bold text-success bg-success/10 px-1.5 py-0.5 rounded tracking-wider">Pico</span>}
                             {i === weekdayStats.length - 1 && weekdayStats.length > 1 && <span className="text-[9px] uppercase font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded tracking-wider">Fraco</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{w.count} {w.count === 1 ? 'venda/passagem' : 'vendas/passagens'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-base">{formatCurrency(w.revenue)}</div>
                      </div>
                    </div>
                    
                    <div className="pt-3 mt-1 border-t border-border/30 flex flex-col gap-2">
                       {w.topCompany !== "N/A" && (
                          <div className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                             <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px] flex items-center gap-1.5"><Store className="size-3 text-primary" /> Empresa Destaque</span>
                             <div className="text-right">
                                <span className="font-bold text-foreground block">{w.topCompany}</span>
                                <span className="font-mono text-primary text-[10px]">{formatCurrency(w.topCompanyRev)}</span>
                             </div>
                          </div>
                       )}
                       
                       {w.drivers.length > 0 && (
                         <div className="flex flex-wrap gap-1.5 items-center mt-1">
                           <span className="text-[10px] uppercase font-semibold text-muted-foreground mr-1"><Bus className="size-3 inline mr-1" />Motoristas:</span>
                           {w.drivers.map(drv => (
                             <span key={drv} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border/50 shadow-sm">
                               {drv}
                             </span>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-muted-foreground italic text-sm">Sem dados suficientes no período.</div>
                )}
              </div>"""

if hook_regex.search(content) and ui_regex.search(content):
    content = ui_regex.sub(new_ui, content, count=1)
    with open("src/routes/analytics.tsx", "w") as f:
        f.write(content)
    print("Success!")
else:
    print("Regex not found.")
