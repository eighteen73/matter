<?php
/**
 * Accessibility details (review fixes 31): accordion regions, labels with
 * inline formatting only, and what names a dialog.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Ids;

/**
 * Accessibility details.
 */
class AccessibilityTest extends TestCase {

	/**
	 * An accordion of items.
	 *
	 * @param int    $count Number of items.
	 * @param string $title Item title.
	 * @return string Block markup.
	 */
	private function accordion( int $count, string $title = 'Question' ): string {
		$items = '';

		for ( $i = 1; $i <= $count; $i++ ) {
			$items .= '<!-- wp:matter/accordion-item {"title":"' . $title . ' ' . $i . '"} --><!-- wp:paragraph --><p>Answer ' . $i . '</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->';
		}

		return '<!-- wp:matter/accordion -->' . $items . '<!-- /wp:matter/accordion -->';
	}

	/**
	 * Up to six items, each panel is a region named by its button.
	 *
	 * @return void
	 */
	public function test_a_short_accordion_has_regions(): void {
		$html = $this->render( $this->accordion( 6 ) );

		$this->assertSame( 6, substr_count( $html, 'role="region"' ) );
		$this->assertSame( 6, substr_count( $html, 'aria-labelledby=' ) );
		$this->assertStringNotContainsString( 'data-matter-region', $html );
	}

	/**
	 * Beyond six, they aren't: a long FAQ would flood the landmark list. The
	 * panels aren't left with a label for nothing either.
	 *
	 * @return void
	 */
	public function test_a_long_accordion_has_no_regions(): void {
		$html = $this->render( $this->accordion( 7 ) );

		$this->assertStringNotContainsString( 'role="region"', $html );
		$this->assertStringNotContainsString( 'aria-labelledby', $html );
		$this->assertStringNotContainsString( 'data-matter-region', $html );
		$this->assertSame( 7, substr_count( $html, 'aria-controls=' ), 'Buttons still say what they control' );
	}

	/**
	 * A nested accordion is counted on its own: a long one inside a short one.
	 *
	 * @return void
	 */
	public function test_nested_accordions_count_separately(): void {
		$inner = $this->accordion( 7, 'Inner' );
		$html  = $this->render(
			'<!-- wp:matter/accordion --><!-- wp:matter/accordion-item {"title":"Outer"} -->' . $inner . '<!-- /wp:matter/accordion-item --><!-- /wp:matter/accordion -->'
		);

		$this->assertSame( 1, substr_count( $html, 'role="region"' ), 'Only the outer panel' );
	}

	/**
	 * A Query Loop shown as an accordion counts its posts.
	 *
	 * @return void
	 */
	public function test_a_posts_accordion_counts_its_posts(): void {
		$ids = self::factory()->post->create_many( 7 );

		$query = fn( int $count ) => '<!-- wp:query {"queryId":11,"query":{"perPage":' . $count . ',"postType":"post","inherit":false},"matterDisplay":{"type":"accordion"}} -->'
			. '<div class="wp-block-query"><!-- wp:post-template --><!-- wp:matter/accordion-item --><!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item --><!-- /wp:post-template --></div>'
			. '<!-- /wp:query -->';

		$this->assertCount( 7, $ids );
		$this->assertSame( 7, substr_count( $this->render( $query( 7 ) ), 'wp-block-matter-accordion-item__heading' ) );
		$this->assertStringNotContainsString( 'role="region"', $this->render( $query( 7 ) ) );

		// Three of the seven on a page: still no regions, as on every page.
		Ids::reset();

		$html = $this->render( $query( 3 ) );

		$this->assertSame( 3, substr_count( $html, 'wp-block-matter-accordion-item__heading' ) );
		$this->assertStringNotContainsString( 'role="region"', $html );
	}

	/**
	 * A posts accordion of few posts in all has regions.
	 *
	 * @return void
	 */
	public function test_a_posts_accordion_of_few_posts_has_regions(): void {
		$this->assertCount( 3, self::factory()->post->create_many( 3 ) );

		$html = $this->render(
			'<!-- wp:query {"queryId":12,"query":{"perPage":2,"postType":"post","inherit":false},"matterDisplay":{"type":"accordion"}} -->'
			. '<div class="wp-block-query"><!-- wp:post-template --><!-- wp:matter/accordion-item --><!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item --><!-- /wp:post-template --></div>'
			. '<!-- /wp:query -->'
		);

		$this->assertSame( 2, substr_count( $html, 'role="region"' ) );
	}

