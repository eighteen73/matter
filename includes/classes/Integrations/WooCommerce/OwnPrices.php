<?php
/**
 * Price filters and price sorting by the shopper's own prices.
 *
 * WooCommerce filters by price (`min_price`, `max_price`) and sorts by it
 * (`orderby=price`) with its own prices, from its lookup table. A shopper with
 * prices of their own (a trade customer's group prices, through a pricing
 * plugin such as Abacus) would get a list that disagrees with the prices it
 * shows them: "Under £20" missing what costs them £18.
 *
 * So for a shopper whose prices are their own (`matter_own_prices`), while a
 * price filter or price sort is active, the listing's products are priced for
 * them (`matter_product_prices`: each product's lowest and highest price for
 * one), filtered (a product matches when its range overlaps the filter, as in
 * WooCommerce) and sorted (lowest price going up, highest coming down, then
 * by ID) here, and the query is limited to those in that order (`post__in`).
 * Products the hook doesn't price keep WooCommerce's prices.
 *
 * It applies to the shop's main query (its archive and product taxonomies)
 * and to Product Collections. Every product the listing matches is priced, so
 * it's for listings of hundreds of products, not tens of thousands; other
 * shoppers, and the same shopper without a price filter or sort, are left to
 * WooCommerce. A results provider is told (`ownPrices` in the `matter/filters`
 * config), so it leaves these to the server too.
 *
 * Prices are compared as the hook gives them, which should be as the shop
 * stores them: like WooCommerce's lookup table, not adjusted for showing
 * prices with or without tax.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce;

use WP_Query;

defined( 'ABSPATH' ) || exit;

/**
 * Own prices.
 */
final class OwnPrices {

	/**
	 * Whether the shopper's prices are their own, once asked.
	 *
	 * @var bool|null
	 */
	private ?bool $own = null;

	/**
	 * Whether a listing's products are being found (its own query mustn't be
	 * rewritten).
	 *
	 * @var bool
	 */
	private bool $finding = false;

