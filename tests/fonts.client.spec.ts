// @vitest-environment jsdom
/** Installed-font enumeration: family quoting, per-family collapse, and the two
 * ways a query can leave the picker without a list (unsupported, denied). */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enumerateSystemFonts, quoteFamily } from '../src/client/system-fonts.ts'

/** Point `navigator.fonts` at one query, restoring the bare navigator after. */
function withFonts(query: () => Promise<{ family: string, style: string }[]>): void {
  Reflect.defineProperty(navigator, 'fonts', { value: { query }, configurable: true, writable: true })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'fonts')
})

describe('installed font enumeration', () => {
  it('quotes multi-word families and leaves single words bare', () => {
    expect(quoteFamily('Consolas')).toBe('Consolas')
    expect(quoteFamily('Times New Roman')).toBe("'Times New Roman'")
    expect(quoteFamily("'Already Quoted'")).toBe("'Already Quoted'")
    // A name carrying an apostrophe wraps in double quotes instead.
    expect(quoteFamily("Bo'ld Face")).toBe('"Bo\'ld Face"')
    expect(quoteFamily('   ')).toBe('')
  })

  it('reports unsupported when the browser exposes no local-font query', async () => {
    const result = await enumerateSystemFonts()
    expect(result).toEqual({ ok: false, reason: 'unsupported' })
  })

  it('collapses repeated faces into one sorted entry per family', async () => {
    withFonts(() => Promise.resolve([
      { family: 'Times New Roman', style: 'Regular' },
      { family: 'Consolas', style: 'Regular' },
      { family: 'Consolas', style: 'Bold' },
      { family: '', style: 'Regular' },
    ]))
    const result = await enumerateSystemFonts()
    expect(result).toEqual({
      ok: true,
      fonts: [
        { family: 'Consolas', style: 'Regular' },
        { family: "'Times New Roman'", style: 'Regular' },
      ],
    })
  })

  it('reports denied when the query rejects', async () => {
    withFonts(vi.fn(() => Promise.reject(new Error('denied'))))
    const result = await enumerateSystemFonts()
    expect(result).toEqual({ ok: false, reason: 'denied' })
  })
})
