export function ReyonLogo({ priority = false }: { priority?: boolean }) {
  void priority;
  return (
    <span className="watch-wordmark" aria-label="REYON watches">
      <span className="watch-logo-icon" aria-hidden="true">
        R
      </span>
      <span>
        REYON<small>WATCHES · BANGLADESH</small>
      </span>
    </span>
  );
}
