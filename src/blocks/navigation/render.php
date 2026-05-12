<?php
/**
 * Renders static, read-only navigation from a selected wp_navigation menu.
 *
 * @package Eighteen73\Blocks
 */

defined( 'ABSPATH' ) || exit;

$menu_id = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;

if ( ! $menu_id ) {
	return '';
}

$menu_post = get_post( $menu_id );

if ( ! $menu_post instanceof WP_Post || 'wp_navigation' !== $menu_post->post_type ) {
	return '';
}

$wrapper = get_block_wrapper_attributes();

$render_link_item = static function ( array $item_attributes ): string {
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
};

$render_items = null;
$render_items = static function ( array $parsed_blocks ) use ( &$render_items, $render_link_item ): string {
	$items_markup = '';

	foreach ( $parsed_blocks as $parsed_block ) {
		$block_name = isset( $parsed_block['blockName'] ) ? $parsed_block['blockName'] : '';

		if ( 'core/navigation-link' === $block_name ) {
			$item_attributes = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : [];
			$items_markup   .= $render_link_item( $item_attributes );
			continue;
		}

		if ( 'core/navigation-submenu' === $block_name ) {
			$item_attributes = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : [];
			$children        = isset( $parsed_block['innerBlocks'] ) && is_array( $parsed_block['innerBlocks'] ) ? $parsed_block['innerBlocks'] : [];
			$label           = isset( $item_attributes['label'] ) ? wp_strip_all_tags( (string) $item_attributes['label'] ) : '';
			$url             = isset( $item_attributes['url'] ) ? esc_url( (string) $item_attributes['url'] ) : '';
			$children_markup = $render_items( $children );

			if ( '' === $children_markup ) {
				$items_markup .= $render_link_item( $item_attributes );
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
};

$items = $render_items( parse_blocks( (string) $menu_post->post_content ) );

if ( '' === $items ) {
	return '';
}

return sprintf(
	'<nav %1$s><ul class="wp-block-navigation__container">%2$s</ul></nav>',
	$wrapper,
	$items
);
