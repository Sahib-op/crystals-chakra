import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta';
import {
  BUSINESS,
  PENDING_TEXT,
  fact,
  missingBusinessFacts,
} from '../../shared/business.js';
import { STUDIO, CONTACT_DESTINATIONS } from '../../shared/studio.js';
import './policies.css';

function Value({ path, children }) {
  const value = fact(path);
  if (value === null)
    return <span className="policy-pending">{PENDING_TEXT}</span>;
  return children ? children(value) : <>{String(value)}</>;
}

const SECTIONS = [
  ['contact', 'Business and contact details'],
  ['privacy', 'Privacy notice'],
  ['readings', 'Readings: terms, payment and cancellation'],
  ['shipping', 'Shop: shipping and delivery'],
  ['returns', 'Shop: returns, refunds and cancellation'],
  ['products', 'About our crystals and products'],
  ['grievance', 'Complaints and grievance officer'],
];

export default function Policies() {
  const pending = missingBusinessFacts();
  const studio = CONTACT_DESTINATIONS.studio;
  return (
    <div className="policies-page">
      <PageMeta
        title="Policies"
        description="Privacy, readings, shipping, returns and grievance information for Crystals Chakra."
        path="/policies"
      />
      <header className="policies-header">
        <Link to="/" className="policies-back">
          ← Back to the studio
        </Link>
        <h1>Policies and customer information</h1>
        {pending.length > 0 ? (
          <p className="policies-status" role="note">
            <strong>Draft.</strong> The studio is still confirming some details
            below; they are marked “{PENDING_TEXT}” Nothing here is final until
            then.
          </p>
        ) : (
          <p className="policies-status">
            Effective {BUSINESS.policiesEffectiveDate}.
          </p>
        )}
        <nav aria-label="Policy sections">
          <ul className="policies-toc">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section id="contact" aria-labelledby="contact-title">
        <h2 id="contact-title">Business and contact details</h2>
        <dl className="policy-facts">
          <dt>Trading name</dt>
          <dd>{STUDIO.name}</dd>
          <dt>Registered name</dt>
          <dd>
            <Value path="legalName" />
          </dd>
          <dt>Address</dt>
          <dd>
            <Value path="address" />
          </dd>
          {BUSINESS.gstin && (
            <>
              <dt>GSTIN</dt>
              <dd>{BUSINESS.gstin}</dd>
            </>
          )}
          <dt>WhatsApp and phone</dt>
          <dd>
            <a href={`tel:+${studio.telephone}`}>{studio.display}</a>
          </dd>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${STUDIO.supportEmail}`}>{STUDIO.supportEmail}</a>
          </dd>
          <dt>Hours</dt>
          <dd>
            <Value path="hours" />
          </dd>
        </dl>
      </section>

      <section id="privacy" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Privacy notice</h2>
        <p>
          This notice explains what personal data {STUDIO.name} handles, why,
          and how you can exercise your rights. We collect as little as we can.
        </p>
        <h3>On this website</h3>
        <ul>
          <li>
            You do not need an account or a form to contact us. Reading
            enquiries open WhatsApp or your phone app; nothing you type there
            passes through this website.
          </li>
          <li>
            The free cosmic reading calculates your date of birth inside your
            browser. It is not sent to us or saved.
          </li>
          <li>
            If you use the shop, your cart (product and quantity only) is kept
            in your own browser so it survives a page reload. You can clear it
            at any time by emptying the cart.
          </li>
          <li>
            We do not use advertising or analytics cookies. Fonts and images are
            served from our own site.
          </li>
          <li>
            Our hosting providers (Vercel, Render and Supabase) process
            technical data such as IP addresses to deliver and protect the site.
            Our own server logs record only the page or API route, status and
            timing, not message contents or form data.
          </li>
        </ul>
        <h3>When you contact or book with the studio</h3>
        <ul>
          <li>
            The studio receives your phone number and the messages you send, and
            uses them only to answer you, arrange your reading and keep a record
            of what was agreed.
          </li>
          <li>
            For a Kundli reading the studio may ask for your date, time and
            place of birth. These are used only to prepare your reading.
          </li>
          <li>
            WhatsApp is operated by Meta under its own terms and privacy policy.
          </li>
        </ul>
        <h3>When you buy from the shop</h3>
        <ul>
          <li>
            Checkout is hosted by Shopify. Card, UPI and bank details are
            entered with the payment provider and are never seen or stored by
            this website.
          </li>
          <li>
            We receive the order details needed to deliver your purchase and
            handle returns. Payment status comes from a verified notification
            from Shopify, not from your browser.
          </li>
        </ul>
        <h3>How long we keep data</h3>
        <p>
          Booking and order records are kept only as long as needed to provide
          the service and meet legal obligations. Retention periods:{' '}
          <span className="policy-pending">{PENDING_TEXT}</span>
        </p>
        <h3>Your rights</h3>
        <p>
          You can ask to see, correct or delete your personal data, withdraw
          consent, or raise a grievance. Write to{' '}
          <a href={`mailto:${STUDIO.supportEmail}`}>{STUDIO.supportEmail}</a> or
          contact the grievance officer below. If you used this website’s
          earlier enquiry form, you can also ask about or delete that record.
        </p>
      </section>

      <section id="readings" aria-labelledby="readings-title">
        <h2 id="readings-title">Readings: terms, payment and cancellation</h2>
        <ul>
          <li>
            A reading is booked only when the studio confirms the date, time,
            price and payment method with you. Opening WhatsApp or calling does
            not create a booking or a charge.
          </li>
          <li>
            Tarot and astrology readings are offered for reflection and personal
            guidance. They do not guarantee any outcome and are not a substitute
            for medical, mental-health, legal or financial advice.
          </li>
        </ul>
        <dl className="policy-facts">
          <dt>How readings are given</dt>
          <dd>
            <Value path="readings.delivery" />
          </dd>
          <dt>Payment</dt>
          <dd>
            <Value path="readings.payment" />
          </dd>
          <dt>Rescheduling and cancellation</dt>
          <dd>
            <Value path="readings.cancellation" />
          </dd>
          <dt>Refunds</dt>
          <dd>
            <Value path="readings.refunds" />
          </dd>
        </dl>
      </section>

      <section id="shipping" aria-labelledby="shipping-title">
        <h2 id="shipping-title">Shop: shipping and delivery</h2>
        <dl className="policy-facts">
          <dt>Where we deliver</dt>
          <dd>
            <Value path="shop.shippingRegions" />
          </dd>
          <dt>Delivery times</dt>
          <dd>
            <Value path="shop.deliveryTimes" />
          </dd>
          <dt>Shipping charges</dt>
          <dd>
            <Value path="shop.shippingCharges" />
          </dd>
        </dl>
        <p>
          The final price, including shipping and taxes, is shown in checkout
          before you pay.
        </p>
      </section>

      <section id="returns" aria-labelledby="returns-title">
        <h2 id="returns-title">Shop: returns, refunds and cancellation</h2>
        <dl className="policy-facts">
          <dt>Return window</dt>
          <dd>
            <Value path="shop.returnWindowDays">
              {(days) => `${days} days from delivery`}
            </Value>
          </dd>
          <dt>What can be returned</dt>
          <dd>
            <Value path="shop.returnConditions" />
          </dd>
          <dt>Refunds</dt>
          <dd>
            <Value path="shop.refunds" />
          </dd>
        </dl>
        <p>
          If an item arrives damaged, defective or different from what you
          ordered, contact us and we will put it right.
        </p>
      </section>

      <section id="products" aria-labelledby="products-title">
        <h2 id="products-title">About our crystals and products</h2>
        <p>
          Crystals and tools are sold as decorative and personal items. We do
          not claim that any product heals, cures or treats a condition, or
          guarantees a particular result. When the shop opens for orders, each
          product will show its maker or importer, country of origin, quantity
          and price before you buy.
        </p>
      </section>

      <section id="grievance" aria-labelledby="grievance-title">
        <h2 id="grievance-title">Complaints and grievance officer</h2>
        <p>
          We acknowledge complaints within 48 hours and aim to resolve them
          within one month.
        </p>
        <Value path="grievanceOfficer">
          {(officer) => (
            <dl className="policy-facts">
              <dt>Name</dt>
              <dd>{officer.name}</dd>
              <dt>Designation</dt>
              <dd>{officer.designation}</dd>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${officer.email}`}>{officer.email}</a>
              </dd>
              {officer.telephone && (
                <>
                  <dt>Phone</dt>
                  <dd>{officer.telephone}</dd>
                </>
              )}
            </dl>
          )}
        </Value>
      </section>
    </div>
  );
}
