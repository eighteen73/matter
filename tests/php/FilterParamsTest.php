<?php
/**
 * Filter parameters: one convention, translated for a query block that
 * reads its own, and scoped to a source's post types.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Filters\Listing;
use Eighteen73\Matter\Filters\Query;
use Eighteen73\Matter\Filters\QueryParams;
use Eighteen73\Matter\Filters\Request;
use Eighteen73\Matter\Filters\Source;
use Eighteen73\Matter\Filters\Sources;
use Eighteen73\Matter\Filters\State;
use WP_Block;

/**
 * Filter parameter tests.
 */
class FilterParamsTest extends TestCase {

	/**
	 * A source for pages, named like posts' categories, whose query block
	 * reads `page_topic` (as WooCommerce reads its own).
	 *
	 * @return Source
	 */
	private static function page_source(): Source {
		return new class() implements Source, QueryParams {
			// phpcs:disable Squiz.Commenting.FunctionComment.Missing -- A stand-in.
			public function key(): string {
				return 'page-topic';
			}

			public function label(): string {
				return 'Topic';
			}

			public function kind(): string {
				return 'choice';
			}

			public function post_types(): array {
				return [ 'page' ];
			}

			public function params(): array {
				return [ 'value' => 'filter_category' ];
			}

			public function selected( array $request ): array {
				return [
					'values'   => array_filter( explode( ',', (string) ( $request['filter_category'] ?? '' ) ) ),
					'operator' => 'or',
				];
			}

			public function apply( array $query_vars, array $selected ): array {
				// Would match nothing, if it were applied to posts.
				$query_vars['post__in'] = [ 0 ];

				return $query_vars;
			}

			public function options( Listing $listing, WP_Block $block, array $settings ): array {
				return [];
			}

			public function chips( array $selected ): array {
				return [];
			}

			public function query_params( array $selected ): array {
				return [ 'page_topic' => implode( ',', $selected['values'] ?? [] ) ];
			}
			// phpcs:enable
		};
	}

	/**
	 * Register the stand-in source.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		$_GET = [];
		Query::reset();
		add_action( 'matter_filters_sources', fn( Sources $sources ) => $sources->register( self::page_source() ) );
		Sources::flush();
	}

	/**
	 * Forget it.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		$_GET = [];
		remove_all_actions( 'matter_filters_sources' );
		Sources::flush();
		Query::reset();

		parent::tear_down();
	}

	/**
	 * A query block's own parameters are added to the request for it, and
	 * aren't kept by the filter form.
	 *
	 * @return void
	 */
	public function test_query_params_join_the_request(): void {
		$_GET = [
			'filter_category' => 'news',
			'orderby'         => 'title',
		];

		Request::normalise();

		$this->assertSame( 'news', $_GET['page_topic'] );
		$this->assertContains( 'page_topic', Sources::query_param_names() );
		$this->assertSame( [ 'orderby' => 'title' ], Request::kept_params() );
	}

	/**
	 * A URL that already has the query block's parameter keeps it.
	 *
	 * @return void
	 */
	public function test_query_params_dont_overwrite(): void {
		$_GET = [
			'filter_category' => 'news',
			'page_topic'      => 'events',
		];

		Request::normalise();

		$this->assertSame( 'events', $_GET['page_topic'] );
	}

	/**
	 * A source applies only to queries for its post types: posts' and
	 * pages' filters can share a name.
	 *
	 * @return void
	 */
	public function test_sources_apply_to_their_post_types(): void {
		$_GET = [ 'filter_category' => 'news' ];

		$posts = Query::apply( [ 'post_type' => 'post' ], null, [ 'post' ] );
		$pages = Query::apply( [ 'post_type' => 'page' ], null, [ 'page' ] );

		$this->assertArrayNotHasKey( 'post__in', $posts, 'The pages\' filter leaves posts alone.' );
		$this->assertSame( 'category', $posts['tax_query'][0]['taxonomy'], 'Posts\' own category filter applies.' );
		$this->assertSame( [ 0 ], $pages['post__in'] );
	}

	/**
	 * "& up": an option is chosen when it's the lowest value chosen, its
	 * count includes those above it, and the filter has one chip.
	 *
	 * @return void
	 */
	public function test_at_least(): void {
		$filter = [
			'atLeast' => true,
			'values'  => [ '4', '5' ],
			'counts'  => [
				'5' => 1,
				'4' => 2,
				'3' => 0,
				'2' => 4,
			],
			'labels'  => [ '4' => 'Rated 4 out of 5 and up' ],
		];

		$this->assertTrue( State::is_checked( $filter, '4' ) );
		$this->assertFalse( State::is_checked( $filter, '5' ) );
		$this->assertFalse( State::is_checked( $filter, '' ) );
		$this->assertSame( 3, State::count( $filter, '4' ) );
		$this->assertSame( 7, State::count( $filter, '2' ) );

		$chips = State::chips( [ 'filters' => [ 'rating' => $filter ] ] );

		$this->assertCount( 1, $chips );
		$this->assertSame( 'Rated 4 out of 5 and up', $chips[0]['label'] );
	}

	/**
	 * Short names: a post's and a product's taxonomies share them.
	 *
	 * @return void
	 */
	public function test_param_names(): void {
		$this->assertSame( 'category', Sources::param_name( 'category' ) );
		$this->assertSame( 'tag', Sources::param_name( 'post_tag' ) );
		$this->assertSame( 'category', Sources::param_name( 'product_cat' ) );
		$this->assertSame( 'color', Sources::param_name( 'pa_color' ) );
		$this->assertSame( 'genre', Sources::param_name( 'genre' ) );

		add_filter( 'matter_filters_param_name', fn( $name ) => 'post_tag' === $name || 'tag' === $name ? 'label' : $name );
		$this->assertSame( 'label', Sources::param_name( 'post_tag' ) );
		remove_all_filters( 'matter_filters_param_name' );
	}
}
