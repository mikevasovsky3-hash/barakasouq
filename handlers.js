/* ================= EVENT HANDLERS & APP CONTROLLER ================= */

// Реестр локально удаленных ID для защиты от возврата при обновлении
function getDeletedAdsList() {
  try {
    return JSON.parse(localStorage.getItem('bs_deleted_ad_ids') || '[]');
  } catch(e) { return []; }
}

function markAdDeletedLocally(adId) {
  try {
    const list = getDeletedAdsList();
    if (!list.includes(adId)) {
      list.push(adId);
      localStorage.setItem('bs_deleted_ad_ids', JSON.stringify(list));
    }
  } catch(e) {}
}

function showToast(message, type = 'info') { 
  const c = byId('toast-container'); 
  if (!c) return; 
  const t = document.createElement('div'); 
  let icon = 'fa-circle-info'; 
  if (type === 'success') icon = 'fa-circle-check'; 
  if (type === 'error') icon = 'fa-circle-xmark'; 
  if (type === 'warning') icon = 'fa-triangle-exclamation'; 
  t.className = 'px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 pointer-events-auto shadow-xl'; 
  t.style.cssText = 'background:#262626;color:#fff;animation:cardIn .25s ease'; 
  t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`; 
  c.appendChild(t); 
  setTimeout(() => { 
    t.style.opacity = '0'; 
    t.style.transition = 'opacity .3s'; 
    setTimeout(() => t.remove(), 320); 
  }, 3200); 
}

function showConfirmModal(title, msg, onConfirm) { 
  byId('confirm-modal-title').innerText = title; 
  byId('confirm-modal-msg').innerText = msg; 
  openModal('modal-confirm'); 
  const ok = byId('confirm-btn-ok'), cancel = byId('confirm-btn-cancel'); 
  const clean = () => { closeModal('modal-confirm'); ok.onclick = null; cancel.onclick = null; }; 
  cancel.onclick = clean; 
  ok.onclick = () => { clean(); if (typeof onConfirm === 'function') onConfirm(); }; 
}

function openModal(id) { 
  const m = byId(id); 
  if (!m) return; 
  m.classList.remove('hidden'); 
  if (!modalStack.includes(id)) modalStack.push(id); 
  m.style.zIndex = String(500 + modalStack.indexOf(id) * 30); 
  document.body.classList.add('overflow-hidden'); 
  try { history.pushState({ appModal: id }, ''); } catch (e) {} 
}

function closeModal(id) { 
  const m = byId(id); 
  if (m) m.classList.add('hidden'); 
  if (id === 'modal-ad-detail' && typeof detailMap !== 'undefined' && detailMap) {
    try { detailMap.remove(); detailMap = null; } catch(e) {}
  }
  if (id === 'modal-create-ad' && typeof createMap !== 'undefined' && createMap) {
    try { createMap.remove(); createMap = null; createMarker = null; } catch(e) {}
  }
  if (id === 'modal-shop-showcase' && typeof showcaseMap !== 'undefined' && showcaseMap) {
    try { showcaseMap.remove(); showcaseMap = null; } catch(e) {}
  }
  const wasTop = modalStack[modalStack.length - 1] === id; 
  modalStack = modalStack.filter(x => x !== id); 
  if (modalStack.length === 0) document.body.classList.remove('overflow-hidden'); 
  if (wasTop && history.state && history.state.appModal === id) { 
    suppressPop = true; 
    try { history.back(); } catch (e) {} 
  } 
}

window.addEventListener('popstate', function () {
  if (suppressPop) { suppressPop = false; return; }
  if (modalStack.length) {
    const top = modalStack[modalStack.length - 1];
    if (top === 'modal-rules-agreement') return;
    const m = byId(top); if (m) m.classList.add('hidden');
    modalStack.pop();
    if (modalStack.length === 0) document.body.classList.remove('overflow-hidden');
  }
});

function restoreUserSession() { 
  try { 
    const favs = localStorage.getItem('bs_favorites');
    if (favs) {
      favorites = JSON.parse(favs);
    }
  } catch (e) {
    favorites = [];
  }

  try { 
    const s = localStorage.getItem('bs_current_user') || sessionStorage.getItem('bs_current_user'); 
    if (s) { 
      const p = JSON.parse(s); 
      const isArchived = archivedUsers.some(u => (u.uid && p.uid && u.uid === p.uid) || (u.username && p.username && u.username.toLowerCase() === p.username.toLowerCase()));
      if (isArchived) {
        currentUser = null;
        localStorage.removeItem('bs_current_user');
        sessionStorage.removeItem('bs_current_user');
        updateAuthUI();
        return;
      }
      currentUser = users.find(u => u.username && p.username && u.username.toLowerCase() === p.username.toLowerCase()) || p; 
      if (currentUser && Array.isArray(currentUser.favorites)) {
        favorites = [...new Set([...(Array.isArray(favorites) ? favorites : []), ...currentUser.favorites])];
        try { localStorage.setItem('bs_favorites', JSON.stringify(favorites)); } catch (err) {}
      }
    } 
  } catch (e) {} 
  updateAuthUI(); 
}

function saveUserSession(user, remember = true) { 
  currentUser = user; 
  try { 
    if (remember) { 
      localStorage.setItem('bs_current_user', JSON.stringify(user)); 
      sessionStorage.removeItem('bs_current_user'); 
    } else { 
      sessionStorage.setItem('bs_current_user', JSON.stringify(user)); 
      localStorage.removeItem('bs_current_user'); 
    } 
  } catch (e) {} 
  updateAuthUI(); 
}

function updateAuthUI() { updateNavState(); renderCategoryPills(); renderAds(); }

function handleNavClick(tab) { 
  LAST_NAV = tab; 
  if (tab === 'home') { selectedCategory = 'all'; resetPageAndRender(); } 
  else if (tab === 'shops') { selectedCategory = 'shops_dir'; resetPageAndRender(); } 
else if (tab === 'create') { 
    openCreateAdModal(); 
  }
  else if (tab === 'favorites') { selectedCategory = 'favorites'; resetPageAndRender(); } 
  else if (tab === 'profile') { 
    if (!currentUser) openAuthModal(); 
    else openProfileModal(); 
  } 
  updateNavState(); 
}

function updateNavState() {
  const map = { home: 'home', shops: 'shops', create: 'create', favorites: 'fav', profile: 'profile' };
  const active = map[LAST_NAV] || 'home';
  const navTitles = {
    home: t('Главная'),
    shops: t('Магазины'),
    create: t('Создать'),
    fav: t('Избранное'),
    profile: t('Профиль')
  };
  const iconFor = key => key === 'home' ? IGSVG.home(active === 'home') : key === 'shops' ? IGSVG.store(active === 'shops') : key === 'create' ? IGSVG.plusSq() : key === 'fav' ? IGSVG.star(active === 'fav') : '';
  [['sb-home', 'bn-home', 'home'], ['sb-shops', 'bn-shops', 'shops'], ['sb-create', 'bn-create', 'create'], ['sb-fav', 'bn-fav', 'fav']].forEach(([sb, bn, key]) => {
    const s = byId(sb), b = byId(bn);
    if (s) { 
      s.querySelector('.nav-ic').innerHTML = iconFor(key); 
      const lbl = s.querySelector('.nav-label');
      if (lbl) lbl.innerText = navTitles[key];
      s.classList.toggle('font-bold', active === key); 
    }
    if (b) b.querySelector('.nav-ic').innerHTML = iconFor(key);
  });
  const spLabel = byId('sb-profile')?.querySelector('.nav-label');
  if (spLabel) spLabel.innerText = navTitles.profile;

if (typeof translateStaticUI === 'function') {
    translateStaticUI(currentLang);
  }
  const devSpan = byId('ft-dev-label')?.nextElementSibling?.querySelector('span');
  if (devSpan) {
    if (currentLang === 'ar') {
      translateDynamic('Салим Нашхо', 'ar').then(res => { devSpan.innerText = res; });
    } else {
      devSpan.innerText = 'Салим Нашхо';
    }
  }

  const sortLbl = byId('current-sort-label');
  if (sortLbl) {
    const sortLabels = { newest: 'Новые', cheapest: 'Дешевые', expensive: 'Дорогие', popular: 'Популярные' };
    sortLbl.innerText = t(sortLabels[currentSortMode] || 'Новые');
  }

  const currentMarqueeRaw = localStorage.getItem(MARQUEE_STORAGE_KEY) || MARQUEE_SETTINGS.text || '🔥 Добро пожаловать на Avito Sham! • 🇸🇾 Лучшая доска объявлений Сирии • 💰 Курсы валют обновляются автоматически • 🚀 Создавайте магазины и продавайте быстрее • ✨ Поддержите проект через AvitoCash • 🔍 Ищите товары, услуги и недвижимость по всей стране';
  updateMarqueeText(currentMarqueeRaw);

  const avHtml = (currentUser && currentUser.avatar) ? `<img src="${currentUser.avatar}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-xs t2"></i>`;
  const sp = byId('sb-profile'), bp = byId('bn-profile-ic');
  if (sp) { sp.querySelector('.nav-ic').innerHTML = `<span class="w-6 h-6 rounded-full overflow-hidden border b-ig bg-field flex items-center justify-center" style="${active === 'profile' ? 'border-color:#f59e0b' : ''}">${avHtml}</span>`; sp.classList.toggle('font-bold', active === 'profile'); }
  if (bp) { bp.innerHTML = avHtml; if (active === 'profile') bp.style.borderColor = '#f59e0b'; else bp.style.borderColor = ''; }
}

function checkExpiredAdsStatus() {
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const expiredIds = [];

  ads.forEach(a => {
    if (a.status === 'ACTIVE' && a.createdAt && (now - a.createdAt > THIRTY_DAYS)) {
      a.status = 'EXPIRED';
      expiredIds.push(a.id);
    }
  });

  if (expiredIds.length > 0) {
    saveCachedAds();
    if (supabaseClient) {
      supabaseClient.from('ads').update({ status: 'EXPIRED' }).in('id', expiredIds).then().catch(err => {
        console.warn('Batch expiry sync warning:', err);
      });
    }
  }
}

async function renewAdExpiry(adId) {
  const ad = ads.find(a => a.id === adId);
  if (!ad || !currentUser) return;

  ad.createdAt = Date.now();
  ad.status = 'ACTIVE';

  if (supabaseClient) {
    await supabaseClient.from('ads').update({ created_at: ad.createdAt, status: 'ACTIVE' }).eq('id', ad.id);
  }

  saveCachedAds();
  renderAds();
  renderCategoryPills();
  openProfileModal();
  showToast(t('Объявление успешно продлено и поднято в топ!'), 'success');
}

async function bumpAdToTop(adId) {
  const ad = ads.find(a => a.id === adId);
  if (!ad || !currentUser) return;

  ad.createdAt = Date.now();
  if (supabaseClient) {
    await supabaseClient.from('ads').update({ created_at: ad.createdAt }).eq('id', ad.id);
  }

  // Перемещаем в начало локального массива
  ads = [ad, ...ads.filter(a => a.id !== adId)];
  saveCachedAds();
  renderAds();
  openProfileModal();
  showToast('🚀 Объявление поднято на первое место в ленте!', 'success');
}

// Универсальная нормализация для русского, английского и арабского языков
function normalizeArabicText(str) {
  if (!str || typeof str !== 'string') return '';
  const isArabic = /[\u0600-\u06FF]/.test(str);
  if (!isArabic) {
    return str.toLowerCase().trim();
  }
  return str
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىيئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .trim();
}

function checkUrlHashAdOpen() {
	const hash = window.location.hash || '';
  if (hash.startsWith('#ad-')) {
    const targetAdId = hash.replace('#ad-', '').trim();
    if (targetAdId) {
      setTimeout(() => {
        const targetAd = (typeof ads !== 'undefined' ? ads.find(a => a.id === targetAdId) : null) || 
                         (typeof combos !== 'undefined' ? combos.find(c => c.id === targetAdId) : null);
        if (targetAd && typeof openAdDetail === 'function') {
          openAdDetail(targetAdId);
        }
      }, 150);
    }
  }
}

function requestPushPermission() {
  if (!('Notification' in window)) return;
  if (localStorage.getItem('bs_push_asked')) return;
  if (Notification.permission === 'default') {
    localStorage.setItem('bs_push_asked', 'true');
    Notification.requestPermission();
  } else {
    localStorage.setItem('bs_push_asked', 'true');
  }
}

function sendBrowserPush(title, body, icon = null) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body: body,
      icon: icon || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%230095f6\'/%3E%3Ctext x=\'50\' y=\'68\' font-family=\'Arial\' font-weight=\'900\' font-size=\'56\' fill=\'%23ffffff\' text-anchor=\'middle\'%3EA%3C/text%3E%3C/svg%3E',
      badge: icon
    });
    if (typeof playNotificationSound === 'function') {
      playNotificationSound();
    }
  } catch(e) {}
}

function checkFavoritesAndQueueAlerts(oldAd, newAd) {
  if (!currentUser) return;
  if (favorites.includes(newAd.id)) {
    const oldP = adToUSD(oldAd);
    const newP = adToUSD(newAd);
    if (newP < oldP && newP > 0) {
      sendBrowserPush(`🔥 ${t('Снижение цены!')}`, `${t('Цена на товар из избранного снижена до')} $${newP.toFixed(2)}: ${newAd.title}`);
    }
  }
  if (Array.isArray(newAd.queue) && Array.isArray(oldAd.queue)) {
    const oldRank = oldAd.queue.findIndex(q => q.username === currentUser.username) + 1;
    const newRank = newAd.queue.findIndex(q => q.username === currentUser.username) + 1;
    if (oldRank > 1 && newRank === 1) {
      sendBrowserPush(`🎉 ${t('Ваша очередь подошла!')}`, `${t('Вы стали первым в очереди на')} "${newAd.title}". ${t('Свяжитесь с продавцом!')}`);
    }
  }
}

async function processAvatarUpload(e, mode = 'auth') { 
  const f = e.target.files[0]; 
  if (!f) return; 
  try { 
    const d = await processSquareImageCrop(f, 250); 
    byId(mode === 'auth' ? 'auth-avatar-data' : 'edit-profile-avatar-data').value = d; 
    const box = byId(mode === 'auth' ? 'auth-avatar-preview-box' : 'edit-profile-avatar-preview-box'); 
    const img = byId(mode === 'auth' ? 'auth-avatar-preview-img' : 'edit-profile-avatar-preview-img'); 
    if (box && img) { img.src = d; box.classList.remove('hidden'); } 
  } catch (err) { 
    console.warn('Avatar processing error:', err); 
    showToast('Не удалось обработать аватарку', 'error'); 
  } 
}

async function handleMultiImageCompressUpload(e, mode = 'create') {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const arr = mode === 'create' ? pendingCreateImages : pendingEditImages;
  const slots = 6 - arr.length;
  if (slots <= 0) { showToast('Максимум 6 фотографий!', 'warning'); return; }

  if (!supabaseClient) {
    showToast('Нет соединения с базой данных', 'error');
    return;
  }

  showToast(`Загрузка ${Math.min(files.length, slots)} фото в облако...`, 'info');

for (const f of files.slice(0, slots)) {
    try {
      const compressedFile = await compressSingleImageFile(f, 800, 800, 0.75);
      const filePath = `public/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
	  
const { error: sbErr } = await supabaseClient.storage
        .from('listings')
        .upload(filePath, compressedFile, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false
        });
		
      if (sbErr) throw sbErr;

      const { data: pubData } = supabaseClient.storage
        .from('listings')
        .getPublicUrl(filePath);

      if (pubData && pubData.publicUrl) {
        arr.push(pubData.publicUrl);
        renderPhotoThumbnailsGrid(mode);
      }
    } catch (err) {
      console.error('Upload critical error:', err);
      showToast('Ошибка загрузки фото в хранилище Supabase', 'error');
      e.target.value = '';
      return;
    }
  }
  e.target.value = '';
}

