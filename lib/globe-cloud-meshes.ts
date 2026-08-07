import * as THREE from "three";

export type CumulusGeometryJson = {
  position: number[];
  normal: number[] | null;
  vertexCount: number;
};

/** S. Paul Michael cumulus shapes (CC-BY), normalized to a unit bounding box. */
export const CUMULUS_MESH_URLS = [
  "/globe/clouds/cumulus-01.json",
  "/globe/clouds/cumulus-02.json",
  "/globe/clouds/cumulus-03.json",
  "/globe/clouds/cumulus-04.json",
] as const;

let loadPromise: Promise<THREE.BufferGeometry[]> | null = null;
let cached: THREE.BufferGeometry[] | null = null;

function geometryFromJson(json: CumulusGeometryJson): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(json.position, 3),
  );
  if (json.normal && json.normal.length === json.position.length) {
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(json.normal, 3),
    );
  } else {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Load the cumulus mesh library once. Geometries are unit-boxed with Y-up in
 * model space; globe code maps +Y onto the local radial (+Z) so the puff sits
 * upright in the atmosphere.
 */
export function loadCumulusGeometries(): Promise<THREE.BufferGeometry[]> {
  if (cached) return Promise.resolve(cached);
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all(
    CUMULUS_MESH_URLS.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load cumulus mesh ${url}: ${response.status}`);
      }
      const json = (await response.json()) as CumulusGeometryJson;
      return geometryFromJson(json);
    }),
  )
    .then((geometries) => {
      cached = geometries;
      return geometries;
    })
    .catch((error) => {
      loadPromise = null;
      throw error;
    });

  return loadPromise;
}
