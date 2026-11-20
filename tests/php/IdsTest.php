<?php
/**
 * Element IDs are unique within a page.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Ids;
use Eighteen73\Matter\Overlays\Panel;

/**
 * IDs.
 */
class IdsTest extends TestCase {

	/**
	 * One tab, in a tabs block with a saved ID.
	 *
	 * @param string $attrs Tabs attributes (JSON).
	 * @return string
	 */
	private function tabs( string $attrs ): string {
		return '<!-- wp:matter/tabs ' . $attrs . ' --><!-- wp:matter/tab {"label":"One"} --><!-- wp:paragraph --><p>One</p><!-- /wp:paragraph --><!-- /wp:matter/tab --><!-- /wp:matter/tabs -->';
	}

	/**
	 * Every ID in some markup.
	 *
	 * @param string $html Markup.
	 * @return string[]
	 */
	private function ids( string $html ): array {
		preg_match_all( '/\sid="([^"]+)"/', $html, $found );

		return $found[1];
	}

	/**
	 * A repeated ID gets -2, -3; a different one is untouched.
	 *
	 * @return void
	 */
	public function test_claim(): void {
		$this->assertSame( 'a', Ids::claim( 'a' ) );
		$this->assertSame( 'a-2', Ids::claim( 'a' ) );
		$this->assertSame( 'a-3', Ids::claim( 'a' ) );
		$this->assertSame( 'b', Ids::claim( 'b' ) );

		// A saved ID that looks like a generated one still wins its own name.
		$this->assertSame( 'c', Ids::claim( 'c' ) );
		$this->assertSame( 'c-2', Ids::claim( 'c' ) );
		$this->assertSame( 'c-2-2', Ids::claim( 'c-2' ) );
		$this->assertSame( 'c-3', Ids::claim( 'c' ) );

		Ids::reset();
		$this->assertSame( 'a', Ids::claim( 'a' ) );
	}

	/**
	 * A preview has a registry of its own, and the page's is put back.
	 *
	 * @return void
	 */
	public function test_isolate(): void {
		Ids::claim( 'a' );

		$this->assertSame( 'a', Ids::isolate( fn() => Ids::claim( 'a' ) ) );
		$this->assertSame( 'a-2', Ids::claim( 'a' ) );
	}

	/**
	 * Saved IDs are cleaned as the editor cleans them.
	 *
	 * @return void
	 */
	public function test_sanitize(): void {
		$this->assertSame( 'my-offer-2', Ids::sanitize( '  My Offer! 2 ' ) );
		$this->assertSame( 'a_b-c', Ids::sanitize( 'a_b-c' ) );
		$this->assertSame( '', Ids::sanitize( '!!!' ) );
	}

	/**
	 * Tabs rendered twice (a synced pattern used twice): every ID is unique,
	 * and each copy's tab controls its own panel.
	 *
	 * @return void
	 */
	public function test_tabs_rendered_twice(): void {
		$first  = $this->render( $this->tabs( '{"matterId":"tabs-abc"}' ) );
		$second = $this->render( $this->tabs( '{"matterId":"tabs-abc"}' ) );
		$ids    = array_merge( $this->ids( $first ), $this->ids( $second ) );

		$this->assertSame( $ids, array_unique( $ids ), 'IDs repeat' );
		$this->assertStringContainsString( 'id="tabs-abc"', $first );
		$this->assertStringContainsString( 'id="tabs-abc-2"', $second );
		$this->assertStringContainsString( 'aria-controls="tabs-abc-2-1"', $second );
		$this->assertStringContainsString( 'id="tabs-abc-2-1"', $second );
		$this->assertStringContainsString( 'id="tabs-abc-2-1-tab"', $second );

		// Not only the same markup twice in a row: an anchor does the same.
		$anchor = $this->render( $this->tabs( '{"anchor":"tabs-abc"}' ) );
		$this->assertStringContainsString( 'id="tabs-abc-3"', $anchor );
	}

	/**
	 * Accordions, and an accordion query, are claimed too.
	 *
	 * @return void
	 */
	public function test_accordions_rendered_twice(): void {
		$item = '<!-- wp:matter/accordion-item {"title":"Q"} --><!-- wp:paragraph --><p>A</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->';
		$html = $this->render( '<!-- wp:matter/accordion {"matterId":"faq"} -->' . $item . '<!-- /wp:matter/accordion -->' )
			. $this->render( '<!-- wp:matter/accordion {"matterId":"faq"} -->' . $item . '<!-- /wp:matter/accordion -->' );
		$ids  = $this->ids( $html );

		$this->assertSame( $ids, array_unique( $ids ), 'IDs repeat' );
		$this->assertStringContainsString( 'aria-controls="faq-2-1-panel"', $html );
		$this->assertStringContainsString( 'id="faq-2-1-panel"', $html );

		$post  = self::factory()->post->create();
		$query = '<!-- wp:query {"queryId":9,"matterId":"news","query":{"perPage":1,"postType":"post","inherit":false},"matterDisplay":{"type":"accordion"}} -->'
			. '<div class="wp-block-query"><!-- wp:post-template --><!-- wp:matter/accordion-item --><!-- wp:matter/loop-item /--><!-- /wp:matter/accordion-item --><!-- /wp:post-template --></div>'
			. '<!-- /wp:query -->';
		$html  = $this->render( $query ) . $this->render( $query );
		$ids   = $this->ids( $html );

		$this->assertSame( $ids, array_unique( $ids ), 'IDs repeat' );
		$this->assertStringContainsString( "id=\"news-2-post-{$post}\"", $html );
	}

