import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import { READING_FAQ } from './readingContent';


export default function HowReadingsWork() {
  return (
    <article className="reading-guide-page">
      <PageMeta title="How Readings Work" description="Your first tarot or Vedic astrology reading: choosing a reading, booking with the studio, preparing your questions and answers to common questions." path="/how-readings-work" />
      <Link className="reading-text-link guide-back" to="/#information"><ArrowLeft size={16} aria-hidden="true" /> Back to About Astrology & Tarot</Link>
      <header className="guide-header">
        <p className="reading-eyebrow">A first-timer’s guide</p>
        <h1>Come with a question.<br /><em>Start a conversation.</em></h1>
        <p>You do not need to know the cards or read a birth chart. Here is how to choose a reading, prepare, and arrange a time with the studio.</p>
        <nav className="info-jump-links" aria-label="Reading guide"><a href="#choosing">Choose a reading</a><a href="#the-process">How it works</a><a href="#preparing">Get ready</a><a href="#faq">Full FAQ</a></nav>
      </header>
      <section id="choosing" className="guide-section">
        <p className="reading-eyebrow">Begin with what you need</p>
        <h2>Which reading feels right?</h2>
        <div className="guide-choice-grid">
          <article><h3>Tarot</h3><p>For a conversation around a question or an area of life. The cards provide imagery and themes to consider together with your reader.</p><Link className="reading-text-link" to="/#tarot">Meet the tarot reading <ArrowRight size={15} aria-hidden="true" /></Link></article>
          <article><h3>Vedic astrology</h3><p>For a traditional interpretation of your birth chart. Compare the available packages for the depth of discussion and any report included.</p><Link className="reading-text-link" to="/#services">Compare reading packages <ArrowRight size={15} aria-hidden="true" /></Link></article>
        </div>
        <p className="guide-note">Still deciding? Choose “I’m not sure yet” in the <Link to="/#booking">booking panel</Link> and ask the studio before committing.</p>
      </section>
      <section id="the-process" className="guide-section">
        <p className="reading-eyebrow">From first message to reading</p><h2>Four simple steps</h2>
        <ol className="guide-process">
          <li><h3>Choose, or ask for help</h3><p>Select a reading that interests you. You can also contact the studio without choosing a package.</p></li>
          <li><h3>Start the conversation</h3><p>Open WhatsApp from the booking panel. Your chosen reading is included in an editable message; you send it when you are ready. You can call instead.</p></li>
          <li><h3>Confirm the details together</h3><p>Agree the scope, date, time, price, delivery and payment arrangements directly. Ask about cancellation and rescheduling. Clicking a website link alone does not reserve an appointment.</p></li>
          <li><h3>Bring your questions</h3><p>Have your reading in the format agreed with the studio. Allow space for questions and take away the ideas you find useful.</p></li>
        </ol>
      </section>
      <section id="preparing" className="guide-section">
        <p className="reading-eyebrow">A small pause beforehand</p><h2>What to have ready</h2>
        <ul className="guide-preparation"><li><strong>A question or a theme.</strong> Think about what you want to explore, such as work, relationships or a change in your life.</li><li><strong>Birth details, if requested.</strong> A Kundli generally needs date, time and place of birth. Tell the studio if any detail is uncertain.</li><li><strong>Your practical questions.</strong> Confirm what is included, the format and how long it takes before booking.</li></ul>
        <p className="guide-note">New words are welcome here. The <Link to="/#reading-terms">glossary</Link> and <Link to="/#card-meanings">card meanings</Link> offer a simple introduction.</p>
      </section>
      <section id="faq" className="guide-section">
        <p className="reading-eyebrow">The fuller picture</p><h2>Frequently asked questions</h2>
        <div className="royal-faq">{READING_FAQ.map((item) => <details key={item.id} id={`faq-${item.id}`}><summary>{item.question}<ChevronDown size={17} aria-hidden="true" /></summary><p>{item.answer}{item.id === 'privacy' && <> <Link to="/policies#privacy">Read the privacy notice.</Link></>}</p></details>)}</div>
      </section>
      <aside className="guide-contact"><div><h2>Take the next step</h2><p>Share what is on your mind and choose the reading together.</p></div><Link className="royal-button" to="/#booking">Go to booking <ArrowRight size={17} aria-hidden="true" /></Link></aside>
    </article>
  );
}

