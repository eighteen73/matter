<?php
/**
 * Menu renderer.
 *
 * Renders an Appearance > Menus menu with Matter's interactive menu markup:
 *
 *     Menu::render( [
 *         'location' => 'primary',
 *         'type'     => [ 'drill-down', 'lg' => 'dropdown' ],
 *     ] );
 *
 * `type` is a single menu type or a mobile-first breakpoint map. Responsive
 * menus get per-instance CSS that applies each type within its media query
 * range, so the correct layout shows before any JavaScript runs.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Navigation;

use Eighteen73\Matter\Assets;
use Eighteen73\Matter\Breakpoints;

defined( 'ABSPATH' ) || exit;

/**
 * Menu renderer.
 */
class Menu {

	/**
	 * Placeholder class menu type stylesheets are authored against.
	 */
	private const TYPE_CLASS = 'is-type-%s';

	/**
	 * Instances rendered this request, for unique IDs.
	 *
	 * @var array<string, int>
	 */
	private static array $instances = [];

	/**
	 * Responsive CSS already printed this request, keyed by instance class.
	 *
	 * @var array<string, bool>
	 */
	private static array $printed_css = [];

	/**
	 * Default arguments.
	 *
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return [
			'location'    => '',
			'menu'        => '',
			'type'        => MenuType::Dropdown->value,
			'opens_on'    => 'hover',
			'orientation' => 'horizontal',
			'depth'       => 0,
			'label'       => '',
			'class'       => '',
			'id'          => '',
			'view_all'    => true,
		];
	}

	/**
	 * Render a menu.
	 *
	 * @param array<string, mixed> $args {
	 *     @type string       $location    Theme menu location.
	 *     @type int|string   $menu        Menu ID, slug or name (instead of a location).
	 *     @type string|array $type        dropdown|accordion|drill-down, or a breakpoint map
	 *                                     such as [ 'drill-down', 'lg' => 'dropdown' ].
	 *     @type string       $opens_on    hover|click. Dropdowns open on hover for fine pointers;
	 *                                     with click the parent link is reached via "View all".
	 *     @type string       $orientation horizontal|vertical (dropdown flyout direction).
	 *     @type int          $depth       Maximum depth, 0 for all.
	 *     @type string       $label       Accessible label. Defaults to the menu name.
	 *     @type string       $class       Extra classes for the <nav>.
	 *     @type string       $id          Element ID. Defaults to matter-menu-{location}.
	 *     @type bool         $view_all    Show "View all" links in drill-down submenus. Always
	 *                                     shown when submenus open on click.
	 * }
	 * @return string
	 */
	public static function render( array $args = [] ): string {
		$args = wp_parse_args( $args, self::defaults() );

		/**
		 * Filters menu arguments before rendering.
		 *
		 * @param array $args Menu arguments.
		 */
		$args = (array) apply_filters( 'matter_menu_args', $args );

		$menu = self::get_menu( $args );

		if ( ! $menu ) {
			return '';
		}

		$id     = self::unique_id( (string) ( $args['id'] ?: 'matter-menu-' . ( $args['location'] ?: $menu->slug ) ) );
		$ranges = self::get_type_ranges( $args['type'] );
		// Menus that open on click hide parent links, so their "View all"
		// links are the only way to reach those pages.
		$walker = new Walker( $id, (bool) $args['view_all'] || 'click' === $args['opens_on'] );

		$items = wp_nav_menu(
			[
				'menu'        => $menu,
				'container'   => false,
				'items_wrap'  => '<ul class="matter-menu__items">%3$s</ul>',
				'fallback_cb' => false,
				'depth'       => (int) $args['depth'],
				'walker'      => $walker,
				'echo'        => false,
			]
		);

		if ( ! $items ) {
			return '';
		}

		$classes = [
			'matter-menu',
			$args['location'] ? 'matter-menu--' . sanitize_html_class( $args['location'] ) : '',
			'vertical' === $args['orientation'] ? 'is-vertical' : 'is-horizontal',
			'click' === $args['opens_on'] ? 'opens-on-click' : 'opens-on-hover',
			self::type_class( $ranges ),
			(string) $args['class'],
		];

		$context = [
			'types'        => array_map(
				fn( array $range ) => [
					'type'  => $range['value'],
					'query' => $range['query'],
				],
				$ranges
			),
			'menuType'     => $ranges[0]['value'],
			'opensOn'      => 'click' === $args['opens_on'] ? 'click' : 'hover',
			'openSubmenus' => [],
			'openModes'    => (object) [],
		];

		self::enqueue( $ranges );
		self::register_state();

		$html = sprintf(
			'<nav id="%1$s" class="%2$s" aria-label="%3$s" data-wp-interactive="matter/menu" %4$s data-wp-init="callbacks.init" data-wp-on--keydown="actions.onKeydown" data-wp-on--focusout="actions.onFocusOut" data-wp-on-document--click="actions.onDocumentClick" data-wp-on-document--keydown="actions.onDocumentKeydown">%5$s</nav>',
			esc_attr( $id ),
			esc_attr( implode( ' ', array_filter( $classes ) ) ),
			esc_attr( $args['label'] ?: $menu->name ),
			wp_interactivity_data_wp_context( $context ),
			$items
		);

		return wp_interactivity_process_directives( $html );
	}

