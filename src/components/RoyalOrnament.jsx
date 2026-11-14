// A thread of floating diyas: each flame breathes on its own, and motion pauses offscreen.
export default function RoyalOrnament() {
  return (
    <div className="royal-ornament diya-breaker" aria-hidden="true">
      <span className="diya-thread" />
      {Array.from({ length: 9 }, (_, index) => (
        <span
          className="diya-pendant"
          key={index}
          style={{ '--diya-index': index }}
        >
          <svg viewBox="0 0 56 70" fill="none">
            <path
              d="M28 0v21M23 16l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M8 43h40c-4 13-11 19-20 19S12 56 8 43Z"
              fill="currentColor"
              fillOpacity=".14"
              stroke="currentColor"
            />
            <path
              d="M13 47c9 8 21 8 30 0M20 61h16M24 66h8"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              className="diya-flame"
              d="M28 23c2 7 9 9 7 15-1 5-13 5-14 0-2-5 5-9 7-15Z"
              fill="currentColor"
            />
            <circle cx="7" cy="28" r="1" fill="currentColor" opacity=".6" />
            <circle cx="48" cy="32" r="1" fill="currentColor" opacity=".6" />
          </svg>
        </span>
      ))}
    </div>
  );
}
