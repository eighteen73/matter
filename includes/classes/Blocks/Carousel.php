<?php
/**
 * Carousel block.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Spacing\Styles;

defined( 'ABSPATH' ) || exit;

/**
 * Carousel block.
 */
class Carousel {
	/**
	 * Generate CSS variables for the carousel block.
	 *
	 * @param array $base_options The base options.
	 * @param array $breakpoint_layers The breakpoint layers.
	 * @param array $breakpoint_tokens The breakpoint tokens.
	 * @return array The CSS variables.
	 */
	public static function generate_css_variables( array $base_options, array $breakpoint_layers, array $breakpoint_tokens ): array {
		$css_variables = [];

		$css_variables = array_merge( $css_variables, self::generate_slides_to_show_css_variables( $base_options, $breakpoint_layers, $breakpoint_tokens ) );

		$css_variables = array_merge( $css_variables, self::generate_direction_css_variables( $base_options, $breakpoint_layers, $breakpoint_tokens ) );

		$css_variables = array_merge( $css_variables, self::generate_container_height_css_variables( $base_options, $breakpoint_layers, $breakpoint_tokens ) );

		$slide_gap_css_variables = Styles::get_responsive_css_vars(
			'--wp--custom--matter-carousel--slide--gap',
			isset( $base_options['slideGap'] ) && is_string( $base_options['slideGap'] ) ? $base_options['slideGap'] : '',
			$breakpoint_layers,
			$breakpoint_tokens
		);
		if ( '' !== $slide_gap_css_variables ) {
			$css_variables[] = $slide_gap_css_variables;
		}

		$css_variables = array_merge( $css_variables, self::generate_slide_gap_offset_css_variables( $base_options, $breakpoint_layers, $breakpoint_tokens ) );

		return $css_variables;
	}

	/**
	 * Generate CSS variables for the slides to show.
	 *
	 * @param array $base_options The base options.
	 * @param array $breakpoint_layers The breakpoint layers.
	 * @param array $breakpoint_tokens The breakpoint tokens.
	 * @return array The CSS variables.
	 */
	private static function generate_slides_to_show_css_variables( array $base_options, array $breakpoint_layers, array $breakpoint_tokens ): array {
		$base_slides_to_show = $base_options['slidesToShow'] ?? 1;
		$slides_to_show      = [
			'base' => $base_slides_to_show,
		];
		$previous_value      = $base_slides_to_show;

		foreach ( $breakpoint_tokens as $breakpoint ) {
			$previous_value                = $breakpoint_layers[ $breakpoint ]['options']['slidesToShow'] ?? $previous_value;
			$slides_to_show[ $breakpoint ] = $previous_value;
		}

		$css_variables = [];
		foreach ( $slides_to_show as $breakpoint => $value ) {
			$css_variables[] = "--wp--custom--matter-carousel--slides-to-show-{$breakpoint}: {$value}";
		}

		return $css_variables;
	}

	/**
	 * Generate CSS variables for the direction.
	 *
	 * @param array $base_options The base options.
	 * @param array $breakpoint_layers The breakpoint layers.
	 * @param array $breakpoint_tokens The breakpoint tokens.
	 * @return array The CSS variables.
	 */
	private static function generate_direction_css_variables( array $base_options, array $breakpoint_layers, array $breakpoint_tokens ): array {
		$axis_to_flex_direction = [
			'x' => 'row',
			'y' => 'column',
		];
		$base_axis              = isset( $base_options['axis'] ) && is_string( $base_options['axis'] ) ? $base_options['axis'] : 'x';
		$base_direction         = $axis_to_flex_direction[ $base_axis ] ?? 'row';

		$direction = [
			'base' => $base_direction,
		];
		foreach ( $breakpoint_tokens as $breakpoint ) {
			$breakpoint_axis          = $breakpoint_layers[ $breakpoint ]['options']['axis'] ?? $base_axis;
			$direction[ $breakpoint ] = $axis_to_flex_direction[ $breakpoint_axis ] ?? $direction['base'];
		}

		$css_variables = [];
		foreach ( $direction as $breakpoint => $value ) {
			$css_variables[] = "--wp--custom--matter-carousel--direction-{$breakpoint}: {$value}";
		}

		return $css_variables;
	}

