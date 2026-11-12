import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Sparkles,
  Mail,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import CelestialRings from '../components/CelestialRings';
import ReadingOverlay from '../components/ReadingOverlay';
import ScrollSection from '../components/ScrollSection';
import PageMeta from '../components/PageMeta';
import ScienceOfAstrology from './ScienceOfAstrology';
import Booking from './Booking';
import { generateCosmicReading } from '../cosmicEngine';
import { useJourney } from '../components/JourneyContext';
import { whatsapp } from '../lib/links';
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY } from '../constants';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { readingContact } from '../../shared/contact.js';
const QUESTIONS = [
  [
    'What happens when I choose a reading?',
    'A WhatsApp chat opens with your chosen reading in the message. Send it to the studio to discuss your questions, timing and price. The studio confirms the appointment with you directly.',
  ],
  [
    'What birth details will you need?',
    'For a full Kundli, the studio may ask for your date, time and place of birth after you discuss the reading. You do not need to enter these details on this website to contact us.',
  ],
  [
    'Is the free snapshot a full Kundli?',
    'No. It uses your date of birth for a conventional zodiac sign and numerology life path. A full Vedic birth chart needs more information and a separate interpretation.',
  ],
  [
    'How do I choose a reading?',
    'Start with the level of detail you want. You can also send us your questions on WhatsApp before choosing. Confirm scope, delivery and any payment directly with the studio.',
  ],
];
function ReadingPackageCard({ service, featured, livePrices, onSelect }) {
  const { id, hindiTitle, title, description, features, price } = service;
  return (
    <article className={`royal-service${featured ? ' service-selected' : ''}`}>
      {hindiTitle && (
        <span className="package-hindi-title" lang="hi" aria-hidden="true">
          {hindiTitle}
        </span>
      )}
      <h3>{title}</h3>
      {service.practitioner && <p>with {service.practitioner.name}</p>}
      <p>{description}</p>
      <ul>
        {features.map((feature) => (
          <li key={feature}>
            <Check size={14} />
            {feature}
          </li>
        ))}
      </ul>
      <div className="service-price">
        {livePrices && price !== null
          ? `₹${price.toLocaleString('en-IN')}`
          : 'Ask for price'}
        {livePrices && price !== null && <span>confirm with the studio</span>}
      </div>
      <a
        href={readingContact(service).whatsapp}
        target="_blank"
        rel="noreferrer"
        onClick={() => onSelect(id)}
        className="royal-button"
        aria-label={`Ask on WhatsApp about ${title}`}
      >
        Ask on WhatsApp <WhatsAppIcon size={17} />
      </a>
    </article>
  );
}

