/** Shared personalization vocabulary: ids, palettes, and the durable preferences shape. */

/** Settings namespace owned by the personalize plugin. */
export const PERSONALIZE_SETTINGS_NAMESPACE = 'ui-personalize'

/**
 * Marker selecting the browser-local image instead of a URL. The bytes live in
 * `localStorage`, so the persistent settings document only carries the marker.
 */
export const LOCAL_IMAGE_MARKER = 'local:'

/** Smallest accepted background blur (px). */
export const BLUR_MIN = 0

/** Largest accepted background blur (px). */
export const BLUR_MAX = 24

/** Smallest accepted overlay dim (%). */
export const DIM_MIN = 0

/** Largest accepted overlay dim (%). */
export const DIM_MAX = 80

/** Smallest accepted panel transparency (%). */
export const GLASS_MIN = 0

/** Largest accepted panel transparency (%). */
export const GLASS_MAX = 90

/** One selectable accent color: both palette modes are mandatory. */
export interface AccentOption {
  /** Settings id; `default` applies no accent override. */
  id: string
  /** Accent applied over the light palette. */
  light: string
  /** Accent applied over the dark palette. */
  dark: string
}

/** Accents offered by the General-section row, including the neutral default. */
export const ACCENTS: readonly AccentOption[] = [
  { id: 'default', light: '#4d6bfe', dark: '#7d9cff' },
  { id: 'indigo', light: '#3f5ae0', dark: '#8ba6ff' },
  { id: 'teal', light: '#0d8a86', dark: '#3ec9c0' },
  { id: 'violet', light: '#7c3aed', dark: '#b388ff' },
  { id: 'rose', light: '#d63c72', dark: '#ff6f9c' },
  { id: 'amber', light: '#b45309', dark: '#ffb547' },
  { id: 'forest', light: '#2f855a', dark: '#5cc98a' },
]

/** One selectable backdrop: a gradient per palette mode. */
export interface BackdropOption {
  /** Settings id; `none` paints no backdrop. */
  id: string
  /** Gradient applied while the light palette is active. */
  light: string
  /** Gradient applied while the dark palette is active. */
  dark: string
}

/** Backdrops offered by the General-section row, including the bare default. */
export const BACKDROPS: readonly BackdropOption[] = [
  { id: 'none', light: 'none', dark: 'none' },
  {
    id: 'aurora',
    light: 'linear-gradient(135deg, #dfe9ff 0%, #e6d9ff 45%, #ffe6f2 100%)',
    dark: 'linear-gradient(135deg, #101a33 0%, #1c1233 45%, #2a1424 100%)',
  },
  {
    id: 'dusk',
    light: 'linear-gradient(160deg, #ffd9c0 0%, #f6c1e0 45%, #c9c6ff 100%)',
    dark: 'linear-gradient(160deg, #2a1a2e 0%, #331934 45%, #141a34 100%)',
  },
  {
    id: 'ocean',
    light: 'linear-gradient(200deg, #c7ecff 0%, #b6d8ff 50%, #e0d7ff 100%)',
    dark: 'linear-gradient(200deg, #062034 0%, #0a2a4a 50%, #111a3a 100%)',
  },
  {
    id: 'forest',
    light: 'linear-gradient(140deg, #d6f2dd 0%, #bfe3cf 50%, #e4f0c8 100%)',
    dark: 'linear-gradient(140deg, #0c2318 0%, #123024 50%, #18260f 100%)',
  },
  {
    id: 'nebula',
    light: 'radial-gradient(120% 120% at 15% 10%, #efe4ff 0%, #e2ecff 40%, #ffeef6 100%)',
    dark: 'radial-gradient(120% 120% at 15% 10%, #1b1338 0%, #0d1a33 45%, #2b0f2a 100%)',
  },
]

/** Tail appended to a custom face so an uninstalled name still renders something. */
export const CUSTOM_FONT_TAIL = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', "
  + "'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"

/** One selectable typeface. */
export interface FontOption {
  /** Settings id; `default` applies no override, `custom` reads {@link PersonalizeSettings.fontCustom}. */
  id: string
  /** CSS `font-family` stack; empty for the defaults-only entries. */
  stack: string
  /** Whether the code font follows the same stack (only monospace wants this). */
  mono: boolean
}

/** Typefaces offered by the General-section row, including the untouched default. */
export const FONTS: readonly FontOption[] = [
  { id: 'default', stack: '', mono: false },
  {
    id: 'sans',
    stack: "Inter, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Helvetica, Arial, sans-serif",
    mono: false,
  },
  {
    id: 'serif',
    stack: "Georgia, 'Times New Roman', 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', STSong, "
      + "SimSun, NSimSun, serif",
    mono: false,
  },
  {
    id: 'rounded',
    stack: "'Yuanti SC', 'Hiragino Maru Gothic ProN', Quicksand, 'Varela Round', 'Arial Rounded MT Bold', "
      + "YouYuan, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    mono: false,
  },
  {
    id: 'kai',
    stack: "'Kaiti SC', KaiTi, STKaiti, 'LXGW WenKai', 'PingFang SC', 'Microsoft YaHei', serif",
    mono: false,
  },
  {
    id: 'mono',
    stack: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Mono', 'Cascadia Code', Consolas, "
      + "'Liberation Mono', Menlo, 'PingFang SC', 'Microsoft YaHei', monospace",
    mono: true,
  },
  { id: 'custom', stack: '', mono: false },
]

