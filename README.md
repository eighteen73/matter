# Matter

<p>
  <strong>Custom blocks and block editor enhancements from eighteen73.</strong>
</p>

Matter is our consolidated WordPress plugin for custom blocks and editor tooling. The focus is on practical, composable blocks built for real client work, with room to grow into a single home for all of our block editor enhancements over time.

## Block list

### [Carousel](/src/blocks/carousel/)

An [Embla](https://www.embla-carousel.com/) powered carousel with flexible inner blocks. Compose the carousel from a viewport, navigation controls, and optional thumbnails, then drop any blocks you like inside the slides.

#### Attributes

- emblaConfig
- advancedEmblaConfig
- advancedEmblaConfigMerge

#### Child blocks

##### [Viewport](/src/blocks/carousel-viewport/)

The slide area. Add your slide content here, typically groups or other layout blocks.

##### [Thumbnails](/src/blocks/carousel-thumbnails/)

Optional thumbnail navigation synced with the main carousel.

- syncWithCarousel
- activeThumbnailColor

##### [Dots](/src/blocks/carousel-dots/)

Pagination dots for jumping between slides.

- dotColor
- dotActiveColor

##### [Progress](/src/blocks/carousel-progress/)

A progress bar showing carousel position.

- indicateCurrentPosition
- barColor

##### [Previous Button](/src/blocks/carousel-previous-button/) / [Next Button](/src/blocks/carousel-next-button/)

Previous and next slide controls.

- iconColor

---

### [Tabs](/src/blocks/tabs/)

An accessible tabbed interface for organising detailed content. Supports deep linking, responsive collapse into an accordion-style layout, and query-driven tab panels.

#### Attributes

- activeTabIndex
- deepLinking
- deepLinkingUpdateHistory
- collapses
- collapsesOn
- isQueryMode
- stackOnMobile
- stackedBreakpoint

#### Child blocks

##### [Tab List](/src/blocks/tab-list/)

The row of tab buttons.

- tabBackgroundColor
- tabActiveColor

###### [Tab Button](/src/blocks/tab-button/)

An individual tab label. Supports optional media for richer tab designs.

- label
- mediaId
- mediaType
- posterId
- focalPoint

##### [Tab Panels](/src/blocks/tab-panels/)

The container for tab content. Can hold standard panels or a Query Loop for dynamic tabs.

- tabPanelActiveColor

###### [Tab Panel](/src/blocks/tab-panel/)

The content shown when a tab is active.

- label
- inQueryLoop

---

### [Collapsible](/src/blocks/collapsible/)

An interactive section that reveals content when triggered. Useful for toggles and inline expandable panels. Accepts a Trigger or Hamburger Trigger, plus Collapsible Content.

#### Attributes

- type (popover or inline)
- targetId

#### Child blocks

##### [Collapsible Content](/src/blocks/collapsible-content/)

The panel revealed by the trigger.

---

### [Modal](/src/blocks/modal/)

A modal dialog for displaying content without leaving the page. Supports automatic opening on load, after a delay, on scroll, or when URL parameters match. Accepts a Trigger or Hamburger Trigger, plus Modal Content.

#### Attributes

- targetId
- triggerOnLoad
- triggerDelay
- triggerOnScroll
- scrollSelector
- scrollThreshold
- urlTriggers
- dismissedDuration

#### Child blocks

##### [Modal Content](/src/blocks/modal-content/)

The dialog panel itself.

- backdropColor
- backdropOpacity
- backdropBlur
- width
- height

---

### [Drawer](/src/blocks/drawer/)

A slide-in panel for off-canvas content, ideal for sidebars, filters, and mobile navigation. Accepts a Trigger or Hamburger Trigger, plus Drawer Content.

#### Attributes

- targetId

#### Child blocks

##### [Drawer Content](/src/blocks/drawer-content/)

The sliding panel.

- backdropColor
- backdropOpacity
- backdropBlur
- position (left, right, top, bottom)
- width
- height
- layout

---

### [Trigger](/src/blocks/trigger/)

A button-based trigger for opening a Modal, Drawer, or Collapsible block. Wraps core Buttons so you can style the control however you like.

- targetId

Used inside Modal, Drawer, and Collapsible blocks, but can also be used standalone.

---

### [Hamburger Trigger](/src/blocks/trigger-hamburger/)

An animated hamburger icon trigger for opening a Modal, Drawer, or Collapsible block. Useful for mobile menus and overlay panels.

- label
- showLabel

Used inside Modal, Drawer, and Collapsible blocks.

---

### [Close](/src/blocks/close/)

A dismiss button for Modal Content and Drawer Content.

- label
- showLabel
- position
- positionOffset

Used inside Modal Content and Drawer Content blocks.

---

### [Navigation](/src/blocks/navigation/)

Select and render an existing WordPress Navigation menu as a simplified, read-only block. Choose from simple, accordion, or drill-down layouts for submenus.

#### Attributes

- ref
- type (simple, accordion, drill-down)
- submenuOpensOnClick
- showSubmenuLabel
- showSubmenuViewAll
- layout
- iconColor
- accentColor
- submenuTextColor
- submenuBackgroundColor
- submenuIconColor
- backTextColor
- backBackgroundColor
- backIconColor
- submenuDividerColor

## Filters

### Block registration

Individual blocks can be opted out of registration:

```php
add_filter( 'matter_register_carousel', '__return_false' );
```

Replace `carousel` with any block folder slug from `src/blocks/`. The filter receives `$should_register` and `$block_folder` as arguments.

```php
add_filter(
	'matter_register_navigation',
	function ( $should_register, $block_folder ) {
		// Conditionally disable on certain sites or post types.
		return $should_register;
	},
	10,
	2
);
```
