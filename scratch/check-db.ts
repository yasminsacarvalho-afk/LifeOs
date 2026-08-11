import { supabase } from "../src/integrations/supabase/client";

async function run() {
  const { data, error } = await supabase.from('pos_studies').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data keys:", data ? Object.keys(data[0] || {}) : "No data");
}
run();
