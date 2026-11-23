<?php
/**
 * `sizes` for wide and full-width images.
 *
 * Core writes an image's `sizes` from the size chosen for it ("Large" gives
 * `(max-width: 1024px) 100vw, 1024px`), so a full-width image is downloaded
 * at 1024px and stretched across a wider screen, though its `srcset` has
 * larger files. Wide and full images get `sizes` from their alignment
 * instead: the theme's wide size, or the viewport.
 *
 * Set as the block renders: core then adds the `srcset` and keeps this
 * `sizes` (and puts `auto, ` before it for lazy-loaded images, so the
 * browser works their size out from the layout, with this as the fallback).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * `sizes` for wide and full-width images.
 */
class ImageSizes {

	use Singleton;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_core/image', [ $this, 'render' ], 10, 2 );
		add_filter( 'render_block_core/post-featured-image', [ $this, 'render' ], 10, 2 );
	}

	/**
	 * The `sizes` an alignment needs, or null to keep core's.
	 *
	 * @param string $align Block alignment.
	 * @return string|null
	 */
	public static function sizes_for( string $align ): ?string {
		if ( 'full' === $align ) {
			return '100vw';
		}

		if ( 'wide' !== $align ) {
			return null;
		}

		$wide = wp_get_global_settings( [ 'layout', 'wideSize' ] );
		$wide = is_string( $wide ) ? $wide : '';

		// A plain length; anything else (clamp(), a variable) can't go in
		// `sizes`, and the viewport is the safe upper bound.
		return preg_match( '/^\d+(\.\d+)?(px|rem|em)$/', $wide )
			? sprintf( '(max-width: %1$s) 100vw, %1$s', $wide )
			: '100vw';
	}

	/**
	 * Set `sizes` on a wide or full-width image.
	 *
	 * @param string $content Rendered block.
	 * @param array  $block   Parsed block.
	 * @return string
	 */
	public function render( string $content, array $block ): string {
		$sizes = self::sizes_for( (string) ( $block['attrs']['align'] ?? '' ) );

		if ( null === $sizes ) {
			return $content;
		}

		$tags = new WP_HTML_Tag_Processor( $content );

		if ( ! $tags->next_tag( 'img' ) ) {
			return $content;
		}

		// Already worked out from the layout.
		if ( str_starts_with( strtolower( (string) $tags->get_attribute( 'sizes' ) ), 'auto' ) ) {
			return $content;
		}

		$tags->set_attribute( 'sizes', $sizes );

		return $tags->get_updated_html();
	}
}
