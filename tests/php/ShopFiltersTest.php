<?php
/**
 * A shop's main query, as a listing's base: without the clauses WooCommerce
 * adds for its own filter parameters.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Integrations\WooCommerce\Filters\Counts;

/**
 * Shop filter tests.
 */
class ShopFiltersTest extends TestCase {

	/**
	 * A product archive loaded with `?filter_color=gray&rating_filter=4`:
	 * WooCommerce has added a clause for each to the main query, which an
	 * inheriting listing's base would otherwise keep, so a results provider
	 * could never widen the list again.
	 *
	 * @return void
	 */
	public function test_base_leaves_out_woocommerce_filter_clauses(): void {
		$visibility = [
			'taxonomy' => 'product_visibility',
			'field'    => 'term_taxonomy_id',
			'terms'    => [ 7 ],
			'operator' => 'NOT IN',
		];
		$own        = [
			'taxonomy' => 'pa_color',
			'field'    => 'slug',
			'terms'    => [ 'red' ],
			'operator' => 'IN',
		];
		$vars       = [
			'post_type'   => 'product',
			'product_cat' => 'tshirts',
			'tax_query'   => [
				'relation' => 'AND',
				[
					'taxonomy'         => 'pa_color',
					'field'            => 'slug',
					'terms'            => [ 'gray' ],
					'operator'         => 'IN',
					'include_children' => false,
				],
				$visibility,
				[
					'taxonomy'      => 'product_visibility',
					'field'         => 'term_taxonomy_id',
					'terms'         => [ 12 ],
					'operator'      => 'IN',
					'rating_filter' => true,
				],
				$own,
			],
		];
		$chosen     = [
			'pa_color' => [
				'terms'      => [ 'gray' ],
				'query_type' => 'or',
			],
		];

		$base = Counts::without_shop_filters( $vars, $chosen );

		$this->assertSame( 'tshirts', $base['product_cat'], 'The archive itself stays.' );
		$this->assertSame(
			[
				'relation' => 'AND',
				$visibility,
				$own,
			],
			$base['tax_query'],
			'Only the chosen colour and the rating go: catalogue visibility and the query\'s own clauses stay.'
		);

		$plain = [
			'post_type' => 'product',
			'tax_query' => [ $visibility, $own ],
		];

		$this->assertSame( $plain, Counts::without_shop_filters( $plain, [] ), 'Nothing chosen: unchanged.' );
	}
}
