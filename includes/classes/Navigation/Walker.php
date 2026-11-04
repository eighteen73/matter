<?php
/**
 * Menu walker.
 *
 * Outputs Appearance > Menus items as Matter menu markup with Interactivity API
 * directives. Every item carries the markup needed by all menu types (submenu
 * toggle, drill-down header…) so a menu can change type per breakpoint with CSS.
 *
 * Item kinds:
 * - leaf:     a link.
 * - submenu:  an interactive parent with a toggle and a collapsible submenu.
 * - megamenu: a top-level submenu flagged as a megamenu; its children render as
 *             columns (level 2 = column heading, level 3+ = links).
 * - column:   a static parent whose children are always visible (megamenu
 *             columns, and nested parents with a `#`/empty URL).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Navigation;

use Walker_Nav_Menu;
use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Menu walker.
 */
class Walker extends Walker_Nav_Menu {

	/**
	 * Running submenu count, used for unique submenu IDs.
	 *
	 * @var int
	 */
	private int $submenu_count = 0;

	/**
	 * Stack of open parent items: [ 'id' => item ID, 'kind' => string, 'submenu' => int, 'item' => WP_Post ].
	 *
	 * @var array<int, array<string, mixed>>
	 */
	private array $parents = [];

	/**
	 * Constructor.
	 *
	 * @param string $id_prefix Unique prefix for submenu element IDs.
	 * @param bool   $view_all  Whether drill-down submenus link to their parent page.
	 */
	public function __construct(
		private readonly string $id_prefix,
		private readonly bool $view_all = true
	) {}

	/**
	 * Starts a submenu level.
	 *
	 * @param string    $output Used to append additional content (passed by reference).
	 * @param int       $depth  Depth of menu item.
	 * @param \stdClass $args   wp_nav_menu() arguments.
	 * @return void
	 */
	public function start_lvl( &$output, $depth = 0, $args = null ) {
		$parent = end( $this->parents );

		if ( ! $parent ) {
			return;
		}

		if ( 'column' === $parent['kind'] ) {
			$output .= '<ul class="matter-menu__column-items">';
			return;
		}

		$output .= sprintf(
			'<div id="%1$s" class="matter-menu__submenu" tabindex="-1" inert data-wp-bind--inert="!state.isSubmenuOpen">%2$s<ul class="%3$s">',
			esc_attr( $this->submenu_dom_id( $parent['submenu'] ) ),
			$this->submenu_header( $parent['item'] ),
			'megamenu' === $parent['kind'] ? 'matter-menu__submenu-items matter-menu__columns' : 'matter-menu__submenu-items'
		);
	}

	/**
	 * Ends a submenu level.
	 *
	 * @param string    $output Used to append additional content (passed by reference).
	 * @param int       $depth  Depth of menu item.
	 * @param \stdClass $args   wp_nav_menu() arguments.
	 * @return void
	 */
	public function end_lvl( &$output, $depth = 0, $args = null ) {
		$parent = end( $this->parents );

		if ( ! $parent ) {
			return;
		}

		if ( 'column' === $parent['kind'] ) {
			$output .= '</ul>';
			return;
		}

		$panel = 'megamenu' === $parent['kind'] ? Megamenu::render_panel( $parent['item'] ) : '';

		$output .= '</ul>' . $panel . '</div>';
	}

