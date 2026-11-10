<?php
/**
 * Card: the theme's card for the current loop item.
 *
 * The design is a pattern in the theme (see Blocks\Card), rendered with the
 * item's context so post, product and term blocks inside it show this item.
 * Loops and carousels contain just this block, so every list of a post type
 * shows the same card and a change to the pattern reaches them all.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Card;

$matter_card = Card::render( (int) ( $block->context['postId'] ?? get_the_ID() ), (string) ( $block->context['postType'] ?? '' ) );

if ( '' === $matter_card ) {
	return;
}

printf(
	'<div %s>%s</div>',
	get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by core.
	$matter_card // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered blocks.
);
