const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const { 
  DATA_DIR, DATA_FILE, ENV_FILE, IMAGES_DIR, BACKUP_DIR, ensureDirs 
} = require('./constants');
const { 
  getNeonUri, getCurrentNeonConfig, initDb, syncToNeon, sendSyncStatus, getSyncStatus, checkConnection 
} = require('./db');
const { generateExcel } = require('./excel');
const CONFLICT_STATE_FILE = path.join(DATA_DIR, 'conflict_state.json');

/**
 * Normalizes data objects to avoid false positive conflicts.
 * Converts Dates to ISO strings, sorts object keys, and sorts arrays by `id`.
 */
function normalizeForComparison(data) {
  if (!data) return null;
  const expectedKeys = [
    'produits', 'mouvements', 'categories', 'vehicules', 
    'ventesVehicules', 'marques', 'factures', 'admins', 'managerPassword'
  ];
  
  const plain = JSON.parse(JSON.stringify(data));
  const result = {};

  for (const key of expectedKeys.sort()) {
    let val = plain[key];
    
    if (key !== 'managerPassword' && !Array.isArray(val)) {
      val = [];
    }
    if (key === 'managerPassword' && val === undefined) {
      val = null;
    }

    if (Array.isArray(val)) {
      val = val.map(item => {
        if (item && typeof item === 'object') {
          const sortedItem = {};
          for (const k of Object.keys(item).sort()) {
            let v = item[k];
            if (v === null || v === undefined) v = "";

            // ID NORMALIZATION: compare ids as strings to avoid false conflicts
            // between local string ids and cloud numeric ids.
            if (/(^id$|Id$|_id$)/.test(k) && v !== "") {
              v = String(v);
            }
            
            // TZ FIX: If it looks like an ISO date string, only compare the YYYY-MM-DD part.
            // This prevents false conflicts due to 1-hour timezone shifts between local and cloud.
            if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
              v = v.substring(0, 10); // Keep only "YYYY-MM-DD"
            }

            if (v === "") continue;
            sortedItem[k] = v;
          }
          return sortedItem;
        }
        return item;
      });
      val.sort((a, b) => {
        const idA = (a && a.id !== undefined) ? String(a.id) : (typeof a === 'string' ? a : JSON.stringify(a));
        const idB = (b && b.id !== undefined) ? String(b.id) : (typeof b === 'string' ? b : JSON.stringify(b));
        return idA.localeCompare(idB);
      });
    }
    result[key] = val;
  }
  return JSON.stringify(result);
}

function hashNormalized(data) {
  return crypto.createHash('sha256').update(normalizeForComparison(data)).digest('hex');
}

function readConflictState() {
  try {
    if (!fs.existsSync(CONFLICT_STATE_FILE)) return null;
    return JSON.parse(fs.readFileSync(CONFLICT_STATE_FILE, 'utf-8'));
  } catch (_) {
    return null;
  }
}

