import { DEFAULTS, PALETTES, useAppearance } from './AppearanceContext';
import './design-lab.css';

// Floating panel for the studio's design experiments (see AppearanceContext).
export default function DesignLab({ onClose }) {
  const { palette, setAppearance } = useAppearance();
  return (
    <details className="design-lab" open>
      <summary>
        Design lab <span aria-hidden="true">◐</span>
      </summary>
      <div className="design-lab-panel">
        <p>
          Only you see this. Choices stay in this browser. Visitors always get
          the default design.
        </p>
        <fieldset>
          <legend>Colour palette</legend>
          <div className="design-lab-palettes">
            {PALETTES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={palette === value}
                onClick={() =>
                  setAppearance((current) => ({ ...current, palette: value }))
                }
              >
                <i
                  className={`lab-swatch swatch-${value}`}
                  aria-hidden="true"
                />
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="design-lab-actions">
          <button type="button" onClick={() => setAppearance(DEFAULTS)}>
            Reset to default
          </button>
          <button type="button" onClick={onClose}>
            Close the lab
          </button>
        </div>
      </div>
    </details>
  );
}
