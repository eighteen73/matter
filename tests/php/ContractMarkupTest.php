<?php
/**
 * Markup in the theme contract: what theme CSS and scripts target.
 *
 * These snapshots are the contract. A change to one is a contract change:
 * update it on purpose (`UPDATE_SNAPSHOTS=1 npm run test:php`) and add a
 * changelog line.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Breakpoints;
use Eighteen73\Matter\Ids;
use Eighteen73\Matter\Supports\Link;
use Eighteen73\Matter\Supports\Scheme;

/**
 * Contract markup.
 */
class ContractMarkupTest extends TestCase {

	/**
	 * A section with the default renderer: wrapper, __inner, then each slot.
	 *
	 * @return void
	 */
	public function test_section_default_render(): void {
		$html = $this->render(
			'<!-- wp:matter-test/section {"scheme":"brand","anchor":"intro"} -->'
			. '<!-- wp:matter/slot {"name":"content"} --><!-- wp:heading --><h2 class="wp-block-heading">Hello</h2><!-- /wp:heading --><!-- /wp:matter/slot -->'
			. '<!-- wp:matter/slot {"name":"media"} --><!-- wp:paragraph --><p>Media</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->'
			. '<!-- /wp:matter-test/section -->'
		);

		$this->assertMatchesSnapshot( 'section-default', $html );
	}

	/**
	 * Accordion with items, open first and FAQ schema.
	 *
	 * @return void
	 */
	public function test_accordion(): void {
		$html = $this->render(
			'<!-- wp:matter/accordion {"anchor":"faq","openFirst":true,"faqSchema":true} -->'
			. '<!-- wp:matter/accordion-item {"title":"Question one"} --><!-- wp:paragraph --><p>Answer one</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->'
			. '<!-- wp:matter/accordion-item {"title":"Question two"} --><!-- wp:paragraph --><p>Answer two</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->'
			. '<!-- /wp:matter/accordion -->'
		);

		$this->assertMatchesSnapshot( 'accordion', $html );
	}

	/**
	 * Tabs: the tab list built from the tabs, then the panels.
	 *
	 * @return void
	 */
	public function test_tabs(): void {
		$html = $this->render(
			'<!-- wp:matter/tabs {"anchor":"specs","label":"Specifications","dropdown":true} -->'
			. '<!-- wp:matter/tab {"label":"Size"} --><!-- wp:paragraph --><p>Large</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->'
			. '<!-- wp:matter/tab {"label":"Colour"} --><!-- wp:paragraph --><p>Blue</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->'
			. '<!-- /wp:matter/tabs -->'
		);

		$this->assertMatchesSnapshot( 'tabs', $html );
	}

	/**
	 * Each tab button is named by its panel's ID plus `-tab` and controls that
	 * panel (the script's `aria-labelledby` for the panel is built from the same
	 * ID), so the pair can't drift apart.
	 *
	 * @return void
	 */
	public function test_tab_and_panel_ids_pair_up(): void {
		$html = $this->render(
			'<!-- wp:matter/tabs {"anchor":"pairs","label":"Pairs"} -->'
			. '<!-- wp:matter/tab {"label":"Size"} --><!-- wp:paragraph --><p>Large</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->'
			. '<!-- wp:matter/tab {"label":"Colour"} --><!-- wp:paragraph --><p>Blue</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->'
			. '<!-- /wp:matter/tabs -->'
		);

		preg_match_all( '/<button[^>]*role="tab"[^>]*id="([^"]+)-tab"[^>]*aria-controls="([^"]+)"/', $html, $tabs, PREG_SET_ORDER );

		$this->assertCount( 2, $tabs );

		foreach ( $tabs as $tab ) {
			$this->assertSame( $tab[1], $tab[2], 'the tab controls the panel it is named for' );
			$this->assertStringContainsString( 'id="' . $tab[1] . '"', $html, 'and that panel exists' );
			$this->assertStringContainsString( '"tabId":"' . $tab[1] . '"', $html, 'with the tab ID the script pairs them by' );
		}

		$this->assertNotSame( $tabs[0][1], $tabs[1][1] );
	}

