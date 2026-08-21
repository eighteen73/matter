<?php
/**
 * Columns stack viewport styles from theme.json settings.viewport.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Stack class.
 */
class Stack {

	use Singleton;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_styles' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_styles' ] );
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
	 * Build CSS that restacks Columns using core viewport widths.
	 *
	 * Core Columns still stacks at a hardcoded 781/782px. These utilities
	 * let an instance opt into Mobile or Tablet from settings.viewport.
	 *
	 * @return string
	 */
	public function get_css(): string {
		$viewports = $this->get_viewport_widths();
		$css       = '';

		foreach ( $viewports as $name => $width ) {
			$selector = ".wp-block-columns:not(.is-not-stacked-on-mobile).is-stacked-on-viewport-{$name}";

			// Core stacks at max-width 781px and unstacks at min-width 782px.
			// Use width < / >= so a 782px tablet token matches that split.
			$css .= sprintf(
				'@media (width < %1$s) { %2$s { flex-wrap: wrap !important; } %2$s > .wp-block-column { flex-basis: 100%% !important; } }',
				$width,
				$selector
			);

			$css .= sprintf(
				'@media (width >= %1$s) { %2$s { flex-wrap: nowrap !important; } %2$s > .wp-block-column { flex-basis: 0 !important; flex-grow: 1; } %2$s > .wp-block-column[style*=flex-basis] { flex-grow: 0; } }',
				$width,
				$selector
			);
		}

		return $css;
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
