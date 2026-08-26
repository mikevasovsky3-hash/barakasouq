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
    if (!currentUser) { openAuthModal(); showToast('Войдите в аккаунт для подачи объявления', 'warning'); } 
    else openCreateAdModal(); 
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
  let changed = false;

  ads.forEach(a => {
    if (a.status === 'ACTIVE' && a.createdAt && (now - a.createdAt > THIRTY_DAYS)) {
      a.status = 'EXPIRED';
      changed = true;
      if (supabaseClient) {
        supabaseClient.from('ads').update({ status: 'EXPIRED' }).eq('id', a.id).then();
      }
    }
  });

  if (changed) saveCachedAds();
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
    const notif = new Notification(title, {
      body: body,
      icon: icon || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%230095f6\'/%3E%3Ctext x=\'50\' y=\'68\' font-family=\'Arial\' font-weight=\'900\' font-size=\'56\' fill=\'%23ffffff\' text-anchor=\'middle\'%3EA%3C/text%3E%3C/svg%3E',
      badge: icon
    });
    playNotificationSound();
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
      const compressedFile = await compressSingleImageFile(f, 1280, 1280, 0.75);
const filePath = `public/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

      const { error: sbErr } = await supabaseClient.storage
        .from('listings')
        .upload(filePath, compressedFile, {
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
  const ad = ads.find(a => a.id === adId) || combos.find(x => x.id === adId); if (!ad) return;
  const base = (location.origin && location.origin !== 'null') ? location.origin + location.pathname : location.href.split('#')[0];
  const url = base + '#ad-' + ad.id;
  sharePayload = { title: ad.title, text: `${ad.title} — Авито Шам (Сирия)`, url: url };
  const state = byId('share-preview-state'), preview = byId('share-preview-wrap');
  if (state) { state.innerText = 'Генерируем красивую карточку...'; state.classList.remove('hidden'); }
  if (preview) preview.classList.add('hidden');
  openShareSheet();
  showToast('Генерация красивой карточки…', 'info');
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
    state.innerText = 'Не удалось создать карточку. Можно отправить ссылку.';
    showToast('Не удалось создать карточку, ссылка доступна ниже', 'warning');
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
  if (!lastShareBlob) { showToast('Сначала нажмите "Поделиться", чтобы создать картинку', 'warning'); return; }
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
  showToast('Браузер не поддерживает отправку файлов, открываю ссылку...', 'warning');
  const enc = encodeURIComponent;
  const u = sharePayload.url, tx = sharePayload.text;
  let link = '';
  if (app === 'whatsapp') link = `https://wa.me/?text=${enc(tx + ' ' + u)}`;
  else if (app === 'telegram') link = `https://t.me/share/url?url=${enc(u)}&text=${enc(tx)}`;
  else if (app === 'viber') link = `viber://forward?text=${enc(tx + ' ' + u)}`;
  if (link) window.open(link, '_blank');
}

async function downloadShareCard() {
  if (!lastShareBlob) { showToast('Карточка еще не готова — нажмите Поделиться сначала', 'warning'); return; }
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
      showToast('Красивая карточка скачана', 'success');
      closeModal('modal-share');
    };
    reader.readAsDataURL(lastShareBlob);
    closeModal('modal-share');
  } catch (e) {
    showToast('Ошибка сохранения', 'error');
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
  showConfirmModal('Удаление категории', `Удалить категорию "${c.name}"? Объявления останутся в базе, но категория исчезнет из ленты.`, () => { 
    categories = categories.filter(x => x.id !== catId); 
    pushCategoriesToCloud(); 
    if (selectedCategory === catId) selectedCategory = 'all'; 
    renderCategoryPills(); 
    renderAdminTabContent(); 
    renderAds(); 
    showToast('Категория удалена', 'info'); 
  }); 
}