	/**
	 * Carousel with the default variant, and a moving one (play button added).
	 *
	 * @return void
	 */
	public function test_carousel(): void {
		$slides = '<!-- wp:paragraph --><p>One</p><!-- /wp:paragraph --><!-- wp:paragraph --><p>Two</p><!-- /wp:paragraph -->';

		$this->assertMatchesSnapshot( 'carousel-default', $this->render( '<!-- wp:matter/carousel {"label":"Highlights"} -->' . $slides . '<!-- /wp:matter/carousel -->' ) );
		$this->assertMatchesSnapshot( 'carousel-autoplay', $this->render( '<!-- wp:matter/carousel {"className":"is-style-slides"} -->' . $slides . '<!-- /wp:matter/carousel -->' ) );
	}

	/**
	 * Modal, drawer and collapsible, with and without a trigger.
	 *
	 * @return void
	 */
	public function test_overlays(): void {
		$trigger = '<!-- wp:matter/slot {"name":"trigger"} --><!-- wp:paragraph --><p><a href="#">Open</a></p><!-- /wp:paragraph --><!-- /wp:matter/slot -->';
		$content = '<!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Inside</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->';

		$this->assertMatchesSnapshot( 'modal', $this->render( '<!-- wp:matter/modal {"overlayId":"offer","label":"Offer","group":"deals"} -->' . $trigger . $content . '<!-- /wp:matter/modal -->' ) );
		$this->assertMatchesSnapshot( 'modal-not-dismissible', $this->render( '<!-- wp:matter/modal {"overlayId":"age","dismissible":false} -->' . $content . '<!-- /wp:matter/modal -->' ) );
		$this->assertMatchesSnapshot( 'drawer', $this->render( '<!-- wp:matter/drawer {"overlayId":"filters","position":"start"} -->' . $trigger . $content . '<!-- /wp:matter/drawer -->' ) );
		$this->assertMatchesSnapshot( 'collapsible', $this->render( '<!-- wp:matter/collapsible {"overlayId":"more"} -->' . $trigger . $content . '<!-- /wp:matter/collapsible -->' ) );
	}

	/**
	 * A Query Loop shown as a carousel or an accordion is rendered inside that
	 * block, with the query's alignment moved to it.
	 *
	 * @return void
	 */
	public function test_query_display(): void {
		self::factory()->post->create_many( 2 );

		// As the editor saves them: a carousel's post template holds the loop
		// item; an accordion's holds an accordion item around it.
		$query = fn( string $display, string $item ) => '<!-- wp:query {"queryId":7,"query":{"perPage":2,"postType":"post","inherit":false},"align":"wide","matterDisplay":' . $display . '} -->'
			. '<div class="wp-block-query alignwide"><!-- wp:post-template -->' . $item . '<!-- /wp:post-template --></div>'
			. '<!-- /wp:query -->';

		$carousel = $this->render( $query( '{"type":"carousel","style":"slides","scheme":"brand"}', '<!-- wp:matter/loop-item /-->' ) );

		$this->assertMatchesRegularExpression( '/^<div class="([^"]*)"/', trim( $carousel ) );
		preg_match( '/^<div class="([^"]*)"/', trim( $carousel ), $match );

		foreach ( [ 'wp-block-matter-carousel', 'is-style-slides', 'alignwide', 'has-scheme-brand' ] as $class ) {
			$this->assertContains( $class, explode( ' ', $match[1] ), "The carousel wrapper has {$class}" );
		}

		$this->assertStringContainsString( 'wp-block-matter-carousel__track"><div class="wp-block-query', $carousel );
		$this->assertStringContainsString( 'wp-block-matter-loop-item', $carousel );

		$accordion = $this->render( $query( '{"type":"accordion","headingLevel":2}', '<!-- wp:matter/accordion-item --><!-- wp:matter/loop-item /--><!-- /wp:matter/accordion-item -->' ) );

		$this->assertStringContainsString( 'wp-block-matter-accordion', $accordion );
		$this->assertMatchesRegularExpression( '/<ul\b(?=[^>]*\brole="presentation")(?=[^>]*\bwp-block-post-template\b)[^>]*>/', $accordion );
		$this->assertSame( 2, substr_count( $accordion, '<h2 class="wp-block-matter-accordion-item__heading">' ) );
	}

