(function () {
  'use strict';

  var isEditable = function (el) {
    return !!(el && el.closest && el.closest('input, textarea, select, [contenteditable="true"], .select-all'));
  };
  var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window && screen.width < 1024);

  // Запрет выделения текста и перетаскивания картинок
  var style = document.createElement('style');
  style.textContent =
    'body *:not(input):not(textarea):not(.select-all){-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}' +
    'img{-webkit-user-drag:none;user-drag:none}';
  document.head.appendChild(style);

  // Контекстное меню, копирование, вырезание, перетаскивание
  document.addEventListener('contextmenu', function (e) { if (!isEditable(e.target)) e.preventDefault(); }, true);
  document.addEventListener('copy', function (e) { if (!isEditable(e.target)) e.preventDefault(); }, true);
  document.addEventListener('cut', function (e) { if (!isEditable(e.target)) e.preventDefault(); }, true);
  document.addEventListener('dragstart', function (e) { e.preventDefault(); }, true);
  document.addEventListener('selectstart', function (e) { if (!isEditable(e.target)) e.preventDefault(); }, true);

  // Горячие клавиши
  document.addEventListener('keydown', function (e) {
    var ctrl = e.ctrlKey || e.metaKey;
    var code = e.code;
    var blocked =
      e.key === 'F12' ||
      (ctrl && e.shiftKey && (code === 'KeyI' || code === 'KeyJ' || code === 'KeyC' || code === 'KeyK')) ||
      (ctrl && (code === 'KeyU' || code === 'KeyS' || code === 'KeyP')) ||
      (e.metaKey && e.altKey && (code === 'KeyI' || code === 'KeyJ' || code === 'KeyU' || code === 'KeyC'));
    if (blocked) { e.preventDefault(); e.stopPropagation(); return false; }
    if (ctrl && (code === 'KeyA' || code === 'KeyC' || code === 'KeyX') && !isEditable(e.target)) e.preventDefault();
  }, true);

  // Обнаружение открытых DevTools: закрываем экран заглушкой
  var overlay = null;
  var dbgDetected = false;

  function showOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font:600 16px Arial,sans-serif';
    overlay.textContent = 'Закройте инструменты разработчика / أغلق أدوات المطور';
    document.documentElement.appendChild(overlay);
  }
  function hideOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  if (!isMobile) {
    setInterval(function () {
      var sizeOpen = (window.outerWidth - window.innerWidth > 160) || (window.outerHeight - window.innerHeight > 200);
      if (sizeOpen || dbgDetected) showOverlay(); else hideOverlay();
    }, 800);

    // Ловушка debugger: при открытых DevTools выполнение замирает, время растёт
    setInterval(function () {
      var s = performance.now();
      (function () {}.constructor('debugger')());
      dbgDetected = (performance.now() - s) > 120;
    }, 1500);
  }
})();