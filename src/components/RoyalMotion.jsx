import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RoyalMotion() {
  const { pathname } = useLocation();
  // The custom cursor is a separate chunk, loaded only for a mouse-type
  // pointer with motion allowed. Touch devices never download it.
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let stop = null;
    let cancelled = false;
    function sync() {
      const wanted = fine.matches && !reduced.matches;
      if (wanted && !stop)
        import('./cursor/tarotCursor.js').then(({ startTarotCursor }) => {
          if (!cancelled && !stop && fine.matches && !reduced.matches)
            stop = startTarotCursor();
        });
      if (!wanted && stop) {
        stop();
        stop = null;
      }
    }
    sync();
    reduced.addEventListener('change', sync);
    fine.addEventListener('change', sync);
    return () => {
      cancelled = true;
      stop?.();
      reduced.removeEventListener('change', sync);
      fine.removeEventListener('change', sync);
    };
  }, []);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let cleanup = () => {};
    function setup() {
      cleanup();
      if (reduced.matches) return;
      const journey = document.querySelector('.royal-journey');
      const creams = [
        ...document.querySelectorAll('.theme-ivory, .theme-parchment'),
      ];
      const visible = new Set();
      let frame = 0,
        scrollDirty = true,
        moving = false;
      let x = innerWidth / 2,
        y = innerHeight / 2,
        shiftX = 0,
        shiftY = 0;
      function schedule() {
        if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
      }
      function draw() {
        frame = 0;
        const targetX = (x / innerWidth - 0.5) * 14;
        const targetY = (y / innerHeight - 0.5) * 10;
        shiftX += (targetX - shiftX) * 0.09;
        shiftY += (targetY - shiftY) * 0.09;
        if (journey) {
          journey.style.setProperty(
            '--pointer-shift-x',
            shiftX.toFixed(2) + 'px',
          );
          journey.style.setProperty(
            '--pointer-shift-y',
            shiftY.toFixed(2) + 'px',
          );
        }
        if (scrollDirty) {
          for (const section of visible) {
            const rect = section.getBoundingClientRect();
            const shift = Math.max(
              -22,
              Math.min(
                22,
                (innerHeight / 2 - rect.top - rect.height / 2) * 0.045,
              ),
            );
            section.style.setProperty(
              '--scroll-shift',
              shift.toFixed(2) + 'px',
            );
          }
          scrollDirty = false;
        }
        if (
          moving &&
          Math.abs(targetX - shiftX) + Math.abs(targetY - shiftY) > 0.05
        )
          schedule();
      }
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) =>
            entry.isIntersecting
              ? visible.add(entry.target)
              : visible.delete(entry.target),
          );
          scrollDirty = true;
          schedule();
        },
        { rootMargin: '80px' },
      );
      creams.forEach((section) => observer.observe(section));
      function move(event) {
        if (!fine.matches || event.pointerType !== 'mouse') return;
        x = event.clientX;
        y = event.clientY;
        moving = true;
        schedule();
      }
      function leave() {
        moving = false;
      }
      function scroll() {
        scrollDirty = true;
        schedule();
      }
      function visibility() {
        if (document.hidden) {
          cancelAnimationFrame(frame);
          frame = 0;
          leave();
        } else scroll();
      }
      window.addEventListener('pointermove', move, { passive: true });
      document.addEventListener('pointerleave', leave);
      document.addEventListener('visibilitychange', visibility);
      window.addEventListener('scroll', scroll, { passive: true });
      window.addEventListener('resize', scroll, { passive: true });
      schedule();
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        leave();
        window.removeEventListener('pointermove', move);
        document.removeEventListener('pointerleave', leave);
        document.removeEventListener('visibilitychange', visibility);
        window.removeEventListener('scroll', scroll);
        window.removeEventListener('resize', scroll);
        journey?.style.removeProperty('--pointer-shift-x');
        journey?.style.removeProperty('--pointer-shift-y');
        creams.forEach((section) =>
          section.style.removeProperty('--scroll-shift'),
        );
      };
    }
    setup();
    reduced.addEventListener('change', setup);
    fine.addEventListener('change', setup);
    return () => {
      cleanup();
      reduced.removeEventListener('change', setup);
      fine.removeEventListener('change', setup);
    };
  }, [pathname]);
  return null;
}
