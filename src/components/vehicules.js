// ===================== VÉHICULES =====================
let editingVehicleId = null;

// ---- Render ----
function renderVehicules() {
  // Update stats
  const all = data.vehicules || [];
  document.getElementById('veh-stat-dispo').textContent = all.filter(v => v.statut === 'disponible').reduce((s, v) => s + (v.qty || 1), 0);
  document.getElementById('veh-stat-res').textContent   = all.filter(v => v.statut === 'réservé').reduce((s, v) => s + (v.qty || 1), 0);
  document.getElementById('veh-stat-sold').textContent  = (data.ventesVehicules || []).reduce((s, v) => s + v.qty, 0);
  const ca = (data.ventesVehicules || []).reduce((s, v) => s + v.prixFinal * v.qty, 0);
  document.getElementById('veh-stat-ca').textContent = formatPrice(ca) + ' DT';

  // Filters
  const q      = (document.getElementById('search-veh')?.value || '').toLowerCase();
  const type   = document.getElementById('filter-veh-type')?.value || '';
  const statut = document.getElementById('filter-veh-statut')?.value || '';

  const list = all.filter(v =>
    (!type   || v.type === type) &&
    (!statut || v.statut === statut) &&
    (!q      || (v.marque + ' ' + v.modele).toLowerCase().includes(q))
  );

  const tb = document.getElementById('vehicules-table');
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="10" class="empty"><div class="empty-icon">🏍️</div>${T('Aucun véhicule.', 'لا توجد مركبات.')}</td></tr>`;
    return;
  }

  tb.innerHTML = list.map(v => {
    const badge = v.statut === 'vendu'     ? '<span class="badge badge-red">Vendu</span>'
                : v.statut === 'réservé'   ? '<span class="badge badge-yellow">Réservé</span>'
                :                            '<span class="badge badge-green">Disponible</span>';
    const img = v.image
      ? `<img src="${getImageUrl(v.image)}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;">`
      : `<div style="width:36px;height:36px;border-radius:4px;background:var(--bg3);display:flex;align-items:center;justify-content:center">${v.type === 'moto' ? '🏍️' : '🚲'}</div>`;

    const sellBtn = (v.qty > 0 && v.statut !== 'vendu')
      ? `<button class="btn btn-sm btn-green" onclick="openSellVehicle('${v.id}')">💰 <span class="lang-fr-only">Vendre</span><span class="lang-ar-only">بيع</span></button>`
      : '';

    return `<tr>
      <td>${img}</td>
      <td>${v.type === 'moto' ? '🏍️ Moto' : '🚲 Vélo'}</td>
      <td><strong>${v.marque}</strong> ${v.modele}<br><small style="color:var(--text2)">${v.chassis ? 'N°: ' + v.chassis : ''}</small></td>
      <td style="color:var(--text2)">${v.annee || '—'}</td>
      <td style="color:var(--text2)">${v.couleur || '—'}</td>
      <td style="color:var(--text2)">${v.cylindree ? v.cylindree + ' cc' : '—'}</td>
      <td>${v.achat ? formatPrice(v.achat) + ' DT' : '—'}</td>
      <td><strong style="color:var(--accent)">${v.vente ? formatPrice(v.vente) + ' DT' : '—'}</strong></td>
      <td>${badge} <small style="color:var(--text2);font-size:11px">× ${v.qty || 1}</small></td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${sellBtn}
          <button class="btn btn-sm btn-ghost" onclick="editVehicle('${v.id}')">✏️</button>
          <button class="btn btn-sm btn-red" onclick="deleteVehicle('${v.id}')">❌</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ---- Add / Edit ----
function openAddVehicle() {
  editingVehicleId = null;
  document.getElementById('modal-vehicle-title').innerHTML = '🏍️ <span class="lang-fr-only">Nouveau véhicule</span><span class="lang-ar-only">مركبة جديدة</span>';
  updateSelects();
  ['v-modele','v-couleur','v-chassis','v-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('v-marque').value = '';
  document.getElementById('v-type').value = 'moto';
  document.getElementById('v-statut').value = 'disponible';
  document.getElementById('v-annee').value = new Date().getFullYear();
  document.getElementById('v-cylindree').value = '';
  document.getElementById('v-qty').value = 1;
  document.getElementById('v-achat').value = '';
  document.getElementById('v-vente').value = '';
  document.getElementById('v-img-file').value = '';
  document.getElementById('v-img-base64').value = '';
  document.getElementById('v-img-preview').style.display = 'none';
  document.getElementById('modal-vehicle').classList.add('open');
}

function editVehicle(id) {
  const v = (data.vehicules || []).find(x => x.id === id); if (!v) return;
  editingVehicleId = id;
  document.getElementById('modal-vehicle-title').innerHTML = '✏️ <span class="lang-fr-only">Modifier véhicule</span><span class="lang-ar-only">تعديل مركبة</span>';
  updateSelects();
  document.getElementById('v-type').value    = v.type || 'moto';
  document.getElementById('v-statut').value  = v.statut || 'disponible';
  document.getElementById('v-marque').value  = v.marque || '';
  document.getElementById('v-modele').value  = v.modele || '';
  document.getElementById('v-annee').value   = v.annee || '';
  document.getElementById('v-couleur').value = v.couleur || '';
  document.getElementById('v-chassis').value = v.chassis || '';
  document.getElementById('v-cylindree').value = v.cylindree || '';
  document.getElementById('v-qty').value     = v.qty || 1;
  document.getElementById('v-achat').value   = v.achat || '';
  document.getElementById('v-vente').value   = v.vente || '';
  document.getElementById('v-notes').value   = v.notes || '';
  document.getElementById('v-img-file').value = '';
  document.getElementById('v-img-base64').value = v.image || '';
  const prev = document.getElementById('v-img-preview');
  if (v.image) { prev.src = getImageUrl(v.image); prev.style.display = 'block'; }
  else { prev.src = ''; prev.style.display = 'none'; }
  document.getElementById('modal-vehicle').classList.add('open');
}

async function saveVehicle() {
  const marque = document.getElementById('v-marque').value;
  const modele = document.getElementById('v-modele').value.trim();
  if (!marque || !modele) { showToast('⚠️ ' + T('Marque et Modèle obligatoires !', 'الماركة والموديل مطلوبان!'), 'error'); return; }

  const vId = editingVehicleId || Date.now().toString();
  let imgVal = document.getElementById('v-img-base64').value;
  if (imgVal.startsWith('data:image')) {
    const resImg = await window.electronAPI.saveImageFile({ id: 'veh_' + vId, base64: imgVal });
    if (resImg.success) imgVal = resImg.filename;
  }

  const veh = {
    id: vId, marque, modele,
    type:      document.getElementById('v-type').value,
    statut:    document.getElementById('v-statut').value,
    annee:     parseInt(document.getElementById('v-annee').value) || null,
    couleur:   document.getElementById('v-couleur').value.trim(),
    chassis:   document.getElementById('v-chassis').value.trim(),
    cylindree: parseInt(document.getElementById('v-cylindree').value) || null,
    qty:       parseInt(document.getElementById('v-qty').value) || 1,
    achat:     parseFloat(document.getElementById('v-achat').value) || 0,
    vente:     parseFloat(document.getElementById('v-vente').value) || 0,
    notes:     document.getElementById('v-notes').value.trim(),
    image:     imgVal,
    createdAt: editingVehicleId ? ((data.vehicules || []).find(v => v.id === editingVehicleId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (!data.vehicules) data.vehicules = [];
  if (editingVehicleId) {
    const idx = data.vehicules.findIndex(v => v.id === editingVehicleId);
    data.vehicules[idx] = veh;
  } else {
    data.vehicules.push(veh);
  }
  save(); closeModal('modal-vehicle'); renderVehicules();
  showToast(editingVehicleId ? '✅ ' + T('Véhicule modifié', 'تم تعديل المركبة') : '✅ ' + T('Véhicule ajouté', 'تمت إضافة المركبة'));
}

function deleteVehicle(id) {
  if (!confirm(T('Supprimer ce véhicule ?', 'حذف هذه المركبة؟'))) return;
  data.vehicules = (data.vehicules || []).filter(v => v.id !== id);
  save(); renderVehicules(); showToast('❌ ' + T('Véhicule supprimé', 'تم حذف المركبة'));
}

// ---- Image Preview ----
function previewVehicleImage(e) {
  const file = e.target.files[0];
  if (!file) { document.getElementById('v-img-base64').value = ''; document.getElementById('v-img-preview').style.display = 'none'; return; }
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 600; let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      document.getElementById('v-img-base64').value = url;
      const prev = document.getElementById('v-img-preview');
      prev.src = url; prev.style.display = 'block';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

// ---- Sale ----
function toggleVehicleCreditFields() {
  const isCredit = document.getElementById('vsale-paiement').value === 'crédit';
  document.getElementById('vsale-credit-fields').style.display = isCredit ? 'block' : 'none';
  if (isCredit) {
    calculateVehicleCreditReste();
  }
}

function calculateVehicleCreditReste() {
  const isCredit = document.getElementById('vsale-paiement').value === 'crédit';
  if (!isCredit) return;

  const qty = parseInt(document.getElementById('vsale-qty').value) || 1;
  const prixFinal = parseFloat(document.getElementById('vsale-prix').value) || 0;
  const total = qty * prixFinal;
  
  const avance = parseFloat(document.getElementById('vsale-avance').value) || 0;
  const reste = Math.max(0, total - avance);
  
  document.getElementById('vsale-reste').value = formatPrice(reste);
}

function openSellVehicle(id) {
  const v = (data.vehicules || []).find(x => x.id === id); if (!v) return;
  document.getElementById('vsale-veh-id').value = id;
  document.getElementById('vsale-veh-info').innerHTML =
    `<strong>${v.type === 'moto' ? '🏍️' : '🚲'} ${v.marque} ${v.modele}</strong>` +
    `${v.annee ? ' — ' + v.annee : ''}${v.couleur ? ' — ' + v.couleur : ''}` +
    `<br><span style="color:var(--text2);font-size:12px">${T('N° Châssis', 'رقم الهيكل')} : ${v.chassis || '—'}</span>` +
    `<br><span style="color:var(--text2);font-size:12px">${T('Prix catalogue :', 'السعر المرجعي:')} <strong style="color:var(--accent)">${v.vente ? formatPrice(v.vente) + ' DT' : '—'}</strong> &nbsp;|&nbsp; ${T('Stock :', 'المخزون:')} ${v.qty || 1}</span>`;
  document.getElementById('vsale-client').value   = '';
  document.getElementById('vsale-tel').value      = '';
  document.getElementById('vsale-qty').value      = 1;
  document.getElementById('vsale-prix').value     = v.vente ? formatPrice(v.vente) : '';
  document.getElementById('vsale-paiement').value = 'espèces';
  if (document.getElementById('vsale-avance')) {
    document.getElementById('vsale-avance').value = '';
    document.getElementById('vsale-reste').value = '';
    document.getElementById('vsale-tranches').value = '';
    toggleVehicleCreditFields();
  }
  document.getElementById('vsale-note').value     = '';
  document.getElementById('modal-vehicle-sale').classList.add('open');
}

function confirmVehicleSale() {
  const vehId = document.getElementById('vsale-veh-id').value;
  const client = document.getElementById('vsale-client').value.trim();
  const qty = parseInt(document.getElementById('vsale-qty').value) || 1;
  const prixFinal = parseFloat(document.getElementById('vsale-prix').value) || 0;
  if (!client) { showToast('⚠️ ' + T('Nom du client obligatoire !', 'اسم العميل مطلوب!'), 'error'); return; }
  if (prixFinal <= 0) { showToast('⚠️ ' + T('Prix de vente invalide !', 'سعر البيع غير صالح!'), 'error'); return; }

  const v = (data.vehicules || []).find(x => x.id === vehId); if (!v) return;
  if ((v.qty || 1) < qty) { showToast('❌ ' + T('Stock insuffisant ! Dispo: ' + v.qty, 'المخزون غير كافٍ! المتوفر: ' + v.qty), 'error'); return; }

  const paiement = document.getElementById('vsale-paiement').value;
  if (paiement === 'crédit') {
    if (document.getElementById('vsale-avance').value.trim() === '') {
      showToast('⚠️ ' + T('Veuillez saisir l\'avance (même 0)', 'الرجاء إدخال المقدم (حتى 0)'), 'error');
      return;
    }
  }

  // Deduct stock
  v.qty = (v.qty || 1) - qty;
  if (v.qty <= 0) { v.qty = 0; v.statut = 'vendu'; }

  // Record sale
  if (!data.ventesVehicules) data.ventesVehicules = [];
  const sale = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    vehiculeId: vehId,
    vehiculeLabel: `${v.marque} ${v.modele}${v.annee ? ' ' + v.annee : ''}`,
    chassis: v.chassis || '',
    type: v.type,
    qty,
    prixRef: v.vente || 0,
    prixFinal,
    client,
    tel: document.getElementById('vsale-tel').value.trim(),
    paiement: document.getElementById('vsale-paiement').value,
    creditAvance: document.getElementById('vsale-paiement').value === 'crédit' ? (parseFloat(document.getElementById('vsale-avance').value) || 0) : 0,
    creditReste: document.getElementById('vsale-paiement').value === 'crédit' ? (parseFloat(document.getElementById('vsale-reste').value) || 0) : 0,
    creditTranches: document.getElementById('vsale-paiement').value === 'crédit' ? parseInt(document.getElementById('vsale-tranches').value) || null : null,
    note: document.getElementById('vsale-note').value.trim()
  };
  data.ventesVehicules.push(sale);

  save();
  closeModal('modal-vehicle-sale');
  renderVehicules();
  showToast('✅ ' + T('Vente enregistrée !', 'تم تسجيل البيع!'));

  // Offer to print invoice
  setTimeout(() => printVehicleInvoice(sale.id), 300);
}

// ---- Vehicle Invoice ----
function printVehicleInvoice(saleId) {
  const s = (data.ventesVehicules || []).find(x => x.id === saleId); if (!s) return;
  const v = (data.vehicules || []).find(x => x.id === s.vehiculeId);
  const chassis = s.chassis || v?.chassis || '';
  const chassisHtml = `<br><small style="color:#666;font-size:11px"><strong>N° Châssis :</strong> ${chassis || '—'}</small>`;

  const numStr = 'Facture Véh. #' + saleId.slice(-6).toUpperCase();
  const dateStr = new Date(s.date).toLocaleString('fr-FR');
  const total = (s.prixFinal || 0) * (s.qty || 0);
  const totalReste = parseFloat(s.creditReste || 0);
  const totalPaid = Math.max(0, total - totalReste);
  const rowHtml = `<tr>
    <td>${s.vehiculeLabel}${chassisHtml}</td>
    <td>${s.type === 'moto' ? 'Moto Neuve' : 'Vélo Neuf'}</td>
    <td>${s.qty}</td>
    <td>${formatPrice(s.prixFinal)} DT</td>
    <td><strong>${formatPrice(total)} DT</strong></td>
  </tr>${s.note ? `<tr><td colspan="5" style="color:#888;font-size:11px">💬 ${s.note}</td></tr>` : ''}`;
  
  let payHtml = `<br><small style="color:#888">${T('Paiement', 'الدفع')} : ${s.paiement} &nbsp;|&nbsp; Tel: ${s.tel || '—'}</small>`;
  if (s.paiement === 'crédit') {
    payHtml += `<br><small style="color:#e67e22;font-weight:bold;">${T('Déjà payé', 'المدفوع')} : ${formatPrice(totalPaid)} DT &nbsp;|&nbsp; ${T('Reste', 'الباقي')} : ${formatPrice(totalReste)} DT ${s.creditTranches ? `&nbsp;|&nbsp; ${T('Tranches', 'الأقساط')} : ${s.creditTranches} mois` : ''}</small>`;
  }

  // Fill preview modal
  document.getElementById('prev-num').textContent = numStr;
  document.getElementById('prev-date').textContent = dateStr;
  document.getElementById('prev-client').innerHTML = s.client + payHtml;
  document.getElementById('prev-rows').innerHTML = rowHtml;
  document.getElementById('prev-total').textContent = formatPrice(total) + ' DT';

  // Fill print template
  document.getElementById('inv-num').textContent = numStr;
  document.getElementById('inv-date').textContent = dateStr;
  document.getElementById('inv-client').innerHTML = s.client + payHtml;
  document.getElementById('inv-rows').innerHTML = rowHtml;
  document.getElementById('inv-total').textContent = formatPrice(total) + ' DT';

  document.getElementById('modal-invoice').classList.add('open');
}

// ---- History ----
function openVehicleSalesHistory() {
  renderVehicleSalesHistory();
  document.getElementById('modal-vehicle-history').classList.add('open');
}

function renderVehicleSalesHistory() {
  const tb = document.getElementById('v-history-table');
  const list = [...(data.ventesVehicules || [])].reverse();
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="6" class="empty">${T('Aucune vente enregistrée.', 'لا توجد مبيعات مسجلة.')}</td></tr>`;
    return;
  }
  tb.innerHTML = list.map(s => {
    let payHtml = s.paiement;
    if (s.paiement === 'crédit') {
      const total = (s.prixFinal || 0) * (s.qty || 0);
      const totalReste = parseFloat(s.creditReste || 0);
      const totalPaid = Math.max(0, total - totalReste);
      payHtml += ` <br><small style="color:#e67e22">${T('Déjà payé', 'المدفوع')}: ${formatPrice(totalPaid)} DT | ${T('Reste', 'الباقي')}: ${formatPrice(totalReste)} DT</small>`;
    }
    return `<tr>
      <td style="padding:8px; border-bottom:1px solid var(--border); font-size:11px; color:var(--text2)">${new Date(s.date).toLocaleString('fr-FR')}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);"><strong>${s.client}</strong><br><small style="color:var(--text2)">${s.tel || '—'}</small></td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${s.vehiculeLabel} <small>x${s.qty}</small></td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${payHtml}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);"><strong>${formatPrice(s.prixFinal * s.qty)} DT</strong></td>
      <td style="padding:8px; border-bottom:1px solid var(--border); white-space:nowrap;">
        ${(s.paiement === 'crédit' && s.creditReste > 0) ? `<button class="btn btn-sm btn-ghost" style="color:#e67e22" onclick="openVehiclePayments('${s.id}')" title="Paiements">💳</button>` : ''}
        ${(s.paiement === 'crédit' && s.creditReste <= 0) ? `<span style="color:#2ecc71; font-size:12px; margin-right:4px;">✔️ Payé</span>` : ''}
        <button class="btn btn-sm btn-ghost" onclick="closeModal('modal-vehicle-history'); window.returnToVehicleHistory = true; printVehicleInvoice('${s.id}')" title="Facture">🖨️</button>
        <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="deleteVehicleSale('${s.id}')" title="Annuler la vente">❌</button>
      </td>
    </tr>`;
  }).join('');
}

// ---- Payments (Tranches) ----
function openVehiclePayments(saleId) {
  const s = (data.ventesVehicules || []).find(x => x.id === saleId);
  if (!s) return;
  document.getElementById('vpay-sale-id').value = saleId;
  
  // Initialize array if undefined
  if (!s.paiements) s.paiements = [];

  document.getElementById('vpay-amount').value = '';
  renderVehiclePayments(s);
  document.getElementById('modal-vehicle-payments').classList.add('open');
}

function renderVehiclePayments(s) {
  const total = (s.prixFinal || 0) * (s.qty || 0);
  const totalReste = parseFloat(s.creditReste || 0);
  const totalPaid = Math.max(0, total - totalReste);
  
  document.getElementById('vpay-info').innerHTML = `
    <strong>${s.client}</strong> — ${s.vehiculeLabel} <br>
    <span style="color:var(--text2); font-size:12px;">${T('Prix Total :', 'السعر الإجمالي:')} ${formatPrice(total)} DT &nbsp;|&nbsp; 
    ${T('Avance Initiale :', 'المقدم:')} ${formatPrice(s.creditAvance || 0)} DT</span><br>
    <span style="color:#2ecc71; font-size:12px; font-weight:700;">${T('Déjà payé :', 'المدفوع:')} ${formatPrice(totalPaid)} DT</span>
    <div style="margin-top:8px; font-size:14px;"><strong>${T('Reste à payer :', 'الباقي للدفع:')} <span style="color:${totalReste > 0 ? '#e74c3c' : '#2ecc71'}">${formatPrice(totalReste)} DT</span></strong></div>
  `;

  const tb = document.getElementById('vpay-table');
  const list = [...(s.paiements || [])].reverse();
  
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:10px; color:#888;">${T('Aucun paiement enregistré pour l\'instant.', 'لم يتم تسجيل أي دفعات بعد.')}</td></tr>`;
    return;
  }
  
  tb.innerHTML = list.map(p => `<tr>
    <td style="padding:8px; border-bottom:1px solid var(--border); color:var(--text2); font-size:12px;">${new Date(p.date).toLocaleString('fr-FR')}</td>
    <td style="padding:8px; border-bottom:1px solid var(--border);"><strong>+ ${formatPrice(p.montant)} DT</strong></td>
  </tr>`).join('');
}

function addVehiclePayment() {
  const saleId = document.getElementById('vpay-sale-id').value;
  const s = (data.ventesVehicules || []).find(x => x.id === saleId);
  if (!s) return;

  const amount = parseFloat(document.getElementById('vpay-amount').value);
  if (!amount || amount <= 0) {
    showToast('⚠️ ' + T('Montant invalide !', 'مبلغ غير صالح!'), 'error');
    return;
  }
  if (amount > s.creditReste) {
    showToast('❌ ' + T('Le montant dépasse le reste à payer !', 'المبلغ يتجاوز الباقي للدفع!'), 'error');
    return;
  }

  if (!s.paiements) s.paiements = [];
  
  s.paiements.push({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    montant: amount
  });
  
  s.creditReste -= amount;
  
  save(); // Sauvegarde dans le fichier data.json interne
  
  showToast('✅ ' + T('Paiement ajouté avec succès', 'تمت إضافة الدفعة بنجاح'));
  document.getElementById('vpay-amount').value = '';
  
  // Refresh UI
  renderVehiclePayments(s);
  renderVehicleSalesHistory(); // Update main history list as well
}
function deleteVehicleSale(id) {
  if (!confirm(T('Voulez-vous vraiment annuler cette vente ? Le véhicule sera remis en stock.', 'هل تريد فعلاً إلغاء هذا البيع؟ سيتم إرجاع المركبة إلى المخزون.'))) return;
  
  const saleIdx = (data.ventesVehicules || []).findIndex(s => s.id === id);
  if (saleIdx === -1) return;
  const sale = data.ventesVehicules[saleIdx];
  
  // Restore vehicle stock
  const v = (data.vehicules || []).find(x => x.id === sale.vehiculeId);
  if (v) {
    v.qty = (v.qty || 0) + (sale.qty || 1);
    if (v.qty > 0 && v.statut === 'vendu') {
      v.statut = 'disponible';
    }
  }
  
  // Remove sale record
  data.ventesVehicules.splice(saleIdx, 1);
  
  save();
  renderVehicules();
  renderVehicleSalesHistory();
  showToast('✅ ' + T('Vente annulée et stock restauré', 'تم إلغاء البيع واستعادة المخزون'));
}
