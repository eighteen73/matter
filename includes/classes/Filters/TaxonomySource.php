<?php
/**
 * Filter by a taxonomy's terms: `filter_{name}` (comma-separated term slugs),
 * with `filter_{name}_match=all` when every term must match (else any).
 * `{name}` is short (Sources::param_name(): `category`, `tag`).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

use WP_Term;

defined( 'ABSPATH' ) || exit;

/**
 * Taxonomy filter source.
 */
class TaxonomySource implements Source {

	/**
	 * Constructor.
	 *
	 * @param string $taxonomy Taxonomy.
	 */
	public function __construct( protected string $taxonomy ) {}

	/**
	 * Key: `taxonomy:{taxonomy}`.
	 *
	 * @return string
	 */
	public function key(): string {
		return 'taxonomy:' . $this->taxonomy;
	}

	/**
	 * The taxonomy's singular name.
	 *
	 * @return string
	 */
	public function label(): string {
		$taxonomy = get_taxonomy( $this->taxonomy );

		return $taxonomy ? (string) $taxonomy->labels->singular_name : $this->taxonomy;
	}

	/**
	 * A choice of terms.
	 *
	 * @return string
	 */
	public function kind(): string {
		return 'choice';
	}

	/**
	 * Its icon in the editor: a category's for a hierarchical taxonomy, else
	 * a tag's.
	 *
	 * @return string
	 */
	public function icon(): string {
		return is_taxonomy_hierarchical( $this->taxonomy ) ? 'category' : 'tag';
	}

	/**
	 * Terms to preview its filter with in the editor: a dozen with posts,
	 * with their parents (to nest) and swatches.
	 *
	 * @return array<int, array{id: int, name: string, count: int, parent: int, swatch: string}>
	 */
	public function examples(): array {
		$terms = get_terms(
			[
				'taxonomy'   => $this->taxonomy,
				'hide_empty' => true,
				'number'     => 12,
			]
		);

		if ( ! is_array( $terms ) ) {
			return [];
		}

		return array_map(
			fn( \WP_Term $term ) => [
				'id'     => $term->term_id,
				'name'   => $term->name,
				'count'  => (int) $term->count,
				'parent' => $term->parent,
				'swatch' => (string) apply_filters( 'matter_filter_swatch', '', $term ),
			],
			array_values( $terms )
		);
	}

	/**
	 * The post types the taxonomy is for.
	 *
	 * @return string[]
	 */
	public function post_types(): array {
		$taxonomy = get_taxonomy( $this->taxonomy );

		return $taxonomy ? array_values( (array) $taxonomy->object_type ) : [];
	}

	/**
	 * `filter_{name}` and `filter_{name}_match`.
	 *
	 * @return array<string, string>
	 */
	public function params(): array {
		$name = Sources::param_name( $this->taxonomy );

		return [
			'value'    => "filter_{$name}",
			'operator' => "filter_{$name}_match",
		];
	}

	/**
	 * The chosen term slugs, and whether all must match.
	 *
	 * @param array $request Request parameters.
	 * @return array{values: string[], operator: string}
	 */
	public function selected( array $request ): array {
		$params = $this->params();

		return [
			'values'   => self::values( $request[ $params['value'] ] ?? '' ),
			'operator' => isset( $params['operator'] ) && 'all' === ( $request[ $params['operator'] ] ?? '' ) ? 'and' : 'or',
		];
	}

	/**
	 * Comma-separated values from a request, as term slugs.
	 *
	 * @param mixed $raw Raw value.
	 * @return string[]
	 */
	public static function values( mixed $raw ): array {
		$raw = is_array( $raw ) ? implode( ',', array_map( 'strval', $raw ) ) : (string) $raw;

		return array_values( array_unique( array_filter( array_map( 'sanitize_title', explode( ',', $raw ) ) ) ) );
	}

	/**
	 * Add the terms to the query's tax_query: any of them, or all.
	 *
	 * @param array $query_vars WP_Query vars.
	 * @param array $selected   Selection.
	 * @return array
	 */
	public function apply( array $query_vars, array $selected ): array {
		if ( empty( $selected['values'] ) ) {
			return $query_vars;
		}

		$tax_query = is_array( $query_vars['tax_query'] ?? null ) ? $query_vars['tax_query'] : [];

		$tax_query[] = [
			'taxonomy'         => $this->taxonomy,
			'field'            => 'slug',
			'terms'            => $selected['values'],
			'operator'         => 'and' === $selected['operator'] ? 'AND' : 'IN',
			'include_children' => true,
		];

		$query_vars['tax_query'] = $tax_query; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- The filter's purpose.

		return $query_vars;
	}

	/**
	 * The taxonomy's terms (with results anywhere), each with its count in
	 * the listing, parents before their children.
	 *
	 * @param Listing   $listing  The listing.
	 * @param \WP_Block $block    The filter block.
	 * @param array     $settings Block settings (`operator`).
	 * @return array<int, array{value: string, label: string, count: int, parent: string, swatch: string}>
	 */
	public function options( Listing $listing, \WP_Block $block, array $settings ): array {
		$terms = get_terms(
			[
				'taxonomy'   => $this->taxonomy,
				'hide_empty' => true,
				'orderby'    => 'name',
			]
		);

		if ( ! is_array( $terms ) || ! $terms ) {
			return [];
		}

		$counts = $this->counts( $listing, $block, 'and' === ( $settings['operator'] ?? 'or' ) );
		$slugs  = wp_list_pluck( $terms, 'slug', 'term_id' );

		return array_map(
			fn( WP_Term $term ) => [
				'value'  => $term->slug,
				'label'  => $term->name,
				'count'  => (int) ( $counts[ $term->term_id ] ?? 0 ),
				'parent' => (string) ( $slugs[ $term->parent ] ?? '' ),
				/**
				 * Filters a term's swatch in a filter shown as swatches: a CSS
				 * colour (or `url(…)` image), or empty for none.
				 *
				 * @param string  $swatch Swatch.
				 * @param WP_Term $term   Term.
				 */
				'swatch' => (string) apply_filters( 'matter_filter_swatch', '', $term ),
			],
			$terms
		);
	}

	/**
	 * Each term's count in the listing, by term ID. With "any", counts leave
	 * this filter's own choice out, so the other terms stay available to add.
	 *
	 * @param Listing   $listing The listing.
	 * @param \WP_Block $block   The filter block.
	 * @param bool      $all     Whether every chosen term must match (`and`).
	 * @return array<int, int>
	 */
	protected function counts( Listing $listing, \WP_Block $block, bool $all ): array {
		return Counts::terms( $listing->query_vars( $block, $all ? null : $this->key() ), $this->taxonomy );
	}

	/**
	 * A chip per chosen term, named.
	 *
	 * @param array $selected Selection.
	 * @return array<int, array{value: string, label: string}>
	 */
	public function chips( array $selected ): array {
		$chips = [];

		foreach ( $selected['values'] ?? [] as $slug ) {
			$term = get_term_by( 'slug', $slug, $this->taxonomy );

			if ( $term instanceof WP_Term ) {
				$chips[] = [
					'value' => $slug,
					'label' => $term->name,
				];
			}
		}

		return $chips;
	}
}
