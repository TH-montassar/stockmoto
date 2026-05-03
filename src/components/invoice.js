// ===================== INVOICE =====================
function printInvoice(txOrMvtId) {
  const mvts = data.mouvements.filter(x => 
    (x.transactionId === txOrMvtId || x.id === txOrMvtId) && !x.annule && x.type !== 'annulation'
  );
  if (!mvts.length) return;

  const baseMvt = mvts[0];
  const numStr = 'Facture #' + txOrMvtId.slice(-6).toUpperCase();
  const dateStr = new Date(baseMvt.date).toLocaleString('fr-FR');
  const clientStr = baseMvt.tiers || (isAr() ? 'زبون خاص' : 'Client particulier');

  let totalInv = 0;
  let rowHtml = mvts.map(m => {
    const p = data.produits.find(x => x.id === m.produitId);
    const sum = (m.prix || 0) * m.qty;
    totalInv += sum;
    return `<tr>
      <td>${m.produitNom}</td>
      <td><code style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:3px">${p?.ref || '—'}</code></td>
      <td>${m.qty}</td>
      <td>${formatPrice(m.prix || 0)} DT</td>
      <td><strong>${formatPrice(sum)} DT</strong></td>
    </tr>`;
  }).join('');

  if (baseMvt.note) {
    rowHtml += `<tr><td colspan="5" style="color:#888;font-size:11px;padding-top:4px">💬 ${baseMvt.note}</td></tr>`;
  }

  // Fill preview modal
  document.getElementById('prev-num').textContent = numStr;
  document.getElementById('prev-date').textContent = dateStr;
  document.getElementById('prev-client').textContent = clientStr;
  document.getElementById('prev-rows').innerHTML = rowHtml;
  document.getElementById('prev-total').textContent = formatPrice(totalInv) + ' DT';

  // Fill print template
  document.getElementById('inv-num').textContent = numStr;
  document.getElementById('inv-date').textContent = dateStr;
  document.getElementById('inv-client').textContent = clientStr;
  document.getElementById('inv-rows').innerHTML = rowHtml;
  document.getElementById('inv-total').textContent = formatPrice(totalInv) + ' DT';

  // Open preview
  document.getElementById('modal-invoice').classList.add('open');
}

function confirmPrint() {
  closeModal('modal-invoice');
  setTimeout(() => window.print(), 100);
}
