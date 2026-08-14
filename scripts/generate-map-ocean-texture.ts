/**
 * Warps public/globe/ocean-depth.png (equirectangular GEBCO bathymetry) into
 * the Natural Earth and Albers USA projections used by public/maps/*.svg, then
 * recolors each bake with the globe ocean ramp.
 *
 * Learn/Library cards place these images in SVG user space (not as viewBox
 * crops) so pan/zoom never exposes a mismatched rectangular ocean tile.
 *
 * Projection parameters must match scripts/generate-map-land-texture.ts and
 * public/maps/usa-projection.json.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { geoAlbersUsa, geoNaturalEarth1, type GeoProjection } from "d3-geo";
import sharp from "sharp";
import {
  MAP_LAND_TEXTURE_HEIGHT,
  MAP_LAND_TEXTURE_WIDTH,
  type MapLandTextureMeta,
  type UsaMapProjectionMeta,
} from "../lib/map-land-texture";
import {
  buildOceanDepthLut,
  OCEAN_FALLBACK_DEPTH_GRAY,
} from "../lib/ocean-depth-lut";

const SRC_PATH = join(process.cwd(), "public/globe/ocean-depth.png");
const OUT_DIR = join(process.cwd(), "public/maps");
const NE_META_PATH = join(OUT_DIR, "land-color-ne.json");
const USA_META_PATH = join(OUT_DIR, "usa-projection.json");

/** Pixels per map unit — matches the Blue Marble land overview bake. */
const OUT_SCALE = 0.4;
const JPEG_QUALITY = 86;

type WarpTarget = {
  name: string;
  projection: GeoProjection;
  mapWidth: number;
  mapHeight: number;
  darkOut: string;
  lightOut: string;
};

function sampleGray(
  src: Buffer,
  srcW: number,
  srcH: number,
  srcChannels: number,
  lon: number,
  lat: number,
): number {
  const wrappedLon = ((((lon + 180) % 360) + 360) % 360) - 180;
  const clampedLat = Math.max(-90, Math.min(90, lat));
  const sx = Math.min(srcW - 1, Math.max(0, Math.floor(((wrappedLon + 180) / 360) * srcW)));
  const sy = Math.min(srcH - 1, Math.max(0, Math.floor(((90 - clampedLat) / 180) * srcH)));
  return src[(sy * srcW + sx) * srcChannels];
}

function warpGrayscale(
  projection: GeoProjection,
  src: Buffer,
  srcW: number,
  srcH: number,
  srcChannels: number,
  mapWidth: number,
  mapHeight: number,
): { gray: Buffer; width: number; height: number } {
  const invert = projection.invert?.bind(projection);
  if (!invert) {
    throw new Error("Projection does not support invert()");
  }

  const width = Math.round(mapWidth * OUT_SCALE);
  const height = Math.round(mapHeight * OUT_SCALE);
  const gray = Buffer.alloc(width * height);

  for (let py = 0; py < height; py += 1) {
    const y = (py + 0.5) / OUT_SCALE;
    for (let px = 0; px < width; px += 1) {
      const x = (px + 0.5) / OUT_SCALE;
      const geo = invert([x, y]);
      const outIdx = py * width + px;
      if (!geo) {
        gray[outIdx] = OCEAN_FALLBACK_DEPTH_GRAY;
        continue;
      }
      gray[outIdx] = sampleGray(src, srcW, srcH, srcChannels, geo[0], geo[1]);
    }
    if (py > 0 && py % 200 === 0) {
      console.log(`  ${((py / height) * 100).toFixed(0)}%`);
    }
  }

  return { gray, width, height };
}

function tintGrayscale(gray: Buffer, isDark: boolean): Buffer {
  const lut = buildOceanDepthLut(isDark);
  const rgb = Buffer.alloc(gray.length * 3);
  for (let i = 0; i < gray.length; i += 1) {
    const value = gray[i];
    const outIdx = i * 3;
    rgb[outIdx] = lut[value * 3];
    rgb[outIdx + 1] = lut[value * 3 + 1];
    rgb[outIdx + 2] = lut[value * 3 + 2];
  }
  return rgb;
}

async function writeThemedJpeg(
  gray: Buffer,
  width: number,
  height: number,
  isDark: boolean,
  outPath: string,
): Promise<void> {
  await sharp(tintGrayscale(gray, isDark), {
    raw: { width, height, channels: 3 },
  })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(outPath);
}

async function bakeTarget(
  target: WarpTarget,
  src: Buffer,
  srcW: number,
  srcH: number,
  srcChannels: number,
): Promise<void> {
  console.log(`Warping ${target.name} ${Math.round(target.mapWidth * OUT_SCALE)}×${Math.round(target.mapHeight * OUT_SCALE)}...`);
  const t0 = Date.now();
  const { gray, width, height } = warpGrayscale(
    target.projection,
    src,
    srcW,
    srcH,
    srcChannels,
    target.mapWidth,
    target.mapHeight,
  );
  await writeThemedJpeg(gray, width, height, true, target.darkOut);
  await writeThemedJpeg(gray, width, height, false, target.lightOut);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Wrote ${target.darkOut} + ${target.lightOut} (${elapsed}s)`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const neMeta = JSON.parse(readFileSync(NE_META_PATH, "utf8")) as MapLandTextureMeta;
  const usaMeta = JSON.parse(readFileSync(USA_META_PATH, "utf8")) as UsaMapProjectionMeta;

  const neProjection = geoNaturalEarth1()
    .scale(neMeta.projectionParams.scale)
    .translate(neMeta.projectionParams.translate)
    .center(neMeta.projectionParams.center)
    .rotate(neMeta.projectionParams.rotate);
  const usaProjection = geoAlbersUsa()
    .scale(usaMeta.scale)
    .translate(usaMeta.translate);

  console.log(`Reading ${SRC_PATH}...`);
  const { data: srcData, info: srcInfo } = await sharp(SRC_PATH)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const targets: WarpTarget[] = [
    {
      name: "Natural Earth",
      projection: neProjection,
      mapWidth: MAP_LAND_TEXTURE_WIDTH,
      mapHeight: MAP_LAND_TEXTURE_HEIGHT,
      darkOut: join(OUT_DIR, "ocean-depth-ne-dark.jpg"),
      lightOut: join(OUT_DIR, "ocean-depth-ne-light.jpg"),
    },
    {
      name: "Albers USA",
      projection: usaProjection,
      mapWidth: usaMeta.mapWidth,
      mapHeight: usaMeta.mapHeight,
      darkOut: join(OUT_DIR, "ocean-depth-usa-dark.jpg"),
      lightOut: join(OUT_DIR, "ocean-depth-usa-light.jpg"),
    },
  ];

  for (const target of targets) {
    await bakeTarget(target, srcData, srcInfo.width, srcInfo.height, srcInfo.channels);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