	/**
	 * An item outside an accordion is a region as before.
	 *
	 * @return void
	 */
	public function test_an_item_outside_an_accordion_is_a_region(): void {
		$html = $this->render( '<!-- wp:matter/accordion-item {"title":"Alone"} --><!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->' );

		$this->assertSame( 1, substr_count( $html, 'role="region"' ) );
		$this->assertStringNotContainsString( 'data-matter-region', $html );
	}

	/**
	 * Accordion titles and tab labels keep inline formatting, and lose links
	 * and blocks, which don't belong in a button.
	 *
	 * @return void
	 */
	public function test_labels_allow_inline_formatting_only(): void {
		$title = '<strong>Bold</strong> <em>it</em> <abbr title="Frequently asked">FAQ</abbr> H<sub>2</sub>O <a href="/x">link</a><div>block</div><script>alert(1)</script>';
		$kept  = '<strong>Bold</strong> <em>it</em> <abbr title="Frequently asked">FAQ</abbr> H<sub>2</sub>O linkblockalert(1)';

		$accordion = $this->render( '<!-- wp:matter/accordion --><!-- wp:matter/accordion-item ' . wp_json_encode( [ 'title' => $title ] ) . ' --><!-- wp:paragraph --><p>A</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item --><!-- /wp:matter/accordion -->' );

		$this->assertStringContainsString( '<span class="wp-block-matter-accordion-item__title">' . $kept . '</span>', $accordion );

		$tabs = $this->render( '<!-- wp:matter/tabs --><!-- wp:matter/tab ' . wp_json_encode( [ 'label' => $title ] ) . ' --><!-- wp:paragraph --><p>A</p><!-- /wp:paragraph --><!-- /wp:matter/tab --><!-- /wp:matter/tabs -->' );

		$this->assertStringContainsString( '<span class="wp-block-matter-tabs__label">' . $kept . '</span>', $tabs );
		$this->assertStringNotContainsString( '<a href="/x"', $tabs );
		$this->assertStringNotContainsString( '<div>block', $tabs );
	}

	/**
	 * A modal without a label is named by its first heading, which gets an ID
	 * to say so. A label wins; a heading with an ID of its own keeps it; with
	 * neither it is "Dialog".
	 *
	 * @return void
	 */
	public function test_a_dialog_is_named_by_its_heading(): void {
		$modal = fn( string $attributes, string $content ) => '<!-- wp:matter/modal ' . $attributes . ' --><!-- wp:matter/slot {"name":"trigger"} /--><!-- wp:matter/slot {"name":"content"} -->' . $content . '<!-- /wp:matter/slot --><!-- /wp:matter/modal -->';
		$heading = '<!-- wp:heading --><h2 class="wp-block-heading">Join us</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph -->';

		$html = $this->render( $modal( '{"overlayId":"join"}', $heading ) );

		$this->assertStringContainsString( 'aria-labelledby="join-title"', $html );
		$this->assertStringNotContainsString( 'aria-label=', $html );
		$this->assertStringContainsString( '<h2 id="join-title" class="wp-block-heading">Join us</h2>', $html );

		Ids::reset();

		$html = $this->render( $modal( '{"overlayId":"join","label":"Newsletter"}', $heading ) );

		$this->assertStringContainsString( 'aria-label="Newsletter"', $html );
		$this->assertStringNotContainsString( 'aria-labelledby', $html );

		Ids::reset();

		$html = $this->render( $modal( '{"overlayId":"join"}', '<!-- wp:heading {"anchor":"mine"} --><h3 class="wp-block-heading" id="mine">Mine</h3><!-- /wp:heading -->' ) );

		$this->assertStringContainsString( 'aria-labelledby="mine"', $html );

		Ids::reset();

		$html = $this->render( $modal( '{"overlayId":"join"}', '<!-- wp:paragraph --><p>No heading</p><!-- /wp:paragraph -->' ) );

		$this->assertStringContainsString( 'aria-label="Dialog"', $html );
		$this->assertStringNotContainsString( 'aria-labelledby', $html );
	}

