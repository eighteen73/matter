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

$matter_html = Carousel::render(
	$content,
	$matter_options,
	get_block_wrapper_attributes(
		$matter_style ? [
			'class' => 'has-image-aspect-ratio',
			'style' => $matter_style,
		] : []
	),
	trim( (string) ( $attributes['label'] ?? '' ) ),
	// Image slides can have thumbnails.
	[ 'thumbnails' => $matter_is_images ? $matter_images : [] ]
);

echo $matter_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Carousel::render().
