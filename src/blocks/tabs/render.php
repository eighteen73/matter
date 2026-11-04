<?php
/**
 * Tabs: a tab list built from the tabs that rendered inside it, then the panels.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered tab panels.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Instances;

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

foreach ( $matter_tabs as $matter_index => $matter_tab ) {
	$matter_tab_id = $matter_id . '-' . ( $matter_index + 1 );

	$matter_buttons .= sprintf(
		'<button type="button" role="tab" id="%1$s-tab" class="wp-block-matter-tabs__tab" aria-controls="%1$s" %2$s data-wp-bind--aria-selected="state.isActive" data-wp-bind--tabindex="state.tabIndex" data-wp-on--click="actions.select" data-wp-on--keydown="actions.onKeydown">%3$s</button>',
		esc_attr( $matter_tab_id ),
		wp_interactivity_data_wp_context( [ 'tabId' => $matter_tab_id ] ),
		wp_kses_post( '' !== $matter_tab['label'] ? $matter_tab['label'] : sprintf( /* translators: %d: tab number */ __( 'Tab %d', 'matter' ), $matter_index + 1 ) )
	);
}

$matter_label = trim( (string) ( $attributes['label'] ?? '' ) );

printf(
	'<div %1$s data-wp-interactive="matter/tabs" %2$s data-wp-init="callbacks.init"><div class="wp-block-matter-tabs__list" role="tablist"%3$s>%4$s</div><div class="wp-block-matter-tabs__panels">%5$s</div></div>',
	get_block_wrapper_attributes( [ 'id' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_interactivity_data_wp_context( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		[
			'active'   => $matter_id . '-1',
			'deepLink' => ! empty( $attributes['deepLink'] ),
		]
	),
	'' !== $matter_label ? ' aria-label="' . esc_attr( $matter_label ) . '"' : '',
	$matter_buttons, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
