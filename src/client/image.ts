/**
 * Browser-local storage for the uploaded backdrop image. The bytes stay in
 * `localStorage` (never in the Host settings document) and are recompressed
 * until they fit the storage budget, so a 4K wallpaper cannot exhaust it.
 */
import { LOCAL_IMAGE_MARKER } from '../prefs.ts'

/** Storage key holding the recompressed image data URL. */
const STORAGE_KEY = 'ui-personalize/background-image'

/** Largest accepted data URL length (a ~1.6 MB quote of the ~5 MB budget). */
const MAX_BYTES = 1_600_000

/** Long-edge candidates tried in order until the encoded image fits. */
const CANDIDATE_EDGES: readonly number[] = [1920, 1440, 1080, 800]

/** JPEG quality used for every re-encode step. */
const JPEG_QUALITY = 0.82

/**
 * Read the stored image, if any.
 * @returns the data URL, or `undefined` when nothing is stored or storage is unavailable.
 */
export function readLocalImage(): string | undefined {
  const value = readStorage()
  return value === undefined || value === '' ? undefined : value
}

/**
 * Store one already-recompressed image.
 * @param dataUrl - image data URL.
 * @returns whether the write landed.
 */
export function writeLocalImage(dataUrl: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, dataUrl)
    return true
  } catch {
    return false
  }
}

/** Drop the stored image. */
export function clearLocalImage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/** Whether accepting local images is possible in this runtime. */
export function supportsLocalImage(): boolean {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

/** Storage accessor that never throws for disabled or blocked storage. */
function readStorage(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Recompress one picked file into a JPEG data URL that fits the budget.
 * @param file - image file chosen by the user.
 * @returns the data URL.
 * @throws {Error} when the browser cannot decode the file.
 */
export async function importImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    return encodeToBudget(bitmap)
  } finally {
    bitmap.close()
  }
}

/**
 * Encode one bitmap at the largest candidate edge that fits the budget.
 * @param bitmap - decoded source image.
 * @returns JPEG data URL.
 */
function encodeToBudget(bitmap: ImageBitmap): string {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('ui-personalize: canvas 2d context unavailable')
  let best = ''
  for (const edge of CANDIDATE_EDGES) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.width = width
    canvas.height = height
    context.drawImage(bitmap, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (dataUrl.length <= MAX_BYTES) return dataUrl
    best = dataUrl
  }
  return best
}

/**
 * Resolve one preference value to the image it selects.
 * @param backgroundImage - persisted image field.
 * @returns the image source, or empty when no image is usable.
 */
export function resolveImage(backgroundImage: string): string {
  if (backgroundImage.startsWith(LOCAL_IMAGE_MARKER)) return readLocalImage() ?? ''
  if (backgroundImage.startsWith('http://') || backgroundImage.startsWith('https://')) return backgroundImage
  return backgroundImage.startsWith('data:image/') ? backgroundImage : ''
}
