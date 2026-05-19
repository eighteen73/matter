<?php
/**
 * Navigation block renderer.
 *
 * @package Eighteen73\Blocks
 */

namespace Eighteen73\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Renders navigation block markup from a selected wp_navigation menu.
 */
class Navigation {

	/**
	 * Build navigation markup for block attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param \WP_Block|null       $block      Block instance from render callback.
	 * @return string
	 */
	public static function render( array $attributes, ?\WP_Block $block = null ): string {
		$menu_id = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;

		if ( ! $menu_id ) {
			return '';
		}

		$menu_post = get_post( $menu_id );

		if ( ! $menu_post instanceof \WP_Post || 'wp_navigation' !== $menu_post->post_type ) {
			return '';
		}

		$items = self::render_items( parse_blocks( (string) $menu_post->post_content ) );

		if ( '' === $items ) {
			return '';
		}

		return sprintf(
			'<nav %1$s><ul class="wp-block-eighteen73-navigation__container">%2$s</ul></nav>',
			get_block_wrapper_attributes( [], $block ),
			$items
		);
	}

	/**
	 * Render navigation items recursively.
	 *
	 * @param array<int, array<string, mixed>> $parsed_blocks Parsed navigation blocks.
	 * @return string
	 */
	private static function render_items( array $parsed_blocks ): string {
		$items_markup = '';

		foreach ( $parsed_blocks as $parsed_block ) {
			$block_name = isset( $parsed_block['blockName'] ) ? (string) $parsed_block['blockName'] : '';

			if ( 'core/navigation-link' === $block_name ) {
				$item_attributes = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : [];
				$items_markup   .= self::render_link_item( $item_attributes );
				continue;
			}

			if ( 'core/navigation-submenu' === $block_name ) {
				$item_attributes = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : [];
				$children        = isset( $parsed_block['innerBlocks'] ) && is_array( $parsed_block['innerBlocks'] ) ? $parsed_block['innerBlocks'] : [];
				$label           = isset( $item_attributes['label'] ) ? wp_strip_all_tags( (string) $item_attributes['label'] ) : '';
				$url             = isset( $item_attributes['url'] ) ? esc_url( (string) $item_attributes['url'] ) : '';
				$children_markup = self::render_items( $children );

				if ( '' === $children_markup ) {
					$items_markup .= self::render_link_item( $item_attributes );
					continue;
				}

				if ( '' === $label ) {
					$label = __( 'Untitled menu item', 'eighteen73-blocks' );
				}

				$items_markup .= sprintf(
					'<li class="wp-block-navigation-item has-child"><a class="wp-block-navigation-item__content" href="%1$s">%2$s</a><ul class="wp-block-navigation__submenu-container">%3$s</ul></li>',
					'' !== $url ? $url : '#',
					esc_html( $label ),
					$children_markup
				);
				continue;
			}

			if ( in_array( $block_name, [ 'core/page-list', 'core/search', 'core/social-links', 'core/buttons', 'core/spacer' ], true ) ) {
				$items_markup .= sprintf(
					'<li class="wp-block-navigation-item">%s</li>',
					render_block( $parsed_block )
				);
			}
		}

		return $items_markup;
	}

	/**
	 * Render a single navigation link item.
	 *
	 * @param array<string, mixed> $item_attributes Item attributes.
	 * @return string
	 */
	private static function render_link_item( array $item_attributes ): string {
		$label = isset( $item_attributes['label'] ) ? wp_strip_all_tags( (string) $item_attributes['label'] ) : '';
		$url   = isset( $item_attributes['url'] ) ? esc_url( (string) $item_attributes['url'] ) : '';

		if ( '' === $label && '' === $url ) {
			return '';
		}

		if ( '' === $label ) {
			$label = __( 'Untitled menu item', 'eighteen73-blocks' );
		}

		$target = ! empty( $item_attributes['opensInNewTab'] ) ? ' target="_blank"' : '';
		$rel    = isset( $item_attributes['rel'] ) ? trim( (string) $item_attributes['rel'] ) : '';

		if ( ! empty( $item_attributes['opensInNewTab'] ) ) {
			$rel = trim( $rel . ' noopener noreferrer' );
		}

		$rel_attr = '' !== $rel ? ' rel="' . esc_attr( $rel ) . '"' : '';

		return sprintf(
			'<li class="wp-block-navigation-item"><a class="wp-block-navigation-item__content" href="%1$s"%2$s%3$s>%4$s</a></li>',
			'' !== $url ? $url : '#',
			$target,
			$rel_attr,
			esc_html( $label )
		);
	}
}