	/**
	 * Generate CSS variables for the carousel container height.
	 *
	 * @param array $base_options The base options.
	 * @param array $breakpoint_layers The breakpoint layers.
	 * @param array $breakpoint_tokens The breakpoint tokens.
	 * @return array The CSS variables.
	 */
	private static function generate_container_height_css_variables( array $base_options, array $breakpoint_layers, array $breakpoint_tokens ): array {
		$base_axis  = isset( $base_options['axis'] ) && is_string( $base_options['axis'] ) ? $base_options['axis'] : 'x';
		$height_map = [
			'x' => 'auto',
			'y' => '400px',
		];

		$container_height = [
			'base' => $height_map[ $base_axis ] ?? 'auto',
		];
		foreach ( $breakpoint_tokens as $breakpoint ) {
			$breakpoint_axis                 = $breakpoint_layers[ $breakpoint ]['options']['axis'] ?? $base_axis;
			$container_height[ $breakpoint ] = $height_map[ $breakpoint_axis ] ?? $container_height['base'];
		}

		$css_variables = [];
		foreach ( $container_height as $breakpoint => $value ) {
			$css_variables[] = "--wp--custom--matter-carousel--container-height-{$breakpoint}: {$value}";
		}

		return $css_variables;
	}

	/**
	 * Generate CSS variables for axis-aware slide gap offsets.
	 *
	 * @param array $base_options The base options.
	 * @param array $breakpoint_layers The breakpoint layers.
	 * @param array $breakpoint_tokens The breakpoint tokens.
	 * @return array The CSS variables.
	 */
	private static function generate_slide_gap_offset_css_variables( array $base_options, array $breakpoint_layers, array $breakpoint_tokens ): array {
		$base_axis      = isset( $base_options['axis'] ) && is_string( $base_options['axis'] ) ? $base_options['axis'] : 'x';
		$base_axis      = in_array( $base_axis, [ 'x', 'y' ], true ) ? $base_axis : 'x';
		$base_slide_gap = isset( $base_options['slideGap'] ) && is_string( $base_options['slideGap'] ) ? $base_options['slideGap'] : '';
		$css_variables  = self::get_slide_gap_offset_css_variables( 'base', $base_axis, $base_slide_gap );

		foreach ( $breakpoint_tokens as $breakpoint ) {
			$breakpoint_axis = isset( $breakpoint_layers[ $breakpoint ]['options']['axis'] ) && is_string( $breakpoint_layers[ $breakpoint ]['options']['axis'] )
				? $breakpoint_layers[ $breakpoint ]['options']['axis']
				: $base_axis;
			$breakpoint_axis = in_array( $breakpoint_axis, [ 'x', 'y' ], true ) ? $breakpoint_axis : $base_axis;

			$breakpoint_slide_gap = isset( $breakpoint_layers[ $breakpoint ]['options']['slideGap'] ) && is_string( $breakpoint_layers[ $breakpoint ]['options']['slideGap'] )
				? $breakpoint_layers[ $breakpoint ]['options']['slideGap']
				: '';
			$resolved_slide_gap   = '' !== $breakpoint_slide_gap ? $breakpoint_slide_gap : $base_slide_gap;

			$css_variables = array_merge( $css_variables, self::get_slide_gap_offset_css_variables( (string) $breakpoint, $breakpoint_axis, $resolved_slide_gap ) );
		}

		return $css_variables;
	}

	/**
	 * Get slide gap offset CSS variables for a single breakpoint.
	 *
	 * @param string $breakpoint The breakpoint token.
	 * @param string $axis The resolved axis.
	 * @param string $slide_gap The resolved slide gap.
	 * @return array The CSS variables.
	 */
	private static function get_slide_gap_offset_css_variables( string $breakpoint, string $axis, string $slide_gap ): array {
		$css_slide_gap = Styles::to_css_spacing_value( $slide_gap );
		$left_gap      = 'x' === $axis ? $css_slide_gap : '0';
		$top_gap       = 'y' === $axis ? $css_slide_gap : '0';

		return [
			"--wp--custom--matter-carousel--slide--gap-left-{$breakpoint}: {$left_gap}",
			"--wp--custom--matter-carousel--slide--gap-top-{$breakpoint}: {$top_gap}",
		];
	}
}
