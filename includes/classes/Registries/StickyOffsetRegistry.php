<?php
/**
 * Sticky offset utility classes from theme.json spacing.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Registries;

use Eighteen73\Matter\Plugin;
use Eighteen73\Matter\Singleton;
use Eighteen73\Matter\StyleEngine\StylesheetGenerator;

defined( 'ABSPATH' ) || exit;

/**
 * Sticky offset stylesheet registry.
 */
class StickyOffsetRegistry implements StylesheetRegistryInterface {

	use Singleton;

	/**
	 * Cache key.
	 *
	 * @var string
	 */
	private const CACHE_KEY = 'matter_sticky_offset_styles';

	/**
	 * Get generated CSS.
	 *
	 * @return string
	 */
	public function get_css(): string {
		$is_development = Plugin::is_development_mode();

		if ( ! $is_development ) {
			$cached = get_transient( self::CACHE_KEY );
			if ( false !== $cached && is_string( $cached ) ) {
				return $cached;
			}
		}

		$spacing_scale = $this->get_spacing_scale();
		$css           = $this->generate_offset_variable_classes( $spacing_scale );
		$css          .= $this->generate_unstick_viewport_classes();

		if ( ! $is_development ) {
			set_transient( self::CACHE_KEY, $css, DAY_IN_SECONDS );
		}

		return $css;
	}

	/**
	 * Get stylesheet handle.
	 *
	 * @return string
	 */
	public function get_handle(): string {
		return 'matter-sticky-offset-utilities';
	}

	/**
	 * Clear the cache.
	 *
	 * @return bool
	 */
	public function clear_cache(): bool {
		return delete_transient( self::CACHE_KEY );
	}

	/**
	 * Get the spacing scale from theme.json.
	 *
	 * @return array<int, array<string, string>>
	 */
	private function get_spacing_scale(): array {
		$settings = wp_get_global_settings();
		$spacing  = $settings['spacing']['spacingSizes'] ?? [];

		if ( empty( $spacing ) ) {
			return [];
		}

		$spacing_items = [];

		if ( isset( $spacing['theme'] ) && is_array( $spacing['theme'] ) ) {
			$spacing_items = $spacing['theme'];
		} elseif ( isset( $spacing['default'] ) && is_array( $spacing['default'] ) ) {
			$spacing_items = $spacing['default'];
		} elseif ( isset( $spacing[0] ) ) {
			$spacing_items = $spacing;
		} else {
			foreach ( $spacing as $scale ) {
				if ( is_array( $scale ) ) {
					$spacing_items = array_merge( $spacing_items, $scale );
				}
			}
		}

		/**
		 * Filter the spacing scale used for sticky offsets.
		 *
		 * @param array $spacing_items Array of spacing preset definitions.
		 */
		return apply_filters( 'matter_sticky_offset_spacing', $spacing_items );
	}

	/**
	 * Generate sticky offset utility classes.
	 *
	 * @param array<int, array<string, string>> $spacing_scale Spacing preset definitions.
	 * @return string
	 */
	private function generate_offset_variable_classes( array $spacing_scale ): string {
		$generator = new StylesheetGenerator();

		$generator->add_rule(
			$generator->generate_utility_class(
				'.is-sticky-offset-0',
				[
					'--sticky-offset' => '0px',
				],
				true
			)
		);

		foreach ( $spacing_scale as $spacing ) {
			$slug = $spacing['slug'] ?? '';

			if ( empty( $slug ) ) {
				continue;
			}

			$slug = sanitize_html_class( $slug );
			$rule = $generator->generate_utility_class(
				".is-sticky-offset-{$slug}",
				[
					'--sticky-offset' => "var(--wp--preset--spacing--{$slug})",
				],
				true
			);

			$generator->add_rule( $rule );
		}

		return $generator->get_stylesheet();
	}

	/**
	 * Unstick sticky Groups at Mobile / Tablet viewports from theme.json.
	 *
	 * @return string
	 */
	private function generate_unstick_viewport_classes(): string {
		$css       = '';
		$viewports = $this->get_viewport_widths();

		foreach ( $viewports as $name => $width ) {
			$slug = sanitize_html_class( $name );

			$css .= sprintf(
				'@media (width <= %1$s) { .is-position-sticky.is-unstuck-on-mobile.is-unstuck-on-%2$s { position: static; } }',
				$width,
				$slug
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
