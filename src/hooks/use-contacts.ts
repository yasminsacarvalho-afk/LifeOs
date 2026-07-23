import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyContact {
  id: string;
  created_at: string;
  name: string;
  role: string;
  agency_company: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  notes: string | null;
}

export function useContactsRealtime() {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();

    const channel = supabase
      .channel('company-contacts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_contacts' },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_contacts')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        if (error.code !== '42P01') {
           console.error('Error fetching contacts:', error);
        }
        return;
      }

      setContacts(data as CompanyContact[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, loading, refetch: fetchContacts };
}
