/**
 * Appearance controller: turns persisted preferences into DOM variables and a
 * theme token override layer. Accent colors and frosted panels ride the
 * sanctioned `ctx.theme` override layer; the backdrop itself is painted by
 * {@link installPersonalizeStyles}' sheet from `--dsh-pz-*` variables set on
 * the root element.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ThemeSnapshot, ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import {
  ACCENTS, BACKDROPS, resolveFontStack, usesMonoCode, type PersonalizeSettings,
} from '../prefs.ts'
import { resolveImage } from './image.ts'

/** Override-layer source identity for this plugin. */
export const PERSONALIZE_SOURCE = '@deepseek-ai/dsh-client-ui-personalize'

/** Surface tokens made translucent so the backdrop shows through the panels. */
const SURFACE_TOKENS: readonly string[] = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-overlay',
  '--dsw-specific-sidebar-fill',
]

/** Accent tokens recolored by the accent choice. */
const ACCENT_TOKENS: readonly string[] = [
  '--dsw-alias-brand-primary',
  '--dsw-specific-sidebar-nav-item-active-accent',
]

/** One base palette; the registry only distinguishes light and dark. */
type Scheme = 'light' | 'dark'

/** One surface's opaque channels. */
interface Channels {
  r: number
  g: number
  b: number
}

/** Highest 8-bit channel value; anything above cannot be a color channel. */
const CHANNEL_MAX = 255

/** Base channels used until a palette has been sampled on this device. */
const CHANNEL_FALLBACK: Readonly<Record<Scheme, Channels>> = {
  light: { r: 255, g: 255, b: 255 },
  dark: { r: 21, g: 21, b: 23 },
}

/** One appearance controller. */
export interface AppearanceController {
  /** Apply one preference set to the document and the theme layer. */
  update: (settings: PersonalizeSettings) => void
}

/**
 * Parse the channels of one computed CSS color, ignoring any alpha it carries.
 * @param value - computed value of a custom property (`rgb()`, `rgba()`, or hex).
 * @returns the three channels, or `undefined` when the value is not a plain color.
 */
function parseChannels(value: string): Channels | undefined {
  const text = value.trim()
  const functional = /^rgba?\(([^)]+)\)$/i.exec(text)
  if (functional?.[1] === undefined) return parseHexChannels(text)
  const parts = functional[1].split(/[\s,/]+/).filter(part => part !== '').map(Number)
  return triplet(parts[0], parts[1], parts[2])
}

/**
 * Parse one #rgb or #rrggbb color.
 * @param text - trimmed color text.
 * @returns the three channels, or `undefined` for other notations.
 */
function parseHexChannels(text: string): Channels | undefined {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text)
  if (short?.[3] !== undefined && short[1] !== undefined && short[2] !== undefined) {
    return triplet(
      Number.parseInt(short[1] + short[1], 16),
      Number.parseInt(short[2] + short[2], 16),
      Number.parseInt(short[3] + short[3], 16),
    )
  }
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(text)
  if (long?.[3] === undefined || long[1] === undefined || long[2] === undefined) return undefined
  return triplet(
    Number.parseInt(long[1], 16),
    Number.parseInt(long[2], 16),
    Number.parseInt(long[3], 16),
  )
}

/**
 * Validate three candidate channels.
 * @param red - candidate red channel.
 * @param green - candidate green channel.
 * @param blue - candidate blue channel.
 * @returns the channels, or `undefined` when one is missing or out of range.
 */
function triplet(red: number | undefined, green: number | undefined, blue: number | undefined): Channels | undefined {
  if (red === undefined || green === undefined || blue === undefined) return undefined
  const valid = [red, green, blue].every(channel => Number.isFinite(channel) && channel >= 0 && channel <= CHANNEL_MAX)
  if (!valid) return undefined
  return { r: Math.round(red), g: Math.round(green), b: Math.round(blue) }
}

/**
 * Render one surface with the requested alpha, using the palette's own base
 * color so a translucent panel never changes hue.
 * @param channels - opaque surface channels.
 * @param alpha - opacity in 0..1.
 * @returns an `rgba()` value.
 */
function withAlpha(channels: Channels, alpha: number): string {
  const rgba = `rgba(${channels.r}, ${channels.g}, ${channels.b}, ${Number(alpha.toFixed(3))})`
  return rgba
}

/**
 * Point the UI face — and, for the monospace preset, the code face — at the
 * chosen stack. Root inline properties outrank the theme sheets, so the font
 * takes effect even when no backdrop is active.
 * @param root - the document root element.
 * @param settings - current preferences.
 */
function applyFont(root: HTMLElement, settings: PersonalizeSettings): void {
  const stack = resolveFontStack(settings)
  if (stack === '') {
    root.style.removeProperty('--dsw-font-family')
    root.style.removeProperty('--ds-font-family-code')
    return
  }
  root.style.setProperty('--dsw-font-family', stack)
  if (usesMonoCode(settings)) root.style.setProperty('--ds-font-family-code', stack)
  else root.style.removeProperty('--ds-font-family-code')
}

