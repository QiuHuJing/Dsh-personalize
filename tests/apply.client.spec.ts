// @vitest-environment jsdom
/** ui-personalize apply wiring: preferences read from and written to the Host
 * settings scope, the General-section row registration, and the token override
 * layer a backdrop with panel transparency folds into the active theme.
 * jsdom is required: the typeface choice lands on root inline properties. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { TestRemote } from '@deepseek-ai/dsh-client-test-runtime'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply as settingsApply, inject as settingsInject } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ThemeSnapshot, ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import { apply, inject, SETTINGS_NS } from '../src/client/index.ts'
import { PersonalizeRow, type PersonalizeRowInjected } from '../src/client/PersonalizeRow.tsx'
import type { createPersonalizeStore } from '../src/client/settings-store.ts'
import { PERSONALIZE_SETTINGS_NAMESPACE } from '../src/prefs.ts'
import { PersonalizeSettingsSchema } from '../src/schema.ts'

const SLOT = 'settings.general.item'

/** Override-layer source identity the controller registers under. */
const SOURCE = '@deepseek-ai/dsh-client-ui-personalize'

/** A theme runtime stub publishing one light snapshot and recording layers. */
function themeStub() {
  const layers: Record<string, ThemeTokenOverrides> = {}
  const snapshot = {
    preference: 'system',
    fontSize: 14,
    active: { id: 'light', colorScheme: 'light', tokens: {} },
    themes: [{ id: 'light', colorScheme: 'light', tokens: {} }],
    revision: 0,
  } as unknown as ThemeSnapshot
  return {
    layers,
    getTheme: () => snapshot,
    overrideTokens: (source: string, tokens: ThemeTokenOverrides) => {
      layers[source] = tokens
      // Mirrors the runtime's re-registration semantics: a newer layer from the
      // same source retires the earlier disposer.
      return () => { if (layers[source] === tokens) delete layers[source] }
    },
  }
}

async function bench(isLoopback = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  const section: Record<string, unknown> = {}
  const namespace = () => ({
    ns: PERSONALIZE_SETTINGS_NAMESPACE,
    schema: PersonalizeSettingsSchema.toJSON(),
    value: { ...section },
    applies: 'live' as const,
    secrets: [],
    revision: 0,
  })
  const describe = vi.fn(() => Promise.resolve({
    ok: true as const,
    value: { writable: true, hasDocument: true, namespaces: [namespace()] },
  }))
  const mutate = vi.fn((_ns: string, ops: { path: string[]; value: unknown }[]) => {
    const op = ops[0]!
    section[op.path[0]!] = op.value
    return Promise.resolve({ ok: true as const, value: namespace() })
  })
  const events = new TestRemote(ctx, { settings: { describe, mutate } })
  events.$host = { home: undefined, isLoopback }
  await ctx.plugin({ inject: [...settingsInject], apply: settingsApply }).await()
  const theme = themeStub()
  ctx.provide('theme', theme)
  return { ctx, slots: ctx.get('slots') as SlotRegistry, theme, mutate, locale }
}

/** Stand in for the settings shell: declare the General item slot from root. */
function declareItems(slots: SlotRegistry): void {
  slots.register(
    { name: 'root', children: { [SLOT]: { kind: 'list', scope: 'root' } } } as never,
    () => null,
  )
}

/** Bake one row instance off the declared entry and hand it the inject factory. */
function faceOf(slots: SlotRegistry) {
  const entry = slots.entries(SLOT).find(item => item.component === PersonalizeRow)!
  const handle = entry.store as ReturnType<typeof createPersonalizeStore>
  const instance = handle.create()
  const face = (entry.inject as unknown as (a: typeof instance.actions) => PersonalizeRowInjected)(instance.actions)
  return { entry, instance, face }
}

describe('ui-personalize apply', () => {
  it('registers the Appearance Studio row into the General section', async () => {
    const b = await bench()
    declareItems(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()

    expect(b.locale.bind(SETTINGS_NS)('title')).toBe('界面个性化')
    expect(b.locale.bind(SETTINGS_NS)('glass')).toBe('内容透明度')
    b.locale.setLocale('en')
    expect(b.locale.bind(SETTINGS_NS)('title')).toBe('Appearance studio')

    const entry = b.slots.entries(SLOT).find(item => item.component === PersonalizeRow)!
    expect(entry.options).toMatchObject({ id: 'personalize', order: 12 })
    expect(entry.locale).toBe(SETTINGS_NS)
  })

  it('routes face writes to the Host settings scope and mirrors them back', async () => {
    const b = await bench()
    declareItems(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()

    const { face } = faceOf(b.slots)
    face.setPref('accentId', 'violet')
    face.setPref('glass', 80)

    await vi.waitFor(() => { expect(b.mutate).toHaveBeenCalledTimes(2) })
    const paths = b.mutate.mock.calls.map(call => call[1][0]!.path[0])
    expect(paths).toEqual(['accentId', 'glass'])
  })

  it('folds a backdrop plus transparency into the theme token layer', async () => {
    const b = await bench()
    declareItems(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()

    const { face } = faceOf(b.slots)
    // No backdrop yet: nothing overrides the base surfaces.
    expect(b.theme.layers[SOURCE]).toBeUndefined()

    face.setPref('backgroundId', 'aurora')
    const base = b.theme.layers[SOURCE]?.['--dsw-alias-bg-base']
    expect(base).toBeDefined()
    expect(base?.light).toBe('rgba(255, 255, 255, 0.6)')
    expect(base?.dark).toBe('rgba(21, 21, 23, 0.6)')

    // The default glass translator renders English copy too; raising it to the
    // maximum leaves only 10% of every surface opaque.
    face.setPref('glass', 90)
    expect(b.theme.layers[SOURCE]?.['--dsw-alias-bg-layer-1']?.light).toBe('rgba(255, 255, 255, 0.1)')

    face.setPref('accentId', 'rose')
    expect(b.theme.layers[SOURCE]?.['--dsw-alias-brand-primary']?.light).toBe('#d63c72')
  })

  it('points the UI face at the chosen stack through root properties', async () => {
    const b = await bench()
    declareItems(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()

    const { face } = faceOf(b.slots)
    const root = document.documentElement
    const faceOf_ = (name: string): string => root.style.getPropertyValue(name)

    // The default preset leaves the theme's own face alone.
    expect(faceOf_('--dsw-font-family')).toBe('')

    face.setPref('fontId', 'serif')
    expect(faceOf_('--dsw-font-family')).toContain('Georgia')
    expect(faceOf_('--ds-font-family-code')).toBe('')

    // Only the monospace preset drags the code face along.
    face.setPref('fontId', 'mono')
    expect(faceOf_('--ds-font-family-code')).toContain('JetBrains Mono')

    // A custom face keeps a system tail so an uninstalled name still renders.
    face.setPref('fontId', 'custom')
    face.setPref('fontCustom', 'LXGW WenKai')
    expect(faceOf_('--dsw-font-family')).toContain('LXGW WenKai')
    expect(faceOf_('--dsw-font-family')).toContain('-apple-system')

    // Declaration terminators cannot escape the property value.
    face.setPref('fontCustom', "Evil; color: red }")
    expect(faceOf_('--dsw-font-family')).not.toContain(';')
    expect(faceOf_('--dsw-font-family')).not.toContain('}')

    face.setPref('fontId', 'default')
    expect(faceOf_('--dsw-font-family')).toBe('')
    expect(faceOf_('--ds-font-family-code')).toBe('')
  })
})
