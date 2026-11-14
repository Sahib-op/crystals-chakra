import { useId } from 'react';

// Section breaker: a toran of light. A marigold garland hangs in swags across
// the section edge; brass diyas and marigold tassels hang from the low point
// of each swag. Flames flicker, pendants sway and a glint travels along the
// garland, only while the section is on screen (ScrollSection's .is-inview).
const SWAGS = 9;
// Swag geometry in a 1200 x 34 box; the strand is stretched horizontally only.
const swagPath = Array.from({ length: SWAGS }, (_, i) => {
  const w = 1200 / SWAGS;
  const x0 = i * w;
  return `${i === 0 ? `M${x0} 4` : ''} Q${x0 + w / 2} 44 ${x0 + w} 4`;
}).join(' ');

function Diya({ glowId }) {
  return (
    <svg viewBox="0 0 48 58" className="toran-item toran-diya">
      <circle
        className="toran-glow"
        cx="24"
        cy="22"
        r="17"
        fill={`url(#${glowId})`}
      />
      <path
        className="toran-flame"
        d="M24 9c2.6 6.4 7.4 8.6 6 14.2-1 4.4-11 4.4-12 0-1.4-5.6 3.4-7.8 6-14.2Z"
      />
      <path
        className="toran-flame-core"
        d="M24 17c1 3 3 4 2.4 6.4-.5 2-4.3 2-4.8 0C21 21 23 20 24 17Z"
      />
      <path
        className="toran-bowl"
        d="M5 30h38c-3.4 11-10 16.6-19 16.6S8.4 41 5 30Z"
      />
      <path
        className="toran-line"
        d="M9.5 33.5c8.6 6.4 20.4 6.4 29 0M17 48.5h14M20.5 53h7"
      />
      <circle className="toran-bead" cx="24" cy="38.5" r="1.6" />
    </svg>
  );
}

function Tassel() {
  return (
    <svg viewBox="0 0 48 58" className="toran-item toran-tassel">
      <circle className="toran-marigold" cx="24" cy="8" r="6.5" />
      <circle className="toran-marigold-dark" cx="24" cy="8" r="3" />
      <circle className="toran-marigold" cx="24" cy="21" r="5" />
      <circle className="toran-marigold-dark" cx="24" cy="21" r="2.2" />
      <path className="toran-line" d="M24 26v6" />
      <path
        className="toran-leaf"
        d="M24 31c-6 2-8 8-7 13 5-1 8-6 7-13Zm0 0c6 2 8 8 7 13-5-1-8-6-7-13Z"
      />
      <circle className="toran-bead" cx="24" cy="49" r="2.2" />
    </svg>
  );
}

export default function RoyalOrnament() {
  const id = useId().replaceAll(':', '');
  return (
    <div className="royal-ornament toran-breaker" aria-hidden="true">
      <svg
        className="toran-strand"
        viewBox="0 0 1200 48"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`${id}-glint`} x1="0" x2="1">
            <stop offset="0" stopColor="#fff3cf" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff3cf" stopOpacity="1" />
            <stop offset="1" stopColor="#fff3cf" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="toran-thread" d={swagPath} pathLength="1000" />
        <path className="toran-beads" d={swagPath} pathLength="1000" />
        <path
          className="toran-glint"
          d={swagPath}
          pathLength="1000"
          stroke={`url(#${id}-glint)`}
        />
      </svg>
      <svg width="0" height="0" className="toran-defs">
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor="#ffd56b" stopOpacity=".75" />
            <stop offset=".45" stopColor="#ffb340" stopOpacity=".28" />
            <stop offset="1" stopColor="#ffb340" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      {Array.from({ length: SWAGS + 1 }, (_, i) => (
        <span
          key={`knot-${i}`}
          className="toran-knot"
          style={{ '--x': `${(i / SWAGS) * 100}%` }}
        />
      ))}
      {Array.from({ length: SWAGS }, (_, i) => (
        <span
          key={i}
          className={`toran-pendant ${i % 2 ? 'is-tassel' : 'is-diya'}`}
          style={{ '--x': `${((i + 0.5) / SWAGS) * 100}%`, '--i': i }}
        >
          <span className="toran-cord" />
          {i % 2 ? <Tassel /> : <Diya glowId={`${id}-glow`} />}
        </span>
      ))}
    </div>
  );
}
