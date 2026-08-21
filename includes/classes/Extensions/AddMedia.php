<?php
/**
 * Icon block custom SVG media extension.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_Block_Supports;
use WP_Error;
use WP_HTML_Tag_Processor;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Add Media class.
 */
class AddMedia {

	use Singleton;

	/**
	 * SVG mime type.
	 *
	 * @var string
	 */
	private const SVG_MIME = 'image/svg+xml';

	/**
	 * REST API namespace.
	 *
	 * @var string
	 */
	private const REST_NAMESPACE = 'matter/v1';

	/**
	 * Setup the class.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_core/icon', [ $this, 'render_custom_icon' ], 10, 3 );
		add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
	}

	/**
	 * Register REST routes used by the editor preview.
	 *
	 * @return void
	 */
	public function register_rest_routes(): void {
		register_rest_route(
			self::REST_NAMESPACE,
			'/icon-svg/(?P<id>\d+)',
			[
				'methods'             => 'GET',
				'callback'            => [ $this, 'rest_get_icon_svg' ],
				'permission_callback' => static function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => [
					'id' => [
						'type'              => 'integer',
						'required'          => true,
						'sanitize_callback' => 'absint',
					],
				],
			]
		);
	}

	/**
	 * REST: return SVG markup for an attachment.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function rest_get_icon_svg( WP_REST_Request $request ) {
		$attachment_id = (int) $request['id'];
		$svg           = $this->get_attachment_svg( $attachment_id );

		if ( '' === $svg ) {
			return new WP_Error(
				'matter_invalid_svg',
				__( 'SVG attachment not found or invalid.', 'matter' ),
				[ 'status' => 404 ]
			);
		}

		return rest_ensure_response(
			[
				'id'      => $attachment_id,
				'content' => $svg,
			]
		);
	}

	/**
	 * Render a custom SVG attachment for the icon block.
	 *
	 * @param string               $block_content The block content.
	 * @param array<string, mixed> $block         The full block, including name and attributes.
	 * @param WP_Block|null        $instance      The block instance.
	 * @return string The updated block content.
	 */
	public function render_custom_icon( string $block_content, array $block, ?WP_Block $instance ): string {
		$attributes = [];

		if ( $instance instanceof WP_Block && is_array( $instance->attributes ) ) {
			$attributes = $instance->attributes;
		} elseif ( isset( $block['attrs'] ) && is_array( $block['attrs'] ) ) {
			$attributes = $block['attrs'];
		}

		$icon_id = isset( $attributes['iconId'] ) ? (int) $attributes['iconId'] : 0;

		if ( ! $icon_id ) {
			return $block_content;
		}

		$svg = $this->get_attachment_svg( $icon_id );

		if ( '' === $svg ) {
			return $block_content;
		}

		$styles = $this->get_style_engine_styles( $attributes );
		$svg    = $this->prepare_svg(
			$svg,
			$styles,
			$attributes['ariaLabel'] ?? '',
			(bool) ( $attributes['flipHorizontal'] ?? false ),
			(bool) ( $attributes['flipVertical'] ?? false ),
			isset( $attributes['rotation'] ) ? (int) $attributes['rotation'] : 0
		);

		if ( '' === $svg ) {
			return $block_content;
		}

		/*
		 * WP_Block restores $block_to_render before render_block_* filters run,
		 * so get_block_wrapper_attributes() would miss align and other supports.
		 */
		$previous_block_to_render           = WP_Block_Supports::$block_to_render;
		WP_Block_Supports::$block_to_render = ( $instance instanceof WP_Block )
			? $instance->parsed_block
			: $block;

		$wrapper_attributes = get_block_wrapper_attributes(
			[
				'class' => 'has-custom-icon',
			]
		);

		WP_Block_Supports::$block_to_render = $previous_block_to_render;

		return sprintf( '<div %1$s>%2$s</div>', $wrapper_attributes, $svg );
	}

