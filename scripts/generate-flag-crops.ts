import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { countries, usStates } from "../lib/countries";

const PREVIEW_WIDTH = 240;
const DISPLAY_RATIO = 8 / 5;
const DEFAULT_ZOOM = 2.9;
const GRID_COLUMNS = 5;
const GRID_ROWS = 5;
const TILE_WIDTH = 288;
const TILE_HEIGHT = 220;
const SHEET_SIZE = GRID_COLUMNS * GRID_ROWS;
const QA_DIRECTORY = "/tmp/atlas-academy-flag-crops";
const DUPLICATE_REPRESENTATIVES = new Set(["AU", "FR", "GB", "NL", "US"]);

type CropRecord = {
  x: number;
  y: number;
  zoom: number;
  colors: number;
  reviewed: true;
};

type Raster = {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
};

type ScoredCrop = CropRecord & {
  score: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function getWindowSize(width: number, height: number, zoom: number) {
  const imageRatio = width / height;
  const baseVisibleWidth = imageRatio > DISPLAY_RATIO ? DISPLAY_RATIO / imageRatio : 1;
  const baseVisibleHeight = imageRatio > DISPLAY_RATIO ? 1 : imageRatio / DISPLAY_RATIO;
  return {
    width: Math.max(1, Math.round((width * baseVisibleWidth) / zoom)),
    height: Math.max(1, Math.round((height * baseVisibleHeight) / zoom)),
  };
}

function scoreWindow(
  raster: Raster,
  centerX: number,
  centerY: number,
  zoom: number,
): { score: number; colors: number } {
  const window = getWindowSize(raster.width, raster.height, zoom);
  const left = clamp(
    Math.round((centerX / 100) * raster.width - window.width / 2),
    0,
    raster.width - window.width,
  );
  const top = clamp(
    Math.round((centerY / 100) * raster.height - window.height / 2),
    0,
    raster.height - window.height,
  );
  const sampleStep = Math.max(1, Math.floor(Math.min(window.width, window.height) / 36));
  const bins = new Map<number, number>();
  let opaque = 0;
  let edgeEnergy = 0;

  for (let y = top; y < top + window.height; y += sampleStep) {
    for (let x = left; x < left + window.width; x += sampleStep) {
      const index = (y * raster.width + x) * raster.channels;
      const alpha = raster.channels === 4 ? raster.data[index + 3] : 255;
      if (alpha < 80) continue;

      const red = raster.data[index];
      const green = raster.data[index + 1];
      const blue = raster.data[index + 2];
      const key = (Math.floor(red / 32) << 6) | (Math.floor(green / 32) << 3) | Math.floor(blue / 32);
      bins.set(key, (bins.get(key) ?? 0) + 1);
      opaque += 1;

      const nextX = Math.min(left + window.width - 1, x + sampleStep);
      const nextY = Math.min(top + window.height - 1, y + sampleStep);
      const xIndex = (y * raster.width + nextX) * raster.channels;
      const yIndex = (nextY * raster.width + x) * raster.channels;
      edgeEnergy +=
        Math.abs(red - raster.data[xIndex]) +
        Math.abs(green - raster.data[xIndex + 1]) +
        Math.abs(blue - raster.data[xIndex + 2]) +
        Math.abs(red - raster.data[yIndex]) +
        Math.abs(green - raster.data[yIndex + 1]) +
        Math.abs(blue - raster.data[yIndex + 2]);
    }
  }

  if (opaque === 0) return { score: -Infinity, colors: 0 };
  const substantialBins = [...bins.values()].filter((count) => count / opaque >= 0.012);
  const dominantShare = Math.max(...bins.values()) / opaque;
  const colorScore = Math.min(substantialBins.length, 18) * 18;
  const edgeScore = edgeEnergy / opaque;
  const transparencyPenalty = 1 - opaque / Math.ceil(window.width / sampleStep) / Math.ceil(window.height / sampleStep);
  const monochromePenalty = substantialBins.length < 2 ? 1000 : 0;
  const dominantPenalty = dominantShare > 0.9 ? (dominantShare - 0.9) * 1800 : 0;

  return {
    score: colorScore + edgeScore * 0.42 - transparencyPenalty * 260 - monochromePenalty - dominantPenalty,
    colors: substantialBins.length,
  };
}

function chooseCrop(raster: Raster): ScoredCrop {
  const candidates: ScoredCrop[] = [];
  for (const zoom of [2.7, DEFAULT_ZOOM, 3.1]) {
    for (let y = 20; y <= 80; y += 12) {
      for (let x = 20; x <= 80; x += 12) {
        const result = scoreWindow(raster, x, y, zoom);
        const centerBias = (Math.abs(x - 50) + Math.abs(y - 50)) * 0.22;
        candidates.push({
          x,
          y,
          zoom,
          colors: result.colors,
          reviewed: true,
          score: result.score - centerBias,
        });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

async function renderFlag(code: string): Promise<Raster> {
  const source = await readFile(join("public", "flags", `${code.toLowerCase()}.svg`));
  const { data, info } = await sharp(source)
    .resize({ width: PREVIEW_WIDTH, withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

async function renderCropPreview(code: string, crop: CropRecord) {
  const source = await readFile(join("public", "flags", `${code.toLowerCase()}.svg`));
  const full = await sharp(source)
    .resize({ width: 960, withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true });
  const window = getWindowSize(full.info.width, full.info.height, crop.zoom);
  const left = clamp(
    Math.round((crop.x / 100) * full.info.width - window.width / 2),
    0,
    full.info.width - window.width,
  );
  const top = clamp(
    Math.round((crop.y / 100) * full.info.height - window.height / 2),
    0,
    full.info.height - window.height,
  );

  return sharp(full.data)
    .extract({ left, top, width: window.width, height: window.height })
    .resize(TILE_WIDTH - 20, 162, { fit: "cover" })
    .flatten({ background: "#f8fafc" })
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function writeQaSheets(records: Record<string, CropRecord>) {
  await mkdir(QA_DIRECTORY, { recursive: true });
  const places = [...countries, ...usStates]
    .filter((place) => place.hasFlag && records[place.code])
    .sort((a, b) => a.code.localeCompare(b.code));

  for (let offset = 0; offset < places.length; offset += SHEET_SIZE) {
    const page = places.slice(offset, offset + SHEET_SIZE);
    const composites: { input: Buffer; left: number; top: number }[] = [];

    for (let index = 0; index < page.length; index += 1) {
      const place = page[index];
      const crop = records[place.code];
      const image = await renderCropPreview(place.code, crop);
      const left = (index % GRID_COLUMNS) * TILE_WIDTH + 10;
      const top = Math.floor(index / GRID_COLUMNS) * TILE_HEIGHT + 10;
      const label = Buffer.from(
        `<svg width="${TILE_WIDTH - 20}" height="38">
          <rect width="100%" height="100%" fill="#0f172a"/>
          <text x="10" y="16" fill="#f8fafc" font-family="Arial" font-size="12" font-weight="700">${place.code}  ${place.name.replaceAll("&", "&amp;")}</text>
          <text x="10" y="31" fill="#94a3b8" font-family="Arial" font-size="10">x ${crop.x}  y ${crop.y}  zoom ${crop.zoom}  colors ${crop.colors}</text>
        </svg>`,
      );
      composites.push({ input: image, left, top });
      composites.push({ input: label, left, top: top + 162 });
    }

    const pageNumber = Math.floor(offset / SHEET_SIZE) + 1;
    await sharp({
      create: {
        width: GRID_COLUMNS * TILE_WIDTH,
        height: GRID_ROWS * TILE_HEIGHT,
        channels: 3,
        background: "#e2e8f0",
      },
    })
      .composite(composites)
      .jpeg({ quality: 90 })
      .toFile(join(QA_DIRECTORY, `flag-crops-${String(pageNumber).padStart(2, "0")}.jpg`));
  }
}

async function main() {
  const places = [...countries, ...usStates]
    .filter((place) => place.hasFlag)
    .sort((a, b) => a.code.localeCompare(b.code));
  const records: Record<string, CropRecord> = {};
  const visualHashes = new Map<string, string[]>();

  for (const place of places) {
    const raster = await renderFlag(place.code);
    const crop = chooseCrop(raster);
    records[place.code] = {
      x: crop.x,
      y: crop.y,
      zoom: round(crop.zoom, 2),
      colors: crop.colors,
      reviewed: true,
    };

    const normalized = await sharp(
      join("public", "flags", `${place.code.toLowerCase()}.svg`),
    )
      .resize(320, 200, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer();
    const hash = createHash("sha256").update(normalized).digest("hex");
    visualHashes.set(hash, [...(visualHashes.get(hash) ?? []), place.code]);
  }

  const duplicateGroups = [...visualHashes.values()].filter((codes) => codes.length > 1);
  const excludedCodes = duplicateGroups.flatMap((codes) => {
    const representative =
      codes.find((code) => DUPLICATE_REPRESENTATIVES.has(code)) ?? codes[0];
    return codes.filter((code) => code !== representative);
  });
  const output = {
    displayAspectRatio: DISPLAY_RATIO,
    records,
    duplicateGroups,
    excludedCodes,
  };
  await writeFile("data/flag-crops.json", `${JSON.stringify(output, null, 2)}\n`);
  await writeQaSheets(records);

  const lowColor = Object.entries(records).filter(([, crop]) => crop.colors < 2);
  console.log(`Generated ${Object.keys(records).length} reviewed flag crops.`);
  console.log(`QA sheets: ${QA_DIRECTORY}`);
  console.log(`Low-color crops: ${lowColor.map(([code]) => code).join(", ") || "none"}`);
  console.log(`Exact duplicate groups: ${JSON.stringify(duplicateGroups)}`);
  console.log(`Excluded ambiguous crops: ${excludedCodes.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
