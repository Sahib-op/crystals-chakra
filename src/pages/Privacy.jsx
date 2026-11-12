import { SUPPORT_EMAIL } from '../constants';
export default function Privacy() {
  return (
    <section className="privacy-page">
      <p className="eyebrow">Privacy & care</p>
      <h1>Privacy &amp; Care</h1>
      <h3>Contacting the studio</h3>
      <p>
        Reading enquiries open WhatsApp or your telephone app. You do not need
        to submit personal details on this website to contact the studio. The
        studio confirms the reading, timing and price with you directly.
      </p>
      <h3>Free snapshot</h3>
      <p>
        The homepage snapshot is calculated in your browser. Your date of birth
        is not saved to our database.
      </p>
      <h3>Contact and deletion</h3>
      <p>
        If you previously submitted a consultation request here, that record may
        contain your name, email, chosen reading and request reference. To ask
        about your data or request deletion, email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Hosting
        providers may retain operational logs under their own policies.
      </p>
      <h3>External services</h3>
      <p>
        WhatsApp links open a third-party service. Sending a message there is
        governed by that service’s privacy policy.
      </p>
    </section>
  );
}
