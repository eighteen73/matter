<?php
/**
 * Gallery: core/image blocks in a grid or carousel, with an optional lightbox.
 *
 * Every image is cropped to the chosen aspect ratio (a theme preset; the
 * variant's `aspectRatio` by default) and uses the variant's image size
 * (`imageSize`). The grid has the chosen number of columns (from the variant's
 * `columns` choices) and can show only the first few images, with a "View all"
 * button opening the lightbox.
 *
 * The carousel layout reuses the carousel block's markup and behaviour, with
 * the carousel's default options overridden by the gallery variant's.
 *
 * Captions (the images' own, or their media library captions) show behind an
 * info button ("tooltip"), over the image ("overlay") or not at all
 * ("hidden"); the variant's `captions` option sets the default. The lightbox
 * shows them too, unless hidden.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered images.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\AspectRatio;
use Eighteen73\Matter\Blocks\Carousel;
use Eighteen73\Matter\Variants;

$matter_options  = Variants::get( 'matter/gallery', $attributes );
$matter_lightbox = ! empty( $attributes['lightbox'] );
$matter_carousel = 'carousel' === ( $attributes['layout'] ?? '' );
$matter_limit    = $matter_carousel ? 0 : max( 0, (int) ( $attributes['limit'] ?? 0 ) );
$matter_size     = (string) ( $matter_options['imageSize'] ?? '' );
$matter_size     = in_array( $matter_size, get_intermediate_image_sizes(), true ) || 'full' === $matter_size ? $matter_size : '';
$matter_images   = [];
$matter_ids      = [];
$matter_captions = (string) ( ( $attributes['captions'] ?? '' ) ?: ( $matter_options['captions'] ?? '' ) );
$matter_captions = in_array( $matter_captions, [ 'tooltip', 'overlay', 'hidden' ], true ) ? $matter_captions : 'tooltip';

// Lightbox data from the images' attachments (captions, larger sizes), in
// the order their figures render: an image block without an image renders
// nothing, so it's skipped, or later images would open the wrong one.
foreach ( $block->inner_blocks as $matter_inner ) {
	if ( 'core/image' !== $matter_inner->name ) {
		continue;
	}

	$matter_img = new WP_HTML_Tag_Processor( (string) $matter_inner->inner_html );

	if ( ! $matter_img->next_tag( 'img' ) || '' === (string) $matter_img->get_attribute( 'src' ) ) {
		continue;
	}

	// The block's own alt text, as on the page (the media library's is only
	// the default when the image was added).
	$matter_alt        = (string) $matter_img->get_attribute( 'alt' );
	$matter_attachment = (int) ( $matter_inner->attributes['id'] ?? 0 );
	$matter_ids[]      = $matter_attachment;
	$matter_full       = $matter_attachment ? wp_get_attachment_image_src( $matter_attachment, 'full' ) : false;

	// The image's own caption, else its media library caption.
	$matter_caption = preg_match( '/<figcaption\b[^>]*>(.*?)<\/figcaption>/is', (string) $matter_inner->inner_html, $matter_match ) ? $matter_match[1] : '';
	$matter_caption = trim( wp_strip_all_tags( $matter_caption ) ) ?: ( $matter_attachment ? (string) wp_get_attachment_caption( $matter_attachment ) : '' );

	$matter_images[] = [
		'src'     => $matter_full ? $matter_full[0] : '',
		'srcset'  => $matter_attachment ? (string) wp_get_attachment_image_srcset( $matter_attachment, 'full' ) : '',
		'alt'     => $matter_alt,
		'caption' => 'hidden' === $matter_captions ? '' : $matter_caption,
	];
}

// One image size for every image, and hide images beyond the limit.
$matter_processor = new WP_HTML_Tag_Processor( $content );
$matter_figure    = 0;

while ( $matter_processor->next_tag() ) {
	$matter_tag = $matter_processor->get_tag();

	if ( 'FIGURE' === $matter_tag && $matter_processor->has_class( 'wp-block-image' ) ) {
		++$matter_figure;

		if ( $matter_limit && $matter_figure > $matter_limit ) {
			$matter_processor->set_attribute( 'hidden', true );
		}

		continue;
	}

	if ( 'IMG' !== $matter_tag || '' === $matter_size ) {
		continue;
	}

	if ( ! preg_match( '/\bwp-image-(\d+)\b/', (string) $matter_processor->get_attribute( 'class' ), $matter_match ) ) {
		continue;
	}

	$matter_src = wp_get_attachment_image_src( (int) $matter_match[1], $matter_size );

	if ( ! $matter_src ) {
		continue;
	}

	$matter_processor->set_attribute( 'src', $matter_src[0] );
	$matter_processor->set_attribute( 'width', (string) $matter_src[1] );
	$matter_processor->set_attribute( 'height', (string) $matter_src[2] );

	$matter_srcset = wp_get_attachment_image_srcset( (int) $matter_match[1], $matter_size );

	if ( $matter_srcset ) {
		$matter_processor->set_attribute( 'srcset', $matter_srcset );
		$matter_processor->set_attribute( 'sizes', (string) wp_get_attachment_image_sizes( (int) $matter_match[1], $matter_size ) );
	}
}

$content = $matter_processor->get_updated_html();

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

// Info buttons: each caption is hidden until its button is pressed.
if ( 'tooltip' === $matter_captions ) {
	$content = preg_replace_callback(
		'/<figcaption\b([^>]*)>/',
		function ( $matches ) {
			$id = wp_unique_id( 'matter-gallery-caption-' );

			return sprintf(
				'<button type="button" class="wp-block-matter-gallery__caption-toggle" aria-expanded="false" aria-controls="%1$s" data-wp-on--click="matter/gallery::actions.toggleCaption"><span class="screen-reader-text">%2$s</span></button><figcaption id="%1$s"%3$s>',
				esc_attr( $id ),
				esc_html__( 'Caption', 'matter' ),
				$matches[1]
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
				<span class="wp-block-matter-gallery__counter" style="--gallery-counter-width:%5$s" data-wp-text="state.counter"></span>
				<button type="button" class="wp-block-matter-gallery__next" data-wp-on--click="actions.next"><span class="screen-reader-text">%4$s</span></button>
			</div>
		</dialog>',
		esc_attr__( 'Image viewer', 'matter' ),
		esc_html__( 'Close', 'matter' ),
		esc_html__( 'Previous image', 'matter' ),
		esc_html__( 'Next image', 'matter' ),
		// Room for the widest count ("12 / 12"), so the arrows stay put.
		esc_attr( ( 2 * strlen( (string) count( $matter_images ) ) + 3 ) . 'ch' )
	);
}

$matter_label = trim( (string) ( $attributes['label'] ?? '' ) );

if ( $matter_carousel ) {
	wp_enqueue_script_module( 'matter-carousel-view-script-module' );
	wp_enqueue_style( 'matter-carousel-style' );

	$matter_items = Carousel::render(
		$content,
		array_merge( Variants::get( 'matter/carousel', [] ), $matter_options ),
		'class="wp-block-matter-gallery__items wp-block-matter-carousel"',
		$matter_label,
		[
			'thumbnails' => $matter_ids,
			'expand'     => $matter_lightbox && $matter_images,
		]
	);
} else {
	$matter_items = sprintf( '<div class="wp-block-matter-gallery__items">%s</div>', $content );
}

// "View all": opens the lightbox, or reveals the hidden images without one.
if ( $matter_limit && $matter_figure > $matter_limit ) {
	/**
	 * Filters the gallery's "View all" button text.
	 *
	 * @param string $text  Button text.
	 * @param int    $total Number of images.
	 */
	$matter_more_text = (string) apply_filters(
		'matter_gallery_view_all_text',
		/* translators: %d: number of images */
		sprintf( _n( 'View all %d image', 'View all %d images', $matter_figure, 'matter' ), $matter_figure ),
		$matter_figure
	);

	$matter_items .= sprintf(
		'<button type="button" class="wp-block-matter-gallery__more" data-wp-on--click="actions.viewAll">%s</button>',
		esc_html( $matter_more_text )
	);
}

