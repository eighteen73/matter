# Matter

Blocks, sections, menus and site settings for eighteen73 WordPress builds.

Matter 1.0 is the shared foundation for Pulsar 6 sites. Clients edit **content**; layout, components and styling are developer-owned and version controlled:

- **Sections**: developer-built layout blocks with named slots for core content blocks.
- **UI blocks**: accordion, tabs, carousel, gallery, modal, drawer, collapsible and Gravity Forms, each configured by theme-defined variants rather than per-instance design controls.
- **Colour schemes**: one visual control instead of colour pickers.
- **Menus and panels**: Appearance › Menus rendered with interactive dropdown, accordion and drill-down menus, and a responsive off-canvas panel.
- **Site settings**: a config-driven settings page for site-wide content.

Matter ships behaviour and functional CSS. Presentational defaults are wrapped in `:where()`, so the theme styles everything with plain class selectors.

## Requirements

- WordPress 7.1+
- PHP 8.3+

### Upgrading from 0.x

1.0 is not compatible with 0.x content: blocks were merged, renamed or removed. Keep existing sites on 0.x (`"eighteen73/matter": "^0.7"` does not resolve to 1.0).

## Blocks

| Block | Purpose | Editor options |
| --- | --- | --- |
| `matter/accordion` › `matter/accordion-item` | Expandable items. An "Accordion from posts" variation lists posts with a Query Loop. | Heading level, one open at a time, open first, FAQ schema (JSON-LD). Item: open by default. |
| `matter/tabs` › `matter/tab` | Tabbed content. A "Tabs from posts" variation is available. | Name, link to tabs (updates the URL hash), horizontal/vertical, show as a dropdown on smaller screens (a native select; the theme sets where, see Variants). Tab: icon, chosen from the icon library on the block toolbar. |
| `matter/carousel` | Each inner block is a slide, or the items of a Query Loop / Product Collection. Live in the editor (arrows, dots and real slide widths; no dragging); "Add slide" adds an empty slide like the last. When every slide is an image, "Edit images" manages them in the media library's gallery mode instead. Both toolbar buttons also show on each slide's toolbar. | Name. Behaviour comes from the chosen variant. |
| `matter/gallery` | `core/image` blocks in a grid or carousel, with a lightbox. The theme's variants set the image size (`imageSize`) and, in CSS, the crop ratio, so images always match. "Edit images" opens the media library's gallery mode (add, remove, reorder), like core's Gallery; each image stays an editable `core/image`, and its toolbar keeps the "Edit images" button. | Layout (grid/carousel), images to show (the rest open from "View all N images"), lightbox on/off, name. |
| `matter/modal` | An optional trigger area plus content shown in a dialog. | ID, name, can be closed, group, open automatically (load, scroll, URL parameter), stay closed for N days. |
| `matter/drawer` | An optional trigger area plus content that slides in from the left or right. | ID, name, can be closed, open automatically, side. |
| `matter/collapsible` | An optional trigger area plus content hidden in place until revealed. | ID. |
| `matter/gravity-form` | A Gravity Forms form. | Form, title, description, AJAX, tabindex, field values. |
| `matter/slot` | A named content area inside a section (added automatically). | None. |

**Opening overlays.**
- The block's **trigger area** opens it: the first link or button inside (a button block without a link works), or the whole area when it has neither.
- Any link to `#id`, or element with `aria-controls="id"`, anywhere on the page also opens it. Matter adds `aria-controls`, `aria-expanded` and `aria-haspopup`.
- **Query Loops:** an overlay inside a post template gets one instance per post, with the ID `{id}-{postId}`. Modals in a Query Loop are grouped automatically.
- **Groups:** modals with the same group get previous/next buttons and an "n / N" position, cycling in page order.
- **Can be closed** (modal, drawer): when off, there's no close button and Escape and backdrop clicks do nothing (e.g. an age gate). A link to its `#id` inside it closes it, and an automatic open stays dismissed for the configured number of days.

**In the editor**, the trigger area stays in the page. The content opens over the canvas (modal, drawer) or in place (collapsible) with the **Edit / Close** button, and opens automatically while anything in it is selected.