function removePendingPhoto(mode, index) { 
  (mode === 'create' ? pendingCreateImages : pendingEditImages).splice(index, 1); 
  renderPhotoThumbnailsGrid(mode); 
}

async function processShopLogoUpload(e) { 
  const f = e.target.files[0]; 
  if (!f) return; 
  try { 
    const d = await processSquareImageCrop(f, 300); 
    byId('shop-logo-data').value = d; 
    byId('shop-logo-preview-img').src = d; 
    byId('shop-logo-preview-box').classList.remove('hidden'); 
  } catch (err) {} 
}

function openSupportModal() { 
  const titleEl = byId('support-modal-title');
  const descEl = byId('support-modal-desc');
  const idLbl = byId('support-modal-idlabel');
  const copySpan = byId('support-modal-copybtn')?.querySelector('span');

  if (titleEl) titleEl.innerText = t('Поддержка сервера — ShamCash');
  if (descEl) descEl.innerText = t('Отсканируйте QR-код в приложении ShamCash, чтобы оплатить и поддержать платформу Авито Шам.');
  if (idLbl) idLbl.innerText = t('ID счёта ShamCash');
  if (copySpan) copySpan.innerText = t('Скопировать ID');

  openModal('modal-shamcash-qr'); 
  setTimeout(renderSupportQR, 60); 
  setTimeout(renderSupportQR, 200); 
}

function copyShamCashCode() { 
  const done = () => showToast('ID код ShamCash скопирован!', 'success'); 
  if (navigator.clipboard) navigator.clipboard.writeText(AVITOCASH_ID).then(done).catch(() => fallbackCopy(AVITOCASH_ID, done)); 
  else fallbackCopy(AVITOCASH_ID, done); 
}

function fallbackCopy(text, cb) { 
  const i = document.createElement('input'); 
  i.value = text; 
  document.body.appendChild(i); 
  i.select(); 
  document.execCommand('copy'); 
  i.remove(); 
  if (cb) cb(); 
}

async function shareAd(adId) {
  const ad = (typeof getListingById === 'function') ? getListingById(adId) : (ads.find(a => a.id === adId) || combos.find(x => x.id === adId)); if (!ad) return;
  const base = (location.origin && location.origin !== 'null') ? location.origin + location.pathname : location.href.split('#')[0];
  const url = base + '#ad-' + ad.id;
  sharePayload = { title: ad.title, text: `${ad.title} — Авито Шам (Сирия)`, url: url };
const state = byId('share-preview-state'), preview = byId('share-preview-wrap');
  if (state) { state.innerText = t('Генерируем красивую карточку...'); state.classList.remove('hidden'); }
  if (preview) preview.classList.add('hidden');
  openShareSheet();
  showToast(t('Генерация красивой карточки…'), 'info');
  const blob = await generateShareImage(ad);
  lastShareBlob = blob;
  if (lastShareObjectUrl) { URL.revokeObjectURL(lastShareObjectUrl); lastShareObjectUrl = null; }
  if (blob) {
    lastShareObjectUrl = URL.createObjectURL(blob);
    const img = byId('share-preview-image');
    if (img) img.src = lastShareObjectUrl;
    if (preview) preview.classList.remove('hidden');
    if (state) state.classList.add('hidden');
  } else if (state) {
    state.innerText = t('Не удалось создать карточку. Можно отправить ссылку.');
    showToast(t('Не удалось создать карточку, ссылка доступна ниже'), 'warning');
  }
  updateShareActions();
}

function updateShareActions() {
  const sys = byId('share-system');
  if (!sys) return;
  const file = lastShareBlob ? new File([lastShareBlob], 'avito-sham-card.jpg', { type: 'image/jpeg' }) : null;
  const canShareFile = !!(file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
  if (navigator.share) { sys.classList.remove('hidden'); sys.classList.add('flex'); } else { sys.classList.add('hidden'); sys.classList.remove('flex'); }
  sys.disabled = !canShareFile && !navigator.share;
}

async function shareImageToApp(app) {
  if (!lastShareBlob) { showToast(t('Сначала нажмите "Поделиться", чтобы создать картинку'), 'warning'); return; }
  const file = new File([lastShareBlob], 'avito-sham-card.jpg', { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: sharePayload.title, text: sharePayload.text + ' ' + sharePayload.url });
      closeModal('modal-share');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('Share failed', err);
    }
  }
  showToast(t('Браузер не поддерживает отправку файлов, открываю ссылку...'), 'warning');
  const enc = encodeURIComponent;
  const u = sharePayload.url, tx = sharePayload.text;
  let link = '';
  if (app === 'whatsapp') link = `https://wa.me/?text=${enc(tx + ' ' + u)}`;
  else if (app === 'telegram') link = `https://t.me/share/url?url=${enc(u)}&text=${enc(tx)}`;
  else if (app === 'viber') link = `viber://forward?text=${enc(tx + ' ' + u)}`;
  if (link) window.open(link, '_blank');
}

