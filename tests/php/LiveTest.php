<?php
/**
 * Live blocks: placeholders in loop items, filled from the endpoint with
 * the visitor's own.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Blocks\LoopItem;
use Eighteen73\Matter\Live\Live;
use WP_REST_Request;

/**
 * Live blocks tests.
 */
class LiveTest extends TestCase {

	/**
	 * A post.
	 *
	 * @var int
	 */
	private int $post;

	/**
	 * The fixture theme's loop item is the post title: make it live.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		add_filter( 'matter_live_blocks', fn( $blocks ) => [ ...$blocks, 'core/post-title' ] );

		$this->post = self::factory()->post->create( [ 'post_title' => 'Priced item' ] );

		do_action( 'rest_api_init' );
	}

	/**
	 * Remove the hooks.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		remove_all_filters( 'matter_live_blocks' );
		remove_all_filters( 'matter_live_placeholders' );
		unset( $_COOKIE[ LOGGED_IN_COOKIE ] );
		wp_set_current_user( 0 );

		parent::tear_down();
	}

	/**
	 * On a page, live blocks render as usual.
	 *
	 * @return void
	 */
	public function test_pages_render_them_as_usual(): void {
		$this->assertStringContainsString( 'Priced item', LoopItem::render( $this->post ) );
		$this->assertStringNotContainsString( 'data-matter-live', LoopItem::render( $this->post ) );
	}

	/**
	 * Rendered with placeholders (a loop item for a search index), each is an empty
	 * placeholder keyed by the item and its place.
	 *
	 * @return void
	 */
	public function test_placeholders(): void {
		$html = Live::with_placeholders( fn() => LoopItem::render( $this->post ) );

		$this->assertStringNotContainsString( 'Priced item', $html );
		$this->assertStringContainsString( 'data-matter-live="' . $this->post . ':0"', $html );
		$this->assertStringContainsString( 'class="matter-live is-core-post-title"', $html );
		$this->assertStringContainsString( 'data-wp-key="matter-live-' . $this->post . '-0"', $html, 'Keyed, so the router replaces it.' );

		// After that render, live blocks render as usual again.
		$this->assertStringContainsString( 'Priced item', LoopItem::render( $this->post ) );
	}

	/**
	 * A carousel's items render as usual: its pattern can differ from the
	 * plain loop item the endpoint renders.
	 *
	 * @return void
	 */
	public function test_only_plain_loop_items(): void {
		$html = Live::with_placeholders( fn() => LoopItem::render( $this->post, '', 'carousel' ) );

		$this->assertStringNotContainsString( 'data-matter-live', $html );
	}

	/**
	 * A site can make them placeholders on pages, so a listing can be cached.
	 *
	 * @return void
	 */
	public function test_placeholders_on_pages(): void {
		add_filter( 'matter_live_placeholders', '__return_true' );

		$this->assertStringContainsString( 'data-matter-live="' . $this->post . ':0"', LoopItem::render( $this->post ) );
		$this->assertTrue( Live::used() );
	}

	/**
	 * The endpoint renders each item's live blocks as the visitor, for
	 * published items only.
	 *
	 * @return void
	 */
	public function test_endpoint(): void {
		$draft   = self::factory()->post->create( [ 'post_status' => 'draft' ] );
		$request = new WP_REST_Request( 'GET', '/matter/v1/live' );
		$request->set_query_params( [ 'ids' => [ $this->post, $draft ] ] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( [ $this->post ], array_keys( (array) $data['items'] ) );
		$this->assertStringContainsString( 'Priced item', ( (array) $data['items'] )[ $this->post ][0] );
		$this->assertGreaterThan( time(), $data['expires'] );
		$this->assertLessThanOrEqual( time() + Live::MAX_AGE, $data['expires'] );
		$this->assertStringStartsWith( 'public', $response->get_headers()['Cache-Control'] );
	}

	/**
	 * A logged-in visitor without the REST nonce would be answered as a guest:
	 * refused, with a nonce to try again with.
	 *
	 * @return void
	 */
	public function test_logged_in_without_a_nonce_is_refused(): void {
		$user = self::factory()->user->create();

		$_COOKIE[ LOGGED_IN_COOKIE ] = wp_generate_auth_cookie( $user, time() + HOUR_IN_SECONDS, 'logged_in' );

		$request = new WP_REST_Request( 'GET', '/matter/v1/live' );
		$request->set_query_params( [ 'ids' => [ $this->post ] ] );

		$response = rest_do_request( $request );

		$this->assertSame( 403, $response->get_status() );
		$this->assertSame( 'matter_live_nonce', $response->get_data()['code'] );
		$this->assertNotEmpty( $response->get_data()['data']['nonce'] );
		$this->assertSame( 0, get_current_user_id(), 'Still answered as nobody.' );

		// Logged in (the nonce checked): private.
		wp_set_current_user( $user );
		$response = rest_do_request( $request );

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( 'private, no-store', $response->get_headers()['Cache-Control'] );
	}

	/**
	 * The version and expiry come from the plugin that makes blocks live.
	 *
	 * @return void
	 */
	public function test_version_and_expiry(): void {
		add_filter( 'matter_live_version', fn() => 'abc' );
		add_filter( 'matter_live_expires', fn() => time() + 10 );

		$this->assertSame( 'abc', Live::version() );
		$this->assertLessThanOrEqual( time() + 10, Live::expires() );

		remove_all_filters( 'matter_live_version' );
		remove_all_filters( 'matter_live_expires' );
	}
}
