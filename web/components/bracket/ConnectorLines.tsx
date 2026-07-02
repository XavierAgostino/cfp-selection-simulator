interface ConnectorLinesProps {
  /** Mirrors the connector so the elbow points the opposite direction (right side of the bracket). */
  flip?: boolean;
  className?: string;
}

/**
 * Decorative elbow connector between two stacked games and the single game
 * they feed into (pod pair -> semifinal, semifinal pair -> championship).
 * Purely visual: stretches to fill its flex/grid cell via preserveAspectRatio="none".
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
        stroke="rgba(148,163,184,0.28)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M0,75 H20 V50 H40"
        fill="none"
        stroke="rgba(148,163,184,0.28)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