function loadDraftCheck() { try { const d = localStorage.getItem('bs_ad_draft'); if (d) { byId('draft-restore-banner').classList.remove('hidden'); } } catch(e){} }
function saveDraft() { try { const data = { title: byId('ad-title').value, category: byId('ad-category').value, region: byId('ad-region').value, city: byId('ad-city').value, price: byId('ad-price').value, currency: byId('ad-currency').value, desc: byId('ad-desc').value }; localStorage.setItem('bs_ad_draft', JSON.stringify(data)); } catch(e){} }
function restoreDraft() { try { const d = localStorage.getItem('bs_ad_draft'); if (d) { const data = JSON.parse(d); byId('ad-title').value = data.title || ''; byId('ad-category').value = data.category || 'electronics'; byId('ad-region').value = data.region || 'DAM'; byId('ad-city').value = data.city || ''; byId('ad-price').value = data.price || ''; byId('ad-currency').value = data.currency || 'USD'; byId('ad-desc').value = data.desc || ''; byId('draft-restore-banner').classList.add('hidden'); } } catch(e){} }
function clearDraft(silent) { localStorage.removeItem('bs_ad_draft'); byId('draft-restore-banner').classList.add('hidden'); if(!silent) showToast('Черновик удален', 'info'); }

function openCreateAdModal() { 
  if (!currentUser) { openAuthModal(); return; } 
  pendingCreateImages = []; 
  renderPhotoThumbnailsGrid('create'); 
  fillCategorySelect(byId('ad-category')); 
  loadDraftCheck();

  const savedLocation = localStorage.getItem('bs_last_seller_location');
  if (savedLocation && (!localStorage.getItem('bs_ad_draft'))) {
    try {
      const loc = JSON.parse(savedLocation);
      if (loc.region) byId('ad-region').value = loc.region;
      if (loc.city) byId('ad-city').value = loc.city;
      if (loc.lat) byId('ad-lat').value = loc.lat;
      if (loc.lng) byId('ad-lng').value = loc.lng;
    } catch (e) {}
  } 

  const sc = byId('ad-store-cat-container'), ss = byId('ad-store-category'); 
  if (currentUser.shop && currentUser.shop.customCategories && currentUser.shop.customCategories.length > 0) { 
    ss.innerHTML = `<option value="">Без специальной категории магазина</option>` + currentUser.shop.customCategories.map(cat => `<option value="${cat}">${cat}</option>`).join(''); 
    sc.classList.remove('hidden'); 
  } else sc.classList.add('hidden'); 

  const wb = byId('women-only-container'); 
  if (currentUser.gender === 'FEMALE' || currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN') { 
    wb.classList.remove('hidden'); wb.classList.add('flex'); 
  } else { 
    wb.classList.add('hidden'); wb.classList.remove('flex'); 
  } 

  const neg = byId('ad-is-negotiable'); 
  if (neg) { neg.checked = false; toggleNegotiableField(false); } 

  const onbC = byId('ad-onbehalf-container'), onbS = byId('ad-post-onbehalf'); 
  if (onbC && onbS) { 
    if (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN') { 
      onbS.innerHTML = `<option value="${currentUser.username}">Себя — ${currentUser.kunya || currentUser.username}</option>` + users.filter(u => u.username !== currentUser.username).map(u => `<option value="${u.username}">@${u.username} — ${u.kunya || 'без имени'}</option>`).join(''); 
      if (onBehalfPreset) { onbS.value = onBehalfPreset; onBehalfPreset = null; } 
      onbC.classList.remove('hidden'); 
    } else onbC.classList.add('hidden'); 
  } 

  const mHead = document.querySelector('#modal-create-ad h3');
  if (mHead) mHead.innerText = t('Подача нового объявления');

  const tInp = byId('ad-title'), cInp = byId('ad-city'), pInp = byId('ad-price'), dInp = byId('ad-desc');
  if (tInp) tInp.placeholder = t('Заголовок объявления *');
  if (cInp) cInp.placeholder = t('Город / Населенный пункт *');
  if (pInp) pInp.placeholder = t('Цена *');
  if (dInp) dInp.placeholder = t('Описание и возможные изъяны *');

  const subBtn = document.querySelector('#modal-create-ad button[type="submit"]');
  if (subBtn) subBtn.innerText = t('Опубликовать объявление');

  const rSel = byId('ad-region');
  if (rSel) {
    Array.from(rSel.options).forEach(opt => {
      if (opt.value) opt.text = t(REGION_NAMES[opt.value] || opt.text);
      else opt.text = t('Регион *');
    });
  }

  const upTxt = byId('ad-upload-btn-text');
  if (upTxt) upTxt.innerText = t('Выбрать фотографии');

  openModal('modal-create-ad'); 
  setTimeout(initCreateMap, 200); 
  document.querySelectorAll('.draft-field').forEach(el => { 
    el.addEventListener('input', saveDraft); 
    el.addEventListener('change', saveDraft); 
  }); 
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
  if (isFree) { 
    if (p) { p.value = '0'; p.removeAttribute('required'); p.disabled = true; } 
    if (c) c.style.opacity = '.4'; 
  } else { 
    if (p) { p.value = ''; p.setAttribute('required', 'required'); p.disabled = false; } 
    if (c) c.style.opacity = '1'; 
  } 
}

