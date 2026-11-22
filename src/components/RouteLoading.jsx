// Full-height placeholder shown while a page's code or data is on its way.
// It holds the page's height so the footer never jumps up into the gap, and
// uses the destination page's colours so the swap is calm, not a flash.
export default function RouteLoading({ tone = 'ivory', label, note }) {
  return (
    <div className={`route-loading route-loading-${tone}`}>
      <div className="route-loading-mark" aria-hidden="true">
        <span />
        <span />
        <i />
      </div>
      <p role="status">{label}</p>
      {note && <p className="route-loading-note">{note}</p>}
    </div>
  );
}
