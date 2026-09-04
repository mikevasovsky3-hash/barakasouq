/* ================= UI RENDERING & TEMPLATES ================= */

function renderComboSlashCollage(ad) {
  const v = (ad.isCombo && ad.comboItems) ? ad : (typeof getListingById === 'function' ? getListingById(ad.id) : ad);
  const items = v?.comboItems || [];
  const item1 = items[0] || {};
  const item2 = items[1] || items[0] || {};
  
  const imgs1 = (item1.images && item1.images.length) ? item1.images : [item1.image || PLACEHOLDER_IMG];
  const imgs2 = (item2.images && item2.images.length) ? item2.images : [item2.image || PLACEHOLDER_IMG];
  
  const img1 = imgs1[0] || PLACEHOLDER_IMG;
  const img2 = imgs2[0] || img1;

  return `
    <div class="anime-slash-collage">
      <img id="cimg-left-${ad.id}" src="${img1}" class="anime-slash-left" alt="Товар 1">
      <img id="cimg-right-${ad.id}" src="${img2}" class="anime-slash-right" alt="Товар 2">
      <div class="anime-slash-line"></div>
    </div>
  `;
}

function checkBadImagePlaceholder(imgElement) {
  if (!imgElement) return;
  // Если ImgBB вернул синюю плашку или картинка не загрузилась
  if (imgElement.naturalWidth === 0 || (imgElement.src && imgElement.src.includes('imgbb.com'))) {
    imgElement.src = PLACEHOLDER_IMG;
  }
}

function getComboOwner(c) { 
  return users.find(u => u.uid === c.shopUid) || users.find(u => u.username && c.sellerUsername && u.username.toLowerCase() === c.sellerUsername.toLowerCase()) || null; 
}

function comboToVirtualAd(c) { 
  if (!c || !Array.isArray(c.items) || c.items.length < 2) return null; 
  const items = c.items.map(id => ads.find(a => a.id === id)).filter(a => a && a.status === 'ACTIVE'); 
  if (items.length < 2) return null; 
  const owner = getComboOwner(c); 
  const shop = owner?.shop; 
  const images = items.map(a => (a.images && a.images[0]) || a.image).filter(Boolean).slice(0, 6); 
  const originalTotal = items.reduce((s, a) => s + adToUSD(a), 0); 
  return { 
    id: c.id, 
    isCombo: true, 
    comboRef: c, 
    comboItems: items, 
comboOriginalTotal: originalTotal, 
    title: c.title || t('Комбо-набор'), 
    category: 'combo', 
    region: shop?.region || 'DAM', 
    city: shop?.name || 'Авито Шам', 
    isFree: false, 
    isNegotiable: false, 
    isWomenOnly: false, 
    price: c.price, 
    currency: 'USD', 
    desc: `${t('Акция! Комплект из')} ${items.length} ${t('товаров по специальной цене.')}`, 
    images,
    image: images[0] || PLACEHOLDER_IMG, 
    sellerUsername: c.sellerUsername || owner?.username || '', 
    sellerKunya: owner?.kunya || '', 
    sellerWhatsapp: shop?.whatsapp || owner?.whatsapp || '', 
verified: !!(owner && (owner.verifiedShop || (owner.shop && owner.shop.isVerified))), 
    status: 'ACTIVE', 
    createdAt: c.createdAt || Date.now(), 
    queue: [], 
    likes: Array.isArray(c.likes) ? c.likes : [], 
    views: 0 
  }; 
}

function getListingById(id) { 
  const a = ads.find(x => x.id === id); 
  if (a) return a; 
  const c = combos.find(x => x.id === id); 
  return c ? comboToVirtualAd(c) : null; 
}

function getSellerWhatsapp(ad) { if (!ad) return ''; const s = users.find(u => u.username && ad.sellerUsername && u.username.toLowerCase() === ad.sellerUsername.toLowerCase()); return String((s && s.whatsapp) ? s.whatsapp : (ad.sellerWhatsapp || '')); }
function getSellerKunya(ad) { if (!ad) return ''; const s = users.find(u => u.username && ad.sellerUsername && u.username.toLowerCase() === ad.sellerUsername.toLowerCase()); const k = (s && s.kunya) ? s.kunya : (ad.sellerKunya || ad.sellerUsername || ''); return currentLang === 'ar' ? (DICTIONARY[k] || k) : k; }
function getSellerAvatar(ad) { if (!ad) return null; const s = users.find(u => u.username && ad.sellerUsername && u.username.toLowerCase() === ad.sellerUsername.toLowerCase()); return s?.avatar || null; }
function getSellerVerified(ad) { if (ad && ad.isCombo && typeof ad.verified === 'boolean') return ad.verified; const s = users.find(u => u.username && ad.sellerUsername && u.username.toLowerCase() === ad.sellerUsername.toLowerCase()); return !!(s && (s.verifiedShop || (s.shop && s.shop.isVerified))); }
function getCategoryName(catId) { const c = categories.find(x => x.id === catId); return c ? c.name : 'Прочее'; }
function timeAgo(ts) { if (!ts) return ''; const m = Math.floor((Date.now() - ts) / 60000); if (m < 1) return 'только что'; if (m < 60) return m + ' мин'; const h = Math.floor(m / 60); if (h < 24) return h + ' ч'; const d = Math.floor(h / 24); if (d < 7) return d + ' дн'; return new Date(ts).toLocaleDateString(); }
// Используется безопасная версия функции adToUSD(ad), объявленная в handlers.js

function convertPriceAll(amount, fromCurr, isFree, isNegotiable) {
  if (isNegotiable) return `<span class="font-bold" style="color:#3b82f6">${t('🤝 Договорная')}</span>`;
  if (isFree || amount === 0) return `<span class="font-bold" style="color:#10b981">${t('🎁 ДАРОМ')}</span>`;
  let p = amount; if (fromCurr === 'SYP') p = amount / EXCHANGE_RATES.SYP; if (fromCurr === 'TRY') p = amount / EXCHANGE_RATES.TRY;
  return `$${p.toFixed(2)} <span class="t2 text-[10px]">/ ${Math.round(p * EXCHANGE_RATES.SYP).toLocaleString()} SYP</span>`;
}

function priceBadge(ad) { if (ad.isNegotiable) return `<span style="color:#93c5fd">${t('🤝 Договорная')}</span>`; if (ad.isFree || ad.price === 0) return `<span style="color:#6ee7b7">${t('🎁 ДАРОМ')}</span>`; let p = ad.price; if (ad.currency === 'SYP') p = ad.price / EXCHANGE_RATES.SYP; if (ad.currency === 'TRY') p = ad.price / EXCHANGE_RATES.TRY; return '$' + p.toFixed(2); }

