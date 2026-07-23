require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

async function main() {
  try {
    const payload = {
      analysis_date: '2026-06-26',
      empresa: 'Águia Branca', // Let's just hardcode Águia Branca to match what user likely wants
      top_lines: [
        { nome: 'Serviço 2466', quantidade: '10', valor: '' },
        { nome: 'Serviço 2421', quantidade: '9', valor: '' },
        { nome: 'Serviço 2465', quantidade: '5', valor: '' }
      ],
      top_destinations: [
        { nome: 'Cód 292', quantidade: '12', valor: '' },
        { nome: 'Cód 191', quantidade: '5', valor: '' },
        { nome: 'Cód 340', quantidade: '4', valor: '' }
      ],
      total_vendas: 'R$ 3.822,28',
      volume_vendas: '20',
      ticket_medio: 'R$ 187,75',
      pagamento: 'Cart. Digital (R$ 1.765), Dinheiro (R$ 1.046), Crédito (R$ 732), Débito (R$ 261)',
      taxas: 'Embarque: R$ 30,65 | Seguro: R$ 57,04 | Pedágio: R$ 16,08',
      notes: 'Faturamento Bruto Passagens: R$ 3.755,02 (Líquido: R$ 3.651,25).\\nReceitas Extras: R$ 67,26.\\nTroca/Reemissão (Entrada): R$ 431,36.\\nTroca (Saída): R$ -482,22.',
      updated_at: new Date().toISOString()
    };

    console.log("Inserting via REST API...");

    const response = await fetch(`${supabaseUrl}/rest/v1/daily_analyses`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Error inserting:", result);
      
      // Fallback: If it's a unique constraint violation, update it.
      if (result.code === '23505' || (result.message && result.message.includes('unique constraint'))) {
        console.log("Unique constraint hit! Attempting to update existing record instead.");
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/daily_analyses?analysis_date=eq.2026-06-26`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!updateResponse.ok) {
           console.error("Update failed:", await updateResponse.text());
        } else {
           console.log("Successfully updated existing record for 2026-06-26.");
        }
      }
    } else {
      console.log("Successfully inserted daily analysis.", result);
    }

  } catch (err) {
    console.error("Fatal error:", err);
  }
}

main();
