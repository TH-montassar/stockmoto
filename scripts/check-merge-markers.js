const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'main.js', 'preload.js'];
const MARKERS = ['<<<<<<<', '=======', '>>>>>>>'];

function walk(target, out) {
  const fullPath = path.join(ROOT, target);
  if (!fs.existsSync(fullPath)) return;
  const stat = fs.statSync(fullPath);

  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(fullPath)) {
      walk(path.join(target, entry), out);
    }
    return;
  }

  if (!/\.(js|json|html|css|md)$/i.test(fullPath)) return;
  out.push(target);
}

const files = [];
for (const target of SCAN_DIRS) walk(target, files);

const problems = [];
for (const relFile of files) {
  const content = fs.readFileSync(path.join(ROOT, relFile), 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (MARKERS.some(marker => line.trimStart().startsWith(marker))) {
      problems.push(`${relFile}:${idx + 1} -> ${line.trim()}`);
    }
  });
}

if (problems.length) {
  console.error('Merge conflict markers detected:');
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}

console.log('No merge conflict markers found.');
