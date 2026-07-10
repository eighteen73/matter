<?php
/**
 * Gallery block render.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Gallery;
use Eighteen73\Matter\Blocks\Carousel;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$type             = isset( $block_attributes['type'] ) && 'carousel' === $block_attributes['type'] ? 'carousel' : 'grid';
$is_carousel      = 'carousel' === $type;
$aspect_ratio     = isset( $block_attributes['aspectRatio'] ) ? (string) $block_attributes['aspectRatio'] : 'auto';
$size_slug        = isset( $block_attributes['sizeSlug'] ) ? (string) $block_attributes['sizeSlug'] : 'large';
$thumbnail_slug   = isset( $block_attributes['thumbnailSizeSlug'] ) ? (string) $block_attributes['thumbnailSizeSlug'] : 'thumbnail';
$lightbox_slug    = isset( $block_attributes['lightboxSizeSlug'] ) ? (string) $block_attributes['lightboxSizeSlug'] : 'large';
$image_limit      = isset( $block_attributes['imageLimit'] ) ? (int) $block_attributes['imageLimit'] : 0;
$image_crop       = ! isset( $block_attributes['imageCrop'] ) || ! empty( $block_attributes['imageCrop'] );
$include_thumbs   = ! empty( $block_attributes['includeThumbnails'] );
$thumb_ratio      = isset( $block_attributes['thumbnailAspectRatio'] ) ? (string) $block_attributes['thumbnailAspectRatio'] : '1';
$lightbox         = ! empty( $block_attributes['lightbox'] ) || ( ! $is_carousel && $image_limit > 0 );

$gallery_id = isset( $block->context['matter/gallery-id'] )
	? (string) $block->context['matter/gallery-id']
	: wp_unique_id( 'matter-gallery-' );

$inner_blocks = [];
if ( isset( $block ) && $block instanceof WP_Block && ! empty( $block->inner_blocks ) ) {
	foreach ( $block->inner_blocks as $inner_block ) {
		$inner_blocks[] = $inner_block;
	}
}

$images = Gallery::build_image_metadata( $inner_blocks, $size_slug, $thumbnail_slug, $lightbox_slug );
$total  = count( $images );

if ( $lightbox && $total > 0 ) {
	wp_enqueue_script_module( 'matter/lightbox-store' );
	Gallery::schedule_lightbox_overlay();

	wp_interactivity_state(
		'matter/lightbox',
		[
			'galleries' => [
				$gallery_id => [
					'images'               => $images,
					'thumbnailAspectRatio' => $thumb_ratio,
				],
			],
		]
	);
}

$should_crop = $image_crop || ( $aspect_ratio && 'auto' !== $aspect_ratio );
$classes     = [
	'matter-gallery',
	'matter-gallery--' . $type,
];

if ( $is_carousel ) {
	$classes = array_merge(
		$classes,
		Carousel::generate_carousel_classes(
			[
				'emblaConfig' => $block_attributes['carouselConfig'] ?? [],
			]
		)
	);
}

if ( ! $is_carousel && $should_crop ) {
	$classes[] = 'is-cropped';
}

$wrapper_attributes = [
	'id'                  => $gallery_id,
	'class'               => implode( ' ', array_filter( $classes ) ),
	'data-wp-interactive' => 'matter/gallery',
	'data-gallery-id'     => $gallery_id,
];

$gallery_context = [
	'galleryId' => $gallery_id,
	'lightbox'  => $lightbox,
	'type'      => $type,
];

if ( $is_carousel ) {
	$gallery_context['carouselConfig']              = isset( $block_attributes['carouselConfig'] ) && is_array( $block_attributes['carouselConfig'] )
		? $block_attributes['carouselConfig']
		: [];
	$gallery_context['advancedCarouselConfig']      = isset( $block_attributes['advancedCarouselConfig'] ) && is_array( $block_attributes['advancedCarouselConfig'] )
		? $block_attributes['advancedCarouselConfig']
		: [];
	$gallery_context['advancedCarouselConfigMerge'] = ! empty( $block_attributes['advancedCarouselConfigMerge'] );
	$wrapper_attributes['data-wp-init']             = 'callbacks.loadCarousel';

	$generated_styles = Carousel::generate_styles(
		$gallery_id,
		[
			'emblaConfig' => $block_attributes['carouselConfig'] ?? [],
		]
	);

	if ( ! empty( $generated_styles ) ) {
		wp_enqueue_block_support_styles( $generated_styles, 10 );
	}
}

$visible_limit = ( ! $is_carousel && $image_limit > 0 ) ? $image_limit : 0;
$show_view_all = $lightbox && ! $is_carousel && $visible_limit > 0 && $total > $visible_limit;

ob_start();

if ( $is_carousel ) {
	echo '<div class="embla matter-gallery__carousel">';
	echo '<div class="embla__viewport"><div class="embla__container matter-gallery__slides">';

	foreach ( $inner_blocks as $index => $inner_block ) {
		if ( ! $inner_block instanceof WP_Block || 'core/image' !== $inner_block->name ) {
			continue;
		}

		$slide_html = $inner_block->render();
		$slide_html = Gallery::enhance_image_html( $slide_html, $gallery_id, $index, $lightbox );
		echo '<div class="embla__slide matter-gallery__slide">' . $slide_html . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	echo '</div></div>';

	if ( $include_thumbs && $total > 0 ) {
		echo '<div class="embla__thumbs matter-gallery__thumbs"><div class="embla__thumbs__viewport"><div class="embla__thumbs__container">';
		foreach ( $images as $index => $image ) {
			echo Gallery::render_thumbnail( $image, $thumb_ratio, $index ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		echo '</div></div></div>';
	}

	echo '<button type="button" class="embla__button embla__button--previous matter-gallery__prev" aria-label="' . esc_attr__( 'Previous image', 'matter' ) . '">&#10094;</button>';
	echo '<button type="button" class="embla__button embla__button--next matter-gallery__next" aria-label="' . esc_attr__( 'Next image', 'matter' ) . '">&#10095;</button>';
	echo '</div>';
} else {
	echo '<div class="matter-gallery__grid">';
	$rendered = 0;
	foreach ( $inner_blocks as $index => $inner_block ) {
		if ( ! $inner_block instanceof WP_Block || 'core/image' !== $inner_block->name ) {
			continue;
		}

		if ( $visible_limit > 0 && $rendered >= $visible_limit ) {
			break;
		}

		$image_html = $inner_block->render();
		$image_html = Gallery::enhance_image_html( $image_html, $gallery_id, $index, $lightbox );
		echo $image_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		++$rendered;
	}
	echo '</div>';
}

if ( $show_view_all ) {
	printf(
		'<button type="button" class="matter-gallery__view-all" data-wp-interactive="matter/lightbox" data-wp-on--click="actions.openFromContext" data-wp-context=\'%s\'>%s</button>',
		esc_attr(
			wp_json_encode(
				[
					'galleryId' => $gallery_id,
					'index'     => 0,
				]
			)
		),
		esc_html__( 'View gallery', 'matter' )
	);
}

$inner_content = ob_get_clean();
?>

<figure
	<?php
	echo get_block_wrapper_attributes( $wrapper_attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo ' ' . wp_interactivity_data_wp_context( $gallery_context ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
>
	<?php echo $inner_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</figure>
