<?php
/**
 * Filters: a listing's URL parameters filter its query, and its filters show
 * counts, active filters and results.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Filters\Counts;
use Eighteen73\Matter\Filters\Listing;
use Eighteen73\Matter\Filters\Source;
use Eighteen73\Matter\Filters\Query;
use Eighteen73\Matter\Filters\Request;
use Eighteen73\Matter\Filters\Sources;
use Eighteen73\Matter\Filters\TaxonomySource;

/**
 * Filters tests.
 */
class FiltersTest extends TestCase {

	/**
	 * Term IDs by slug.
	 *
	 * @var array<string, int>
	 */
	private array $terms = [];

	/**
	 * Posts: two news (one featured), one event, one workshop (an event's
	 * child), one uncategorised.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		$_GET = [];
		Query::reset();
		Sources::flush();

		$news     = self::factory()->category->create( [ 'slug' => 'news', 'name' => 'News' ] );
		$events   = self::factory()->category->create( [ 'slug' => 'events', 'name' => 'Events' ] );
		$workshop = self::factory()->category->create( [ 'slug' => 'workshops', 'name' => 'Workshops', 'parent' => $events ] );
		$featured = self::factory()->tag->create( [ 'slug' => 'featured', 'name' => 'Featured' ] );

		$this->terms = compact( 'news', 'events', 'workshop', 'featured' );

		$post = fn( string $title, array $categories, array $tags = [] ) => self::factory()->post->create(
			[
				'post_title'    => $title,
				'post_category' => $categories,
				'tags_input'    => $tags,
			]
		);

		$post( 'Story one', [ $news ], [ 'featured' ] );
		$post( 'Story two', [ $news ] );
		$post( 'Open day', [ $events ] );
		$post( 'Pottery class', [ $workshop ], [ 'featured' ] );
		$post( 'Odd one out', [ 1 ] );
	}

	/**
	 * Reset the request.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		$_GET = [];
		Query::reset();

		parent::tear_down();
	}

	/**
	 * A listing of posts with category and tag filters, and its results.
	 *
	 * @param string $filters Extra filter block markup.
	 * @return string
	 */
	private function listing( string $filters = '' ): string {
		return $this->render( $this->markup( $filters ) );
	}

	/**
	 * A listing's block markup (see listing()).
	 *
	 * @param string $filters Extra filter block markup.
	 * @return string
	 */
	private function markup( string $filters = '' ): string {
		return (
			'<!-- wp:query {"queryId":3,"query":{"perPage":10,"postType":"post","order":"asc","orderBy":"title","inherit":false}} --><div class="wp-block-query">'
			. '<!-- wp:matter/filters-toggle /-->'
			. '<!-- wp:matter/filters --><!-- wp:matter/filter {"source":"taxonomy:category"} /-->' . $filters . '<!-- /wp:matter/filters -->'
			. '<!-- wp:matter/active-filters /--><!-- wp:matter/results-count /-->'
			. '<!-- wp:post-template --><!-- wp:post-title /--><!-- /wp:post-template -->'
			. '</div><!-- /wp:query -->'
		);
	}

	/**
	 * The listed posts' titles, in order.
	 *
	 * @param string $html Rendered listing.
	 * @return string[]
	 */
	private function titles( string $html ): array {
		preg_match_all( '#<h2 class="wp-block-post-title">(.*?)</h2>#', $html, $matches );

		return $matches[1];
	}

	/**
	 * An option's count, as rendered.
	 *
	 * @param string $html  Rendered listing.
	 * @param string $value Option value.
	 * @return int|null Null when the option isn't there.
	 */
	private function option_count( string $html, string $value ): ?int {
		// The count follows the option's input within its label (after a
		// swatch or stars, and inside the name and count's __text wrapper).
		if ( ! preg_match( '#value="' . preg_quote( $value, '#' ) . '"[^>]*/>(?:(?!</label>).)*?<span class="wp-block-matter-filter__count"[^>]*>(\d+)</span>#s', $html, $match ) ) {
			return null;
		}

		return (int) $match[1];
	}

