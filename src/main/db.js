const { Client } = require('pg');
const fs = require('fs');
const { app } = require('electron');
const { ENV_FILE } = require('./constants');

let syncStatus = 'offline';
let _mainWindow = null;

function setWindow(win) {
  _mainWindow = win;
}

function sendSyncStatus(status) {
  syncStatus = status;
  if (_mainWindow) _mainWindow.webContents.send('sync-status', status);
}

function getSyncStatus() {
  return syncStatus;
}

function getDefaultNeonUri() {
  const DEV_URL = "postgresql://neondb_owner:npg_N3RPxIUdps2X@ep-noisy-shape-ag2oypy0-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true&channel_binding=require";
  const PROD_URL = "postgresql://neondb_owner:npg_9W6FlpJYxiHM@ep-autumn-tooth-agadal7g-pooler.c-2.eu-central-1.aws.neon.tech/gstock?sslmode=require&channel_binding=require";
  return app.isPackaged ? PROD_URL : DEV_URL;
}

function getCurrentNeonConfig() {
  let disabled = false;
  if (fs.existsSync(ENV_FILE)) {
    try {
      const env = JSON.parse(fs.readFileSync(ENV_FILE, 'utf-8'));
      disabled = !!env.DISABLED;
    } catch (e) { }
  }

  return {
    active: !disabled,
    url: getDefaultNeonUri(),
    environment: app.isPackaged ? 'production' : 'development'
  };
}

function getNeonUri() {
  const config = getCurrentNeonConfig();
  return config.active ? config.url : null;
}

