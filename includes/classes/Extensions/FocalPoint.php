<?php
/**
 * Post Featured Image Focal Point extension class.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * Focal Point class.
 */
class FocalPoint {

	use Singleton;

	/**
	 * Default focal point value (matches REST schema). Never store null to avoid REST "cannot be updated to null" errors.
	 *
	 * @var array{x: float, y: float}
	 */
	private const DEFAULT_FOCAL_POINT = [
		'x' => 0.5,
		'y' => 0.5,
	];

	/**
	 * Setup the class.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register_meta' ], 20 );
		add_filter( 'render_block_core/post-featured-image', [ $this, 'render_focal_point' ], 10, 3 );
	}

	/**
	 * Register meta only for post types that support featured image (thumbnail).
	 *
	 * @return void
	 */
	public function register_meta(): void {
		$post_types = get_post_types( [ 'show_in_rest' => true ], 'objects' );
		foreach ( $post_types as $post_type ) {
			if ( ! post_type_supports( $post_type->name, 'thumbnail' ) ) {
				continue;
			}
			register_post_meta(
				$post_type->name,
				'_thumbnail_focal_point',
				[
					'show_in_rest'      => [
						'schema' => [
							'type'       => 'object',
							'properties' => [
								'x' => [
									'type'    => 'number',
									'minimum' => 0,
									'maximum' => 1,
								],
								'y' => [
									'type'    => 'number',
									'minimum' => 0,
									'maximum' => 1,
								],
							],
							'required'   => [ 'x', 'y' ],
							'default'    => self::DEFAULT_FOCAL_POINT,
						],
					],
					'single'            => true,
					'type'              => 'object',
					'default'           => self::DEFAULT_FOCAL_POINT,
					'auth_callback'     => function ( $allowed, $meta_key, $post_id ) {
						return current_user_can( 'edit_post', $post_id );
					},
					'sanitize_callback' => function ( $value ) {
						if ( $value === null || ! is_array( $value ) ) {
							return self::DEFAULT_FOCAL_POINT;
						}
						return [
							'x' => isset( $value['x'] ) ? $this->clamp_focal_point( (float) $value['x'] ) : 0.5,
							'y' => isset( $value['y'] ) ? $this->clamp_focal_point( (float) $value['y'] ) : 0.5,
						];
					},
				]
			);
		}
	}

	/**
	 * Add the intro class to the group.
	 *
	 * @param string   $block_content The block content.
	 * @param array    $block         The block.
	 * @param WP_Block $instance The block instance.
	 *
	 * @return string
	 */
	public function render_focal_point( string $block_content, array $block, WP_Block $instance ): string {

		$post_id = 0;
		if ( isset( $instance->context['postId'] ) ) {
			$post_id = (int) $instance->context['postId'];
		}
		if ( $post_id <= 0 ) {
			return $block_content;
		}

		// get the post featured image focal point
		$focal_point_object = get_post_meta( $post_id, '_thumbnail_focal_point', true );

		// if the focal point is set, add the style attribute to the image
		if ( is_array( $focal_point_object ) && isset( $focal_point_object['x'], $focal_point_object['y'] ) ) {
			$focal_point = round( $this->clamp_focal_point( (float) $focal_point_object['x'] ) * 100 ) . '% ' . round( $this->clamp_focal_point( (float) $focal_point_object['y'] ) * 100 ) . '%';
			$tags        = new WP_HTML_Tag_Processor( $block_content );

			if ( ! $tags->next_tag( [ 'tag_name' => 'img' ] ) ) {
				return $block_content;
			}

			$current_style = $tags->get_attribute( 'style' );
			if ( ! is_string( $current_style ) ) {
				$current_style = '';
			}
			$tags->set_attribute( 'style', $current_style . ' object-position: ' . $focal_point . ';' );
			$block_content = $tags->get_updated_html();
		}

		return $block_content;
	}

	/**
	 * Clamp focal-point values to the valid 0..1 range.
	 *
	 * @param float $value Raw value.
	 *
	 * @return float
	 */
	private function clamp_focal_point( float $value ): float {
		return max( 0, min( 1, $value ) );
	}
}
