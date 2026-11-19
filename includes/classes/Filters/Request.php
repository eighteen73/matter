<?php
/**
 * The request's filter parameters.
 *
 * Filters' URLs carry several values as one comma-separated parameter
 * (`filter_colour=red,blue`), as WooCommerce's do. A filter form submitted
 * without JavaScript sends checkboxes as an array (`filter_colour[]=red&…`),
 * which WordPress and WooCommerce would ignore, so those are joined into the
 * comma form before WordPress reads the request.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

defined( 'ABSPATH' ) || exit;

/**
 * Filter request.
 */
final class Request {

	/**
	 * Join array-form filter parameters into the comma form, in `$_GET` and
	 * `$_REQUEST`, before WordPress parses the request.
	 *
	 * @return void
	 */
	public static function normalise(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read-only filtering of a public listing.
		foreach ( Sources::params() as $param ) {
			if ( ! isset( $_GET[ $param ] ) || ! is_array( $_GET[ $param ] ) ) {
				continue;
			}

			$value = implode(
				',',
				array_filter(
					array_map(
						fn( $item ) => is_scalar( $item ) ? sanitize_text_field( wp_unslash( (string) $item ) ) : '',
						$_GET[ $param ] // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Sanitised per item.
					),
					'strlen'
				)
			);

			$_GET[ $param ]     = $value;
			$_REQUEST[ $param ] = $value;
		}
		// phpcs:enable

		self::add_query_params();
	}

	/**
	 * Add the query block's own parameters (WooCommerce's) for each selection
	 * a source like that has, so it applies them as if the URL had them. A
	 * parameter the URL already has is left as it is.
	 *
	 * @return void
	 */
	private static function add_query_params(): void {
		$request = self::params();

		foreach ( Sources::all() as $source ) {
			if ( ! $source instanceof QueryParams ) {
				continue;
			}

			foreach ( $source->query_params( $source->selected( $request ) ) as $param => $value ) {
				// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only filtering of a public listing.
				if ( '' !== (string) $value && ! isset( $_GET[ $param ] ) ) {
					$_GET[ $param ]     = (string) $value;
					$_REQUEST[ $param ] = (string) $value;
				}
			}
		}
	}

	/**
	 * The request's parameters, unslashed and sanitised as text.
	 *
	 * @return array<string, string>
	 */
	public static function params(): array {
		$params = [];

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only filtering of a public listing.
		foreach ( wp_unslash( $_GET ) as $key => $value ) {
			if ( is_scalar( $value ) ) {
				$params[ sanitize_key( (string) $key ) ] = sanitize_text_field( (string) $value );
			} elseif ( is_array( $value ) ) {
				$params[ sanitize_key( (string) $key ) ] = sanitize_text_field( implode( ',', array_filter( $value, 'is_scalar' ) ) );
			}
		}

		return $params;
	}

	/**
	 * The current URL.
	 *
	 * @return string
	 */
	public static function url(): string {
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '/';

		return self::origin() . ( str_starts_with( $uri, '/' ) ? $uri : '/' . $uri );
	}

	/**
	 * The site's scheme and host (`https://example.com`), for the request's
	 * path (which includes any subfolder the site is in).
	 *
	 * @return string
	 */
	private static function origin(): string {
		$parts = wp_parse_url( home_url() );

		return ( $parts['scheme'] ?? 'https' ) . '://' . ( $parts['host'] ?? '' ) . ( isset( $parts['port'] ) ? ':' . $parts['port'] : '' );
	}

	/**
	 * Parameters that page a listing (`paged`, a Query Loop's
	 * `query-{id}-page`, a Product Collection's `product-page`), dropped when
	 * the filters change.
	 *
	 * @return string[]
	 */
	public static function paging_params(): array {
		$params = [ 'paged', 'page', 'product-page' ];

		foreach ( array_keys( self::params() ) as $key ) {
			if ( preg_match( '/^query-\d+-page$/', $key ) ) {
				$params[] = $key;
			}
		}

		return $params;
	}

	/**
	 * The request's parameters that aren't filters or paging, for the filter
	 * form to keep when it's submitted without JavaScript (e.g. a search's
	 * `s`, a sort's `orderby`).
	 *
	 * @return array<string, string>
	 */
	public static function kept_params(): array {
		return array_diff_key( self::params(), array_flip( array_merge( Sources::params(), Sources::query_param_names(), self::paging_params() ) ) );
	}
}
