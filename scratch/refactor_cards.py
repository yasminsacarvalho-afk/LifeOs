import re

with open("src/routes/analytics.tsx", "r") as f:
    content = f.read()

# Define the regex to capture the .map for the settlements
regex = re.compile(r'\{\(c\.company_settlements as any\[\]\)\.map\(s => \(\n.*?</div>\n\s*\)\)}', re.DOTALL)

new_code = """{(c.company_settlements as any[]).map(s => {
                                             const partner = partners.find(p => p.id === s.company_id);
                                             const rate = partner ? partner.commission_rate : 0;
                                             return (
                                             <div key={s.id} className="relative overflow-hidden bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col shadow-2xl hover:bg-black/60 transition-colors group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/20 transition-colors"></div>
                                                <div className="flex items-center justify-between mb-4 relative z-10">
                                                   <span className="font-bold text-sm tracking-tight flex items-center gap-2">
                                                      <Store className="size-3.5 text-primary" /> {s.company_name}
                                                   </span>
                                                   <span className="bg-white/10 border border-white/5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider text-muted-foreground shadow-sm">
                                                      {rate}%
                                                   </span>
                                                </div>
                                                
                                                <div className="mb-4 relative z-10">
                                                   <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1 opacity-70">Faturado</div>
                                                   <div className="text-success font-mono text-2xl font-extrabold tracking-tight">{formatCurrency(Number(s.total || 0))}</div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-[10px] uppercase font-semibold text-muted-foreground relative z-10">
                                                   <div className="bg-white/[0.02] border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center">
                                                      <span className="opacity-60 flex items-center gap-1 mb-1"><Smartphone className="size-3" /> PIX</span>
                                                      <span className="font-mono text-foreground text-xs font-bold">{formatCurrency(Number(s.pix || 0))}</span>
                                                   </div>
                                                   <div className="bg-white/[0.02] border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center">
                                                      <span className="opacity-60 flex items-center gap-1 mb-1"><Wallet className="size-3" /> ESP</span>
                                                      <span className="font-mono text-foreground text-xs font-bold">{formatCurrency(Number(s.dinheiro || 0))}</span>
                                                   </div>
                                                   <div className="bg-white/[0.02] border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center">
                                                      <span className="opacity-60 flex items-center gap-1 mb-1"><CreditCard className="size-3" /> CAR</span>
                                                      <span className="font-mono text-foreground text-xs font-bold">{formatCurrency(Number(s.cartao || 0))}</span>
                                                   </div>
                                                </div>

                                                <div className="flex justify-between items-center bg-gradient-to-r from-danger/10 to-danger/5 border border-danger/20 px-4 py-3 rounded-xl mt-4 relative z-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                                   <span className="text-danger uppercase tracking-wider font-extrabold text-[10px] flex items-center gap-1.5">
                                                      <TrendingUp className="size-3 rotate-180" /> Comissão
                                                   </span>
                                                   <span className="font-mono font-black text-danger text-base tracking-tighter drop-shadow-sm">- {formatCurrency(Number(s.commission || 0))}</span>
                                                </div>
                                             </div>
                                          )})}"""

if regex.search(content):
    content = regex.sub(new_code, content, count=1)
    with open("src/routes/analytics.tsx", "w") as f:
        f.write(content)
    print("Success!")
else:
    print("Regex not found.")
