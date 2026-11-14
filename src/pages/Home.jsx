import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import CelestialRings from '../components/CelestialRings';
import ReadingOverlay from '../components/ReadingOverlay';
import ScrollSection from '../components/ScrollSection';
import RevealOnce from '../components/RevealOnce';
import PageMeta from '../components/PageMeta';
import ScienceOfAstrology from './ScienceOfAstrology';
import Booking from './Booking';
import { generateCosmicReading } from '../cosmicEngine';
import { useJourney } from '../components/JourneyContext';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { readingContact } from '../../shared/contact.js';
// The portrait slides in once, the first time it scrolls into view
// (.tarot-portrait in refinements.css).
function PortraitReveal({ children }) {
  return (
    <RevealOnce as="figure" className="tarot-portrait">
      {children}
    </RevealOnce>
  );
}

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
  const readings = (
    <div key="readings" className="readings-flow">
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
                <div className="tarot-actions">
                  <a
                    className="royal-button"
                    href="#booking"
                    onClick={() => selectService(featuredTarot.id)}
                  >
                    Book a tarot reading
                  </a>
                  <a
                    className="tarot-direct-link"
                    href={readingContact(featuredTarot).whatsapp}
                    onClick={() => selectService(featuredTarot.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    or ask on WhatsApp <WhatsAppIcon size={16} />
                  </a>
                </div>
                <a className="reading-learn-link" href="#card-meanings">
                  What do the cards mean? <ArrowRight size={15} />
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
          <PortraitReveal>
            <img
              src="/images/amanpreet-placeholder.svg"
              alt="Portrait placeholder for Amanpreet Kaur"
              width="600"
              height="720"
              loading="lazy"
              decoding="async"
            />
          </PortraitReveal>
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
        <h2 className="sr-only">Astrology readings</h2>
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
          <div
            className="royal-services reading-grid"
            style={{ '--count': astrology.length }}
          >
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
        <nav className="reading-learn-row" aria-label="Learn about readings">
          <span>New to readings?</span>
          <a href="#key-terms">Key terms</a>
          <a href="#card-meanings">Card meanings</a>
          <Link to="/how-readings-work">How a reading works</Link>
        </nav>
        {/* One permanent booking panel for every reading, tarot included. */}
        <div id="booking" className="booking-sheet">
          <Booking embedded />
        </div>
      </ScrollSection>
    </div>
  );
  const information = (
    <ScrollSection key="information" id="information" theme="parchment">
      <ScienceOfAstrology embedded />
    </ScrollSection>
  );
  const collection = (
    <ScrollSection
      key="collection"
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
  );
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
              Find Your
              <br />
              <span>Direction</span>
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
      {/* Fixed order: Readings → Collection → About Astrology. */}
      {readings}
      {collection}
      {information}
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