	/**
	 * The request's price bounds, while the shop's query runs without them.
	 *
	 * @var array|null
	 */
	private ?array $hidden = null;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		// After WooCommerce's (10), which sets up the shop's price sorting.
		add_action( 'pre_get_posts', [ $this, 'main' ], 20 );
		// After WooCommerce's Product Collection (10) and Matter's filters (20).
		add_filter( 'query_loop_block_query_vars', [ $this, 'loop' ], 30 );
		add_action( 'matter_filters_listing', [ $this, 'config' ] );
	}

	/**
	 * Whether the shopper's prices are their own.
	 *
	 * @return bool
	 */
	public function own(): bool {
		if ( null === $this->own ) {
			/**
			 * Filters whether the shopper may pay prices of their own, not the
			 * shop's (a pricing plugin's group or customer prices), so price
			 * filters and sorting use theirs (`matter_product_prices`).
			 *
			 * @param bool $own Whether they do.
			 */
			$this->own = (bool) apply_filters( 'matter_own_prices', false );
		}

		return $this->own;
	}

	/**
	 * Tell the browser, so a results provider leaves price filters and
	 * sorting to the server.
	 *
	 * @return void
	 */
	public function config(): void {
		if ( $this->own() ) {
			wp_interactivity_config( 'matter/filters', [ 'ownPrices' => true ] );
		}
	}

	/**
	 * The shop's main query.
	 *
	 * @param WP_Query $query Query.
	 * @return void
	 */
	public function main( WP_Query $query ): void {
		if ( $this->finding || is_admin() || ! $query->is_main_query() || ! self::is_shop( $query ) ) {
			return;
		}

		$order = self::shop_order();

		if ( ! self::is_priced( $query->query_vars, $order ) || ! $this->own() ) {
			return;
		}

		// WooCommerce sorts the shop by its prices with clauses of its own,
		// and filters it by them reading the request, not the query (its
		// product_query_post_clauses()): hidden until the query has its posts.
		if ( '' !== $order ) {
			WC()->query->remove_ordering_args();
		}

		$this->hide_bounds();

		$query->query_vars = $this->rewrite( $query->query_vars, $order );
	}

	/**
	 * Take the price bounds out of the request until the main query has its
	 * posts (then the filter blocks read them as chosen).
	 *
	 * @return void
	 */
	private function hide_bounds(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only filters.
		$this->hidden = array_intersect_key( $_GET, array_flip( [ 'min_price', 'max_price' ] ) );

		unset( $_GET['min_price'], $_GET['max_price'] );

		add_filter( 'the_posts', [ $this, 'restore_bounds' ], 0, 2 );
	}

	/**
	 * Put the price bounds back once the main query has its posts.
	 *
	 * @param mixed    $posts Posts.
	 * @param WP_Query $query Query.
	 * @return mixed
	 */
	public function restore_bounds( $posts, $query ) {
		if ( null !== $this->hidden && $query instanceof WP_Query && $query->is_main_query() ) {
			$_GET         = array_merge( $_GET, $this->hidden ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$this->hidden = null;

			remove_filter( 'the_posts', [ $this, 'restore_bounds' ], 0 );
		}

		return $posts;
	}

	/**
	 * A Product Collection's query.
	 *
	 * @param mixed $query Query vars.
	 * @return array
	 */
	public function loop( $query ): array {
		$query = (array) $query;

		if ( $this->finding || ! in_array( 'product', (array) ( $query['post_type'] ?? [] ), true ) ) {
			return $query;
		}

		$order = 'price' === ( $query['orderby'] ?? '' )
			? ( 'asc' === strtolower( (string) ( $query['order'] ?? 'desc' ) ) ? 'asc' : 'desc' )
			: '';

		if ( ! self::is_priced( $query, $order ) || ! $this->own() ) {
			return $query;
		}

		return $this->rewrite( $query, $order );
	}

	/**
	 * A listing's query limited to the products that match the price filter
	 * at the shopper's prices, in the listing's order or by their price.
	 *
	 * @param array  $vars  Query vars.
	 * @param string $order Price sort: `asc`, `desc` or `''` for none.
	 * @return array
	 */
	public function rewrite( array $vars, string $order ): array {
		$min = self::bound( $vars['min_price'] ?? null );
		$max = self::bound( $vars['max_price'] ?? null );
		$ids = $this->find( $vars, $order );

		/**
		 * Filters the shopper's price for one of each product: its lowest and
		 * highest (a variable product's across its variations). Products left
		 * out keep the shop's.
		 *
		 * @param array<int, array{min: float, max: float}> $prices      Prices, by product ID.
		 * @param int[]                                     $product_ids Product IDs.
		 */
		$prices  = (array) apply_filters( 'matter_product_prices', [], $ids );
		$prices += self::shop_prices( array_diff( $ids, array_keys( $prices ) ) );
		$kept    = [];

		foreach ( $ids as $id ) {
			$price = $prices[ $id ] ?? null;

			if ( ( null !== $min || null !== $max ) && null === $price ) {
				continue;
			}

			if ( ( null !== $min && (float) $price['max'] < $min ) || ( null !== $max && (float) $price['min'] > $max ) ) {
				continue;
			}

			$kept[] = $id;
		}

		if ( '' !== $order ) {
			usort(
				$kept,
				function ( int $a, int $b ) use ( $prices, $order ): int {
					// Unpriced last, either way.
					$by = isset( $prices[ $b ] ) <=> isset( $prices[ $a ] );

					if ( 0 === $by && isset( $prices[ $a ] ) ) {
						$key = 'asc' === $order ? 'min' : 'max';
						$by  = (float) $prices[ $a ][ $key ] <=> (float) $prices[ $b ][ $key ];
						$by  = 'asc' === $order ? $by : -$by;
					}

					return 0 !== $by ? $by : ( 'asc' === $order ? $a <=> $b : $b <=> $a );
				}
			);
		}

		unset( $vars['min_price'], $vars['max_price'], $vars['order'] );

		$vars['post__in'] = $kept ? $kept : [ 0 ];
		$vars['orderby']  = 'post__in';

		return $vars;
	}

	/**
	 * Every product the listing matches without its price filter, in its
	 * order (or by ID, when it sorts by price).
	 *
	 * @param array  $vars  Query vars.
	 * @param string $order Price sort, if any.
	 * @return int[]
	 */
	private function find( array $vars, string $order ): array {
		unset( $vars['min_price'], $vars['max_price'], $vars['paged'], $vars['offset'] );

		if ( '' !== $order ) {
			$vars['orderby'] = 'ID';
			$vars['order']   = 'ASC';
		}

		$vars['fields']         = 'ids';
		$vars['posts_per_page'] = -1;
		$vars['no_found_rows']  = true;

		$this->finding = true;

		try {
			return array_map( 'intval', ( new WP_Query( $vars ) )->posts );
		} finally {
			$this->finding = false;
		}
	}

	/**
	 * WooCommerce's prices for products: its lookup table's lowest and
	 * highest.
	 *
	 * @param int[] $ids Product IDs.
	 * @return array<int, array{min: float, max: float}>
	 */
	private static function shop_prices( array $ids ): array {
		global $wpdb;

		$ids = array_values( array_filter( array_map( 'intval', $ids ) ) );

		if ( ! $ids || empty( $wpdb->wc_product_meta_lookup ) ) {
			return [];
		}

		$rows   = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->prepare(
				"SELECT product_id, min_price, max_price FROM {$wpdb->wc_product_meta_lookup} WHERE product_id IN (" . implode( ',', array_fill( 0, count( $ids ), '%d' ) ) . ')', // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
				...$ids
			)
		);
		$prices = [];

		foreach ( (array) $rows as $row ) {
			if ( null !== $row->min_price ) {
				$prices[ (int) $row->product_id ] = [
					'min' => (float) $row->min_price,
					'max' => (float) $row->max_price,
				];
			}
		}

		return $prices;
	}

	/**
	 * Whether a query filters or sorts by price.
	 *
	 * @param array  $vars  Query vars.
	 * @param string $order Price sort, if any.
	 * @return bool
	 */
	private static function is_priced( array $vars, string $order ): bool {
		return '' !== $order || null !== self::bound( $vars['min_price'] ?? null ) || null !== self::bound( $vars['max_price'] ?? null );
	}

	/**
	 * A price bound, as WooCommerce reads one (0 or none is no bound).
	 *
	 * @param mixed $value Value.
	 * @return float|null
	 */
	private static function bound( $value ): ?float {
		return is_numeric( $value ) && (float) $value > 0 ? (float) $value : null;
	}

	/**
	 * Whether a main query lists the shop: its archive or a product taxonomy.
	 *
	 * @param WP_Query $query Query.
	 * @return bool
	 */
	private static function is_shop( WP_Query $query ): bool {
		return $query->is_post_type_archive( 'product' ) || $query->is_tax( get_object_taxonomies( 'product' ) );
	}

	/**
	 * The shop's price sort, from the ordering WooCommerce set up for the main
	 * query.
	 *
	 * @return string `asc`, `desc` or `''`.
	 */
	private static function shop_order(): string {
		$wc = WC()->query ?? null;

		if ( ! $wc ) {
			return '';
		}

		if ( has_filter( 'posts_clauses', [ $wc, 'order_by_price_asc_post_clauses' ] ) ) {
			return 'asc';
		}

		return has_filter( 'posts_clauses', [ $wc, 'order_by_price_desc_post_clauses' ] ) ? 'desc' : '';
	}
}
