<?php
/**
 * Tab panel. Its label (and optional icon) is recorded for the parent Tabs block, which renders
 * the tab list. Inside a Query Loop an empty label falls back to the post title.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered inner blocks.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Instances;
use Eighteen73\Matter\Ids;

// A tab with nothing to show isn't output (it isn't recorded, so the tab list
// leaves it out too).
if ( Instances::is_empty( $content ) ) {
	return;
}

$matter_label = trim( (string) ( $attributes['label'] ?? '' ) );

// Only in a loop: elsewhere, postId is the page's own post.
if ( '' === $matter_label && Instances::in_query_loop() && ! empty( $block->context['postId'] ) ) {
	$matter_label = get_the_title( (int) $block->context['postId'] );
}

$matter_parent = Instances::current( 'matter/tabs' ) ?? wp_unique_id( 'tabs-' );
// A post's tab is named after the post, so links to it survive new posts.
$matter_post = Instances::in_query_loop() ? (int) ( $block->context['postId'] ?? 0 ) : 0;

$matter_id = Instances::add(
	'matter/tabs',
	[
		'label' => $matter_label,
		'icon'  => (string) ( $attributes['icon'] ?? '' ),
		'id'    => $matter_post ? $matter_parent . '-post-' . $matter_post : null,
	]
);

// Outside a tabs block there's nothing to record or number.
if ( '' === $matter_id ) {
	$matter_id = Ids::claim( $matter_parent . '-' . wp_unique_id() );
}

// Without JavaScript the tab list doesn't work and every panel shows, each
// under its name: so the server renders no tabpanel role, tabindex or
// aria-labelledby (there is no tablist, and the button it would point to isn't
// shown). The script adds them (`state.panelRole` and the others), as it does
// `hidden`. The name is a heading, at level 3 or whatever the filter says; the
// script hides it (the tab is the name then).
$matter_level = (int) apply_filters(
	/**
	 * Filters the heading level of a tab panel's name, shown without JavaScript.
	 *
	 * @param int   $level      Level, 2 to 6. Default 3.
	 * @param array $attributes The tab's attributes.
	 */
	'matter_tab_label_level',
	3,
	$attributes
);
$matter_level = min( 6, max( 2, $matter_level ) );

printf(
	'<div %1$s %2$s data-wp-bind--role="state.panelRole" data-wp-bind--tabindex="state.panelTabIndex" data-wp-bind--aria-labelledby="state.panelLabelledBy" data-wp-class--is-active="state.isActive" data-wp-bind--hidden="state.isPanelHidden" data-wp-on--beforematch="actions.reveal">%3$s%4$s</div>',
	get_block_wrapper_attributes( [ 'id' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_interactivity_data_wp_context( [ 'tabId' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	'' !== $matter_label ? sprintf( '<div class="wp-block-matter-tab__label" role="heading" aria-level="%1$d">%2$s</div>', $matter_level, wp_kses_post( $matter_label ) ) : '', // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
