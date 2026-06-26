<?php
/**
 * Navigation block renderer.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Styling\BlockStyles;

defined( 'ABSPATH' ) || exit;

/**
 * Renders navigation block markup from a selected wp_navigation menu.
 */
class Navigation {

	/**
	 * Build navigation markup for block attributes.
	 *
	 * @param array<string, mixed> $attributes              Block attributes.
	 * @param bool                 $include_block_wrapper   When false, returns only the menu list markup for editor preview (wrapper comes from useBlockProps).
	 * @return string
	 */
	public static function render( array $attributes, bool $include_block_wrapper = true ): string {
		$menu_id                = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;
		$type                   = isset( $attributes['type'] ) ? (string) $attributes['type'] : 'simple';
		$type                   = in_array( $type, [ 'simple', 'accordion', 'drill-down' ], true ) ? $type : 'simple';
		$submenu_opens_on_click = ! empty( $attributes['submenuOpensOnClick'] );
		$show_submenu_label     = ! empty( $attributes['showSubmenuLabel'] );
		$show_submenu_view_all  = ! empty( $attributes['showSubmenuViewAll'] );

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

		if ( $show_submenu_label && 'drill-down' === $type ) {
			$nav_classes[] = 'has-submenu-label';
		}

		if ( $show_submenu_view_all && 'drill-down' === $type ) {
			$nav_classes[] = 'has-submenu-view-all';
		}

		$context_data = [
			'menuType'            => $type,
			'submenuOpensOnClick' => $submenu_opens_on_click,
			'openSubmenus'        => [],
			'openModes'           => (object) [],
		];

		$color_style = BlockStyles::get_styles( 'navigation', $attributes );

		if ( ! $include_block_wrapper ) {
			// Wrap the list so core layout support classes attach here, not on the ul.
			// The editor extracts only the ul for the useBlockProps nav wrapper.
			return sprintf(
				'<div class="matter-navigation-editor-chrome"><ul class="wp-block-matter-navigation__items">%1$s</ul></div>',
				$items
			);
		}

		$data_wp_context = function_exists( 'wp_interactivity_data_wp_context' )
			? wp_interactivity_data_wp_context( $context_data )
			: 'data-wp-context="' . esc_attr( wp_json_encode( $context_data ) ) . '"';

		return sprintf(
			'<nav %1$s data-wp-interactive="matter/navigation" %2$s data-wp-class--is-touch-enabled="state.isTouchEnabled" data-wp-on--keydown="actions.handleNavKeydown" data-wp-on--focusout="actions.handleNavFocusOut"><ul class="wp-block-matter-navigation__items">%3$s</ul></nav>',
			get_block_wrapper_attributes(
				[
					'class' => implode( ' ', $nav_classes ),
					'style' => $color_style,
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
					$label = __( 'Untitled menu item', 'matter' );
				}

				++$submenu_index;
				$submenu_id      = $submenu_index;
				$submenu_dom_id  = 'matter-navigation-submenu-' . $submenu_id;
				$show_hover_mode = 'simple' === $type && ! $submenu_opens_on_click;

				$item_context_data = [
					'submenuId' => $submenu_id,
				];

				$item_context          = wp_interactivity_data_wp_context( $item_context_data );
				$submenu_tabindex_attr = 'drill-down' === $type ? ' tabindex="-1"' : '';

				$items_markup .= sprintf(
					'<li class="wp-block-navigation-item has-child" %1$s data-wp-class--has-open-submenu="state.isSubmenuOpen" %2$s><a class="wp-block-navigation-item__content" href="%3$s"%4$s%5$s>%6$s</a><button type="button" class="wp-block-matter-navigation__submenu-toggle" data-wp-on--click="actions.toggleSubmenuOnClick" data-wp-bind--aria-expanded="state.isSubmenuOpen" aria-controls="%7$s" aria-label="%8$s"><span class="wp-block-matter-navigation__submenu-toggle-text">%9$s</span></button><div id="%7$s" class="wp-block-matter-navigation__submenu"%10$s data-wp-bind--aria-hidden="!state.isSubmenuOpen">%11$s<ul class="wp-block-navigation__submenu-items">%12$s</ul></div></li>',
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
							__( 'Toggle submenu for %s', 'matter' ),
							$label
						)
					),
					esc_html( $label ),
					$submenu_tabindex_attr,
					'drill-down' === $type
						? self::render_drill_down_submenu_header( $label, $url, $target, $rel_attr )
						: '',
					$children_markup
				);
				continue;
			}

			if ( in_array( $block_name, [ 'core/page-list', 'core/search', 'core/social-links', 'core/buttons', 'core/spacer' ], true ) ) {
				$items_markup .= sprintf(
					'<li class="wp-block-navigation-item has-block-content">%s</li>',
					render_block( $parsed_block )
				);
			}
		}

		return $items_markup;
	}

	/**
	 * Render drill-down submenu header with back button, parent label, and view-all link.
	 *
	 * @param string $label    Parent menu item label.
	 * @param string $url      Parent menu item URL.
	 * @param string $target   Parent menu item target attribute.
	 * @param string $rel_attr Parent menu item rel attribute.
	 * @return string
	 */
	private static function render_drill_down_submenu_header( string $label, string $url, string $target, string $rel_attr ): string {
		return sprintf(
			'<div class="wp-block-matter-navigation__submenu-header"><button type="button" class="wp-block-matter-navigation__back" data-wp-on--click="actions.closeSubmenuOnClick" aria-label="%1$s"><span class="wp-block-matter-navigation__back-text">%2$s</span></button><span class="wp-block-matter-navigation__parent-label">%3$s</span><a class="wp-block-matter-navigation__view-all" href="%4$s"%5$s%6$s aria-label="%7$s">%8$s</a></div>',
			esc_attr(
				sprintf(
					/* translators: %s: parent menu item label. */
					__( 'Back to %s', 'matter' ),
					$label
				)
			),
			esc_html__( 'Back', 'matter' ),
			esc_html( $label ),
			'' !== $url ? $url : '#',
			$target,
			$rel_attr,
			esc_attr(
				sprintf(
					/* translators: %s: parent menu item label. */
					__( 'View all %s', 'matter' ),
					$label
				)
			),
			esc_html__( 'View all', 'matter' )
		);
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
			$label = __( 'Untitled menu item', 'matter' );
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