export default function Home() {
  const reduced = useReducedMotion();
  const [snapshot, setSnapshot] = useState(false),
    [reading, setReading] = useState(null);
  const {
    services,
    selectedService,
    selectService,
    serviceError: error,
    retryServices,
  } = useJourney();
  const [featuredTarot, ...moreTarot] = services.filter(
    (service) => service.type === 'tarot',
  );
  const astrology = services.filter((service) => service.type === 'astrology');
  const generalContact = readingContact(selectedService);
  const studioContact = readingContact();
  return (
    <div className="royal-journey">
      <PageMeta path="/" />
      <ScrollSection
        id="home"
        theme="ivory"
        className="welcome-section opening-section"
      >
        <div className="welcome-grid">
          <div className="welcome-copy">
            <h1>
              Unlock Your
              <br />
              <span>Destiny</span>
            </h1>
            <p>
              Personal tarot and Vedic astrology readings for the questions on
              your mind.
            </p>
            <div className="journey-actions">
              <a
                className="cosmic-reading-primary"
                href={generalContact.whatsapp}
                target="_blank"
                rel="noreferrer"
              >
                Get a Reading on WhatsApp <WhatsAppIcon size={19} />
              </a>
              <button
                className="cosmic-reading-secondary"
                onClick={() => setSnapshot(true)}
              >
                Get My Free Cosmic Reading <Sparkles size={19} />
              </button>
            </div>
          </div>
          <CelestialRings />
        </div>
      </ScrollSection>
      <div className="readings-flow">
        <ScrollSection id="tarot" theme="royal" className="tarot-section">
          <div className="tarot-layout">
            <div className="tarot-copy">
              <div className="reading-heading">
                {featuredTarot?.hindiTitle && (
                  <span
                    className="reading-hindi-title"
                    lang="hi"
                    aria-hidden="true"
                  >
                    {featuredTarot.hindiTitle}
                  </span>
                )}
                <h2>
                  Tarot
                  <br />
                  <em>Reading</em>
                </h2>
              </div>
              {featuredTarot ? (
                <>
                  {featuredTarot.title !== 'Tarot Reading' && (
                    <h3>{featuredTarot.title}</h3>
                  )}
                  {featuredTarot.practitioner && (
                    <p className="tarot-byline">
                      with {featuredTarot.practitioner.name}
                    </p>
                  )}
                  <p>{featuredTarot.description}</p>
                  <a
                    className="royal-button"
                    href={readingContact(featuredTarot).whatsapp}
                    onClick={() => selectService(featuredTarot.id)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ask about ${featuredTarot.title} on WhatsApp`}
                  >
                    Ask about Tarot <WhatsAppIcon size={18} />
                  </a>
                </>
              ) : (
                <a
                  className="royal-button"
                  href={studioContact.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ask about available Tarot readings <WhatsAppIcon size={18} />
                </a>
              )}
            </div>
            <motion.figure
              className="tarot-portrait"
              initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : 88 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: reduced ? 0 : 0.9,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <img
                src="/images/amanpreet-placeholder.svg"
                alt="Portrait placeholder for Amanpreet Kaur"
                width="600"
                height="720"
                loading="lazy"
                decoding="async"
              />
            </motion.figure>
          </div>
          {moreTarot.length > 0 && (
            <div className="royal-services">
              {moreTarot.map((service) => (
                <ReadingPackageCard
                  key={service.id}
                  service={service}
                  livePrices={!error}
                  onSelect={selectService}
                />
              ))}
            </div>
          )}
        </ScrollSection>
        <ScrollSection id="services" theme="royal" className="services-section">
          <div className="royal-section-heading">
            <h2>
              Reveal What
              <br />
              <em>Your Stars Say</em>
            </h2>
          </div>
          {error && (
            <div className="journey-error" role="alert">
              {error}
              <button onClick={retryServices}>Try again</button>
            </div>
          )}
          {!astrology.length ? (
            <a
              className="royal-button"
              href={studioContact.whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              Ask about available Kundli readings <WhatsAppIcon size={18} />
            </a>
          ) : (
            <div className="royal-services">
              {astrology.map((service, index) => (
                <ReadingPackageCard
                  key={service.id}
                  service={service}
                  featured={index === 1}
                  livePrices={!error}
                  onSelect={selectService}
                />
              ))}
            </div>
          )}
        </ScrollSection>
      </div>
      <ScrollSection id="booking" theme="ivory">
        <Booking embedded />
      </ScrollSection>
      <ScrollSection id="information" theme="parchment">
        <ScienceOfAstrology embedded />
      </ScrollSection>
      <ScrollSection
        id="collection"
        theme="midnight"
        className="collection-invitation"
      >
        <div className="collection-art" aria-hidden="true">
          <span className="gem-shape gem-a" />
          <span className="gem-shape gem-b" />
          <span className="gem-shape gem-c" />
          <div className="gem-orbit" />
        </div>
        <div>
          <h2>
            Crystals
            <br />
            <em>& Tools</em>
          </h2>
          <Link className="royal-button" to="/shop">
            Shop the Collection <ArrowRight size={17} />
          </Link>
        </div>
      </ScrollSection>
      <ScrollSection id="questions" theme="parchment">
        <div className="questions-layout">
          <div>
            <h2>
              Common
              <br />
              <em>Questions</em>
            </h2>
            <a
              className="contact-link"
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} />
              {WHATSAPP_DISPLAY}
              <ArrowUpRight size={15} />
            </a>
            <a className="contact-link" href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail size={16} />
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div className="royal-faq">
            {QUESTIONS.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <ChevronDown size={16} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
        <details id="privacy" className="privacy-disclosure">
          <summary>
            Privacy & care <ChevronDown size={14} />
          </summary>
          <p>
            You do not need to submit personal details here to contact the
            studio. The free reading calculates your date of birth in your
            browser without saving or sharing it. WhatsApp and telephone links
            open external services. If you previously submitted a consultation
            request here, contact {SUPPORT_EMAIL} to ask about that record or
            request deletion. Hosting providers may keep operational logs.{' '}
            <Link to="/policies#privacy">Read the full privacy notice</Link>.
          </p>
        </details>
      </ScrollSection>
      <ReadingOverlay
        onRestart={() => setReading(null)}
        isOpen={snapshot}
        reading={reading}
        onClose={() => {
          setSnapshot(false);
          setReading(null);
        }}
        onGenerate={(data) => setReading(generateCosmicReading(data.dob))}
      />
    </div>
  );
}
