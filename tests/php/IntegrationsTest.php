<?php
/**
 * Integrations: other plugins' code is kept out of Matter's own, and added
 * through its hooks only when that plugin is active.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Blocks\Instances;
use Eighteen73\Matter\Blocks\QueryDisplay;
use Eighteen73\Matter\Blocks\Registry;
use Eighteen73\Matter\Integrations\GravityForms\GravityForms;
use Eighteen73\Matter\Integrations\Integration;
use Eighteen73\Matter\Integrations\Integrations;
use Eighteen73\Matter\Integrations\WooCommerce\WooCommerce;

/**
 * Integrations tests.
 */
class IntegrationsTest extends TestCase {

	/**
	 * Filters added by a test, removed afterwards.
	 *
	 * @var array<int, array{0: string, 1: callable, 2: int}>
	 */
	private array $hooks = [];

	/**
	 * Remove hooks a test added.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		foreach ( $this->hooks as [ $hook, $callback, $priority ] ) {
			remove_filter( $hook, $callback, $priority );
		}

		$this->hooks = [];

		parent::tear_down();
	}

	/**
	 * Boot an integration as Integrations would, and note its hooks so they're
	 * removed after the test.
	 *
	 * @param Integration $integration Integration.
	 * @return void
	 */
	private function boot( Integration $integration ): void {
		global $wp_filter;

		$before = $this->callbacks( $wp_filter );

		$integration->boot();

		foreach ( $wp_filter as $hook => $filter ) {
			foreach ( $filter->callbacks as $priority => $callbacks ) {
				foreach ( $callbacks as $id => $callback ) {
					if ( ! isset( $before[ "{$hook}:{$priority}:{$id}" ] ) ) {
						$this->hooks[] = [ $hook, $callback['function'], $priority ];
					}
				}
			}
		}
	}

	/**
	 * Every hooked callback, by hook, priority and ID.
	 *
	 * @param array $filters `$wp_filter`.
	 * @return array<string, true>
	 */
	private function callbacks( array $filters ): array {
		$seen = [];

		foreach ( $filters as $hook => $filter ) {
			foreach ( $filter->callbacks as $priority => $callbacks ) {
				foreach ( array_keys( $callbacks ) as $id ) {
					$seen[ "{$hook}:{$priority}:{$id}" ] = true;
				}
			}
		}

		return $seen;
	}

	/**
	 * An integration boots only when its plugin is active, on
	 * `plugins_loaded`. WooCommerce is never loaded in PHPUnit; Gravity Forms
	 * is, as a stub, except in `npm run test:php:nowc`.
	 *
	 * @return void
	 */
	public function test_integrations_boot_only_with_their_plugin(): void {
		$this->assertContains( WooCommerce::class, Integrations::all() );
		$this->assertContains( GravityForms::class, Integrations::all() );

		$this->assertSame( class_exists( 'WooCommerce' ), Integrations::active( WooCommerce::class ) );
		$this->assertSame( class_exists( 'GFAPI' ), Integrations::active( GravityForms::class ) );
	}

	/**
	 * The WooCommerce integration needs WooCommerce 11 and its product
	 * filters' parameters class; an older one is switched off.
	 *
	 * @return void
	 */
	public function test_woocommerce_integration_needs_woocommerce_11(): void {
		$this->assertSame( '11.0', WooCommerce::MINIMUM_VERSION );

		$this->assertFalse( WooCommerce::supports( '10.9.9', true ), 'Too old.' );
		$this->assertFalse( WooCommerce::supports( '9.4.0', true ) );
		$this->assertTrue( WooCommerce::supports( '11.0.0', true ) );
		$this->assertTrue( WooCommerce::supports( '11.3.1', true ) );
		$this->assertTrue( WooCommerce::supports( '12.0.0-beta.1', true ) );
		$this->assertTrue( WooCommerce::supports( '11.0.0-rc.2', true ), 'A pre-release of the minimum counts as the minimum.' );
		$this->assertFalse( WooCommerce::supports( '10.9.9-rc.2', true ) );
		$this->assertFalse( WooCommerce::supports( '11.3.1', false ), 'Without the parameters class.' );
		$this->assertFalse( WooCommerce::supports( '', true ) );
	}

	/**
	 * Without WooCommerce there is nothing to boot, and nothing to say about it.
	 *
	 * @return void
	 */
	public function test_woocommerce_integration_without_woocommerce_is_quiet(): void {
		$this->assertFalse( class_exists( 'WooCommerce' ), 'PHPUnit runs without WooCommerce.' );

		$before = has_action( 'admin_notices' );

		$this->assertFalse( ( new WooCommerce() )->can_boot() );
		$this->assertSame( $before, has_action( 'admin_notices' ) );
	}

