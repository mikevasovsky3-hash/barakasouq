/* ================= SUPABASE & NETWORK SERVICES ================= */

function fixDirectImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  let clean = url.trim();
  
  if (clean.includes('ibb.co/') && !clean.includes('i.ibb.co/')) {
    const id = clean.split('ibb.co/').pop().split('/')[0].split('?')[0];
    if (id) return `https://i.ibb.co/${id}/image.jpg`;
  }
  return clean;
}
// Инициализация Supabase Client
try {
  if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch(e) { console.warn("Supabase init error:", e); }

function saveBackupsMeta() {
  try {
    localStorage.setItem('bs_backups_meta', JSON.stringify(BACKUPS_META));
  } catch(e) {}
}

function saveCachedAds() {
  try {
    const deletedIds = (typeof getDeletedAdsList === 'function') ? getDeletedAdsList() : [];
    // Сохраняем в локальный кэш только последние 35 объявлений для мгновенного старта приложения
    const cleanAds = ads.filter(a => !deletedIds.includes(a.id)).slice(0, 35);
    localStorage.setItem('bs_cached_ads', JSON.stringify(cleanAds));
  } catch (e) {
    console.warn('LocalStorage quota exceeded. Trimming cache...');
    try {
      const deletedIds = (typeof getDeletedAdsList === 'function') ? getDeletedAdsList() : [];
      const minimalAds = ads.filter(a => !deletedIds.includes(a.id)).slice(0, 15);
      localStorage.setItem('bs_cached_ads', JSON.stringify(minimalAds));
    } catch(err) {
      try { localStorage.removeItem('bs_cached_ads'); } catch(e2) {}
    }
  }
}

function loadCachedAds() {
  try {
    const c = localStorage.getItem('bs_cached_ads');
    if (c) {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed)) {
        const deletedIds = (typeof getDeletedAdsList === 'function') ? getDeletedAdsList() : [];
        ads = parsed
          .filter(a => !deletedIds.includes(a.id))
          .map(a => ({
            ...a,
            images: (Array.isArray(a.images) ? a.images : [a.image || '']).map(fixDirectImageUrl),
            image: fixDirectImageUrl(a.image || (Array.isArray(a.images) ? a.images[0] : null))
          }));
      }
    }
    const f = localStorage.getItem('bs_favorites');
    if (f) favorites = JSON.parse(f);
  } catch (e) {}
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function processSquareImageCrop(file, size = 300) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = ev => {
      const img = new Image();
      img.onerror = () => reject(new Error('img'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function validateWhatsApp(number) {
  if (!number) return { valid: false, error: 'Укажите номер WhatsApp' };
  const cleaned = number.replace(/[^\d+]/g, '');
  if (cleaned.length < 8) return { valid: false, error: 'Некорректный номер WhatsApp' };
  return { valid: true, number: cleaned };
}

async function urlToBase64(url) {
  try {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('data:')) return url;
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch(e) {
    return url;
  }
}

function generateFastThumbnail(base64Data, size = 320) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > h) { h = Math.round(h * (size / w)); w = size; }
      else { w = Math.round(w * (size / h)); h = size; }
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      let d = c.toDataURL('image/webp', 0.55);
      if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', 0.55);
      resolve(d);
    };
    img.onerror = () => resolve(base64Data);
    img.src = base64Data;
  });
}

async function pushCategoriesToCloud() {
  if (supabaseClient) {
    await supabaseClient.from('categories').upsert(categories);
  }
}

// ==========================================
// БЛОК ОПТИМИЗАЦИИ И ЗАГРУЗКИ ФОТО
// ==========================================

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
        ctx.drawImage(img, 0, width ? width : 0, 0, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Canvas toBlob failed'));
          }
          const compressedFile = new File([blob], `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`, {
            type: 'image/webp'
          });
          resolve(compressedFile);
        }, 'image/webp', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

