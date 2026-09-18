import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getFlagAspectRatio } from "../lib/flag-display";
import { getDisplayFlagNameRegions } from "../lib/flag-name-regions";

const ROOT = process.cwd();
const OUT = "/tmp/flag-fix";
const WIDTH = 900;
const CODES = ["US-NH", "US-NE", "US-WY", "US-WV", "US-FL", "US-ID", "US-SD"];

const rings: Record<string, { cx: number; cy: number; rMin: number; rMax: number }[]> = {
  "US-NH": [{ cx: 50, cy: 50, rMin: 12, rMax: 22 }],
  "US-NE": [{ cx: 50, cy: 50, rMin: 18, rMax: 28 }],
  "US-WY": [{ cx: 44.5, cy: 45, rMin: 5.5, rMax: 12 }],
  "US-WV": [{ cx: 50, cy: 141, rMin: 58, rMax: 70 }],
  "US-FL": [{ cx: 50, cy: 50, rMin: 12, rMax: 20 }],
  "US-ID": [{ cx: 50, cy: 46, rMin: 12, rMax: 20 }],
  "US-SD": [
    { cx: 50, cy: 50, rMin: 16, rMax: 28 },
    { cx: 50, cy: 50, rMin: 8, rMax: 16 },
  ],
};

async function renderFlag(code: string, width: number) {
  const aspect = getFlagAspectRatio(code);
  const height = Math.round(width / aspect);
  const svgPath = path.join(ROOT, "public/flags", `${code.toLowerCase()}.svg`);
  const svg = await readFile(svgPath);
  const png = await sharp(svg, { density: 240 })
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();
  return { png, width, height, aspect };
}

function overlaySvg(
  width: number,
  height: number,
  regions: ReturnType<typeof getDisplayFlagNameRegions>,
) {
  const toX = (value: number) => (value / 100) * width;
  const toY = (value: number) => (value / 100) * height;
  const parts = regions.map((region) => {
    if (region.mask.kind === "capsule") {
      const insetX = Math.min(region.w * 0.02, 0.35);
      const insetY = region.h * 0.08;
      const x = toX(region.x + insetX);
      const y = toY(region.y + insetY);
      const w = toX(region.w - insetX * 2);
      const h = toY(region.h - insetY * 2);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ry="${h / 2}" fill="rgba(255,20,90,0.55)"/>`;
    }
    const mask = region.mask;
    const outer: string[] = [];
    const inner: string[] = [];
    const start = mask.start;
    let finish = mask.end;
    while (finish < start) finish += 360;
    const span = finish - start;
    const steps = Math.max(16, Math.round(span / 3));
    for (let i = 0; i <= steps; i++) {
      const angle = start + (span * i) / steps;
      const rad = (angle * Math.PI) / 180;
      const ux = Math.sin(rad);
      const uy = -Math.cos(rad);
      outer.push(`${toX(mask.cx + (mask.rx + mask.tx) * ux)},${toY(mask.cy + (mask.ry + mask.ty) * uy)}`);
      inner.push(`${toX(mask.cx + Math.max(mask.rx - mask.tx, 0) * ux)},${toY(mask.cy + Math.max(mask.ry - mask.ty, 0) * uy)}`);
    }
    return `<path d="M${outer[0]} L${outer.slice(1).join(" L")} L${inner.reverse().join(" L")} Z" fill="rgba(255,20,90,0.55)"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${parts.join("")}</svg>`;
}

async function polarUnwrap(
  png: Buffer,
  width: number,
  height: number,
  aspect: number,
  cxPct: number,
  cyPct: number,
  rMin: number,
  rMax: number,
  outPath: string,
) {
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cx = (cxPct / 100) * width;
  const cy = (cyPct / 100) * height;
  const uw = 1080;
  const uh = 160;
  const out = Buffer.alloc(uw * uh * 4);
  for (let x = 0; x < uw; x++) {
    const ang = (x / uw) * 360;
    const rad = (ang * Math.PI) / 180;
    const ux = Math.sin(rad);
    const uy = -Math.cos(rad);
    for (let y = 0; y < uh; y++) {
      const rPct = rMin + ((rMax - rMin) * y) / (uh - 1);
      const px = Math.round(cx + (rPct / 100) * width * ux);
      const py = Math.round(cy + (rPct / 100) * width * aspect * uy);
      const di = (y * uw + x) * 4;
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const si = (py * width + px) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = 255;
    }
  }
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${uw}" height="${uh + 22}">
      <rect width="100%" height="22" fill="#111"/>
      ${Array.from({ length: 37 }, (_, i) => {
        const x = (i * 10 / 360) * uw;
        return `<line x1="${x}" y1="0" x2="${x}" y2="${uh + 22}" stroke="${i % 3 === 0 ? "#5eead4" : "#334155"}" stroke-width="1"/>
        <text x="${x + 2}" y="14" fill="#5eead4" font-size="10">${i * 10}</text>`;
      }).join("")}
    </svg>`,
  );
  const unwrapPng = await sharp(out, { raw: { width: uw, height: uh, channels: 4 } }).png().toBuffer();
  await sharp({
    create: { width: uw, height: uh + 22, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([
      { input: unwrapPng, top: 22, left: 0 },
      { input: overlay, top: 0, left: 0 },
    ])
    .jpeg({ quality: 90 })
    .toFile(outPath);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const code of CODES) {
    const { png, width, height, aspect } = await renderFlag(code, WIDTH);
    const regions = getDisplayFlagNameRegions(code, aspect, aspect, "contain");
    const overlay = Buffer.from(overlaySvg(width, height, regions));
    await sharp(png).png().toFile(path.join(OUT, `${code}-clean.png`));
    await sharp(png)
      .composite([{ input: overlay, blend: "over" }])
      .jpeg({ quality: 92 })
      .toFile(path.join(OUT, `${code}-now.jpg`));
    let i = 0;
    for (const ring of rings[code] ?? []) {
      await polarUnwrap(png, width, height, aspect, ring.cx, ring.cy, ring.rMin, ring.rMax, path.join(OUT, `${code}-u${i}.jpg`));
      i += 1;
    }
    console.log(
      code,
      JSON.stringify(
        regions.map((r) => ({
          mask: r.mask,
          letter: r.letterSize,
          box: [r.x.toFixed(1), r.y.toFixed(1), r.w.toFixed(1), r.h.toFixed(1)],
        })),
      ),
    );
  }
}

void main();
