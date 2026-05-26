<?php
/**
 * Navigation block renderer.
 *
 * @package Eighteen73\Blocks
 */

namespace Eighteen73\Blocks\Blocks;

use Eighteen73\Blocks\Color\Styles;
use Eighteen73\Blocks\Config;

defined( 'ABSPATH' ) || exit;

/**
 * Renders navigation block markup from a selected wp_navigation menu.
 */
class Navigation {

	/**
	 * Build navigation markup for block attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return string
	 */
	public static function render( array $attributes ): string {
		$menu_id                = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;
		$type                   = isset( $attributes['type'] ) ? (string) $attributes['type'] : 'simple';
		$type                   = in_array( $type, [ 'simple', 'accordion', 'drill-down' ], true ) ? $type : 'simple';
		$submenu_opens_on_click = ! empty( $attributes['submenuOpensOnClick'] );

		if ( ! $menu_id ) {
			return '';
		}

		$menu_post = get_post( $menu_id );

		if ( ! $menu_post instanceof \WP_Post || 'wp_navigation' !== $menu_post->post_type ) {
			return '';
		}

		$submenu_index = 0;
		$items         = self::render_items(
			parse_blocks( (string) $menu_post->post_content ),
			$type,
			$submenu_opens_on_click,
			$submenu_index
		);

		if ( '' === $items ) {
			return '';
		}

		$nav_classes = [
			'is-menu-type-' . $type,
			$submenu_opens_on_click ? 'is-submenu-opens-on-click' : 'is-submenu-opens-on-hover',
		];

		$context_data = [
			'menuType'            => $type,
			'submenuOpensOnClick' => $submenu_opens_on_click,
			'openSubmenus'        => [],
			'openModes'           => [],
			'submenuTraps'        => [],
		];

		$data_wp_context = function_exists( 'wp_interactivity_data_wp_context' )
			? wp_interactivity_data_wp_context( $context_data )
			: 'data-wp-context="' . esc_attr( wp_json_encode( $context_data ) ) . '"';

		return sprintf(
			'<nav %1$s data-wp-interactive="eighteen73/navigation" %2$s data-wp-init---touch="callbacks.isTouchEnabled" data-wp-watch---touch="callbacks.isTouchEnabled" data-wp-class--is-touch-enabled="callbacks.isTouchEnabled" data-wp-on--keydown="actions.handleNavKeydown" data-wp-on--focusout="actions.handleNavFocusOut"><ul class="wp-block-eighteen73-navigation__container">%3$s</ul></nav>',
			get_block_wrapper_attributes(
				[
					'class' => implode( ' ', $nav_classes ),
					'style' => Styles::get_styles( $attributes, Config::get( 'colors', 'navigation' ) ),
				],
			),
			$data_wp_context,
			$items
		);
	}

	/**
	 * Render navigation items recursively.
	 *
	 * @param array<int, array<string, mixed>> $parsed_blocks Parsed navigation blocks.
	 * @param string                           $type Menu type.
	 * @param bool                             $submenu_opens_on_click Whether submenus open on click.
	 * @param int                              &$submenu_index Submenu index.
	 * @return string
	 */
	private static function render_items(
		array $parsed_blocks,
		string $type,
		bool $submenu_opens_on_click,
		int &$submenu_index
	): string {
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
				$target          = ! empty( $item_attributes['opensInNewTab'] ) ? ' target="_blank"' : '';
				$rel             = isset( $item_attributes['rel'] ) ? trim( (string) $item_attributes['rel'] ) : '';

				if ( ! empty( $item_attributes['opensInNewTab'] ) ) {
					$rel = trim( $rel . ' noopener noreferrer' );
				}

				$rel_attr        = '' !== $rel ? ' rel="' . esc_attr( $rel ) . '"' : '';
				$children_markup = self::render_items(
					$children,
					$type,
					$submenu_opens_on_click,
					$submenu_index
				);

				if ( '' === $children_markup ) {
					$items_markup .= self::render_link_item( $item_attributes );
					continue;
				}

				if ( '' === $label ) {
					$label = __( 'Untitled menu item', 'eighteen73-blocks' );
				}

				++$submenu_index;
				$submenu_id      = $submenu_index;
				$submenu_dom_id  = 'eighteen73-navigation-submenu-' . $submenu_id;
				$show_hover_mode = 'simple' === $type && ! $submenu_opens_on_click;

				$item_context_data = [
					'submenuId' => $submenu_id,
				];

				$item_context = function_exists( 'wp_interactivity_data_wp_context' )
					? wp_interactivity_data_wp_context( $item_context_data )
					: 'data-wp-context="' . esc_attr( wp_json_encode( $item_context_data ) ) . '"';

				$items_markup .= sprintf(
					'<li class="wp-block-navigation-item has-child" %1$s data-wp-class--has-open-submenu="callbacks.isSubmenuOpen" %2$s><a class="wp-block-navigation-item__content" href="%3$s"%4$s%5$s>%6$s</a><button type="button" class="wp-block-eighteen73-navigation__submenu-toggle" data-wp-on--click="actions.toggleSubmenuOnClick" data-wp-bind--aria-expanded="callbacks.isAriaExpanded" aria-controls="%7$s" aria-haspopup="true" aria-label="%8$s"><span class="wp-block-eighteen73-navigation__submenu-toggle-text">%9$s</span></button><div id="%7$s" class="wp-block-eighteen73-navigation__submenu" data-wp-bind--aria-hidden="!callbacks.isSubmenuOpen">%10$s<ul class="wp-block-navigation__submenu-container">%11$s</ul></div></li>',
					$item_context,
					$show_hover_mode ? 'data-wp-on--mouseenter="actions.openSubmenuOnHover" data-wp-on--mouseleave="actions.closeSubmenuOnHover"' : '',
					'' !== $url ? $url : '#',
					$target,
					$rel_attr,
					esc_html( $label ),
					esc_attr( $submenu_dom_id ),
					esc_attr(
						sprintf(
							/* translators: %s: menu item label. */
							__( 'Toggle submenu for %s', 'eighteen73-blocks' ),
							$label
						)
					),
					esc_html( $label ),
					'drill-down' === $type
						? '<button type="button" class="wp-block-eighteen73-navigation__back" data-wp-on--click="actions.closeSubmenuOnClick">' . esc_html__( 'Back', 'eighteen73-blocks' ) . '</button>'
						: '',
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
