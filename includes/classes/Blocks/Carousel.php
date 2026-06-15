<?php
/**
 * Carousel block.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Styling\Spacing;
use Eighteen73\Matter\Config;

defined( 'ABSPATH' ) || exit;

/**
 * Carousel block.
 */
class Carousel {

	/**
	 * Generate carousel styles.
	 *
	 * @param string $carousel_id The carousel element ID.
	 * @param array  $attributes The block attributes.
	 * @return string The styles.
	 */
	public static function generate_styles( string $carousel_id, array $attributes ): string {
		$base_options      = isset( $attributes['emblaConfig']['options'] ) && is_array( $attributes['emblaConfig']['options'] )
			? $attributes['emblaConfig']['options']
			: [];
		$breakpoint_layers = isset( $attributes['emblaConfig']['breakpointLayers'] ) && is_array( $attributes['emblaConfig']['breakpointLayers'] )
			? $attributes['emblaConfig']['breakpointLayers']
			: [];
		$breakpoints       = Config::file( 'breakpoints' );
		$breakpoint_tokens = array_keys( $breakpoints );
		$resolved_values   = self::resolve_responsive_values( $base_options, $breakpoint_layers, $breakpoint_tokens );
		$css_rules         = self::build_responsive_rules( "#{$carousel_id}", $resolved_values, $breakpoints );

		return wp_style_engine_get_stylesheet_from_css_rules( $css_rules );
	}

	/**
	 * Resolve CSS variable values for base and breakpoint layers.
	 *
	 * @param array $base_options The base options.
	 * @param array $breakpoint_layers The breakpoint layers.
	 * @param array $breakpoint_tokens The breakpoint tokens.
	 * @return array The resolved values.
	 */
	private static function resolve_responsive_values( array $base_options, array $breakpoint_layers, array $breakpoint_tokens ): array {
		$axis_to_flex_direction = [
			'x' => 'row',
			'y' => 'column',
		];
		$axis_to_height         = [
			'x' => 'auto',
			'y' => '400px',
		];

		$base_axis           = isset( $base_options['axis'] ) && is_string( $base_options['axis'] ) ? $base_options['axis'] : 'x';
		$base_axis           = in_array( $base_axis, [ 'x', 'y' ], true ) ? $base_axis : 'x';
		$base_slide_gap      = isset( $base_options['slideGap'] ) && is_string( $base_options['slideGap'] ) ? $base_options['slideGap'] : '';
		$base_slides_to_show = $base_options['slidesToShow'] ?? 1;
		$resolved_values     = [
			'base' => self::get_resolved_values( $base_slides_to_show, $base_axis, $base_slide_gap, $axis_to_flex_direction, $axis_to_height ),
		];

		$previous_slides_to_show = $base_slides_to_show;
		$previous_axis           = $base_axis;
		$previous_slide_gap      = $base_slide_gap;

		foreach ( $breakpoint_tokens as $breakpoint ) {
			$breakpoint = (string) $breakpoint;
			if ( '' === $breakpoint ) {
				continue;
			}

			$options = isset( $breakpoint_layers[ $breakpoint ]['options'] ) && is_array( $breakpoint_layers[ $breakpoint ]['options'] )
				? $breakpoint_layers[ $breakpoint ]['options']
				: [];

			$previous_slides_to_show = $options['slidesToShow'] ?? $previous_slides_to_show;

			if ( isset( $options['axis'] ) && is_string( $options['axis'] ) && in_array( $options['axis'], [ 'x', 'y' ], true ) ) {
				$previous_axis = $options['axis'];
			}

			if ( isset( $options['slideGap'] ) && is_string( $options['slideGap'] ) && '' !== $options['slideGap'] ) {
				$previous_slide_gap = $options['slideGap'];
			}

			$resolved_values[ $breakpoint ] = self::get_resolved_values( $previous_slides_to_show, $previous_axis, $previous_slide_gap, $axis_to_flex_direction, $axis_to_height );
		}

		return $resolved_values;
	}

	/**
	 * Get resolved CSS values for one breakpoint.
	 *
	 * @param mixed  $slides_to_show The slides to show.
	 * @param string $axis The resolved axis.
	 * @param string $slide_gap The resolved slide gap.
	 * @param array  $axis_to_flex_direction Axis to flex-direction map.
	 * @param array  $axis_to_height Axis to height map.
	 * @return array The resolved values.
	 */
	private static function get_resolved_values( $slides_to_show, string $axis, string $slide_gap, array $axis_to_flex_direction, array $axis_to_height ): array {
		$css_slide_gap = Spacing::to_css_spacing_value( $slide_gap );

		return [
			'slides-to-show'   => (string) $slides_to_show,
			'direction'        => $axis_to_flex_direction[ $axis ] ?? 'row',
			'container-height' => $axis_to_height[ $axis ] ?? 'auto',
			'slide--gap'       => $css_slide_gap,
			'slide--gap-left'  => 'x' === $axis ? $css_slide_gap : '0',
			'slide--gap-top'   => 'y' === $axis ? $css_slide_gap : '0',
		];
	}

