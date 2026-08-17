type CapitalMapPinProps = {
  x: number;
  y: number;
  /** SVG user-unit diameter of the star. */
  size: number;
  label: string;
  isDark?: boolean;
};

function fivePointStarPath(outerR: number, innerR: number): string {
  const commands: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    commands.push(`${i === 0 ? "M" : "L"}${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  commands.push("Z");
  return commands.join(" ");
}

/**
 * Five-pointed star centered on (x, y) — the projected capital.
 */
export function CapitalMapPin({ x, y, size, label, isDark = false }: CapitalMapPinProps) {
  const outerR = size / 2;
  const innerR = outerR * 0.4;
  const strokeW = Math.max(size * 0.08, size * 0.05);
  const fill = isDark ? "#fb7185" : "#e11d48";
  const rim = isDark ? "#fff1f2" : "#ffffff";

  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ pointerEvents: "none" }}
      role="img"
      aria-label={label}
    >
      <path
        d={fivePointStarPath(outerR, innerR)}
        fill={fill}
        stroke={rim}
        strokeWidth={strokeW}
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Star diameter from the close-up crop; `zoomScale` keeps on-screen size stable. */
export function capitalPinSizeForViewBox(
  viewBoxWidth: number,
  viewBoxHeight: number,
  zoomScale = 1,
): number {
  const diagonal = Math.hypot(viewBoxWidth, viewBoxHeight);
  return (diagonal * 0.034) / Math.max(zoomScale, 0.2);
}
