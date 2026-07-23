const supabaseUrl = 'https://smdwmilwrnnptfqeidtv.supabase.co/rest/v1';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZHdtaWx3cm5ucHRmcWVpZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDI5MzEsImV4cCI6MjA5NTkxODkzMX0.qfqq8g1nmhdO1GCZgYSwxi3lYmTDHrHqsoIAayQmA8o';

async function req(path, method = 'GET', body = null) {
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };
  if (method === 'POST') headers['Prefer'] = 'return=minimal';
  
  const res = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!res.ok) throw new Error(await res.text());
  if (method === 'GET') return res.json();
  return null;
}

async function sync() {
  try {
    const trips = await req('/trips?select=origin,origin_code,destination,destination_code');
    const codes = await req('/city_codes?select=city_name,code');

    const existingCodes = new Set((codes || []).map(c => c.code.toUpperCase()));
    const existingNames = new Set((codes || []).map(c => c.city_name.toUpperCase()));

    const toInsert = new Map();

    for (const t of (trips || [])) {
      if (t.origin && t.origin_code) {
        const c = t.origin_code.trim().toUpperCase();
        const n = t.origin.trim();
        if (!existingCodes.has(c) && !existingNames.has(n.toUpperCase())) {
          toInsert.set(c, { city_name: n, code: c });
        }
      }
      if (t.destination && t.destination_code) {
        const c = t.destination_code.trim().toUpperCase();
        const n = t.destination.trim();
        if (!existingCodes.has(c) && !existingNames.has(n.toUpperCase())) {
          toInsert.set(c, { city_name: n, code: c });
        }
      }
    }

    const inserts = Array.from(toInsert.values());
    if (inserts.length > 0) {
      console.log(`Inserting ${inserts.length} cities...`);
      await req('/city_codes', 'POST', inserts);
      console.log('Successfully inserted cities.');
    } else {
      console.log('No new cities to insert.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

sync();
