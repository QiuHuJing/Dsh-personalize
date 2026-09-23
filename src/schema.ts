/** Host schema for the personalize settings namespace. */

import z from '@deepseek-ai/schemastery'
import {
  BLUR_MAX, BLUR_MIN, DIM_MAX, DIM_MIN, GLASS_MAX, GLASS_MIN, type PersonalizeSettings,
} from './prefs.ts'

export {
  BLUR_MAX, BLUR_MIN, DEFAULT_PERSONALIZE_SETTINGS, DIM_MAX, DIM_MIN, GLASS_MAX, GLASS_MIN,
  LOCAL_IMAGE_MARKER, PERSONALIZE_SETTINGS_NAMESPACE, normalizePersonalizeSettings,
  type PersonalizeSettings,
} from './prefs.ts'

/** Durable personalize schema; also the wire envelope the browser scope validates against. */
export const PersonalizeSettingsSchema: z<PersonalizeSettings> = z.object({
  accentId: z.string().default('default'),
  backgroundId: z.string().default('none'),
  backgroundImage: z.string().default(''),
  blur: z.number().step(1).min(BLUR_MIN).max(BLUR_MAX).default(0),
  dim: z.number().step(5).min(DIM_MIN).max(DIM_MAX).default(0),
  glass: z.number().step(5).min(GLASS_MIN).max(GLASS_MAX).default(40),
  fontId: z.string().default('default'),
  fontCustom: z.string().default(''),
})
