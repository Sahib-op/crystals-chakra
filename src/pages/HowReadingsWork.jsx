import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { QUESTIONS } from '../content/readingGuide';
import { PENDING_TEXT, fact } from '../../shared/business.js';
import { readingContact } from '../../shared/contact.js';
import './how-readings-work.css';

const STEPS = [
  [
    'Choose a reading',
    'Tarot or one of the Kundli readings. Not sure? Choose “I’m not sure yet” and tell the studio your question.',
  ],
  [
    'Send the WhatsApp message, or call',
    'The message opens ready to send and you can edit it first. Nothing is booked or paid on this website.',
  ],
  [
    'The studio confirms the details',
    'Date, time, price and how to pay. Your reading is booked only once the studio confirms with you.',
  ],
  [
    'Have your reading',
    'At the agreed time. Bring your questions; for a Kundli, the studio will already have your birth details.',
  ],
];

function Pending({ path }) {
  const value = fact(path);
  return value === null ? (
    <span className="guide-pending">{PENDING_TEXT}</span>
  ) : (
    <>{String(value)}</>
  );
}

export default function HowReadingsWork() {
  const studio = readingContact();
  return (
    <div className="reading-guide">
      <PageMeta
        title="How a reading works"
        description="What happens when you book a tarot or Kundli reading with Crystals Chakra, how to prepare, and answers to common questions."
        path="/how-readings-work"
      />
      <header className="reading-guide-header">
        <Link to="/#booking" className="reading-guide-back">
          ← Back to the readings
        </Link>
        <h1>
          How a reading <em>works</em>
        </h1>
        <p>
          A personal reading is a conversation with the studio about the
          questions on your mind. Here is what to expect, from your first
          message to the reading itself.
        </p>
      </header>

      <section aria-labelledby="guide-steps">
        <h2 id="guide-steps">From first message to reading</h2>
        <ol className="guide-steps">
          {STEPS.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guide-compare">
        <h2 id="guide-compare">Tarot or a Kundli reading?</h2>
        <div className="guide-compare">
          <article>
            <h3>Tarot</h3>
            <p>
              Cards drawn for your question. Good for what is happening now: a
              decision, a relationship, a crossroads.
            </p>
            <p>
              <strong>You need:</strong> just your question.
            </p>
            <Link to="/#card-meanings">
              A few cards and their themes{' '}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </article>
          <article>
            <h3>Kundli (birth chart)</h3>
            <p>
              An interpretation of your birth chart. Good for longer patterns,
              periods of life and the bigger picture.
            </p>
            <p>
              <strong>You need:</strong> date, time and place of birth.
            </p>
            <Link to="/#key-terms">
              Words you might hear <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>

      <section aria-labelledby="guide-prepare">
        <h2 id="guide-prepare">Before your reading</h2>
        <ul className="guide-list">
          <li>Write down one to three questions that matter to you.</li>
          <li>
            For a Kundli, check your birth time if you can; a birth certificate
            or a family member may know it.
          </li>
          <li>Find a quiet place for the conversation.</li>
          <li>
            Come with an open mind: a reading is for reflection, and your
            choices stay yours.
          </li>
        </ul>
      </section>

      <section aria-labelledby="guide-terms">
        <h2 id="guide-terms">Payment, changes and cancellations</h2>
        <dl className="guide-facts">
          <dt>How readings are given</dt>
          <dd>
            <Pending path="readings.delivery" />
          </dd>
          <dt>Payment</dt>
          <dd>
            <Pending path="readings.payment" />
          </dd>
          <dt>Rescheduling and cancellation</dt>
          <dd>
            <Pending path="readings.cancellation" />
          </dd>
          <dt>Refunds</dt>
          <dd>
            <Pending path="readings.refunds" />
          </dd>
        </dl>
        <p>
          Full terms are in our <Link to="/policies#readings">policies</Link>.
        </p>
      </section>

      <section id="all-questions" aria-labelledby="guide-questions">
        <h2 id="guide-questions">All questions</h2>
        <div className="royal-faq guide-faq">
          {QUESTIONS.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="guide-cta" aria-labelledby="guide-ready">
        <h2 id="guide-ready">Ready when you are</h2>
        <div>
          <Link className="guide-button" to="/#booking">
            Book a reading
          </Link>
          <a
            className="guide-link"
            href={studio.whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            Ask the studio on WhatsApp <WhatsAppIcon size={16} />
          </a>
        </div>
      </section>
    </div>
  );
}
