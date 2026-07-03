interface ConnectorLinesProps {
  /** Mirrors the connector so the elbow points the opposite direction (right side of the bracket). */
  flip?: boolean;
  className?: string;
}

/**
 * Optional decorative bracket connector. Full Bracket omits connectors — pod
 * labels carry the path — but this remains available for round/other views.
 */
export function ConnectorLines({ flip = false, className }: ConnectorLinesProps) {
  return (
    <svg
      viewBox="0 0 40 100"
      preserveAspectRatio="none"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      <path
        d="M0,25 H20 V50 H40"
        fill="none"
        stroke="rgba(148,163,184,0.18)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M0,75 H20 V50 H40"
        fill="none"
        stroke="rgba(148,163,184,0.18)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Thin horizontal elbow between adjacent bracket columns. */
export function BracketElbow({ flip = false, className }: ConnectorLinesProps) {
  return (
    <svg
      viewBox="0 0 32 24"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      <path
        d="M0,12 H16 V12 H32"
        fill="none"
        stroke="rgba(148,163,184,0.18)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
