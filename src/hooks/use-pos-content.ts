import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface ContentItem {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'channel' | 'podcast';
  status: 'to_consume' | 'consuming' | 'finished';
  platform: 'youtube' | 'spotify' | 'other';
  thumbnail: string;
  addedAt: string;
}

export function usePosContent() {
  const [items, setItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("lifeos_pos_content");
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const saveItems = (newItems: ContentItem[]) => {
    setItems(newItems);
    localStorage.setItem("lifeos_pos_content", JSON.stringify(newItems));
  };

  const addItem = (item: Omit<ContentItem, "id" | "addedAt">) => {
    const newItem: ContentItem = {
      ...item,
      id: Date.now().toString(),
      addedAt: new Date().toISOString()
    };
    saveItems([newItem, ...items]);
    toast.success("Conteúdo adicionado com sucesso!");
  };

  const updateItem = (id: string, updates: Partial<ContentItem>) => {
    saveItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => {
    if (window.confirm("Tem certeza que deseja remover este conteúdo?")) {
      saveItems(items.filter(item => item.id !== id));
      toast.success("Conteúdo removido!");
    }
  };

  const markAsFinished = (id: string) => {
    updateItem(id, { status: 'finished' });
    toast.success("Conteúdo marcado como concluído!");
  };

  return {
    items,
    addItem,
    updateItem,
    removeItem,
    markAsFinished
  };
}
