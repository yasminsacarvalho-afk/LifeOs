import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PermissionsModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string;
  currentPermissions: string[];
  onSaved: () => void;
}

const AVAILABLE_PERMISSIONS = [
  { id: "view_dashboard", label: "Dashboard (Visão Geral)", category: "Operação" },
  { id: "view_monitor", label: "Monitor de Frotas", category: "Operação" },
  { id: "view_packages", label: "Encomendas", category: "Operação" },
  { id: "view_crm", label: "CRM & Funil", category: "Operação" },
  
  { id: "view_partners", label: "Empresas Parceiras", category: "Gestão" },
  { id: "view_admin", label: "Gestão RH", category: "Gestão" },
  { id: "view_goals", label: "Metas & Ranking", category: "Gestão" },
  { id: "view_info", label: "Contatos e Info", category: "Gestão" },
  
  { id: "view_billing", label: "Vendas", category: "Financeiro" },
  { id: "view_analytics", label: "Análises & Insights", category: "Inteligência" },
  
  { id: "view_financial_values", label: "Ver Valores Financeiros (R$)", category: "Ações e Dados Sensíveis" },
  { id: "delete_records", label: "Excluir Registros do Sistema", category: "Ações e Dados Sensíveis" },
];

export function PermissionsModal({ open, onClose, userId, userName, currentPermissions, onSaved }: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPermissions(currentPermissions || []);
    }
  }, [open, currentPermissions]);

  const togglePermission = (permId: string) => {
    setPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const selectAll = (category: string) => {
    const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    setPermissions(prev => {
      const others = prev.filter(p => !categoryPerms.includes(p));
      return [...others, ...categoryPerms];
    });
  };

  const deselectAll = (category: string) => {
    const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    setPermissions(prev => prev.filter(p => !categoryPerms.includes(p)));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ permissions })
        .eq("user_id", userId);
        
      if (error) throw error;
      
      toast.success("Permissões atualizadas com sucesso!");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar permissões.");
    } finally {
      setSaving(false);
    }
  };

  // Agrupar permissões por categoria
  const categories = Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category)));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="size-5 text-primary" />
            Permissões de Acesso
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configurando acessos para: <strong className="text-foreground">{userName}</strong>
          </p>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {categories.map(category => {
            const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category);
            const allSelected = categoryPerms.every(p => permissions.includes(p.id));
            const someSelected = categoryPerms.some(p => permissions.includes(p.id));
            
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{category}</h4>
                  <button 
                    onClick={() => allSelected ? deselectAll(category) : selectAll(category)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {allSelected ? "Desmarcar todos" : "Marcar todos"}
                  </button>
                </div>
                
                <div className="grid gap-3">
                  {categoryPerms.map(perm => (
                    <label 
                      key={perm.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-medium">{perm.label}</span>
                      <div className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={permissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                        />
                        <span className="pointer-events-none absolute left-0 h-5 w-9 rounded-full bg-input peer-checked:bg-primary peer-focus-visible:ring-2 transition-colors duration-200"></span>
                        <span className="pointer-events-none absolute left-0.5 inline-block h-4 w-4 rounded-full bg-background shadow peer-checked:translate-x-4 peer-checked:bg-primary-foreground transform transition-transform duration-200"></span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-muted hover:bg-muted/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar Permissões
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
