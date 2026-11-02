/* =====================================================================
   secure.js — безопасный слой между сайтом и Supabase.
   Подключается ПОСЛЕ api.js, ui.components.js и handlers.js.

   Что делает:
   • вход по паролю проверяется на сервере, браузер получает токен сессии;
   • все записи в базу (деньги, роли, объявления, магазины…) идут через
     серверные функции app_*, которые сами проверяют, кто и что может менять;
   • коды WhatsApp создаёт и проверяет сервер (браузер кода не видит);
   • вход через Telegram проверяется по подписи Telegram.
   ===================================================================== */
(function () {
  'use strict';
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

  const real = supabaseClient;
  const GATEWAY = 'https://whatsapp-gateway-kohl.vercel.app';
  const TOKEN_KEY = 'bs_token';
  const STAFF = ['ADMIN', 'SUPERUSER'];

  /* ---------------------------------------------------------- токен ---- */
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t, remember) {
    try {
      localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
      if (t) (remember === false ? sessionStorage : localStorage).setItem(TOKEN_KEY, t);
    } catch (e) {}
  }
  const isStaff = () => !!(typeof currentUser !== 'undefined' && currentUser && STAFF.includes(currentUser.role));

  function localLogout(msg) {
    setToken('');
    try { localStorage.removeItem('bs_current_user'); sessionStorage.removeItem('bs_current_user'); } catch (e) {}
    if (typeof currentUser !== 'undefined' && currentUser) {
      currentUser = null;
      try { if (typeof updateAuthUI === 'function') updateAuthUI(); } catch (e) {}
      if (msg && typeof showToast === 'function') showToast(msg, 'warning');
    }
  }
  function onAuthExpired() { localLogout('Сессия истекла. Войдите в аккаунт заново.'); }

  /* ------------------------------------------- вызов серверных функций -- */
  async function call(name, args) {
    const r = await real.rpc(name, Object.assign({ p_token: getToken() }, args || {}));
    if (r.error) throw new Error(r.error.message || 'Ошибка соединения');
    if (r.data && r.data.code === 'AUTH') onAuthExpired();
    return r.data || {};
  }
  async function callPublic(name, args) {
    const r = await real.rpc(name, args || {});
    if (r.error) throw new Error(r.error.message || 'Ошибка соединения');
    return r.data || {};
  }
  async function gateway(path, body) {
    let res, data = {};
    try {
      res = await fetch(GATEWAY + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      data = await res.json().catch(() => ({}));
    } catch (e) { throw new Error('Нет связи со шлюзом WhatsApp. Попробуйте позже.'); }
    if (!res.ok || data.success === false) throw new Error(data.error || 'Ошибка шлюза');
    return data;
  }
  const sendOtp = (phone, purpose, login) => gateway('/otp/send', { phone, purpose, login });
  async function checkOtp(reqId, code) {
    const r = await callPublic('app_otp_check', { p_req_id: reqId, p_code: String(code || '').trim() });
    if (!r.success) throw new Error(r.error || 'Неверный код');
    return r.ticket;
  }

  /* ---------------------------------------- мой профиль (с сервера) ----- */
  let meCache = null, mePromise = null;
  function refreshMe(force) {
    if (!getToken()) return Promise.resolve(null);
    if (!force && mePromise) return mePromise;
    mePromise = real.rpc('app_me', { p_token: getToken() }).then(r => {
      const d = r.data;
      if (d && d.success) { meCache = d.user; return meCache; }
      if (d && d.code === 'AUTH') onAuthExpired();
      return null;
    }).catch(() => null);
    return mePromise;
  }
  function applyMeToCurrent(u) {
    if (!u || typeof currentUser === 'undefined') return;
    const merged = Object.assign({}, currentUser || {}, u);
    if (Array.isArray(u.favorites) && typeof favorites !== 'undefined') {
      favorites = [...new Set([...(Array.isArray(favorites) ? favorites : []), ...u.favorites])];
      try { localStorage.setItem('bs_favorites', JSON.stringify(favorites)); } catch (e) {}
    }
    saveUserSession(merged, !!localStorage.getItem('bs_current_user'));
  }

  /* ----------------------------------------------------- shim: from() --- */
  class WriteBuilder {
    constructor(table, op, data) { this.t = table; this.op = op; this.d = data; this.m = {}; this.inn = null; this._p = null; }
    eq(c, v) { this.m[c] = v; return this; }
    in(c, arr) { this.inn = arr; return this; }
    match(o) { Object.assign(this.m, o || {}); return this; }
    select() { return this; } single() { return this; } maybeSingle() { return this; }
    order() { return this; } limit() { return this; }
    then(a, b) { return this._run().then(a, b); }
    catch(f) { return this._run().catch(f); }
    finally(f) { return this._run().finally(f); }
    _run() {
      if (this._p) return this._p;
      this._p = (async () => {
        if (this.t === 'users' && this.op !== 'update') return { data: null, error: { message: 'Операция недоступна' } };
        try {
          const r = await real.rpc('app_write', {
            p_token: getToken(), p_table: this.t, p_op: this.op,
            p_data: this.d === undefined ? null : this.d, p_match: this.m, p_in: this.inn
          });
          if (r.error) return { data: null, error: r.error };
          const res = r.data || {};
          if (res.code === 'AUTH') onAuthExpired();
          if (res.success) {
            if (this.t === 'users' && res.user && typeof currentUser !== 'undefined' && currentUser && res.user.uid === currentUser.uid) applyMeToCurrent(res.user);
            return { data: res, error: null };
          }
          return { data: null, error: { message: res.error || 'Нет прав', code: res.code } };
        } catch (e) { return { data: null, error: { message: e.message } }; }
      })();
      return this._p;
    }
  }

  class FakeRead {
    constructor(fn) { this.fn = fn; this._p = null; }
    _c() { return this; }
    eq() { return this; } order() { return this; } limit() { return this; } range() { return this; }
    single() { return this; } maybeSingle() { return this; } in() { return this; }
    then(a, b) { this._p = this._p || this.fn().then(rows => ({ data: rows, error: null }), e => ({ data: [], error: { message: e.message } })); return this._p.then(a, b); }
    catch(f) { return this.then(null, f); }
  }

  async function enrichUsers(rows) {
    if (!getToken()) return rows;
    try {
      if (isStaff()) {
        const r = await call('app_admin_users', {});
        if (r.success && Array.isArray(r.users)) {
          const byUid = new Map(r.users.map(u => [u.uid, u]));
          return rows.map(u => byUid.get(u.uid) || u);
        }
      }
      const me = await refreshMe();
      if (me) return rows.map(u => (u.uid === me.uid ? Object.assign({}, u, me) : u));
    } catch (e) {}
    return rows;
  }

  function usersSelect(args) {
    const cols = args[0];
    const q = real.from('public_profiles').select(...args);
    const star = cols === undefined || cols === '*';
    const proxy = new Proxy(q, {
      get(target, prop) {
        if (prop === 'then') {
          return (res, rej) => target.then(async r => {
            if (star && r && Array.isArray(r.data)) r.data = await enrichUsers(r.data);
            return r;
          }).then(res, rej);
        }
        const v = target[prop];
        if (typeof v === 'function') return (...a) => { const o = v.apply(target, a); return o === target ? proxy : o; };
        return v;
      }
    });
    return proxy;
  }

  function fromShim(table) {
    return {
      select: (...a) => {
        if (table === 'users') return usersSelect(a);
        if (table === 'reports') return new FakeRead(async () => {
          const r = await call('app_admin_reports', {});
          return r.success ? r.reports : [];
        });
        return real.from(table).select(...a);
      },
      insert: d => new WriteBuilder(table, 'insert', d),
      upsert: d => new WriteBuilder(table, 'upsert', d),
      update: d => new WriteBuilder(table, 'update', d),
      delete: () => new WriteBuilder(table, 'delete', null)
    };
  }

  /* ----------------------------------------------- shim: старые rpc() --- */
  const meIs = id => !!(typeof currentUser !== 'undefined' && currentUser && id && (id === currentUser.uid || String(id).toLowerCase() === String(currentUser.username || '').toLowerCase()));
  const RPC_MAP = {
    transfer_avitocash: a => meIs(a.sender_identifier)
      ? ['app_transfer', { p_recipient: a.recipient_identifier, p_amount: a.transfer_amount }]
      : ['app_admin_seize', { p_target_uid: a.sender_identifier, p_amount: a.transfer_amount }],
    charge_avitocash: a => a.p_action === 'ADD'
      ? ['app_admin_adjust_balance', { p_target_uid: a.p_user_identifier, p_amount: a.p_amount, p_note: a.p_reason }]
      : ['app_charge', { p_identifier: a.p_user_identifier, p_amount: a.p_amount, p_reason: a.p_reason }],
    purchase_ad_item: a => ['app_purchase', { p_ad_id: a.p_ad_id }],
    redeem_gift_code: a => ['app_redeem_gift', { p_code: a.p_code }],
    bump_ad_to_top: a => ['app_ad_bump', { p_ad_id: a.p_ad_id }],
    set_ad_status: a => ['app_ad_set_status', { p_ad_id: a.p_ad_id, p_status: a.p_new_status }],
    secure_manage_ad: a => ['app_ad_manage', { p_ad_id: a.p_ad_id, p_action: a.p_action, p_status: a.p_status || null, p_ad_data: a.p_ad_data || null }],
    apply_ad_discount: a => ['app_ad_discount', { p_ad_id: a.p_ad_id, p_new_price: a.p_new_price, p_old_price: a.p_old_price }],
    admin_toggle_archive_user: a => ['app_admin_archive_user', { p_target_uid: a.p_target_uid, p_archive: a.p_archive_status }],
    admin_delete_user: a => ['app_admin_delete_user', { p_target_uid: a.p_target_uid }],
    admin_manage_user: a => ['app_admin_manage_user', {
      p_target_uid: a.p_target_uid, p_new_role: a.p_new_role ?? null, p_new_gender: a.p_new_gender ?? null,
      p_verified_shop: a.p_verified_shop ?? null, p_frozen: a.p_frozen ?? null }],
    update_user_shop: a => ['app_admin_update_shop', { p_target_uid: a.p_identifier, p_shop: a.p_shop_data ?? null }]
  };
  const BLOCKED = ['register_new_user', 'verify_user_login', 'update_my_profile', 'create_ad_with_fee', 'admin_adjust_balance'];

  async function rpcShim(name, args, opts) {
    if (RPC_MAP[name]) {
      const [n, a] = RPC_MAP[name](args || {});
      const r = await real.rpc(n, Object.assign({ p_token: getToken() }, a), opts);
      if (r.data && r.data.code === 'AUTH') onAuthExpired();
      return r;
    }
    if (BLOCKED.includes(name)) return { data: null, error: { message: 'Функция отключена в целях безопасности' } };
    return real.rpc(name, args, opts);
  }

  supabaseClient = new Proxy(real, {
    get(target, prop) {
      if (prop === 'from') return fromShim;
      if (prop === 'rpc') return rpcShim;
      const v = target[prop];
      return typeof v === 'function' ? v.bind(target) : v;
    }
  });

  window.SecureAPI = { getToken, setToken, call, callPublic, sendOtp, checkOtp, refreshMe, real };

  /* ----------------------------------------------------- старт сессии --- */
  if (typeof currentUser !== 'undefined' && currentUser && !getToken()) {
    // сессия старого образца (без токена) — просим войти заново
    try { localStorage.removeItem('bs_current_user'); sessionStorage.removeItem('bs_current_user'); } catch (e) {}
    currentUser = null;
    window.__needRelogin = true;
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (window.__needRelogin) setTimeout(() => { try { showToast('Для безопасности войдите в аккаунт заново.', 'info'); } catch (e) {} }, 1200);
    if (getToken()) refreshMe(true).then(u => { if (u) applyMeToCurrent(u); });
  });

  /* ------------------------------------------------ показ логина/пароля -- */
  function showCredentials(username, password) {
    if (!password) return;
    setTimeout(() => {
      try {
        alert('Ваш аккаунт создан.\n\nЛогин: ' + username + '\nПароль: ' + password +
              '\n\nСохраните эти данные (сделайте скриншот). Пароль можно сменить в профиле, а если забудете — восстановить через WhatsApp.');
      } catch (e) {}
    }, 400);
  }
  window.showCredentials = showCredentials;

  function putUser(u) {
    if (typeof users === 'undefined') return;
    const i = users.findIndex(x => x.uid === u.uid);
    if (i !== -1) users[i] = Object.assign({}, users[i], u); else users.push(u);
  }

  /* ====================== ВХОД / РЕГИСТРАЦИЯ (замена handleAuthSubmit) ==== */
  window.handleAuthSubmit = async function (e) {
    e.preventDefault();
    const isReg = !byId('reg-fields').classList.contains('hidden');
    const remember = byId('auth-remember-me') ? byId('auth-remember-me').checked : true;
    const btn = isReg ? (byId('auth-reg-submit-btn') || e.submitter) : byId('auth-submit-btn');
    const originalText = btn ? btn.innerText : 'Отправить';
    if (btn) btn.disabled = true;
    const finish = (txt) => { if (btn) { btn.disabled = false; btn.innerText = txt || originalText; } };

    try {
      if (isReg) {
        const waCheck = validateWhatsApp(byId('auth-whatsapp').value.trim());
        if (!waCheck.valid) { showToast(waCheck.error, 'error'); return finish(); }
        const whatsapp = waCheck.number;
        const genderRadio = document.querySelector('input[name="quick-auth-gender"]:checked') || document.querySelector('input[name="auth-gender"]:checked');
        if (!genderRadio) {
          showToast(currentLang === 'ar' ? 'الرجاء تحديد الجنس (رجل / امرأة)' : 'Пожалуйста, укажите ваш пол!', 'warning');
          return finish();
        }
        const selectedGender = genderRadio.value;
        const otpBlock = byId('auth-otp-block'), otpInput = byId('auth-otp-code');

        // Шаг 1: запросить код (его создаёт и хранит сервер)
        if (!pendingRegVerification || pendingRegVerification.whatsapp !== whatsapp) {
          if (btn) btn.innerText = 'Отправка кода...';
          try {
            const r = await sendOtp(whatsapp, 'register');
            pendingRegVerification = { whatsapp, reqId: r.req_id, gender: selectedGender, createdAt: Date.now() };
            showToast('Код отправлен в WhatsApp!', 'success');
            if (otpBlock) otpBlock.classList.remove('hidden');
            if (otpInput) { otpInput.value = ''; otpInput.focus(); }
            if (typeof startOtpTimer === 'function') startOtpTimer();
            return finish('Подтвердить код');
          } catch (err) {
            pendingRegVerification = null;
            showToast(err.message, 'error');
            return finish(originalText);
          }
        }

        // Шаг 2: проверить код
        const entered = otpInput?.value.trim();
        if (!entered) { showToast('Введите код из WhatsApp', 'warning'); return finish('Подтвердить код'); }
        if (btn) btn.innerText = 'Проверка...';
        let ticket;
        try { ticket = await checkOtp(pendingRegVerification.reqId, entered); }
        catch (err) { showToast(err.message, 'error'); return finish('Подтвердить код'); }

        const res = await callPublic('app_register_phone', { p_ticket: ticket, p_gender: pendingRegVerification.gender || selectedGender });
        if (!res.success) { showToast(res.error || 'Ошибка создания аккаунта', 'error'); return finish('Подтвердить код'); }
        setToken(res.token, remember);
        putUser(res.user);
        saveUserSession(res.user, remember);
        pendingRegVerification = null;
        if (otpBlock) otpBlock.classList.add('hidden');
        closeModal('modal-auth');
        showToast(`${t('Добро пожаловать!')} ${t('Логин:')} @${res.username}`, 'success');
        showCredentials(res.username, res.password);
        return finish('Войти');
      }

      /* ---- обычный вход ---- */
      if (btn) btn.innerText = 'Проверка...';
      const loginIdentifier = byId('auth-username').value.trim();
      const rawPassword = byId('auth-password').value;
      if (!loginIdentifier || !rawPassword) { showToast('Введите логин и пароль', 'warning'); return finish(); }

      const res = await callPublic('app_login', { p_login: loginIdentifier, p_password: rawPassword });
      if (!res.success) { showToast(res.error || 'Неверный логин или пароль!', 'error'); return finish(); }
      setToken(res.token, remember);
      const u = res.user;
      putUser(u);
      if (Array.isArray(u.favorites)) {
        favorites = [...new Set([...(Array.isArray(favorites) ? favorites : []), ...u.favorites])];
        try { localStorage.setItem('bs_favorites', JSON.stringify(favorites)); } catch (err) {}
      }
      saveUserSession(u, remember);
      closeModal('modal-auth');
      showToast(`${t('С возвращением,')} ${u.kunya || u.username}!`, 'success');
      finish();
    } catch (err) {
      console.error(err);
      showToast('Ошибка: ' + (err.message || 'нет соединения'), 'error');
      finish();
    }
  };

  const _logout = window.logout;
  window.logout = function () {
    const tk = getToken();
    if (tk) real.rpc('app_logout', { p_token: tk }).catch(() => {});
    setToken('');
    meCache = null; mePromise = null;
    return _logout.apply(this, arguments);
  };

  /* ============ ПОДТВЕРЖДЕНИЕ НОМЕРА У ВОШЕДШЕГО ПОЛЬЗОВАТЕЛЯ ============ */
  window.startUserWhatsAppVerification = async function () {
    if (!currentUser) { openAuthModal(); return; }
    const waCheck = validateWhatsApp(currentUser.whatsapp || '');
    if (!waCheck.valid) {
      showToast('Сначала укажите корректный WhatsApp в профиле', 'warning');
      openEditProfileModal(currentUser.username);
      return;
    }
    const digits = waCheck.number.replace(/\D/g, '');
    showToast('Отправка кода в WhatsApp...', 'info');
    try {
      const r = await sendOtp(waCheck.number, 'verify');
      pendingOldUserOtp = { reqId: r.req_id, whatsapp: digits, timestamp: Date.now() };
      showToast('Код успешно отправлен в WhatsApp!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
    const numBadge = byId('verify-phone-number-badge');
    if (numBadge) numBadge.innerText = '+' + digits;
    const otpInput = byId('verify-modal-otp-code');
    if (otpInput) otpInput.value = '';
    openModal('modal-verify-phone');
    if (otpInput) otpInput.focus();
    startVerifyModalTimer(60);
  };

  window.handleSeparateVerifySubmit = async function (e) {
    e.preventDefault();
    if (!currentUser || !pendingOldUserOtp || !pendingOldUserOtp.reqId) {
      showToast('Сессия верификации устарела. Запросите код повторно.', 'warning');
      return;
    }
    const entered = byId('verify-modal-otp-code')?.value.trim();
    if (!entered) { showToast('Введите код', 'warning'); return; }
    const submitBtn = byId('verify-modal-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = 'Проверка...'; }
    try {
      const ticket = await checkOtp(pendingOldUserOtp.reqId, entered);
      const r = await call('app_verify_phone', { p_ticket: ticket });
      if (!r.success) throw new Error(r.error || 'Не удалось подтвердить номер');
      applyMeToCurrent(r.user);
      putUser(r.user);
      pendingOldUserOtp = null;
      clearInterval(verifyModalTimerId);
      closeModal('modal-verify-phone');
      openProfileModal();
      renderAds();
      showToast('Номер WhatsApp успешно подтвержден! 🎉', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = 'Подтвердить номер'; }
  };

  /* ===================== ВОССТАНОВЛЕНИЕ ПАРОЛЯ ЧЕРЕЗ WHATSAPP ============ */
  window.recoverPasswordViaWhatsApp = async function () {
    const loginInput = (byId('auth-username')?.value || '').trim();
    const target = prompt('Введите ваш логин или номер WhatsApp для восстановления доступа:', loginInput);
    if (!target || !target.trim()) return;
    try {
      showToast('Отправка кода в WhatsApp...', 'info');
      const r = await sendOtp(null, 'reset', target.trim());
      showToast('Код отправлен на ' + (r.masked || 'ваш номер'), 'success');
      const code = prompt('Введите код из WhatsApp (' + (r.masked || '') + '):');
      if (!code) return;
      const ticket = await checkOtp(r.req_id, code);
      const np = prompt('Введите НОВЫЙ пароль (минимум 6 символов):');
      if (!np) return;
      const res = await callPublic('app_reset_password', { p_ticket: ticket, p_new_password: np });
      if (!res.success) throw new Error(res.error || 'Не удалось сменить пароль');
      showToast('Пароль изменён. Теперь войдите с новым паролем.', 'success');
      if (byId('auth-username')) byId('auth-username').value = res.username || target.trim();
      if (byId('auth-password')) { byId('auth-password').value = ''; byId('auth-password').focus(); }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /* ============================== ВХОД ЧЕРЕЗ TELEGRAM ==================== */
  window.handleTelegramInstantAuth = async function () {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.initData) {
      showToast('Авторизация через Telegram...', 'info');
      const gender = document.querySelector('input[name="quick-auth-gender"]:checked')?.value || 'MALE';
      try {
        const res = await gateway('/telegram-auth', { initData: tg.initData, gender });
        setToken(res.token, true);
        putUser(res.user);
        saveUserSession(res.user, true);
        closeModal('modal-auth');
        showToast(res.created ? `Профиль создан! Добро пожаловать, ${res.user.kunya}! 🎉` : `Добро пожаловать, ${res.user.kunya || res.user.username}! 🎉`, 'success');
      } catch (err) {
        showToast(err.message || 'Сбой входа через Telegram', 'error');
      }
      return;
    }
    showToast('Перенаправляем в Telegram-бота...', 'info');
    window.open('https://t.me/AvitoSham_bot/app', '_blank');
  };

  /* ========================= ПОПОЛНЕНИЕ / ПОДАРОЧНЫЕ КОДЫ ================ */
  window.loadTopupRequestsFromServer = async function () {
    if (!getToken()) return { data: null };
    try {
      const r = await call('app_topup_list', {});
      return { data: r.success ? { value: r.requests } : null };
    } catch (e) { return { data: null }; }
  };

  window.createTopupRequest = async function () {
    const amount = _0xSCAmount(byId('topup-amount')?.value);
    if (!currentUser || amount <= 0) { showToast('Укажите корректную сумму', 'warning'); return; }
    try {
      const r = await call('app_topup_create', { p_amount: amount });
      if (!r.success) { showToast(r.error || 'Не удалось создать заявку', 'error'); return; }
      TOPUP_REQUESTS[r.id] = { id: r.id, code: r.code, amount: r.amount, uid: currentUser.uid || '', username: currentUser.username, status: 'pending', timestamp: Date.now() };
      try { localStorage.setItem('bs_topup_requests', JSON.stringify(TOPUP_REQUESTS)); } catch (e) {}
      byId('topup-code').innerText = r.code;
      byId('topup-result').classList.remove('hidden');
      byId('topup-qr').innerHTML = '';
      if (typeof QRCode !== 'undefined') new QRCode(byId('topup-qr'), { text: AVITOCASH_ID, width: 180, height: 180, colorDark: '#000', colorLight: '#fff' });
      showToast('Заявка создана и отправлена администратору!', 'success');
    } catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
  };

  window.verifyPayment = async function (requestId, approve) {
    if (!_0xSCAdmin()) { showToast('Только Главный Администратор может начислять баланс', 'error'); return; }
    try {
      const r = await call('app_topup_decide', { p_id: requestId, p_approve: !!approve });
      if (!r.success) { showToast(r.error || 'Не удалось обработать заявку', 'error'); return; }
      const req = TOPUP_REQUESTS[requestId];
      if (req) req.status = approve ? 'approved' : 'rejected';
      if (approve) {
        const tu = users.find(u => u.uid === r.target_uid);
        if (tu) {
          tu.avitocashBalance = r.new_balance; tu.avitocash_balance = r.new_balance;
          tu.receipts = Object.assign({}, tu.receipts || {}, { [r.receipt.id]: r.receipt });
          TRANSACTIONS[r.receipt.id] = r.receipt;
        }
        showToast(`Платеж подтвержден! Начислено +${Number(r.receipt.amount).toFixed(2)} AC пользователю @${r.username}`, 'success');
      } else showToast('Заявка отклонена', 'info');
      try { localStorage.setItem('bs_topup_requests', JSON.stringify(TOPUP_REQUESTS)); } catch (e) {}
      renderAdminTabContent();
    } catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
  };

  window.generateGiftCode = async function () {
    if (!_0xSCAdmin()) return;
    const amount = _0xSCAmount(byId('gift-amount')?.value);
    const days = Math.max(0, Math.floor(Number(byId('gift-days')?.value || 0)));
    if (!amount) { showToast('Укажите сумму подарка', 'warning'); return; }
    try {
      const r = await call('app_gift_create', { p_amount: amount, p_days: days });
      if (!r.success) { showToast(r.error || 'Не удалось создать код', 'error'); return; }
      const code = r.code, expiresAt = Number(r.expires_at) || 0;
      byId('gift-code-label').innerText = code;
      byId('gift-details').innerText = `${amount.toFixed(2)} AC • ${expiresAt ? 'до ' + new Date(expiresAt).toLocaleDateString() : 'без срока'}`;
      drawGiftCard(code, amount, expiresAt);
      byId('gift-qr').innerHTML = '';
      if (typeof QRCode !== 'undefined') new QRCode(byId('gift-qr'), { text: JSON.stringify({ code, amount }), width: 190, height: 190, colorDark: '#111827', colorLight: '#ffffff' });
      byId('gift-generator-form').classList.add('hidden');
      byId('gift-result').classList.remove('hidden');
      showToast('Подарочный код создан!', 'success');
    } catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
  };

  window.upgradeShopLimitNow = async function () {
    if (!currentUser || !currentUser.shop) return;
    const curMax = currentUser.shop.maxAds || 50;
    const isFree = typeof isMasterFreeActive === 'function' && isMasterFreeActive();
    const cost = isFree ? 0 : 5;
    const msg = `${t('Увеличить лимит магазина с')} ${curMax} ${t('до')} ${curMax + 50} ${t('объявлений за')} ${cost} AC?`;
    showConfirmModal(t('Расширение тарифа магазина'), msg, async () => {
      try {
        const r = await call('app_shop_upgrade', {});
        if (!r.success) { showToast(r.error || 'Не удалось расширить тариф', 'error'); return; }
        currentUser.shop = r.shop;
        currentUser.avitocashBalance = r.new_balance; currentUser.avitocash_balance = r.new_balance;
        saveUserSession(currentUser, true);
        if (byId('modal-shop-showcase') && !byId('modal-shop-showcase').classList.contains('hidden')) openShopShowcase(currentUser.uid);
        if (byId('modal-my-shop') && !byId('modal-my-shop').classList.contains('hidden')) openMyShopModal();
        showToast(t('Лимит магазина успешно увеличен!'), 'success');
      } catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
    });
  };

  /* ===================== СМЕНА ПАРОЛЯ ИЗ РЕДАКТИРОВАНИЯ ПРОФИЛЯ ========== */
  window.secureChangePassword = async function (newPw) {
    if (!newPw) return true;
    const tgUser = currentUser && (String(currentUser.uid || '').startsWith('u_tg_'));
    const old = tgUser ? '' : prompt('Для смены пароля введите ТЕКУЩИЙ пароль:');
    if (!tgUser && !old) { showToast('Пароль не изменён', 'warning'); return false; }
    try {
      const r = await call('app_change_password', { p_old: old || '', p_new: newPw });
      if (!r.success) { showToast(r.error || 'Не удалось сменить пароль', 'error'); return false; }
      showToast('Пароль изменён', 'success');
      return true;
    } catch (err) { showToast('Ошибка: ' + err.message, 'error'); return false; }
  };
})();