	/**
	 * Build Style Engine rules from resolved breakpoint values.
	 *
	 * @param string $selector The CSS selector.
	 * @param array  $resolved_values The resolved values.
	 * @param array  $breakpoints The breakpoint config.
	 * @return array The CSS rules.
	 */
	private static function build_responsive_rules( string $selector, array $resolved_values, array $breakpoints ): array {
		if ( empty( $resolved_values['base'] ) || ! is_array( $resolved_values['base'] ) ) {
			return [];
		}

		$css_rules = [
			[
				'selector'     => $selector,
				'declarations' => self::get_css_declarations( $resolved_values['base'] ),
			],
		];

		$previous_values = $resolved_values['base'];
		foreach ( $breakpoints as $breakpoint => $breakpoint_config ) {
			$breakpoint = (string) $breakpoint;
			if ( empty( $resolved_values[ $breakpoint ] ) || ! is_array( $resolved_values[ $breakpoint ] ) ) {
				continue;
			}

			$changed_values = [];
			foreach ( $resolved_values[ $breakpoint ] as $key => $value ) {
				if ( ! array_key_exists( $key, $previous_values ) || $value !== $previous_values[ $key ] ) {
					$changed_values[ $key ] = $value;
				}
			}

			$previous_values = $resolved_values[ $breakpoint ];

			if ( empty( $changed_values ) ) {
				continue;
			}

			$breakpoint_value = isset( $breakpoint_config['value'] ) && is_string( $breakpoint_config['value'] ) ? $breakpoint_config['value'] : '';
			if ( '' === $breakpoint_value ) {
				continue;
			}

			$css_rules[] = [
				'rules_group'  => "@media (min-width: {$breakpoint_value})",
				'selector'     => $selector,
				'declarations' => self::get_css_declarations( $changed_values ),
			];
		}

		return $css_rules;
	}

	/**
	 * Get CSS declarations.
	 *
	 * @param array $values The resolved values.
	 * @return array The declarations.
	 */
	private static function get_css_declarations( array $values ): array {
		$declarations = [];

		foreach ( $values as $key => $value ) {
			$declarations[ "--matter-carousel--{$key}" ] = $value;
		}

		return $declarations;
	}

	/**
	 * Generate carousel classes.
	 *
	 * @param array $attributes The block attributes.
	 * @return array The carousel classes.
	 */
	public static function generate_carousel_classes( array $attributes ): array {
		$carousel_classes  = [];
		$base_options      = isset( $attributes['emblaConfig']['options'] ) && is_array( $attributes['emblaConfig']['options'] )
			? $attributes['emblaConfig']['options']
			: [];
		$breakpoint_layers = isset( $attributes['emblaConfig']['breakpointLayers'] ) && is_array( $attributes['emblaConfig']['breakpointLayers'] )
			? $attributes['emblaConfig']['breakpointLayers']
			: [];
		$breakpoint_tokens = array_keys( Config::file( 'breakpoints' ) );
		$base_active       = ! isset( $base_options['active'] ) || false !== $base_options['active'];
		$has_disabled      = ! $base_active;

		if ( ! $base_active ) {
			$carousel_classes[] = 'carousel-disabled';
		}

		$previous_effective_active = $base_active;

		foreach ( $breakpoint_tokens as $breakpoint ) {
			$layer_active = $breakpoint_layers[ $breakpoint ]['options']['active'] ?? null;
			$active       = null !== $layer_active ? (bool) $layer_active : $previous_effective_active;

			if ( ! $active && $active !== $previous_effective_active ) {
				$carousel_classes[] = "carousel-disabled-on-{$breakpoint}";
			}

			if ( $active && $has_disabled && $active !== $previous_effective_active ) {
				$carousel_classes[] = "carousel-enabled-on-{$breakpoint}";
			}

			$previous_effective_active = $active;
		}

		return $carousel_classes;
	}

	/**
	 * Build carousel context.
	 *
	 * @param string $carousel_id The carousel element ID.
	 * @param array  $attributes The block attributes.
	 * @return array The carousel context.
	 */
	public static function build_carousel_context( string $carousel_id, array $attributes ): array {
		$embla_config = isset( $attributes['emblaConfig'] ) && is_array( $attributes['emblaConfig'] ) ? $attributes['emblaConfig'] : [];

		$advanced_embla_config = isset( $attributes['advancedEmblaConfig'] ) && is_array( $attributes['advancedEmblaConfig'] )
			? $attributes['advancedEmblaConfig']
			: [];

		$advanced_embla_config_merge = isset( $attributes['advancedEmblaConfigMerge'] )
			? (bool) $attributes['advancedEmblaConfigMerge']
			: false;

		return [
			'emblaConfig'              => $embla_config,
			'advancedEmblaConfig'      => $advanced_embla_config,
			'advancedEmblaConfigMerge' => $advanced_embla_config_merge,
			'carouselId'               => $carousel_id,
		];
	}
}
