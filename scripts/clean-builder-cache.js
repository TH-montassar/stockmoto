const fs = require('fs');
const path = require('path');
const os = require('os');

function rmDirSafe(target) {
  try {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`🧹 Removed: ${target}`);
      return true;
    }
  } catch (e) {
    console.warn(`⚠️ Could not remove ${target}: ${e.message}`);
  }
  return false;
}

function getBuilderCachePaths() {
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || '';

  return [
    path.join(home, '.cache', 'electron-builder'),
    path.join(home, '.cache', 'electron'),
    localAppData ? path.join(localAppData, 'electron-builder', 'Cache') : null,
    localAppData ? path.join(localAppData, 'electron', 'Cache') : null,
  ].filter(Boolean);
}

const removedAny = getBuilderCachePaths().some(rmDirSafe);
if (!removedAny) {
  console.log('ℹ️ No Electron/Electron-builder cache directory found to clean.');
}
