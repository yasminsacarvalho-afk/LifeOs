import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDailyAnalysesRealtime() {
  const [analyses, setAnalyses] = useState<any[]>([]);

  const fetchAnalyses = async () => {
    const { data, error } = await supabase
      .from('daily_analyses')
      .select('*')
      .order('analysis_date', { ascending: false });

    if (!error && data) {
      setAnalyses(data);
    }
  };

  useEffect(() => {

    fetchAnalyses();

    const channel = supabase
      .channel('daily_analyses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_analyses' }, () => {
        fetchAnalyses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { analyses, refetch: fetchAnalyses };
}
