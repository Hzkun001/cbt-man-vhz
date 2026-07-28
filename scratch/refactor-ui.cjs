const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  path.join(__dirname, '../src/components/ui/card.tsx'),
  path.join(__dirname, '../src/components/ui/button.tsx'),
  path.join(__dirname, '../src/components/ui/input.tsx')
];

function convertToNeo(content) {
  let newContent = content;
  
  // Replace backgrounds
  newContent = newContent.replace(/bg-card/g, 'bg-[color:var(--neo-bg)]');
  newContent = newContent.replace(/bg-background/g, 'bg-[color:var(--neo-bg)]');
  
  // Replace borders
  newContent = newContent.replace(/border /g, 'border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] ');
  newContent = newContent.replace(/border"/g, 'border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)]"');
  newContent = newContent.replace(/border-input/g, 'border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)]');
  
  // Replace rounded
  newContent = newContent.replace(/rounded-xl/g, 'rounded-[var(--neo-radius)]');
  newContent = newContent.replace(/rounded-md/g, 'rounded-[var(--neo-radius)]');
  
  // Replace shadows
  newContent = newContent.replace(/shadow-sm/g, 'shadow-[var(--neo-shadow)]');
  newContent = newContent.replace(/shadow /g, 'shadow-[var(--neo-shadow)] ');
  newContent = newContent.replace(/shadow"/g, 'shadow-[var(--neo-shadow)]"');
  
  return newContent;
}

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const updated = convertToNeo(content);
    if(content !== updated) {
      fs.writeFileSync(file, updated, 'utf8');
      console.log('Updated ' + path.basename(file));
    }
  } else {
    console.log('Not found: ' + file);
  }
});
