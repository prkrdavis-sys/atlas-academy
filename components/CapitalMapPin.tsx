/**
 * CC0 3D star-in-circle badge from 3dicons medal
 * (https://3dicons.co/icons/39121b-medal), cropped to the medallion.
 */
export const CAPITAL_PIN_SRC = "/maps/capital-pin.png";

/** Intrinsic pixel size of {@link CAPITAL_PIN_SRC}. */
export const CAPITAL_PIN_INTRINSIC = { width: 160, height: 160 } as const;

/**
 * Hotspot as a fraction of the image box — center of the star/circle,
 * which marks the capital location.
 */
export const CAPITAL_PIN_HOTSPOT = { x: 0.5, y: 0.5 } as const;

type CapitalMapPinProps = {
  x: number;
  y: number;
  /** SVG user-unit height of the full marker image. */
  size: number;
  label: string;
};

/**
 * Polished 3D capital marker (star in circle). Center sits on (x, y).
 */
export function CapitalMapPin({ x, y, size, label }: CapitalMapPinProps) {
  const aspect = CAPITAL_PIN_INTRINSIC.width / CAPITAL_PIN_INTRINSIC.height;
  const height = size;
  const width = height * aspect;
  const imageX = x - width * CAPITAL_PIN_HOTSPOT.x;
  const imageY = y - height * CAPITAL_PIN_HOTSPOT.y;

  return (
    <g style={{ pointerEvents: "none" }} role="img" aria-label={label}>
      <image
        href={CAPITAL_PIN_SRC}
        x={imageX}
        y={imageY}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}

/** Marker size from the visible map diagonal — small enough not to bury the place. */
export function capitalPinSizeForViewBox(viewBoxWidth: number, viewBoxHeight: number): number {
  const diagonal = Math.hypot(viewBoxWidth, viewBoxHeight);
  return diagonal * 0.03;
}
