import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { SYMBOLS } from './celestial/symbols';
export default function CelestialRings() {
  const host = useRef(null);
  const [selected, setSelected] = useState(null),
    [hovered, setHovered] = useState(null),
    [status, setStatus] = useState('loading');
  useEffect(() => {
    let cancelled = false,
      scene;
    import('./celestial/createScene')
      .then(({ createCelestialScene }) => {
        if (cancelled) return;
        try {
          scene = createCelestialScene(host.current, {
            onSelect: setSelected,
            onHover: setHovered,
            onError: () => setStatus('unavailable'),
          });
          setStatus('ready');
        } catch {
          setStatus('unavailable');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
      scene?.dispose();
    };
  }, []);
  return (
    <div className="celestial-explorer real-celestial">
      <div
        className="celestial-webgl"
        ref={host}
        role="img"
        aria-label="Three gold rings rotating in 3D. Drag to look around and select a card or constellation."
      />
      {status === 'loading' && (
        <span className="celestial-status" role="status">
          Preparing the sky…
        </span>
      )}
      {status === 'unavailable' && (
        <p className="celestial-status">
          The 3D view is unavailable on this device. Explore the symbols below.
        </p>
      )}
      <div className="celestial-selector">
        <label className="sr-only" htmlFor="celestial-symbol">
          Explore a tarot card or constellation
        </label>
        <select
          id="celestial-symbol"
          value={selected?.id || ''}
          onChange={(e) =>
            setSelected(SYMBOLS.find((s) => s.id === e.target.value) || null)
          }
        >
          <option value="">Explore the symbols</option>
          {SYMBOLS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <span className="celestial-hover" aria-hidden="true">
          {hovered?.name || ''}
        </span>
      </div>
      {selected && (
        <div
          className="celestial-description"
          role="region"
          aria-label={selected.name}
          aria-live="polite"
        >
          <div>
            <h2>{selected.name}</h2>
            <p>{selected.text}</p>
          </div>
          <button
            aria-label="Close explanation"
            onClick={() => setSelected(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
