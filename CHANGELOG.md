# Changelog

## 1.0.0

A rework that moves design decisions out of the editor and into the theme. Not compatible with 0.x content; keep existing sites on 0.x.

### Added

- **Sections:** layout blocks declared in `block.json` (`supports.matter.slots`), with locked `matter/slot` content areas, a shared editor, a default renderer and `Matter\slots()` for custom `render.php`.
- **Colour schemes:** `supports.matter.scheme`, a swatch control, and CSS generated from the theme's `custom.scheme`.
- **Variants:** theme-defined block presets via `matter_variants`, shown as block styles.
- **Menus:** Appearance › Menus rendered by `Matter\menu()`.
  - Dropdown, accordion and drill-down types, switchable per breakpoint without JavaScript.
  - Megamenus built from menu structure, with optional theme panels.
- **Panels:** `Matter\panel()` / `panel_toggle()`, off-canvas below a breakpoint and inline above.
- **Site settings:** config-driven fields, a React settings page, `Matter\setting()` and the `matter/setting` bindings source.
- **Extensions:** button icon (icon registry, chosen from a core-style icon library; `matter_icon_collections`) and focal point (image blocks and featured images).
- Theme-owned breakpoints (`matter_breakpoints`).
- **JavaScript API:** `matter.carousel()`, `matter.tabs()`, `matter.accordion()`, `matter.gallery()`, `matter.overlay()` and `matter.panel()` return instances with methods and read-only state; `matter.ready()` waits for a block; every block dispatches `matter-{block}-*` events. The block stores take a target too.

### Changed

- **Accordion:** two blocks (accordion, item), with FAQ schema output inline.
- **Tabs:** two blocks (tabs, tab). The tab list is built on the server. Horizontal or vertical, optional tab icons (chosen on the block toolbar), tabs removed with Backspace in an empty name or "Delete tab", and optionally a dropdown on smaller screens (showing tab icons), where the theme sets the breakpoint.
- **Carousel:** one block. Slides are its inner blocks or a query's items, and behaviour comes from variants. A new carousel asks what the slides will be (images, the theme's slide types via `matter_carousel_slides`, posts or products). Controls are laid out per variant (`controls`: groups of prev, next, dots, progress, timer, counter, play, thumbnails and expand, before, over or after the slides), with state as CSS variables and classes for theme styling; `autoScroll` makes a continuous ticker. A live Embla carousel in the editor (arrows, dots, real slide widths; selecting a slide scrolls to it) with "Add slide", or the media library's gallery mode when every slide is an image. These toolbar buttons also show while a slide is selected. Image carousels share an aspect ratio preset.
- **Gallery:** grid or carousel layout, with a native `<dialog>` lightbox. Editors choose the columns (from the theme's choices) and an aspect ratio preset; the theme sets the image size. The grid can show the first N images, in whole rows at any width, with a "View all" button. Images are managed in the media library's gallery mode, as in core's Gallery. Embla is now bundled once.
- **Modal, drawer and collapsible:** single blocks with an optional trigger area and a content area, also opened by any link to `#id`. Modal and drawer use native `<dialog>` and can be made non-closable (e.g. an age gate). Per-post overlays in Query Loops, and grouped modals with previous/next. Edit/Close in the editor. There's a new `matter/overlay` store.
- **CSS:** functional rules plus `:where()` defaults. No custom-property fallback chains and no inline styles from attributes.
- **Core blocks Matter replaces:** hidden with `supports.inserter` instead of rewriting the allowed-blocks list.
- **Requirements:** WordPress 7.1 and PHP 8.3.
- **Dependencies:** pinned; unused packages removed.

### Removed

- **Navigation:** `matter/navigation` and `matter/navigation-megamenu` blocks, and the megamenu template-part area (replaced by menus).
- **Carousel children:** `carousel-viewport`, `carousel-slide`, `carousel-thumbnails`, `carousel-dots`, `carousel-progress`, `carousel-previous-button`, `carousel-next-button`.
- **Accordion and tab children:** `accordion-heading`, `accordion-panel`, `tab-list`, `tab-button`, `tab-panels`, `tab-panel`.
- **Overlay pieces:** `modal-content`, `drawer-content`, `collapsible-content`, `trigger`, `trigger-hamburger`, `close`, `modal-navigation` (now built into the modal's group option).
- **Per-instance design controls:** colours, spacing, borders, breakpoints, backdrop and size settings.
- **Legacy shared code:** `config/block-styles.json` and the block styles engine, the old overlay and lightbox stores, and the ID/context helpers.
