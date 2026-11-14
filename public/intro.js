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
    eased = { x: 0, y: 0 };
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
      { length: Math.min(150, Math.round((width * height) / 8500)) },
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
    eased.x += (pointer.x - eased.x) * 0.04;
    eased.y += (pointer.y - eased.y) * 0.04;
    ctx.clearRect(0, 0, width, height);
    stars.forEach(function (s) {
      var driftX = reduced
        ? 0
        : Math.sin(t * 0.12 + s.phase) * 8 + eased.x * s.z * 24;
      var driftY = reduced
        ? 0
        : Math.cos(t * 0.1 + s.phase) * 6 + eased.y * s.z * 18;
      ctx.globalAlpha =
        (0.25 + s.z * 0.6) *
        (reduced ? 1 : 0.8 + 0.2 * Math.sin(t * 0.7 + s.phase));
      ctx.fillStyle = s.z > 0.7 ? '#e2c47f' : '#d9e2ef';
      ctx.beginPath();
      ctx.arc(s.x + driftX, s.y + driftY, 0.4 + s.z, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function loop(now) {
    frame = 0;
    draw(now);
    if (!closed && !document.hidden && !reduced)
      frame = requestAnimationFrame(loop);
  }
  function move(event) {
    if (event.pointerType !== 'mouse' || reduced) return;
    pointer.x = (event.clientX / width - 0.5) * 2;
    pointer.y = (event.clientY / height - 0.5) * 2;
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
  function finish() {
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
    timer = setTimeout(finish, reduced ? 180 : 900);
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
