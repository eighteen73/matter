<?php
/**
 * Column order viewport styles from theme.json settings.viewport.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * Order class.
 */
class Order {

	use Singleton;

	/**
	 * Highest order utility to generate.
	 *
	 * @var int
	 */
	private const MAX_ORDER = 12;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_styles' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_styles' ] );
		add_filter( 'render_block_core/column', [ $this, 'filter_rendered_block' ], 10, 2 );
	}

	/**
	 * Enqueue generated column order CSS.
	 *
	 * @return void
	 */
	public function enqueue_styles(): void {
		$css = $this->get_css();

		if ( '' === $css ) {
			return;
		}

		$handle = 'matter-extension-order-viewports';

		if ( ! wp_style_is( $handle, 'registered' ) ) {
			wp_register_style( $handle, false, [], MATTER_VERSION );
		}

		wp_enqueue_style( $handle );
		wp_add_inline_style( $handle, $css );
	}

	/**
	 * Rebuild order classes from the columnOrder attribute so leftover
	 * wrapper classes from extraProps cannot keep a stale order.
	 *
	 * @param string $block_content Block HTML.
	 * @param array  $block         Parsed block.
	 * @return string
	 */
	public function filter_rendered_block( string $block_content, array $block ): string {
		$column_order = $block['attrs']['columnOrder'] ?? null;

		if ( ! is_array( $column_order ) ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );

		if ( ! $processor->next_tag( [ 'class_name' => 'wp-block-column' ] ) ) {
			return $block_content;
		}

		$this->remove_order_classes( $processor );

		foreach ( $this->get_order_classes( $column_order ) as $class_name ) {
			$processor->add_class( $class_name );
		}

		return $processor->get_updated_html();
	}

	/**
	 * Strip generated order utilities from the current tag.
	 *
	 * @param WP_HTML_Tag_Processor $processor Tag processor.
	 * @return void
	 */
	private function remove_order_classes( WP_HTML_Tag_Processor $processor ): void {
		$processor->remove_class( 'has-order-states' );

		for ( $order = 1; $order <= self::MAX_ORDER; $order++ ) {
			$processor->remove_class( 'is-order-default-' . $order );
			$processor->remove_class( 'is-order-at-tablet-' . $order );
			$processor->remove_class( 'is-order-at-mobile-' . $order );
		}
	}

	/**
	 * Class names for the current columnOrder attribute.
	 *
	 * @param array $column_order Order viewport values.
	 * @return string[]
	 */
	private function get_order_classes( array $column_order ): array {
		$classes = [ 'has-order-states' ];

		$default = $this->sanitize_order( $column_order['default'] ?? null );
		$tablet  = $this->sanitize_order( $column_order['@tablet'] ?? null );
		$mobile  = $this->sanitize_order( $column_order['@mobile'] ?? null );

		if ( $default ) {
			$classes[] = 'is-order-default-' . $default;
		}

		if ( $tablet ) {
			$classes[] = 'is-order-at-tablet-' . $tablet;
		}

		if ( $mobile ) {
			$classes[] = 'is-order-at-mobile-' . $mobile;
		}

		return $classes;
	}

	/**
	 * Build desktop-first order utilities matching core 7.1 viewport ranges.
	 *
	 * @return string
	 */
	public function get_css(): string {
		$viewports = $this->get_viewport_widths();
		$mobile    = $viewports['mobile'];
		$tablet    = $viewports['tablet'];

		$css  = $this->get_order_rules( 'is-order-default', '' );
		$css .= $this->get_order_rules(
			'is-order-at-mobile',
			sprintf( '@media (width <= %s)', $mobile )
		);
		$css .= $this->get_order_rules(
			'is-order-at-tablet',
			sprintf( '@media (%1$s < width <= %2$s)', $mobile, $tablet )
		);

		return $css;
	}

	/**
	 * Order utilities for a class prefix, optionally wrapped in a media query.
	 *
	 * @param string $class_prefix Class prefix without the numeric suffix.
	 * @param string $media_query  Optional media query wrapper.
	 * @return string
	 */
	private function get_order_rules( string $class_prefix, string $media_query ): string {
		$rules = '';

		for ( $order = 1; $order <= self::MAX_ORDER; $order++ ) {
			$rules .= sprintf(
				'.wp-block-column.has-order-states.%1$s-%2$d { order: %2$d; }',
				$class_prefix,
				$order
			);
		}

		if ( '' === $media_query ) {
			return $rules;
		}

		return sprintf( '%s { %s }', $media_query, $rules );
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
	 * Allow only positive integers up to MAX_ORDER.
	 *
	 * @param mixed $value Raw order.
	 * @return int
	 */
	private function sanitize_order( $value ): int {
		if ( is_numeric( $value ) ) {
			$order = (int) $value;

			if ( (float) $value === (float) $order && $order >= 1 && $order <= self::MAX_ORDER ) {
				return $order;
			}
		}

		return 0;
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
