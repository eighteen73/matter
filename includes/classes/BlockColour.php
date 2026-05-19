<?php
/**
 * Shared helpers for carousel block custom colour CSS variables.
 *
 * @package Eighteen73\Blocks
 */

namespace Eighteen73\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves block colour attributes to inline CSS custom properties.
 */
class BlockColour {

	/**
	 * Resolves a single custom colour to a CSS value.
	 *
	 * @param string $slug   Preset colour slug.
	 * @param string $custom Custom hex colour.
	 * @return string CSS colour value or empty string.
	 */
	public static function get_custom_color_css_value( string $slug, string $custom ): string {
		if ( $slug ) {
			return 'var(--wp--preset--color--' . esc_attr( $slug ) . ')';
		}

		if ( $custom ) {
			return esc_attr( $custom );
		}

		return '';
	}

	/**
	 * Builds a semicolon-separated inline style string for custom colour CSS variables.
	 *
	 * @param array $attributes  Block attributes.
	 * @param array $definitions Array of definitions with slugAttr, customAttr, and cssVar keys.
	 * @return string Inline style string (may be empty).
	 */
	public static function build_custom_color_style_string( array $attributes, array $definitions ): string {
		$styles = [];

		foreach ( $definitions as $definition ) {
			$slug_attr   = $definition['slugAttr'] ?? '';
			$custom_attr = $definition['customAttr'] ?? '';
			$css_var     = $definition['cssVar'] ?? '';

			if ( ! $css_var ) {
				continue;
			}

			$slug   = isset( $attributes[ $slug_attr ] ) ? (string) $attributes[ $slug_attr ] : '';
			$custom = isset( $attributes[ $custom_attr ] ) ? (string) $attributes[ $custom_attr ] : '';
			$value  = self::get_custom_color_css_value( $slug, $custom );

			if ( $value ) {
				$styles[] = $css_var . ': ' . $value;
			}
		}

		$style = implode( '; ', $styles );

		// Trailing semicolon so get_block_wrapper_attributes() can append support styles (e.g. border-radius).
		return $style ? $style . ';' : '';
	}

	/**
	 * Dot colour definitions for render callbacks.
	 *
	 * @return array
	 */
	public static function get_dot_color_definitions(): array {
		return [
			[
				'slugAttr'   => 'dotColor',
				'customAttr' => 'customDotColor',
				'cssVar'     => '--eighteen73-blocks--carousel--dot--color',
			],
			[
				'slugAttr'   => 'dotActiveColor',
				'customAttr' => 'customDotActiveColor',
				'cssVar'     => '--eighteen73-blocks--carousel--dot--color-active',
			],
		];
	}

	/**
	 * Nav button arrow colour definitions for render callbacks.
	 *
	 * @return array
	 */
	public static function get_button_icon_color_definitions(): array {
		return [
			[
				'slugAttr'   => 'arrowColor',
				'customAttr' => 'customArrowColor',
				'cssVar'     => '--eighteen73-blocks--carousel--button--icon-color',
			],
		];
	}

	/**
	 * Progress bar colour definitions for render callbacks.
	 *
	 * @return array
	 */
	public static function get_progress_bar_color_definitions(): array {
		return [
			[
				'slugAttr'   => 'barColor',
				'customAttr' => 'customBarColor',
				'cssVar'     => '--eighteen73-blocks--carousel--progress--bar',
			],
		];
	}
}