	/**
	 * Starts a menu item.
	 *
	 * @param string    $output            Used to append additional content (passed by reference).
	 * @param WP_Post   $data_object       Menu item data object.
	 * @param int       $depth             Depth of menu item.
	 * @param \stdClass $args              wp_nav_menu() arguments.
	 * @param int       $current_object_id Optional. ID of the current menu item.
	 * @return void
	 */
	public function start_el( &$output, $data_object, $depth = 0, $args = null, $current_object_id = 0 ) {
		$item       = $data_object;
		$max_depth  = isset( $args->depth ) ? (int) $args->depth : 0;
		$has_child  = $this->has_children && ( 0 === $max_depth || $depth + 1 < $max_depth );
		$kind       = $this->get_kind( $item, $depth, $has_child );
		$submenu_id = 0;

		if ( in_array( $kind, [ 'submenu', 'megamenu' ], true ) ) {
			$submenu_id = ++$this->submenu_count;
		}

		if ( 'leaf' !== $kind ) {
			$this->parents[] = [
				'id'      => $item->ID,
				'kind'    => $kind,
				'submenu' => $submenu_id,
				'item'    => $item,
			];
		}

		$title = $this->get_title( $item, $args, $depth );

		$output .= sprintf(
			'<li%1$s%2$s>%3$s',
			$this->item_attributes( $item, $args, $depth, $kind ),
			$submenu_id ? $this->item_directives( $submenu_id ) : '',
			$this->link( $item, $args, $depth, $title, $kind )
		);

		if ( $submenu_id ) {
			$output .= $this->toggle( $submenu_id, $title );
		}
	}

	/**
	 * Ends a menu item.
	 *
	 * @param string    $output      Used to append additional content (passed by reference).
	 * @param WP_Post   $data_object Menu item data object.
	 * @param int       $depth       Depth of menu item.
	 * @param \stdClass $args        wp_nav_menu() arguments.
	 * @return void
	 */
	public function end_el( &$output, $data_object, $depth = 0, $args = null ) {
		$parent = end( $this->parents );

		if ( $parent && $parent['id'] === $data_object->ID ) {
			array_pop( $this->parents );
		}

		$output .= '</li>';
	}

	/**
	 * Work out how an item renders.
	 *
	 * @param WP_Post $item      Menu item.
	 * @param int     $depth     Depth.
	 * @param bool    $has_child Whether the item has visible children.
	 * @return string leaf|submenu|megamenu|column
	 */
	private function get_kind( WP_Post $item, int $depth, bool $has_child ): string {
		if ( ! $has_child ) {
			return 'leaf';
		}

		if ( 0 === $depth && Megamenu::is_megamenu( $item ) ) {
			return 'megamenu';
		}

		$in_megamenu = ! empty( $this->parents ) && 'megamenu' === $this->parents[0]['kind'];

		if ( $in_megamenu || ( $depth > 0 && self::is_label_only( (string) $item->url ) ) ) {
			return 'column';
		}

		return 'submenu';
	}

	/**
	 * `<li>` attributes, keeping core's classes, IDs and filters.
	 *
	 * @param WP_Post   $item  Menu item.
	 * @param \stdClass $args  wp_nav_menu() arguments.
	 * @param int       $depth Depth.
	 * @param string    $kind  Item kind.
	 * @return string
	 */
	private function item_attributes( WP_Post $item, $args, int $depth, string $kind ): string {
		$classes   = empty( $item->classes ) ? [] : (array) $item->classes;
		$classes[] = 'menu-item-' . $item->ID;

		/** This filter is documented in wp-includes/class-walker-nav-menu.php */
		$classes = (array) apply_filters( 'nav_menu_css_class', array_filter( $classes ), $item, $args, $depth );

		array_unshift( $classes, 'matter-menu__item' );

		if ( 'leaf' !== $kind ) {
			$classes[] = 'has-submenu';
		}

		if ( 'megamenu' === $kind ) {
			$classes[] = 'is-megamenu';
			$classes[] = 'is-megamenu-' . Megamenu::get_width( $item );
		}

		if ( 'column' === $kind ) {
			$classes[] = 'is-column';
		}

		/** This filter is documented in wp-includes/class-walker-nav-menu.php */
		$id = apply_filters( 'nav_menu_item_id', 'menu-item-' . $item->ID, $item, $args, $depth );

		/** This filter is documented in wp-includes/class-walker-nav-menu.php */
		$atts = (array) apply_filters(
			'nav_menu_item_attributes',
			[
				'id'    => $id,
				'class' => implode( ' ', array_unique( array_filter( $classes ) ) ),
			],
			$item,
			$args,
			$depth
		);

		return $this->attributes_html( $atts );
	}

