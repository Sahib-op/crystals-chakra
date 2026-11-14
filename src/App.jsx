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
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import PageLoading from './components/PageLoading';
import KeyboardViewport from './components/KeyboardViewport';
import ScrollHeader from './components/ScrollHeader';
import RoyalMotion from './components/RoyalMotion';
import SideNav from './components/SideNav';
import Footer from './components/Footer';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
const Shop = lazy(() => import('./pages/Shop'));
const Policies = lazy(() => import('./pages/Policies'));
const HowReadingsWork = lazy(() => import('./pages/HowReadingsWork'));
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
export function AppShell({ staticPages = {} }) {
  const ShopPage = staticPages.Shop || Shop;
  const PoliciesPage = staticPages.Policies || Policies;
  const GuidePage = staticPages.HowReadingsWork || HowReadingsWork;
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <JourneyProvider>
          <div className="app-shell">
            <NavigationEffects />
            <KeyboardViewport />
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
                        <PageLoading
                          variant="shop"
                          title="Opening the collection…"
                        />
                      }
                    >
                      <ShopPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/studio"
                  element={
                    <Suspense
                      fallback={
                        <PageLoading
                          variant="studio"
                          title="Opening the studio…"
                        />
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
                  path="/how-readings-work"
                  element={
                    <Suspense
                      fallback={
                        <PageLoading title="Opening the reading guide…" />
                      }
                    >
                      <GuidePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/policies"
                  element={
                    <Suspense
                      fallback={<PageLoading title="Opening policies…" />}
                    >
                      <PoliciesPage />
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
          </div>
        </JourneyProvider>
      </LazyMotion>
    </MotionConfig>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
