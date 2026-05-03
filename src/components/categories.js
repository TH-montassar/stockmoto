// ===================== CATEGORIES =====================
function renderCategories() {
  const filterSel = document.getElementById('filter-cat');
  if (filterSel) {
    const cur = filterSel.value;
    filterSel.innerHTML = `<option value="">${T('Toutes catégories', 'جميع الفئات')}</option>` +
      data.categories.map(c => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c}</option>`).join('');
    filterSel.value = cur;
  }
  document.getElementById('cat-table').innerHTML = data.categories.map(c => {
    const nb = data.produits.filter(p => p.cat === c).length;
    return `<tr>
      <td><strong>${c}</strong></td>
      <td><span class="badge badge-orange">${nb} ${T('produits', 'منتجات')}</span></td>
      <td><button class="btn btn-sm btn-red" onclick="deleteCategory('${c}')">❌</button></td>
    </tr>`;
  }).join('');
}

function addCategory() {
  const val = document.getElementById('new-cat-input').value.trim();
  if (!val) { showToast('⚠️ ' + T('Veuillez remplir le champ de la catégorie', 'يرجى تعبئة حقل الفئة'), 'error'); return; }
  if (data.categories.includes(val)) { showToast('⚠️ ' + T('Catégorie déjà existante', 'الفئة موجودة مسبقاً'), 'error'); return; }
  data.categories.push(val);
  document.getElementById('new-cat-input').value = '';
  save(); renderAll(); showToast('✅ ' + T('Catégorie ajoutée', 'تمت إضافة الفئة'));
}

function deleteCategory(cat) {
  if (data.produits.some(p => p.cat === cat)) { showToast('❌ ' + T('Des produits utilisent cette catégorie', 'توجد منتجات تستخدم هذه الفئة'), 'error'); return; }
  if (!confirm(T('Supprimer "' + cat + '" ?', 'حذف "' + cat + '"؟'))) return;
  data.categories = data.categories.filter(c => c !== cat);
  save(); renderAll();
}