	/**
	 * A Terms Query shown as a carousel: its term template's items are the
	 * slides, each the term's loop item. Terms are carousels only.
	 *
	 * @return void
	 */
	public function test_terms_query_display(): void {
		$terms = self::factory()->category->create_many( 2 );

		$query = fn( string $display ) => '<!-- wp:terms-query {"termQuery":{"perPage":10,"taxonomy":"category","order":"asc","orderBy":"name","include":[' . implode( ',', $terms ) . '],"hideEmpty":false,"showNested":false,"inherit":false},"align":"wide","matterDisplay":' . $display . '} -->'
			. '<div class="wp-block-terms-query alignwide"><!-- wp:term-template --><!-- wp:matter/loop-item /--><!-- /wp:term-template --></div>'
			. '<!-- /wp:terms-query -->';

		$carousel = $this->render( $query( '{"type":"carousel","style":"slides"}' ) );

		preg_match( '/^<div class="([^"]*)"/', trim( $carousel ), $match );

		foreach ( [ 'wp-block-matter-carousel', 'is-query', 'is-style-slides', 'alignwide' ] as $class ) {
			$this->assertContains( $class, explode( ' ', $match[1] ?? '' ), "The carousel wrapper has {$class}" );
		}

		$this->assertStringContainsString( 'wp-block-matter-carousel__track"><div class="wp-block-terms-query', $carousel );
		$this->assertMatchesRegularExpression( '/<ul class="[^"]*\bwp-block-term-template\b/', $carousel );
		$this->assertSame( 2, preg_match_all( '/<li class="wp-block-term [^"]*"><div class="wp-block-matter-loop-item">/', $carousel ) );

		$accordion = $this->render( $query( '{"type":"accordion"}' ) );

		$this->assertStringNotContainsString( 'wp-block-matter-accordion', $accordion );
		$this->assertStringStartsWith( '<div class="wp-block-terms-query', trim( $accordion ) );
	}

	/**
	 * Only items in a loop are titled after their post; a hand-written item
	 * on a page doesn't take the page's title.
	 *
	 * @return void
	 */
	public function test_item_title_fallback_only_in_loops(): void {
		$page = self::factory()->post->create(
			[
				'post_type'  => 'page',
				'post_title' => 'The page title',
			]
		);
		$post = self::factory()->post->create( [ 'post_title' => 'The post title' ] );

		// As post content renders: with the page as context.
		$item = parse_blocks( '<!-- wp:matter/accordion --><!-- wp:matter/accordion-item --><!-- wp:paragraph --><p>Answer</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item --><!-- /wp:matter/accordion -->' )[0];
		$html = ( new \WP_Block(
			$item,
			[
				'postId'   => $page,
				'postType' => 'page',
			]
		) )->render();

		$this->assertStringNotContainsString( 'The page title', $html );

		$loop = $this->render(
			'<!-- wp:query {"queryId":9,"query":{"perPage":1,"postType":"post","include":[' . $post . '],"inherit":false},"matterDisplay":{"type":"accordion"}} -->'
			. '<div class="wp-block-query"><!-- wp:post-template --><!-- wp:matter/accordion-item --><!-- wp:matter/loop-item /--><!-- /wp:matter/accordion-item --><!-- /wp:post-template --></div>'
			. '<!-- /wp:query -->'
		);

		$this->assertStringContainsString( '<span class="wp-block-matter-accordion-item__title">The post title</span>', $loop );
	}

