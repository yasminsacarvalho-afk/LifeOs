const fs = require('fs');
const path = require('path');

const directories = ['src'];
const additionalFiles = ['vite.config.ts', 'package.json', 'index.html', 'createAdmin.js'];

const replaceRules = [
  { regex: /Voyage Flow/g, replacement: 'LifeOs' },
  { regex: /voyage flow/g, replacement: 'lifeos' },
  { regex: /VoyageFlow/g, replacement: 'LifeOs' },
  { regex: /voyageflow/g, replacement: 'lifeos' },
  { regex: /Voyage/g, replacement: 'LifeOs' },
  { regex: /voyage/g, replacement: 'lifeos' },
  { regex: /VOYAGE/g, replacement: 'LIFEOS' }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  for (const rule of replaceRules) {
    newContent = newContent.replace(rule.regex, rule.replacement);
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkSync(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile() && /\.(ts|tsx|js|jsx|json|html)$/.test(filepath)) {
      callback(filepath);
    }
  }
}

// Process directories
directories.forEach(dir => {
  walkSync(path.join(process.cwd(), dir), processFile);
});

// Process additional files
additionalFiles.forEach(file => {
  const filepath = path.join(process.cwd(), file);
  if (fs.existsSync(filepath)) {
    processFile(filepath);
  }
});

console.log('Finished replacing Voyage with LifeOs.');
