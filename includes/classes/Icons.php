<?php
/**
 * Icons from the WordPress icon registry, for Matter's icon choices (button
 * icons, tab icons). The theme limits which collections editors see.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

defined( 'ABSPATH' ) || exit;

/**
 * Icon helpers.
 */
class Icons {

	/**
	 * Icon collections offered in the editor (empty = all).
	 *
	 * @return string[]
	 */
	public static function collections(): array {
		/**
		 * Filters the icon collections editors can choose icons from.
		 *
		 * @param string[] $collections Collection slugs; empty allows every collection.
		 */
		return array_values( (array) apply_filters( 'matter_icon_collections', [] ) );
	}

	/**
	 * An icon's inline SVG, wrapped in a span with the given class.
	 *
	 * @param string $name  Icon name, e.g. pulsar/arrow-right.
	 * @param string $classname Wrapper class.
	 * @return string Empty when the icon doesn't exist.
	 */
	public static function render( string $name, string $classname ): string {
		if ( '' === $name || ! function_exists( 'wp_get_icon' ) ) {
			return '';
		}

		$svg = (string) wp_get_icon( $name, [ 'size' => null ] );

		return '' !== $svg
			? sprintf( '<span class="%1$s" aria-hidden="true">%2$s</span>', esc_attr( $classname ), $svg )
			: '';
	}
}
