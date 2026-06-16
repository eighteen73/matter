<?php
/**
 * Shared spacing style utilities.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Styling;

defined( 'ABSPATH' ) || exit;

/**
 * Resolve block spacing attribute values into CSS declarations.
 */
class Spacing {

	/**
	 * Resolve a stored spacing attribute value to a CSS spacing value.
	 *
	 * @param string $spacing Stored attribute value (slug or literal spacing).
	 * @return string
	 */
	public static function to_css_spacing_value( string $spacing ): string {
		if ( '' === $spacing ) {
			return '0';
		}

		if ( preg_match( '/^(var\(|[\d.]+(px|rem|em|%|vh|vw)|clamp\()/i', $spacing ) ) {
			return $spacing;
		}

		return "var(--wp--preset--spacing--{$spacing})";
	}

	/**
	 * Build responsive CSS custom property declarations for base and breakpoints.
	 *
	 * @param string $prefix            Variable prefix without suffix.
	 * @param string $base_value        Base attribute value.
	 * @param array  $breakpoint_layers Breakpoint layer values keyed by token.
	 * @param array  $breakpoint_tokens Breakpoint token list in priority order.
	 * @param string $option_key        Option key within breakpoint layer options.
	 * @return string
	 */
	public static function get_responsive_css_vars(
		string $prefix,
		string $base_value,
		array $breakpoint_layers,
		array $breakpoint_tokens,
		string $option_key = 'slideGap'
	): string {
		$declarations = [
			"{$prefix}: " . self::to_css_spacing_value( $base_value ),
		];

		foreach ( $breakpoint_tokens as $token ) {
			$token = (string) $token;

			if ( '' === $token ) {
				continue;
			}

			$layer_value = '';
			if (
				isset( $breakpoint_layers[ $token ]['options'][ $option_key ] ) &&
				is_string( $breakpoint_layers[ $token ]['options'][ $option_key ] )
			) {
				$layer_value = $breakpoint_layers[ $token ]['options'][ $option_key ];
			}

			$resolved_value = '' !== $layer_value ? $layer_value : $base_value;
			$declarations[] = "{$prefix}-{$token}: " . self::to_css_spacing_value( $resolved_value );
		}

		return implode( '; ', $declarations );
	}
}
