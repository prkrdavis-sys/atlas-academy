import sharp from "sharp";

const SRC =
  "/Users/parker/.cursor/projects/Users-parker-Projects-atlas-academy/assets/Cropped_Logo-acbeffb4-d3a3-4279-90da-9f5e009f01ac.png";
const SIZE = 1024;

// The source is a full-bleed rounded square on black. Detect the corner
// radius by scanning the top row for the first non-black pixel (which sits
// exactly at x = radius for a rounded rect).
async function detectRadius() {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  for (let x = 0; x < info.width; x++) {
    const i = x * info.channels;
    if (data[i] + data[i + 1] + data[i + 2] > 30) return x;
  }
  throw new Error("could not detect corner radius");
}

function roundedMask(size, radius) {
  return Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
}

async function main() {
  const radius = await detectRadius();
  console.log("detected corner radius:", radius);

  // Rounded icon with transparent corners at full resolution.
  const rounded1024 = await sharp(SRC)
    .composite([{ input: roundedMask(SIZE, radius), blend: "dest-in" }])
    .png()
    .toBuffer();

  // Full-bleed square: diagonal gradient sampled from the artwork corners so
  // the corners continue the icon's own gradient, with the rounded icon on top.
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const sample = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
  };
  const inset = Math.ceil(radius * 0.45);
  const bottomLeft = sample(inset, SIZE - 1 - inset);
  const topRight = sample(SIZE - 1 - inset, inset);
  const background = await sharp(
    Buffer.from(
      `<svg width="${SIZE}" height="${SIZE}">
        <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="${bottomLeft}"/>
          <stop offset="1" stop-color="${topRight}"/>
        </linearGradient></defs>
        <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
      </svg>`
    )
  )
    .png()
    .toBuffer();
  const fullBleed1024 = await sharp(background)
    .composite([{ input: rounded1024 }])
    .removeAlpha()
    .png()
    .toBuffer();

  const resize = (buf, size) => sharp(buf).resize(size, size).png().toBuffer();

  const outputs = [
    // Transparent rounded icons (favicons / PWA "any" icons)
    ["public/favicon-16.png", await resize(rounded1024, 16)],
    ["public/favicon-32.png", await resize(rounded1024, 32)],
    ["public/icon-192.png", await resize(rounded1024, 192)],
    ["public/icon-512.png", await resize(rounded1024, 512)],
    ["app/icon.png", await resize(rounded1024, 512)],
    // Full-bleed squares (Apple touch icons must not have transparency)
    ["public/apple-icon.png", await resize(fullBleed1024, 180)],
    ["app/apple-icon.png", await resize(fullBleed1024, 180)],
    // Maskable: artwork scaled to 84% over the full-bleed background so the
    // globe survives circular masks.
    // Brand asset at full resolution
    ["public/brand/atlas-academy-app-icon.png", rounded1024],
  ];

  for (const maskableSize of [192, 512]) {
    const fgSize = Math.round(maskableSize * 0.84);
    const bg = await sharp(fullBleed1024).resize(maskableSize, maskableSize).toBuffer();
    const fg = await sharp(rounded1024).resize(fgSize, fgSize).png().toBuffer();
    const offset = Math.round((maskableSize - fgSize) / 2);
    const buf = await sharp(bg)
      .composite([{ input: fg, left: offset, top: offset }])
      .removeAlpha()
      .png()
      .toBuffer();
    outputs.push([`public/icon-maskable-${maskableSize}.png`, buf]);
  }

  const { writeFile } = await import("node:fs/promises");
  for (const [path, buf] of outputs) {
    await writeFile(path, buf);
    console.log("wrote", path, buf.length, "bytes");
  }

  // favicon.ico with PNG-compressed 16/32/48 entries.
  const icoSizes = [16, 32, 48];
  const pngs = await Promise.all(icoSizes.map((s) => resize(rounded1024, s)));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let dataOffset = 6 + 16 * pngs.length;
  const blobs = [];
  pngs.forEach((png, i) => {
    const s = icoSizes[i];
    const e = Buffer.alloc(16);
    e.writeUInt8(s === 256 ? 0 : s, 0); // width
    e.writeUInt8(s === 256 ? 0 : s, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(dataOffset, 12);
    dataOffset += png.length;
    entries.push(e);
    blobs.push(png);
  });
  const ico = Buffer.concat([header, ...entries, ...blobs]);
  await writeFile("app/favicon.ico", ico);
  console.log("wrote app/favicon.ico", ico.length, "bytes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
