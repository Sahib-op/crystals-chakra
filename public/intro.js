/* Text-first welcome. This runs before React so entry works while the app loads. */
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
    intro.remove();
    return;
  }
  var reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reducedQuery.matches;
  var enterButton = intro.querySelector('.intro-enter');
  var canvas = intro.querySelector('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  var closed = false,
    frame = 0,
    timer = 0,
    touchY = null,
    wheelDistance = 0;
  var width = 0,
    height = 0,
    stars = [],
    started = performance.now();
  var pointer = { x: 0, y: 0 },
    eased = { x: 0, y: 0 },
    cursor = { x: 0, y: 0, active: false };
  intro.hidden = false;
  html.classList.add('intro-open');
  function setInert(on) {
    var root = document.getElementById('root');
    if (root) root.inert = on;
  }
  function ready() {
    if (!closed) setInert(true);
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  enterButton.focus({ preventScroll: true });

  function resize() {
    width = innerWidth;
    height = innerHeight;
    var dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from(
      { length: Math.min(200, Math.round((width * height) / 7000)) },
      function () {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z: 0.2 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
        };
      },
    );
    draw(performance.now());
  }
  function draw(now) {
    if (!ctx) return;
    var t = (now - started) / 1000;
    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;
    ctx.clearRect(0, 0, width, height);
    // A soft gold light trails the pointer.
    if (cursor.active && !reduced) {
      var glow = ctx.createRadialGradient(
        cursor.x,
        cursor.y,
        0,
        cursor.x,
        cursor.y,
        190,
      );
      glow.addColorStop(0, 'rgba(226,196,127,0.15)');
      glow.addColorStop(1, 'rgba(226,196,127,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cursor.x - 190, cursor.y - 190, 380, 380);
    }
    var near = [];
    stars.forEach(function (s) {
      // Nearer (brighter) stars travel further toward the pointer: parallax.
      var x = reduced
        ? s.x
        : s.x + Math.sin(t * 0.12 + s.phase) * 8 + eased.x * s.z * 60;
      var y = reduced
        ? s.y
        : s.y + Math.cos(t * 0.1 + s.phase) * 6 + eased.y * s.z * 42;
      var alpha =
        (0.25 + s.z * 0.6) *
        (reduced ? 1 : 0.8 + 0.2 * Math.sin(t * 0.7 + s.phase));
      var radius = 0.4 + s.z;
      if (cursor.active && !reduced) {
        var d = Math.hypot(x - cursor.x, y - cursor.y);
        if (d < 150) {
          var lift = 1 - d / 150;
          alpha = Math.min(1, alpha + lift * 0.6);
          radius += lift * 1.1;
          if (near.length < 14) near.push([x, y]);
        }
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.z > 0.7 ? '#e2c47f' : '#d9e2ef';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
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
    draw(now);
    if (!closed && !document.hidden && !reduced)
      frame = requestAnimationFrame(loop);
  }
  function move(event) {
    if (event.pointerType === 'touch' || reduced) return;
    pointer.x = (event.clientX / width - 0.5) * 2;
    pointer.y = (event.clientY / height - 0.5) * 2;
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    cursor.active = true;
  }
  function visibility() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!document.hidden && !closed && !reduced)
      frame = requestAnimationFrame(loop);
  }
  function motionChange() {
    reduced = reducedQuery.matches;
    visibility();
    if (reduced) draw(performance.now());
  }
  function focusMain() {
    var main = document.getElementById('main');
    if (!main) return;
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
    main.addEventListener(
      'blur',
      function () {
        main.removeAttribute('tabindex');
      },
      { once: true },
    );
  }
  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('resize', resize);
    window.removeEventListener('wheel', wheel);
    document.removeEventListener('keydown', key);
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('DOMContentLoaded', ready);
    reducedQuery.removeEventListener('change', motionChange);
    intro.remove();
    html.classList.remove('intro-open');
    setInert(false);
    focusMain();
    // Deferred work (the 3D scene) waits for this before starting.
    window.dispatchEvent(new Event('crystals:intro-closed'));
  }
  // Click, downward wheel, upward swipe and keyboard all use this transition.
  function enter() {
    if (closed) return;
    closed = true;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch (e) {}
    intro.setAttribute('aria-busy', 'true');
    intro.classList.add(reduced ? 'is-leaving-quick' : 'is-leaving');
    // Finish when the exit animation ends; the timer is only a fallback for
    // browsers that skip the animation.
    intro.addEventListener('animationend', function (event) {
      if (event.target === intro) finish();
    });
    timer = setTimeout(finish, reduced ? 400 : 1400);
  }
  function wheel(event) {
    if (event.deltaY <= 0) {
      wheelDistance = 0;
      return;
    }
    wheelDistance +=
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    if (wheelDistance > 24) enter();
  }
  function key(event) {
    if (['Escape', 'ArrowDown', 'PageDown', 'End'].includes(event.key)) {
      event.preventDefault();
      enter();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      enterButton.focus();
    }
  }
  enterButton.addEventListener('click', enter);
  intro.addEventListener(
    'touchstart',
    function (event) {
      touchY = event.touches[0]?.clientY ?? null;
    },
    { passive: true },
  );
  intro.addEventListener(
    'touchmove',
    function (event) {
      if (touchY !== null && touchY - event.touches[0].clientY > 32) enter();
    },
    { passive: true },
  );
  intro.addEventListener(
    'touchend',
    function () {
      touchY = null;
    },
    { passive: true },
  );
  intro.addEventListener(
    'touchcancel',
    function () {
      touchY = null;
    },
    { passive: true },
  );
  window.addEventListener('wheel', wheel, { passive: true });
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('keydown', key);
  document.addEventListener('visibilitychange', visibility);
  reducedQuery.addEventListener('change', motionChange);
  resize();
  if (!reduced) frame = requestAnimationFrame(loop);
})();
