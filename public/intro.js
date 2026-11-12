/*
 * Crystals Chakra welcome screen.
 *
 * Runs synchronously right after the #intro markup in index.html, before React,
 * so the title paints immediately and the card works before the app bundle
 * loads. Without JavaScript the intro stays hidden and the site is shown.
 *
 * Shown only when entering the homepage without a section link, once per
 * browser session. Escape or "Skip intro" closes it at once; reduced-motion
 * preferences get a still sky and a short fade.
 */
(function () {
  'use strict';
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
  var card = intro.querySelector('.intro-card');
  var skip = intro.querySelector('.intro-skip');
  var canvas = intro.querySelector('canvas');
  var closed = false;
  var frame = 0;

  intro.hidden = false;
  html.classList.add('intro-open');
  function setInert(on) {
    var app = document.getElementById('root');
    if (!app) return;
    if (on) app.setAttribute('inert', '');
    else app.removeAttribute('inert');
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () {
      if (!closed) setInert(true);
    });
  else setInert(true);
  try {
    card.focus({ preventScroll: true });
  } catch (e) {}

  /* ---------- Star field that follows the pointer ---------- */
  var ctx = canvas.getContext && canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var width = 0,
    height = 0,
    stars = [];
  var target = { x: 0, y: 0 },
    eased = { x: 0, y: 0 };
  var cursor = { x: -9999, y: -9999, active: false };
  var lastMove = 0,
    warp = 0,
    started = performance.now();

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

    // Soft gold light that trails the pointer.
    if (cursor.active) {
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

    var cx = width / 2,
      cy = height / 2;
    var near = [];
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      // Deeper (brighter, larger) stars move further toward the pointer: parallax.
      var x = wrap(s.x + eased.x * s.z * 70, width);
      var y = wrap(s.y + eased.y * s.z * 50, height);
      if (warp > 0) {
        var dx = x - cx,
          dy = y - cy;
        var k = 1 + warp * warp * 2.4 * s.z;
        x = cx + dx * k;
        y = cy + dy * k;
      }
      var twinkle = reduced ? 1 : 0.7 + 0.3 * Math.sin(t * s.speed + s.phase);
      var alpha = (0.25 + 0.75 * s.z) * twinkle;
      var radius = s.r;
      if (cursor.active) {
        var d = Math.hypot(x - cursor.x, y - cursor.y);
        if (d < 150) {
          var lift = 1 - d / 150;
          alpha = Math.min(1, alpha + lift * 0.6);
          radius += lift * 1.1;
          if (near.length < 14) near.push([x, y]);
        }
      }
      ctx.globalAlpha = alpha * (1 - warp * 0.6);
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
        for (var b = a + 1; b < near.length; b++) {
          var gap = Math.hypot(
            near[a][0] - near[b][0],
            near[a][1] - near[b][1],
          );
          if (gap < 95) {
            ctx.moveTo(near[a][0], near[a][1]);
            ctx.lineTo(near[b][0], near[b][1]);
          }
        }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function loop(now) {
    frame = 0;
    if (closed && warp >= 1) return;
    if (closed) warp = Math.min(1, warp + 0.035);
    draw(now);
    if (!document.hidden) frame = requestAnimationFrame(loop);
  }
  function onPointer(event) {
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    cursor.active = true;
    lastMove = performance.now();
    target.x = (event.clientX / width - 0.5) * 2;
    target.y = (event.clientY / height - 0.5) * 2;
    if (reduced) draw(lastMove);
  }
  function onVisibility() {
    if (!document.hidden && !frame && !reduced && !closed)
      frame = requestAnimationFrame(loop);
  }

  /* ---------- Card tilt that follows the pointer ---------- */
  function tilt(event) {
    if (reduced || closed) return;
    var box = card.getBoundingClientRect();
    var rx = ((event.clientY - box.top) / box.height - 0.5) * -16;
    var ry = ((event.clientX - box.left) / box.width - 0.5) * 18;
    card.style.setProperty('--tilt-x', rx.toFixed(2) + 'deg');
    card.style.setProperty('--tilt-y', ry.toFixed(2) + 'deg');
  }
  function untilt() {
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
  }

  /* ---------- Entering the site ---------- */
  function finish() {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('resize', resize);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    if (intro.parentNode) intro.parentNode.removeChild(intro);
    html.classList.remove('intro-open');
    setInert(false);
    var main = document.getElementById('main');
    if (main) {
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
  }
  function enter(withCeremony) {
    if (closed) return;
    closed = true;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch (e) {}
    if (reduced || !withCeremony) {
      intro.classList.add('is-leaving-quick');
      setTimeout(finish, reduced ? 220 : 160);
      return;
    }
    untilt();
    card.classList.add('is-revealed');
    intro.setAttribute('aria-busy', 'true');
    if (!frame) frame = requestAnimationFrame(loop);
    setTimeout(function () {
      intro.classList.add('is-leaving');
    }, 900);
    setTimeout(finish, 1700);
  }
  function onKey(event) {
    if (event.key === 'Escape') enter(false);
    else if (event.key === 'Tab') {
      // Keep keyboard focus inside the welcome screen while it is open.
      var first = card,
        last = skip;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  card.addEventListener('click', function () {
    enter(true);
  });
  card.addEventListener('pointermove', tilt);
  card.addEventListener('pointerleave', untilt);
  skip.addEventListener('click', function () {
    enter(false);
  });
  document.addEventListener('keydown', onKey);
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  resize();
  if (!reduced) frame = requestAnimationFrame(loop);
})();