	/**
	 * The menu to render, from `menu` or `location`.
	 *
	 * @param array<string, mixed> $args Menu arguments.
	 * @return \WP_Term|null
	 */
	private static function get_menu( array $args ): ?\WP_Term {
		if ( $args['menu'] ) {
			$menu = wp_get_nav_menu_object( $args['menu'] );
			return $menu ?: null;
		}

		$locations = get_nav_menu_locations();
		$menu_id   = $locations[ $args['location'] ] ?? 0;
		$menu      = $menu_id ? wp_get_nav_menu_object( $menu_id ) : false;

		return $menu ?: null;
	}

	/**
	 * Validated type ranges for a type argument.
	 *
	 * @param string|array $type Menu type or breakpoint map.
	 * @return array<int, array{value: string, query: string, from: ?string}>
	 */
	private static function get_type_ranges( string|array $type ): array {
		$ranges = array_values(
			array_filter(
				Breakpoints::ranges( $type ),
				fn( array $range ) => null !== MenuType::tryFrom( $range['value'] )
			)
		);

		return $ranges ?: Breakpoints::ranges( MenuType::Dropdown->value );
	}

	/**
	 * Class selecting the menu type CSS.
	 *
	 * Single-type menus use the type's static stylesheet; responsive menus get an
	 * instance class that their generated CSS targets.
	 *
	 * @param array $ranges Type ranges.
	 * @return string
	 */
	private static function type_class( array $ranges ): string {
		if ( 1 === count( $ranges ) ) {
			return sprintf( self::TYPE_CLASS, $ranges[0]['value'] );
		}

		return 'is-type-responsive is-types-' . substr( md5( (string) wp_json_encode( $ranges ) ), 0, 8 );
	}

	/**
	 * Enqueue menu assets and any responsive type CSS.
	 *
	 * @param array $ranges Type ranges.
	 * @return void
	 */
	private static function enqueue( array $ranges ): void {
		wp_enqueue_style( 'matter-menu' );
		wp_enqueue_script_module( 'matter/menu' );

		if ( 1 === count( $ranges ) ) {
			wp_enqueue_style( 'matter-menu-' . $ranges[0]['value'] );
			return;
		}

		$instance_class = substr( self::type_class( $ranges ), strlen( 'is-type-responsive ' ) );

		if ( isset( self::$printed_css[ $instance_class ] ) ) {
			return;
		}

		$css = '';

		foreach ( $ranges as $range ) {
			$css .= Breakpoints::scope_stylesheet(
				Assets::style_path( 'menu/' . $range['value'] . '.css' ),
				sprintf( self::TYPE_CLASS, $range['value'] ),
				$instance_class,
				$range['query']
			);
		}

		wp_add_inline_style( 'matter-menu', $css );
		self::$printed_css[ $instance_class ] = true;
	}

	/**
	 * Server-side state so directives render correctly before hydration.
	 *
	 * @return void
	 */
	private static function register_state(): void {
		static $registered = false;

		if ( $registered ) {
			return;
		}

		wp_interactivity_state(
			'matter/menu',
			[
				'isSubmenuOpen' => function () {
					$context = wp_interactivity_get_context();

					return in_array( $context['submenuId'] ?? null, $context['openSubmenus'] ?? [], true );
				},
			]
		);

		$registered = true;
	}

	/**
	 * Unique element ID for this request.
	 *
	 * @param string $id Requested ID.
	 * @return string
	 */
	private static function unique_id( string $id ): string {
		$id = sanitize_html_class( $id );

		self::$instances[ $id ] = ( self::$instances[ $id ] ?? 0 ) + 1;

		return 1 === self::$instances[ $id ] ? $id : $id . '-' . self::$instances[ $id ];
	}
}
