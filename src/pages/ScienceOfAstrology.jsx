import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  Mail,
  Clock,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import PageMeta from '../components/PageMeta';
import CosmicBackground from '../components/CosmicBackground';
import AnimatedTitle from '../components/AnimatedTitle';
import ZodiacWheel from '../components/ZodiacWheel';
import RevealOnce from '../components/RevealOnce';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { useJourney } from '../components/JourneyContext';
import {
  BIRTH_DETAILS,
  CARD_MEANINGS,
  KEY_TERMS,
  PROOF_NOTE,
  QUESTIONS,
} from '../content/readingGuide';
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY } from '../constants';
import { readingContact } from '../../shared/contact.js';

const TOPICS = [
  ['#card-meanings', 'Card meanings'],
  ['#key-terms', 'Key terms'],
  ['#birth-details', 'Birth details'],
  ['#questions', 'First questions'],
];

// Links from a topic back to the readings that use it: selecting the reading
// in the booking panel and jumping there.
function ReadingLinks({ ids }) {
  const { services, selectService } = useJourney();
  const readings = ids
    .map((id) => services.find((service) => service.id === id))
    .filter(Boolean);
  if (!readings.length) return null;
  return (
    <p className="topic-readings">
      <span>In:</span>{' '}
      {readings.map((reading, index) => (
        <span key={reading.id}>
          {index > 0 && ', '}
          <a href="#booking" onClick={() => selectService(reading.id)}>
            {reading.title}
          </a>
        </span>
      ))}
    </p>
  );
}

const DETAIL_ICONS = { date: CalendarDays, time: Clock, place: MapPin };

export default function ScienceOfAstrology({ embedded = false }) {
  return (
    <div
      className={
        embedded
          ? 'embedded-science'
          : 'relative min-h-screen bg-chakra-bg overflow-hidden'
      }
    >
      {!embedded && (
        <>
          <PageMeta
            title="Understanding Astrology"
            description="Birth charts, traditional interpretation and the distinction between astronomy and astrology."
            path="/science"
          />
          <CosmicBackground />
        </>
      )}
      <div className="cosmic-page relative z-10">
        <section className="science-hero">
          <AnimatedTitle
            as={embedded ? 'h2' : 'h1'}
            text="Understanding Astrology"
            goldWord="Astrology"
            className="science-title font-serif font-bold"
            startDelay={0.1}
          />
          {/* The note sits over the ring, translucent, and slides in once. */}
          <div className="science-hero-art">
            <div
              className="chart-art"
              aria-label="Decorative zodiac birth-chart illustration"
              role="img"
            >
              <div className="chart-halo" />
              <ZodiacWheel size={360} />
            </div>
            <RevealOnce as="aside" className="proof-note">
              <h3>{PROOF_NOTE.title}</h3>
              <p>{PROOF_NOTE.text}</p>
            </RevealOnce>
          </div>
        </section>
        <nav
          className="topic-nav"
          aria-label="About astrology and tarot topics"
        >
          {TOPICS.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <Link to="/how-readings-work">
            Full reading guide <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </nav>
        <section
          id="card-meanings"
          className="topic-block"
          aria-labelledby="card-meanings-title"
        >
          <div className="topic-heading">
            <h3 id="card-meanings-title">A few tarot cards and their themes</h3>
            <a href="#booking" className="topic-heading-link">
              Book a tarot reading <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
          <p className="topic-intro">
            Starting points for reflection. A reader looks at the whole spread
            and your question, not one card alone.
          </p>
          <ul className="card-meaning-grid">
            {CARD_MEANINGS.map((card) => (
              <li key={card.id} id={`card-${card.id}`}>
                <span className="card-meaning-numeral" aria-hidden="true">
                  {card.numeral}
                </span>
                <h4>{card.name}</h4>
                <p>{card.text}</p>
              </li>
            ))}
          </ul>
          <p className="topic-readings">
            Card art:{' '}
            <a href="https://github.com/mixvlad/TarotCards/tree/main/tarot/soimoi">
              Soimoi Tarot
            </a>{' '}
            by <a href="https://koz.tv/">Mike Koz</a>,{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
            . Resized and framed for this site.
          </p>
        </section>
        <section id="birth-details" className="birth-details-section">
          <h3 className="section-title">
            For a full reading, you need{' '}
            <ArrowRight
              className="birth-details-arrow"
              size={26}
              aria-hidden="true"
            />
          </h3>
          <ul className="birth-details-list">
            {BIRTH_DETAILS.map(({ id, hinglish, hindi, en }) => {
              const Icon = DETAIL_ICONS[id];
              return (
                <li key={id}>
                  <span className="detail-icon" aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <span className="detail-name">
                    {hinglish}
                    <span className="detail-divider" aria-hidden="true">
                      |
                    </span>
                    <span lang="hi">{hindi}</span>
                    <span className="sr-only"> ({en})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section
          id="key-terms"
          className="topic-block"
          aria-labelledby="key-terms-title"
        >
          <div className="topic-heading">
            <h3 id="key-terms-title">Words you might hear</h3>
            <a href="#services" className="topic-heading-link">
              See the readings <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
          <dl className="key-term-list">
            {KEY_TERMS.map((item) => (
              <div key={item.id} id={`term-${item.id}`}>
                <dt>{item.term}</dt>
                <dd>
                  {item.text}
                  <ReadingLinks ids={item.readings} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
        {embedded && <ShortQuestions />}
      </div>
    </div>
  );
}

// The short FAQ on the home page; the full list is on /how-readings-work.
// Also carries the studio's direct contacts and the privacy note that used
// to sit in the final Questions section.
function ShortQuestions() {
  const studio = readingContact();
  return (
    <section
      id="questions"
      className="topic-block short-questions"
      aria-labelledby="questions-title"
    >
      <div className="topic-heading">
        <h3 id="questions-title">Your first questions</h3>
        <Link
          to="/how-readings-work#all-questions"
          className="topic-heading-link"
        >
          All questions <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      <div className="short-questions-layout">
        <div className="royal-faq">
          {QUESTIONS.filter((item) => item.short).map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <div className="short-questions-contact">
          <p>Still unsure? Ask the studio directly.</p>
          <a
            className="contact-link"
            href={studio.whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon size={17} />
            {WHATSAPP_DISPLAY}
          </a>
          <a className="contact-link" href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail size={16} aria-hidden="true" />
            {SUPPORT_EMAIL}
          </a>
          <details id="privacy" className="privacy-disclosure">
            <summary>
              Privacy & care <ChevronDown size={14} aria-hidden="true" />
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
        </div>
      </div>
    </section>
  );
}
