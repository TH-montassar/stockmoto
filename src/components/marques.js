// ===================== MARQUES =====================

function renderMarques() {
  if (!data.marques) data.marques = [];
  const container = document.getElementById('marques-list');
  if (!container) return;

  if (!data.marques.length) {
    container.innerHTML = `<div class="card" style="padding:32px;text-align:center;color:var(--text2)">
      <div style="font-size:32px;margin-bottom:8px">🏷️</div>
      ${T('Aucune marque. Ajoutez votre première marque ci-dessus.', 'لا توجد ماركات. أضف أول ماركة أعلاه.')}
    </div>`;
    return;
  }

  container.innerHTML = data.marques.map(m => {
    const prodCount = (data.produits || []).filter(p => p.marque === m.nom).length;
    const emps = m.emplacements || [];
    return `<div class="card" style="padding:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <span style="font-size:16px;font-weight:700">🏷️ ${m.nom}</span>
          <span class="badge badge-blue" style="margin-inline-start:10px">${prodCount} ${T('produits','منتجات')}</span>
        </div>
        <button class="btn btn-sm btn-red" onclick="deleteMarque('${m.id}')">❌ ${T('Supprimer','حذف')}</button>
      </div>

      <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">
        📍 ${T('Emplacements physiques','المواضع المادية')}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        ${emps.map(e => `
          <span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-weight:600;font-size:13px">
            ${e}
            <button onclick="removeEmplacement('${m.id}','${e}')" style="background:none;border:none;cursor:pointer;color:var(--text2);font-size:12px;padding:0 0 0 4px">✕</button>
          </span>`).join('')}
        <div style="display:flex;gap:6px;align-items:center">
          <select id="emp-select-${m.id}" style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:13px;width:60px">
            ${generateEmplacementOptions(emps)}
          </select>
          <button class="btn btn-sm btn-ghost" onclick="addEmplacement('${m.id}')">+ ${T('Ajouter','إضافة')}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function generateEmplacementOptions(existing) {
  const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return all
    .filter(l => !existing.includes(l))
    .map(l => `<option value="${l}">${l}</option>`)
    .join('');
}

function openAddMarque() {
  const nom = document.getElementById('new-marque-input').value.trim();
  if (!nom) { showToast('⚠️ ' + T('Veuillez saisir un nom de marque', 'يرجى إدخال اسم الماركة'), 'error'); return; }
  if (!data.marques) data.marques = [];
  if (data.marques.find(m => m.nom.toLowerCase() === nom.toLowerCase())) {
    showToast('⚠️ ' + T('Marque déjà existante', 'الماركة موجودة مسبقاً'), 'error'); return;
  }
  data.marques.push({ id: Date.now().toString(), nom, emplacements: [] });
  document.getElementById('new-marque-input').value = '';
  save(); renderMarques(); renderProduits();
  showToast('✅ ' + T('Marque ajoutée', 'تمت إضافة الماركة'));
}

function deleteMarque(id) {
  const m = (data.marques || []).find(x => x.id === id); if (!m) return;
  const inUse = (data.produits || []).some(p => p.marque === m.nom);
  if (inUse) { showToast('❌ ' + T('Des produits utilisent cette marque', 'هناك منتجات تستخدم هذه الماركة'), 'error'); return; }
  if (!confirm(T(`Supprimer la marque "${m.nom}" ?`, `حذف الماركة "${m.nom}"؟`))) return;
  data.marques = data.marques.filter(x => x.id !== id);
  save(); renderMarques(); renderProduits();
  showToast('❌ ' + T('Marque supprimée', 'تم حذف الماركة'));
}

function addEmplacement(marqueId) {
  const sel = document.getElementById(`emp-select-${marqueId}`);
  if (!sel) return;
  const val = sel.value;
  if (!val) return;
  const m = (data.marques || []).find(x => x.id === marqueId); if (!m) return;
  if (!m.emplacements) m.emplacements = [];
  if (m.emplacements.includes(val)) { showToast('⚠️ ' + T('Emplacement déjà présent', 'هذا الموضع موجود بالفعل'), 'error'); return; }
  m.emplacements.push(val);
  m.emplacements.sort();
  save(); renderMarques();
  showToast('✅ ' + T(`Emplacement ${val} ajouté`, `تمت إضافة الموضع ${val}`));
}

function removeEmplacement(marqueId, slot) {
  const m = (data.marques || []).find(x => x.id === marqueId); if (!m) return;
  m.emplacements = (m.emplacements || []).filter(e => e !== slot);
  save(); renderMarques();
}

// Called when marque changes in product form → update emplacement select
function onMarqueChange() {
  const marqueNom = document.getElementById('p-marque')?.value;
  const empSel = document.getElementById('p-emplacement');
  if (!empSel) return;
  const m = (data.marques || []).find(x => x.nom === marqueNom);
  const emps = m?.emplacements || [];
  empSel.innerHTML = `<option value="">-- ${T('Choisir','اختر')} --</option>` +
    emps.map(e => `<option value="${e}">${e}</option>`).join('');
}

// Update marque select in product form
function updateMarqueSelect(currentMarque, currentEmplacement) {
  if (!data.marques) data.marques = [];
  const mSel = document.getElementById('p-marque');
  if (!mSel) return;
  mSel.innerHTML = `<option value="">-- ${T('Choisir','اختر')} --</option>` +
    data.marques.map(m => `<option value="${m.nom}" ${m.nom === currentMarque ? 'selected' : ''}>${m.nom}</option>`).join('');

  // Trigger emplacement update
  onMarqueChange();
  if (currentEmplacement) {
    const empSel = document.getElementById('p-emplacement');
    if (empSel) empSel.value = currentEmplacement;
  }
}
