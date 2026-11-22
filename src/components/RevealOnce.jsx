import { useEffect, useRef, useState } from 'react';

// Adds `is-revealed` the first time the element is 20% in view, then stops
// watching. CSS does the motion, so prerendered HTML and reduced-motion
// preferences always show the content at rest (see `html.js` rules).
export default function RevealOnce({ as: Tag = 'div', className, children }) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setRevealed(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.intersectionRatio >= 0.2)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: [0, 0.2] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`${className}${revealed ? ' is-revealed' : ''}`}>
      {children}
    </Tag>
  );
}