function roundRectPath(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function igGradient(ctx, x0, y0, x1, y1) { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#feda75'); g.addColorStop(0.25, '#fa7e1e'); g.addColorStop(0.5, '#d62976'); g.addColorStop(0.75, '#962fbf'); g.addColorStop(1, '#4f5bd5'); return g; }
function loadImgSafe(src) { return new Promise(resolve => { if (!src) return resolve(null); const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src; }); }
function drawContain(ctx, img, x, y, w, h) { const ir = img.width / img.height, rr = w / h; let dw, dh; if (ir > rr) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; } ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
function wrapTextCanvas(ctx, text, maxWidth, maxLines) { const words = String(text || '').split(/\s+/).filter(Boolean); const lines = []; let line = ''; for (let i = 0; i < words.length; i++) { const test = line ? line + ' ' + words[i] : words[i]; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = words[i]; if (lines.length === maxLines) { if (i < words.length - 1) lines[lines.length - 1] += '…'; break; } } else { line = test; } } if (line && lines.length < maxLines) lines.push(line); return lines; }
function makeQRImage(text, size) { return new Promise(resolve => { if (typeof QRCode === 'undefined') return resolve(null); const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-99999px;top:0;'; document.body.appendChild(holder); try { new QRCode(holder, { text, width: size, height: size, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); } catch (e) { holder.remove(); return resolve(null); } const grab = tries => { const c = holder.querySelector('canvas'); const im = holder.querySelector('img'); let url = null; if (c && c.width) { try { url = c.toDataURL('image/png'); } catch (e) {} } else if (im && im.src && im.src.indexOf('data:') === 0) url = im.src; if (url) { holder.remove(); const q = new Image(); q.onload = () => resolve(q); q.onerror = () => resolve(null); q.src = url; } else if (tries > 0) setTimeout(() => grab(tries - 1), 60); else { holder.remove(); resolve(null); } }; setTimeout(() => grab(10), 40); }); }

async function generateShareImage(ad) {
  try {
    const W = 1080, H = 1350;
    const canvas = byId('share-canvas'); if (!canvas) return null;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    const isCombo = !!ad.isCombo;
    const kunya = getSellerKunya(ad);
    const verified = getSellerVerified(ad);
    const avatar = getSellerAvatar(ad);

let regionRaw = REGION_NAMES[ad.region] || ad.region || 'Сирия';
    let regionName = isAr && typeof DICTIONARY !== 'undefined' && DICTIONARY[regionRaw] ? DICTIONARY[regionRaw] : regionRaw;
    let cardTitle = ad.title || '';

    if (typeof translateDynamic === 'function' && cardTitle) {
      cardTitle = await translateDynamic(ad.title, currentLang);
    }
    const likesCount = (ad.likes || []).length;
    const viewsCount = ad.views || 0;
    
    // Формирование цены и выгоды для комбо
    const priceText = isCombo ? `🔥 $${Number(ad.price).toFixed(2)}` : convertPriceAll(ad.price, ad.currency, ad.isFree, ad.isNegotiable).replace(/<[^>]*>/g, '');
    const oldPriceText = isCombo && ad.comboOriginalTotal > ad.price ? `$${Number(ad.comboOriginalTotal).toFixed(2)}` : (ad.oldPrice ? `$${Number(ad.oldPrice).toFixed(2)}` : null);
    const saveAmount = isCombo && ad.comboOriginalTotal > ad.price ? (ad.comboOriginalTotal - ad.price) : (ad.oldPrice ? (ad.oldPrice - ad.price) : 0);

    const base = (location.origin && location.origin !== 'null') ? location.origin + location.pathname : location.href.split('#')[0];
    const url = base + '#ad-' + ad.id;

    // Сбор изображений (если комбо — берем фото товаров комплекта)
    let srcs = [];
    if (isCombo && Array.isArray(ad.comboItems)) {
      srcs = ad.comboItems.map(it => (it.images && it.images[0]) || it.image).filter(Boolean);
    } else {
      srcs = (ad.images && ad.images.length ? ad.images : [ad.image || PLACEHOLDER_IMG]).slice(0, 6);
    }
    if (!srcs.length) srcs.push(PLACEHOLDER_IMG);

    const photos = (await Promise.all(srcs.map(loadImgSafe))).filter(Boolean);
    const avatarImg = avatar ? await loadImgSafe(avatar) : null;
    const qrImg = await makeQRImage(url, 300);

    // Градиентная рамка
    ctx.fillStyle = isCombo ? '#f97316' : igGradient(ctx, 0, 0, W, H); 
    ctx.fillRect(0, 0, W, H);
    
    const FR = 16;
    ctx.fillStyle = '#000'; 
    roundRectPath(ctx, FR, FR, W - FR * 2, H - FR * 2, 42); 
    ctx.fill();

    const padX = FR + 44;
    const hy = FR + 44; 
    const avR = 44;

    // Аватар
    ctx.beginPath(); 
    ctx.arc(padX + avR, hy + avR, avR + 6, 0, Math.PI * 2); 
    ctx.fillStyle = isCombo ? '#f97316' : igGradient(ctx, padX, hy, padX + avR * 2, hy + avR * 2); 
    ctx.fill();

    ctx.beginPath(); 
    ctx.arc(padX + avR, hy + avR, avR, 0, Math.PI * 2); 
    ctx.fillStyle = '#121212'; 
    ctx.fill();

    if (avatarImg) { 
      ctx.save(); 
      ctx.beginPath(); 
      ctx.arc(padX + avR, hy + avR, avR - 3, 0, Math.PI * 2); 
      ctx.clip(); 
      drawContain(ctx, avatarImg, padX + 3, hy + 3, avR * 2 - 6, avR * 2 - 6); 
      ctx.restore(); 
    } else { 
      ctx.fillStyle = '#f5f5f5'; 
      ctx.font = 'bold 40px Arial'; 
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle'; 
      ctx.fillText((kunya || 'A').charAt(0).toUpperCase(), padX + avR, hy + avR + 3); 
      ctx.textAlign = 'left'; 
      ctx.textBaseline = 'alphabetic'; 
    }

    // Имя и регион продавца
    ctx.fillStyle = '#f5f5f5'; 
    ctx.font = 'bold 38px Arial';
    const nameStr = kunya || (isCombo ? 'Магазин' : 'Avito Sham');
    ctx.fillText(nameStr, padX + avR * 2 + 26, hy + avR - 4);

    if (verified) { 
      const nw = ctx.measureText(nameStr).width; 
      const bx = padX + avR * 2 + 26 + nw + 22, byy = hy + avR - 16; 
      ctx.beginPath(); 
      ctx.arc(bx, byy, 16, 0, Math.PI * 2); 
      ctx.fillStyle = '#0095f6'; 
      ctx.fill(); 
      ctx.strokeStyle = '#fff'; 
      ctx.lineWidth = 3.5; 
      ctx.lineCap = 'round'; 
      ctx.lineJoin = 'round'; 
      ctx.beginPath(); 
      ctx.moveTo(bx - 7, byy); 
      ctx.lineTo(bx - 2, byy + 6); 
      ctx.lineTo(bx + 8, byy - 6); 
      ctx.stroke(); 
    }

    ctx.fillStyle = '#a8a8a8'; 
    ctx.font = '28px Arial';
    ctx.fillText(`${regionName}${ad.city ? ' • ' + ad.city : ''}`, padX + avR * 2 + 26, hy + avR + 34);

// Бейдж акции в правом верхнем углу
    if (isCombo) {
      const comboLabel = `🔥 ${t('КОМБО')} • ${ad.comboItems ? ad.comboItems.length : 2} ${t('ТОВАРА')}`;
      ctx.font = 'bold 26px Arial';
      const pw2 = ctx.measureText(comboLabel).width + 40;
      const px2 = W - FR - 44 - pw2, py2 = hy + 22;
      ctx.fillStyle = '#f97316';
      roundRectPath(ctx, px2, py2, pw2, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(comboLabel, px2 + pw2 / 2, py2 + 27);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    } else if (srcs.length > 1) { 
      ctx.font = 'bold 26px Arial'; 
      const pw2 = ctx.measureText(' ' + srcs.length).width + 56; 
      const px2 = W - FR - 44 - pw2, py2 = hy + 22; 
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; 
      roundRectPath(ctx, px2, py2, pw2, 52, 26); 
      ctx.fill(); 
      ctx.fillStyle = '#f5f5f5'; 
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle'; 
      ctx.fillText('📷 ' + srcs.length, px2 + pw2 / 2, py2 + 27); 
      ctx.textAlign = 'left'; 
      ctx.textBaseline = 'alphabetic'; 
    }

    // Блок фотографий (сетка для комбо или галерея)
    const px = padX, pw = W - padX * 2;
    const py = hy + avR * 2 + 36;
    const photoBottom = H - FR - 380;
    const ph = photoBottom - py;
    const tileBg = '#121212';
    const strokeTile = (x, y, w, h, r) => { 
      ctx.strokeStyle = isCombo ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.10)'; 
      ctx.lineWidth = 2; 
      roundRectPath(ctx, x, y, w, h, r); 
      ctx.stroke(); 
    };

    if (photos.length > 1) {
      const gap = 14, thumbH = 170;
      const mainH = ph - thumbH - gap;
      ctx.save(); 
      roundRectPath(ctx, px, py, pw, mainH, 26); 
      ctx.clip(); 
      ctx.fillStyle = tileBg; 
      ctx.fillRect(px, py, pw, mainH); 
      if (photos[0]) drawContain(ctx, photos[0], px + 8, py + 8, pw - 16, mainH - 16); 
      ctx.restore(); 
      strokeTile(px, py, pw, mainH, 26);

      const remaining = photos.slice(1);
      const slots = 4;
      const thumbW = (pw - gap * (slots - 1)) / slots;
      const ty = py + mainH + gap;
      for (let i = 0; i < slots; i++) {
        if (i >= remaining.length) break;
        const tx = px + i * (thumbW + gap);
        ctx.save(); 
        roundRectPath(ctx, tx, ty, thumbW, thumbH, 18); 
        ctx.clip(); 
        ctx.fillStyle = tileBg; 
        ctx.fillRect(tx, ty, thumbW, thumbH); 
        drawContain(ctx, remaining[i], tx + 6, ty + 6, thumbW - 12, thumbH - 12); 
        ctx.restore(); 
        strokeTile(tx, ty, thumbW, thumbH, 18);
        if (i === slots - 1 && remaining.length > slots) { 
          const extra = remaining.length - slots + 1; 
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; 
          roundRectPath(ctx, tx, ty, thumbW, thumbH, 18); 
          ctx.fill(); 
          ctx.fillStyle = '#fff'; 
          ctx.font = 'bold 44px Arial'; 
          ctx.textAlign = 'center'; 
          ctx.textBaseline = 'middle'; 
          ctx.fillText('+' + extra, tx + thumbW / 2, ty + thumbH / 2); 
          ctx.textAlign = 'left'; 
          ctx.textBaseline = 'alphabetic'; 
        }
      }
    } else if (photos.length === 1) {
      ctx.save(); 
      roundRectPath(ctx, px, py, pw, ph, 26); 
      ctx.clip(); 
      ctx.fillStyle = tileBg; 
      ctx.fillRect(px, py, pw, ph); 
      drawContain(ctx, photos[0], px + 8, py + 8, pw - 16, ph - 16); 
      ctx.restore(); 
      strokeTile(px, py, pw, ph, 26);
    } else {
      ctx.fillStyle = tileBg; 
      roundRectPath(ctx, px, py, pw, ph, 26); 
      ctx.fill();
    }

    // Подвал: цена, QR-код и состав комплекта
    const fy = photoBottom + 30;
    const qrBox = 216;
    const qx = W - FR - 44 - qrBox;
    const qy = fy - 8;

    // QR-код
    ctx.fillStyle = '#fff'; 
    roundRectPath(ctx, qx, qy, qrBox, qrBox, 24); 
    ctx.fill();
    if (qrImg) ctx.drawImage(qrImg, qx + 14, qy + 14, qrBox - 28, qrBox - 28);

    // Бейдж цены
    ctx.font = 'bold 44px Arial';
    const ptw = Math.min(ctx.measureText(priceText).width + 60, qx - px - 30);
    const phh = 74;
    ctx.fillStyle = isCombo ? '#f97316' : igGradient(ctx, px, fy, px + ptw, fy + phh);
    roundRectPath(ctx, px, fy, ptw, phh, phh / 2); 
    ctx.fill();

    ctx.fillStyle = '#fff'; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    ctx.fillText(priceText, px + ptw / 2, fy + phh / 2 + 2);
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'alphabetic';

    // Зачеркнутая старая цена и выгода
    if (oldPriceText && saveAmount > 0) {
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#a8a8a8';
      const oldX = px + ptw + 20;
      ctx.fillText(oldPriceText, oldX, fy + phh / 2 - 6);
      
      const oldW = ctx.measureText(oldPriceText).width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(oldX - 4, fy + phh / 2 - 14);
      ctx.lineTo(oldX + oldW + 4, fy + phh / 2 - 14);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 26px Arial';
      ctx.fillText(`Экономия: +$${saveAmount.toFixed(2)}`, oldX, fy + phh / 2 + 26);
    }

    // Заголовок и перечисление состава акции
    const titleMaxW = qx - px - 30;
    ctx.fillStyle = '#f5f5f5'; 
    ctx.font = 'bold 36px Arial';
    wrapTextCanvas(ctx, cardTitle, titleMaxW, 2).forEach((ln, i) => ctx.fillText(ln, px, fy + phh + 50 + i * 44));

// Если это комбо — выводим названия товаров комплекта
    if (isCombo && Array.isArray(ad.comboItems) && ad.comboItems.length > 0) {
      let comboTitles = ad.comboItems.map(it => it.title);
      if (typeof translateDynamic === 'function') {
        comboTitles = await Promise.all(comboTitles.map(tStr => translateDynamic(tStr, currentLang)));
      }
      const itemsListStr = `${t('В комплекте:')} ` + comboTitles.join(' + ');
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 24px Arial';
      wrapTextCanvas(ctx, itemsListStr, titleMaxW, 1).forEach((ln) => ctx.fillText(ln, px, fy + phh + 142));
    }
	
    // Нижняя плашка с логотипом платформы
    const by2 = H - FR - 36;
    ctx.font = '54px "Grand Hotel", cursive';
    const brand = 'Avito Sham';
    const bw = ctx.measureText(brand).width;
    ctx.fillStyle = igGradient(ctx, px, by2 - 40, px + bw, by2 + 10);
    ctx.fillText(brand, px, by2);

    ctx.fillStyle = '#a8a8a8'; 
    ctx.font = '24px Arial'; 
    ctx.textAlign = 'right';
    ctx.fillText(`❤ ${likesCount} • 👁 ${viewsCount} • ${ad.id}`, W - FR - 44, by2 - 4);
    ctx.textAlign = 'left';

    return await new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.92));
  } catch (e) { 
    console.warn('Share card error:', e); 
    return null; 
  }
}

function renderSupportQR() { 
  const box = byId('support-qr-box'); 
  if (!box) return; 
  box.innerHTML = ''; 
  if (typeof QRCode !== 'undefined') { 
    try { 
      new QRCode(box, { 
        text: AVITOCASH_ID, 
        width: 208, 
        height: 208, 
        colorDark: '#000000', 
        colorLight: '#ffffff', 
        correctLevel: QRCode.CorrectLevel.M 
      }); 
      return;
    } catch (e) { 
      console.warn('QR render retry:', e); 
    } 
  } 
  box.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=208x208&data=${encodeURIComponent(AVITOCASH_ID)}" alt="ShamCash QR" class="w-[208px] h-[208px] rounded-lg">`;
}

function renderPhotoThumbnailsGrid(mode = 'create') {
  const isC = mode === 'create';
  const arr = isC ? pendingCreateImages : pendingEditImages;
  const g = byId(isC ? 'create-thumbnails-grid' : 'edit-thumbnails-grid');
  const b = byId(isC ? 'create-photo-count-badge' : 'edit-photo-count-badge');
  if (b) b.innerText = `${arr.length} / 6`;
  if (!g) return;
  g.innerHTML = arr.map((d, i) => `<div class="relative h-14 rounded-lg overflow-hidden border b-ig"><img src="${d}" class="w-full h-full object-cover"><button type="button" onclick="removePendingPhoto('${mode}',${i})" class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px]" style="background:#ed4956"><i class="fa-solid fa-xmark"></i></button>${i === 0 ? `<span class="absolute bottom-0 inset-x-0 text-[7px] font-bold text-center py-0.5" style="background:rgba(245,158,11,.85);color:#000">${t('ГЛАВНАЯ')}</span>` : ''}</div>`).join('');
}

function fillCategorySelect(sel, selected) { 
  if (!sel) return; 
  const currentVal = selected || sel.value || '';
  sel.innerHTML = `<option value="" disabled ${!currentVal ? 'selected' : ''}>${t('Категория *')}</option>` + categories.map(c => `<option value="${c.id}">${t(c.name)}</option>`).join(''); 
  if (currentVal) sel.value = currentVal; 
}

function renderComboItemsList() {
  const list = byId('combo-items-list');
  if (!list) return;
  if (!comboBuilderAds.length) {
    list.innerHTML = `<div class="text-center py-6 t2">${t('У магазина пока нет активных товаров')}</div>`;
    return;
  }
  const isAr = currentLang === 'ar';
  list.innerHTML = comboBuilderAds.map((a, idx) => {
    const sel = comboSelectedIds.includes(a.id);
    if (isAr && typeof translateDynamic === 'function') {
      translateDynamic(a.title, 'ar').then(trans => {
        const el = byId(`combo-builder-item-title-${a.id}`);
        if (el) el.innerText = trans;
      });
    }
    return `<label class="flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${sel ? '' : 'b-ig bg-field hover:bg-ig'}" style="${sel ? 'border-color:#f97316;background:rgba(249,115,22,.1)' : ''}"><input type="checkbox" ${sel ? 'checked' : ''} onchange="toggleComboItem('${a.id}')" class="w-4 h-4 shrink-0" style="accent-color:#f97316"><img src="${(a.images && a.images[0]) || a.image}" class="w-10 h-10 rounded-lg object-cover border b-ig shrink-0"><div class="flex-1 min-w-0"><div id="combo-builder-item-title-${a.id}" class="font-bold t1 text-xs truncate">${a.title}</div><div class="text-[10px] t2">${convertPriceAll(a.price, a.currency, a.isFree, a.isNegotiable)}</div></div>${sel ? '<i class="fa-solid fa-fire" style="color:#f97316"></i>' : ''}</label>`;
  }).join('');
}

function updateComboSummary() {
  const el = byId('combo-summary');
  if (!el) return;
  const selected = comboBuilderAds.filter(a => comboSelectedIds.includes(a.id));
  const total = selected.reduce((s, a) => s + adToUSD(a), 0);
  const price = parseFloat(byId('combo-price')?.value || 0);
  if (selected.length < 2) {
    el.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${t('Выберите минимум 2 товара для создания комбо. Выбрано:')} ${selected.length}.`;
    return;
  }
  const save = total - price;
  el.innerHTML = `<div class="space-y-1"><div>${t('Товаров в комплекте:')} <b class="t1">${selected.length}</b></div><div>${t('Цена по отдельности:')} <b class="t2 line-through">$${total.toFixed(2)}</b></div><div>${t('цена комплекта')}: <b style="color:#f97316">$${(price || 0).toFixed(2)}</b></div>${price > 0 ? `<div>${t('Выгода покупателя:')} <b style="color:${save > 0 ? '#10b981' : '#ed4956'}">${save > 0 ? '$' + save.toFixed(2) + ' (-' + Math.round(save / total * 100) + '%)' : t('нет скидки')}</b></div>` : ''}</div>`;
}

function getCategoryAdsCount(catId) { 
  if (catId === 'combos') return combos.length; 
  if (catId === 'discounts') return ads.filter(a => a.status === 'ACTIVE' && a.oldPrice && a.oldPrice > a.price).length;
  if (catId === 'sold_archive') return ads.filter(a => a.status === 'SOLD').length;
  return ads.filter(ad => { 
    if (ad.status !== 'ACTIVE') return false; 
    if (ad.isWomenOnly && (!currentUser || (currentUser.gender !== 'FEMALE' && !(currentUser.role === 'SUPERUSER' && currentUser.showWomenAds) && currentUser.role !== 'ADMIN'))) return false; 
    if (catId === 'free') return ad.isFree || (ad.price === 0 && !ad.isNegotiable); 
    if (catId === 'women_only') return ad.isWomenOnly; 
    return ad.category === catId; 
  }).length; 
}

function renderCategoryPills() {
  const c = byId('categories-container');
  if (!c) return;
  let pills = [{ id: 'all', icon: 'fa-border-all', name: t('Все') }];
  if (currentUser && (currentUser.gender === 'FEMALE' || currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN')) {
    pills.push({ id: 'women_only', icon: 'fa-venus', name: t('Для женщин 🌸') });
  }
  pills.push({ id: 'free', icon: 'fa-gift', name: t('Даром 🎁') });
  pills.push({ id: 'sold_archive', icon: 'fa-handshake', name: t('Продано 🤝') });
  pills.push({ id: 'discounts', icon: 'fa-percent', name: t('Скидки') });
  pills.push({ id: 'combos', icon: 'fa-fire', name: t('Акции') });
  pills = pills.concat(categories.map(x => ({ id: x.id, icon: x.icon || 'fa-tag', name: t(x.name) })));

  const systemAlwaysShown = ['all', 'sold_archive', 'free', 'discounts', 'combos', 'women_only'];

  const visiblePills = pills.map(p => {
    const count = p.id === 'all' 
      ? (ads.filter(a => a.status === 'ACTIVE' && (!a.isWomenOnly || (currentUser && (currentUser.gender === 'FEMALE' || (currentUser.role === 'SUPERUSER' && currentUser.showWomenAds) || currentUser.role !== 'ADMIN')))).length + combos.length) 
      : getCategoryAdsCount(p.id);
    return { ...p, count };
  }).filter(p => {
    if (systemAlwaysShown.includes(p.id)) return true;
    if (selectedCategory === p.id) return true;
    return p.count > 0;
  });

  c.innerHTML = visiblePills.map(p => {
    const active = selectedCategory === p.id;
    return `<button onclick="handleCategoryClick('${p.id}')" class="flex flex-col items-center gap-1 shrink-0 w-[48px] group">
<div class="w-8 h-8 rounded-full p-[2px] ${active ? 'story-ring shadow-md' : ''}" style="${active ? '' : 'background:#363636'}"><div class="w-full h-full rounded-full bg-card p-[1px]"><div class="w-full h-full rounded-full bg-field flex items-center justify-center t1 text-sm"><i class="fa-solid ${p.icon}"></i></div></div></div>
<span class="text-[10px] ${active ? 'font-bold t1' : 't2'} truncate w-12 text-center">${p.name}</span><span class="text-[8px] t2 -mt-1">${p.count}</span></button>`;
  }).join('');
}

let currentRenderCycle = 0;
function renderAds() {
  const grid = byId('listings-view'), pag = byId('pagination-container');
  if (!grid) return;
  const renderCycleId = ++currentRenderCycle;
  const q = (typeof searchQuery !== 'undefined' && searchQuery ? searchQuery : (byId('search-input-desktop')?.value || byId('search-input')?.value || '')).trim().toLowerCase();
  const region = byId('region-filter')?.value || 'ALL';
  
if (selectedCategory === 'shops_dir') {
    const shops = users.filter(u => u.shop && (u.verifiedShop || u.shop.isVerified) && (region === 'ALL' || u.shop.region === region));
    if (!shops.length) {
      grid.innerHTML = `<div class="py-16 text-center t2"><i class="fa-solid fa-store text-4xl mb-3 block opacity-40" style="color:#9333ea"></i>${t('Подтвержденных магазинов в данном регионе пока нет.')}</div>`;
      if (pag) pag.innerHTML = '';
      return;
    }
    grid.innerHTML = shops.map(u => {
      const s = u.shop;
      const cnt = ads.filter(a => a.sellerUsername && a.sellerUsername.toLowerCase() === u.username.toLowerCase() && a.status === 'ACTIVE').length;
      const uCombos = combos.filter(x => x.shopUid === u.uid).length;
      const regionName = t(REGION_NAMES[s.region] || s.region);
      return `<div class="ig-card rounded-xl p-3 space-y-2 card-in">
<div class="flex items-center gap-3">
<div class="story-ring rounded-full p-[2px] shrink-0"><div class="rounded-full bg-card p-[2px]"><div class="w-12 h-12 rounded-full overflow-hidden bg-field flex items-center justify-center t2">${s.logo ? `<img src="${s.logo}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-store text-lg"></i>'}</div></div></div>
<div class="flex-1 min-w-0"><div class="font-bold text-sm t1 flex items-center gap-1.5 truncate"><span>${s.name}</span> ${IGSVG.verified()}</div><div class="text-xs t2 truncate">${s.slogan || ''}</div><div class="text-xs t2"><i class="fa-solid fa-location-dot" style="color:#f59e0b"></i> ${regionName}</div></div>
</div>
<p class="text-xs t1 line-clamp-2 bg-field p-2 rounded-lg border b-ig">${s.desc || ''}</p>
<div class="pt-2 border-t b-ig flex items-center justify-between"><span class="text-[10px] font-bold" style="color:#f59e0b"><i class="fa-solid fa-boxes-stacked"></i> ${cnt} ${t('товаров')} ${uCombos > 0 ? `• <span style="color:#f97316"><i class="fa-solid fa-fire"></i> ${uCombos} ${t('акций')}</span>` : ''}</span><button onclick="openShopShowcase('${u.uid}')" class="ig-btn px-4 py-1.5 text-xs">${t('Смотреть магазин')}</button></div></div>`;
    }).join('');
    if (pag) pag.innerHTML = '';
    return;
  }
  
  const merged = ads.concat(combos.map(comboToVirtualAd).filter(Boolean));
  const filtered = merged.filter(ad => {
    const isCombo = !!ad.isCombo;
    if (selectedCategory === 'sold_archive') {
      if (isCombo || ad.status !== 'SOLD') return false;
    } else {
      if (!isCombo) {
        if (ad.status !== 'ACTIVE') return false;
        if (ad.isWomenOnly && (!currentUser || (currentUser.gender !== 'FEMALE' && !(currentUser.role === 'SUPERUSER' && currentUser.showWomenAds) && currentUser.role !== 'ADMIN'))) return false;
      }
      if (selectedCategory === 'favorites') {
        if (!favorites.includes(ad.id)) return false;
      } else if (selectedCategory === 'combos') {
        if (!isCombo) return false;
      } else if (selectedCategory === 'discounts') {
        if (isCombo || !ad.oldPrice || ad.oldPrice <= ad.price) return false;
      } else if (selectedCategory === 'women_only') {
        if (isCombo || !ad.isWomenOnly) return false;
      } else if (selectedCategory === 'free') {
        if (isCombo || (!ad.isFree && ad.price > 0)) return false;
      } else if (selectedCategory !== 'all') {
        if (isCombo || ad.category !== selectedCategory) return false;
      }
    }
	
if (selectedCategory !== 'favorites') {
      if (region !== 'ALL' && ad.region !== region) return false;
      if (activeRadiusKm > 0 && userCurrentCoords) {
        if (!ad.lat || !ad.lng) return false;
        const dist = calculateDistanceKm(userCurrentCoords.lat, userCurrentCoords.lng, parseFloat(ad.lat), parseFloat(ad.lng));
        ad._distance = dist;
        if (dist === null || dist > activeRadiusKm) return false;
      }
    }
	if (q) {
      const cleanQ = q.toLowerCase().trim();
      const titleText = (ad.title || '').toLowerCase();
      const cityText = (ad.city || '').toLowerCase();
      const descText = (ad.desc || '').toLowerCase();
      const kunyaText = (getSellerKunya(ad) || '').toLowerCase();

      let matched = titleText.includes(cleanQ) || cityText.includes(cleanQ) || descText.includes(cleanQ) || kunyaText.includes(cleanQ);

      if (!matched && currentLang === 'ar') {
        const cleanArQ = typeof normalizeArabicText === 'function' ? normalizeArabicText(q) : cleanQ;
        const titleNorm = typeof normalizeArabicText === 'function' ? normalizeArabicText(ad.title) : titleText;
        const descNorm = typeof normalizeArabicText === 'function' ? normalizeArabicText(ad.desc) : descText;
        
        matched = titleNorm.includes(cleanArQ) || descNorm.includes(cleanArQ);

        if (!matched) {
          const catObj = categories.find(c => c.id === ad.category);
          if (catObj && typeof normalizeArabicText === 'function' && normalizeArabicText(t(catObj.name)).includes(cleanArQ)) {
            matched = true;
          }
          if (!matched && typeof TRANSLATE_CACHE !== 'undefined') {
            const cacheKey = `ar_${(ad.title || '').trim()}`;
            if (TRANSLATE_CACHE[cacheKey]) {
              matched = normalizeArabicText(TRANSLATE_CACHE[cacheKey]).includes(cleanArQ);
            }
          }
        }
      }

      if (!matched) return false;
    }
    return true;
  });
  
  filtered.sort((a, b) => {
	  if (currentSortMode === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
    if (currentSortMode === 'cheapest') return adToUSD(a) - adToUSD(b);
    if (currentSortMode === 'expensive') return adToUSD(b) - adToUSD(a);
    if (currentSortMode === 'popular') {
      const scoreA = (a.views || 0) + ((a.likes || []).length * 10);
      const scoreB = (b.views || 0) + ((b.likes || []).length * 10);
      return scoreB - scoreA;
    }
    return 0;
  });

const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const pageAds = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  if (!pageAds.length) {
    grid.innerHTML = `<div class="py-16 text-center t2"><i class="fa-solid fa-box-open text-4xl mb-3 block opacity-40"></i>${t('Объявлений пока нет. Будьте первым!')}</div>`;
    if (pag) pag.innerHTML = '';
    return;
  }

const layout = localStorage.getItem('bs_feed_layout') || 'instagram';

if (layout === 'grid') {
    grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-1';
    grid.innerHTML = pageAds.map(ad => {
      const img = (ad.images && ad.images[0]) || ad.image || PLACEHOLDER_IMG;
      const isCombo = !!ad.isCombo;
      const hasDisc = !!(ad.oldPrice && ad.oldPrice > ad.price) || isCombo;
      const discPercent = (ad.oldPrice && ad.oldPrice > ad.price) ? Math.round((1 - ad.price / ad.oldPrice) * 100) : (isCombo && ad.comboOriginalTotal > ad.price ? Math.round((1 - ad.price / ad.comboOriginalTotal) * 100) : 0);
      const oldPr = ad.oldPrice || (isCombo ? ad.comboOriginalTotal : null);
      const isFav = favorites.includes(ad.id);
      const liked = currentUser && (ad.likes || []).includes(currentUser.username);

      setTimeout(async () => {
        if (renderCycleId !== currentRenderCycle) return;
        const targetLanguage = currentLang;
        const el = document.getElementById(`grid-title-${ad.id}`);
        if (el) {
          const transTitle = await translateDynamic(ad.title, targetLanguage);
          if (renderCycleId === currentRenderCycle) el.innerText = transTitle;
        }
      }, 10);
	  
return `<div class="bg-card rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:scale-[1.01] ${hasDisc ? 'fire-card' : 'border b-ig'}">
<div onclick="openAdDetail('${ad.id}')" class="relative aspect-square cursor-pointer overflow-hidden bg-black">
    ${isCombo ? renderComboSlashCollage(ad) : `<img src="${img}" class="w-full h-full object-cover">`}
    ${ad.status === 'SOLD' ? `
      <div class="absolute inset-0 z-20 flex items-center justify-center bg-black/50 pointer-events-none">
        <div class="transform -rotate-12 border-2 border-emerald-500 text-emerald-400 font-black tracking-wider text-xs px-2.5 py-1 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.7)] bg-black/80 uppercase backdrop-blur-sm select-none">
          ${currentLang === 'ar' ? 'تم البيع ✓' : 'ПРОДАНО ✓'}
        </div>
      </div>
    ` : ''}
    ${hasDisc ? `
	<div class="absolute top-2 left-2 z-10 px-2 py-1 rounded-lg text-[10px] font-black text-white shadow-lg flex items-center gap-1" style="background:linear-gradient(45deg,#ef4444,#b91c1c)">
        <i class="fa-solid ${isCombo ? 'fa-fire' : 'fa-fire-flame-curved'}"></i> ${isCombo ? t('КОМБО') : '-' + discPercent + '%'}
      </div>` : ''}
	  <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2.5 space-y-0.5">
      <div id="grid-title-${ad.id}" class="text-white text-xs font-bold truncate">${ad.title}</div>
      <div class="flex items-center gap-1.5 flex-wrap">
        ${hasDisc ? `
          <span class="text-white text-[11px] font-black" style="color:#ef4444">$${Number(ad.price).toFixed(2)}</span>
          ${oldPr ? `<span class="text-slate-400 text-[9px] line-through">$${Number(oldPr).toFixed(2)}</span>` : ''}
        ` : `<span class="text-white text-xs font-bold">${priceBadge(ad)}</span>`}
      </div>
    </div>
  </div>
  <div class="flex items-center justify-around py-2 px-1 border-t b-ig bg-card t1">
    <button onclick="toggleLike('${ad.id}', event)" class="ig-btn-nav p-1 text-sm ${liked ? 'heart-pop' : ''}" title="Лайк">${IGSVG.heart(liked)}</button>
    <button onclick="toggleFavorite('${ad.id}', event)" class="ig-btn-nav p-1 text-sm ${isFav ? 'heart-pop' : ''}" title="В избранное" style="${isFav ? 'color:#f59e0b' : ''}">${IGSVG.star(isFav)}</button>
    <button onclick="shareAd('${ad.id}')" class="ig-btn-nav p-1 text-sm" title="Поделиться">${IGSVG.send()}</button>
    ${ad.isCombo ? '' : `<button onclick="queueToggleCard('${ad.id}')" class="ig-btn-nav p-1 text-sm" title="Занять очередь">${IGSVG.bookmark(isFav)}</button>`}
  </div>
</div>`;
    }).join('');
} else if (layout === 'list') {
    grid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3';
    grid.innerHTML = pageAds.map(ad => {
      const img = (ad.images && ad.images[0]) || ad.image || PLACEHOLDER_IMG;
      const isCombo = !!ad.isCombo;
      const hasDisc = !!(ad.oldPrice && ad.oldPrice > ad.price) || isCombo;
      const discPercent = (ad.oldPrice && ad.oldPrice > ad.price) ? Math.round((1 - ad.price / ad.oldPrice) * 100) : (isCombo && ad.comboOriginalTotal > ad.price ? Math.round((1 - ad.price / ad.comboOriginalTotal) * 100) : 0);
      const oldPr = ad.oldPrice || (isCombo ? ad.comboOriginalTotal : null);
      const saveAmount = oldPr ? (oldPr - ad.price) : 0;
      const isFav = favorites.includes(ad.id);
      const liked = currentUser && (ad.likes || []).includes(currentUser.username);

      setTimeout(async () => {
        if (renderCycleId !== currentRenderCycle) return;
        const targetLanguage = currentLang;
        const tEl = document.getElementById(`list-title-${ad.id}`);
        if (tEl) {
          const transTitle = await translateDynamic(ad.title, targetLanguage);
          if (renderCycleId === currentRenderCycle) tEl.innerText = transTitle;
        }
      }, 10);

return `<div class="ig-card p-3 rounded-2xl flex flex-col justify-between gap-2.5 transition-all hover:scale-[1.01] ${hasDisc ? 'fire-card' : 'b-ig'}">
  <div onclick="openAdDetail('${ad.id}')" class="flex gap-3 cursor-pointer">
<div class="relative w-24 h-24 rounded-xl overflow-hidden bg-black shrink-0">
      ${isCombo ? renderComboSlashCollage(ad) : `<img src="${img}" class="w-full h-full object-cover">`}
      ${ad.status === 'SOLD' ? `
        <div class="absolute inset-0 z-20 flex items-center justify-center bg-black/50 pointer-events-none">
          <div class="transform -rotate-12 border border-emerald-500 text-emerald-400 font-black tracking-wider text-[9px] px-1.5 py-0.5 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.7)] bg-black/80 uppercase backdrop-blur-sm select-none">
            ${currentLang === 'ar' ? 'تم البيع ✓' : 'ПРОДАНО ✓'}
          </div>
        </div>
      ` : ''}
      ${hasDisc ? `<span class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white shadow" style="background:#ef4444">${isCombo ? t('КОМБО') : '-' + discPercent + '%'}</span>` : ''}
    </div>
    <div class="flex-1 min-w-0 flex flex-col justify-between">
      <div>
        <div id="list-title-${ad.id}" class="font-bold t1 text-sm truncate">${ad.title}</div>
        <div class="text-xs t2 truncate">${ad.city} • ${timeAgo(ad.createdAt)}</div>
      </div>
      <div class="flex items-center justify-between pt-1">
        <div>
          ${hasDisc ? `
            ${oldPr ? `<div class="text-[10px] t2 line-through">$${Number(oldPr).toFixed(2)}</div>` : ''}
            <div class="text-sm font-black" style="color:#ef4444">$${Number(ad.price).toFixed(2)}</div>
          ` : `<div class="text-sm font-bold" style="color:#f59e0b">${priceBadge(ad)}</div>`}
        </div>
        ${hasDisc && saveAmount > 0 ? `<div class="text-[10px] font-bold px-2 py-1 rounded-lg" style="background:rgba(16,185,129,.15);color:#10b981">${t('Выгода')} +$${saveAmount.toFixed(2)}</div>` : ''}
      </div>
    </div>
  </div>
<div class="flex items-center justify-around pt-2 border-t b-ig t1">
    <button onclick="toggleLike('${ad.id}', event)" class="ig-btn-nav p-1 text-sm flex items-center gap-1.5 ${liked ? 'heart-pop' : ''}" title="Лайк">${IGSVG.heart(liked)} <span class="text-xs">${(ad.likes || []).length}</span></button>
    <button onclick="toggleFavorite('${ad.id}', event)" class="ig-btn-nav p-1 text-sm ${isFav ? 'heart-pop' : ''}" title="В избранное" style="${isFav ? 'color:#f59e0b' : ''}">${IGSVG.star(isFav)}</button>
    <button onclick="shareAd('${ad.id}')" class="ig-btn-nav p-1 text-sm" title="Поделиться">${IGSVG.send()}</button>
    ${ad.isCombo ? '' : `<button onclick="queueToggleCard('${ad.id}')" class="ig-btn-nav p-1 text-sm" title="Занять очередь">${IGSVG.bookmark(isFav)}</button>`}
  </div>
</div>`;
    }).join('');
} else {
    grid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4';
    grid.innerHTML = pageAds.map((ad, index) => {
		cardPhotoIndex[ad.id] = 0;
      const imgs = (ad.images && ad.images.length) ? ad.images : [ad.image || PLACEHOLDER_IMG];
      const kunya = getSellerKunya(ad);
      const avatar = getSellerAvatar(ad);
      const verified = getSellerVerified(ad);
      const qc = (ad.queue || []).length;
      const isFav = favorites.includes(ad.id);
      const liked = currentUser && (ad.likes || []).includes(currentUser.username);
      const likesCount = (ad.likes || []).length;
      const viewsCount = ad.views || 0;
      const regionName = t(REGION_NAMES[ad.region] || ad.region || 'Сирия');

      setTimeout(async () => {
        if (renderCycleId !== currentRenderCycle) return;
        const targetLanguage = currentLang;
        const tEl = document.getElementById(`feed-title-${ad.id}`);
        const dEl = document.getElementById(`feed-desc-${ad.id}`);
        if (tEl && ad.title) {
          const transTitle = await translateDynamic(ad.title, targetLanguage);
          if (renderCycleId === currentRenderCycle) tEl.innerText = transTitle;
        }
        if (dEl && ad.desc) {
          const transDesc = await translateDynamic(ad.desc, targetLanguage);
          if (renderCycleId === currentRenderCycle) dEl.innerText = transDesc;
        }
      }, 10);
	  
      const hasDiscount = !!(ad.oldPrice && ad.oldPrice > ad.price);
      const discPercent = hasDiscount ? Math.round((1 - ad.price / ad.oldPrice) * 100) : 0;
      const saveAmount = hasDiscount ? (ad.oldPrice - ad.price) : 0;

return `
<article class="card-in bg-card pb-3 rounded-2xl transition-all my-2 ${hasDiscount || ad.isCombo ? 'fire-card' : 'border-b b-ig'}">
<div class="flex items-center gap-3 px-3.5 py-2.5">
<div class="w-9 h-9 rounded-full p-[2px] shrink-0 ${verified ? 'story-ring' : ''}" style="${verified ? '' : 'background:#363636'}"><div class="w-full h-full rounded-full bg-card p-[1.5px]"><div class="w-full h-full rounded-full overflow-hidden bg-field flex items-center justify-center t2 text-xs font-bold cursor-pointer" onclick="openAdDetail('${ad.id}')">${avatar ? `<img src="${avatar}" alt="Аватар продавца" loading="lazy" decoding="async" class="w-full h-full object-cover">` : (ad.isCombo ? '<i class="fa-solid fa-fire" style="color:#f97316"></i>' : (ad.sellerUsername || '?').charAt(0).toUpperCase())}</div></div></div>
<div class="flex-1 min-w-0 cursor-pointer" onclick="openAdDetail('${ad.id}')">
<div class="flex items-center gap-1.5 text-sm font-semibold t1">${kunya} ${verified ? IGSVG.verified() : ''} <span class="t2 font-normal text-xs">• ${timeAgo(ad.createdAt)}</span></div>
<div class="text-xs t2 truncate">
  ${regionName} • ${ad.city}
  ${(userCurrentCoords && ad.lat && ad.lng) ? ` · <b class="text-blue-500 font-mono font-bold">${calculateDistanceKm(userCurrentCoords.lat, userCurrentCoords.lng, parseFloat(ad.lat), parseFloat(ad.lng)).toFixed(1)} ${t('км от вас')}</b>` : ''}
</div>
</div>
<button onclick="openAdDetail('${ad.id}')" aria-label="Меню объявления" class="ig-btn-nav t1"><i class="fa-solid fa-ellipsis"></i></button>
</div>
<div class="relative bg-black overflow-hidden cursor-pointer select-none" style="aspect-ratio:4/5" ontouchstart="handleTouchSwipeStart(event)" ontouchend="handleTouchSwipeEnd(event, (dir) => cardNav(event, '${ad.id}', dir))" onclick="openAdDetail('${ad.id}')">
${ad.isCombo ? renderComboSlashCollage(ad) : `
<div id="cbg-${ad.id}" class="absolute inset-0 bg-cover bg-center blur-md opacity-25 scale-105" style="background-image:url('${imgs[0]}'); transition: opacity 0.3s;"></div>
<img id="cimg-${ad.id}" src="${imgs[0]}" alt="${ad.title}" loading="lazy" decoding="async" class="relative w-full h-full object-contain z-[1] transition-opacity duration-200" onerror="this.src=PLACEHOLDER_IMG" onload="this.style.opacity='1'; if(this.naturalWidth<=300 && this.src.includes('imgbb')) this.src=PLACEHOLDER_IMG;" style="opacity:0.85">
`}
${ad.status === 'SOLD' ? `
  <div class="absolute inset-0 z-20 flex items-center justify-center bg-black/45 pointer-events-none">
    <div class="transform -rotate-12 border-4 border-emerald-500 text-emerald-400 font-black tracking-widest text-2xl sm:text-3xl px-6 py-2 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.7)] bg-black/75 uppercase backdrop-blur-sm select-none">
      ${currentLang === 'ar' ? 'تم البيع ✓' : 'ПРОДАНО ✓'}
    </div>
  </div>
` : ''}
${ad.isCombo ? `
  <div class="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-xl border border-white/20" style="background:linear-gradient(45deg,#f97316,#ef4444)">
    <i class="fa-solid fa-fire animate-pulse text-sm"></i> ${t('АКЦИЯ')} • ${t('КОМБО')}
  </div>` : (hasDiscount ? `
  <div class="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-2xl border border-white/25" style="background:linear-gradient(45deg,#ef4444,#b91c1c)">
    <i class="fa-solid fa-fire-flame-curved animate-bounce"></i> ${t('Скидка')} -${discPercent}%
  </div>` : `<span class="absolute top-3 left-3 z-10 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-white/10">${priceBadge(ad)}</span>`)}
  ${ad.isWomenOnly ? `<span class="absolute bottom-3 left-3 z-10 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg" style="background:rgba(236,72,153,.9)">${t('Для женщин 🌸')}</span>` : ''}
  ${imgs.length > 1 ? `<button onclick="cardNav(event,'${ad.id}',-1)" aria-label="Предыдущее фото" class="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow hover:bg-white">${IGSVG.chevL()}</button><button onclick="cardNav(event,'${ad.id}',1)" aria-label="Следующее фото" class="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow hover:bg-white">${IGSVG.chevR()}</button><div id="cdot-${ad.id}" class="absolute bottom-2.5 inset-x-0 z-10 flex justify-center gap-1">${imgs.map((_, i) => `<span class="w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}"></span>`).join('')}</div>` : ''}
</div>
<div class="flex items-center gap-4 px-3.5 pt-3 t1">
<button onclick="toggleLike('${ad.id}', event)" class="ig-btn-nav ${liked ? 'heart-pop' : ''}" title="Лайк">${IGSVG.heart(liked)}</button>
<button onclick="toggleFavorite('${ad.id}', event)" class="ig-btn-nav ${isFav ? 'heart-pop' : ''}" title="${t('Избранное')}" style="${isFav ? 'color:#f59e0b' : ''}">${IGSVG.star(isFav)}</button>
<button onclick="shareAd('${ad.id}')" class="ig-btn-nav" title="${t('Поделиться')}">${IGSVG.send()}</button>
${ad.isCombo ? `<span class="ml-auto text-[11px] font-extrabold flex items-center gap-1" style="color:#f97316"><i class="fa-solid fa-fire"></i> ${ad.comboItems.length} ${t('товаров')}</span>` : `<button onclick="queueToggleCard('${ad.id}')" class="ig-btn-nav ml-auto" title="${t('Занять очередь')}">${IGSVG.bookmark(isFav)}</button>`}
</div>
${hasDiscount ? `
  <div class="mx-3.5 mt-2 p-2.5 rounded-xl border flex items-center justify-between" style="border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.08)">
    <div>
      <div class="text-[11px] t2 line-through font-semibold">$${Number(ad.oldPrice).toFixed(2)}</div>
      <div class="text-base font-black" style="color:#ef4444">$${Number(ad.price).toFixed(2)} <span class="text-[10px] font-extrabold text-black px-1.5 py-0.5 rounded ml-1 bg-red-400">-${discPercent}%</span></div>
    </div>
	<div class="text-right">
    <div class="text-[10px] uppercase font-bold t2">${t('Ваша выгода:')}</div>
    <div class="text-xs font-black" style="color:#10b981">+$${saveAmount.toFixed(2)}</div>
  </div>
</div>` : ''}
<div class="px-3.5 pt-2 text-sm font-semibold t1">${likesCount > 0 ? `${t('Нравится:')} ${likesCount}` : t('Будьте первым, кому понравилось')}</div>
${ad.isCombo ? `<div class="px-3.5 pt-1 text-sm font-semibold t1">💥 ${t('Цена акции:')} <span style="color:#f97316">$${Number(ad.price).toFixed(2)}</span> <s class="t2 font-normal">$${ad.comboOriginalTotal.toFixed(2)}</s>${ad.comboOriginalTotal > ad.price ? ` <span style="color:#10b981">${t('выгода')} $${(ad.comboOriginalTotal - ad.price).toFixed(2)}</span>` : ''}</div>` : ''}
<div class="px-3.5 pt-1 text-sm t1 leading-snug"><span class="font-semibold">${kunya}</span> <span id="feed-title-${ad.id}" class="font-semibold">${ad.title}</span> <span id="feed-desc-${ad.id}" class="t2 line-clamp-2">${ad.desc || ''}</span> <button onclick="openAdDetail('${ad.id}')" class="t2">… ${currentLang === 'ar' ? 'المزيد' : 'ещё'}</button></div>
<div class="px-3.5 pt-1 text-sm t2 cursor-pointer" onclick="openAdDetail('${ad.id}')">${qc > 0 ? `${t('Посмотреть очередь')}: ${qc}` : t('Очередь свободна')}</div>
<div class="px-3.5 pt-1 flex items-center justify-between text-[10px] t2">
  <span class="uppercase tracking-wide">${timeAgo(ad.createdAt)} • 👁 ${viewsCount}</span>
  ${(ad.status === 'EXPIRED' || (Date.now() - (ad.createdAt || 0) > 30 * 24 * 60 * 60 * 1000)) ? `
  <span class="px-2 py-0.5 rounded font-bold text-[9px] border" style="background:rgba(239,68,68,.12);color:#ef4444;border-color:rgba(239,68,68,.3)">
    ⚠️ ${t('Неактуально • Возможно, продано')}
  </span>` : ''}
</div>
</article>`;
    }).join('');
  }
  
  if (pag) {
    pag.innerHTML = `<button onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''} class="ig-btn-outline px-3 py-1.5 text-xs disabled:opacity-30">${t('« Первая')}</button><button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="ig-btn-outline px-3 py-1.5 text-xs disabled:opacity-30">${t('< Назад')}</button><span class="px-3 py-1.5 rounded-lg text-xs font-bold t1 bg-field border b-ig">${t('Страница')} ${currentPage} ${t('из')} ${totalPages}</span><button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="ig-btn-outline px-3 py-1.5 text-xs disabled:opacity-30">${t('Вперед >')}</button><button onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''} class="ig-btn-outline px-3 py-1.5 text-xs disabled:opacity-30">${t('Последняя »')}</button>`;
  }
}

function renderMyReceipts() { 
  if (!currentUser) return `<div class="text-[11px] t2">${t('Чеков пока нет — история покупок и продаж появится здесь')}</div>`; 
  const list = Object.values(currentUser.receipts || {}).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); 
  if (!list.length) return `<div class="text-[11px] t2">${t('Чеков пока нет — история покупок и продаж появится здесь')}</div>`; 
  
  setTimeout(() => {
    list.forEach(async (txItem) => {
      const el = document.getElementById(`tx-note-${txItem.id}`);
      if (el) {
        let rawContent = txItem.adTitle || txItem.note || '';
        if (currentLang === 'ar') {
          rawContent = rawContent.replace('Пополнение AvitoCash', 'شحن رصيد AvitoCash')
                                 .replace('код', 'كود')
                                 .replace('Принудительное взыскание администратором', 'خصم إداري')
                                 .replace('в пользу', 'لصالح')
                                 .replace('Оплата услуги', 'رسوم خدمة');
          el.innerText = await translateDynamic(rawContent, 'ar');
        } else {
          el.innerText = rawContent;
        }
      }
    });
  }, 20);

  return list.map(txItem => {
    const rawNote = txItem.adTitle || txItem.note || '';
    const fromTo = txItem.senderUsername && txItem.recipientUsername 
      ? ` • ${(txItem.recipientUid === currentUser.uid ? (currentLang === 'ar' ? 'من @' : 'от @') + txItem.senderUsername : '→ @' + txItem.recipientUsername)}` 
      : '';
    return `<div class="flex items-center justify-between gap-2 border-b b-ig py-1.5 text-[11px]">
      <div class="min-w-0">
        <div class="font-bold t1 truncate">${txTypeLabel(txItem, currentUser.uid)} • ${Number(txItem.amount || 0).toFixed(2)} AC</div>
        <div class="t2 truncate"><span id="tx-note-${txItem.id}">${rawNote}</span>${fromTo}</div>
      </div>
      <div class="t2 shrink-0 text-[9px]">${new Date(txItem.timestamp || Date.now()).toLocaleDateString()}</div>
    </div>`;
  }).join(''); 
}

function renderFinanceReport() { 
  const balances = users.map(u => ({ username: u.username || '—', name: u.kunya || u.username || '—', balance: Number(u.avitocashBalance ?? u.shamcashBalance ?? 0) })).sort((a, b) => b.balance - a.balance);
  const totalBalance = balances.reduce((sum, u) => sum + u.balance, 0);
  const fundedUsers = balances.filter(u => u.balance > 0).length;
  const requests = Object.values(TOPUP_REQUESTS || {});
  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const rejected = requests.filter(r => r.status === 'rejected');
  const approvedAmount = approved.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const pendingAmount = pending.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return `<div class="space-y-3"><div class="flex items-center justify-between gap-2 flex-wrap"><h4 class="font-bold t1 text-sm"><i class="fa-solid fa-chart-line" style="color:#10b981"></i> Актуальный финансовый отчет</h4><span class="text-[10px] t2">Обновлено: ${new Date().toLocaleTimeString()}</span></div><div class="grid grid-cols-2 lg:grid-cols-4 gap-2"><div class="ig-card p-3 rounded-xl"><div class="text-[10px] t2">Баланс пользователей</div><div class="text-lg font-extrabold" style="color:#f59e0b">${totalBalance.toFixed(2)} AC</div></div><div class="ig-card p-3 rounded-xl"><div class="text-[10px] t2">С балансом</div><div class="text-lg font-extrabold" style="color:#0095f6">${fundedUsers}</div></div><div class="ig-card p-3 rounded-xl"><div class="text-[10px] t2">Ожидают проверки</div><div class="text-lg font-extrabold" style="color:#f59e0b">${pendingAmount.toFixed(2)} AC</div><div class="text-[10px] t2">${pending.length} заявок</div></div><div class="ig-card p-3 rounded-xl"><div class="text-[10px] t2">Подтверждено</div><div class="text-lg font-extrabold" style="color:#10b981">${approvedAmount.toFixed(2)} AC</div><div class="text-[10px] t2">${approved.length} заявок</div></div></div><div class="ig-card p-3 rounded-xl"><div class="flex items-center justify-between gap-2 mb-2"><span class="text-xs font-bold t1">Баланс пользователей</span><span class="text-[10px] t2">Отклонено заявок: ${rejected.length}</span></div><div class="space-y-1 max-h-64 overflow-y-auto">${balances.length ? balances.map(u => `<div class="flex items-center justify-between gap-3 border-b b-ig py-2 text-xs"><span class="min-w-0 truncate"><b class="t1">${u.name}</b> <span class="t2">@${u.username}</span></span><b style="color:${u.balance > 0 ? '#f59e0b' : 'var(--ig-text2)'}">${u.balance.toFixed(2)} AC</b></div>`).join('') : '<div class="text-center py-4 t2">Пользователей нет</div>'}</div></div></div>`;
}

function renderBackupList() {
  const container = byId('admin-backup-list');
  if (!container) return;
  const keys = BACKUPS_META ? Object.keys(BACKUPS_META) : [];
  if (!keys.length) {
    container.innerHTML = '<div class="text-[12px] t2">Бэкапов пока нет.</div>';
    return;
  }
  keys.sort((a,b)=> { const A = BACKUPS_META[a] && BACKUPS_META[a].exportDate ? BACKUPS_META[a].exportDate : ''; const B = BACKUPS_META[b] && BACKUPS_META[b].exportDate ? BACKUPS_META[b].exportDate : ''; return B.localeCompare(A); });
  const rows = keys.map(k => {
    const m = BACKUPS_META[k] || {};
    const when = m.exportDate ? new Date(m.exportDate).toLocaleString() : '—';
    const by = (m.by && users.find(u => u.uid === m.by)) ? users.find(u => u.uid === m.by).username : (m.by || '—');
    const type = m.type || '?';
    return `
<div class="ig-card p-3 rounded-xl flex items-center justify-between gap-2">
<div class="min-w-0">
<div class="font-bold t1 text-xs truncate">${type.toUpperCase()} • ${when}</div>
<div class="text-[11px] t2">by: ${by} • id: ${k}</div>
</div>
<div class="flex gap-2 shrink-0">
<button onclick="recreateAndDownloadBackup('${k}')" class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fa-solid fa-download"></i> Скачать</button>
<button onclick="deleteBackupMeta('${k}')" class="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style="background:rgba(237,73,86,.12);color:#ed4956"><i class="fa-solid fa-trash"></i> Удалить</button>
</div>
</div>`;
  }).join('');
  container.innerHTML = rows;
}

function renderAdminTabContent() {
  const c = byId('admin-tab-content');
  if (!c) return;
  const tab = SYSTEM_CONFIG.adminTab;

  if (tab === 'overview') {
    const shopsCount = users.filter(u => u.shop).length;
    const reportsCount = reports.length || 0;
    const categoriesCount = categories.length || 0;
    const ratesCount = EXCHANGE_RATES ? Object.keys(EXCHANGE_RATES).length : 0;
    const marqueeCount = ((MARQUEE_SETTINGS.text || '').trim() || hasCloudMarqueeSettings) ? 1 : 0;
    const backupCount = BACKUPS_META ? Object.keys(BACKUPS_META).length : 0;
    c.innerHTML = `
<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
<button onclick="goToAdminSection('ads','active')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#f59e0b">${ads.filter(a => a.status === 'ACTIVE').length}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Активных объявл.</div>
</button>
<button onclick="goToAdminSection('shops')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#9333ea">${shopsCount}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Магазинов</div>
</button>
<button onclick="goToAdminSection('users')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#0095f6">${users.length}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Пользователей</div>
</button>
<button onclick="goToAdminSection('archive')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#ed4956">${archivedUsers.length}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">В архиве</div>
</button>
<button onclick="goToAdminSection('shops')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#f97316">${combos.length}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Акций (комбо)</div>
</button>
<button onclick="goToAdminSection('reports')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#ef4444">${reportsCount}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Жалоб</div>
</button>
<button onclick="goToAdminSection('cats')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#7c3aed">${categoriesCount}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Категорий</div>
</button>
<button onclick="goToAdminSection('rates')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#06b6d4">${ratesCount}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Курсов</div>
</button>
<button onclick="goToAdminSection('marquee')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#a78bfa">${marqueeCount}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Бегущая строка</div>
</button>
<button onclick="goToAdminSection('backup')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1">
<div class="text-2xl font-extrabold group-hover:scale-110 transition-transform" style="color:#94a3b8">${backupCount}</div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Бэкап БД</div>
</button>
<button onclick="switchAdminTab('finance')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1" style="border-color:rgba(245,158,11,.45)">
<div class="text-2xl font-extrabold" style="color:#f59e0b"><i class="fa-solid fa-coins"></i></div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Настройки тарифов</div>
</button>
<button onclick="switchAdminTab('payments')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1" style="border-color:rgba(16,185,129,.45)">
<div class="text-2xl font-extrabold" style="color:#10b981"><i class="fa-solid fa-receipt"></i></div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Проверка платежей</div>
</button>
<button onclick="switchAdminTab('tx')" class="ig-card hover:bg-field p-4 rounded-xl transition-all cursor-pointer group active:scale-95 flex flex-col items-center justify-center space-y-1" style="border-color:rgba(16,185,129,.45)">
<div class="text-2xl font-extrabold" style="color:#10b981"><i class="fa-solid fa-receipt"></i></div>
<div class="text-[10px] uppercase font-bold tracking-wide t2">Транзакции</div>
</button>
</div>`;
  } else if (tab === 'shops') { 
    const shopsList = users.filter(u => u.shop); 
    const noShop = users.filter(u => !u.shop); 
    c.innerHTML = `
    <div class="space-y-3">
        <h4 class="font-bold t1 text-xs">Магазины (${shopsList.length})</h4>
        <div class="p-3 rounded-xl border space-y-2 bg-field b-ig">
            <div class="font-bold t1 text-xs flex items-center gap-1.5"><i class="fa-solid fa-store" style="color:#0095f6"></i> Создать магазин для пользователя:</div>
            ${noShop.length ? `<div class="flex gap-2"><select id="admin-new-shop-user" class="ig-input flex-1 px-3 py-2 text-xs">${noShop.map(u => `<option value="${u.uid}">@${u.username} — ${u.kunya || 'без имени'}</option>`).join('')}</select><button onclick="adminCreateShopForUser()" class="ig-btn px-3 py-2 text-xs shrink-0">Создать</button></div>` : '<div class="text-[11px] t2">Все пользователи уже имеют магазины.</div>'}
        </div>
        <div class="space-y-2 max-h-none overflow-y-auto pr-1">
            ${shopsList.length === 0 ? '<div class="text-center py-8 t2">Магазинов пока нет</div>' : shopsList.map(u => { 
                const s = u.shop; 
                const isVer = u.verifiedShop || s.isVerified; 
                const uCombos = combos.filter(x => x.shopUid === u.uid).length; 
                return `
                <div class="ig-card p-3 rounded-xl flex flex-col gap-2.5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-field border b-ig overflow-hidden shrink-0 flex items-center justify-center t2">
                            ${s.logo ? `<img src="${s.logo}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-store"></i>'}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="font-bold t1 text-xs truncate flex items-center gap-1.5 flex-wrap">
                                <span>${s.name}</span>
                                <span class="px-2 py-0.5 rounded-full text-[9px] border" style="${isVer ? 'background:rgba(16,185,129,.15);color:#10b981;border-color:rgba(16,185,129,.4)' : 'background:rgba(245,158,11,.15);color:#f59e0b;border-color:rgba(245,158,11,.4)'}">
                                    ${isVer ? 'Подтвержден' : 'На проверке'}
                                </span>
                                ${uCombos > 0 ? `<span class="px-2 py-0.5 rounded-full text-[9px] border" style="background:rgba(249,115,22,.12);color:#f97316;border-color:rgba(249,115,22,.4)"><i class="fa-solid fa-fire"></i> ${uCombos}</span>` : ''}
                            </div>
                            <div class="text-[10px] t2 truncate">@${u.username} • ${REGION_NAMES[s.region] || s.region} • ${s.whatsapp || '—'}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 pt-2 border-t b-ig justify-end flex-wrap">
                        <button onclick="openCreateShopModal('${u.uid}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(0,149,246,.1);color:#0095f6;border-color:rgba(0,149,246,.3)" title="Редактировать магазин">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="openComboBuilder('${u.uid}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(249,115,22,.1);color:#f97316;border-color:rgba(249,115,22,.3)" title="Акции магазина">
                            <i class="fa-solid fa-fire"></i>
                        </button>
                        <button onclick="adminVerifyShop('${u.uid}', ${!isVer})" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="${isVer ? 'background:rgba(245,158,11,.1);color:#f59e0b;border-color:rgba(245,158,11,.3)' : 'background:rgba(16,185,129,.1);color:#10b981;border-color:rgba(16,185,129,.3)'}" title="${isVer ? 'Отменить верификацию' : 'Верифицировать'}">
                            <i class="fa-solid ${isVer ? 'fa-ban' : 'fa-check'}"></i>
                        </button>
                        <button onclick="deleteShopWithConfirm('${u.uid}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(237,73,86,.1);color:#ed4956;border-color:rgba(237,73,86,.3)" title="Удалить магазин">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>`; 
            }).join('')}
        </div>
    </div>`; 
  } else if (tab === 'users') { 
    c.innerHTML = `
    <div class="space-y-3">
        <h4 class="font-bold t1 text-xs">Пользователи (${users.length})</h4>
        <div class="space-y-2 max-h-none overflow-y-auto pr-1">
            ${users.map(u => {
                const bal = Number(u.avitocashBalance ?? u.avitocash_balance ?? 0);
                return `
                <div class="ig-card p-3 rounded-xl flex flex-col gap-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-9 h-9 rounded-full bg-field border b-ig overflow-hidden shrink-0 flex items-center justify-center t2 text-xs">
                                ${u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-user"></i>'}
                            </div>
                            <div class="min-w-0">
                                <div class="font-bold t1 text-xs truncate flex items-center gap-1.5 flex-wrap">
                                    <span>${u.kunya || u.username}</span> 
                                    <span class="t2 font-normal">(@${u.username})</span> 
                                    ${u.frozen ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-400">❄ ЗАМОРОЖЕН</span>' : ''}
                                </div>
                                <div class="text-[10px] t2 flex items-center gap-2">
                                    <span>Роль: <b style="color:#f59e0b">${u.role}</b></span>
                                    <span>• WA: ${u.whatsapp || '—'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right shrink-0 bg-field px-2.5 py-1 rounded-lg border b-ig">
                            <div class="text-[9px] t2 uppercase">Баланс</div>
                            <div class="text-xs font-extrabold" style="color:#f59e0b">${bal.toFixed(2)} AC</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 pt-2 border-t b-ig justify-end flex-wrap">
                        <button onclick="openCreateAdModalForUser('${u.username}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(16,185,129,.1);color:#10b981;border-color:rgba(16,185,129,.3)" title="Подать объявление от имени пользователя">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                        <button onclick="openEditProfileModal('${u.username}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(0,149,246,.1);color:#0095f6;border-color:rgba(0,149,246,.3)" title="Редактировать анкету">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="toggleFreezeUser('${u.uid}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="${u.frozen ? 'background:rgba(16,185,129,.1);color:#10b981;border-color:rgba(16,185,129,.3)' : 'background:rgba(96,165,250,.1);color:#60a5fa;border-color:rgba(96,165,250,.3)'}" title="${u.frozen ? 'Разморозить' : 'Заморозить'}">
                            <i class="fa-solid ${u.frozen ? 'fa-lock-open' : 'fa-lock'}"></i>
                        </button>
                        <button onclick="seizeFunds('${u.uid}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(245,158,11,.1);color:#f59e0b;border-color:rgba(245,158,11,.3)" title="Взыскать средства в свою пользу">
                            <i class="fa-solid fa-coins"></i>
                        </button>
                        <button onclick="archiveUserWithConfirm('${u.uid}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(147,51,234,.1);color:#a855f7;border-color:rgba(147,51,234,.3)" title="Перенести в архив">
                            <i class="fa-solid fa-box-archive"></i>
                        </button>
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
  } else if (tab === 'ads') { 
    const activeList = ads.filter(a => a.status === 'ACTIVE'); 
    const archivedList = ads.filter(a => a.status !== 'ACTIVE'); 
    const list = adminAdsTab === 'active' ? activeList : archivedList; 
    
    c.innerHTML = `
    <div class="space-y-3">
        <div class="flex gap-2">
            <button onclick="switchAdminAdsSubTab('active')" class="px-3 py-1.5 rounded-lg font-bold text-xs border ${adminAdsTab === 'active' ? 'text-white' : 'b-ig t2'}" style="${adminAdsTab === 'active' ? 'background:#0095f6;border-color:#0095f6' : ''}">
                Активные (${activeList.length})
            </button>
            <button onclick="switchAdminAdsSubTab('archived')" class="px-3 py-1.5 rounded-lg font-bold text-xs border ${adminAdsTab === 'archived' ? 'text-white' : 'b-ig t2'}" style="${adminAdsTab === 'archived' ? 'background:#9333ea;border-color:#9333ea' : ''}">
                Архив / Продано (${archivedList.length})
            </button>
        </div>
        <div class="space-y-2 max-h-none overflow-y-auto pr-1">
            ${list.length === 0 ? '<div class="text-center py-8 t2">Список объявлений пуст</div>' : list.map(a => {
                const img = (a.images && a.images[0]) || a.image || PLACEHOLDER_IMG;
                const priceFormatted = priceBadge(a);
                const statusBadge = a.status !== 'ACTIVE' ? `
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-bold border" style="${a.status === 'SOLD' ? 'background:rgba(16,185,129,.15);color:#10b981;border-color:rgba(16,185,129,.4)' : (a.status === 'WITHDRAWN' ? 'background:var(--ig-field);color:var(--ig-text2);border-color:var(--ig-border)' : 'background:rgba(147,51,234,.15);color:#a855f7;border-color:rgba(147,51,234,.4)')}">
                        ${a.status === 'SOLD' ? 'ПРОДАНО' : (a.status === 'WITHDRAWN' ? 'ПЕРЕДУМАЛ' : 'АРХИВ')}
                    </span>` : '';
                
                const createdAt = a.createdAt || Date.now();
                const daysPassed = Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000));
                const daysLeft = Math.max(0, 30 - daysPassed);
                const isExpired = a.status === 'EXPIRED' || daysPassed >= 30;
                const pubDateStr = new Date(createdAt).toLocaleDateString();

                const expiryBadge = isExpired
                  ? `<span class="px-2 py-0.5 rounded text-[9px] font-bold border shrink-0" style="background:rgba(239,68,68,.15);color:#ef4444;border-color:rgba(239,68,68,.4)"><i class="fa-solid fa-triangle-exclamation"></i> Истек срок (0 дн.)</span>`
                  : `<span class="px-2 py-0.5 rounded text-[9px] font-bold border shrink-0" style="${daysLeft <= 5 ? 'background:rgba(245,158,11,.15);color:#f59e0b;border-color:rgba(245,158,11,.4)' : 'background:rgba(16,185,129,.12);color:#10b981;border-color:rgba(16,185,129,.3)'}"><i class="fa-regular fa-clock"></i> Осталось: ${daysLeft} дн.</span>`;

                return `
                <div class="ig-card p-3 rounded-xl flex flex-col gap-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-10 h-10 rounded-lg overflow-hidden bg-field border b-ig shrink-0">
                                <img src="${img}" class="w-full h-full object-cover">
                            </div>
                            <div class="min-w-0">
                                <div class="font-bold t1 text-xs truncate flex items-center gap-1.5 flex-wrap">
                                    <span class="truncate">${a.title}</span>
                                    ${statusBadge}
                                    ${expiryBadge}
                                </div>
                                <div class="text-[10px] t2 truncate">
                                    ${a.city || 'Сирия'} • @${a.sellerUsername || 'неизвестно'} • Опубликовано: <b>${pubDateStr}</b> • 👁 ${a.views || 0} • ❤ ${(a.likes || []).length}
                                </div>
                            </div>
                        </div>
                        <div class="text-right shrink-0 bg-field px-2.5 py-1 rounded-lg border b-ig">
                            <div class="text-[9px] t2 uppercase">Цена</div>
                            <div class="text-xs font-extrabold" style="color:#f59e0b">${priceFormatted}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 pt-2 border-t b-ig justify-end flex-wrap">
                        ${a.status === 'ACTIVE' ? `
                            <button onclick="renewAdExpiry('${a.id}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(16,185,129,.1);color:#10b981;border-color:rgba(16,185,129,.3)" title="Продлить публикацию еще на 30 дней">
                                <i class="fa-solid fa-arrows-rotate"></i>
                            </button>
                            <button onclick="openAdDetail('${a.id}', false)" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(0,149,246,.1);color:#0095f6;border-color:rgba(0,149,246,.3)" title="Открыть объявление">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button onclick="openEditAdModal('${a.id}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(245,158,11,.1);color:#f59e0b;border-color:rgba(245,158,11,.3)" title="Редактировать">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="markAdSold('${a.id}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(16,185,129,.1);color:#10b981;border-color:rgba(16,185,129,.3)" title="Отметить как продано">
                                <i class="fa-solid fa-check"></i>
                            </button>
                            <button onclick="archiveAdWithConfirm('${a.id}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(147,51,234,.1);color:#a855f7;border-color:rgba(147,51,234,.3)" title="Перенести в архив">
                                <i class="fa-solid fa-box-archive"></i>
                            </button>
                        ` : `
                            <button onclick="restoreAd('${a.id}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(16,185,129,.1);color:#10b981;border-color:rgba(16,185,129,.3)" title="Восстановить в активные">
                                <i class="fa-solid fa-rotate-left"></i>
                            </button>
                        `}
                        <button onclick="deleteAdWithConfirm('${a.id}')" class="w-8 h-8 rounded-lg text-xs font-semibold border flex items-center justify-center transition-colors hover:bg-field" style="background:rgba(237,73,86,.1);color:#ed4956;border-color:rgba(237,73,86,.3)" title="Удалить навсегда">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>`; 
  } else if (tab === 'tx') { 
    const list = collectAllTransactions(); 
    c.innerHTML = `<div class="space-y-3"><h4 class="font-bold t1 text-sm"><i class="fa-solid fa-receipt" style="color:#10b981"></i> Журнал транзакций и чеков (${list.length})</h4><div class="space-y-2 max-h-none overflow-y-auto pr-1">${list.length === 0 ? '<div class="text-center py-8 t2">Транзакций пока нет</div>' : list.map(t => `<div class="ig-card p-3 rounded-xl space-y-1"><div class="flex items-center justify-between gap-2 flex-wrap"><span class="font-bold t1 text-xs">${txTypeLabel(t, null)} • <span style="color:#f59e0b">${Number(t.amount || 0).toFixed(2)} AC</span></span><span class="text-[10px] t2">${new Date(t.timestamp || Date.now()).toLocaleString()}</span></div><div class="text-[11px] t2">@${t.senderUsername || '—'} → @${t.recipientUsername || '—'}</div>${t.adTitle ? `<div class="text-[11px] t1 truncate">Объявление: ${t.adTitle} (${t.adId || ''})</div>` : ''}${t.note ? `<div class="text-[11px] t2 truncate">${t.note}</div>` : ''}<div class="text-[9px] t2 font-mono">Чек ${t.id}</div></div>`).join('')}</div></div>`; 
  } else if (tab === 'reports') { 
    const sortedReports = [...reports].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); 
    c.innerHTML = `
    <div class="space-y-3">
        <h4 class="font-bold t1 text-xs flex items-center gap-1.5"><i class="fa-solid fa-flag text-red-500"></i> Жалобы (${sortedReports.length})</h4>
        <div class="space-y-2 max-h-none overflow-y-auto pr-1">
            ${sortedReports.length === 0 ? '<div class="text-center py-8 t2">Жалоб пока нет</div>' : sortedReports.map(r => { 
                const ad = ads.find(a => a.id === r.adId); 
                const reasonMap = { 'scam': 'Мошенничество', 'fake': 'Фейк', 'prohibited': 'Запрещено', 'spam': 'Спам', 'other': 'Другое' }; 
                return `
                <div class="ig-card p-3 rounded-xl border-l-4 border-red-500 flex flex-col gap-2">
                    <div class="flex justify-between items-start gap-2">
                        <div class="min-w-0">
                            <div class="font-bold t1 text-xs truncate">${reasonMap[r.reason] || r.reason}</div>
                            <div class="text-[10px] t2 truncate">@${r.reporterUsername || 'Аноним'} • ${new Date(r.timestamp).toLocaleDateString()}</div>
                        </div>
                        <button onclick="deleteReport('${r.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 shrink-0" title="Удалить жалобу">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                    <div class="bg-field p-2 rounded-lg border b-ig text-xs space-y-1">
                        <div class="text-[10px] t2 truncate">Объявление: <span class="t1 font-mono">${r.adId}</span> ${ad ? `(${ad.title})` : '(Удалено)'}</div>
                        ${r.comment ? `<div class="t1 italic">"${r.comment}"</div>` : ''}
                    </div>
                    ${ad ? `<button type="button" aria-label="Закрыть" onclick="closeModal('modal-admin-panel'); openAdDetail('${ad.id}')" class="w-full py-1.5 rounded-lg text-xs font-semibold border b-ig t1 hover:bg-field">Открыть объявление</button>` : ''}
                </div>`; 
            }).join('')}
        </div>
    </div>`; 
  } else if (tab === 'archive') { 
    c.innerHTML = `<div class="space-y-3"><h4 class="font-bold t1 text-xs">Архив пользователей (${archivedUsers.length})</h4><div class="space-y-2 max-h-none overflow-y-auto pr-1">${archivedUsers.length === 0 ? '<div class="text-center py-8 t2">Архив пуст</div>' : archivedUsers.map(u => `<div class="ig-card p-3 rounded-xl flex items-center justify-between gap-2"><div class="min-w-0"><div class="font-bold t1 text-xs">${u.kunya || u.username} (@${u.username})</div><div class="text-[10px] t2">${u.role} • ${u.whatsapp || '—'}</div></div><div class="flex gap-1.5 shrink-0"><button onclick="restoreUserFromArchive('${u.uid}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border" style="background:rgba(16,185,129,.12);color:#10b981;border-color:rgba(16,185,129,.4)">Вернуть</button><button onclick="deleteUserPermanently('${u.uid}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style="background:rgba(237,73,86,.12);color:#ed4956">Удалить</button></div></div>`).join('')}</div></div>`; 
  } else if (tab === 'cats') { 
    c.innerHTML = `<div class="space-y-3">
<h4 class="font-bold t1 text-xs">Основные категории ленты (${categories.length})</h4>
<div class="ig-card p-4 rounded-xl space-y-3">
<div class="font-bold text-xs flex items-center gap-1.5" style="color:#f59e0b"><i class="fa-solid ${editingCatId ? 'fa-pen-to-square' : 'fa-plus-circle'}"></i> ${editingCatId ? 'Редактирование категории' : 'Добавить новую категорию'}</div>
<input type="text" id="cat-name-input" value="${catNameDraft}" oninput="catNameDraft=this.value" placeholder="Название категории (напр.: Детские товары)" class="ig-input w-full px-3.5 py-2.5 text-xs">
<div class="text-[10px] t2">Иконка (выберите или система подберет автоматически):</div>
<div class="flex flex-wrap gap-1.5">${CATEGORY_ICON_POOL.map(ic => `<button type="button" onclick="pickCatIcon('${ic}')" class="w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${catIconChoice === ic ? 'text-white scale-110' : 'b-ig t1 hover:bg-field'}" style="${catIconChoice === ic ? 'background:#0095f6;border-color:#0095f6' : ''}"><i class="fa-solid ${ic}"></i></button>`).join('')}</div>
<div class="flex gap-2"><button onclick="saveCategoryForm()" class="flex-1 py-2.5 rounded-lg text-xs font-bold text-white" style="background:#0095f6">${editingCatId ? 'Сохранить изменения' : '+ Добавить категорию'}</button>${editingCatId ? `<button onclick="cancelEditCategory()" class="px-4 py-2.5 rounded-lg ig-btn-outline text-xs">Отмена</button>` : ''}</div>
</div>
<div class="space-y-2 max-h-none overflow-y-auto pr-1">${categories.map(cat => { const cnt = getCategoryAdsCount(cat.id); return `<div class="ig-card p-3 rounded-xl flex items-center justify-between gap-2">
<div class="flex items-center gap-3 min-w-0"><div class="w-10 h-10 rounded-lg bg-field border b-ig flex items-center justify-center shrink-0" style="color:#f59e0b"><i class="fa-solid ${cat.icon || 'fa-tag'}"></i></div>
<div class="min-w-0"><div class="font-bold t1 text-xs truncate">${cat.name}</div><div class="text-[10px] t2">ID: ${cat.id} • Объявлений: ${cnt}</div></div></div>
<div class="flex gap-1.5 shrink-0"><button onclick="startEditCategory('${cat.id}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border" style="background:rgba(245,158,11,.12);color:#f59e0b;border-color:rgba(245,158,11,.4)"><i class="fa-solid fa-pen-to-square"></i></button><button onclick="deleteCategoryWithConfirm('${cat.id}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style="background:rgba(237,73,86,.12);color:#ed4956"><i class="fa-solid fa-trash"></i></button></div></div>`; }).join('')}</div></div>`; 
} else if (tab === 'finance') { 
    if (!_0xSCAdmin()) { c.innerHTML = '<div class="text-center py-10 t2">Раздел доступен только Главному Администратору.</div>'; return; } 
    
    const isFreeActive = typeof isMasterFreeActive === 'function' && isMasterFreeActive();
    const cfg = (typeof MASTER_FREE_CONFIG === 'object' && MASTER_FREE_CONFIG) ? MASTER_FREE_CONFIG : { enabled: false, conditionType: 'always', targetValue: 10 };
    
    let progressInfo = '';
    if (cfg.enabled) {
      if (cfg.conditionType === 'always') {
        progressInfo = 'Режим активен бессрочно (пока включен тумблер)';
      } else if (cfg.conditionType === 'shops_count') {
        const curShops = users.filter(u => u.shop).length;
        const targetShops = Number(cfg.targetValue) || 10;
        progressInfo = `Открыто магазинов: <b>${curShops} / ${targetShops}</b> (Осталось: <b>${Math.max(0, targetShops - curShops)}</b>)`;
      } else if (cfg.conditionType === 'ads_count') {
        const curAds = ads.filter(a => a.status === 'ACTIVE').length;
        const targetAds = Number(cfg.targetValue) || 100;
        progressInfo = `Активных товаров: <b>${curAds} / ${targetAds}</b> (Осталось: <b>${Math.max(0, targetAds - curAds)}</b>)`;
      } else if (cfg.conditionType === 'users_count') {
        const curUsers = users.length;
        const targetUsers = Number(cfg.targetValue) || 100;
        progressInfo = `Пользователей: <b>${curUsers} / ${targetUsers}</b> (Осталось: <b>${Math.max(0, targetUsers - curUsers)}</b>)`;
      } else if (cfg.conditionType === 'days_timer') {
        const start = Number(cfg.startDate) || Date.now();
        const daysTotal = Number(cfg.targetValue) || 30;
        const daysPassed = Math.floor((Date.now() - start) / 86400000);
        const daysLeft = Math.max(0, daysTotal - daysPassed);
        progressInfo = `Прошло дней: <b>${daysPassed} / ${daysTotal}</b> (Осталось: <b>${daysLeft} дн.</b>)`;
      } else if (cfg.conditionType === 'until_date') {
        progressInfo = `Действует до даты: <b>${cfg.targetValue || '—'}</b>`;
      }
    }

    c.innerHTML = `
    <div class="space-y-4">
        <!-- Блок «Умный Промо-режим (Всё бесплатно)» -->
        <div class="p-4 rounded-xl border space-y-3" style="${isFreeActive ? 'border-color:#10b981;background:rgba(16,185,129,.08)' : 'border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.05)'}">
            <div class="flex items-center justify-between gap-2 pb-2 border-b b-ig">
                <div class="flex items-center gap-2.5 min-w-0">
                    <i class="fa-solid fa-gift text-lg shrink-0" style="color:${isFreeActive ? '#10b981' : '#ef4444'}"></i>
                    <div class="min-w-0">
                        <div class="font-bold t1 text-xs truncate">Промо-режим: «Всё бесплатно» 🎁</div>
                        <div class="text-[10px] t2 truncate">${isFreeActive ? '🟢 Активен: тарифы 0 AC, лимиты сняты' : '🔴 Выключен: действуют тарифы AvitoCash'}</div>
                    </div>
                </div>
                <label class="ig-switch shrink-0">
                    <input type="checkbox" id="admin-free-master-toggle" onchange="toggleMasterFreeSwitch(this.checked)" ${cfg.enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>

            ${cfg.enabled ? `
            <div class="space-y-2.5 pt-1">
                <div class="text-[10px] t1 bg-field p-2.5 rounded-lg border b-ig">
                    <i class="fa-solid fa-chart-pie text-emerald-400"></i> ${progressInfo}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label class="text-[10px] t2 block mb-1 font-semibold">Условие действия бесплатного режима:</label>
                        <select id="admin-free-condition-type" onchange="handleFreeConditionChange(this.value)" class="ig-input w-full px-2.5 py-2 text-xs">
                            <option value="always" ${cfg.conditionType === 'always' ? 'selected' : ''}>Бессрочно (пока включен тумблер)</option>
                            <option value="shops_count" ${cfg.conditionType === 'shops_count' ? 'selected' : ''}>Пока не откроют N магазинов</option>
                            <option value="ads_count" ${cfg.conditionType === 'ads_count' ? 'selected' : ''}>Пока не наберётся N объявлений</option>
                            <option value="users_count" ${cfg.conditionType === 'users_count' ? 'selected' : ''}>Пока не наберётся N пользователей</option>
                            <option value="days_timer" ${cfg.conditionType === 'days_timer' ? 'selected' : ''}>В течение N дней (с обратным отсчетом)</option>
                            <option value="until_date" ${cfg.conditionType === 'until_date' ? 'selected' : ''}>До определенной даты</option>
                        </select>
                    </div>

                    <div id="admin-free-target-wrap" class="${cfg.conditionType === 'always' ? 'hidden' : ''}">
                        <label id="admin-free-target-label" class="text-[10px] t2 block mb-1 font-semibold">Значение лимита / Срок:</label>
                        ${cfg.conditionType === 'until_date' 
                          ? `<input id="admin-free-target-val" type="date" value="${cfg.targetValue || ''}" class="ig-input w-full px-2.5 py-2 text-xs">` 
                          : `<input id="admin-free-target-val" type="number" min="1" step="1" value="${cfg.targetValue || 10}" class="ig-input w-full px-2.5 py-2 text-xs">`}
                    </div>
                </div>

                <button onclick="saveMasterFreePromoConfig()" class="w-full py-2 rounded-lg text-white font-bold text-xs shadow-sm transition active:scale-95" style="background:#10b981">
                    <i class="fa-solid fa-floppy-disk"></i> Сохранить условия промо-режима
                </button>
            </div>` : ''}
        </div>

        ${renderFinanceReport()}

        <div class="p-4 rounded-xl border space-y-3 bg-field b-ig">
            <h4 class="font-bold t1 text-xs flex items-center gap-1.5"><i class="fa-solid fa-coins" style="color:#f59e0b"></i> Тарифы AvitoCash</h4>
            <div class="grid grid-cols-2 gap-2">
                <label class="text-[10px] t2">Подача, AC<input id="sc-ad-price" type="number" min="0" step="0.01" value="${AVITOCASH_PRICES.adPrice}" class="ig-input w-full px-2 py-1.5 mt-1 text-xs"></label>
                <label class="text-[10px] t2">Бесплатно шт.<input id="sc-free-ads" type="number" min="0" step="1" value="${AVITOCASH_PRICES.freeAdsCount}" class="ig-input w-full px-2 py-1.5 mt-1 text-xs"></label>
                <label class="text-[10px] t2">Магазин/мес<input id="sc-shop-price" type="number" min="0" step="0.01" value="${AVITOCASH_PRICES.shopSubscription}" class="ig-input w-full px-2 py-1.5 mt-1 text-xs"></label>
                <label class="text-[10px] t2">Редакт., AC<input id="sc-edit-price" type="number" min="0" step="0.01" value="${AVITOCASH_PRICES.editPrice}" class="ig-input w-full px-2 py-1.5 mt-1 text-xs"></label>
            </div>
            <button onclick="saveShamCashSettings()" class="ig-btn w-full py-2 text-xs font-bold">Сохранить тарифы</button>
            <button onclick="openGiftGenerator()" class="w-full py-2.5 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5" style="background:linear-gradient(135deg,#f59e0b,#ef4444)"><i class="fa-solid fa-gift"></i> Создать подарочный код</button>
        </div>
    </div>`; 
  } else if (tab === 'payments') { 
    if (!_0xSCAdmin()) { c.innerHTML = '<div class="text-center py-10 t2">Раздел доступен только Главному Администратору.</div>'; return; }
    const searchVal = paymentSearchQuery || '';
    c.innerHTML = `<div class="space-y-3"><h4 class="font-bold t1 text-sm"><i class="fa-solid fa-receipt" style="color:#10b981"></i> Верификация платежей</h4><input id="payment-search" oninput="paymentSearchQuery=this.value; renderAdminTabContent()" class="ig-input w-full px-3 py-2 text-xs" placeholder="Поиск по коду или пользователю" value="${searchVal}"><div class="space-y-2">${Object.entries(TOPUP_REQUESTS).filter(([id,r]) => {
      const q = searchVal.toLowerCase();
      if (!q) return true;
      return String(r.code).toLowerCase().includes(q) || String(r.username).toLowerCase().includes(q);
    }).map(([id,r]) => `<div class="ig-card p-3 rounded-xl space-y-2"><div class="flex items-center justify-between gap-2 flex-wrap"><span class="font-mono font-bold t1">${r.code}</span><span class="font-bold" style="color:#f59e0b">${Number(r.amount).toFixed(2)} AC</span></div><div class="text-xs t2">@${r.username} • ${new Date(r.timestamp).toLocaleString()}</div><div class="flex gap-2 flex-wrap"><span class="px-2 py-1 rounded-full text-[10px] font-semibold border" style="${r.status === 'pending' ? 'background:rgba(245,158,11,.15);color:#f59e0b;border-color:rgba(245,158,11,.4)' : r.status === 'approved' ? 'background:rgba(16,185,129,.15);color:#10b981;border-color:rgba(16,185,129,.4)' : 'background:rgba(237,73,86,.15);color:#ed4956;border-color:rgba(237,73,86,.4)'}">${r.status}</span>${r.status === 'pending' ? `<button onclick="verifyPayment('${id}', true)" class="ig-btn px-3 py-2 text-xs font-bold">✅ Подтвердить</button><button onclick="verifyPayment('${id}', false)" class="ig-btn-danger px-3 py-2 text-xs font-bold">❌ Отклонить</button>` : ''}</div></div>`).join('') || '<div class="text-center py-8 t2">Заявок не найдено</div>'}</div></div>`; 
  } else if (tab === 'rates') { 
    c.innerHTML = `<div class="space-y-4">
<div class="p-4 rounded-xl border space-y-2" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.06)">
<div class="flex items-center justify-between"><span class="font-bold t1 text-xs flex items-center gap-1.5"><i class="fa-solid fa-tower-broadcast" style="color:#10b981"></i> Живой парсинг курса (sp-proxy)</span><button onclick="fetchLiveExchangeRates(true)" class="ig-btn px-3 py-1.5 text-xs"><i class="fa-solid fa-arrows-rotate"></i> Обновить сейчас</button></div>
<div class="grid grid-cols-2 gap-3 text-center">
<div class="bg-field p-3 rounded-xl border b-ig"><div class="text-[10px] t2">SYP за $1</div><div class="text-lg font-extrabold font-mono" style="color:#f59e0b">${EXCHANGE_RATES.SYP}</div></div>
<div class="bg-field p-3 rounded-xl border b-ig"><div class="text-[10px] t2">TRY за $1 (USD/TRY)</div><div class="text-lg font-extrabold font-mono" style="color:#f59e0b">${EXCHANGE_RATES.TRY}</div></div>
</div>
<div class="text-[10px] t2 font-mono">Источник: sp-proxy.mikevasovsky3.workers.dev • Обновлено: ${lastRatesUpdate ? lastRatesUpdate.toLocaleTimeString() : '—'} • Авто каждые 5 минут</div>
</div>
<div class="p-4 rounded-xl border space-y-3" style="border-color:rgba(147,51,234,.3);background:rgba(147,51,234,.06)">
<div class="font-bold t1 text-xs">Ручная корректировка (админ):</div>
<div class="grid grid-cols-2 gap-3">
<div><label class="block text-[11px] t2 mb-1">SYP за $1</label><input type="number" id="rate-syp-input" value="${EXCHANGE_RATES.SYP}" class="ig-input w-full px-3 py-2 text-xs font-mono font-bold"></div>
<div><label class="block text-[11px] t2 mb-1">TRY за $1</label><input type="number" id="rate-try-input" value="${EXCHANGE_RATES.TRY}" class="ig-input w-full px-3 py-2 text-xs font-mono font-bold"></div>
</div>
<button onclick="applyManualRates()" class="w-full py-2.5 rounded-lg text-white text-xs font-bold" style="background:#9333ea">Сохранить курс вручную</button>
</div></div>`; 
  } else if (tab === 'marquee') {
    const currentText = byId('desktop-marquee-text')?.innerText || '';
    c.innerHTML = `<div class="space-y-4">
<div class="p-4 rounded-xl border space-y-3" style="border-color:rgba(0,149,246,.3);background:rgba(0,149,246,.06)">
<div class="flex items-center gap-2 mb-2"><i class="fa-solid fa-text-width" style="color:#0095f6"></i><h4 class="font-bold t1 text-sm">Управление бегущей строкой</h4></div>
<p class="text-xs t2">Текст отображается в поле поиска на главной странице (Desktop и Mobile).</p>
<div class="flex items-center justify-between text-[10px] t2"><span>Редактор текста</span><span id="admin-marquee-counter">0 символов</span></div>
<textarea id="admin-marquee-input" rows="4" oninput="handleMarqueeInput(this)" class="ig-input w-full px-3.5 py-2.5 text-sm" placeholder="Введите текст бегущей строки..."></textarea>
<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
<label class="text-[10px] t2">Цвет<input id="admin-marquee-color" type="color" value="#a8a8a8" onchange="handleMarqueeSettingsInput()" class="w-full h-9 mt-1 rounded-lg cursor-pointer bg-field"></label>
<label class="text-[10px] t2">Размер<input id="admin-marquee-size" type="number" min="10" max="32" value="13" oninput="handleMarqueeSettingsInput()" class="ig-input w-full px-2 py-2 mt-1 text-xs"></label>
<label class="text-[10px] t2">Скорость, сек<input id="admin-marquee-speed" type="number" min="5" max="120" value="20" oninput="handleMarqueeSettingsInput()" class="ig-input w-full px-2 py-2 mt-1 text-xs"></label>
<label class="text-[10px] t2">Направление<select id="admin-marquee-direction" onchange="handleMarqueeSettingsInput()" class="ig-input w-full px-2 py-2 mt-1 text-xs"><option value="left">Справа налево</option><option value="right">Слева направо</option></select></label>
</div>
<label class="flex items-center gap-2 text-xs t2 cursor-pointer"><input id="admin-marquee-pause" type="checkbox" onchange="handleMarqueeSettingsInput()" class="accent-[#0095f6]"><span>Останавливать при наведении</span></label>
<div class="p-3 rounded-lg bg-field border b-ig overflow-hidden">
<div class="text-[10px] t2 mb-1">Предпросмотр</div>
<div id="admin-marquee-preview" class="marquee-content text-xs">Предпросмотр появится здесь</div>
</div>
<div class="grid grid-cols-2 gap-2 pt-2">
<button onclick="saveMarqueeSettings()" class="ig-btn px-3 py-2.5 text-xs"><i class="fa-solid fa-floppy-disk"></i> Сохранить настройки</button>
<button onclick="loadMarqueeText()" class="ig-btn-outline px-3 py-2.5 text-xs"><i class="fa-solid fa-rotate"></i> Восстановить</button>
</div>
</div>
<div class="p-3 rounded-xl bg-field border b-ig text-xs t2">
<i class="fa-solid fa-circle-info"></i> Совет: Используйте разделители (например, •) для разделения новостей.
</div>
</div>`;
const editor = byId('admin-marquee-input');
    if (editor) editor.value = MARQUEE_SETTINGS.text || currentText;
    updateMarqueeControls();
    updateMarqueePreview(MARQUEE_SETTINGS.text || currentText);
	} else if (tab === 'backup') { 
    c.innerHTML = `
<div class="p-4 rounded-xl border space-y-3" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.06)">
  <div class="flex items-center justify-between">
    <h4 class="font-extrabold t1 text-xs flex items-center gap-2"><i class="fa-brands fa-google text-emerald-500"></i> ${t('Авто-бэкап в Google Диск')}</h4>
    <label class="ig-switch shrink-0"><input type="checkbox" id="cfg-drive-enable" onchange="toggleDriveBackup()" ${DRIVE_BACKUP_CONFIG.enabled ? 'checked' : ''}><span class="slider"></span></label>
  </div>
  <div class="space-y-2 pt-1 ${DRIVE_BACKUP_CONFIG.enabled ? '' : 'opacity-50 pointer-events-none'}" id="drive-cfg-block">
    <label class="block text-[10px] t2">URL Google Apps Script (Web App)<input type="text" id="cfg-drive-url" value="${DRIVE_BACKUP_CONFIG.gasUrl}" class="ig-input w-full px-3 py-2 text-xs mt-1 font-mono" placeholder="https://script.google.com/..."></label>
    <label class="block text-[10px] t2">${t('Интервал (в часах)')}<input type="number" min="1" max="168" id="cfg-drive-interval" value="${DRIVE_BACKUP_CONFIG.intervalHours}" class="ig-input w-full px-3 py-2 text-xs mt-1"></label>
    <div class="flex gap-2 pt-2">
      <button onclick="saveDriveConfig()" class="flex-1 py-2.5 rounded-lg text-white font-bold text-xs shadow-sm bg-emerald-500 active:scale-95 transition">${t('Сохранить')}</button>
      <button onclick="executeSilentDriveBackup(true)" class="px-4 py-2.5 rounded-lg text-emerald-500 font-bold text-xs border border-emerald-500/30 bg-emerald-500/10 active:scale-95 transition">Тест</button>
    </div>
    <div class="text-[10px] t2 pt-1">Последний запуск: <span id="admin-backup-last-run" class="t1 font-bold">${DRIVE_BACKUP_CONFIG.lastRun ? new Date(DRIVE_BACKUP_CONFIG.lastRun).toLocaleString() : 'Никогда'}</span></div>
  </div>
</div>

<div class="p-4 rounded-xl border space-y-3" style="border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.06)">
<h4 class="font-extrabold t1 text-xs flex items-center gap-2"><i class="fa-solid fa-database" style="color:#f59e0b"></i> ${t('Полный резервный бэкап платформы (JSON)')}</h4>
<p class="text-xs t2 leading-relaxed">Выгрузка и восстановление всей базы данных платформы (объявления, пользователи, магазины, категории, акции, курсы, жалобы) в один клик.</p>
<div class="grid grid-cols-2 gap-3 pt-2">
<button onclick="exportFullDatabaseJSON()" class="py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 active:scale-95" style="background:#f59e0b;color:#000"><i class="fa-solid fa-download"></i> ${t('Экспорт БД')}</button>
<label class="py-3 px-4 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-2 cursor-pointer active:scale-95" style="background:#4f46e5"><i class="fa-solid fa-upload"></i> ${t('Импорт БД')}<input type="file" accept=".json" onchange="importFullDatabaseJSON(event)" class="hidden"></label>
</div>
</div>

<div class="p-4 rounded-xl border space-y-3" style="border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.06)">
<h4 class="font-extrabold t1 text-xs flex items-center gap-2"><i class="fa-solid fa-broom" style="color:#ef4444"></i> ${t('Очистка неиспользуемых изображений')}</h4>
<p class="text-xs t2 leading-relaxed">Сканирует бакет listings в Supabase Storage и навсегда удаляет файлы, которые не привязаны ни к одному объявлению или профилю.</p>
<button onclick="cleanUnusedStorageImagesAdmin()" class="py-2.5 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm transition active:scale-95" style="background:#ef4444">
  <i class="fa-solid fa-trash-can"></i> Найти и удалить неиспользуемые фото
</button>
</div>

<div class="p-4 rounded-xl border space-y-3">
<h4 class="font-extrabold t1 text-xs flex items-center gap-2"><i class="fa-solid fa-list" style="color:#6b7280"></i> ${t('Журнал бэкапов')}</h4>
<p class="text-xs t2">Список метаданных бэкапов, созданных администраторами. Можно воссоздать и скачать снимок или удалить запись из журнала.</p>
<div id="admin-backup-list" class="space-y-2 pt-2">
<div class="text-[12px] t2">Загрузка списка...</div>
</div>
</div>
`;
    renderBackupList(); 
  }
  }/* ================= AD DETAIL & MODALS ================= */

function buildWhatsAppMessage(ad, inQ, rank) {
  const isAr = currentLang === 'ar';
  const kunya = currentUser ? (currentUser.kunya || currentUser.username) : (isAr ? 'زائر' : 'Гость');
  const base = (location.origin && location.origin !== 'null') ? location.origin + location.pathname : location.href.split('#')[0];
  const url = base + '#ad-' + ad.id;
  const priceStr = ad.isNegotiable ? (isAr ? 'قابل للتفاوض' : 'Договорная') : (ad.isFree ? (isAr ? 'مجاناً' : 'Бесплатно') : '$' + adToUSD(ad).toFixed(2));

  if (isAr) {
    let msg = `السلام عليكم ورحمة الله!\n`;
    msg += `أنا مهتم بإعلانك على منصة *أفيتو الشام*:\n`;
    msg += `📦 *${ad.title}* (كود: ${ad.id})\n`;
    msg += `💰 *السعر:* ${priceStr}\n`;
    if (inQ && rank > 0) msg += `👥 *دوري في قائمة الانتظار:* رقم ${rank}\n`;
    msg += `🔗 *رابط الإعلان:* ${url}\n`;
    msg += `👤 *المشتري:* ${kunya}`;
    return encodeURIComponent(msg);
  } else {
    let msg = `Здравствуйте!\n`;
    msg += `Меня заинтересовало ваше объявление на *Avito Sham*:\n`;
    msg += `📦 *${ad.title}* (ID: ${ad.id})\n`;
    msg += `💰 *Цена:* ${priceStr}\n`;
    if (inQ && rank > 0) msg += `👥 *Мой номер в очереди:* №${rank}\n`;
    msg += `🔗 *Ссылка:* ${url}\n`;
    msg += `👤 *Покупатель:* ${kunya}`;
    return encodeURIComponent(msg);
  }
}

async function openAdDetail(adId, countView = true) {
  if (typeof adId === 'string' && adId.indexOf('COMBO-') === 0) { openComboDetail(adId); return; }
  const ad = ads.find(a => a.id === adId);
  if (!ad) return;
  if (countView) {
    let viewedSession = [];
    try {
      viewedSession = JSON.parse(sessionStorage.getItem('bs_viewed_session_ads') || '[]');
    } catch(e) {}

    if (!viewedSession.includes(adId)) {
      ad.views = (ad.views || 0) + 1;
      viewedSession.push(adId);
      try {
        sessionStorage.setItem('bs_viewed_session_ads', JSON.stringify(viewedSession));
      } catch(e) {}
      saveCachedAds();
      if (supabaseClient) {
        supabaseClient.from('ads').update({ views: ad.views }).eq('id', adId).then().catch(() => {});
      }
    }
  }
  const content = byId('detail-content');
  if (!content) return;

  const imgs = (ad.images && ad.images.length) ? ad.images : [ad.image || PLACEHOLDER_IMG];
  currentDetailPhotoIndex = 0;
  const wa = getSellerWhatsapp(ad);
  const rawKunya = getSellerKunya(ad);
  const avatar = getSellerAvatar(ad);
  const verified = getSellerVerified(ad);
  const rawRegion = REGION_NAMES[ad.region] || ad.region || 'Сирия';
  const converted = convertPriceAll(ad.price, ad.currency, ad.isFree, ad.isNegotiable);
  const queueList = ad.queue || [];
  const inQ = currentUser && queueList.some(q => q.username === currentUser.username);
  const rank = inQ ? queueList.findIndex(q => q.username === currentUser.username) + 1 : 0;
  const isRealOwner = !!(currentUser && ((currentUser.uid && ad.sellerUid && String(currentUser.uid) === String(ad.sellerUid)) || (currentUser.username && ad.sellerUsername && currentUser.username.toLowerCase() === ad.sellerUsername.toLowerCase())));
  const isOwner = !!(currentUser && (isRealOwner || currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN'));
  const likesCount = (ad.likes || []).length;
  const userLiked = currentUser && (ad.likes || []).includes(currentUser.username);
  const viewsCount = ad.views || 0;
  const rating = likesCount * 10 + viewsCount;
  const priceUsd = adToUSD(ad);
  const canBuyWithBalance = currentUser && !isRealOwner && !ad.isFree && !ad.isNegotiable && priceUsd > 0 && (currentUser.avitocashBalance || 0) >= priceUsd;

  let displayTitle = ad.title;
  let displayDesc = ad.desc || '';
  let displayCity = ad.city || '';
  let displayKunya = rawKunya;
  let displayRegion = t(rawRegion);

  content.innerHTML = `
  <div class="flex flex-col md:flex-row flex-1 min-h-0 w-full h-full overflow-hidden items-stretch">
<!-- Левая колонка: Фото / Слайдер -->
    <div class="relative bg-black flex items-center justify-center overflow-hidden w-full md:w-1/2 h-[320px] md:h-auto min-h-[300px] shrink-0 select-none" ontouchstart="handleTouchSwipeStart(event)" ontouchend="handleTouchSwipeEnd(event, (dir) => changeDetailPhoto('${ad.id}', dir))">
      <div id="detail-bg-blur" class="absolute inset-0 bg-cover bg-center blur-lg opacity-30 scale-110" style="background-image:url('${imgs[0]}')"></div>
      <img id="detail-main-img" src="${imgs[0]}" class="relative w-full h-full object-contain z-[1] cursor-pointer" onclick="openFullscreenViewer(this.src, '${ad.id}')">
      <span class="absolute top-3 right-3 z-10 bg-black/70 text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-white/10">${ad.id}</span>
      ${imgs.length > 1 ? `
        <button onclick="changeDetailPhoto('${ad.id}',-1)" class="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow">${IGSVG.chevL()}</button>
        <button onclick="changeDetailPhoto('${ad.id}',1)" class="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow">${IGSVG.chevR()}</button>
        <div id="detail-photo-counter" class="absolute bottom-3 right-3 z-10 bg-black/70 text-white px-2.5 py-1 rounded-lg text-[11px] font-mono">1 / ${imgs.length}</div>
      ` : ''}
    </div>
	
    <!-- Правая колонка: Детали, Описание, Кнопки -->
    <div class="flex flex-col p-4 space-y-3 text-sm overflow-y-auto max-h-[88vh] modal-scroll-body bg-card w-full md:w-1/2 flex-1 min-w-0">
<div class="flex items-center gap-3 pb-3 border-b b-ig shrink-0">
        <div class="relative w-9 h-9 rounded-full p-[2px] ${verified ? 'story-ring' : 'bg-field'}">
          <div class="w-full h-full rounded-full bg-card p-[1.5px]">
<div class="w-full h-full rounded-full overflow-hidden bg-field flex items-center justify-center t2 text-xs font-bold">
    ${avatar ? `<img src="${avatar}" alt="Аватар" class="w-full h-full object-cover">` : (ad.sellerUsername || '?').charAt(0).toUpperCase()}
</div>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold t1 flex items-center gap-1.5 truncate">
            <span class="truncate">${displayKunya}</span>
            ${verified ? IGSVG.verified() : ''}
          </div>
          <div class="text-xs t2 truncate">${displayRegion} • ${displayCity}</div>
        </div>
      </div>
      ${imgs.length > 1 ? `
        <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
          ${imgs.map((img, idx) => `<button onclick="setDetailPhoto('${ad.id}',${idx})" id="detail-thumb-${idx}" class="w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 ${idx === 0 ? '' : 'opacity-60'}" style="border-color:${idx === 0 ? '#0095f6' : 'var(--ig-border)'}"><img src="${img}" class="w-full h-full object-cover"></button>`).join('')}
        </div>
      ` : ''}

      ${(() => {
        const isExpired = ad.status === 'EXPIRED' || (Date.now() - (ad.createdAt || 0) > 30 * 24 * 60 * 60 * 1000);
        const pubDate = new Date(ad.createdAt || Date.now()).toLocaleDateString();
        const expDate = new Date((ad.createdAt || Date.now()) + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
        return `
        ${isExpired ? `
        <div class="p-3 rounded-xl border flex items-start gap-2.5" style="border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#f87171">
          <i class="fa-solid fa-triangle-exclamation text-base shrink-0 mt-0.5"></i>
          <div class="min-w-0">
            <div class="font-bold text-xs">${t('Неактуально • Возможно, продано')}</div>
            <div class="text-[10px] opacity-90 mt-0.5">${t('Объявление не обновлялось более 30 дней. Товар может быть уже продан.')}</div>
          </div>
        </div>` : ''}
        <div class="flex items-center justify-between text-[10px] t2 bg-field px-3 py-1.5 rounded-lg border b-ig">
          <span><i class="fa-regular fa-calendar"></i> ${t('Дата публикации:')} <b class="t1">${pubDate}</b></span>
          <span><i class="fa-regular fa-clock"></i> ${t('Действует до:')} <b class="t1">${expDate}</b></span>
        </div>
        `;
      })()}

      <div class="flex items-start justify-between gap-2 shrink-0">
        <h2 id="detail-ad-title" class="text-base font-bold t1 leading-snug">${displayTitle}</h2>
        <div class="text-right shrink-0">
        ${(ad.oldPrice && ad.oldPrice > ad.price) ? `
            <div class="text-xs t2 line-through font-semibold">$${Number(ad.oldPrice).toFixed(2)}</div>
            <div class="text-lg font-black" style="color:#ef4444">${converted}</div>
          ` : `<div class="text-base font-extrabold t1">${converted}</div>`}
        </div>
      </div>

      ${(ad.oldPrice && ad.oldPrice > ad.price) ? `
      <div class="p-3 rounded-2xl border flex items-center justify-between shadow-inner shrink-0" style="border-color:rgba(239,68,68,.5);background:linear-gradient(135deg,rgba(239,68,68,.15),rgba(239,68,68,.05))">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-black text-sm shadow-md">
            -${Math.round((1 - ad.price / ad.oldPrice) * 100)}%
          </div>
          <div>
            <div class="font-black text-xs" style="color:#ef4444">🔥 ${currentLang === 'ar' ? 'عرض خاص ومميز!' : 'ГОРЯЧЕЕ ПРЕДЛОЖЕНИЕ!'}</div>
            <div class="text-[10px] t2">${currentLang === 'ar' ? 'سعر خاص ومخفض لفترة محدودة' : 'Специальная цена со скидкой'}</div>
          </div>
        </div>
        <div class="text-right bg-field px-3 py-1.5 rounded-xl border b-ig">
          <div class="text-[9px] t2 uppercase font-bold">${currentLang === 'ar' ? 'التوفير:' : 'Экономия:'}</div>
          <div class="text-xs font-black" style="color:#10b981">$${(ad.oldPrice - ad.price).toFixed(2)}</div>
        </div>
      </div>` : ''}
      
      <div class="flex items-center gap-3 text-[11px] t2 flex-wrap bg-field p-2.5 rounded-xl border b-ig shrink-0">
        <span><i class="fa-solid fa-eye"></i> ${viewsCount}</span>
        <span class="${userLiked ? 'font-bold' : ''}" style="${userLiked ? 'color:#ed4956' : ''}"><i class="fa-solid fa-heart"></i> ${likesCount}</span>
        <span class="font-bold" style="color:#f59e0b"><i class="fa-solid fa-fire"></i> ${t('Рейтинг:')} ${rating}</span>
        <button onclick="toggleLikeDetail('${ad.id}')" class="ml-auto px-3 py-1.5 rounded-lg font-bold text-[11px] border ${userLiked ? '' : 'b-ig'}" style="${userLiked ? 'background:rgba(237,73,86,.15);color:#ed4956;border-color:rgba(237,73,86,.4)' : ''}">
          <i class="fa-solid fa-heart"></i> ${userLiked ? t('Лайк поставлен') : t('Лайк')}
        </button>
      </div>

      <div id="detail-map" class="h-32 rounded-xl border b-ig overflow-hidden relative z-0 bg-field shrink-0"></div>

      <div class="p-3 rounded-xl border b-ig bg-field space-y-2 shrink-0">
        <div class="flex items-center justify-between text-xs font-bold" style="color:#f59e0b">
          <span><i class="fa-solid fa-users"></i> ${t('В очереди:')} ${queueList.length} ${t('чел.')}</span>
          ${inQ ? `<span class="px-2.5 py-0.5 rounded-full border text-[10px]" style="background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.4)">${t('Вы №')}${rank} ${t('в очереди')}</span>` : ''}
        </div>
        ${currentUser ? `
          <button onclick="${inQ ? `leaveQueue('${ad.id}')` : `joinQueue('${ad.id}')`}" class="w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 ${inQ ? 'ig-btn-outline' : 'ig-btn'}">
            <i class="fa-solid ${inQ ? 'fa-user-minus' : 'fa-hand'}"></i> ${inQ ? t('Выйти из очереди') : t('Занять очередь')}
          </button>
        ` : ''}
      </div>

<div class="shrink-0">
        <div class="text-xs font-bold t2 uppercase tracking-wide mb-1">${t('Описание и изъяны')}</div>
        <p id="detail-ad-desc" class="text-xs t1 leading-relaxed bg-field p-3 rounded-xl border b-ig whitespace-pre-line">${displayDesc}</p>
      </div>

      ${ad.link ? `
      <div class="shrink-0">
        <a href="${ad.link}" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 px-3 rounded-xl border b-ig bg-field hover:bg-ig flex items-center justify-between text-xs font-bold t1 transition group">
          <span class="flex items-center gap-2 truncate">
            <i class="${ad.link.includes('t.me') ? 'fa-brands fa-telegram text-[#229ED9]' : (ad.link.includes('wa.me') || ad.link.includes('whatsapp') ? 'fa-brands fa-whatsapp text-[#25D366]' : 'fa-solid fa-globe text-blue-500')} text-sm"></i>
            <span class="truncate">${ad.link.includes('t.me') ? 'Telegram-канал / чат' : (ad.link.includes('wa.me') || ad.link.includes('whatsapp') ? 'WhatsApp ссылка' : 'Перейти на сайт')}</span>
          </span>
          <i class="fa-solid fa-arrow-up-right-from-square text-xs t2 group-hover:text-blue-500 transition-colors"></i>
        </a>
      </div>` : ''}

${!isRealOwner && !ad.isFree ? `
      <div class="p-2.5 rounded-xl bg-field border b-ig flex items-center gap-2 shrink-0">
        <input type="number" id="offer-price-input" placeholder="${t('Предложить цену ($)')}" class="ig-input flex-1 px-3 py-2 text-xs font-bold">
        <button onclick="sendPriceOffer('${ad.id}')" class="px-3 py-2 rounded-lg text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition active:scale-95" style="background:linear-gradient(45deg,#3b82f6,#2563eb)">
          <i class="fa-solid fa-handshake"></i> ${t('Торг')}
        </button>
      </div>` : ''}
	  
      <div class="flex items-center gap-2 pt-2 shrink-0">
        ${!isRealOwner ? `<a href="https://wa.me/${(wa || '').replace(/[^0-9]/g, '')}?text=${buildWhatsAppMessage(ad, inQ, rank)}" target="_blank" class="flex-1 min-w-0 h-11 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-95 shadow-md" style="background:#25D366"><i class="fa-brands fa-whatsapp text-lg shrink-0"></i><span class="truncate">${t('Связаться через WhatsApp')}</span></a>` : ''}
        ${canBuyWithBalance ? `<button onclick="purchaseAd('${ad.id}')" class="flex-1 min-w-0 h-11 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-95 shadow-md" style="background:#f59e0b"><i class="fa-solid fa-coins shrink-0"></i><span class="truncate">${t('Оплатить из баланса')}</span></button>` : ''}
        <button onclick="shareAd('${ad.id}')" class="h-11 w-11 rounded-xl border b-ig bg-field hover:bg-ig flex items-center justify-center text-blue-500 shrink-0 transition active:scale-95 shadow-sm" title="${t('Поделиться')}"><i class="fa-solid fa-paper-plane text-base"></i></button>
      </div>
	  
      <div class="pt-2 border-t b-ig shrink-0">
        ${!isOwner ? `<button onclick="openReportModal('${ad.id}')" class="w-full py-2.5 rounded-xl text-xs font-semibold border b-ig t2 flex items-center justify-center gap-1.5 hover:bg-field transition"><i class="fa-solid fa-flag text-red-500"></i> ${t('Пожаловаться')}</button>` : ''}
        ${isOwner ? `
          <div class="flex items-center gap-1 w-full overflow-x-auto no-scrollbar py-0.5">
            <button onclick="markAdSold('${ad.id}')" class="flex-1 min-w-0 py-2.5 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition shrink-0" style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.4)" title="${t('Продано')}">
              <i class="fa-solid fa-circle-check text-xs"></i>
              <span class="truncate w-full text-center">${t('Продано')}</span>
            </button>
            <button onclick="markAdWithdrawn('${ad.id}')" class="flex-1 min-w-0 py-2.5 px-1 rounded-xl text-[10px] font-semibold border b-ig t2 flex flex-col items-center justify-center gap-0.5 hover:bg-field transition shrink-0" title="${t('Передумал')}">
              <i class="fa-solid fa-ban text-xs"></i>
              <span class="truncate w-full text-center">${t('Передумал')}</span>
            </button>
${(ad.status === 'EXPIRED' || (Date.now() - (ad.createdAt || 0) > 30 * 24 * 60 * 60 * 1000)) ? `
              <button onclick="renewAdExpiry('${ad.id}')" class="flex-1 min-w-0 py-2.5 px-1 rounded-xl text-[10px] font-bold text-white flex flex-col items-center justify-center gap-0.5 shadow-sm transition shrink-0" style="background:#10b981" title="${t('Продлить бесплатно')}">
                <i class="fa-solid fa-arrows-rotate text-xs"></i>
                <span class="truncate w-full text-center">${t('Продлить')}</span>
              </button>` : ''}
            <button onclick="openEditAdModal('${ad.id}')" class="flex-1 min-w-0 py-2.5 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition shrink-0" style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.4)" title="${t('Редактировать')}">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
              <span class="truncate w-full text-center">${t('Редакт.')}</span>
            </button>
            <button onclick="archiveAdWithConfirm('${ad.id}')" class="flex-1 min-w-0 py-2.5 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition shrink-0" style="background:rgba(147,51,234,.15);color:#a855f7;border:1px solid rgba(147,51,234,.4)" title="${t('В архив')}">
              <i class="fa-solid fa-box-archive text-xs"></i>
              <span class="truncate w-full text-center">${t('В архив')}</span>
            </button>
            <button onclick="deleteAdWithConfirm('${ad.id}')" class="h-10 px-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center shadow-sm transition shrink-0" style="background:#ed4956" title="${t('Удалить навсегда')}">
              <i class="fa-solid fa-trash"></i>
            </button>
			</div>` : ''}
      </div>
    </div>
  </div>`;

  openModal('modal-ad-detail');
  
setTimeout(async () => {
    initDetailMap(ad.lat || 33.5138, ad.lng || 36.2765);
    const titleEl = byId('detail-ad-title');
    const descEl = byId('detail-ad-desc');
    const targetLanguage = currentLang;

    if (titleEl && ad.title) {
      translateDynamic(ad.title, targetLanguage).then(transTitle => {
        if (titleEl) titleEl.innerText = transTitle;
      });
    }
    if (descEl && ad.desc) {
      translateDynamic(ad.desc, targetLanguage).then(transDesc => {
        if (descEl) descEl.innerText = transDesc;
      });
    }
  }, 0);
  }

let currentFullscreenAdId = null;

function openFullscreenViewer(src, adId = null) { 
  const v = byId('modal-image-viewer'), img = byId('fullscreen-viewer-img'); 
  if (v && img) { 
    currentFullscreenAdId = adId;
    img.src = src; 
    openModal('modal-image-viewer'); 
  } 
}

function handleFullscreenNav(dir) {
  if (!currentFullscreenAdId) return;
  changeDetailPhoto(currentFullscreenAdId, dir);
  const ad = getListingById(currentFullscreenAdId);
  if (ad) {
    const imgs = (ad.images && ad.images.length) ? ad.images : [ad.image || PLACEHOLDER_IMG];
    const img = byId('fullscreen-viewer-img');
    if (img && imgs[currentDetailPhotoIndex]) {
      img.src = imgs[currentDetailPhotoIndex];
    }
  }
}

function handleFullscreenSwipe(dir) {
  handleFullscreenNav(dir);
}

// Управление стрелками клавиатуры влево/вправо на компьютере
window.addEventListener('keydown', (e) => {
  const viewer = byId('modal-image-viewer');
  if (viewer && !viewer.classList.contains('hidden')) {
    if (e.key === 'ArrowRight') handleFullscreenNav(1);
    else if (e.key === 'ArrowLeft') handleFullscreenNav(-1);
    else if (e.key === 'Escape') closeModal('modal-image-viewer');
  }
});
function initDetailMap(lat, lng) { const el = byId('detail-map'); if (!el || typeof L === 'undefined') return; if (detailMap) { detailMap.remove(); detailMap = null; } detailMap = L.map('detail-map', { dragging: false, zoomControl: false }).setView([lat, lng], 13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(detailMap); L.marker([lat, lng]).addTo(detailMap); }
function changeDetailPhoto(adId, dir, event) { if (event && event.stopPropagation) event.stopPropagation(); const ad = (typeof getListingById === 'function') ? getListingById(adId) : (ads.find(a => a.id === adId) || combos.find(x => x.id === adId)); if (!ad) return; const imgs = (ad.images && ad.images.length) ? ad.images : [ad.image || PLACEHOLDER_IMG]; if (imgs.length <= 1) return; currentDetailPhotoIndex = (currentDetailPhotoIndex + dir + imgs.length) % imgs.length; setDetailPhoto(adId, currentDetailPhotoIndex); }
function setDetailPhoto(adId, idx) { const ad = (typeof getListingById === 'function') ? getListingById(adId) : (ads.find(a => a.id === adId) || combos.find(x => x.id === adId)); if (!ad) return; const imgs = (ad.images && ad.images.length) ? ad.images : [ad.image || PLACEHOLDER_IMG]; currentDetailPhotoIndex = idx; const m = byId('detail-main-img'), b = byId('detail-bg-blur'), c = byId('detail-photo-counter'); if (m) m.src = imgs[idx]; if (b) b.style.backgroundImage = `url('${imgs[idx]}')`; if (c) c.innerText = `${idx + 1} / ${imgs.length}`; imgs.forEach((_, i) => { const t = byId(`detail-thumb-${i}`); if (t) { t.style.borderColor = i === idx ? '#0095f6' : 'var(--ig-border)'; t.style.opacity = i === idx ? '1' : '.6'; } }); }

async function purchaseAd(adId) {
  if (!currentUser) { openAuthModal(); return; }
  if (currentUser.frozen) { showToast('Аккаунт заморожен администратором — покупка недоступна', 'error'); return; }
  const ad = ads.find(a => a.id === adId);
  if (!ad) { showToast('Объявление не найдено', 'error'); return; }
  if (ad.sellerUsername && ad.sellerUsername.toLowerCase() === currentUser.username.toLowerCase()) {
    showToast('Вы не можете купить собственное объявление', 'warning');
    return;
  }
  if (ad.isFree || ad.isNegotiable || ad.price <= 0) {
    showToast('Это объявление нельзя оплатить через баланс', 'warning');
    return;
  }

  const priceUsd = adToUSD(ad);
  if (priceUsd <= 0) { showToast('Цена должна быть больше нуля', 'warning'); return; }

  const seller = users.find(u => (u.uid && u.uid === ad.sellerUid) || (u.username && ad.sellerUsername && u.username.toLowerCase() === ad.sellerUsername.toLowerCase()));
  if (!seller) {
    showToast('Продавец не найден в системе, оплата невозможна', 'error');
    return;
  }
  if (!supabaseClient) {
    showToast('Нет соединения с базой данных', 'error');
    return;
  }

  showToast('Обработка покупки...', 'info');
  try {
    const senderId = currentUser.uid || currentUser.username;
    const recipId = seller.uid || seller.username;

    const { data: res, error } = await supabaseClient.rpc('purchase_ad_item', {
      p_ad_id: ad.id,
      p_buyer_identifier: senderId
    });

    if (error) throw error;
    if (!res || !res.success) throw new Error(res?.error || 'Ошибка проведения покупки');

    currentUser.avitocashBalance = res.new_buyer_balance;
    currentUser.avitocash_balance = res.new_buyer_balance;
    seller.avitocashBalance = res.new_seller_balance;
    seller.avitocash_balance = res.new_seller_balance;

    saveUserSession(currentUser, true);

    ad.status = 'SOLD';
    saveCachedAds();
	
    closeModal('modal-ad-detail');
    renderAds();
    renderCategoryPills();
    showToast(`Покупка успешна! Списано ${priceUsd.toFixed(2)} AC`, 'success');

    const sellerWa = seller.whatsapp ? String(seller.whatsapp).replace(/[^0-9]/g, '') : '';
    if (sellerWa) {
      const msg = `Здравствуйте! Ваше объявление "${ad.title}" (${ad.id}) было оплачено через AvitoCash покупателем ${currentUser.kunya || currentUser.username}. Сумма ${priceUsd.toFixed(2)} AC зачислена на ваш баланс.`;
      window.open(`https://wa.me/${sellerWa}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  } catch (err) {
    console.error('Purchase error:', err);
    showToast('Ошибка при оплате: ' + (err.message || 'Сбой транзакции'), 'error');
  }
}/* ================= PROFILE & ADMIN FUNCTIONS ================= */


function openProfileModal() {  
    if (!currentUser) return;  
    const freshMe = users.find(u => (u.uid && u.uid === currentUser.uid) || (u.username && u.username.toLowerCase() === currentUser.username.toLowerCase()));
    if (freshMe) {
        currentUser.avitocashBalance = freshMe.avitocashBalance;
        currentUser.trialBalance = freshMe.trialBalance;
        currentUser.showWomenAds = freshMe.showWomenAds;
        currentUser.isDnd = freshMe.isDnd;
    }
    const c = byId('profile-content');  
    if (!c) return; 
    
    const isAdmin = currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN'; 
    const isLight = document.body.classList.contains('light-mode'); 
    const myAds = ads.filter(a => a.sellerUsername && a.sellerUsername.toLowerCase() === (currentUser.username || '').toLowerCase()); 
    const totalLikes = myAds.reduce((s, a) => s + ((a.likes || []).length), 0); 
    const totalViews = myAds.reduce((s, a) => s + (a.views || 0), 0);
const layout = localStorage.getItem('bs_feed_layout') || 'instagram';
    const isDnd = !!currentUser.isDnd;
    const isPhoneVerified = !!(currentUser.phoneVerified || currentUser.phone_verified);

    c.innerHTML = `
    <div class="space-y-3 pt-1">
        ${!isPhoneVerified ? `
        <!-- Плашка-уведомление о необходимости верификации WhatsApp -->
        <div class="p-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-between gap-2 shadow-sm">
            <div class="flex items-center gap-2.5 min-w-0">
                <i class="fa-brands fa-whatsapp text-xl text-amber-500 shrink-0"></i>
                <div class="min-w-0">
                    <div class="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                        <span>${t('Номер не подтвержден')}</span>
                    </div>
                    <div class="text-[10px] t2 truncate">${t('Подтвердите ваш WhatsApp для безопасности объявлений')}</div>
                </div>
            </div>
            <button onclick="startUserWhatsAppVerification()" class="px-3 py-1.5 rounded-xl text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 active:scale-95 transition shrink-0 shadow">
                ${t('Подтвердить')}
            </button>
        </div>` : ''}

        <!-- Шапка: Аватар + Инфо -->
        <div class="bg-field p-3.5 rounded-2xl border b-ig flex items-center justify-between gap-3">
		<div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-full overflow-hidden bg-card border b-ig flex items-center justify-center shrink-0">
                    ${currentUser.avatar ? `<img src="${currentUser.avatar}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-user text-base t2"></i>'}
                </div>
                <div class="min-w-0">
                    <div class="text-sm font-bold t1 truncate flex items-center gap-1.5">
                        <span class="truncate">${currentUser.kunya || currentUser.username}</span>
                        <span class="text-[9px] px-1.5 py-0.2 rounded bg-card border b-ig t2 shrink-0">${currentUser.role}</span>
                    </div>
                    <div class="text-[11px] t2 truncate">@${currentUser.username} • ${currentUser.whatsapp || 'WhatsApp'}</div>
                    <div class="flex gap-2 text-[10px] t1 pt-0.5">
                        <span><b>${myAds.length}</b> ${t('объявл.')}</span>
                        <span>• <b>${totalLikes}</b> ${t('лайков')}</span>
                        <span>• <b>${totalViews}</b> ${t('просмотров')}</span>
                    </div>
                </div>
            </div>
        </div>

		
        <!-- Компактный кошелек AvitoCash -->
        <div class="p-3 rounded-2xl border b-ig bg-field flex items-center justify-between gap-2">
            <div>
                <div class="text-[10px] t2 font-semibold flex items-center gap-1"><i class="fa-solid fa-coins text-amber-500"></i> ${t('Баланс AvitoCash')}</div>
                <div class="text-base font-extrabold text-amber-500">${Number(currentUser.avitocashBalance || 0).toFixed(2)} AC</div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="openTopupModal()" class="px-2.5 py-1.5 rounded-lg text-xs font-bold border b-ig bg-card hover:bg-ig text-amber-500 flex items-center gap-1 transition-colors">
                    <i class="fa-solid fa-plus text-[10px]"></i> ${t('Пополнить')}
                </button>
                <button onclick="openTransferModal()" class="px-2.5 py-1.5 rounded-lg text-xs font-bold border b-ig bg-card hover:bg-ig text-emerald-500 flex items-center gap-1 transition-colors">
                    <i class="fa-solid fa-paper-plane text-[10px]"></i> ${t('Перевод')}
                </button>
                <button onclick="openRedeemGiftModal()" class="px-2 py-1.5 rounded-lg text-xs font-bold border b-ig bg-card hover:bg-ig text-purple-400" title="${t('Код')}">
                    <i class="fa-solid fa-gift"></i>
                </button>
            </div>
        </div>

        <!-- Настройки: Язык, Тема, Вид ленты и Магазин -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
<!-- Язык -->
            <div class="bg-field border b-ig p-2 rounded-xl flex items-center justify-between">
                <span class="text-[10px] t2 font-bold uppercase">${t('Язык')}</span>
                <div class="flex gap-1">
				<button type="button" onclick="changeLanguage('ru')" class="px-1.5 py-0.5 rounded text-[10px] font-bold ${currentLang === 'ru' ? 'bg-blue-500 text-white' : 't2'}">RU</button>
                    <button type="button" onclick="changeLanguage('ar')" class="px-1.5 py-0.5 rounded text-[10px] font-bold ${currentLang === 'ar' ? 'bg-blue-500 text-white' : 't2'}">AR</button>
                </div>
            </div>

            <!-- Тема -->
            <button type="button" onclick="toggleTheme()" class="bg-field border b-ig p-2 rounded-xl flex items-center justify-between text-left hover:bg-ig transition-colors">
                <span class="text-[10px] t2 font-bold uppercase">${t('Тема экрана')}</span>
                <span class="text-xs">${isLight ? IGSVG.moon() : IGSVG.sun()}</span>
            </button>

            <!-- Вид ленты -->
            <div class="bg-field border b-ig p-1.5 rounded-xl flex items-center justify-around">
                <button onclick="setFeedLayout('grid')" class="p-1 rounded text-[10px] font-bold ${layout === 'grid' ? 'text-blue-500' : 't2'}" title="${t('Сетка')}"><i class="fa-solid fa-table-cells"></i></button>
                <button onclick="setFeedLayout('list')" class="p-1 rounded text-[10px] font-bold ${layout === 'list' ? 'text-blue-500' : 't2'}" title="${t('Список')}"><i class="fa-solid fa-list"></i></button>
                <button onclick="setFeedLayout('instagram')" class="p-1 rounded text-[10px] font-bold ${layout === 'instagram' ? 'text-blue-500' : 't2'}" title="${t('Лента')}"><i class="fa-regular fa-square"></i></button>
            </div>

            <!-- Магазин -->
            <button type="button" onclick="closeModal('modal-profile');${currentUser.shop ? 'openMyShopModal()' : 'openCreateShopModal()'}" class="bg-field border b-ig p-2 rounded-xl flex items-center justify-between text-left hover:bg-ig transition-colors">
                <span class="text-[10px] font-bold text-purple-400 truncate">${t('Магазин')}</span>
                <i class="fa-solid fa-store text-xs text-purple-400"></i>
            </button>
        </div>

        ${isAdmin && currentUser.gender !== 'FEMALE' ? `
        <div class="bg-field border b-ig rounded-xl p-2.5 flex items-center justify-between">
            <span class="text-xs font-semibold t1">${t('Женские объявления 🌸')}</span>
            <label class="ig-switch shrink-0">
                <input type="checkbox" id="profile-show-women-ads" onchange="toggleShowWomenAds(this.checked)" ${currentUser.showWomenAds ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        </div>` : ''}

        <!-- История чеков -->
        <div class="bg-field border b-ig rounded-2xl p-3 space-y-1">
            <div class="text-[11px] font-bold t2 uppercase tracking-wide flex items-center gap-1.5">
                <i class="fa-solid fa-receipt text-emerald-500"></i> ${t('История сделок (чеки)')}
            </div>
            <div class="space-y-1 max-h-28 overflow-y-auto pr-1 modal-scroll-body">${renderMyReceipts()}</div>
        </div>

<!-- Кнопки управления аккаунтом -->
        <div class="space-y-1.5 pt-1">
            ${isAdmin ? `<button onclick="openAdminPanel()" class="ig-btn w-full py-2 text-xs font-bold flex items-center justify-center gap-2"><i class="fa-solid fa-user-shield"></i> ${t('Панель Администратора')}</button>` : ''}
            <div class="flex gap-2">
                <button onclick="openEditProfileModal('${currentUser.username}')" class="flex-1 ig-btn-outline py-2 text-xs font-semibold"><i class="fa-solid fa-pen-to-square"></i> ${t('Изменить анкету')}</button>
                <button onclick="logout()" class="ig-btn-danger px-3.5 py-2 text-xs font-semibold"><i class="fa-solid fa-right-from-bracket"></i> ${t('Выйти')}</button>
            </div>
        </div>

        <!-- Инфо-блок разработчика и справка (для мобильных) -->
        <div class="pt-3 border-t b-ig text-center space-y-1 text-xs t2">
            <div>
                <span>${t('Разработчик:')}</span> 
                <a href="https://wa.me/447887280238" target="_blank" class="font-bold t1 hover:underline inline-flex items-center gap-1">
                    <span>${currentLang === 'ar' ? 'سليم نشوق' : 'Салим Нашхо'}</span> 
                    <i class="fa-brands fa-whatsapp text-xs" style="color:#10b981"></i>
                </a>
            </div>
            <div>
                <button type="button" onclick="openModal('modal-faq-help')" class="text-[11px] font-semibold text-blue-500 hover:underline inline-flex items-center gap-1">
                    <i class="fa-solid fa-circle-question"></i>
                    <span>${t('Зачем нужны доступы и данные?')}</span>
                </button>
            </div>
            <div class="font-mono text-[9px] opacity-75">Авито Шам © 2026</div>
        </div>
    </div>`;
    openModal('modal-profile');
	}

function setFeedLayout(layout) {
  localStorage.setItem('bs_feed_layout', layout);
  const isDesktop = window.innerWidth >= 1024;
  itemsPerPage = layout === 'list' ? (isDesktop ? 18 : 10) : (layout === 'grid' ? (isDesktop ? 24 : 12) : (isDesktop ? 12 : 6));
  renderAds();
  openProfileModal();
  showToast('Вид ленты изменен', 'success');
}

async function toggleShowWomenAds(enabled) {
  if (!currentUser) return;
  currentUser.showWomenAds = !!enabled;

  const idx = users.findIndex(u => (u.uid && u.uid === currentUser.uid) || (u.username && u.username.toLowerCase() === currentUser.username.toLowerCase()));
  if (idx !== -1) users[idx].showWomenAds = !!enabled;

  saveUserSession(currentUser, true);

  if (supabaseClient) {
    const query = currentUser.uid 
      ? supabaseClient.from('users').update({ show_women_ads: !!enabled }).eq('uid', currentUser.uid)
      : supabaseClient.from('users').update({ show_women_ads: !!enabled }).eq('username', currentUser.username);
    await query;
  }

  renderCategoryPills();
  renderAds();
  showToast(enabled ? 'Женские объявления включены' : 'Женские объявления скрыты', 'info');
}

function openEditProfileModal(targetUsername) { 
  const user = users.find(u => u.username === targetUsername) || currentUser; 
  if (!user) return; 
  const isSelf = currentUser && (currentUser.username === user.username || currentUser.uid === user.uid);
  const isAdmin = currentUser && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN');
  if (isSelf && !isAdmin && !(user.phoneVerified || user.phone_verified)) {
    showToast(t('Сначала подтвердите текущий номер WhatsApp!'), 'warning');
    if (typeof startUserWhatsAppVerification === 'function') startUserWhatsAppVerification();
    return;
  }
  byId('edit-profile-username').value = user.username;
  byId('edit-profile-login').value = user.username; 
  byId('edit-profile-password').value = ''; 
  byId('edit-profile-kunya').value = user.kunya || ''; 
  byId('edit-profile-whatsapp').value = user.whatsapp || ''; 
  byId('edit-profile-avatar-data').value = user.avatar || ''; 
  const box = byId('edit-profile-avatar-preview-box'), img = byId('edit-profile-avatar-preview-img'); 
  if (user.avatar && box && img) { 
    img.src = user.avatar; box.classList.remove('hidden'); 
  } else if (box) box.classList.add('hidden'); 
  const af = byId('edit-profile-admin-fields'); 
  if (currentUser && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN')) { 
    af.classList.remove('hidden'); 
    byId('edit-profile-gender').value = user.gender || 'MALE'; 
    byId('edit-profile-role').value = user.role || 'USER'; 
  } else af.classList.add('hidden'); 
  openModal('modal-edit-profile'); 
}

function handleSaveProfile(e) { 
  e.preventDefault(); 
  const orig = byId('edit-profile-username').value; 
  const nl = byId('edit-profile-login').value.trim(); 
  const npRaw = byId('edit-profile-password').value; 
  const nk = byId('edit-profile-kunya').value.trim(); 
  const nwRaw = byId('edit-profile-whatsapp').value.trim(); 
  const na = byId('edit-profile-avatar-data').value || null; 
  const idx = users.findIndex(u => u.username && u.username.toLowerCase() === orig.toLowerCase()); 
  if (idx === -1) { showToast('Пользователь не найден!', 'error'); return; } 
  if (nl.toLowerCase() !== orig.toLowerCase() && users.some(u => u.username && u.username.toLowerCase() === nl.toLowerCase())) { 
    showToast('Логин занят!', 'error'); return; 
  }
  const nwCheck = validateWhatsApp(nwRaw);
  if (!nwCheck.valid) {
    showToast(nwCheck.error, 'error');
    return;
  }
  const nw = nwCheck.number;
  const u = users[idx]; u.username = nl; 
  if (npRaw && npRaw.trim()) { 
    sha256(npRaw.trim()).then(hashed => { 
      u.passwordHash = hashed; finalizeProfileSave(u, orig, nl, nk, nw, na); 
    }); 
  } else { 
    finalizeProfileSave(u, orig, nl, nk, nw, na); 
  } 
}

async function finalizeProfileSave(u, orig, nl, nk, nw, na) {
  if (nw) { 
    const waClean = nw.replace(/\D/g,''); 
    const waOwner = users.find(x => x.whatsapp && x.whatsapp.replace(/\D/g,'') === waClean); 
    if (waOwner && waOwner.username.toLowerCase() !== orig.toLowerCase()) { 
      showToast('Этот номер WhatsApp уже используется другим пользователем!', 'error'); return; 
    } 
  }
let safeRole = u.role || 'USER';
  if (supabaseClient && u.uid) { 
    try { 
      const { data: cloudData } = await supabaseClient.from('users').select('role').eq('uid', u.uid).single(); 
      if (cloudData) { 
        safeRole = cloudData.role || 'USER'; 
      } 
    } catch (e) { console.warn('Security check failed', e); } 
  }
  u.role = safeRole;
  if (currentUser && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN') && currentUser.uid !== u.uid) { 
    u.gender = byId('edit-profile-gender').value; 
    u.role = byId('edit-profile-role').value; 
  }
  u.avatar = na;
  u.whatsapp = nw; // ГАРАНТИРОВАННО ОБНОВЛЯЕМ WHATSAPP ЛОКАЛЬНО
  u.kunya = nk;

  // Отправка в Supabase в таблицу users напрямую для надежности + через RPC
  if (supabaseClient && u.uid) {
    await supabaseClient.from('users').update({
      username: u.username,
      kunya: u.kunya,
      whatsapp: u.whatsapp,
      avatar: u.avatar,
      password_hash: u.passwordHash
    }).eq('uid', u.uid);
  }

  ads.forEach(ad => { 
    if (ad.sellerUsername && ad.sellerUsername.toLowerCase() === orig.toLowerCase()) { 
      ad.sellerUsername = nl; ad.sellerKunya = nk; ad.sellerWhatsapp = nw; 
      if (supabaseClient && ad.id) supabaseClient.from('ads').update({ seller_username: nl, seller_kunya: nk, seller_whatsapp: nw }).eq('id', ad.id).then(); 
    } 
  });
  combos.forEach(c => { 
    if (c.sellerUsername && c.sellerUsername.toLowerCase() === orig.toLowerCase()) { 
      c.sellerUsername = nl; 
      if (supabaseClient && c.id) supabaseClient.from('combos').update({ seller_username: nl }).eq('id', c.id).then(); 
    } 
  });
  saveCachedAds();
  if (currentUser && currentUser.username.toLowerCase() === orig.toLowerCase()) { 
    currentUser = { ...u }; saveUserSession(currentUser, true); 
  }
  closeModal('modal-edit-profile'); closeModal('modal-profile'); updateAuthUI(); showToast(`Данные "${nl}" обновлены!`, 'success');
}

function adminPanelBack() { 
  try { 
    if (SYSTEM_CONFIG.adminTab && SYSTEM_CONFIG.adminTab !== 'overview') { 
      switchAdminTab('overview'); return; 
    } 
  } catch (e) {} 
  closeModal('modal-admin-panel'); 
}

async function seizeFunds(uid) {
    if (!currentUser || (currentUser.role !== 'SUPERUSER' && currentUser.role !== 'ADMIN')) {
        showToast('Доступ запрещен', 'error');
        return;
    }
    
    const targetUser = users.find(u => u.uid === uid);
    if (!targetUser) {
        showToast('Пользователь не найден', 'error');
        return;
    }

    if (targetUser.uid === currentUser.uid) {
        showToast('Нельзя взыскать средства у самого себя', 'warning');
        return;
    }

    const amountStr = prompt(`Введите сумму взыскания (AC) с баланса @${targetUser.username} в вашу пользу:`, '5');
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        showToast('Некорректная сумма', 'warning');
        return;
    }

    const targetBal = Number(targetUser.avitocashBalance || targetUser.avitocash_balance || 0);
    if (targetBal < amount) {
        showToast(`У пользователя недостаточно средств (баланс: ${targetBal.toFixed(2)} AC)`, 'warning');
        return;
    }

    try {
        showToast('Выполняется взыскание средств...', 'info');

        const { data: res, error } = await supabaseClient.rpc('transfer_avitocash', {
            sender_identifier: targetUser.uid,
            recipient_identifier: currentUser.uid,
            transfer_amount: amount
        });

        if (error) throw error;
        if (!res || !res.success) throw new Error(res?.error || 'Сбой транзакции в базе данных');

        targetUser.avitocashBalance = res.new_sender_balance;
        targetUser.avitocash_balance = res.new_sender_balance;

        currentUser.avitocashBalance = res.new_recip_balance;
        currentUser.avitocash_balance = res.new_recip_balance;
        saveUserSession(currentUser, true);

        renderAdminTabContent();
        showToast(`Успешно взыскано ${amount.toFixed(2)} AC с баланса @${targetUser.username} в вашу пользу!`, 'success');
    } catch (err) {
        console.error('Seize funds error:', err);
        showToast('Ошибка при взыскании: ' + (err.message || 'Сбой'), 'error');
    }
}

function openAdminPanel() { 
  if (!currentUser || (currentUser.role !== 'SUPERUSER' && currentUser.role !== 'ADMIN')) { 
    showToast('Доступ запрещен!', 'error'); return; 
  } 
  openModal('modal-admin-panel'); 
  renderAdminTabContent(); 
}

function switchAdminTab(tab) { 
  SYSTEM_CONFIG.adminTab = tab; 
  ['overview', 'shops', 'users', 'ads', 'reports', 'archive', 'cats', 'rates', 'marquee', 'backup', 'finance', 'payments', 'tx'].forEach(t => { 
    const b = byId(`atab-${t}`); 
    if (b) { 
      b.style.borderBottomColor = t === tab ? '#0095f6' : 'transparent'; 
      b.style.borderBottomWidth = t === tab ? '2px' : '0'; 
      b.style.color = t === tab ? (t === 'reports' ? '#f87171' : 'var(--ig-text)') : 'var(--ig-text2)'; 
    } 
  }); 
  renderAdminTabContent(); 
}

function switchAdminAdsSubTab(sub) { adminAdsTab = sub; renderAdminTabContent(); }
function goToAdminSection(tab, sub = null) { if (sub) adminAdsTab = sub; switchAdminTab(tab); }

function archiveUserWithConfirm(uid) {
  const u = users.find(x => x.uid === uid);
  if (!u) return;
  if (u.role === 'SUPERUSER') { showToast('Нельзя архивировать суперюзера!', 'error'); return; }
  if (currentUser && currentUser.uid === uid) { showToast('Нельзя архивировать себя!', 'error'); return; }
  
  showConfirmModal('Архивация пользователя', `Переместить @${u.username} в архив? Его объявления будут скрыты из ленты.`, async () => {
    if (supabaseClient) {
      const { data: res, error } = await supabaseClient.rpc('admin_toggle_archive_user', {
        p_target_uid: uid,
        p_archive_status: true
      });
      if (error || !res || !res.success) {
        showToast(res?.error || 'Ошибка архивации в базе', 'error');
        return;
      }
    }

    u.isArchived = true;
    users = users.filter(x => x.uid !== uid);
    archivedUsers.push(u);
    
    ads.forEach(a => {
      if (a.sellerUsername && a.sellerUsername.toLowerCase() === (u.username || '').toLowerCase()) {
        a.status = 'ARCHIVED';
      }
    });

    saveCachedAds();
    renderAdminTabContent();
    renderAds();
    renderCategoryPills();
    showToast('Пользователь перемещен в архив', 'info');
  });
}

async function restoreUserFromArchive(uid) {
  const u = archivedUsers.find(x => x.uid === uid);
  if (!u) return;

  if (supabaseClient) {
    const { data: res, error } = await supabaseClient.rpc('admin_toggle_archive_user', {
      p_target_uid: uid,
      p_archive_status: false
    });
    if (error || !res || !res.success) {
      showToast(res?.error || 'Ошибка восстановления из базы', 'error');
      return;
    }
  }

  u.isArchived = false;
  archivedUsers = archivedUsers.filter(x => x.uid !== uid);
  users.push(u);

  ads.forEach(a => {
    if (a.sellerUsername && a.sellerUsername.toLowerCase() === (u.username || '').toLowerCase() && a.status === 'ARCHIVED') {
      a.status = 'ACTIVE';
    }
  });

  saveCachedAds();
  renderAdminTabContent();
  renderAds();
  renderCategoryPills();
  showToast('Пользователь восстановлен из архива', 'success');
}

function deleteUserPermanently(uid) {
  const u = archivedUsers.find(x => x.uid === uid) || users.find(x => x.uid === uid);
  if (!u) return;
  if (u.role === 'SUPERUSER') { showToast('Нельзя удалить суперюзера!', 'error'); return; }
  showConfirmModal('Удаление пользователя', `Удалить @${u.username} и все его объявления безвозвратно?`, async () => {
    if (supabaseClient) {
      const { data: delRes, error: delErr } = await supabaseClient.rpc('admin_delete_user', {
        p_target_uid: uid
      });
      if (delErr || !delRes || !delRes.success) {
        showToast(delRes?.error || 'Ошибка удаления из базы', 'error');
        return;
      }
    }

users = users.filter(x => x.uid !== uid && (u.username ? x.username?.toLowerCase() !== u.username.toLowerCase() : true));
    archivedUsers = archivedUsers.filter(x => x.uid !== uid && (u.username ? x.username?.toLowerCase() !== u.username.toLowerCase() : true));
    ads = ads.filter(a => !(a.sellerUsername && a.sellerUsername.toLowerCase() === (u.username || '').toLowerCase()));
    saveCachedAds();
    
    renderAdminTabContent();
    renderAds();
    renderCategoryPills();
    showToast('Пользователь и его данные удалены навсегда', 'success');
  });
}

function acceptLaunchRules() {
  const m = document.getElementById('modal-rules-agreement');
  if (!m || m.classList.contains('hidden')) return;
  SYSTEM_CONFIG.rulesAccepted = true;
  localStorage.setItem('bs_rules_accepted', 'true');
  closeModal('modal-rules-agreement');
  showToast('Условия приняты. Добро пожаловать!', 'success');
}

function openReportModal(adId) {
  byId('report-ad-id').value = adId;
  byId('report-reason').value = '';
  byId('report-comment').value = '';
  openModal('modal-report-ad');
}

async function submitReport(e) {
  e.preventDefault();
  const adId = byId('report-ad-id').value;
  const reason = byId('report-reason').value;
  const comment = byId('report-comment').value.trim();
  if (!reason) {
    showToast('Выберите причину жалобы', 'warning');
    return;
  }
  const report = {
    id: 'REP-' + Date.now(),
    ad_id: adId,
    reason: reason,
    comment: comment,
    reporter_username: currentUser ? currentUser.username : 'Anonymous',
    timestamp: Date.now()
  };

  if (supabaseClient) {
    const { error } = await supabaseClient.from('reports').insert(report);
    if (!error) {
      reports.push({
        id: report.id,
        adId: report.ad_id,
        reason: report.reason,
        comment: report.comment,
        reporterUsername: report.reporter_username,
        timestamp: report.timestamp
      });
      showToast('Жалоба отправлена. Спасибо!', 'success');
      closeModal('modal-report-ad');
    } else {
      showToast('Ошибка отправки жалобы: ' + error.message, 'error');
    }
  }
}

async function deleteReport(reportId) {
  if (!currentUser || (currentUser.role !== 'SUPERUSER' && currentUser.role !== 'ADMIN')) return;
  if (supabaseClient) {
    await supabaseClient.from('reports').delete().eq('id', reportId);
    reports = reports.filter(r => r.id !== reportId);
    showToast('Жалоба удалена', 'info');
    renderAdminTabContent();
  }
}/* ================= TRANSACTIONS, SHOPS & AVITOCASH HELPERS ================= */

function collectAllTransactions() { 
  const map = {}; 
  Object.values(TRANSACTIONS || {}).forEach(t => { if (t && t.id) map[t.id] = t; }); 
  users.forEach(u => { Object.values(u.receipts || {}).forEach(t => { if (t && t.id && !map[t.id]) map[t.id] = t; }); }); 
  return Object.values(map).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); 
}

function txTypeLabel(txItem, viewerUid) { 
  if (!txItem) return '';
  const isIn = viewerUid && txItem.recipientUid === viewerUid; 
  const map = { 
    purchase: isIn ? t('Куплено') : (viewerUid && txItem.senderUid === viewerUid ? t('Продано') : t('Покупка')), 
    transfer: isIn ? t('Получено') : t('Отправлено'), 
    topup: t('Пополнение'), 
    gift: t('Подарок'), 
    fee: t('Оплата услуги'), 
    seizure: t('Взыскание') 
  }; 
  return map[txItem.type] || txItem.type || t('Транзакция'); 
}

function openTopupModal() { 
  if (!currentUser) return; 
  byId('topup-amount').value = ''; 
  byId('topup-result').classList.add('hidden'); 
  byId('topup-qr').innerHTML = ''; 
  openModal('modal-avitocash-topup'); 
}

function createTopupRequest() {
  const amount = _0xSCAmount(byId('topup-amount')?.value);
  if (!currentUser || amount <= 0) {
    showToast('Укажите корректную сумму', 'warning');
    return;
  }
  const code = _0xSCCode();
  const requestId = 'REQ-' + Date.now();
  
  const reqData = {
    id: requestId,
    code: code,
    amount: amount,
    uid: currentUser.uid || '',
    username: currentUser.username,
    status: 'pending',
    timestamp: Date.now()
  };

  TOPUP_REQUESTS[requestId] = reqData;
  try {
    localStorage.setItem('bs_topup_requests', JSON.stringify(TOPUP_REQUESTS));
  } catch(e) {}

  byId('topup-code').innerText = code;
  byId('topup-result').classList.remove('hidden');
  byId('topup-qr').innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(byId('topup-qr'), { text: AVITOCASH_ID, width: 180, height: 180, colorDark: '#000', colorLight: '#fff' });
  }
  showToast('Заявка создана. Отправьте код администратору.', 'success');
}

function openGiftGenerator() { 
  if (!_0xSCAdmin()) { showToast('Доступ разрешен только Главному Администратору', 'error'); return; } 
  resetGiftGenerator(); 
  openModal('modal-gift-code'); 
}

function resetGiftGenerator() { 
  byId('gift-generator-form')?.classList.remove('hidden'); 
  byId('gift-result')?.classList.add('hidden'); 
  byId('gift-amount').value = ''; 
  byId('gift-days').value = '30'; 
}

function drawGiftCard(code, amount, expiresAt) { 
  const canvas = byId('gift-card-canvas'); 
  if (!canvas) return; 
  const ctx = canvas.getContext('2d'); 
  const gradient = ctx.createLinearGradient(0, 0, 900, 1200); 
  gradient.addColorStop(0, '#f59e0b'); 
  gradient.addColorStop(.45, '#ef4444'); 
  gradient.addColorStop(1, '#7c3aed'); 
  ctx.fillStyle = gradient; 
  ctx.fillRect(0, 0, 900, 1200); 
  ctx.fillStyle = 'rgba(0,0,0,.82)'; 
  ctx.roundRect(36, 36, 828, 1128, 42); 
  ctx.fill(); 
  ctx.textAlign = 'center'; 
  ctx.fillStyle = '#fbbf24'; 
  ctx.font = 'bold 46px Arial'; 
ctx.fillText('AVITO SHAM', 450, 160); 
  ctx.fillStyle = '#fff'; 
  ctx.font = 'bold 76px Arial'; 
  ctx.fillText(t('ПОДАРОК'), 450, 330); 
  ctx.font = 'bold 108px Arial'; 
  ctx.fillStyle = '#fbbf24'; 
  ctx.fillText(`${amount.toFixed(2)} AC`, 450, 515); 
  ctx.fillStyle = '#fff'; 
  ctx.font = 'bold 38px monospace'; 
  ctx.fillText(code, 450, 730); 
  ctx.fillStyle = '#a8a8a8'; 
  ctx.font = '28px Arial'; 
  ctx.fillText(t('Подарочный баланс AvitoCash'), 450, 815); 
  ctx.fillText(expiresAt ? `${t('Действует до')} ${new Date(expiresAt).toLocaleDateString()}` : t('Без срока действия'), 450, 875); 
  ctx.fillStyle = '#fbbf24'; 
  ctx.font = 'bold 30px Arial'; 
  ctx.fillText('1 AC = 1 USD', 450, 1040);
  }

function generateGiftCode() {
  if (!_0xSCAdmin()) return;
  const amount = _0xSCAmount(byId('gift-amount')?.value);
  const days = Math.max(0, Math.floor(Number(byId('gift-days')?.value || 0)));
  if (!amount) { showToast('Укажите сумму подарка', 'warning'); return; }
  const code = _0xGiftCode();
  const expiresAt = days ? Date.now() + days * 86400000 : 0;
  byId('gift-code-label').innerText = code;
  byId('gift-details').innerText = `${amount.toFixed(2)} AC • ${expiresAt ? 'до ' + new Date(expiresAt).toLocaleDateString() : 'без срока'}`;
  drawGiftCard(code, amount, expiresAt);
  byId('gift-qr').innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(byId('gift-qr'), { text: JSON.stringify({ code, amount }), width: 190, height: 190, colorDark: '#111827', colorLight: '#ffffff' });
  }
  byId('gift-generator-form').classList.add('hidden');
  byId('gift-result').classList.remove('hidden');
  showToast('Подарочный код создан!', 'success');
}

function openRedeemGiftModal() {
  if (currentUser && !(currentUser.phoneVerified || currentUser.phone_verified)) {
    showToast(t('Финансовые операции доступны только с подтвержденным номером!'), 'warning');
    if (typeof startUserWhatsAppVerification === 'function') startUserWhatsAppVerification();
    return;
  }
  byId('redeem-gift-code').value = '';
  openModal('modal-redeem-gift');
}

function openTransferModal() {
  if (!currentUser) {
    openAuthModal();
    return;
  }
  if (!(currentUser.phoneVerified || currentUser.phone_verified)) {
    showToast(t('Финансовые операции доступны только с подтвержденным номером!'), 'warning');
    if (typeof startUserWhatsAppVerification === 'function') startUserWhatsAppVerification();
    return;
  }
  const select = byId('transfer-recipient');
  if (!select) return;

  const currentId = currentUser.uid || currentUser.username;
  const available = users.filter(u => (u.uid || u.username) !== currentId);

  select.innerHTML = available.length
    ? available.map(u => `<option value="${u.uid || u.username}">${u.kunya || u.username} (@${u.username})</option>`).join('')
    : `<option value="">${t('Нет доступных получателей')}</option>`;

  byId('transfer-amount').value = '';
  byId('transfer-note').value = '';
  openModal('modal-transfer-shamcash');
}

async function transferShamCash() {
  if (!currentUser || !supabaseClient) {
    showToast('Нет соединения с базой данных', 'error');
    return;
  }
  if (currentUser.frozen) {
    showToast('Аккаунт заморожен администратором — перевод недоступен', 'error');
    return;
  }

  const recipientKey = byId('transfer-recipient')?.value;
  const amount = parseFloat(byId('transfer-amount')?.value || 0);
  const note = String(byId('transfer-note')?.value || '').trim();

  const recipient = users.find(u => (u.uid && u.uid === recipientKey) || (u.username && u.username === recipientKey));

  if (!recipient || (recipient.uid && recipient.uid === currentUser.uid) || (recipient.username === currentUser.username)) {
    showToast('Выберите корректного получателя', 'warning');
    return;
  }
  if (!amount || amount <= 0 || isNaN(amount)) {
    showToast('Укажите сумму перевода', 'warning');
    return;
  }

  showToast('Выполняется перевод через защищенный сервер...', 'info');

  try {
    const senderId = currentUser.uid || currentUser.username;
    const recipId = recipient.uid || recipient.username;

    const { data: res, error } = await supabaseClient.rpc('transfer_avitocash', {
      sender_identifier: senderId,
      recipient_identifier: recipId,
      transfer_amount: amount
    });

    if (error) throw error;
    if (!res || !res.success) {
      throw new Error(res?.error || 'Ошибка проведения транзакции');
    }

    currentUser.avitocashBalance = res.new_sender_balance;
    currentUser.avitocash_balance = res.new_sender_balance;
    recipient.avitocashBalance = res.new_recip_balance;
    recipient.avitocash_balance = res.new_recip_balance;

    saveUserSession(currentUser, true);

    closeModal('modal-transfer-shamcash');
    if (!byId('modal-profile').classList.contains('hidden')) openProfileModal();

    showToast(`Перевод выполнен: ${amount.toFixed(2)} AC отправлено @${recipient.username}`, 'success');

  } catch (err) {
    console.error('Transfer RPC error:', err);
    showToast('Ошибка перевода: ' + (err.message || 'Сбой базы данных'), 'error');
  }
}

function downloadGiftCard() { 
  const canvas = byId('gift-card-canvas'); 
  if (!canvas) return; 
  const link = document.createElement('a'); 
  link.download = 'AvitoSham-Gift-Code.png'; 
  link.href = canvas.toDataURL('image/png'); 
  link.click(); 
}

async function shareGiftCard() { 
  const canvas = byId('gift-card-canvas'); 
  if (!canvas) return; 
  canvas.toBlob(async blob => { 
    const file = new File([blob], 'AvitoSham-Gift-Code.png', { type: 'image/png' }); 
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) { 
      try { 
        await navigator.share({ title: 'Подарочный код Avito Sham', text: byId('gift-code-label').innerText, files: [file] }); 
        return; 
      } catch (e) { 
        if (e.name === 'AbortError') return; 
      } 
    } 
    downloadGiftCard(); 
    showToast('Карточка скачана для отправки', 'info'); 
  }, 'image/png'); 
}

async function _0xSCCharge(uid, amount, label) {
  if (typeof isMasterFreeActive === 'function' && isMasterFreeActive()) {
    return true;
  }
  const target = users.find(x => (x.uid && x.uid === uid) || (x.username && x.username === uid)) || currentUser;
  if (target && target.frozen) {
    showToast('Аккаунт заморожен администратором — действие недоступно', 'error');
    return false;
  }
  const price = _0xSCAmount(amount);
  if (!price || price <= 0) return true;
  
  const currentBal = Number(target.avitocashBalance ?? target.avitocash_balance ?? 0);
  if (currentBal < price) {
    showToast(`Недостаточно AvitoCash. Требуется ${price.toFixed(2)} AC`, 'warning');
    return false;
  }

  if (supabaseClient) {
    try {
      const { data: res, error } = await supabaseClient.rpc('charge_avitocash', {
        p_user_identifier: target.uid || target.username,
        p_amount: price,
        p_action: 'DEDUCT',
        p_reason: label || 'Оплата услуги'
      });

      if (error || !res || !res.success) {
        showToast(res?.error || 'Ошибка списания средств в базе данных', 'error');
        return false;
      }

      const verifiedBal = Number(res.new_balance);
      target.avitocashBalance = verifiedBal;
      target.avitocash_balance = verifiedBal;

      if (currentUser && ((currentUser.uid && currentUser.uid === target.uid) || currentUser.username === target.username)) {
        currentUser.avitocashBalance = verifiedBal;
        currentUser.avitocash_balance = verifiedBal;
        saveUserSession(currentUser, true);
      }
    } catch (err) {
      console.error('Charge transaction error:', err);
      showToast('Ошибка биллинга: соединение отклонено', 'error');
      return false;
    }
  } else {
    const newBal = Math.round((currentBal - price) * 100) / 100;
    target.avitocashBalance = newBal;
    target.avitocash_balance = newBal;
    if (currentUser) {
      currentUser.avitocashBalance = newBal;
      currentUser.avitocash_balance = newBal;
      saveUserSession(currentUser, true);
    }
  }

  showToast(`${label}: списано ${price.toFixed(2)} AC`, 'info');
  return true;
}

async function saveShamCashSettings() {
  if (!_0xSCAdmin()) { showToast('Доступ запрещен!', 'error'); return; }
  AVITOCASH_PRICES = {
    adPrice: _0xSCAmount(byId('sc-ad-price')?.value),
    shopSubscription: _0xSCAmount(byId('sc-shop-price')?.value),
    editPrice: _0xSCAmount(byId('sc-edit-price')?.value),
    freeAdsCount: Math.max(0, Math.floor(Number(byId('sc-free-ads')?.value || 0)))
  };
  localStorage.setItem('bs_avitocash_prices', JSON.stringify(AVITOCASH_PRICES));

  // Синхронизация с облаком Supabase, чтобы тарифы применялись глобально
  if (supabaseClient) {
    try {
      await supabaseClient.from('system_settings').upsert({
        key: 'avitocash_prices',
        value: AVITOCASH_PRICES
      });
    } catch (e) {
      console.warn('Cloud settings sync warning:', e);
    }
  }

showToast('Настройки тарифов сохранены и синхронизированы!', 'success');
}

function handleFreeConditionChange(type) {
  const wrap = byId('admin-free-target-wrap');
  const label = byId('admin-free-target-label');
  const valInput = byId('admin-free-target-val');
  if (!wrap) return;

  if (type === 'always') {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');

  if (type === 'shops_count') {
    if (label) label.innerText = 'Количество магазинов:';
    if (valInput) { valInput.type = 'number'; valInput.placeholder = 'Например, 10'; }
  } else if (type === 'ads_count') {
    if (label) label.innerText = 'Количество объявлений:';
    if (valInput) { valInput.type = 'number'; valInput.placeholder = 'Например, 200'; }
  } else if (type === 'users_count') {
    if (label) label.innerText = 'Количество пользователей:';
    if (valInput) { valInput.type = 'number'; valInput.placeholder = 'Например, 500'; }
  } else if (type === 'days_timer') {
    if (label) label.innerText = 'Срок в днях (со дня включения):';
    if (valInput) { valInput.type = 'number'; valInput.placeholder = 'Например, 30'; }
  } else if (type === 'until_date') {
    if (label) label.innerText = 'Дата окончания акции:';
    if (valInput) { valInput.type = 'date'; }
  }
}

async function toggleMasterFreeSwitch(enabled) {
  if (!_0xSCAdmin()) {
    showToast('Доступ запрещен', 'error');
    return;
  }
  MASTER_FREE_CONFIG.enabled = !!enabled;
  if (enabled && !MASTER_FREE_CONFIG.startDate) {
    MASTER_FREE_CONFIG.startDate = Date.now();
  }
  localStorage.setItem('bs_master_free_config', JSON.stringify(MASTER_FREE_CONFIG));
  if (supabaseClient) {
    try {
      await supabaseClient.from('system_settings').upsert({
        key: 'master_free_config',
        value: MASTER_FREE_CONFIG
      });
    } catch (e) {
      console.warn('Sync master free config error:', e);
    }
  }
  renderAdminTabContent();
  showToast(MASTER_FREE_CONFIG.enabled ? '🎁 Промо-режим включен!' : '🔒 Промо-режим выключен', 'info');
}

async function saveMasterFreePromoConfig() {
  if (!_0xSCAdmin()) {
    showToast('Доступ запрещен', 'error');
    return;
  }
  const type = byId('admin-free-condition-type')?.value || 'always';
  const rawVal = byId('admin-free-target-val')?.value;

  MASTER_FREE_CONFIG.conditionType = type;
  MASTER_FREE_CONFIG.targetValue = type === 'until_date' ? rawVal : (Number(rawVal) || 10);
  MASTER_FREE_CONFIG.startDate = Date.now(); // Сброс даты старта для честного отсчета дней

  localStorage.setItem('bs_master_free_config', JSON.stringify(MASTER_FREE_CONFIG));

  if (supabaseClient) {
    try {
      await supabaseClient.from('system_settings').upsert({
        key: 'master_free_config',
        value: MASTER_FREE_CONFIG
      });
    } catch (e) {
      console.warn('Sync master free config error:', e);
    }
  }

renderAdminTabContent();
  showToast('Условия промо-режима успешно сохранены!', 'success');
}

async function toggleMasterFreeMode(enabled) {
  if (!_0xSCAdmin()) {
    showToast('Доступ запрещен', 'error');
    return;
  }
  MASTER_FREE_MODE = !!enabled;
  localStorage.setItem('bs_master_free_mode', String(MASTER_FREE_MODE));
  if (supabaseClient) {
    try {
      await supabaseClient.from('system_settings').upsert({
        key: 'master_free_mode',
        value: MASTER_FREE_MODE
      });
    } catch (e) {
      console.warn('Sync master free mode error:', e);
    }
  }
  renderAdminTabContent();
  showToast(MASTER_FREE_MODE ? '🎁 Включен режим «Всё бесплатно»!' : '🔒 Стандартные тарифы AvitoCash активированы', 'info');
}

async function verifyPayment(requestId, approve) {
  if (!_0xSCAdmin()) { 
    showToast('Только Главный Администратор может начислять баланс', 'error'); 
    return; 
  }
  
  const req = TOPUP_REQUESTS[requestId];
  if (!req) {
    showToast('Заявка не найдена', 'error');
    return;
  }

  if (approve) {
    const targetUser = users.find(u => (u.uid && u.uid === req.uid) || (u.username && u.username.toLowerCase() === req.username.toLowerCase()));
    if (!targetUser) {
      showToast('Пользователь заявки не найден', 'error');
      return;
    }

    const addedAmount = Number(req.amount || 0);
    const newBal = Math.round(((Number(targetUser.avitocashBalance || targetUser.avitocash_balance || 0)) + addedAmount) * 100) / 100;
    
    targetUser.avitocashBalance = newBal;
    targetUser.avitocash_balance = newBal;

    if (!targetUser.receipts) targetUser.receipts = {};
    const txId = 'TX-' + Date.now();
    const receiptItem = {
      id: txId,
      type: 'topup',
      amount: addedAmount,
      senderUsername: 'AvitoSham (Admin)',
      recipientUsername: targetUser.username,
      recipientUid: targetUser.uid || '',
      note: `Пополнение AvitoCash (код ${req.code})`,
      timestamp: Date.now()
    };
    targetUser.receipts[txId] = receiptItem;
    TRANSACTIONS[txId] = receiptItem;

    if (supabaseClient) {
      if (targetUser.uid) {
        await supabaseClient.from('users').update({ avitocash_balance: newBal, receipts: targetUser.receipts }).eq('uid', targetUser.uid);
      } else {
        await supabaseClient.from('users').update({ avitocash_balance: newBal, receipts: targetUser.receipts }).eq('username', targetUser.username);
      }
    }

    if (currentUser && ((currentUser.uid && currentUser.uid === targetUser.uid) || currentUser.username === targetUser.username)) {
      currentUser.avitocashBalance = newBal;
      currentUser.avitocash_balance = newBal;
      currentUser.receipts = targetUser.receipts;
      saveUserSession(currentUser, true);
    }

    req.status = 'approved';
    showToast(`Платеж подтвержден! Начислено +${addedAmount.toFixed(2)} AC пользователю @${targetUser.username}`, 'success');
  } else {
    req.status = 'rejected';
    showToast('Заявка отклонена', 'info');
  }

  try {
    localStorage.setItem('bs_topup_requests', JSON.stringify(TOPUP_REQUESTS));
  } catch(e) {}

  renderAdminTabContent();
}

function getShopTier(adsCount) {
  const tierUnits = Math.max(1, Math.ceil((adsCount || 1) / 50));
  return {
    maxAds: tierUnits * 50,
    price: tierUnits * 5
  };
}

function openCreateShopModal(targetUid = null) { 
  shopEditTargetUid = null; 
  let targetUser = currentUser; 
  const banner = byId('shop-admin-target-banner'), bannerText = byId('shop-admin-target-text'); 
  if (targetUid && currentUser && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN')) { 
    const t = users.find(u => u.uid === targetUid); 
    if (t) { 
      shopEditTargetUid = targetUid; 
      targetUser = t; 
    } 
  } 
if (!targetUser) { 
    openAuthModal(); 
    showToast(t('Войдите в аккаунт'), 'warning'); 
    return; 
  }
  if (!shopEditTargetUid && !(targetUser.phoneVerified || targetUser.phone_verified)) {
    showToast(t('Открытие магазина доступно только после подтверждения номера!'), 'warning');
    if (typeof startUserWhatsAppVerification === 'function') startUserWhatsAppVerification();
    return;
  }
  const titleEl = byId('shop-modal-title'), submitBtn = byId('shop-submit-btn'); 
  if (shopEditTargetUid) { 
    banner.classList.remove('hidden'); 
    bannerText.innerText = `Режим модерации: магазин пользователя @${targetUser.username}`; 
  } else banner.classList.add('hidden'); 
  
const shopCatSelect = byId('shop-category');
  if (shopCatSelect) {
    shopCatSelect.innerHTML = `
      <option value="" disabled selected>${t('Категория магазина *')}</option>
      <option value="electronics">${t('Электроника и Техника')}</option>
      <option value="transport">${t('Авто & Запчасти')}</option>
      <option value="realestate">${t('Недвижимость')}</option>
      <option value="home">${t('Товары для дома')}</option>
      <option value="services">${t('Услуги & Сервис')}</option>
      <option value="other">${t('Разное')}</option>
    `;
  }

  const shopNameInp = byId('shop-name');
  if (shopNameInp) shopNameInp.placeholder = t('Название магазина *');
  const shopSloganInp = byId('shop-slogan');
  if (shopSloganInp) shopSloganInp.placeholder = t('Слоган / краткое описание *');
  const shopAddressInp = byId('shop-address');
  if (shopAddressInp) shopAddressInp.placeholder = t('Точный физический адрес *');
  const shopHoursInp = byId('shop-hours');
  if (shopHoursInp) shopHoursInp.placeholder = t('Часы работы (напр. Сб–Чт 09:00–20:00)');
  const shopWhatsappInp = byId('shop-whatsapp');
  if (shopWhatsappInp) shopWhatsappInp.placeholder = t('WhatsApp магазина * (+963…)');
  const shopDescInp = byId('shop-desc');
  if (shopDescInp) shopDescInp.placeholder = t('Подробная информация о магазине *');

  const shopLabels = document.querySelectorAll('#modal-create-shop label');
  if (shopLabels.length >= 2) {
    shopLabels[0].innerText = t('Расположение на карте * (клик — установить метку)');
    shopLabels[1].innerText = t('Логотип магазина (1:1) *');
  }

  const shopNote = document.querySelector('#modal-create-shop .p-3.rounded-xl');
  if (shopNote) shopNote.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${t('Магазин будет отправлен на проверку администратору.')}`;

  if (targetUser.shop) { 
    titleEl.innerHTML = `<i class="fa-solid fa-store" style="color:#9333ea"></i> <span>${t('Редактирование магазина')}</span>`; 
    submitBtn.innerText = t('Сохранить изменения магазина'); 
    byId('shop-name').value = targetUser.shop.name || ''; 
    byId('shop-slogan').value = targetUser.shop.slogan || ''; 
    byId('shop-category').value = targetUser.shop.category || 'electronics'; 
    byId('shop-region').value = targetUser.shop.region || 'DAM'; 
    byId('shop-address').value = targetUser.shop.address || ''; 
    byId('shop-hours').value = targetUser.shop.hours || ''; 
    byId('shop-whatsapp').value = targetUser.shop.whatsapp || targetUser.whatsapp || ''; 
    byId('shop-desc').value = targetUser.shop.desc || ''; 
    byId('shop-logo-data').value = targetUser.shop.logo || ''; 
    byId('shop-lat').value = targetUser.shop.lat || 33.5138; 
    byId('shop-lng').value = targetUser.shop.lng || 36.2765; 
    if (targetUser.shop.logo) { 
      byId('shop-logo-preview-img').src = targetUser.shop.logo; 
      byId('shop-logo-preview-box').classList.remove('hidden'); 
    } 
  } else { 
    titleEl.innerHTML = `<i class="fa-solid fa-store" style="color:#9333ea"></i> <span>${t('Открытие нового магазина')}</span>`; 
    submitBtn.innerText = t('Создать магазин'); 
    ['shop-name', 'shop-slogan', 'shop-address', 'shop-hours', 'shop-desc', 'shop-logo-data'].forEach(i => byId(i).value = ''); 
    byId('shop-category').value = 'electronics'; 
    byId('shop-region').value = 'DAM'; 
    byId('shop-whatsapp').value = targetUser.whatsapp || ''; 
    byId('shop-lat').value = 33.5138; 
    byId('shop-lng').value = 36.2765; 
    byId('shop-logo-preview-box').classList.add('hidden'); 
  }
  openModal('modal-create-shop'); 
  setTimeout(initShopCreateMap, 200); 
}

function initShopCreateMap() { 
  const el = byId('shop-create-map'); 
  if (!el || typeof L === 'undefined') return; 
  const lat = parseFloat(byId('shop-lat').value || 33.5138), lng = parseFloat(byId('shop-lng').value || 36.2765); 
  if (!shopCreateMap) { 
    shopCreateMap = L.map('shop-create-map').setView([lat, lng], 12); 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(shopCreateMap); 
    shopCreateMarker = L.marker([lat, lng], { draggable: true }).addTo(shopCreateMap); 
    shopCreateMarker.on('dragend', e => { 
      const ll = e.target.getLatLng(); 
      byId('shop-lat').value = ll.lat.toFixed(6); 
      byId('shop-lng').value = ll.lng.toFixed(6); 
    }); 
    shopCreateMap.on('click', e => { 
      shopCreateMarker.setLatLng(e.latlng); 
      byId('shop-lat').value = e.latlng.lat.toFixed(6); 
      byId('shop-lng').value = e.latlng.lng.toFixed(6); 
    }); 
  } else { 
    shopCreateMap.setView([lat, lng], 12); 
    shopCreateMarker.setLatLng([lat, lng]); 
    shopCreateMap.invalidateSize(); 
  } 
}

function handleShopRegionMapUpdate(code) { 
  const c = REGION_COORDS[code] || [33.5138, 36.2765]; 
  byId('shop-lat').value = c[0]; 
  byId('shop-lng').value = c[1]; 
  if (shopCreateMap && shopCreateMarker) { 
    shopCreateMap.setView(c, 12); 
    shopCreateMarker.setLatLng(c); 
  } 
}

async function handleCreateShopSubmit(e) {
  e.preventDefault();
  const name = byId('shop-name').value.trim();
  const isEditTarget = !!shopEditTargetUid;
  if (!isEditTarget && !currentUser) {
    showToast('Войдите в аккаунт!', 'warning');
    return;
  }
  const existing = isEditTarget ? users.find(u => u.uid === shopEditTargetUid) : currentUser;
  const prevShop = existing?.shop;
  const shopData = {
    id: prevShop ? prevShop.id : ('SHOP-' + Date.now()),
    name,
    slogan: byId('shop-slogan').value.trim(),
    category: byId('shop-category').value,
    region: byId('shop-region').value,
    address: byId('shop-address').value.trim(),
    hours: byId('shop-hours').value.trim(),
    whatsapp: byId('shop-whatsapp').value.trim(),
    desc: byId('shop-desc').value.trim(),
    logo: byId('shop-logo-data').value || null,
    lat: parseFloat(byId('shop-lat').value || 33.5138),
    lng: parseFloat(byId('shop-lng').value || 36.2765),
    customCategories: prevShop ? (prevShop.customCategories || []) : [],
    isVerified: prevShop ? !!(existing.verifiedShop || prevShop.isVerified) : false,
    createdAt: prevShop ? (prevShop.createdAt || Date.now()) : Date.now()
  };

  const targetUid = isEditTarget ? shopEditTargetUid : (currentUser.uid || currentUser.username);

  if (supabaseClient) {
    const { data: res, error } = await supabaseClient.rpc('update_user_shop', {
      p_identifier: targetUid,
      p_shop_data: shopData
    });
    if (error || !res || !res.success) {
      showToast(res?.error || 'Ошибка сохранения магазина в базе', 'error');
      return;
    }
  }

  if (isEditTarget) {
    const u = users.find(x => x.uid === shopEditTargetUid);
    if (u) u.shop = shopData;
    shopEditTargetUid = null;
  } else {
    currentUser.shop = shopData;
    const idx = users.findIndex(u => (u.uid && currentUser.uid && u.uid === currentUser.uid) || (u.username && currentUser.username && u.username.toLowerCase() === currentUser.username.toLowerCase()));
    if (idx !== -1) users[idx].shop = shopData;
    saveUserSession(currentUser, true);
    updateAuthUI();
  }

  closeModal('modal-create-shop');
  renderAdminTabContent();
  renderAds();
  renderCategoryPills();
  showToast(`Магазин "${name}" сохранен и отправлен на проверку!`, 'success');
}

async function adminVerifyShop(userUid, status) {
  if (!currentUser) return;
  const u = users.find(x => x.uid === userUid);
  if (!u || !u.shop) return;

  u.verifiedShop = Boolean(status);
  u.shop.isVerified = Boolean(status);

  if (supabaseClient) {
    supabaseClient
      .from('users')
      .update({
        verified_shop: u.verifiedShop,
        shop: u.shop
      })
      .eq('uid', userUid)
      .then();
  }

  renderAdminTabContent();
  renderCategoryPills();
  renderAds();
  showToast('Статус магазина "' + (u.shop.name || '') + '" обновлен!', 'success');
}

async function toggleFreezeUser(uid) {
  if (!currentUser) return;
  const u = users.find(x => x.uid === uid);
  if (!u) return;
  if (u.role === 'SUPERUSER') { showToast('Нельзя заморозить суперюзера!', 'error'); return; }
  if (currentUser.uid === uid) { showToast('Нельзя заморозить себя!', 'error'); return; }

  const nextState = !u.frozen;
  if (supabaseClient) {
    const { data: res, error } = await supabaseClient.rpc('admin_manage_user', {
      p_caller_id: currentUser.uid || currentUser.username,
      p_target_uid: u.uid,
      p_frozen: nextState
    });
    if (error || !res || !res.success) {
      showToast(res?.error || 'Ошибка изменения статуса', 'error');
      return;
    }
  }
  u.frozen = nextState;
  renderAdminTabContent();
  showToast(u.frozen ? `Аккаунт @${u.username} заморожен ❄` : `Аккаунт @${u.username} разморожен`, 'info');
}

function deleteShopWithConfirm(userUid) {
  if (!currentUser) return;
  const u = users.find(x => x.uid === userUid);
  if (!u || !u.shop) return;
  showConfirmModal('Удаление магазина', `Удалить магазин "${u.shop.name}"?`, async () => {
    if (supabaseClient) {
      await supabaseClient.rpc('update_user_shop', {
        p_identifier: u.uid,
        p_shop_data: null
      });
      await supabaseClient.rpc('admin_manage_user', {
        p_caller_id: currentUser.uid || currentUser.username,
        p_target_uid: u.uid,
        p_verified_shop: false
      });
    }
    delete u.shop;
    u.verifiedShop = false;
    renderAdminTabContent();
    renderAds();
    renderCategoryPills();
    showToast('Магазин удален', 'info');
  });
}

function adminCreateShopForUser() { 
  const sel = byId('admin-new-shop-user'); 
  if (sel && sel.value) openCreateShopModal(sel.value); 
}

function openQuickDiscountModal(adId) {
  const ad = ads.find(a => a.id === adId);
  if (!ad) return;
  currentDiscountTargetAd = ad;
byId('quick-discount-ad-id').value = ad.id;
  byId('quick-discount-ad-title').innerText = ad.title;
  if (currentLang === 'ar' && typeof translateDynamic === 'function') {
    translateDynamic(ad.title, 'ar').then(trans => {
      const el = byId('quick-discount-ad-title');
      if (el) el.innerText = trans;
    });
  }
  byId('quick-discount-ad-current').innerText = `${t('Текущая цена:')} $${Number(ad.price || 0).toFixed(2)}`;
  byId('quick-discount-price').value = ad.price || '';
  byId('quick-discount-duration').value = 'forever';

  const modalTitle = document.querySelector('#modal-quick-discount h3');
  if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-tags" style="color:#ef4444"></i> ${t('Установить скидку / Акцию')}`;

  const labels = document.querySelectorAll('#modal-quick-discount .grid label');
  if (labels.length >= 2) {
    labels[0].childNodes[0].nodeValue = t('Новая цена ($)');
    labels[1].childNodes[0].nodeValue = t('Срок действия');
  }

  const durationSelect = byId('quick-discount-duration');
  if (durationSelect && durationSelect.options.length >= 4) {
    durationSelect.options[0].text = t('Бессрочно');
    durationSelect.options[1].text = t('24 часа (Скидка дня)');
    durationSelect.options[2].text = t('3 дня (Выходные)');
    durationSelect.options[3].text = t('7 дней (Неделя скидок)');
  }

  const applyBtn = document.querySelector('#modal-quick-discount button[onclick="saveQuickDiscountSubmit()"]');
  if (applyBtn) applyBtn.innerText = t('Применить скидку');
  const cancelBtn = document.querySelector('#modal-quick-discount button[onclick="removeQuickDiscountSubmit()"]');
  if (cancelBtn) cancelBtn.innerText = t('Отменить скидку (вернуть старую цену)');

  openModal('modal-quick-discount');
}

function applyPresetDiscountPercent(pct) {
  if (!currentDiscountTargetAd) return;
  const basePrice = currentDiscountTargetAd.oldPrice || currentDiscountTargetAd.price || 0;
  if (basePrice <= 0) return;
  const newPrice = Math.max(0.1, basePrice * (1 - pct / 100));
  byId('quick-discount-price').value = newPrice.toFixed(2);
}

async function saveQuickDiscountSubmit() {
  const adId = byId('quick-discount-ad-id')?.value;
  const ad = (typeof ads !== 'undefined' ? ads.find(a => a.id === adId) : null) || currentDiscountTargetAd;
  if (!ad || !currentUser) return;

  const newP = parseFloat(byId('quick-discount-price')?.value);
  if (isNaN(newP) || newP <= 0) {
    showToast(t('Укажите корректную новую цену'), 'warning');
    return;
  }
  
  // 1. Фиксируем базовую цену как старую, а новую ставим со скидкой
  const currentPrice = Number(ad.price || 0);
  const prevOld = (ad.oldPrice !== null && ad.oldPrice !== undefined && Number(ad.oldPrice) > 0) ? Number(ad.oldPrice) : null;
  const finalOldPrice = (prevOld && prevOld > newP) ? prevOld : currentPrice;

  ad.oldPrice = finalOldPrice;
  ad.old_price = finalOldPrice;
  ad.price = newP;

  // 2. Мгновенно сохраняем в localStorage, чтобы не зависеть от перезагрузок
  if (typeof saveCachedAds === 'function') saveCachedAds();

  // 3. Закрываем окно и сразу перерисовываем карточки на экране
  closeModal('modal-quick-discount');
  if (typeof renderCategoryPills === 'function') renderCategoryPills();
  if (typeof renderAds === 'function') renderAds();

  // 4. Отправляем в Supabase
  if (supabaseClient) {
    try {
// Вызов через RPC для обхода AdBlock-фильтров
      const { error } = await supabaseClient.rpc('apply_ad_discount', {
        p_ad_id: ad.id,
        p_new_price: Number(newP),
        p_old_price: Number(finalOldPrice)
      });
	  
      if (error) {
        console.warn('Supabase discount error:', error);
      }
    } catch(err) {
      console.warn('Supabase network block:', err);
    }
  }

  showToast(`Скидка на "${ad.title}" установлена: $${newP.toFixed(2)}`, 'success');
  return;
  
  // Сохраняем локальный кэш сразу
  if (typeof saveCachedAds === 'function') saveCachedAds();

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('ads')
        .update({ 
          price: Number(ad.price), 
          old_price: Number(ad.oldPrice) 
        })
        .eq('id', ad.id);

if (error) {
        console.error('Ошибка записи скидки в Supabase:', error);
        showToast('Сохранено локально (БД вернула ошибку)', 'warning');
      }
    } catch(err) {
      console.warn('Supabase discount network block:', err);
      showToast('Сохранено локально (сеть заблокирована браузером)', 'warning');
    }
	}

  closeModal('modal-quick-discount');
  renderCategoryPills();
  renderAds();

  const showcaseModal = byId('modal-shop-showcase');
  if (showcaseModal && !showcaseModal.classList.contains('hidden')) {
    openShopShowcase(ad.sellerUid || ad.sellerUsername);
  }
  const myShopModal = byId('modal-my-shop');
  if (myShopModal && !myShopModal.classList.contains('hidden')) {
    openMyShopModal();
  }
  const detailModal = byId('modal-ad-detail');
  if (detailModal && !detailModal.classList.contains('hidden')) {
    openAdDetail(ad.id, false);
  }

  showToast(`Скидка на "${ad.title}" установлена: $${ad.price.toFixed(2)}`, 'success');
}

async function removeQuickDiscountSubmit() {
  const adId = byId('quick-discount-ad-id')?.value;
  const ad = ads.find(a => a.id === adId) || currentDiscountTargetAd;
  if (!ad) {
    closeModal('modal-quick-discount');
    return;
  }

  if (ad.oldPrice) {
    ad.price = ad.oldPrice;
    ad.oldPrice = null;
    if (supabaseClient) {
      try {
        await supabaseClient.from('ads').update({ price: ad.price }).eq('id', ad.id);
      } catch(err) {}
    }
    saveCachedAds();
    renderCategoryPills();
    renderAds();
    showToast(t('Скидка отменена, возвращена базовая цена'), 'info');
  }
  closeModal('modal-quick-discount');
  if (byId('modal-shop-showcase') && !byId('modal-shop-showcase').classList.contains('hidden')) {
    openShopShowcase(ad.sellerUid || ad.sellerUsername);
  }
  if (byId('modal-ad-detail') && !byId('modal-ad-detail').classList.contains('hidden')) {
    openAdDetail(ad.id, false);
  }
}

let showcaseShopUserUid = null;
function openShopShowcase(shopUserUid, filterStoreCat = 'ALL') { 
  showcaseShopUserUid = shopUserUid;
  const seller = users.find(u => (u.uid && String(u.uid) === String(shopUserUid)) || (u.username && u.username.toLowerCase() === String(shopUserUid).toLowerCase()));
  if (!seller || !seller.shop) { showToast(t('Магазин не найден'), 'error'); return; } 
  const shop = seller.shop; 
  
  // Универсальный подсчет активных товаров витрины
  const shopAds = ads.filter(a => 
    ((a.sellerUid && seller.uid && String(a.sellerUid) === String(seller.uid)) ||
     (a.sellerUsername && seller.username && a.sellerUsername.toLowerCase() === seller.username.toLowerCase())) &&
    a.status === 'ACTIVE'
  ); 
  
  const cats = shop.customCategories || []; 
  const list = filterStoreCat === 'ALL' ? shopAds : shopAds.filter(a => a.storeCategory === filterStoreCat); 
  const c = byId('shop-showcase-content'); 
  if (!c) return; 
  const regionName = t(REGION_NAMES[shop.region] || shop.region || 'Сирия'); 
  const shopCombos = combos.filter(x => 
    (x.shopUid && seller.uid && String(x.shopUid) === String(seller.uid)) ||
    (x.sellerUsername && seller.username && x.sellerUsername.toLowerCase() === seller.username.toLowerCase())
  ).map(comboToVirtualAd).filter(Boolean); 

const isShopOwner = !!(currentUser && (
    (currentUser.uid && seller.uid && String(currentUser.uid) === String(seller.uid)) ||
    (currentUser.username && seller.username && currentUser.username.toLowerCase() === seller.username.toLowerCase()) ||
    currentUser.role === 'SUPERUSER' || 
    currentUser.role === 'ADMIN'
  ));

  if (currentLang === 'ar' && typeof translateDynamic === 'function') {
    if (shop.slogan) translateDynamic(shop.slogan, 'ar').then(res => { const el = byId('showcase-shop-slogan'); if (el) el.innerText = res; });
    if (shop.desc) translateDynamic(shop.desc, 'ar').then(res => { const el = byId('showcase-shop-desc'); if (el) el.innerText = res; });
  }

c.innerHTML = `<div class="space-y-4">
<div class="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4" style="border-color:rgba(147,51,234,.3);background:rgba(147,51,234,.08)">
  <div class="flex items-center gap-3">
    <div class="w-16 h-16 rounded-2xl bg-field border b-ig overflow-hidden shrink-0 flex items-center justify-center t2">${shop.logo ? `<img src="${shop.logo}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-store text-2xl"></i>'}</div>
    <div>
      <h3 class="text-base font-extrabold t1 flex items-center gap-1.5"><span>${shop.name}</span> ${IGSVG.verified()}</h3>
      <p id="showcase-shop-slogan" class="text-xs t2">${shop.slogan || ''}</p>
      <div class="flex items-center gap-2 text-[10px] t2 mt-1 flex-wrap"><span><i class="fa-solid fa-location-dot" style="color:#f59e0b"></i> ${regionName}${shop.address ? ', ' + shop.address : ''}</span>${shop.hours ? `<span>• <i class="fa-solid fa-clock"></i> ${shop.hours}</span>` : ''}<span>• <i class="fa-solid fa-boxes-stacked"></i> ${shopAds.length} ${t('товаров')}</span></div>
      <p id="showcase-shop-desc" class="text-[11px] t1 mt-1.5 leading-relaxed bg-field p-2.5 rounded-xl border b-ig">${shop.desc || ''}</p>
    </div>
  </div>
  <div class="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
    <a href="https://wa.me/${(shop.whatsapp || '').replace(/[^0-9]/g, '')}" target="_blank" class="px-4 py-2.5 text-white text-xs font-bold rounded-xl shrink-0 flex items-center justify-center gap-1.5 shadow-md" style="background:#25D366"><i class="fa-brands fa-whatsapp text-base"></i> ${t('Связаться')}</a>
    ${isShopOwner ? `<button onclick="openCreateShopModal('${seller.uid || seller.username}')" class="px-3.5 py-2.5 rounded-xl text-xs font-bold border b-ig bg-field hover:bg-ig t1 flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"><i class="fa-solid fa-gear text-purple-400"></i> ${t('Настройки')}</button>` : ''}
  </div>
</div>

${isShopOwner ? `
<div class="p-3.5 rounded-2xl border space-y-2.5 bg-field" style="border-color:rgba(147,51,234,.35)">
  <div class="flex items-center justify-between text-xs font-bold">
    <span class="t1 flex items-center gap-1.5"><i class="fa-solid fa-wand-magic-sparkles text-purple-400"></i> ${t('Панель управления магазином')}</span>
    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1" style="${(seller.verifiedShop || shop.isVerified) ? 'background:rgba(16,185,129,.15);color:#10b981;border-color:rgba(16,185,129,.4)' : 'background:rgba(245,158,11,.15);color:#f59e0b;border-color:rgba(245,158,11,.4)'}"><i class="fa-solid ${(seller.verifiedShop || shop.isVerified) ? 'fa-circle-check' : 'fa-hourglass-half'}"></i> ${(seller.verifiedShop || shop.isVerified) ? t('Подтвержден') : t('На проверке')}</span>
  </div>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
    <button onclick="closeModal('modal-shop-showcase'); openCreateAdModal();" class="py-2.5 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95" style="background:linear-gradient(45deg,#10b981,#14b8a6)">
      <i class="fa-solid fa-plus"></i> ${t('Добавить товар')}
    </button>
    <button onclick="openComboBuilder('${seller.uid || ''}')" class="py-2.5 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95" style="background:linear-gradient(45deg,#f97316,#ef4444)">
      <i class="fa-solid fa-fire"></i> ${t('Создать комбо')}
    </button>
    <button onclick="openCreateShopModal('${seller.uid || seller.username}')" class="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95" style="background:#9333ea">
      <i class="fa-solid fa-gear"></i> ${t('Редактировать магазин')}
    </button>
  </div>
</div>

${(() => {
  const max = shop.maxAds || 50;
  const cur = shopAds.length;
  const percent = Math.min(100, Math.round((cur / max) * 100));
  const left = Math.max(0, max - cur);
  const barColor = percent >= 90 ? '#ef4444' : (percent >= 75 ? '#f59e0b' : '#9333ea');
  return `
  <div class="p-3.5 rounded-2xl bg-field border b-ig space-y-2">
    <div class="flex items-center justify-between text-xs">
      <span class="font-bold t1 flex items-center gap-1.5"><i class="fa-solid fa-boxes-stacked" style="color:${barColor}"></i> ${t('Заполненность магазина')}</span>
      <span class="font-mono font-extrabold t1">${cur} / ${max} <span class="t2 font-normal text-[10px]">(${percent}%)</span></span>
    </div>
    <div class="w-full h-2.5 rounded-full bg-black/40 border b-ig overflow-hidden p-0.5">
      <div class="h-full rounded-full transition-all duration-300" style="width:${percent}%; background:${barColor}"></div>
    </div>
    <div class="flex items-center justify-between text-[10px] pt-0.5">
      <span class="t2">${left === 0 ? `<b style="color:#ef4444">${t('Лимит исчерпан')}</b>` : `${t('Осталось мест')}: <b class="t1">${left}</b>`}</span>
      <button onclick="upgradeShopLimitNow()" class="font-bold text-[10px] px-2.5 py-1 rounded-lg text-white transition-all active:scale-95" style="background:linear-gradient(45deg,#9333ea,#7c3aed)">
        <i class="fa-solid fa-arrow-up-from-bracket"></i> ${t('Расширить лимит (+50 мест / 5 AC)')}
      </button>
    </div>
  </div>`;
})()}

<div class="p-4 rounded-2xl bg-field border b-ig space-y-3">
  <h4 class="font-extrabold t1 text-xs flex items-center gap-1.5"><i class="fa-solid fa-list-check" style="color:#9333ea"></i> ${t('Личные категории магазина')}</h4>
  <div class="flex gap-2">
    <input type="text" id="new-shop-cat-input" placeholder="${t('Например: Запчасти или Чехлы')}" class="ig-input flex-1 px-3 py-2 text-xs">
    <button onclick="addShopCustomCategory()" class="px-3 py-2 text-white font-bold text-xs rounded-lg shrink-0" style="background:#9333ea"><i class="fa-solid fa-plus"></i> ${t('Добавить')}</button>
  </div>
  <div class="flex flex-wrap gap-1.5 pt-1">
    ${cats.length === 0 ? `<div class="text-[11px] t2">${t('Собственных категорий пока нет')}</div>` : cats.map((cat, idx) => `<span class="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-2 border" style="background:rgba(147,51,234,.12);color:#c084fc;border-color:rgba(147,51,234,.35)"><span>${cat}</span><button onclick="removeShopCustomCategory(${idx})" style="color:#ed4956"><i class="fa-solid fa-xmark"></i></button></span>`).join('')}
  </div>
</div>

<div class="p-4 rounded-2xl border space-y-3" style="border-color:rgba(147,51,234,.3);background:rgba(147,51,234,.06)">
  <h4 class="font-extrabold t1 text-xs flex items-center gap-1.5"><i class="fa-solid fa-database" style="color:#f59e0b"></i> ${t('Бэкап (JSON)')}</h4>
  <div class="grid grid-cols-2 gap-2">
    <button onclick="exportShopDatabaseJSON()" class="py-2.5 px-3 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5" style="background:#9333ea"><i class="fa-solid fa-download"></i> ${t('Экспорт')}</button>
    <label class="py-2.5 px-3 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer" style="background:#4f46e5"><i class="fa-solid fa-upload"></i> ${t('Импорт')}<input type="file" accept=".json" onchange="importShopDatabaseJSON(event)" class="hidden"></label>
  </div>
</div>` : ''}

<div id="showcase-shop-map" class="h-36 rounded-2xl border b-ig overflow-hidden bg-field z-0"></div>

${shopCombos.length > 0 ? `<div class="space-y-2"><div class="font-bold text-xs flex items-center gap-1.5" style="color:#f97316"><i class="fa-solid fa-fire"></i> ${t('Акции магазина:')}</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${shopCombos.map(v => {
  if (currentLang === 'ar' && typeof translateDynamic === 'function') {
    translateDynamic(v.title, 'ar').then(trans => {
      const el = document.getElementById(`showcase-combo-title-${v.id}`);
      if (el) el.innerText = trans;
    });
  }
  return `<div class="ig-card p-3 rounded-xl hover:bg-field flex flex-col justify-between gap-2"><div onclick="openAdDetail('${v.id}')" class="flex items-center gap-3 cursor-pointer"><img src="${v.image}" class="w-12 h-12 rounded-lg object-cover border b-ig shrink-0"><div class="flex-1 min-w-0"><div class="font-bold t1 text-xs truncate flex items-center gap-1"><i class="fa-solid fa-fire" style="color:#f97316"></i> <span id="showcase-combo-title-${v.id}">${v.title}</span></div><div class="text-[11px] font-extrabold" style="color:#f97316">$${Number(v.price).toFixed(2)} <span class="t2 line-through font-normal">$${v.comboOriginalTotal.toFixed(2)}</span></div><div class="text-[10px] t2">${v.comboItems.length} ${t('товаров в комплекте')}</div></div></div>${isShopOwner ? `<div class="flex items-center justify-end gap-1.5 pt-1.5 border-t b-ig"><button onclick="openComboBuilder('${seller.uid || ''}','${v.id}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold border" style="color:#f97316;border-color:rgba(249,115,22,.4);background:rgba(249,115,22,.12)"><i class="fa-solid fa-pen-to-square"></i> ${t('Изменить акцию')}</button><button onclick="deleteComboWithConfirm('${v.id}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold" style="color:#ed4956;background:rgba(237,73,86,.12)"><i class="fa-solid fa-trash"></i></button></div>` : ''}</div>`;
}).join('')}</div></div>` : ''}
${cats.length > 0 ? `<div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"><button onclick="openShopShowcase('${shopUserUid}','ALL')" class="px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 ${filterStoreCat === 'ALL' ? 'text-white' : 'b-ig t1'}" style="${filterStoreCat === 'ALL' ? 'background:#9333ea;border-color:#9333ea' : ''}">${t('Все товары')} (${shopAds.length})</button>${cats.map(cn => `<button onclick="openShopShowcase('${shopUserUid}','${String(cn).replace(/'/g, "\\'")}')" class="px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 ${filterStoreCat === cn ? 'text-white' : 'b-ig t1'}" style="${filterStoreCat === cn ? 'background:#9333ea;border-color:#9333ea' : ''}">${cn} (${shopAds.filter(a => a.storeCategory === cn).length})</button>`).join('')}</div>` : ''}
<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${list.length === 0 ? `<div class="col-span-full py-8 text-center t2">${t('Товаров пока нет')}</div>` : list.map(ad => {
  if (currentLang === 'ar' && typeof translateDynamic === 'function') {
    translateDynamic(ad.title, 'ar').then(trans => {
      const el = document.getElementById(`showcase-item-title-${ad.id}`);
      if (el) el.innerText = trans;
    });
  }
  return `<div class="ig-card p-2.5 rounded-xl hover:bg-field space-y-2 flex flex-col justify-between">
  <div onclick="openAdDetail('${ad.id}')" class="cursor-pointer space-y-2">
    <div class="h-28 rounded-lg overflow-hidden bg-black relative">
      <img src="${ad.images ? ad.images[0] : ad.image}" class="w-full h-full object-cover">
      ${ad.storeCategory ? `<span class="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style="background:rgba(147,51,234,.85)">${ad.storeCategory}</span>` : ''}
      ${ad.oldPrice && ad.oldPrice > ad.price ? `<span class="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style="background:#ef4444">-%${Math.round((1 - ad.price / ad.oldPrice) * 100)}</span>` : ''}
    </div>
    <div>
      <div id="showcase-item-title-${ad.id}" class="font-bold t1 text-xs truncate">${ad.title}</div>
      <div class="text-[11px] font-extrabold mt-0.5" style="color:#f59e0b">${convertPriceAll(ad.price, ad.currency, ad.isFree, ad.isNegotiable)}</div>
    </div>
  </div>
  ${isShopOwner ? `
  <div class="pt-1.5 border-t b-ig grid grid-cols-2 sm:grid-cols-3 gap-1">
    <button onclick="bumpAdToTop('${ad.id}')" class="py-1.5 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95 whitespace-nowrap overflow-hidden" style="background:rgba(16,185,129,.12);color:#10b981;border-color:rgba(16,185,129,.3)" title="${t('Поднять в ТОП')}">
      <i class="fa-solid fa-rocket text-[11px] shrink-0"></i> <span class="truncate">${t('В ТОП')}</span>
    </button>
    <button onclick="openQuickDiscountModal('${ad.id}')" class="py-1.5 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95 whitespace-nowrap overflow-hidden" style="background:rgba(239,68,68,.12);color:#ef4444;border-color:rgba(239,68,68,.3)" title="${t('Сделать скидку')}">
      <i class="fa-solid fa-percent text-[11px] shrink-0"></i> <span class="truncate">${t('Скидка')}</span>
    </button>
    <button onclick="openGiftForSpecificAd('${ad.id}')" class="py-1.5 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95 whitespace-nowrap overflow-hidden" style="background:rgba(16,185,129,.15);color:#10b981;border-color:rgba(16,185,129,.4)" title="${t('Товар + Подарок')}">
      <i class="fa-solid fa-gift text-[11px] shrink-0"></i> <span class="truncate">${t('+Подарок')}</span>
    </button>
    <button onclick="openComboBuilder('${seller.uid || ''}')" class="py-1.5 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95 whitespace-nowrap overflow-hidden" style="background:rgba(249,115,22,.12);color:#f97316;border-color:rgba(249,115,22,.3)" title="${t('Добавить в комбо')}">
      <i class="fa-solid fa-fire text-[11px] shrink-0"></i> <span class="truncate">${t('В комбо')}</span>
    </button>
    <button onclick="startShopAuction('${ad.id}')" class="py-1.5 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95 whitespace-nowrap overflow-hidden" style="background:rgba(147,51,234,.12);color:#c084fc;border-color:rgba(147,51,234,.3)" title="${t('Запустить аукцион')}">
      <i class="fa-solid fa-gavel text-[11px] shrink-0"></i> <span class="truncate">${t('Аукцион')}</span>
    </button>
    <button onclick="openEditAdModal('${ad.id}')" class="py-1.5 px-1 rounded-lg text-[10px] font-bold border b-ig t2 hover:bg-field flex items-center justify-center gap-1 transition active:scale-95 whitespace-nowrap overflow-hidden" title="${t('Редактировать')}">
      <i class="fa-solid fa-pen text-[11px] shrink-0"></i> <span class="truncate">${t('Изменить')}</span>
    </button>
  </div>` : ''}
</div>`;
}).join('')}</div>
</div>`;
  openModal('modal-shop-showcase');
  setTimeout(() => initShowcaseShopMap(shop.lat || 33.5138, shop.lng || 36.2765, shop.name), 200); 
} 
function initShowcaseShopMap(lat, lng, storeName) { 
  const el = byId('showcase-shop-map'); 
  if (!el || typeof L === 'undefined') return; 
  if (showcaseMap) { 
    showcaseMap.remove(); 
    showcaseMap = null; 
  } 
  showcaseMap = L.map('showcase-shop-map', { dragging: false, zoomControl: false }).setView([lat, lng], 13); 
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(showcaseMap); 
  L.marker([lat, lng]).addTo(showcaseMap).bindPopup(`<b>${storeName}</b>`).openPopup(); 
}

async function upgradeShopLimitNow() {
  if (!currentUser || !currentUser.shop) return;
  const curMax = currentUser.shop.maxAds || 50;
  const isFree = typeof isMasterFreeActive === 'function' && isMasterFreeActive();
  const upgradeCost = isFree ? 0 : 5;

  const confirmMsg = isFree
    ? `${t('Увеличить лимит магазина с')} ${curMax} ${t('до')} ${curMax + 50} ${t('объявлений бесплатно (Промо-режим)?')}`
    : `${t('Увеличить лимит магазина с')} ${curMax} ${t('до')} ${curMax + 50} ${t('объявлений за')} ${upgradeCost} AC?`;

  showConfirmModal(
    t('Расширение тарифа магазина'),
    confirmMsg,
    async () => {
      if (await _0xSCCharge(currentUser.uid, upgradeCost, t('Расширение тарифа магазина'))) {
        currentUser.shop.maxAds = curMax + 50;
        currentUser.shop.subscriptionPrice = (currentUser.shop.subscriptionPrice || 5) + upgradeCost;
        if (supabaseClient) {
          await supabaseClient.from('users').update({ shop: currentUser.shop }).eq('uid', currentUser.uid);
        }
        saveUserSession(currentUser, true);
        if (byId('modal-shop-showcase') && !byId('modal-shop-showcase').classList.contains('hidden')) {
          openShopShowcase(currentUser.uid);
        }
        if (byId('modal-my-shop') && !byId('modal-my-shop').classList.contains('hidden')) {
          openMyShopModal();
        }
        showToast(t('Лимит магазина успешно увеличен!'), 'success');
      }
    }
  );
}

function startShopAuction(adId) {
  const ad = ads.find(a => a.id === adId);
  if (!ad) return;
  const currentPrice = Number(ad.price || 0);
  const isAr = currentLang === 'ar';
  
  const promptPriceText = isAr 
    ? `حدد السعر الابتدائي لمزاد المنتج "${ad.title}" ($):`
    : `Укажите начальную цену для аукциона товара "${ad.title}" ($):`;

  const startPriceStr = prompt(promptPriceText, currentPrice ? (currentPrice * 0.8).toFixed(2) : '10');
  if (!startPriceStr) return;
  const startPrice = parseFloat(startPriceStr);
  if (isNaN(startPrice) || startPrice <= 0) {
    showToast(t('Некорректная начальная цена'), 'warning');
    return;
  }

  const promptHoursText = isAr
    ? 'مدة المزاد بالساعات (مثال: 24 أو 48):'
    : 'Длительность аукциона в часах (например, 24 или 48):';

  const hoursStr = prompt(promptHoursText, '24');
  const hours = Math.max(1, parseInt(hoursStr || '24', 10));
  const endsAt = Date.now() + hours * 60 * 60 * 1000;

  ad.oldPrice = ad.price;
  ad.price = startPrice;
  ad.desc = isAr
    ? `🔨 مزاد علني! السعر الابتدائي: $${startPrice.toFixed(2)}. ينتهي في: ${new Date(endsAt).toLocaleString()}. يرجى تقديم عروض الأسعار عبر واتساب!\n\n` + (ad.desc || '')
    : `🔨 АУКЦИОН! Начальная цена: $${startPrice.toFixed(2)}. Окончание: ${new Date(endsAt).toLocaleString()}. Предлагайте вашу ставку в WhatsApp!\n\n` + (ad.desc || '');

  if (supabaseClient) {
    supabaseClient.from('ads').update({ price: ad.price, old_price: ad.oldPrice, description: ad.desc }).eq('id', ad.id).then();
  }
  saveCachedAds();
  renderAds();
  renderCategoryPills();
  openMyShopModal();
  showToast(`${t('Аукцион запущен со стартовой цены')} $${startPrice.toFixed(2)}!`, 'success');
}

function openMyShopModal() { 
  if (!currentUser || !currentUser.shop) return; 
  const shop = currentUser.shop; 
  
  // Универсальный подсчет объявлений владельца: по UID и по username
  const shopAds = ads.filter(a => 
    (a.sellerUid && currentUser.uid && String(a.sellerUid) === String(currentUser.uid)) ||
    (a.sellerUsername && currentUser.username && a.sellerUsername.toLowerCase() === currentUser.username.toLowerCase())
  );
  
  const content = byId('my-shop-content'); 
  if (!content) return; 
  const isVerified = currentUser.verifiedShop || shop.isVerified; 
  const cats = shop.customCategories || []; 
  const regionName = REGION_NAMES[shop.region] || shop.region || 'Сирия'; 
  const myCombos = combos.filter(x => 
    (x.shopUid && currentUser.uid && String(x.shopUid) === String(currentUser.uid)) ||
    (x.sellerUsername && currentUser.username && x.sellerUsername.toLowerCase() === currentUser.username.toLowerCase())
  ); 
  
  content.innerHTML = `<div class="space-y-4">
<div class="flex items-center justify-between border-b b-ig pb-3">
<div class="flex items-center gap-3">
<div class="w-14 h-14 rounded-2xl bg-field border b-ig overflow-hidden shrink-0 flex items-center justify-center t2">${shop.logo ? `<img src="${shop.logo}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-store text-xl"></i>'}</div>
<div><h3 class="text-base font-extrabold t1 leading-snug">${shop.name}</h3><p class="text-xs t2 mt-0.5">${shop.slogan || ''}</p><div class="text-[10px] t2 mt-0.5"><i class="fa-solid fa-location-dot" style="color:#f59e0b"></i> ${regionName}</div></div>
</div>
<div class="flex flex-col items-end gap-1.5">
<span class="px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5" style="${isVerified ? 'background:rgba(16,185,129,.15);color:#10b981;border-color:rgba(16,185,129,.4)' : 'background:rgba(245,158,11,.15);color:#f59e0b;border-color:rgba(245,158,11,.4)'}"><i class="fa-solid ${isVerified ? 'fa-circle-check' : 'fa-hourglass-half'}"></i> ${isVerified ? t('Подтвержден') : t('На проверке')}</span>
<button onclick="openCreateShopModal()" class="px-2.5 py-1 rounded-lg text-[10px] font-bold border b-ig t1"><i class="fa-solid fa-gear"></i> ${t('Редактировать магазин')}</button>
</div>
</div>

<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
  <button onclick="openComboBuilder()" class="w-full py-2.5 px-2 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition" style="background:linear-gradient(45deg,#f97316,#ef4444)"><i class="fa-solid fa-fire"></i> ${t('Создать комбо')}</button>
  <button onclick="closeModal('modal-my-shop'); openShopShowcase(currentUser.uid);" class="w-full py-2.5 px-2 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition" style="background:linear-gradient(45deg,#dc2626,#ef4444)"><i class="fa-solid fa-tags"></i> ${t('Скидки витрины')}</button>
  <button onclick="closeModal('modal-my-shop'); openCreateAdModal();" class="col-span-2 sm:col-span-1 w-full py-2.5 px-2 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition" style="background:linear-gradient(45deg,#10b981,#14b8a6)"><i class="fa-solid fa-plus"></i> ${t('Добавить товар')}</button>
</div>

${myCombos.length > 0 ? `<div class="p-4 rounded-2xl border space-y-2" style="border-color:rgba(249,115,22,.3);background:rgba(249,115,22,.06)">
<h4 class="font-extrabold t1 text-xs flex items-center gap-1.5"><i class="fa-solid fa-fire" style="color:#f97316"></i> ${t('Мои акции')} (${myCombos.length})</h4>
${myCombos.map(x => {
  if (currentLang === 'ar' && typeof translateDynamic === 'function') {
    translateDynamic(x.title, 'ar').then(trans => {
      const el = document.getElementById(`my-shop-combo-title-${x.id}`);
      if (el) el.innerText = trans;
    });
  }
  return `<div class="bg-field p-2.5 rounded-xl border b-ig flex items-center justify-between gap-2"><div class="min-w-0"><div id="my-shop-combo-title-${x.id}" class="font-bold t1 text-xs truncate">${x.title}</div><div class="text-[10px] t2">${x.items.length} ${t('товаров')} • ${t('Цена акции:')} <b style="color:#f97316">$${Number(x.price).toFixed(2)}</b></div></div><div class="flex gap-1.5 shrink-0"><button onclick="openComboBuilder(null,'${x.id}')" class="px-2 py-1 rounded-lg text-[10px] font-bold border" style="color:#f97316;border-color:rgba(249,115,22,.4);background:rgba(249,115,22,.12)"><i class="fa-solid fa-pen-to-square"></i></button><button onclick="deleteComboWithConfirm('${x.id}')" class="px-2 py-1 rounded-lg text-[10px] font-bold" style="color:#ed4956;background:rgba(237,73,86,.12)"><i class="fa-solid fa-trash"></i></button></div></div>`;
}).join('')}
</div>` : ''}

${(() => {
  const max = shop.maxAds || 50;
  const activeOnly = shopAds.filter(a => a.status === 'ACTIVE').length;
  const cur = activeOnly;
  const percent = Math.min(100, Math.round((cur / max) * 100));
  const left = Math.max(0, max - cur);
  const barColor = percent >= 90 ? '#ef4444' : (percent >= 75 ? '#f59e0b' : '#9333ea');
  return `
  <div class="p-3.5 rounded-2xl bg-field border b-ig space-y-2">
    <div class="flex items-center justify-between text-xs">
      <span class="font-bold t1 flex items-center gap-1.5"><i class="fa-solid fa-boxes-stacked" style="color:${barColor}"></i> ${t('Заполненность магазина')}</span>
      <span class="font-mono font-extrabold t1">${cur} / ${max} <span class="t2 font-normal text-[10px]">(${percent}%)</span></span>
    </div>
    <div class="w-full h-2.5 rounded-full bg-black/40 border b-ig overflow-hidden p-0.5">
      <div class="h-full rounded-full transition-all duration-300" style="width:${percent}%; background:${barColor}"></div>
    </div>
    <div class="flex items-center justify-between text-[10px] pt-0.5">
      <span class="t2">${left === 0 ? `<b style="color:#ef4444">${t('Лимит исчерпан')}</b>` : `${t('Осталось мест')}: <b class="t1">${left}</b>`}</span>
      <button onclick="upgradeShopLimitNow()" class="font-bold text-[10px] px-2.5 py-1 rounded-lg text-white transition-all active:scale-95" style="background:linear-gradient(45deg,#9333ea,#7c3aed)">
        <i class="fa-solid fa-arrow-up-from-bracket"></i> ${t('Расширить лимит (+50 мест / 5 AC)')}
      </button>
    </div>
  </div>`;
})()}

<div class="p-4 rounded-2xl bg-field border b-ig space-y-3">
<h4 class="font-extrabold t1 text-xs flex items-center gap-1.5"><i class="fa-solid fa-list-check" style="color:#9333ea"></i> ${t('Личные категории магазина')}</h4>
<div class="flex gap-2"><input type="text" id="new-shop-cat-input" placeholder="${t('Например: Запчасти или Чехлы')}" class="ig-input flex-1 px-3 py-2 text-xs"><button onclick="addShopCustomCategory()" class="px-3 py-2 text-white font-bold text-xs rounded-lg shrink-0" style="background:#9333ea"><i class="fa-solid fa-plus"></i> ${t('Добавить')}</button></div>
<div class="flex flex-wrap gap-1.5 pt-1">${cats.length === 0 ? `<div class="text-[11px] t2">${t('Собственных категорий пока нет')}</div>` : cats.map((cat, idx) => `<span class="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-2 border" style="background:rgba(147,51,234,.12);color:#c084fc;border-color:rgba(147,51,234,.35)"><span>${cat}</span><button onclick="removeShopCustomCategory(${idx})" style="color:#ed4956"><i class="fa-solid fa-xmark"></i></button></span>`).join('')}</div>
</div>

<div class="p-4 rounded-2xl border space-y-3" style="border-color:rgba(147,51,234,.3);background:rgba(147,51,234,.06)">
<h4 class="font-extrabold t1 text-xs flex items-center gap-1.5"><i class="fa-solid fa-database" style="color:#f59e0b"></i> ${t('Бэкап (JSON)')}</h4>
<div class="grid grid-cols-2 gap-2"><button onclick="exportShopDatabaseJSON()" class="py-2.5 px-3 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5" style="background:#9333ea"><i class="fa-solid fa-download"></i> ${t('Экспорт')}</button><label class="py-2.5 px-3 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer" style="background:#4f46e5"><i class="fa-solid fa-upload"></i> ${t('Импорт')}<input type="file" accept=".json" onchange="importShopDatabaseJSON(event)" class="hidden"></label></div>
</div>

<div class="space-y-2 pt-2 border-t b-ig">
<h4 class="font-bold t1 text-xs">${t('Товары Вашего магазина:')}</h4>
<div class="space-y-2 max-h-64 overflow-y-auto pr-1">
${shopAds.length === 0 ? `<div class="text-center py-4 t2">${t('Товаров пока нет — нажмите «Добавить товар»')}</div>` : shopAds.map(a => {
  if (currentLang === 'ar' && typeof translateDynamic === 'function') {
    translateDynamic(a.title, 'ar').then(trans => {
      const el = document.getElementById(`my-shop-item-title-${a.id}`);
      if (el) el.innerText = trans;
    });
  }
  return `<div class="bg-field p-2.5 rounded-xl border b-ig flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <img src="${a.images ? a.images[0] : a.image}" class="w-10 h-10 rounded-lg object-cover border b-ig shrink-0">
        <div class="min-w-0">
          <div id="my-shop-item-title-${a.id}" class="font-bold t1 text-xs truncate">${a.title}</div>
          <div class="text-[10px] font-semibold" style="color:#f59e0b">${convertPriceAll(a.price, a.currency, a.isFree, a.isNegotiable)}</div>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        ${a.storeCategory ? `<span class="text-[9px] px-1.5 py-0.5 rounded font-bold" style="background:rgba(147,51,234,.15);color:#c084fc">${a.storeCategory}</span>` : ''}
        ${a.status === 'SOLD' ? `<span class="text-[9px] px-1.5 py-0.5 rounded font-bold" style="background:rgba(16,185,129,.15);color:#10b981">${t('Продано')}</span>` : ''}
      </div>
    </div>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-1.5 border-t b-ig">
      <button onclick="bumpAdToTop('${a.id}')" class="py-1 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95" style="background:rgba(16,185,129,.12);color:#10b981;border-color:rgba(16,185,129,.3)" title="${t('Поднять в ТОП')}">
        <i class="fa-solid fa-rocket"></i> ${t('В ТОП')}
      </button>
      <button onclick="openQuickDiscountModal('${a.id}')" class="py-1 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95" style="background:rgba(239,68,68,.12);color:#ef4444;border-color:rgba(239,68,68,.3)" title="${t('Сделать скидку')}">
        <i class="fa-solid fa-percent"></i> ${t('Скидка')}
      </button>
      <button onclick="openGiftForSpecificAd('${a.id}')" class="py-1 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95" style="background:rgba(16,185,129,.15);color:#10b981;border-color:rgba(16,185,129,.4)" title="${t('Товар + Подарок')}">
        <i class="fa-solid fa-gift"></i> ${t('+Подарок')}
      </button>
      <button onclick="openComboBuilder('${currentUser.uid}')" class="py-1 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95" style="background:rgba(249,115,22,.12);color:#f97316;border-color:rgba(249,115,22,.3)" title="${t('В комбо')}">
        <i class="fa-solid fa-fire"></i> ${t('В комбо')}
      </button>
      <button onclick="startShopAuction('${a.id}')" class="py-1 px-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition active:scale-95" style="background:rgba(147,51,234,.12);color:#c084fc;border-color:rgba(147,51,234,.3)" title="${t('Запустить аукцион')}">
        <i class="fa-solid fa-gavel"></i> ${t('Аукцион')}
      </button>
      <button onclick="openEditAdModal('${a.id}')" class="py-1 px-1 rounded-lg text-[10px] font-bold border b-ig t2 hover:bg-field flex items-center justify-center gap-1 transition active:scale-95" title="${t('Редактировать')}">
        <i class="fa-solid fa-pen"></i> ${t('Изменить')}
      </button>
    </div>
  </div>`;
}).join('')}
</div>
</div>
</div>`; 
  openModal('modal-my-shop');
  }

async function addShopCustomCategory() {
  if (!currentUser || !currentUser.shop) return;
  const input = byId('new-shop-cat-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  if (!currentUser.shop.customCategories) currentUser.shop.customCategories = [];
  if (currentUser.shop.customCategories.includes(val)) {
    showToast('Такая категория уже есть!', 'warning');
    return;
  }
  currentUser.shop.customCategories.push(val);
  if (supabaseClient && currentUser.uid) {
    await supabaseClient.from('users').update({ shop: currentUser.shop }).eq('uid', currentUser.uid);
  }
  saveUserSession(currentUser, true);
  if (byId('modal-shop-showcase') && !byId('modal-shop-showcase').classList.contains('hidden')) {
    openShopShowcase(currentUser.uid);
  }
  if (byId('modal-my-shop') && !byId('modal-my-shop').classList.contains('hidden')) {
    openMyShopModal();
  }
  showToast(`Категория "${val}" добавлена!`, 'success');
}

async function removeShopCustomCategory(index) {
  if (!currentUser || !currentUser.shop || !currentUser.shop.customCategories) return;
  currentUser.shop.customCategories.splice(index, 1);
  if (supabaseClient && currentUser.uid) {
    await supabaseClient.from('users').update({ shop: currentUser.shop }).eq('uid', currentUser.uid);
  }
  saveUserSession(currentUser, true);
  if (byId('modal-shop-showcase') && !byId('modal-shop-showcase').classList.contains('hidden')) {
    openShopShowcase(currentUser.uid);
  }
  if (byId('modal-my-shop') && !byId('modal-my-shop').classList.contains('hidden')) {
    openMyShopModal();
  }
  showToast('Категория удалена', 'info');
}

function exportShopDatabaseJSON() {
  if (!currentUser || !currentUser.shop) return;
  const d = { version: '1.1', type: 'AVITO_SHAM_SHOP_BACKUP', exportDate: new Date().toISOString(), shop: currentUser.shop, products: ads.filter(a => a.sellerUsername && a.sellerUsername.toLowerCase() === currentUser.username.toLowerCase()), combos: combos.filter(x => x.sellerUsername && x.sellerUsername.toLowerCase() === currentUser.username.toLowerCase()) };
  const a = document.createElement('a');
  a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(d, null, 2));
  a.download = `Shop_Backup_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('Бэкап магазина выгружен!', 'success');
}

async function exportFullDatabaseJSON() {
  if (!currentUser || (currentUser.role !== 'SUPERUSER' && currentUser.role !== 'ADMIN')) {
    showToast('Доступ запрещен', 'error');
    return;
  }
  try {
    showToast('Архивация объявлений и конвертация всех фотографий в Base64...', 'info');

    const backupId = 'BK-' + Date.now();
    const exportDate = new Date().toISOString();

    // 1. Конвертируем все фотографии объявлений в автономный формат Base64
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
      version: '4.0_FULL_MEDIA',
      type: 'AVITO_SHAM_FULL_PLATFORM_BACKUP',
      exportDate: exportDate,
      users: packagedUsers,
      archivedUsers: archivedUsers,
      ads: packagedAds,
      categories: categories,
      combos: combos,
      rates: EXCHANGE_RATES,
      reports: reports
    };

    if (typeof BACKUPS_META === 'object') {
      BACKUPS_META[backupId] = {
        type: 'full_with_media',
        exportDate: exportDate,
        by: currentUser.uid || currentUser.username || 'admin'
      };
      if (typeof saveBackupsMeta === 'function') saveBackupsMeta();
    }

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AvitoSham_FullMedia_DB_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    if (byId('admin-backup-list') && typeof renderBackupList === 'function') {
      renderBackupList();
    }
    showToast('Полный медиа-бэкап (текст + фото) успешно выгружен!', 'success');
  } catch (err) {
    console.error('Export error:', err);
    showToast('Ошибка создания полного бэкапа', 'error');
  }
}

function importFullDatabaseJSON(event) {
  if (!currentUser || (currentUser.role !== 'SUPERUSER' && currentUser.role !== 'ADMIN')) return;
  const f = event.target.files[0]; if (!f) return;
  showConfirmModal('Импорт полной БД с медиа', 'Восстановить базу данных и загрузить все фотографии в Supabase Storage?', () => {
    const r = new FileReader();
    r.onload = async e => {
      try {
        const d = JSON.parse(e.target.result);
        showToast('Загружаем данные и разворачиваем фото в Supabase Storage...', 'info');

        const rawAds = d.ads || [];
        const restoredAds = [];

        for (const a of rawAds) {
          const rawImgs = Array.isArray(a.images) ? a.images : [a.image].filter(Boolean);
          const newUrls = [];

          for (const imgItem of rawImgs) {
            // Если в бэкапе лежит Base64-фото, сохраняем его в Storage бакета listings
            if (typeof imgItem === 'string' && imgItem.startsWith('data:image')) {
              try {
                const res = await fetch(imgItem);
                const blob = await res.blob();
                const filePath = `public/restored_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
                const { error: upErr } = await supabaseClient.storage.from('listings').upload(filePath, blob, { contentType: 'image/jpeg', upsert: false });
                if (!upErr) {
                  const { data: pubData } = supabaseClient.storage.from('listings').getPublicUrl(filePath);
                  newUrls.push(pubData.publicUrl);
                } else {
                  newUrls.push(imgItem);
                }
              } catch(err) {
                newUrls.push(imgItem);
              }
            } else {
              newUrls.push(imgItem);
            }
          }

          restoredAds.push({
            id: a.id,
            title: a.title,
            category: a.category,
            store_category: a.storeCategory || a.store_category || '',
            region: a.region || 'DAM',
            city: a.city || '',
            is_women_only: !!a.isWomenOnly,
            is_free: !!a.isFree,
            is_negotiable: !!a.isNegotiable,
            price: Number(a.price || 0),
            old_price: ((a.oldPrice || a.old_price) && Number(a.oldPrice || a.old_price) > Number(a.price)) ? Number(a.oldPrice || a.old_price) : null,
            currency: a.currency || 'USD',
            description: a.desc || a.description || '',
            images: newUrls,
            image: newUrls[0] || a.image,
            lat: Number(a.lat || 33.5138),
            lng: Number(a.lng || 36.2765),
            seller_username: a.sellerUsername || a.seller_username || '',
            seller_uid: a.sellerUid || a.seller_uid || '',
            seller_kunya: a.sellerKunya || a.seller_kunya || '',
            seller_whatsapp: a.sellerWhatsapp || a.seller_whatsapp || '',
            status: a.status || 'ACTIVE',
            created_at: Number(a.createdAt || a.created_at || Date.now()),
            queue: Array.isArray(a.queue) ? a.queue : [],
            likes: Array.isArray(a.likes) ? a.likes : [],
            views: Number(a.views || 0)
          });
        }

        if (restoredAds.length && supabaseClient) {
          await supabaseClient.from('ads').upsert(restoredAds);
        }

        const rawUsers = d.users || [];
        if (Array.isArray(rawUsers) && supabaseClient) {
          const dbUsers = rawUsers.map(u => ({
            uid: u.uid,
            username: u.username,
            password_hash: u.passwordHash || u.password_hash || '',
            kunya: u.kunya,
            gender: u.gender || 'MALE',
            whatsapp: u.whatsapp,
            avatar: u.avatar,
            role: u.role || 'USER',
            verified_shop: !!(u.verifiedShop || u.verified_shop),
            avitocash_balance: Number(u.avitocashBalance ?? u.shamcashBalance ?? 0),
            trial_balance: Number(u.trialBalance || 10),
            show_women_ads: !!u.showWomenAds,
            shop: u.shop || null,
            receipts: u.receipts || null
          }));
          await supabaseClient.from('users').upsert(dbUsers);
        }

        if (Array.isArray(d.categories) && supabaseClient) {
          await supabaseClient.from('categories').upsert(d.categories);
        }

        if (Array.isArray(d.combos) && supabaseClient) {
          const dbCombos = d.combos.map(c => ({
            id: c.id,
            shop_uid: c.shopUid || c.shop_uid || '',
            seller_username: c.sellerUsername || c.seller_username || '',
            title: c.title,
            price: Number(c.price || 0),
            items: Array.isArray(c.items) ? c.items : [],
            created_at: Number(c.createdAt || c.created_at || Date.now())
          }));
          await supabaseClient.from('combos').upsert(dbCombos);
        }

        showToast('Полный медиа-бэкап восстановлен!', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) { 
        console.error(err);
        showToast('Ошибка импорта: ' + err.message, 'error'); 
      }
    };
    r.readAsText(f);
  });
}

function applyManualRates() {
  const s = parseFloat(byId('rate-syp-input').value), t = parseFloat(byId('rate-try-input').value);
  if (isNaN(s) || isNaN(t) || s <= 0 || t <= 0) { showToast('Некорректные значения', 'error'); return; }
  EXCHANGE_RATES.SYP = +s.toFixed(2);
  EXCHANGE_RATES.TRY = +t.toFixed(2);
  lastRatesUpdate = new Date();
  localStorage.setItem('bs_manual_rates', JSON.stringify(EXCHANGE_RATES));
  renderAds();
  showToast(`Курс сохранен: $1 = ${EXCHANGE_RATES.SYP} SYP / ${EXCHANGE_RATES.TRY} TRY`, 'success');
}

function deleteBackupMeta(id) {
  delete BACKUPS_META[id];
  saveBackupsMeta();
  showToast('Запись удалена из журнала', 'info');
  if (byId('admin-backup-list')) renderBackupList();
}

async function recreateAndDownloadBackup(id) {
  if (!id) return;
  const meta = BACKUPS_META && BACKUPS_META[id];
  if (!meta) { showToast('Метаданные не найдены', 'error'); return; }
  showToast('Генерация снимка для скачивания...', 'info');
  try {
    if (meta.type === 'full') {
      const d = { version: '3.1', type: 'AVITO_SHAM_FULL_PLATFORM_BACKUP', exportDate: new Date().toISOString(), users, archivedUsers, ads, categories, combos, rates: EXCHANGE_RATES, reports: reports };
      const a = document.createElement('a');
      a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(d, null, 2));
      a.download = `AvitoSham_FullDB_${id}_${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      showToast('Снимок сгенерирован', 'success');
    } else if (meta.type === 'shop') {
      const uid = meta.shopUid || meta.by;
      const owner = users.find(u => u.uid === uid);
      const shop = owner ? owner.shop : null;
      const products = ads.filter(a => owner && a.sellerUsername && a.sellerUsername.toLowerCase() === (owner.username || '').toLowerCase());
      const shopCombos = combos.filter(c => c.shopUid === uid);
      const d = { version: '1.1', type: 'AVITO_SHAM_SHOP_BACKUP', exportDate: new Date().toISOString(), shop, products, combos: shopCombos };
      const a = document.createElement('a');
      a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(d, null, 2));
      a.download = `Shop_Backup_${uid}_${id}_${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      showToast('Снимок магазина сгенерирован', 'success');
    } else {
      showToast('Неизвестный тип бэкапа', 'error');
    }
  } catch (e) {
    showToast('Ошибка генерации снимка', 'error');
    console.error(e);
  }
}

function openComboBuilder(targetUid = null, editComboId = null) { 
  let owner = currentUser; 
  if (targetUid && currentUser && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN')) { 
    const t = users.find(u => u.uid === targetUid); 
    if (t) owner = t; 
  } 
  if (!owner) { 
    openAuthModal(); 
    return; 
  } 
if (!owner.shop) { 
    showToast(t('Сначала откройте магазин!'), 'warning'); 
    return; 
  }
  comboOwnerCache = owner; 
  byId('combo-target-uid').value = owner.uid || ''; 
  byId('combo-edit-id').value = editComboId || ''; 
  const editing = editComboId ? combos.find(x => x.id === editComboId) : null; 
  comboSelectedIds = editing ? [...editing.items] : []; 
  byId('combo-title').value = editing ? (editing.title || '') : ''; 
  byId('combo-price').value = editing ? editing.price : ''; 
  comboBuilderAds = ads.filter(a => a.sellerUsername && a.sellerUsername.toLowerCase() === owner.username.toLowerCase() && a.status === 'ACTIVE'); 
const builderTitleText = editing ? t('Редактирование акции') : `${t('Новая акция — магазин')} «${owner.shop.name || ''}»`;
  byId('combo-builder-title').innerHTML = `<i class="fa-solid fa-fire" style="color:#f97316"></i> ${builderTitleText}`; 
  
  const comboNote = document.querySelector('#modal-combo-builder .p-3.rounded-xl.border');
  if (comboNote) comboNote.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${t('Выберите несколько товаров и назначьте одну специальную цену комплекта. Цены товаров по отдельности не меняются, а комбо появится в ленте отдельным объявлением.')}`;
  
  const comboTitleInp = byId('combo-title');
  if (comboTitleInp) comboTitleInp.placeholder = t('Название акции (напр.: Комплект солнечной энергетики)');
  const comboPriceInp = byId('combo-price');
  if (comboPriceInp) comboPriceInp.placeholder = t('Специальная цена комплекта, $ *');
  const comboItemsLbl = document.querySelector('#modal-combo-builder label');
  if (comboItemsLbl) comboItemsLbl.innerText = t('Товары в комплекте (минимум 2) *');
  const comboSubBtn = document.querySelector('#modal-combo-builder button[type="submit"]');
  if (comboSubBtn) comboSubBtn.innerHTML = `<i class="fa-solid fa-fire"></i> ${t('Сохранить акцию')}`;

  renderComboItemsList(); 
  updateComboSummary(); 
  openModal('modal-combo-builder'); 
}

function toggleComboItem(adId) { 
  const i = comboSelectedIds.indexOf(adId); 
  if (i === -1) comboSelectedIds.push(adId); 
  else comboSelectedIds.splice(i, 1); 
  renderComboItemsList(); 
  updateComboSummary(); 
}

function handleComboSubmit(e) { 
  e.preventDefault(); 
  const owner = comboOwnerCache; 
  if (!owner) return; 
  if (comboSelectedIds.length < 2) { 
    showToast(t('Выберите минимум 2 товара!'), 'warning'); 
    return; 
  } 
  const price = parseFloat(byId('combo-price').value); 
  if (isNaN(price) || price <= 0) { 
    showToast(t('Укажите специальную цену акции!'), 'warning'); 
    return; 
  } 
  const title = byId('combo-title').value.trim() || `${t('Комбо-набор из')} ${comboSelectedIds.length} ${t('товаров')}`; 
  const editId = byId('combo-edit-id').value; 
  if (editId) { 
    const c = combos.find(x => x.id === editId); 
    if (c) { 
      c.title = title; 
      c.price = price; 
      c.items = [...comboSelectedIds]; 
      if (supabaseClient) supabaseClient.from('combos').upsert(c).then(); 
    } 
    showToast(t('Акция обновлена!'), 'success');
	} else { 
    const nc = { 
      id: 'COMBO-' + Date.now(), 
      shop_uid: owner.uid || '', 
      seller_username: owner.username, 
      title, 
      price: Number(price), 
      items: [...comboSelectedIds], 
      created_at: Date.now() 
    }; 
    
    // Дублируем поля для локального массива и для Supabase, чтобы имена колонок совпадали
    const localCombo = { 
      id: nc.id, 
      shopUid: nc.shop_uid, 
      sellerUsername: nc.seller_username, 
      title: nc.title, 
      price: nc.price, 
      items: nc.items, 
      createdAt: nc.created_at 
    };

    combos.push(localCombo); 

    if (supabaseClient) {
      supabaseClient.from('combos').upsert(nc).then(({ error }) => {
        if (error) {
          console.error('Ошибка сохранения комбо в Supabase:', error);
          showToast('Ошибка сохранения акции в базе', 'error');
        }
      });
    } 
    showToast('Акция создана и сохранена в базу!', 'success'); 
  }
  closeModal('modal-combo-builder'); 
  renderAds(); 
  renderCategoryPills(); 
  if (!byId('modal-my-shop').classList.contains('hidden')) openMyShopModal(); 
  if (!byId('modal-admin-panel').classList.contains('hidden')) renderAdminTabContent(); 
  if (!byId('modal-shop-showcase').classList.contains('hidden') && owner.uid) openShopShowcase(owner.uid); 
}

function deleteComboWithConfirm(comboId) { 
  showConfirmModal(t('Удаление акции'), t('Удалить эту акцию? Комбо-объявление исчезнет из ленты, товары останутся со своими ценами.'), () => { 
    combos = combos.filter(x => x.id !== comboId); 
    if (supabaseClient) supabaseClient.from('combos').delete().eq('id', comboId).then(); 
    closeModal('modal-ad-detail'); 
    renderAds(); 
    renderCategoryPills(); 
    if (!byId('modal-my-shop').classList.contains('hidden')) openMyShopModal(); 
    if (!byId('modal-admin-panel').classList.contains('hidden')) renderAdminTabContent(); 
    showToast(t('Акция удалена'), 'info'); 
  }); 
}

function openComboDetail(comboId) { 
  const c = combos.find(x => x.id === comboId); 
  if (!c) return; 
  const v = comboToVirtualAd(c); 
  if (!v) { 
    showToast(t('Товары этой акции больше недоступны'), 'warning'); 
    return; 
  } 
  const content = byId('detail-content'); 
  if (!content) return; 
  currentDetailPhotoIndex = 0; 
  const imgs = v.images; 
  const owner = getComboOwner(c); 
  const shop = owner?.shop; 
  const wa = shop?.whatsapp || owner?.whatsapp || ''; 
  const canManage = currentUser && (currentUser.role === 'SUPERUSER' || currentUser.role === 'ADMIN' || (owner && currentUser.username.toLowerCase() === owner.username.toLowerCase())); 
  const save = v.comboOriginalTotal - c.price; 
  const isAr = currentLang === 'ar';
  const regionName = t(REGION_NAMES[v.region] || v.region || 'Сирия');

  const waMsg = isAr
    ? `السلام عليكم ورحمة الله!\nأود طلب العرض الخاص على *أفيتو الشام*:\n🔥 *${c.title}* (كود: ${c.id})\n💰 *السعر:* $${Number(c.price).toFixed(2)}\n👤 *المشتري:* ${currentUser ? (currentUser.kunya || currentUser.username) : 'زائر'}`
    : `Здравствуйте!\nХочу заказать комбо-набор на *Avito Sham*:\n🔥 *${c.title}* (ID: ${c.id})\n💰 *Цена:* $${Number(c.price).toFixed(2)}\n👤 *Покупатель:* ${currentUser ? (currentUser.kunya || currentUser.username) : 'Гость'}`;
  
  content.innerHTML = `<div class="grid md:grid-cols-2 h-full max-h-[90vh]">
<div class="relative bg-black flex items-center justify-center overflow-hidden h-full min-h-[320px] max-h-[46vh] md:max-h-[90vh] select-none" ontouchstart="handleTouchSwipeStart(event)" ontouchend="handleTouchSwipeEnd(event, (dir) => changeDetailPhoto('${c.id}', dir))">
<div id="detail-bg-blur" class="absolute inset-0 bg-cover bg-center blur-lg opacity-30 scale-110" style="background-image:url('${imgs[0]}')"></div>
<img id="detail-main-img" src="${imgs[0]}" class="relative w-full h-full max-h-[46vh] md:max-h-[90vh] object-contain z-[1] cursor-pointer" onclick="openFullscreenViewer(this.src, '${c.id}')">
<span class="absolute top-3 left-3 z-10 px-3 py-1 rounded-lg text-xs font-extrabold text-white flex items-center gap-1.5" style="background:linear-gradient(45deg,#f97316,#ef4444)"><i class="fa-solid fa-fire"></i> ${t('АКЦИЯ')} • ${v.comboItems.length} ${t('товаров')}</span>
${imgs.length > 1 ? `<button type="button" onclick="event.stopPropagation(); changeDetailPhoto('${c.id}', -1, event);" class="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow hover:bg-white active:scale-95 transition-transform cursor-pointer">${IGSVG.chevL()}</button><button type="button" onclick="event.stopPropagation(); changeDetailPhoto('${c.id}', 1, event);" class="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow hover:bg-white active:scale-95 transition-transform cursor-pointer">${IGSVG.chevR()}</button><div id="detail-photo-counter" class="absolute bottom-3 right-3 z-10 bg-black/70 text-white px-2.5 py-1 rounded-lg text-[11px] font-mono">1 / ${imgs.length}</div>` : ''}

</div>
<div class="flex flex-col p-4 space-y-3 text-sm overflow-y-auto max-h-[90vh] modal-scroll-body">
<div class="flex items-center gap-3 pb-3 border-b b-ig shrink-0">
<div class="w-9 h-9 rounded-full overflow-hidden border b-ig bg-field flex items-center justify-center t2">${shop?.logo ? `<img src="${shop.logo}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-store"></i>'}</div>
<div class="flex-1 min-w-0"><div class="text-sm font-semibold t1 flex items-center gap-1.5">${shop?.name || v.sellerKunya} ${v.verified ? IGSVG.verified() : ''}</div><div class="text-xs t2">${regionName}</div></div>
</div>
<h2 id="combo-detail-title" class="text-base font-bold t1">${c.title}</h2>
<div class="p-3 rounded-xl border b-ig bg-field space-y-1">
<div class="text-lg font-extrabold" style="color:#f97316">$${Number(c.price).toFixed(2)} <span class="t2 text-xs font-normal">${t('цена комплекта')}</span></div>
<div class="text-xs t2">${t('По отдельности:')} <s>$${v.comboOriginalTotal.toFixed(2)}</s>${save > 0 ? ` • <b style="color:#10b981">${t('выгода')} $${save.toFixed(2)}</b>` : ''}</div>
</div>
<div class="space-y-2"><div class="text-xs font-bold t2 uppercase tracking-wide">${t('Состав комбо-набора:')}</div>
${v.comboItems.map((it, idx) => `<div onclick="openAdDetail('${it.id}')" class="bg-field p-2.5 rounded-xl border b-ig hover:bg-ig flex items-center gap-3 cursor-pointer"><img src="${(it.images && it.images[0]) || it.image}" class="w-11 h-11 rounded-lg object-cover border b-ig shrink-0"><div class="flex-1 min-w-0"><div id="combo-item-title-${idx}" class="font-bold t1 text-xs truncate">${it.title}</div><div class="text-[10px] t2">${it.city || ''}</div></div><div class="text-[11px] font-bold t1 shrink-0">${convertPriceAll(it.price, it.currency, it.isFree, it.isNegotiable)}</div></div>`).join('')}
</div>
<div class="flex gap-2 pt-2">
<a href="https://wa.me/${(wa || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMsg)}" target="_blank" class="flex-1 py-3 rounded-lg text-white text-xs font-extrabold flex items-center justify-center gap-2" style="background:#25D366"><i class="fa-brands fa-whatsapp text-lg"></i> ${t('Заказать комплект')}</a>
<button onclick="shareAd('${c.id}')" class="ig-btn-outline py-3 px-4" title="${t('Поделиться')}">${IGSVG.send()}</button>
</div>
${canManage ? `<div class="pt-2 border-t b-ig flex gap-2"><button onclick="openComboBuilder('${owner?.uid || ''}','${c.id}')" class="flex-1 py-2.5 rounded-lg text-xs font-semibold border b-ig" style="color:#f97316"><i class="fa-solid fa-pen-to-square"></i> ${t('Изменить акцию')}</button><button onclick="deleteComboWithConfirm('${c.id}')" class="ig-btn-danger py-2.5 px-4 text-xs"><i class="fa-solid fa-trash"></i></button></div>` : ''}
</div>
</div>`; 
  openModal('modal-ad-detail'); 

  if (isAr && typeof translateDynamic === 'function') {
    translateDynamic(c.title, 'ar').then(tTitle => {
      const tEl = byId('combo-detail-title');
      if (tEl) tEl.innerText = tTitle;
    });
    v.comboItems.forEach((it, idx) => {
      translateDynamic(it.title, 'ar').then(itTitle => {
        const itEl = byId(`combo-item-title-${idx}`);
        if (itEl) itEl.innerText = itTitle;
      });
    });
  }
}


function sendPriceOffer(adId) { 
  const ad = ads.find(a => a.id === adId); 
  if (!ad) return; 
  const inp = byId('offer-price-input'); 
  const val = inp ? inp.value.trim() : ''; 
  if (!val || isNaN(parseFloat(val)) || parseFloat(val) <= 0) { 
    showToast(currentLang === 'ar' ? 'الرجاء إدخال السعر المقترح' : 'Введите вашу предложенную цену', 'warning'); 
    return; 
  } 
  const wa = getSellerWhatsapp(ad); 
  const isAr = currentLang === 'ar';
  const sender = currentUser 
    ? (currentUser.whatsapp ? `${currentUser.kunya || currentUser.username} (${currentUser.whatsapp})` : currentUser.username) 
    : (isAr ? 'زائر للمنصة' : 'Гость платформы'); 
  
  const msg = isAr 
    ? `السلام عليكم ورحمة الله!\nبخصوص إعلانك على *أفيتو الشام*:\n📦 *${ad.title}* (كود: ${ad.id})\n🤝 *أقترح شراء المنتج بسعر:* $${parseFloat(val).toFixed(2)}\n👤 *المرسل:* ${sender}`
    : `Здравствуйте!\nПо объявлению "${ad.title}" (${ad.id}) на *Avito Sham* предлагаю цену: $${parseFloat(val).toFixed(2)}.\n👤 *От:* ${sender}`; 

window.open(`https://wa.me/${(wa || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank'); 
  showToast(isAr ? 'جاري إرسال عرض السعر عبر واتساب...' : 'Ваше предложение цены отправляется через WhatsApp', 'success'); 
}

function handleCategoryClick(catId) {
  selectedCategory = catId;
  currentPage = 1;
  renderCategoryPills();
  renderAds();
}
window.toggleDriveBackup = function() {
  const isEnabled = byId('cfg-drive-enable').checked;
  byId('drive-cfg-block').classList.toggle('opacity-50', !isEnabled);
  byId('drive-cfg-block').classList.toggle('pointer-events-none', !isEnabled);
};

window.saveDriveConfig = function() {
  DRIVE_BACKUP_CONFIG.gasUrl = byId('cfg-drive-url').value.trim();
  DRIVE_BACKUP_CONFIG.intervalHours = Number(byId('cfg-drive-interval').value) || 12;
  DRIVE_BACKUP_CONFIG.enabled = byId('cfg-drive-enable').checked;
  localStorage.setItem('bs_drive_backup', JSON.stringify(DRIVE_BACKUP_CONFIG));
  initDriveAutoBackup();
  showToast(t('Настройки авто-бэкапа сохранены'), 'success');
};
