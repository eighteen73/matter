<?php
/**
 * Group render class.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * Link class.
 */
class Link {

	use Singleton;

	/**
	 * Setup the class.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_core/group', [ $this, 'render_link' ], 10, 3 );
	}

	/**
	 * Render the link overlay in the group block.
	 *
	 * @param string               $block_content The block content.
	 * @param array<string, mixed> $block         The full block, including name and attributes.
	 * @param WP_Block|null        $instance      The block instance which carries block context.
	 *
	 * @return string The updated block content.
	 */
	public function render_link( string $block_content, array $block, ?WP_Block $instance ): string {
		if ( empty( $block_content ) || empty( $block['attrs'] ) || ! is_array( $block['attrs'] ) ) {
			return $block_content;
		}

		$attributes = $block['attrs'];
		$url        = $this->resolve_link_url( $attributes, $instance );
		$classes    = 'wp-block-group__link';

		if ( ! empty( $attributes['linkClass'] ) ) {
			$classes .= ' ' . $this->sanitize_link_classes( (string) $attributes['linkClass'] );
		}

		if ( empty( $url ) ) {
			return $block_content;
		}

		// Find headings in content and order by standard order to prioritise more important headings
		$heading_content = '';
		for ( $i = 1; $i <= 6; $i++ ) {
			if ( preg_match( sprintf( '/<h%d[^>]*>(.*?)<\/h%d>/si', $i, $i ), $block_content, $matches ) ) {
				$heading_content = wp_strip_all_tags( $matches[1] );
				break; // stop at the first heading found
			}
		}

		$link_markup = $this->build_link_markup(
			$url,
			$classes,
			$attributes['linkTarget'] ?? '',
			$attributes['rel'] ?? '',
			$heading_content
		);

		return $this->inject_link_markup( $block_content, $link_markup );
	}

	/**
	 * Determine the correct link URL based on the block attributes.
	 *
	 * @param array<string, mixed> $attributes The group block attributes.
	 * @param WP_Block|null        $instance   The block instance which contains context.
	 *
	 * @return string
	 */
	private function resolve_link_url( array $attributes, ?WP_Block $instance ): string {
		$link_destination = $attributes['linkDestination'] ?? '';

		if ( 'post' === $link_destination ) {
			$post_id = 0;

			if ( $instance instanceof WP_Block && isset( $instance->context['postId'] ) ) {
				$post_id = (int) $instance->context['postId'];
			}

			if ( ! $post_id ) {
				$post_id = get_the_ID();
			}

			if ( $post_id ) {
				$permalink = get_permalink( $post_id );
				return is_string( $permalink ) ? $permalink : '';
			}

			return '';
		}

		if ( ! empty( $attributes['url'] ) && is_string( $attributes['url'] ) ) {
			return $attributes['url'];
		}

		return '';
	}

	/**
	 * Build the anchor markup that overlays the group block.
	 *
	 * @param string $url The link destination.
	 * @param string $link_class Optional CSS class attribute.
	 * @param string $link_target Optional target attribute.
	 * @param string $link_rel Optional rel attribute.
	 * @param string $heading_content Content from the most important heading within the $block_content.
	 *
	 * @return string
	 */
	private function build_link_markup( string $url, string $link_class, string $link_target, string $link_rel, string $heading_content ): string {
		$link_rel    = $this->normalize_link_rel( $link_target, $link_rel );
		$class_attr  = $link_class ? sprintf( ' class="%s"', esc_attr( $link_class ) ) : '';
		$target_attr = $link_target ? sprintf( ' target="%s"', esc_attr( $link_target ) ) : '';
		$rel_attr    = $link_rel ? sprintf( ' rel="%s"', esc_attr( $link_rel ) ) : '';

		return sprintf(
			'<a title="%5$s" href="%1$s"%2$s%3$s%4$s></a>',
			esc_url( $url ),
			$class_attr,
			$target_attr,
			$rel_attr,
			esc_attr( $heading_content )
		);
	}

	/**
	 * Sanitize a user-provided list of CSS classes.
	 *
	 * @param string $classes Space-separated class names.
	 *
	 * @return string
	 */
	private function sanitize_link_classes( string $classes ): string {
		$class_list = preg_split( '/\s+/', trim( $classes ) );
		if ( ! is_array( $class_list ) ) {
			return '';
		}

		$sanitized = array_map( 'sanitize_html_class', $class_list );
		$sanitized = array_filter( $sanitized );

		return implode( ' ', $sanitized );
	}

	/**
	 * Ensure external target links include required rel values.
	 *
	 * @param string $target Link target value.
	 * @param string $rel    Existing rel value.
	 *
	 * @return string
	 */
	private function normalize_link_rel( string $target, string $rel ): string {
		$rel_values = preg_split( '/\s+/', trim( $rel ) );
		$rel_values = is_array( $rel_values ) ? array_filter( $rel_values ) : [];

		if ( '_blank' === $target ) {
			$rel_values[] = 'noopener';
			$rel_values[] = 'noreferrer';
		}

		$rel_values = array_unique( $rel_values );

		return implode( ' ', $rel_values );
	}

	/**
	 * Inject the anchor right before the closing tag in the block markup.
	 * This is to ensure the injected link doesn't affect the block's spacing
	 *
	 * @param string $block_content The existing block markup.
	 * @param string $link_markup The link markup to insert.
	 *
	 * @return string
	 */
	private function inject_link_markup( string $block_content, string $link_markup ): string {

		// Find the last closing tag in the block content
		$insertion_point = strrpos( $block_content, '</' );

		if ( false === $insertion_point ) {
			return $block_content;
		}

		// Inject the link markup right before the last closing tag
		return substr_replace( $block_content, $link_markup, $insertion_point, 0 );
	}
}
