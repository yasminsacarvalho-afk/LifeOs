import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('pos_studies').select('*').order('created_at', { ascending: false }).limit(2);
  console.log(error ? "Error: " + JSON.stringify(error) : "Data:\n" + JSON.stringify(data, null, 2));
}
run();
