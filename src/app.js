// ===================== TEMPLATE LOADER =====================
async function loadTemplates() {
  const pages = ['dashboard','produits','mouvements','alertes','categories','export','vehicules','marques'];
  const content = document.getElementById('app-content');
  const modalsEl = document.getElementById('app-modals');

  // Load page partials in order
  for (const page of pages) {
    const res = await fetch(`pages/${page}.html`);
    const html = await res.text();
    content.insertAdjacentHTML('beforeend', html);
  }

  // Load login screen
  const loginRes = await fetch('pages/login.html');
  document.getElementById('app-login').innerHTML = await loginRes.text();

  // Load modals partials
  const modRes = await fetch('pages/modals.html');
  modalsEl.innerHTML = await modRes.text();
  const modVehRes = await fetch('pages/modals-vehicle.html');
  modalsEl.insertAdjacentHTML('beforeend', await modVehRes.text());

  // Modals must be closed explicitly via Cancel/Close buttons
  // to avoid losing form data on accidental clicks outside the modal.
}

// ===================== RENDER ALL =====================

function renderAll() {
  renderDashboard();
  renderProduits();
  renderMouvements();
  renderAlertes();
  renderCategories();
  renderVehicules();
  renderMarques();
  updateSelects();
  updateAlertBadge();
}

// ===================== NAV =====================
function showPage(page, el) {
  const pages = document.querySelectorAll('.page');
  const navItems = document.querySelectorAll('.nav-item');
  pages.forEach(p => p.classList.remove('active'));
  navItems.forEach(i => i.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (el) el.classList.add('active');
  
  const ar = document.documentElement.lang === 'ar';
  const titles = {
    dashboard: ar ? 'لوحة القيادة' : 'Tableau de bord',
    produits:  ar ? 'المنتجات'     : 'Produits & Pièces',
    mouvements:ar ? 'حركات المخزون': 'Mouvements de stock',
    alertes:   ar ? 'تنبيهات المخزون': 'Alertes stock',
    categories:ar ? 'الفئات'       : 'Catégories',
    export:    ar ? 'تصدير / استيراد': 'Export / Import',
    vehicules: ar ? 'مركبات'      : 'Véhicules',
    marques:   ar ? 'الماركات'       : 'Marques'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[page] || page;
  
  if (page === 'export' && typeof checkNeonStatus === 'function') {
    checkNeonStatus();
  }

  renderAll();
}

function showAllProducts() {
  const navItem = document.querySelector('.nav-item[onclick*="produits"]');
  showPage('produits', navItem);
}

// ===================== SIDEBAR =====================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ===================== THEME & LANG =====================
let currentTheme = localStorage.getItem('sm_theme') || 'dark';

function applyTheme() {
  document.documentElement.classList.toggle('light-mode', currentTheme === 'light');
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) btnTheme.textContent = currentTheme === 'light' ? '🌙' : '☀️';
  const menuThemeIcon = document.getElementById('menu-theme-icon');
  if (menuThemeIcon) menuThemeIcon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
}
function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('sm_theme', currentTheme);
  applyTheme();
  renderDashboard();
}

// ===================== HEADER MENU =====================
function toggleHeaderMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('header-menu');
  if (menu) menu.classList.toggle('show');
}

window.addEventListener('click', (e) => {
  const menu = document.getElementById('header-menu');
  const btn = document.getElementById('btn-header-menu');
  if (menu && menu.classList.contains('show')) {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.classList.remove('show');
    }
  }
});

// ===================== AUTHENTICATION =====================

let isManager = false;
let currentUserDisplayName = '';

async function hashPassword(str) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function initLogin() {
  if (conflictData) return; // Prioritize conflict resolution

  const loginSubtitle = document.getElementById('login-subtitle');
  const loginBtn = document.getElementById('login-btn');

  document.getElementById('login-screen').style.display = 'flex';

  if (data.admins.length === 0) {
    // First time setup - this sets the first ADMIN
    loginSubtitle.innerHTML = isAr() ? "قم بإنشاء حساب المسؤول الأول" : "Créer le premier compte Admin";
    loginBtn.innerHTML = isAr() ? "Initialiser" : "Initialiser";
  } else {
    loginSubtitle.innerHTML = isAr() ? "تسجيل الدخول مطلوب" : "Connexion requise";
    loginBtn.innerHTML = isAr() ? "تسجيل الدخول" : "Se connecter";
  }
}

