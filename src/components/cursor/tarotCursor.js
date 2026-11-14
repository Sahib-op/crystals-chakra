// Desktop-only custom cursor: a gold four-point star exactly at the pointer
// (the hotspot never lags, so clicking stays precise) inside a trailing
// compass ring. Loaded by RoyalMotion only for fine pointers with motion
// allowed; touch devices never download this module.
//
// While active, html.custom-cursor hides the system cursor (see
// refinements.css). Over text fields the custom cursor steps aside and the
// native text cursor returns.
const INTERACTIVE =
  'a[href], button, summary, select, label[for], [role="button"], canvas, .intro-enter';
const NATIVE =
  'input, textarea, [contenteditable="true"], [data-native-cursor]';

export function startTarotCursor() {
  const html = document.documentElement;
  const root = document.createElement('div');
  root.className = 'tarot-cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<span class="tarot-cursor-ring"><i></i><i></i><i></i><i></i></span>' +
    '<svg class="tarot-cursor-star" viewBox="-10 -10 20 20"><path d="M0-9 2 -2 9 0 2 2 0 9-2 2-9 0-2-2Z"/></svg>';
  document.body.append(root);
  const ring = root.firstElementChild;
  const star = root.lastElementChild;

  let x = -100;
  let y = -100;
  let ringX = x;
  let ringY = y;
  let frame = 0;
  let shown = false;

  function render() {
    frame = 0;
    ringX += (x - ringX) * 0.2;
    ringY += (y - ringY) * 0.2;
    star.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    if (Math.abs(x - ringX) + Math.abs(y - ringY) > 0.3)
      frame = requestAnimationFrame(render);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function show(on) {
    if (on === shown) return;
    shown = on;
    root.classList.toggle('is-visible', on);
    html.classList.toggle('custom-cursor', on);
  }
  function move(event) {
    if (event.pointerType !== 'mouse') return;
    x = event.clientX;
    y = event.clientY;
    if (!shown) {
      // Appear in place rather than flying in from the last position.
      ringX = x;
      ringY = y;
    }
    const target = event.target instanceof Element ? event.target : null;
    const native = target?.closest(NATIVE);
    show(!native);
    root.dataset.state = target?.closest(INTERACTIVE) ? 'hover' : 'idle';
    schedule();
  }
  function press(event) {
    if (event.pointerType === 'mouse') root.dataset.pressed = 'true';
  }
  function release() {
    delete root.dataset.pressed;
  }
  function leave(event) {
    if (!event.relatedTarget) show(false);
  }
  function visibility() {
    if (document.hidden) show(false);
  }

  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerdown', press, { passive: true });
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });
  document.addEventListener('pointerout', leave);
  document.addEventListener('visibilitychange', visibility);

  return function stop() {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerdown', press);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
    document.removeEventListener('pointerout', leave);
    document.removeEventListener('visibilitychange', visibility);
    html.classList.remove('custom-cursor');
    root.remove();
  };
}
