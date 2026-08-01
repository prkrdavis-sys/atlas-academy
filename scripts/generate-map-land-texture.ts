/**
 * Warps public/globe/land-color.jpg (equirectangular Blue Marble) into the
 * Natural Earth projection used by public/maps/*.svg, so Learn/Library cards
 * can fill country paths with a world-anchored topographic pattern.
 *
 * Also writes projection parameters so the client can render sharp viewBox
 * crops from the equirectangular source at display resolution.
 *
 * Projection fitSize must match scripts/natural-earth-map-data.ts exactly.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoNaturalEarth1 } from "d3-geo";
import type { FeatureCollection } from "geojson";
import sharp from "sharp";
import { MAP_HEIGHT, MAP_WIDTH } from "./map-path-utils";
import { loadNaturalEarthFeatures } from "./natural-earth-map-data";

const SRC_PATH = join(process.cwd(), "public/globe/land-color.jpg");
const OUT_DIR = join(process.cwd(), "public/maps");
const OUT_PATH = join(OUT_DIR, "land-color-ne.jpg");
const META_PATH = join(OUT_DIR, "land-color-ne.json");

/** Pixels per map unit — overview fallback; sharp crops sample equirectangular at runtime. */
const OUT_SCALE = 0.4;
const JPEG_QUALITY = 82;

export type MapLandProjectionParams = {
  scale: number;
  translate: [number, number];
  center: [number, number];
  rotate: [number, number, number];
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log("Loading Natural Earth features for projection fit...");
  const features = await loadNaturalEarthFeatures();
  const projection = geoNaturalEarth1();
  projection.fitSize([MAP_WIDTH, MAP_HEIGHT], {
    type: "FeatureCollection",
    features,
  } as FeatureCollection);

  const projectionParams: MapLandProjectionParams = {
    scale: projection.scale(),
    translate: projection.translate() as [number, number],
    center: projection.center() as [number, number],
    rotate: projection.rotate() as [number, number, number],
  };

  const invert = projection.invert?.bind(projection);
  if (!invert) {
    throw new Error("Natural Earth projection does not support invert()");
  }

  console.log(`Reading ${SRC_PATH}...`);
  const { data: srcData, info: srcInfo } = await sharp(SRC_PATH)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const srcW = srcInfo.width;
  const srcH = srcInfo.height;
  const srcChannels = srcInfo.channels;

  const outW = Math.round(MAP_WIDTH * OUT_SCALE);
  const outH = Math.round(MAP_HEIGHT * OUT_SCALE);
  const out = Buffer.alloc(outW * outH * 3);

  console.log(`Warping to Natural Earth ${outW}×${outH}...`);
  const t0 = Date.now();

  for (let py = 0; py < outH; py++) {
    const y = (py + 0.5) / OUT_SCALE;
    for (let px = 0; px < outW; px++) {
      const x = (px + 0.5) / OUT_SCALE;
      const geo = invert([x, y]);
      const outIdx = (py * outW + px) * 3;

      if (!geo) {
        out[outIdx] = 15;
        out[outIdx + 1] = 23;
        out[outIdx + 2] = 42;
        continue;
      }

      let lon = geo[0];
      const lat = Math.max(-90, Math.min(90, geo[1]));
      lon = ((((lon + 180) % 360) + 360) % 360) - 180;

      const u = (lon + 180) / 360;
      const v = (90 - lat) / 180;
      const sx = Math.min(srcW - 1, Math.max(0, Math.floor(u * srcW)));
      const sy = Math.min(srcH - 1, Math.max(0, Math.floor(v * srcH)));
      const srcIdx = (sy * srcW + sx) * srcChannels;

      out[outIdx] = srcData[srcIdx];
      out[outIdx + 1] = srcData[srcIdx + 1];
      out[outIdx + 2] = srcData[srcIdx + 2];
    }

    if (py > 0 && py % 200 === 0) {
      console.log(`  ${((py / outH) * 100).toFixed(0)}%`);
    }
  }

  await sharp(out, { raw: { width: outW, height: outH, channels: 3 } })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(OUT_PATH);

  writeFileSync(
    META_PATH,
    `${JSON.stringify(
      {
        width: outW,
        height: outH,
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
        scale: OUT_SCALE,
        source: "/globe/land-color.jpg",
        projection: "naturalEarth1",
        projectionParams,
      },
      null,
      2,
    )}\n`,
  );

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Wrote ${OUT_PATH} + ${META_PATH} (${elapsed}s)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
