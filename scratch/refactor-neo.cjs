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

function convertToNeo(content) {
  let newContent = content;
  
  // Replace backgrounds
  newContent = newContent.replace(/bg-white/g, 'bg-[color:var(--neo-bg)]');
  newContent = newContent.replace(/bg-slate-50/g, 'bg-[color:var(--neo-bg)]');
  newContent = newContent.replace(/bg-slate-100/g, 'bg-[color:var(--neo-accent)]');
  newContent = newContent.replace(/hover:bg-slate-50/g, 'hover:bg-[color:var(--neo-bg)]');
  newContent = newContent.replace(/hover:bg-slate-100/g, 'hover:bg-[color:var(--neo-accent)]');
  
  // Replace borders
  newContent = newContent.replace(/border-slate-200/g, 'border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)]');
  newContent = newContent.replace(/border-slate-300/g, 'border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)]');
  newContent = newContent.replace(/border-border/g, 'border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)]');
  
  // Replace rounded
  newContent = newContent.replace(/rounded-md/g, 'rounded-[var(--neo-radius)]');
  newContent = newContent.replace(/rounded-lg/g, 'rounded-[var(--neo-radius)]');
  newContent = newContent.replace(/rounded-xl/g, 'rounded-[var(--neo-radius)]');
  newContent = newContent.replace(/rounded-2xl/g, 'rounded-[var(--neo-radius)]');
  
  // Replace shadows
  newContent = newContent.replace(/shadow-sm/g, 'shadow-[var(--neo-shadow)]');
  newContent = newContent.replace(/shadow-md/g, 'shadow-[var(--neo-shadow)]');
  newContent = newContent.replace(/shadow /g, 'shadow-[var(--neo-shadow)] ');
  newContent = newContent.replace(/shadow"/g, 'shadow-[var(--neo-shadow)]"');
  
  // Replace text colors
  newContent = newContent.replace(/text-slate-900/g, 'text-[color:var(--neo-text)]');
  newContent = newContent.replace(/text-slate-800/g, 'text-[color:var(--neo-text)]');
  
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
