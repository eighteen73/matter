<?php
/**
 * Gallery block render.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Gallery;
use Eighteen73\Matter\Blocks\Carousel;
use Eighteen73\Matter\Styling\BlockStyles;

defined( 'ABSPATH' ) || exit;

$block_attributes        = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$type                    = isset( $block_attributes['type'] ) && 'carousel' === $block_attributes['type'] ? 'carousel' : 'grid';
$is_carousel             = 'carousel' === $type;
$aspect_ratio            = isset( $block_attributes['aspectRatio'] ) ? (string) $block_attributes['aspectRatio'] : 'auto';
$size_slug               = isset( $block_attributes['sizeSlug'] ) ? (string) $block_attributes['sizeSlug'] : 'large';
$thumbnail_slug          = isset( $block_attributes['thumbnailSizeSlug'] ) ? (string) $block_attributes['thumbnailSizeSlug'] : 'thumbnail';
$lightbox_slug           = isset( $block_attributes['lightboxSizeSlug'] ) ? (string) $block_attributes['lightboxSizeSlug'] : 'large';
$lightbox_thumb_slug     = isset( $block_attributes['lightboxThumbnailSizeSlug'] ) ? (string) $block_attributes['lightboxThumbnailSizeSlug'] : 'thumbnail';
$image_limit             = isset( $block_attributes['imageLimit'] ) ? (int) $block_attributes['imageLimit'] : 0;
$image_crop              = ! isset( $block_attributes['imageCrop'] ) || ! empty( $block_attributes['imageCrop'] );
$include_thumbs          = ! empty( $block_attributes['includeThumbnails'] );
$thumb_ratio             = isset( $block_attributes['thumbnailAspectRatio'] ) ? (string) $block_attributes['thumbnailAspectRatio'] : '1';
$thumbs_visible          = isset( $block_attributes['thumbnailsVisible'] ) ? (int) $block_attributes['thumbnailsVisible'] : 0;
$lightbox_thumbs         = ! isset( $block_attributes['lightboxThumbnails'] ) || ! empty( $block_attributes['lightboxThumbnails'] );
$lightbox_thumb_ratio    = isset( $block_attributes['lightboxThumbnailAspectRatio'] ) ? (string) $block_attributes['lightboxThumbnailAspectRatio'] : '1';
$lightbox_thumbs_visible = isset( $block_attributes['lightboxThumbnailsVisible'] ) ? (int) $block_attributes['lightboxThumbnailsVisible'] : 0;
$lightbox                = ! isset( $block_attributes['lightbox'] ) || ! empty( $block_attributes['lightbox'] ) || ( ! $is_carousel && $image_limit > 0 );

$gallery_id = isset( $block->context['matter/gallery-id'] )
	? (string) $block->context['matter/gallery-id']
	: wp_unique_id( 'matter-gallery-' );

$inner_blocks = [];
if ( isset( $block ) && $block instanceof WP_Block && ! empty( $block->inner_blocks ) ) {
	foreach ( $block->inner_blocks as $inner_block ) {
		$inner_blocks[] = $inner_block;
	}
}

$images = Gallery::build_image_metadata(
	$inner_blocks,
	$size_slug,
	$thumbnail_slug,
	$lightbox_slug,
	$lightbox_thumb_slug
);
$total  = count( $images );

if ( $lightbox && $total > 0 ) {
	wp_enqueue_script_module( 'matter/lightbox-store' );
	Gallery::schedule_lightbox_overlay();

	$lightbox_style_attrs  = [
		'lightboxBackdropColor'   => $block_attributes['lightboxBackdropColor'] ?? '',
		'lightboxBackdropOpacity' => $block_attributes['lightboxBackdropOpacity'] ?? 85,
		'lightboxBackdropBlur'    => $block_attributes['lightboxBackdropBlur'] ?? 0,
		'lightboxThumbnailGap'    => $block_attributes['lightboxThumbnailGap'] ?? '',
	];
	$lightbox_declarations = BlockStyles::get_declarations( 'lightbox', $lightbox_style_attrs );

	wp_interactivity_state(
		'matter/lightbox',
		[
			'galleries' => [
				$gallery_id => [
					'images'                       => $images,
					'lightboxThumbnails'           => $lightbox_thumbs,
					'lightboxThumbnailAspectRatio' => $lightbox_thumb_ratio,
					'lightboxThumbnailsVisible'    => $lightbox_thumbs_visible,
					'thumbnailGap'                 => $lightbox_declarations['--matter-lightbox--thumbnail-gap'] ?? '',
					'backdropColor'                => $lightbox_declarations['--matter-lightbox--backdrop-color'] ?? '',
					'backdropOpacity'              => $block_attributes['lightboxBackdropOpacity'] ?? 85,
					'backdropBlur'                 => $block_attributes['lightboxBackdropBlur'] ?? 0,
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

if ( $lightbox ) {
	$classes[] = 'has-lightbox';
}

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

if ( $aspect_ratio && 'auto' !== $aspect_ratio ) {
	$classes[] = 'has-aspect-ratio';
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
	$carousel_gap   = Gallery::resolve_block_gap_value(
		$block_attributes['style']['spacing']['blockGap'] ?? null
	);
	$carousel_style = $carousel_gap ? 'gap:' . $carousel_gap : '';

	printf(
		'<div class="matter-gallery__carousel"%s>',
		$carousel_style ? ' style="' . esc_attr( $carousel_style ) . '"' : ''
	);
	echo '<div class="matter-gallery__stage">';
	echo '<div class="matter-gallery__viewport"><div class="matter-gallery__track">';

	foreach ( $inner_blocks as $index => $inner_block ) {
		if ( ! $inner_block instanceof WP_Block || 'core/image' !== $inner_block->name ) {
			continue;
		}

		$slide_html = $inner_block->render();
		$slide_html = Gallery::enhance_image_html( $slide_html, $gallery_id, $index, $lightbox );
		echo '<div class="matter-gallery__slide">' . $slide_html . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	echo '</div></div>';

	echo '<div class="matter-gallery__controls">';
	printf(
		'<button type="button" class="matter-gallery__nav matter-gallery__nav--prev" aria-label="%1$s"><span class="matter-gallery__icon" aria-hidden="true"></span></button>',
		esc_attr__( 'Previous image', 'matter' )
	);
	printf(
		'<button type="button" class="matter-gallery__nav matter-gallery__nav--next" aria-label="%1$s"><span class="matter-gallery__icon" aria-hidden="true"></span></button>',
		esc_attr__( 'Next image', 'matter' )
	);
	echo '</div>';
	echo '</div>';

	if ( $include_thumbs && $total > 0 ) {
		$thumbs_classes = 'matter-gallery__thumbs';
		$thumbs_styles  = BlockStyles::get_styles(
			'gallery',
			[
				'thumbnailGap' => $block_attributes['thumbnailGap'] ?? '',
			]
		);
		if ( $thumbs_visible > 0 ) {
			$thumbs_classes .= ' has-visible-count';
			$thumbs_styles  .= ( $thumbs_styles ? ' ' : '' ) . '--matter-gallery--thumbs-visible:' . $thumbs_visible . ';';
		}

		printf(
			'<div class="%1$s"%2$s><div class="matter-gallery__thumbs-viewport"><div class="matter-gallery__thumbs-track">',
			esc_attr( $thumbs_classes ),
			$thumbs_styles ? ' style="' . esc_attr( $thumbs_styles ) . '"' : ''
		);
		foreach ( $images as $index => $image ) {
			echo Gallery::render_thumbnail( $image, $thumb_ratio, $index ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		echo '</div></div></div>';
	}

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
