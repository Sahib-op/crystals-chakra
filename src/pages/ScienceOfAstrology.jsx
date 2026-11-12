import { useState } from 'react';
import {
  Compass,
  Orbit,
  BookOpen,
  Clock,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import PageMeta from '../components/PageMeta';
import CosmicBackground from '../components/CosmicBackground';
import AnimatedTitle from '../components/AnimatedTitle';
import ZodiacWheel from '../components/ZodiacWheel';

const CHAPTERS = [
  {
    label: 'The birth chart',
    title: 'A map of a moment.',
    icon: Orbit,
    text: 'A Kundli maps celestial positions for a particular birth time and place. Those calculations form the chart; interpreting it is a separate part of the reading.',
  },
  {
    label: 'The interpretation',
    title: 'Tradition gives it meaning.',
    icon: BookOpen,
    text: 'Vedic astrology interprets houses, signs and planetary periods through traditional frameworks. A reading explores themes and possibilities through that cultural lens.',
  },
  {
    label: 'Your perspective',
    title: 'Your choices stay yours.',
    icon: Compass,
    text: 'Use a reading to reflect on your questions, priorities and intentions. It should create room for your choices, rather than a feeling that your future is fixed.',
  },
];
export default function ScienceOfAstrology({ embedded = false }) {
  const [active, setActive] = useState(0);
  const chapter = CHAPTERS[active],
    Icon = chapter.icon;
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
            title="The Science of Astrology"
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
            text="The Science of Astrology"
            goldWord="Astrology"
            className="science-title font-serif font-bold"
            startDelay={0.1}
          />
          <div
            className="chart-art"
            aria-label="Decorative zodiac birth-chart illustration"
            role="img"
          >
            <div className="chart-halo" />
            <ZodiacWheel size={360} />
          </div>
        </section>
        <section id="understand" className="science-explainer">
          <div
            className="chapter-tabs"
            role="group"
            aria-label="Explore the reading process"
          >
            {CHAPTERS.map((c, i) => (
              <button
                key={c.label}
                aria-pressed={active === i}
                onClick={() => setActive(i)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <article className="chapter-panel" aria-live="polite">
            <div className="chapter-visual" aria-hidden="true">
              <Icon size={68} strokeWidth={0.8} />
            </div>
            <div>
              <h3>{chapter.title}</h3>
              <p>{chapter.text}</p>
            </div>
          </article>
        </section>
        <section className="birth-details-section">
          <h3 className="section-title">For a full reading</h3>
          <div className="birth-details-list">
            {[
              [CalendarDays, 'Date of birth'],
              [Clock, 'Time of birth'],
              [MapPin, 'Place of birth'],
            ].map(([I, title]) => (
              <div key={title}>
                <span className="detail-icon">
                  <I size={22} />
                </span>
                <h4>{title}</h4>
              </div>
            ))}
          </div>
        </section>
        <aside className="parchment-note">
          <div>
            <h3>Precision is not the same as proof.</h3>
            <p>
              Astrology is a cultural and spiritual practice. Its claims about
              personality and future events are not established scientific
              predictions. A chart’s calculations and the meaning people find in
              it are different things.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