	/**
	 * Two copies of a modal name themselves by their own headings.
	 *
	 * @return void
	 */
	public function test_repeated_dialogs_have_their_own_heading_ids(): void {
		$markup = '<!-- wp:matter/modal {"overlayId":"join"} --><!-- wp:matter/slot {"name":"content"} --><!-- wp:heading --><h2 class="wp-block-heading">Join us</h2><!-- /wp:heading --><!-- /wp:matter/slot --><!-- /wp:matter/modal -->';
		$html   = $this->render( $markup . $markup );

		$this->assertStringContainsString( 'aria-labelledby="join-title"', $html );
		$this->assertStringContainsString( 'aria-labelledby="join-2-title"', $html );
		$this->assertStringContainsString( 'id="join-2-title"', $html );
	}

	/**
	 * What names a dialog is its own first heading, not one that is not
	 * shown or is not the dialog's: an accordion item's or a tab's, one in a
	 * template, a nested dialog, or something hidden or inert.
	 *
	 * @return void
	 */
	public function test_a_dialog_is_not_named_by_a_heading_that_is_not_its_own(): void {
		$modal = fn( string $content ) => '<!-- wp:matter/modal {"overlayId":"join"} --><!-- wp:matter/slot {"name":"content"} -->' . $content . '<!-- /wp:matter/slot --><!-- /wp:matter/modal -->';
		$real  = '<!-- wp:heading --><h2 class="wp-block-heading">Real title</h2><!-- /wp:heading -->';

		// An accordion first: the name comes from the later real heading.
		$html = $this->render( $modal( $this->accordion( 2 ) . $real ) );

		$this->assertStringContainsString( 'aria-labelledby="join-title"', $html );
		$this->assertStringContainsString( '<h2 id="join-title" class="wp-block-heading">Real title</h2>', $html );
		$this->assertStringNotContainsString( 'accordion-item__heading" id=', $html );
		$this->assertStringNotContainsString( 'id="join-title" class="wp-block-matter-accordion-item__heading"', $html );

		// Only an accordion: it falls back.
		Ids::reset();

		$html = $this->render( $modal( $this->accordion( 2 ) ) );

		$this->assertStringContainsString( 'aria-label="Dialog"', $html );
		$this->assertStringNotContainsString( 'aria-labelledby="join-title"', $html );

		// Tab labels, and what is hidden, inert, a template or another dialog.
		$skipped = [
			'a tab label'      => '<!-- wp:matter/tabs --><!-- wp:matter/tab {"label":"One"} --><!-- wp:paragraph --><p>A</p><!-- /wp:paragraph --><!-- /wp:matter/tab --><!-- /wp:matter/tabs -->',
			'hidden'           => '<!-- wp:html --><h2 hidden>Hidden</h2><!-- /wp:html -->',
			'in hidden'        => '<!-- wp:html --><div hidden><h2>In hidden</h2></div><!-- /wp:html -->',
			'in inert'         => '<!-- wp:html --><div inert><h2>In inert</h2></div><!-- /wp:html -->',
			'in a template'    => '<!-- wp:html --><template><h2>In template</h2></template><!-- /wp:html -->',
			'in a dialog'      => '<!-- wp:html --><dialog><h2>In dialog</h2></dialog><!-- /wp:html -->',
		];

		foreach ( $skipped as $what => $markup ) {
			Ids::reset();

			$html = $this->render( $modal( $markup . $real ) );

			$this->assertStringContainsString( '<h2 id="join-title" class="wp-block-heading">Real title</h2>', $html, $what );
		}
	}

	/**
	 * Two copies of a modal whose heading has an ID of its own (an anchor):
	 * the second copy's heading gets a unique one, and its dialog is named by
	 * that, not by the first copy's.
	 *
	 * @return void
	 */
	public function test_a_repeated_dialog_with_an_anchored_heading_is_named_by_its_own(): void {
		$markup = '<!-- wp:matter/modal {"overlayId":"join"} --><!-- wp:matter/slot {"name":"content"} --><!-- wp:heading {"anchor":"mine"} --><h2 class="wp-block-heading" id="mine">Mine</h2><!-- /wp:heading --><!-- /wp:matter/slot --><!-- /wp:matter/modal -->';
		$html   = $this->render( $markup . $markup );

		$this->assertSame( 1, substr_count( $html, 'id="mine"' ) );
		$this->assertSame( 1, substr_count( $html, 'id="mine-2"' ) );
		$this->assertStringContainsString( 'aria-labelledby="mine"', $html );
		$this->assertStringContainsString( 'aria-labelledby="mine-2"', $html );
	}
}
