import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
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
import RouteLoading from './components/RouteLoading';
import { loadShopPage, prefetchShop } from './lib/prefetch';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
const Shop = lazy(loadShopPage);
const Policies = lazy(() => import('./pages/Policies'));
const HowReadingsWork = lazy(() => import('./pages/HowReadingsWork'));
const StudioPage = lazy(() => import('./features/studio/StudioPage.tsx'));
function NavigationEffects() {
  const { pathname, hash } = useLocation();
  // A new page starts at the top before it paints. Smooth scrolling here would
  // glide up from the old scroll position past the footer while the next page
  // is still loading.
  useLayoutEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  useEffect(() => {
    if (!hash) return undefined;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      return undefined;
    }
    function scrollToTarget() {
      const target = document.getElementById(id);
      if (!target) return false;
      if (target instanceof HTMLDetailsElement) target.open = true;
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
      return true;
    }
    const main = document.getElementById('main');
    let observer;
    const frame = requestAnimationFrame(() => {
      if (scrollToTarget() || !main) return;
      observer = new MutationObserver(() => {
        if (scrollToTarget()) observer.disconnect();
      });
      observer.observe(main, { childList: true, subtree: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [pathname, hash]);
  return null;
}
// Hover, focus or touch on any shop link starts loading the shop early.
function ShopIntent() {
  useEffect(() => {
    const onIntent = (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('a[href="/shop"]')
      )
        prefetchShop();
    };
    const events = ['pointerover', 'focusin', 'touchstart'];
    for (const type of events)
      document.addEventListener(type, onIntent, { passive: true });
    return () => {
      for (const type of events) document.removeEventListener(type, onIntent);
    };
  }, []);
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
      <ShopIntent />
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
                  <RouteLoading tone="midnight" label="Opening the shop…" />
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
                  <RouteLoading tone="parchment" label="Opening the studio…" />
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
              <Suspense fallback={<RouteLoading label="Opening policies…" />}>
                <Policies />
              </Suspense>
            }
          />
          <Route
            path="/how-readings-work"
            element={
              <Suspense
                fallback={<RouteLoading label="Opening the reading guide…" />}
              >
                <HowReadingsWork />
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
