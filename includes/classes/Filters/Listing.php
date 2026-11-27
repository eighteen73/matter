<?php
/**
 * A filterable listing: a query block with a `matter/filters` block inside
 * (one per page). Found as the query block starts rendering (Filters), so
 * every block inside knows its filters and their selection, whichever
 * renders first.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * A filterable listing.
 */
final class Listing {

	/**
	 * The query's results once known: total, per page and page.
	 *
	 * @var array{total: int, per_page: int, page: int}|null
	 */
	private ?array $results = null;

	/**
	 * Filter IDs handed out so far, per source key (see next_filter()).
	 *
	 * @var array<string, int>
	 */
	private array $handed_out = [];

	/**
	 * Each choice filter's options (values), by filter ID, as rendered.
	 *
	 * @var array<string, string[]>
	 */
	private array $options = [];

	/**
	 * A filter block inside the query (with its context), once one renders.
	 *
	 * @var WP_Block|null
	 */
	private ?WP_Block $block = null;

	/**
	 * Constructor.
	 *
	 * @param int    $query_id   The query block's `queryId`.
	 * @param string $block_name The query block's name.
	 * @param bool   $inherit    Whether it lists the main query (an archive).
	 * @param array  $filters    Its filter blocks, by ID: each `source` (key) and `settings`.
	 * @param array  $panel      Its filters block's panel: `collapse_below` (a breakpoint, `''`
	 *                           for always a drawer, null for never), `position`, `label`.
	 */
	public function __construct(
		public readonly int $query_id,
		public readonly string $block_name,
		public readonly bool $inherit,
		public readonly array $filters,
		public readonly array $panel = []
	) {}

	/**
	 * The filters block's panel ID, which its toggle opens.
	 *
	 * @return string
	 */
	public function panel_id(): string {
		return 'filters-' . $this->query_id;
	}

	/**
	 * The listing's key in the store's state.
	 *
	 * @return string
	 */
	public function key(): string {
		return (string) $this->query_id;
	}

	/**
	 * The ID of the next filter block of a source, in the order they render
	 * (the order they were found in): `taxonomy-category`, then
	 * `taxonomy-category-2` for a second.
	 *
	 * @param string $source Source key.
	 * @return string
	 */
	public function next_filter( string $source ): string {
		$this->handed_out[ $source ] = ( $this->handed_out[ $source ] ?? 0 ) + 1;

		return self::filter_id( $source, $this->handed_out[ $source ] );
	}

	/**
	 * A filter block's ID from its source and its number among that source's.
	 *
	 * @param string $source Source key.
	 * @param int    $number 1 for the first.
	 * @return string
	 */
	public static function filter_id( string $source, int $number ): string {
		$id = sanitize_key( str_replace( ':', '-', $source ) );

		return $number > 1 ? "{$id}-{$number}" : $id;
	}

	/**
	 * Each of its filters' current selection, by filter ID (sources that
	 * aren't registered left out).
	 *
	 * @return array<string, array{source: Source, settings: array, selected: array}>
	 */
	public function selections(): array {
		$selections = [];

		foreach ( $this->filters as $id => $filter ) {
			$source = Sources::get( (string) $filter['source'] );

			if ( $source ) {
				$selections[ $id ] = [
					'source'   => $source,
					'settings' => (array) $filter['settings'],
					'selected' => $source->selected( Request::params() ),
				];
			}
		}

		return $selections;
	}

	/**
	 * The listing's query vars, with every filter applied (but one, for
	 * counting that one's options).
	 *
	 * @param WP_Block    $block  A block inside the query (with its context).
	 * @param string|null $except Source key to leave out.
	 * @return array
	 */
	public function query_vars( WP_Block $block, ?string $except = null ): array {
		if ( $this->inherit ) {
			return Query::apply( Query::main_vars(), $except, Query::main_post_types() );
		}

		return Query::building( $except, fn() => build_query_vars_from_query_block( $block, 1 ) );
	}

