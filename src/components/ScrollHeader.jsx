import {
  m,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Phone } from 'lucide-react';
import BrandLogo from './BrandLogo';
import WhatsAppIcon from './WhatsAppIcon';
import { useJourney } from './JourneyContext';
import { readingContact } from '../../shared/contact.js';

export default function ScrollHeader() {
  const { headerVisible, headerRef, selectedService } = useJourney();
  const { search, pathname } = useLocation();
  const studio = pathname === '/';
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const targetMorph = useTransform(scrollY, [0, 120], [0, 1]);
  const morph = useSpring(targetMorph, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });
  const contact = readingContact(selectedService);
  return (
    <m.header
      ref={headerRef}
      className={`scroll-header ${!studio || headerVisible ? 'is-pill' : 'is-masthead'}`}
      aria-label="Reading shortcuts"
      style={{ '--header-morph': studio ? (reduced ? targetMorph : morph) : 1 }}
    >
      <div className="scroll-header-inner">
        <Link
          className="scroll-header-brand"
          to={`/${search}#home`}
          aria-label="Crystals Chakra, back to top"
          onClick={() =>
            document
              .getElementById('home')
              ?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' })
          }
        >
          <BrandLogo size="xs" />
          <span>
            Crystals <b>Chakra</b>
          </span>
        </Link>
        <div className="scroll-header-actions">
          <a
            className="header-whatsapp"
            href={contact.whatsapp}
            target="_blank"
            rel="noreferrer"
            aria-label={
              selectedService
                ? `Contact on WhatsApp about ${selectedService.title}`
                : 'Contact on WhatsApp'
            }
          >
            <WhatsAppIcon />
            <span>Contact</span>
          </a>
          <a
            className="header-reading"
            href={contact.telephone}
            aria-label="Call the studio"
          >
            <span className="header-reading-long">Call the studio</span>
            <span className="header-reading-short">Call</span>
            <Phone size={14} />
          </a>
        </div>
      </div>
    </m.header>
  );
}
