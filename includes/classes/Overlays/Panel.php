<?php
/**
 * Responsive panel.
 *
 * A container that is an off-canvas dialog below a breakpoint and a plain
 * inline container at and above it — typically a site's navigation, which is
 * a drawer on mobile and part of the header on desktop:
 *
 *     Trigger::button( 'site-nav', [ 'collapse_below' => 'lg' ] );
 *     Panel::render( 'site-nav', fn() => matter_menu( [ … ] ), [ 'collapse_below' => 'lg' ] );
 *
 * Both modes are applied by generated media queries, so the right layout shows
 * before JavaScript runs. Inside the panel, `is-panel-only` and
 * `is-inline-only` show content in one mode only.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Overlays;

use Eighteen73\Matter\Assets;
use Eighteen73\Matter\Breakpoints;

defined( 'ABSPATH' ) || exit;

/**
 * Responsive panel.
 */
class Panel {

	/**
	 * Panel settings by ID, so triggers can share the instance class.
	 *
	 * @var array<string, array<string, string>>
	 */
	private static array $panels = [];

	/**
	 * Generated CSS already added this request, keyed by instance class.
	 *
	 * @var array<string, bool>
	 */
	private static array $printed_css = [];

	/**
	 * Render a panel.
	 *
	 * @param string          $id      Element ID, referenced by triggers.
	 * @param callable|string $content Content, or a callback that echoes/returns it.
	 * @param array           $args {
	 *     @type string|null $collapse_below Breakpoint below which the panel is off-canvas.
	 *                                       Empty for a panel that is always off-canvas.
	 *     @type string      $position       Off-canvas edge: left|right|top.
	 *     @type string      $label          Accessible dialog label.
	 *     @type string      $close_label    Close button label.
	 *     @type string      $class          Extra classes.
	 * }
	 * @return string
	 */
	public static function render( string $id, callable|string $content, array $args = [] ): string {
		$args = wp_parse_args(
			$args,
			[
				'collapse_below' => '',
				'position'       => 'right',
				'label'          => __( 'Menu', 'matter' ),
				'close_label'    => __( 'Close menu', 'matter' ),
				'class'          => '',
			]
		);

		$id       = sanitize_html_class( $id );
		$settings = self::settings( $id, (string) $args['collapse_below'] );
		$position = in_array( $args['position'], [ 'left', 'right', 'top' ], true ) ? $args['position'] : 'right';

		self::enqueue( $settings );
		self::register_state( $id );

		if ( is_callable( $content ) ) {
			ob_start();
			$returned = $content();
			$content  = (string) ob_get_clean() . ( is_string( $returned ) ? $returned : '' );
		}

		$html = sprintf(
			'<div id="%1$s" class="%2$s" data-wp-interactive="matter/panel" %3$s data-wp-init="callbacks.init" data-wp-watch="callbacks.sync" data-wp-class--is-open="state.isOpen" data-wp-on-document--keydown="actions.onKeydown"><div class="matter-panel__backdrop" data-wp-on--click="actions.close"></div><div class="matter-panel__content"><button type="button" class="matter-panel__close" data-wp-on--click="actions.close"><span class="matter-panel__close-label">%4$s</span></button>%5$s</div></div>',
			esc_attr( $id ),
			esc_attr( implode( ' ', array_filter( [ 'matter-panel', $settings['class'], 'is-from-' . $position, (string) $args['class'] ] ) ) ),
			wp_interactivity_data_wp_context(
				[
					'id'    => $id,
					'query' => $settings['query'],
					'label' => (string) $args['label'],
				]
			),
			esc_html( $args['close_label'] ),
			$content
		);

		return wp_interactivity_process_directives( $html );
	}

	/**
	 * Resolve (and remember) a panel's settings.
	 *
	 * The instance class depends only on the breakpoint, so a trigger rendered
	 * before its panel can resolve the same class.
	 *
	 * @param string      $id             Panel ID.
	 * @param string|null $collapse_below Breakpoint name; null reuses the panel's known setting.
	 * @return array{class: string, query: string, expanded: string}
	 */
	public static function settings( string $id, ?string $collapse_below = null ): array {
		if ( null === $collapse_below && isset( self::$panels[ $id ] ) ) {
			return self::$panels[ $id ];
		}

		$collapse_below = $collapse_below && Breakpoints::get( $collapse_below ) ? $collapse_below : '';

		self::$panels[ $id ] = [
			'class'    => 'is-panel-' . ( '' !== $collapse_below ? sanitize_html_class( $collapse_below ) : 'always' ),
			'query'    => Breakpoints::range( null, $collapse_below ?: null ),
			'expanded' => Breakpoints::range( $collapse_below ?: null, null ),
		];

		return self::$panels[ $id ];
	}

	/**
	 * Enqueue panel assets and the generated mode CSS.
	 *
	 * @param array{class: string, query: string, expanded: string} $settings Panel settings.
	 * @return void
	 */
	public static function enqueue( array $settings ): void {
		wp_enqueue_style( 'matter-panel' );
		wp_enqueue_script_module( 'matter/panel' );

		if ( isset( self::$printed_css[ $settings['class'] ] ) ) {
			return;
		}

		$css = Breakpoints::scope_stylesheet( Assets::style_path( 'panel/collapsed.css' ), 'is-collapsed', $settings['class'], $settings['query'] );

		// A panel that is always off-canvas has no expanded mode.
		if ( '' !== $settings['query'] ) {
			$css .= Breakpoints::scope_stylesheet( Assets::style_path( 'panel/expanded.css' ), 'is-expanded', $settings['class'], $settings['expanded'] );
		}

		wp_add_inline_style( 'matter-panel', $css );
		self::$printed_css[ $settings['class'] ] = true;
	}

	/**
	 * Server-side state for the panel and its triggers.
	 *
	 * @param string $id Panel ID.
	 * @return void
	 */
	public static function register_state( string $id ): void {
		wp_interactivity_state(
			'matter/panel',
			[
				'panels' => [ $id => [ 'isOpen' => false ] ],
				'isOpen' => function () {
					$context = wp_interactivity_get_context();
					$state   = wp_interactivity_state( 'matter/panel' );

					return ! empty( $state['panels'][ $context['id'] ?? '' ]['isOpen'] );
				},
			]
		);
	}
}