	/**
	 * Without a selection the listing lists everything, and turns on its
	 * client-side navigation.
	 *
	 * @return void
	 */
	public function test_unfiltered_listing(): void {
		$html = $this->listing();

		$this->assertSame( [ 'Odd one out', 'Open day', 'Pottery class', 'Story one', 'Story two' ], $this->titles( $html ) );
		$this->assertStringContainsString( 'data-wp-router-region="query-3"', $html, 'The query is the router region.' );
		$this->assertStringContainsString( '>5 results</p>', $html );
		$this->assertSame( 2, $this->option_count( $html, 'news' ) );
		$this->assertSame( 2, $this->option_count( $html, 'events' ), 'A parent counts its children\'s posts.' );
		$this->assertSame( 1, $this->option_count( $html, 'workshops' ) );
		$this->assertStringContainsString( 'action="' . esc_url( home_url( '/' ) ) . '"', $html );
		$this->assertMatchesRegularExpression( '#<div hidden class="wp-block-matter-active-filters"|<div class="wp-block-matter-active-filters"[^>]*hidden#', $html, 'No active filters: hidden.' );
	}

	/**
	 * A listing inside another block (a template's group) navigates
	 * client-side too: WordPress builds a nested block before filtering its
	 * data, so its navigation is turned on from the top-level block.
	 *
	 * @return void
	 */
	public function test_nested_listing_navigates(): void {
		$html = $this->render( '<!-- wp:group --><div class="wp-block-group">' . $this->markup() . '</div><!-- /wp:group -->' );

		$this->assertStringContainsString( 'data-wp-router-region="query-3"', $html );
	}

	/**
	 * A range's slider: its ends are the filter's state, which the router
	 * replaces with each page's, not its element's context, which the router
	 * keeps; each filter is keyed, so the router matches filters by what they
	 * are, not where they are.
	 *
	 * @return void
	 */
	public function test_slider_ends_are_state(): void {
		$range = new class() implements Source {
			// phpcs:disable Squiz.Commenting.FunctionComment.Missing -- A stand-in.
			public function key(): string {
				return 'test-range';
			}

			public function label(): string {
				return 'Size';
			}

			public function kind(): string {
				return 'range';
			}

			public function post_types(): array {
				return [ 'post' ];
			}

			public function params(): array {
				return [
					'min' => 'filter_size_min',
					'max' => 'filter_size_max',
				];
			}

			public function selected( array $request ): array {
				return [
					'min' => null,
					'max' => null,
				];
			}

			public function apply( array $query_vars, array $selected ): array {
				return $query_vars;
			}

			public function options( Listing $listing, \WP_Block $block, array $settings ): array {
				return [
					'min' => 10.0,
					'max' => 50.0,
				];
			}

			public function chips( array $selected ): array {
				return [];
			}
			// phpcs:enable
		};
		$add   = fn( Sources $sources ) => $sources->register( $range );

		add_action( 'matter_filters_sources', $add );
		Sources::flush();

		$html = $this->listing( '<!-- wp:matter/filter {"source":"test-range","slider":true} /-->' );

		remove_action( 'matter_filters_sources', $add );
		Sources::flush();

		$filter = wp_interactivity_state( 'matter/filters' )['listings']['3']['filters']['test-range'] ?? [];

		$this->assertSame(
			[
				'min' => 10.0,
				'max' => 50.0,
			],
			$filter['bounds'] ?? null
		);
		$this->assertStringContainsString( 'data-wp-bind--min="state.sliderMin"', $html );
		$this->assertMatchesRegularExpression( '/<input [^>]*\bmin="10"[^>]*type="range"/', $html, 'Its lowest end, from the state.' );
		$this->assertMatchesRegularExpression( '/<input [^>]*\bmax="50"[^>]*type="range"/', $html, 'Its highest end, from the state.' );
		$this->assertStringNotContainsString( 'bounds', (string) preg_replace( '/<script.*?<\/script>/s', '', $html ), 'Not in a context.' );
		$this->assertStringContainsString( 'data-wp-key="matter-filter-3-test-range"', $html );
		$this->assertStringContainsString( 'data-wp-key="matter-filter-3-taxonomy-category"', $html );
	}