Store API (`matter/overlay`): `actions.open( id )`, `actions.close( id )`, `actions.toggle( id )`, `actions.next( id )`, `actions.previous( id )`, `actions.closeAll()`. Events: `matter-overlay-open` and `matter-overlay-close` (bubbling, `detail.id`).

Opt out of a block with `add_filter( 'matter_register_{slug}', '__return_false' )`.

## Sections

A section is a dynamic block whose `block.json` declares slots. Matter registers it in the editor, so it needs no `edit.js`:

```json
{
	"name": "pulsar/hero",
	"title": "Hero",
	"category": "sections",
	"supports": {
		"matter": {
			"scheme": true,
			"align": "full",
			"tagName": "section",
			"slots": {
				"content": {
					"allowedBlocks": [ "core/heading", "core/paragraph", "core/buttons" ],
					"template": [ [ "core/heading", { "level": 1 } ], [ "core/paragraph" ] ]
				},
				"media": {
					"allowedBlocks": [ "core/image" ],
					"template": [ [ "core/image" ] ],
					"templateLock": "contentOnly"
				}
			}
		}
	}
}
```

**Markup.** The editor and the default renderer produce the same markup, so one stylesheet serves both:

```html
<section class="wp-block-pulsar-hero is-section alignfull has-scheme has-scheme-…">
	<div class="wp-block-pulsar-hero__inner">
		<div class="wp-block-matter-slot wp-block-pulsar-hero__content">…</div>
		<div class="wp-block-matter-slot wp-block-pulsar-hero__media">…</div>
	</div>
</section>
```

**Custom `render.php`.** Use one only when the markup needs to differ (e.g. conditional slots), and keep the same classes:

```php
$slots = Eighteen73\Matter\slots( $content, $block );
?>
<section <?php echo get_block_wrapper_attributes(); ?>>
	<div class="wp-block-pulsar-hero__inner">
		<div class="wp-block-matter-slot wp-block-pulsar-hero__content"><?php echo $slots['content']; ?></div>
	</div>
</section>
```

**Supports options:**
- `scheme`: adds the colour scheme control.
- `align: "full"`: full-width band (`alignfull`).
- `tagName`: element for the default renderer.
- `slots`: per slot, `allowedBlocks`, `template` and `templateLock`.

**Updating sections.** Markup and CSS changes reach every instance immediately. Slot structure is locked, so a slot added to `block.json` appears in existing instances the next time they're edited. Matching is by position, so **append new slots**, and make `render.php` cope with an empty slot.

## Colour schemes

Define schemes in the theme's `theme.json`:

```json
"custom": {
	"scheme": {
		"default": { "background": "var:preset|color|base", "text": "var:preset|color|contrast", "button-background": "…" },
		"brand":   { "background": "var:preset|color|brand-primary", "text": "var:preset|color|base" }
	}
}
```

Matter outputs:
- `:root` with the default scheme;
- `.has-scheme-{slug}` rules mapping each token to `--scheme--{token}`.

Blocks declaring `supports.matter.scheme` get a swatch control in the Styles tab. Selecting the active scheme again inherits the surrounding scheme.

Filters: `matter_schemes`, `matter_default_scheme`, `matter_scheme_labels`.

## Variants

Variants are named presets that the theme defines. Editors pick one as a block style; it sets behaviour options, and the theme styles it via `.is-style-{slug}`.

```php
add_filter( 'matter_variants', fn( $variants ) => array_replace_recursive( $variants, [
	'matter/carousel' => [
		'cards'  => [ 'label' => 'Cards', 'slidesToScroll' => 'auto' ],
		'slides' => [ 'label' => 'Slideshow', 'loop' => true, 'autoplay' => 6, 'arrows' => false ],
	],
] ) );
```

Carousel options: `loop`, `align` (start/center/end), `slidesToScroll` (number or `auto`), `autoplay` (seconds, 0 = off), `arrows`, `dots`. Slide widths and gaps belong in theme CSS.

The gallery's carousel layout reads its `matter/gallery` variant's options (falling back to the carousel defaults).

Tabs options: `dropdownBelow`, the breakpoint below which tabs set to "Show as a dropdown on smaller screens" switch to the dropdown (default `md`). Set it to `false` to do the switch in theme CSS instead, by showing `.wp-block-matter-tabs__select` and hiding `.wp-block-matter-tabs__list` inside `.wp-block-matter-tabs.has-dropdown`.

