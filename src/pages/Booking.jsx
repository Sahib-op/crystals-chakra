import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Phone } from 'lucide-react';
import { useJourney } from '../components/JourneyContext';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { readingContact } from '../../shared/contact.js';
import { fact } from '../../shared/business.js';

export default function Booking({ embedded = false }) {
  const Heading = embedded ? 'h2' : 'h1';
  const { services, selectedId, selectedService, selectService } = useJourney();
  const contact = readingContact(selectedService);
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
          Speak directly with the studio on WhatsApp or by phone. There is no
          form to fill in and nothing to pay on this website.
        </p>
        <h3 className="booking-steps-title">How booking works</h3>
        <ol className="booking-steps">
          <li>
            <strong>Choose a reading</strong>
            <span>Or pick “I’m not sure yet” and tell us your question.</span>
          </li>
          <li>
            <strong>Send the WhatsApp message</strong>
            <span>
              It opens ready to send, and you can edit it first. Prefer to talk?
              Call the studio.
            </span>
          </li>
          <li>
            <strong>The studio confirms the details</strong>
            <span>
              Date, time, price and how to pay. Your reading is booked only once
              the studio confirms.
            </span>
          </li>
          <li>
            <strong>Have your reading</strong>
            <span>At the time you agreed together.</span>
          </li>
        </ol>
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
          value={selectedId}
          onChange={(event) => selectService(event.target.value)}
        >
          <option value="">I’m not sure yet</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.title}
            </option>
          ))}
        </select>
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