	/**
	 * Once its query block has rendered, a listing has what a results
	 * provider needs: its options, its query without filters (or paging) and
	 * its paging parameter.
	 *
	 * @return void
	 */
	public function test_listing_for_providers(): void {
		$_GET = [
			'filter_category' => 'news',
			'query-3-page'    => '2',
		];
		$seen = null;
		$hook = function ( $listing ) use ( &$seen ) {
			$seen = [
				'options' => $listing->options(),
				'vars'    => $listing->base_query_vars(),
				'param'   => $listing->page_param(),
			];
		};

		add_action( 'matter_filters_listing', $hook );
		$this->listing();
		remove_action( 'matter_filters_listing', $hook );

		$this->assertNotNull( $seen );
		$this->assertContains( 'news', $seen['options']['taxonomy-category'] );
		$this->assertContains( 'workshops', $seen['options']['taxonomy-category'] );
		$this->assertSame( 'post', $seen['vars']['post_type'] );
		$this->assertEmpty( $seen['vars']['tax_query'] ?? [], 'Without the chosen category.' );
		$this->assertArrayNotHasKey( 'paged', $seen['vars'] );
		$this->assertSame( 'query-3-page', $seen['param'] );
	}

	/**
	 * The results' words are in the store's config, for a provider's results.
	 *
	 * @return void
	 */
	public function test_results_words(): void {
		$this->listing();

		$texts = wp_interactivity_config( 'matter/filters' )['texts'];

		$this->assertSame( 'No results', $texts['none'] );
		$this->assertSame( '%s results', $texts['all']['other'] );
		$this->assertSame( 'Showing %1$s–%2$s of %3$s result', $texts['showing']['one'] );
	}

	/**
	 * A chosen term filters the query; a parent includes its children.
	 *
	 * @return void
	 */
	public function test_a_term_filters_the_listing(): void {
		$_GET = [ 'filter_category' => 'events' ];

		$html = $this->listing();

		$this->assertSame( [ 'Open day', 'Pottery class' ], $this->titles( $html ) );
		$this->assertStringContainsString( '>2 results</p>', $html );
		$this->assertMatchesRegularExpression( '#<input checked type="checkbox" name="filter_category\[\]" value="events"#', $html );
		$this->assertSame( 2, $this->option_count( $html, 'news' ), 'With "any", other terms keep the counts they would add.' );
		$this->assertStringContainsString( 'aria-label="Remove Events"', $html );
		$this->assertStringContainsString( '<span data-wp-text="context.chip.label">Events</span>', $html );
	}

	/**
	 * Filters combine: a term and a tag.
	 *
	 * @return void
	 */
	public function test_filters_combine(): void {
		$_GET = [
			'filter_category' => 'news,events',
			'filter_tag'      => 'featured',
		];

		$html = $this->listing( '<!-- wp:matter/filter {"source":"taxonomy:post_tag","display":"chips"} /-->' );

		$this->assertSame( [ 'Pottery class', 'Story one' ], $this->titles( $html ) );
		$this->assertSame( 1, $this->option_count( $html, 'news' ), 'Counted within the tag.' );
		$this->assertSame( 2, $this->option_count( $html, 'featured' ), 'Counted within the categories.' );
	}

	/**
	 * With "all", every chosen term must match.
	 *
	 * @return void
	 */
	public function test_all_terms_must_match(): void {
		$_GET = [
			'filter_category'       => 'news,events',
			'filter_category_match' => 'all',
		];

		$this->assertSame( [], $this->titles( $this->listing() ) );
	}

