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
		add_action( 'matter_card_render_end', [ $this, 'restore_cart' ] );
		add_filter( 'matter_card', [ $this, 'card' ] );
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
	 * @return mixed
	 */
	public function card( $card ) {
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
