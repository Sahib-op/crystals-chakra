import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import BrandLogo from './BrandLogo';

const NAV_LINKS = [
  { to: '/services', label: 'Kundli Services' },
  { to: '/science', label: 'Science of Astrology' },
  { to: '/shop', label: 'Shop' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 w-full z-50 glass-panel border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1 sm:gap-2">
              <BrandLogo size="sm" className="!w-10 !h-10 sm:!w-12 sm:!h-12" />
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-serif font-bold text-chakra-cyan leading-none tracking-wide">CRYSTALS <span className="text-white">CHAKRA</span></span>
              </div>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
              className="text-chakra-text hover:text-chakra-cyan p-2"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div id="mobile-navigation" className="md:hidden glass-panel border-t border-white/10">
          <div className="px-4 pt-3 pb-4 space-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={`block text-center py-3 px-4 rounded-xl text-sm font-medium transition-colors ${location.pathname === link.to ? 'text-chakra-cyan bg-chakra-cyan/10' : 'text-chakra-muted hover:text-white'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}