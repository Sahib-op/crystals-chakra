import { useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import CelestialRings from '../components/CelestialRings';
import ReadingOverlay from '../components/ReadingOverlay';
import ScrollSection from '../components/ScrollSection';
import PageMeta from '../components/PageMeta';
import ScienceOfAstrology from './ScienceOfAstrology';
import Booking from './Booking';
import { generateCosmicReading } from '../cosmicEngine';
import { useJourney } from '../components/JourneyContext';
import { useAppearance } from '../components/AppearanceContext';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { readingContact } from '../../shared/contact.js';

function ReadingPackageCard({ service, selected, livePrices, onSelect }) {
  const { id, hindiTitle, title, description, features, price } = service;
  return (
    <article className={`royal-service${selected ? ' service-selected' : ''}`}>
      <div className="reading-package-label">
        <span>{service.type === 'tarot' ? 'Tarot' : 'Vedic astrology'}</span>
        {hindiTitle && (
          <span className="package-hindi-title" lang="hi">
            {hindiTitle}
          </span>
        )}
      </div>
      <h3>{title}</h3>
      {service.practitioner && <p>with {service.practitioner.name}</p>}
      <p>{description}</p>
      <ul>
        {features.map((feature) => (
          <li key={feature}>
            <Check size={14} aria-hidden="true" />
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
      <button
        className="royal-button"
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(id)}
      >
        {selected ? 'Reading selected' : 'Choose this reading'}{' '}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      <a
        className="reading-direct-link"
        href={readingContact(service).whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label={`Ask on WhatsApp about ${title}`}
      >
        Ask on WhatsApp <WhatsAppIcon size={15} />
      </a>
    </article>
  );
}

export default function Home() {
  const reduced = useReducedMotion();
  const [snapshot, setSnapshot] = useState(false);
  const [reading, setReading] = useState(null);
  const { sectionOrder } = useAppearance();
  const {
    services,
    catalogueReady,
    selectedService,
    selectService,
    serviceError: error,
    retryServices,
  } = useJourney();
  const featuredTarot = services.find((service) => service.type === 'tarot');
  const generalContact = readingContact(selectedService);
  function chooseReading(id) {
    selectService(id);
    document
      .getElementById('booking')
      ?.scrollIntoView({
        behavior: reduced ? 'instant' : 'smooth',
        block: 'start',
      });
    document.getElementById('contact-reading')?.focus({ preventScroll: true });
  }
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
    <div className="royal-journey reading-experience">
      <PageMeta path="/" />
      <ScrollSection
        id="home"
        theme="ivory"
        className="welcome-section opening-section"
      >
        <div className="welcome-grid">
          <div className="welcome-copy">
            <h1>
              Make Room for
              <br />
              <span>Clarity</span>
            </h1>
            <p>
              A quiet moment for your questions. Explore tarot and Vedic
              astrology with a personal reading, at your own pace.
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
            <Link
              className="reading-text-link welcome-guide-link"
              to="/how-readings-work"
            >
              New to readings? Start here{' '}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <CelestialRings />
        </div>
      </ScrollSection>
      <div className="readings-flow">
        <ScrollSection id="tarot" theme="royal" className="tarot-section">
          <div className="tarot-layout">
            <div className="tarot-copy">
              <div className="reading-heading">
                <span className="reading-hindi-title" lang="hi">
                  अपने सवालों को नई दृष्टि दें
                </span>
                <h2>
                  Tarot
                  <br />
                  <em>Reading</em>
                </h2>
              </div>
              {featuredTarot?.title !== 'Tarot Reading' && featuredTarot && (
                <h3>{featuredTarot.title}</h3>
              )}
              {featuredTarot?.practitioner && (
                <p className="tarot-byline">
                  with {featuredTarot.practitioner.name}
                </p>
              )}
              <p>
                {featuredTarot?.description ||
                  'Explore relationships, work and the questions on your mind in a personal tarot reading.'}
              </p>
              <a className="royal-button" href="#services">
                Find your reading <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a
                className="reading-text-link tarot-info-link"
                href="#card-meanings"
              >
                A first look at the cards{' '}
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
            <m.figure
              className="tarot-portrait"
              initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : 150 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: reduced ? 0 : 2.2,
                ease: [0.22, 0.61, 0.36, 1],
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
            </m.figure>
          </div>
          <div
            id="services"
            className="reading-options"
            aria-labelledby="reading-options-heading"
          >
            <div className="reading-options-intro">
              <h2 id="reading-options-heading">Choose your reading</h2>
              <Link
                className="reading-text-link"
                to="/how-readings-work#choosing"
              >
                A little help choosing{' '}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            {error && (
              <div className="journey-error" role="alert">
                {error}
                <button onClick={retryServices}>Try again</button>
              </div>
            )}
            {services.length ? (
              <div className="royal-services reading-package-grid">
                {services.map((service) => (
                  <ReadingPackageCard
                    key={service.id}
                    service={service}
                    selected={selectedService?.id === service.id}
                    livePrices={catalogueReady && !error}
                    onSelect={chooseReading}
                  />
                ))}
              </div>
            ) : (
              <p className="reading-catalogue-status" role="status">
                Preparing the readings. You can still contact the studio below.
              </p>
            )}
            <div id="booking" className="permanent-booking">
              <Booking embedded />
            </div>
          </div>
        </ScrollSection>
      </div>
      {sectionOrder === 'collection-first'
        ? [collection, information]
        : [information, collection]}
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