	/**
	 * Note a filter as it renders: its options' values (none for a range) and
	 * the block, which has the query's context.
	 *
	 * @param string   $id     Filter ID.
	 * @param string[] $values Option values.
	 * @param WP_Block $block  The filter block.
	 * @return void
	 */
	public function note_filter( string $id, array $values, WP_Block $block ): void {
		$this->options[ $id ] = array_values( array_map( 'strval', $values ) );
		$this->block        ??= $block;
	}

	/**
	 * Each choice filter's options' values, by filter ID, as rendered.
	 *
	 * @return array<string, string[]>
	 */
	public function options(): array {
		return $this->options;
	}

	/**
	 * A block inside the query, with its context, once a filter has rendered.
	 *
	 * @return WP_Block|null
	 */
	public function block(): ?WP_Block {
		return $this->block;
	}

	/**
	 * The listing's query vars without any filter, on its first page: what a
	 * results provider adds the filters' clauses to. Null before a filter
	 * has rendered (no block to build them from).
	 *
	 * @return array|null
	 */
	public function base_query_vars(): ?array {
		if ( null === $this->block ) {
			return null;
		}

		$block = $this->block;
		$vars  = $this->inherit
			? Query::main_vars()
			: Query::building( Query::ALL, fn() => build_query_vars_from_query_block( $block, 1 ) );

		/**
		 * Filters a listing's query vars without filters, for query blocks
		 * that build theirs differently (the WooCommerce integration's
		 * Product Collection).
		 *
		 * @param array    $vars    Query vars.
		 * @param Listing  $listing Listing.
		 * @param WP_Block $block   A block inside its query.
		 */
		$vars = (array) apply_filters( 'matter_filters_base_query_vars', $vars, $this, $block );

		// Every source's parameters (some arrive as query vars), and paging,
		// but not a sort's: its parameter (WooCommerce's `orderby`) is the
		// query's own order, which the listing keeps.
		$sorts = [];

		foreach ( Sources::all() as $source ) {
			if ( 'sort' === $source->kind() ) {
				$sorts = array_merge( $sorts, array_values( $source->params() ) );
			}
		}

		foreach ( array_diff( array_merge( Sources::params(), Sources::query_param_names(), [ 'paged', 'page', 'offset' ] ), $sorts ) as $param ) {
			unset( $vars[ $param ] );
		}

		return $vars;
	}

	/**
	 * The parameter that pages the listing: `paged` for an archive's,
	 * `query-{id}-page` for a Query Loop's, or the query block's own.
	 *
	 * @return string
	 */
	public function page_param(): string {
		if ( $this->inherit ) {
			return 'paged';
		}

		/**
		 * Filters the parameter that pages a listing (the WooCommerce
		 * integration's Product Collection: `product-page`).
		 *
		 * @param string  $param   Parameter.
		 * @param Listing $listing Listing.
		 */
		return (string) apply_filters( 'matter_filters_page_param', "query-{$this->query_id}-page", $this );
	}

	/**
	 * Note the query's results.
	 *
	 * @param int $total    Results in all.
	 * @param int $per_page Per page.
	 * @param int $page     Current page.
	 * @return void
	 */
	public function set_results( int $total, int $per_page, int $page ): void {
		$this->results = [
			'total'    => max( 0, $total ),
			'per_page' => max( 1, $per_page ),
			'page'     => max( 1, $page ),
		];
	}

	/**
	 * The query's results, once known.
	 *
	 * @return array{total: int, per_page: int, page: int}|null
	 */
	public function results(): ?array {
		return $this->results;
	}

	/**
	 * Where a change of filters goes: this page, without its filter or page
	 * parameters (filtering starts again from the first page).
	 *
	 * @return string
	 */
	public function base_url(): string {
		$url = Request::url();

		// A pretty paged URL (`/page/2/`) starts again from the first page.
		$url = (string) preg_replace( '#/page/\d+/?(?=\?|$)#', '/', $url );

		return remove_query_arg( array_merge( Sources::params(), Sources::query_param_names(), Request::paging_params() ), $url );
	}
}
