<?php
/**
 * Carousel thumbnails block renderer helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Carousel thumbnails block helpers.
 */
class CarouselThumbnails {

	/**
	 * Add keyboard navigation attributes to a rendered thumbnail inner block.
	 *
	 * @param string $html Rendered inner block HTML.
	 * @return string
	 */
	public static function add_keyboard_attrs( string $html ): string {
		if ( '' === trim( $html ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return $html;
		}

		$processor = new \WP_HTML_Tag_Processor( $html );

		if ( ! $processor->next_tag() ) {
			return $html;
		}

		$processor->set_attribute( 'tabindex', '0' );
		$processor->set_attribute( 'role', 'button' );

		return $processor->get_updated_html();
	}

	/**
	 * Render thumbnail inner blocks with keyboard navigation attributes.
	 *
	 * @param \WP_Block $block Thumbnails block instance.
	 * @param string    $content Fallback rendered inner content.
	 * @return string
	 */
	public static function render_inner_blocks( \WP_Block $block, string $content ): string {
		if ( empty( $block->inner_blocks ) ) {
			return $content;
		}

		$markup = '';

		foreach ( $block->inner_blocks as $inner_block ) {
			$markup .= self::add_keyboard_attrs( $inner_block->render() );
		}

		return $markup;
	}
}
