<?php
/**
 * Tab panel. Its label is recorded for the parent Tabs block, which renders
 * the tab list. Inside a Query Loop an empty label falls back to the post title.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered inner blocks.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Instances;

$matter_label = trim( (string) ( $attributes['label'] ?? '' ) );

if ( '' === $matter_label && ! empty( $block->context['postId'] ) ) {
	$matter_label = get_the_title( (int) $block->context['postId'] );
}

$matter_parent   = Instances::current( 'matter/tabs' ) ?? wp_unique_id( 'tabs-' );
$matter_position = Instances::add( 'matter/tabs', [ 'label' => $matter_label ] );
$matter_id       = $matter_parent . '-' . ( $matter_position ? $matter_position : wp_unique_id() );

printf(
	'<div %1$s %2$s role="tabpanel" aria-labelledby="%3$s-tab" tabindex="0" data-wp-bind--hidden="!state.isActive">%4$s</div>',
	get_block_wrapper_attributes( [ 'id' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_interactivity_data_wp_context( [ 'tabId' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	esc_attr( $matter_id ),
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