## Menus

Menus come from Appearance › Menus:

```php
Eighteen73\Matter\menu( [
	'location' => 'primary',
	'type'     => [ 'drill-down', 'lg' => 'dropdown' ],
] );
```

**Arguments:**
- `location` or `menu`
- `type`: `dropdown`, `accordion` or `drill-down`, or a mobile-first breakpoint map. Each range gets that type's CSS through generated media queries, so the right layout shows before JavaScript loads.
- `opens_on`: `hover` or `click`
- `orientation`: `horizontal` or `vertical`
- `depth`
- `label`
- `class`
- `id`
- `view_all`: show the drill-down "View all" link

Also available: `get_menu()` returns the HTML rather than echoing it.

**Megamenus.** On a top-level menu item, tick "Display submenu as a megamenu". Second-level items become column headings and third-level items their links. Optionally attach a panel from the theme's `template-parts/megamenu/*.php` (files need a `Title:` header).

**Accessibility:**
- Arrow, Home and End keys move between items; Escape closes the innermost submenu.
- Drill-down panels trap focus.
- `aria-expanded` and `inert` are rendered on the server.

Filters: `matter_menu_args`, `matter_menu_back_text`, `matter_menu_view_all_text`, `matter_megamenu_panels`.

## Panels

A panel is off-canvas below a breakpoint and inline above it. It's usually the header navigation:

```php
Eighteen73\Matter\panel_toggle( 'site-nav', [ 'collapse_below' => 'lg' ] );
Eighteen73\Matter\panel( 'site-nav', function () {
	Eighteen73\Matter\menu( [ 'location' => 'primary', 'type' => [ 'drill-down', 'lg' => 'dropdown' ] ] );
}, [ 'collapse_below' => 'lg' ] );
```

- **Off-canvas:** a dialog with a focus trap, Escape to close, backdrop, scroll lock and a close button. It sits below the admin bar.
- **Inside a panel:** `.is-panel-only` and `.is-inline-only` show content in one mode only.
- **Events:** `matter-panel-open` and `matter-panel-close`.

## Site settings

The theme declares fields, and Matter adds a **Site Settings** page. The page needs `edit_theme_options` (filter: `matter_settings_capability`).

```php
add_filter( 'matter_settings_fields', fn() => [
	'contact' => [
		'title'  => 'Contact details',
		'fields' => [
			'phone' => [ 'type' => 'tel', 'label' => 'Phone' ],
		],
	],
] );
```

**Field types:**
- `text`, `textarea`, `email`, `url`, `tel`
- `number`, `toggle`
- `select` (with `options`)
- `media` (attachment ID)
- `repeater` (with `fields`)

**Reading values:**
- In PHP: `Eighteen73\Matter\setting( 'contact.phone' )`.
- In blocks: bind with the `matter/setting` source, `"args": { "key": "contact.phone" }`. Email and telephone values bound to a `url` attribute become `mailto:`/`tel:` links.

Hooks: `matter_settings_page_title`, `matter_settings_saved`.

## Core block extensions

- **Button icon.** An icon from the icon registry on `core/button`, rendered as `.wp-block-button__icon` inside a `.has-icon` link. Chosen from a library modal like core's Icon block. Limit the collections offered (for button and tab icons) with `matter_icon_collections`.
- **Focal point.** On `core/image` (block attribute) and featured images (post meta `_thumbnail_focal_point`). Outputs `object-position` for cropped images.

Matter also hides from the inserter the core blocks it replaces (gallery, accordion and tabs) and `gravityforms/form`.

## Breakpoints

Breakpoints are owned by the theme:

```php
add_filter( 'matter_breakpoints', fn() => [ 'sm' => '640px', 'md' => '768px', 'lg' => '1024px' ] );
```

`config/breakpoints.json` is the fallback.

## Development

```bash
npm install
npm run start   # watch
npm run build   # production build
npm run lint:js && npm run lint:css && composer run lint
```

Lefthook runs the linters on commit. Pushing to `main` builds and tags a release (see `.github/workflows/release.yml`). See [CHANGELOG.md](CHANGELOG.md).
