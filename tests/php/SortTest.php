<?php
/**
 * Sort: WooCommerce's `orderby` as a filter, with its choices and default,
 * never a chip; and a collapsible filter in a bar's dropdown.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Filters\Query;
use Eighteen73\Matter\Filters\Sources;
use Eighteen73\Matter\Integrations\WooCommerce\Filters\SortSource;

/**
 * Sort tests.
 */
class SortTest extends TestCase {

	/**
	 * The sort source, which the WooCommerce integration registers (PHPUnit
	 * runs without WooCommerce, and the source needs only its filters), and a
	 * product to list.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		$this->go_to( home_url( '/' ) );

		$_GET = [];
		Query::reset();

		if ( ! post_type_exists( 'product' ) ) {
			register_post_type( 'product', [ 'public' => true ] );
		}

		add_action( 'matter_filters_sources', [ $this, 'register_sort' ] );
		Sources::flush();

		self::factory()->post->create(
			[
				'post_type'  => 'product',
				'post_title' => 'Canvas dummy',
			]
		);
	}

	/**
	 * Reset the request.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		remove_action( 'matter_filters_sources', [ $this, 'register_sort' ] );
		Sources::flush();

		$_GET = [];
		Query::reset();

		parent::tear_down();
	}

	/**
	 * Registers the sort source.
	 *
	 * @param Sources $sources Registry.
	 * @return void
	 */
	public function register_sort( Sources $sources ): void {
		$sources->register( new SortSource() );
	}

	/**
	 * A product listing with the given filters.
	 *
	 * @param string $filters    Filter block markup.
	 * @param string $class_name The filters' class.
	 * @return string
	 */
	private function listing( string $filters, string $class_name = '' ): string {
		$attributes = $class_name ? ' {"className":"' . $class_name . '"}' : '';

		return $this->render(
			'<!-- wp:query {"queryId":3,"query":{"perPage":10,"postType":"product","orderBy":"title","order":"asc","inherit":false}} --><div class="wp-block-query">'
			. '<!-- wp:matter/filters' . $attributes . ' -->' . $filters . '<!-- /wp:matter/filters -->'
			. '<!-- wp:matter/active-filters /-->'
			. '<!-- wp:post-template --><!-- wp:post-title /--><!-- /wp:post-template -->'
			. '</div><!-- /wp:query -->'
		);
	}

	/**
	 * The order chosen, when WooCommerce offers it; otherwise its default.
	 *
	 * @return void
	 */
	public function test_selected_is_a_choice_or_the_default(): void {
		$sort = new SortSource();

		$this->assertSame( [ 'price-desc' ], $sort->selected( [ 'orderby' => 'price-desc' ] )['values'] );
		$this->assertSame( [ 'menu_order' ], $sort->selected( [ 'orderby' => 'nonsense' ] )['values'], 'An unknown order is the default.' );
		$this->assertSame( [ 'menu_order' ], $sort->selected( [] )['values'] );

		$newest = fn() => 'date';

		add_filter( 'woocommerce_default_catalog_orderby', $newest );
		$default = $sort->default_value();
		remove_filter( 'woocommerce_default_catalog_orderby', $newest );

		$this->assertSame( 'date', $default, 'WooCommerce\'s default.' );
	}

	/**
	 * The choices are WooCommerce's, as its filter names them; a search
	 * sorts by relevance first.
	 *
	 * @return void
	 */
	public function test_choices_follow_woocommerce(): void {
		$names = function ( $choices ) {
			$choices['menu_order'] = 'Recommended';
			unset( $choices['date'] );

			return $choices;
		};

		add_filter( 'woocommerce_catalog_orderby', $names );
		$examples = wp_list_pluck( ( new SortSource() )->examples(), 'name', 'id' );
		remove_filter( 'woocommerce_catalog_orderby', $names );

		$this->assertSame( 'Recommended', $examples['menu_order'] );
		$this->assertArrayNotHasKey( 'date', $examples );

		$this->go_to( home_url( '/?s=dummy&post_type=product' ) );

		$sort = new SortSource();

		$this->assertSame( 'relevance', $sort->default_value() );
		$this->assertSame( 'relevance', array_key_first( wp_list_pluck( $sort->examples(), 'name', 'id' ) ) );
		$this->assertArrayNotHasKey( 'menu_order', wp_list_pluck( $sort->examples(), 'name', 'id' ) );
	}

	/**
	 * A sort is never an active filter, and leaves the query to WooCommerce.
	 *
	 * @return void
	 */
	public function test_sort_is_not_a_filter(): void {
		$sort     = new SortSource();
		$selected = $sort->selected( [ 'orderby' => 'price' ] );

		$this->assertSame( [], $sort->chips( $selected ) );
		$this->assertSame( [ 'post_type' => 'product' ], $sort->apply( [ 'post_type' => 'product' ], $selected ) );
	}

	/**
	 * A sort renders as radios, the default checked, with neither "Any" nor
	 * counts, and adds no chip.
	 *
	 * @return void
	 */
	public function test_sort_renders_as_radios(): void {
		$html = $this->listing( '<!-- wp:matter/filter {"source":"sort"} /-->' );

		$this->assertMatchesRegularExpression( '#<input[^>]*type="radio"[^>]*value="price-desc"#', $html );
		$this->assertMatchesRegularExpression( '#<input[^>]*value="menu_order"[^>]*checked#', $html );
		$this->assertDoesNotMatchRegularExpression( '#<input[^>]*type="radio"[^>]*value=""#', $html, 'No "Any".' );
		$this->assertStringNotContainsString( 'wp-block-matter-filter__count', $html );
	}

	/**
	 * A listing's query without filters keeps its order: the sort's parameter
	 * (`orderby`) is also the query's own, so a results provider sorts as the
	 * page does.
	 *
	 * @return void
	 */
	public function test_base_query_keeps_the_order(): void {
		$vars = null;
		$hook = function ( $listing ) use ( &$vars ) {
			$vars = $listing->base_query_vars();
		};

		add_action( 'matter_filters_listing', $hook );
		$this->listing( '<!-- wp:matter/filter {"source":"sort"} /-->' );
		remove_action( 'matter_filters_listing', $hook );

		$this->assertSame( 'title', $vars['orderby'] ?? null );
	}

	/**
	 * In a bar, a collapsible filter's section sits inside its dropdown (where
	 * the bar's styles hide its summary), and the listing knows the bar's
	 * query so the script can keep the section open there.
	 *
	 * @return void
	 */
	public function test_collapsible_filter_in_a_bar(): void {
		$bar = fn( $variants ) => array_replace_recursive( $variants, [ 'matter/filters' => [ 'bar' => [ 'layout' => 'bar', 'collapseBelow' => 'lg' ] ] ] );

		add_filter( 'matter_variants', $bar );
		$html = $this->listing( '<!-- wp:matter/filter {"source":"sort","collapsible":true,"open":false} /-->', 'is-style-bar' );
		remove_filter( 'matter_variants', $bar );

		$this->assertMatchesRegularExpression( '#<div id="matter-filter-[\w-]+" class="wp-block-matter-filter__popover" popover><details class="wp-block-matter-filter__group"#', $html );

		$listings = wp_interactivity_state( 'matter/filters' )['listings'] ?? [];

		$this->assertNotEmpty( array_filter( array_column( $listings, 'barQuery' ) ), 'The bar\'s media query is in the state.' );
	}
}
