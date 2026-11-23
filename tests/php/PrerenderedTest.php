<?php
/**
 * Loop items: an item's loop item, rendered to be stored elsewhere.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\LoopItems\Prerendered;
use Eighteen73\Matter\Integrations\WooCommerce\LoopItems as WooCommerceLoopItems;

/**
 * Loop items tests.
 */
class PrerenderedTest extends TestCase {

	/**
	 * A post.
	 *
	 * @var int
	 */
	private int $post;

	/**
	 * The test's own render_block callbacks.
	 *
	 * @var callable[]
	 */
	private array $renders = [];

	/**
	 * The fixture theme's loop item is the post title: make it live.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		add_filter( 'matter_live_blocks', fn( $blocks ) => [ ...$blocks, 'core/post-title' ] );

		$this->post = self::factory()->post->create( [ 'post_title' => 'Prerendered item' ] );

		Prerendered::reset();
	}

	/**
	 * Remove the hooks.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		remove_all_filters( 'matter_live_blocks' );
		remove_all_filters( 'matter_prerender_loop_item' );
		remove_all_filters( 'matter_prerender_loop_item_version' );
		remove_all_filters( 'matter_loop_item_pattern' );
		foreach ( $this->renders as $render ) {
			remove_filter( 'render_block', $render );
		}
		wp_set_current_user( 0 );
		Prerendered::reset();

		parent::tear_down();
	}

	/**
	 * A loop item is the loop item with its live blocks as placeholders, its post
	 * classes and its version.
	 *
	 * @return void
	 */
	public function test_prerendered(): void {
		$item = Prerendered::render( $this->post );

		$this->assertStringContainsString( 'data-matter-live="' . $this->post . ':0"', $item['html'] );
		$this->assertStringNotContainsString( 'Prerendered item', $item['html'] );
		$this->assertContains( 'post-' . $this->post, $item['classes'] );
		$this->assertSame( Prerendered::version( 'post' ), $item['version'] );
		$this->assertMatchesRegularExpression( '/^[0-9a-f]{12}$/', $item['version'] );
	}

	/**
	 * A loop item is rendered as a guest, whoever is logged in, and the visitor is
	 * restored after.
	 *
	 * @return void
	 */
	public function test_rendered_as_a_guest(): void {
		$user = self::factory()->user->create( [ 'role' => 'administrator' ] );
		$seen = [];

		wp_set_current_user( $user );

		$this->renders[] = function ( $content ) use ( &$seen ) {
			$seen[] = get_current_user_id();

			return $content;
		};

		add_filter( 'render_block', end( $this->renders ) );

		Prerendered::render( $this->post );

		$this->assertNotEmpty( $seen );
		$this->assertSame( [ 0 ], array_values( array_unique( $seen ) ) );
		$this->assertSame( $user, get_current_user_id() );
	}

	/**
	 * A loop item has the Interactivity API state its blocks add, and none of the
	 * page's; the page's isn't changed by it.
	 *
	 * @return void
	 */
	public function test_its_own_interactivity_state(): void {
		wp_interactivity_state( 'test/page', [ 'a' => 1 ] );

		$this->renders[] = function ( $content, $block ) {
			if ( 'core/post-title' === $block['blockName'] ) {
				wp_interactivity_state( 'test/item', [ 'b' => 2 ] );
			}

			return $content;
		};

		add_filter( 'render_block', end( $this->renders ), 10, 2 );

		// Live blocks render as usual in a loop item's data: make the title not live.
		remove_all_filters( 'matter_live_blocks' );
		Prerendered::reset();

		$item = Prerendered::render( $this->post );

		$this->assertSame( [ 'test/item' => [ 'b' => 2 ] ], $item['data']['state'] );
		$this->assertSame( [], wp_interactivity_state( 'test/item' ) );
		$this->assertSame( [ 'a' => 1 ], wp_interactivity_state( 'test/page' ) );
	}

	/**
	 * Only items anyone may see have loop items.
	 *
	 * @return void
	 */
	public function test_only_public_items(): void {
		$draft    = self::factory()->post->create( [ 'post_status' => 'draft' ] );
		$password = self::factory()->post->create( [ 'post_password' => 'secret' ] );

		$this->assertNull( Prerendered::render( $draft ) );
		$this->assertNull( Prerendered::render( $password ) );
		$this->assertNull( Prerendered::render( 0 ) );
	}

	/**
	 * No loop item pattern for the type: no loop items, and no version.
	 *
	 * @return void
	 */
	public function test_no_pattern_no_loop_items(): void {
		add_filter( 'matter_loop_item_pattern', '__return_null' );

		$this->assertNull( Prerendered::version( 'post' ) );
		$this->assertNull( Prerendered::render( $this->post ) );
	}

	/**
	 * The version changes with what renders loop items: which blocks are live, or
	 * what a plugin adds.
	 *
	 * @return void
	 */
	public function test_version(): void {
		$version = Prerendered::version( 'post' );

		Prerendered::reset();
		add_filter( 'matter_prerender_loop_item_version', fn( $parts ) => [ ...$parts, 'plugin' => '2.0' ] );

		$this->assertNotSame( $version, Prerendered::version( 'post' ) );

		Prerendered::reset();
		remove_all_filters( 'matter_prerender_loop_item_version' );
		remove_all_filters( 'matter_live_blocks' );

		$this->assertNotSame( $version, Prerendered::version( 'post' ), 'Live blocks changed.' );
	}

	/**
	 * A loop item can be filtered.
	 *
	 * @return void
	 */
	public function test_filter(): void {
		add_filter(
			'matter_prerender_loop_item',
			function ( $item ) {
				$item['classes'][] = 'is-filtered';

				return $item;
			}
		);

		$this->assertContains( 'is-filtered', Prerendered::render( $this->post )['classes'] );
	}

	/**
	 * WooCommerce's: without the page's cart state, and the classes for a
	 * place in a loop or a sale.
	 *
	 * @return void
	 */
	public function test_woocommerce_loop_item(): void {
		$item = ( new WooCommerceLoopItems() )->item(
			[
				'html'    => '',
				'classes' => [ 'post-1', 'product', 'first', 'sale', 'instock' ],
				'data'    => [
					'state'  => [
						'woocommerce'                => [ 'cart' => [] ],
						'woocommerce/product-button' => [ 'addToCartText' => 'Add' ],
					],
					'config' => [ 'woocommerce' => [ 'messages' => [] ] ],
				],
				'version' => 'abc',
			]
		);

		$this->assertSame( [ 'post-1', 'product', 'instock' ], $item['classes'] );
		$this->assertSame( [ 'state' => [ 'woocommerce/product-button' => [ 'addToCartText' => 'Add' ] ] ], $item['data'] );
	}
}
