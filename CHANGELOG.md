# Changelog

## 1.0.0

A rework that moves design decisions out of the editor and into the theme. Not compatible with 0.x content; keep existing sites on 0.x.

### Added

- **Sections:** layout blocks declared in `block.json` (`supports.matter.slots`), with locked `matter/slot` content areas, a shared editor, a default renderer and `Matter\slots()` for custom `render.php`. Whole-block links (`supports.matter.link`), e.g. for cards, replace pulsar-extensions' group link.
  - Slots are matched by name, so they can be added, reordered or removed in `block.json`; a renamed slot lists its old names (`previously`). Content in a slot that's no longer declared isn't output, and the editor keeps it, marked, for the client to move or remove.
- **Colour schemes:** `supports.matter.scheme`, a swatch control, and CSS generated from the theme's `custom.scheme`.
- **Variants:** theme-defined block presets via `matter_variants`, shown as block styles.
- **Menus:** Appearance › Menus rendered by `Matter\menu()`.
  - Dropdown, accordion and drill-down types, switchable per breakpoint without JavaScript.
  - Megamenus built from menu structure, with optional theme panels.
- **Panels:** `Matter\panel()` / `panel_toggle()`, off-canvas below a breakpoint and inline above.
- **Archives:** content above and below post type, taxonomy, search and 404 lists, edited like pages (Appearance › Archives). `matter/archive-content` wraps a template's list; `matter/archive-loop` places it, with variants and a live preview. Terms use their taxonomy's entry, or a parent's or the post type's when that entry is set to cascade (off by default); the newest published entry wins, so new versions can be scheduled. The `matter/archive` bindings source gives the archive's title, description, count and image.
- **Site settings:** config-driven fields, a React settings page, `Matter\setting()` and the `matter/setting` bindings source.
- **Extensions:** button icon (`matterIcon` on `core/button`; icon registry, chosen from a core-style icon library; `matter_icon_collections`) and focal point (core's own `focalPoint` on image blocks, offered on every image, and featured images).
- Theme-owned breakpoints (`matter_breakpoints`).
- **Loop items:** `matter/loop-item` shows the theme's pattern for an item (`{namespace}/loop-item-{post_type}`, else `{namespace}/loop-item`; `matter_loop_item_pattern`) in every loop and carousel, previewed in the editor as on the front end. Carousels, accordions and tabs of posts can have their own (`loop-item-{post_type}-accordion`, `loop-item-accordion`…), in a template-hierarchy order.
- **Term loop items and terms carousels:** in a Terms Query's term template, `matter/loop-item` shows the theme's pattern for the term (`{namespace}/loop-item-term-{taxonomy}`, else `{namespace}/loop-item-term`; in a carousel the `-carousel` ones first; `matter_loop_item_term_pattern`) with the term's `termId` and `taxonomy` context, else a link to the term, previewed in the editor through `matter/v1/loop-items/terms`. A Terms Query can be shown as a carousel (`matterDisplay`), as "Terms carousel" in the inserter and the carousel's picker, and is allowed wherever `matter/carousel` is.
- **Theme contract:** the README lists what themes and saved content depend on, which changes only in a major version.
- **Theme template parts:** `matter/template-part` renders a PHP file from the theme's `template-parts/` folder in block templates (from Pulsar's `pulsar/template-part`). Its editor preview includes the styles the part enqueues, such as menus and panels.
- **Allowed blocks:** the theme's list (`matter_allowed_blocks`, with `namespace/*` wildcards) is enforced in the post editor.
- **Theme icons:** the theme's `assets/svg/icons/` SVGs are registered as an icon collection (`matter_theme_icons`).
- **Theme namespace:** `matter_theme_namespace` (and `Matter\theme_namespaces()`) names the prefix of the theme's loop item patterns and its icon collection, so they don't depend on the theme's folder name (default: the folder, then its parent's).
- **JavaScript API:** `matter.carousel()`, `matter.tabs()`, `matter.accordion()`, `matter.gallery()`, `matter.overlay()` and `matter.panel()` return instances with methods and read-only state; `matter.ready()` waits for a block; every block dispatches `matter-{block}-*` events. The block stores take a target (ID or element) too. A small stub in the page's head defines `window.matter` before any module loads.
- **Empty accordion items** (whose content renders nothing to show, e.g. a product's specifications when it has none) aren't output.
- **Stable IDs for links:** tabs and accordions get an anchor when added, and items in posts tabs and accordions are named after their post (`#{anchor}-post-{postId}`). Links to an item open it and anything it's nested in, also on `#hash` changes.
- **Tests:** PHPUnit (with contract markup snapshots), JavaScript unit tests and a Playwright and axe browser suite, run in CI against wp-env, and weekly against WordPress nightly and the latest WooCommerce.

### Changed

- **Accordion:** two blocks (accordion, item), with FAQ schema output inline. An accordion of posts is a Query Loop shown as one ("Posts accordion"), its content the theme's `loop-item-accordion` pattern (or a post type's own).
- **Tabs:** two blocks (tabs, tab). Tabs of posts are a Query Loop shown as tabs ("Posts tabs"). The tab list is built on the server. Horizontal or vertical, optional tab icons (chosen on the block toolbar), tabs removed with Backspace in an empty name or "Delete tab", and optionally a dropdown on smaller screens (showing tab icons), where the theme sets the breakpoint.
- **Carousel:** one block. Slides are its inner blocks, and behaviour comes from variants. A carousel of posts or products is the Query Loop or Product Collection itself (`matterDisplay`), shown as "Posts carousel" and "Products carousel" with the query's own filters.
- **Gallery:** grid or carousel layout, with a native `<dialog>` lightbox. Editors choose the columns (from the theme's choices) and an aspect ratio preset; the theme sets the image size. The grid can show the first N images, in whole rows at any width, with a "View all" button. Images are managed in the media library's gallery mode, as in core's Gallery. Captions show behind an info button, over the image or not at all (the theme sets the default), and in the lightbox. Embla is now bundled once.
- **Modal, drawer and collapsible:** single blocks with an optional trigger area and a content area, also opened by any link to `#id`. Modal and drawer use native `<dialog>` and can be made non-closable (e.g. an age gate). Per-post overlays in Query Loops, and grouped modals with previous/next, which keep the backdrop while switching. URL parameters open an overlay even after a dismissal. There's a new `matter/overlay` store. In the editor, the canvas shows only what the front end shows: closed overlays show just their trigger (if any), and an overlay opens as it does on the front end (theme styles, backdrop, transitions, group previous/next) while it's selected. An Overlays sidebar lists and adds modals and drawers, link search suggests overlays by name, and buttons that open one get "Edit modal" (or drawer, collapsible).
- **Dialog exits:** modals, drawers and gallery lightboxes animate out in every browser: a closing dialog stays open with `is-closing` until its transitions finish (CSS alone could only animate the exit where `overlay` can be transitioned, i.e. Chromium).
- **Shared focus trap:** focus-trap is one script module (`matter/focus-trap`) shared by menus and panels, so it loads once and their traps share a stack.
- **CSS:** functional rules at one class (context in `:where()`) plus a minimal default skin entirely in `:where()`, motion and icons included, so one theme class overrides any of it wherever the theme's stylesheet loads (see the README's CSS conventions). Selectors are written out in full, with nesting only for the same element, enforced by stylelint. No custom-property fallback chains and no inline styles from attributes. Block variables are named `--{block}-{setting}` (e.g. `--gallery-gap`, `--carousel-per-view`); colour schemes set 11 roles (`background`, `background-surface`, `background-fill`, `text`, `text-subtle`, `text-heading`, `text-link`, `text-fill`, `border`, `border-strong`, `highlight`) as `--scheme--{role}`.
- **Direction:** one stylesheet per component, with logical properties and `:dir(rtl)`, instead of flipped `-rtl.css` copies, so right-to-left content works on any site. Drawer and panel sides are `start` and `end` (drawer `position`, `.is-position-start`; panel `position`, `.is-from-start`), not left and right.
- **Carousel settings:** `--carousel-per-view` and `--carousel-gap` set slide widths and gaps.
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

### Visual changes

Changes to the default skin (in `:where()`). From 1.0 the skin changes only in a major version, or to fix a bug or an accessibility failure; see the theme contract in the README.

- The skin is minimal: no radii (modal, dropdown, tooltip, caption and carousel buttons), shadows, font weights (toggles, tabs, labels), decorative borders (accordion items, the tab list, drill-down rows and header, carousel arrows) or opacity effects (thumbnails, menu descriptions).
- Dropdown submenus and the tabs dropdown have a border instead of a shadow; the selected tab is underlined (both orientations) instead of a border on its side.
- Surfaces fall back to the system colours `Canvas` and `CanvasText` without a scheme, and tints (progress and timer tracks, borders) are mixed from the text colour, so they show on dark schemes.
- Icons, dots, progress bars and the panel toggle's bars stay visible in forced colours.
- Carousel dots are sized in `rem` (0.625rem) and spaced with their centres 24px apart; menu toggles, back buttons and links, and overlay close buttons, are at least 24px, for WCAG 2.5.8's target size.
- Reduced motion also stops the transition between grouped modals.
