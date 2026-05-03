/**
 * bump-version.js
 * Auto-increments the patch version in package.json before every build.
 * Run automatically via the "prebuild" npm script.
 * 
 * Example: 1.0.0 → 1.0.1 → 1.0.2 → ...
 */

const fs   = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg     = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Split semantic version and increment patch
const [major, minor, patch] = pkg.version.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

pkg.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log(`\n🚀 StockMoto version bumped: ${major}.${minor}.${patch} → ${newVersion}\n`);
