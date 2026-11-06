<?php
/**
 * Image crop for galleries and image carousels: one of the theme's aspect
 * ratio presets (theme.json `settings.dimensions.aspectRatios`), chosen on the
 * parent block and applied to every image through `--image-aspect-ratio`.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

defined( 'ABSPATH' ) || exit;

/**
 * Aspect ratio helpers.
 */
class AspectRatio {

	/**
	 * The CSS value for a preset slug, or 'auto' (the images' own ratio).
	 *
	 * @param string $slug Preset slug, or 'auto'.
	 * @return string Empty when the slug isn't a preset.
	 */
	public static function value( string $slug ): string {
		if ( 'auto' === $slug ) {
			return 'auto';
		}

		$presets = wp_get_global_settings( [ 'dimensions', 'aspectRatios' ] );

		foreach ( (array) $presets as $origin ) {
			foreach ( (array) $origin as $preset ) {
				if ( ( $preset['slug'] ?? '' ) === $slug && '' !== $slug ) {
					return sprintf( 'var(--wp--preset--aspect-ratio--%s)', _wp_to_kebab_case( $slug ) );
				}
			}
		}

		return '';
	}

	/**
	 * Wrapper style setting `--image-aspect-ratio`.
	 *
	 * @param string $slug Preset slug, or 'auto'.
	 * @return string Empty when the slug isn't a preset.
	 */
	public static function style( string $slug ): string {
		$value = self::value( $slug );

		if ( '' === $value ) {
			return '';
		}

		// Images keeping their own shape aren't cropped, even if the theme caps
		// their size (e.g. logos).
		return sprintf( '--image-aspect-ratio:%s;', $value ) . ( 'auto' === $value ? '--image-object-fit:contain;' : '' );
	}
}
