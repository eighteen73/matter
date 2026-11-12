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
		$this->assertMatchesSnapshot( 'drawer', $this->render( '<!-- wp:matter/drawer {"overlayId":"filters","position":"left"} -->' . $trigger . $content . '<!-- /wp:matter/drawer -->' ) );
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
}
