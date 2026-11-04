<?php
/**
 * Accordion item: a heading button and a panel.
 *
 * Inside a Query Loop an empty title falls back to the post title.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered inner blocks.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Instances;

$matter_title = trim( (string) ( $attributes['title'] ?? '' ) );

if ( '' === $matter_title && ! empty( $block->context['postId'] ) ) {
	$matter_title = get_the_title( (int) $block->context['postId'] );
}

$matter_position = Instances::add(
	'matter/accordion',
	[
		'title' => wp_strip_all_tags( $matter_title ),
		'text'  => trim( wp_strip_all_tags( $content ) ),
		'open'  => ! empty( $attributes['open'] ),
	]
);

$matter_parent = Instances::current( 'matter/accordion' ) ?? wp_unique_id( 'accordion-' );
$matter_id     = $matter_parent . '-' . ( $matter_position ? $matter_position : wp_unique_id() );
$matter_level  = min( 6, max( 2, (int) ( $block->context['matter/headingLevel'] ?? 3 ) ) );

printf(
	'<div %1$s %2$s data-wp-class--is-open="state.isItemOpen"><h%3$d class="wp-block-matter-accordion-item__heading"><button type="button" id="%4$s-button" class="wp-block-matter-accordion-item__toggle" aria-expanded="false" aria-controls="%4$s-panel" data-wp-on--click="actions.toggle" data-wp-bind--aria-expanded="state.isItemOpen"><span class="wp-block-matter-accordion-item__title">%5$s</span></button></h%3$d><div id="%4$s-panel" class="wp-block-matter-accordion-item__panel" role="region" aria-labelledby="%4$s-button" inert data-wp-bind--inert="!state.isItemOpen"><div class="wp-block-matter-accordion-item__content">%6$s</div></div></div>',
	get_block_wrapper_attributes( [ 'id' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_interactivity_data_wp_context( [ 'itemId' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	(int) $matter_level,
	esc_attr( $matter_id ),
	wp_kses_post( $matter_title ),
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
