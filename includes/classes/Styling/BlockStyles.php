<?php
/**
 * Shared block style utilities.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Styling;

use Eighteen73\Matter\Config;

defined( 'ABSPATH' ) || exit;

/**
 * Resolve block style attributes into CSS custom property declarations.
 */
class BlockStyles {

	/**
	 * Resolve a stored color attribute value to a CSS color value.
	 *
	 * @param string $value Stored attribute value (slug or literal color).
	 * @return string
	 */
	private static function resolve_color_value( string $value ): string {
		if ( preg_match( '/^(#|rgb|hsl)/i', $value ) ) {
			return $value;
		}

		return "var(--wp--preset--color--{$value})";
	}

	/**
	 * Resolve a stored spacing attribute value to a CSS spacing value.
	 *
	 * @param string $value Stored attribute value (slug or literal spacing).
	 * @return string
	 */
	private static function resolve_spacing_value( string $value ): string {
		if ( '' === $value ) {
			return '0';
		}

		if ( preg_match( '/^(var\(|[\d.]+(px|rem|em|%|vh|vw)|clamp\()/i', $value ) ) {
			return $value;
		}

		return "var(--wp--preset--spacing--{$value})";
	}

	/**
	 * Resolve a stored attribute value to a CSS value by type.
	 *
	 * @param mixed  $value Stored attribute value.
	 * @param string $type  Resolver type (color, spacing, number).
	 * @return string
	 */
	public static function resolve_value( $value, string $type ): string {
		switch ( $type ) {
			case 'color':
				return self::resolve_color_value( (string) $value );
			case 'spacing':
				return self::resolve_spacing_value( (string) $value );
			case 'number':
				return (string) $value;
			default:
				return '';
		}
	}

	/**
	 * Get the style config for a block.
	 *
	 * @param string $block_key Block key from config/block-styles.json.
	 * @return array<string, mixed>
	 */
	public static function get_config( string $block_key ): array {
		return Config::get( 'block-styles', $block_key );
	}

	/**
	 * Build CSS custom property declarations for mapped block attributes.
	 *
	 * @param string               $block_key  Block key from config/block-styles.json.
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return array<string, string>
	 */
	public static function get_declarations( string $block_key, array $attributes ): array {
		$declarations = [];

		foreach ( self::get_config( $block_key ) as $attribute_name => $config ) {
			if ( ! isset( $attributes[ $attribute_name ] ) || '' === $attributes[ $attribute_name ] ) {
				continue;
			}

			if (
				! is_array( $config ) ||
				empty( $config['variable'] ) ||
				empty( $config['type'] )
			) {
				continue;
			}

			$css_variable   = (string) $config['variable'];
			$type           = (string) $config['type'];
			$resolved_value = self::resolve_value( $attributes[ $attribute_name ], $type );

			if ( '' === $resolved_value ) {
				continue;
			}

			$declarations[ $css_variable ] = $resolved_value;
		}

		return $declarations;
	}

	/**
	 * Build a style declaration string for mapped block style attributes.
	 *
	 * @param string               $block_key  Block key from config/block-styles.json.
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return string
	 */
	public static function get_styles( string $block_key, array $attributes ): string {
		$declarations = [];

		foreach ( self::get_declarations( $block_key, $attributes ) as $css_variable => $value ) {
			$declarations[] = "{$css_variable}: {$value}";
		}

		return empty( $declarations ) ? '' : implode( '; ', $declarations ) . ';';
	}
}