// Grid columns: one of the theme's choices; fewer show where there's less room.
$matter_columns = (int) ( $attributes['columns'] ?? 0 ) ?: (int) ( $matter_options['defaultColumns'] ?? 0 );
$matter_classes = [ $matter_carousel ? 'is-carousel' : 'is-grid', 'has-captions-' . $matter_captions ];

if ( ! $matter_carousel && in_array( $matter_columns, array_map( 'intval', (array) ( $matter_options['columns'] ?? [] ) ), true ) ) {
	$matter_classes[] = 'has-columns has-columns-' . $matter_columns;
}

$matter_wrapper = [
	'class' => implode( ' ', $matter_classes ),
	'style' => AspectRatio::style( (string) ( ( $attributes['aspectRatio'] ?? '' ) ?: ( $matter_options['aspectRatio'] ?? '' ) ) ),
];

printf(
	'<div %1$s data-wp-interactive="matter/gallery" %2$s data-wp-init--api="callbacks.init" data-wp-init--rows="callbacks.fitRows" data-wp-watch="callbacks.announce">%3$s%4$s</div>',
	get_block_wrapper_attributes( array_filter( $matter_wrapper ) ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_interactivity_data_wp_context( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		[
			'images'  => $matter_images,
			'index'   => 0,
			// The lightbox's image loads only once it's opened.
			'opened'  => false,
			'limit'   => $matter_limit,
			'counter' => __( '%1$d / %2$d', 'matter' ), // phpcs:ignore WordPress.WP.I18n.MissingTranslatorsComment
		]
	),
	$matter_items, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$matter_lightbox_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
