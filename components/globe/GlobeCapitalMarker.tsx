"use client";

import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { getCapitalLatLng } from "@/lib/capital-coordinates";
import { lonLatToLocalDirection } from "@/lib/globe-focus";

/** Sit just above the planet and close-up patch, inside the camera min distance. */
const MARKER_RADIUS = 1.0026;
/** Clip-space scale with sizeAttenuation off — stable screen size at any zoom. */
const MARKER_SCALE = 0.036;

const textureCache = new Map<string, THREE.CanvasTexture>();

function ignoreRaycast() {}

function getStarTexture(isDark: boolean): THREE.CanvasTexture {
  const key = isDark ? "d" : "l";
  const cached = textureCache.get(key);
  if (cached) return cached;

  const fill = isDark ? "#fb7185" : "#e11d48";
  const rim = isDark ? "#fff1f2" : "#ffffff";
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create capital star canvas");

  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.4;
  const inner = outer * 0.4;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.07;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

type GlobeCapitalMarkerProps = {
  selectedCode: string | null;
  isDark: boolean;
};

/**
 * Capital star on the globe surface. Mounts only while a place is selected,
 * matching the country highlight.
 */
export function GlobeCapitalMarker({ selectedCode, isDark }: GlobeCapitalMarkerProps) {
  const position = useMemo(() => {
    if (!selectedCode) return null;
    const latLng = getCapitalLatLng(selectedCode);
    if (!latLng) return null;
    const [lat, lng] = latLng;
    return lonLatToLocalDirection(lng, lat).multiplyScalar(MARKER_RADIUS);
  }, [selectedCode]);

  const texture = useMemo(() => getStarTexture(isDark), [isDark]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7905/ingest/53dc1e10-6e0b-4fef-9ca0-63e913b775c1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "124d3d" },
      body: JSON.stringify({
        sessionId: "124d3d",
        runId: "pre-fix",
        hypothesisId: "D",
        location: "GlobeCapitalMarker.tsx:render",
        message: "GlobeCapitalMarker render",
        data: {
          selectedCode,
          hasPosition: Boolean(position),
          x: position?.x ?? null,
          y: position?.y ?? null,
          z: position?.z ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [position, selectedCode]);

  if (!position) return null;

  return (
    <sprite
      position={position}
      scale={[MARKER_SCALE, MARKER_SCALE, 1]}
      renderOrder={12}
      raycast={ignoreRaycast}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
        sizeAttenuation={false}
      />
    </sprite>
  );
}
