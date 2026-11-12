import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import BrandLogo from './BrandLogo';
const LINKS = [
  ['/services', 'Kundli Services'],
  ['/science', 'Science of Astrology'],
  ['/shop', 'Shop'],
];
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return (
    <header className="site-header">
      <nav className="header-inner" aria-label="Main navigation">
        <Link to="/" className="site-brand" aria-label="Crystals Chakra home">
          <BrandLogo size="sm" />
          <span>
            CRYSTALS <b>CHAKRA</b>
            <small>UNLOCK YOUR DESTINY</small>
          </span>
        </Link>
        <div className="desktop-links">
          {LINKS.map(([to, label]) => (
            <Link
              key={to}
              to={to}
              aria-current={pathname === to ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
        <Link to="/book" className="header-book">
          Book a Reading <ArrowUpRight size={15} />
        </Link>
        <button
          className="mobile-toggle"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-links"
          aria-label="Mobile navigation"
        >
          <Link to="/">Home</Link>
          {LINKS.map(([to, label]) => (
            <Link
              key={to}
              to={to}
              aria-current={pathname === to ? 'page' : undefined}
            >
              {label}
              <ArrowUpRight size={16} />
            </Link>
          ))}
          <Link to="/book">
            Book a Reading <ArrowUpRight size={16} />
          </Link>
        </nav>
      )}
    </header>
  );
}
