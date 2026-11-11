<?php
/**
 * Loop item: the theme's design for the current item in a loop.
 *
 * The design is a pattern in the theme (see Blocks\LoopItem), rendered with
 * the item's context so post, product and term blocks inside it show this
 * item. Loops and carousels contain just this block, so every list of a post
 * type looks the same and a change to the pattern reaches them all.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\LoopItem;

$matter_loop_item = LoopItem::render(
	(int) ( $block->context['postId'] ?? get_the_ID() ),
	(string) ( $block->context['postType'] ?? '' ),
	(string) ( $attributes['design'] ?? '' )
);

if ( '' === $matter_loop_item ) {
	return;
}

printf(
	'<div %s>%s</div>',
	get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by core.
	$matter_loop_item // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered blocks.
);