async function executeLogin() {
  const userField = document.getElementById('login-user');
  const pwdField  = document.getElementById('login-pwd');
  const typedUser = userField ? userField.value.trim() : '';
  const typedPwd  = pwdField.value;

  if (!typedUser || !typedPwd) {
    showToast('⚠️ ' + T('Champs incomplets', 'حقول غير مكتملة'), 'error');
    return;
  }

  const hashedInput = await hashPassword(typedPwd);
  const defaultManagerPwd = await hashPassword('MASTER_MOTO_2026');
  const managerPwd = data.managerPassword || defaultManagerPwd;

  if (data.admins.length === 0) {
    localStorage.setItem('sm_session', JSON.stringify({ name: typedUser, isManager: false }));
    unlockApp();
    showToast('✅ ' + T('Premier compte configuré !', 'تم إعداد الحساب الأول!'));
    return;
  }

  // 1. Check Master (Case-insensitive 'master')
  if (typedUser.toLowerCase() === 'master') {
    if (hashedInput === managerPwd || typedPwd === 'MASTER_MOTO_2026') {
      isManager = true;
      currentUserDisplayName = 'MASTER';
      localStorage.setItem('sm_session', JSON.stringify({ name: 'MASTER', isManager: true }));
      unlockApp();
      showToast('🛡️ ' + T('Mode Manager activé', 'تم تفعيل وضع المدير'));
    } else {
      showToast('❌ ' + T('Mot de passe incorrect', 'كلمة مرور خاطئة'), 'error');
    }
    return;
  }

  // 2. Check Admins (Case-insensitive name match)
  const matchedAdmin = data.admins.find(a => 
    a.name.toLowerCase() === typedUser.toLowerCase() && 
    (hashedInput === a.password || typedPwd === a.password)
  );

  if (matchedAdmin) {
    if (typedPwd === matchedAdmin.password) { matchedAdmin.password = hashedInput; save(); }
    isManager = false;
    currentUserDisplayName = matchedAdmin.name;
    localStorage.setItem('sm_session', JSON.stringify({ name: matchedAdmin.name, isManager: false }));
    unlockApp();
    showToast('👋 ' + T(`Bonjour, ${matchedAdmin.name}`, `مرحباً ، ${matchedAdmin.name}`));
  } else {
    showToast('❌ ' + T('Utilisateur ou mot de passe incorrect', 'المستخدم أو كلمة المرور خاطئة'), 'error');
  }
}

function unlockApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
  document.getElementById('login-pwd').value = '';
  
  // Show/Hide sensitive settings based on Manager role
  const neonSection = document.getElementById('neon-sync-section');
  if (neonSection) {
    neonSection.style.display = isManager ? 'block' : 'none';
  }

  // Hide local data path for normal admins
  const dataPathLabel = document.getElementById('data-path-label');
  if (dataPathLabel) {
    dataPathLabel.style.display = isManager ? 'block' : 'none';
  }

  // Hide "Ouvrir le dossier" button in Export page for normal admins
  const exportPathContainer = document.querySelector('#page-export .card:nth-of-type(2)'); // The card containing "Où sont vos données ?"
  // Actually it's better to just hide the button and the path display specifically
  const openFolderBtn = document.querySelector('button[onclick="openFolder()"]');
  const pathDisplay = document.getElementById('export-path-display');
  
  if (!isManager) {
    if (openFolderBtn) openFolderBtn.style.display = 'none';
    if (pathDisplay) pathDisplay.style.display = 'none';
  } else {
    if (openFolderBtn) openFolderBtn.style.display = 'block';
    if (pathDisplay) pathDisplay.style.display = 'block';
  }

  // Hide Password Change & Admin Manager for normal admins
  const pwdMenuItem = document.getElementById('menu-item-password');
  const adminMenuItem = document.getElementById('menu-item-admins');
  if (pwdMenuItem) pwdMenuItem.style.display = isManager ? 'flex' : 'none';
  if (adminMenuItem) adminMenuItem.style.display = isManager ? 'flex' : 'none';

  // Update role badge in sidebar
  const roleBadge = document.getElementById('user-role-badge');
  if (roleBadge) {
    const icon = isManager ? '🛡️' : '👤';
    const roleText = isManager ? T('MASTER', 'المدير') : T('ADMIN', 'مسؤول');
    roleBadge.textContent = `${icon} ${roleText}: ${currentUserDisplayName}`;
    
    if (isManager) {
      roleBadge.style.background = 'rgba(139,92,246,0.15)';
      roleBadge.style.color = '#a78bfa';
      roleBadge.style.border = '1px solid rgba(139,92,246,0.3)';
    } else {
      roleBadge.style.background = 'rgba(59,130,246,0.15)';
      roleBadge.style.color = '#60a5fa';
      roleBadge.style.border = '1px solid rgba(59,130,246,0.3)';
    }
  }

  renderAll();
}

