<?php
/**
 * Filter products by a product taxonomy or attribute, with WooCommerce's own
 * parameters, so its shop and Product Collections apply them:
 *
 * - Categories, tags and brands: `categories`, `tags`, `brands`; another
 *   product taxonomy: `filter_{taxonomy}` (WooCommerce's names, through its
 *   `woocommerce_product_filter_params` filter). Any of the chosen terms.
 * - Attributes (`pa_{name}`): `filter_{name}`, with `query_type_{name}=and`
 *   when every chosen term must match.
 *
 * Counts come from WooCommerce (Counts).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce\Filters;

use Eighteen73\Matter\Filters\Listing;
use Eighteen73\Matter\Filters\TaxonomySource;
use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * Product taxonomy filter source.
 */
final class ProductTaxonomySource extends TaxonomySource {

	/**
	 * Constructor.
	 *
	 * @param string      $taxonomy Taxonomy.
	 * @param string      $param    WooCommerce's parameter for it.
	 * @param string|null $operator Its `query_type_` parameter, for an attribute.
	 */
	public function __construct( string $taxonomy, private string $param, private ?string $operator = null ) {
		parent::__construct( $taxonomy );
	}

	/**
	 * An attribute's name, as WooCommerce labels it; else the taxonomy's.
	 *
	 * @return string
	 */
	public function label(): string {
		return str_starts_with( $this->taxonomy, 'pa_' ) ? (string) wc_attribute_label( $this->taxonomy ) : parent::label();
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
		return array_filter(
			[
				'value'    => $this->param,
				'operator' => $this->operator,
			]
		);
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
	 * Each term's count, from WooCommerce, leaving this filter's own choice
	 * out unless every chosen term must match.
	 *
	 * @param Listing  $listing The listing.
	 * @param WP_Block $block   The filter block.
	 * @param bool     $all     Whether every chosen term must match.
	 * @return array<int, int>
	 */
	protected function counts( Listing $listing, WP_Block $block, bool $all ): array {
		$query_vars = Counts::query_vars( $block, $all ? [] : [ $this->param ] );

		if ( ! $all && ! empty( $query_vars['tax_query'] ) ) {
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Counting.
			$query_vars['tax_query'] = Counts::without( $query_vars['tax_query'], 'taxonomy', $this->taxonomy );
		}

		$counts = str_starts_with( $this->taxonomy, 'pa_' )
			? Counts::data()->get_attribute_counts( $query_vars, $this->taxonomy )
			: Counts::data()->get_taxonomy_counts( $query_vars, $this->taxonomy );

		return array_map( 'intval', (array) $counts );
	}
}
