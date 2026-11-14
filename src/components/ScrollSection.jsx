import RoyalOrnament from './RoyalOrnament';
import { useEffect, useRef, useState } from 'react';
export default function ScrollSection({ id, theme, children, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '80px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      id={id}
      className={`journey-section theme-${theme} ${visible ? 'is-inview' : ''} ${className}`}
    >
      <div className="section-atmosphere" aria-hidden="true">
        <i />
        <i />
        <i />
        {(theme === 'ivory' || theme === 'parchment') && (
          <div className="cream-wash">
            <span />
            <span />
          </div>
        )}
      </div>
      {id !== 'home' && <RoyalOrnament />}
      <div className="journey-content">{children}</div>
    </section>
  );
}
