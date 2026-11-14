/*
 * Crystals Chakra welcome screen.
 *
 * Runs synchronously right after the #intro markup in index.html, before
 * React, so the words paint immediately and work before the app bundle
 * loads. Without JavaScript the intro stays hidden and the site is shown.
 *
 * The words are the way in. Click or tap them, scroll down, swipe up, or press
 * Enter, Space, the down arrow, Page Down or Escape: every route runs the
 * same transition. Shown only when entering the homepage without a section
 * link, once per browser session.
 */
(function () {
  'use strict';
  // Lets CSS hold scroll-reveal elements at their start position only when
  // JavaScript will be there to reveal them.
  document.documentElement.classList.add('js');
  var intro = document.getElementById('intro');
  if (!intro) return;
  var html = document.documentElement;
  var KEY = 'crystals-chakra:intro-seen';
  var path = location.pathname.replace(/\/+$/, '') || '/';
  var alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem(KEY) === '1';
  } catch (e) {}
  if (
    path !== '/' ||
    location.hash ||
    alreadySeen ||
    /[?&]intro=off(&|$)/.test(location.search)
  ) {
    intro.parentNode.removeChild(intro);
    return;
  }

  var reduced =
    window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The glow and constellations follow a real mouse only.
  var finePointer =
    window.matchMedia &&
    matchMedia('(hover: hover) and (pointer: fine)').matches;
  var enterButton = intro.querySelector('.intro-enter');
  var content = intro.querySelector('.intro-content');
  var canvas = intro.querySelector('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  var closed = false;
  var finished = false;
  var frame = 0;
  var timer = 0;

  intro.hidden = false;
  html.classList.add('intro-open');
  function setInert(on) {
    var app = document.getElementById('root');
    if (!app) return;
    if (on) app.setAttribute('inert', '');
    else app.removeAttribute('inert');
  }
  function ready() {
    if (!closed) setInert(true);
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', ready);
  else ready();
  try {
    enterButton.focus({ preventScroll: true });
  } catch (e) {}

  /* ---------- Star field that follows the pointer ---------- */
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var width = 0;
  var height = 0;
  var stars = [];
  var target = { x: 0, y: 0 };
  var eased = { x: 0, y: 0 };
  var cursor = { x: -9999, y: -9999, active: false };
  var lastMove = 0;
  var warp = 0;
  var started = performance.now();

  function seedStars() {
    var count = Math.round(
      Math.min(240, Math.max(90, (width * height) / 6500)),
    );
    stars = [];
    for (var i = 0; i < count; i++) {
      var depth = 0.15 + Math.random() * 0.85;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: depth,
        r: 0.35 + depth * 1.45,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.6,
        warm: Math.random() < 0.22,
      });
    }
  }
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
    if (reduced) draw(performance.now());
  }
  function wrap(value, size) {
    return ((value % size) + size) % size;
  }
  function draw(now) {
    if (!ctx) return;
    var t = (now - started) / 1000;
    // With no recent pointer movement the sky drifts gently on its own.
    if (!reduced && now - lastMove > 2500) {
      target.x = Math.sin(t * 0.17) * 0.35;
      target.y = Math.cos(t * 0.13) * 0.25;
    }
    eased.x += (target.x - eased.x) * 0.05;
    eased.y += (target.y - eased.y) * 0.05;
    ctx.clearRect(0, 0, width, height);
    // A soft gold light trails the pointer.
    if (cursor.active && !closed) {
      var glow = ctx.createRadialGradient(
        cursor.x,
        cursor.y,
        0,
        cursor.x,
        cursor.y,
        180,
      );
      glow.addColorStop(0, 'rgba(226,196,127,0.16)');
      glow.addColorStop(1, 'rgba(226,196,127,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cursor.x - 180, cursor.y - 180, 360, 360);
    }
    var cx = width / 2;
    var cy = height / 2;
    var near = [];
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      // Nearer (brighter, larger) stars travel further with the pointer.
      var x = wrap(s.x + eased.x * s.z * 70, width);
      var y = wrap(s.y + eased.y * s.z * 50, height);
      if (warp > 0) {
        // Leaving: the sky rushes outward past the viewer.
        var k = 1 + warp * warp * 2.6 * s.z;
        x = cx + (x - cx) * k;
        y = cy + (y - cy) * k;
      }
      var twinkle = reduced ? 1 : 0.7 + 0.3 * Math.sin(t * s.speed + s.phase);
      var alpha = (0.25 + 0.75 * s.z) * twinkle;
      var radius = s.r;
      if (cursor.active && !closed) {
        var d = Math.hypot(x - cursor.x, y - cursor.y);
        if (d < 150) {
          var lift = 1 - d / 150;
          alpha = Math.min(1, alpha + lift * 0.6);
          radius += lift * 1.1;
          if (near.length < 14) near.push([x, y]);
        }
      }
      ctx.globalAlpha = alpha * (1 - warp * 0.5);
      ctx.fillStyle = s.warm ? '#f3d896' : '#eef3ff';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // Faint constellation lines form between the stars around the pointer.
    if (near.length > 1) {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#e2c47f';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (var a = 0; a < near.length; a++)
        for (var b = a + 1; b < near.length; b++)
          if (
            Math.hypot(near[a][0] - near[b][0], near[a][1] - near[b][1]) < 95
          ) {
            ctx.moveTo(near[a][0], near[a][1]);
            ctx.lineTo(near[b][0], near[b][1]);
          }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function loop(now) {
    frame = 0;
    if (closed) warp = Math.min(1, warp + 0.04);
    draw(now);
    if (!finished && !document.hidden && !reduced)
      frame = requestAnimationFrame(loop);
  }
  function onPointer(event) {
    if (event.pointerType !== 'mouse' || !finePointer || reduced) return;
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    cursor.active = true;
    lastMove = performance.now();
    target.x = (event.clientX / width - 0.5) * 2;
    target.y = (event.clientY / height - 0.5) * 2;
    // The words lean a few pixels toward the pointer.
    content.style.setProperty('--lean-x', (target.x * 10).toFixed(1) + 'px');
    content.style.setProperty('--lean-y', (target.y * 6).toFixed(1) + 'px');
  }
  function onVisibility() {
    if (!document.hidden && !frame && !reduced && !finished)
      frame = requestAnimationFrame(loop);
  }

  /* ---------- Entering the site ---------- */
  function focusMain() {
    var main = document.getElementById('main');
    if (!main) return;
    main.setAttribute('tabindex', '-1');
    try {
      main.focus({ preventScroll: true });
    } catch (e) {}
    main.addEventListener(
      'blur',
      function () {
        main.removeAttribute('tabindex');
      },
      { once: true },
    );
  }
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('resize', resize);
    window.removeEventListener('wheel', onWheel);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('DOMContentLoaded', ready);
    if (intro.parentNode) intro.parentNode.removeChild(intro);
    html.classList.remove('intro-open');
    setInert(false);
    focusMain();
    // Deferred work (the 3D scene) waits for this before starting.
    window.dispatchEvent(new Event('crystals:intro-closed'));
  }
  function enter() {
    if (closed) return;
    closed = true;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch (e) {}
    intro.setAttribute('aria-busy', 'true');
    intro.classList.add(reduced ? 'is-leaving-quick' : 'is-leaving');
    // Finish when the exit animation ends; the timer only covers browsers or
    // conditions where animation events never arrive.
    intro.addEventListener('animationend', function (event) {
      if (event.target === intro) finish();
    });
    timer = setTimeout(finish, reduced ? 400 : 1500);
    if (!frame && !reduced) frame = requestAnimationFrame(loop);
  }
  var wheelDistance = 0;
  function onWheel(event) {
    if (event.deltaY <= 0) {
      wheelDistance = 0;
      return;
    }
    wheelDistance +=
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    if (wheelDistance > 30) enter();
  }
  var touchStartY = null;
  function onKey(event) {
    if (
      event.key === 'Escape' ||
      event.key === 'ArrowDown' ||
      event.key === 'PageDown' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      enter();
    } else if (event.key === 'Tab') {
      // Keep focus on the only control while the welcome screen is open.
      event.preventDefault();
      enterButton.focus();
    }
  }

  enterButton.addEventListener('click', enter);
  intro.addEventListener(
    'touchstart',
    function (event) {
      touchStartY = event.touches[0] ? event.touches[0].clientY : null;
    },
    { passive: true },
  );
  intro.addEventListener(
    'touchmove',
    function (event) {
      // An upward swipe is a scroll down: the same way in.
      if (touchStartY !== null && touchStartY - event.touches[0].clientY > 36)
        enter();
    },
    { passive: true },
  );
  intro.addEventListener(
    'touchend',
    function () {
      touchStartY = null;
    },
    { passive: true },
  );
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);
  resize();
  if (!reduced) frame = requestAnimationFrame(loop);
})();
