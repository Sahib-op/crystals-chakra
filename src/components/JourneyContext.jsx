import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadReadingCatalogue } from '../lib/catalogue.ts';
import { services as bundledServices } from '../../shared/catalog.js';
export const SECTION_LABELS = {
  home: 'Welcome',
  tarot: 'Tarot Readings',
  services: 'Kundli Services',
  collection: 'Shop',
  information: 'The Science',
  booking: 'Contact the Studio',
  questions: 'Questions',
};
const JourneyContext = createContext(null);
export function JourneyProvider({ children }) {
  const location = useLocation(),
    navigate = useNavigate();
  const [catalogue, setCatalogue] = useState(null),
    [serviceError, setServiceError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const [activeSection, setActiveSection] = useState('home'),
    [headerVisible, setHeaderVisible] = useState(false);
  const headerRef = useRef(null);
  useEffect(() => {
    if (location.pathname !== '/') return;
    const controller = new AbortController();
    setServiceError('');
    loadReadingCatalogue(controller.signal)
      .then((catalog) => {
        setCatalogue(catalog);
      })
      .catch((e) => {
        if (e.name !== 'AbortError')
          setServiceError(
            'Live catalogue updates are unavailable. Confirm details with the studio.',
          );
      });
    return () => controller.abort();
  }, [attempt, location.pathname]);
  useEffect(() => {
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (location.pathname !== '/') {
          setHeaderVisible(false);
          return;
        }
        let current = 'home';
        for (const id of Object.keys(SECTION_LABELS)) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= innerHeight * 0.35)
            current = id;
        }
        setActiveSection(current);
        setHeaderVisible(window.scrollY > 64);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    const main = document.getElementById('main');
    if (main) observer.observe(main);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [location.pathname]);
  const services = catalogue ?? (serviceError ? bundledServices : []);
  const requested = new URLSearchParams(location.search).get('service') || '';
  const selectedService = services.find((s) => s.id === requested) || null;
  function selectService(id) {
    const params = new URLSearchParams(location.search);
    if (id) params.set('service', id);
    else params.delete('service');
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params}` : '',
        hash: location.hash,
      },
      { replace: true },
    );
  }
  return (
    <JourneyContext.Provider
      value={{
        services,
        serviceError,
        retryServices: () => setAttempt((n) => n + 1),
        activeSection,
        headerVisible,
        headerRef,
        selectedId: selectedService?.id || '',
        selectedService,
        selectService,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}
export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('JourneyProvider is required');
  return context;
}
