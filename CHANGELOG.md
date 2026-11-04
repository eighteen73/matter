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
- **Extensions:** button icon (icon registry) and focal point (image blocks and featured images).
- Theme-owned breakpoints (`matter_breakpoints`).

### Changed

- **Accordion:** two blocks (accordion, item), with FAQ schema output inline.
- **Tabs:** two blocks (tabs, tab). The tab list is built on the server. Horizontal or vertical, and optionally a dropdown (native select) below a breakpoint.
- **Carousel:** one block. Slides are its inner blocks or a query's items, and behaviour comes from variants.
- **Gallery:** grid or carousel style, with a native `<dialog>` lightbox. Embla is now bundled once.
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
