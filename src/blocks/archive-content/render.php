<?php
/**
 * Archive content: the archive's entry (or the theme's default) with the
 * template's list, rendered as this block's inner blocks, placed by its
 * `matter/archive-loop`. Its wrapper lets themes style the sections in it as
 * they do in post content.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    The template's rendered list.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Archives\Archives;

printf(
	'<div %1$s>%2$s</div>',
	get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by core.
	Archives::instance()->render( $content ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered blocks.
);
