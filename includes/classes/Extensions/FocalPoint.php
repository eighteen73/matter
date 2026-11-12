<?php
/**
 * Focal points for cropped images.
 *
 * Sections crop images to fixed ratios (object-fit: cover), so editors choose
 * which part stays in view:
 * - featured images: `_thumbnail_focal_point` post meta, applied wherever
 *   core/post-featured-image renders the post's image;
 * - image blocks: core/image's own `focalPoint` attribute. Core only offers
 *   and saves it for images with a scale (object-fit) set; Matter offers it on
 *   every image, as sections crop images in CSS.
 *
 * Both output `object-position` on the <img>, replacing any core saved.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * Focal points for cropped images.
 */
class FocalPoint {

	use Singleton;

	/**
	 * Featured image focal point meta key.
	 */
	public const META_KEY = '_thumbnail_focal_point';

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register_meta' ], 20 );
		add_filter( 'render_block_core/post-featured-image', [ $this, 'render_featured_image' ], 10, 3 );
		add_filter( 'render_block_core/image', [ $this, 'render_image' ], 10, 2 );
	}

	/**
	 * Register the featured image focal point meta for post types with thumbnails.
	 *
	 * @return void
	 */
	public function register_meta(): void {
		foreach ( get_post_types( [ 'show_in_rest' => true ] ) as $post_type ) {
			if ( ! post_type_supports( $post_type, 'thumbnail' ) ) {
				continue;
			}

			register_post_meta(
				$post_type,
				self::META_KEY,
				[
					'type'              => 'object',
					'single'            => true,
					'show_in_rest'      => [
						'schema' => [
							'type'       => 'object',
							'properties' => [
								'x' => [ 'type' => 'number' ],
								'y' => [ 'type' => 'number' ],
							],
						],
					],
					'auth_callback'     => fn( $allowed, $meta_key, $post_id ) => current_user_can( 'edit_post', $post_id ),
					'sanitize_callback' => [ self::class, 'sanitize' ],
				]
			);
		}
	}

	/**
	 * Apply a post's featured image focal point.
	 *
	 * @param string   $block_content Rendered block.
	 * @param array    $block         Parsed block.
	 * @param WP_Block $instance      Block instance.
	 * @return string
	 */
	public function render_featured_image( string $block_content, array $block, WP_Block $instance ): string {
		$post_id = (int) ( $instance->context['postId'] ?? get_the_ID() );
		$point   = $post_id ? get_post_meta( $post_id, self::META_KEY, true ) : null;

		return self::apply( $block_content, $point );
	}

	/**
	 * Apply an image block's focal point.
	 *
	 * @param string $block_content Rendered block.
	 * @param array  $block         Parsed block.
	 * @return string
	 */
	public function render_image( string $block_content, array $block ): string {
		return self::apply( $block_content, $block['attrs']['focalPoint'] ?? null );
	}

	/**
	 * Clamp a focal point to 0–1 on both axes.
	 *
	 * @param mixed $value Raw value.
	 * @return array{x: float, y: float}|null
	 */
	public static function sanitize( mixed $value ): ?array {
		if ( ! is_array( $value ) || ! isset( $value['x'], $value['y'] ) ) {
			return null;
		}

		return [
			'x' => min( 1, max( 0, (float) $value['x'] ) ),
			'y' => min( 1, max( 0, (float) $value['y'] ) ),
		];
	}

	/**
	 * Add object-position to the first <img>, unless it's the default centre.
	 *
	 * @param string $block_content Rendered block.
	 * @param mixed  $point         Focal point.
	 * @return string
	 */
	private static function apply( string $block_content, mixed $point ): string {
		$point = self::sanitize( $point );

		if ( null === $point || ( 0.5 === $point['x'] && 0.5 === $point['y'] ) ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );

		if ( ! $processor->next_tag( 'img' ) ) {
			return $block_content;
		}

		// Replace an object-position core saved (images with a scale set).
		$style = (string) preg_replace( '/(?:^|;)\s*object-position\s*:[^;]*/i', '', (string) $processor->get_attribute( 'style' ) );
		$style = trim( $style, " \t\n\r\0\x0B;" );
		$style = ( '' !== $style ? $style . ';' : '' ) . sprintf( 'object-position:%s%% %s%%', round( $point['x'] * 100, 2 ), round( $point['y'] * 100, 2 ) );

		$processor->set_attribute( 'style', $style );

		return $processor->get_updated_html();
	}
}
