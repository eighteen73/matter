<?php
/**
 * What the server renders is what a visitor without JavaScript gets: nothing
 * is hidden or inert waiting for a script (the script hides content once it
 * starts), and what shows can be used.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

/**
 * Markup without JavaScript.
 */
class WithoutJavaScriptTest extends TestCase {

	/**
	 * Attributes that hide content, as the server wrote them (not the directives
	 * that bind them in the browser).
	 *
	 * @param string $html Markup.
	 * @return string[] Those found, e.g. `hidden` and `inert`.
	 */
	private function hiding( string $html ): array {
		preg_match_all( '/\s(hidden|inert)(?=[\s=>])/', $html, $matches );

		return array_values( array_unique( $matches[1] ) );
	}

	/**
	 * Every accordion panel is readable; an item says it's open only when it is.
	 *
	 * @return void
	 */
	public function test_accordion_panels_are_not_hidden_or_inert(): void {
		$html = $this->render(
			'<!-- wp:matter/accordion {"anchor":"faq","openFirst":true} -->'
			. '<!-- wp:matter/accordion-item {"title":"One"} --><!-- wp:paragraph --><p>Answer one</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->'
			. '<!-- wp:matter/accordion-item {"title":"Two"} --><!-- wp:paragraph --><p>Answer two</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->'
			. '<!-- /wp:matter/accordion -->'
		);

		$this->assertSame( [], $this->hiding( $html ) );
		$this->assertStringContainsString( 'Answer two', $html );

		// The script hides a closed panel (`until-found`, so it can be found in
		// the page) and opens it on a match.
		$this->assertSame( 2, substr_count( $html, 'data-wp-bind--hidden="state.isPanelHidden"' ) );
		$this->assertSame( 2, substr_count( $html, 'data-wp-on--beforematch="actions.reveal"' ) );

		// What the server knows: the first item is open, the second says nothing
		// (its button isn't "collapsed" while its answer shows).
		preg_match_all( '/<button[^>]*wp-block-matter-accordion-item__toggle[^>]*>/', $html, $buttons );

		$this->assertCount( 2, $buttons[0] );
		$this->assertStringContainsString( 'aria-expanded="true"', $buttons[0][0] );
		$this->assertStringNotContainsString( ' aria-expanded=', $buttons[0][1] );
		$this->assertSame( 1, preg_match_all( '/class="wp-block-matter-accordion-item is-open"/', $html ) );
	}

	/**
	 * A collapsible's content shows; the script hides it.
	 *
	 * @return void
	 */
	public function test_collapsible_content_is_not_hidden(): void {
		$html = $this->render(
			'<!-- wp:matter/collapsible {"overlayId":"more"} -->'
			. '<!-- wp:matter/slot {"name":"trigger"} --><!-- wp:paragraph --><p><a href="#more">More</a></p><!-- /wp:paragraph --><!-- /wp:matter/slot -->'
			. '<!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>The rest</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->'
			. '<!-- /wp:matter/collapsible -->'
		);

		$this->assertSame( [], $this->hiding( $html ) );
		$this->assertStringContainsString( 'The rest', $html );
		$this->assertStringContainsString( 'data-wp-bind--hidden="state.isHidden"', $html );
		$this->assertStringContainsString( 'data-wp-on--beforematch="actions.open"', $html );
		$this->assertDoesNotMatchRegularExpression( '/class="[^"]*\bis-open\b/', $html );
	}

	/**
	 * Every tab panel is readable and names itself; the active one is marked.
	 *
	 * @return void
	 */
	public function test_tab_panels_are_not_hidden(): void {
		$html = $this->render(
			'<!-- wp:matter/tabs {"anchor":"specs"} -->'
			. '<!-- wp:matter/tab {"label":"Size"} --><!-- wp:paragraph --><p>Large</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->'
			. '<!-- wp:matter/tab {"label":"Colour"} --><!-- wp:paragraph --><p>Blue</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->'
			. '<!-- /wp:matter/tabs -->'
		);

		// The dropdown's button names the current tab, and that is hidden for
		// the others; the panels aren't.
		preg_match_all( '/<div[^>]*role="tabpanel"[^>]*>/', $html, $panels );

		$this->assertCount( 2, $panels[0] );
		$this->assertSame( [], $this->hiding( implode( '', $panels[0] ) ) );
		$this->assertStringContainsString( 'class="wp-block-matter-tab is-active"', $panels[0][0] );
		$this->assertStringNotContainsString( 'is-active"', str_replace( 'data-wp-class--is-active', '', $panels[0][1] ) );
		$this->assertStringContainsString( '<div class="wp-block-matter-tab__label">Colour</div>', $html );
	}