	/**
	 * Load and extract SVG markup from an attachment.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return string SVG markup or empty string.
	 */
	private function get_attachment_svg( int $attachment_id ): string {
		if ( self::SVG_MIME !== get_post_mime_type( $attachment_id ) ) {
			return '';
		}

		$file = get_attached_file( $attachment_id );

		if ( ! $file || ! is_readable( $file ) ) {
			return '';
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local attachment file.
		$contents = file_get_contents( $file );

		if ( ! is_string( $contents ) || '' === $contents ) {
			return '';
		}

		$processor = new WP_HTML_Tag_Processor( $contents );

		if ( ! $processor->next_tag( 'svg' ) ) {
			return '';
		}

		// Re-parse from the svg opening tag through the end of the document fragment.
		$svg_start = strpos( $contents, '<svg' );

		if ( false === $svg_start ) {
			$svg_start = strpos( $contents, '<SVG' );
		}

		if ( false === $svg_start ) {
			return '';
		}

		$svg_end = strrpos( $contents, '</svg>' );

		if ( false === $svg_end ) {
			$svg_end = strrpos( $contents, '</SVG>' );
		}

		if ( false === $svg_end ) {
			return '';
		}

		return substr( $contents, $svg_start, $svg_end + 6 - $svg_start );
	}

	/**
	 * Build style-engine styles matching core icon rendering.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return array{classnames?: string, css?: string}
	 */
	private function get_style_engine_styles( array $attributes ): array {
		$color_styles = [];

		$preset_text_color    = array_key_exists( 'textColor', $attributes ) ? "var:preset|color|{$attributes['textColor']}" : null;
		$custom_text_color    = $attributes['style']['color']['text'] ?? null;
		$color_styles['text'] = $preset_text_color ? $preset_text_color : $custom_text_color;

		$preset_background_color    = array_key_exists( 'backgroundColor', $attributes ) ? "var:preset|color|{$attributes['backgroundColor']}" : null;
		$custom_background_color    = $attributes['style']['color']['background'] ?? null;
		$color_styles['background'] = $preset_background_color ? $preset_background_color : $custom_background_color;

		$border_styles = [];
		$sides         = [ 'top', 'right', 'bottom', 'left' ];

		if ( isset( $attributes['style']['border']['radius'] ) ) {
			$border_styles['radius'] = $attributes['style']['border']['radius'];
		}
		if ( isset( $attributes['style']['border']['style'] ) ) {
			$border_styles['style'] = $attributes['style']['border']['style'];
		}
		if ( isset( $attributes['style']['border']['width'] ) ) {
			$border_styles['width'] = $attributes['style']['border']['width'];
		}

		$preset_color           = array_key_exists( 'borderColor', $attributes ) ? "var:preset|color|{$attributes['borderColor']}" : null;
		$custom_color           = $attributes['style']['border']['color'] ?? null;
		$border_styles['color'] = $preset_color ? $preset_color : $custom_color;

		foreach ( $sides as $side ) {
			$border                 = $attributes['style']['border'][ $side ] ?? null;
			$border_styles[ $side ] = [
				'color' => is_array( $border ) ? ( $border['color'] ?? null ) : null,
				'style' => is_array( $border ) ? ( $border['style'] ?? null ) : null,
				'width' => is_array( $border ) ? ( $border['width'] ?? null ) : null,
			];
		}

		$spacing_styles = [];
		if ( isset( $attributes['style']['spacing']['padding'] ) ) {
			$spacing_styles['padding'] = $attributes['style']['spacing']['padding'];
		}

		$dimensions_styles = [];
		if ( isset( $attributes['style']['dimensions']['width'] ) ) {
			$dimensions_styles['width'] = $attributes['style']['dimensions']['width'];
		}

		$styles = wp_style_engine_get_styles(
			[
				'color'      => $color_styles,
				'border'     => $border_styles,
				'spacing'    => $spacing_styles,
				'dimensions' => $dimensions_styles,
			]
		);

		return is_array( $styles ) ? $styles : [];
	}

	/**
	 * Apply classes, styles, a11y, flip, and rotation to the SVG.
	 *
	 * @param string               $svg              SVG markup.
	 * @param array<string, mixed> $styles           Style engine output.
	 * @param string               $aria_label       Accessible label.
	 * @param bool                 $flip_horizontal  Flip horizontally.
	 * @param bool                 $flip_vertical    Flip vertically.
	 * @param int                  $rotation         Rotation in degrees.
	 * @return string Prepared SVG markup.
	 */
	private function prepare_svg(
		string $svg,
		array $styles,
		string $aria_label,
		bool $flip_horizontal,
		bool $flip_vertical,
		int $rotation
	): string {
		$processor = new WP_HTML_Tag_Processor( $svg );

		if ( ! $processor->next_tag( 'svg' ) ) {
			return '';
		}

		$classnames = $styles['classnames'] ?? '';
		if ( is_string( $classnames ) && '' !== $classnames ) {
			foreach ( preg_split( '/\s+/', $classnames, -1, PREG_SPLIT_NO_EMPTY ) as $class_name ) {
				$processor->add_class( $class_name );
			}
		}

		if ( $flip_horizontal ) {
			$processor->add_class( 'is-flip-horizontal' );
		}
		if ( $flip_vertical ) {
			$processor->add_class( 'is-flip-vertical' );
		}

		$style_attr = '';
		if ( ! empty( $styles['css'] ) && is_string( $styles['css'] ) ) {
			$style_attr = $styles['css'];
		}

		if ( $rotation ) {
			$rotation_css = 'rotate: ' . $rotation . 'deg;';
			$style_attr   = $style_attr ? $style_attr . ' ' . $rotation_css : $rotation_css;
		}

		if ( '' !== $style_attr ) {
			$processor->set_attribute( 'style', $style_attr );
		}

		if ( '' !== $aria_label ) {
			$processor->set_attribute( 'role', 'img' );
			$processor->set_attribute( 'aria-label', $aria_label );
			$processor->remove_attribute( 'aria-hidden' );
			$processor->remove_attribute( 'focusable' );
		} else {
			$processor->set_attribute( 'aria-hidden', 'true' );
			$processor->set_attribute( 'focusable', 'false' );
			$processor->remove_attribute( 'role' );
			$processor->remove_attribute( 'aria-label' );
		}

		return $processor->get_updated_html();
	}
}
