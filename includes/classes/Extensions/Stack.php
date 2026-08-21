<?php
/**
 * Columns stack viewport styles from theme.json settings.viewport.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * Stack class.
 */
class Stack {

	use Singleton;

	/**
	 * Generated class names that must not persist on the wrapper.
	 *
	 * @var string[]
	 */
	private const STACK_CLASSES = [
		'has-stacked-states',
		'is-stacked-default',
		'is-not-stacked-default',
		'is-stacked-at-tablet',
		'is-not-stacked-at-tablet',
		'is-stacked-at-mobile',
		'is-not-stacked-at-mobile',
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
	 * Enqueue generated columns stack CSS.
	 *
	 * @return void
	 */
	public function enqueue_styles(): void {
		$css = $this->get_css();

		if ( '' === $css ) {
			return;
		}

		$handle = 'matter-extension-stack-viewports';

		if ( ! wp_style_is( $handle, 'registered' ) ) {
			wp_register_style( $handle, false, [], MATTER_VERSION );
		}

		wp_enqueue_style( $handle );
		wp_add_inline_style( $handle, $css );
	}

	/**
	 * Rebuild stack classes from the stacked attribute so leftover wrapper
	 * classes from extraProps cannot keep columns stacked after disable.
	 *
	 * @param string $block_content Block HTML.
	 * @param array  $block         Parsed block.
	 * @return string
	 */
	public function filter_rendered_block( string $block_content, array $block ): string {
		$stacked = $block['attrs']['stacked'] ?? null;

		if ( ! is_array( $stacked ) ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );

		if ( ! $processor->next_tag( [ 'class_name' => 'wp-block-columns' ] ) ) {
			return $block_content;
		}

		foreach ( self::STACK_CLASSES as $class_name ) {
			$processor->remove_class( $class_name );
		}

		foreach ( $this->get_stack_classes( $stacked ) as $class_name ) {
			$processor->add_class( $class_name );
		}

		return $processor->get_updated_html();
	}

	/**
	 * Class names for the current stacked attribute.
	 *
	 * @param array $stacked Stacked viewport flags.
	 * @return string[]
	 */
	private function get_stack_classes( array $stacked ): array {
		$classes = [ 'has-stacked-states' ];

		if ( true === ( $stacked['default'] ?? false ) ) {
			$classes[] = 'is-stacked-default';
		} else {
			$classes[] = 'is-not-stacked-default';
		}

		if ( true === ( $stacked['@tablet'] ?? null ) ) {
			$classes[] = 'is-stacked-at-tablet';
		} elseif ( false === ( $stacked['@tablet'] ?? null ) ) {
			$classes[] = 'is-not-stacked-at-tablet';
		}

		if ( true === ( $stacked['@mobile'] ?? null ) ) {
			$classes[] = 'is-stacked-at-mobile';
		} elseif ( false === ( $stacked['@mobile'] ?? null ) ) {
			$classes[] = 'is-not-stacked-at-mobile';
		}

		return $classes;
	}

	/**
	 * Build desktop-first stack utilities matching core 7.1 viewport ranges.
	 *
	 * Core Columns still stacks at a hardcoded 781/782px (tablet + mobile).
	 * Untouched blocks are narrowed to mobile only. `has-stacked-states`
	 * classes take over after the Layout toggle is used (and typically
	 * `is-not-stacked-on-mobile` from turning core stacking off).
	 *
	 * @return string
	 */
	public function get_css(): string {
		$viewports = $this->get_viewport_widths();
		$mobile    = $viewports['mobile'];
		$tablet    = $viewports['tablet'];

		$default_selector = '.wp-block-columns:not(.has-stacked-states):not(.is-not-stacked-on-mobile)';

		$css  = sprintf(
			'@media (width <= %1$s) { %2$s }',
			$mobile,
			$this->get_stack_rule( $default_selector )
		);
		$css .= sprintf(
			'@media (width > %1$s) { %2$s }',
			$mobile,
			$this->get_unstack_rule( $default_selector )
		);

		$css .= $this->get_stack_rule( '.wp-block-columns.has-stacked-states.is-stacked-default' );
		$css .= $this->get_unstack_rule( '.wp-block-columns.has-stacked-states.is-not-stacked-default' );

		$css .= sprintf(
			'@media (width <= %1$s) { %2$s %3$s }',
			$mobile,
			$this->get_stack_rule( '.wp-block-columns.has-stacked-states.is-stacked-at-mobile' ),
			$this->get_unstack_rule( '.wp-block-columns.has-stacked-states.is-not-stacked-at-mobile' )
		);

		$css .= sprintf(
			'@media (%1$s < width <= %2$s) { %3$s %4$s }',
			$mobile,
			$tablet,
			$this->get_stack_rule( '.wp-block-columns.has-stacked-states.is-stacked-at-tablet' ),
			$this->get_unstack_rule( '.wp-block-columns.has-stacked-states.is-not-stacked-at-tablet' )
		);

		return $css;
	}

	/**
	 * Stacked flex rules for a columns selector.
	 *
	 * @param string $selector Columns selector.
	 * @return string
	 */
	private function get_stack_rule( string $selector ): string {
		return sprintf(
			'%1$s { flex-wrap: wrap !important; } %1$s > .wp-block-column { flex-basis: 100%% !important; }',
			$selector
		);
	}

	/**
	 * Unstacked flex rules for a columns selector.
	 *
	 * @param string $selector Columns selector.
	 * @return string
	 */
	private function get_unstack_rule( string $selector ): string {
		return sprintf(
			'%1$s { flex-wrap: nowrap !important; } %1$s > .wp-block-column { flex-basis: 0 !important; flex-grow: 1; } %1$s > .wp-block-column[style*=flex-basis] { flex-grow: 0; }',
			$selector
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