	/**
	 * A form submitted without JavaScript sends checkboxes as an array: they
	 * become the comma form, as WordPress and WooCommerce read it.
	 *
	 * @return void
	 */
	public function test_array_parameters_are_joined(): void {
		$_GET = [
			'filter_category' => [ 'news', 'events' ],
			's'               => 'kept',
		];

		Request::normalise();

		$this->assertSame( 'news,events', $_GET['filter_category'] );
		$this->assertSame( [ 's' => 'kept' ], Request::kept_params() );
	}

	/**
	 * Counts leave out a query's other results, and are counted from its SQL
	 * without running it.
	 *
	 * @return void
	 */
	public function test_counts(): void {
		$counts = Counts::terms(
			[
				'post_type' => 'post',
				'tag'       => 'featured',
			],
			'category'
		);

		$this->assertSame( 1, $counts[ $this->terms['news'] ] );
		$this->assertSame( 1, $counts[ $this->terms['events'] ], 'The workshop counts for its parent.' );
		$this->assertSame( 1, $counts[ $this->terms['workshop'] ] );

		add_filter( 'matter_filters_pre_counts', $short = fn() => [ 7 => 3 ] );
		$this->assertSame( [ 7 => 3 ], Counts::terms( [ 'post_type' => 'post' ], 'category' ) );
		remove_filter( 'matter_filters_pre_counts', $short );
	}

	/**
	 * A taxonomy source's parameters, selection and query.
	 *
	 * @return void
	 */
	public function test_taxonomy_source(): void {
		$source = new TaxonomySource( 'category' );

		$this->assertSame( 'taxonomy:category', $source->key() );
		$this->assertSame(
			[
				'value'    => 'filter_category',
				'operator' => 'filter_category_match',
			],
			$source->params()
		);

		$selected = $source->selected(
			[
				'filter_category'       => 'news,<b>events</b>,,news',
				'filter_category_match' => 'all',
			]
		);

		$this->assertSame(
			[
				'values'   => [ 'news', 'events' ],
				'operator' => 'and',
			],
			$selected
		);

		$query = $source->apply( [ 'tax_query' => [ [ 'taxonomy' => 'post_tag' ] ] ], $selected );

		$this->assertCount( 2, $query['tax_query'], 'Added to the query\'s own.' );
		$this->assertSame( 'AND', $query['tax_query'][1]['operator'] );

		// A selection without an operator (from another source's code) is
		// "any of them", not a warning.
		$query = $source->apply( [], [ 'values' => [ 'news' ] ] );
		$this->assertSame( 'IN', $query['tax_query'][0]['operator'] );
		$this->assertContains( 'taxonomy:category', array_keys( Sources::all() ) );
		$this->assertContains( 'taxonomy:post_tag', array_keys( Sources::all() ) );
		$this->assertNotContains( 'taxonomy:post_format', array_keys( Sources::all() ) );
	}

	/**
	 * Without a filters block, a query is left alone.
	 *
	 * @return void
	 */
	public function test_queries_without_filters_are_left_alone(): void {
		$_GET = [ 'filter_category' => 'events' ];

		$html = $this->render( '<!-- wp:query {"queryId":4,"query":{"perPage":10,"postType":"post","inherit":false}} --><div class="wp-block-query"><!-- wp:post-template --><!-- wp:post-title /--><!-- /wp:post-template --></div><!-- /wp:query -->' );

		$this->assertCount( 5, $this->titles( $html ) );
		$this->assertStringNotContainsString( 'data-wp-router-region', $html );
	}

	/**
	 * The filter blocks render nothing outside a filterable query.
	 *
	 * @return void
	 */
	public function test_filter_blocks_need_a_listing(): void {
		$this->assertSame( '', trim( $this->render( '<!-- wp:matter/filters --><!-- wp:matter/filter {"source":"taxonomy:category"} /--><!-- /wp:matter/filters --><!-- wp:matter/results-count /-->' ) ) );
	}

