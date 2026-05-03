// ===================== PRODUITS =====================
function renderProduits() {
  const q      = (document.getElementById('search-produit')?.value || '').toLowerCase();
  const cat    = document.getElementById('filter-cat')?.value || '';
  const sortSel = document.getElementById('sort-produit');
  if (sortSel && sortSel.dataset.lang !== document.documentElement.lang) {
    const curVal = sortSel.value || 'nom-asc';
    sortSel.innerHTML = `
      <option value="nom-asc">${T('Nom (A-Z)', 'الاسم (A-Z)')}</option>
      <option value="nom-desc">${T('Nom (Z-A)', 'الاسم (Z-A)')}</option>
      <option value="qty-asc">${T('Qté ↗', 'كمية ↗')}</option>
      <option value="qty-desc">${T('Qté ↘', 'كمية ↘')}</option>
      <option value="price-asc">${T('Prix ↗', 'السعر ↗')}</option>
      <option value="price-desc">${T('Prix ↘', 'السعر ↘')}</option>
      <option value="recent">${T('Récents', 'الأحدث')}</option>
    `;
    sortSel.value = curVal;
    sortSel.dataset.lang = document.documentElement.lang;
  }

  const marque = document.getElementById('filter-marque')?.value || '';
  const empl   = document.getElementById('filter-emplacement')?.value || '';
  const sortBy = sortSel?.value || 'nom-asc';

  const list = data.produits.filter(p =>
    (!q || 
      (p.nom || '').toLowerCase().includes(q) || 
      (p.ref || '').toLowerCase().includes(q) || 
      (p.marque || '').toLowerCase().includes(q) ||
      (p.cat || '').toLowerCase().includes(q) ||
      (p.sousCategorie || '').toLowerCase().includes(q)
    ) &&
    (!cat    || p.cat === cat) &&
    (!marque || p.marque === marque) &&
    (!empl   || p.emplacement === empl)
  );

  list.sort((a, b) => {
    switch (sortBy) {
      case 'nom-asc': return (a.nom || '').localeCompare(b.nom || '');
      case 'nom-desc': return (b.nom || '').localeCompare(a.nom || '');
      case 'qty-asc': return (a.qty || 0) - (b.qty || 0);
      case 'qty-desc': return (b.qty || 0) - (a.qty || 0);
      case 'price-asc': return (a.vente || 0) - (b.vente || 0);
      case 'price-desc': return (b.vente || 0) - (a.vente || 0);
      case 'recent': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      default: return 0;
    }
  });

  // Populate marque filter
  const marqueFilter = document.getElementById('filter-marque');
  if (marqueFilter) {
    const marques = [...new Set(data.produits.map(p => p.marque).filter(Boolean))].sort();
    const cur = marqueFilter.value;
    marqueFilter.innerHTML = `<option value="">${T('Toutes marques','كل الماركات')}</option>` +
      marques.map(m => `<option value="${m}" ${m === cur ? 'selected' : ''}>${m}</option>`).join('');
  }

  // Populate emplacement filter
  const emplFilter = document.getElementById('filter-emplacement');
  if (emplFilter) {
    const empls = [...new Set(data.produits.map(p => p.emplacement).filter(Boolean))].sort();
    const cur2 = emplFilter.value;
    emplFilter.innerHTML = `<option value="">${T('Tous empl.','كل المواضع')}</option>` +
      empls.map(e => `<option value="${e}" ${e === cur2 ? 'selected' : ''}>📍 ${e}</option>`).join('');
  }

  const tb = document.getElementById('produits-table');
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="10" class="empty"><div class="empty-icon">🔍</div>${T('Aucun résultat.', 'لا توجد نتائج.')}</td></tr>`;
    return;
  }
  tb.innerHTML = list.map(p => `<tr class="${p.qty <= p.alerte ? 'alert-row' : ''}">
    <td><code style="background:var(--bg3);padding:2px 6px;border-radius:4px;font-size:11px">${p.ref}</code></td>
    <td><div style="display:flex;align-items:center;gap:7px">${imgCell(p, 30)}<div><div>${p.nom}</div><div style="font-size:10px;color:var(--text2)">${p.sousCategorie || ''}</div></div></div></td>
    <td><span class="badge badge-blue">${p.cat || '—'}</span></td>
    <td style="font-size:11px;color:var(--text2)">${p.sousCategorie || '—'}</td>
    <td style="font-size:12px;color:var(--text2)">${p.marque || '—'}</td>
    <td><span style="font-weight:700;color:var(--accent)">${p.emplacement ? '📍 ' + p.emplacement : '—'}</span></td>
    <td><strong>${p.qty}</strong></td>
    <td>${p.achat ? 'DT ' + formatPrice(p.achat) : '—'}</td>
    <td>${p.vente ? 'DT ' + formatPrice(p.vente) : '—'}</td>
    <td><div style="display:flex;gap:5px">
      <button class="btn btn-sm btn-ghost" onclick="editProduct('${p.id}')">✏️</button>
      <button class="btn btn-sm btn-red" onclick="deleteProduct('${p.id}')">❌</button>
    </div></td>
  </tr>`).join('');
}

function openAddProduct() {
  editingId = null;
  document.getElementById('modal-product-title').textContent = '➕ Nouveau produit / قطعة جديدة';
  ['p-ref','p-nom','p-sous-cat','p-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('p-qty').value = 0;
  document.getElementById('p-alerte').value = 5;
  document.getElementById('p-achat').value = '';
  document.getElementById('p-vente').value = '';
  document.getElementById('p-type').value = 'moto';
  document.getElementById('p-img-file').value = '';
  document.getElementById('p-img-base64').value = '';
  document.getElementById('p-img-preview').style.display = 'none';
  updateSelects();
  updateMarqueSelect('', '');
  document.getElementById('modal-product').classList.add('open');
}

function editProduct(id) {
  const p = data.produits.find(x => x.id === id); if (!p) return;
  editingId = id;
  document.getElementById('modal-product-title').textContent = '✏️ Modifier produit';
  document.getElementById('p-ref').value       = p.ref;
  document.getElementById('p-nom').value       = p.nom;
  document.getElementById('p-sous-cat').value  = p.sousCategorie || '';
  document.getElementById('p-qty').value       = p.qty;
  document.getElementById('p-alerte').value    = p.alerte;
  document.getElementById('p-achat').value     = p.achat || '';
  document.getElementById('p-vente').value     = p.vente || '';
  document.getElementById('p-desc').value      = p.desc || '';
  document.getElementById('p-type').value      = p.type || 'moto';
  document.getElementById('p-img-file').value  = '';
  document.getElementById('p-img-base64').value = p.image || '';
  const prev = document.getElementById('p-img-preview');
  if (p.image) { prev.src = getImageUrl(p.image); prev.style.display = 'block'; } else { prev.src = ''; prev.style.display = 'none'; }
  updateSelects();
  document.getElementById('p-cat').value = p.cat || '';
  updateMarqueSelect(p.marque || '', p.emplacement || '');
  document.getElementById('modal-product').classList.add('open');
}

async function saveProduct() {
  const ref   = document.getElementById('p-ref').value.trim();
  const nom   = document.getElementById('p-nom').value.trim();
  const cat   = document.getElementById('p-cat').value;
  const type  = document.getElementById('p-type').value;
  const qty   = parseInt(document.getElementById('p-qty').value);
  const vente = parseFloat(document.getElementById('p-vente').value);

  // VALIDATION
  if (!nom) { 
    flashError('p-nom');
    showToast('⚠️ ' + T('Désignation obligatoire !', 'الاسم إلزامي!'), 'error'); 
    return; 
  }
  if (!type) {
    flashError('p-type');
    showToast('⚠️ ' + T('Type de véhicule obligatoire !', 'نوع المركبة إلزامي!'), 'error');
    return;
  }
  if (isNaN(qty) || qty < 1) {
    flashError('p-qty');
    showToast('⚠️ ' + T('Quantité obligatoire (min 1) !', 'الكمية إلزامية (الحد الأدنى 1)!'), 'error');
    return;
  }
  if (!vente || vente <= 0) {
    flashError('p-vente');
    showToast('⚠️ ' + T('Prix de vente obligatoire !', 'سعر البيع إلزامي!'), 'error');
    return;
  }

  const prodId = editingId || Date.now().toString();
  let imgVal = document.getElementById('p-img-base64').value;
  if (imgVal.startsWith('data:image')) {
    const resImg = await window.electronAPI.saveImageFile({ id: prodId, base64: imgVal });
    if (resImg.success) imgVal = resImg.filename;
  }
  const prod = {
    id: prodId, ref, nom,
    cat:          document.getElementById('p-cat').value,
    sousCategorie:document.getElementById('p-sous-cat').value.trim(),
    type:         document.getElementById('p-type').value,
    marque:       document.getElementById('p-marque').value,
    emplacement:  document.getElementById('p-emplacement').value,
    qty:          parseInt(document.getElementById('p-qty').value) || 0,
    alerte:       parseInt(document.getElementById('p-alerte').value) || 0,
    achat:        parseFloat(document.getElementById('p-achat').value) || 0,
    vente:        parseFloat(document.getElementById('p-vente').value) || 0,
    desc:         document.getElementById('p-desc').value.trim(),
    image:        imgVal,
    createdAt:    editingId ? (data.produits.find(p => p.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };
  if (editingId) { const idx = data.produits.findIndex(p => p.id === editingId); data.produits[idx] = prod; }
  else data.produits.push(prod);
  save(); closeModal('modal-product'); renderAll();
  showToast(editingId ? '✅ Produit modifié' : '✅ Produit ajouté');
}

function deleteProduct(id) {
  if (!confirm('Supprimer ce produit ?')) return;
  data.produits = data.produits.filter(p => p.id !== id);
  save(); renderAll(); showToast('❌ Produit supprimé');
}
