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
 * Filled five-pointed star centered on (x, y) — the projected capital.
 */
export function CapitalMapPin({ x, y, size, label, isDark = false }: CapitalMapPinProps) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size <= 0) {
    return null;
  }

  const outerR = size / 2;
  const innerR = outerR * 0.4;
  const fill = isDark ? "#fb7185" : "#e11d48";

  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ pointerEvents: "none" }}
      role="img"
      aria-label={label}
    >
      <path d={fivePointStarPath(outerR, innerR)} fill={fill} />
    </g>
  );
}

/** Star diameter from the close-up crop; `zoomScale` keeps on-screen size stable. */
export function capitalPinSizeForViewBox(
  viewBoxWidth: number,
  viewBoxHeight: number,
  zoomScale = 1,
): number {
  if (!Number.isFinite(viewBoxWidth) || !Number.isFinite(viewBoxHeight)) return 0;
  const diagonal = Math.hypot(viewBoxWidth, viewBoxHeight);
  return (diagonal * 0.038) / Math.max(zoomScale, 0.2);
}
