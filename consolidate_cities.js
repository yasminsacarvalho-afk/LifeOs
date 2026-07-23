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
  global: { fetch: fetch }, // Provide fetch just in case
  realtime: {
     transport: ws
  }
});

async function run() {
  console.log("Buscando dicionário de cidades...");
  const { data: cityCodes, error } = await supabase.from('city_codes').select('*');
  
  if (error) {
    console.error("Erro ao buscar cidades:", error);
    process.exit(1);
  }

  const toDelete = new Set();
  const keptCities = new Map(); // key -> cityCode object
  const keptCodes = new Map();

function normalizeString(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

  for (const c of cityCodes) {
    const normalizedName = normalizeString(c.city_name);
    const normalizedCode = normalizeString(c.code);

    // Check if we already have this city_name
    if (keptCities.has(normalizedName)) {
      toDelete.add(c.id);
      continue;
    }
    
    // Check if we already have this code
    if (keptCodes.has(normalizedCode)) {
      toDelete.add(c.id);
      continue;
    }

    // If it's unique so far, keep it
    keptCities.set(normalizedName, c);
    keptCodes.set(normalizedCode, c);
  }

  const deleteIds = Array.from(toDelete);
  console.log(`Encontradas ${deleteIds.length} duplicidades de cidade ou código.`);

  if (deleteIds.length > 0) {
    // Delete in chunks to avoid URL too long issues if many
    const chunkSize = 100;
    for (let i = 0; i < deleteIds.length; i += chunkSize) {
      const chunk = deleteIds.slice(i, i + chunkSize);
      const { error: delError } = await supabase.from('city_codes').delete().in('id', chunk);
      if (delError) {
        console.error("Erro ao deletar chunk:", delError);
      }
    }
    console.log("Duplicidades consolidadas com sucesso!");
  } else {
    console.log("Nenhuma duplicidade encontrada.");
  }
  
  process.exit(0);
}

run();
