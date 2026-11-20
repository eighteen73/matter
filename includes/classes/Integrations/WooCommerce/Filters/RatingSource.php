<?php
/**
 * Filter products by their average rating: `rating_filter` (comma-separated
 * ratings, 1 to 5, each its rounded average), as WooCommerce names and
 * applies it.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce\Filters;

use Eighteen73\Matter\Filters\Listing;
use Eighteen73\Matter\Filters\QueryParams;
use Eighteen73\Matter\Filters\Source;
use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * Rating filter source.
 */
final class RatingSource implements Source, QueryParams {

	/**
	 * Key.
	 *
	 * @return string
	 */
	public function key(): string {
		return 'rating';
	}

	/**
	 * Name.
	 *
	 * @return string
	 */
	public function label(): string {
		return __( 'Rating', 'matter' );
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
	 * Its icon in the editor: a star.
	 *
	 * @return string
	 */
	public function icon(): string {
		return 'rating';
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
	 * `filter_rating`.
	 *
	 * @return array<string, string>
	 */
	public function params(): array {
		return [ 'value' => 'filter_rating' ];
	}

	/**
	 * WooCommerce's parameter for the chosen ratings.
	 *
	 * @param array $selected Selection.
	 * @return array<string, string>
	 */
	public function query_params( array $selected ): array {
		return [ 'rating_filter' => implode( ',', (array) ( $selected['values'] ?? [] ) ) ];
	}

	/**
	 * The chosen ratings (any of them).
	 *
	 * @param array $request Request parameters.
	 * @return array{values: string[], operator: string}
	 */
	public function selected( array $request ): array {
		$values = array_filter(
			array_map( 'absint', explode( ',', (string) ( $request['filter_rating'] ?? '' ) ) ),
			fn( $rating ) => $rating >= 1 && $rating <= 5
		);

		return [
			'values'   => array_values( array_map( 'strval', array_unique( $values ) ) ),
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
	 * Ratings 5 to 1, with their counts in the listing (without this filter's
	 * own choice).
	 *
	 * @param Listing  $listing  The listing.
	 * @param WP_Block $block    The filter block.
	 * @param array    $settings Block settings.
	 * @return array<int, array{value: string, label: string, count: int, parent: string}>
	 */
	public function options( Listing $listing, WP_Block $block, array $settings ): array {
		$query_vars = Counts::query_vars( $block, [ 'rating_filter' ] );

		if ( ! empty( $query_vars['tax_query'] ) ) {
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Counting.
			$query_vars['tax_query'] = Counts::without( $query_vars['tax_query'], 'rating_filter', true );
		}

		$counts  = (array) Counts::data()->get_rating_counts( $query_vars );
		$options = [];

		for ( $rating = 5; $rating >= 1; --$rating ) {
			$options[] = [
				'value'  => (string) $rating,
				'label'  => self::rating_label( $rating ),
				'count'  => (int) ( $counts[ $rating ] ?? 0 ),
				'parent' => '',
				'rating' => $rating,
			];
		}

		return $options;
	}

	/**
	 * Ratings are ordered: a filter can show them as stars, and as "4 & up".
	 *
	 * @return bool
	 */
	public function ordered(): bool {
		return true;
	}

	/**
	 * A chip per chosen rating.
	 *
	 * @param array $selected Selection.
	 * @return array<int, array{value: string, label: string}>
	 */
	public function chips( array $selected ): array {
		return array_map(
			fn( $rating ) => [
				'value' => (string) $rating,
				'label' => self::rating_label( (int) $rating ),
			],
			$selected['values'] ?? []
		);
	}

	/**
	 * "Rated 4 out of 5".
	 *
	 * @param int $rating Rating.
	 * @return string
	 */
	private static function rating_label( int $rating ): string {
		/* translators: %d: a rating, 1 to 5. */
		return sprintf( __( 'Rated %d out of 5', 'matter' ), $rating );
	}
}
