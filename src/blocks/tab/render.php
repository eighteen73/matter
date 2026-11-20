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

// Without JavaScript the tab list doesn't work and every panel shows, so each
// panel names itself (hidden by CSS once the script runs).
printf(
	'<div %1$s %2$s role="tabpanel" aria-labelledby="%3$s-tab" tabindex="0" data-wp-class--is-active="state.isActive" data-wp-bind--hidden="state.isPanelHidden" data-wp-on--beforematch="actions.reveal">%4$s%5$s</div>',
	get_block_wrapper_attributes( [ 'id' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_interactivity_data_wp_context( [ 'tabId' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	esc_attr( $matter_id ),
	'' !== $matter_label ? '<div class="wp-block-matter-tab__label">' . wp_kses_post( $matter_label ) . '</div>' : '',
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
