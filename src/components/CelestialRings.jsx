import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { SYMBOLS } from './celestial/symbols';
import { canAutoLoad3D } from './celestial/capability.js';

export default function CelestialRings() {
  const host = useRef(null);
  const sceneRef = useRef(null);
  const selectorRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [requested, setRequested] = useState(false);
  const [selected, setSelected] = useState(null),
    [hovered, setHovered] = useState(null),
    [status, setStatus] = useState('waiting');
  useEffect(() => {
    let cancelled = false,
      scene,
      scheduled = null,
      started = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    let visible = false;
    function cancelScheduled() {
      if (scheduled === null) return;
      if ('requestIdleCallback' in window) window.cancelIdleCallback(scheduled);
      else clearTimeout(scheduled);
      scheduled = null;
    }
    function load() {
      scheduled = null;
      if (cancelled || started || !visible || document.hidden) return;
      started = true;
      setStatus('loading');
      import('./celestial/createScene')
        .then(({ createCelestialScene }) => {
          if (cancelled) return;
          try {
            scene = createCelestialScene(host.current, {
              onSelect: setSelected,
              onHover: setHovered,
              onError: () => setStatus('unavailable'),
            });
            sceneRef.current = scene;
            setStatus('ready');
          } catch {
            setStatus('unavailable');
          }
        })
        .catch(() => {
          if (!cancelled) setStatus('unavailable');
        });
    }
    function schedule() {
      cancelScheduled();
      if (started) return;
      if (!requested && !canAutoLoad3D(window)) {
        setStatus('static');
        return;
      }
      setStatus('waiting');
      if (!visible || document.hidden) return;
      // Wait for the page to finish loading so the scene never competes with
      // the first render; an explicit request loads straight away.
      if (!requested && document.readyState !== 'complete') {
        window.addEventListener('load', schedule, { once: true });
        return;
      }
      scheduled =
        'requestIdleCallback' in window
          ? window.requestIdleCallback(load, {
              timeout: requested ? 200 : 3000,
            })
          : window.setTimeout(load, 200);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    observer.observe(host.current);
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', schedule);
    connection?.addEventListener('change', schedule);
    schedule();
    return () => {
      cancelled = true;
      cancelScheduled();
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      window.removeEventListener('load', schedule);
      reduced.removeEventListener('change', schedule);
      connection?.removeEventListener('change', schedule);
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [requested]);
  useEffect(() => {
    sceneRef.current?.setPaused(Boolean(selected));
  }, [selected, status]);
  return (
    <div className="celestial-explorer real-celestial">
      <div
        className="celestial-webgl"
        ref={host}
        role="img"
        aria-label={
          status === 'ready'
            ? 'Six tarot cards on three gold rings. Drag to turn, or choose a card using the buttons below.'
            : 'Gold celestial rings with tarot cards. Choose a card below.'
        }
      >
        {status !== 'ready' && (
          <svg
            className="celestial-still"
            viewBox="0 0 400 400"
            aria-hidden="true"
          >
            <g fill="none" stroke="#ba8c37" strokeWidth="2">
              <g className="still-orbit still-orbit-a">
                <ellipse
                  cx="200"
                  cy="200"
                  rx="155"
                  ry="90"
                  transform="rotate(-30 200 200)"
                />
              </g>
              <g className="still-orbit still-orbit-b">
                <ellipse
                  cx="200"
                  cy="200"
                  rx="120"
                  ry="75"
                  transform="rotate(55 200 200)"
                />
              </g>
              <g className="still-orbit still-orbit-c">
                <ellipse
                  cx="200"
                  cy="200"
                  rx="80"
                  ry="53"
                  transform="rotate(-65 200 200)"
                />
              </g>
            </g>
            <g fill="#092d48" stroke="#ba8c37" strokeWidth="2">
              <rect
                x="65"
                y="224"
                width="38"
                height="56"
                rx="3"
                transform="rotate(-20 84 252)"
              />
              <rect
                x="280"
                y="116"
                width="38"
                height="56"
                rx="3"
                transform="rotate(20 299 144)"
              />
              <path d="M200 183 213 200 200 217 187 200Z" fill="#ba8c37" />
            </g>
            <g fill="#efdaaa" fontSize="26" textAnchor="middle">
              <text x="84" y="261">
                ☉
              </text>
              <text x="299" y="153">
                ☾
              </text>
            </g>
          </svg>
        )}
      </div>
      {status === 'static' && (
        <button
          className="celestial-load"
          type="button"
          onClick={() => setRequested(true)}
        >
          Explore in 3D
        </button>
      )}
      {status === 'loading' && (
        <span className="celestial-status" role="status">
          Preparing the tarot cards…
        </span>
      )}
      {status === 'unavailable' && (
        <p className="celestial-status">
          Choose a tarot card below to read its meaning.
        </p>
      )}
      <div className="tarot-card-picker" ref={selectorRef} role="group" aria-label="Choose a tarot card">
        {SYMBOLS.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={selected?.id === item.id}
            aria-controls={selected ? 'tarot-card-meaning' : undefined}
            onClick={() => setSelected(item)}
          >
            <span aria-hidden="true">{({ sun: '☉', moon: '☾', star: '✧', strength: '∞', hermit: '◇', world: '◎' })[item.kind]}</span>
            {item.name}
          </button>
        ))}
      </div>
      <p className="tarot-picker-hint" aria-hidden="true">{hovered ? `${hovered.name} · select to discover` : 'Choose a card. Make a little space for reflection.'}</p>
      <AnimatePresence mode="wait">
      {selected && (
        <motion.div
          key={selected.id}
          id="tarot-card-meaning"
          className="celestial-description"
          role="region"
          aria-label={selected.name}
          aria-live="polite"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
          transition={{ duration: reducedMotion ? 0 : 0.25 }}
        >
          <div>
            <h2>{selected.name}</h2>
            <p>{selected.text}</p>
            <Link to="/#information">About Astrology & card meanings <span aria-hidden="true">↗</span></Link>
          </div>
          <button
            aria-label="Close explanation"
            onClick={() => {
              selectorRef.current?.querySelector('[aria-pressed="true"]')?.focus();
              setSelected(null);
            }}
          >
            <X size={18} />
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