async function downloadShareCard() {
  if (!lastShareBlob) { showToast(t('Карточка еще не готова — нажмите Поделиться сначала'), 'warning'); return; }
  const file = new File([lastShareBlob], 'avito-sham-card.jpg', { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Avito Sham Card' });
      closeModal('modal-share');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  try {
    const reader = new FileReader();
    reader.onloadend = function() {
      const link = document.createElement('a');
      link.href = reader.result;
      link.download = 'avito-sham-card.jpg';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(t('Красивая карточка скачана'), 'success');
      closeModal('modal-share');
    };
    reader.readAsDataURL(lastShareBlob);
    closeModal('modal-share');
  } catch (e) {
    showToast(t('Ошибка сохранения'), 'error');
  }
}

function openShareSheet() { 
  if (!sharePayload) return; 
  const enc = encodeURIComponent, u = sharePayload.url, tx = sharePayload.text; 
  byId('share-wa-link').href = `https://wa.me/?text=${enc(tx + ' ' + u)}`; 
  const sys = byId('share-system'); 
  if (navigator.share) { sys.classList.remove('hidden'); sys.classList.add('flex'); } else { sys.classList.add('hidden'); sys.classList.remove('flex'); } 
  openModal('modal-share'); 
}

function systemShare() {
  if (!navigator.share || !sharePayload) return;
  const file = lastShareBlob ? new File([lastShareBlob], 'avito-sham-card.jpg', { type: 'image/jpeg' }) : null;
  const data = file && navigator.canShare && navigator.canShare({ files: [file] })
    ? { files: [file], title: sharePayload.title, text: sharePayload.text }
    : sharePayload;
  navigator.share(data).catch(() => {});
}

function copyShareLink() { 
  if (!sharePayload) return; 
  fallbackCopy(sharePayload.url, () => showToast('Ссылка скопирована!', 'success')); 
  closeModal('modal-share'); 
}

function autoPickIcon() { const used = categories.map(c => c.icon); for (const ic of CATEGORY_ICON_POOL) if (!used.includes(ic)) return ic; return 'fa-tag'; }
function pickCatIcon(ic) { catIconChoice = ic; renderAdminTabContent(); }
function startEditCategory(catId) { const c = categories.find(x => x.id === catId); if (!c) return; editingCatId = catId; catNameDraft = c.name; catIconChoice = c.icon; renderAdminTabContent(); const inp = byId('cat-name-input'); if (inp) inp.focus(); }
function cancelEditCategory() { editingCatId = null; catNameDraft = ''; catIconChoice = autoPickIcon(); renderAdminTabContent(); }

function saveCategoryForm() { 
  const inp = byId('cat-name-input'); 
  const name = (inp ? inp.value : catNameDraft).trim(); 
  if (!name) { showToast('Введите название категории', 'warning'); return; } 
  const icon = catIconChoice || autoPickIcon(); 
  if (editingCatId) { 
    const c = categories.find(x => x.id === editingCatId); 
    if (c) { c.name = name; c.icon = icon; } 
    showToast(`Категория "${name}" обновлена!`, 'success'); 
  } else { 
    categories.push({ id: 'cat_' + Date.now(), name, icon }); 
    showToast(`Категория "${name}" добавлена!`, 'success'); 
  } 
  editingCatId = null; 
  catNameDraft = ''; 
  catIconChoice = autoPickIcon(); 
  pushCategoriesToCloud(); 
  renderCategoryPills(); 
  renderAdminTabContent(); 
}

function deleteCategoryWithConfirm(catId) { 
  const c = categories.find(x => x.id === catId); 
  if (!c) return; 
  showConfirmModal(t('Удаление категории'), `${t('Удалить')} "${t(c.name)}"?`, () => { 
    categories = categories.filter(x => x.id !== catId); 
    pushCategoriesToCloud(); 
    if (selectedCategory === catId) selectedCategory = 'all'; 
    renderCategoryPills(); 
    renderAdminTabContent(); 
    renderAds(); 
    showToast(t('Категория удалена'), 'info'); 
  }); 
}

function loadDraftCheck() { try { const d = localStorage.getItem('bs_ad_draft'); if (d) { byId('draft-restore-banner').classList.remove('hidden'); } } catch(e){} }
function saveDraft() { try { const data = { title: byId('ad-title').value, category: byId('ad-category').value, region: byId('ad-region').value, city: byId('ad-city').value, price: byId('ad-price').value, currency: byId('ad-currency').value, desc: byId('ad-desc').value, link: byId('ad-external-link') ? byId('ad-external-link').value : '' }; localStorage.setItem('bs_ad_draft', JSON.stringify(data)); } catch(e){} }
function restoreDraft() { try { const d = localStorage.getItem('bs_ad_draft'); if (d) { const data = JSON.parse(d); byId('ad-title').value = data.title || ''; byId('ad-category').value = data.category || 'electronics'; byId('ad-region').value = data.region || 'DAM'; byId('ad-city').value = data.city || ''; byId('ad-price').value = data.price || ''; byId('ad-currency').value = data.currency || 'USD'; byId('ad-desc').value = data.desc || ''; if (byId('ad-external-link')) byId('ad-external-link').value = data.link || ''; byId('draft-restore-banner').classList.add('hidden'); } } catch(e){} }
function clearDraft(silent) { localStorage.removeItem('bs_ad_draft'); byId('draft-restore-banner').classList.add('hidden'); if(!silent) showToast('Черновик удален', 'info'); }

function toggleAdvancedCreateFields() {
  const adv = byId('create-ad-advanced-fields');
  const ic = byId('advanced-toggle-icon');
  if (!adv) return;
  const isHidden = adv.classList.contains('hidden');
  adv.classList.toggle('hidden', !isHidden);
  if (ic) ic.style.transform = isHidden ? 'rotate(180deg)' : 'none';
  if (isHidden) setTimeout(initCreateMap, 150);
}

function openCreateAdModal() { 
  pendingCreateImages = []; 
  renderPhotoThumbnailsGrid('create'); 
  fillCategorySelect(byId('ad-category')); 
  loadDraftCheck();

  const guestBlock = byId('guest-auth-block');
  const userBadge = byId('user-logged-badge');
  const userNameEl = byId('user-logged-name');

  if (currentUser) {
    if (guestBlock) guestBlock.classList.add('hidden');
    if (userBadge) {
      userBadge.classList.remove('hidden');
      if (userNameEl) userNameEl.innerText = `${currentUser.kunya || currentUser.username} (@${currentUser.username})`;
    }
  } else {
    if (guestBlock) guestBlock.classList.remove('hidden');
    if (userBadge) userBadge.classList.add('hidden');
  }

  // Фоновый запрос GPS для автоматического выставления региона
  if (navigator.geolocation && (!userCurrentCoords || !userCurrentCoords.lat)) {
    navigator.geolocation.getCurrentPosition(pos => {
      userCurrentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (byId('ad-lat')) byId('ad-lat').value = pos.coords.latitude.toFixed(6);
      if (byId('ad-lng')) byId('ad-lng').value = pos.coords.longitude.toFixed(6);
      const sumEl = byId('ad-location-summary');
      if (sumEl) sumEl.innerText = `${t('Локация: GPS определена')} (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`;
    }, () => {}, { timeout: 7000 });
  }

  const savedLocation = localStorage.getItem('bs_last_seller_location');
  if (savedLocation && (!localStorage.getItem('bs_ad_draft'))) {
    try {
      const loc = JSON.parse(savedLocation);
      if (loc.region && byId('ad-region')) byId('ad-region').value = loc.region;
      if (loc.city && byId('ad-city')) byId('ad-city').value = loc.city;
      if (loc.lat && byId('ad-lat')) byId('ad-lat').value = loc.lat;
      if (loc.lng && byId('ad-lng')) byId('ad-lng').value = loc.lng;
    } catch (e) {}
  } 

const sc = byId('ad-store-cat-container'), ss = byId('ad-store-category'); 
  if (currentUser && currentUser.shop && currentUser.shop.customCategories && currentUser.shop.customCategories.length > 0) { 
    ss.innerHTML = `<option value="">${t('Без специальной категории магазина')}</option>` + currentUser.shop.customCategories.map(cat => `<option value="${cat}">${cat}</option>`).join(''); 
    sc.classList.remove('hidden'); 
  } else if (sc) sc.classList.add('hidden'); 

  const wb = byId('women-only-container'); 
  if (currentUser && (currentUser.gender === 'FEMALE' || currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN')) { 
    wb.classList.remove('hidden'); wb.classList.add('flex'); 
  } else if (wb) { 
    wb.classList.add('hidden'); wb.classList.remove('flex'); 
  } 

  const onbC = byId('ad-onbehalf-container'), onbS = byId('ad-post-onbehalf'); 
  if (onbC && onbS) { 
    if (currentUser && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN')) { 
      onbS.innerHTML = `<option value="${currentUser.username}">${t('Себя — ')}${currentUser.kunya || currentUser.username}</option>` + users.filter(u => u.username !== currentUser.username).map(u => `<option value="${u.username}">@${u.username} — ${u.kunya || t('без имени')}</option>`).join(''); 
      if (onBehalfPreset) { onbS.value = onBehalfPreset; onBehalfPreset = null; }
      onbC.classList.remove('hidden'); 
    } else onbC.classList.add('hidden'); 
  } 

openModal('modal-create-ad'); 
  document.querySelectorAll('.draft-field').forEach(el => { 
    el.addEventListener('input', saveDraft); 
    el.addEventListener('change', saveDraft); 
  });

const titleField = byId('ad-title');
  if (titleField) {
    titleField.oninput = () => {
      saveDraft();
      detectCategoryByTitle(titleField.value);
    };
  }

  const isFreeInit = byId('ad-is-free')?.checked;
  const isNegInit = byId('ad-is-negotiable')?.checked;
  if (isFreeInit) toggleFreePriceField(true);
  else if (isNegInit) toggleNegotiableField(true);
}

function detectCategoryByTitle(text) {
  if (!text || typeof text !== 'string') return;
  const q = normalizeArabicText(text);
  const catSel = byId('ad-category');
  if (!catSel) return;

  // 1. ЭЛЕКТРОНИКА И ГАДЖЕТЫ
  if (/iphone|айфон|samsung|самсунг|телефон|смартфон|ноутбук|пк|компьютер|планшет|часы|наушники|xiaomi|redmi|macbook|монитор|видеокарта|принтер|телевизор|колонка|павербанк|هاتف|جوال|موبايل|لابتوب|كمبيوتر|شاشة|ساعة|ايباد|راوتر|تلفزيون|سماعات/i.test(q)) {
    catSel.value = 'electronics';
  } 
  // 2. ТРАНСПОРТ И ЗАПЧАСТИ
  else if (/машина|авто|автомобиль|bmw|mercedes|kia|hyundai|запчасти|колеса|шины|мото|скутер|диски|аккумулятор|starex|масло|фара|крыло|бампер|сиارة|مركبة|موتور|دراجة|قطع غيار|إطارات|بطارية|محرك|سيارات/i.test(q)) {
    catSel.value = 'transport';
  } 
  // 3. НЕДВИЖИМОСТЬ
  else if (/квартира|дом|аренда|комната|участок|офис|магазин|недвижимость|дача|гараж|شقة|منزل|بيت|أرض|عقار|محل|إيجار|مكتب|فيلا/i.test(q)) {
    catSel.value = 'realestate';
  } 
  // 4. ИНСТРУМЕНТЫ И СТРОЙКА
  else if (/дрель|перфоратор|болгарка|шуруповерт|инструмент|молоток|пила|ключи|сварочный|отвертка|пассатижи|рулетка|шпатель|перфоратор|лестница|منشار|شابور|دريل|صاروخ|مفتاح|عدة|مطرقة|عده|مفك|قاس/i.test(q)) {
    catSel.value = 'tools';
  } 
  // 5. ТОВАРЫ ДЛЯ ДОМА, ПОСУДА, МЕБЕЛЬ
  else if (/диван|стол|стул|шкаф|кровать|мебель|ковер|посуда|лампа|люстра|холодильник|плита|стиралка|матрас|тумба|кресло|кастрюля|сковорода|тарелка|вилка|ложка|стакан|чайник|утюг|пылесос|اثاث|أثاث|طاولة|كرسي|كنبة|خزانة|فرش|سجاد|براد|غسالة|مطبخ|قدر|مخلاة|ملعقة|كأس|غلاية|مكواة|مكنسة/i.test(q)) {
    catSel.value = 'home';
  } 
  // 6. ПРОДУКТЫ ПИТАНИЯ
  else if (/арбуз|картошка|мясо|овощи|фрукты|продукты|мед|молоко|хлеб|рис|сахар|чай|кофе|сыр|масло|яйца|помидор|огурец|лук|чеснок|яблоко|банан|апельсин|курица|рыба|طماطم|بطاطا|بطاطس|لحم|دجاج|خضار|فواكه|بطيخ|عسل|حليب|خبز|طعام|غذاء|أرز|سكر|شاي|قهوة|جبن|زيت|بيض|خيار|بصل|ثوم|تفاح|موز|برتقال|سمك/i.test(q)) {
    catSel.value = 'food';
  } 
  // 7. ОДЕЖДА, ОБУВЬ И АКСЕССУАРЫ
  else if (/куртка|платье|рубашка|обувь|кроссовки|джинсы|костюм|сумка|одежда|брюки|штаны|футболка|свитер|пальто|шапка|шарф|носки|туфли|сандалии|ремень|кошелек|ملابس|قميص|فستان|حذاء|بنطلون|جاكيت|شنطة|حقيبة|أزياء|قميص|بلوزة|تنورة|معطف|قبعة|وشاح|جوارب|حزام|محفظة/i.test(q)) {
    catSel.value = 'fashion';
  } 
  // 8. ДЕТСКИЕ ТОВАРЫ
  else if (/коляска|игрушка|памперс|детск|подгузник|кроватка|самокат|кукла|машинка|конструктор|велосипед|مرحاض|لعبة|حفاضات|أطفال|طفل|مرضعة|لعب|عربة اطفال|سرير أطفال/i.test(q)) {
    catSel.value = 'kids';
  } 
  // 9. УСЛУГИ И СЕРВИС
  else if (/ремонт|услуги|мастер|перевозки|такси|доставка|курсы|уборка|строительство|парикмахер|маникюр|репетитор|чистка|خدمة|خدمات|صيانة|تصليح|معلم|تكسي|شحن|نقل|تعليم|بناء|تنظيف|حلاقة/i.test(q)) {
    catSel.value = 'services';
  }
}

function openCreateAdModalForUser(username) { onBehalfPreset = username; openCreateAdModal(); }

function initCreateMap() { 
  const el = byId('create-map'); 
  if (!el || typeof L === 'undefined') return; 
  const curLat = parseFloat(byId('ad-lat')?.value || 33.5138);
  const curLng = parseFloat(byId('ad-lng')?.value || 36.2765);

  if (createMap) {
    createMap.remove();
    createMap = null;
    createMarker = null;
  }

  createMap = L.map('create-map').setView([curLat, curLng], 12); 
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(createMap); 
  createMarker = L.marker([curLat, curLng], { draggable: true }).addTo(createMap); 
  
  createMarker.on('dragend', e => { 
    const ll = e.target.getLatLng(); 
    byId('ad-lat').value = ll.lat.toFixed(6); 
    byId('ad-lng').value = ll.lng.toFixed(6); 
  }); 
  
  createMap.on('click', e => { 
    createMarker.setLatLng(e.latlng); 
    byId('ad-lat').value = e.latlng.lat.toFixed(6); 
    byId('ad-lng').value = e.latlng.lng.toFixed(6); 
  });

  setTimeout(() => {
    if (createMap) createMap.invalidateSize();
  }, 100);
}

function handleRegionMapUpdate(code) { 
  const c = REGION_COORDS[code] || [33.5138, 36.2765]; 
  byId('ad-lat').value = c[0]; 
  byId('ad-lng').value = c[1]; 
  if (createMap && createMarker) { 
    createMap.setView(c, 12); 
    createMarker.setLatLng(c); 
  } 
}

function toggleFreePriceField(isFree) { 
  const p = byId('ad-price'), c = byId('price-container'); 
  const isNeg = byId('ad-is-negotiable')?.checked;
  if (isFree) { 
    if (byId('ad-is-negotiable')) byId('ad-is-negotiable').checked = false;
    if (p) { p.value = '0'; p.removeAttribute('required'); p.disabled = true; } 
    if (c) c.style.opacity = '.4'; 
  } else if (!isNeg) { 
    if (p) { p.value = ''; p.setAttribute('required', 'required'); p.disabled = false; } 
    if (c) c.style.opacity = '1'; 
  } 
}

function toggleNegotiableField(isNeg) { 
  const p = byId('ad-price'), c = byId('price-container'); 
  const isFree = byId('ad-is-free')?.checked;
  if (!p) return; 
  if (isNeg) { 
    if (byId('ad-is-free')) byId('ad-is-free').checked = false;
    p.value = '0'; 
    p.removeAttribute('required'); 
    p.disabled = true; 
    if (c) c.style.opacity = '.4';
  } else if (!isFree) { 
    p.value = ''; 
    p.setAttribute('required', 'required'); 
    p.disabled = false; 
    if (c) c.style.opacity = '1';
  } 
}

// Функция compressSingleImageFile централизованно используется из модуля api.js

async function handleCreateAdSubmit(e) {
  e.preventDefault();

  let postingUser = currentUser;

// Авторегистрация гостя при первой публикации только по номеру
  if (!postingUser) {
    const gWaRaw = byId('guest-whatsapp')?.value.trim();
    if (!gWaRaw) {
      showToast('Укажите ваш номер WhatsApp для связи', 'warning');
      return;
    }

    const waCheck = validateWhatsApp(gWaRaw);
    if (!waCheck.valid) {
      showToast(waCheck.error, 'error');
      return;
    }
const cleanWa = waCheck.number;

    const guestGenderRadio = document.querySelector('input[name="guest-gender"]:checked');
    if (!guestGenderRadio) {
      showToast(currentLang === 'ar' ? 'الرجاء تحديد الجنس (رجل / امرأة)' : 'Пожалуйста, укажите ваш пол!', 'warning');
      return;
    }
    const guestGender = guestGenderRadio.value;

    // Если аккаунт с таким номером уже существует — привязываем к нему
    const existing = users.find(u => u.whatsapp && u.whatsapp.replace(/\D/g, '') === cleanWa.replace(/\D/g, ''));
    if (existing) {
      postingUser = existing;
      saveUserSession(postingUser, true);
    } else {
      if (!supabaseClient) {
        showToast('Нет соединения с базой данных', 'error');
        return;
      }

      const autoLogin = 'user_' + cleanWa.replace(/\D/g, '').slice(-6);
      const autoPass = 'sham' + Math.floor(1000 + Math.random() * 9000);
      const passHash = await sha256(autoPass);
      const newUid = 'u_' + Date.now();

      const { data: regRes, error: regErr } = await supabaseClient.rpc('register_new_user', {
        p_uid: newUid,
        p_username: autoLogin,
        p_password_hash: passHash,
        p_kunya: 'Пользователь',
        p_gender: guestGender,
        p_whatsapp: cleanWa,
        p_avatar: null
      });

      if (regErr || !regRes || !regRes.success) {
        showToast(regRes?.error || 'Ошибка создания аккаунта', 'error');
        return;
      }

      postingUser = regRes.user;
      users.push(postingUser);
      saveUserSession(postingUser, true);
      showToast(`${t('Профиль создан! Логин:')} @${postingUser.username}`, 'success');
    }
  }
  
  const onbS = byId('ad-post-onbehalf');
  if (onbS && onbS.value && (currentUser && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN'))) {
    const t = users.find(u => u.username === onbS.value);
    if (t) postingUser = t;
  }

  const isFree = byId('ad-is-free')?.checked || false;
  const isNegotiable = byId('ad-is-negotiable')?.checked || false;
  const price = (isFree || isNegotiable) ? 0 : parseFloat(byId('ad-price')?.value || 0);

// Проверка лимитов и тарифов
  const hasShop = !!(postingUser.shop);
  const myActiveAdsCount = ads.filter(a => 
    a.sellerUsername && 
    a.sellerUsername.toLowerCase() === (postingUser.username || '').toLowerCase() && 
    a.status === 'ACTIVE'
  ).length;

  if (hasShop && !(typeof isMasterFreeActive === 'function' && isMasterFreeActive())) {
    const shopLimit = postingUser.shop.maxAds || 50;
    if (myActiveAdsCount >= shopLimit) {
      showToast(`Лимит объявлений магазина (${shopLimit} шт.) исчерпан.`, 'warning');
      return;
    }
  }
  
  const imgs = [...pendingCreateImages];
  if (!imgs.length) imgs.push(PLACEHOLDER_IMG);

  const regionVal = byId('ad-region')?.value || 'DAM';
  const cityVal = byId('ad-city')?.value.trim() || REGION_NAMES[regionVal] || 'Дамаск';

extLink = (byId('ad-external-link')?.value || '').trim();
  if (extLink && !extLink.startsWith('http://') && !extLink.startsWith('https://')) {
    extLink = 'https://' + extLink;
  }
  
  const adId = 'AD-' + Date.now().toString(36).toUpperCase();
  const newAd = {
    id: adId,
    title: byId('ad-title').value.trim(),
    category: byId('ad-category').value,
    storeCategory: byId('ad-store-category')?.value || '',
    region: regionVal,
    city: cityVal,
    isWomenOnly: byId('ad-is-women-only')?.checked || false,
    isFree,
    isNegotiable,
    price,
    currency: byId('ad-currency')?.value || 'USD',
    desc: byId('ad-desc').value.trim(),
    link: extLink,
    images: imgs,
    image: imgs[0],
    lat: parseFloat(byId('ad-lat')?.value || 33.5138),
    lng: parseFloat(byId('ad-lng')?.value || 36.2765),
    sellerUsername: postingUser.username,
    sellerUid: postingUser.uid || '',
    sellerKunya: postingUser.kunya || postingUser.username,
    sellerWhatsapp: postingUser.whatsapp || '',
    status: 'ACTIVE',
    createdAt: Date.now(),
    queue: [],
    likes: [],
    views: 0
  };

  if (supabaseClient) {
    const { error: insertErr } = await supabaseClient.from('ads').insert({
      id: newAd.id,
      title: newAd.title,
      category: newAd.category,
      store_category: newAd.storeCategory,
      region: newAd.region,
      city: newAd.city,
      is_women_only: newAd.isWomenOnly,
      is_free: newAd.isFree,
      is_negotiable: newAd.isNegotiable,
      price: newAd.price,
      currency: newAd.currency,
      description: newAd.desc,
      link: newAd.link,
      images: newAd.images,
      image: newAd.image,
      lat: newAd.lat,
      lng: newAd.lng,
      seller_username: newAd.sellerUsername,
      seller_uid: newAd.sellerUid,
      seller_kunya: newAd.sellerKunya,
      seller_whatsapp: newAd.sellerWhatsapp,
      status: newAd.status,
      created_at: newAd.createdAt,
      queue: [],
      likes: [],
      views: 0
    });
	
    if (insertErr) {
      showToast('Ошибка сохранения в базе: ' + insertErr.message, 'error');
      return;
    }
  }

  try {
    localStorage.setItem('bs_last_seller_location', JSON.stringify({
      region: newAd.region,
      city: newAd.city,
      lat: newAd.lat,
      lng: newAd.lng
    }));
  } catch(err) {}

  ads.unshift(newAd);
  saveCachedAds();

  closeModal('modal-create-ad');
  localStorage.removeItem('bs_ad_draft');
  selectedCategory = 'all';
  currentPage = 1;
  renderCategoryPills();
  renderAds();

  showToast('Объявление успешно опубликовано!', 'success');
}

function openEditAdModal(adId) {
  const ad = ads.find(a => a.id === adId);
  if (!ad) return;
  const isOwner = currentUser && (currentUser.username.toLowerCase() === (ad.sellerUsername || '').toLowerCase() || currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN');
  if (!isOwner) {
    showToast('Нет прав для редактирования!', 'error');
    return;
  }

  if (typeof translateStaticUI === 'function') {
    translateStaticUI(currentLang);
  }
  
const ownerContainer = byId('edit-ad-owner-container');
  const ownerSelect = byId('edit-ad-seller-username');
  if (ownerContainer && ownerSelect) {
    if (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN') {
      ownerSelect.innerHTML = users.map(u => `<option value="${u.username}">@${u.username} — ${u.kunya || t('без имени')}</option>`).join('');
      ownerSelect.value = ad.sellerUsername || currentUser.username;
      ownerContainer.classList.remove('hidden');
    } else {
      ownerContainer.classList.add('hidden');
    }
  }

  pendingEditImages = ad.images ? [...ad.images] : [ad.image];
  renderPhotoThumbnailsGrid('edit');
  fillCategorySelect(byId('edit-ad-category'), ad.category);
  byId('edit-ad-id').value = ad.id;
  byId('edit-ad-title').value = ad.title || '';
  byId('edit-ad-region').value = ad.region || 'DAM';
  byId('edit-ad-city').value = ad.city || '';
  byId('edit-ad-is-women-only').checked = !!ad.isWomenOnly;
  byId('edit-ad-is-free').checked = !!ad.isFree;
  byId('edit-ad-is-negotiable').checked = !!ad.isNegotiable;
  byId('edit-ad-price').value = ad.price || 0;
  byId('edit-ad-currency').value = ad.currency || 'USD';
byId('edit-ad-desc').value = ad.desc || '';
  if (byId('edit-ad-external-link')) byId('edit-ad-external-link').value = ad.link || '';
  
  const hasDisc = !!(ad.oldPrice && ad.oldPrice > ad.price);
  byId('edit-ad-has-discount').checked = hasDisc;
  byId('discount-fields-wrap').classList.toggle('hidden', !hasDisc);
  byId('edit-ad-old-price').value = hasDisc ? ad.oldPrice : '';
  closeModal('modal-ad-detail');
  openModal('modal-edit-ad');
}

async function handleEditAdSubmit(e) {
  e.preventDefault();
  const adId = byId('edit-ad-id').value;
  const ad = ads.find(a => a.id === adId);
  if (!ad || !currentUser) return;

  const ownerSelect = byId('edit-ad-seller-username');
  let targetUser = currentUser;
  if (ownerSelect && ownerSelect.value && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN')) {
    const found = users.find(u => u.username && u.username.toLowerCase() === ownerSelect.value.toLowerCase());
    if (found) targetUser = found;
  }

  const imgs = [...pendingEditImages];
  if (!imgs.length) imgs.push(PLACEHOLDER_IMG);

const isDisc = byId('edit-ad-has-discount')?.checked;
  const oldPriceVal = isDisc ? parseFloat(byId('edit-ad-old-price').value || 0) : null;
  let extEditLink = (byId('edit-ad-external-link')?.value || '').trim();
  if (extEditLink && !extEditLink.startsWith('http://') && !extEditLink.startsWith('https://')) {
    extEditLink = 'https://' + extEditLink;
  }

  const updatedData = {
    id: adId,
    title: byId('edit-ad-title').value.trim(),
    category: byId('edit-ad-category').value,
    storeCategory: ad.storeCategory || '',
    region: byId('edit-ad-region').value,
    city: byId('edit-ad-city').value.trim(),
    isWomenOnly: byId('edit-ad-is-women-only').checked,
    isFree: byId('edit-ad-is-free').checked,
    isNegotiable: byId('edit-ad-is-negotiable')?.checked || false,
    price: (byId('edit-ad-is-free').checked || byId('edit-ad-is-negotiable')?.checked) ? 0 : parseFloat(byId('edit-ad-price').value || 0),
    oldPrice: oldPriceVal,
    currency: byId('edit-ad-currency').value,
    desc: byId('edit-ad-desc').value.trim(),
    link: extEditLink,
    images: imgs,
    image: imgs[0],
    sellerUsername: targetUser.username,
    sellerUid: targetUser.uid || '',
    sellerKunya: targetUser.kunya || targetUser.username,
    sellerWhatsapp: targetUser.whatsapp || '',
    queue: ad.queue || []
  };

  checkFavoritesAndQueueAlerts(ad, updatedData);
  
  if (supabaseClient) {
    const dbPayload = {
      title: updatedData.title,
      category: updatedData.category,
      store_category: updatedData.storeCategory,
      region: updatedData.region,
      city: updatedData.city,
      is_women_only: updatedData.isWomenOnly,
      is_free: updatedData.isFree,
      is_negotiable: updatedData.isNegotiable,
      price: updatedData.price,
      old_price: updatedData.oldPrice,
      currency: updatedData.currency,
      description: updatedData.desc,
      link: updatedData.link,
      images: updatedData.images,
      image: updatedData.image,
      seller_username: updatedData.sellerUsername,
      seller_uid: updatedData.sellerUid,
      seller_kunya: updatedData.sellerKunya,
      seller_whatsapp: updatedData.sellerWhatsapp
    };
	
    supabaseClient.from('ads').update(dbPayload).eq('id', adId).then().catch(err => console.warn('Supabase background sync:', err));
  }

  Object.assign(ad, updatedData);
  saveCachedAds();
  closeModal('modal-edit-ad');
  renderCategoryPills();
  renderAds();
  showToast('Объявление обновлено!', 'success');
}

async function setAdStatusSecure(adId, newStatus, successMsg) {
  const ad = ads.find(a => a.id === adId);
  if (!ad) return;

  // 1. Мгновенно меняем статус локально и принудительно ставим ACTIVE для возврата
  ad.status = newStatus;
  saveCachedAds();
  
  closeModal('modal-ad-detail');
  closeModal('modal-my-shop');
  
  renderAds();
  renderCategoryPills();
  if (typeof SYSTEM_CONFIG !== 'undefined' && SYSTEM_CONFIG.adminTab === 'ads') {
    renderAdminTabContent();
  }
  showToast(successMsg, 'success');

  // 2. Отправляем обновление в Supabase (и в RPC, и напрямую в таблицу для 100% гарантии)
  if (supabaseClient) {
    try {
      await supabaseClient.from('ads').update({ status: newStatus }).eq('id', adId);
      
      if (currentUser) {
        supabaseClient.rpc('secure_manage_ad', {
          p_ad_id: adId,
          p_caller_id: currentUser.uid || currentUser.username,
          p_action: 'SET_STATUS',
          p_status: newStatus
        }).then().catch(() => {});
      }
    } catch (err) {
      console.warn('Status update sync error:', err);
    }
  }
}

async function doToggleLike(adId) { 
  if (!currentUser) { openAuthModal(); showToast(t('Войдите в аккаунт, чтобы ставить лайки'), 'warning'); return false; }
  const isCombo = typeof adId === 'string' && adId.startsWith('COMBO-');
  const target = isCombo ? combos.find(c => c.id === adId) : ads.find(a => a.id === adId);
  if (!target) return false; 

  if (!Array.isArray(target.likes)) target.likes = []; 
  const i = target.likes.indexOf(currentUser.username); 
  const isAdding = i === -1;
  
  if (isAdding) target.likes.push(currentUser.username); 
  else target.likes.splice(i, 1); 

  saveCachedAds(); 
  if (typeof saveCachedCombos === 'function') saveCachedCombos();

  if (supabaseClient) {
    const table = isCombo ? 'combos' : 'ads';
    try {
      const { data: fresh } = await supabaseClient.from(table).select('likes').eq('id', adId).single();
      let remoteLikes = Array.isArray(fresh?.likes) ? [...fresh.likes] : [];
      const remoteIdx = remoteLikes.indexOf(currentUser.username);
      if (isAdding && remoteIdx === -1) {
        remoteLikes.push(currentUser.username);
      } else if (!isAdding && remoteIdx !== -1) {
        remoteLikes.splice(remoteIdx, 1);
      }
      target.likes = remoteLikes;
      saveCachedAds();
      await supabaseClient.from(table).update({ likes: remoteLikes }).eq('id', adId);
    } catch(err) {
      console.warn('Sync like error:', err);
    }
  }
  return true; 
}

function toggleLike(adId, e) { if (e) e.stopPropagation(); if (!doToggleLike(adId)) return; renderAds(); }
function toggleLikeDetail(adId) { if (!doToggleLike(adId)) return; renderAds(); openAdDetail(adId, false); }

function toggleFavorite(adId, e) { 
  if (e) e.stopPropagation(); 
  if (!Array.isArray(favorites)) favorites = [];
  if (favorites.includes(adId)) { 
    favorites = favorites.filter(i => i !== adId); 
    showToast('Удалено из избранного', 'info'); 
  } else { 
    favorites.push(adId); 
    showToast('Добавлено в избранное!', 'success'); 
  } 
  try { localStorage.setItem('bs_favorites', JSON.stringify(favorites)); } catch (err) {} 
  if (currentUser) {
    currentUser.favorites = favorites;
    saveUserSession(currentUser, true);
    if (supabaseClient) {
      const query = currentUser.uid 
        ? supabaseClient.from('users').update({ favorites: favorites }).eq('uid', currentUser.uid)
        : supabaseClient.from('users').update({ favorites: favorites }).eq('username', currentUser.username);
      query.then().catch(() => {});
    }
  }
  renderCategoryPills(); 
  renderAds(); 
}

async function joinQueue(adId) { 
  if (!currentUser) { openAuthModal(); return; } 
  const ad = ads.find(a => a.id === adId); 
  if (!ad) return; 
  if (!ad.queue) ad.queue = []; 
  if (ad.queue.some(q => q.username === currentUser.username)) return; 

  const queueItem = { 
    username: currentUser.username, 
    kunya: currentUser.kunya || currentUser.username, 
    whatsapp: currentUser.whatsapp || '', 
    timestamp: Date.now() 
  }; 

  ad.queue.push(queueItem); 
  saveCachedAds(); 
  openAdDetail(adId, false); 
  showToast('Вы успешно заняли очередь!', 'success'); 

  if (supabaseClient) {
    try {
      const { data: fresh } = await supabaseClient.from('ads').select('queue').eq('id', adId).single();
      let latestQueue = Array.isArray(fresh?.queue) ? fresh.queue : [];
      if (!latestQueue.some(q => q.username === currentUser.username)) {
        latestQueue.push(queueItem);
        await supabaseClient.from('ads').update({ queue: latestQueue }).eq('id', adId);
        ad.queue = latestQueue;
        saveCachedAds();
      }
    } catch (err) {
      console.warn('Queue join sync warning:', err);
    }
  }
}

async function leaveQueue(adId) { 
  if (!currentUser) return; 
  const ad = ads.find(a => a.id === adId); 
  if (!ad) return; 
  if (!ad.queue) ad.queue = []; 
  ad.queue = ad.queue.filter(q => q.username !== currentUser.username); 
  saveCachedAds(); 
  openAdDetail(adId, false); 
  showToast('Вы вышли из очереди', 'info'); 

  if (supabaseClient) {
    try {
      const { data: fresh } = await supabaseClient.from('ads').select('queue').eq('id', adId).single();
      let latestQueue = Array.isArray(fresh?.queue) ? fresh.queue : [];
      latestQueue = latestQueue.filter(q => q.username !== currentUser.username);
      await supabaseClient.from('ads').update({ queue: latestQueue }).eq('id', adId);
      ad.queue = latestQueue;
      saveCachedAds();
    } catch (err) {
      console.warn('Queue leave sync warning:', err);
    }
  }
}

async function queueToggleCard(adId) { 
  if (!currentUser) { openAuthModal(); return; } 
  const ad = ads.find(a => a.id === adId); 
  if (!ad) { openAdDetail(adId); return; } 
  if (!ad.queue) ad.queue = []; 
  const idx = ad.queue.findIndex(q => q.username === currentUser.username); 
  if (idx !== -1) { 
    await leaveQueue(adId);
  } else { 
    await joinQueue(adId);
  } 
  renderAds(); 
}

function changePage(p) { currentPage = p; renderAds(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function resetPageAndRender() { currentPage = 1; renderAds(); }

function toggleTheme() { 
  document.body.classList.toggle('light-mode'); 
  localStorage.setItem('bs_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark'); 
  const ic = byId('sb-theme-ic'); 
  if (ic) ic.innerHTML = document.body.classList.contains('light-mode') ? IGSVG.moon() : IGSVG.sun(); 
  if (!byId('modal-profile').classList.contains('hidden')) openProfileModal(); 
}

function changeLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('bs_app_lang', lang);
  // Сбрасываем кэш переводов для чистого перевода с исключениями
  TRANSLATE_CACHE = {};
  try { localStorage.removeItem('bs_trans_cache'); } catch(e) {}
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  translateStaticUI(lang);
  renderCategoryPills();
  renderAds();
  updateNavState();
  if (!byId('modal-profile').classList.contains('hidden')) openProfileModal();
  showToast(lang === 'ar' ? 'تم تحويل اللغة إلى العربية' : 'Язык переключен на русский', 'info');
}

function openAuthModal() { 
  const l = byId('tab-login'), r = byId('tab-register'), b = byId('auth-submit-btn');
  if (l) l.innerText = t('Вход');
  if (r) r.innerText = t('Регистрация');
  if (b) b.innerText = byId('reg-fields')?.classList.contains('hidden') ? t('Войти') : t('Получить код');
  
  const uInp = byId('auth-username'), pInp = byId('auth-password'), wInp = byId('auth-whatsapp');
  if (uInp) uInp.placeholder = t('Логин *');
  if (pInp) pInp.placeholder = t('Пароль *');
  if (wInp) wInp.placeholder = t('WhatsApp номер * (+963…)');

  const genderLbl = document.querySelector('#reg-fields .text-\\[10px\\]');
  if (genderLbl) genderLbl.innerText = t('Выберите ваш пол *');
  const genderRadios = document.querySelectorAll('#reg-fields label span');
  if (genderRadios.length >= 2) {
    genderRadios[0].innerText = t('Мужчина');
    genderRadios[1].innerText = t('Женщина 🌸');
  }

  const otpInp = byId('auth-otp-code');
  if (otpInp) otpInp.placeholder = t('Введите 6-значный код *');
  const otpNote = byId('auth-otp-block')?.querySelector('.t2');
  if (otpNote) otpNote.innerText = t('Код отправлен в WhatsApp');
  const resendBtn = byId('auth-resend-btn');
  if (resendBtn) resendBtn.innerText = t('Отправить код повторно');
  
  const remLbl = byId('auth-remember-me')?.parentElement?.querySelector('span');
  if (remLbl) remLbl.innerText = t('Запомнить мой вход на этом устройстве');

  openModal('modal-auth'); 
}

function switchAuthTab(tab) { 
  const l = byId('tab-login'), r = byId('tab-register'), f = byId('reg-fields'), lf = byId('login-fields'), b = byId('auth-submit-btn'); 
  if (tab === 'login') { 
    l.style.borderColor = '#0095f6'; l.style.color = '#0095f6'; 
    r.style.borderColor = 'transparent'; r.style.color = 'var(--ig-text2)'; 
    if (lf) lf.classList.remove('hidden');
    if (f) f.classList.add('hidden'); 
    b.innerText = t('Войти'); 
  } else { 
    r.style.borderColor = '#0095f6'; r.style.color = '#0095f6'; 
    l.style.borderColor = 'transparent'; l.style.color = 'var(--ig-text2)'; 
    if (lf) lf.classList.add('hidden');
    if (f) f.classList.remove('hidden'); 
    b.innerText = t('Получить код'); 
  } 
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const isReg = !byId('reg-fields').classList.contains('hidden');
  const remember = byId('auth-remember-me').checked;
  const btn = byId('auth-submit-btn');
  const originalText = btn.innerText;
  btn.disabled = true;

  if (isReg) {
    const whatsappRaw = byId('auth-whatsapp').value.trim();
    const whatsappCheck = validateWhatsApp(whatsappRaw);
    if (!whatsappCheck.valid) {
      showToast(whatsappCheck.error, 'error');
      btn.disabled = false; btn.innerText = originalText;
      return;
    }
    const whatsapp = whatsappCheck.number;

const cleanWa = whatsapp.replace(/\D/g, '');

    const genderRadio = document.querySelector('input[name="auth-gender"]:checked');
    if (!genderRadio) {
      showToast(currentLang === 'ar' ? 'الرجاء تحديد الجنس (رجل / امرأة)' : 'Пожалуйста, укажите ваш пол!', 'warning');
      btn.disabled = false;
      btn.innerText = originalText;
      return;
    }
    const selectedGender = genderRadio.value;

    // 1. Проверяем существование номера строго в актуальной базе Supabase
    if (supabaseClient) {
      const { data: dbUser } = await supabaseClient
        .from('users')
        .select('uid, whatsapp')
        .or(`whatsapp.ilike.%${cleanWa}%,whatsapp.eq.+${cleanWa},whatsapp.eq.${cleanWa}`)
        .maybeSingle();

      if (dbUser) {
        showToast('Этот номер уже зарегистрирован! Войдите во вкладке Вход.', 'warning');
        btn.disabled = false;
        btn.innerText = originalText;
        return;
      }
    }
	
    const otpBlock = byId('auth-otp-block');
    const otpInput = byId('auth-otp-code');

// Шаг 1: генерация и отправка одноразового кода
    if (!pendingRegVerification || pendingRegVerification.whatsapp !== whatsapp) {
      btn.innerText = 'Отправка кода...';
      const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
      const autoPass = 'sham' + Math.floor(1000 + Math.random() * 9000);
      const autoLogin = 'user_' + whatsapp.replace(/\D/g,'').slice(-6);

      // Сразу сохраняем данные верификации, чтобы не потерять сгенерированный код и пол
      pendingRegVerification = {
        code: generatedCode,
        username: autoLogin,
        password: autoPass,
        whatsapp: whatsapp,
        gender: selectedGender,
        createdAt: Date.now()
      };

      try {
        const gatewayRes = await fetch('https://whatsapp-gateway-kohl.vercel.app/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: whatsapp, 
            code: `${generatedCode}\n👤 Ваш логин: ${autoLogin}\n🔑 Ваш пароль: ${autoPass}` 
          })
        });

        const gatewayData = await gatewayRes.json();
        if (!gatewayRes.ok || !gatewayData.success) {
          throw new Error(gatewayData.error || 'Ошибка шлюза');
        }
        showToast('Код и данные входа отправлены в WhatsApp!', 'success');
      } catch (err) {
        console.warn('WhatsApp Gateway error (500), fallback activated:', err);
        // Если шлюз упал с 500 ошибкой, выводим код на экран, чтобы пользователь не завис
        showToast(`⚠️ Шлюз недоступен (500). Ваш код: ${generatedCode}`, 'warning');
        
        // Автоматически подставляем код в поле ввода для удобства
        const otpInputEl = byId('auth-otp-code');
        if (otpInputEl) otpInputEl.value = generatedCode;
      }

      if (otpBlock) otpBlock.classList.remove('hidden');
      if (otpInput) { otpInput.value = ''; otpInput.focus(); }

      if (typeof startOtpTimer === 'function') startOtpTimer();
      btn.disabled = false;
      btn.innerText = 'Подтвердить код';
      return;
    } 

    // Шаг 2: проверка кода и мгновенная регистрация
    const enteredCode = otpInput?.value.trim();
    if (!enteredCode || enteredCode !== pendingRegVerification.code) {
      showToast('Неверный код из WhatsApp!', 'error');
      btn.disabled = false; btn.innerText = 'Подтвердить код';
      return;
    }

    btn.innerText = 'Создание профиля...';
    const passHash = await sha256(pendingRegVerification.password);
    const uid = 'u_' + Date.now();

    const { data: regRes, error: regErr } = await supabaseClient.rpc('register_new_user', {
      p_uid: uid,
      p_username: pendingRegVerification.username,
      p_password_hash: passHash,
      p_kunya: 'Пользователь',
      p_gender: pendingRegVerification.gender || selectedGender || 'MALE',
      p_whatsapp: pendingRegVerification.whatsapp,
      p_avatar: null
    });
    if (regErr || !regRes || !regRes.success) {
      showToast(regRes?.error || 'Ошибка создания аккаунта', 'error');
      btn.disabled = false; btn.innerText = 'Подтвердить код';
      return;
    }

    const localUser = regRes.user;
    users.push(localUser);
saveUserSession(localUser, remember);
    pendingRegVerification = null;
    if (otpBlock) otpBlock.classList.add('hidden');
    closeModal('modal-auth');
    showToast(`${t('Добро пожаловать!')} ${t('Логин:')} @${localUser.username}`, 'success');
    btn.disabled = false; btn.innerText = 'Войти';
    return;
	} else {
    // Вход по логину или номеру WhatsApp
    btn.innerText = 'Проверка...';
    const loginIdentifier = byId('auth-username').value.trim();
    const rawPassword = byId('auth-password').value;
    const password = await sha256(rawPassword);

    const isArchivedLocally = archivedUsers.some(u => 
      (u.username && u.username.toLowerCase() === loginIdentifier.toLowerCase()) ||
      (u.whatsapp && u.whatsapp.replace(/\D/g,'') === loginIdentifier.replace(/\D/g,''))
    );

    if (isArchivedLocally) {
      showToast('Этот аккаунт перенесен в архив администратором. Доступ заблокирован.', 'error');
      btn.disabled = false; btn.innerText = originalText;
      return;
    }

    if (!supabaseClient) {
      showToast('Нет соединения с базой данных', 'error');
      btn.disabled = false; btn.innerText = originalText;
      return;
    }

    try {
      const { data: res, error } = await supabaseClient.rpc('verify_user_login', {
        p_username: loginIdentifier,
        p_password_hash: password
      });
      
      if (error) throw error;

      if (res && res.success && res.user) {
        const foundUser = res.user;
        if (foundUser.is_archived || foundUser.isArchived) {
          showToast('Этот аккаунт заблокирован и находится в архиве.', 'error');
          btn.disabled = false; btn.innerText = originalText;
          return;
        }

const idx = users.findIndex(u => u.uid === foundUser.uid);
        if (idx !== -1) users[idx] = foundUser;
        else users.push(foundUser);

        if (Array.isArray(foundUser.favorites)) {
          favorites = [...new Set([...(Array.isArray(favorites) ? favorites : []), ...foundUser.favorites])];
          try { localStorage.setItem('bs_favorites', JSON.stringify(favorites)); } catch (err) {}
        }

saveUserSession(foundUser, remember);
        closeModal('modal-auth');
        showToast(`${t('С возвращением,')} ${foundUser.kunya || foundUser.username}!`, 'success');
		} else {
			showToast(res?.error || 'Неверный логин или пароль!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Ошибка входа.', 'error');
    }
    btn.disabled = false; btn.innerText = originalText;
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('bs_current_user');
  sessionStorage.removeItem('bs_current_user');
  closeModal('modal-profile');
  updateAuthUI();
  showToast('Вы вышли из аккаунта', 'info');
}

/* ================= INITIALIZATION AT STARTUP ================= */
document.addEventListener('DOMContentLoaded', () => {
// Включение прокрутки колесиком мыши для горизонтальных списков на ПК
  const catScroll = byId('categories-container');
  if (catScroll) {
    catScroll.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        catScroll.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  const isLight = localStorage.getItem('bs_theme') === 'light';
  if (isLight) {
    document.body.classList.add('light-mode');
  }
  const themeIc = byId('sb-theme-ic');
  if (themeIc) {
    themeIc.innerHTML = isLight ? IGSVG.moon() : IGSVG.sun();
  }

  if (currentLang === 'ar') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }
  
  window.addEventListener('scroll', () => {
    const btn = byId('btn-scroll-top');
    if (btn) {
      if (window.scrollY > 300) btn.classList.add('visible');
      else btn.classList.remove('visible');
    }
  });

  try {
    loadCachedAds();
  } catch(e) {
    console.warn('loadCachedAds error:', e);
  }

  try {
    restoreUserSession();
  } catch(e) {
    console.warn('restoreUserSession error:', e);
  }

  if (typeof renderCategoryPills === 'function') renderCategoryPills();
  if (typeof renderAds === 'function') renderAds();

try {
    initSupabaseSync();
    initDriveAutoBackup();
  } catch(e) {
    console.warn('initSupabaseSync error:', e);
  }
  
  try {
    fetchLiveExchangeRates();
    setInterval(fetchLiveExchangeRates, 5 * 60 * 1000);
    setInterval(checkExpiredAdsStatus, 60 * 60 * 1000);
    requestPushPermission();
    checkUrlHashAdOpen();
  } catch(e) {
    console.warn('Startup async services error:', e);
  }
});

window.addEventListener('hashchange', checkUrlHashAdOpen);

// Безопасная конвертация цены объявления в USD
function adToUSD(ad) {
  if (!ad) return 0;
  const rawPrice = typeof ad.price === 'number' ? ad.price : parseFloat(ad.price);
  if (isNaN(rawPrice) || rawPrice <= 0) return 0;
  const curr = (ad.currency || 'USD').toUpperCase();
  if (curr === 'USD') return rawPrice;
  const fallbackRates = { USD: 1, SYP: 14000, TRY: 33, SAR: 3.75 };
  const activeRates = (typeof EXCHANGE_RATES !== 'undefined' && EXCHANGE_RATES) ? EXCHANGE_RATES : fallbackRates;
  const rate = parseFloat(activeRates[curr] || fallbackRates[curr]);
  if (!rate || isNaN(rate) || rate <= 0) return rawPrice;
  return rawPrice / rate;
}

// 1. Расчет расстояния между точками (для фильтра «Рядом»)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
	if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Радиус Земли в км
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 2. Навигация по фотографиям прямо в ленте карточки (Instagram-стиль)
function cardNav(event, adId, dir) {
  if (event) event.stopPropagation();
  
  const isCombo = typeof adId === 'string' && (adId.startsWith('COMBO-') || adId.includes('COMBO'));
  
  if (isCombo) {
    const v = (typeof getListingById === 'function') ? getListingById(adId) : null;
    if (!v || !v.comboItems || v.comboItems.length < 2) return;
    
    const itemLeft = v.comboItems[0];
    const itemRight = v.comboItems[1];
    
    const imgsLeft = (itemLeft.images && itemLeft.images.length) ? itemLeft.images : [itemLeft.image || PLACEHOLDER_IMG];
    const imgsRight = (itemRight.images && itemRight.images.length) ? itemRight.images : [itemRight.image || PLACEHOLDER_IMG];
    
    if (dir === -1) {
      const key = `${adId}_left`;
      if (cardPhotoIndex[key] === undefined) cardPhotoIndex[key] = 0;
      cardPhotoIndex[key] = (cardPhotoIndex[key] + 1) % imgsLeft.length;
      const leftEl = byId(`cimg-left-${adId}`);
      if (leftEl) leftEl.src = imgsLeft[cardPhotoIndex[key]];
    } else {
      const key = `${adId}_right`;
      if (cardPhotoIndex[key] === undefined) cardPhotoIndex[key] = 0;
      cardPhotoIndex[key] = (cardPhotoIndex[key] + 1) % imgsRight.length;
      const rightEl = byId(`cimg-right-${adId}`);
      if (rightEl) rightEl.src = imgsRight[cardPhotoIndex[key]];
    }
    return;
  }

  const ad = ads.find(a => a.id === adId);
  if (!ad) return;
  const imgs = (ad.images && ad.images.length) ? ad.images : [ad.image || PLACEHOLDER_IMG];
  if (imgs.length <= 1) return;
  
  if (cardPhotoIndex[adId] === undefined) cardPhotoIndex[adId] = 0;
  cardPhotoIndex[adId] = (cardPhotoIndex[adId] + dir + imgs.length) % imgs.length;
  
  const imgEl = byId(`cimg-${adId}`);
  const dotsEl = byId(`cdot-${adId}`);
  const bgEl = byId(`cbg-${adId}`);
  
  const idx = cardPhotoIndex[adId];
  if (imgEl) imgEl.src = imgs[idx];
  if (bgEl) bgEl.style.backgroundImage = `url('${imgs[idx]}')`;
  if (dotsEl) {
    dotsEl.innerHTML = imgs.map((_, i) => `<span class="w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}"></span>`).join('');
  }
}

// 3. Смена статуса продавцом: «Продано»
function markAdSold(adId) {
  setAdStatusSecure(adId, 'SOLD', t('Объявление отмечено как проданное'));
}

// 4. Смена статуса продавцом: «Передумал»
function markAdWithdrawn(adId) {
  setAdStatusSecure(adId, 'WITHDRAWN', t('Статус изменен: передумал продавать'));
}

// 5. Архивация объявления с подтверждением
function archiveAdWithConfirm(adId) {
  showConfirmModal(t('Архивация'), t('Перенести объявление в архив?'), () => {
    setAdStatusSecure(adId, 'ARCHIVED', t('Объявление перенесено в архив'));
  });
}

// 6. Восстановление объявления из архива
function restoreAd(adId) {
  setAdStatusSecure(adId, 'ACTIVE', t('Объявление успешно восстановлено'));
}

// Обработчик живого поиска и синхронизации Desktop / Mobile инпутов
let searchDebounceTimer = null;
function onSearchInput(el) {
  const val = (el ? el.value : '').trim();
  const desktop = byId('search-input-desktop');
  const mobile = byId('search-input');
  if (desktop && desktop !== el) desktop.value = el.value;
  if (mobile && mobile !== el) mobile.value = el.value;
  searchQuery = val;
  
  renderSearchSuggestions(val);

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    resetPageAndRender();
  }, 120);
}

async function renderSearchSuggestions(query) {
  const listDesktop = byId('search-suggestions-desktop');
  const listMobile = byId('search-suggestions-mobile');
  if (!query || query.trim().length < 1) {
    if (listDesktop) listDesktop.classList.add('hidden');
    if (listMobile) listMobile.classList.add('hidden');
    return;
  }

  const cleanQ = normalizeArabicText(query);
  const isAr = currentLang === 'ar';

  const matches = [];
  for (const a of ads) {
    if (a.status !== 'ACTIVE') continue;

    let titleNorm = normalizeArabicText(a.title);
    let descNorm = normalizeArabicText(a.desc || '');
    let matched = titleNorm.includes(cleanQ) || descNorm.includes(cleanQ);

    if (!matched && isAr) {
      const catObj = categories.find(c => c.id === a.category);
      if (catObj && normalizeArabicText(t(catObj.name)).includes(cleanQ)) {
        matched = true;
      }
      if (!matched && typeof TRANSLATE_CACHE !== 'undefined') {
        const cacheKey = `ar_${(a.title || '').trim()}`;
        if (TRANSLATE_CACHE[cacheKey]) {
          matched = normalizeArabicText(TRANSLATE_CACHE[cacheKey]).includes(cleanQ);
        }
      }
    }

    if (matched) {
      matches.push(a);
      if (matches.length >= 6) break;
    }
  }

  if (matches.length === 0) {
    if (listDesktop) listDesktop.classList.add('hidden');
    if (listMobile) listMobile.classList.add('hidden');
    return;
  }

  const itemsHtml = await Promise.all(matches.map(async a => {
    let displayTitle = a.title;
    if (isAr && typeof translateDynamic === 'function') {
      displayTitle = await translateDynamic(a.title, 'ar');
    }
    return `
      <div onclick="openAdDetail('${a.id}'); renderSearchSuggestions('');" class="px-3 py-2 text-xs t1 hover:bg-field cursor-pointer flex items-center justify-between border-b b-ig last:border-0">
        <span class="truncate font-semibold">${displayTitle}</span>
        <span class="text-[10px] text-blue-500 shrink-0 font-bold">$${Number(a.price || 0).toFixed(2)}</span>
      </div>
    `;
  }));

  const html = itemsHtml.join('');
  [listDesktop, listMobile].forEach(l => {
    if (l) {
      l.innerHTML = html;
      l.classList.remove('hidden');
    }
  });
}

function selectSearchSuggestion(title) {
  const desktop = byId('search-input-desktop');
  const mobile = byId('search-input');
  if (desktop) desktop.value = title;
  if (mobile) mobile.value = title;
  searchQuery = title;
  renderSearchSuggestions('');
  resetPageAndRender();
}

// 6.1. Полное удаление объявления (с подтверждением и защитой от возврата)
function deleteAdWithConfirm(adId) {
  deleteAdPermanently(adId);
}

function deleteAdPermanently(adId) {
	const ad = ads.find(a => a.id === adId);
  if (!ad) return;

  const isOwner = currentUser && (
    currentUser.username.toLowerCase() === (ad.sellerUsername || '').toLowerCase() ||
    currentUser.role === 'SUPERUSER' ||
    currentUser.role === 'ADMIN'
  );

if (!isOwner) {
    showToast(t('У вас нет прав для удаления этого объявления'), 'error');
    return;
  }

  showConfirmModal(t('Удаление объявления'), t('Вы уверены, что хотите навсегда удалить это объявление? Восстановить его будет невозможно.'), async () => {

	  // 1. Фиксируем удаление в локальном черном списке (чтобы не вернулось из кэша)
    markAdDeletedLocally(adId);

    // 2. Удаляем из памяти
    ads = ads.filter(a => a.id !== adId);
    favorites = favorites.filter(id => id !== adId);
    try { localStorage.setItem('bs_favorites', JSON.stringify(favorites)); } catch (e) {}
    saveCachedAds();

    // 3. Закрываем модалки и обновляем UI
    closeModal('modal-ad-detail');
    closeModal('modal-edit-ad');
    closeModal('modal-my-shop');
    renderCategoryPills();
    renderAds();
    if (typeof SYSTEM_CONFIG !== 'undefined' && SYSTEM_CONFIG.adminTab === 'ads') {
      renderAdminTabContent();
    }

    showToast(t('Объявление удалено навсегда'), 'info');

// 4. Удаляем из Supabase базы и очищаем Storage
    if (supabaseClient) {
      try {
        await supabaseClient.from('ads').delete().eq('id', adId);
        
        const imgsToDelete = (Array.isArray(ad.images) ? ad.images : [ad.image])
          .filter(url => url && typeof url === 'string' && url.includes('/storage/v1/object/public/listings/'))
          .map(url => url.split('/listings/').pop());

        if (imgsToDelete.length > 0) {
          await supabaseClient.storage.from('listings').remove(imgsToDelete);
        }

        if (currentUser) {
          supabaseClient.rpc('secure_manage_ad', {
            p_ad_id: adId,
            p_caller_id: currentUser.uid || currentUser.username,
            p_action: 'DELETE'
          }).then().catch(() => {});
        }
      } catch (err) {
        console.warn('Ошибка удаления из Supabase:', err);
      }
    }
  });
}

// 7. Рабочая функция активации подарочных кодов
async function redeemGiftCode() {
  if (!currentUser) {
    openAuthModal();
    showToast('Войдите в аккаунт для активации кода', 'warning');
    return;
  }
  if (currentUser.frozen) {
    showToast('Аккаунт заморожен администратором', 'error');
    return;
  }

  const inputEl = byId('redeem-gift-code');
  const code = inputEl ? inputEl.value.trim().toUpperCase() : '';
  if (!code) {
    showToast('Введите подарочный код', 'warning');
    return;
  }

  showToast('Проверка подарочного кода...', 'info');

  try {
    if (!supabaseClient) {
      showToast('Нет соединения с базой данных', 'error');
      return;
    }

    const { data: res, error } = await supabaseClient.rpc('redeem_gift_code', {
      p_code: code,
      p_user_identifier: currentUser.uid || currentUser.username
    });

    if (error) throw error;
    if (!res || !res.success) {
      throw new Error(res?.error || 'Неверный или уже использованный код');
    }

    currentUser.avitocashBalance = res.new_balance;
    currentUser.avitocash_balance = res.new_balance;
    saveUserSession(currentUser, true);

    closeModal('modal-redeem-gift');
    if (!byId('modal-profile').classList.contains('hidden')) openProfileModal();
    
    showToast(`Успешно! На ваш баланс зачислено +${Number(res.amount || 0).toFixed(2)} AC`, 'success');
  } catch (err) {
    console.error('Redeem gift error:', err);
    showToast(err.message || 'Ошибка при активации кода', 'error');
  }
}

// 8. Рабочие контроллеры меню сортировки, региона и радиуса
function toggleRegionMenu() {
  const m = byId('region-menu-overlay');
  if (m) {
    const list = byId('region-list-container');
    if (list && list.children.length === 0) {
      const currentVal = byId('region-filter')?.value || 'ALL';
      const regions = [
        { code: 'ALL', name: 'Все регионы (Сирия)' },
        { code: 'DAM', name: 'Дамаск' },
        { code: 'RIF_DAM', name: 'Риф-Дамаск' },
        { code: 'ALEP', name: 'Алеппо' },
        { code: 'IDL', name: 'Идлиб' },
        { code: 'HOMS', name: 'Хомс' },
        { code: 'HAMA', name: 'Хама' },
        { code: 'LAT', name: 'Латакия' },
        { code: 'TAR', name: 'Тартус' },
        { code: 'RAQ', name: 'Ракка' },
        { code: 'DEIR', name: 'Дейр-эз-Зор' },
        { code: 'HAS', name: 'Хасеке' },
        { code: 'DAR', name: 'Дараа' },
        { code: 'SUW', name: 'Эс-Сувейда' },
        { code: 'QUN', name: 'Эль-Кунейтра' }
      ];
      list.innerHTML = regions.map(r => `
        <button onclick="selectRegion('${r.code}')" class="w-full text-left p-3 rounded-xl ig-hover t1 text-sm font-semibold flex justify-between items-center">
          <span>${t(r.name)}</span>
          ${currentVal === r.code ? '<i class="fa-solid fa-check text-blue-500"></i>' : ''}
        </button>
      `).join('');
    }
    m.classList.remove('hidden');
  }
}

function closeRegionMenu() {
  byId('region-menu-overlay')?.classList.add('hidden');
}

function selectRegion(code) {
  const sel = byId('region-filter');
  if (sel) {
    sel.value = code;
    if (code !== 'ALL' && activeRadiusKm > 0) {
      activeRadiusKm = 0;
      const nearLbl = byId('near-me-label');
      const nearBtn = byId('near-me-btn');
      if (nearLbl) nearLbl.innerText = t('Рядом');
      if (nearBtn) nearBtn.classList.remove('text-blue-500', 'border-blue-500');
    }
    resetPageAndRender();
    updateRegionLabel();
  }
  closeRegionMenu();
}

function updateRegionLabel() {
  const lbl = byId('current-region-label');
  const sel = byId('region-filter');
  if (lbl && sel) {
    const val = sel.value;
    const raw = val === 'ALL' ? 'Все регионы' : (REGION_NAMES[val] || 'Все регионы');
    lbl.innerText = t(raw);
  }
}

function openRadiusMenu() {
  const m = byId('radius-menu-overlay');
  if (m) {
    [5, 15, 30, 50].forEach(km => {
      const chk = byId(`radius-check-${km}`);
      const btn = byId(`radius-btn-${km}`);
      if (chk) chk.classList.toggle('hidden', activeRadiusKm !== km);
      if (btn) {
        btn.classList.toggle('border-blue-500', activeRadiusKm === km);
        btn.classList.toggle('text-blue-500', activeRadiusKm === km);
      }
    });
    m.classList.remove('hidden');
  }
}

function closeRadiusMenu() {
  byId('radius-menu-overlay')?.classList.add('hidden');
}

function applyRadiusState(km) {
  activeRadiusKm = km;
  const lbl = byId('near-me-label');
  const btn = byId('btn-near-me') || lbl?.closest('button');
  if (lbl) lbl.innerText = `${km} ${t('км')}`;
  if (btn) btn.classList.add('text-blue-500', 'border-blue-500');
  closeRadiusMenu();
  resetPageAndRender();
  showToast(`${t('Поиск в радиусе')} ${km} ${t('км активирован')}`, 'success');
}

function setRadiusFilter(km) {
  if (km > 0) {
    const sel = byId('region-filter');
    if (sel) {
      sel.value = 'ALL';
      updateRegionLabel();
    }

    if (userCurrentCoords && userCurrentCoords.lat && userCurrentCoords.lng) {
      applyRadiusState(km);
      return;
    }

    if (!navigator.geolocation) {
      showToast('Геолокация не поддерживается вашим браузером', 'error');
      closeRadiusMenu();
      return;
    }

    showToast('Определение вашего местоположения...', 'info');
    navigator.geolocation.getCurrentPosition(pos => {
      userCurrentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      applyRadiusState(km);
    }, err => {
      console.warn(err);
      showToast('Не удалось получить координаты GPS. Проверьте разрешения.', 'error');
      closeRadiusMenu();
    }, { timeout: 10000, enableHighAccuracy: true });
  } else {
    activeRadiusKm = 0;
    const lbl = byId('near-me-label');
    const btn = byId('near-me-btn');
    if (lbl) lbl.innerText = t('Рядом');
    if (btn) {
      btn.classList.remove('text-blue-500', 'border-blue-500');
      btn.style.borderColor = '';
    }
    [5, 15, 30, 50].forEach(k => {
      const chk = byId(`radius-check-${k}`);
      if (chk) chk.classList.add('hidden');
    });
closeRadiusMenu();
    resetPageAndRender();
    showToast(t('Поиск рядом отключен'), 'info');
  }
}

function toggleSortMenu() {
  const m = byId('sort-menu-overlay');
  if (m) {
    ['newest', 'cheapest', 'expensive', 'popular'].forEach(mode => {
      const chk = byId(`sort-check-${mode}`);
      if (chk) chk.classList.toggle('hidden', currentSortMode !== mode);
    });
    m.classList.remove('hidden');
  }
}

function closeSortMenu() {
  byId('sort-menu-overlay')?.classList.add('hidden');
}

function applySort(mode) {
  currentSortMode = mode;
  localStorage.setItem('bs_sort_mode', mode);
  const sortLabels = { newest: 'Новые', cheapest: 'Дешевые', expensive: 'Дорогие', popular: 'Популярные' };
  const lbl = byId('current-sort-label');
  if (lbl) lbl.innerText = t(sortLabels[mode] || 'Новые');
  closeSortMenu();
  resetPageAndRender();
}// Обработка горизонтального свайпа фотографий на смартфонах
let touchStartX = 0;
let touchStartY = 0;

function handleTouchSwipeStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}

function handleTouchSwipeEnd(e, callback) {
  const diffX = e.changedTouches[0].screenX - touchStartX;
  const diffY = e.changedTouches[0].screenY - touchStartY;
  
  // Проверяем, что свайп был горизонтальным и длиннее 40px
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
    if (diffX < 0) {
      callback(1); // свайп влево -> следующее фото
    } else {
      callback(-1); // свайп вправо -> предыдущее фото
    }
  }
}

async function cleanUnusedStorageImagesAdmin() {
  if (!currentUser || (currentUser.role !== 'SUPERUSER' && currentUser.role !== 'ADMIN')) {
    showToast('Доступ запрещен', 'error');
    return;
  }
  if (!supabaseClient) return;

  showToast('Проверка хранилища на неиспользуемые фото...', 'info');

  try {
    const { data: storageFiles } = await supabaseClient.storage.from('listings').list('public', { limit: 1000 });
    if (!storageFiles || !storageFiles.length) {
      showToast('В хранилище нет файлов для очистки', 'info');
      return;
    }

    const [{ data: adsData }, { data: usersData }] = await Promise.all([
      supabaseClient.from('ads').select('images, image'),
      supabaseClient.from('users').select('avatar, shop')
    ]);

    const usedFileNames = new Set();

    (adsData || []).forEach(ad => {
      const allImgs = Array.isArray(ad.images) ? ad.images : [ad.image].filter(Boolean);
      allImgs.forEach(url => {
        if (typeof url === 'string' && url.includes('/storage/v1/object/public/listings/')) {
          const fn = url.split('/listings/public/').pop().split('/listings/').pop();
          if (fn) usedFileNames.add(fn.replace('public/', ''));
        }
      });
    });

    (usersData || []).forEach(u => {
      if (u.avatar && typeof u.avatar === 'string' && u.avatar.includes('/storage/v1/object/public/listings/')) {
        const fn = u.avatar.split('/listings/public/').pop().split('/listings/').pop();
        if (fn) usedFileNames.add(fn.replace('public/', ''));
      }
      if (u.shop?.logo && typeof u.shop.logo === 'string' && u.shop.logo.includes('/storage/v1/object/public/listings/')) {
        const fn = u.shop.logo.split('/listings/public/').pop().split('/listings/').pop();
        if (fn) usedFileNames.add(fn.replace('public/', ''));
      }
    });

    const filesToDelete = storageFiles
      .filter(f => f.name && !usedFileNames.has(f.name))
      .map(f => `public/${f.name}`);

    if (!filesToDelete.length) {
      showToast('Лишних неиспользуемых фото не обнаружено', 'success');
      return;
    }

    showConfirmModal('Очистка хранилища', `Найдено ${filesToDelete.length} неиспользуемых фото. Удалить их из Supabase Storage?`, async () => {
      const { error: delErr } = await supabaseClient.storage.from('listings').remove(filesToDelete);
      if (delErr) {
        showToast('Ошибка очистки хранилища', 'error');
      } else {
        showToast(`Удалено ${filesToDelete.length} неиспользуемых фото!`, 'success');
      }
    });
  } catch (e) {
    console.error(e);
    showToast('Ошибка при сканировании хранилища', 'error');
  }
}let otpInterval = null;

function startOtpTimer(seconds = 60) {
  clearInterval(otpInterval);
  const timerEl = byId('auth-otp-timer');
  const resendBtn = byId('auth-resend-btn');
  if (resendBtn) resendBtn.classList.add('hidden');
  if (timerEl) { timerEl.classList.remove('hidden'); timerEl.innerText = '01:00'; }

  let timeLeft = seconds;
  otpInterval = setInterval(() => {
    timeLeft--;
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    if (timerEl) timerEl.innerText = `${m}:${s}`;

    if (timeLeft <= 0) {
      clearInterval(otpInterval);
      if (timerEl) timerEl.classList.add('hidden');
      if (resendBtn) resendBtn.classList.remove('hidden');
    }
  }, 1000);
}

function resendWhatsAppCode() {
  pendingRegVerification = null;
  const submitBtn = byId('auth-submit-btn');
  if (submitBtn) {
    submitBtn.innerText = 'Получить код';
    submitBtn.click();
  }
}
// Автоматический оверлей при потере связи
function updateNetworkStatus() {
  const offlineScreen = document.getElementById('offline-screen');
  if (!offlineScreen) return;

  if (navigator.onLine) {
    offlineScreen.classList.add('hidden');
    offlineScreen.classList.remove('flex');
  } else {
    offlineScreen.classList.remove('hidden');
    offlineScreen.classList.add('flex');
  }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
document.addEventListener('DOMContentLoaded', updateNetworkStatus);

// Открытие конструктора акции «Товар + Подарок» для конкретного товара
function openGiftForSpecificAd(adId) {
  const mainAd = ads.find(a => a.id === adId);
  if (!mainAd) return;

  openComboBuilder(currentUser ? currentUser.uid : null);

  setTimeout(() => {
    const titleInp = byId('combo-title');
    const priceInp = byId('combo-price');
    const isAr = currentLang === 'ar';
    if (titleInp) titleInp.value = isAr ? `🎁 عرض خاص: ${mainAd.title} + هدية مجانية!` : `🎁 АКЦИЯ: ${mainAd.title} + Подарок!`;
    if (priceInp) priceInp.value = mainAd.price || '';

    const checkMain = byId(`combo-item-${mainAd.id}`);
    if (checkMain) {
      checkMain.checked = true;
      if (typeof updateComboSummary === 'function') updateComboSummary();
    }
    showToast(t('Выберите из списка второй товар, который пойдет в подарок!'), 'info');
  }, 200);
}
function contactSupport() {
  const isAr = currentLang === 'ar';
  const msg = isAr ? 'مرحباً! أحتاج إلى مساعدة في منصة أفيتو الشام' : 'Здравствуйте! Мне нужна помощь по сайту Avito Sham';
  window.open(`https://wa.me/447887280238?text=${encodeURIComponent(msg)}`, '_blank');
}
