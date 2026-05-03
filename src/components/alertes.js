// ===================== ALERTES =====================
function renderAlertes() {
  const list = data.produits.filter(p => p.qty < p.alerte);
  const tb = document.getElementById('alertes-table');
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="7" class="empty"><div class="empty-icon">✅</div>${T('Tous les stocks sont OK !', 'جميع المخزونات بحالة جيدة!')}</td></tr>`;
    return;
  }
  tb.innerHTML = list.map(p => `<tr>
    <td><code style="background:var(--bg3);padding:2px 6px;border-radius:4px;font-size:11px">${p.ref}</code></td>
    <td><strong>${p.nom}</strong></td>
    <td><span class="badge badge-blue">${p.cat || '—'}</span></td>
    <td><strong style="color:${p.qty <= 0 ? 'var(--red)' : 'var(--yellow)'}">${p.qty}</strong></td>
    <td>${p.alerte}</td>
    <td style="color:var(--red)"><strong>${Math.max(0, p.alerte - p.qty)}</strong></td>
    <td><button class="btn btn-sm btn-red" onclick="quickEntree('${p.id}')">📥 Réappro</button></td>
  </tr>`).join('');
}
