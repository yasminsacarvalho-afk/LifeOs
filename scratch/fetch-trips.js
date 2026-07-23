import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/trips?select=code,id,origin,destination';
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    }
  });

  const data = await res.json();
  console.log(data);
}

run();
