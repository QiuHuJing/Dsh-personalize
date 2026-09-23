/**
 * Appearance Studio row store: a mirror of the persisted personalize
 * preferences. The settings subscription is the only writer; the row reads
 * through props.useStore.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import { DEFAULT_PERSONALIZE_SETTINGS, type PersonalizeSettings } from '../prefs.ts'

/** Store state mirrored from the persisted preferences. */
export interface PersonalizeRowState {
  /** Current preference set. */
  settings: PersonalizeSettings
  /** Monotonic write counter; -1 until first sync so the first landing applies. */
  revision: number
}

/** Declared action shape giving the exported factory a stable return type. */
type PersonalizeRowActions = {
  sync: (draft: PersonalizeRowState, settings: PersonalizeSettings, revision: number) => void
}

/**
 * Declares the Appearance Studio row state and write surface.
 * @returns the store handle.
 */
export function createPersonalizeStore(): EngineStoreHandle<PersonalizeRowState, PersonalizeRowActions> {
  return defineStore({
    init: (): PersonalizeRowState => ({ settings: { ...DEFAULT_PERSONALIZE_SETTINGS }, revision: -1 }),
    actions: {
      sync: (d, settings: PersonalizeSettings, revision: number) => {
        if (revision <= d.revision) return
        d.settings = settings
        d.revision = revision
      },
    },
  })
}
