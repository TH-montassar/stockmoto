// ===================== MOUVEMENTS =====================
let currentCart = [];

// Auto-fill price when product is selected
function autoFillPrice() {
  const prodId = document.getElementById('mvt-produit').value;
  const priceInput = document.getElementById('mvt-prix');
  if (!prodId) { priceInput.value = ''; return; }
  const prod = data.produits.find(p => p.id === prodId);
  if (!prod) return;
  // Fill with selling price for 'sortie', purchase price for 'entree'
  const price = mvtType === 'sortie' ? (prod.vente || 0) : (prod.achat || 0);
  priceInput.value = price > 0 ? formatPrice(price) : '';
}

function renderMouvements() {
  const tb = document.getElementById('mvt-table');
  const list = [...data.mouvements].reverse();
  const limit = 15;
  const displayed = list.slice(0, limit);
  
  const moreBtn = document.getElementById('mvt-more-container');
  if (moreBtn) moreBtn.style.display = list.length > limit ? 'block' : 'none';

  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="8" class="empty">${T('Aucun mouvement.', 'لا توجد حركات.')}</td></tr>`;
    if (moreBtn) moreBtn.style.display = 'none';
    return;
  }
  
  tb.innerHTML = displayed.map(m => renderMvtRow(m)).join('');
}

function renderMvtRow(m) {
  return `<tr>
    <td style="font-size:11px;color:var(--text2)">${new Date(m.date).toLocaleString('fr-FR')}</td>
    <td>
      ${m.type === 'entree' ? '<span class="badge badge-red">📥 Entrée</span>' : 
        m.type === 'sortie' ? '<span class="badge badge-green">📤 Sortie</span>' : 
        '<span class="badge" style="background:#888">❌ Annulation</span>'}
    </td>
    <td>${m.produitNom}</td>
    <td><strong>${m.qty}</strong></td>
    <td>${m.prix ? 'DT ' + formatPrice(m.prix) : '—'}</td>
    <td style="color:var(--text2)">${m.tiers || '—'}</td>
    <td style="color:var(--text2);font-size:11px">${m.note || '—'}</td>
    <td style="display:flex;gap:4px">
      <button class="btn btn-sm btn-ghost" onclick="editMouvement('${m.id}')" title="Modifier">✏️</button>
      ${m.type === 'sortie' ? `<button class="btn btn-sm btn-ghost" onclick="printInvoice('${m.transactionId || m.id}')" title="Facture">🖨️</button>` : ''}
      <button class="btn btn-sm btn-ghost" style="color:var(--danger)" onclick="deleteMouvement('${m.id}')" title="Supprimer">❌</button>
    </td>
  </tr>`;
}

function deleteMouvement(id) {
  if (!confirm(T('Voulez-vous vraiment supprimer définitivement ce mouvement ?', 'هل تريد حقاً حذف هذه الحركة نهائياً؟'))) return;
  const idx = data.mouvements.findIndex(m => m.id === id);
  if (idx === -1) return;
  const mvt = data.mouvements[idx];

  // Restore inventory quantity
  const prod = data.produits.find(p => p.id === mvt.produitId);
  if (prod) {
    if (mvt.type === 'entree') prod.qty -= mvt.qty;
    else if (mvt.type === 'sortie') prod.qty += mvt.qty;
  }

  // Hard delete
  data.mouvements.splice(idx, 1);

  save();
  renderAll();
  showToast(T('✅ Mouvement supprimé', '✅ تم الحذف'));
}

function editMouvement(id) {
  const mvt = data.mouvements.find(m => m.id === id);
  if (!mvt) return;
  
  document.getElementById('edit-mvt-id').value = id;
  document.getElementById('edit-mvt-produit').value = mvt.produitNom;
  document.getElementById('edit-mvt-qty').value = mvt.qty;
  document.getElementById('edit-mvt-prix').value = mvt.prix || 0;
  document.getElementById('edit-mvt-tiers').value = mvt.tiers || '';
  document.getElementById('edit-mvt-note').value = mvt.note || '';
  
  document.getElementById('modal-mvt-edit').classList.add('open');
}

function saveMvtEdit() {
  const id = document.getElementById('edit-mvt-id').value;
  const mvt = data.mouvements.find(m => m.id === id);
  if (!mvt) return;
  
  const newQty = parseInt(document.getElementById('edit-mvt-qty').value) || 0;
  const newPrix = parseFloat(document.getElementById('edit-mvt-prix').value) || 0;
  const newTiers = document.getElementById('edit-mvt-tiers').value.trim();
  const newNote = document.getElementById('edit-mvt-note').value.trim();
  
  if (newQty <= 0) { showToast('⚠️ Quantité invalide', 'error'); return; }
  
  // Adjust stock if quantity changed
  const prod = data.produits.find(p => p.id === mvt.produitId);
  if (prod) {
    const diff = newQty - mvt.qty;
    if (mvt.type === 'entree') prod.qty += diff;
    else if (mvt.type === 'sortie') prod.qty -= diff;
  }
  
  mvt.qty = newQty;
  mvt.prix = newPrix;
  mvt.tiers = newTiers;
  mvt.note = newNote;
  
  save();
  closeModal('modal-mvt-edit');
  renderAll();
  showToast('✅ Mouvement mis à jour');
}

function openFullMvtHistory() {
  renderFullMvtHistory();
  document.getElementById('modal-full-mvt-history').classList.add('open');
}

function renderFullMvtHistory() {
  const tb = document.getElementById('full-mvt-table');
  const list = [...data.mouvements].reverse();
  tb.innerHTML = list.map(m => renderMvtRow(m)).join('');
}

function setMvtType(type) {
  mvtType = type;
  document.getElementById('tab-entree').className = 'tab' + (type === 'entree' ? ' active-in' : '');
  document.getElementById('tab-sortie').className = 'tab' + (type === 'sortie' ? ' active-out' : '');
  document.getElementById('mvt-form-title').textContent = type === 'entree' ? '📥 Enregistrer une entrée' : '📤 Enregistrer une sortie';
  
  // Show/hide payment mode depending on type
  if (document.getElementById('mvt-paiement-group')) {
    document.getElementById('mvt-paiement-group').style.display = type === 'sortie' ? 'block' : 'none';
    if (type === 'entree') {
      document.getElementById('mvt-paiement').value = 'espèces';
      if (typeof toggleMvtCreditFields === 'function') toggleMvtCreditFields();
    }
  }

  currentCart = [];
  renderCart();
  autoFillPrice();
}

function addToCart() {
  const prodId = document.getElementById('mvt-produit').value;
  const qty = parseInt(document.getElementById('mvt-qty').value) || 0;
  const prix = parseFloat(document.getElementById('mvt-prix').value) || 0;
  if (!prodId || qty <= 0) { showToast('⚠️ Produit et quantité requis', 'error'); return; }
  
  const prod = data.produits.find(p => p.id === prodId); 
  if (!prod) return;

  if (mvtType === 'sortie') {
    // Check total queued in cart + this qty against stock
    const alreadyInCart = currentCart.filter(i => i.produitId === prod.id).reduce((s,i) => s + i.qty, 0);
    if (prod.qty < (qty + alreadyInCart)) {
      showToast('❌ Stock insuffisant ! Dispo: ' + prod.qty, 'error'); 
      return; 
    }
  }

  currentCart.push({ produitId: prod.id, produitNom: prod.nom, ref: prod.ref, qty, prix });
  
  document.getElementById('mvt-produit').value = '';
  const searchInput = document.getElementById('mvt-produit-search');
  if (searchInput) searchInput.value = '';
  document.getElementById('mvt-qty').value = 1;
  document.getElementById('mvt-prix').value = '';
  renderCart();
}

function removeCartLine(index) {
  currentCart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const tbody = document.getElementById('cart-rows');
  const tfoot = document.getElementById('cart-foot');
  if (!currentCart.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;font-size:12px;padding:10px">Panier vide</td></tr>`;
    tfoot.style.display = 'none';
    return;
  }
  
  let total = 0;
  tbody.innerHTML = currentCart.map((item, idx) => {
    const sum = item.qty * item.prix;
    total += sum;
    return `<tr>
      <td style="font-size:13px">${item.produitNom}</td>
      <td><strong>${item.qty}</strong></td>
      <td>${formatPrice(item.prix)}</td>
      <td><strong>${formatPrice(sum)}</strong></td>
      <td><button class="btn btn-sm btn-ghost" style="color:var(--danger);padding:2px 4px" onclick="removeCartLine(${idx})">❌</button></td>
    </tr>`;
  }).join('');
  
  document.getElementById('cart-total').textContent = 'DT ' + formatPrice(total);
  tfoot.style.display = 'table-row-group';
  
  if (typeof calculateMvtCreditReste === 'function') calculateMvtCreditReste();
}

