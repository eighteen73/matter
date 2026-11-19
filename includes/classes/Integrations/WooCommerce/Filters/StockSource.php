<?php
/**
 * Filter products by stock status: `filter_stock_status` (comma-separated
 * statuses), as WooCommerce names and applies it.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce\Filters;

use Eighteen73\Matter\Filters\Listing;
use Eighteen73\Matter\Filters\Source;
use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * Stock status filter source.
 */
final class StockSource implements Source {

	/**
	 * Key.
	 *
	 * @return string
	 */
	public function key(): string {
		return 'stock';
	}

	/**
	 * Name.
	 *
	 * @return string
	 */
	public function label(): string {
		return __( 'Availability', 'matter' );
	}

	/**
	 * A choice.
	 *
	 * @return string
	 */
	public function kind(): string {
		return 'choice';
	}

	/**
	 * Products.
	 *
	 * @return string[]
	 */
	public function post_types(): array {
		return [ 'product' ];
	}

	/**
	 * WooCommerce's parameter.
	 *
	 * @return array<string, string>
	 */
	public function params(): array {
		return [ 'value' => 'filter_stock_status' ];
	}

	/**
	 * The chosen statuses (any of them).
	 *
	 * @param array $request Request parameters.
	 * @return array{values: string[], operator: string}
	 */
	public function selected( array $request ): array {
		$statuses = array_keys( wc_get_product_stock_status_options() );
		$values   = array_map( 'sanitize_key', explode( ',', (string) ( $request['filter_stock_status'] ?? '' ) ) );

		return [
			'values'   => array_values( array_intersect( array_unique( $values ), $statuses ) ),
			'operator' => 'or',
		];
	}

	/**
	 * WooCommerce applies its own parameter.
	 *
	 * @param array $query_vars WP_Query vars.
	 * @param array $selected   Selection.
	 * @return array
	 */
	public function apply( array $query_vars, array $selected ): array {
		return $query_vars;
	}

	/**
	 * Each status, with its count in the listing (without this filter's own
	 * choice).
	 *
	 * @param Listing  $listing  The listing.
	 * @param WP_Block $block    The filter block.
	 * @param array    $settings Block settings.
	 * @return array<int, array{value: string, label: string, count: int, parent: string}>
	 */
	public function options( Listing $listing, WP_Block $block, array $settings ): array {
		$statuses   = wc_get_product_stock_status_options();
		$query_vars = Counts::query_vars( $block, [ 'filter_stock_status' ] );

		if ( ! empty( $query_vars['meta_query'] ) ) {
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Counting.
			$query_vars['meta_query'] = Counts::without( $query_vars['meta_query'], 'key', '_stock_status' );
		}

		$counts  = (array) Counts::data()->get_stock_status_counts( $query_vars, array_keys( $statuses ) );
		$options = [];

		foreach ( $statuses as $status => $label ) {
			$options[] = [
				'value'  => (string) $status,
				'label'  => (string) $label,
				'count'  => (int) ( $counts[ $status ] ?? 0 ),
				'parent' => '',
			];
		}

		return $options;
	}

	/**
	 * A chip per chosen status.
	 *
	 * @param array $selected Selection.
	 * @return array<int, array{value: string, label: string}>
	 */
	public function chips( array $selected ): array {
		$statuses = wc_get_product_stock_status_options();

		return array_map(
			fn( $status ) => [
				'value' => $status,
				'label' => (string) ( $statuses[ $status ] ?? $status ),
			],
			$selected['values'] ?? []
		);
	}
}