function openChangePassword() {
  document.getElementById('old-pwd').value = '';
  document.getElementById('new-pwd').value = '';
  document.getElementById('confirm-pwd').value = '';
  document.getElementById('modal-password').classList.add('open');
}

async function saveNewPassword() {
  const oldPwd = document.getElementById('old-pwd').value;
  const newPwd = document.getElementById('new-pwd').value;
  const confirmPwd = document.getElementById('confirm-pwd').value;

  if (!oldPwd || !newPwd || !confirmPwd) {
    showToast('⚠️ ' + T('Veuillez remplir tous les champs', 'الرجاء ملء جميع الحقول'), 'error');
    return;
  }

  // 1. Verify Old Password
  const hashedOld = await hashPassword(oldPwd);
  const currentStored = isManager ? data.managerPassword : data.adminPassword;
  
  if (hashedOld !== currentStored && oldPwd !== currentStored) {
    showToast('❌ ' + T('Ancien mot de passe incorrect', 'كلمة المرور القديمة خاطئة'), 'error');
    return;
  }

  // 2. Validate New Password
  if (newPwd !== confirmPwd) {
    showToast('❌ ' + T('Les nouveaux mots de passe ne correspondent pas', 'كلمات المرور الجديدة غير متطابقة'), 'error');
    return;
  }

  if (newPwd.length < 4) {
    showToast('⚠️ ' + T('Le mot de passe doit faire au moins 4 caractères', 'يجب أن تتكون كلمة المرور من 4 أحرف على الأقل'), 'error');
    return;
  }

  // 3. Save
  const hashedNew = await hashPassword(newPwd);
  if (isManager) {
    data.managerPassword = hashedNew;
    showToast('✅ ' + T('Mot de passe MANAGER mis à jour', 'تم تحديث كلمة مرور المدير'));
  } else {
    data.adminPassword = hashedNew;
    showToast('✅ ' + T('Mot de passe UTILISATEUR mis à jour', 'تم تحديث كلمة مرور المستخدم'));
  }
  
  save();
  closeModal('modal-password');
}

// ===================== ADMIN MANAGEMENT =====================
function openAdminManager() {
  renderAdminList();
  document.getElementById('modal-admin-manager').classList.add('open');
}

