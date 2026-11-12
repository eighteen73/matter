<?php
/**
 * Carousel: each inner block is a slide, or the items of a Query Loop /
 * Product Collection. Behaviour comes from the chosen variant (block style);
 * slide widths and spacing come from theme CSS. When every slide is an image,
 * the images share one aspect ratio (a theme preset; the variant's by default).
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered slides.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\AspectRatio;
use Eighteen73\Matter\Blocks\Carousel;
use Eighteen73\Matter\Variants;

$matter_options = Variants::get( 'matter/carousel', $attributes );
$matter_style   = '';

$matter_is_images = count( $block->inner_blocks ) > 0;
$matter_images    = [];

foreach ( $block->inner_blocks as $matter_inner ) {
	$matter_is_images = $matter_is_images && 'core/image' === $matter_inner->name;
	$matter_images[]  = (int) ( $matter_inner->attributes['id'] ?? 0 );
}

if ( $matter_is_images ) {
	$matter_style = AspectRatio::style( (string) ( ( $attributes['aspectRatio'] ?? '' ) ?: ( $matter_options['aspectRatio'] ?? '' ) ) );
}

// A query shown as a carousel (Blocks\QueryDisplay) has no inner blocks: its
// items are the slides. Marked here too (view.js marks it as well), so the
// layout is right before the script starts.
$matter_is_query = ! $block->inner_blocks && preg_match( '/\b(?:wp-block-post-template|wc-block-product-template|wp-block-woocommerce-product-template)\b/', $content );
$matter_classes  = array_filter(
	[
		$matter_style ? 'has-image-aspect-ratio' : '',
		$matter_is_query ? 'is-query' : '',
	]
);

$matter_html = Carousel::render(
	$content,
	$matter_options,
	get_block_wrapper_attributes(
		array_filter(
			[
				'class' => implode( ' ', $matter_classes ),
				'style' => $matter_style,
			]
		)
	),
	trim( (string) ( $attributes['label'] ?? '' ) ),
	// Image slides can have thumbnails.
	[ 'thumbnails' => $matter_is_images ? $matter_images : [] ]
);

echo $matter_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Carousel::render().
