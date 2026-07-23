const supabaseUrl = 'https://smdwmilwrnnptfqeidtv.supabase.co/rest/v1';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZHdtaWx3cm5ucHRmcWVpZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDI5MzEsImV4cCI6MjA5NTkxODkzMX0.qfqq8g1nmhdO1GCZgYSwxi3lYmTDHrHqsoIAayQmA8o';

async function req(path, method = 'GET', body = null) {
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };
  const res = await fetch(`${supabaseUrl}${path}`, { method, headers });
  return res.json();
}

async function debug() {
  const trips = await req('/trips?select=destination');
  const cityCodes = await req('/city_codes?select=city_name');
  const daily = await req('/daily_analyses?select=top_destinations');

  const allNames = new Set();
  trips.forEach(t => t.destination && allNames.add(t.destination));
  cityCodes.forEach(c => c.city_name && allNames.add(c.city_name));
  daily.forEach(d => {
    if (d.top_destinations) {
      d.top_destinations.forEach(td => td.nome && allNames.add(td.nome));
    }
  });

  const arr = Array.from(allNames).filter(n => 
    n.toUpperCase().includes('ITAPETIN') || 
    n.toUpperCase().includes('VITORIA') || 
    n.toUpperCase().includes('PORTO')
  );

  console.log(JSON.stringify(arr, null, 2));
}

debug();
