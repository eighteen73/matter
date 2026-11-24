<?php
/**
 * Products' loop items (LoopItems\Prerendered), for everyone.
 *
 * A product loop item is rendered as a guest, but some of WooCommerce's blocks
 * read the shop's session rather than the user: the Add to Cart button
 * counts what's in the current cart ("1 in basket"). So while a loop item renders
 * the cart is hidden, and the loop item keeps nothing of it:
 *
 * - without the `woocommerce` store's state and config (the cart, notices):
 *   the page has its own, the shopper's;
 * - without `first` and `last` (where it was in a loop: a loop item has no
 *   place) and `sale` (whether it's on sale depends on the shopper's prices,
 *   which are live blocks).
 *
 * A product's list item says which product it is (`woocommerce/products`
 * context), and its Add to Cart button reads the product from WooCommerce's
 * products store. So a product loop item holds the product's data too, loaded as
 * a guest, with only what a listing's blocks use: without its prices (which
 * are live), images or descriptions.
 *
 * WooCommerce's version is part of the loop item version, since its blocks
 * render loop items.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce;

use Automattic\WooCommerce\Blocks\BlockTypesController;
use Automattic\WooCommerce\Blocks\Package;
use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Product loop items.
 */
final class LoopItems {

	/**
	 * Classes that don't belong in a loop item.
	 */
	private const CLASSES = [ 'first', 'last', 'sale' ];

	/**
	 * The WooCommerce store holding the shopper's cart.
	 */
	private const STORE = 'woocommerce';

	/**
	 * WooCommerce's products store.
	 */
	private const PRODUCTS = 'woocommerce/products';

	/**
	 * The consent WooCommerce's experimental products store asks for.
	 */
	private const CONSENT = 'I acknowledge that using experimental APIs means my theme or plugin will inevitably break in the next version of WooCommerce';

	/**
	 * A product's data a loop item keeps.
	 */
	private const PRODUCT_FIELDS = [
		'id',
		'name',
		'slug',
		'parent',
		'type',
		'variation',
		'permalink',
		'sku',
		'attributes',
		'variations',
		'grouped_products',
		'has_options',
		'is_purchasable',
		'is_in_stock',
		'is_on_backorder',
		'sold_individually',
		'add_to_cart',
	];

	/**
	 * Products loaded while their loop items render, by post ID.
	 *
	 * @var array<int, array>
	 */
	private array $products = [];

	/**
	 * Carts hidden while loop items render (nested renders each keep their own).
	 *
	 * @var array<int, mixed>
	 */
	private array $carts = [];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'matter_prerender_loop_item_start', [ $this, 'register_blocks' ], 5 );
		add_action( 'matter_prerender_loop_item_start', [ $this, 'hide_cart' ] );
		add_action( 'matter_prerender_loop_item_start', [ $this, 'load_product' ], 20 );
		add_action( 'matter_prerender_loop_item_end', [ $this, 'restore_cart' ] );
		add_filter( 'matter_prerender_loop_item', [ $this, 'item' ], 10, 2 );
		add_filter( 'matter_prerender_loop_item_version', [ $this, 'version' ] );
	}

	/**
	 * Register WooCommerce's block types, when this request skipped them.
	 *
	 * WooCommerce doesn't register its blocks on requests it expects to render
	 * none (cron, AJAX, its REST routes; see its BlockRegistrationContext), and
	 * registers them on demand for what does (a description, an email). A loop
	 * item is prerendered on just such a request (a search index syncing in the
	 * background), and its product blocks would render empty: register them
	 * as WooCommerce does for an email.
	 *
	 * @return void
	 */
	public function register_blocks(): void {
		if ( ! class_exists( Package::class ) || ! method_exists( BlockTypesController::class, 'register_blocks_has_run' ) ) {
			return;
		}

		$blocks = Package::container()->get( BlockTypesController::class );

		if ( ! $blocks->register_blocks_has_run() ) {
			$blocks->register_blocks();
		}
	}

	/**
	 * Hide the shop's cart.
	 *
	 * @return void
	 */
	public function hide_cart(): void {
		$this->carts[] = WC()->cart;

		WC()->cart = null;
	}

	/**
	 * Load a product loop item's product, as the guest the loop item is rendered for.
	 *
	 * @param mixed $post The item.
	 * @return void
	 */
	public function load_product( $post ): void {
		if ( ! $post instanceof WP_Post || 'product' !== $post->post_type || ! function_exists( 'wc_interactivity_api_load_product' ) ) {
			return;
		}

		try {
			$product = (array) wc_interactivity_api_load_product( self::CONSENT, $post->ID );
		} catch ( \Throwable $e ) {
			return;
		}

		$this->products[ $post->ID ] = array_intersect_key( $product, array_flip( self::PRODUCT_FIELDS ) );
	}

	/**
	 * Restore it.
	 *
	 * @return void
	 */
	public function restore_cart(): void {
		WC()->cart = array_pop( $this->carts );
	}

	/**
	 * A loop item without the page's cart, or its place in a loop or sale class.
	 *
	 * @param mixed $item Loop item.
	 * @param mixed $post The item.
	 * @return mixed
	 */
	public function item( $item, $post = null ) {
		if ( ! is_array( $item ) ) {
			return $item;
		}

		$item['classes'] = array_values( array_diff( (array) ( $item['classes'] ?? [] ), self::CLASSES ) );

		foreach ( [ 'state', 'config' ] as $kind ) {
			unset( $item['data'][ $kind ][ self::STORE ] );

			if ( empty( $item['data'][ $kind ] ) ) {
				unset( $item['data'][ $kind ] );
			}
		}

		// The product, for its list item and Add to Cart button.
		$id = $post instanceof WP_Post ? $post->ID : 0;

		if ( ! empty( $this->products[ $id ] ) ) {
			$item['data']['state'][ self::PRODUCTS ]['products'][ $id ] = $this->products[ $id ];
		}

		unset( $this->products[ $id ] );

		return $item;
	}

	/**
	 * WooCommerce's version, whose blocks render product loop items.
	 *
	 * @param mixed $parts Version parts.
	 * @return array
	 */
	public function version( $parts ): array {
		$parts = (array) $parts;

		$parts['woocommerce'] = defined( 'WC_VERSION' ) ? WC_VERSION : '';

		return $parts;
	}
}
