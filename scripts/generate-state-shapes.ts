/**
 * Generates one silhouette SVG per US state at public/shapes/us-XX.svg.
 *
 * Uses Census geometry from us-atlas with a per-state azimuthal equal-area
 * projection so outlines keep true proportions (not the Albers USA / @svg-maps
 * flat-map stretch used by context maps).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { Objects, Topology } from "topojson-specification";
import statesAtlas from "us-atlas/states-10m.json";
import { buildTrueShapeSvg } from "./shape-projection";

const OUT_DIR = join(process.cwd(), "public", "shapes");

const FIPS_TO_CODE: Record<string, string> = {
  "01": "al", "02": "ak", "04": "az", "05": "ar", "06": "ca", "08": "co",
  "09": "ct", "10": "de", "12": "fl", "13": "ga", "15": "hi", "16": "id",
  "17": "il", "18": "in", "19": "ia", "20": "ks", "21": "ky", "22": "la",
  "23": "me", "24": "md", "25": "ma", "26": "mi", "27": "mn", "28": "ms",
  "29": "mo", "30": "mt", "31": "ne", "32": "nv", "33": "nh", "34": "nj",
  "35": "nm", "36": "ny", "37": "nc", "38": "nd", "39": "oh", "40": "ok",
  "41": "or", "42": "pa", "44": "ri", "45": "sc", "46": "sd", "47": "tn",
  "48": "tx", "49": "ut", "50": "vt", "51": "va", "53": "wa", "54": "wv",
  "55": "wi", "56": "wy",
};

type AtlasProperties = { name: string };

mkdirSync(OUT_DIR, { recursive: true });

const topology = statesAtlas as unknown as Topology<Objects<AtlasProperties>>;
const collection = feature(topology, topology.objects.states) as unknown as FeatureCollection<
  Geometry,
  AtlasProperties
>;

let count = 0;
for (const state of collection.features) {
  const id = FIPS_TO_CODE[String(state.id).padStart(2, "0")];
  if (!id) continue;

  const svg = buildTrueShapeSvg((state as Feature<Geometry, AtlasProperties>).geometry);
  if (!svg) {
    throw new Error(`Could not project state ${id}`);
  }

  writeFileSync(join(OUT_DIR, `us-${id}.svg`), svg);
  count += 1;
}

console.log(`Wrote ${count} state shapes to public/shapes/`);
