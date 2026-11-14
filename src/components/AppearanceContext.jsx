import { createContext, useContext, useEffect, useState } from 'react';

const AppearanceContext = createContext(null);
const KEY = 'crystals-chakra:appearance:v1';
const DEFAULTS = { palette: 'royal', sectionOrder: 'learn-first' };
export function AppearanceProvider({ children }) {
  const [appearance, setAppearance] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved) setAppearance({
        palette: ['royal', 'saffron', 'forest'].includes(saved.palette) ? saved.palette : DEFAULTS.palette,
        sectionOrder: saved.sectionOrder === 'collection-first' ? 'collection-first' : DEFAULTS.sectionOrder,
      });
    } catch { /* Storage is optional. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.palette = appearance.palette;
    if (ready) {
      try { localStorage.setItem(KEY, JSON.stringify(appearance)); } catch { /* Private browsing can block storage. */ }
    }
  }, [appearance, ready]);
  return <AppearanceContext.Provider value={{ ...appearance, setAppearance }}>{children}</AppearanceContext.Provider>;
}
export function useAppearance() { return useContext(AppearanceContext); }

export function AppearanceControls() {
  const { palette, sectionOrder, setAppearance } = useAppearance();
  return (
    <details className="appearance-controls">
      <summary>Explore the look <span aria-hidden="true">◐</span></summary>
      <div className="appearance-options">
        <p>Make this space your own. Your choices stay in this browser.</p>
        <fieldset>
          <legend>Colour palette</legend>
          <div className="palette-options">
            {[
              ['royal', 'Royal blue'], ['saffron', 'Saffron & plum'], ['forest', 'Forest & ivory'],
            ].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={palette === value}
                onClick={() => setAppearance((current) => ({ ...current, palette: value }))}>
                <i className={`palette-swatch swatch-${value}`} aria-hidden="true" />{label}
              </button>
            ))}
          </div>
        </fieldset>
        <label htmlFor="section-order">After the readings</label>
        <select id="section-order" value={sectionOrder}
          onChange={(event) => setAppearance((current) => ({ ...current, sectionOrder: event.target.value }))}>
          <option value="learn-first">About Astrology, then the collection</option>
          <option value="collection-first">The collection, then About Astrology</option>
        </select>
        <button className="appearance-reset" type="button" onClick={() => setAppearance(DEFAULTS)}>Reset the look</button>
      </div>
    </details>
  );
}
