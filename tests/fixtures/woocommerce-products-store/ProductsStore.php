<?php
/**
 * WooCommerce's products store (Automattic\WooCommerce\Blocks\SharedStores\
 * ProductsStore, as in WooCommerce 11.3), reduced to what Matter relies on:
 * PHPUnit runs without WooCommerce. Its private `$products` and
 * `register_getters()` are what the WooCommerce integration sets and calls;
 * load_product() returns a product already there, and otherwise loads it
 * "whole" (as WooCommerce would through the Store API).
 *
 * @package Eighteen73\Matter
 */

namespace Automattic\WooCommerce\Blocks\SharedStores;

/**
 * Products store.
 */
class ProductsStore {

	/**
	 * Products in the store, by ID.
	 *
	 * @var array<int, array>
	 */
	private static array $products = [];

	/**
	 * Whether the store's getters are registered.
	 *
	 * @var bool
	 */
	private static bool $getters_registered = false;

	/**
	 * Register the store's getters.
	 *
	 * @return void
	 */
	private static function register_getters(): void {
		self::$getters_registered = true;
	}

	/**
	 * A product, from the store, or loaded whole.
	 *
	 * @param string $consent_statement Consent statement.
	 * @param int    $product_id        Product ID.
	 * @return array
	 */
	public static function load_product( string $consent_statement, int $product_id ): array {
		if ( isset( self::$products[ $product_id ] ) ) {
			return self::$products[ $product_id ];
		}

		self::$products[ $product_id ] = [
			'id'          => $product_id,
			'description' => 'Loaded whole.',
		];
		self::register_getters();

		return self::$products[ $product_id ];
	}

	/**
	 * Whether the getters are registered.
	 *
	 * @return bool
	 */
	public static function getters_registered(): bool {
		return self::$getters_registered;
	}
}
