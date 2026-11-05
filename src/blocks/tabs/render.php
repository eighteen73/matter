<?php
/**
 * Tabs: a tab list built from the tabs that rendered inside it, then the panels.
 *
 * Tabs can be vertical (list beside the panels), and can show as a dropdown
 * on smaller screens: a button showing the current tab (icon and label) that
 * opens the tab list. The theme decides where "smaller" starts: the variant
 * option `dropdownBelow` (a breakpoint, default md), or false to style
 * `.wp-block-matter-tabs.has-dropdown` in its own CSS (see README).
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered tab panels.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Instances;
use Eighteen73\Matter\Blocks\Tabs;
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
$matter_current = '';

foreach ( $matter_tabs as $matter_index => $matter_tab ) {
	$matter_tab_id    = $matter_id . '-' . ( $matter_index + 1 );
	$matter_tab_label = '' !== $matter_tab['label'] ? $matter_tab['label'] : sprintf( /* translators: %d: tab number */ __( 'Tab %d', 'matter' ), $matter_index + 1 );

	$matter_icon = Icons::render( (string) ( $matter_tab['icon'] ?? '' ), 'wp-block-matter-tabs__icon' );

	// The dropdown's button shows the current tab.
	$matter_current .= sprintf(
		'<span class="wp-block-matter-tabs__current" %1$s data-wp-bind--hidden="!state.isActive">%2$s<span class="wp-block-matter-tabs__label">%3$s</span></span>',
		wp_interactivity_data_wp_context( [ 'tabId' => $matter_tab_id ] ),
		$matter_icon,
		wp_kses_post( $matter_tab_label )
	);

	$matter_buttons .= sprintf(
		'<button type="button" role="tab" id="%1$s-tab" class="wp-block-matter-tabs__tab" aria-controls="%1$s" %2$s data-wp-bind--aria-selected="state.isActive" data-wp-bind--tabindex="state.tabIndex" data-wp-on--click="actions.select" data-wp-on--keydown="actions.onKeydown">%3$s<span class="wp-block-matter-tabs__label">%4$s</span></button>',
		esc_attr( $matter_tab_id ),
		wp_interactivity_data_wp_context( [ 'tabId' => $matter_tab_id ] ),
		$matter_icon,
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

$matter_toggle = '';

if ( $matter_dropdown ) {
	$matter_classes[] = 'has-dropdown';
	$matter_below     = (string) ( Variants::get( 'matter/tabs', $attributes )['dropdownBelow'] ?? '' );

	if ( '' !== $matter_below && Breakpoints::get( $matter_below ) ) {
		$matter_classes[] = 'has-dropdown-below-' . $matter_below;

		// One rule set per breakpoint, shared by every tabs block using it.
		static $matter_dropdown_styles = [];

		if ( ! isset( $matter_dropdown_styles[ $matter_below ] ) ) {
			$matter_dropdown_styles[ $matter_below ] = true;

			wp_add_inline_style(
				'matter-tabs-style',
				Tabs::dropdown_css( '.wp-block-matter-tabs.has-dropdown-below-' . $matter_below, Breakpoints::range( null, $matter_below ) )
			);
		}
	}

	$matter_toggle = sprintf(
		'<button type="button" class="wp-block-matter-tabs__toggle" aria-expanded="false" aria-controls="%1$s-list" data-wp-bind--aria-expanded="context.isMenuOpen" data-wp-on--click="actions.toggleMenu" data-wp-on--keydown="actions.onToggleKeydown"><span class="screen-reader-text">%2$s</span>%3$s</button>',
		esc_attr( $matter_id ),
		/* translators: %s: tabs name, or "Choose a tab" */
		esc_html( sprintf( __( '%s:', 'matter' ), '' !== $matter_label ? $matter_label : __( 'Choose a tab', 'matter' ) ) ) . ' ',
		$matter_current
	);
}

$matter_list = sprintf(
	'<div class="wp-block-matter-tabs__list" id="%1$s-list" role="tablist"%2$s%3$s>%4$s</div>',
	esc_attr( $matter_id ),
	'' !== $matter_label ? ' aria-label="' . esc_attr( $matter_label ) . '"' : '',
	$matter_vertical ? ' aria-orientation="vertical"' : '',
	$matter_buttons
);

// With a dropdown, the button and list share a wrapper (display: contents
// where the dropdown isn't in use, so layouts treat the list as usual).
if ( $matter_toggle ) {
	$matter_list = sprintf(
		'<div class="wp-block-matter-tabs__nav" data-wp-on-document--click="actions.onDocumentClick">%1$s%2$s</div>',
		$matter_toggle,
		$matter_list
	);
}

printf(
	'<div %1$s data-wp-interactive="matter/tabs" %2$s data-wp-init="callbacks.init" data-wp-class--is-menu-open="context.isMenuOpen">%3$s<div class="wp-block-matter-tabs__panels">%4$s</div></div>',
	get_block_wrapper_attributes( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		[
			'id'    => $matter_id,
			'class' => implode( ' ', $matter_classes ),
		]
	),
	wp_interactivity_data_wp_context( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		[
			'active'     => $matter_id . '-1',
			'deepLink'   => ! empty( $attributes['deepLink'] ),
			'isMenuOpen' => false,
		]
	),
	$matter_list, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
