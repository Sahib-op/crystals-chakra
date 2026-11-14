import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function DesktopCursor() {
  const cursor = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const el = cursor.current;
    const html = document.documentElement;
    let frame = 0;
    let x = 0, y = 0;
    function paint() {
      frame = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    function hide() {
      html.classList.remove('custom-cursor-active');
      el.dataset.visible = 'false';
    }
    function move(event) {
      if (event.pointerType !== 'mouse') { hide(); return; }
      const native = event.target.closest?.('dialog, input, textarea, select, [contenteditable="true"], [data-native-cursor]');
      if (native) { hide(); return; }
      x = event.clientX;
      y = event.clientY;
      el.dataset.visible = 'true';
      el.dataset.hover = Boolean(event.target.closest?.('a, button, summary, [role="button"], canvas'));
      // Hide the native cursor only after the replacement has a position.
      paint();
      html.classList.add('custom-cursor-active');
    }
    function press() { el.dataset.pressed = 'true'; }
    function release() { el.dataset.pressed = 'false'; }
    function visibility() { if (document.hidden) hide(); }
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', press, { passive: true });
    window.addEventListener('pointerup', release, { passive: true });
    window.addEventListener('pointercancel', hide, { passive: true });
    window.addEventListener('blur', hide);
    document.addEventListener('pointerleave', hide);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('keydown', hide);
    return () => {
      cancelAnimationFrame(frame);
      hide();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', hide);
      window.removeEventListener('blur', hide);
      document.removeEventListener('pointerleave', hide);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('keydown', hide);
    };
  }, [pathname]);
  return <div ref={cursor} className="tarot-cursor" aria-hidden="true"><span /><i /></div>;
}

