<?php
/**
 * Product filter counts from WooCommerce's own Product Filters data
 * (`FilterDataProvider`), so they match WooCommerce's filtering exactly and
 * use its caching. Seek answers the same data from Meilisearch through
 * `woocommerce_pre_product_filter_data`, so with Seek these counts don't
 * touch the database.
 *
 * WooCommerce marks the provider internal: it's used here only, through the
 * same calls WooCommerce's filter blocks make, and the weekly compatibility
 * run tests it against WooCommerce's latest release.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce\Filters;

use Automattic\WooCommerce\Blocks\BlockTypes\ProductCollection\Utils as ProductCollectionUtils;
use Automattic\WooCommerce\Internal\ProductFilters\FilterDataProvider;
use Automattic\WooCommerce\Internal\ProductFilters\QueryClauses;
use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce filter counts.
 */
final class Counts {

	/**
	 * The listing's query vars, as WooCommerce's filter blocks read them (its
	 * filter parameters included), without the given parameters.
	 *
	 * @param WP_Block $block  A block inside the Product Collection.
	 * @param string[] $params Parameters to leave out (the counted filter's own).
	 * @return array
	 */
	public static function query_vars( WP_Block $block, array $params = [] ): array {
		$query_vars = ProductCollectionUtils::get_query_vars( $block, 1 );

		foreach ( $params as $param ) {
			unset( $query_vars[ $param ] );
		}

		// As WooCommerce does: an attribute archive's own term would count
		// against every other.
		if ( isset( $query_vars['taxonomy'] ) && str_starts_with( (string) $query_vars['taxonomy'], 'pa_' ) ) {
			unset( $query_vars['taxonomy'], $query_vars['term'] );
		}

		return $query_vars;
	}

	/**
	 * A query vars' clause list without clauses matching a key and value.
	 *
	 * @param array  $queries A tax_query or meta_query.
	 * @param string $key     Key.
	 * @param mixed  $value   Value.
	 * @return array
	 */
	public static function without( array $queries, string $key, mixed $value ): array {
		return ProductCollectionUtils::remove_query_array( $queries, $key, $value );
	}

	/**
	 * WooCommerce's filter data.
	 *
	 * @return object FilterData.
	 */
	public static function data(): object {
		$container = wc_get_container();

		return $container->get( FilterDataProvider::class )->with( $container->get( QueryClauses::class ) );
	}
}