	/**
	 * An item with nothing to show isn't output; one with only an image is.
	 *
	 * @return void
	 */
	public function test_empty_accordion_items_are_skipped(): void {
		$html = $this->render(
			'<!-- wp:matter/accordion -->'
			. '<!-- wp:matter/accordion-item {"title":"Empty"} --><!-- wp:group --><div class="wp-block-group"></div><!-- /wp:group --><!-- /wp:matter/accordion-item -->'
			. '<!-- wp:matter/accordion-item {"title":"Image"} --><!-- wp:html --><img src="x.png" alt=""><!-- /wp:html --><!-- /wp:matter/accordion-item -->'
			. '<!-- /wp:matter/accordion -->'
		);

		$this->assertStringNotContainsString( '>Empty<', $html );
		$this->assertStringContainsString( '>Image<', $html );
	}

	/**
	 * A tab with nothing to show isn't output, and the tab list leaves it out:
	 * the next tab takes its place.
	 *
	 * @return void
	 */
	public function test_empty_tabs_are_skipped(): void {
		$html = $this->render(
			'<!-- wp:matter/tabs {"anchor":"details"} -->'
			. '<!-- wp:matter/tab {"label":"Description"} --><!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->'
			. '<!-- wp:matter/tab {"label":"Empty"} --><!-- wp:group --><div class="wp-block-group"></div><!-- /wp:group --><!-- /wp:matter/tab -->'
			. '<!-- wp:matter/tab {"label":"Reviews"} --><!-- wp:paragraph --><p>More</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->'
			. '<!-- /wp:matter/tabs -->'
		);

		$this->assertStringNotContainsString( '>Empty<', $html );
		$this->assertSame( 2, substr_count( $html, 'role="tab"' ) );
		// The panels get their role from the script (see WithoutJavaScriptTest).
		$this->assertSame( 2, substr_count( $html, 'data-wp-bind--role="state.panelRole"' ) );
		$this->assertStringContainsString( 'id="details-2-tab" class="wp-block-matter-tabs__tab" aria-controls="details-2"', $html );
		$this->assertMatchesRegularExpression( '/id="details-2"[^>]*data-wp-bind--role[^>]*>.*More/s', $html );
	}

	/**
	 * Posts accordions and tabs take the query's anchor as their ID (once,
	 * not repeated on the query), and name each item after its post, so
	 * links to an item survive new posts.
	 *
	 * @return void
	 */
	public function test_query_display_ids(): void {
		[ $newer, $older ] = [ self::factory()->post->create( [ 'post_date' => '2026-02-01 00:00:00' ] ), self::factory()->post->create( [ 'post_date' => '2026-01-01 00:00:00' ] ) ];

		$query = fn( string $type, string $item ) => '<!-- wp:query {"queryId":8,"anchor":"news","query":{"perPage":2,"postType":"post","order":"desc","orderBy":"date","inherit":false},"matterDisplay":{"type":"' . $type . '"}} -->'
			. '<div class="wp-block-query"><!-- wp:post-template -->' . $item . '<!-- /wp:post-template --></div>'
			. '<!-- /wp:query -->';

		$accordion = $this->render( $query( 'accordion', '<!-- wp:matter/accordion-item {"open":true} --><!-- wp:matter/loop-item /--><!-- /wp:matter/accordion-item -->' ) );

		$this->assertSame( 1, substr_count( $accordion, 'id="news"' ) );
		$this->assertStringContainsString( "id=\"news-post-{$newer}\"", $accordion );
		$this->assertStringContainsString( "\"openItems\":[\"news-post-{$newer}\",\"news-post-{$older}\"]", str_replace( '&quot;', '"', $accordion ) );

		// The tabs are another page: the anchor is free again.
		\Eighteen73\Matter\Ids::reset();

		$tabs = $this->render( $query( 'tabs', '<!-- wp:matter/tab --><!-- wp:matter/loop-item /--><!-- /wp:matter/tab -->' ) );

		$this->assertSame( 1, substr_count( $tabs, 'id="news"' ) );
		$this->assertStringContainsString( "role=\"tab\" id=\"news-post-{$newer}-tab\"", $tabs );
		$this->assertStringContainsString( "aria-controls=\"news-post-{$older}\"", $tabs );
		$this->assertStringContainsString( "\"active\":\"news-post-{$newer}\"", str_replace( '&quot;', '"', $tabs ) );
	}

