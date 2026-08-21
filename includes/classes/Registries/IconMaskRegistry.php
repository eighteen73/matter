<?php
/**
 * Generates CSS mask utilities for registered Matter icons.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Registries;

use Eighteen73\Matter\Icons\Registrar;
use Eighteen73\Matter\Plugin;
use Eighteen73\Matter\Singleton;
use Eighteen73\Matter\StyleEngine\StylesheetGenerator;

defined( 'ABSPATH' ) || exit;

/**
 * Icon mask stylesheet registry.
 */
class IconMaskRegistry implements StylesheetRegistryInterface {

	use Singleton;

	/**
	 * Cache key.
	 *
	 * @var string
	 */
	private const CACHE_KEY = 'matter_icon_mask_styles';

	/**
	 * Legacy collection prefix used in saved button content.
	 *
	 * @var string
	 */
	private const LEGACY_COLLECTION = 'pulsar-extensions';

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

		$css = $this->generate_css();

		if ( ! $is_development && '' !== $css ) {
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
		return 'matter-icon-mask-utilities';
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
	 * Build CSS rules from bundled SVG files.
	 *
	 * @return string
	 */
	private function generate_css(): string {
		$generator = new StylesheetGenerator();
		$files     = Registrar::instance()->get_icon_files();

		foreach ( $files as $file ) {
			$slug    = basename( $file, '.svg' );
			$content = $this->get_svg_source( $file );

			if ( '' === $content ) {
				continue;
			}

			$mask_url = $this->svg_to_data_uri( $content );

			if ( '' === $mask_url ) {
				continue;
			}

			$names = [
				Registrar::COLLECTION . '/' . $slug,
				self::LEGACY_COLLECTION . '/' . $slug,
			];

			foreach ( $names as $icon_name ) {
				$selector = $this->get_icon_selector( $icon_name );
				$generator->add_rule(
					$generator->generate_utility_class(
						$selector,
						[ '--icon' => $mask_url ],
						true
					)
				);
			}
		}

		return $generator->get_stylesheet();
	}

	/**
	 * Read SVG file contents.
	 *
	 * @param string $svg_file File path.
	 * @return string
	 */
	private function get_svg_source( string $svg_file ): string {
		if ( ! file_exists( $svg_file ) || ! is_readable( $svg_file ) ) {
			return '';
		}

		$svg_content = file_get_contents( $svg_file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

		if ( false === $svg_content || ! str_contains( $svg_content, '<svg' ) ) {
			return '';
		}

		return trim( $svg_content );
	}

	/**
	 * Convert SVG markup to a CSS data URI.
	 *
	 * @param string $svg SVG markup.
	 * @return string
	 */
	private function svg_to_data_uri( string $svg ): string {
		$svg     = preg_replace( '/>\s+</', '><', $svg );
		$svg     = preg_replace( '/\s+/', ' ', $svg );
		$svg     = str_replace( [ "\n", "\r", "\t" ], ' ', $svg ?? '' );
		$svg     = trim( $svg );
		$svg     = str_replace( '"', "'", $svg );
		$encoded = rawurlencode( $svg );

		return sprintf( 'url("data:image/svg+xml,%s")', $encoded );
	}

	/**
	 * Build a CSS selector for a namespaced icon.
	 *
	 * @param string $icon_name Namespaced icon name.
	 * @return string
	 */
	private function get_icon_selector( string $icon_name ): string {
		$class_name = str_replace( '/', '-', $icon_name );
		$class_name = sanitize_html_class( $class_name );

		return '.has-icon-' . $class_name;
	}
}
