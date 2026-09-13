export function ReyonLogo({ priority = false }: { priority?: boolean }) {
  void priority;
  return (
    <span className="watch-wordmark" aria-label="REYON watches">
      <span className="watch-logo-icon" aria-hidden="true">
        <svg viewBox="0 0 40 52" role="presentation">
          <path
            className="watch-logo-strap"
            d="M13 0h14v13H13zM13 39h14v13H13z"
          />
          <rect
            className="watch-logo-case"
            x="7"
            y="9"
            width="26"
            height="34"
            rx="10"
          />
          <circle className="watch-logo-face" cx="20" cy="26" r="8" />
          <path className="watch-logo-hands" d="M20 26v-5M20 26l4 3" />
          <path className="watch-logo-crown" d="M33 21h3v5h-3" />
        </svg>
      </span>
      <span>
        REYON<small>WATCHES / EVERY DAY</small>
      </span>
    </span>
  );
}
