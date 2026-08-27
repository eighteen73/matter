<?php
/**
 * Columns reverse viewport styles from theme.json settings.viewport.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * Reverse class.
 */
class Reverse {

	use Singleton;

	/**
	 * Generated class names that must not persist on the wrapper.
	 *
	 * @var string[]
	 */
	private const REVERSE_CLASSES = [
		'has-reversed-states',
		'is-reversed-default',
		'is-not-reversed-default',
		'is-reversed-at-tablet',
		'is-not-reversed-at-tablet',
		'is-reversed-at-mobile',
		'is-not-reversed-at-mobile',
	];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_styles' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_styles' ] );
		add_filter( 'render_block_core/columns', [ $this, 'filter_rendered_block' ], 10, 2 );
	}

	/**
	 * Enqueue generated columns reverse CSS.
	 *
	 * @return void
	 */
	public function enqueue_styles(): void {
		$css = $this->get_css();

		if ( '' === $css ) {
			return;
		}

		$handle = 'matter-extension-reverse-viewports';

		if ( ! wp_style_is( $handle, 'registered' ) ) {
			wp_register_style( $handle, false, [], MATTER_VERSION );
		}

		wp_enqueue_style( $handle );
		wp_add_inline_style( $handle, $css );
	}

	/**
	 * Rebuild reverse classes from the reversed attribute so leftover wrapper
	 * classes from extraProps cannot keep columns reversed after disable.
	 *
	 * @param string $block_content Block HTML.
	 * @param array  $block         Parsed block.
	 * @return string
	 */
	public function filter_rendered_block( string $block_content, array $block ): string {
		$reversed = $block['attrs']['reversed'] ?? null;

		if ( ! is_array( $reversed ) ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );

		if ( ! $processor->next_tag( [ 'class_name' => 'wp-block-columns' ] ) ) {
			return $block_content;
		}

		foreach ( self::REVERSE_CLASSES as $class_name ) {
			$processor->remove_class( $class_name );
		}

		foreach ( $this->get_reverse_classes( $reversed ) as $class_name ) {
			$processor->add_class( $class_name );
		}

		return $processor->get_updated_html();
	}

	/**
	 * Class names for the current reversed attribute.
	 *
	 * @param array $reversed Reversed viewport flags.
	 * @return string[]
	 */
	private function get_reverse_classes( array $reversed ): array {
		$classes = [ 'has-reversed-states' ];

		if ( true === ( $reversed['default'] ?? false ) ) {
			$classes[] = 'is-reversed-default';
		} else {
			$classes[] = 'is-not-reversed-default';
		}

		if ( true === ( $reversed['@tablet'] ?? null ) ) {
			$classes[] = 'is-reversed-at-tablet';
		} elseif ( false === ( $reversed['@tablet'] ?? null ) ) {
			$classes[] = 'is-not-reversed-at-tablet';
		}

		if ( true === ( $reversed['@mobile'] ?? null ) ) {
			$classes[] = 'is-reversed-at-mobile';
		} elseif ( false === ( $reversed['@mobile'] ?? null ) ) {
			$classes[] = 'is-not-reversed-at-mobile';
		}

		return $classes;
	}

	/**
	 * Build desktop-first reverse utilities matching stack viewport ranges.
	 *
	 * Reversed columns use row-reverse when unstacked and column-reverse when
	 * stacked so wrap-based stacking and theme column stacking both reverse.
	 *
	 * @return string
	 */
	public function get_css(): string {
		$viewports = $this->get_viewport_widths();
		$mobile    = $viewports['mobile'];
		$tablet    = $viewports['tablet'];

		$css  = $this->get_default_rules();
		$css .= $this->get_viewport_rules(
			'is-reversed-at-mobile',
			'is-not-reversed-at-mobile',
			'is-stacked-at-mobile',
			'is-not-stacked-at-mobile',
			true,
			sprintf( '@media (width <= %s)', $mobile )
		);
		$css .= $this->get_viewport_rules(
			'is-reversed-at-tablet',
			'is-not-reversed-at-tablet',
			'is-stacked-at-tablet',
			'is-not-stacked-at-tablet',
			false,
			sprintf( '@media (%1$s < width <= %2$s)', $mobile, $tablet )
		);

		return $css;
	}

	/**
	 * Reverse rules that apply at every width until a viewport query overrides.
	 *
	 * @return string
	 */
	private function get_default_rules(): string {
		$prefix = '.wp-block-columns.has-reversed-states';

		$css  = $this->get_direction_rule( "{$prefix}.is-reversed-default.has-stacked-states.is-stacked-default", 'column-reverse' );
		$css .= $this->get_direction_rule( "{$prefix}.is-reversed-default.has-stacked-states.is-not-stacked-default", 'row-reverse' );
		$css .= $this->get_direction_rule( "{$prefix}.is-reversed-default:not(.has-stacked-states)", 'row-reverse' );

		return $css;
	}

	/**
	 * Reverse rules for a tablet or mobile query.
	 *
	 * @param string $reverse_on         Reverse class for this viewport.
	 * @param string $reverse_off        Not-reverse class for this viewport.
	 * @param string $stacked_on         Stacked class for this viewport.
	 * @param string $stacked_off        Unstacked class for this viewport.
	 * @param bool   $core_mobile_stack  Whether core stacked-on-mobile applies.
	 * @param string $media_query        Media query wrapper.
	 * @return string
	 */
	private function get_viewport_rules(
		string $reverse_on,
		string $reverse_off,
		string $stacked_on,
		string $stacked_off,
		bool $core_mobile_stack,
		string $media_query
	): string {
		$prefix = '.wp-block-columns.has-reversed-states';

		$rules  = $this->get_direction_rule( "{$prefix}.{$reverse_on}.has-stacked-states.{$stacked_on}", 'column-reverse' );
		$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_on}.has-stacked-states.{$stacked_off}", 'row-reverse' );
		$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_on}.has-stacked-states.is-stacked-default:not(.{$stacked_off}):not(.{$stacked_on})", 'column-reverse' );
		$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_on}.has-stacked-states.is-not-stacked-default:not(.{$stacked_on}):not(.{$stacked_off})", 'row-reverse' );

		if ( $core_mobile_stack ) {
			$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_on}:not(.has-stacked-states):not(.is-not-stacked-on-mobile)", 'column-reverse' );
			$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_on}:not(.has-stacked-states).is-not-stacked-on-mobile", 'row-reverse' );
			$rules .= $this->get_direction_rule( "{$prefix}.is-reversed-default:not(.{$reverse_off}):not(.has-stacked-states):not(.is-not-stacked-on-mobile)", 'column-reverse' );
		} else {
			$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_on}:not(.has-stacked-states)", 'row-reverse' );
		}

		$rules .= $this->get_direction_rule( "{$prefix}.is-reversed-default:not(.{$reverse_off}).has-stacked-states.{$stacked_on}", 'column-reverse' );
		$rules .= $this->get_direction_rule( "{$prefix}.is-reversed-default:not(.{$reverse_off}).has-stacked-states.{$stacked_off}", 'row-reverse' );

		$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_off}.has-stacked-states.is-stacked-default", 'row' );
		$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_off}.has-stacked-states.is-not-stacked-default", 'row' );
		$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_off}.has-stacked-states.{$stacked_on}", 'row' );
		$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_off}.has-stacked-states.{$stacked_off}", 'row' );
		$rules .= $this->get_direction_rule( "{$prefix}.{$reverse_off}:not(.has-stacked-states)", 'row' );

		return sprintf( '%s { %s }', $media_query, $rules );
	}

	/**
	 * Flex-direction rule for a columns selector.
	 *
	 * @param string $selector  Columns selector.
	 * @param string $direction Flex direction.
	 * @return string
	 */
	private function get_direction_rule( string $selector, string $direction ): string {
		return sprintf(
			'%1$s { flex-direction: %2$s !important; }',
			$selector,
			$direction
		);
	}

	/**
	 * Viewport widths from theme.json, with core defaults.
	 *
	 * @return array<string, string>
	 */
	private function get_viewport_widths(): array {
		$settings = wp_get_global_settings();
		$viewport = is_array( $settings['viewport'] ?? null ) ? $settings['viewport'] : [];

		return [
			'mobile' => $this->sanitize_length( $viewport['mobile'] ?? '', '480px' ),
			'tablet' => $this->sanitize_length( $viewport['tablet'] ?? '', '782px' ),
		];
	}

	/**
	 * Allow only non-negative px/em/rem lengths.
	 *
	 * @param mixed  $value    Raw setting.
	 * @param string $fallback Fallback length.
	 * @return string
	 */
	private function sanitize_length( $value, string $fallback ): string {
		if ( ! is_string( $value ) ) {
			return $fallback;
		}

		$value = trim( $value );

		if ( preg_match( '/^[0-9]+(\.[0-9]+)?(px|em|rem)$/', $value ) ) {
			return $value;
		}

		return $fallback;
	}
}
