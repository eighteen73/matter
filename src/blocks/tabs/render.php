<?php
/**
 * Tabs: a tab list built from the tabs that rendered inside it, then the panels.
 *
 * Tabs can be vertical (list beside the panels), and can show as a dropdown
 * (a native select) on smaller screens. The theme decides where "smaller"
 * starts: the variant option `dropdownBelow` (a breakpoint, default md), or
 * false to style `.wp-block-matter-tabs.has-dropdown` in its own CSS.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered tab panels.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Instances;
use Eighteen73\Matter\Breakpoints;
use Eighteen73\Matter\Icons;
use Eighteen73\Matter\Variants;

$matter_id   = Instances::current( 'matter/tabs' ) ?? wp_unique_id( 'tabs-' );
$matter_tabs = Instances::items( 'matter/tabs' );

if ( ! $matter_tabs ) {
	return;
}

wp_interactivity_state(
	'matter/tabs',
	[
		'isActive' => function () {
			$context = wp_interactivity_get_context();

			return ( $context['active'] ?? '' ) === ( $context['tabId'] ?? null );
		},
		'tabIndex' => function () {
			$context = wp_interactivity_get_context();

			return ( $context['active'] ?? '' ) === ( $context['tabId'] ?? null ) ? 0 : -1;
		},
	]
);

$matter_buttons = '';
$matter_options = '';

foreach ( $matter_tabs as $matter_index => $matter_tab ) {
	$matter_tab_id    = $matter_id . '-' . ( $matter_index + 1 );
	$matter_tab_label = '' !== $matter_tab['label'] ? $matter_tab['label'] : sprintf( /* translators: %d: tab number */ __( 'Tab %d', 'matter' ), $matter_index + 1 );

	$matter_options .= sprintf(
		'<option value="%1$s" %2$s data-wp-bind--selected="state.isActive">%3$s</option>',
		esc_attr( $matter_tab_id ),
		wp_interactivity_data_wp_context( [ 'tabId' => $matter_tab_id ] ),
		esc_html( wp_strip_all_tags( $matter_tab_label ) )
	);

	$matter_buttons .= sprintf(
		'<button type="button" role="tab" id="%1$s-tab" class="wp-block-matter-tabs__tab" aria-controls="%1$s" %2$s data-wp-bind--aria-selected="state.isActive" data-wp-bind--tabindex="state.tabIndex" data-wp-on--click="actions.select" data-wp-on--keydown="actions.onKeydown">%3$s<span class="wp-block-matter-tabs__label">%4$s</span></button>',
		esc_attr( $matter_tab_id ),
		wp_interactivity_data_wp_context( [ 'tabId' => $matter_tab_id ] ),
		Icons::render( (string) ( $matter_tab['icon'] ?? '' ), 'wp-block-matter-tabs__icon' ),
		wp_kses_post( $matter_tab_label )
	);
}

$matter_label    = trim( (string) ( $attributes['label'] ?? '' ) );
$matter_vertical = 'vertical' === ( $attributes['orientation'] ?? '' );
$matter_dropdown = ! empty( $attributes['dropdown'] );
$matter_classes  = [];

if ( $matter_vertical ) {
	$matter_classes[] = 'is-vertical';
}

$matter_select = '';

if ( $matter_dropdown ) {
	$matter_classes[] = 'has-dropdown';
	$matter_below     = (string) ( Variants::get( 'matter/tabs', $attributes )['dropdownBelow'] ?? '' );

	if ( '' !== $matter_below && Breakpoints::get( $matter_below ) ) {
		$matter_classes[] = 'has-dropdown-below-' . $matter_below;

		// One rule set per breakpoint, shared by every tabs block using it.
		static $matter_dropdown_styles = [];

		if ( ! isset( $matter_dropdown_styles[ $matter_below ] ) ) {
			$matter_dropdown_styles[ $matter_below ] = true;

			$matter_scope = '.wp-block-matter-tabs.has-dropdown-below-' . $matter_below;

			wp_add_inline_style(
				'matter-tabs-style',
				sprintf(
					'@media %1$s{%2$s{display:block}%2$s>.wp-block-matter-tabs__list{display:none}%2$s>.wp-block-matter-tabs__select{display:block}}',
					Breakpoints::range( null, $matter_below ),
					$matter_scope
				)
			);
		}
	}

	$matter_select = sprintf(
		'<select class="wp-block-matter-tabs__select" aria-label="%1$s" aria-controls="%2$s" data-wp-on--change="actions.selectFromMenu">%3$s</select>',
		esc_attr( '' !== $matter_label ? $matter_label : __( 'Choose a tab', 'matter' ) ),
		esc_attr( implode( ' ', array_map( fn( $index ) => $matter_id . '-' . ( $index + 1 ), array_keys( $matter_tabs ) ) ) ),
		$matter_options
	);
}

printf(
	'<div %1$s data-wp-interactive="matter/tabs" %2$s data-wp-init="callbacks.init">%3$s<div class="wp-block-matter-tabs__list" role="tablist"%4$s%5$s>%6$s</div><div class="wp-block-matter-tabs__panels">%7$s</div></div>',
	get_block_wrapper_attributes( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		[
			'id'    => $matter_id,
			'class' => implode( ' ', $matter_classes ),
		]
	),
	wp_interactivity_data_wp_context( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		[
			'active'   => $matter_id . '-1',
			'deepLink' => ! empty( $attributes['deepLink'] ),
		]
	),
	$matter_select, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	'' !== $matter_label ? ' aria-label="' . esc_attr( $matter_label ) . '"' : '',
	$matter_vertical ? ' aria-orientation="vertical"' : '',
	$matter_buttons, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