/** One numeric slider bound to a settings field. */
export interface SliderSpec {
  /** Settings field the slider writes. */
  field: 'blur' | 'dim' | 'glass'
  /** Locale key carrying the slider label. */
  labelKey: 'blur' | 'dim' | 'glass'
  /** Smallest accepted value. */
  min: number
  /** Largest accepted value. */
  max: number
  /** Step between accepted values. */
  step: number
}

/** Sliders offered by the General-section row. */
export const SLIDERS: readonly SliderSpec[] = [
  { field: 'blur', labelKey: 'blur', min: BLUR_MIN, max: BLUR_MAX, step: 1 },
  { field: 'dim', labelKey: 'dim', min: DIM_MIN, max: DIM_MAX, step: 5 },
  { field: 'glass', labelKey: 'glass', min: GLASS_MIN, max: GLASS_MAX, step: 5 },
]

/** Durable preferences shared by the Host schema and the browser scope. */
export interface PersonalizeSettings {
  /** Accent id; `default` applies no accent override. */
  accentId: string
  /** Backdrop id; `none` paints no gradient. */
  backgroundId: string
  /** Image source: empty, an `http(s)` URL, or {@link LOCAL_IMAGE_MARKER}. */
  backgroundImage: string
  /** Backdrop blur in px. */
  blur: number
  /** Overlay dim in percent. */
  dim: number
  /** Panel transparency in percent (backdrop-driven frosted glass). */
  glass: number
  /** Typeface id; `default` applies no font override, `custom` reads {@link PersonalizeSettings.fontCustom}. */
  fontId: string
  /** Comma-separated face names used when `fontId` is `custom`. */
  fontCustom: string
}

/** Values used before the settings document answers, and for unknown fields. */
export const DEFAULT_PERSONALIZE_SETTINGS: PersonalizeSettings = {
  accentId: 'default',
  backgroundId: 'none',
  backgroundImage: '',
  blur: 0,
  dim: 0,
  glass: 40,
  fontId: 'default',
  fontCustom: '',
}

/**
 * Strip the characters that could terminate a declaration, so a pasted face
 * name can only ever land inside the custom property's own value.
 * @param value - raw text from the settings document or the row's input.
 * @returns text safe to hand to `setProperty`.
 */
export function sanitizeFontInput(value: string): string {
  return value.replace(/[;{}<>]/g, '').trim()
}

/**
 * Resolve the stack the UI should render with.
 * @param settings - current preferences.
 * @returns a CSS `font-family` value, or `''` to leave the theme's own face alone.
 */
export function resolveFontStack(settings: PersonalizeSettings): string {
  if (settings.fontId === 'custom') {
    const name = sanitizeFontInput(settings.fontCustom)
    return name === '' ? '' : `${name}, ${CUSTOM_FONT_TAIL}`
  }
  const option = FONTS.find(item => item.id === settings.fontId)
  if (option === undefined || option.id === 'default') return ''
  return option.stack
}

/**
 * Whether the code face should follow the UI face.
 * @param settings - current preferences.
 * @returns `true` only for the monospace preset.
 */
export function usesMonoCode(settings: PersonalizeSettings): boolean {
  return FONTS.find(item => item.id === settings.fontId)?.mono === true
}

/** Clamp one numeric preference into its accepted range. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

/**
 * Merge one persisted object over the defaults, clamping every number.
 * @param value - object crossing the settings boundary.
 * @returns a complete preference set.
 */
export function normalizePersonalizeSettings(value: Partial<PersonalizeSettings> | undefined): PersonalizeSettings {
  if (value === undefined) return { ...DEFAULT_PERSONALIZE_SETTINGS }
  return {
    accentId: typeof value.accentId === 'string' ? value.accentId : DEFAULT_PERSONALIZE_SETTINGS.accentId,
    backgroundId: typeof value.backgroundId === 'string' ? value.backgroundId : DEFAULT_PERSONALIZE_SETTINGS.backgroundId,
    backgroundImage: typeof value.backgroundImage === 'string'
      ? value.backgroundImage
      : DEFAULT_PERSONALIZE_SETTINGS.backgroundImage,
    blur: clamp(typeof value.blur === 'number' ? value.blur : DEFAULT_PERSONALIZE_SETTINGS.blur, BLUR_MIN, BLUR_MAX),
    dim: clamp(typeof value.dim === 'number' ? value.dim : DEFAULT_PERSONALIZE_SETTINGS.dim, DIM_MIN, DIM_MAX),
    glass: clamp(typeof value.glass === 'number' ? value.glass : DEFAULT_PERSONALIZE_SETTINGS.glass, GLASS_MIN, GLASS_MAX),
    fontId: typeof value.fontId === 'string' ? value.fontId : DEFAULT_PERSONALIZE_SETTINGS.fontId,
    fontCustom: sanitizeFontInput(
      typeof value.fontCustom === 'string' ? value.fontCustom : DEFAULT_PERSONALIZE_SETTINGS.fontCustom,
    ),
  }
}
