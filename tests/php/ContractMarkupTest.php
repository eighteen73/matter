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

		$tabs = $this->render( $query( 'tabs', '<!-- wp:matter/tab --><!-- wp:matter/loop-item /--><!-- /wp:matter/tab -->' ) );

		$this->assertSame( 1, substr_count( $tabs, 'id="news"' ) );
		$this->assertStringContainsString( "role=\"tab\" id=\"news-post-{$newer}-tab\"", $tabs );
		$this->assertStringContainsString( "aria-controls=\"news-post-{$older}\"", $tabs );
		$this->assertStringContainsString( "\"active\":\"news-post-{$newer}\"", str_replace( '&quot;', '"', $tabs ) );
	}
}
