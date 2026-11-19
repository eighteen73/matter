<?php
/**
 * Products' cards (Cards\Cards), for everyone.
 *
 * A product card is rendered as a guest, but some of WooCommerce's blocks
 * read the shop's session rather than the user: the Add to Cart button
 * counts what's in the current cart ("1 in basket"). So while a card renders
 * the cart is hidden, and the card keeps nothing of it:
 *
 * - without the `woocommerce` store's state and config (the cart, notices):
 *   the page has its own, the shopper's;
 * - without `first` and `last` (where it was in a loop: a card has no
 *   place) and `sale` (whether it's on sale depends on the shopper's prices,
 *   which are live blocks).
 *
 * A product's list item says which product it is (`woocommerce/products`
 * context), and its Add to Cart button reads the product from WooCommerce's
 * products store. So a product card holds the product's data too, loaded as
 * a guest, with only what a listing's blocks use: without its prices (which
 * are live), images or descriptions.
 *
 * WooCommerce's version is part of the card version, since its blocks
 * render cards.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce;

use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Product cards.
 */
final class Cards {

	/**
	 * Classes that don't belong in a card.
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
	 * A product's data a card keeps.
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
	 * Products loaded while their cards render, by post ID.
	 *
	 * @var array<int, array>
	 */
	private array $products = [];

	/**
	 * Carts hidden while cards render (nested renders each keep their own).
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
		add_action( 'matter_card_render_start', [ $this, 'hide_cart' ] );
		add_action( 'matter_card_render_start', [ $this, 'load_product' ], 20 );
		add_action( 'matter_card_render_end', [ $this, 'restore_cart' ] );
		add_filter( 'matter_card', [ $this, 'card' ], 10, 2 );
		add_filter( 'matter_card_version', [ $this, 'version' ] );
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
	 * Load a product card's product, as the guest the card is rendered for.
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
	 * A card without the page's cart, or its place in a loop or sale class.
	 *
	 * @param mixed $card Card.
	 * @param mixed $post The item.
	 * @return mixed
	 */
	public function card( $card, $post = null ) {
		if ( ! is_array( $card ) ) {
			return $card;
		}

		$card['classes'] = array_values( array_diff( (array) ( $card['classes'] ?? [] ), self::CLASSES ) );

		foreach ( [ 'state', 'config' ] as $kind ) {
			unset( $card['data'][ $kind ][ self::STORE ] );

			if ( empty( $card['data'][ $kind ] ) ) {
				unset( $card['data'][ $kind ] );
			}
		}

		// The product, for its list item and Add to Cart button.
		$id = $post instanceof WP_Post ? $post->ID : 0;

		if ( ! empty( $this->products[ $id ] ) ) {
			$card['data']['state'][ self::PRODUCTS ]['products'][ $id ] = $this->products[ $id ];
		}

		unset( $this->products[ $id ] );

		return $card;
	}

	/**
	 * WooCommerce's version, whose blocks render product cards.
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
