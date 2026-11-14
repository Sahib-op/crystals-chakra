import { useId } from 'react';
// A repeating leaf-and-star border, echoing the studio's printed artwork.
export default function RoyalOrnament() {
  const id = useId().replaceAll(':', '');
  return (
    <svg
      className="royal-ornament"
      viewBox="0 0 1000 28"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width="100" height="28" patternUnits="userSpaceOnUse">
          <path
            d="M0 14h100M0 14Q12 0 25 14T50 14T75 14T100 14"
            fill="none"
            stroke="currentColor"
            strokeWidth=".7"
          />
          <path
            d="M12 14q-2-10 8-9-1 8-8 9m25 0q-2 10 8 9-1-8-8-9m25 0q-2-10 8-9-1 8-8 9m25 0q-2 10 8 9-1-8-8-9"
            fill="currentColor"
            opacity=".6"
          />
          <path d="m50 7 3 7-3 7-3-7z" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="1000" height="28" fill={`url(#${id})`} />
    </svg>
  );
}
