export function ReyonLogo({ priority = false }: { priority?: boolean }) {
  void priority;
  return (
    <span className="watch-wordmark" aria-label="REYON watches">
      <span className="watch-logo-icon" aria-hidden="true">
        <svg viewBox="0 0 52 52" role="presentation">
          <circle className="watch-logo-face" cx="25" cy="27" r="15" />
          <path className="watch-logo-arc" d="M10 27a15 15 0 0 1 27-9" />
          <path className="watch-logo-crown" d="M40 22h6v9h-6" />
          <path className="watch-logo-hands" d="M25 27v-9M25 27l8 5" />
          <circle className="watch-logo-pin" cx="25" cy="27" r="2.2" />
          <path
            className="watch-logo-ticks"
            d="M25 14v3M25 37v3M12 27h3M35 27h3"
          />
        </svg>
      </span>
      <span>
        REYON<small>WATCHES / EVERY DAY</small>
      </span>
    </span>
  );
}
