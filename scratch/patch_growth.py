import re

with open("src/routes/growth.tsx", "r") as f:
    content = f.read()

# 1. Imports
imports = """import { GrowthTestFormModal } from "@/components/GrowthTestFormModal";
import { CompetitorPriceFormModal } from "@/components/CompetitorPriceFormModal";
import { Pencil, Trash2 } from "lucide-react";"""

if "GrowthTestFormModal" not in content:
    content = content.replace(
        'import { cn } from "@/lib/utils";',
        'import { cn } from "@/lib/utils";\n' + imports
    )

# 2. Add State and Handlers
state_and_handlers = """
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<GrowthTest | null>(null);

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<CompetitorPrice | null>(null);

  const handleSaveTest = (data: Omit<GrowthTest, "id" | "cpc" | "startDate">) => {
    if (editingTest) {
      setTests(tests.map(t => t.id === editingTest.id ? { ...t, ...data, cpc: data.sales > 0 ? data.spent / data.sales : 0 } : t));
    } else {
      setTests([...tests, { 
        ...data, 
        id: generateId(), 
        cpc: data.sales > 0 ? data.spent / data.sales : 0, 
        startDate: new Date().toISOString() 
      }]);
    }
    setIsTestModalOpen(false);
    setEditingTest(null);
  };

  const handleDeleteTest = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este teste?")) {
      setTests(tests.filter(t => t.id !== id));
    }
  };

  const handleSavePrice = (data: Omit<CompetitorPrice, "id" | "difference" | "lastChecked">) => {
    const diff = data.ourPrice - data.competitorPrice;
    if (editingPrice) {
      setPrices(prices.map(p => p.id === editingPrice.id ? { ...p, ...data, difference: diff, lastChecked: new Date().toISOString() } : p));
    } else {
      setPrices([...prices, { 
        ...data, 
        id: generateId(), 
        difference: diff,
        lastChecked: new Date().toISOString() 
      }]);
    }
    setIsPriceModalOpen(false);
    setEditingPrice(null);
  };

  const handleDeletePrice = (id: string) => {
    if (confirm("Tem certeza que deseja remover este monitoramento?")) {
      setPrices(prices.filter(p => p.id !== id));
    }
  };
"""

if "const [isTestModalOpen" not in content:
    content = content.replace(
        '  // Derived Metrics',
        state_and_handlers + '\n  // Derived Metrics'
    )

# 3. Update "Novo Teste" button
content = content.replace(
    '<button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">',
    '<button onClick={() => { setEditingTest(null); setIsTestModalOpen(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">'
)

# 4. Update Test Card with Edit/Delete buttons
test_actions = """
                        <span className="text-xs text-muted-foreground">Investimento Max: {formatCurrency(test.budget)}</span>
                      </div>
                      <div className="absolute top-0 right-0 flex items-center gap-2">
                        <button onClick={() => { setEditingTest(test); setIsTestModalOpen(true); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-4" /></button>
                        <button onClick={() => handleDeleteTest(test.id)} className="p-2 bg-danger/10 hover:bg-danger/20 rounded-lg text-danger transition-colors"><Trash2 className="size-4" /></button>
                      </div>
"""
content = re.sub(r'<span className="text-xs text-muted-foreground">Investimento Max: \{formatCurrency\(test\.budget\)\}<\/span>\s*<\/div>', test_actions, content)

# 5. Update "Adicionar Concorrente" button
content = content.replace(
    '<button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">\n                <Plus className="size-4" /> Adicionar Concorrente\n              </button>',
    '<button onClick={() => { setEditingPrice(null); setIsPriceModalOpen(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">\n                <Plus className="size-4" /> Adicionar Concorrente\n              </button>'
)

# 6. Add Actions Column to Competitor Table
if '<th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Ações</th>' not in content:
    content = content.replace(
        '<th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Notas (Diferenciais)</th>',
        '<th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Notas (Diferenciais)</th>\n                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Ações</th>'
    )

price_actions = """
                        <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate" title={price.notes}>
                          {price.notes}
                        </td>
                        <td className="p-4">
                           <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => { setEditingPrice(price); setIsPriceModalOpen(true); }} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-3.5" /></button>
                             <button onClick={() => handleDeletePrice(price.id)} className="p-1.5 bg-danger/10 hover:bg-danger/20 rounded-md text-danger transition-colors"><Trash2 className="size-3.5" /></button>
                           </div>
                        </td>
"""
content = re.sub(
    r'<td className="p-4 text-sm text-muted-foreground max-w-\[200px\] truncate" title=\{price\.notes\}>\s*\{price\.notes\}\s*<\/td>',
    price_actions, content
)

# 7. Render Modals at the end
modals = """
      <GrowthTestFormModal 
        isOpen={isTestModalOpen}
        onClose={() => { setIsTestModalOpen(false); setEditingTest(null); }}
        onSave={handleSaveTest}
        initialData={editingTest}
      />
      <CompetitorPriceFormModal 
        isOpen={isPriceModalOpen}
        onClose={() => { setIsPriceModalOpen(false); setEditingPrice(null); }}
        onSave={handleSavePrice}
        initialData={editingPrice}
      />
    </>
"""
content = content.replace('    </>\n  );\n}', modals + '  );\n}')

with open("src/routes/growth.tsx", "w") as f:
    f.write(content)
print("Growth CRUD added")
