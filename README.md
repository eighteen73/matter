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

## Installing

Matter is a must-use plugin, so it's always active and themes can rely on it without checking. Its Composer package type is `wordpress-muplugin`, which Bedrock-style installers put in `web/app/mu-plugins/matter/`:

```bash
composer require eighteen73/matter:^1.0
```

A must-use plugin in a subfolder needs a loader; Nebula's autoloader (`nebula-autoloader.php`) loads it.

### Upgrading from 0.x

1.0 is not compatible with 0.x content: blocks were merged, renamed or removed. Keep existing sites on 0.x (`"eighteen73/matter": "^0.7"` does not resolve to 1.0).

## Blocks

| Block | Purpose | Editor options |
| --- | --- | --- |
| `matter/accordion` › `matter/accordion-item` | Expandable items written in the editor. An accordion of posts is a Query Loop shown as one ("Posts accordion", see [Posts as carousels, accordions or tabs](#posts-as-carousels-accordions-or-tabs)). | Heading level, one open at a time, open first, FAQ schema (JSON-LD). Item: open by default. |
| `matter/tabs` › `matter/tab` | Tabbed content written in the editor. Tabs of posts are a Query Loop shown as tabs ("Posts tabs"). | Name, link to tabs (updates the URL hash), horizontal/vertical, show as a dropdown on smaller screens (a button showing the current tab's icon and name opens the tab list; the theme sets where, see Variants). Tab: icon, chosen from the icon library on the block toolbar. Backspace in an empty tab name, or "Delete tab" in the block's options menu, removes a tab. |
| `matter/carousel` | Each inner block is a slide. A carousel of posts or products is a Query Loop or Product Collection shown as one ("Posts carousel", "Products carousel"). A new carousel asks what the slides will be: images (chosen in the media library), the theme's slide types (see below), posts or products. Live in the editor (arrows, dots and real slide widths; no dragging); "Add slide" adds an empty slide like the last. When every slide is an image, "Edit images" manages them in the media library's gallery mode instead. Both toolbar buttons also show on each slide's toolbar. Posts and products: see [Carousels of posts or products](#carousels-of-posts-or-products). | Name; aspect ratio when every slide is an image. Behaviour comes from the chosen variant. |
| `matter/gallery` | `core/image` blocks in a grid or carousel, with a lightbox. Every image is cropped to one aspect ratio and uses the variant's image size (`imageSize`), so images always match. "Edit images" opens the media library's gallery mode (add, remove, reorder), like core's Gallery; each image stays an editable `core/image`, and its toolbar keeps the "Edit images" button. | Layout (grid/carousel), columns (the theme's choices; fewer show where there's less room), images to show (in whole rows of the columns; at any width the grid shows full rows, and the rest open from "View all N images"), aspect ratio (theme.json presets, or the images' own), captions (behind an info button, over the image, or hidden; each image's own caption, else its media library caption, also shown in the lightbox), lightbox on/off, name. |
| `matter/modal` | An optional trigger area plus content shown in a dialog. | ID, name, can be closed, group, open automatically (load, scroll, URL parameter), stay closed for N days. |
| `matter/drawer` | An optional trigger area plus content that slides in from the left or right. | ID, name, can be closed, open automatically, side. |
| `matter/collapsible` | An optional trigger area plus content hidden in place until revealed. | ID. |
| `matter/gravity-form` | A Gravity Forms form. | Form, title, description, AJAX, tabindex, field values. |
| `matter/slot` | A named content area inside a section (added automatically). | None. |
| `matter/loop-item` | The theme's design for the current item in a loop (Query Loop, Product Collection, or a carousel's posts). Not in the inserter: templates and carousels add it. See [Loop items](#loop-items). | None. |
| `matter/template-part` | A PHP file from the theme's `template-parts/` folder, e.g. `<!-- wp:matter/template-part {"slug":"header"} /-->` in a block template. The slug is the file's path there without `.php`. The part gets its `slug` and the block's context (`postId`, `postType`, `queryId`) as `$args`; other attributes aren't passed, as anyone who can edit content could set them. Not in the inserter: developers place it in templates. The Site Editor previews the part with the stylesheets its render enqueues (e.g. a menu's or panel's), so it looks as on the front end. WooCommerce's mini-cart renders nothing in the editor. | Template part (files with a `Title:` header; filter with `matter_template_parts`). |

**Opening overlays.**
- The block's **trigger area** opens it: the first link or button inside (a button block without a link works), or the whole area when it has neither.
- Any link to `#id`, or element with `aria-controls="id"`, anywhere on the page also opens it. Matter adds `aria-controls`, `aria-expanded` and `aria-haspopup`.
- **Query Loops:** an overlay inside a post template gets one instance per post, with the ID `{id}-{postId}`. Modals in a Query Loop are grouped automatically.
- **Groups:** modals with the same group get previous/next buttons and an "n / N" position, cycling in page order.
- **URL parameters** open an overlay even after it was dismissed (they're asked for, e.g. a campaign link); dismissals stop the automatic opens on load and on scroll.
- **Moving between grouped modals** keeps the backdrop: the current modal goes at once and the next fades in from the side it comes from.
- **Can be closed** (modal, drawer): when off, there's no close button and Escape and backdrop clicks do nothing (e.g. an age gate). A link to its `#id` inside it closes it, and an automatic open stays dismissed for the configured number of days.

**In the editor**, the canvas shows what the front end shows.
- **Closed:** only the trigger area shows (when "Trigger on the page" is on). An overlay without a trigger takes no space.
- **Open:** an overlay opens while it, or anything in its content, is selected, and closes when the selection moves on (or its close button or backdrop is clicked). A modal or drawer opens as it does on the front end, with the same markup: the block is the `-host`, so its trigger area stays in the page, and the content sits in a dialog element (with the dialog's class and `open` attribute) shown as a popover in the top layer, so the theme's dialog styles, `::backdrop` and transitions all apply. Grouped modals show their previous/next buttons, which open the group's other modals. A collapsible opens in place, including while its trigger is selected.
- **Overlays sidebar** (top bar): lists the modals and drawers being edited, with their name (or first heading, or trigger text), `#id` and how they open automatically. Click one to open it, or add a modal or drawer (added at the end, where it sits doesn't matter). Collapsibles sit in the page, so aren't listed.
- **Linking:** link search suggests the page's overlays by name. A button or link to one gets **Edit modal** / **Edit drawer** / **Edit collapsible** on its toolbar, as does a block in a modal's or drawer's trigger area.

Scripting: `matter.overlay( id )` and the `matter/overlay` store; see [JavaScript API](#javascript-api).

Opt out of a block with `add_filter( 'matter_register_{slug}', '__return_false' )`.

## Loop items

Every loop shows the same design for a post type: the shop, a category, related products and a carousel of products all use one loop item, and changing it changes them all, including carousels already placed in content.

- The theme registers a pattern per post type, `{namespace}/loop-item-{post_type}` (e.g. `pulsar/loop-item-product`), and `{namespace}/loop-item` for any other post type. Give the patterns `Inserter: false` so they stay out of the Patterns panel.
- `{namespace}` is the theme's folder name (a child theme's, then its parent's), unless the theme names it, so renaming the folder doesn't break anything: `add_filter( 'matter_theme_namespace', fn() => 'pulsar' );`. It's also the theme's icon collection.
- **In a carousel, accordion or tabs of posts** ([below](#posts-as-carousels-accordions-or-tabs)) the block can have its own patterns, named after it. The first that exists is used, most specific first, like WordPress's template hierarchy (child theme first at each step):

  | In | Patterns, in order |
  | --- | --- |
  | A loop (no block) | `loop-item-{post_type}`, `loop-item` |
  | Carousel | `loop-item-{post_type}-carousel`, `loop-item-{post_type}`, `loop-item-carousel`, `loop-item` |
  | Accordion | `loop-item-{post_type}-accordion`, `loop-item-accordion`, else the item's excerpt |
  | Tabs | `loop-item-{post_type}-tabs`, `loop-item-tabs`, else the item's excerpt |

  A carousel's slides keep the post type's design before a general carousel one (a product carousel shows prices). An accordion's or tabs' don't fall back to the post type's design: the post's title is already the heading or tab, so their patterns are just what's under it (e.g. an FAQ post type's `loop-item-faq-accordion.php` shows the whole answer).
- The block comes from the query the loop item is in, not from the content, so a new pattern applies to blocks already placed. Override the choice with the `matter_loop_item_pattern` filter (`$slug`, `$post_type`, `$block`).
- A loop's post template contains just `<!-- wp:matter/loop-item /-->`. Matter renders the pattern with the item's block context and sets the global post, so post, product and term blocks inside it show that item.
- In the editor the loop item is a server-rendered preview of the real thing, and it can't be selected: clicks go to the loop or carousel around it. Items that load together (a carousel's or an archive's) share one request to `matter/v1/loop-items`, which renders only items the user can read. List View and the breadcrumb name it after the post type ("Product", "Post").
- Without a pattern, the block falls back to a link to the item.
- Differences between loops (e.g. no add-to-basket button in related products) belong in CSS on the loop, not in a second pattern.

The theme's pattern files are cached when `WP_DEVELOPMENT_MODE` isn't `theme`; clear the cache after adding a new loop item pattern (`wp eval 'wp_get_theme()->delete_pattern_cache();'`).

## Posts as carousels, accordions or tabs

A carousel, accordion or tabs of posts is the Query Loop itself (for carousels, also a Product Collection): one block, one row in List View, with WordPress's own query controls. A `matterDisplay` attribute makes the query that block: `type` (`carousel`, `accordion` or `tabs`), `style` (the block's variant), `scheme`, and the block's own settings (a carousel's `label`; an accordion's `headingLevel`, `autoclose`, `openFirst`, `faqSchema`; tabs' `label`, `orientation`, `deepLink`, `dropdown`).

- **Front end:** the query's output is rendered inside the block (`Blocks\QueryDisplay`), so its markup, script, styles (Matter's and the theme's) and colour scheme apply as for the block itself. The query's alignment moves to the block. Accordion and tabs items are the post template's `matter/accordion-item` or `matter/tab` (titled with the post's title) holding the theme's [loop item](#loop-items) for that block; the query counts as their accordion or tabs (`Blocks\Instances`), so open first, FAQ schema, the heading level and the tab list work as usual. The post template's list is marked `role="presentation"`.
- **Items:** fixed per type. A carousel's slides are the theme's [loop items](#loop-items). They can't be selected, edited or added to.
- **Editor:** the sidebar has the block's panel (**Carousel**, **Accordion** or **Tabs**: style, colour scheme and the block's own settings, the same controls as the block) above WordPress's or WooCommerce's controls, trimmed to suit:
  - Posts: "Posts carousel", "Posts accordion" and "Posts tabs" Query Loop variations (`namespace`: `matter/carousel-posts`, `matter/accordion-posts`, `matter/tabs-posts`), allowing post type, number of items, order, sticky posts, taxonomies, author, keyword and "exclude current".
  - Products (carousels only): a "Products carousel" Product Collection collection (`collection: matter/product-collection/carousel`, registered with WooCommerce's `__experimentalRegisterProductCollection`) hiding pagination, offset, "inherit from template" and filterable, with no "Choose collection". WooCommerce's Layout and Width settings can't be hidden that way, so the editor stylesheet hides them.
  - A carousel is a live carousel around the query. An accordion or tabs is the server's rendering, as on the front end (`POST matter/v1/query-display`, with the styles it enqueued), refreshed as its settings change; items open and tabs switch when clicked, and links don't navigate.
- **Inserting:** a carousel's picker offers posts and products, which replace the carousel block with the query. In the post editor the three posts variations and "Products carousel" replace the plain Query Loop and Product Collection (and WooCommerce's other collections) in the inserter; the Site Editor keeps those for templates.
- Wherever the theme allows `matter/carousel`, `matter/accordion` or `matter/tabs`, Matter also allows the query blocks they use, so they can be inserted, duplicated, pasted and moved. The theme's list doesn't name them.
- If Matter's handling ever stops, the live site shows the query as a normal list. Saving the page in the editor then drops `matterDisplay`, and it stays a list.

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
- `link`: the whole block can link somewhere, set from a link button on its toolbar (e.g. a card). On the front end its first heading becomes the link, stretched over the block, so the link is named by the heading; links and buttons inside stay clickable. Without a heading, a visually hidden "Read more" link is added (`matter_link_label` filter). The block gets `has-link` and the link `matter-link`, for hover and focus styles. Works with a custom `render.php` too.
- `slots`: per slot, `allowedBlocks`, `template`, `templateLock` and `previously` (old names, for a renamed slot).

**Updating sections.** Markup and CSS changes reach every instance immediately. Slots are matched by **name**, in the editor and on the front end, so make `render.php` cope with an empty slot, and:
- **Add or reorder** slots anywhere in `block.json`. Existing instances get a new slot (filled from its `template`) the next time they're edited.
- **Rename** a slot by listing its old name: `"image": { "previously": [ "media" ] }`. Content saved under the old name shows in the slot at once, and moves to the new name when the page is next edited and saved.
- **Remove** a slot and its content stops showing on the site. The editor keeps the content, marked as no longer shown, so the client can move it into another slot or remove it.

An unlocked slot is filled from its `template` when it's created; if the client empties it, it stays empty. A slot with `templateLock` keeps its template's blocks.

## Colour schemes

Define schemes in the theme's `theme.json`. Every scheme sets the same roles, usually from the palette (palette colours can themselves be `color-mix()` of other palette colours):

```json
"custom": {
	"scheme": {
		"default": {
			"background": "var:preset|color|base",
			"background-surface": "var:preset|color|base-subtle",
			"background-fill": "var:preset|color|brand-primary",
			"text": "var:preset|color|contrast",
			"text-subtle": "var:preset|color|contrast-subtle",
			"text-heading": "var:preset|color|contrast",
			"text-link": "var:preset|color|brand-primary",
			"text-fill": "var:preset|color|base",
			"border": "var:preset|color|border",
			"border-strong": "var:preset|color|border-strong",
			"highlight": "var:preset|color|brand-secondary"
		},
		"brand": { "background": "var:preset|color|brand-primary", "…": "…" }
	}
}
```

| Role | For |
|---|---|
| `background` | The section's background. |
| `background-surface` | Things that sit on it and need to stand apart: cards, inputs, accordion panels. |
| `background-fill` | Strong solid fills: buttons, badges, the active tab. |
| `text` | Body text. |
| `text-subtle` | Secondary text: dates, captions, help text. |
| `text-heading` | Headings. |
| `text-link` | Links. |
| `text-fill` | Text and icons on `background-fill`. |
| `border` | Dividers and card outlines. |
| `border-strong` | Input borders and anything that must be seen (3:1 contrast). |
| `highlight` | Small accents: eyebrows, icons, active indicators. |

Matter outputs:
- `:root` with the default scheme;
- `.has-scheme-{slug}` rules mapping each role to `--scheme--{role}` (e.g. `--scheme--text-heading`).

Matter's own default styles use only `--scheme--background`, `--scheme--text` and `--scheme--border`, each with a fallback, so Matter works on a theme without schemes.

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

Carousel options: `loop`, `align` (start/center/end), `slidesToScroll` (number or `auto`), `autoplay` (seconds per slide, 0 = off), `autoScroll` (a continuous scroll speed, e.g. `1` for a ticker of logos; 0 = off), `controls` and `thumbnailSize` (the thumbnails' image size, default `thumbnail`). Slide widths and gaps belong in theme CSS.

**Controls** are groups of parts by position: `before` the slides, over them on the `stage`, or `after` them. Matter renders each group as `.wp-block-matter-carousel__controls.is-{position}` with its parts in order, and wires up their behaviour and accessibility; the theme's CSS places the group and each part (`.wp-block-matter-carousel__{part}`).

```php
'controls' => [ 'after' => [ 'prev', 'dots', 'next' ] ],                     // Matter's default
'controls' => [ 'stage' => [ 'prev', 'next' ] ],                              // arrows over the slides
'controls' => [ 'after' => [ 'prev', 'next', 'progress', 'play' ] ],          // a progress bar between buttons
'controls' => [ 'stage' => [ 'prev', 'next', 'expand' ], 'after' => [ 'thumbnails' ] ], // gallery with thumbnails
'controls' => [],                                                             // none (e.g. a ticker)
```

| Part | What it is |
|---|---|
| `prev`, `next` | Arrow buttons; disabled at the ends unless the carousel loops. |
| `dots` | One button per scroll position. The current dot has `aria-current`; each dot has `data-distance` (from the current dot), for shrinking far dots. |
| `progress` | A track (`__progress`) and bar (`__progress-bar`) scaled by `--carousel-progress`: how far through the carousel. |
| `timer` | The same, filling over each slide's autoplay time: runs while the carousel has `.is-timing` and `.is-playing`, over `--carousel-autoplay`. |
| `counter` | "2 / 6": `__counter-current`, `__counter-separator`, `__counter-total`. |
| `play` | Pause/play. Carousels that move by themselves (autoplay, autoScroll) always have one; it's added after the other controls if not placed. |
| `thumbnails` | A strip of the slides' images (image slides and galleries only) that go to their slide; the current one has `aria-current`. Scrolls when it overflows. |
| `expand` | Gallery only: opens the lightbox at the current image. |

The stage group covers the slides (`position: absolute; inset: 0`) with clickable parts; by default arrows sit at the sides and other parts at the bottom. Controls hide when everything fits (no `.is-scrollable`).

State for theme CSS, on the carousel: `--carousel-progress` (0–1), `--carousel-autoplay`, and the classes `is-playing`, `is-start`, `is-end`, `is-scrollable` and `is-timing`. Slides get `is-selected` (at the current position) and `is-in-view`.

Carousel slide types: a new carousel offers images, posts and products (with WooCommerce). `matter_carousel_slides` adds the theme's own slide blocks, and sets the variant each type starts as. With slide types set, a carousel's slides are limited to them, images and queries. A slide block needs `matter/carousel` in its block.json `parent` if it has one.

```php
add_filter( 'matter_carousel_slides', fn() => [
	'pulsar/card' => [ 'label' => 'Cards', 'variant' => 'cards' ],
	'core/image'  => [ 'variant' => 'slides' ],
	'core/query'  => [ 'variant' => 'cards' ],
] );
```

Carousels of only images also take `aspectRatio`: the default crop, a slug from theme.json's `settings.dimensions.aspectRatios`, or `auto` for the images' own shape (default `auto`). Editors can choose another preset.

Gallery options: `imageSize` (a registered image size), `columns` (column counts editors can choose, default `[ 2, 3, 4 ]`; `[]` hides the control so theme CSS sets the columns), `defaultColumns` (default `3`) and `aspectRatio` (as above, default `square`). The grid shows the chosen columns where there's room and fewer where images would be narrower than `--gallery-min-width` (default `10rem`); `--gallery-gap` sets the gap. Images are cropped with `--image-aspect-ratio`. The gallery's carousel layout reads its `matter/gallery` variant's options (falling back to the carousel defaults).

Tabs options: `dropdownBelow`, the breakpoint below which tabs set to "Show as a dropdown on smaller screens" switch to the dropdown (default `md`). Set it to `false` to do the switch in theme CSS instead: below your breakpoint, `.wp-block-matter-tabs.has-dropdown` shows its `__toggle` button and turns `__nav > __list` into a menu, open when the block has `.is-menu-open`. `Eighteen73\Matter\Blocks\Tabs::dropdown_css( $scope, $media )` returns the rules Matter uses, to output for your own scope and media query.

## JavaScript API

Every interactive block can be driven from theme scripts. `matter.{block}( target )` returns a block's instance, where `target` is an element ID (usually the block's HTML anchor, set under Advanced) or an element; it resolves to that block, or the first one of its type inside it. Instances exist once a block has started, so wait with `matter.ready()`:

```js
matter.ready( 'faq' ).then( ( faq ) => faq.open( 0 ) );

const hero = matter.carousel( 'hero' );
hero?.goTo( 2 );

document.addEventListener( 'matter-tabs-change', ( event ) => {
	console.log( event.detail.id, event.detail.index );
} );
```

| Block | `matter.…( target )` | Methods | Read-only state | Events (`matter-…`) |
|---|---|---|---|---|
| Carousel | `carousel` | `goTo( index, instant )`, `goToSlide( slide, instant )`, `next( instant )`, `prev( instant )`, `play()`, `pause()`, `reInit( options )` | `index`, `count` (scroll positions), `slides`, `selectedSlides`, `progress`, `isPlaying`, `canPrev`, `canNext`, `embla` (the Embla instance) | `carousel-select` (`index`, `count`, `slides`), `carousel-settle`, `carousel-play`, `carousel-pause` |
| Tabs | `tabs` | `select( tab )` (index or panel ID), `next()`, `prev()` | `tabs` and `active` (`{ index, id, label }`) | `tabs-change` (`index`, `tabId`, `previous`) |
| Accordion | `accordion` | `open( item )`, `close( item )`, `toggle( item )` (index or item ID), `openAll()`, `closeAll()`, `isOpen( item )` | `items` (`{ index, id, title, isOpen }`) | `accordion-open`, `accordion-close` (`itemId`, `index`) |
| Gallery | `gallery` | `open( index )`, `close()`, `next()`, `prev()` (the lightbox) | `isOpen`, `index`, `count` | `gallery-open`, `gallery-change`, `gallery-close` (`index`) |
| Modal, drawer, collapsible | `overlay` | `open()`, `close()`, `toggle()`, `next()`, `previous()` | `id`, `isOpen` | `overlay-open`, `overlay-close` |
| Panel | `panel` | `open()`, `close()`, `toggle()` | `id`, `isOpen`, `isCollapsed` | `panel-open`, `panel-close` |

Every instance also has `element` and `id`, and every block dispatches `matter-{block}-ready` (with `detail.instance`) when it starts. Events bubble from the block, with `detail.id` (the block's ID, or `null`).

Scripts built with the Interactivity API can use the stores instead: `store( 'matter/carousel' ).actions.goTo( 'hero', 2 )`, and likewise `matter/tabs` (`select`, `next`, `prev`), `matter/accordion` (`open`, `close`, `toggle`, `openAll`, `closeAll`), `matter/gallery` (`open`, `close`, `next`, `prev`) and `matter/overlay` (`open`, `close`, `toggle`, `next`, `previous`, `closeAll`), each taking the target first.

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

**Megamenus.** On a top-level menu item in Appearance › Menus, tick "Display submenu as a megamenu" (and choose its width). Its second-level items become column headings (use `#` links) and third-level items the links under them. Matter lays out the columns; the theme styles them, e.g.:

```scss
// Column headings (second-level items) and their links.
.is-megamenu .is-column > .matter-menu__link {
	font-size: var(--wp--preset--font-size--sm);
	text-transform: uppercase;
}

.matter-menu__column-items {
	display: flex;
	flex-direction: column;
	gap: var(--wp--preset--spacing--xs);
}
```

A megamenu can also show a **panel** beside its columns: a PHP file in the theme's `template-parts/megamenu/` with a `Title:` header, chosen in the item's "Megamenu panel" list (`matter_megamenu_panels` filters the list). It receives the menu item as `$args['item']`, so it can use the item's description, and settings from Appearance › Options:

```php
<?php
/**
 * Megamenu panel: get in touch.
 *
 * Title: Get in touch
 */

use function Eighteen73\Matter\setting;

$item  = $args['item'] ?? null;
$phone = setting( 'contact.phone' );
?>
<div class="megamenu-panel has-scheme has-scheme-tint">
	<p class="megamenu-panel__title"><?php esc_html_e( 'Get in touch', 'theme' ); ?></p>
	<?php if ( $item instanceof WP_Post && $item->description ) : ?>
		<p><?php echo esc_html( $item->description ); ?></p>
	<?php endif; ?>
	<?php if ( $phone ) : ?>
		<a href="tel:<?php echo esc_attr( preg_replace( '/[^0-9+]/', '', $phone ) ); ?>"><?php echo esc_html( $phone ); ?></a>
	<?php endif; ?>
</div>
```

The panel sits in `.matter-menu__panel`; give it a width beside the columns, e.g. `@media (--lg) { .matter-menu__panel { flex: 0 0 18rem; } }`.

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

The theme declares fields, and Matter adds an **Options** page under Appearance. The page needs `edit_theme_options` (filter: `matter_settings_capability`).

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

Hooks:
- `matter_settings_page_title`: the page and menu title (default "Options").
- `matter_settings_parent`: the admin menu it sits under (default `themes.php`, Appearance; empty for a top-level item).
- `matter_settings_saved`: fires after saving.

## Archives

Marketing teams and clients can add content above and below an archive's list, and give an archive its own design, without the Site Editor. The database holds only content; the templates, and the list in them, stay in the theme.

**In a template**, wrap the list of posts or products in `matter/archive-content`:

```html
<!-- wp:matter/archive-content -->
	<!-- wp:query {"query":{"inherit":true}} --> … <!-- /wp:query -->
<!-- /wp:matter/archive-content -->
```

It renders the archive's **Archive** entry (post type `matter_archive`). Entries are edited like pages, with sections. Each one contains an "Archive list" block (`matter/archive-loop`) marking where the template's list goes. Editors can move this block but not remove it, and choose its variant, for example "Feature first". If it's removed anyway (by grouping it first), it can be added again from the inserter, which offers it only in entries and only once. In the editor it previews the real list for the archive. Without the block, the list goes at the end.

**Which entry shows.** An entry is for one archive (`_matter_archive_target`): a post type archive (`post_type:product`), all terms of a taxonomy (`taxonomy:product_cat`), one term (`term:product_cat:42`), `search` or `404`. Matter looks in this order:
1. the term's entry;
2. its parent terms' entries, if set to show on the categories inside them;
3. the taxonomy's entry;
4. the post type archive's entry (the blog's for categories, tags, author and date archives), if set to show on its category and tag pages;
5. the theme's default content.

Whether a term's or post type archive's entry also shows further down is the entry's choice ("Include subcategories", or for a post type "Include category and tag pages", in Shows on; `_matter_archive_cascade`), off by default: usually a category's content is about that category only. A taxonomy's entry is for each of its terms. Only published entries count, and a parent's or post type's newest entry decides: if it doesn't cascade, an older one that did doesn't either. Among several for one archive the newest wins, so a scheduled version takes over on its date and unpublishing it falls back.

**Default content.** Filter `matter_archive_default_content( $content, $target )` with block markup; it's also where a customised entry starts.

**Bindings.** `matter/archive` gives the archive's `title`, `description`, `count` and `image` (a term's `thumbnail_id`), so one layout serves every term:

```json
"metadata": { "bindings": { "content": { "source": "matter/archive", "args": { "key": "title" } } } }
```

A bound paragraph that comes out empty (a term without a description) isn't output.

**Where editors find it:**
- Appearance › Archives: every entry and what it shows on. "Customise an archive" (Add new) lists each archive, grouped by post type, with a status badge (Customised, Shared, Theme default, Draft, Scheduled), plus a picker for a single term; the Help tab explains the lookup order and scheduling.
- "Customise archive" / "Edit archive" in the admin bar on any archive, after the core edit link.
- An "Archive" row on term edit screens (where its content comes from, then Edit or Customise), and a link for the taxonomy's default below term lists.
- "Archive" under each post type with an archive, and under Posts.
- "New version" on an entry: a draft copy to schedule as its replacement.

Preview shows the entry, including unsaved changes, on its archive. The entry editor's "Shows on" panel changes which archive it's for.

## Allowed blocks

The theme lists the blocks content editors can add, and Matter enforces the list in the post editor. Templates are developer-owned and the Site Editor keeps every block. Entries ending in `/*` allow a whole namespace; an empty list leaves the editor unrestricted. A list set earlier by other code still applies (the two are intersected).

```php
add_filter( 'matter_allowed_blocks', fn( $blocks ) => [ ...$blocks, 'core/heading', 'core/paragraph', 'pulsar/*', 'matter/*' ] );
```

## Theme icons

The theme's SVGs in `assets/svg/icons/` (a child theme's override the parent's) are registered as an icon collection, so editors can choose them for button and tab icons. The collection is named after the theme's namespace (`matter_theme_namespace`, see [Loop items](#loop-items)); icon names are saved in content (`pulsar/arrow-right`), so a theme whose folder may change should name its namespace. The label, and the collection itself, can be set too:

```php
add_filter( 'matter_theme_icons', fn( $icons ) => [ ...$icons, 'label' => 'Theme icons' ] );
```

`directories` changes the folders.

## Core block extensions

- **Button icon.** An icon from the icon registry on `core/button` (attribute `matterIcon`), rendered as `.wp-block-button__icon` inside a `.has-icon` link. Chosen from a library modal like core's Icon block. Limit the collections offered (for button and tab icons) with `matter_icon_collections`.
- **Focal point.** On `core/image`, using core's own `focalPoint` attribute, and on featured images (post meta `_thumbnail_focal_point`). Outputs `object-position` for cropped images. Core offers its focal point only for images with a scale set; Matter offers it on every image (sections crop images in CSS) and hides its own control where core's shows.

Matter also hides from the inserter the core blocks it replaces (gallery, accordion and tabs) and `gravityforms/form`.

## CSS conventions

Themes restyle Matter with plain class selectors and never need `!important`.

**Specificity**
- Functional rules (layout, visibility, the things a theme shouldn't change) use one class per selector. One exception: modal and drawer margins use `:root dialog.wp-block-matter-modal` (and `-drawer`), to outrank core's layout margins on post content (`:root :where(.is-layout-*) > :last-child`, 0,2,0).
- The default skin (colours, spacing, borders, type) is wrapped in `:where()`, so it has zero specificity and any theme class beats it.
- No IDs, no `!important`, and no design values in inline styles.

**Class names**
- `.wp-block-matter-{block}` and `__{element}` for its parts.
- `.is-style-{variant}` for variants, `.has-{option}` for options (`.has-columns-3`, `.has-captions-overlay`), `.is-{state}` for states set by JavaScript or PHP (`.is-open`, `.is-collapsed`), `.has-scheme-{slug}` for schemes.

**CSS variables**
- Colours come from the scheme (`--scheme--{role}`) and other values from theme.json (`--wp--preset--…`, `--wp--custom--…`).
- A block's own variables are named `--{block}-{setting}`, with no `matter-` prefix and single hyphens, and exist only for:
  - **theme settings**: Matter only reads them, with a fallback (`var(--gallery-gap, 1rem)`), and never declares them, so a theme can set them on `:root` or on the block's class;
  - **runtime values**: set inline by JavaScript or PHP for one instance (submenu offsets, carousel progress, the crop a client picked).
- Private helpers a block computes for itself are `--_{block}-{name}` (`--_gallery-columns`). Themes don't set these.
- A value used once is written as a property, not a variable.

## CSS variables

### Menu

Theme settings can go anywhere, such as `:root`. Runtime values are set on `.matter-menu`'s submenus.

| Variable | Default | |
|---|---|---|
| `--menu-duration` | `0.3s` | Theme setting: open and close transitions. Reduced motion always wins. |
| `--menu-offset-x`, `--menu-offset-y` | `0` | Runtime, on dropdown submenus: nudges them inside the viewport. |
| `--menu-max-height` | `none` | Runtime, on dropdown submenus: the room below, so long menus scroll. |
| `--menu-max-width` | `100vw` | Runtime, on megamenus: the room available. |
| `--menu-megamenu-width` | `100vw` | Runtime, on full-width megamenus: the viewport's width. |

### Panel

Set anywhere, such as `:root`.

| Variable | Default | |
|---|---|---|
| `--panel-duration` | `0.3s` | Theme setting: off-canvas transitions. Reduced motion always wins. |

### Gallery

On `:root` or `.wp-block-matter-gallery` (or one of its variants).

| Variable | Default | |
|---|---|---|
| `--gallery-gap` | `1rem` | Theme setting: the grid's gap. |
| `--gallery-min-width` | `10rem` | Theme setting: images never get narrower; the grid drops columns instead. |
| `--gallery-caption-toggle-size` | `2.75rem` | Theme setting: the caption info button. |

### Carousel

On `.wp-block-matter-carousel`.

| Variable | Default | |
|---|---|---|
| `--carousel-progress` | `0` | Runtime: how far through the carousel (0–1). |
| `--carousel-autoplay` | `5000ms` | Runtime: each slide's autoplay time. |

### Modal

On the modal's dialog.

| Variable | Default | |
|---|---|---|
| `--modal-switch` | `1` | Runtime, while moving between grouped modals: `1` for next, `-1` for previous. |

### Images

Inline on galleries and image carousels, from the aspect ratio the client picks (the variant's ratio is the default). To change a crop for a variant, set `aspect-ratio` on its images with a class selector; there's no need to override the variable.

| Variable | Default | |
|---|---|---|
| `--image-aspect-ratio` | `auto` | Runtime: the crop. |
| `--image-object-fit` | `cover` | Runtime: `contain` when the ratio is `auto`. |

### Editor

The editor also sets `--button-icon` and `--image-focal-point` on blocks in the canvas, for its button icon and focal point previews.

## Breakpoints

Breakpoints are owned by the theme:

```php
add_filter( 'matter_breakpoints', fn() => [ 'sm' => '640px', 'md' => '768px', 'lg' => '1024px' ] );
```

`config/breakpoints.json` is the fallback.

## Theme contract

What a theme's files and saved content depend on. Each project's theme is its own copy and isn't updated with Matter, so these change only in a major version, with a changelog entry. When a change affects saved content, the release that makes it adds a `wp matter migrate` WP-CLI command (with `--dry-run`) to convert existing content. No such change has been made yet, so the command doesn't exist yet. Everything else (editor internals, PHP classes, JavaScript modules) can change in any release.

The contract's markup is checked by snapshot tests (`tests/php/__snapshots__`); a change to a snapshot is a contract change.

- **Block names and attributes** saved in templates and content: `matter/*` blocks, `matterDisplay` (`type`, `style`, `scheme` and the block's settings) on queries, the posts variations' `namespace` (`matter/carousel-posts`, `matter/accordion-posts`, `matter/tabs-posts`) and the products carousel's `collection: matter/product-collection/carousel`.
- **Theme files Matter looks for:** `template-parts/{slug}.php` (with `Title:` headers, and the block's context as `$args`), `template-parts/megamenu/*.php`, `assets/svg/icons/*.svg`, and the loop item patterns (`{namespace}/loop-item-{post_type}`, `{namespace}/loop-item`, and `-carousel`, `-accordion` and `-tabs` ones, in the order under [Loop items](#loop-items)).
- **Filters and functions** in this README (`matter_*`, and `menu()`, `panel()`, `panel_toggle()`, `setting()`, `slots()` and `theme_namespaces()` in the `Eighteen73\Matter` namespace), and the `matter/setting` and `matter/archive` bindings sources.
- **Markup theme CSS targets:** the block classes and BEM elements named in this README (e.g. `.wp-block-matter-carousel__viewport` and `__track`; in a posts or products carousel the slides are the items of the post or product template inside the track; in an accordion or tabs of posts the items are inside the post template's list), state classes (`is-*`, `has-*`), the `--scheme--*` roles and the variables under [CSS variables](#css-variables).
- **Icon names** (`{collection}/{icon}`), saved in content (a button's `matterIcon`, a tab's `icon`).

## Development

```bash
npm install
npm run start   # watch
npm run build   # production build
npm run lint:js && npm run lint:css && composer run lint
```

Lefthook runs the linters on commit. Pushing to `main` builds and tags a release (see `.github/workflows/release.yml`). See [CHANGELOG.md](CHANGELOG.md).
