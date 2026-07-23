const fs = require('fs');
const file = '/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/routes/finance.tsx';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

for (let i = 1727; i < 2010; i++) {
  // Replace text-3xl with text-xl xl:text-2xl
  lines[i] = lines[i].replace(/text-3xl/g, 'text-xl xl:text-2xl');
  // Replace p-6 with p-4 2xl:p-5 for the KPI cards
  if (lines[i].includes('rounded-2xl p-6')) {
    lines[i] = lines[i].replace('p-6', 'p-4 2xl:p-5');
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Replacements done!');
