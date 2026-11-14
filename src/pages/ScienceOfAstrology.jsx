import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import { SYMBOLS } from '../components/celestial/symbols';
import { READING_FAQ, READING_TERMS } from './readingContent';

export default function ScienceOfAstrology({ embedded = false }) {
  const Heading = embedded ? 'h2' : 'h1';
  const cards = SYMBOLS.filter((symbol) => symbol.type === 'Tarot');
  return (
    <div
      className={embedded ? 'reading-info' : 'reading-info reading-guide-page'}
    >
      {!embedded && (
        <PageMeta
          title="About Astrology & Tarot"
          description="A simple introduction to tarot cards, Vedic astrology, birth charts and the words you may hear in a reading."
          path="/science"
        />
      )}
      <header className="info-introduction">
        <p className="reading-eyebrow">
          A little understanding goes a long way
        </p>
        <Heading>
          About Astrology
          <br />
          <em>& Tarot</em>
        </Heading>
        <p>
          Start with the basics. Find the words, cards and ideas you will meet
          in a reading, then follow your curiosity.
        </p>
        <nav
          className="info-jump-links"
          aria-label="Explore the information section"
        >
          <a href="#card-meanings">Card meanings</a>
          <a href="#reading-terms">Key terms</a>
          <a href="#reading-faq">First questions</a>
        </nav>
      </header>
      <div id="understand" className="reading-basics-grid">
        <article>
          <span className="reading-eyebrow">01 / Tarot</span>
          <h3>Pictures open a conversation.</h3>
          <p>
            A reader considers the cards, their positions and your question
            together. A card’s meaning depends on that context; it is not a
            fixed verdict.
          </p>
          <Link className="reading-text-link" to="/#tarot">
            Explore tarot readings <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </article>
        <article>
          <span className="reading-eyebrow">02 / Astrology</span>
          <h3>A chart, then an interpretation.</h3>
          <p>
            A Kundli maps celestial positions for a birth time and place. Vedic
            astrology interprets that chart through traditions involving signs,
            houses and planetary periods.
          </p>
          <Link className="reading-text-link" to="/#services">
            Compare the readings <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </article>
        <article>
          <span className="reading-eyebrow">03 / Your perspective</span>
          <h3>Your choices stay yours.</h3>
          <p>
            Use a reading to reflect on your questions and priorities. Astrology
            and tarot are cultural and spiritual practices, not established
            scientific predictions.
          </p>
          <Link className="reading-text-link" to="/how-readings-work">
            What to expect <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </article>
      </div>
      <section id="card-meanings" className="info-topic">
        <div className="info-topic-heading">
          <div>
            <p className="reading-eyebrow">Meet the cards</p>
            <h3>A few meanings to begin with</h3>
          </div>
          <Link className="reading-text-link" to="/#home">
            Try the tarot cards <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <p className="info-topic-intro">
          These are starting points for reflection. A reading considers the
          whole spread and the question you bring.
        </p>
        <div className="card-meaning-grid">
          {cards.map((card) => (
            <article key={card.id}>
              <span className="meaning-card-mark" aria-hidden="true">
                {card.kind === 'sun' ? '☉' : card.kind === 'moon' ? '☾' : '✦'}
              </span>
              <div>
                <h4>{card.name}</h4>
                <p>{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section id="reading-terms" className="info-topic">
        <div className="info-topic-heading">
          <div>
            <p className="reading-eyebrow">Plain language</p>
            <h3>Words you might hear</h3>
          </div>
          <Link className="reading-text-link" to="/#services">
            Back to the readings <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <dl className="reading-glossary">
          {READING_TERMS.map(([term, definition]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{definition}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section id="reading-faq" className="info-topic info-quick-faq">
        <div className="info-topic-heading">
          <div>
            <p className="reading-eyebrow">Before you begin</p>
            <h3>Your first questions</h3>
          </div>
          <Link className="reading-text-link" to="/how-readings-work#faq">
            Read the full FAQ <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="royal-faq">
          {READING_FAQ.slice(0, 3).map((item) => (
            <details key={item.id}>
              <summary>
                {item.question}
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
        <div className="info-next-step">
          <p>
            Ready to talk? Choose a reading, or simply tell us what is on your
            mind.
          </p>
          <Link className="royal-button" to="/#booking">
            Book a reading <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
