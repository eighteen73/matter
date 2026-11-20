<?php
/**
 * Panel triggers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Overlays;

defined( 'ABSPATH' ) || exit;

/**
 * Buttons that open a Panel.
 */
class Trigger {

	/**
	 * Render a button that toggles a panel.
	 *
	 * The button is hidden while the panel is inline. Pass the panel's
	 * `collapse_below` breakpoint, or render the button after the panel to
	 * inherit it.
	 *
	 * `$id` is the ID the panel was asked for. If that panel renders more than
	 * once (a template part used twice), the later ones are renamed (`site-nav-2`)
	 * and the panel script points each toggle at the one nearest it, so the
	 * markup only names the ID asked for (`data-matter-panel`).
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

		$id       = sanitize_html_class( $id );
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
			'<button type="button" class="%1$s" aria-controls="%2$s" aria-expanded="false" data-matter-panel="%2$s" data-wp-interactive="matter/panel" %3$s data-wp-init="callbacks.bindToggle" data-wp-on--click="actions.toggle" data-wp-bind--aria-expanded="state.isOpen" data-wp-class--is-active="state.isOpen">%4$s<span class="matter-panel-toggle__label">%5$s</span>%6$s</button>',
			esc_attr( implode( ' ', array_filter( $classes ) ) ),
			esc_attr( $id ),
			wp_interactivity_data_wp_context( [ 'id' => $id ] ),
			$args['hamburger'] ? '<span class="matter-panel-toggle__icon" aria-hidden="true"><span></span><span></span><span></span></span>' : '',
			esc_html( $args['label'] ),
			(string) $args['content']
		);

		return $args['process'] ? wp_interactivity_process_directives( $html ) : $html;
	}
}
