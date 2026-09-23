/**
 * Local font enumeration for the custom typeface picker. The browser is the
 * only party allowed to list what this device has installed, so a missing or
 * refused enumeration always degrades to the manual name field instead of
 * leaving the row without a way to choose.
 */

/** One family as the browser reports it. */
export interface SystemFont {
  /** Family name, quoted when it carries spaces. */
  family: string
  /** Face style label, e.g. `Regular`. */
  style: string
}

/** Why an enumeration could not produce a list. */
export type FontEnumerationFailure = 'unsupported' | 'denied'

/** Outcome of one enumeration attempt. */
export type FontEnumeration =
  | { ok: true, fonts: readonly SystemFont[] }
  | { ok: false, reason: FontEnumerationFailure }

/** The Chromium-only surface this module probes, kept narrow so no ambient DOM types are assumed. */
interface LocalFontSource {
  query?: () => Promise<readonly { family: string, style: string }[]>
}

/** Upper bound on rendered rows; a full system can report many hundreds of families. */
export const FONT_LIST_LIMIT = 300

/**
 * Quote a family name when CSS needs it: a bare multi-word identifier is legal
 * but fragile against names that start with a digit or carry punctuation.
 * @param family - family name as reported by the browser.
 * @returns a value safe to place inside a `font-family` list.
 */
export function quoteFamily(family: string): string {
  const text = family.trim()
  if (text === '') return ''
  if (/^['"]/.test(text)) return text
  if (!/\s/.test(text)) return text
  return text.includes("'") ? `"${text.replace(/"/g, '')}"` : `'${text}'`
}

/**
 * Drop the quoting {@link quoteFamily} added, for display and ordering.
 * @param family - quoted family name.
 * @returns the bare name.
 */
export function unquoteFamily(family: string): string {
  return family.replace(/^['"]|['"]$/g, '')
}

/**
 * Collapse reported faces into one entry per family, keeping the first style.
 * @param faces - faces as reported by the browser.
 * @returns families sorted by bare name, so quoting never reorders the list.
 */
function dedupe(faces: readonly { family: string, style: string }[]): readonly SystemFont[] {
  const seen = new Map<string, SystemFont>()
  for (const face of faces) {
    const family = quoteFamily(face.family)
    if (family === '' || seen.has(family)) continue
    seen.set(family, { family, style: face.style })
  }
  return [...seen.values()].sort((a, b) => unquoteFamily(a.family).localeCompare(unquoteFamily(b.family), 'zh-Hans-CN'))
}

/**
 * Ask the browser for the fonts installed on this device.
 *
 * The underlying query is Chromium-only and prompts for a one-time local-font
 * permission, so both a missing surface and a refusal are reported rather than
 * thrown.
 * @returns the enumerated families, or the reason none could be listed.
 */
export async function enumerateSystemFonts(): Promise<FontEnumeration> {
  if (typeof navigator === 'undefined') return { ok: false, reason: 'unsupported' }
  const source = (navigator as unknown as { fonts?: LocalFontSource }).fonts
  if (source === undefined || typeof source.query !== 'function') return { ok: false, reason: 'unsupported' }
  try {
    return { ok: true, fonts: dedupe(await source.query()) }
  } catch {
    return { ok: false, reason: 'denied' }
  }
}
