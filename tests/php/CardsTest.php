<?php
/**
 * Cards: an item's loop item, rendered to be stored elsewhere.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Cards\Cards;
use Eighteen73\Matter\Integrations\WooCommerce\Cards as WooCommerceCards;

/**
 * Cards tests.
 */
class CardsTest extends TestCase {

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

		$this->post = self::factory()->post->create( [ 'post_title' => 'Carded item' ] );

		Cards::reset();
	}

	/**
	 * Remove the hooks.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		remove_all_filters( 'matter_live_blocks' );
		remove_all_filters( 'matter_card' );
		remove_all_filters( 'matter_card_version' );
		remove_all_filters( 'matter_loop_item_pattern' );
		foreach ( $this->renders as $render ) {
			remove_filter( 'render_block', $render );
		}
		wp_set_current_user( 0 );
		Cards::reset();

		parent::tear_down();
	}

	/**
	 * A card is the loop item with its live blocks as placeholders, its post
	 * classes and its version.
	 *
	 * @return void
	 */
	public function test_card(): void {
		$card = Cards::render( $this->post );

		$this->assertStringContainsString( 'data-matter-live="' . $this->post . ':0"', $card['html'] );
		$this->assertStringNotContainsString( 'Carded item', $card['html'] );
		$this->assertContains( 'post-' . $this->post, $card['classes'] );
		$this->assertSame( Cards::version( 'post' ), $card['version'] );
		$this->assertMatchesRegularExpression( '/^[0-9a-f]{12}$/', $card['version'] );
	}

	/**
	 * A card is rendered as a guest, whoever is logged in, and the visitor is
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

		Cards::render( $this->post );

		$this->assertNotEmpty( $seen );
		$this->assertSame( [ 0 ], array_values( array_unique( $seen ) ) );
		$this->assertSame( $user, get_current_user_id() );
	}

	/**
	 * A card has the Interactivity API state its blocks add, and none of the
	 * page's; the page's isn't changed by it.
	 *
	 * @return void
	 */
	public function test_its_own_interactivity_state(): void {
		wp_interactivity_state( 'test/page', [ 'a' => 1 ] );

		$this->renders[] = function ( $content, $block ) {
			if ( 'core/post-title' === $block['blockName'] ) {
				wp_interactivity_state( 'test/card', [ 'b' => 2 ] );
			}

			return $content;
		};

		add_filter( 'render_block', end( $this->renders ), 10, 2 );

		// Live blocks render as usual in a card's data: make the title not live.
		remove_all_filters( 'matter_live_blocks' );
		Cards::reset();

		$card = Cards::render( $this->post );

		$this->assertSame( [ 'test/card' => [ 'b' => 2 ] ], $card['data']['state'] );
		$this->assertSame( [], wp_interactivity_state( 'test/card' ) );
		$this->assertSame( [ 'a' => 1 ], wp_interactivity_state( 'test/page' ) );
	}

	/**
	 * Only items anyone may see have cards.
	 *
	 * @return void
	 */
	public function test_only_public_items(): void {
		$draft    = self::factory()->post->create( [ 'post_status' => 'draft' ] );
		$password = self::factory()->post->create( [ 'post_password' => 'secret' ] );

		$this->assertNull( Cards::render( $draft ) );
		$this->assertNull( Cards::render( $password ) );
		$this->assertNull( Cards::render( 0 ) );
	}

	/**
	 * No loop item pattern for the type: no cards, and no version.
	 *
	 * @return void
	 */
	public function test_no_pattern_no_cards(): void {
		add_filter( 'matter_loop_item_pattern', '__return_null' );

		$this->assertNull( Cards::version( 'post' ) );
		$this->assertNull( Cards::render( $this->post ) );
	}

	/**
	 * The version changes with what renders cards: which blocks are live, or
	 * what a plugin adds.
	 *
	 * @return void
	 */
	public function test_version(): void {
		$version = Cards::version( 'post' );

		Cards::reset();
		add_filter( 'matter_card_version', fn( $parts ) => [ ...$parts, 'plugin' => '2.0' ] );

		$this->assertNotSame( $version, Cards::version( 'post' ) );

		Cards::reset();
		remove_all_filters( 'matter_card_version' );
		remove_all_filters( 'matter_live_blocks' );

		$this->assertNotSame( $version, Cards::version( 'post' ), 'Live blocks changed.' );
	}

	/**
	 * A card can be filtered.
	 *
	 * @return void
	 */
	public function test_filter(): void {
		add_filter(
			'matter_card',
			function ( $card ) {
				$card['classes'][] = 'is-filtered';

				return $card;
			}
		);

		$this->assertContains( 'is-filtered', Cards::render( $this->post )['classes'] );
	}

	/**
	 * WooCommerce's: without the page's cart state, and the classes for a
	 * place in a loop or a sale.
	 *
	 * @return void
	 */
	public function test_woocommerce_card(): void {
		$card = ( new WooCommerceCards() )->card(
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

		$this->assertSame( [ 'post-1', 'product', 'instock' ], $card['classes'] );
		$this->assertSame( [ 'state' => [ 'woocommerce/product-button' => [ 'addToCartText' => 'Add' ] ] ], $card['data'] );
	}
}
