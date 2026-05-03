// ===================== SHARED STATE =====================
let data = {
  produits: [],
  mouvements: [],
  categories: ['Transmission','Freins','Suspension','Électricité','Carrosserie','Roues / Pneus','Chaîne / Courroie','Filtres','Éclairage','Accessoires Vélo','Autre'],
  vehicules: [],
  ventesVehicules: [],
  marques: []
};
let editingId = null;
let mvtType = 'entree';
let saveTimer = null;
let appDataDir = '';

// ===================== IMAGE =====================
function getImageUrl(img) {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  return 'file:///' + appDataDir.replace(/\\/g, '/') + '/' + img;
}

// ===================== LOAD =====================
async function setupDataMigrations(res) {
  if (window.electronAPI && window.electronAPI.getDataDir) {
    appDataDir = await window.electronAPI.getDataDir();
  }
  if (res.success && res.data) {
    data = res.data;
    if (data.categories) {
      data.categories = data.categories.filter(c => c !== 'Moteur');
    }
    if (!data.categories) data.categories = ['Transmission','Freins','Suspension','Électricité','Carrosserie','Roues / Pneus','Chaîne / Courroie','Filtres','Éclairage','Accessoires Vélo','Autre'];
    if (!data.produits) data.produits = [];
    if (!data.mouvements) data.mouvements = [];
    if (!data.vehicules) data.vehicules = [];
    if (!data.ventesVehicules) data.ventesVehicules = [];
    if (!data.marques) data.marques = [];
    if (!data.admins) data.admins = [];

    // Migration logic for multi-admin
    if (data.adminPassword) {
      if (data.admins.length === 0) {
        data.admins.push({ id: Date.now(), name: 'Administrateur', password: data.adminPassword });
      }
      delete data.adminPassword;
      save();
    }
  }
}

// ===================== SAVE =====================
async function save() {
  document.getElementById('save-dot').classList.add('saving');
  document.getElementById('save-label').innerHTML = `<span class="lang-fr-only">Sauvegarde...</span><span class="lang-ar-only">جاري الحفظ...</span>`;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const res = await window.electronAPI.saveData(data);
    document.getElementById('save-dot').classList.remove('saving');
    if (res.success) {
      document.getElementById('save-label').innerHTML = `<span class="lang-fr-only">Sauvegardé ✓</span><span class="lang-ar-only">تم الحفظ ✓</span>`;
      window.electronAPI.autoBackup(data);
    } else {
      document.getElementById('save-label').innerHTML = `<span class="lang-fr-only">❌ Erreur sauvegarde</span><span class="lang-ar-only">❌ خطأ في الحفظ</span>`;
      showToast('❌ Erreur: ' + res.error, 'error');
    }
  }, 400);
}

// ===================== IMAGE PREVIEW =====================
function previewImage(e) {
  const file = e.target.files[0];
  if (!file) {
    document.getElementById('p-img-base64').value = '';
    document.getElementById('p-img-preview').style.display = 'none';
    return;
  }
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 400; let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const url = canvas.toDataURL('image/jpeg', 0.8);
      document.getElementById('p-img-base64').value = url;
      const prev = document.getElementById('p-img-preview');
      prev.src = url; prev.style.display = 'block';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}
