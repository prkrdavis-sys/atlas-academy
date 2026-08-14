/**
 * Browser-side sharp crops of Blue Marble for Learn/Library context maps.
 * Samples the equirectangular globe texture through the same Natural Earth
 * projection as the SVG paths, at display resolution — so Kuwait-scale crops
 * keep desert / relief detail the overview bake cannot.
 */

import { geoAlbersUsa, geoNaturalEarth1, type GeoProjection } from "d3-geo";
import { loadLandColorImage } from "@/lib/globe-land-color";
import {
  getMapLandTextureBrightness,
  getMapLandTextureWashOpacity,
  MAP_LAND_CROP_TARGET_WIDTH,
  MAP_LAND_TEXTURE_META_PATH,
  type MapLandTextureMeta,
  type UsaMapProjectionMeta,
  USA_MAP_PROJECTION_META_PATH,
} from "@/lib/map-land-texture";

let metaPromise: Promise<MapLandTextureMeta> | null = null;
let usaMetaPromise: Promise<UsaMapProjectionMeta> | null = null;
const cropCache = new Map<string, string>();
const surfaceCropCache = new Map<string, { landHref: string }>();

/**
 * Runtime projection sampling is intentionally reserved for non-touch
 * devices. Mobile Safari has a much smaller page-process memory budget, and
 * decoding the source textures plus several working canvases can terminate
 * the page before the map is visible.
 */
export function shouldUseRuntimeMapTexture(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return true;

  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const hasCoarsePointer =
    navigator.maxTouchPoints > 0 ||
    (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches);
  const smallestScreenSide = Math.min(window.screen.width, window.screen.height);

  if (deviceMemory !== undefined && deviceMemory <= 4) return false;
  if (hasCoarsePointer && smallestScreenSide <= 900) return false;
  return true;
}

function loadMapLandTextureMeta(): Promise<MapLandTextureMeta> {
  if (!metaPromise) {
    metaPromise = fetch(MAP_LAND_TEXTURE_META_PATH)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${MAP_LAND_TEXTURE_META_PATH}`);
        }
        return response.json() as Promise<MapLandTextureMeta>;
      })
      .catch((error) => {
        metaPromise = null;
        throw error;
      });
  }
  return metaPromise;
}

function loadUsaProjectionMeta(): Promise<UsaMapProjectionMeta> {
  if (!usaMetaPromise) {
    usaMetaPromise = fetch(USA_MAP_PROJECTION_META_PATH).then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${USA_MAP_PROJECTION_META_PATH}`);
      return response.json() as Promise<UsaMapProjectionMeta>;
    });
  }
  return usaMetaPromise;
}

async function createMapProjection(templateKey: string): Promise<GeoProjection> {
  if (templateKey === "usa") {
    const meta = await loadUsaProjectionMeta();
    return geoAlbersUsa().scale(meta.scale).translate(meta.translate);
  }
  const meta = await loadMapLandTextureMeta();
  return geoNaturalEarth1()
    .scale(meta.projectionParams.scale)
    .translate(meta.projectionParams.translate)
    .center(meta.projectionParams.center)
    .rotate(meta.projectionParams.rotate);
}

function sampleEquirectangular(
  imageData: ImageData,
  lon: number,
  lat: number,
): [number, number, number] {
  const width = imageData.width;
  const height = imageData.height;
  const wrappedLon = ((((lon + 180) % 360) + 360) % 360) - 180;
  const clampedLat = Math.max(-90, Math.min(90, lat));
  const sx = Math.min(width - 1, Math.max(0, Math.floor(((wrappedLon + 180) / 360) * width)));
  const sy = Math.min(height - 1, Math.max(0, Math.floor(((90 - clampedLat) / 180) * height)));
  const idx = (sy * width + sx) * 4;
  return [imageData.data[idx], imageData.data[idx + 1], imageData.data[idx + 2]];
}

