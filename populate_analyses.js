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
  console.log("Inserindo análises diárias de teste...");
  
  const analyses = [
    {
      analysis_date: "2026-06-25",
      empresa: "Gontijo",
      ticket_medio: "R$ 242,85",
      total_vendas: "R$ 8.500",
      volume_vendas: "35",
      top_lines: [
        { nome: "Vitória x SP 14:00", quantidade: "20", valor: "4000" },
        { nome: "Porto Seguro x SP 18:00", quantidade: "15", valor: "4500" }
      ],
      top_destinations: [
        { nome: "São Paulo", quantidade: "35", valor: "8500" }
      ]
    },
    {
      analysis_date: "2026-06-26",
      empresa: "Águia Branca",
      ticket_medio: "R$ 177,27",
      total_vendas: "R$ 9.750",
      volume_vendas: "55",
      top_lines: [
        { nome: "Vitória x RJ 21:00", quantidade: "25", valor: "3750" },
        { nome: "Eunápolis x SSA 23:00", quantidade: "30", valor: "6000" }
      ],
      top_destinations: [
        { nome: "Rio de Janeiro", quantidade: "25", valor: "3750" },
        { nome: "Salvador", quantidade: "30", valor: "6000" }
      ]
    },
    {
      analysis_date: "2026-06-27",
      empresa: "Gontijo",
      ticket_medio: "R$ 150,00",
      total_vendas: "R$ 6.000",
      volume_vendas: "40",
      top_lines: [
        { nome: "BH x SP 22:00", quantidade: "40", valor: "6000" }
      ],
      top_destinations: [
        { nome: "São Paulo", quantidade: "40", valor: "6000" }
      ]
    },
    {
      analysis_date: "2026-06-28",
      empresa: "Águia Branca",
      ticket_medio: "R$ 195,50",
      total_vendas: "R$ 12.000",
      volume_vendas: "61",
      top_lines: [
        { nome: "SP x RJ 08:00", quantidade: "31", valor: "5500" },
        { nome: "SP x RJ 14:00", quantidade: "30", valor: "6500" }
      ],
      top_destinations: [
        { nome: "Rio de Janeiro", quantidade: "61", valor: "12000" }
      ]
    }
  ];

  const { data, error } = await supabase.from('daily_analyses').insert(analyses);

  if (error) {
    console.error("Erro:", error);
  } else {
    console.log("Sucesso! Análises adicionadas.");
  }
  process.exit(0);
}

run();
