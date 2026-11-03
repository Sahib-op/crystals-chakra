import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Home, Sparkles, BookOpen, ShoppingBag } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Home', id: 'home', icon: Home },
  { to: '/services', label: 'Services', id: 'services', icon: Sparkles },
  { to: '/science', label: 'Science', id: 'science', icon: BookOpen },
  { to: '/shop', label: 'Shop', id: 'shop', icon: ShoppingBag },
];

export default function SideNav() {
  const location = useLocation();
  const [hovered, setHovered] = useState(null);

  return (
    <nav className="fixed left-5 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center">
      <div className="bg-chakra-surface/50 backdrop-blur-xl border border-white/10 rounded-full py-2.5 px-1.5 flex flex-col items-center gap-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <div key={item.to} className="relative group">
              <Link
                to={item.to}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                  ${isActive
                    ? 'bg-chakra-cyan text-chakra-bg shadow-[0_0_14px_rgba(37,169,186,0.5)]'
                    : 'text-chakra-muted hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
              </Link>

              {/* Tooltip */}
              <div
                className={`
                  absolute left-full top-1/2 -translate-y-1/2 ml-3 
                  px-3 py-1.5 rounded-lg whitespace-nowrap
                  bg-chakra-surface/80 backdrop-blur-md border border-white/10
                  text-xs font-medium text-white shadow-lg
                  transition-all duration-200 pointer-events-none
                  ${hovered === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
                `}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
