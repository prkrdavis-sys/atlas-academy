/**
 * Generates the USA map from official U.S. Census state geometry bundled by
 * us-atlas. The saved Albers USA projection metadata is also used to align
 * NASA land-color and bathymetry imagery with the SVG at runtime.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoAlbersUsa, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { Objects, Topology } from "topojson-specification";
import statesAtlas from "us-atlas/states-10m.json";
import type { MapBoundsManifest, PathBounds } from "../lib/map-bounds";
import { toPathBounds } from "./map-path-utils";

const OUT_DIR = join(process.cwd(), "public", "maps");
const WIDTH = 10_000;
const HEIGHT = 7_000;
const PADDING = 180;

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
type AtlasFeature = Feature<Geometry, AtlasProperties>;

function main() {
  const topology = statesAtlas as unknown as Topology<Objects<AtlasProperties>>;
  const collection = feature(topology, topology.objects.states) as unknown as FeatureCollection<
    Geometry,
    AtlasProperties
  >;
  const states = collection.features.filter((state) => FIPS_TO_CODE[String(state.id).padStart(2, "0")]);
  const stateCollection: FeatureCollection<Geometry, AtlasProperties> = {
    type: "FeatureCollection",
    features: states,
  };

  const projection = geoAlbersUsa().fitExtent(
    [[PADDING, PADDING], [WIDTH - PADDING, HEIGHT - PADDING]],
    stateCollection,
  );
  const path = geoPath(projection);
  const entries = states.map((state) => {
    const id = FIPS_TO_CODE[String(state.id).padStart(2, "0")];
    const d = path(state as AtlasFeature);
    if (!d) throw new Error(`Could not project ${state.properties.name}`);
    return { id, d };
  });
  const paths = entries.map(({ id, d }) => `<path id="${id}" d="${d}"/>`).join("");
  writeFileSync(
    join(OUT_DIR, "usa.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">${paths}</svg>\n`,
  );

  const boundsPath = join(OUT_DIR, "bounds.json");
  const manifest = JSON.parse(readFileSync(boundsPath, "utf8")) as MapBoundsManifest;
  const pathBounds = Object.fromEntries(
    entries.map(({ id, d }) => [id, toPathBounds(d)]),
  ) as Record<string, PathBounds>;
  manifest.usa = {
    viewBox: [0, 0, WIDTH, HEIGHT],
    paths: pathBounds,
    focusPaths: pathBounds,
  };
  writeFileSync(boundsPath, `${JSON.stringify(manifest)}\n`);

  writeFileSync(
    join(OUT_DIR, "usa-projection.json"),
    `${JSON.stringify({
      mapWidth: WIDTH,
      mapHeight: HEIGHT,
      projection: "albersUsa",
      scale: projection.scale(),
      translate: projection.translate(),
    }, null, 2)}\n`,
  );
  console.log("Wrote USA SVG, bounds, and Albers projection metadata");
}

main();
