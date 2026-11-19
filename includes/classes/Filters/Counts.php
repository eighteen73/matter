<?php
/**
 * Term counts for a filter: how many of a listing's results each term has.
 *
 * The listing's query (its vars, with the other filters applied) is turned
 * into SQL without running it, and the terms are counted over it in one
 * grouped query, so no list of IDs passes through PHP. A parent term counts
 * the results of its children too, as a term archive lists them.
 *
 * `matter_pre_filter_counts` answers first when it returns an array (Seek,
 * from Meilisearch facets). Results are kept in the object cache until a post
 * or term changes.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

use WP_Query;

defined( 'ABSPATH' ) || exit;

/**
 * Term counts.
 */
final class Counts {

	/**
	 * Cache group.
	 */
	private const GROUP = 'matter_filter_counts';

	/**
	 * Counts per term ID of a taxonomy, over a query's results.
	 *
	 * @param array  $query_vars WP_Query vars.
	 * @param string $taxonomy   Taxonomy.
	 * @return array<int, int> Term ID => count (terms with none left out).
	 */
	public static function terms( array $query_vars, string $taxonomy ): array {
		/**
		 * Short-circuits a filter's term counts: return term ID => count to
		 * use instead of counting in the database.
		 *
		 * @param array<int, int>|null $counts     Counts, or null to count.
		 * @param string               $taxonomy   Taxonomy.
		 * @param array                $query_vars The listing's WP_Query vars, with
		 *                                         the other filters applied.
		 */
		$counts = apply_filters( 'matter_pre_filter_counts', null, $taxonomy, $query_vars );

		if ( is_array( $counts ) ) {
			return array_map( 'intval', $counts );
		}

		$sql = self::sql( $query_vars );

		if ( '' === $sql ) {
			return [];
		}

		$key   = md5( $taxonomy . '|' . $sql ) . ':' . wp_cache_get_last_changed( 'posts' ) . ':' . wp_cache_get_last_changed( 'terms' );
		$found = false;
		$cache = wp_cache_get( $key, self::GROUP, false, $found );

		if ( $found && is_array( $cache ) ) {
			return $cache;
		}

		$counts = is_taxonomy_hierarchical( $taxonomy )
			? self::hierarchical( $sql, $taxonomy )
			: self::flat( $sql, $taxonomy );

		wp_cache_set( $key, $counts, self::GROUP, DAY_IN_SECONDS );

		return $counts;
	}

	/**
	 * Counts for a taxonomy whose terms have no children.
	 *
	 * @param string $sql      The query's IDs, as SQL.
	 * @param string $taxonomy Taxonomy.
	 * @return array<int, int>
	 */
	private static function flat( string $sql, string $taxonomy ): array {
		global $wpdb;

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery -- $sql is WP_Query's own; cached above.
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT tt.term_id, COUNT( DISTINCT tr.object_id ) AS count
				FROM {$wpdb->term_relationships} tr
				INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
				WHERE tt.taxonomy = %s AND tr.object_id IN ( {$sql} )
				GROUP BY tt.term_id",
				$taxonomy
			)
		);
		// phpcs:enable

		$counts = [];

		foreach ( (array) $rows as $row ) {
			$counts[ (int) $row->term_id ] = (int) $row->count;
		}

		return $counts;
	}

	/**
	 * Counts for a hierarchical taxonomy: each term's results and its
	 * descendants', each result counted once.
	 *
	 * @param string $sql      The query's IDs, as SQL.
	 * @param string $taxonomy Taxonomy.
	 * @return array<int, int>
	 */
	private static function hierarchical( string $sql, string $taxonomy ): array {
		global $wpdb;

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery -- $sql is WP_Query's own; cached by the caller.
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT DISTINCT tt.term_id, tr.object_id
				FROM {$wpdb->term_relationships} tr
				INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
				WHERE tt.taxonomy = %s AND tr.object_id IN ( {$sql} )",
				$taxonomy
			)
		);
		// phpcs:enable

		$objects = [];

		foreach ( (array) $rows as $row ) {
			$term_id = (int) $row->term_id;

			foreach ( [ $term_id, ...get_ancestors( $term_id, $taxonomy, 'taxonomy' ) ] as $id ) {
				$objects[ $id ][ (int) $row->object_id ] = true;
			}
		}

		return array_map( 'count', $objects );
	}

	/**
	 * A query's IDs as SQL, without running it: every result, unpaged.
	 *
	 * @param array $query_vars WP_Query vars.
	 * @return string Empty when the query can't be built.
	 */
	public static function sql( array $query_vars ): string {
		$query_vars = array_merge(
			$query_vars,
			[
				'fields'                 => 'ids',
				'posts_per_page'         => -1,
				'nopaging'               => true,
				'paged'                  => 1,
				'offset'                 => 0,
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
				'suppress_filters'       => false,
				'orderby'                => 'none',
			]
		);

		// Build the SQL, then stop before it runs.
		$skip = fn( $posts, $query ) => $query instanceof WP_Query && $query->get( 'matter_counting' ) ? [] : $posts;

		add_filter( 'posts_pre_query', $skip, PHP_INT_MAX, 2 );

		$query = new WP_Query(
			[
				...$query_vars,
				'matter_counting' => true,
			]
		);

		remove_filter( 'posts_pre_query', $skip, PHP_INT_MAX );

		$sql = (string) $query->request;

		// Only a single SELECT of IDs can be a subquery.
		return preg_match( '/^\s*SELECT\b/i', $sql ) && ! str_contains( $sql, ';' ) ? $sql : '';
	}
}
