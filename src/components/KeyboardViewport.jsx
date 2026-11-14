import { useEffect } from 'react';
import '../keyboard-viewport.css';

const textField = 'textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"]), [contenteditable="true"]';

export default function KeyboardViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !window.matchMedia('(any-pointer: coarse)').matches) return;
    const root = document.documentElement;
    let expandedHeight = window.innerHeight;
    let frame = 0;
    let focusTimer = 0;

    function update(revealField = false) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const field = document.activeElement;
        const editing = field instanceof HTMLElement && field.matches(textField);
        // Pinch zoom must keep the browser's own viewport and panning behavior.
        if (Math.abs(viewport.scale - 1) > 0.05) {
          root.removeAttribute('data-keyboard-open');
          root.style.removeProperty('--keyboard-inset');
          return;
        }
        if (!editing) expandedHeight = Math.max(window.innerHeight, viewport.height);
        const inset = editing ? Math.max(0, expandedHeight - viewport.height - viewport.offsetTop) : 0;
        const keyboardOpen = editing && inset > 120;
        root.style.setProperty('--visual-viewport-height', `${Math.round(viewport.height)}px`);
        root.style.setProperty('--keyboard-inset', `${keyboardOpen ? Math.round(inset) : 0}px`);
        root.toggleAttribute('data-keyboard-open', keyboardOpen);
        if (!keyboardOpen || !revealField) return;

        const bounds = field.getBoundingClientRect();
        const top = viewport.offsetTop + 20;
        const bottom = viewport.offsetTop + viewport.height - 28;
        if (bounds.top < top || bounds.bottom > bottom) {
          // First reveal the field in any nested scroller, then account for
          // browsers whose layout viewport remains behind the keyboard.
          field.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
          const visibleBounds = field.getBoundingClientRect();
          const delta = visibleBounds.height > bottom - top
            ? visibleBounds.top - top
            : visibleBounds.bottom > bottom
              ? visibleBounds.bottom - bottom
              : Math.min(0, visibleBounds.top - top);
          if (delta) window.scrollBy({ top: delta, behavior: 'instant' });
        }
      });
    }

    function onFocus() {
      update(true);
      clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => update(true), 300);
    }
    function onResize() { update(true); }
    function onPan() { update(false); }
    function onOrientationChange() {
      expandedHeight = window.innerHeight;
      update(true);
    }

    viewport.addEventListener('resize', onResize);
    viewport.addEventListener('scroll', onPan);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onFocus);
    window.addEventListener('orientationchange', onOrientationChange);
    update();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(focusTimer);
      viewport.removeEventListener('resize', onResize);
      viewport.removeEventListener('scroll', onPan);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onFocus);
      window.removeEventListener('orientationchange', onOrientationChange);
      root.removeAttribute('data-keyboard-open');
      root.style.removeProperty('--keyboard-inset');
      root.style.removeProperty('--visual-viewport-height');
    };
  }, []);
  return null;
}
