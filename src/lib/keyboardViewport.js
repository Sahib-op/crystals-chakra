// On phones the on-screen keyboard shrinks the *visual* viewport, but fixed
// elements and 100dvh still size against the larger layout viewport (always on
// iOS Safari). This keeps typing comfortable everywhere:
//  - exposes the visible area as CSS variables (--vv-top, --vv-height,
//    --keyboard-inset) and html.keyboard-open, so dialogs can sit above the
//    keyboard with their buttons reachable;
//  - scrolls the focused field back into view, clear of the fixed header,
//    whenever the keyboard covers it.
const EDITABLE =
  'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=reset]):not([type=range]):not([type=color]):not([type=file]), textarea, select, [contenteditable=""], [contenteditable=true]';
const KEYBOARD_MIN = 120; // smaller changes are browser chrome, not a keyboard

export function startKeyboardViewport() {
  const vv = window.visualViewport;
  if (!vv || !window.matchMedia('(pointer: coarse)').matches) return;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let lastHeight = vv.height;
  let justFocused = false;

  function focusedField() {
    const el = document.activeElement;
    return el instanceof HTMLElement && el.matches(EDITABLE) ? el : null;
  }

  function keepVisible(field) {
    const rect = field.getBoundingClientRect();
    const header = field.closest('dialog')
      ? null
      : document.querySelector('.scroll-header');
    const top =
      vv.offsetTop + (header ? header.getBoundingClientRect().bottom : 0) + 8;
    const bottom = vv.offsetTop + vv.height - 12;
    if (rect.top < top || rect.bottom > bottom)
      field.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: reduced.matches ? 'instant' : 'smooth',
      });
  }

  function update() {
    frame = 0;
    const inset = Math.max(
      0,
      Math.round(window.innerHeight - vv.height - vv.offsetTop),
    );
    const field = focusedField();
    const open = Boolean(field) && inset > KEYBOARD_MIN;
    root.style.setProperty('--vv-top', `${Math.round(vv.offsetTop)}px`);
    root.style.setProperty('--vv-height', `${Math.round(vv.height)}px`);
    root.style.setProperty('--keyboard-inset', `${open ? inset : 0}px`);
    root.classList.toggle('keyboard-open', open);
    // Only re-centre when focus moves or the keyboard changes size, never
    // while the visitor scrolls on their own.
    const resized = Math.abs(vv.height - lastHeight) > 40;
    lastHeight = vv.height;
    if (open && (justFocused || resized)) keepVisible(field);
    justFocused = false;
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  document.addEventListener('focusin', () => {
    justFocused = true;
    schedule();
  });
  // The keyboard animates closed after blur; settle once it has gone.
  document.addEventListener('focusout', () => setTimeout(schedule, 300));
  schedule();
}
