<?php
/**
 * Filters: blocks that filter a listing, replacing FacetWP.
 *
 * A listing is a query block (a Query Loop, or what an integration adds,
 * e.g. WooCommerce's Product Collection) with a `matter/filters` block inside:
 * one per page. As the query block starts rendering, its filter blocks are
 * read (so the toggle, active filters and results count know them, whichever
 * renders first) and its client-side navigation is turned on, so the query
 * block is the one region the Interactivity router updates.
 *
 * The filter state is the URL (each source's parameters; see Source), so the
 * server renders any filtered listing the same however it's reached. In the
 * browser the `matter/filters` store builds that URL and navigates to it with
 * the Interactivity router, or with a faster results provider when one is
 * registered (src/filters/view.js).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

use Eighteen73\Matter\Singleton;
use Eighteen73\Matter\Variants;

defined( 'ABSPATH' ) || exit;

/**
 * Filters.
 */
final class Filters {

	use Singleton;

	/**
	 * The store's namespace.
	 */
	public const STORE = 'matter/filters';

	/**
	 * Core's query blocks that can be filtered, and the attributes that turn
	 * on their client-side navigation. Integrations add theirs (see
	 * query_blocks()).
	 */
	private const QUERY_BLOCKS = [
		'core/query' => [ 'enhancedPagination' => true ],
	];

	/**
	 * Listings rendering (innermost last).
	 *
	 * @var Listing[]
	 */
	private static array $listings = [];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		// Before WordPress reads the request's query vars.
		add_action( 'wp_loaded', [ Request::class, 'normalise' ] );
		add_action( 'pre_get_posts', [ Query::class, 'main' ] );
		// After WooCommerce's Product Collection builds its query (10).
		add_filter( 'query_loop_block_query_vars', [ Query::class, 'loop' ], 20, 2 );
		add_filter( 'the_posts', [ Query::class, 'results' ], 10, 2 );

