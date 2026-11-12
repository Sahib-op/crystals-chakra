export default function BrandLogo({ className = '', size = 'md' }) {
  // Unified size mapping — no override hacks needed
  const sizes = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-40 h-40',
  };

  const filters = {
    xs: 'drop-shadow(0px 0px 1px rgba(37,169,186,0.4)) drop-shadow(0px 0px 3px rgba(20,70,125,0.3))',
    sm: 'drop-shadow(0px 0px 2px rgba(37,169,186,0.5)) drop-shadow(0px 0px 5px rgba(20,70,125,0.4))',
    md: 'drop-shadow(0px 0px 8px rgba(37,169,186,0.35)) drop-shadow(0px 0px 16px rgba(20,70,125,0.25))',
    lg: 'drop-shadow(0px 0px 12px rgba(37,169,186,0.35)) drop-shadow(0px 0px 24px rgba(20,70,125,0.25))',
  };

  const currentFilter = filters[size] || filters.md;
  const currentSize = sizes[size] || sizes.md;

  return (
    <div
      className={`relative flex items-center justify-center ${currentSize} ${className} group`}
      style={{
        filter: currentFilter,
        willChange: 'filter, transform',
      }}
    >
      <svg
        viewBox="360 300 360 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10"
      >
        <defs>
          <clipPath id="clip_1">
            <path transform="matrix(1,0,0,-1,0,1080)" d="M0 1080H1080V0H0Z" />
          </clipPath>
        </defs>
        <g>
          <path
            transform="matrix(1,0,0,-1,395.2626,622.037)"
            d="M0 0V254.551H-9.502V-9.502H10.499V0Z"
            fill="#179daf"
          />
          <path
            transform="matrix(1,0,0,-1,385.7609,324.3954)"
            d="M0 0V-19.336H9.502V-9.502H264.718V0Z"
            fill="#179daf"
          />
          <path
            transform="matrix(1,0,0,-1,684.7562,622.037)"
            d="M0 0H-255.24V-9.502H9.502V9.834H0Z"
            fill="#179daf"
          />
          <path
            transform="matrix(1,0,0,-1,674.2331,324.3954)"
            d="M0 0V-9.502H10.523V-264.053H20.025V0Z"
            fill="#179daf"
          />
          <path
            transform="matrix(1,0,0,-1,657.6056,638.6461)"
            d="M0 0V-2.51H-235.211V43.061H-255.205V33.583H-244.732V-11.988H9.521V0ZM-235.211 278.272V297.617H-244.732V287.793H-290.26V33.583H-278.965V43.061H-280.739V278.272ZM43.796 287.793V278.272H45.571V43.061H0V23.716H9.521V33.583H55.049V287.793ZM9.521 287.793V333.364H-244.732V321.376H-235.211V323.843H0V278.272H20.037V287.793Z"
            fill="#034587"
          />
          <g clipPath="url(#clip_1)">
            <path
              transform="matrix(1,0,0,-1,522.4973,570.8344)"
              d="M0 0V-39.365L-37.892-2.127C-47.334 7.157-47.284 22.406-37.769 31.618L1.317 69.501C10.506 78.408 25.107 78.408 34.296 69.5L73.376 31.618C82.89 22.406 82.948 7.157 73.498-2.127L35.614-39.365V0L49.677 14.623 17.807 45.178-14.063 14.623Z"
              fill="#034587"
            />
            <path
              transform="matrix(1,0,0,-1,446.9356,461.08729)"
              d="M0 0H-39.365L-2.127 37.892C7.157 47.334 22.406 47.284 31.618 37.769L69.501-1.317C78.408-10.506 78.408-25.107 69.5-34.296L31.618-73.376C22.406-82.89 7.157-82.948-2.127-73.498L-39.365-35.614H0L14.623-49.677 45.178-17.807 14.623 14.063Z"
              fill="#179daf"
            />
            <path
              transform="matrix(1,0,0,-1,557.5027,385.08198)"
              d="M0 0V39.365L37.892 2.127C47.334-7.157 47.284-22.406 37.769-31.618L-1.317-69.501C-10.506-78.408-25.107-78.408-34.296-69.5L-73.376-31.618C-82.89-22.406-82.948-7.157-73.498 2.127L-35.614 39.365V0L-49.677-14.623-17.807-45.178 14.063-14.623Z"
              fill="#034587"
            />
            <path
              transform="matrix(1,0,0,-1,633.0644,494.82923)"
              d="M0 0H39.365L2.127-37.892C-7.157-47.334-22.406-47.284-31.618-37.769L-69.501 1.317C-78.408 10.506-78.408 25.107-69.5 34.296L-31.618 73.376C-22.406 82.89-7.157 82.948 2.127 73.498L39.365 35.614H0L-14.623 49.677-45.178 17.807-14.623-14.063Z"
              fill="#179daf"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
