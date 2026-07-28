const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/styles.css');

let content = fs.readFileSync(file, 'utf8');

// Replace all global selectors with .neo-ready scoped selectors
content = content.replace(/\[data-theme='neobrutalism'\] \*/g, "[data-theme='neobrutalism'] .neo-ready *");
content = content.replace(/\[data-theme='neobrutalism'\] \.border/g, "[data-theme='neobrutalism'] .neo-ready .border");
content = content.replace(/\[data-theme='neobrutalism'\] \.shadow/g, "[data-theme='neobrutalism'] .neo-ready .shadow");
content = content.replace(/\[data-theme='neobrutalism'\] th/g, "[data-theme='neobrutalism'] .neo-ready th");
content = content.replace(/\[data-theme='neobrutalism'\] td/g, "[data-theme='neobrutalism'] .neo-ready td");
content = content.replace(/\[data-theme='neobrutalism'\] button/g, "[data-theme='neobrutalism'] .neo-ready button");

fs.writeFileSync(file, content, 'utf8');
console.log('Scoped styles.css');