function saveTransaction() {
  if (currentCart.length === 0) { showToast('⚠️ Panier vide !', 'error'); return; }

  const tiers = document.getElementById('mvt-tiers').value.trim();
  const note = document.getElementById('mvt-note').value.trim();
  const txId = Date.now().toString();

  if (mvtType === 'sortie' && document.getElementById('mvt-paiement').value === 'crédit') {
    if (!tiers) {
      showToast('⚠️ ' + T('Nom du client obligatoire pour le crédit !', 'اسم العميل إلزامي للتقسيط!'), 'error');
      return;
    }
    if (document.getElementById('mvt-avance').value.trim() === '') {
      showToast('⚠️ ' + T('Veuillez saisir l\'avance (même 0)', 'الرجاء إدخال المقدم (حتى 0)'), 'error');
      return;
    }
  }

  currentCart.forEach(item => {
    // Update stock
    const prod = data.produits.find(p => p.id === item.produitId);
    if (prod) {
      prod.qty = mvtType === 'entree' ? prod.qty + item.qty : prod.qty - item.qty;
    }

    // Add movement
    data.mouvements.push({
      id: Date.now().toString() + Math.floor(Math.random()*1000), // unique id per line
      transactionId: txId, // common ID for the invoice
      date: new Date().toISOString(),
      type: mvtType,
      produitId: item.produitId,
      produitNom: item.produitNom,
      qty: item.qty,
      prix: item.prix,
      tiers: tiers,
      note: note
    });
  });

  // If this is a Sale (Sortie), we also record a global Invoice (Facture) to track credit
  if (mvtType === 'sortie') {
    const paiement = document.getElementById('mvt-paiement').value;
    const total = currentCart.reduce((acc, item) => acc + (item.qty * item.prix), 0);
    let creditAvance = 0;
    let creditReste = 0;
    let creditTranches = null;

    if (paiement === 'crédit') {
      creditAvance = parseFloat(document.getElementById('mvt-avance').value) || 0;
      creditReste = parseFloat(document.getElementById('mvt-reste').value) || 0;
      creditTranches = parseInt(document.getElementById('mvt-tranches').value) || null;
    }

    if (!data.factures) data.factures = [];
    data.factures.push({
      id: txId,
      date: new Date().toISOString(),
      client: tiers || (isAr() ? 'زبون خاص' : 'Client particulier'),
      total: total,
      paiement: paiement,
      creditAvance: creditAvance,
      creditReste: creditReste,
      creditTranches: creditTranches,
      paiements: [],
      note: note
    });
  }

  save();
  currentCart = [];
  renderCart();
  document.getElementById('mvt-tiers').value = '';
  document.getElementById('mvt-note').value = '';
  if (document.getElementById('mvt-paiement-group')) {
    document.getElementById('mvt-paiement').value = 'espèces';
    toggleMvtCreditFields();
  }
  renderAll();
  showToast('✅ Opération validée', '✅ تم التسجيل بنجاح');
  
  // Optionally auto-print invoice if it's a sale
  if (mvtType === 'sortie') {
    setTimeout(() => printInvoice(txId), 500);
  }
}

