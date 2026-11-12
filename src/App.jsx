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
import Shop from './pages/Shop';
import NotFound from './pages/NotFound';
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
export default function App() {
  return (
    <BrowserRouter>
      <JourneyProvider>
        <NavigationEffects />
        <CustomerNavigation />
        <a className="journey-skip" href="#main">
          Skip to content
        </a>
        <main id="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
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
              path="/privacy"
              element={<Navigate replace to="/#privacy" />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </JourneyProvider>
    </BrowserRouter>
  );
}
