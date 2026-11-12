import { memo, useMemo } from 'react';

const ZODIAC_SIGNS = [
  { symbol: '♈', name: 'Aries' },
  { symbol: '♉', name: 'Taurus' },
  { symbol: '♊', name: 'Gemini' },
  { symbol: '♋', name: 'Cancer' },
  { symbol: '♌', name: 'Leo' },
  { symbol: '♍', name: 'Virgo' },
  { symbol: '♎', name: 'Libra' },
  { symbol: '♏', name: 'Scorpio' },
  { symbol: '♐', name: 'Sagittarius' },
  { symbol: '♑', name: 'Capricorn' },
  { symbol: '♒', name: 'Aquarius' },
  { symbol: '♓', name: 'Pisces' },
];

// Use a fixed base size for SVG and scale with CSS — avoids rendering massive SVGs
const BASE = 400;
const CENTER = 200;
const OUTER_R = 192;
const SIGN_R = 165;
const INNER_R = 140;
const CORE_R = 110;

const ZodiacWheel = memo(function ZodiacWheel({ size = 400, className = '' }) {
  const svgContent = useMemo(() => {
    const dividers = Array.from({ length: 12 }).map((_, i) => {
      const angle = ((i * 30 - 90) * Math.PI) / 180;
      return {
        x1: CENTER + INNER_R * Math.cos(angle),
        y1: CENTER + INNER_R * Math.sin(angle),
        x2: CENTER + OUTER_R * Math.cos(angle),
        y2: CENTER + OUTER_R * Math.sin(angle),
      };
    });

    const signs = ZODIAC_SIGNS.map((sign, i) => {
      const angle = ((i * 30 + 15 - 90) * Math.PI) / 180;
      return {
        ...sign,
        x: CENTER + SIGN_R * Math.cos(angle),
        y: CENTER + SIGN_R * Math.sin(angle),
      };
    });

    return { dividers, signs };
  }, []);

  const scale = size / BASE;

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: size,
        maxWidth: '100%',
        aspectRatio: '1 / 1',
        height: 'auto',
      }}
    >
      {/* CSS rotation instead of framer-motion — uses GPU compositing */}
      <div
        className="absolute inset-0 animate-zodiac-spin"
        style={{ willChange: 'transform' }}
      >
        <svg
          width={BASE}
          height={BASE}
          viewBox={`0 0 ${BASE} ${BASE}`}
          className="w-full h-full"
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_R}
            fill="none"
            stroke="#25A9BA"
            strokeWidth="2"
            strokeOpacity="0.8"
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_R - 2}
            fill="none"
            stroke="#25A9BA"
            strokeWidth="0.5"
            strokeOpacity="0.4"
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={INNER_R}
            fill="none"
            stroke="#25A9BA"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={CORE_R}
            fill="none"
            stroke="#14467D"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />

          {svgContent.dividers.map((d, i) => (
            <line
              key={i}
              x1={d.x1}
              y1={d.y1}
              x2={d.x2}
              y2={d.y2}
              stroke="#25A9BA"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
          ))}

          {svgContent.signs.map((s, i) => (
            <text
              key={i}
              x={s.x}
              y={s.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#D4AF37"
              fontSize={BASE * 0.055}
              fontFamily="Georgia, Times New Roman, serif"
              opacity="1.0"
            >
              {`${s.symbol}\uFE0E`}
            </text>
          ))}

          {/* Star of David */}
          <polygon
            points={`${CENTER},${CENTER - CORE_R} ${CENTER + CORE_R * Math.cos(Math.PI / 6)},${CENTER + CORE_R * Math.sin(Math.PI / 6)} ${CENTER - CORE_R * Math.cos(Math.PI / 6)},${CENTER + CORE_R * Math.sin(Math.PI / 6)}`}
            fill="none"
            stroke="#D4AF37"
            strokeWidth="0.8"
            strokeOpacity="0.6"
          />
          <polygon
            points={`${CENTER},${CENTER + CORE_R} ${CENTER + CORE_R * Math.cos(Math.PI / 6)},${CENTER - CORE_R * Math.sin(Math.PI / 6)} ${CENTER - CORE_R * Math.cos(Math.PI / 6)},${CENTER - CORE_R * Math.sin(Math.PI / 6)}`}
            fill="none"
            stroke="#D4AF37"
            strokeWidth="0.8"
            strokeOpacity="0.6"
          />

          <line
            x1={CENTER}
            y1={CENTER - CORE_R}
            x2={CENTER}
            y2={CENTER + CORE_R}
            stroke="#14467D"
            strokeWidth="0.5"
            strokeOpacity="0.6"
          />
          <line
            x1={CENTER - CORE_R}
            y1={CENTER}
            x2={CENTER + CORE_R}
            y2={CENTER}
            stroke="#14467D"
            strokeWidth="0.5"
            strokeOpacity="0.6"
          />

          <circle
            cx={CENTER}
            cy={CENTER}
            r={CORE_R * 0.45}
            fill="none"
            stroke="#14467D"
            strokeWidth="0.8"
            strokeOpacity="0.6"
            strokeDasharray="5 5"
          />
        </svg>
      </div>
    </div>
  );
});

export default ZodiacWheel;
