<?php
/**
 * Applies filter selections to the listing's query.
 *
 * - An archive's main query (a listing that inherits it): on `pre_get_posts`,
 *   on archive, blog and search requests with a filter parameter.
 * - A Query Loop with filters: through `query_loop_block_query_vars`, which
 *   core applies when it builds the loop's query (and when a filter counts
 *   its options).
 *
 * Sources whose plugin applies its own parameters (WooCommerce's, on its
 * shop and Product Collections) leave the query alone.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

use WP_Query;

defined( 'ABSPATH' ) || exit;

/**
 * Filter query.
 */
final class Query {

	/**
	 * Leave every source out (see building()): the listing's own query.
	 */
	public const ALL = '*';

	/**
	 * The main query's vars before filters were applied, for counting.
	 *
	 * @var array|null
	 */
	private static ?array $main_vars = null;

	/**
	 * The main query's post types (null for any), for its sources.
	 *
	 * @var string[]|null
	 */
	private static ?array $main_types = null;

	/**
	 * A source to leave out while building a query (its own options' counts).
	 *
	 * @var string|null
	 */
	private static ?string $except = null;

	/**
	 * The vars last given to the listing's Query Loop, to recognise its query
	 * (and note its results) when it runs.
	 *
	 * @var array|null
	 */
	private static ?array $listing_vars = null;

	/**
	 * Apply the request's selections to an archive's main query.
	 *
	 * @param WP_Query $query Query.
	 * @return void
	 */
	public static function main( WP_Query $query ): void {
		if ( is_admin() || ! $query->is_main_query() || ! ( $query->is_archive() || $query->is_home() || $query->is_search() ) ) {
			return;
		}

		self::$main_vars  = $query->query_vars;
		self::$main_types = self::post_types( $query );

		$query->query_vars = self::apply( $query->query_vars, null, self::$main_types );
	}

	/**
	 * The main query's post types, as its filters were applied: null for any.
	 *
	 * @return string[]|null
	 */
	public static function main_post_types(): ?array {
		return self::$main_types;
	}

	/**
	 * The post types in query vars: null for any.
	 *
	 * @param array $query_vars Query vars.
	 * @return string[]|null
	 */
	public static function types_of( array $query_vars ): ?array {
		$types = array_values( array_filter( (array) ( $query_vars['post_type'] ?? 'post' ) ) );

		return ! $types || in_array( 'any', $types, true ) ? null : $types;
	}

	/**
	 * The post types a main query lists: its own, its taxonomy's (an
	 * archive's), or posts (the blog). Null for any (a search).
	 *
	 * @param WP_Query $query Query.
	 * @return string[]|null
	 */
	private static function post_types( WP_Query $query ): ?array {
		$types = array_filter( (array) $query->get( 'post_type' ) );

		if ( $types ) {
			return in_array( 'any', $types, true ) ? null : array_values( $types );
		}

		if ( $query->is_search() ) {
			return null;
		}

		if ( $query->is_category() || $query->is_tag() || $query->is_tax() ) {
			$types = [];

			foreach ( (array) ( $query->tax_query->queried_terms ?? [] ) as $taxonomy => $terms ) {
				$types = array_merge( $types, (array) ( get_taxonomy( (string) $taxonomy )->object_type ?? [] ) );
			}

			return $types ? array_values( array_unique( $types ) ) : null;
		}

		return [ 'post' ];
	}

	/**
	 * Apply the request's selections to the listing's Query Loop.
	 *
	 * @param array          $query Query vars.
	 * @param \WP_Block|null $block The block building them (the post template, or a filter).
	 * @return array
	 */
	public static function loop( array $query, $block = null ): array {
		$listing = Filters::listing();

		if ( null === $listing || $listing->inherit || ! $block instanceof \WP_Block || (int) ( $block->context['queryId'] ?? -1 ) !== $listing->query_id ) {
			return $query;
		}

		$query = self::apply( $query, self::$except, self::types_of( $query ) );

		// The loop's own query (not a filter counting its options).
		if ( null === self::$except ) {
			self::$listing_vars = $query;
		}

		return $query;
	}

	/**
	 * Query vars with the request's selections applied, for every registered
	 * source (but one) for the query's post types: a post's category filter
	 * and a product's can share a parameter name.
	 *
	 * @param array         $query_vars WP_Query vars.
	 * @param string|null   $except     Source key to leave out.
	 * @param string[]|null $post_types The query's post types; null for any.
	 * @return array
	 */
	public static function apply( array $query_vars, ?string $except = null, ?array $post_types = null ): array {
		if ( self::ALL === $except ) {
			return $query_vars;
		}

		$request = Request::params();

		foreach ( Sources::all() as $key => $source ) {
			if ( $key === $except || ( null !== $post_types && ! array_intersect( $source->post_types(), $post_types ) ) ) {
				continue;
			}

			$selected = $source->selected( $request );

			if ( self::is_empty( $selected ) ) {
				continue;
			}

			$query_vars = $source->apply( $query_vars, $selected );
		}

		return $query_vars;
	}

	/**
	 * Whether a selection chooses nothing.
	 *
	 * @param array $selected Selection.
	 * @return bool
	 */
	public static function is_empty( array $selected ): bool {
		return empty( $selected['values'] ) && null === ( $selected['min'] ?? null ) && null === ( $selected['max'] ?? null );
	}

	/**
	 * Build a query's vars while leaving a source out (or all of them: ALL).
	 *
	 * @param string|null $except Source key, or ALL.
	 * @param callable    $build  Builds the vars.
	 * @return array
	 */
	public static function building( ?string $except, callable $build ): array {
		$previous     = self::$except;
		self::$except = $except;

		try {
			return (array) $build();
		} finally {
			self::$except = $previous;
		}
	}

	/**
	 * The main query's vars before filters were applied (the current main
	 * query's when there were none).
	 *
	 * @return array
	 */
	public static function main_vars(): array {
		return self::$main_vars ?? (array) ( $GLOBALS['wp_query']->query_vars ?? [] );
	}

	/**
	 * Note the listing's results when its Query Loop's query runs.
	 *
	 * @param array    $posts Posts.
	 * @param WP_Query $query Query.
	 * @return array
	 */
	public static function results( $posts, $query ) {
		$listing = Filters::listing();

		if ( null !== $listing && null !== self::$listing_vars && $query instanceof WP_Query && $query->query == self::$listing_vars ) { // phpcs:ignore Universal.Operators.StrictComparisons.LooseEqual -- Same vars, however their numbers are typed.
			$listing->set_results( (int) $query->found_posts, (int) $query->get( 'posts_per_page' ), (int) max( 1, $query->get( 'paged' ) ) );
			Filters::results_state( $listing );
			self::$listing_vars = null;
		}

		return $posts;
	}

	/**
	 * Forget the request's state (tests).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$main_vars    = null;
		self::$main_types   = null;
		self::$except       = null;
		self::$listing_vars = null;
	}
}
