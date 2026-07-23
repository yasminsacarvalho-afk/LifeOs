const supabaseUrl = 'https://smdwmilwrnnptfqeidtv.supabase.co/rest/v1';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZHdtaWx3cm5ucHRmcWVpZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDI5MzEsImV4cCI6MjA5NTkxODkzMX0.qfqq8g1nmhdO1GCZgYSwxi3lYmTDHrHqsoIAayQmA8o';

async function req(path) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  return res.json();
}

async function debug() {
  const sellers = await req('/sellers?select=*');
  const rainam = sellers.find(s => s.name.toUpperCase().includes('RAINAM'));
  if (!rainam) { console.log('Rainam não encontrado'); return; }
  console.log('Rainam:', rainam);

  const shifts = await req(`/shifts?seller_id=eq.${rainam.id}`);
  console.log('Total Shifts:', shifts.length);

  let completas = 0;
  let meias = 0;
  let folgas = 0;
  let faltas = 0;

  shifts.forEach(s => {
    // Only current month? The app says isWithinCalendarMonth. Let's just group by type
    if (s.status === 'falta') faltas++;
    else if (s.shift_type === 'completa') completas++;
    else if (s.shift_type === 'manha' || s.shift_type === 'tarde') meias++;
    else if (s.shift_type === 'folga') folgas++;
  });

  console.log({ completas, meias, folgas, faltas });
}
debug();