	/**
	 * A tabs or accordion block with nothing to show outputs nothing.
	 *
	 * @return void
	 */
	public function test_empty_containers_output_nothing(): void {
		$this->assertSame( '', trim( $this->render( '<!-- wp:matter/tabs {"matterId":"t"} --><!-- /wp:matter/tabs -->' ) ) );
		$this->assertSame( '', trim( $this->render( '<!-- wp:matter/accordion {"matterId":"a","faqSchema":true} --><!-- /wp:matter/accordion -->' ) ) );

		// Items that render nothing leave nothing either.
		$this->assertSame( '', trim( $this->render( '<!-- wp:matter/accordion {"matterId":"a"} --><!-- wp:matter/accordion-item {"title":"Q"} --><!-- /wp:matter/accordion-item --><!-- /wp:matter/accordion -->' ) ) );
	}

	/**
	 * Overlays rendered twice: unique IDs, each with its own trigger and state.
	 *
	 * @return void
	 */
	public function test_overlays_rendered_twice(): void {
		$modal = '<!-- wp:matter/modal {"overlayId":"offer"} --><!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Hi</p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- /wp:matter/modal -->';
		$html  = $this->render( $modal ) . $this->render( $modal );

		$this->assertStringContainsString( '<dialog', $html );
		$this->assertSame( 1, substr_count( $html, 'id="offer"' ) );
		$this->assertSame( 1, substr_count( $html, 'id="offer-2"' ) );
		$this->assertStringContainsString( "data-wp-context='{\"id\":\"offer-2\"}'", $html );

		$items = wp_interactivity_state( 'matter/overlay' )['items'];

		$this->assertArrayHasKey( 'offer', $items );
		$this->assertArrayHasKey( 'offer-2', $items );
	}

	/**
	 * The server cleans an overlay ID as the editor does, and keeps a URL
	 * trigger's parameter as typed.
	 *
	 * @return void
	 */
	public function test_overlay_id_is_cleaned(): void {
		$html = $this->render( '<!-- wp:matter/modal {"overlayId":"Spring Offer!","urlTriggers":[{"param":"Offer","value":"Spring"}]} --><!-- /wp:matter/modal -->' );

		$this->assertStringContainsString( 'id="spring-offer"', $html );
		$this->assertArrayHasKey( 'spring-offer', wp_interactivity_state( 'matter/overlay' )['items'] );
		$this->assertSame(
			[
				[
					'param' => 'Offer',
					'value' => 'Spring',
				],
			],
			wp_interactivity_state( 'matter/overlay' )['items']['spring-offer']['urlTriggers']
		);
	}

	/**
	 * Dismissal is remembered under the overlay's ID, so it's off without a
	 * saved one.
	 *
	 * @return void
	 */
	public function test_dismissal_needs_a_saved_id(): void {
		$before = array_keys( wp_interactivity_state( 'matter/overlay' )['items'] ?? [] );

		$this->render( '<!-- wp:matter/modal {"overlayId":"kept","dismissDays":7} --><!-- /wp:matter/modal -->' );
		$this->render( '<!-- wp:matter/modal {"dismissDays":7} --><!-- /wp:matter/modal -->' );

		$items = wp_interactivity_state( 'matter/overlay' )['items'];

		$this->assertSame( 7, $items['kept']['dismissDays'] );

		$generated = array_diff( array_keys( $items ), $before, [ 'kept' ] );

		$this->assertCount( 1, $generated );
		$this->assertSame( 0, $items[ reset( $generated ) ]['dismissDays'] );
	}

	/**
	 * A block theme renders its template before wp_head, so the registry starts
	 * empty just before the template is included.
	 *
	 * @return void
	 */
	public function test_registry_resets_before_the_template_renders(): void {
		Ids::claim( 'offer' );

		do_action( 'wp_before_include_template', ABSPATH . WPINC . '/template-canvas.php' );

		$this->assertSame( 'offer', Ids::claim( 'offer' ) );
	}

