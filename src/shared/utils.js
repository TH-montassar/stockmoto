// ===================== TOAST =====================
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ===================== FORMATTERS =====================
function formatPrice(num) {
  if (!num && num !== 0) return '0';
  const val = Number(num);
  if (isNaN(val)) return '0';
  const str = val.toFixed(2);
  return str.endsWith('.00') ? str.slice(0, -3) : str;
}

// ===================== STOCK STATUS =====================
function stockStatus(p) {
  if (p.qty <= 0) return '<span class="badge badge-red">Rupture</span>';
  if (p.qty < p.alerte) return '<span class="badge badge-yellow">Faible</span>';
  return '<span class="badge badge-green">OK</span>';
}

// ===================== IMAGE CELL =====================
function imgCell(p, size = 28) {
  return p.image
    ? `<img src="${getImageUrl(p.image)}" style="width:${size}px;height:${size}px;border-radius:4px;object-fit:cover;">`
    : `<div style="width:${size}px;height:${size}px;border-radius:4px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:13px">📦</div>`;
}

// ===================== SELECTS =====================
function updateSelects() {
  const sel = document.getElementById('p-cat');
  if (sel) {
    const c = sel.value;
    sel.innerHTML = '<option value="">-- Choisir --</option>' + data.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    sel.value = c;
  }
  if (document.getElementById('mvt-produit-list')) {
    renderMvtProductList();
  }
  const vMarqueSel = document.getElementById('v-marque');
  if (vMarqueSel) {
    const c = vMarqueSel.value;
    vMarqueSel.innerHTML = '<option value="">Sélectionner...</option>' + (data.marques || []).map(m => `<option value="${m.nom}">${m.nom}</option>`).join('');
    vMarqueSel.value = c;
  }
}

// ===================== CUSTOM SEARCHABLE SELECT =====================
function renderMvtProductList(filterText = '') {
  const listEl = document.getElementById('mvt-produit-list');
  if (!listEl) return;
  const search = filterText.toLowerCase();
  
  const filtered = data.produits.filter(p => {
    const str = `${p.ref} ${p.nom} ${p.sousCategorie || ''}`.toLowerCase();
    return str.includes(search);
  });
  
  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="custom-select-empty">${T('Aucun produit trouvé', 'لم يتم العثور على منتج')}</div>`;
    return;
  }
  
  listEl.innerHTML = filtered.map(p => {
    const safeRef = p.ref.replace(/'/g, "\\'");
    const safeNom = p.nom.replace(/'/g, "\\'");
    const displayName = `${safeRef} — ${safeNom}`;
    return `<div class="custom-select-item" onclick="selectMvtProduct('${p.id}', '${displayName}')">
      <strong>${p.ref}</strong> — ${p.nom}${p.sousCategorie ? ' — <small style="opacity:0.7">' + p.sousCategorie + '</small>' : ''} 
      <div style="font-size:11px; color:var(--text2); margin-top:2px;">(Qté: <strong>${p.qty}</strong>)</div>
    </div>`;
  }).join('');
}

function filterMvtProducts() {
  const val = document.getElementById('mvt-produit-search').value;
  renderMvtProductList(val);
  const list = document.getElementById('mvt-produit-list');
  if (list) list.style.display = 'block';
}

function showMvtProducts() {
  filterMvtProducts();
}

function selectMvtProduct(id, displayName) {
  document.getElementById('mvt-produit').value = id;
  document.getElementById('mvt-produit-search').value = displayName;
  const list = document.getElementById('mvt-produit-list');
  if (list) list.style.display = 'none';
  if (typeof autoFillPrice === 'function') autoFillPrice();
}

document.addEventListener('click', function(e) {
  const container = e.target.closest('.custom-select-container');
  if (!container) {
    const list = document.getElementById('mvt-produit-list');
    if (list) list.style.display = 'none';
  }
});

// ===================== ALERT BADGE =====================
function updateAlertBadge() {
  const n = data.produits.filter(p => p.qty < p.alerte).length;
  const b = document.getElementById('alert-badge');
  b.style.display = n > 0 ? 'inline' : 'none';
  b.textContent = n + (isAr() ? ` تنبيه${n > 1 ? 'ات' : ''}` : (` alerte${n > 1 ? 's' : ''}`));
}

// ===================== MODAL =====================
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function closeInvoiceModal() {
  closeModal('modal-invoice');
  if (window.returnToVehicleHistory) {
    window.returnToVehicleHistory = false;
    if (typeof openVehicleSalesHistory === 'function') {
      openVehicleSalesHistory();
    }
  }
  if (window.returnToProductHistory) {
    window.returnToProductHistory = false;
    if (typeof openProductSalesHistory === 'function') {
      openProductSalesHistory();
    }
  }
}
function flashError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('error-shake');
  el.focus();
  setTimeout(() => { el.classList.remove('error-shake'); }, 1000);
}
