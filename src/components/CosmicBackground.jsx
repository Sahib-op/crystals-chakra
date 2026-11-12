import { useEffect, useRef, memo } from 'react';

/**
 * Canvas-based star field inspired by an Alaskan night sky.
 * Dense, crisp points of light with subtle, ethereal constellations.
 * Highly performant.
 */

export const cursorPos = { x: 0.5, y: 0.5 };

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const STAR_COUNT = 450;

// Constellations removed to standalone Constellations.jsx

function generateStars(count) {
  const rand = seededRandom(424242);
  const stars = new Array(count);
  for (let i = 0; i < count; i++) {
    const depth = rand();
    // Smaller, crisper stars (no boba balls)
    const baseSize = 0.3 + (1 - depth) * 1.0;
    const baseOpacity = 0.2 + (1 - depth) * 0.8;
    const colourRoll = rand();
    let r, g, b;

    if (colourRoll < 0.6) {
      r = 240 + rand() * 15;
      g = 245 + rand() * 10;
      b = 255;
    } else if (colourRoll < 0.85) {
      r = 190 + rand() * 30;
      g = 220 + rand() * 35;
      b = 255;
    } else {
      r = 255;
      g = 240 + rand() * 15;
      b = 220 + rand() * 20;
    }

    stars[i] = {
      x: rand(),
      y: rand(),
      depth,
      baseSize,
      baseOpacity,
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
      twinklePhase: rand() * Math.PI * 2,
      twinkleSpeed: 0.2 + rand() * 1.5,
      twinkles: rand() > 0.3,
    };
  }
  return stars;
}

const bgStars = generateStars(STAR_COUNT);

const CosmicBackground = memo(function CosmicBackground() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const scrollYRef = useRef(0);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const smoothCursor = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');

    let w = 0,
      h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sync();
    };
    window.addEventListener('resize', resize, { passive: true });

    const onScroll = () => {
      if (!motion.matches) scrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const onMouseMove = (e) => {
      if (motion.matches) return;
      cursorPos.x = e.clientX / w;
      cursorPos.y = e.clientY / h;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const render = (timestamp) => {
      rafRef.current = null;
      if (document.hidden) return;
      const dt = lastFrameRef.current
        ? Math.min((timestamp - lastFrameRef.current) / 1000, 0.05)
        : 0.016;
      lastFrameRef.current = timestamp;
      if (!motion.matches) timeRef.current += dt;

      const cLerp = 1 - Math.pow(0.05, dt);
      smoothCursor.current.x += (cursorPos.x - smoothCursor.current.x) * cLerp;
      smoothCursor.current.y += (cursorPos.y - smoothCursor.current.y) * cLerp;

      const cx = motion.matches ? 0 : smoothCursor.current.x - 0.5;
      const cy = motion.matches ? 0 : smoothCursor.current.y - 0.5;
      const scrollOffset = motion.matches ? 0 : scrollYRef.current * 0.06;
      const t = timeRef.current;

      // Very dark icy night sky
      ctx.fillStyle = '#040208';
      ctx.fillRect(0, 0, w, h);

      // Layer 1: Background stars
      // Batch rendering by colour to reduce state changes
      for (let i = 0; i < STAR_COUNT; i++) {
        const s = bgStars[i];
        // Increase the number of stars that move (depth < 0.4) and slightly increase their movement multiplier
        const parallaxStrength = s.depth < 0.4 ? (0.4 - s.depth) * 120 : 0;
        // Add a very slow constant horizontal drift over time based on depth, and wrap around
        const drift = t * (1.2 - s.depth) * 3;
        let px = s.x * w + cx * parallaxStrength + drift;
        px = ((px % w) + w) % w; // seamless horizontal wrap

        const py =
          s.y * h +
          cy * parallaxStrength * 0.6 -
          scrollOffset * (0.2 + s.depth * 0.4);

        if (py < -5 || py > h + 5 || px < -5 || px > w + 5) continue;

        let opacity = s.baseOpacity;
        if (s.twinkles) {
          opacity *= 0.6 + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.4;
        }

        // Draw crisp star point
        ctx.globalAlpha = opacity;
        ctx.fillStyle = `rgb(${s.r},${s.g},${s.b})`;

        // Fast rectangle drawing for tiny background stars instead of arc
        if (s.baseSize < 0.8) {
          ctx.fillRect(px, py, s.baseSize * 2, s.baseSize * 2);
        } else {
          ctx.beginPath();
          ctx.arc(px, py, s.baseSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      if (!motion.matches) rafRef.current = requestAnimationFrame(render);
    };

    function sync() {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = 0;
      if (!document.hidden) rafRef.current = requestAnimationFrame(render);
    }
    resize();
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
});

export default CosmicBackground;
