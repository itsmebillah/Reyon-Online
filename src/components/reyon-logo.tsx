export function ReyonLogo({ priority = false }: { priority?: boolean }) {
  void priority;
  return (
    <span className="watch-wordmark" aria-label="REYON watches">
      <span className="watch-logo-icon" aria-hidden="true">
        <svg viewBox="0 0 40 52" role="presentation">
          <path
            className="watch-logo-strap"
            d="M14 0h12v12H14zM14 40h12v12H14z"
          />
          <rect
            className="watch-logo-case"
            x="5"
            y="9"
            width="30"
            height="34"
            rx="15"
          />
          <circle className="watch-logo-face" cx="20" cy="26" r="10" />
          <path
            className="watch-logo-ticks"
            d="M20 18v2M20 32v2M12 26h2M26 26h2"
          />
          <path className="watch-logo-hands" d="M20 26v-6M20 26l5 3" />
          <circle className="watch-logo-pin" cx="20" cy="26" r="1.5" />
          <path className="watch-logo-crown" d="M35 22h3v8h-3" />
        </svg>
      </span>
      <span>
        REYON<small>WATCHES / EVERY DAY</small>
      </span>
    </span>
  );
}
