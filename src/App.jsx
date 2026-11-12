import { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  matchPath,
} from 'react-router-dom';
import { JourneyProvider } from './components/JourneyContext';
import ScrollHeader from './components/ScrollHeader';
import RoyalMotion from './components/RoyalMotion';
import SideNav from './components/SideNav';
import Footer from './components/Footer';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
const Shop = lazy(() => import('./pages/Shop'));
const Policies = lazy(() => import('./pages/Policies'));
const StudioPage = lazy(() => import('./features/studio/StudioPage.tsx'));
function NavigationEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) {
        const disclosure = document.getElementById(hash.slice(1));
        if (disclosure?.tagName === 'DETAILS') disclosure.open = true;
        document
          .getElementById(decodeURIComponent(hash.slice(1)))
          ?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
              .matches
              ? 'instant'
              : 'smooth',
            block: 'start',
          });
      } else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}
function LegacyBooking() {
  const { search } = useLocation();
  return <Navigate replace to={`/${search}#booking`} />;
}
function CustomerNavigation() {
  const { pathname } = useLocation();
  if (matchPath('/studio', pathname)) return null;
  return (
    <>
      <SideNav />
      <ScrollHeader />
      <RoyalMotion />
    </>
  );
}
// Router-agnostic shell: BrowserRouter in the browser, StaticRouter when the
// build prerenders public pages (src/entry-server.jsx).
export function AppShell() {
  return (
    <JourneyProvider>
      <NavigationEffects />
      <CustomerNavigation />
      <nav aria-label="Skip link">
        <a className="journey-skip" href="#main">
          Skip to content
        </a>
      </nav>
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/shop"
            element={
              <Suspense
                fallback={
                  <p className="px-8 py-28" role="status">
                    Opening the shop…
                  </p>
                }
              >
                <Shop />
              </Suspense>
            }
          />
          <Route
            path="/studio"
            element={
              <Suspense
                fallback={
                  <p style={{ padding: '110px 40px' }}>Opening the studio…</p>
                }
              >
                <StudioPage />
              </Suspense>
            }
          />
          <Route
            path="/services"
            element={<Navigate replace to="/#services" />}
          />
          <Route
            path="/science"
            element={<Navigate replace to="/#information" />}
          />
          <Route path="/book" element={<LegacyBooking />} />
          <Route
            path="/policies"
            element={
              <Suspense
                fallback={
                  <p className="px-8 py-28" role="status">
                    Opening policies…
                  </p>
                }
              >
                <Policies />
              </Suspense>
            }
          />
          <Route
            path="/privacy"
            element={<Navigate replace to="/policies#privacy" />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </JourneyProvider>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
