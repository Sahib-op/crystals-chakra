import { useEffect, useRef, useState } from 'react';
import { useJourney } from './JourneyContext';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Home,
  Sparkles,
  BookOpen,
  Moon,
  CalendarDays,
  HelpCircle,
  ShoppingBag,
} from 'lucide-react';
const SECTIONS = [
  ['home', 'Welcome', Home],
  ['tarot', 'Tarot Readings', Moon],
  ['services', 'Kundli Services', Sparkles],
  ['booking', 'Book a Reading', CalendarDays],
  ['information', 'About Astrology', BookOpen],
  ['collection', 'Shop', ShoppingBag],
  ['questions', 'Questions', HelpCircle],
];
export default function SideNav() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const { activeSection: active } = useJourney();
  const { pathname, search } = useLocation();
  const root = useRef(null),
    trigger = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  function go(id) {
    setReady(false);
    setOpen(false);
    if (pathname === '/' && id !== 'collection')
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
  }
  return (
    <aside
      ref={root}
      className={`morph-sidebar ${open ? 'is-expanded' : ''}`}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (
          e.pointerType === 'mouse' &&
          !root.current?.contains(document.activeElement)
        )
          setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <motion.div
        className="morph-surface"
        onAnimationComplete={() => setReady(open)}
        initial={false}
        animate={{
          width: open ? 48 : 4,
          height: open ? 320 : 128,
          borderRadius: open ? 28 : 4,
          backgroundColor: open ? '#082b45' : '#b58a38',
          borderColor: open ? '#bf984d' : '#d9b66c',
        }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: 'spring', stiffness: 330, damping: 29 }
        }
      >
        <button
          ref={trigger}
          className="morph-trigger"
          aria-label="Open section navigation"
          aria-expanded={open}
          aria-controls="section-icons"
          onClick={() => setOpen(true)}
          tabIndex={open ? -1 : 0}
        />
        <nav
          id="section-icons"
          aria-label="Page sections"
          className="morph-icons"
          inert={!(open && ready) ? '' : undefined}
          aria-hidden={!(open && ready)}
        >
          {SECTIONS.map(([id, label, Icon], i) => (
            <motion.div
              key={id}
              className="morph-item"
              initial={false}
              animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.5 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.16, delay: open ? 0.07 + i * 0.018 : 0 }
              }
            >
              <Link
                to={id === 'collection' ? `/shop${search}` : `/${search}#${id}`}
                aria-label={label}
                aria-current={
                  id === 'collection' && pathname === '/shop'
                    ? 'page'
                    : pathname === '/' && active === id
                      ? 'location'
                      : undefined
                }
                onClick={() => go(id)}
              >
                <Icon size={17} strokeWidth={1.6} />
                <span className="icon-tooltip" aria-hidden="true">
                  {label}
                </span>
              </Link>
            </motion.div>
          ))}
        </nav>
      </motion.div>
    </aside>
  );
}
