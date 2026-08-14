type CapitalMapPinProps = {
  x: number;
  y: number;
  /** SVG user-unit height of the pin (tip → top). */
  size: number;
  label: string;
  isDark?: boolean;
};

/**
 * Flat teardrop pin. The tip sits on (x, y) — the projected capital.
 */
export function CapitalMapPin({ x, y, size, label, isDark = false }: CapitalMapPinProps) {
  const width = size * 0.7;
  const holeR = size * 0.145;
  const holeCy = -size * 0.63;
  const strokeW = Math.max(size * 0.065, size * 0.04);
  const fill = isDark ? "#fb7185" : "#e11d48";
  const rim = isDark ? "#fff1f2" : "#ffffff";

  const path = [
    `M 0 0`,
    `C ${width * 0.55} ${-size * 0.2}, ${width * 0.5} ${-size * 0.52}, 0 ${-size}`,
    `C ${-width * 0.5} ${-size * 0.52}, ${-width * 0.55} ${-size * 0.2}, 0 0`,
    "Z",
  ].join(" ");

  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ pointerEvents: "none" }}
      role="img"
      aria-label={label}
    >
      <path d={path} fill={fill} stroke={rim} strokeWidth={strokeW} strokeLinejoin="round" />
      <circle cx={0} cy={holeCy} r={holeR} fill={rim} />
    </g>
  );
}

/** Pin height from the close-up crop; `zoomScale` keeps on-screen size stable. */
export function capitalPinSizeForViewBox(
  viewBoxWidth: number,
  viewBoxHeight: number,
  zoomScale = 1,
): number {
  const diagonal = Math.hypot(viewBoxWidth, viewBoxHeight);
  return (diagonal * 0.034) / Math.max(zoomScale, 0.2);
}
