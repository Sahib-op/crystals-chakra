import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Phone } from 'lucide-react';
import { useJourney } from '../components/JourneyContext';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { readingContact } from '../../shared/contact.js';

export default function Booking({ embedded = false }) {
  const Heading = embedded ? 'h2' : 'h1';
  const { services, selectedId, selectedService, selectService } = useJourney();
  const contact = readingContact(selectedService);
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
          Request Your <span className="gold-gradient-text">Reading</span>
        </Heading>
        <p className="page-intro">
          Speak directly with the studio. Discuss your questions, timing and
          price on WhatsApp or by phone.
        </p>
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