async function uploadListingImages(filesArray, bucketName = 'listings') {
  if (!filesArray || filesArray.length === 0) return [];
  
  const uploadPromises = Array.from(filesArray).map(async (file) => {
    // Если передан уже готовый URL (строка), не трогаем его
    if (typeof file === 'string') return file;

    const compressed = await compressSingleImageFile(file);
    const filePath = `public/${compressed.name}`;

    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .upload(filePath, compressed, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Ошибка загрузки в Supabase Storage:', error);
      throw error;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  });

  return await Promise.all(uploadPromises);
}

// ==========================================

async function saveAdToSupabase(ad) {
  if (!supabaseClient) return;
  const dbAd = {
    id: ad.id, title: ad.title, category: ad.category, store_category: ad.storeCategory || '',
    region: ad.region, city: ad.city, is_women_only: !!ad.isWomenOnly, is_free: !!ad.isFree,
    is_negotiable: !!ad.isNegotiable, price: Number(ad.price || 0), old_price: ad.oldPrice !== null && ad.oldPrice !== undefined ? Number(ad.oldPrice) : null, currency: ad.currency,
    description: ad.desc || '', images: ad.images || [], image: ad.image || '',
    lat: Number(ad.lat || 33.5138), lng: Number(ad.lng || 36.2765),
    seller_username: ad.sellerUsername || '', seller_uid: ad.sellerUid || '',
    seller_kunya: ad.sellerKunya || '', seller_whatsapp: ad.sellerWhatsapp || '',
    status: ad.status || 'ACTIVE', created_at: Number(ad.createdAt || Date.now()),
    queue: ad.queue || [], likes: ad.likes || [], views: Number(ad.views || 0)
  };
  await supabaseClient.from('ads').upsert(dbAd);
}

async function _0xSCTransaction(uid, amount, direction) {
  if (!supabaseClient || !uid) throw new Error('Нет соединения с БД');
  const value = _0xSCAmount(amount); 
  if (!value || value <= 0) throw new Error('Некорректная сумма');

  const { data: res, error } = await supabaseClient.rpc('charge_avitocash', {
    p_user_identifier: uid,
    p_amount: value,
    p_action: direction === 'deduct' ? 'DEDUCT' : 'ADD',
    p_reason: direction === 'deduct' ? 'Списание средств' : 'Начисление баланса'
  });

  if (error) throw error;
  if (!res || !res.success) throw new Error(res?.error || 'Сбой биллинговой операции');

  return Number(res.new_balance || 0);
}

async function deductBalance(uid, amount) {
  return await _0xSCTransaction(uid, amount, 'deduct');
}

function addBalance(uid, amount) {
  if (!_0xSCAdmin()) return Promise.reject(new Error('Только Главный Администратор может начислять баланс'));
  return _0xSCTransaction(uid, amount, 'add');
}

async function initSupabaseSync() {
  loadCachedAds();
  renderCategoryPills();
  renderAds();

  const st = byId('cloud-sync-status');
  if (st) { st.classList.remove('hidden'); st.classList.add('flex'); }

try {
const [usersRes, adsRes] = await Promise.all([
  supabaseClient.from('users').select('*'),
  supabaseClient.from('ads').select('*').order('created_at', { ascending: false }).limit(30)
]);	
    const combosPromise = supabaseClient.from('combos').select('*');
    const catsPromise = supabaseClient.from('categories').select('*');
    const reportsPromise = (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERUSER')) 
      ? supabaseClient.from('reports').select('*') 
      : Promise.resolve({ data: [] });
    const [combosRes, catsRes, reportsRes] = await Promise.all([combosPromise, catsPromise, reportsPromise]);

    if (usersRes.data) {
      const allParsedUsers = usersRes.data.map(u => ({
        ...u,
        passwordHash: u.password_hash,
        verifiedShop: !!u.verified_shop,
        avitocashBalance: Number(u.avitocash_balance || 0),
        trialBalance: Number(u.trial_balance || 0),
        showWomenAds: !!u.show_women_ads,
        frozen: !!u.frozen,
        isArchived: !!u.is_archived
      }));

      users = allParsedUsers.filter(u => !u.isArchived);
      archivedUsers = allParsedUsers.filter(u => u.isArchived);

      if (currentUser) {
        const freshMe = allParsedUsers.find(u => (u.uid && u.uid === currentUser.uid) || (u.username && u.username.toLowerCase() === currentUser.username.toLowerCase()));
        if (freshMe) {
          currentUser = { ...currentUser, ...freshMe };
          saveUserSession(currentUser, true);
        }
      }
    }	

if (adsRes.data) {
      const deletedIds = (typeof getDeletedAdsList === 'function') ? getDeletedAdsList() : [];

      ads = adsRes.data
        .filter(a => !deletedIds.includes(a.id))
        .map(a => {
          const owner = users.find(u => u.uid === a.seller_uid || (u.username && a.seller_username && u.username.toLowerCase() === a.seller_username.toLowerCase()));
          return {
            id: a.id,
            title: a.title,
            category: a.category,
            storeCategory: a.store_category,
            region: a.region,
            city: a.city,
            isWomenOnly: !!a.is_women_only,
            isFree: !!a.is_free,
            isNegotiable: !!a.is_negotiable,
            price: Number(a.price || 0),
            oldPrice: a.old_price !== null && a.old_price !== undefined ? Number(a.old_price) : null,
            currency: a.currency,
            desc: a.description || a.desc || '',
            images: (Array.isArray(a.images) ? a.images : [a.image || '']).map(fixDirectImageUrl),
            image: fixDirectImageUrl(a.image || (Array.isArray(a.images) ? a.images[0] : null)),
            lat: Number(a.lat) || 33.5138,
            lng: Number(a.lng) || 36.2765,
            sellerUsername: a.seller_username || owner?.username || '',
            sellerUid: a.seller_uid || owner?.uid || '',
            sellerKunya: a.seller_kunya || owner?.kunya || owner?.username || '',
            sellerWhatsapp: a.seller_whatsapp || owner?.whatsapp || '',
            status: a.status || 'ACTIVE',
            createdAt: Number(a.created_at) || Date.now(),
            queue: Array.isArray(a.queue) ? a.queue : [],
            likes: Array.isArray(a.likes) ? a.likes : [],
            views: Number(a.views || 0)
          };
        });
    }
	
    if (combosRes.data) {
      combos = combosRes.data.map(c => ({
        id: c.id,
        shopUid: c.shop_uid,
        sellerUsername: c.seller_username,
        title: c.title,
        price: Number(c.price || 0),
        items: Array.isArray(c.items) ? c.items : [],
        createdAt: Number(c.created_at) || Date.now()
      }));
    }

    if (catsRes.data && catsRes.data.length) categories = catsRes.data;
    if (reportsRes.data) reports = reportsRes.data;

saveCachedAds();
    renderCategoryPills();
    renderAds();
    if (st) { st.classList.add('hidden'); st.classList.remove('flex'); }
    if (typeof checkUrlHashAdOpen === 'function') checkUrlHashAdOpen();

  } catch (error) {
    console.error("Ошибка синхронизации Supabase:", error);
    if (st) { st.classList.add('hidden'); st.classList.remove('flex'); }
  }
}

async function fetchLiveExchangeRates(manual = false) {
  try {
    const res = await fetch(`https://sp-proxy.mikevasovsky3.workers.dev/?_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const ov = data?.overview;
    const ovObj = Array.isArray(ov) ? (ov[0] || {}) : (ov || {});
    const ratesArr = ovObj?.data?.rates || data?.data?.rates || (Array.isArray(data?.rates) ? data.rates : null);
    const globalFx = ovObj?.global_fx || data?.global_fx || null;
    const pickCity = r => { const c = r?.cities || {}; return c.damascus || c.Damascus || Object.values(c)[0] || {}; };
    let rawUsd = null, rawTry = null, sypVal = null, tryVal = null;
    if (Array.isArray(ratesArr)) {
      const usd = ratesArr.find(r => r.code === 'USD');
      const tryp = ratesArr.find(r => r.code === 'TRY');
      if (usd) { const cv = pickCity(usd); const raw = parseFloat(cv.sell ?? cv.buy); if (!isNaN(raw)) rawUsd = raw; }
      if (tryp) { const cv = pickCity(tryp); const raw = parseFloat(cv.sell ?? cv.buy); if (!isNaN(raw)) rawTry = raw; }
    }
    if (rawUsd !== null) sypVal = rawUsd > 1000 ? rawUsd / 100 : rawUsd;
    if (Array.isArray(globalFx)) {
      const p = globalFx.find(g => String(g.pair || '').toUpperCase() === 'USD/TRY');
      if (p) { const r = parseFloat(p.rate); if (!isNaN(r) && r > 1 && r < 500) tryVal = r; }
    }
    if (tryVal === null && rawUsd !== null && rawTry !== null && rawTry > 0) tryVal = +(rawUsd / rawTry).toFixed(2);
    if (sypVal !== null && !isNaN(sypVal) && sypVal > 0) {
      EXCHANGE_RATES.SYP = +sypVal.toFixed(2);
      if (tryVal !== null && !isNaN(tryVal)) EXCHANGE_RATES.TRY = +tryVal.toFixed(2);
      lastRatesUpdate = new Date();
      localStorage.setItem('bs_rates', JSON.stringify(EXCHANGE_RATES));
      renderAds();
      if (!byId('modal-profile').classList.contains('hidden')) openProfileModal();
      if (!byId('modal-admin-panel').classList.contains('hidden') && SYSTEM_CONFIG.adminTab === 'rates') renderAdminTabContent();
      if (manual) showToast(`Курс обновлен: $1 = ${EXCHANGE_RATES.SYP} SYP / ${EXCHANGE_RATES.TRY} TRY`, 'success');
    } else if (manual) showToast('Не удалось разобрать курс из ответа сервера', 'error');
  } catch (err) {
    console.warn('Live rates error:', err);
    if (manual) showToast('Ошибка получения курса валют', 'error');
  }
}

async function translateDynamic(text, targetLang = currentLang) {
  if (!text || typeof text !== 'string') return text;
  const clean = text.trim();
  if (!clean) return text;
  if (DICTIONARY[clean] && targetLang === 'ar') return DICTIONARY[clean];
  
  const cacheKey = `${targetLang}_${clean}`;
  if (TRANSLATE_CACHE[cacheKey]) return TRANSLATE_CACHE[cacheKey];

  const isArabicText = /[\u0600-\u06FF]/.test(clean);
  if (targetLang === 'ar' && isArabicText) return clean;
  if (targetLang === 'ru' && !isArabicText) return clean;

  const sl = isArabicText ? 'ar' : 'ru';
  const tl = targetLang;

  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(googleUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const result = data[0].map(x => x[0]).join('');
        TRANSLATE_CACHE[cacheKey] = result;
        return result;
      }
    }
  } catch (e) {}

  try {
    const proxyUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 450))}&langpair=${sl}|${tl}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText && !data.responseData.translatedText.includes('QUERY LENGTH LIMIT')) {
        const result = data.responseData.translatedText;
        TRANSLATE_CACHE[cacheKey] = result;
        return result;
      }
    }
  } catch (e) {}

  return clean;
}

/* ================= MARQUEE FUNCTIONS ================= */
async function updateMarqueeText(text) {
  MARQUEE_SETTINGS.text = text;
  const desktop = byId('desktop-marquee-text');
  const mobile = byId('mobile-marquee-text');
  
  let displayText = text;
  if (currentLang === 'ar') {
    displayText = await translateDynamic(text, 'ar');
  } else {
    displayText = await translateDynamic(text, 'ru');
  }

  if (desktop) desktop.innerText = displayText;
  if (mobile) mobile.innerText = displayText;
  
  const input = byId('admin-marquee-input');
  if (input && document.activeElement !== input) input.value = text;
  updateMarqueePreview(displayText);
}

function applyMarqueeSettings(settings) {
  MARQUEE_SETTINGS = { ...MARQUEE_SETTINGS, ...settings };
  updateMarqueeText(MARQUEE_SETTINGS.text || '');
  document.querySelectorAll('.marquee-container').forEach(container => {
    container.classList.toggle('marquee-pause-hover', !!MARQUEE_SETTINGS.pauseOnHover);
  });
  document.querySelectorAll('.marquee-content').forEach(content => {
    content.style.setProperty('--marquee-color', MARQUEE_SETTINGS.color || '#a8a8a8');
    content.style.setProperty('--marquee-font-size', `${Number(MARQUEE_SETTINGS.fontSize) || 13}px`);
    content.style.setProperty('--marquee-speed', `${Number(MARQUEE_SETTINGS.speed) || 20}s`);
    content.style.animationDirection = MARQUEE_SETTINGS.direction === 'right' ? 'reverse' : 'normal';
  });
  updateMarqueeControls();
}

function updateMarqueePreview(text) {
  const preview = byId('admin-marquee-preview');
  const counter = byId('admin-marquee-counter');
  if (preview) preview.innerText = text || 'Предпросмотр появится здесь';
  if (counter) counter.innerText = `${String(text || '').length} символов`;
}

function handleMarqueeInput(input) {
  MARQUEE_SETTINGS.text = input.value;
  updateMarqueePreview(input.value);
}

function updateMarqueeControls() {
  const color = byId('admin-marquee-color');
  const size = byId('admin-marquee-size');
  const speed = byId('admin-marquee-speed');
  const direction = byId('admin-marquee-direction');
  const pause = byId('admin-marquee-pause');
  if (color) color.value = MARQUEE_SETTINGS.color || '#a8a8a8';
  if (size) size.value = MARQUEE_SETTINGS.fontSize || 13;
  if (speed) speed.value = MARQUEE_SETTINGS.speed || 20;
  if (direction) direction.value = MARQUEE_SETTINGS.direction || 'left';
  if (pause) pause.checked = !!MARQUEE_SETTINGS.pauseOnHover;
}

function handleMarqueeSettingsInput() {
  const input = byId('admin-marquee-input');
  MARQUEE_SETTINGS.text = input ? input.value : MARQUEE_SETTINGS.text;
  MARQUEE_SETTINGS.color = byId('admin-marquee-color')?.value || MARQUEE_SETTINGS.color;
  MARQUEE_SETTINGS.fontSize = Number(byId('admin-marquee-size')?.value || MARQUEE_SETTINGS.fontSize);
  MARQUEE_SETTINGS.speed = Number(byId('admin-marquee-speed')?.value || MARQUEE_SETTINGS.speed);
  MARQUEE_SETTINGS.direction = byId('admin-marquee-direction')?.value || MARQUEE_SETTINGS.direction;
  MARQUEE_SETTINGS.pauseOnHover = !!byId('admin-marquee-pause')?.checked;
  applyMarqueeSettings(MARQUEE_SETTINGS);
}

function loadMarqueeText() {
  const savedText = localStorage.getItem(MARQUEE_STORAGE_KEY);
  if (savedText) updateMarqueeText(savedText);
}

async function saveMarqueeSettings() {
  const input = byId('admin-marquee-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) { showToast('Введите текст для бегущей строки', 'warning'); return; }
  const settings = { ...MARQUEE_SETTINGS, text };
  localStorage.setItem(MARQUEE_STORAGE_KEY, text);
  applyMarqueeSettings(settings);
  await updateMarqueeText(text);
  showToast('Бегущая строка сохранена и автоматически переведена!', 'success');
}

function translateStaticUI(lang) {
  const navMap = {
    'sb-home': 'Главная', 'sb-shops': 'Магазины', 'sb-create': 'Создать',
    'sb-fav': 'Избранное', 'sb-profile': 'Профиль'
  };
  Object.keys(navMap).forEach(id => {
    const el = byId(id)?.querySelector('.nav-label');
    if (el) el.innerText = lang === 'ar' ? DICTIONARY[navMap[id]] || navMap[id] : navMap[id];
  });

  const supLbl = byId('sb-support-label');
  if (supLbl) supLbl.innerText = lang === 'ar' ? DICTIONARY['Техподдержка'] : 'Техподдержка';

  const donLbl = byId('sb-donate-label');
  if (donLbl) donLbl.innerText = lang === 'ar' ? DICTIONARY['Поддержать проект'] : 'Поддержать проект';

  const thmLbl = byId('sb-theme-label');
  if (thmLbl) thmLbl.innerText = lang === 'ar' ? DICTIONARY['Сменить тему'] : 'Сменить тему';

  const nearLbl = byId('near-me-label');
  if (nearLbl) nearLbl.innerText = activeRadiusKm > 0 ? `${activeRadiusKm} ${t('км')}` : t('Рядом');

  const regLbl = byId('current-region-label');
  if (regLbl) {
    const regVal = byId('region-filter')?.value || 'ALL';
    const rawName = regVal === 'ALL' ? 'Все регионы' : (REGION_NAMES[regVal] || 'Все регионы');
    regLbl.innerText = lang === 'ar' ? (DICTIONARY[rawName] || rawName) : rawName;
  }

  const sortLbl = byId('current-sort-label');
  if (sortLbl) {
    const sortLabels = { newest: 'Новые', cheapest: 'Дешевые', expensive: 'Дорогие', popular: 'Популярные' };
    const rawSort = sortLabels[currentSortMode] || 'Новые';
    sortLbl.innerText = lang === 'ar' ? (DICTIONARY[rawSort] || rawSort) : rawSort;
  }

  const supTitle = byId('support-modal-title');
  if (supTitle) supTitle.innerText = lang === 'ar' ? DICTIONARY['Поддержка сервера — ShamCash'] : 'Поддержка сервера — ShamCash';
  const supDesc = byId('support-modal-desc');
  if (supDesc) supDesc.innerText = lang === 'ar' ? DICTIONARY['Отсканируйте QR-код в приложении ShamCash, чтобы оплатить и поддержать платформу Авито Шам.'] : 'Отсканируйте QR-код в приложении ShamCash, чтобы оплатить и поддержать платформу Авито Шам.';
  const supIdLbl = byId('support-modal-idlabel');
  if (supIdLbl) supIdLbl.innerText = lang === 'ar' ? DICTIONARY['ID счёта ShamCash'] : 'ID счёта ShamCash';
  const supCopy = byId('support-modal-copybtn')?.querySelector('span');
  if (supCopy) supCopy.innerText = lang === 'ar' ? DICTIONARY['Скопировать ID'] : 'Скопировать ID';

const createTitle = document.querySelector('#modal-create-ad h3');
  if (createTitle) createTitle.innerText = t('Подача объявления');
  const adTitleInp = byId('ad-title');
  if (adTitleInp) adTitleInp.placeholder = t('Заголовок объявления *');
  const adCityInp = byId('ad-city');
  if (adCityInp) adCityInp.placeholder = t('Точный город/район');
  const adPriceInp = byId('ad-price');
  if (adPriceInp) adPriceInp.placeholder = t('Цена *');
  const adDescInp = byId('ad-desc');
  if (adDescInp) adDescInp.placeholder = t('Описание и возможные изъяны *');
  const createSubBtn = document.querySelector('#modal-create-ad button[type="submit"]');
  if (createSubBtn) createSubBtn.innerText = t('Опубликовать объявление');

  const gKunya = byId('guest-kunya');
  if (gKunya) gKunya.placeholder = t('Ваше Имя / Кунья *');
  const gUser = byId('guest-username');
  if (gUser) gUser.placeholder = t('Придумайте логин *');
  const gPass = byId('guest-password');
  if (gPass) gPass.placeholder = t('Придумайте пароль *');
}