	/**
	 * Interactivity directives for an item that owns a submenu.
	 *
	 * @param int $submenu_id Submenu number.
	 * @return string
	 */
	private function item_directives( int $submenu_id ): string {
		return sprintf(
			' %s data-wp-class--is-open="state.isSubmenuOpen" data-wp-on--mouseenter="actions.openOnHover" data-wp-on--mouseleave="actions.closeOnHover"',
			wp_interactivity_data_wp_context( [ 'submenuId' => $submenu_id ] )
		);
	}

	/**
	 * Item link, or a non-interactive label for `#`/empty URLs.
	 *
	 * @param WP_Post   $item  Menu item.
	 * @param \stdClass $args  wp_nav_menu() arguments.
	 * @param int       $depth Depth.
	 * @param string    $title Escaped item title.
	 * @param string    $kind  Item kind.
	 * @return string
	 */
	private function link( WP_Post $item, $args, int $depth, string $title, string $kind ): string {
		$before      = $args->before ?? '';
		$after       = $args->after ?? '';
		$link_before = $args->link_before ?? '';
		$link_after  = $args->link_after ?? '';

		if ( self::is_label_only( (string) $item->url ) ) {
			return sprintf(
				'%1$s<span class="matter-menu__link is-label">%2$s%3$s%4$s</span>%5$s',
				$before,
				$link_before,
				$title,
				$link_after,
				$after
			);
		}

		$atts = [
			'class'        => 'matter-menu__link',
			'title'        => $item->attr_title,
			'target'       => $item->target,
			'rel'          => '_blank' === $item->target ? trim( $item->xfn . ' noopener' ) : $item->xfn,
			'href'         => $item->url,
			'aria-current' => $item->current ? 'page' : '',
		];

		/** This filter is documented in wp-includes/class-walker-nav-menu.php */
		$atts = (array) apply_filters( 'nav_menu_link_attributes', $atts, $item, $args, $depth );

		$description = $this->description( $item );

		return sprintf(
			'%1$s<a%2$s>%3$s%4$s%5$s%6$s</a>%7$s',
			$before,
			$this->attributes_html( $atts ),
			$link_before,
			$title,
			$description,
			$link_after,
			$after
		);
	}

	/**
	 * Submenu toggle button.
	 *
	 * Its text is the item title so it can stand in for the parent link when
	 * submenus open on click (the parent page is then reached via "View all").
	 *
	 * @param int    $submenu_id Submenu number.
	 * @param string $title      Escaped item title.
	 * @return string
	 */
	private function toggle( int $submenu_id, string $title ): string {
		return sprintf(
			'<button type="button" class="matter-menu__toggle" aria-expanded="false" aria-controls="%1$s" aria-label="%2$s" data-wp-on--click="actions.toggleSubmenu" data-wp-bind--aria-expanded="state.isSubmenuOpen"><span class="matter-menu__toggle-text">%3$s</span></button>',
			esc_attr( $this->submenu_dom_id( $submenu_id ) ),
			esc_attr(
				sprintf(
					/* translators: %s: menu item label. */
					__( 'Show submenu for %s', 'matter' ),
					wp_strip_all_tags( $title )
				)
			),
			$title
		);
	}

