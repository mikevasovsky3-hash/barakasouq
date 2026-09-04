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

function saveCachedCombos() {
  try {
    localStorage.setItem('bs_cached_combos', JSON.stringify(combos));
  } catch(e) {}
}

function saveCachedAds() {
  const deletedIds = (typeof getDeletedAdsList === 'function') ? getDeletedAdsList() : [];
  const cleanAds = (Array.isArray(ads) ? ads : []).filter(a => a && !deletedIds.includes(a.id));
  
  try {
    // Сохраняем первые 100 активных объявлений для мгновенного офлайн-старта без перегрузки памяти
    const optimizedCache = cleanAds.slice(0, 100).map(a => ({
      id: a.id,
      title: a.title,
      category: a.category,
      storeCategory: a.storeCategory,
      region: a.region,
      city: a.city,
      isWomenOnly: !!a.isWomenOnly,
      isFree: !!a.isFree,
      isNegotiable: !!a.isNegotiable,
      price: a.price,
      oldPrice: a.oldPrice,
      currency: a.currency,
desc: (a.desc || '').slice(0, 300),
      link: a.link || '',
      images: Array.isArray(a.images) ? a.images.slice(0, 6) : [a.image],
      image: a.image || (Array.isArray(a.images) ? a.images[0] : null),
      lat: a.lat,
      lng: a.lng,
      sellerUsername: a.sellerUsername,
      sellerUid: a.sellerUid,
      sellerKunya: a.sellerKunya,
      sellerWhatsapp: a.sellerWhatsapp,
      status: a.status,
      createdAt: a.createdAt,
      queue: a.queue || [],
      likes: a.likes || [],
      views: a.views || 0
    }));
    localStorage.setItem('bs_cached_ads', JSON.stringify(optimizedCache));
  } catch (e) {
    console.warn('LocalStorage quota exceeded. Trimming cache...');
    try {
      const minimalCache = cleanAds.slice(0, 30);
      localStorage.setItem('bs_cached_ads', JSON.stringify(minimalCache));
    } catch(err) {
      try { localStorage.removeItem('bs_cached_ads'); } catch(e2) {}
    }
  }
  saveCachedCombos();
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
    const cb = localStorage.getItem('bs_cached_combos');
    if (cb) {
      const parsedCombos = JSON.parse(cb);
      if (Array.isArray(parsedCombos)) combos = parsedCombos;
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
        ctx.drawImage(img, 0, 0, width, height);
		
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
    if (typeof file === 'string') return file;

    const compressed = await compressSingleImageFile(file);
    const filePath = `public/${compressed.name}`;

    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .upload(filePath, compressed, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
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
    description: ad.desc || '', link: ad.link || '', images: ad.images || [], image: ad.image || '',
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

let isBackgroundSyncActive = false;

function mapSupabaseAdToLocal(a) {
  const owner = (typeof users !== 'undefined' && Array.isArray(users)) 
    ? users.find(u => u.uid === a.seller_uid || (u.username && a.seller_username && u.username.toLowerCase() === a.seller_username.toLowerCase())) 
    : null;

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
    link: a.link || '',
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
}

async function startBackgroundDualClutchSync(startOffset = 20, chunkSize = 20) {
  if (isBackgroundSyncActive || !supabaseClient) return;
  isBackgroundSyncActive = true;

  let currentOffset = startOffset;
  const runSyncChunk = async () => {
    try {
      const { data: chunk, error } = await supabaseClient
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + chunkSize - 1);

      if (error) throw error;

      if (chunk && chunk.length > 0) {
        const deletedIds = (typeof getDeletedAdsList === 'function') ? getDeletedAdsList() : [];
        const validChunk = chunk.filter(a => !deletedIds.includes(a.id));

        const existingMap = new Map((ads || []).map(a => [a.id, a]));
        let hasNewData = false;

        validChunk.forEach(rawItem => {
          const mapped = mapSupabaseAdToLocal(rawItem);
          if (!existingMap.has(mapped.id)) {
            ads.push(mapped);
            hasNewData = true;
          } else {
            Object.assign(existingMap.get(mapped.id), mapped);
          }
        });

        if (hasNewData) {
          saveCachedAds();
          if (typeof renderCategoryPills === 'function') renderCategoryPills();
          if (typeof renderAds === 'function') renderAds();
        }

        if (chunk.length === chunkSize) {
          currentOffset += chunkSize;
          const scheduleNext = window.requestIdleCallback || ((cb) => setTimeout(cb, 120));
          scheduleNext(runSyncChunk);
          return;
        }
      }
    } catch (e) {
      console.warn("Background clutch sync paused:", e);
    }
    isBackgroundSyncActive = false;
  };

  const scheduleFirst = window.requestIdleCallback || ((cb) => setTimeout(cb, 150));
  scheduleFirst(runSyncChunk);
}

let realtimeAdsChannel = null;

function setupRealtimeAdsSubscription() {
  if (!supabaseClient || realtimeAdsChannel) return;

  realtimeAdsChannel = supabaseClient
    .channel('public:ads_realtime_changes')
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'ads' },
      (payload) => {
        const deletedId = payload?.old?.id;
        if (!deletedId) return;

        if (typeof markAdDeletedLocally === 'function') {
          markAdDeletedLocally(deletedId);
        }

        ads = (ads || []).filter(a => a.id !== deletedId);
        favorites = (favorites || []).filter(id => id !== deletedId);
        try { localStorage.setItem('bs_favorites', JSON.stringify(favorites)); } catch (e) {}

        saveCachedAds();
        if (typeof renderCategoryPills === 'function') renderCategoryPills();
        if (typeof renderAds === 'function') renderAds();
        if (typeof SYSTEM_CONFIG !== 'undefined' && SYSTEM_CONFIG.adminTab === 'ads' && typeof renderAdminTabContent === 'function') {
          renderAdminTabContent();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'ads' },
      (payload) => {
        if (!payload?.new?.id) return;
        const mapped = mapSupabaseAdToLocal(payload.new);
        const idx = (ads || []).findIndex(a => a.id === mapped.id);
        if (idx !== -1) {
          ads[idx] = mapped;
        }
saveCachedAds();
        if (typeof renderCategoryPills === 'function') renderCategoryPills();
        if (typeof renderAds === 'function') renderAds();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_settings' },
      (payload) => {
        const item = payload?.new;
        if (item && item.key === 'marquee_settings' && item.value) {
          const settings = item.value;
          hasCloudMarqueeSettings = true;
          MARQUEE_SETTINGS = { ...MARQUEE_SETTINGS, ...settings };
          localStorage.setItem(MARQUEE_STORAGE_KEY, settings.text || '');
          applyMarqueeSettings(settings);
        }
      }
    )
    .subscribe();
}

async function initSupabaseSync() {
  if (typeof translateStaticUI === 'function') {
    translateStaticUI(currentLang);
  }
  loadCachedAds();
  renderCategoryPills();
  renderAds();
  
  if (!supabaseClient) {
    console.warn("Supabase client not initialized yet.");
    return;
  }

  // Запуск постоянного слушателя Realtime для всех пользователей
  setupRealtimeAdsSubscription();

  const st = byId('cloud-sync-status');
  if (st) { st.classList.remove('hidden'); st.classList.add('flex'); }

  try {
    const isPrivileged = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERUSER');

const [usersRes, adsFirstChunkRes, combosRes, catsRes, reportsRes, marqueeRes] = await Promise.all([
      supabaseClient.from('users').select('*'),
      supabaseClient.from('ads').select('id, title, category, store_category, region, city, is_women_only, is_free, is_negotiable, price, old_price, currency, description, link, images, image, lat, lng, seller_username, seller_uid, seller_kunya, seller_whatsapp, status, created_at, likes, views').order('created_at', { ascending: false }).range(0, 19),
      supabaseClient.from('combos').select('*'),
      supabaseClient.from('categories').select('*'),
      isPrivileged ? supabaseClient.from('reports').select('*') : Promise.resolve({ data: [] }),
      supabaseClient.from('system_settings').select('value').eq('key', 'marquee_settings').maybeSingle()
    ]);

if (marqueeRes && marqueeRes.data && marqueeRes.data.value) {
      const cloudSettings = marqueeRes.data.value;
      if (cloudSettings && cloudSettings.text) {
        hasCloudMarqueeSettings = true;
        MARQUEE_SETTINGS = { ...MARQUEE_SETTINGS, ...cloudSettings };
        localStorage.setItem(MARQUEE_STORAGE_KEY, cloudSettings.text);
        applyMarqueeSettings(cloudSettings);
      }
    }
	
// Синхронизация пользователей
    if (usersRes.data && usersRes.data.length > 0) {
      const allParsedUsers = usersRes.data.map(u => ({
        ...u,
        passwordHash: u.password_hash,
        verifiedShop: !!u.verified_shop,
        phoneVerified: Boolean(u.phone_verified || u.phoneVerified),
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
          if (Array.isArray(freshMe.favorites)) {
            favorites = [...new Set([...(Array.isArray(favorites) ? favorites : []), ...freshMe.favorites])];
            try { localStorage.setItem('bs_favorites', JSON.stringify(favorites)); } catch (err) {}
          }
          currentUser = { ...currentUser, ...freshMe, role: freshMe.role || 'USER', favorites };
          saveUserSession(currentUser, true);
        } else if (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN') {
          currentUser.role = 'USER';
          saveUserSession(currentUser, true);
        }
      }
    }

    // Применение свежих объявлений: первичный список полностью заменяется данными сервера
    if (adsFirstChunkRes.data) {
      const deletedIds = (typeof getDeletedAdsList === 'function') ? getDeletedAdsList() : [];
      ads = adsFirstChunkRes.data
        .filter(a => !deletedIds.includes(a.id))
        .map(mapSupabaseAdToLocal);
    }

    if (combosRes.data) {
      combos = combosRes.data.map(c => ({
        id: c.id,
        shopUid: c.shop_uid,
        sellerUsername: c.seller_username,
        title: c.title,
        price: Number(c.price || 0),
        items: Array.isArray(c.items) ? c.items : [],
        likes: Array.isArray(c.likes) ? c.likes : [],
        createdAt: Number(c.created_at) || Date.now()
      }));
      saveCachedCombos();
    }

if (catsRes.data && catsRes.data.length) {
      const dbMap = new Map(catsRes.data.map(c => [c.id, c]));
      categories = categories.map(c => dbMap.get(c.id) || c);
      catsRes.data.forEach(c => {
        if (!categories.some(x => x.id === c.id)) categories.push(c);
      });
      pushCategoriesToCloud();
    } else {
      pushCategoriesToCloud();
    }
    if (reportsRes.data) reports = reportsRes.data;
	
saveCachedAds();
    renderCategoryPills();
    renderAds();
    if (typeof fetchGlobalMarquee === 'function') fetchGlobalMarquee();
    if (st) { st.classList.add('hidden'); st.classList.remove('flex'); }
    if (typeof checkUrlHashAdOpen === 'function') checkUrlHashAdOpen();

    startBackgroundDualClutchSync(20, 20);
	
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
      const newSyp = +sypVal.toFixed(2);
      const newTry = (tryVal !== null && !isNaN(tryVal)) ? +tryVal.toFixed(2) : EXCHANGE_RATES.TRY;
      const hasChanged = (newSyp !== EXCHANGE_RATES.SYP) || (newTry !== EXCHANGE_RATES.TRY);

      EXCHANGE_RATES.SYP = newSyp;
      EXCHANGE_RATES.TRY = newTry;
      lastRatesUpdate = new Date();
      localStorage.setItem('bs_rates', JSON.stringify(EXCHANGE_RATES));

      if (hasChanged || manual) {
        renderAds();
        if (!byId('modal-profile').classList.contains('hidden')) openProfileModal();
        if (!byId('modal-admin-panel').classList.contains('hidden') && SYSTEM_CONFIG.adminTab === 'rates') renderAdminTabContent();
      }

      if (manual) showToast(`Курс обновлен: $1 = ${EXCHANGE_RATES.SYP} SYP / ${EXCHANGE_RATES.TRY} TRY`, 'success');
    } else if (manual) showToast('Не удалось разобрать курс из ответа сервера', 'error');
	} catch (err) {
    console.warn('Live rates error:', err);
    if (manual) showToast('Ошибка получения курса валют', 'error');
  }
}

function saveTranslateCacheToStorage() {
  try {
    const keys = Object.keys(TRANSLATE_CACHE);
    if (keys.length > 500) {
      const trimmed = {};
      keys.slice(-300).forEach(k => trimmed[k] = TRANSLATE_CACHE[k]);
      TRANSLATE_CACHE = trimmed;
    }
    localStorage.setItem('bs_trans_cache', JSON.stringify(TRANSLATE_CACHE));
  } catch (e) {}
}

// Гибкая маска для поиска исламских фраз в любом написании (с огласовками и без, с разными ه/ة и أ/ا)
const ISLAMIC_PATTERNS = [
  { original: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', pattern: /ب[\s\u064B-\u065F\u0670\u0640]*س[\s\u064B-\u065F\u0670\u0640]*م[\s\u064B-\u065F\u0670\u0640]*[\s\S]*?ا[\s\u064B-\u065F\u0670\u0640]*ل[\s\u064B-\u065F\u0670\u0640]*ل[\s\u064B-\u065F\u0670\u0640]*[هة][\s\S]*?ا[\s\u064B-\u065F\u0670\u0640]*ل[\s\u064B-\u065F\u0670\u0640]*ر[\s\u064B-\u065F\u0670\u0640]*ح[\s\u064B-\u065F\u0670\u0640]*م[\s\u064B-\u065F\u0670\u0640]*[نٰ][\s\S]*?ا[\s\u064B-\u065F\u0670\u0640]*ل[\s\u064B-\u065F\u0670\u0640]*ر[\s\u064B-\u065F\u0670\u0640]*ح[\s\u064B-\u065F\u0670\u0640]*ي[\s\u064B-\u065F\u0670\u0640]*م/gi },
  { original: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ', pattern: /[اأإآ]?[ل]?س[للا]*[اأإآ]?م\s+عليكم(\s+و\s*رحم[هة]\s+ا[ل]?ل[هة](\s+و\s*بركات[هة])?)?/gi },
  { original: 'وَعَلَيْكُمْ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ', pattern: /و\s*عليكم\s+[اأإآ]?[ل]?س[للا]*[اأإآ]?م(\s+و\s*رحم[هة]\s+ا[ل]?ل[هة](\s+و\s*بركات[هة])?)?/gi },
  { original: 'جَزَاكَ اللَّهُ خَيْرًا', pattern: /جزا[ككم]+[\s\u064B-\u065F]*ا[ل]?ل[هة][\s\u064B-\u065F]*خي[راً]+/gi },
  { original: 'الْحَمْدُ لِلَّهِ', pattern: /[اأإآ]?ل?حمد[\s\u064B-\u065F]*[ل]+[هة]/gi },
  { original: 'سُبْحَانَ اللَّهِ', pattern: /سبحان[\s\u064B-\u065F]*ا[ل]?ل[هة]/gi },
  { original: 'اللَّهُ أَكْبَرُ', pattern: /ا[ل]?ل[هة][\s\u064B-\u065F]*[اأإآ]كبر/gi },
  { original: 'أَسْتَغْفِرُ اللَّهَ', pattern: /[اأإآ]?ستغفر[\s\u064B-\u065F]*ا[ل]?ل[هة]/gi },
  { original: 'إِنْ شَاءَ اللَّهُ', pattern: /[اإأآ]?ن[\s\u064B-\u065F]*شا[ءه]?[\s\u064B-\u065F]*ا[ل]?ل[هة]/gi },
  { original: 'مَا شَاءَ اللَّهُ', pattern: /ما[\s\u064B-\u065F]*شا[ءه]?[\s\u064B-\u065F]*ا[ل]?ل[هة]/gi },
  { original: 'بَارَكَ اللَّهُ فِيكَ', pattern: /بارك[\s\u064B-\u065F]*ا[ل]?ل[هة][\s\u064B-\u065F]*في[ككم]+/gi },
  { original: 'لَا إِلَٰهَ إِلَّا اللَّهُ', pattern: /لا[\s\u064B-\u065F]*[اإأآ]ل[هة][\s\u064B-\u065F]*[اإأآ]لا[\s\u064B-\u065F]*ا[ل]?ل[هة]/gi },
  { original: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', pattern: /لا[\s\u064B-\u065F]*حول[\s\u064B-\u065F]*و?لا[\s\u064B-\u065F]*قو[هة][\s\u064B-\u065F]*[اإأآ]لا[\s\u064B-\u065F]*با[ل]?ل[هة]/gi },
  { original: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', pattern: /حسبنا[\s\u064B-\u065F]*ا[ل]?ل[هة][\s\u064B-\u065F]*و?نعم[\s\u064B-\u065F]*[اأإآ]?لوكيل/gi },
  { original: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ', pattern: /[اإأآ]?نا[\s\u064B-\u065F]*[ل]+[هة][\s\u064B-\u065F]*و?[اإأآ]?نا[\s\u064B-\u065F]*[اإأآ]?ليه[\s\u064B-\u065F]*راجعون/gi },
  { original: 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ', pattern: /صلى[\s\u064B-\u065F]*ا[ل]?ل[هة][\s\u064B-\u065F]*عليه[\s\u064B-\u065F]*و?سلم/gi }
];

async function translateDynamic(text, targetLang = currentLang) {
  if (!text || typeof text !== 'string') return text;
  const clean = text.trim();
  if (!clean) return text;
  if (DICTIONARY[clean] && targetLang === 'ar') return DICTIONARY[clean];

const cacheKey = `${targetLang}_${clean}`;
  if (TRANSLATE_CACHE[cacheKey]) {
    if (TRANSLATE_CACHE[cacheKey].includes('INVALID SOURCE') || TRANSLATE_CACHE[cacheKey].includes('PLEASE SELECT TWO')) {
      delete TRANSLATE_CACHE[cacheKey];
    } else {
      return TRANSLATE_CACHE[cacheKey];
    }
  }
  
  // 1. Проверяем, состоит ли весь текст только из одной священной фразы
  for (const item of ISLAMIC_PATTERNS) {
    if (item.pattern.test(clean) && clean.replace(item.pattern, '').trim().length === 0) {
      return item.original;
    }
  }

  // 2. Маскируем защищенные исламские фразы уникальными плейсхолдерами
  let protectedText = clean;
  const replacements = [];

  ISLAMIC_PATTERNS.forEach((item, idx) => {
    item.pattern.lastIndex = 0;
    if (item.pattern.test(protectedText)) {
      const placeholder = `ZIKRTOKEN${idx}X`;
      protectedText = protectedText.replace(item.pattern, ` ${placeholder} `);
      replacements.push({ placeholder, original: item.original });
    }
  });

  const arabicChars = (protectedText.replace(/ZIKRTOKEN\d+X/g, '').match(/[\u0600-\u06FF]/g) || []).length;
  const cyrillicChars = (protectedText.match(/[\u0400-\u04FF]/g) || []).length;
  const latinChars = (protectedText.match(/[a-zA-Z]/g) || []).length;

  // Если весь оставшийся текст уже на целевом языке — просто восстанавливаем защищенные фразы
  if (targetLang === 'ar' && cyrillicChars === 0 && latinChars === 0) {
    let res = protectedText;
    replacements.forEach(r => { res = res.split(r.placeholder).join(r.original); });
    return res.trim();
  }
  if (targetLang === 'ru' && arabicChars === 0) {
    let res = protectedText;
    replacements.forEach(r => { res = res.split(r.placeholder).join(r.original); });
    return res.trim();
  }

  if (IN_FLIGHT_TRANSLATIONS[cacheKey]) {
    return await IN_FLIGHT_TRANSLATIONS[cacheKey];
  }

  const tl = targetLang === 'ar' ? 'ar' : 'ru';

  const translationPromise = (async () => {
    let translated = '';

    // 1. Google Translate API (клиент gtx)
    try {
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(protectedText)}`;
      const res = await fetch(googleUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data[0])) {
          translated = data[0].map(x => x[0]).filter(Boolean).join('');
        }
      }
    } catch (e) {}

// 2. Google Translate Web API Client (запасной)
    if (!translated || !translated.trim()) {
      try {
        const altUrl = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(protectedText)}`;
        const resAlt = await fetch(altUrl);
        if (resAlt.ok) {
          const altData = await resAlt.json();
          if (altData && Array.isArray(altData[0])) {
            translated = altData[0].map(x => x[0]).filter(Boolean).join('');
          }
        }
      } catch (e) {}
    }

    // Проверка на мусорные системные ответы API
    const isErrorText = !translated || 
      translated.includes('INVALID SOURCE LANGUAGE') || 
      translated.includes('PLEASE SELECT TWO') || 
      translated.includes('QUERY LENGTH LIMIT');

    let finalOutput = (!isErrorText && translated.trim()) ? translated : protectedText;
	
    // 4. Восстанавливаем оригинальные арабские фразы с сохранением огласовок
    replacements.forEach(r => {
      const tokenRegex = new RegExp(`\\s*${r.placeholder}\\s*`, 'gi');
      finalOutput = finalOutput.replace(tokenRegex, `\n${r.original}\n`);
    });

    finalOutput = finalOutput.replace(/\n{3,}/g, '\n\n').trim();
    TRANSLATE_CACHE[cacheKey] = finalOutput;
    saveTranslateCacheToStorage();
    return finalOutput;
  })();

  IN_FLIGHT_TRANSLATIONS[cacheKey] = translationPromise;
  try {
    const finalResult = await translationPromise;
    delete IN_FLIGHT_TRANSLATIONS[cacheKey];
    return finalResult;
  } catch (err) {
    delete IN_FLIGHT_TRANSLATIONS[cacheKey];
    return clean;
  }
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

  // 1. Мгновенно отображаем на текущем экране
  MARQUEE_SETTINGS.text = text;
  localStorage.setItem(MARQUEE_STORAGE_KEY, text);
  const dEl = byId('desktop-marquee-text');
  const mEl = byId('mobile-marquee-text');
  if (dEl) dEl.innerText = text;
  if (mEl) mEl.innerText = text;

  // 2. Отправляем в Supabase прямым простым запросом
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('marquee_broadcast')
        .upsert({ id: 1, content: text, updated_at: new Date().toISOString() });
      if (error) throw error;
      showToast('Бегущая строка сохранена для всех устройств!', 'success');
    } catch (err) {
      console.error('Marquee save error:', err);
      showToast('Ошибка сохранения в базу: ' + (err.message || ''), 'error');
      return;
    }
  } else {
    showToast('Сохранено локально (нет подключения к БД)', 'warning');
  }

  updateMarqueeText(text);
}

async function fetchGlobalMarquee() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('marquee_broadcast')
      .select('content')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data && data.content) {
      const remoteText = data.content.trim();
      if (remoteText) {
        MARQUEE_SETTINGS.text = remoteText;
        localStorage.setItem(MARQUEE_STORAGE_KEY, remoteText);
        updateMarqueeText(remoteText);
      }
    }
  } catch (e) {
    console.warn('fetchGlobalMarquee error:', e);
  }
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

// Поисковые плейсхолдеры
  const searchDesktop = byId('search-input-desktop');
  if (searchDesktop) searchDesktop.placeholder = t('Поиск');
  const searchMobile = byId('search-input');
  if (searchMobile) searchMobile.placeholder = t('Поиск');

  // Оверлей радиуса
  const radiusTitle = document.querySelector('#radius-menu-overlay .text-sm.font-bold');
  if (radiusTitle) radiusTitle.innerHTML = `<i class="fa-solid fa-location-crosshairs text-blue-500"></i> ${t('Поиск в радиусе')}`;
  const radiusOffBtn = byId('radius-btn-off');
  if (radiusOffBtn) radiusOffBtn.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${t('Отключить поиск рядом')}`;

  // 1. Модальное окно ShamCash QR
  const supTitle = byId('support-modal-title');
  if (supTitle) supTitle.innerText = t('Поддержка сервера — ShamCash');
  const supDesc = byId('support-modal-desc');
  if (supDesc) supDesc.innerText = t('Отсканируйте QR-код в приложении ShamCash, чтобы оплатить и поддержать платформу Авито Шам.');
  const supIdLbl = byId('support-modal-idlabel');
  if (supIdLbl) supIdLbl.innerText = t('ID счёта ShamCash');
  const supCopy = byId('support-modal-copybtn')?.querySelector('span');
  if (supCopy) supCopy.innerText = t('Скопировать ID');

  // 2. Модальное окно подачи объявления
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

  const draftBannerText = byId('draft-restore-banner')?.querySelector('span');
  if (draftBannerText) draftBannerText.innerHTML = `<i class="fa-solid fa-rotate-left"></i> ${t('Найден черновик')}`;
  const draftBtns = byId('draft-restore-banner')?.querySelectorAll('button');
  if (draftBtns && draftBtns.length >= 2) {
    draftBtns[0].innerText = t('Восстановить');
    draftBtns[1].innerText = t('Удалить');
  }

  const photosLbl = byId('ad-photos-label');
  if (photosLbl) photosLbl.innerText = t('Фотографии товара (до 6 шт.) *');
  const uploadBtnText = byId('ad-upload-btn-text');
  if (uploadBtnText) uploadBtnText.innerText = t('Выбрать фотографии');

  const freeSpan = byId('ad-is-free')?.nextElementSibling;
  if (freeSpan) freeSpan.innerText = t('Даром 🎁');
  const negSpan = byId('ad-is-negotiable')?.nextElementSibling;
  if (negSpan) negSpan.innerText = t('Договорная 🤝');
  const womenSpan = byId('ad-is-women-only')?.nextElementSibling;
  if (womenSpan) womenSpan.innerText = t('Для женщин 🌸');

  const locSummary = byId('ad-location-summary');
  if (locSummary && (!locSummary.innerText.includes('(') || locSummary.innerText.includes('Дамаск'))) {
    locSummary.innerText = t('Локация: Дамаск (по GPS)');
  }
  const autoBadge = locSummary?.parentElement?.nextElementSibling;
  if (autoBadge) autoBadge.innerText = t('Автоматически');

const guestTitle = byId('guest-auth-block')?.querySelector('.text-xs');
  if (guestTitle) guestTitle.innerHTML = `<i class="fa-brands fa-whatsapp text-sm"></i> ${t('Контакт для связи (профиль создастся автоматически):')}`;
  const guestWa = byId('guest-whatsapp');
  if (guestWa) guestWa.placeholder = t('Ваш номер WhatsApp (+963…)*');

  const loggedBadge = byId('user-logged-badge');
  if (loggedBadge) {
    const span = loggedBadge.querySelector('span');
    if (span && span.childNodes.length > 0) {
      span.childNodes[0].nodeValue = t('Публикация от имени:') + ' ';
    }
  }

  // Окно редактирования анкеты
  const epTitle = document.querySelector('#modal-edit-profile h3');
  if (epTitle) epTitle.innerText = t('Редактирование анкеты');
  const epLogin = byId('edit-profile-login');
  if (epLogin) epLogin.placeholder = t('Логин *');
  const epPass = byId('edit-profile-password');
  if (epPass) epPass.placeholder = t('Новый пароль (необязательно)');
  const epKunya = byId('edit-profile-kunya');
  if (epKunya) epKunya.placeholder = t('Имя / Кунья *');
  const epWa = byId('edit-profile-whatsapp');
  if (epWa) epWa.placeholder = t('WhatsApp *');
  const epBtn = document.querySelector('#modal-edit-profile button[type="submit"]');
  if (epBtn) epBtn.innerText = t('Сохранить изменения');

  // Перевод AvitoCash (плейсхолдеры)
  const trAmountInp = byId('transfer-amount');
  if (trAmountInp) trAmountInp.placeholder = t('Например, 5');
  const trNoteInp = byId('transfer-note');
  if (trNoteInp) trNoteInp.placeholder = t('Например, оплата товара');

  // Сортировка
  const sortTitle = document.querySelector('#sort-menu-overlay .text-center.font-bold');
  if (sortTitle) sortTitle.innerText = t('Сортировать по:');
  const sortBtns = document.querySelectorAll('#sort-menu-overlay button');
  if (sortBtns.length >= 5) {
    sortBtns[0].querySelector('span').innerText = t('🕒 Сначала новые');
    sortBtns[1].querySelector('span').innerText = t('💰 Сначала дешевые');
    sortBtns[2].querySelector('span').innerText = t('💎 Сначала дорогие');
    sortBtns[3].querySelector('span').innerText = t('🔥 Популярные');
    sortBtns[4].innerText = t('Закрыть');
  }

  const advBtn = document.querySelector('button[onclick="toggleAdvancedCreateFields()"] span');
  if (advBtn) advBtn.innerHTML = `<i class="fa-solid fa-sliders text-purple-400"></i> ${t('Расширенные настройки')}`;
  
  const advLabels = document.querySelectorAll('#create-ad-advanced-fields label');
  if (advLabels.length >= 4) {
    advLabels[0].innerText = t('Регион вручную');
    advLabels[1].innerText = t('Точный город/район');
    advLabels[2].innerText = t('Валюта');
    advLabels[3].innerText = t('Уточнить точку на карте (необязательно)');
  }

  // 3. Модальное окно редактирования объявления
  const editTitle = document.querySelector('#modal-edit-ad h3');
  if (editTitle) editTitle.innerText = t('Редактирование объявления');
  const editOwnerLbl = byId('edit-ad-owner-container')?.querySelector('label');
  if (editOwnerLbl) editOwnerLbl.innerHTML = `<i class="fa-solid fa-user-shield"></i> ${t('Привязать к аккаунту (владелец)')}`;
  const editTitleInp = byId('edit-ad-title');
  if (editTitleInp) editTitleInp.placeholder = t('Заголовок объявления *');
  const editCityInp = byId('edit-ad-city');
  if (editCityInp) editCityInp.placeholder = t('Точный город/район');
  const editPriceInp = byId('edit-ad-price');
  if (editPriceInp) editPriceInp.placeholder = t('Цена *');
  const editDescInp = byId('edit-ad-desc');
  if (editDescInp) editDescInp.placeholder = t('Описание и возможные изъяны *');
  const editSubBtn = byId('edit-ad-submit-btn');
  if (editSubBtn) editSubBtn.innerText = t('Сохранить изменения');

  const editWomenLbl = byId('edit-ad-is-women-only')?.parentElement?.querySelector('.font-bold');
  if (editWomenLbl) editWomenLbl.innerText = t('Только для женщин 🌸');
  const editFreeLbl = byId('edit-ad-is-free')?.parentElement?.querySelector('.font-bold');
  if (editFreeLbl) editFreeLbl.innerText = t('Отдать даром (Бесплатно) 🎁');
  const editNegLbl = byId('edit-ad-is-negotiable')?.parentElement?.querySelector('.font-bold');
  if (editNegLbl) editNegLbl.innerText = t('Цена договорная 🤝');

  const editDiscLbl = byId('edit-ad-has-discount')?.parentElement?.querySelector('span');
  if (editDiscLbl) editDiscLbl.innerHTML = `<i class="fa-solid fa-percent"></i> ${t('Сделать скидку на товар')}`;
  const discFieldLabels = document.querySelectorAll('#discount-fields-wrap label');
  if (discFieldLabels.length >= 2) {
    discFieldLabels[0].innerText = t('Старая цена (зачеркнутая)');
    discFieldLabels[1].innerText = t('Срок действия скидки');
  }

// 4. Модальное окно «Поделиться»
  const shareTitle = document.querySelector('#modal-share h3 span');
  if (shareTitle) shareTitle.innerText = t('Поделиться объявлением');
  const sharePreviewState = byId('share-preview-state');
  if (sharePreviewState) sharePreviewState.innerText = t('Генерируем красивую карточку...');

  const shareSysSpan = byId('share-system')?.querySelector('span');
  if (shareSysSpan) shareSysSpan.innerText = t('Поделиться карточкой');

  const shareBtns = document.querySelectorAll('#modal-share button, #modal-share a');
  shareBtns.forEach(btn => {
    const span = btn.querySelector('span');
    const txt = (span ? span.innerText : btn.innerText).trim();

    if (txt.includes('WhatsApp') && (txt.includes('картинка') || txt.includes('صورة'))) {
      if (span) span.innerText = t('WhatsApp (картинка)');
    } else if (txt.includes('Telegram') || txt.includes('تيليجرام')) {
      if (span) span.innerText = t('Telegram (картинка)');
    } else if (txt.includes('Viber') || txt.includes('فايبر')) {
      if (span) span.innerText = t('Viber (картинка)');
    } else if (txt.includes('WhatsApp') && (txt.includes('ссылка') || txt.includes('رابط'))) {
      if (span) span.innerText = t('WhatsApp (ссылка)');
    } else if (txt.includes('Скачать') || txt.includes('تحميل')) {
      if (span) span.innerText = t('Скачать карточку');
    } else if (txt.includes('Скопировать') || txt.includes('نسخ')) {
      if (span) span.innerText = t('Скопировать ссылку');
    } else if (txt === 'Отмена' || txt === 'إلغاء') {
      btn.innerText = t('Отмена');
    }
  });
  
  // 5. Модальное окно подтверждения
  const confirmCancel = byId('confirm-btn-cancel');
  if (confirmCancel) confirmCancel.innerText = t('Отмена');
  const confirmOk = byId('confirm-btn-ok');
  if (confirmOk) confirmOk.innerText = t('Да, выполнить');

  // 6. Модальное окно жалобы
  const repTitle = document.querySelector('#modal-report-ad h3');
  if (repTitle) repTitle.innerText = t('Пожаловаться на объявление');
  const repDesc = document.querySelector('#modal-report-ad p');
  if (repDesc) repDesc.innerText = t('Мы проверим это объявление на нарушение правил.');
  const repReason = byId('report-reason');
  if (repReason && repReason.options.length >= 6) {
    repReason.options[0].text = t('Выберите причину...');
    repReason.options[1].text = t('Мошенничество / Скам');
    repReason.options[2].text = t('Фейковый товар / Фото');
    repReason.options[3].text = t('Запрещенный товар');
    repReason.options[4].text = t('Спам / Дубликат');
    repReason.options[5].text = t('Другое');
  }
  const repComm = byId('report-comment');
  if (repComm) repComm.placeholder = t('Комментарий (необязательно)');
  const repSub = document.querySelector('#modal-report-ad button[type="submit"]');
  if (repSub) repSub.innerText = t('Отправить жалобу');

  // 7. Пополнение AvitoCash
  const topupTitle = document.querySelector('#modal-avitocash-topup h3');
  if (topupTitle) topupTitle.innerText = t('Пополнение баланса AvitoCash через ShamCash');
  const topupAmountLbl = document.querySelector('#modal-avitocash-topup label');
  if (topupAmountLbl) topupAmountLbl.childNodes[0].nodeValue = t('Сумма пополнения (в AvitoCash / USD)');
  const topupGenBtn = document.querySelector('#modal-avitocash-topup button[onclick="createTopupRequest()"]');
  if (topupGenBtn) topupGenBtn.innerText = t('Сгенерировать код пополнения');
  const topupNote = document.querySelector('#topup-result .text-xs');
  if (topupNote) topupNote.innerText = t('Переведите средства через платежную систему ShamCash на счет проекта, затем отправьте этот код администратору в WhatsApp для зачисления AvitoCash на ваш баланс.');
  const topupWaBtn = document.querySelector('#topup-result a');
  if (topupWaBtn) topupWaBtn.innerHTML = `<i class="fa-brands fa-whatsapp"></i> ${t('Отправить код админу')}`;

  // 8. Подарочные коды
  const giftTitle = document.querySelector('#modal-gift-code h3');
  if (giftTitle) giftTitle.innerHTML = `<i class="fa-solid fa-gift" style="color:#f59e0b"></i> ${t('Подарочный код AvitoCash')}`;
  const giftAmountLbl = document.querySelector('#gift-generator-form label:nth-child(1)');
  if (giftAmountLbl) giftAmountLbl.childNodes[0].nodeValue = t('Сумма подарка, AC');
  const giftDaysLbl = document.querySelector('#gift-generator-form label:nth-child(2)');
  if (giftDaysLbl) giftDaysLbl.childNodes[0].nodeValue = t('Срок действия, дней');
  const giftGenBtn = document.querySelector('#gift-generator-form button');
  if (giftGenBtn) giftGenBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${t('Создать подарочный код')}`;
  const giftResetBtn = document.querySelector('#gift-result button[onclick="resetGiftGenerator()"]');
  if (giftResetBtn) giftResetBtn.innerText = t('Создать ещё код');

  // 9. Активация подарка
  const redeemTitle = document.querySelector('#modal-redeem-gift h3');
  if (redeemTitle) redeemTitle.innerHTML = `<i class="fa-solid fa-gift" style="color:#f59e0b"></i> ${t('Активировать подарок')}`;
  const redeemDesc = document.querySelector('#modal-redeem-gift p');
  if (redeemDesc) redeemDesc.innerText = t('Введите подарочный код, чтобы получить AvitoCash на свой баланс.');
  const redeemBtn = document.querySelector('#modal-redeem-gift button[onclick="redeemGiftCode()"]');
  if (redeemBtn) redeemBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${t('Активировать код')}`;

  // 10. Перевод AvitoCash
  const transferTitle = document.querySelector('#modal-transfer-shamcash h3');
  if (transferTitle) transferTitle.innerHTML = `<i class="fa-solid fa-arrow-right-arrow-left" style="color:#10b981"></i> ${t('Оплатить AvitoCash')}`;
  const transferDesc = document.querySelector('#modal-transfer-shamcash p');
  if (transferDesc) transferDesc.innerText = t('Перевод другому пользователю будет сохранен в журнале транзакций.');
  const transferLabels = document.querySelectorAll('#modal-transfer-shamcash label');
  if (transferLabels.length >= 3) {
    transferLabels[0].childNodes[0].nodeValue = t('Получатель');
    transferLabels[1].childNodes[0].nodeValue = t('Сумма, AC');
    transferLabels[2].childNodes[0].nodeValue = t('Назначение платежа');
  }
  const transferBtn = document.querySelector('#modal-transfer-shamcash button[onclick="transferShamCash()"]');
  if (transferBtn) transferBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ${t('Отправить оплату')}`;

  // 11. Офлайн-экран
  const offlineH2 = document.querySelector('#offline-screen h2');
  if (offlineH2) offlineH2.innerText = t('Нет подключения к сети');
  const offlineP = document.querySelector('#offline-screen p');
  if (offlineP) offlineP.innerText = t('Проверьте интернет-соединение. Приложение автоматически продолжит работу, как только связь восстановится.');
  const offlineBadge = document.querySelector('#offline-screen .font-mono');
  if (offlineBadge) offlineBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> ${t('Ожидание сети...')}`;

// 12. Плавающая кнопка техподдержки
  const floatSupport = document.querySelector('a[aria-label="Написать в техподдержку WhatsApp"]');
  if (floatSupport) {
    floatSupport.title = t('Написать в техподдержку WhatsApp');
    floatSupport.setAttribute('aria-label', t('Написать в техподдержку WhatsApp'));
  }

  // 13. Модальное окно правил сервиса
  const rulesTitle = document.querySelector('#modal-rules-agreement h2');
  if (rulesTitle) rulesTitle.innerText = t('Правила и рекомендации Авито Шам');
  const rulesTipsHeader = document.querySelector('#modal-rules-agreement .font-bold.flex span');
  if (rulesTipsHeader) rulesTipsHeader.innerText = t('3 главных совета для удачных сделок:');
const rulesAcceptBtn = byId('rules-accept-btn');
  if (rulesAcceptBtn) rulesAcceptBtn.innerText = t('Я подтверждаю и принимаю условия');

  // 14. Справка о доступах и конфиденциальности
  const faqBtnLabel = byId('ft-faq-label');
  if (faqBtnLabel) faqBtnLabel.innerText = t('Зачем нужны доступы и данные?');
  const faqTitle = byId('faq-modal-title');
  if (faqTitle) faqTitle.innerText = t('Зачем нужны доступы и регистрация?');
  const faqDesc = byId('faq-modal-desc');
  if (faqDesc) faqDesc.innerText = t('Разъяснение о конфиденциальности, доступах и правилах платформы');
  const faqCloseBtn = document.querySelector('#modal-faq-help button[onclick*="closeModal"]');
  if (faqCloseBtn && faqCloseBtn.innerText) faqCloseBtn.innerText = t('Всё понятно');
}
async function executeSilentDriveBackup(manual = false) {
  if (!DRIVE_BACKUP_CONFIG.gasUrl) {
    if (manual) showToast(t('URL Google Apps Script не настроен'), 'error');
    return;
  }
  try {
    if (manual) showToast('Сбор данных и конвертация фото...', 'info');

    // 1. Конвертируем все фотографии объявлений в Base64
    const packagedAds = [];
    for (let i = 0; i < ads.length; i++) {
      const a = ads[i];
      const rawImgs = Array.isArray(a.images) ? a.images : [a.image].filter(Boolean);
      const b64Images = [];
      for (const imgUrl of rawImgs) {
        b64Images.push(await urlToBase64(imgUrl));
      }
      packagedAds.push({
        ...a,
        images: b64Images,
        image: b64Images[0] || a.image
      });
    }

    // 2. Конвертируем аватары и логотипы магазинов
    const packagedUsers = [];
    for (const u of users) {
      let b64Avatar = u.avatar;
      let shopCopy = u.shop ? { ...u.shop } : null;
      if (u.avatar) b64Avatar = await urlToBase64(u.avatar);
      if (shopCopy && shopCopy.logo) shopCopy.logo = await urlToBase64(shopCopy.logo);
      packagedUsers.push({
        ...u,
        avatar: b64Avatar,
        shop: shopCopy
      });
    }

    const backupData = {
      version: '4.0_FULL_MEDIA_AUTO',
      exportDate: new Date().toISOString(),
      users: packagedUsers,
      archivedUsers: archivedUsers,
      ads: packagedAds,
      categories: categories,
      combos: combos,
      rates: EXCHANGE_RATES,
      reports: reports
    };

    if (manual) showToast(t('Отправка бэкапа в Google Диск...'), 'info');

    const res = await fetch(DRIVE_BACKUP_CONFIG.gasUrl, {
      method: 'POST',
      body: JSON.stringify(backupData),
      headers: { 'Content-Type': 'text/plain' }
    });

    const textResponse = await res.text();

    if (res.ok && textResponse === "OK") {
      DRIVE_BACKUP_CONFIG.lastRun = Date.now();
      localStorage.setItem('bs_drive_backup', JSON.stringify(DRIVE_BACKUP_CONFIG));
      
      // Автоматически фиксируем запуск в журнале бэкапов админки
      const backupId = 'BK-AUTO-' + Date.now();
      if (typeof BACKUPS_META === 'object') {
        BACKUPS_META[backupId] = {
          type: 'auto_full_with_media',
          exportDate: backupData.exportDate,
          by: 'auto_system'
        };
        if (typeof saveBackupsMeta === 'function') saveBackupsMeta();
        if (byId('admin-backup-list') && typeof renderBackupList === 'function') renderBackupList();
      }

      if (manual) showToast(t('Авто-бэкап успешно загружен на Диск!'), 'success');
      if (byId('admin-backup-last-run')) byId('admin-backup-last-run').innerText = new Date().toLocaleString();
    } else {
      throw new Error(textResponse || 'Скрипт не вернул ответ');
    }
  } catch (err) {
    console.warn('Auto-backup failed:', err);
    if (manual) alert('ОШИБКА GOOGLE APPS SCRIPT:\n\n' + err.message);
  }
}

function initDriveAutoBackup() {
  if (autoBackupTimerId) clearInterval(autoBackupTimerId);
  if (!DRIVE_BACKUP_CONFIG.enabled || !DRIVE_BACKUP_CONFIG.gasUrl) return;

  const intervalMs = DRIVE_BACKUP_CONFIG.intervalHours * 60 * 60 * 1000;
  
  // Проверяем, не пора ли запустить бэкап прямо сейчас (если пропустили, пока сайт был закрыт)
  if (Date.now() - DRIVE_BACKUP_CONFIG.lastRun >= intervalMs) {
    setTimeout(() => executeSilentDriveBackup(false), 15000); // Отложенный запуск через 15 сек после старта
  }

  autoBackupTimerId = setInterval(() => {
    executeSilentDriveBackup(false);
  }, intervalMs);
}