function quickEntree(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('.nav-item:nth-child(4)').classList.add('active');
  showPage('mouvements', null);
  setMvtType('entree');
  updateSelects();
  document.getElementById('mvt-produit').value = id;
  const prod = data.produits.find(p => p.id === id);
  const searchInput = document.getElementById('mvt-produit-search');
  if (prod && searchInput) {
    searchInput.value = `${prod.ref} — ${prod.nom}`;
    autoFillPrice();
  }
}

function toggleMvtCreditFields() {
  const isCredit = document.getElementById('mvt-paiement').value === 'crédit';
  const fields = document.getElementById('mvt-credit-fields');
  if (fields) {
    fields.style.display = isCredit ? 'block' : 'none';
  }
  if (isCredit) {
    calculateMvtCreditReste();
  }
}

function calculateMvtCreditReste() {
  const isCredit = document.getElementById('mvt-paiement').value === 'crédit';
  if (!isCredit) return;

  const total = currentCart.reduce((acc, item) => acc + (item.qty * item.prix), 0);
  const avance = parseFloat(document.getElementById('mvt-avance').value) || 0;
  const reste = Math.max(0, total - avance);
  
  if (document.getElementById('mvt-reste')) {
    document.getElementById('mvt-reste').value = formatPrice(reste);
  }
}

// ===================== SUIVI DES CRÉDITS (FACTURES) =====================

