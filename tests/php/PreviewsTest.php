<?php
/**
 * Editor previews: only viewable post types are rendered.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use WP_REST_Request;

/**
 * Editor preview endpoints.
 */
class PreviewsTest extends TestCase {

	/**
	 * An author (can edit posts) is logged in.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'author' ] ) );
		do_action( 'rest_api_init' );
	}

	/**
	 * Loop item previews leave out items of post types without a front end.
	 *
	 * @return void
	 */
	public function test_loop_items_only_viewable(): void {
		$post  = self::factory()->post->create( [ 'post_title' => 'Visible post' ] );
		$block = self::factory()->post->create(
			[
				'post_type'    => 'wp_block',
				'post_title'   => 'Reusable',
				'post_content' => '<!-- wp:paragraph --><p>Secret</p><!-- /wp:paragraph -->',
			]
		);

		$request = new WP_REST_Request( 'GET', '/matter/v1/loop-items' );
		$request->set_param( 'ids', [ $post, $block ] );

		$data = rest_get_server()->dispatch( $request )->get_data();

		$this->assertSame( [ $post ], array_column( $data, 'id' ) );
	}

	/**
	 * Term previews: terms of viewable taxonomies only, rendered as the
	 * theme's term loop item; anyone who can't edit posts gets nothing.
	 *
	 * @return void
	 */
	public function test_loop_item_terms_only_viewable(): void {
		register_taxonomy( 'matter_private', 'post', [ 'public' => false ] );

		$term    = self::factory()->category->create( [ 'name' => 'Visible category' ] );
		$private = self::factory()->term->create(
			[
				'taxonomy' => 'matter_private',
				'name'     => 'Secret term',
			]
		);

		$request = new WP_REST_Request( 'GET', '/matter/v1/loop-items/terms' );
		$request->set_param( 'ids', [ $term, $private, 999999 ] );
		$request->set_param( 'block', 'carousel' );

		$data = rest_get_server()->dispatch( $request )->get_data();

		$this->assertSame( [ $term ], array_column( $data, 'id' ) );
		$this->assertStringContainsString( 'Visible category', $data[0]['html'] );

		// Terms are carousels only.
		$request->set_param( 'block', 'accordion' );
		$this->assertSame( 400, rest_get_server()->dispatch( $request )->get_status() );

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'subscriber' ] ) );
		$request->set_param( 'block', '' );
		$this->assertSame( 403, rest_get_server()->dispatch( $request )->get_status() );

		unregister_taxonomy( 'matter_private' );
	}

	/**
	 * Accordion and tabs previews refuse a query of a non-viewable post type.
	 *
	 * @return void
	 */
	public function test_query_display_only_viewable(): void {
		$request = new WP_REST_Request( 'POST', '/matter/v1/query-display' );
		$request->set_body_params(
			[
				'attributes' => [
					'query'         => [ 'postType' => 'wp_block' ],
					'matterDisplay' => [ 'type' => 'accordion' ],
				],
			]
		);

		$this->assertSame( 400, rest_get_server()->dispatch( $request )->get_status() );

		$request->set_body_params(
			[
				'attributes' => [
					'query'         => [ 'postType' => 'post' ],
					'matterDisplay' => [ 'type' => 'accordion' ],
				],
			]
		);

		$this->assertSame( 200, rest_get_server()->dispatch( $request )->get_status() );
	}
}