	/**
	 * Each item of a REST collection is numbered as on its own page: the same
	 * synced pattern in two pages gets the same, unsuffixed IDs in both.
	 *
	 * @return void
	 */
	public function test_rest_collection_items_have_their_own_registry(): void {
		$pattern = self::factory()->post->create(
			[
				'post_type'    => 'wp_block',
				'post_status'  => 'publish',
				'post_content' => $this->tabs( '{"matterId":"tabs-abc"}' ),
			]
		);
		$pages   = self::factory()->post->create_many(
			2,
			[
				'post_type'    => 'page',
				'post_content' => '<!-- wp:block {"ref":' . $pattern . '} /-->',
			]
		);

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'administrator' ] ) );

		$request = new \WP_REST_Request( 'GET', '/wp/v2/pages' );
		$request->set_query_params(
			[
				'include'  => $pages,
				'per_page' => 10,
			]
		);

		$items = rest_do_request( $request )->get_data();

		$this->assertCount( 2, $items );

		foreach ( $items as $item ) {
			$html = $item['content']['rendered'];

			$this->assertStringContainsString( 'id="tabs-abc"', $html );
			$this->assertStringNotContainsString( 'tabs-abc-2', $html );
		}
	}

	/**
	 * Outside a REST request, setting up posts does not reset the registry.
	 *
	 * @return void
	 */
	public function test_the_post_outside_rest_does_not_reset(): void {
		$post = self::factory()->post->create_and_get();

		Ids::claim( 'kept' );
		setup_postdata( $post );

		$this->assertSame( 'kept-2', Ids::claim( 'kept' ) );
	}

	/**
	 * The anchor on a carousel or gallery, and a panel's ID, are claimed too.
	 *
	 * @return void
	 */
	public function test_anchors_and_panels_are_claimed(): void {
		$slide    = '<!-- wp:paragraph --><p>Slide</p><!-- /wp:paragraph -->';
		$carousel = '<!-- wp:matter/carousel {"anchor":"spotlight"} -->' . $slide . '<!-- /wp:matter/carousel -->';
		$html     = $this->render( $carousel ) . $this->render( $carousel );

		$this->assertSame( 1, substr_count( $html, 'id="spotlight"' ) );
		$this->assertSame( 1, substr_count( $html, 'id="spotlight-2"' ) );

		$image   = '<!-- wp:image --><figure class="wp-block-image"><img src="https://example.com/one.jpg" alt="One"/></figure><!-- /wp:image -->';
		$gallery = '<!-- wp:matter/gallery {"anchor":"photos"} -->' . $image . '<!-- /wp:matter/gallery -->';
		$html    = $this->render( $gallery ) . $this->render( $gallery );

		$this->assertSame( 1, substr_count( $html, 'id="photos"' ) );
		$this->assertSame( 1, substr_count( $html, 'id="photos-2"' ) );

		$panel = Panel::render( 'site-nav', 'Menu' ) . Panel::render( 'site-nav', 'Menu' );

		$this->assertSame( 1, substr_count( $panel, 'id="site-nav"' ) );
		$this->assertSame( 1, substr_count( $panel, 'id="site-nav-2"' ) );
	}

	/**
	 * A panel rendered twice, with its toggle before it each time (a template
	 * part used in two places): the panels get unique IDs, and the toggles name
	 * the ID asked for, which the panel script pairs with the nearest panel.
	 *
	 * @return void
	 */
	public function test_a_panel_rendered_twice_keeps_unique_ids_and_each_toggle_names_its_base(): void {
		$html = '';

		foreach ( [ 1, 2 ] as $ignored ) {
			$html .= \Eighteen73\Matter\get_panel_toggle( 'site-nav', [ 'collapse_below' => 'lg' ] );
			$html .= \Eighteen73\Matter\get_panel( 'site-nav', 'Menu', [ 'collapse_below' => 'lg' ] );
		}

		preg_match_all( '/data-matter-panel="([^"]+)"/', $html, $named );
		preg_match_all( '/<div id="([^"]+)" class="matter-panel/', $html, $panels );

		$this->assertSame( [ 'site-nav', 'site-nav-2' ], $panels[1] );
		$this->assertSame( [ 'site-nav', 'site-nav' ], $named[1] );
	}

	/**
	 * `isolate()` puts back everything it set aside: a claim, a repeat's counter
	 * and a landmark name made inside it leave the page's registry as it was.
	 *
	 * @return void
	 */
	public function test_isolate_restores_every_part_of_the_registry(): void {
		Ids::claim( 'a' );
		Ids::claim( 'a' );
		Ids::claim_label( 'Photos' );

		Ids::isolate(
			function () {
				Ids::claim( 'a' );
				Ids::claim( 'b' );
				Ids::claim_label( 'Photos' );
			}
		);

		$this->assertSame( 'a-3', Ids::claim( 'a' ), 'the repeat counter is the page\'s' );
		$this->assertSame( 'b', Ids::claim( 'b' ), 'what the preview claimed is not taken' );
		$this->assertSame( 'Photos (2)', Ids::claim_label( 'Photos' ) );
	}
}
