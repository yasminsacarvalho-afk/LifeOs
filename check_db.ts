import { supabase } from './src/integrations/supabase/client';

async function run() {
  const { data, error } = await supabase.from('daily_analyses').select('*').limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
