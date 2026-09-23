# @deepseek-ai/dsh-client-ui-personalize

English | [中文](README.md)

## Overview

`dsh-client-ui-personalize` adds an "Appearance studio" row to **Settings → General** covering accent color, typeface, the interface backdrop (preset gradients or a custom image), backdrop blur, scrim strength, and panel transparency. It does not fork the theme package: accent colors and frosted panels ride `ctx.theme`'s third-party override layer on top of the active theme, while the backdrop itself is painted by this package's own global stylesheet from `--dsh-pz-*` variables set on the root element and the typeface is written straight to `--dsw-font-family` on that same element.

## Contents

- [Using this package](#use-this-package)
- [Understanding the implementation](#understand-the-implementation)
- [Known limitations](#known-limitations)

-----

<a id="use-this-package"></a>
## Using this package

Everything lives in the single General-section row; all eight preference fields are written on change and survive restarts.

| Field | Effect |
|---|---|
| `accentId` | Accent color; overrides `--dsw-alias-brand-primary` and the sidebar active accent |
| `fontId` | Typeface (default / sans / serif / rounded / kai / mono / custom) |
| `fontCustom` | Face names used when `fontId` is `custom`, comma separated |
| `backgroundId` | Preset gradient backdrop (none / aurora / dusk / ocean / forest / nebula) |
| `backgroundImage` | Image source: empty, an `http(s)` URL, or `local:` (browser-local image) |
| `blur` | Backdrop blur, 0–24 px |
| `dim` | Scrim strength, 0–80% (white over the light palette, black over the dark one) |
| `glass` | Panel transparency, 0–90% (higher is more permeable; 0 keeps surfaces opaque) |

Each typeface chip renders its own name in that face, and picking "Custom" reveals an input row: the typed text is stripped of `; { } < >` and given a system fallback tail, so an uninstalled name still leaves the UI readable. The monospace preset also takes over the code face.

A locally picked image is recompressed in the browser (long edge down to 1920, JPEG 0.82) and kept in `localStorage`; the settings document only carries the `local:` marker so megabytes of image data never reach `settings.yaml`.

-----

<a id="understand-the-implementation"></a>
## Understanding the implementation

<details>
<summary>Implementation details — click to expand</summary>

The Node half does one thing: register the `ui-personalize` namespace and its schema when a settings service is composed. The browser half binds that namespace as a scope, subscribes to its replay, and forwards each preference change to the appearance controller.

The controller has three jobs:

1. **Theme override layer.** With a backdrop and `glass > 0`, it samples the opaque channels of five surface tokens from `getComputedStyle(document.body)`, recomputes their alpha as `1 - glass / 100`, and calls `ctx.theme.overrideTokens`. Sampling keeps only the RGB channels, so re-applying never compounds transparency; the palette that has never been active uses built-in approximations and self-corrects once it becomes active.
2. **Backdrop painting.** It writes `--dsh-pz-bg-image / -blur / -scale / -dim` on `<html>` together with `data-dsh-personalize`, and `backdrop.css` paints the image and scrim through two fixed-position pseudo elements; the image layer grows with the blur so edges never bleed.
3. **Typeface.** It writes `--dsw-font-family` on `<html>`, plus `--ds-font-family-code` for the monospace preset. This rides root inline properties rather than the override layer because a face has no light/dark split, and inline properties outrank the theme sheets — so the choice applies even with no backdrop active.

### Installed-font picker

Picking **Custom** reveals a "Pick installed" button: the browser enumerates the font families installed on this device (Chromium's Local Font Access API) and opens a searchable list where clicking a name applies it, quoted automatically and followed by the system tail.

When the browser lacks the API or the user refuses the permission, enumeration returns `unsupported` / `denied` and the row falls back to the manual field with the matching hint — never a picker that cannot open. Families are sorted by their unquoted name, one entry per family regardless of how many weights exist, and rendering stops at 300 rows so a system with hundreds of families cannot stall the settings page.

</details>

-----

<a id="known-limitations"></a>
## Known limitations

- **Local images live in browser storage only.** Switching browsers or clearing site data drops them; pick the image again to restore.
- **Panel transparency depends on `ctx.theme` override semantics.** A third-party theme rebinding the same surface tokens is covered by this plugin's layer, which registers later.
- **High transparency hurts text contrast.** This is the user's choice; above `glass` 80 body text becomes hard to read.
- **A custom face must already be installed on the device.** Chromium browsers can list what is installed (see the picker above); other browsers expose no enumeration at all, so there the name has to be typed and an unknown one silently falls back to the system stack.
- **The face only overrides `--dsw-font-family`.** Components that hard-code their own stack instead of referencing that variable will not follow the choice.
