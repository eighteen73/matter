<?php
/**
 * Carousel: each inner block is a slide, or the items of a Query Loop /
 * Product Collection. Behaviour comes from the chosen variant (block style);
 * slide widths and spacing come from theme CSS.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered slides.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Carousel;
use Eighteen73\Matter\Variants;

$matter_html = Carousel::render(
	$content,
	Variants::get( 'matter/carousel', $attributes ),
	get_block_wrapper_attributes(),
	trim( (string) ( $attributes['label'] ?? '' ) )
);

echo $matter_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Carousel::render().
