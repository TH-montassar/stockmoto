// ===================== EXPORT / IMPORT =====================
async function doExportJSON() {
  const res = await window.electronAPI.exportJSON(data);
  if (res.success) showToast('✅ Exporté: ' + res.path);
  else if (!res.canceled) showToast('❌ Erreur export', 'error');
}

async function doExportCSV() {
  const headers = ['Référence','Désignation','Catégorie','Type','Marque','Quantité','Alerte min','Prix achat','Prix vente','Description'];
  const rows = data.produits.map(p =>
    [p.ref, p.nom, p.cat, p.type, p.marque, p.qty, p.alerte, p.achat, p.vente, p.desc]
      .map(v => '"' + (v || '') + '"').join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const res = await window.electronAPI.exportCSV('\uFEFF' + csv);
  if (res.success) showToast('✅ CSV exporté: ' + res.path);
  else if (!res.canceled) showToast('❌ Erreur export', 'error');
}

async function doImportJSON() {
  const res = await window.electronAPI.importJSON();
  if (res.canceled) return;
  if (!res.success) { showToast('❌ Fichier invalide', 'error'); return; }
  if (!res.data.produits) { showToast('❌ Format JSON invalide', 'error'); return; }
  if (!confirm('⚠️ Remplacer toutes les données actuelles ?')) return;
  data = res.data;
  if (!data.categories) data.categories = ['Moteur','Transmission','Freins','Suspension','Électricité','Carrosserie','Roues / Pneus','Chaîne / Courroie','Filtres','Éclairage','Accessoires Vélo','Autre'];
  save(); renderAll(); showToast('✅ Import réussi ! ' + data.produits.length + ' produits');
}

async function doImportCSV() {
  const res = await window.electronAPI.importCSV();
  if (res.canceled) return;
  if (!res.success) { showToast('❌ Fichier invalide', 'error'); return; }
  if (!res.text) { showToast('❌ Fichier vide', 'error'); return; }

  const lines = res.text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) { showToast('❌ Fichier CSV vide ou invalide', 'error'); return; }

  lines.shift();
  let count = 0;
  for (let line of lines) {
    const match = line.match(/^"(.*)"$/);
    const row = match ? match[1] : line;
    const values = row.split('","');
    if (values.length < 2) continue;
    const r = values[0], n = values[1];
    if (!r || !n) continue;
    let p = data.produits.find(x => x.ref === r);
    if (!p) {
      p = { id: Date.now().toString() + Math.random().toString(36).substring(2), createdAt: new Date().toISOString() };
      data.produits.push(p);
    }
    p.ref = r; p.nom = n; p.cat = values[2] || ''; p.type = values[3] || 'moto'; p.marque = values[4] || '';
    p.qty = parseInt(values[5]) || 0; p.alerte = parseInt(values[6]) || 5;
    p.achat = parseFloat(values[7]) || 0; p.vente = parseFloat(values[8]) || 0;
    p.desc = values[9] || '';
    count++;
  }
  save(); renderAll(); showToast('✅ Import CSV réussi ! ' + count + ' produits ajoutés/mis à jour');
}

function openFolder() { window.electronAPI.openDataFolder(); }

// ===================== NEON SYNC =====================
async function testNeonConnection() {
  const statusEl = document.getElementById('neon-status');
  statusEl.textContent = '⏳ Connexion en cours...';
  statusEl.style.color = 'var(--text2)';
  const res = await window.electronAPI.testNeonConnection();
  if (res.success) {
    statusEl.innerHTML = '✅ <span style="color:#2ecc71">Connecté et activé avec succès !</span>';
    showToast('✅ Cloud activé');
  } else {
    statusEl.innerHTML = '❌ <span style="color:#e74c3c">Erreur : ' + res.error + '</span>';
    showToast('❌ Échec de la connexion', 'error');
  }
}

async function disableNeonConnection() {
  await window.electronAPI.disableNeonConnection();
  const statusEl = document.getElementById('neon-status');
  statusEl.innerHTML = 'ℹ️ <span style="color:var(--text2)">Synchronisation désactivée.</span>';
  showToast('ℹ️ Cloud désactivé');
}

async function checkNeonStatus() {
  const config = await window.electronAPI.getNeonStatus();
  document.getElementById('neon-url').value = config.url || '';

  const environmentEl = document.getElementById('neon-environment');
  if (environmentEl) {
    environmentEl.textContent = config.environment === 'production'
      ? T('URL de production (.exe)', 'رابط الإنتاج (.exe)')
      : T('URL de développement (npm start)', 'رابط التطوير (npm start)');
  }

  if (config.active) {
    // Get actual current connection status
    const currentStatus = await window.electronAPI.getSyncStatus();
    const statusEl = document.getElementById('neon-status');
    if (currentStatus === 'online') {
      statusEl.innerHTML = '✅ <span style="color:#2ecc71">' + T('Synchronisation active', 'المزامنة نشطة') + '</span>';
    } else if (currentStatus === 'error') {
      statusEl.innerHTML = '⚠️ <span style="color:#f1c40f">' + T('Erreur de connexion Cloud', 'خطأ في الاتصال بالسحابة') + '</span>';
    } else {
      statusEl.innerHTML = '❌ <span style="color:#7f8c8d">' + T('Hors-ligne (Local)', 'غير متصل (محلي)') + '</span>';
    }
  } else {
    document.getElementById('neon-status').innerHTML = 'ℹ️ <span style="color:var(--text2)">' + T('Non configuré / Désactivé', 'غير مكون / معطل') + '</span>';
  }
}

function toggleNeonUrlVisibility() {
  const input = document.getElementById('neon-url');
  const icon = document.getElementById('toggle-neon-url-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = '🙈';
  } else {
    input.type = 'password';
    icon.textContent = '👁️';
  }
}