async function initDb(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS produits (id TEXT PRIMARY KEY, ref TEXT, nom TEXT, cat TEXT, sous_categorie TEXT, type TEXT, marque TEXT, emplacement TEXT, qty INTEGER, alerte INTEGER, achat NUMERIC, vente NUMERIC, description TEXT, image TEXT, created_at TIMESTAMP);
    CREATE TABLE IF NOT EXISTS mouvements (id TEXT PRIMARY KEY, date TIMESTAMP, type TEXT, produit_id TEXT, produit_nom TEXT, qty INTEGER, prix NUMERIC, tiers TEXT, note TEXT, annule BOOLEAN, transaction_id TEXT);
    CREATE TABLE IF NOT EXISTS categories (nom TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS vehicules (id TEXT PRIMARY KEY, marque TEXT, modele TEXT, type TEXT, statut TEXT, annee INTEGER, couleur TEXT, chassis TEXT, cylindree INTEGER, qty INTEGER, achat NUMERIC, vente NUMERIC, notes TEXT, image TEXT, created_at TIMESTAMP);
    CREATE TABLE IF NOT EXISTS ventes_vehicules (id TEXT PRIMARY KEY, date TIMESTAMP, vehicule_id TEXT, vehicule_label TEXT, chassis TEXT, type TEXT, qty INTEGER, prix_ref NUMERIC, prix_final NUMERIC, client TEXT, tel TEXT, paiement TEXT, credit_avance NUMERIC, credit_reste NUMERIC, credit_tranches INTEGER, note TEXT, paiements JSONB);
    CREATE TABLE IF NOT EXISTS marques (id TEXT PRIMARY KEY, nom TEXT, emplacements JSONB);
    CREATE TABLE IF NOT EXISTS factures (id TEXT PRIMARY KEY, date TIMESTAMP, client TEXT, total NUMERIC, paiement TEXT, credit_avance NUMERIC, credit_reste NUMERIC, credit_tranches INTEGER, paiements JSONB, note TEXT);
    CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, name TEXT, password TEXT);
    ALTER TABLE vehicules ADD COLUMN IF NOT EXISTS chassis TEXT;
    ALTER TABLE ventes_vehicules ADD COLUMN IF NOT EXISTS chassis TEXT;
  `);
}

async function syncToNeon(uri, data) {
  const client = new Client({ connectionString: uri, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query("SET TIME ZONE 'UTC'"); // Ensure UTC consistency
    await initDb(client);
    await client.query('BEGIN');
    sendSyncStatus('online');

    data = {
      ...data,
      produits: Array.isArray(data.produits) ? data.produits : [],
      mouvements: Array.isArray(data.mouvements) ? data.mouvements : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
      vehicules: Array.isArray(data.vehicules) ? data.vehicules : [],
      ventesVehicules: Array.isArray(data.ventesVehicules) ? data.ventesVehicules : [],
      marques: Array.isArray(data.marques) ? data.marques : [],
      factures: Array.isArray(data.factures) ? data.factures : [],
      admins: Array.isArray(data.admins) ? data.admins : []
    };
    
    // ... products, movements, etc. (using existing logic)
    if (data.produits) {
      for (const p of data.produits) {
        await client.query(`INSERT INTO produits (id, ref, nom, cat, sous_categorie, type, marque, emplacement, qty, alerte, achat, vente, description, image, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO UPDATE SET ref=$2, nom=$3, cat=$4, sous_categorie=$5, type=$6, marque=$7, emplacement=$8, qty=$9, alerte=$10, achat=$11, vente=$12, description=$13, image=$14, created_at=$15`, [p.id, p.ref, p.nom, p.cat, p.sousCategorie, p.type, p.marque, p.emplacement, p.qty, p.alerte, p.achat, p.vente, p.desc, p.image, p.createdAt]);
      }
    }
    if (data.mouvements) {
      for (const m of data.mouvements) {
        await client.query(`INSERT INTO mouvements (id, date, type, produit_id, produit_nom, qty, prix, tiers, note, annule, transaction_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET date=$2, type=$3, produit_id=$4, produit_nom=$5, qty=$6, prix=$7, tiers=$8, note=$9, annule=$10, transaction_id=$11`, [m.id, m.date, m.type, m.produitId, m.produitNom, m.qty, m.prix, m.tiers, m.note, !!m.annule, m.transactionId]);
      }
    }
    if (data.categories) {
       for (const cat of data.categories) {
         await client.query("INSERT INTO categories (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING", [cat]);
       }
    }
    if (data.vehicules) {
      for (const v of data.vehicules) {
        await client.query(`INSERT INTO vehicules (id, marque, modele, type, statut, annee, couleur, chassis, cylindree, qty, achat, vente, notes, image, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO UPDATE SET marque=$2, modele=$3, type=$4, statut=$5, annee=$6, couleur=$7, chassis=$8, cylindree=$9, qty=$10, achat=$11, vente=$12, notes=$13, image=$14, created_at=$15`, [v.id, v.marque, v.modele, v.type, v.statut, v.annee, v.couleur, v.chassis, v.cylindree, v.qty, v.achat, v.vente, v.notes, v.image, v.createdAt]);
      }
    }
    if (data.ventesVehicules) {
      for (const vv of data.ventesVehicules) {
        await client.query(`INSERT INTO ventes_vehicules (id, date, vehicule_id, vehicule_label, chassis, type, qty, prix_ref, prix_final, client, tel, paiement, credit_avance, credit_reste, credit_tranches, note, paiements) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO UPDATE SET date=$2, vehicule_id=$3, vehicule_label=$4, chassis=$5, type=$6, qty=$7, prix_ref=$8, prix_final=$9, client=$10, tel=$11, paiement=$12, credit_avance=$13, credit_reste=$14, credit_tranches=$15, note=$16, paiements=$17`, [vv.id, vv.date, vv.vehiculeId, vv.vehiculeLabel, vv.chassis, vv.type, vv.qty, vv.prixRef, vv.prixFinal, vv.client, vv.tel, vv.paiement, vv.creditAvance, vv.creditReste, vv.creditTranches, vv.note, JSON.stringify(vv.paiements || [])]);
      }
    }
    if (data.marques) {
      for (const mq of data.marques) {
        await client.query(`INSERT INTO marques (id, nom, emplacements) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET nom=$2, emplacements=$3`, [mq.id, mq.nom, JSON.stringify(mq.emplacements || [])]);
      }
    }
    if (data.factures) {
      for (const f of data.factures) {
        await client.query(`INSERT INTO factures (id, date, client, total, paiement, credit_avance, credit_reste, credit_tranches, paiements, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET date=$2, client=$3, total=$4, paiement=$5, credit_avance=$6, credit_reste=$7, credit_tranches=$8, paiements=$9, note=$10`, [f.id, f.date, f.client, f.total, f.paiement, f.creditAvance, f.creditReste, f.creditTranches, JSON.stringify(f.paiements || []), f.note]);
      }
    }

    // MULTI-ADMIN SYNC
    if (data.admins) {
      for (const a of data.admins) {
        await client.query("INSERT INTO admins (id, name, password) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name=$2, password=$3", [String(a.id), a.name, a.password]);
      }
    }
    if (data.managerPassword) {
      await client.query("INSERT INTO app_config (key, value) VALUES ('managerPassword', $1) ON CONFLICT (key) DO UPDATE SET value=$1", [data.managerPassword]);
    }
    // Backward compatibility for old apps
    if (data.adminPassword) {
      await client.query("INSERT INTO app_config (key, value) VALUES ('adminPassword', $1) ON CONFLICT (key) DO UPDATE SET value=$1", [data.adminPassword]);
    }
    if (!data.managerPassword) {
      await client.query("DELETE FROM app_config WHERE key = 'managerPassword'");
    }
    if (!data.adminPassword) {
      await client.query("DELETE FROM app_config WHERE key = 'adminPassword'");
    }

    // PRUNING: Delete records in cloud that are not in the local data
    if (data.produits) {
      const ids = data.produits.map(x => x.id);
      if (ids.length) await client.query(`DELETE FROM produits WHERE id NOT IN (${ids.map((_,i) => '$'+(i+1)).join(',')})`, ids);
      else await client.query(`DELETE FROM produits`);
    }
    if (data.mouvements) {
      const ids = data.mouvements.map(x => x.id);
      if (ids.length) await client.query(`DELETE FROM mouvements WHERE id NOT IN (${ids.map((_,i) => '$'+(i+1)).join(',')})`, ids);
      else await client.query(`DELETE FROM mouvements`);
    }
    if (data.categories) {
      if (data.categories.length) await client.query(`DELETE FROM categories WHERE nom NOT IN (${data.categories.map((_,i) => '$'+(i+1)).join(',')})`, data.categories);
      else await client.query(`DELETE FROM categories`);
    }
    if (data.vehicules) {
      const ids = data.vehicules.map(x => x.id);
      if (ids.length) await client.query(`DELETE FROM vehicules WHERE id NOT IN (${ids.map((_,i) => '$'+(i+1)).join(',')})`, ids);
      else await client.query(`DELETE FROM vehicules`);
    }
    if (data.ventesVehicules) {
      const ids = data.ventesVehicules.map(x => x.id);
      if (ids.length) await client.query(`DELETE FROM ventes_vehicules WHERE id NOT IN (${ids.map((_,i) => '$'+(i+1)).join(',')})`, ids);
      else await client.query(`DELETE FROM ventes_vehicules`);
    }
    if (data.marques) {
      const ids = data.marques.map(x => x.id);
      if (ids.length) await client.query(`DELETE FROM marques WHERE id NOT IN (${ids.map((_,i) => '$'+(i+1)).join(',')})`, ids);
      else await client.query(`DELETE FROM marques`);
    }
    if (data.factures) {
      const ids = data.factures.map(x => x.id);
      if (ids.length) await client.query(`DELETE FROM factures WHERE id NOT IN (${ids.map((_,i) => '$'+(i+1)).join(',')})`, ids);
      else await client.query(`DELETE FROM factures`);
    }
    if (data.admins) {
      const ids = data.admins.map(x => String(x.id));
      if (ids.length) await client.query(`DELETE FROM admins WHERE id NOT IN (${ids.map((_,i) => '$'+(i+1)).join(',')})`, ids);
      else await client.query(`DELETE FROM admins`);
    }

    await client.query('COMMIT');
    await client.end();
  } catch (err) {
    console.error('Sync error:', err.message);
    sendSyncStatus('error');
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      await client.end().catch(() => {});
    }
    throw err;
  }
}

async function checkConnection() {
  const uri = getNeonUri();
  if (!uri) {
    sendSyncStatus('offline');
    return;
  }
  const client = new Client({ connectionString: uri, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query('SELECT 1');
    sendSyncStatus('online');
    await client.end();
  } catch (e) {
    sendSyncStatus('offline');
    if (client) await client.end().catch(() => {});
  }
}

function startHeartbeat() {
  checkConnection(); // Initial check
  setInterval(checkConnection, 10000); // Every 10 seconds
}

module.exports = {
  getNeonUri, getDefaultNeonUri, getCurrentNeonConfig, initDb, syncToNeon, setWindow, sendSyncStatus, getSyncStatus, startHeartbeat, checkConnection
};