	/**
	 * The ID Matter gives a block when it's added (`matterId`, kept out of the
	 * HTML anchor) is its ID on the site; an anchor the client sets wins.
	 *
	 * @return void
	 */
	public function test_matter_id(): void {
		$tabs = fn( string $attrs ) => $this->render( '<!-- wp:matter/tabs ' . $attrs . ' --><!-- wp:matter/tab {"label":"One"} --><!-- wp:paragraph --><p>One</p><!-- /wp:paragraph --><!-- /wp:matter/tab --><!-- /wp:matter/tabs -->' );

		$this->assertStringContainsString( 'id="tabs-x7k2p-1-tab"', $tabs( '{"matterId":"tabs-x7k2p"}' ) );
		$this->assertStringContainsString( 'id="specs-1-tab"', $tabs( '{"matterId":"tabs-x7k2p","anchor":"specs"}' ) );

		$post  = self::factory()->post->create();
		$query = $this->render(
			'<!-- wp:query {"queryId":9,"matterId":"accordion-a1b2c","query":{"perPage":1,"postType":"post","inherit":false},"matterDisplay":{"type":"accordion"}} -->'
			. '<div class="wp-block-query"><!-- wp:post-template --><!-- wp:matter/accordion-item --><!-- wp:matter/loop-item /--><!-- /wp:matter/accordion-item --><!-- /wp:post-template --></div>'
			. '<!-- /wp:query -->'
		);

		$this->assertSame( 1, substr_count( $query, 'id="accordion-a1b2c"' ) );
		$this->assertStringContainsString( "id=\"accordion-a1b2c-post-{$post}\"", $query );
	}

	/**
	 * A menu with a parent that has a child, and a leaf. A fixed name, so the
	 * menu's IDs are the same on every run.
	 *
	 * @return int Menu ID.
	 */
	private function menu(): int {
		$menu   = wp_create_nav_menu( 'Snapshot menu' );
		$item   = fn( string $title, string $url, int $parent = 0 ) => wp_update_nav_menu_item(
			$menu,
			0,
			[
				'menu-item-title'     => $title,
				'menu-item-url'       => $url,
				'menu-item-parent-id' => $parent,
				'menu-item-status'    => 'publish',
			]
		);
		$parent = $item( 'Services', 'https://example.com/services/' );

		$item( 'Design', 'https://example.com/services/design/', $parent );
		$item( 'Contact', 'https://example.com/contact/' );

		return $menu;
	}

	/**
	 * Each menu type: the nav's classes and directives, the items, and each
	 * submenu's toggle and header.
	 *
	 * @return void
	 */
	public function test_menu_types(): void {
		$menu = $this->menu();

		foreach ( [ 'dropdown', 'accordion', 'drill-down' ] as $type ) {
			Ids::reset();

			$this->assertMatchesSnapshot(
				'menu-' . $type,
				\Eighteen73\Matter\get_menu(
					[
						'menu'  => $menu,
						'type'  => $type,
						'label' => 'Main',
					]
				)
			);
		}
	}

	/**
	 * A menu whose type changes with the screen: the responsive classes and
	 * the types and queries in its context.
	 *
	 * @return void
	 */
	public function test_responsive_menu(): void {
		add_filter(
			'matter_breakpoints',
			fn() => [
				'md' => '768px',
				'lg' => '1024px',
			]
		);

		$this->assertMatchesSnapshot(
			'menu-responsive',
			\Eighteen73\Matter\get_menu(
				[
					'menu'     => $this->menu(),
					'type'     => [
						'drill-down',
						'lg' => 'dropdown',
					],
					'opens_on' => 'click',
					'label'    => 'Main',
				]
			)
		);
	}

