<?php
/**
 * Sort products: `orderby`, as WooCommerce names it and orders the shop by,
 * with WooCommerce's own choices (`woocommerce_catalog_orderby`) and default
 * (`woocommerce_default_catalog_orderby`), and Relevance on a search. Not a
 * filter: one choice that's always made, never a chip and never counted as
 * applied, left out of the URL while it's the default.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce\Filters;

use Eighteen73\Matter\Filters\Listing;
use Eighteen73\Matter\Filters\Source;
use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * Sort source.
 */
final class SortSource implements Source {

	/**
	 * Key.
	 *
	 * @return string
	 */
	public function key(): string {
		return 'sort';
	}

	/**
	 * Label.
	 *
	 * @return string
	 */
	public function label(): string {
		return __( 'Sort by', 'matter' );
	}

	/**
	 * Kind: a sort, one choice of the listing's order.
	 *
	 * @return string
	 */
	public function kind(): string {
		return 'sort';
	}

	/**
	 * Editor icon.
	 *
	 * @return string
	 */
	public function icon(): string {
		return 'sort';
	}

	/**
	 * Example options for the editor.
	 *
	 * @return array
	 */
	public function examples(): array {
		$examples = [];

		foreach ( $this->choices() as $value => $label ) {
			$examples[] = [
				'id'    => (string) $value,
				'name'  => (string) $label,
				'count' => 0,
			];
		}

		return $examples;
	}

	/**
	 * Post types.
	 *
	 * @return string[]
	 */
	public function post_types(): array {
		return [ 'product' ];
	}

	/**
	 * URL parameters: WooCommerce's own, so its sort links and Seek's mapping
	 * keep working.
	 *
	 * @return array
	 */
	public function params(): array {
		return [ 'value' => 'orderby' ];
	}

	/**
	 * The order chosen, or the default.
	 *
	 * @param array $request Request parameters.
	 * @return array
	 */
	public function selected( array $request ): array {
		$value = (string) ( $request['orderby'] ?? '' );

		return [
			'values'   => [ array_key_exists( $value, $this->choices() ) ? $value : $this->default_value() ],
			'operator' => 'or',
		];
	}

	/**
	 * The default order: WooCommerce's, or Relevance on a search.
	 *
	 * @return string
	 */
	public function default_value(): string {
		$choices = $this->choices();
		$default = self::is_search()
			? 'relevance'
			: (string) apply_filters( 'woocommerce_default_catalog_orderby', get_option( 'woocommerce_default_catalog_orderby', 'menu_order' ) );

		return array_key_exists( $default, $choices ) ? $default : (string) array_key_first( $choices );
	}

	/**
	 * WooCommerce orders the shop's queries by `orderby` itself, so the query is
	 * left as it is.
	 *
	 * @param array $query_vars Query vars.
	 * @param array $selected   Selection.
	 * @return array
	 */
	public function apply( array $query_vars, array $selected ): array {
		return $query_vars;
	}

	/**
	 * The choices, each shown (a sort has no counts).
	 *
	 * @param Listing  $listing  Listing.
	 * @param WP_Block $block    Block instance.
	 * @param array    $settings Settings.
	 * @return array
	 */
	public function options( Listing $listing, WP_Block $block, array $settings ): array {
		$options = [];

		foreach ( $this->choices() as $value => $label ) {
			$options[] = [
				'value'  => (string) $value,
				'label'  => (string) $label,
				'count'  => 1,
				'parent' => '',
			];
		}

		return $options;
	}

	/**
	 * A sort is never an active filter.
	 *
	 * @param array $selected Selection.
	 * @return array
	 */
	public function chips( array $selected ): array {
		return [];
	}

	/**
	 * WooCommerce's sort choices, as its own sort dropdown offers them.
	 *
	 * @return array Value => name.
	 */
	private function choices(): array {
		$choices = [
			'menu_order' => __( 'Default sorting', 'matter' ),
			'popularity' => __( 'Sort by popularity', 'matter' ),
			'rating'     => __( 'Sort by average rating', 'matter' ),
			'date'       => __( 'Sort by latest', 'matter' ),
			'price'      => __( 'Sort by price: low to high', 'matter' ),
			'price-desc' => __( 'Sort by price: high to low', 'matter' ),
		];

		if ( self::is_search() ) {
			unset( $choices['menu_order'] );
			$choices = [ 'relevance' => __( 'Relevance', 'matter' ) ] + $choices;
		}

		if ( function_exists( 'wc_review_ratings_enabled' ) && ! wc_review_ratings_enabled() ) {
			unset( $choices['rating'] );
		}

		/**
		 * WooCommerce's filter of its sort choices, so they match its own sort
		 * dropdown.
		 *
		 * @param array $choices Value => name.
		 */
		return array_filter( (array) apply_filters( 'woocommerce_catalog_orderby', $choices ), 'is_scalar' );
	}

	/**
	 * Whether the listing is a search, which sorts by relevance first.
	 *
	 * @return bool
	 */
	private static function is_search(): bool {
		return function_exists( 'is_search' ) && is_search();
	}
}
