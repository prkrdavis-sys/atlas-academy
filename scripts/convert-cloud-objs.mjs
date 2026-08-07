/**
 * Normalize S. Paul Michael cumulus OBJs into unit-box JSON geometries.
 * Usage: node scripts/convert-cloud-objs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cloudsDir = path.join(__dirname, "../public/globe/clouds");

const INPUTS = [
  { src: "Cloud_01.obj", out: "cumulus-01.json" },
  { src: "Cloud2.obj", out: "cumulus-02.json" },
  { src: "Cloud_2.obj", out: "cumulus-03.json" },
  { src: "Cloud4.obj", out: "cumulus-04.json" },
];

function firstMeshGeometry(group) {
  let geometry = null;
  group.traverse((child) => {
    if (!geometry && child.isMesh && child.geometry) {
      geometry = child.geometry;
    }
  });
  if (!geometry) throw new Error("No mesh geometry found");
  return geometry;
}

function normalizeGeometry(geometry) {
  const geom = geometry.clone().toNonIndexed();
  geom.computeBoundingBox();
  const box = geom.boundingBox;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  geom.translate(-center.x, -center.y, -center.z);
  geom.scale(1 / maxDim, 1 / maxDim, 1 / maxDim);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}

function toJson(geometry) {
  const position = Array.from(geometry.attributes.position.array);
  const normal = geometry.attributes.normal
    ? Array.from(geometry.attributes.normal.array)
    : null;
  return {
    position,
    normal,
    // Source meshes are low-poly cumulus blobs (~240–320 faces).
    vertexCount: geometry.attributes.position.count,
  };
}

for (const entry of INPUTS) {
  const text = fs.readFileSync(path.join(cloudsDir, entry.src), "utf8");
  const group = new OBJLoader().parse(text);
  const geometry = normalizeGeometry(firstMeshGeometry(group));
  const json = toJson(geometry);
  const outPath = path.join(cloudsDir, entry.out);
  fs.writeFileSync(outPath, JSON.stringify(json));
  console.log(
    `wrote ${entry.out} (${json.vertexCount} verts, ${Buffer.byteLength(JSON.stringify(json))} bytes)`,
  );
}
