/**
 * Browser appearance personalization: persists the user's accent, backdrop,
 * and glass choices through the `ui-personalize` settings scope, applies them
 * through the theme override layer plus `--dsh-pz-*` root variables, and owns
 * its own General-section settings row (a feature owns its settings surface).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the theme runtime merge (ctx.theme).
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import {
  DEFAULT_PERSONALIZE_SETTINGS, LOCAL_IMAGE_MARKER, PERSONALIZE_SETTINGS_NAMESPACE,
  normalizePersonalizeSettings, type PersonalizeSettings,
} from '../prefs.ts'
import { createAppearance } from './backdrop.ts'
import { clearLocalImage } from './image.ts'
import { en, zh, type PersonalizeKey } from './locales.ts'
import { PersonalizeRow, type PersonalizeRowInjected } from './PersonalizeRow.tsx'
import { createPersonalizeStore } from './settings-store.ts'
import { installPersonalizeStyles } from './styles.ts'

export type { PersonalizeRowComponentProps, PersonalizeRowInjected } from './PersonalizeRow.tsx'
export type { PersonalizeRowState } from './settings-store.ts'
export type { PersonalizeKey } from './locales.ts'

/** Namespace owning this feature's settings-row copy. */
export const SETTINGS_NS = 'settings.personalize'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Appearance Studio row's copy. */
    'settings.personalize': PersonalizeKey
  }
}

/** Required services: settings transport plus slots, locale, and theme. */
export const inject = ['slots', 'locale', 'remote', 'settingsScope', 'theme']

/**
 * Client plugin body: wire the durable preferences to the appearance
 * controller and register the Appearance Studio row into the General
 * section's item slot.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  installPersonalizeStyles(ctx)
  const host: SettingsScope<PersonalizeSettings> = ctx.settingsScope.bind<PersonalizeSettings>({
    namespace: PERSONALIZE_SETTINGS_NAMESPACE,
  })
  const appearance = createAppearance(ctx, ctx.theme)
  const store = createPersonalizeStore()
  let bound: BoundActions<typeof store> | undefined
  let revision = 0
  let current: PersonalizeSettings = { ...DEFAULT_PERSONALIZE_SETTINGS }

  /**
   * Publish one preference set: mirror it into the row store and repaint.
   * @param settings - the preference set to publish.
   */
  const publish = (settings: PersonalizeSettings): void => {
    current = settings
    revision += 1
    bound?.sync(settings, revision)
    appearance.update(settings)
  }

  /**
   * Write one patch through the durable scope and echo it immediately.
   * @param patch - changed fields.
   */
  const persist = (patch: Partial<PersonalizeSettings>): void => {
    const next: PersonalizeSettings = { ...current, ...patch }
    publish(next)
    for (const [field, value] of Object.entries(patch)) void host.set(field, value)
  }

  const adopt = (): void => { publish(normalizePersonalizeSettings(host.getSnapshot().value)) }

  ctx.effect(() => host.subscribe(adopt), 'ui-personalize: settings adoption')
  adopt()
  // The base palette may reach the document after this plugin becomes active;
  // one post-paint resample picks up its real surface colors.
  ctx.effect(() => {
    if (typeof requestAnimationFrame === 'undefined') return () => { /* no frame loop: nothing to cancel */ }
    const handle = requestAnimationFrame(() => { appearance.update(current) })
    return () => { cancelAnimationFrame(handle) }
  }, 'ui-personalize: post-paint resample')

  ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), 'ui-personalize: dictionaries')

  const injected = (actions: BoundActions<typeof store>): PersonalizeRowInjected => {
    bound = actions
    // Re-sync so no value published before registration is lost.
    bound.sync(current, revision)
    return {
      setPref: (field, value) => { persist({ [field]: value } as Partial<PersonalizeSettings>) },
      useLocalImage: () => { persist({ backgroundImage: LOCAL_IMAGE_MARKER }) },
      clearImage: () => { clearLocalImage(); persist({ backgroundImage: '' }) },
      reset: () => { clearLocalImage(); persist({ ...DEFAULT_PERSONALIZE_SETTINGS }) },
    }
  }

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'personalize',
    order: 12,
    store,
    locale: SETTINGS_NS,
    inject: injected,
  }, PersonalizeRow))
}
