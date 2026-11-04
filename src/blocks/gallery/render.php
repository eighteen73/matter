<?php
/**
 * Gallery: core/image blocks in a grid or carousel, with an optional lightbox.
 *
 * The carousel style reuses the carousel block's markup and behaviour (and
 * the theme's carousel variant options under `matter/gallery`).
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered images.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Carousel;
use Eighteen73\Matter\Variants;

$matter_lightbox = ! empty( $attributes['lightbox'] );
$matter_carousel = str_contains( (string) ( $attributes['className'] ?? '' ), 'is-style-carousel' );
$matter_images   = [];

// Lightbox data from the images' attachments (captions, larger sizes).
foreach ( $block->inner_blocks as $matter_inner ) {
	if ( 'core/image' !== $matter_inner->name ) {
		continue;
	}

	$matter_attachment = (int) ( $matter_inner->attributes['id'] ?? 0 );
	$matter_full       = $matter_attachment ? wp_get_attachment_image_src( $matter_attachment, 'full' ) : false;

	$matter_images[] = [
		'src'     => $matter_full ? $matter_full[0] : '',
		'srcset'  => $matter_attachment ? (string) wp_get_attachment_image_srcset( $matter_attachment, 'full' ) : '',
		'alt'     => $matter_attachment ? (string) get_post_meta( $matter_attachment, '_wp_attachment_image_alt', true ) : '',
		'caption' => $matter_attachment ? (string) wp_get_attachment_caption( $matter_attachment ) : '',
	];
}

// Add an "enlarge" button to each figure (a real control, not a clickable image).
if ( $matter_lightbox && $matter_images ) {
	$matter_index = 0;
	$matter_total = count( $matter_images );

	$content = preg_replace_callback(
		'/<figure\b[^>]*\bwp-block-image\b[^>]*>/',
		function ( $matches ) use ( &$matter_index, $matter_total ) {
			++$matter_index;

			return $matches[0] . sprintf(
				// Explicit namespace: in the carousel style the button sits inside the
				// carousel's interactive region.
				'<button type="button" class="wp-block-matter-gallery__open" data-wp-on--click="matter/gallery::actions.open" %1$s><span class="screen-reader-text">%2$s</span></button>',
				wp_interactivity_data_wp_context( [ 'imageIndex' => $matter_index - 1 ], 'matter/gallery' ),
				/* translators: 1: image number, 2: number of images */
				esc_html( sprintf( __( 'Enlarge image %1$d of %2$d', 'matter' ), $matter_index, $matter_total ) )
			);
		},
		$content
	);
}

$matter_lightbox_html = '';

if ( $matter_lightbox && $matter_images ) {
	$matter_lightbox_html = sprintf(
		'<dialog class="wp-block-matter-gallery__lightbox" aria-label="%1$s" data-wp-on--close="actions.onClose" data-wp-on--click="actions.onBackdropClick" data-wp-on--keydown="actions.onKeydown">
			<button type="button" class="wp-block-matter-gallery__close" data-wp-on--click="actions.close"><span class="screen-reader-text">%2$s</span></button>
			<figure class="wp-block-matter-gallery__figure">
				<img data-wp-bind--src="state.image.src" data-wp-bind--srcset="state.image.srcset" data-wp-bind--alt="state.image.alt" sizes="100vw" alt="" />
				<figcaption data-wp-text="state.image.caption" data-wp-bind--hidden="!state.image.caption"></figcaption>
			</figure>
			<div class="wp-block-matter-gallery__nav">
				<button type="button" class="wp-block-matter-gallery__prev" data-wp-on--click="actions.prev"><span class="screen-reader-text">%3$s</span></button>
				<span class="wp-block-matter-gallery__counter" data-wp-text="state.counter"></span>
				<button type="button" class="wp-block-matter-gallery__next" data-wp-on--click="actions.next"><span class="screen-reader-text">%4$s</span></button>
			</div>
		</dialog>',
		esc_attr__( 'Image viewer', 'matter' ),
		esc_html__( 'Close', 'matter' ),
		esc_html__( 'Previous image', 'matter' ),
		esc_html__( 'Next image', 'matter' )
	);
}

$matter_label = trim( (string) ( $attributes['label'] ?? '' ) );

if ( $matter_carousel ) {
	wp_enqueue_script_module( 'matter-carousel-view-script-module' );
	wp_enqueue_style( 'matter-carousel-style' );

	$matter_items = Carousel::render(
		$content,
		array_merge( Variants::get( 'matter/carousel', [] ), Variants::get( 'matter/gallery', $attributes ) ),
		'class="wp-block-matter-gallery__items wp-block-matter-carousel"',
		$matter_label
	);
} else {
	$matter_items = sprintf( '<div class="wp-block-matter-gallery__items">%s</div>', $content );
}

printf(
	'<div %1$s data-wp-interactive="matter/gallery" %2$s>%3$s%4$s</div>',
	get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_interactivity_data_wp_context( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		[
			'images'  => $matter_images,
			'index'   => 0,
			'counter' => __( '%1$d / %2$d', 'matter' ), // phpcs:ignore WordPress.WP.I18n.MissingTranslatorsComment
		]
	),
	$matter_items, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$matter_lightbox_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
