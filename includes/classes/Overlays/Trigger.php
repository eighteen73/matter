<?php
/**
 * Panel triggers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Overlays;

use Eighteen73\Matter\Ids;

defined( 'ABSPATH' ) || exit;

/**
 * Buttons that open a Panel.
 */
class Trigger {

	/**
	 * Where each panel's last toggle pointed, by the panel's requested ID: the
	 * ID, how many panels had rendered, and whether it came after its panel.
	 *
	 * @var array<string, array{id: string, panels: int, after: bool}>
	 */
	private static array $last = [];

	/**
	 * The ID registry `$last` belongs to.
	 *
	 * @var int
	 */
	private static int $generation = -1;

	/**
	 * Render a button that toggles a panel.
	 *
	 * The button is hidden while the panel is inline. Pass the panel's
	 * `collapse_below` breakpoint, or render the button after the panel to
	 * inherit it.
	 *
	 * @param string $id   Panel ID.
	 * @param array  $args {
	 *     @type string $collapse_below The panel's breakpoint.
	 *     @type string $label      Button label.
	 *     @type bool   $show_label Show the label visually (otherwise it's for screen readers).
	 *     @type bool   $hamburger  Include the three-line icon.
	 *     @type string $class      Extra classes.
	 *     @type string $content    Extra HTML inside the button, after the label (e.g. a count).
	 *     @type bool   $process    Process its Interactivity API directives (default true, for
	 *                              templates). A block's render passes false: the outermost
	 *                              interactive block processes them.
	 * }
	 * @return string
	 */
	public static function button( string $id, array $args = [] ): string {
		$args = wp_parse_args(
			$args,
			[
				'collapse_below' => null,
				'label'          => __( 'Menu', 'matter' ),
				'show_label'     => false,
				'hamburger'      => true,
				'class'          => '',
				'content'        => '',
				'process'        => true,
			]
		);

		$id       = self::target( $id );
		$settings = Panel::settings( $id, $args['collapse_below'] );

		Panel::register_state( $id );
		Panel::enqueue( $settings );

		$classes = [
			'matter-panel-toggle',
			$settings['class'],
			$args['hamburger'] ? 'has-hamburger' : '',
			$args['show_label'] ? '' : 'has-hidden-label',
			(string) $args['class'],
		];

		$html = sprintf(
			'<button type="button" class="%1$s" aria-controls="%2$s" aria-expanded="false" data-wp-interactive="matter/panel" %3$s data-wp-on--click="actions.toggle" data-wp-bind--aria-expanded="state.isOpen" data-wp-class--is-active="state.isOpen">%4$s<span class="matter-panel-toggle__label">%5$s</span>%6$s</button>',
			esc_attr( implode( ' ', array_filter( $classes ) ) ),
			esc_attr( $id ),
			wp_interactivity_data_wp_context( [ 'id' => $id ] ),
			$args['hamburger'] ? '<span class="matter-panel-toggle__icon" aria-hidden="true"><span></span><span></span><span></span></span>' : '',
			esc_html( $args['label'] ),
			(string) $args['content']
		);

		return $args['process'] ? wp_interactivity_process_directives( $html ) : $html;
	}

	/**
	 * The ID of the panel a toggle controls. Normally the ID it is given, but a
	 * panel rendered more than once (a template part used twice) has its
	 * repeats renamed (`site-nav-2`), and each toggle goes with its own: the
	 * panel rendered after it (the usual order, toggle then panel) or, when the
	 * panel is already there, the latest. Toggles that follow one another with
	 * no panel between them share it.
	 *
	 * @param string $asked The ID passed to `button()`.
	 * @return string
	 */
	private static function target( string $asked ): string {
		if ( self::$generation !== Ids::generation() ) {
			self::$last       = [];
			self::$generation = Ids::generation();
		}

		$asked    = sanitize_html_class( $asked );
		$rendered = Panel::rendered( $asked );
		$panels   = count( $rendered );
		$last     = self::$last[ $asked ] ?? null;

		if ( null !== $last && $panels === $last['panels'] ) {
			// No panel since the last toggle: the same panel.
			return $last['id'];
		}

		$after = $last ? $last['after'] : $panels > 0;
		$id    = $after ? (string) end( $rendered ) : Ids::peek( $asked );

		self::$last[ $asked ] = [
			'id'     => $id,
			'panels' => $panels,
			'after'  => $after,
		];

		return $id;
	}
}
