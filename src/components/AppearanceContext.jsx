import { createContext, lazy, Suspense, useEffect, useState } from 'react';
import { useContext } from 'react';

// Design lab: switchable colour palettes and section order, for the studio to
// experiment with before settling on one. Visitors always get the default
// design. The lab turns on only with ?lab=1 (remembered in this browser until
// ?lab=0) or in local development; its panel and palette styles load as a
// separate chunk only then.
const KEY = 'crystals-chakra:appearance:v1';
const LAB_KEY = 'crystals-chakra:design-lab';
export const PALETTES = [
  ['royal', 'Royal blue (default)'],
  ['saffron', 'Saffron & plum'],
  ['forest', 'Forest & ivory'],
  ['temple', 'Temple red & gold'],
];
export const SECTION_ORDERS = [
  ['learn-first', 'Readings → About Astrology → Collection (default)'],
  ['collection-first', 'Readings → Collection → About Astrology'],
  ['about-first', 'About Astrology → Readings → Collection'],
];
export const DEFAULTS = { palette: 'royal', sectionOrder: 'learn-first' };
const DesignLab = lazy(() => import('./DesignLab.jsx'));
const AppearanceContext = createContext({ ...DEFAULTS, lab: false });

export function labRequested(search, stored, dev) {
  const flag = new URLSearchParams(search).get('lab');
  if (flag === '1') return true;
  if (flag === '0') return false;
  return stored === '1' || Boolean(dev);
}

export function sanitizeAppearance(saved) {
  return {
    palette: PALETTES.some(([value]) => value === saved?.palette)
      ? saved.palette
      : DEFAULTS.palette,
    sectionOrder: SECTION_ORDERS.some(
      ([value]) => value === saved?.sectionOrder,
    )
      ? saved.sectionOrder
      : DEFAULTS.sectionOrder,
  };
}

function storage(action) {
  try {
    return action(window.localStorage);
  } catch {
    return null; // Private browsing can block storage; the lab still works.
  }
}

export function AppearanceProvider({ children }) {
  // Server render and first client render always use the default design.
  const [appearance, setAppearance] = useState(DEFAULTS);
  const [lab, setLab] = useState(false);
  useEffect(() => {
    const enabled = labRequested(
      window.location.search,
      storage((s) => s.getItem(LAB_KEY)),
      import.meta.env.DEV,
    );
    const flag = new URLSearchParams(window.location.search).get('lab');
    if (flag === '1') storage((s) => s.setItem(LAB_KEY, '1'));
    if (flag === '0') storage((s) => s.removeItem(LAB_KEY));
    setLab(enabled);
    if (enabled)
      setAppearance(
        sanitizeAppearance(
          storage((s) => JSON.parse(s.getItem(KEY) || 'null')),
        ),
      );
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (lab && appearance.palette !== DEFAULTS.palette)
      root.dataset.palette = appearance.palette;
    else delete root.dataset.palette;
    if (lab) storage((s) => s.setItem(KEY, JSON.stringify(appearance)));
  }, [appearance, lab]);
  const value = lab
    ? { ...appearance, lab, setAppearance }
    : { ...DEFAULTS, lab: false, setAppearance };
  return (
    <AppearanceContext.Provider value={value}>
      {children}
      {lab && (
        <Suspense fallback={null}>
          <DesignLab
            onClose={() => {
              storage((s) => s.removeItem(LAB_KEY));
              setLab(false);
            }}
          />
        </Suspense>
      )}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
