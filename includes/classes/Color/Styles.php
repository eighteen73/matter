<?php
/**
 * Shared color style utilities.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Color;

defined( 'ABSPATH' ) || exit;

/**
 * Resolve block color attribute values into CSS declarations.
 */
class Styles {

	/**
	 * Resolve a stored color attribute value to a CSS color value.
	 *
	 * @param string $color Stored attribute value (slug or literal color).
	 * @return string
	 */
	public static function to_css_color_value( string $color ): string {
		if ( preg_match( '/^(#|rgb|hsl)/i', $color ) ) {
			return $color;
		}

		return "var(--wp--preset--color--{$color})";
	}

	/**
	 * Build a style declaration string for mapped color attributes.
	 *
	 * @param array<string, mixed>  $attributes    Block attributes.
	 * @param array<string, string> $color_var_map Attribute to CSS variable map.
	 * @return string
	 */
	public static function get_styles( array $attributes, array $color_var_map ): string {
		$declarations = [];

		foreach ( $color_var_map as $attribute_name => $css_variable ) {
			if ( empty( $attributes[ $attribute_name ] ) ) {
				continue;
			}

			$resolved_value = self::to_css_color_value( (string) $attributes[ $attribute_name ] );
			$declarations[] = "{$css_variable}: {$resolved_value}";
		}

		$style = implode( '; ', $declarations );

		return '' !== $style ? "{$style};" : '';
	}
}
