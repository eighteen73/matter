<?php
/**
 * Filter products by price: `min_price` and `max_price`, as WooCommerce
 * names and applies them (on the prices it shows, with tax or without).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce\Filters;

use Eighteen73\Matter\Filters\Listing;
use Eighteen73\Matter\Filters\Source;
use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * Price filter source.
 */
final class PriceSource implements Source {

	/**
	 * Key.
	 *
	 * @return string
	 */
	public function key(): string {
		return 'price';
	}

	/**
	 * Name.
	 *
	 * @return string
	 */
	public function label(): string {
		return __( 'Price', 'matter' );
	}

	/**
	 * A range.
	 *
	 * @return string
	 */
	public function kind(): string {
		return 'range';
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
	 * WooCommerce's parameters.
	 *
	 * @return array<string, string>
	 */
	public function params(): array {
		return [
			'min' => 'min_price',
			'max' => 'max_price',
		];
	}

	/**
	 * The chosen lowest and highest price.
	 *
	 * @param array $request Request parameters.
	 * @return array{min: float|null, max: float|null}
	 */
	public function selected( array $request ): array {
		$bound = fn( string $param ) => isset( $request[ $param ] ) && is_numeric( $request[ $param ] ) ? max( 0.0, (float) $request[ $param ] ) : null;

		return [
			'min' => $bound( 'min_price' ),
			'max' => $bound( 'max_price' ),
		];
	}

	/**
	 * WooCommerce applies its own parameters.
	 *
	 * @param array $query_vars WP_Query vars.
	 * @param array $selected   Selection.
	 * @return array
	 */
	public function apply( array $query_vars, array $selected ): array {
		return $query_vars;
	}

	/**
	 * The listing's lowest and highest price (without its own selection), in
	 * whole units around them.
	 *
	 * @param Listing  $listing  The listing.
	 * @param WP_Block $block    The filter block.
	 * @param array    $settings Block settings.
	 * @return array{min: int|null, max: int|null}
	 */
	public function options( Listing $listing, WP_Block $block, array $settings ): array {
		$query_vars = Counts::query_vars( $block, [ 'min_price', 'max_price' ] );

		if ( ! empty( $query_vars['meta_query'] ) ) {
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Counting.
			$query_vars['meta_query'] = Counts::without( $query_vars['meta_query'], 'key', '_price' );
		}

		$range = (array) Counts::data()->get_filtered_price( $query_vars );

		if ( ! isset( $range['min_price'], $range['max_price'] ) ) {
			return [
				'min' => null,
				'max' => null,
			];
		}

		return [
			'min' => (int) floor( (float) $range['min_price'] ),
			'max' => (int) ceil( (float) $range['max_price'] ),
		];
	}

	/**
	 * One chip: "£10 – £50", "From £10" or "Up to £50".
	 *
	 * @param array $selected Selection.
	 * @return array<int, array{value: string, label: string}>
	 */
	public function chips( array $selected ): array {
		$min = $selected['min'] ?? null;
		$max = $selected['max'] ?? null;

		if ( null === $min && null === $max ) {
			return [];
		}

		$price = fn( float $amount ) => html_entity_decode( wp_strip_all_tags( wc_price( $amount, [ 'decimals' => floor( $amount ) === $amount ? 0 : wc_get_price_decimals() ] ) ), ENT_QUOTES, 'UTF-8' );

		if ( null !== $min && null !== $max ) {
			/* translators: 1: lowest price, 2: highest price. */
			$label = sprintf( __( '%1$s – %2$s', 'matter' ), $price( $min ), $price( $max ) );
		} elseif ( null !== $min ) {
			/* translators: %s: lowest price. */
			$label = sprintf( __( 'From %s', 'matter' ), $price( $min ) );
		} else {
			/* translators: %s: highest price. */
			$label = sprintf( __( 'Up to %s', 'matter' ), $price( (float) $max ) );
		}

		return [
			[
				'value' => 'range',
				'label' => $label,
			],
		];
	}
}