function toggleNegotiableField(isNeg) { 
  const p = byId('ad-price'); 
  if (!p) return; 
  if (isNeg) { 
    p.value = '0'; p.removeAttribute('required'); p.disabled = true; 
  } else if (!byId('ad-is-free') || !byId('ad-is-free').checked) { 
    p.value = ''; p.setAttribute('required', 'required'); p.disabled = false; 
  } 
}

// Вспомогательная функция сжатия изображений
async function compressSingleImageFile(file, maxWidth = 1280, maxHeight = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Canvas toBlob failed'));
          }
          const compressedFile = new File([blob], `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`, {
            type: 'image/jpeg'
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
		};
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

async function handleCreateAdSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;

  const isFree = byId('ad-is-free')?.checked || false;
  const isNegotiable = byId('ad-is-negotiable')?.checked || false;
  const price = (isFree || isNegotiable) ? 0 : parseFloat(byId('ad-price').value || 0);

  let postingUser = currentUser;
  const onbS = byId('ad-post-onbehalf');
  if (onbS && onbS.value && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN')) {
    const t = users.find(u => u.username === onbS.value);
    if (t) postingUser = t;
  }

  // === ЛОГИКА ТАРИФИКАЦИИ И МАГАЗИНА ===
  const hasShop = !!(postingUser.shop);
  const myActiveAdsCount = ads.filter(a => 
    a.sellerUsername && 
    a.sellerUsername.toLowerCase() === (postingUser.username || '').toLowerCase() && 
    a.status === 'ACTIVE'
  ).length;

  if (hasShop) {
    const shopLimit = postingUser.shop.maxAds || 50;
    if (myActiveAdsCount >= shopLimit) {
      showToast(`Лимит объявлений магазина (${shopLimit} шт.) исчерпан. Расширьте тариф в настройках магазина!`, 'warning');
      return;
    }
  } else {
    const adPrice = AVITOCASH_PRICES.adPrice || 1;
    const charged = await _0xSCCharge(postingUser.uid || postingUser.username, adPrice, 'Публикация объявления');
    if (!charged) {
      return;
    }
  }
  // =====================================

  const imgs = [...pendingCreateImages];
  if (!imgs.length) imgs.push(PLACEHOLDER_IMG);

  const adId = 'AD-' + Date.now().toString(36).toUpperCase();
  const newAd = {
    id: adId,
    title: byId('ad-title').value.trim(),
    category: byId('ad-category').value,
    storeCategory: byId('ad-store-category')?.value || '',
    region: byId('ad-region').value,
    city: byId('ad-city').value.trim(),
    isWomenOnly: byId('ad-is-women-only')?.checked || false,
    isFree,
    isNegotiable,
    price,
    currency: byId('ad-currency').value,
    desc: byId('ad-desc').value.trim(),
    images: imgs,
    image: imgs[0],
    lat: parseFloat(byId('ad-lat').value || 33.5138),
    lng: parseFloat(byId('ad-lng').value || 36.2765),
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
      showToast('Ошибка сохранения объявления в базе: ' + insertErr.message, 'error');
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

  showToast(postingUser.username !== currentUser.username ? `Объявление опубликовано от имени @${postingUser.username}!` : 'Объявление опубликовано!', 'success');
}

function openEditAdModal(adId) {
  const ad = ads.find(a => a.id === adId);
  if (!ad) return;
  const isOwner = currentUser && (currentUser.username.toLowerCase() === (ad.sellerUsername || '').toLowerCase() || currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN');
  if (!isOwner) {
    showToast('Нет прав для редактирования!', 'error');
    return;
  }

  const ownerContainer = byId('edit-ad-owner-container');
  const ownerSelect = byId('edit-ad-seller-username');
  if (ownerContainer && ownerSelect) {
    if (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN') {
      ownerSelect.innerHTML = users.map(u => `<option value="${u.username}">@${u.username} — ${u.kunya || 'без имени'}</option>`).join('');
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

function doToggleLike(adId) { 
  if (!currentUser) { openAuthModal(); showToast('Войдите в аккаунт, чтобы ставить лайки', 'warning'); return false; } 
  const ad = ads.find(a => a.id === adId); 
  if (!ad) return false; 
  if (!ad.likes) ad.likes = []; 
  const i = ad.likes.indexOf(currentUser.username); 
  if (i === -1) ad.likes.push(currentUser.username); 
  else ad.likes.splice(i, 1); 
  saveCachedAds(); 
  if (supabaseClient) supabaseClient.from('ads').update({ likes: ad.likes }).eq('id', adId).then(); 
  return true; 
}

function toggleLike(adId, e) { if (e) e.stopPropagation(); if (!doToggleLike(adId)) return; renderAds(); }
function toggleLikeDetail(adId) { if (!doToggleLike(adId)) return; renderAds(); openAdDetail(adId, false); }

function toggleFavorite(adId, e) { 
  if (e) e.stopPropagation(); 
  if (favorites.includes(adId)) { 
    favorites = favorites.filter(i => i !== adId); 
    showToast('Удалено из избранного', 'info'); 
  } else { 
    favorites.push(adId); 
    showToast('Добавлено в избранное!', 'success'); 
  } 
  try { localStorage.setItem('bs_favorites', JSON.stringify(favorites)); } catch (err) {} 
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
  if (b) b.innerText = byId('reg-fields')?.classList.contains('hidden') ? t('Войти') : t('Зарегистрироваться');
  
  const uInp = byId('auth-username'), pInp = byId('auth-password'), kInp = byId('auth-kunya'), wInp = byId('auth-whatsapp');
  if (uInp) uInp.placeholder = t('Логин *');
  if (pInp) pInp.placeholder = t('Пароль *');
  if (kInp) kInp.placeholder = t('Имя / Кунья *');
  if (wInp) wInp.placeholder = t('WhatsApp номер * (+963…)');
  
  const remLbl = byId('auth-remember-me')?.parentElement?.querySelector('span');
  if (remLbl) remLbl.innerText = t('Запомнить мой вход на этом устройстве');

  openModal('modal-auth'); 
}

function switchAuthTab(tab) { 
  const l = byId('tab-login'), r = byId('tab-register'), f = byId('reg-fields'), b = byId('auth-submit-btn'); 
  if (tab === 'login') { 
    l.style.borderColor = '#0095f6'; l.style.color = '#0095f6'; 
    r.style.borderColor = 'transparent'; r.style.color = 'var(--ig-text2)'; 
    f.classList.add('hidden'); 
    b.innerText = t('Войти'); 
  } else { 
    r.style.borderColor = '#0095f6'; r.style.color = '#0095f6'; 
    l.style.borderColor = 'transparent'; l.style.color = 'var(--ig-text2)'; 
    f.classList.remove('hidden'); 
    b.innerText = t('Зарегистрироваться'); 
  } 
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const isReg = !byId('reg-fields').classList.contains('hidden');
  const username = byId('auth-username').value.trim();
  const rawPassword = byId('auth-password').value;
  const password = await sha256(rawPassword);
  const remember = byId('auth-remember-me').checked;
  const btn = byId('auth-submit-btn');
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = 'Проверка...';

  if (isReg) {
    const kunya = byId('auth-kunya').value.trim() || username;
    const gender = document.querySelector('input[name="auth-gender"]:checked')?.value || 'MALE';
    const whatsappRaw = byId('auth-whatsapp').value.trim();
    const avatar = byId('auth-avatar-data')?.value || null;

    if (users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase()) || archivedUsers.some(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
      showToast('Логин уже занят!', 'error');
      btn.disabled = false; btn.innerText = originalText;
      return;
    }

    const whatsappCheck = validateWhatsApp(whatsappRaw);
    if (!whatsappCheck.valid) {
      showToast(whatsappCheck.error, 'error');
      btn.disabled = false; btn.innerText = originalText;
      return;
    }
    const whatsapp = whatsappCheck.number;

    const waExists = users.some(u => u.whatsapp && u.whatsapp.replace(/\D/g,'') === whatsapp.replace(/\D/g,'')) || archivedUsers.some(u => u.whatsapp && u.whatsapp.replace(/\D/g,'') === whatsapp.replace(/\D/g,''));
    if (waExists) {
      showToast('Этот номер WhatsApp уже зарегистрирован!', 'error');
      btn.disabled = false; btn.innerText = originalText;
      return;
    }

    const uid = 'u_' + Date.now();
    if (!supabaseClient) {
      showToast('Нет соединения с базой данных', 'error');
      btn.disabled = false; btn.innerText = originalText;
      return;
    }

    const { data: regRes, error: regErr } = await supabaseClient.rpc('register_new_user', {
      p_uid: uid,
      p_username: username,
      p_password_hash: password,
      p_kunya: kunya,
      p_gender: gender,
      p_whatsapp: whatsapp,
      p_avatar: avatar
    });

    if (regErr || !regRes || !regRes.success) {
      showToast(regRes?.error || 'Ошибка при регистрации', 'error');
      btn.disabled = false; btn.innerText = originalText;
      return;
    }

    const localUser = regRes.user;
    users.push(localUser);
    saveUserSession(localUser, remember);
    closeModal('modal-auth');
    showToast('Регистрация успешна! 🎁 Приветственный бонус: 10 AC', 'success');
    btn.disabled = false; btn.innerText = originalText;
  } else {
    const isArchivedLocally = archivedUsers.some(u => u.username && u.username.toLowerCase() === username.toLowerCase());
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
        p_username: username,
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

        saveUserSession(foundUser, remember);
        closeModal('modal-auth');
        showToast(`С возвращением, ${foundUser.kunya || foundUser.username}!`, 'success');
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
  if (localStorage.getItem('bs_theme') === 'light') {
    document.body.classList.add('light-mode');
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

  restoreUserSession();
  initSupabaseSync();
  fetchLiveExchangeRates();
  setInterval(fetchLiveExchangeRates, 5 * 60 * 1000);
  setInterval(checkExpiredAdsStatus, 60 * 60 * 1000);
  requestPushPermission();
});

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
  const ad = ads.find(a => a.id === adId) || combos.find(c => c.id === adId);
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
  setAdStatusSecure(adId, 'SOLD', 'Объявление отмечено как проданное');
}

// 4. Смена статуса продавцом: «Передумал»
function markAdWithdrawn(adId) {
  setAdStatusSecure(adId, 'WITHDRAWN', 'Статус изменен: передумал продавать');
}

// 5. Архивация объявления с подтверждением
function archiveAdWithConfirm(adId) {
  showConfirmModal('Архивация', 'Перенести объявление в архив?', () => {
    setAdStatusSecure(adId, 'ARCHIVED', 'Объявление перенесено в архив');
  });
}

// 6. Восстановление объявления из архива
function restoreAd(adId) {
  setAdStatusSecure(adId, 'ACTIVE', 'Объявление успешно восстановлено');
}

// Обработчик живого поиска и синхронизации Desktop / Mobile инпутов
function onSearchInput(el) {
  const val = (el ? el.value : '').trim();
  const desktop = byId('search-input-desktop');
  const mobile = byId('search-input');
  if (desktop && desktop !== el) desktop.value = el.value;
  if (mobile && mobile !== el) mobile.value = el.value;
  searchQuery = val;
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
    showToast('У вас нет прав для удаления этого объявления', 'error');
    return;
  }

  showConfirmModal('Удаление объявления', 'Вы уверены, что хотите навсегда удалить это объявление? Восстановить его будет невозможно.', async () => {
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

    showToast('Объявление удалено навсегда', 'info');

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
      if (chk) chk.classList.toggle('hidden', activeRadiusKm !== km);
    });
    const offChk = byId('radius-btn-off');
    if (offChk) {
      offChk.style.opacity = activeRadiusKm === 0 ? '1' : '0.7';
      const offCheckIcon = byId('radius-check-off');
      if (offCheckIcon) offCheckIcon.classList.toggle('hidden', activeRadiusKm !== 0);
    }
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
    // Если координаты уже определены в текущей сессии — переключаем радиус мгновенно
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
    const btn = byId('btn-near-me') || lbl?.closest('button');
    if (lbl) lbl.innerText = t('Рядом');
    if (btn) btn.classList.remove('text-blue-500', 'border-blue-500');
    closeRadiusMenu();
    resetPageAndRender();
    showToast('Поиск рядом отключен', 'info');
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