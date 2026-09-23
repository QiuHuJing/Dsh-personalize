/**
 * Backdrop layer, mounted for exactly the owning plugin lifetime. The sheet is
 * inert until the controller sets `--dsh-pz-*` variables on the root element
 * and turns the paint switch on.
 */
import type { Context } from '@deepseek-ai/cordis'
import backdrop from './backdrop.css?inline'

const PLUGIN_ID = '@deepseek-ai/dsh-client-ui-personalize'

/**
 * Mount the global backdrop sheet and the row's composed styles.
 * @param ctx - Owning plugin context.
 */
export function installPersonalizeStyles(ctx: Context): void {
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = PLUGIN_ID
    tag.dataset.pluginCss = `${PLUGIN_ID}/backdrop.css`
    tag.textContent = backdrop
    document.head.appendChild(tag)
    return () => { tag.remove() }
  }, 'ui-personalize: backdrop stylesheet')
}
