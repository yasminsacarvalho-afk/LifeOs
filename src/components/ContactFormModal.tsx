import { useState, useEffect } from "react";
import { X, Save, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CompanyContact } from "@/hooks/use-contacts";

interface Props {
  contact: CompanyContact | null;
  open: boolean;
  onClose: () => void;
}

export function ContactFormModal({ contact, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [agencyCompany, setAgencyCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setRole(contact.role);
      setAgencyCompany(contact.agency_company || "");
      setPhone(contact.phone || "");
      setEmail(contact.email || "");
      setTags(contact.tags || []);
      setNotes(contact.notes || "");
    } else {
      setName("");
      setRole("");
      setAgencyCompany("");
      setPhone("");
      setEmail("");
      setTags([]);
      setTagInput("");
      setNotes("");
    }
  }, [contact, open]);

  if (!open) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(',', '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      role,
      agency_company: agencyCompany || null,
      phone: phone || null,
      email: email || null,
      tags,
      notes: notes || null,
    };

    try {
      toast.loading("Salvando contato...", { id: "contact-save" });

      if (contact) {
        const { error } = await supabase.from("company_contacts").update(payload).eq("id", contact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_contacts").insert([payload]);
        if (error) throw error;
      }

      toast.success("Contato salvo com sucesso!", { id: "contact-save" });
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === '42P01') {
        toast.error("Tabela company_contacts não existe. Execute o SQL no Supabase.", { id: "contact-save" });
      } else {
        toast.error("Erro ao salvar contato.", { id: "contact-save" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6 max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {contact ? "Editar Contato" : "Novo Contato"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Contato <span className="text-danger">*</span></label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Silva"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cargo / Função <span className="text-danger">*</span></label>
              <input
                required
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Gerente de Frota"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa / Agência</label>
              <input
                type="text"
                value={agencyCompany}
                onChange={(e) => setAgencyCompany(e.target.value)}
                placeholder="Ex: Viação X"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@email.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <TagIcon className="size-4 text-muted-foreground" />
              Etiquetas (Tags)
            </label>
            <div className="p-3 rounded-md border border-border bg-background/50 focus-within:border-primary focus-within:bg-background transition-colors min-h-[50px]">
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-primary/20 text-primary border border-primary/30">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? "Digite uma etiqueta e aperte Enter..." : "Adicionar mais..."}
                className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Pressione Enter ou vírgula para adicionar a etiqueta.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observações Adicionais</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações extras, horários de plantão, etc..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-primary/20"
            >
              <Save className="size-4" />
              {loading ? "Salvando..." : "Salvar Contato"}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
