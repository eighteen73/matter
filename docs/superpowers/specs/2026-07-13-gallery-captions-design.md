# Gallery captions (lightbox + grid/carousel affordance)

**Date:** 2026-07-13  
**Status:** Approved (conversation)

## Goals

1. Surface per-image `core/image` captions in the gallery without crowding grid/carousel layouts.
2. One gallery-level **Show captions** toggle (default on) controlling both lightbox and in-view affordances.
3. Lightbox: caption below the image ([lightGallery](https://www.lightgalleryjs.com/#lg=nature&slide=14)-like).
4. Grid + carousel main slides: corner info control + dark popover (click/tap).
5. Preserve sanitized caption HTML (links, emphasis, etc.).

## Decisions

| Topic | Choice |
|-------|--------|
| Caption source | Existing `core/image` caption field (no new per-image gallery UI) |
| Gallery toggle | Single `showCaptions` (default `true`) in main **Settings** panel |
| Lightbox placement | Below image, above thumbs (existing figure markup) |
| Grid / carousel | Top-right info control + dark floating popover |
| Open interaction | Click/tap toggle (not hover-open) |
| Icon visibility | Always visible when that image has a caption and captions are enabled |
| Carousel thumbs strip | No caption controls |
| Native figcaptions in gallery views | Hidden via CSS |
| Caption HTML | Sanitize with `wp_kses_post` in PHP; bind as HTML in lightbox/popover |
| Icon asset | `assets/svg/info.svg` (mask, matching other gallery icons) |

## Approach

Extend existing lightbox caption plumbing (`caption` in image metadata, `state.currentCaption`, `.matter-lightbox__caption`) rather than relocating markup.

Inject a caption affordance into gallery items via `Gallery::enhance_image_html` (or a sibling helper) when `showCaptions` is on and the image has caption content. Gate lightbox captions with the same flag (mirror `lightboxThumbnails`).

Popover open/close state lives in the **gallery** interactivity module (`view.js` / gallery store), not the shared lightbox overlay store. The lightbox store only gains a `showCaptions` gate and HTML caption binding.

## Attribute

| Attribute | Type | Default | Notes |
|-----------|------|---------|--------|
| `showCaptions` | boolean | `true` | Main Settings toggle; enables lightbox captions + grid/carousel affordance |

## Inspector

- **Settings** ToolsPanel: **Show captions** toggle (shown by default).
- Help: captions appear in the lightbox and via an info control on images that have one.
- `onDeselect` / reset restores `true`.
- Not placed in the Lightbox panel.

## Data flow

1. Captions remain on each `core/image` block attribute.
2. `Gallery::build_image_metadata` continues to include `caption`, sanitized with `wp_kses_post`.
3. `render.php` passes `showCaptions` into interactivity gallery state alongside existing lightbox flags.
4. Overlay figcaption shows when `showCaptions` is on and `currentCaption` is non-empty; bind HTML (not `data-wp-text`).
5. Enhanced item markup includes caption button + popover when enabled and caption is non-empty.

## Frontend behaviour

### Grid / carousel main slides

- Top-right info button; dark translucent squared background, light icon (lightbox control language).
- Click/tap toggles popover; `stopPropagation` so lightbox does not open from the control.
- Only one caption popover open per gallery at a time.
- Close on outside click and Escape (when a popover is open, Escape closes it first).
- No affordance on carousel thumbnail strip.
- Hide `.wp-block-image figcaption` / `.wp-element-caption` inside the gallery.

### Lightbox

- Same `showCaptions` gate.
- Caption below image; empty captions stay hidden.
- Sanitized HTML content.

### Accessibility

- Control has accessible name reflecting state (e.g. Show / Hide caption).
- `aria-expanded` on the control; popover association via `aria-controls` / appropriate role.

## Visual design

### Affordance

- Always visible when applicable; optional subtle opacity bump on hover/focus.
- Dark popover under the control: compact type, white text, short max-width.
- Short open/close motion; `prefers-reduced-motion` respected.
- Tokens: `--matter-gallery--caption-*`.

### Lightbox caption

- Centered, secondary size, readable spacing/max-width; link colour suitable on dark UI.
- Not a heavy full-width bar.
- Tokens: `--matter-lightbox--caption-*`.

## Files

- `src/blocks/gallery/block.json` — attribute
- `src/blocks/gallery/edit.js` — Settings toggle
- `src/blocks/gallery/render.php` — pass `showCaptions` into state
- `includes/classes/Blocks/Gallery.php` — sanitize caption; inject affordance; lightbox HTML binding
- `src/interactivity/lightbox-store.js` — `showCaptions` gate; HTML caption binding for overlay
- `src/blocks/gallery/view.js` — popover toggle / outside-click / Escape handling
- `src/blocks/gallery/style.scss` — hide native captions; affordance + popover + lightbox caption polish
- `assets/svg/info.svg` — info icon for mask

## Out of scope

- Separate toggles for lightbox vs grid captions
- Hover-to-open popovers
- Caption editing beyond `core/image`
- Caption controls on carousel thumb strip
- Image-to-image caption transition animation

## Acceptance

- `showCaptions` off: no info icons; no lightbox captions.
- `showCaptions` on: captioned images show info control; popover toggles on click without opening lightbox; lightbox shows below-image HTML captions.
- Uncaptioned images: no icon.
- Carousel thumbs: no icons.
- Opening a second popover closes the first.
- Reduced motion: popover motion effectively instant.
- Theme tokens can override caption control / lightbox caption appearance.
