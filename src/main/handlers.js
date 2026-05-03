const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { 
  DATA_DIR, DATA_FILE, ENV_FILE, IMAGES_DIR, BACKUP_DIR, ensureDirs 
} = require('./constants');
const { 
  getNeonUri, getCurrentNeonConfig, initDb, syncToNeon, sendSyncStatus, getSyncStatus, checkConnection 
} = require('./db');
const { generateExcel } = require('./excel');

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

      // FAST PATH: if local exists, load immediately and sync cloud in background.
      // This avoids long startup delays caused by cloud connection/query latency.
      const neonUri = getNeonUri();
      if (localExists) {
        if (neonUri) {
          syncToNeon(neonUri, localData).catch(e => {
            console.error('Background sync error:', e.message);
            sendSyncStatus('error');
          });
        }
        return { success: true, data: localData, path: DATA_FILE };
      }

      // 2. Fetch cloud data (only when no local data exists)
      let cloudData = null;
      let cloudExists = false;
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

      // 3. Cloud only -> Use cloud, save local
      if (cloudExists && !localExists) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(cloudData, null, 2), 'utf-8');
        return { success: true, data: cloudData, path: 'DB' };
      }

      // 4. None exist -> Empty start
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
