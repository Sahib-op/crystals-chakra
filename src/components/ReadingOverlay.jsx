import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RotateCcw, X } from 'lucide-react';
import { todayISO, validBirthDate } from '../lib/birthDate';

export default function ReadingOverlay({
  isOpen,
  reading,
  onClose,
  onGenerate,
  onRestart,
}) {
  const dialog = useRef(null);
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const el = dialog.current;
    setError('');
    setDob('');
    if (isOpen) el.showModal();
    else if (el.open) el.close();
    const previous = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    (reading
      ? dialog.current.querySelector('h2')
      : dialog.current.querySelector('input')
    )?.focus();
  }, [isOpen, Boolean(reading)]);
  function submit(event) {
    event.preventDefault();
    setError('');
    if (!validBirthDate(dob)) {
      setError('Enter a real birth date between 1900 and today.');
      return;
    }
    onGenerate({ dob });
  }
  return (
    <dialog
      ref={dialog}
      className="cosmic-reading-dialog"
      aria-labelledby="cosmic-reading-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target !== dialog.current) return;
        const rect = dialog.current.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div className="reading-dialog-head">
        <span>CRYSTALS CHAKRA</span>
        <button aria-label="Close cosmic reading" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      <div className="reading-dialog-body" key={reading ? 'result' : 'form'}>
        <h2 id="cosmic-reading-title" tabIndex={-1}>
          {reading ? 'Your Cosmic Reading' : 'Discover Your Cosmic Blueprint'}
        </h2>
        {!reading ? (
          <>
            <p className="reading-lead" id="reading-date-help">
              Enter your date of birth to calculate your zodiac sign and life
              path number. That’s all we need for this free reading.
            </p>
            <form onSubmit={submit}>
              <label htmlFor="reading-dob">Date of birth</label>
              <input
                autoFocus
                id="reading-dob"
                type="date"
                value={dob}
                min="1900-01-01"
                max={todayISO()}
                onChange={(e) => setDob(e.target.value)}
                required
                aria-describedby="reading-date-help reading-privacy"
                aria-invalid={error ? true : undefined}
              />
              <p id="reading-privacy" className="reading-privacy">
                Your date stays in this browser. It isn’t saved, sent to us or
                shared with anyone.
              </p>
              {error && (
                <p role="alert" className="reading-error">
                  {error}
                </p>
              )}
              <button className="reading-submit" type="submit">
                Reveal My Reading <ArrowUpRight size={18} />
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="cosmic-results">
              <article>
                <div className="result-heading">
                  <span>YOUR ZODIAC SIGN</span>
                  <h3>{reading.zodiac.name}</h3>
                  <p>
                    {reading.zodiac.element} · Ruled by{' '}
                    {reading.zodiac.rulingPlanet}
                  </p>
                </div>
                {reading.zodiac.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <ul className="reading-traits" aria-label="Zodiac traits">
                  {reading.zodiac.traits.map((trait) => (
                    <li key={trait}>{trait}</li>
                  ))}
                </ul>
              </article>
              <article>
                <div className="result-heading">
                  <span>YOUR LIFE PATH</span>
                  <h3>{reading.numerology.number}</h3>
                  <p>{reading.numerology.name}</p>
                </div>
                {reading.numerology.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <ul className="reading-traits" aria-label="Life path traits">
                  {reading.numerology.traits.map((trait) => (
                    <li key={trait}>{trait}</li>
                  ))}
                </ul>
              </article>
            </div>
            <details className="reading-method">
              <summary>How your date gives these results</summary>
              <p>
                <strong>{reading.zodiac.name}:</strong> your birthday falls in{' '}
                {reading.zodiac.dateRangeLabel}, the conventional tropical
                sun-sign range.
              </p>
              <p>
                <strong>Life path calculation:</strong>{' '}
                {reading.numerology.calculation.steps
                  .map((step) => `${step.digits.join(' + ')} = ${step.total}`)
                  .join(' → ')}
                .
              </p>
              <p>
                We add every digit of your birth date, then reduce the total,
                keeping master numbers 11, 22 and 33. These descriptions come
                from traditional astrology and numerology. This date-only
                reading does not calculate a Vedic Kundli or planetary
                positions; birth time and place are needed for those.
              </p>
            </details>
            <div className="reading-result-actions">
              <Link
                to="/#services"
                className="reading-submit"
                onClick={onClose}
              >
                Explore Full Readings <ArrowUpRight size={17} />
              </Link>
              <button onClick={onRestart} className="reading-restart">
                <RotateCcw size={15} />
                Try another date
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
