import { lazy, Suspense, useEffect, useState } from 'react';
import '../experience-motion.css';

// Only the eligibility check enters the mobile bundle; the cursor is a separate chunk.
const DesktopCursor = lazy(() => import('./DesktopCursor'));
export default function RoyalMotion() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const fine = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnabled(fine.matches && !reduced.matches);
    sync();
    fine.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      fine.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
    };
  }, []);
  return enabled ? <Suspense fallback={null}><DesktopCursor /></Suspense> : null;
}