	/**
	 * Drill-down submenu header: back button, parent label and "view all" link.
	 *
	 * Rendered for every submenu and hidden by CSS for other menu types.
	 *
	 * @param WP_Post $item Parent menu item.
	 * @return string
	 */
	private function submenu_header( WP_Post $item ): string {
		$label   = wp_strip_all_tags( (string) apply_filters( 'the_title', $item->title, $item->ID ) );
		$context = [
			'label' => $label,
			'url'   => (string) $item->url,
		];

		/**
		 * Filters the drill-down back button text.
		 *
		 * @param string $text    Back button text.
		 * @param array  $context Parent item label and url.
		 */
		$back_text = (string) apply_filters( 'matter_menu_back_text', __( 'Back', 'matter' ), $context );

		/**
		 * Filters the drill-down "view all" link text.
		 *
		 * @param string $text    Link text.
		 * @param array  $context Parent item label and url.
		 */
		$view_all_text = (string) apply_filters( 'matter_menu_view_all_text', __( 'View all', 'matter' ), $context );

		$view_all = '';

		if ( $this->view_all && ! self::is_label_only( (string) $item->url ) ) {
			$view_all = sprintf(
				'<a class="matter-menu__view-all" href="%1$s" aria-label="%2$s">%3$s</a>',
				esc_url( $item->url ),
				/* translators: %s: parent menu item label. */
				esc_attr( sprintf( __( 'View all %s', 'matter' ), $label ) ),
				esc_html( $view_all_text )
			);
		}

		return sprintf(
			'<div class="matter-menu__submenu-header"><button type="button" class="matter-menu__back" data-wp-on--click="actions.closeSubmenu" aria-label="%1$s"><span class="matter-menu__back-text">%2$s</span></button><span class="matter-menu__parent-label">%3$s</span>%4$s</div>',
			/* translators: %s: parent menu item label. */
			esc_attr( sprintf( __( 'Back from %s', 'matter' ), $label ) ),
			esc_html( $back_text ),
			esc_html( $label ),
			$view_all
		);
	}

	/**
	 * Item title, with core's title filters applied.
	 *
	 * @param WP_Post   $item  Menu item.
	 * @param \stdClass $args  wp_nav_menu() arguments.
	 * @param int       $depth Depth.
	 * @return string
	 */
	private function get_title( WP_Post $item, $args, int $depth ): string {
		/** This filter is documented in wp-includes/post-template.php */
		$title = apply_filters( 'the_title', $item->title, $item->ID );

		/** This filter is documented in wp-includes/class-walker-nav-menu.php */
		$title = apply_filters( 'nav_menu_item_title', $title, $item, $args, $depth );

		return '' !== trim( wp_strip_all_tags( (string) $title ) ) ? (string) $title : esc_html__( 'Untitled', 'matter' );
	}

	/**
	 * Optional item description.
	 *
	 * @param WP_Post $item Menu item.
	 * @return string
	 */
	private function description( WP_Post $item ): string {
		$description = trim( (string) $item->description );

		return '' !== $description ? '<span class="matter-menu__description">' . esc_html( $description ) . '</span>' : '';
	}

	/**
	 * DOM ID for a submenu.
	 *
	 * @param int $submenu_id Submenu number.
	 * @return string
	 */
	private function submenu_dom_id( int $submenu_id ): string {
		return $this->id_prefix . '-submenu-' . $submenu_id;
	}

	/**
	 * Build an attribute string, skipping empty values.
	 *
	 * @param array<string, mixed> $atts Attributes.
	 * @return string
	 */
	private function attributes_html( array $atts ): string {
		$html = '';

		foreach ( $atts as $name => $value ) {
			if ( is_scalar( $value ) && '' !== (string) $value && false !== $value ) {
				$value = 'href' === $name ? esc_url( (string) $value ) : esc_attr( (string) $value );
				$html .= ' ' . $name . '="' . $value . '"';
			}
		}

		return $html;
	}

	/**
	 * Whether a URL is a non-navigating placeholder (`#`, empty, or ending in `#`).
	 *
	 * @param string $url Item URL.
	 * @return bool
	 */
	public static function is_label_only( string $url ): bool {
		$url = trim( $url );

		return '' === $url || '#' === $url || str_ends_with( $url, '#' );
	}
}
