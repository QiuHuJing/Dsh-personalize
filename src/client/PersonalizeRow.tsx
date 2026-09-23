/**
 * Appearance Studio row registered into the General section item slot: accent
 * swatches, backdrop chips, a custom-image picker with URL fallback, and the
 * blur / scrim / panel-transparency sliders. Every control writes through the
 * injected setter so the persisted preference stays the display source.
 */
import clsx from 'clsx'
import { useMemo, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ACCENTS, BACKDROPS, FONTS, SLIDERS, type PersonalizeSettings } from '../prefs.ts'
import type { PersonalizeKey } from './locales.ts'
import type { createPersonalizeStore } from './settings-store.ts'
import { importImageFile, writeLocalImage } from './image.ts'
import { FONT_LIST_LIMIT, enumerateSystemFonts, unquoteFamily, type SystemFont } from './system-fonts.ts'
import css from './PersonalizeRow.module.css'

/** Lifecycle of the installed-font picker: untouched, reading, listed, or blocked. */
type FontPickerStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'denied'

/** Injected business face: the preference writes (t rides the standard locale seat). */
export interface PersonalizeRowInjected {
  /** Persist one preference field. */
  setPref: (field: keyof PersonalizeSettings, value: string | number) => void
  /** Persist the marker selecting the browser-local image. */
  useLocalImage: () => void
  /** Drop the current image source. */
  clearImage: () => void
  /** Restore every preference to its default. */
  reset: () => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type PersonalizeRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createPersonalizeStore>>
  & PropsLocale<'settings.personalize'> & PersonalizeRowInjected

/**
 * Render the Appearance Studio row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function PersonalizeRow({
  t, useStore, setPref, useLocalImage, clearImage, reset,
}: PersonalizeRowComponentProps) {
  const settings = useStore(s => s.settings)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [fontStatus, setFontStatus] = useState<FontPickerStatus>('idle')
  const [fontList, setFontList] = useState<readonly SystemFont[]>([])
  const [fontQuery, setFontQuery] = useState('')

  /** Read one slider's value for display. */
  const valueOf = (field: 'blur' | 'dim' | 'glass'): number => settings[field]

  /** Families matching the picker's search box, capped for render cost. */
  const fontMatches = useMemo(() => {
    const needle = fontQuery.trim().toLowerCase()
    const found = needle === ''
      ? fontList
      : fontList.filter(font => unquoteFamily(font.family).toLowerCase().includes(needle))
    return found.slice(0, FONT_LIST_LIMIT)
  }, [fontList, fontQuery])

  /** Ask the browser for the installed families the first time the picker opens. */
  const loadSystemFonts = (): void => {
    if (fontStatus === 'loading') return
    setFontStatus('loading')
    void enumerateSystemFonts().then(result => {
      if (!result.ok) {
        setFontStatus(result.reason)
        return
      }
      setFontList(result.fonts)
      setFontStatus('ready')
    })
  }

  /** Open or close the picker, enumerating on the first open. */
  const togglePicker = (): void => {
    const next = !pickerOpen
    setPickerOpen(next)
    if (next && fontStatus === 'idle') loadSystemFonts()
  }

  /** Import one picked file and hand its bytes to the browser-local store. */
  const importFile = (file: File | undefined): void => {
    if (file === undefined) return
    void importImageFile(file).then(dataUrl => {
      if (writeLocalImage(dataUrl)) useLocalImage()
    }).catch(() => { /* undecodable file: leave the previous source untouched */ })
  }

