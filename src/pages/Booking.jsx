import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, Phone } from 'lucide-react';
import { useJourney } from '../components/JourneyContext';
import WhatsAppIcon from '../components/WhatsAppIcon';
import {
  MAX_READING_QUESTION_LENGTH,
  readingContact,
} from '../../shared/contact.js';
import { fact } from '../../shared/business.js';

const UNSURE = '__unsure';

export default function Booking({ embedded = false }) {
  const Heading = embedded ? 'h2' : 'h1';
  const { services, selectedId, selectedService, selectService } = useJourney();
  const [unsure, setUnsure] = useState(false);
  const [question, setQuestion] = useState('');
  const choice = selectedId || (unsure ? UNSURE : '');
  const contact = readingContact(
    selectedService,
    choice === UNSURE ? question : '',
  );
  const hours = fact('hours'),
    responseTime = fact('responseTime');
  const [copyStatus, setCopyStatus] = useState('');
  const copyTimer = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  async function copyNumber() {
    clearTimeout(copyTimer.current);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(contact.copyNumber);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('manual');
    }
    copyTimer.current = setTimeout(() => setCopyStatus(''), 4000);
  }
  return (
    <section
      className="booking-page contact-hub"
      aria-labelledby="booking-heading"
    >
      <div>
        <Heading id="booking-heading">
          Book Your <span className="gold-gradient-text">Reading</span>
        </Heading>
        <p className="page-intro">
          Ask the studio about a reading on WhatsApp or by phone.
        </p>
        <h3 className="booking-steps-title">How booking works</h3>
        <ol className="booking-steps">
          <li>
            <strong>Choose a reading</strong>
            <span>Or pick “I’m not sure yet” and tell us your question.</span>
          </li>
          <li>
            <strong>Message or call the studio</strong>
            <span>
              You can edit the prepared WhatsApp message before sending.
            </span>
          </li>
          <li>
            <strong>The studio confirms the details</strong>
            <span>
              Agree on timing and payment. Your reading is booked only once the
              studio confirms.
            </span>
          </li>
        </ol>
        <Link className="booking-guide-link" to="/how-readings-work">
          Your first reading, explained
        </Link>
        {(hours || responseTime) && (
          <p className="booking-hours">
            {hours && <>Studio hours: {hours}. </>}
            {responseTime}
          </p>
        )}
      </div>
      <div className="booking-panel contact-panel">
        <label htmlFor="contact-reading">Which reading interests you?</label>
        <select
          id="contact-reading"
          name="reading"
          className={choice ? undefined : 'contact-placeholder'}
          value={choice}
          onChange={(event) => {
            const value = event.target.value;
            setUnsure(value === UNSURE);
            selectService(value === UNSURE ? '' : value);
          }}
        >
          <option value="" disabled>
            Choose here
          </option>
          <option value={UNSURE}>I’m not sure yet</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.title}
            </option>
          ))}
        </select>
        {choice === UNSURE && (
          <div className="contact-question">
            <label htmlFor="contact-question">
              What would you like to ask? (optional)
            </label>
            <textarea
              id="contact-question"
              rows={3}
              maxLength={MAX_READING_QUESTION_LENGTH}
              placeholder="Tell us what you’d like guidance on…"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>
        )}
        <div className="contact-hub-actions">
          <a
            className="contact-action contact-whatsapp"
            href={contact.whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon size={21} /> Chat on WhatsApp{' '}
            <ArrowUpRight size={17} />
          </a>
          <a className="contact-action contact-call" href={contact.telephone}>
            <Phone size={18} />
            Call the Studio
          </a>
        </div>
        <div className="contact-phone-row">
          <a
            href={contact.telephone}
            aria-label={`Call ${contact.displayNumber}`}
          >
            {contact.displayNumber}
          </a>
          <button
            type="button"
            onClick={copyNumber}
            aria-label="Copy studio phone number"
          >
            {copyStatus === 'copied' ? <Check size={16} /> : <Copy size={16} />}
            <span>{copyStatus === 'copied' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <p className="contact-copy-status" role="status">
          {copyStatus === 'copied'
            ? 'Phone number copied.'
            : copyStatus === 'manual'
              ? 'Select the phone number above to copy it.'
              : ''}
        </p>
      </div>
    </section>
  );
}
