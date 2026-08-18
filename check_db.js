import fs from 'fs';
import path from 'path';

const envPath = path.resolve('/home/bruno-abreu/RapiHub/voyage-flow-dashboard/.env');
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrlMatch = env.match(/VITE_SUPABASE_URL="(.*)"/);
const supabaseAnonKeyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);

const supabaseUrl = supabaseUrlMatch[1];
const supabaseAnonKey = supabaseAnonKeyMatch[1];

async function check() {
  const res = await fetch(`${supabaseUrl}/rest/v1/pos_library?select=id,type&limit=5`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
check();