function writeConflictState(state) {
  try {
    ensureDirs();
    fs.writeFileSync(CONFLICT_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing conflict state:', e.message);
  }
}

function registerHandlers(mainWindow) {
  
  // Data Loading
  ipcMain.handle('load-data', async () => {
    try {
      ensureDirs();
      
      // 1. Read local data
      let localData = null;
      let localExists = false;
      if (fs.existsSync(DATA_FILE)) {
        try {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8');
          localData = JSON.parse(raw);
          if (localData && ((localData.produits && localData.produits.length > 0) || (localData.vehicules && localData.vehicules.length > 0))) {
            localExists = true;
          }
        } catch (e) {
          console.error('Error reading local data:', e.message);
        }
      }

      // 2. Fetch cloud data
      let cloudData = null;
      let cloudExists = false;
      const neonUri = getNeonUri();
      if (neonUri) {
        const client = new Client({ connectionString: neonUri, connectionTimeoutMillis: 5000 });
        try {
          await client.connect();
          await initDb(client);
          const p = await client.query("SELECT * FROM produits");
          const v = await client.query("SELECT * FROM vehicules");

          if (p.rowCount > 0 || v.rowCount > 0) {
            const m = await client.query("SELECT * FROM mouvements");
            const c = await client.query("SELECT * FROM categories");
            const vv = await client.query("SELECT * FROM ventes_vehicules");
            const mq = await client.query("SELECT * FROM marques");
            const f = await client.query("SELECT * FROM factures");
            const cfg = await client.query("SELECT * FROM app_config");
            const adm = await client.query("SELECT * FROM admins");

            const parseJSON = (val) => {
              if (typeof val === 'string') {
                try { return JSON.parse(val); } catch(e) { return []; }
              }
              return val || [];
            };

            cloudData = {
              produits: p.rows.map(r => ({
                id: r.id, ref: r.ref, nom: r.nom, cat: r.cat, sousCategorie: r.sous_categorie,
                type: r.type, marque: r.marque, emplacement: r.emplacement, 
                qty: r.qty, alerte: r.alerte, achat: Number(r.achat), vente: Number(r.vente),
                desc: r.description, image: r.image, createdAt: r.created_at
              })),
              mouvements: m.rows.map(r => ({
                id: r.id, date: r.date, type: r.type, produitId: r.produit_id,
                produitNom: r.produit_nom, qty: r.qty, prix: Number(r.prix),
                tiers: r.tiers, note: r.note, annule: !!r.annule, transactionId: r.transaction_id
              })),
              categories: c.rows.map(r => r.nom),
              vehicules: v.rows.map(r => ({
                id: r.id, marque: r.marque, modele: r.modele, type: r.type,
                statut: r.statut, annee: r.annee, couleur: r.couleur,
                chassis: r.chassis, cylindree: r.cylindree,
                qty: r.qty, achat: Number(r.achat), vente: Number(r.vente),
                notes: r.notes, image: r.image, createdAt: r.created_at
              })),
              ventesVehicules: vv.rows.map(r => ({
                id: r.id, date: r.date, vehiculeId: r.vehicule_id, vehiculeLabel: r.vehicule_label,
                chassis: r.chassis,
                type: r.type, qty: r.qty, prixRef: Number(r.prix_ref), prixFinal: Number(r.prix_final),
                client: r.client, tel: r.tel, paiement: r.paiement, 
                creditAvance: Number(r.credit_avance), creditReste: Number(r.credit_reste),
                creditTranches: r.credit_tranches || 0, note: r.note,
                paiements: parseJSON(r.paiements)
              })),
              marques: mq.rows.map(r => ({ id: r.id, nom: r.nom, emplacements: parseJSON(r.emplacements) })),
              factures: f.rows.map(r => ({
                id: r.id, date: r.date, client: r.client, total: Number(r.total),
                paiement: r.paiement, creditAvance: Number(r.credit_avance),
                creditReste: Number(r.credit_reste), creditTranches: r.credit_tranches || 0,
                paiements: parseJSON(r.paiements), note: r.note
              })),
              admins: adm.rows.map(r => ({ id: r.id, name: r.name, password: r.password })),
              managerPassword: cfg.rows.find(r => r.key === 'managerPassword')?.value || null
            };
            cloudExists = true;
          }
          await client.end();
        } catch (err) {
          console.error('Neon load error:', err.message);
          if (client) await client.end().catch(() => {});
        }
      }

      // 3. Logic based on existence
      // A: Both exist -> Check for real differences
      if (localExists && cloudExists) {
        const normLocal = normalizeForComparison(localData);
        const normCloud = normalizeForComparison(cloudData);
        if (normLocal === normCloud) {
          console.log("No data differences detected between local and cloud.");
          return { success: true, data: localData, path: DATA_FILE };
        } else {
          const conflictState = readConflictState();
          const localHash = hashNormalized(localData);

          // If user previously chose local for this same local snapshot, auto-apply local again.
          if (conflictState?.lastResolution === 'local' && conflictState?.localHash === localHash) {
            console.log("Re-applying previously accepted local data and syncing cloud.");
            if (neonUri) {
              try {
                await syncToNeon(neonUri, localData);
              } catch (e) {
                console.error('Auto-sync after previous local choice failed:', e.message);
              }
            }
            return { success: true, data: localData, path: DATA_FILE };
          }

          console.log("Data conflict detected! Opening modal.");
          // Debugging help: find the first difference
          for (let i = 0; i < Math.min(normLocal.length, normCloud.length); i++) {
            if (normLocal[i] !== normCloud[i]) {
              console.log(`First difference at index ${i}: Local='${normLocal.substring(i, i+50)}', Cloud='${normCloud.substring(i, i+50)}'`);
              break;
            }
          }
        }
        return { success: true, path: 'CONFLICT', localData, cloudData };
      }

      // B: Cloud only -> Use cloud, save local
      if (cloudExists && !localExists) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(cloudData, null, 2), 'utf-8');
        return { success: true, data: cloudData, path: 'DB' };
      }

      // C: Local only -> Use local, sync to cloud in background
      if (localExists && !cloudExists) {
        if (neonUri) {
          syncToNeon(neonUri, localData).catch(e => console.error('Initial background sync error:', e.message));
        }
        return { success: true, data: localData, path: DATA_FILE };
      }

      // D: None exist -> Empty start
      return { success: true, data: null, path: DATA_FILE };
    } catch (err) { return { success: false, error: err.message }; }
  });

  // Saving Data
  ipcMain.handle('save-data', async (event, jsonData, options = {}) => {
    try {
      ensureDirs();
      fs.writeFileSync(DATA_FILE, JSON.stringify(jsonData, null, 2), 'utf-8');
      generateExcel(jsonData);

      const neonUri = getNeonUri();
      if (neonUri) {
        if (options.waitForCloud) {
          await syncToNeon(neonUri, jsonData);
          if (options.conflictChoice) {
            writeConflictState({
              lastResolution: options.conflictChoice,
              localHash: hashNormalized(jsonData),
              resolvedAt: new Date().toISOString()
            });
          }
        } else {
          syncToNeon(neonUri, jsonData).catch(e => {
            console.error('Neon sync error:', e.message);
            sendSyncStatus('error');
          });
        }
      } else {
        sendSyncStatus('offline');
        if (options.waitForCloud) {
          return { success: true, path: DATA_FILE, warning: 'Cloud sync is disabled.' };
        }
      }
      return { success: true, path: DATA_FILE };
    } catch (err) { return { success: false, error: err.message }; }
  });

  // Other Handlers
  ipcMain.handle('export-json', async (event, jsonData) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exporter les données',
      defaultPath: path.join(os.homedir(), 'Desktop', 'stockmoto_backup_' + new Date().toISOString().slice(0, 10) + '.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled) return { success: false, canceled: true };
    fs.writeFileSync(result.filePath, JSON.stringify(jsonData, null, 2));
    return { success: true };
  });

  ipcMain.handle('export-csv', async (event, csvData) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exporter CSV',
      defaultPath: path.join(os.homedir(), 'Desktop', 'stockmoto_produits_' + new Date().toISOString().slice(0, 10) + '.csv'),
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    if (result.canceled) return { success: false, canceled: true };
    fs.writeFileSync(result.filePath, csvData, 'utf-8');
    return { success: true };
  });

  ipcMain.handle('import-json', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importer JSON',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled) return { success: false, canceled: true };
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { success: true, data: JSON.parse(raw) };
  });

  ipcMain.handle('import-csv', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importer CSV',
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    if (result.canceled) return { success: false, canceled: true };
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { success: true, data: raw };
  });

  ipcMain.handle('auto-backup', (event, jsonData) => {
    try {
      ensureDirs();
      const today = new Date().toISOString().slice(0, 10);
      const backupFile = path.join(BACKUP_DIR, 'backup_' + today + '.json');
      if (!fs.existsSync(backupFile)) fs.writeFileSync(backupFile, JSON.stringify(jsonData, null, 2), 'utf-8');
      const backups = fs.readdirSync(BACKUP_DIR).sort();
      if (backups.length > 30) fs.unlinkSync(path.join(BACKUP_DIR, backups[0]));
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('get-data-dir', () => DATA_DIR);
  ipcMain.handle('get-data-path', () => DATA_FILE);

  ipcMain.handle('save-image-file', async (event, arrayBuffer, extension) => {
    try {
      ensureDirs();
      const filename = Date.now() + '.' + extension;
      const buf = Buffer.from(arrayBuffer);
      const filePath = path.join(IMAGES_DIR, filename);
      fs.writeFileSync(filePath, buf);
      return { success: true, filename: 'images/' + filename };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('get-sync-status', () => getSyncStatus());
  ipcMain.handle('force-sync-check', async () => {
    await checkConnection();
    return getSyncStatus();
  });
  ipcMain.handle('get-neon-status', () => {
    return getCurrentNeonConfig();
  });

  ipcMain.handle('disable-neon-connection', () => {
    try {
      // Keep the environment-based URL selection, but allow sync to be disabled.
      fs.writeFileSync(ENV_FILE, JSON.stringify({ DISABLED: true }, null, 2));
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('test-neon-connection', async () => {
    let connectionUri = getCurrentNeonConfig().url;
    if (!connectionUri.includes('sslmode=')) {
      connectionUri += connectionUri.includes('?') ? '&' : '?';
      connectionUri += 'sslmode=require&uselibpqcompat=true';
    }
    const client = new Client({ connectionString: connectionUri, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      await initDb(client);
      await client.end();
      fs.writeFileSync(ENV_FILE, JSON.stringify({ DISABLED: false }, null, 2));
      return { success: true };
    } catch (err) {
      if (client) await client.end().catch(() => {});
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('open-data-folder', () => { shell.openPath(DATA_DIR); });
}

module.exports = { registerHandlers };
