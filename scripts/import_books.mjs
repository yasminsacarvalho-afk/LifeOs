const SUPABASE_URL = "https://smdwmilwrnnptfqeidtv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZHdtaWx3cm5ucHRmcWVpZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDI5MzEsImV4cCI6MjA5NTkxODkzMX0.qfqq8g1nmhdO1GCZgYSwxi3lYmTDHrHqsoIAayQmA8o";

const books = [
  { author: "Agostinho de Hipona", title: "Confissões", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" },
  { author: "Agostinho de Hipona", title: "A Cidade de Deus", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" },
  { author: "Agostinho de Hipona", title: "Sobre a Trindade", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" },
  { author: "Agostinho de Hipona", title: "Sobre o Livre-Arbítrio", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" },
  { author: "Agostinho de Hipona", title: "Sobre a Doutrina Cristã", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" },
  { author: "Aristóteles", title: "Ética a Nicômaco", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Aristóteles", title: "Política", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Aristóteles", title: "Metafísica", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Aristóteles", title: "Poética", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Aristóteles", title: "Retórica", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Platão", title: "A República", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Platão", title: "O Banquete", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Platão", title: "Fédon", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Platão", title: "Apologia de Sócrates", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Platão", title: "Timeu", knowledge_area: "Filosofia Clássica", status: "quero_ler", format: "fisico" },
  { author: "Tomás de Aquino", title: "Suma Teológica", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" },
  { author: "Tomás de Aquino", title: "Suma Contra os Gentios", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" },
  { author: "Tomás de Aquino", title: "Comentário à Ética a Nicômaco", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" },
  { author: "Tomás de Aquino", title: "Comentário à Metafísica de Aristóteles", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" },
  { author: "Tomás de Aquino", title: "Do Ente e da Essência", knowledge_area: "Filosofia e Teologia", status: "quero_ler", format: "fisico" }
];

async function run() {
  console.log("Starting bulk insert with Google Books metadata fetching...");
  for (const book of books) {
    try {
      const q = encodeURIComponent(`${book.title} ${book.author}`);
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        if (info.imageLinks && info.imageLinks.thumbnail) {
          book.cover_url = info.imageLinks.thumbnail.replace('http:', 'https:');
        }
        if (info.pageCount) {
          book.total_pages = info.pageCount;
        }
      }
    } catch (e) {
      console.error('Failed to fetch cover for', book.title);
    }
    
    // Use raw fetch to avoid websocket issues in Node 20
    const response = await fetch(`${SUPABASE_URL}/rest/v1/pos_library`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(book)
    });

    if (!response.ok) {
       console.error("Error inserting", book.title, await response.text());
    } else {
       console.log("Inserted:", book.title);
    }
  }
  console.log("Finished!");
}

run();