	/**
	 * A modal's trigger markup.
	 *
	 * @param string $trigger Trigger slot content.
	 * @param string $id      Overlay ID.
	 * @return string The rendered block.
	 */
	private function modal( string $trigger, string $id = 'offer' ): string {
		return $this->render(
			sprintf( '<!-- wp:matter/modal {"overlayId":"%s"} -->', $id )
			. '<!-- wp:matter/slot {"name":"trigger"} -->' . $trigger . '<!-- /wp:matter/slot -->'
			. '<!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Inside</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->'
			. '<!-- /wp:matter/modal -->'
		);
	}

	/**
	 * A trigger link with no destination, or the placeholder `#`, goes to the
	 * overlay, so without JavaScript it takes the visitor to a dialog the CSS
	 * shows in the page.
	 *
	 * @return void
	 */
	public function test_a_trigger_link_without_a_destination_links_to_the_overlay(): void {
		foreach ( [ '<a href="#">Open</a>', '<a>Open</a>', '<a href="">Open</a>', '<a class="wp-block-button__link">Open</a>' ] as $index => $link ) {
			$id   = 'offer-' . $index;
			$html = $this->modal( '<!-- wp:html -->' . $link . '<!-- /wp:html -->', $id );

			$this->assertMatchesRegularExpression( '/<a [^>]*href="#' . $id . '"[^>]*>Open<\/a>/', $html, $link );
			$this->assertStringNotContainsString( 'href="#"', $html, $link );
		}
	}

	/**
	 * Only the first control is the trigger, and a real destination is the author's.
	 *
	 * @return void
	 */
	public function test_other_triggers_are_left_alone(): void {
		// A link elsewhere, and a link to another overlay.
		$this->assertStringContainsString( 'href="https://example.com/"', $this->modal( '<!-- wp:html --><a href="https://example.com/">Away</a><!-- /wp:html -->' ) );
		$this->assertStringContainsString( 'href="#other"', $this->modal( '<!-- wp:html --><a href="#other">Other</a><!-- /wp:html -->' ) );

		// A button stays a button, and a later link isn't the trigger.
		$html = $this->modal( '<!-- wp:html --><button type="button">Open</button> <a href="#">Later</a><!-- /wp:html -->' );

		$this->assertStringContainsString( '<button type="button">Open</button>', $html );
		$this->assertStringContainsString( 'href="#"', $html );

		// A trigger area with neither (the whole area is the button, in view.js).
		$this->assertStringContainsString( '<p>Just text</p>', $this->modal( '<!-- wp:html --><p>Just text</p><!-- /wp:html -->' ) );
	}

	/**
	 * A copy of a block (its overlay renamed `offer-2`) points a trigger link
	 * with no destination at itself; one that says the saved ID is left for
	 * the script, which knows it's the copy's own.
	 *
	 * @return void
	 */
	public function test_a_repeated_overlay_links_its_own_trigger_to_itself(): void {
		$html = $this->modal( '<!-- wp:html --><a href="#">Open</a><!-- /wp:html -->' ) . $this->modal( '<!-- wp:html --><a href="#">Open</a><!-- /wp:html -->' );

		$this->assertSame( 1, substr_count( $html, 'href="#offer"' ) );
		$this->assertSame( 1, substr_count( $html, 'href="#offer-2"' ) );

		$saved = $this->modal( '<!-- wp:html --><a href="#saved">Open</a><!-- /wp:html -->', 'saved' ) . $this->modal( '<!-- wp:html --><a href="#saved">Open</a><!-- /wp:html -->', 'saved' );

		$this->assertSame( 2, substr_count( $saved, 'href="#saved"' ) );
		$this->assertStringContainsString( 'data-matter-from="saved"', $saved );
	}

	/**
	 * Modals and drawers show no `inert` or `hidden`: a closed `<dialog>` is
	 * closed by the browser, and a link to its ID shows it in place.
	 *
	 * @return void
	 */
	public function test_dialogs_render_closed_without_inert_or_hidden(): void {
		$html = $this->modal( '<!-- wp:html --><a href="#">Open</a><!-- /wp:html -->' );

		$this->assertSame( [], $this->hiding( $html ) );
		$this->assertStringNotContainsString( ' open', $html );
	}
}
