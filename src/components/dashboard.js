// ===================== DASHBOARD =====================
function renderDashboard() {
  document.getElementById('stat-total').textContent = data.produits.length;
  document.getElementById('stat-valeur').textContent = formatPrice(data.produits.reduce((s, p) => s + (p.qty * p.achat), 0)) + ' DT';
  document.getElementById('stat-alerte').textContent = data.produits.filter(p => p.qty <= p.alerte).length;
  const today = new Date().toDateString();
  document.getElementById('stat-mvt').textContent = data.mouvements.filter(m => new Date(m.date).toDateString() === today).length;

  const recent = [...data.produits].slice(-10).reverse();
  const tb = document.getElementById('dashboard-table');
  if (!recent.length) {
    tb.innerHTML = `<tr><td colspan="8" class="empty"><div class="empty-icon">📭</div>${T('Aucun produit.','لا توجد منتجات.')}</td></tr>`;
    return;
  }
  tb.innerHTML = recent.map(p => `<tr class="${p.qty <= p.alerte ? 'alert-row' : ''}">
    <td><code style="background:var(--bg3);padding:2px 6px;border-radius:4px;font-size:11px">${p.ref}</code></td>
    <td><div style="display:flex;align-items:center;gap:7px">${imgCell(p)}<strong>${p.nom}</strong></div></td>
    <td><span class="badge badge-blue">${p.cat || '—'}</span></td>
    <td style="color:var(--text2);font-size:12px">${p.marque || '—'}</td>
    <td><strong>${p.qty}</strong></td>
    <td>${p.achat ? 'DT ' + formatPrice(p.achat) : '—'}</td>
    <td>${p.vente ? 'DT ' + formatPrice(p.vente) : '—'}</td>
    <td>${stockStatus(p)}</td>
  </tr>`).join('');

  // TOP SUMMARY STATS
  const salesByProd = data.mouvements.filter(m => m.type === 'sortie' && !m.annule).reduce((acc, m) => {
    acc[m.produitId] = (acc[m.produitId] || 0) + (m.qty || 0);
    return acc;
  }, {});
  
  const sortedSales = Object.entries(salesByProd).sort((a,b) => b[1] - a[1]);
  if (sortedSales.length > 0) {
    const top = data.produits.find(p => p.id == sortedSales[0][0]);
    const low = data.produits.find(p => p.id == sortedSales[sortedSales.length-1][0]);
    if (top) {
      document.getElementById('stat-top-prod').textContent = top.nom;
      document.getElementById('stat-top-prod-qty').textContent = sortedSales[0][1] + ' ' + (isAr() ? 'مبيعات' : 'ventes');
    }
    if (low) {
      document.getElementById('stat-low-prod').textContent = low.nom;
      document.getElementById('stat-low-prod-qty').textContent = sortedSales[sortedSales.length-1][1] + ' ' + (isAr() ? 'مبيعات' : 'ventes');
    }
  } else {
    document.getElementById('stat-top-prod').textContent = '—';
    document.getElementById('stat-low-prod').textContent = '—';
    document.getElementById('stat-top-prod-qty').textContent = '';
    document.getElementById('stat-low-prod-qty').textContent = '';
  }

  const salesByCat = data.mouvements.filter(m => m.type === 'sortie' && !m.annule).reduce((acc, m) => {
    const p = data.produits.find(x => x.id == m.produitId);
    if (p) { const c = p.cat || '—'; acc[c] = (acc[c] || 0) + (m.qty || 0); }
    return acc;
  }, {});
  const sortedCats = Object.entries(salesByCat).sort((a,b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    document.getElementById('stat-best-cat').textContent = sortedCats[0][0];
    document.getElementById('stat-best-cat-qty').textContent = sortedCats[0][1] + ' ' + (isAr() ? 'مبيعات' : 'ventes');
  } else {
    document.getElementById('stat-best-cat').textContent = '—';
    document.getElementById('stat-best-cat-qty').textContent = '';
  }

  // --- FINANCIALS ---
  // 1. Total Credit
  const creditProd = (data.factures || []).reduce((s, f) => s + (Number(f.creditReste) || 0), 0);
  const creditVeh  = (data.ventesVehicules || []).reduce((s, v) => s + (Number(v.creditReste) || 0), 0);
  const totalCredit = creditProd + creditVeh;
  document.getElementById('stat-total-credit').textContent = formatPrice(totalCredit) + ' DT';

  // 2. Profit Calculation
  const getProfit = (days) => {
    const limit = new Date();
    limit.setDate(limit.getDate() - days);
    
    // Products Profit
    const pProfit = data.mouvements
      .filter(m => m.type === 'sortie' && !m.annule && new Date(m.date) >= limit)
      .reduce((s, m) => {
        const p = data.produits.find(x => x.id == m.produitId);
        const buyPrice = p ? (Number(p.achat) || 0) : 0;
        return s + (m.qty * (m.prix - buyPrice));
      }, 0);

    // Vehicles Profit
    const vProfit = (data.ventesVehicules || [])
      .filter(v => new Date(v.date) >= limit)
      .reduce((s, v) => {
        const veh = (data.vehicules || []).find(x => x.id == v.vehiculeId);
        const buyPrice = veh ? (Number(veh.achat) || 0) : 0;
        return s + (v.prixFinal - buyPrice);
      }, 0);

    return { pProfit, vProfit, total: pProfit + vProfit };
  };

  const p30 = getProfit(30);

  if (document.getElementById('stat-profit-prod-30')) {
    document.getElementById('stat-profit-prod-30').textContent = formatPrice(p30.pProfit) + ' DT';
    document.getElementById('stat-profit-veh-30').textContent = formatPrice(p30.vProfit) + ' DT';
    document.getElementById('stat-profit-30').textContent = formatPrice(p30.total) + ' DT';
  } else {
    // Fallback if HTML not yet updated or for 7-day compat
    const p7 = getProfit(7);
    if (document.getElementById('stat-profit-7')) {
      document.getElementById('stat-profit-7').textContent = formatPrice(p7.total) + ' DT';
    }
    document.getElementById('stat-profit-30').textContent = formatPrice(p30.total) + ' DT';
  }
  
  const label30 = isAr() ? "خلال الـ 30 يوماً الماضية" : "Derniers 30 jours";
  if (document.getElementById('stat-profit-30-sub')) {
    document.getElementById('stat-profit-30-sub').textContent = label30;
  }
  // 3. Credit List Table
  const creditList = [
    ...(data.factures || []).filter(f => (f.creditReste || 0) > 0).map(f => ({
      client: f.client,
      amount: f.creditReste,
      date: f.date,
      type: T('💸 Produits', '💸 منتجات')
    })),
    ...(data.ventesVehicules || []).filter(v => (v.creditReste || 0) > 0).map(v => ({
      client: v.client,
      amount: v.creditReste,
      date: v.date,
      type: T('🏍️ Véhicule', '🏍️ مركبة')
    }))
  ].sort((a,b) => new Date(b.date) - new Date(a.date));

  const crTb = document.getElementById('credit-table');
  if (creditList.length > 0) {
    crTb.innerHTML = creditList.map(c => `<tr>
      <td><strong>${c.client}</strong></td>
      <td style="color:var(--red)"><strong>${formatPrice(c.amount)} DT</strong></td>
      <td><span class="badge badge-ghost">${c.type}</span></td>
      <td style="font-size:12px;color:var(--text2)">${new Date(c.date).toLocaleDateString('fr-FR')}</td>
    </tr>`).join('');
  } else {
    crTb.innerHTML = `<tr><td colspan="4" class="empty">${T('Aucun crédit.', 'لا يوجد كريدت.')}</td></tr>`;
  }

  renderCharts();
}

let chartValeur = null, chartQty = null, chartAchat = null, chartMarque = null;
function renderCharts() {
  if (typeof Chart === 'undefined') return;
  
  const groupBy = document.getElementById('stat-group-by')?.value || 'cat';
  const isMarque = groupBy === 'marque';

  // 1. Get primary items for charts (either categories or marques used in products)
  const primaryField = isMarque ? 'marque' : 'cat';
  const secondaryField = isMarque ? 'cat' : 'marque';

  const usedItems = [...new Set(data.produits.map(p => p[primaryField] || T('Autre', 'أخرى')))]
                    .filter(i => i !== '-- Choisir --' && i !== '');
  
  // 2. Prepare data for the 3 main charts
  let chartData = usedItems.map(item => {
    const qty = data.produits.filter(p => (p[primaryField] || T('Autre', 'أخرى')) === item).reduce((s, p) => s + (p.qty || 0), 0);
    const buyVal = data.produits.filter(p => (p[primaryField] || T('Autre', 'أخرى')) === item).reduce((s, p) => s + ((p.qty || 0) * (p.achat || 0)), 0);
    const sales = data.mouvements.filter(m => m.type === 'sortie' && !m.annule).filter(m => {
      const p = data.produits.find(x => x.id === m.produitId);
      return (p?.[primaryField] || T('Autre', 'أخرى')) === item;
    }).reduce((s, m) => s + (m.qty || 0), 0);
    return { name: item, qty, buyVal, sales };
  });

  // Sort and filter
  chartData.sort((a, b) => b.qty - a.qty);
  chartData = chartData.filter(d => d.qty > 0 || d.sales > 0).slice(0, 15); // Limit to top 15 for better display

  const labels = chartData.map(d => d.name);
  const stockQtyData = chartData.map(d => d.qty);
  const stockBuyData = chartData.map(d => d.buyVal);
  const salesQtyData = chartData.map(d => d.sales);

  // 4. Data for the 4th Chart (Secondary visualization of the same primary group)
  const secondaryLabels = labels;
  const secondaryQtyData = stockQtyData;

  // UI Updates: Titles
  const suffix = isMarque ? T(' par Marque', ' حسب الماركة') : T(' par Catégorie', ' حسب الفئة');

  const updateTitle = (sel, baseFr, baseAr, icon = '📊') => {
    const el = document.querySelector(`.card:has(${sel}) .card-title`);
    if (el) el.innerHTML = icon + ' ' + T(baseFr + suffix, baseAr + suffix);
  };
  
  updateTitle('#chart-valeur', 'Quantité de stock', 'كمية المخزون', '📊');
  updateTitle('#chart-qty', 'Ventes', 'المبيعات', '💪');
  updateTitle('#chart-achat', "Valeur d'achat", 'قيمة الشراء', '💰');
  updateTitle('#chart-marque', 'Répartition stock', 'توزيع المخزون', '🏷️');

  const isLight = document.documentElement.classList.contains('light-mode');
  const gridColor = isLight ? '#e2e8f0' : '#2d3148';
  const textColor = isLight ? '#475569' : '#94a3b8';
  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Space Grotesk', sans-serif";
  const chartColors = ['#3b82f6','#f97316','#22c55e','#ef4444','#eab308','#8b5cf6','#ec4899','#14b8a6','#f43f5e','#6366f1','#10b981','#f59e0b'];

  // Render 4 Charts
  const renderBar = (id, label, dataArr, color, refObj) => {
    const ctx = document.getElementById(id);
    if (refObj.chart) refObj.chart.destroy();
    refObj.chart = new Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: [{ label: label, data: dataArr, backgroundColor: color, borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, 
                 scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { stepSize: 1, precision: (id === 'chart-valeur' ? 0 : 2) } }, x: { grid: { display: false } } } }
    });
  };

  const wrapVal = { chart: chartValeur };
  renderBar('chart-valeur', T('Quantité', 'الكمية'), stockQtyData, '#3b82f6', wrapVal);
  chartValeur = wrapVal.chart;

  const wrapAchat = { chart: chartAchat };
  renderBar('chart-achat', 'Valeur (DT)', stockBuyData, '#ef4444', wrapAchat);
  chartAchat = wrapAchat.chart;

  const ctxQty = document.getElementById('chart-qty');
  if (chartQty) chartQty.destroy();
  chartQty = new Chart(ctxQty, {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: salesQtyData, backgroundColor: chartColors }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor, font: { size: 10 } } } } }
  });

  const ctxMarque = document.getElementById('chart-marque');
  if (chartMarque) chartMarque.destroy();
  chartMarque = new Chart(ctxMarque, {
    type: 'pie',
    data: { labels: secondaryLabels, datasets: [{ data: secondaryQtyData, backgroundColor: chartColors }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor, font: { size: 10 } } } } }
  });
}
