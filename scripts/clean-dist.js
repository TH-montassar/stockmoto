const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const WIN_UNPACKED = path.join(DIST_DIR, 'win-unpacked');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rmWithRetry(target, retries = 5, delayMs = 700) {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
      return true;
    } catch (err) {
      const last = i === retries - 1;
      if (last) {
        console.error(`❌ Unable to remove "${target}". It is likely locked by another process.`);
        console.error('Close any running app instance, Explorer window in dist/, and antivirus scanner, then retry.');
        throw err;
      }
      await sleep(delayMs);
    }
  }
  return false;
}

async function main() {
  await rmWithRetry(WIN_UNPACKED);
  // Remove stale builder config too (safe if absent).
  const effectiveConfig = path.join(DIST_DIR, 'builder-effective-config.yaml');
  if (fs.existsSync(effectiveConfig)) fs.rmSync(effectiveConfig, { force: true });
  console.log('✅ Build output cleaned.');
}

main().catch(() => process.exit(1));
