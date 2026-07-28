const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  path.join(__dirname, '../src/routes/_authenticated/admin.akademik.tsx'),
  path.join(__dirname, '../src/routes/_authenticated/admin.akademik.index.tsx'),
  path.join(__dirname, '../src/routes/_authenticated/admin.akademik.mata-kuliah.tsx'),
  path.join(__dirname, '../src/routes/_authenticated/admin.akademik.semester.tsx'),
  path.join(__dirname, '../src/routes/_authenticated/admin.akademik.tahun-akademik.tsx'),
  path.join(__dirname, '../src/routes/_authenticated/admin.users.tsx'),
  path.join(__dirname, '../src/routes/_authenticated/admin.users.roles.tsx')
];

function replaceBrutalistClasses(content) {
  let newContent = content;
  
  // Replace borders
  newContent = newContent.replace(/border-4 border-black/g, 'border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)]');
  newContent = newContent.replace(/border-r-4 border-black/g, 'border-r-[length:var(--neo-border-width)] border-r-[color:var(--neo-border-color)]');
  newContent = newContent.replace(/border-b-4 border-black/g, 'border-b-[length:var(--neo-border-width)] border-b-[color:var(--neo-border-color)]');
  newContent = newContent.replace(/border-2 border-black/g, 'border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)]');
  
  // Replace shadows
  newContent = newContent.replace(/shadow-\[12px_0_0_0_rgba\(0,0,0,1\)\]/g, 'shadow-[var(--neo-shadow)]');
  newContent = newContent.replace(/shadow-\[8px_8px_0_0_rgba\(0,0,0,1\)\]/g, 'shadow-[var(--neo-shadow)]');
  newContent = newContent.replace(/shadow-\[6px_6px_0_0_rgba\(0,0,0,1\)\]/g, 'shadow-[var(--neo-shadow)]');
  newContent = newContent.replace(/shadow-\[4px_4px_0_0_rgba\(0,0,0,1\)\]/g, 'shadow-[var(--neo-shadow)]');
  newContent = newContent.replace(/shadow-\[3px_3px_0_0_rgba\(0,0,0,1\)\]/g, 'shadow-[var(--neo-shadow)]');
  newContent = newContent.replace(/shadow-\[2px_2px_0_0_rgba\(0,0,0,1\)\]/g, 'shadow-[var(--neo-shadow)]');
  
  // Replace radiuses
  newContent = newContent.replace(/rounded-none/g, 'rounded-[var(--neo-radius)]');
  
  // Colors (bg-yellow-400 -> bg-theme)
  newContent = newContent.replace(/bg-yellow-400/g, 'bg-[color:var(--neo-bg)]');
  newContent = newContent.replace(/bg-\[#a3e635\]/g, 'bg-[color:var(--neo-accent)]');
  newContent = newContent.replace(/hover:bg-yellow-400/g, 'hover:bg-[color:var(--neo-bg)]');
  newContent = newContent.replace(/hover:bg-\[#a3e635\]/g, 'hover:bg-[color:var(--neo-accent)]');
  
  // Fonts and text
  newContent = newContent.replace(/text-black/g, 'text-[color:var(--neo-text)]');
  
  return newContent;
}

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const updated = replaceBrutalistClasses(content);
    fs.writeFileSync(file, updated, 'utf8');
    console.log('Updated ' + path.basename(file));
  } else {
    console.log('Not found: ' + file);
  }
});