function openProductSalesHistory() {
  renderProductSalesHistory();
  document.getElementById('modal-product-history').classList.add('open');
}

function renderProductSalesHistory() {
  const tb = document.getElementById('p-history-table');
  const list = [...(data.factures || [])].reverse();
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;font-size:12px;padding:10px">${T('Aucune facture enregistrée pour le moment.', 'لا توجد فواتير مسجلة.')}</td></tr>`;
    return;
  }
  
  tb.innerHTML = list.map(s => {
    let payHtml = s.paiement || '—';
    if (s.paiement === 'crédit') {
      payHtml += ` <br><small style="color:#e67e22">Avance: ${s.creditAvance || 0} DT | Reste: ${s.creditReste || 0} DT</small>`;
    }
    
    // Check if it's completely paid off
    const isPaidOff = s.paiement === 'crédit' && s.creditReste <= 0;
    
    return `<tr>
      <td style="padding:8px; border-bottom:1px solid var(--border); font-size:11px; color:var(--text2)">${new Date(s.date).toLocaleString('fr-FR')}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border);"><strong>${s.client}</strong></td>
      <td style="padding:8px; border-bottom:1px solid var(--border);"><strong>DT ${formatPrice(s.total || 0)}</strong></td>
      <td style="padding:8px; border-bottom:1px solid var(--border);">${payHtml}</td>
      <td style="padding:8px; border-bottom:1px solid var(--border); white-space:nowrap; text-align:right;">
        ${(s.paiement === 'crédit' && s.creditReste > 0) ? `<button class="btn btn-sm btn-ghost" style="color:#e67e22" onclick="openProductPayments('${s.id}')" title="Paiements">💳</button>` : ''}
        ${isPaidOff ? `<span style="color:#2ecc71; font-size:12px; margin-right:4px;">✔️ Payé</span>` : ''}
        <button class="btn btn-sm btn-ghost" onclick="closeModal('modal-product-history'); window.returnToProductHistory = true; printInvoice('${s.id}')" title="Facture">🖨️</button>
      </td>
    </tr>`;
  }).join('');
}

function openProductPayments(factureId) {
  const s = (data.factures || []).find(x => x.id === factureId);
  if (!s) return;
  document.getElementById('ppay-sale-id').value = factureId;
  
  if (!s.paiements) s.paiements = [];

  document.getElementById('ppay-amount').value = '';
  renderProductPayments(s);
  document.getElementById('modal-product-payments').classList.add('open');
}

function renderProductPayments(s) {
  const totalReste = parseFloat(s.creditReste || 0);
  
  document.getElementById('ppay-info').innerHTML = `
    <strong>${s.client}</strong> <br>
    <span style="color:var(--text2); font-size:12px;">${T('Total Facture :', 'إجمالي الفاتورة:')} DT ${formatPrice(s.total || 0)} &nbsp;|&nbsp; 
    ${T('Avance Initiale :', 'المقدم:')} DT ${formatPrice(s.creditAvance || 0)} </span><br>
    <div style="margin-top:8px; font-size:14px;"><strong>${T('Reste à payer :', 'الباقي للدفع:')} <span style="color:${totalReste > 0 ? '#e74c3c' : '#2ecc71'}">DT ${formatPrice(totalReste)}</span></strong></div>
  `;

  const tb = document.getElementById('ppay-table');
  const list = [...(s.paiements || [])].reverse();
  
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:10px; color:#888;">${T('Aucun paiement enregistré pour l\'instant.', 'لم يتم تسجيل أي دفعات بعد.')}</td></tr>`;
    return;
  }
  
  tb.innerHTML = list.map(p => `<tr>
    <td style="padding:8px; border-bottom:1px solid var(--border); color:var(--text2); font-size:12px;">${new Date(p.date).toLocaleString('fr-FR')}</td>
    <td style="padding:8px; border-bottom:1px solid var(--border);"><strong>+ DT ${formatPrice(p.montant)}</strong></td>
  </tr>`).join('');
}

function addProductPayment() {
  const factureId = document.getElementById('ppay-sale-id').value;
  const s = (data.factures || []).find(x => x.id === factureId);
  if (!s) return;

  const amount = parseFloat(document.getElementById('ppay-amount').value);
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
  
  save();
  
  showToast('✅ ' + T('Paiement ajouté avec succès', 'تمت إضافة الدفعة بنجاح'));
  document.getElementById('ppay-amount').value = '';
  
  renderProductPayments(s);
  renderProductSalesHistory();
}