	/**
	 * A project can add its own integration; one that can't boot doesn't.
	 *
	 * @return void
	 */
	public function test_a_project_can_add_an_integration(): void {
		$booted = new class() implements Integration {
			/**
			 * Times boot() ran.
			 *
			 * @var int
			 */
			public static int $boots = 0;

			/**
			 * Always.
			 *
			 * @return bool
			 */
			public function can_boot(): bool {
				return true;
			}

			/**
			 * Count the boot.
			 *
			 * @return void
			 */
			public function boot(): void {
				++self::$boots;
			}
		};

		$add = fn( $integrations ) => [ ...$integrations, $booted::class, \stdClass::class, [ 'not a class name' ], null, 42 ];
		add_filter( 'matter_integrations', $add );
		$this->hooks[] = [ 'matter_integrations', $add, 10 ];

		Integrations::instance()->boot();
		Integrations::instance()->boot();

		$this->assertSame( 1, $booted::$boots, 'Booted once, however often the loader runs.' );
		$this->assertTrue( Integrations::active( $booted::class ) );
		$this->assertFalse( Integrations::active( \stdClass::class ), 'Only Integration classes boot.' );
	}

	/**
	 * Without its integration, Matter's Gravity Form block doesn't register,
	 * and Gravity Forms' own Form block isn't hidden.
	 *
	 * @group without-plugins
	 *
	 * @return void
	 */
	public function test_gravity_form_block_waits_for_its_integration(): void {
		$this->assertFalse( class_exists( 'GFAPI' ), 'Run with npm run test:php:nowc.' );
		$this->assertFalse( \WP_Block_Type_Registry::get_instance()->is_registered( 'matter/gravity-form' ) );
		$this->assertNotContains( 'gravityforms/form', Registry::hidden_blocks() );
		$this->assertFalse( Integrations::active( GravityForms::class ) );

		$this->boot( new GravityForms() );

		$this->assertContains( 'gravityforms/form', Registry::hidden_blocks() );
		$this->assertTrue( apply_filters( 'matter_register_block', false, 'matter/gravity-form', '' ) );
		$this->assertFalse( apply_filters( 'matter_register_block', false, 'matter/carousel', '' ) );

		// An earlier filter that returns something else (null) isn't a type error.
		$this->assertFalse( ( new GravityForms() )->register_form_block( null, 'matter/carousel' ) );
		$this->assertTrue( ( new GravityForms() )->register_form_block( null, 'matter/gravity-form' ) );
	}

	/**
	 * A saved Gravity Form block, with Gravity Forms off, renders nothing and
	 * raises no warning (the test case fails on one).
	 *
	 * @group without-plugins
	 *
	 * @return void
	 */
	public function test_a_saved_gravity_form_renders_nothing_without_the_plugin(): void {
		$this->assertFalse( class_exists( 'GFAPI' ), 'Run with npm run test:php:nowc.' );

		$markup = '<!-- wp:group --><div class="wp-block-group"><!-- wp:matter/gravity-form {"formId":"1","displayTitle":true} /--></div><!-- /wp:group -->';
		$html   = $this->render( $markup );

		$this->assertStringNotContainsString( 'gform', $html );
		$this->assertStringNotContainsString( 'matter/gravity-form', $html );
		$this->assertSame( '', trim( $this->render( '<!-- wp:matter/gravity-form {"formId":"1"} /-->' ) ) );
	}

	/**
	 * A saved Products carousel (a Product Collection shown as a carousel),
	 * with WooCommerce off, renders no products and raises no warning.
	 *
	 * @group without-plugins
	 *
	 * @return void
	 */
	public function test_a_saved_products_carousel_renders_nothing_without_the_plugin(): void {
		$this->assertFalse( class_exists( 'WooCommerce' ), 'Run with npm run test:php:nowc.' );
		$this->assertFalse( QueryDisplay::supports( 'carousel', WooCommerce::PRODUCT_COLLECTION ) );

		$product = self::factory()->post->create( [ 'post_title' => 'A stocked product' ] );

		$html = $this->render(
			'<!-- wp:woocommerce/product-collection {"queryId":3,"query":{"perPage":3,"postType":"product","inherit":false},"matterDisplay":{"type":"carousel"}} -->'
			. '<div class="wp-block-woocommerce-product-collection"><!-- wp:woocommerce/product-template --><!-- wp:matter/loop-item /--><!-- /wp:woocommerce/product-template --></div>'
			. '<!-- /wp:woocommerce/product-collection -->'
		);

		$this->assertStringNotContainsString( 'A stocked product', $html );
		$this->assertStringNotContainsString( 'matter-carousel', $html );
		$this->assertStringNotContainsString( 'loop-item', $html );
		$this->assertNotNull( get_post( $product ) );
	}