function renderAdminList() {
  const tb = document.getElementById('admin-list-table');
  if (!tb) return;
  tb.innerHTML = (data.admins || []).map(a => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px">${a.name}</td>
      <td style="padding:10px; text-align:right">
        <button class="btn btn-sm btn-ghost" onclick="resetAdminPassword(${a.id})" title="Réinitialiser le mot de passe">🔑</button>
        <button class="btn btn-sm btn-ghost" onclick="deleteAdmin(${a.id})" title="Supprimer" style="color:var(--red); margin-left:5px">❌</button>
      </td>
    </tr>
  `).join('');
}

function openAddAdmin() {
  document.getElementById('add-admin-name').value = '';
  document.getElementById('add-admin-pwd').value = '';
  document.getElementById('modal-add-admin').classList.add('open');
}

async function confirmAddAdmin() {
  const name = document.getElementById('add-admin-name').value.trim();
  const pwd = document.getElementById('add-admin-pwd').value;
  
  if (!name) { flashError('add-admin-name'); return; }
  if (!pwd) { flashError('add-admin-pwd'); return; }

  const hashed = await hashPassword(pwd);
  data.admins.push({ id: Date.now(), name: name, password: hashed });
  save();
  renderAdminList();
  closeModal('modal-add-admin');
  showToast('✅ ' + T('Admin ajouté', 'تم إضافة المسؤول'));
}

function resetAdminPassword(id) {
  const admin = data.admins.find(a => a.id == id);
  if (!admin) return;
  document.getElementById('reset-admin-id').value = id;
  document.getElementById('reset-admin-name').textContent = admin.name;
  document.getElementById('reset-admin-pwd-input').value = '';
  document.getElementById('modal-reset-admin-pwd').classList.add('open');
}

async function confirmResetAdminPassword() {
  const id = document.getElementById('reset-admin-id').value;
  const newPwd = document.getElementById('reset-admin-pwd-input').value;
  if (!newPwd) {
    showToast('⚠️ ' + T('Mot de passe vide', 'كلمة مرور فارغة'), 'error');
    return;
  }
  const admin = data.admins.find(a => a.id == id);
  if (admin) {
    admin.password = await hashPassword(newPwd);
    save();
    closeModal('modal-reset-admin-pwd');
    showToast('✅ ' + T('Mot de passe réinitialisé', 'تم إعادة تعيين كلمة المرور'));
  }
}

function deleteAdmin(id) {
  if (data.admins.length <= 1) {
    showToast('⚠️ ' + T('Impossible de supprimer le dernier admin', 'لا يمكن حذف آخر مسؤول'), 'error');
    return;
  }
  if (confirm(T('Supprimer cet administrateur ?', 'هل تريد حذف هذا المسؤول؟'))) {
    data.admins = data.admins.filter(a => a.id != id);
    save();
    renderAdminList();
    showToast('✅ ' + T('Admin supprimé', 'تم حذف المسؤول'));
  }
}

function logout() {
  isManager = false;
  localStorage.removeItem('sm_session');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-pwd').value = '';
  initLogin();
}

let lastSyncStatus = 'offline';

function updateSyncStatusDot(status) {
  const dot = document.getElementById('sync-status-dot');
  const sideDot = document.getElementById('sync-status-sidebar-dot');
  const sideLabel = document.getElementById('sync-status-sidebar-label');
  
  if (status === 'online') {
    const onlineColor = '#2ecc71';
    const onlineText = T('Sync Cloud: OK', 'مزامنة السحاب: ناجحة');
    if (dot) { dot.style.background = onlineColor; dot.title = onlineText; }
    if (sideDot) sideDot.style.background = onlineColor;
    if (sideLabel) sideLabel.textContent = onlineText;
  } else if (status === 'error') {
    const errorColor = '#f1c40f';
    const errorText = T('Sync Cloud: Erreur', 'مزامنة السحاب: خطأ');
    if (dot) { dot.style.background = errorColor; dot.title = errorText; }
    if (sideDot) sideDot.style.background = errorColor;
    if (sideLabel) sideLabel.textContent = errorText;
    
    // Notify user on transition to error
    if (lastSyncStatus !== 'error') {
      showToast('⚠️ ' + T('Problème de synchronisation Cloud', 'مشكلة في المزامنة السحابية'), 'warning');
    }
  } else {
    const offlineColor = '#7f8c8d';
    const offlineText = T('Sync Cloud: Non connecté', 'مزامنة السحاب: غير متصل');
    if (dot) { dot.style.background = offlineColor; dot.title = offlineText; }
    if (sideDot) sideDot.style.background = offlineColor;
    if (sideLabel) sideLabel.textContent = offlineText;
  }
  
  // Also update the Export page if it's currently open
  const neonStatusEl = document.getElementById('neon-status');
  if (neonStatusEl) {
    if (status === 'online') {
      neonStatusEl.innerHTML = '✅ <span style="color:#2ecc71">' + T('Synchronisation active', 'المزامنة نشطة') + '</span>';
    } else if (status === 'error') {
      neonStatusEl.innerHTML = '⚠️ <span style="color:#f1c40f">' + T('Erreur de connexion Cloud', 'خطأ في الاتصال بالسحابة') + '</span>';
    } else {
      neonStatusEl.innerHTML = '❌ <span style="color:#7f8c8d">' + T('Hors-ligne / Désactivé', 'غير متصل / ملغى') + '</span>';
    }
  }

  lastSyncStatus = status;
}

async function initSyncStatus() {
  if (window.electronAPI && window.electronAPI.onSyncStatus) {
    window.electronAPI.onSyncStatus((status) => updateSyncStatusDot(status));
    
    // Get initial status
    const initialStatus = await window.electronAPI.getSyncStatus();
    updateSyncStatusDot(initialStatus);

    // Refresh on window focus (feels instant)
    window.addEventListener('focus', () => {
      window.electronAPI.forceSyncCheck();
    });

    // Refresh on click of dots
    const dots = ['sync-status-dot', 'sync-status-sidebar-dot'];
    dots.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          showToast(T('Vérification de la connexion...', 'جاري التحقق من الاتصال...'));
          window.electronAPI.forceSyncCheck();
        });
      }
    });
  }
}

// ===================== INIT =====================
initSyncStatus();
let conflictData = null;

async function load() {
  const res = await window.electronAPI.loadData();
  if (res.success) {
    if (res.path === 'CONFLICT') {
      conflictData = res;
      showConflictModal(res.localData, res.cloudData);
      return;
    }
    
    if (typeof setupDataMigrations === 'function') {
      await setupDataMigrations(res);
    } else {
      data = res.data || data;
    }

    if (res.path && res.path !== 'CONFLICT') {
      const pathLabel = document.getElementById('data-path-label');
      if (pathLabel) {
        // Obtenir juste le nom du fichier (par exemple data.json)
        const parts = res.path.split(/[\\/]/);
        const filename = parts[parts.length - 1] || res.path;
        pathLabel.textContent = '📁 ' + filename;
        pathLabel.title = res.path; // Show full path on hover
      }
      const el = document.getElementById('export-path-display');
      if (el) el.textContent = res.path;
    }

    renderAll();
    checkSession();
  } else {
    showToast('❌ Erreur: ' + res.error, 'error');
    initLogin();
  }
}

function showConflictModal(local, cloud) {
  const localInfo = document.getElementById('conflict-local-info');
  const cloudInfo = document.getElementById('conflict-cloud-info');
  
  if (localInfo) {
    localInfo.innerHTML = `
      • ${local.produits?.length || 0} ${T('Produits', 'منتجات')}<br>
      • ${local.vehicules?.length || 0} ${T('Véhicules', 'مركبات')}<br>
      • ${local.mouvements?.length || 0} ${T('Mouvements', 'حركات')}
    `;
  }
  
  if (cloudInfo) {
    cloudInfo.innerHTML = `
      • ${cloud.produits?.length || 0} ${T('Produits', 'منتجات')}<br>
      • ${cloud.vehicules?.length || 0} ${T('Véhicules', 'مركبات')}<br>
      • ${cloud.mouvements?.length || 0} ${T('Mouvements', 'حركات')}
    `;
  }
  
  document.getElementById('modal-conflict').classList.add('open');
}

function hideConflictModal() {
  document.getElementById('modal-conflict').classList.remove('open');
}

async function resolveDataConflict(choice) {
  if (!conflictData) return;
  const chosenData = choice === 'local' ? conflictData.localData : conflictData.cloudData;
  const overwriteCloud = choice === 'local';
  data = chosenData;
  renderAll();
  hideConflictModal();
  
  showToast(overwriteCloud
    ? T('Mise à jour du cloud avec les données locales...', 'جاري تحديث السحابة بالبيانات المحلية...')
    : T('Sync en cours...', 'جاري المزامنة...'));
  document.getElementById('save-dot').classList.add('saving');
  document.getElementById('save-label').innerHTML = `<span class="lang-fr-only">Sync en cours...</span><span class="lang-ar-only">جاري المزامنة...</span>`;

  try {
    const res = await window.electronAPI.saveData(data, { waitForCloud: overwriteCloud });
    if (res.success) {
      if (res.warning) {
        showToast('⚠️ ' + T('Cloud désactivé: sauvegarde locale uniquement', 'السحابة معطلة: تم الحفظ محليا فقط'), 'warning');
      } else {
        showToast('✅ ' + (overwriteCloud
          ? T('Cloud mis à jour avec les données locales', 'تم تحديث السحابة بالبيانات المحلية')
          : T('Données synchronisées', 'تمت مزامنة البيانات')));
      }
      document.getElementById('save-label').innerHTML = `<span class="lang-fr-only">Sauvegardé ✓</span><span class="lang-ar-only">تم الحفظ ✓</span>`;
    } else {
      showToast('❌ Erreur sync: ' + res.error, 'error');
    }
  } catch (e) {
    showToast('❌ Erreur sync: ' + e.message, 'error');
  }
  
  document.getElementById('save-dot').classList.remove('saving');
  conflictData = null;
  checkSession();
}

function checkSession() {
  if (conflictData) return; // Don't show login if resolution needed

  const sessionRaw = localStorage.getItem('sm_session');
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      if (session.name === 'MASTER') {
        isManager = true;
        currentUserDisplayName = 'MASTER';
        unlockApp();
      } else {
        const adminFound = (data.admins || []).find(a => a.name === session.name);
        if (adminFound) {
          isManager = false;
          currentUserDisplayName = adminFound.name;
          unlockApp();
        } else {
          localStorage.removeItem('sm_session');
          initLogin();
        }
      }
    } catch (e) {
      localStorage.removeItem('sm_session');
      initLogin();
    }
  } else {
    initLogin();
  }
}

applyTheme();
applyLanguage();
loadTemplates().then(() => {
  load();
});
