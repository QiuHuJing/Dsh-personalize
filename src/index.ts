/** Host registration for the personalize settings namespace. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { PERSONALIZE_SETTINGS_NAMESPACE, PersonalizeSettingsSchema } from './schema.ts'

export { PersonalizeSettingsSchema } from './schema.ts'
export { PERSONALIZE_SETTINGS_NAMESPACE } from './prefs.ts'

/**
 * Register the durable personalize section when the optional settings service
 * is composed, so the browser scope can persist the user's choices.
 * @param ctx - Host context that may acquire the settings service.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(PERSONALIZE_SETTINGS_NAMESPACE, PersonalizeSettingsSchema)
  })
}