function applyThemeTone(
  canvas: HTMLCanvasElement,
  isDark: boolean,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const wash = getMapLandTextureWashOpacity(isDark);
  const brightness = getMapLandTextureBrightness(isDark);
  ctx.save();
  ctx.globalAlpha = wash;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  if (brightness < 1) {
    const gray = Math.round(brightness * 255);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();
}

/**
 * Renders a JPEG data URL of Blue Marble for the given SVG viewBox crop.
 * Cached per viewBox + theme + pixel size.
 */
export async function renderMapLandTextureCrop({
  viewBoxX,
  viewBoxY,
  viewBoxWidth,
  viewBoxHeight,
  isDark,
  targetWidth = MAP_LAND_CROP_TARGET_WIDTH,
}: {
  viewBoxX: number;
  viewBoxY: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  isDark: boolean;
  targetWidth?: number;
}): Promise<string> {
  const width = Math.max(64, Math.round(targetWidth));
  const height = Math.max(
    64,
    Math.round(targetWidth * (viewBoxHeight / Math.max(viewBoxWidth, 1e-6))),
  );
  const cacheKey = [
    viewBoxX.toFixed(2),
    viewBoxY.toFixed(2),
    viewBoxWidth.toFixed(2),
    viewBoxHeight.toFixed(2),
    isDark ? "d" : "l",
    width,
    height,
  ].join("|");

  const cached = cropCache.get(cacheKey);
  if (cached) return cached;

  const [meta, landImage] = await Promise.all([
    loadMapLandTextureMeta(),
    loadLandColorImage(),
  ]);

  const projection = geoNaturalEarth1()
    .scale(meta.projectionParams.scale)
    .translate(meta.projectionParams.translate)
    .center(meta.projectionParams.center)
    .rotate(meta.projectionParams.rotate);
  const invert = projection.invert?.bind(projection);
  if (!invert) {
    throw new Error("Natural Earth projection does not support invert()");
  }

  // Read source pixels once via a scratch canvas.
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = landImage.naturalWidth;
  srcCanvas.height = landImage.naturalHeight;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) throw new Error("Could not read land color texture");
  srcCtx.drawImage(landImage, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create land crop canvas");
  const out = ctx.createImageData(width, height);

  for (let py = 0; py < height; py++) {
    const y = viewBoxY + ((py + 0.5) / height) * viewBoxHeight;
    for (let px = 0; px < width; px++) {
      const x = viewBoxX + ((px + 0.5) / width) * viewBoxWidth;
      const geo = invert([x, y]);
      const outIdx = (py * width + px) * 4;
      if (!geo) {
        out.data[outIdx] = 15;
        out.data[outIdx + 1] = 23;
        out.data[outIdx + 2] = 42;
        out.data[outIdx + 3] = 255;
        continue;
      }
      const [r, g, b] = sampleEquirectangular(srcData, geo[0], geo[1]);
      out.data[outIdx] = r;
      out.data[outIdx + 1] = g;
      out.data[outIdx + 2] = b;
      out.data[outIdx + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  applyThemeTone(canvas, isDark);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  cropCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Produces geographically aligned NASA land color for a 2D map crop using the
 * exact projection that generated its SVG. Water is a separate full-map
 * bathymetry bake (see lib/map-ocean-texture.ts), not a per-crop rectangle.
 */
export async function renderMapSurfaceTextureCrop({
  templateKey,
  viewBoxX,
  viewBoxY,
  viewBoxWidth,
  viewBoxHeight,
  isDark,
  targetWidth = MAP_LAND_CROP_TARGET_WIDTH,
}: {
  templateKey: string;
  viewBoxX: number;
  viewBoxY: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  isDark: boolean;
  targetWidth?: number;
}): Promise<{ landHref: string }> {
  const width = Math.max(64, Math.round(targetWidth));
  const height = Math.max(64, Math.round(width * viewBoxHeight / Math.max(viewBoxWidth, 1e-6)));
  const cacheKey = [
    templateKey, viewBoxX.toFixed(2), viewBoxY.toFixed(2),
    viewBoxWidth.toFixed(2), viewBoxHeight.toFixed(2),
    isDark ? "d" : "l", width, height,
  ].join("|");
  const cached = surfaceCropCache.get(cacheKey);
  if (cached) return cached;

  const [projection, landImage] = await Promise.all([
    createMapProjection(templateKey),
    loadLandColorImage(),
  ]);
  const invert = projection.invert?.bind(projection);
  if (!invert) throw new Error(`${templateKey} projection does not support invert()`);

  const sourceData = (
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    maxWidth: number,
  ) => {
    const scale = Math.min(1, maxWidth / Math.max(sourceWidth, 1));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not read map texture");
    context.drawImage(source, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
  };
  // The output is at most 1280px wide, so retaining full-resolution source
  // ImageData only multiplies peak memory without improving the crop.
  const landData = sourceData(landImage, landImage.naturalWidth, landImage.naturalHeight, 2048);
  const landCanvas = document.createElement("canvas");
  landCanvas.width = width;
  landCanvas.height = height;
  const landContext = landCanvas.getContext("2d");
  if (!landContext) throw new Error("Could not create map texture canvas");
  const landOut = landContext.createImageData(width, height);

  for (let py = 0; py < height; py += 1) {
    const y = viewBoxY + ((py + 0.5) / height) * viewBoxHeight;
    for (let px = 0; px < width; px += 1) {
      const x = viewBoxX + ((px + 0.5) / width) * viewBoxWidth;
      const geo = invert([x, y]);
      const index = (py * width + px) * 4;
      if (!geo) {
        landOut.data.set([120, 132, 122, 255], index);
        continue;
      }
      const landPixel = sampleEquirectangular(landData, geo[0], geo[1]);
      landOut.data.set([...landPixel, 255], index);
    }
  }
  landContext.putImageData(landOut, 0, 0);
  applyThemeTone(landCanvas, isDark);
  const result = {
    landHref: landCanvas.toDataURL("image/jpeg", 0.9),
  };
  surfaceCropCache.set(cacheKey, result);
  return result;
}
