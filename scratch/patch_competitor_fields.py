import re

# 1. Update growth.tsx
with open("src/routes/growth.tsx", "r") as f:
    growth_content = f.read()

type_def = """interface CompetitorPrice {
  id: string;
  competitor: string;
  service: string;
  competitorPrice: number;
  ourPrice: number;
  difference: number;
  notes: string;
  lastChecked: string;
  customFields?: Record<string, string>;
}"""

growth_content = re.sub(
    r'interface CompetitorPrice \{[^}]+\}',
    type_def,
    growth_content
)

# Update the table column
if '<th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Campos Personalizados</th>' not in growth_content:
    growth_content = growth_content.replace(
        '<th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Notas (Diferenciais)</th>',
        '<th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Notas (Diferenciais)</th>\n                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Campos Personalizados</th>'
    )

custom_fields_td = """                        <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate" title={price.notes}>
                          {price.notes}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {price.customFields && Object.entries(price.customFields).map(([k, v]) => (
                             <div key={k} className="flex gap-1"><span className="font-bold">{k}:</span> <span>{v}</span></div>
                          ))}
                        </td>"""

growth_content = re.sub(
    r'<td className="p-4 text-sm text-muted-foreground max-w-\[200px\] truncate" title=\{price\.notes\}>\s*\{price\.notes\}\s*<\/td>',
    custom_fields_td,
    growth_content
)

with open("src/routes/growth.tsx", "w") as f:
    f.write(growth_content)

# 2. Update Modal
with open("src/components/CompetitorPriceFormModal.tsx", "r") as f:
    modal_content = f.read()

modal_content = re.sub(
    r'interface CompetitorPrice \{[^}]+\}',
    type_def,
    modal_content
)

modal_state = """  const [formData, setFormData] = useState({
    competitor: "",
    service: "",
    competitorPrice: 0,
    ourPrice: 0,
    notes: "",
  });
  
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([]);"""

modal_content = re.sub(
    r'  const \[formData, setFormData\] = useState\(\{[\s\S]+?\}\);',
    modal_state,
    modal_content
)

modal_effect = """  useEffect(() => {
    if (initialData) {
      setFormData({
        competitor: initialData.competitor,
        service: initialData.service,
        competitorPrice: initialData.competitorPrice,
        ourPrice: initialData.ourPrice,
        notes: initialData.notes,
      });
      if (initialData.customFields) {
        setCustomFields(Object.entries(initialData.customFields).map(([k, v]) => ({ key: k, value: v })));
      } else {
        setCustomFields([]);
      }
    } else {
      setFormData({
        competitor: "",
        service: "",
        competitorPrice: 0,
        ourPrice: 0,
        notes: "",
      });
      setCustomFields([]);
    }
  }, [initialData, isOpen]);"""

modal_content = re.sub(
    r'  useEffect\(\(\) => \{[\s\S]+?\}, \[initialData, isOpen\]\);',
    modal_effect,
    modal_content
)

modal_submit = """  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fieldsRecord: Record<string, string> = {};
    customFields.forEach(f => {
      if (f.key.trim()) fieldsRecord[f.key.trim()] = f.value;
    });
    onSave({ ...formData, customFields: fieldsRecord });
  };"""

modal_content = re.sub(
    r'  const handleSubmit = \(e: React\.FormEvent\) => \{[\s\S]+?\};',
    modal_submit,
    modal_content
)

custom_fields_ui = """            <div className="space-y-2">
              <label className="text-sm font-semibold">Notas e Diferenciais</label>
              <textarea
                rows={3}
                placeholder="Ex: Eles não servem lanche. Nós servimos."
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            
            <div className="space-y-3 pt-2 border-t border-border">
               <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-primary">Campos Personalizados</label>
                  <button type="button" onClick={() => setCustomFields([...customFields, {key: '', value: ''}])} className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded hover:bg-primary/20">+ Adicionar Campo</button>
               </div>
               {customFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                     <input type="text" placeholder="Nome do Campo (ex: Banheiro?)" className="w-1/2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" value={field.key} onChange={e => { const newF = [...customFields]; newF[idx].key = e.target.value; setCustomFields(newF); }} />
                     <input type="text" placeholder="Valor (ex: Sim)" className="w-1/2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" value={field.value} onChange={e => { const newF = [...customFields]; newF[idx].value = e.target.value; setCustomFields(newF); }} />
                     <button type="button" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))} className="text-danger hover:text-danger/80"><X className="size-4"/></button>
                  </div>
               ))}
            </div>"""

modal_content = re.sub(
    r'            <div className="space-y-2">\s*<label className="text-sm font-semibold">Notas e Diferenciais</label>\s*<textarea[\s\S]+?/>\s*</div>',
    custom_fields_ui,
    modal_content
)

with open("src/components/CompetitorPriceFormModal.tsx", "w") as f:
    f.write(modal_content)

print("Patch custom fields complete")