	/**
	 * Matter's own lists name only core's blocks; the WooCommerce integration
	 * adds the Product Collection and its template.
	 *
	 * @return void
	 */
	public function test_woocommerce_integration_adds_its_query_blocks(): void {
		$this->assertFalse( class_exists( 'WooCommerce' ), 'PHPUnit runs without WooCommerce, so these tests boot its integration themselves.' );

		$this->assertSame(
			[
				'core/query'       => [ 'carousel', 'accordion', 'tabs' ],
				'core/terms-query' => [ 'carousel' ],
			],
			QueryDisplay::blocks()
		);
		$this->assertSame(
			[
				'core/post-template' => 'post',
				'core/term-template' => 'term',
			],
			Instances::loops()
		);

		$this->boot( new WooCommerce() );

		$this->assertSame( [ 'carousel' ], QueryDisplay::blocks()[ WooCommerce::PRODUCT_COLLECTION ] );
		$this->assertContains( WooCommerce::PRODUCT_COLLECTION, QueryDisplay::queries( 'carousel' ) );
		$this->assertNotContains( WooCommerce::PRODUCT_COLLECTION, QueryDisplay::queries( 'accordion' ) );
		$this->assertTrue( QueryDisplay::supports( 'carousel', WooCommerce::PRODUCT_COLLECTION ) );
		$this->assertFalse( QueryDisplay::supports( 'tabs', WooCommerce::PRODUCT_COLLECTION ) );
		$this->assertSame( 'post', Instances::loops()[ WooCommerce::PRODUCT_TEMPLATE ] );
	}

	/**
	 * Products leave the posts displays' choices only with the integration.
	 *
	 * @return void
	 */
	public function test_woocommerce_integration_keeps_products_for_the_products_carousel(): void {
		$this->assertFalse( class_exists( 'WooCommerce' ), 'PHPUnit runs without WooCommerce, so these tests boot its integration themselves.' );

		register_post_type(
			'product',
			[
				'public'       => true,
				'show_in_rest' => true,
				'label'        => 'Products',
			]
		);

		$this->assertContains( 'product', array_column( QueryDisplay::post_types(), 'name' ) );

		$this->boot( new WooCommerce() );

		$this->assertNotContains( 'product', array_column( QueryDisplay::post_types(), 'name' ) );
		$this->assertContains( 'post', array_column( QueryDisplay::post_types(), 'name' ) );

		unregister_post_type( 'product' );
	}

	/**
	 * A product category's thumbnail is its archive's image only with the
	 * integration; core terms have none.
	 *
	 * @return void
	 */
	public function test_term_image_comes_from_the_integration(): void {
		$this->assertFalse( class_exists( 'WooCommerce' ), 'PHPUnit runs without WooCommerce, so these tests boot its integration themselves.' );

		$term  = self::factory()->term->create_and_get( [ 'taxonomy' => 'category' ] );
		$image = self::factory()->attachment->create();

		update_term_meta( $term->term_id, 'thumbnail_id', $image );

		$this->assertSame( 0, (int) apply_filters( 'matter_archive_term_image_id', 0, $term ) );

		$this->boot( new WooCommerce() );

		$this->assertSame( $image, (int) apply_filters( 'matter_archive_term_image_id', 0, $term ) );
		$this->assertSame( 0, (int) apply_filters( 'matter_archive_term_image_id', 0, null ) );
	}

	/**
	 * Every loop template's list has Matter's class, so blocks around a query
	 * find its items by one class.
	 *
	 * @return void
	 */
	public function test_loop_lists_are_marked(): void {
		self::factory()->post->create( [ 'post_title' => 'Listed' ] );

		$html = $this->render( '<!-- wp:query {"queryId":1,"query":{"perPage":3,"postType":"post","inherit":false}} --><div class="wp-block-query"><!-- wp:post-template --><!-- wp:post-title /--><!-- /wp:post-template --></div><!-- /wp:query -->' );

		$this->assertMatchesRegularExpression( '/<ul class="[^"]*\bwp-block-post-template\b[^"]*\b' . Instances::LIST_CLASS . '\b/', $html );
	}
}