		// Before core checks the query's blocks can navigate client-side (10).
		add_filter( 'render_block_data', [ $this, 'navigable' ], 4, 3 );
		add_filter( 'render_block_data', [ $this, 'start' ], 5 );
		add_filter( 'render_block', [ $this, 'finish' ], 10, 2 );
		add_filter( 'register_block_type_args', [ $this, 'block_args' ], 10, 2 );
		add_filter( 'block_categories_all', [ self::class, 'category' ] );
	}

	/**
	 * Query blocks that can be filtered, and the attributes that turn on
	 * their client-side navigation.
	 *
	 * @return array<string, array<string, mixed>> Block name => attributes.
	 */
	public static function query_blocks(): array {
		/**
		 * Filters the query blocks a `matter/filters` block can filter, and
		 * the attributes that make each navigate without a page load (the
		 * WooCommerce integration adds the Product Collection, with
		 * `forcePageReload: false`).
		 *
		 * @param array<string, array<string, mixed>> $blocks Block name => attributes.
		 */
		return (array) apply_filters( 'matter_filterable_query_blocks', self::QUERY_BLOCKS );
	}

	/**
	 * The listing rendering, if any.
	 *
	 * @return Listing|null
	 */
	public static function listing(): ?Listing {
		return self::$listings ? end( self::$listings ) : null;
	}

	/**
	 * Turn on client-side navigation for the filterable query blocks inside a
	 * top-level block, before WordPress builds its inner blocks.
	 *
	 * start() does it too, as the query block renders, but too late for one
	 * inside another block: WordPress builds an inner block (reading its
	 * attributes, for the context it provides) before filtering its data, and
	 * doesn't read them again after (WP_Block::refresh_parsed_block_dependents()
	 * keeps them). So a nested query's `enhancedPagination` would stay false,
	 * and every filter click reload the page.
	 *
	 * @param array          $parsed_block Parsed block.
	 * @param array          $source_block The block before filtering.
	 * @param \WP_Block|null $parent_block Its parent, if any.
	 * @return array
	 */
	public function navigable( array $parsed_block, $source_block = [], $parent_block = null ): array {
		if ( null !== $parent_block || empty( $parsed_block['innerBlocks'] ) ) {
			return $parsed_block;
		}

		$parsed_block['innerBlocks'] = self::with_navigation( $parsed_block['innerBlocks'], self::query_blocks() );

		return $parsed_block;
	}

	/**
	 * Blocks, with client-side navigation turned on for the filterable query
	 * blocks among them (at any depth) that have filters inside.
	 *
	 * @param array $blocks Parsed blocks.
	 * @param array $query_blocks Query block name => attributes turning it on.
	 * @return array
	 */
	private static function with_navigation( array $blocks, array $query_blocks ): array {
		foreach ( $blocks as $index => $block ) {
			$name = (string) ( $block['blockName'] ?? '' );

			if ( isset( $query_blocks[ $name ], $block['attrs']['queryId'] ) && self::find( $block['innerBlocks'] ?? [], 'matter/filters' ) ) {
				$blocks[ $index ]['attrs'] = array_replace_recursive( (array) $block['attrs'], (array) $query_blocks[ $name ] );
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				$blocks[ $index ]['innerBlocks'] = self::with_navigation( $block['innerBlocks'], $query_blocks );
			}
		}

		return $blocks;
	}

	/**
	 * A query block with filters inside starts rendering: note its listing
	 * and turn on its client-side navigation.
	 *
	 * @param array $parsed_block Parsed block.
	 * @return array
	 */
	public function start( array $parsed_block ): array {
		$name   = (string) ( $parsed_block['blockName'] ?? '' );
		$blocks = self::query_blocks();

		if ( ! isset( $blocks[ $name ], $parsed_block['attrs']['queryId'] ) || ! self::find( $parsed_block['innerBlocks'] ?? [], 'matter/filters' ) ) {
			return $parsed_block;
		}

		$parsed_block['attrs'] = array_replace_recursive( $parsed_block['attrs'], (array) $blocks[ $name ] );

		$filters = [];
		$numbers = [];

		foreach ( self::find( $parsed_block['innerBlocks'], 'matter/filter' ) as $filter ) {
			$source             = (string) ( $filter['attrs']['source'] ?? '' );
			$numbers[ $source ] = ( $numbers[ $source ] ?? 0 ) + 1;

			$filters[ Listing::filter_id( $source, $numbers[ $source ] ) ] = [
				'source'   => $source,
				'settings' => [ 'operator' => 'and' === ( $filter['attrs']['operator'] ?? '' ) ? 'and' : 'or' ],
			];
		}

		$listing = new Listing(
			(int) $parsed_block['attrs']['queryId'],
			$name,
			! empty( $parsed_block['attrs']['query']['inherit'] ),
			$filters,
			self::panel( (array) ( self::find( $parsed_block['innerBlocks'], 'matter/filters' )[0]['attrs'] ?? [] ) )
		);

		if ( $listing->inherit && isset( $GLOBALS['wp_query'] ) ) {
			$main = $GLOBALS['wp_query'];
			$listing->set_results( (int) $main->found_posts, (int) $main->get( 'posts_per_page' ), (int) max( 1, $main->get( 'paged' ) ) );
		}

		self::$listings[] = $listing;
		self::register_state( $listing );
		self::results_state( $listing );

		return $parsed_block;
	}

	/**
	 * A filters block's panel, from its variant: `collapse_below` (a
	 * breakpoint below which it's a drawer; `''` for always a drawer; null for
	 * never), `position`, `label` and `layout` (inline: `sidebar` or `bar`).
	 *
	 * @param array $attributes The filters block's attributes.
	 * @return array{collapse_below: string|null, position: string, label: string, layout: string}
	 */
	public static function panel( array $attributes ): array {
		$options  = Variants::get( 'matter/filters', $attributes );
		$collapse = $options['collapseBelow'] ?? 'lg';
		$label    = trim( (string) ( $attributes['label'] ?? '' ) );

		return [
			'collapse_below' => false === $collapse || 'never' === $collapse ? null : (string) $collapse,
			'position'       => in_array( $options['position'] ?? '', [ 'start', 'end' ], true ) ? $options['position'] : 'start',
			'label'          => '' !== $label ? $label : __( 'Filters', 'matter' ),
			'layout'         => 'bar' === ( $options['layout'] ?? '' ) ? 'bar' : 'sidebar',
		];
	}

	/**
	 * The listing's query block has rendered.
	 *
	 * @param string $content Rendered block.
	 * @param array  $block   Parsed block.
	 * @return string
	 */
	public function finish( string $content, array $block ): string {
		$listing = self::listing();

		if ( null !== $listing && ( $block['blockName'] ?? '' ) === $listing->block_name && (int) ( $block['attrs']['queryId'] ?? -1 ) === $listing->query_id ) {
			// Results its query didn't report (a query built elsewhere): count
			// them, before the directives showing them are processed.
			if ( null === $listing->results() ) {
				self::count_results( $listing, $block );
			}

			/**
			 * Fires when a listing's query block has rendered: its filters,
			 * options and results are known (e.g. for a results provider's
			 * configuration).
			 *
			 * @param Listing $listing Listing.
			 */
			do_action( 'matter_filters_listing', $listing );

			array_pop( self::$listings );
		}

		return $content;
	}

	/**
	 * Count a listing's results with a query of its own.
	 *
	 * @param Listing $listing Listing.
	 * @param array   $block   The query block, parsed.
	 * @return void
	 */
	private static function count_results( Listing $listing, array $block ): void {
		$inside = new \WP_Block(
			[ 'blockName' => 'matter/results-count' ],
			[
				'queryId' => $listing->query_id,
				'query'   => (array) ( $block['attrs']['query'] ?? [] ),
			]
		);
		$vars   = $listing->query_vars( $inside );
		$query  = new \WP_Query(
			array_merge(
				$vars,
				[
					'fields'                 => 'ids',
					'posts_per_page'         => 1,
					'no_found_rows'          => false,
					'update_post_meta_cache' => false,
					'update_post_term_cache' => false,
				]
			)
		);

		$listing->set_results( (int) $query->found_posts, (int) ( $vars['posts_per_page'] ?? get_option( 'posts_per_page' ) ), (int) max( 1, $vars['paged'] ?? 1 ) );
		self::results_state( $listing );
	}

	/**
	 * Blocks of a name among parsed blocks, at any depth.
	 *
	 * @param array  $blocks Parsed blocks.
	 * @param string $name   Block name.
	 * @return array[]
	 */
	public static function find( array $blocks, string $name ): array {
		$found = [];

		foreach ( $blocks as $block ) {
			if ( ( $block['blockName'] ?? '' ) === $name ) {
				$found[] = $block;
			}

			$found = array_merge( $found, self::find( $block['innerBlocks'] ?? [], $name ) );
		}

		return $found;
	}

	/**
	 * The listing's state: its URL without filters, each filter's selection
	 * (and its source's parameters, so the store builds URLs), the chosen
	 * options' names (for the active filters) and, once the query has run,
	 * its results.
	 *
	 * @param Listing $listing Listing.
	 * @return void
	 */
	private static function register_state( Listing $listing ): void {
		$filters = [];

		foreach ( $listing->selections() as $id => $selection ) {
			$source = $selection['source'];
			$labels = [];

			foreach ( $source->chips( $selection['selected'] ) as $chip ) {
				$labels[ $chip['value'] ] = $chip['label'];
			}

			$filters[ $id ] = [
				'kind'     => $source->kind(),
				'label'    => $source->label(),
				'params'   => $source->params(),
				'operator' => $selection['settings']['operator'],
				'values'   => array_values( (array) ( $selection['selected']['values'] ?? [] ) ),
				'min'      => $selection['selected']['min'] ?? null,
				'max'      => $selection['selected']['max'] ?? null,
				'labels'   => (object) $labels,
				'counts'   => (object) [],
			];

			// A range's chip worded in the browser (a provider's results).
			if ( 'range' === $source->kind() && method_exists( $source, 'range_labels' ) ) {
				$filters[ $id ]['rangeLabels'] = $source->range_labels();
			}
		}

		wp_interactivity_state(
			self::STORE,
			[
				'listings' => [
					$listing->key() => [
						'baseUrl' => $listing->base_url(),
						'filters' => $filters,
					],
				],
			]
		);

		wp_interactivity_state( self::STORE, State::derived() );
		wp_interactivity_config(
			self::STORE,
			[
				/* translators: %s: an active filter, e.g. "News". */
				'removeText' => __( 'Remove %s', 'matter' ),
				// For results a provider shows (resultsState() in the store).
				'texts'      => self::texts(),
			]
		);
	}

	/**
	 * Note the listing's results in its state, with the words for them.
	 *
	 * @param Listing $listing Listing.
	 * @return void
	 */
	public static function results_state( Listing $listing ): void {
		$results = $listing->results();

		if ( null === $results ) {
			return;
		}

		$first = ( $results['page'] - 1 ) * $results['per_page'] + 1;
		$last  = min( $results['total'], $results['page'] * $results['per_page'] );

		wp_interactivity_state(
			self::STORE,
			[
				'listings' => [
					$listing->key() => [
						'total'       => $results['total'],
						'resultsText' => self::results_text( $results['total'], $first, $last ),
						'showText'    => 0 === $results['total']
							? __( 'No results', 'matter' )
							/* translators: %s: number of results. */
							: sprintf( _n( 'Show %s result', 'Show %s results', $results['total'], 'matter' ), number_format_i18n( $results['total'] ) ),
					],
				],
			]
		);
	}

	/**
	 * The results' words, for the store to say them for a provider's results
	 * as results_state() does: each plural one as its singular (`one`) and
	 * plural (`other`) forms.
	 *
	 * @return array
	 */
	private static function texts(): array {
		return [
			'none'    => __( 'No results', 'matter' ),
			'all'     => [
				/* translators: %s: number of results. */
				'one'   => _n( '%s result', '%s results', 1, 'matter' ),
				/* translators: %s: number of results. */
				'other' => _n( '%s result', '%s results', 2, 'matter' ),
			],
			'showing' => [
				/* translators: 1: first result shown, 2: last result shown, 3: number of results. */
				'one'   => _n( 'Showing %1$s–%2$s of %3$s result', 'Showing %1$s–%2$s of %3$s results', 1, 'matter' ),
				/* translators: 1: first result shown, 2: last result shown, 3: number of results. */
				'other' => _n( 'Showing %1$s–%2$s of %3$s result', 'Showing %1$s–%2$s of %3$s results', 2, 'matter' ),
			],
			'show'    => [
				/* translators: %s: number of results. */
				'one'   => _n( 'Show %s result', 'Show %s results', 1, 'matter' ),
				/* translators: %s: number of results. */
				'other' => _n( 'Show %s result', 'Show %s results', 2, 'matter' ),
			],
		];
	}

	/**
	 * "Showing 1–12 of 48 results", "48 results" (all on one page), or "No
	 * results".
	 *
	 * @param int $total Results in all.
	 * @param int $first The first on this page.
	 * @param int $last  The last on this page.
	 * @return string
	 */
	public static function results_text( int $total, int $first, int $last ): string {
		if ( 0 === $total ) {
			return __( 'No results', 'matter' );
		}

		if ( 1 === $first && $last >= $total ) {
			/* translators: %s: number of results. */
			return sprintf( _n( '%s result', '%s results', $total, 'matter' ), number_format_i18n( $total ) );
		}

		return sprintf(
			/* translators: 1: first result shown, 2: last result shown, 3: number of results. */
			_n( 'Showing %1$s–%2$s of %3$s result', 'Showing %1$s–%2$s of %3$s results', $total, 'matter' ),
			number_format_i18n( $first ),
			number_format_i18n( $last ),
			number_format_i18n( $total )
		);
	}

	/**
	 * The filter blocks go only inside a filterable query block.
	 *
	 * @param array  $args       Block type args.
	 * @param string $block_name Block name.
	 * @return array
	 */
	public function block_args( array $args, string $block_name ): array {
		if ( in_array( $block_name, [ 'matter/filters', 'matter/filters-toggle', 'matter/active-filters', 'matter/results-count' ], true ) ) {
			$args['ancestor'] = array_keys( self::query_blocks() );
		}

		// A variation per source: "Category filter", "Colour filter"…, so a new
		// taxonomy or attribute is in the inserter by itself.
		if ( 'matter/filter' === $block_name ) {
			$args['variation_callback'] = [ self::class, 'variations' ];
		}

		return $args;
	}

	/**
	 * A "Filters" category for the filter blocks, after core's Theme: the
	 * inserter lists them together, and first inside a listing's filters.
	 *
	 * @param array<int, array<string, mixed>> $categories Block categories.
	 * @return array<int, array<string, mixed>>
	 */
	public static function category( array $categories ): array {
		if ( in_array( 'matter-filters', array_column( $categories, 'slug' ), true ) ) {
			return $categories;
		}

		$category = [
			'slug'  => 'matter-filters',
			'title' => __( 'Filters', 'matter' ),
			'icon'  => null,
		];
		$after    = array_search( 'theme', array_column( $categories, 'slug' ), true );

		if ( false === $after ) {
			$categories[] = $category;

			return $categories;
		}

		array_splice( $categories, (int) $after + 1, 0, [ $category ] );

		return $categories;
	}

	/**
	 * The filter block's variations: one per source ("Category filter"). Two
	 * sources with one name (a post's category and a product's) are told
	 * apart by what they list: "Category filter (Products)".
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function variations(): array {
		$sources    = Sources::all();
		$labels     = array_count_values( array_map( fn( Source $source ) => $source->label(), $sources ) );
		$variations = [];

		foreach ( $sources as $key => $source ) {
			$label = $source->label();
			/* translators: %s: what's filtered by, e.g. "Category". */
			$title = sprintf( __( '%s filter', 'matter' ), $label );

			if ( $labels[ $label ] > 1 ) {
				$type  = get_post_type_object( (string) ( $source->post_types()[0] ?? '' ) );
				$title = $type
					/* translators: 1: what's filtered by, e.g. "Category"; 2: what's listed, e.g. "Products". */
					? sprintf( __( '%1$s filter (%2$s)', 'matter' ), $label, $type->labels->name )
					: $title;
			}

			$variations[] = [
				'name'       => sanitize_key( str_replace( ':', '-', $key ) ),
				'title'      => $title,
				'attributes' => [
					'source'  => $key,
					'display' => self::default_display( $source ),
				],
				'isActive'   => [ 'source' ],
				// Inserter only: "Filter by" changes a filter's source.
				'scope'      => [ 'inserter' ],
			];
		}

		return $variations;
	}

	/**
	 * How a source's filter shows when inserted: its own default, else a
	 * range for a range and checkboxes for a choice.
	 *
	 * @param Source $source Source.
	 * @return string
	 */
	private static function default_display( Source $source ): string {
		if ( method_exists( $source, 'default_display' ) ) {
			return (string) $source->default_display();
		}

		return 'range' === $source->kind() ? 'range' : 'checkboxes';
	}

	/**
	 * The sources, for the filter block's editor: each `key`, `label`, `kind`,
	 * its default `display`, the `postTypes` it's for (a listing offers those
	 * for its own), its
	 * `icon`, `examples` to preview it with, and `ordered` for one whose
	 * values are (ratings: stars, "& up").
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function editor_sources(): array {
		$sources = [];

		foreach ( Sources::all() as $key => $source ) {
			$sources[] = array_filter(
				[
					'key'       => $key,
					'label'     => $source->label(),
					'kind'      => $source->kind(),
					'display'   => self::default_display( $source ),
					'postTypes' => $source->post_types(),
					'icon'      => method_exists( $source, 'icon' ) ? (string) $source->icon() : null,
					'examples'  => method_exists( $source, 'examples' ) ? (array) $source->examples() : null,
					// Ordered values (ratings): stars, and "4 & up".
					'ordered'   => method_exists( $source, 'ordered' ) && $source->ordered() ? true : null,
				]
			);
		}

		usort( $sources, fn( $a, $b ) => strcasecmp( $a['label'], $b['label'] ) );

		return $sources;
	}
}