  return (
    <div className={css.group}>
      <div className={css.title}>{t('title')}</div>

      <div className={css.line}>
        <span className={css.label}>{t('accent')}</span>
        <span className={css.swatches}>
          {ACCENTS.map(accent => (
            <button
              key={accent.id}
              type="button"
              title={accent.id}
              aria-label={accent.id}
              aria-pressed={settings.accentId === accent.id}
              className={clsx(css.swatch, settings.accentId === accent.id && css.selected)}
              style={{ background: accent.light }}
              onClick={() => { setPref('accentId', accent.id) }}
            />
          ))}
        </span>
      </div>

      <div className={css.line}>
        <span className={css.label}>{t('font')}</span>
        <span className={css.chips}>
          {FONTS.map(font => (
            <button
              key={font.id}
              type="button"
              aria-pressed={settings.fontId === font.id}
              className={clsx(css.fontChip, settings.fontId === font.id && css.selected)}
              style={font.stack === '' ? undefined : { fontFamily: font.stack }}
              onClick={() => { setPref('fontId', font.id) }}
            >
              {t(`font.${font.id}` as PersonalizeKey)}
            </button>
          ))}
        </span>
      </div>

      {settings.fontId === 'custom' && (
        <div className={css.line}>
          <span className={css.label} />
          <span className={css.column}>
            <span className={css.fileRow}>
              <input
                key={settings.fontCustom}
                type="text"
                className={css.textInput}
                placeholder={t('font.custom.placeholder')}
                defaultValue={settings.fontCustom}
                onBlur={event => { if (event.target.value !== settings.fontCustom) setPref('fontCustom', event.target.value) }}
                onKeyDown={event => {
                  if (event.key !== 'Enter') return
                  if (event.currentTarget.value !== settings.fontCustom) setPref('fontCustom', event.currentTarget.value)
                }}
              />
              <span className={css.pickerWrap}>
                <button
                  type="button"
                  className={css.button}
                  aria-expanded={pickerOpen}
                  onClick={() => { togglePicker() }}
                >
                  {t('font.browse')}
                </button>
                {pickerOpen && (
                  <span className={css.pickerPanel}>
                    {fontStatus === 'loading' && (
                      <span className={css.hint}>{t('font.browse.loading')}</span>
                    )}
                    {(fontStatus === 'unsupported' || fontStatus === 'denied') && (
                      <span className={css.hint}>
                        {t(fontStatus === 'unsupported' ? 'font.browse.unsupported' : 'font.browse.denied')}
                      </span>
                    )}
                    {fontStatus === 'ready' && (
                      <>
                        <input
                          type="text"
                          className={css.pickerSearch}
                          placeholder={t('font.browse.search')}
                          value={fontQuery}
                          onChange={event => { setFontQuery(event.target.value) }}
                        />
                        <span className={css.pickerList}>
                          {fontMatches.length === 0
                            ? <span className={css.hint}>{t('font.browse.empty')}</span>
                            : fontMatches.map(font => (
                              <button
                                key={font.family}
                                type="button"
                                className={clsx(css.pickerItem, font.family === settings.fontCustom && css.selected)}
                                style={{ fontFamily: font.family }}
                                onClick={() => {
                                  setPref('fontCustom', font.family)
                                  setPickerOpen(false)
                                }}
                              >
                                {unquoteFamily(font.family)}
                              </button>
                            ))}
                        </span>
                      </>
                    )}
                  </span>
                )}
              </span>
            </span>
            <span className={css.hint}>{t('font.hint')}</span>
          </span>
        </div>
      )}

      <div className={css.line}>
        <span className={css.label}>{t('background')}</span>
        <span className={css.chips}>
          {BACKDROPS.map(backdrop => (
            <button
              key={backdrop.id}
              type="button"
              aria-pressed={settings.backgroundId === backdrop.id}
              className={clsx(css.chip, settings.backgroundId === backdrop.id && css.selected)}
              style={backdrop.id === 'none' ? undefined : { backgroundImage: backdrop.light }}
              onClick={() => { setPref('backgroundId', backdrop.id) }}
            >
              {backdrop.id === 'none' ? t('background.none') : ''}
            </button>
          ))}
        </span>
      </div>

      <div className={css.line}>
        <span className={css.label}>{t('image.title')}</span>
        <span className={css.fileRow}>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className={css.hiddenFile}
            onChange={event => { importFile(event.target.files?.[0]) }}
          />
          <button type="button" className={css.button} onClick={() => { fileInput.current?.click() }}>
            {t('image.pick')}
          </button>
          <input
            key={settings.backgroundImage}
            type="text"
            className={css.textInput}
            placeholder={t('image.url')}
            defaultValue={settings.backgroundImage.startsWith('local:') ? '' : settings.backgroundImage}
            onBlur={event => { if (event.target.value !== settings.backgroundImage) setPref('backgroundImage', event.target.value) }}
            onKeyDown={event => {
              if (event.key !== 'Enter') return
              if (event.currentTarget.value !== settings.backgroundImage) setPref('backgroundImage', event.currentTarget.value)
            }}
          />
          <button type="button" className={css.button} onClick={() => { clearImage() }}>
            {t('image.clear')}
          </button>
        </span>
      </div>

      {SLIDERS.map(slider => (
        <div key={slider.field} className={css.line}>
          <span className={css.label}>{t(slider.labelKey)}</span>
          <span className={css.slider}>
            <input
              type="range"
              className={css.range}
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={valueOf(slider.field)}
              onChange={event => { setPref(slider.field, Number(event.target.value)) }}
            />
            <span className={css.value}>
              {valueOf(slider.field)}
              {slider.field === 'blur' ? t('unit.px') : t('unit.percent')}
            </span>
          </span>
        </div>
      ))}

      <div className={css.footer}>
        <span className={css.hint}>{t('image.hint')}</span>
        <button type="button" className={css.button} onClick={() => { reset() }}>
          {t('reset')}
        </button>
      </div>
    </div>
  )
}