	/**
	 * The responsive panel, and the button that opens it.
	 *
	 * @return void
	 */
	public function test_panel_and_toggle(): void {
		add_filter( 'matter_breakpoints', fn() => [ 'lg' => '1024px' ] );

		$toggle = \Eighteen73\Matter\get_panel_toggle( 'site-nav', [ 'collapse_below' => 'lg' ] );
		$panel  = \Eighteen73\Matter\get_panel( 'site-nav', '<p>Inside</p>', [ 'collapse_below' => 'lg' ] );

		$this->assertMatchesSnapshot( 'panel-toggle', $toggle );
		$this->assertMatchesSnapshot( 'panel', $panel );

		// A toggle with a visible label and no icon, and a panel that is always
		// off-canvas from the top.
		Ids::reset();

		$this->assertMatchesSnapshot(
			'panel-toggle-labelled',
			\Eighteen73\Matter\get_panel_toggle(
				'filters',
				[
					'label'      => 'Filters',
					'show_label' => true,
					'hamburger'  => false,
					'class'      => 'is-small',
					'content'    => '<span>3</span>',
				]
			)
		);
		$this->assertMatchesSnapshot( 'panel-always', \Eighteen73\Matter\get_panel( 'filters', '<p>Inside</p>', [ 'position' => 'top' ] ) );
	}

	/**
	 * Gallery images, as the editor saves them: not in the media library, so
	 * the markup doesn't depend on attachment IDs.
	 *
	 * @return string
	 */
	private function gallery_images(): string {
		$image = fn( string $name, string $caption = '' ) => '<!-- wp:image --><figure class="wp-block-image"><img src="https://example.com/' . $name . '.jpg" alt="Image ' . $name . '"/>'
			. ( $caption ? '<figcaption class="wp-element-caption">' . $caption . '</figcaption>' : '' ) . '</figure><!-- /wp:image -->';

		return $image( 'one', 'First' ) . $image( 'two' ) . $image( 'three' );
	}

	/**
	 * The gallery's grid with its lightbox, and without one.
	 *
	 * @return void
	 */
	public function test_gallery_grid_and_lightbox(): void {
		$this->assertMatchesSnapshot(
			'gallery-grid',
			$this->render( '<!-- wp:matter/gallery {"limit":2,"columns":3,"label":"Our work"} -->' . $this->gallery_images() . '<!-- /wp:matter/gallery -->' )
		);
		$this->assertMatchesSnapshot(
			'gallery-grid-without-lightbox',
			$this->render( '<!-- wp:matter/gallery {"lightbox":false,"captions":"overlay"} -->' . $this->gallery_images() . '<!-- /wp:matter/gallery -->' )
		);
	}

	/**
	 * The gallery in its carousel layout.
	 *
	 * @return void
	 */
	public function test_gallery_carousel(): void {
		$this->assertMatchesSnapshot(
			'gallery-carousel',
			$this->render( '<!-- wp:matter/gallery {"layout":"carousel","label":"Our work"} -->' . $this->gallery_images() . '<!-- /wp:matter/gallery -->' )
		);
	}

	/**
	 * The scheme CSS the theme's schemes generate.
	 *
	 * @return void
	 */
	public function test_scheme_css(): void {
		$this->assertMatchesSnapshot( 'scheme-css', Scheme::instance()->get_css(), 'css' );
	}

	/**
	 * A block with a whole-block link: with a heading (the heading is the
	 * link), without one (a hidden link), and in a new tab.
	 *
	 * @return void
	 */
	public function test_block_link(): void {
		register_block_type(
			'matter-test/snapshot-card',
			[
				'supports'        => [ 'matter' => [ 'link' => true ] ],
				'render_callback' => fn( $attributes, $content ) => '<div ' . get_block_wrapper_attributes() . '>' . $content . '</div>',
			]
		);

		Link::instance()->register_attribute( \WP_Block_Type_Registry::get_instance()->get_registered( 'matter-test/snapshot-card' ) );

		$card = fn( string $attrs, string $inner ) => $this->render( '<!-- wp:matter-test/snapshot-card ' . $attrs . ' -->' . $inner . '<!-- /wp:matter-test/snapshot-card -->' );

		try {
			$this->assertMatchesSnapshot( 'link-heading', $card( '{"matterLink":{"url":"https://example.com/page/"}}', '<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Title</h3><!-- /wp:heading --><!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph -->' ) );
			$this->assertMatchesSnapshot( 'link-no-heading', $card( '{"matterLink":{"url":"https://example.com/page/"}}', '<!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph -->' ) );
			$this->assertMatchesSnapshot( 'link-new-tab', $card( '{"matterLink":{"url":"https://example.com/page/","opensInNewTab":true}}', '<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Title</h3><!-- /wp:heading -->' ) );
		} finally {
			unregister_block_type( 'matter-test/snapshot-card' );
		}
	}

