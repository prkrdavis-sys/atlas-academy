type CapitalMapPinProps = {
  x: number;
  y: number;
  /** SVG user-unit height of the pin (tip → top). */
  size: number;
  label: string;
  isDark?: boolean;
};

/**
 * Classic teardrop map pin. The tip sits on (x, y) — the projected capital.
 */
export function CapitalMapPin({ x, y, size, label, isDark = false }: CapitalMapPinProps) {
  const width = size * 0.68;
  const tipY = 0;
  const bodyTop = -size;
  const holeR = size * 0.155;
  const holeCy = -size * 0.64;
  const strokeW = Math.max(size * 0.055, size * 0.04);

  const fill = isDark ? "#fb7185" : "#e11d48";
  const rim = isDark ? "#ffe4e6" : "#ffffff";
  const holeFill = isDark ? "#fff1f2" : "#ffffff";
  const holeRing = isDark ? "#e11d48" : "#be123c";
  const shadow = isDark ? "rgba(15, 23, 42, 0.5)" : "rgba(15, 23, 42, 0.26)";

  // Teardrop: rounded head with a sharp tip at the origin.
  const path = [
    `M 0 ${tipY}`,
    `C ${width * 0.58} ${-size * 0.18}, ${width * 0.52} ${bodyTop * 0.52}, 0 ${bodyTop}`,
    `C ${-width * 0.52} ${bodyTop * 0.52}, ${-width * 0.58} ${-size * 0.18}, 0 ${tipY}`,
    "Z",
  ].join(" ");

  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ pointerEvents: "none" }}
      role="img"
      aria-label={label}
    >
      <ellipse cx={0} cy={size * 0.045} rx={width * 0.3} ry={size * 0.075} fill={shadow} />
      <path d={path} fill={fill} stroke={rim} strokeWidth={strokeW} strokeLinejoin="round" />
      <circle cx={0} cy={holeCy} r={holeR * 1.35} fill={holeRing} opacity={0.35} />
      <circle cx={0} cy={holeCy} r={holeR} fill={holeFill} />
    </g>
  );
}

/** Pin height from the visible map diagonal so it stays readable across crops. */
export function capitalPinSizeForViewBox(viewBoxWidth: number, viewBoxHeight: number): number {
  const diagonal = Math.hypot(viewBoxWidth, viewBoxHeight);
  return diagonal * 0.044;
}
