<?php
/**
 * WooCommerce integration.
 *
 * Boots when WooCommerce is active. Through Matter's hooks it adds:
 *
 * - The Product Collection as a query block that can be shown as a carousel
 *   (the "Products carousel"), and its product template as a loop template,
 *   so products get the theme's loop item (`loop-item-product`).
 * - Products out of the posts carousels, accordions and tabs: the Products
 *   carousel shows them.
 * - The shop page's title for the products archive, and product categories'
 *   thumbnails for archive images.
 * - Its editor script: the "Products carousel" collection and the carousel
 *   slide picker's "Products" option (src/integrations/woocommerce).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce;

use Eighteen73\Matter\Integrations\Integration;
use WP_Term;

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce integration.
 */
final class WooCommerce implements Integration {

	/**
	 * WooCommerce's query block, shown as a Matter carousel.
	 */
	public const PRODUCT_COLLECTION = 'woocommerce/product-collection';

	/**
	 * The Product Collection's loop template.
	 */
	public const PRODUCT_TEMPLATE = 'woocommerce/product-template';

	/**
	 * Whether WooCommerce is active.
	 *
	 * @return bool
	 */
	public function can_boot(): bool {
		return class_exists( 'WooCommerce' );
	}

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function boot(): void {
		add_filter( 'matter_query_blocks', [ $this, 'query_blocks' ] );
		add_filter( 'matter_query_loops', [ $this, 'query_loops' ] );
		add_filter( 'matter_query_display_post_types', [ $this, 'without_products' ] );
		add_filter( 'matter_archive_post_type_title', [ $this, 'shop_title' ], 10, 2 );
		add_filter( 'matter_archive_term_image_id', [ $this, 'term_thumbnail' ], 10, 2 );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor' ] );
	}

	/**
	 * The Product Collection can be shown as a carousel.
	 *
	 * @param array<string, string[]> $blocks Query block name => display types.
	 * @return array<string, string[]>
	 */
	public function query_blocks( array $blocks ): array {
		$blocks[ self::PRODUCT_COLLECTION ] = [ 'carousel' ];

		return $blocks;
	}

	/**
	 * The Product Collection's product template lists posts (products).
	 *
	 * @param array<string, string> $loops Block name => `post` or `term`.
	 * @return array<string, string>
	 */
	public function query_loops( array $loops ): array {
		$loops[ self::PRODUCT_TEMPLATE ] = 'post';

		return $loops;
	}

	/**
	 * Products aren't offered to the posts displays: the Products carousel
	 * shows them, with WooCommerce's own choices (on sale, hand-picked …).
	 *
	 * @param array<int, array{name: string, label: string}> $types Post types.
	 * @return array<int, array{name: string, label: string}>
	 */
	public function without_products( array $types ): array {
		return array_values( array_filter( $types, fn( $type ) => 'product' !== ( $type['name'] ?? '' ) ) );
	}

	/**
	 * The products archive is named by the shop page.
	 *
	 * @param string|null $title     Title, or null to work it out.
	 * @param string      $post_type Post type.
	 * @return string|null
	 */
	public function shop_title( $title, string $post_type ) {
		if ( 'product' !== $post_type || ! function_exists( 'wc_get_page_id' ) || wc_get_page_id( 'shop' ) <= 0 ) {
			return $title;
		}

		return get_the_title( wc_get_page_id( 'shop' ) );
	}

	/**
	 * A product category's thumbnail (WooCommerce's `thumbnail_id` term meta)
	 * is its archive's image.
	 *
	 * @param int          $image Attachment ID, or 0 for none.
	 * @param WP_Term|null $term  The archive's term.
	 * @return int
	 */
	public function term_thumbnail( int $image, $term ): int {
		if ( $image || ! $term instanceof WP_Term ) {
			return $image;
		}

		return (int) get_term_meta( $term->term_id, 'thumbnail_id', true );
	}

	/**
	 * The editor script: the Products carousel collection and the carousel
	 * slide picker's "Products" option. After Matter's editor script, whose
	 * helpers it uses.
	 *
	 * @return void
	 */
	public function enqueue_editor(): void {
		$asset_file = MATTER_PATH . 'build/integrations/woocommerce/editor.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			'matter-woocommerce-editor',
			MATTER_URL . 'build/integrations/woocommerce/editor.js',
			array_merge( $asset['dependencies'], [ 'matter-editor' ] ),
			$asset['version'],
			true
		);

		if ( file_exists( MATTER_PATH . 'build/integrations/woocommerce/editor.css' ) ) {
			wp_enqueue_style( 'matter-woocommerce-editor', MATTER_URL . 'build/integrations/woocommerce/editor.css', [], $asset['version'] );
		}

		wp_set_script_translations( 'matter-woocommerce-editor', 'matter' );
	}
}