	/**
	 * The filter block has a variation per source, named as the source is,
	 * and its blocks have their own category.
	 *
	 * @return void
	 */
	public function test_variations(): void {
		$variations = \WP_Block_Type_Registry::get_instance()->get_registered( 'matter/filter' )->get_variations();
		$names      = array_column( $variations, 'name' );

		$this->assertContains( 'taxonomy-category', $names );
		$categories = array_column( apply_filters( 'block_categories_all', get_default_block_categories(), new \WP_Block_Editor_Context() ), 'slug' );

		$this->assertSame( 'matter-filters', end( $categories ), 'Filters is last, as other plugins\' categories are.' );
		$this->assertSame( 'Category', $variations[ array_search( 'taxonomy-category', $names, true ) ]['title'], 'Named as the source is: they\'re in the Filters category.' );
	}

	/**
	 * A bar variant shows each filter as a button and its dropdown (a
	 * popover), with the dropdowns' styles for its breakpoint; the default
	 * (sidebar) has neither.
	 *
	 * @return void
	 */
	public function test_bar_layout(): void {
		$bar = fn( $variants ) => array_replace_recursive( $variants, [ 'matter/filters' => [ 'bar' => [ 'layout' => 'bar' ] ] ] );

		add_filter( 'matter_variants', $bar );

		$html = $this->render( str_replace( '<!-- wp:matter/filters -->', '<!-- wp:matter/filters {"className":"is-style-bar"} -->', $this->markup() ) );

		remove_filter( 'matter_variants', $bar );

		$this->assertMatchesRegularExpression( '#<button type="button" class="wp-block-matter-filter__trigger" popovertarget="(matter-filter-[\w-]+)"[^>]*>.*?</button><div id="\1" class="wp-block-matter-filter__popover" popover>#s', $html );
		$this->assertStringContainsString( 'is-layout-bar', $html );
		$this->assertStringContainsString( 'popover-open', implode( '', (array) wp_styles()->get_data( 'matter-filters-bar', 'after' ) ) );

		$sidebar = $this->listing();

		$this->assertStringNotContainsString( 'popovertarget', $sidebar );
		$this->assertStringContainsString( 'is-layout-sidebar', $sidebar );
	}

	/**
	 * Filters hold other blocks too (a heading, a note), rendered among them.
	 *
	 * @return void
	 */
	public function test_other_blocks_among_filters(): void {
		$html = $this->listing( '<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Narrow it down</h3><!-- /wp:heading -->' );

		$this->assertMatchesRegularExpression( '#<form[^>]*wp-block-matter-filters__form[\s\S]*<h3 class="wp-block-heading">Narrow it down</h3>[\s\S]*</form>#', $html );
		$this->assertSame( 2, $this->option_count( $html, 'news' ), 'The filters still work.' );
	}

	/**
	 * A filtered listing is `noindex, follow`; an unfiltered one is left
	 * alone, and a project can index filtered ones.
	 *
	 * @return void
	 */
	public function test_filtered_listings_are_not_indexed(): void {
		$robots = apply_filters( 'wp_robots', [ 'max-image-preview' => 'large' ] );

		$this->assertArrayNotHasKey( 'noindex', $robots, 'Unfiltered: left alone.' );

		$_GET = [ 'filter_category' => 'news' ];

		$robots = apply_filters( 'wp_robots', [ 'max-image-preview' => 'large' ] );

		$this->assertTrue( $robots['noindex'] ?? false );
		$this->assertTrue( $robots['follow'] ?? false );
		$this->assertSame( 'large', $robots['max-image-preview'] );

		$robots = apply_filters( 'wp_robots', [ 'nofollow' => true ] );

		$this->assertArrayNotHasKey( 'follow', $robots, 'A site hidden from search engines stays nofollow.' );

		add_filter( 'matter_filters_noindex', '__return_false' );
		$robots = apply_filters( 'wp_robots', [] );
		remove_filter( 'matter_filters_noindex', '__return_false' );

		$this->assertArrayNotHasKey( 'noindex', $robots );
	}
}
