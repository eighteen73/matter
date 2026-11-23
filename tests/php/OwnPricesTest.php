<?php
/**
 * Price filters and sorting by the shopper's own prices.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Integrations\WooCommerce\OwnPrices;

/**
 * Own prices tests.
 */
class OwnPricesTest extends TestCase {

	/**
	 * Items, by name.
	 *
	 * @var array<string, int>
	 */
	private array $items = [];

	/**
	 * Four items, and the shopper's price for each but the last.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		foreach ( [ 'Apron', 'Bowl', 'Cup', 'Dish' ] as $title ) {
			$this->items[ $title ] = self::factory()->post->create( [ 'post_title' => $title ] );
		}

		$prices = [
			$this->items['Apron'] => [
				'min' => 30.0,
				'max' => 30.0,
			],
			$this->items['Bowl']  => [
				'min' => 12.0,
				'max' => 20.0,
			],
			$this->items['Cup']   => [
				'min' => 8.0,
				'max' => 8.0,
			],
		];

		add_filter( 'matter_product_prices', fn( $given, $ids ) => array_intersect_key( $prices, array_flip( $ids ) ), 10, 2 );
	}

	/**
	 * Remove the hooks.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		remove_all_filters( 'matter_product_prices' );
		remove_all_filters( 'matter_own_prices' );

		parent::tear_down();
	}

	/**
	 * Query vars for the items, in title order.
	 *
	 * @param array $more More vars.
	 * @return array
	 */
	private function vars( array $more = [] ): array {
		return array_merge(
			[
				'post_type'      => 'post',
				'post__in'       => array_values( $this->items ),
				'orderby'        => 'title',
				'order'          => 'ASC',
				'posts_per_page' => 10,
			],
			$more
		);
	}

	/**
	 * Names of items, by ID.
	 *
	 * @param int[] $ids IDs.
	 * @return string[]
	 */
	private function names( array $ids ): array {
		return array_map( fn( $id ) => array_search( $id, $this->items, true ), $ids );
	}

	/**
	 * A price filter keeps what the shopper's price range overlaps, in the
	 * listing's order; an item they have no price for is left out.
	 *
	 * @return void
	 */
	public function test_filters_by_the_shoppers_prices(): void {
		$vars = ( new OwnPrices() )->rewrite( $this->vars( [ 'max_price' => '15' ] ), '' );

		$this->assertSame( [ 'Bowl', 'Cup' ], $this->names( $vars['post__in'] ), 'A range overlapping the filter matches; order is the listing\'s.' );
		$this->assertSame( 'post__in', $vars['orderby'] );
		$this->assertArrayNotHasKey( 'max_price', $vars, 'The shop\'s own price filter is off.' );

		$vars = ( new OwnPrices() )->rewrite( $this->vars( [ 'min_price' => '25' ] ), '' );

		$this->assertSame( [ 'Apron' ], $this->names( $vars['post__in'] ) );
	}

	/**
	 * A price sort orders by the shopper's prices: lowest going up, highest
	 * coming down.
	 *
	 * @return void
	 */
	public function test_sorts_by_the_shoppers_prices(): void {
		$up   = ( new OwnPrices() )->rewrite( $this->vars(), 'asc' );
		$down = ( new OwnPrices() )->rewrite( $this->vars(), 'desc' );

		$this->assertSame( [ 'Cup', 'Bowl', 'Apron', 'Dish' ], $this->names( $up['post__in'] ), 'Unpriced last.' );
		$this->assertSame( [ 'Apron', 'Bowl', 'Cup', 'Dish' ], $this->names( $down['post__in'] ) );
	}

	/**
	 * Nothing matches: nothing is listed.
	 *
	 * @return void
	 */
	public function test_nothing_matches(): void {
		$vars = ( new OwnPrices() )->rewrite( $this->vars( [ 'max_price' => '1' ] ), '' );

		$this->assertSame( [ 0 ], $vars['post__in'] );
	}

	/**
	 * The browser is told when the shopper's prices are their own.
	 *
	 * @return void
	 */
	public function test_config(): void {
		( new OwnPrices() )->config();
		$this->assertArrayNotHasKey( 'ownPrices', wp_interactivity_config( 'matter/filters' ) );

		add_filter( 'matter_own_prices', '__return_true' );

		$own = new OwnPrices();

		$this->assertTrue( $own->own() );
		$own->config();
		$this->assertTrue( wp_interactivity_config( 'matter/filters' )['ownPrices'] );
	}
}
