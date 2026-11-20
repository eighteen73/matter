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
}