/**
 * Create the appearance controller for one plugin lifetime.
 * @param ctx - owning client context (the override layer is released on dispose).
 * @param theme - the active theme runtime.
 * @returns the controller.
 */
export function createAppearance(ctx: ClientContext, theme: {
  getTheme: () => ThemeSnapshot
  overrideTokens: (source: string, tokens: ThemeTokenOverrides) => () => void
}): AppearanceController {
  const sampled = new Map<Scheme, Map<string, Channels>>()
  let release: (() => void) | undefined

  ctx.effect(() => () => {
    release?.()
    release = undefined
    if (typeof document === 'undefined') return
    const root = document.documentElement
    for (const name of ['image', 'blur', 'scale', 'dim']) root.style.removeProperty(`--dsh-pz-bg-${name}`)
    root.style.removeProperty('--dsw-font-family')
    root.style.removeProperty('--ds-font-family-code')
    delete root.dataset.dshPersonalize
  }, 'ui-personalize: teardown')

  /**
   * Sample the active palette's opaque surface colors from computed styles. An
   * `rgba()` answer is accepted the same way: only the channels are kept, so
   * re-applying with a fresh alpha never compounds transparency.
   * @param scheme - palette the document currently renders.
   */
  const sample = (scheme: Scheme): void => {
    if (typeof document === 'undefined') return
    const computed = getComputedStyle(document.body)
    const table = sampled.get(scheme) ?? new Map<string, Channels>()
    for (const token of SURFACE_TOKENS) {
      const channels = parseChannels(computed.getPropertyValue(token))
      if (channels !== undefined) table.set(token, channels)
    }
    sampled.set(scheme, table)
  }

  /**
   * Compose the override layer for one preference set.
   * @param settings - current preferences.
   * @param snapshot - current theme snapshot (picks the accent mode handling).
   * @returns token-name → per-mode value pairs.
   */
  const composeOverrides = (settings: PersonalizeSettings, snapshot: ThemeSnapshot): ThemeTokenOverrides => {
    const tokens: ThemeTokenOverrides = {}
    const accent = ACCENTS.find(option => option.id === settings.accentId)
    if (accent !== undefined && accent.id !== 'default') {
      for (const token of ACCENT_TOKENS) tokens[token] = { light: accent.light, dark: accent.dark }
    }
    const hasBackdrop = settings.backgroundId !== 'none' || resolveImage(settings.backgroundImage) !== ''
    if (hasBackdrop && settings.glass > 0) {
      const active: Scheme = snapshot.active.colorScheme === 'dark' ? 'dark' : 'light'
      sample(active)
      const alpha = Math.max(0.05, 1 - settings.glass / 100)
      for (const token of SURFACE_TOKENS) {
        tokens[token] = {
          light: withAlpha(sampled.get('light')?.get(token) ?? CHANNEL_FALLBACK.light, alpha),
          dark: withAlpha(sampled.get('dark')?.get(token) ?? CHANNEL_FALLBACK.dark, alpha),
        }
      }
    }
    return tokens
  }

  /**
   * Paint the backdrop layers from the root element's variables.
   * @param settings - current preferences.
   * @param snapshot - current theme snapshot (decides scrim direction).
   */
  const paint = (settings: PersonalizeSettings, snapshot: ThemeSnapshot): void => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    applyFont(root, settings)
    const dark: Scheme = snapshot.active.colorScheme === 'dark' ? 'dark' : 'light'
    const backdrop = BACKDROPS.find(option => option.id === settings.backgroundId)
    const image = resolveImage(settings.backgroundImage)
    const layers: string[] = []
    if (image !== '') layers.push(`url("${image}")`)
    if (backdrop !== undefined && backdrop.id !== 'none') layers.push(backdrop[dark])
    if (layers.length === 0) {
      delete root.dataset.dshPersonalize
      return
    }
    root.dataset.dshPersonalize = 'on'
    root.style.setProperty('--dsh-pz-bg-image', layers.join(', '))
    root.style.setProperty('--dsh-pz-bg-blur', `${settings.blur}px`)
    // Blur bleeds transparent edges inward; growing the layer by half the
    // radius keeps every corner opaque.
    root.style.setProperty('--dsh-pz-bg-scale', String(1 + settings.blur / 160))
    const scrim = settings.dim > 0
      ? (dark === 'dark'
        ? `rgba(0, 0, 0, ${Number((settings.dim / 100).toFixed(3))})`
        : `rgba(255, 255, 255, ${Number((settings.dim / 100).toFixed(3))})`)
      : 'transparent'
    root.style.setProperty('--dsh-pz-bg-dim', scrim)
  }

  return {
    update: (settings: PersonalizeSettings): void => {
      const snapshot = theme.getTheme()
      const tokens = composeOverrides(settings, snapshot)
      if (Object.keys(tokens).length === 0) {
        // Nothing to fold in: leaving a layer behind would still republish on
        // every theme change for no visual effect.
        release?.()
        release = undefined
      } else {
        const previous = release
        release = theme.overrideTokens(PERSONALIZE_SOURCE, tokens)
        previous?.()
      }
      paint(settings, snapshot)
    },
  }
}