	/**
	 * A button with an icon.
	 *
	 * @return void
	 */
	public function test_button_icon(): void {
		$button = fn( string $attrs ) => $this->render( '<!-- wp:button ' . $attrs . ' --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#">Go</a></div><!-- /wp:button -->' );

		$this->assertMatchesSnapshot( 'button-icon', $button( '{"matterIcon":"matter-test-theme/star"}' ) );
	}

	/**
	 * A section with a chosen variant and a slot with nothing in it.
	 *
	 * @return void
	 */
	public function test_empty_slot_and_variant(): void {
		register_block_type(
			'matter-test/snapshot-variants',
			[
				'styles'   => [
					[
						'name'      => 'default',
						'label'     => 'Default',
						'isDefault' => true,
					],
					[
						'name'  => 'split',
						'label' => 'Split',
					],
				],
				'supports' => [ 'matter' => [ 'slots' => [ 'content' => [], 'media' => [] ] ] ], // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
			]
		);

		$section = fn( string $attrs ) => $this->render(
			'<!-- wp:matter-test/snapshot-variants ' . $attrs . ' -->'
			. '<!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->'
			. '<!-- wp:matter/slot {"name":"media"} --><!-- /wp:matter/slot -->'
			. '<!-- /wp:matter-test/snapshot-variants -->'
		);

		try {
			$this->assertMatchesSnapshot( 'slot-empty-default-variant', $section( '' ) );
			$this->assertMatchesSnapshot( 'slot-empty-variant', $section( '{"className":"is-style-split"}' ) );
		} finally {
			unregister_block_type( 'matter-test/snapshot-variants' );
		}
	}

	/**
	 * The list a Query Loop renders inside a carousel and an accordion is
	 * marked `matter-query-list`, which the blocks around it look for.
	 *
	 * @return void
	 */
	public function test_query_list_class(): void {
		foreach ( [ 'One', 'Two' ] as $title ) {
			self::factory()->post->create( [ 'post_title' => $title ] );
		}

		$query = fn( string $display, string $item ) => '<!-- wp:query {"queryId":7,"query":{"perPage":2,"postType":"post","order":"asc","orderBy":"title","inherit":false},"matterDisplay":' . $display . '} -->'
			. '<div class="wp-block-query"><!-- wp:post-template -->' . $item . '<!-- /wp:post-template --></div>'
			. '<!-- /wp:query -->';

		$title = '<!-- wp:post-title {"isLink":false} /-->';

		$this->assertMatchesSnapshot( 'query-list-carousel', $this->render( $query( '{"type":"carousel"}', $title ) ) );

		Ids::reset();

		$this->assertMatchesSnapshot( 'query-list-accordion', $this->render( $query( '{"type":"accordion","headingLevel":3}', '<!-- wp:matter/accordion-item -->' . $title . '<!-- /wp:matter/accordion-item -->' ) ) );
	}

	/**
	 * A compiled stylesheet re-scoped to an instance class and a media query:
	 * the placeholder swapped (only whole class names), relative URLs made
	 * absolute, the source map comment dropped.
	 *
	 * @return void
	 */
	public function test_scope_stylesheet(): void {
		$path = dirname( __DIR__ ) . '/fixtures/scope-stylesheet.css';

		$this->assertMatchesSnapshot( 'scope-stylesheet', Breakpoints::scope_stylesheet( $path, 'is-type-x', 'is-types-abc123' ), 'css' );
		$this->assertMatchesSnapshot( 'scope-stylesheet-query', Breakpoints::scope_stylesheet( $path, 'is-type-x', 'is-types-abc123', '(min-width: 1024px)' ), 'css' );
	}
}
