// ===================== i18n — Language Management =====================
let currentLang = localStorage.getItem('sm_lang') || 'fr';

/** Returns true if current language is Arabic */
const isAr = () => document.documentElement.lang === 'ar';

/** Translate helper: returns Arabic string when AR, French otherwise */
function T(fr, ar) { return isAr() ? ar : fr; }

/** Apply the current language to the document */
function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir  = currentLang === 'ar' ? 'rtl' : 'ltr';
  const btn = document.getElementById('btn-lang');
  if (btn) btn.textContent = currentLang === 'ar' ? 'Français' : 'عربي';
}

/** Toggle between French and Arabic and persist to localStorage */
function toggleLanguage() {
  currentLang = currentLang === 'fr' ? 'ar' : 'fr';
  localStorage.setItem('sm_lang', currentLang);
  applyLanguage();
  if (typeof renderAll === 'function') renderAll();
}
