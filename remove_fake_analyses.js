import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import ws from 'ws';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  console.log("Removendo análises diárias falsas adicionadas...");
  
  const fakeTickets = ["R$ 242,85", "R$ 177,27", "R$ 150,00", "R$ 195,50"];
  
  const { data, error } = await supabase
    .from('daily_analyses')
    .delete()
    .in('ticket_medio', fakeTickets)
    .in('analysis_date', ['2026-06-25', '2026-06-26', '2026-06-27', '2026-06-28']);

  if (error) {
    console.error("Erro ao deletar:", error);
  } else {
    console.log("Sucesso! Análises falsas removidas.");
  }
  process.exit(0);
}

run();
