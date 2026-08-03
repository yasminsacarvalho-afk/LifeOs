const books = [{ pages_read: 100 }, { pages_read: 50 }, undefined];
try {
  console.log(books.reduce((prev, current) => (prev.pages_read > current.pages_read) ? prev : current));
} catch(e) { console.log("ERROR 1:", e.message); }

const books2 = [{ pages_read: 100 }, { pages_read: 50 }];
try {
  console.log(books2.reduce((prev, current) => (prev.pages_read > current.pages_read) ? prev : current));
} catch(e) { console.log("ERROR 2:", e.message); }
