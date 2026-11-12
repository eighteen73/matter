<?php
/**
 * Loop item: the theme's design for the current item in a loop.
 *
 * The design is a pattern in the theme (see Blocks\LoopItem), rendered with
 * the item's context so post, product and term blocks inside it show this
 * item: a post, or in a Terms Query a term. Loops and carousels contain just
 * this block, so every list of a post type (or taxonomy) looks the same and a
 * change to the pattern reaches them all.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Instances;
use Eighteen73\Matter\Blocks\LoopItem;

// The block its query is shown as, if any (Blocks\QueryDisplay).
$matter_display = (string) ( $block->context['matter/display']['type'] ?? '' );

// A term, in a Terms Query's term template. Its `termId` wins over `postId`
// (the page's there), unless a Query Loop inside the term's pattern is the
// innermost loop: then this is one of its posts.
$matter_term_id = 'post' !== Instances::loop() ? (int) ( $block->context['termId'] ?? 0 ) : 0;

$matter_loop_item = $matter_term_id
	? LoopItem::render_term( $matter_term_id, (string) ( $block->context['taxonomy'] ?? '' ), $matter_display )
	: LoopItem::render(
		(int) ( $block->context['postId'] ?? get_the_ID() ),
		(string) ( $block->context['postType'] ?? '' ),
		$matter_display
	);

if ( '' === $matter_loop_item ) {
	return;
}

printf(
	'<div %s>%s</div>',
	get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by core.
	$matter_loop_item // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered blocks.
);
