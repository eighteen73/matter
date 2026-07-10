<?php
/**
 * Gallery block helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Gallery block.
 */
class Gallery {

	use Singleton;

	/**
	 * Whether the lightbox overlay has been scheduled for the footer.
	 *
	 * @var bool
	 */
	private static $overlay_scheduled = false;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_context', [ $this, 'provide_context' ], 10, 2 );
	}

	/**
	 * Provide a unique gallery ID in block context.
	 *
	 * @param array $context       Block context.
	 * @param array $parsed_block  Parsed block.
	 * @return array
	 */
	public function provide_context( array $context, array $parsed_block ): array {
		if ( ( $parsed_block['blockName'] ?? '' ) !== 'matter/gallery' ) {
			return $context;
		}

		$context['matter/gallery-id'] = wp_unique_id( 'matter-gallery-' );

		return $context;
	}

	/**
	 * Schedule the shared lightbox overlay once per request.
	 *
	 * @return void
	 */
	public static function schedule_lightbox_overlay(): void {
		if ( self::$overlay_scheduled ) {
			return;
		}

		self::$overlay_scheduled = true;
		add_action( 'wp_footer', [ self::class, 'print_lightbox_overlay' ], 20 );
	}

	/**
	 * Print the shared lightbox overlay markup.
	 *
	 * @return void
	 */
	public static function print_lightbox_overlay(): void {
		?>
		<dialog
			class="matter-lightbox"
			data-wp-interactive="matter/lightbox"
			data-wp-watch="callbacks.syncDialog"
			data-wp-on--close="actions.onNativeClose"
			data-wp-on--cancel="actions.onCancel"
			data-wp-on--click="actions.onBackdropClick"
			data-wp-on--keydown="actions.handleKeydown"
			data-wp-bind--style="state.backdropStyle"
			aria-label="<?php esc_attr_e( 'Image lightbox', 'matter' ); ?>"
		>
			<div class="matter-lightbox__content">
				<button
					type="button"
					class="matter-lightbox__close"
					data-wp-on--click="actions.close"
					aria-label="<?php esc_attr_e( 'Close lightbox', 'matter' ); ?>"
				>
					<span class="matter-lightbox__icon" aria-hidden="true"></span>
				</button>
				<figure class="matter-lightbox__figure">
					<img
						class="matter-lightbox__image"
						data-wp-bind--src="state.currentSrc"
						data-wp-bind--srcset="state.currentSrcset"
						data-wp-bind--sizes="state.currentSizes"
						data-wp-bind--alt="state.currentAlt"
					/>
					<figcaption
						class="matter-lightbox__caption"
						data-wp-bind--hidden="!state.currentCaption"
						data-wp-text="state.currentCaption"
					></figcaption>
				</figure>
				<div
					class="matter-lightbox__controls"
					data-wp-bind--hidden="!state.hasNavigation"
				>
					<button
						type="button"
						class="matter-lightbox__nav matter-lightbox__nav--prev"
						data-wp-on--click="actions.showPrevious"
						aria-label="<?php esc_attr_e( 'Previous image', 'matter' ); ?>"
					>
						<span class="matter-lightbox__icon" aria-hidden="true"></span>
					</button>
					<button
						type="button"
						class="matter-lightbox__nav matter-lightbox__nav--next"
						data-wp-on--click="actions.showNext"
						aria-label="<?php esc_attr_e( 'Next image', 'matter' ); ?>"
					>
						<span class="matter-lightbox__icon" aria-hidden="true"></span>
					</button>
				</div>
				<div
					data-wp-bind--class="state.thumbsClassName"
					data-wp-bind--style="state.thumbsStyle"
					data-wp-bind--hidden="!state.showThumbnails"
				>
					<template data-wp-each="state.currentThumbs">
						<button
							type="button"
							class="matter-lightbox__thumb"
							data-wp-on--click="actions.selectThumb"
							data-wp-class--is-active="context.item.isActive"
							data-wp-bind--aria-current="context.item.isActive"
						>
							<img
								data-wp-bind--src="context.item.src"
								data-wp-bind--alt="context.item.alt"
								data-wp-bind--style="state.currentThumbImageStyle"
							/>
						</button>
					</template>
				</div>
			</div>
		</dialog>
		<?php
	}

	/**
	 * Build image metadata for the lightbox store and carousel thumbs.
	 *
	 * @param array  $inner_blocks Inner blocks.
	 * @param string $size_slug Visible size slug.
	 * @param string $thumbnail_size_slug Carousel thumbnail size slug.
	 * @param string $lightbox_size_slug Lightbox size slug.
	 * @param string $lightbox_thumbnail_size_slug Lightbox thumbnail size slug.
	 * @return array
	 */
	public static function build_image_metadata(
		array $inner_blocks,
		string $size_slug,
		string $thumbnail_size_slug,
		string $lightbox_size_slug,
		string $lightbox_thumbnail_size_slug = ''
	): array {
		$images              = [];
		$order               = 0;
		$lightbox_thumb_slug = $lightbox_thumbnail_size_slug
			? $lightbox_thumbnail_size_slug
			: $thumbnail_size_slug;

		foreach ( $inner_blocks as $inner_block ) {
			if ( ! $inner_block instanceof \WP_Block ) {
				continue;
			}

			if ( ( $inner_block->name ?? '' ) !== 'core/image' ) {
				continue;
			}

			$attrs = is_array( $inner_block->attributes ) ? $inner_block->attributes : [];
			$id    = isset( $attrs['id'] ) ? (int) $attrs['id'] : 0;

			$visible        = self::get_attachment_image_data( $id, $size_slug, $attrs );
			$thumb          = self::get_attachment_image_data( $id, $thumbnail_size_slug, $attrs );
			$lightbox       = self::get_attachment_image_data( $id, $lightbox_size_slug, $attrs );
			$lightbox_thumb = self::get_attachment_image_data( $id, $lightbox_thumb_slug, $attrs );

			$images[] = [
				'id'               => $id,
				'order'            => $order,
				'alt'              => $visible['alt'],
				'caption'          => isset( $attrs['caption'] ) ? (string) $attrs['caption'] : '',
				'src'              => $visible['src'],
				'srcset'           => $visible['srcset'],
				'sizes'            => $visible['sizes'],
				'thumbSrc'         => $thumb['src'],
				'thumbSrcset'      => $thumb['srcset'],
				'lightboxThumbSrc' => $lightbox_thumb['src'],
				'lightboxSrc'      => $lightbox['src'],
				'lightboxSrcset'   => $lightbox['srcset'],
				'lightboxSizes'    => $lightbox['sizes'],
			];

			++$order;
		}

		return $images;
	}

	/**
	 * Resolve attachment image data for a size slug.
	 *
	 * @param int    $attachment_id Attachment ID.
	 * @param string $size_slug Size slug.
	 * @param array  $attrs Block attributes fallback.
	 * @return array
	 */
	public static function get_attachment_image_data( int $attachment_id, string $size_slug, array $attrs = [] ): array {
		$fallback_src = isset( $attrs['url'] ) ? (string) $attrs['url'] : '';
		$fallback_alt = isset( $attrs['alt'] ) ? (string) $attrs['alt'] : '';

		if ( $attachment_id <= 0 ) {
			return [
				'src'    => $fallback_src,
				'srcset' => '',
				'sizes'  => '',
				'alt'    => $fallback_alt,
			];
		}

		$src = wp_get_attachment_image_url( $attachment_id, $size_slug );
		if ( ! $src ) {
			$src = $fallback_src ?: (string) wp_get_attachment_url( $attachment_id );
		}

		$alt = get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );
		if ( ! is_string( $alt ) || '' === $alt ) {
			$alt = $fallback_alt;
		}

		return [
			'src'    => $src ? (string) $src : '',
			'srcset' => (string) ( wp_get_attachment_image_srcset( $attachment_id, $size_slug ) ?: '' ),
			'sizes'  => (string) ( wp_get_attachment_image_sizes( $attachment_id, $size_slug ) ?: '' ),
			'alt'    => $alt,
		];
	}

	/**
	 * Enhance a rendered core/image with lightbox open directives.
	 *
	 * @param string $html       Image HTML.
	 * @param string $gallery_id Gallery ID.
	 * @param int    $index      Image index.
	 * @param bool   $lightbox   Whether lightbox is enabled.
	 * @return string
	 */
	public static function enhance_image_html( string $html, string $gallery_id, int $index, bool $lightbox ): string {
		if ( ! $lightbox || '' === $html ) {
			return $html;
		}

		$context = wp_json_encode(
			[
				'galleryId' => $gallery_id,
				'index'     => $index,
			]
		);

		if ( preg_match( '/<figure\b([^>]*)>/', $html, $matches ) ) {
			$existing = $matches[1];

			if ( false !== strpos( $existing, 'class="' ) ) {
				$existing = preg_replace(
					'/class="([^"]*)"/',
					'class="$1 matter-gallery__item"',
					$existing,
					1
				);
			} elseif ( false !== strpos( $existing, "class='" ) ) {
				$existing = preg_replace(
					"/class='([^']*)'/",
					"class='$1 matter-gallery__item'",
					$existing,
					1
				);
			} else {
				$existing .= ' class="matter-gallery__item"';
			}

			$replacement = sprintf(
				'<figure%s data-wp-interactive="matter/lightbox" data-wp-on--click="actions.openFromContext" data-wp-context="%s">',
				$existing,
				esc_attr( $context )
			);

			return preg_replace( '/<figure\b[^>]*>/', $replacement, $html, 1 );
		}

		return sprintf(
			'<div class="matter-gallery__item" data-wp-interactive="matter/lightbox" data-wp-on--click="actions.openFromContext" data-wp-context="%1$s">%2$s</div>',
			esc_attr( $context ),
			$html
		);
	}

	/**
	 * Resolve a blockGap style value to a CSS length/var.
	 *
	 * @param mixed $gap_value Block gap from style.spacing.blockGap.
	 * @return string Empty when unset.
	 */
	public static function resolve_block_gap_value( $gap_value ): string {
		if ( is_array( $gap_value ) ) {
			$gap_value = $gap_value['top'] ?? $gap_value['left'] ?? null;
		}

		if ( ! is_string( $gap_value ) || '' === $gap_value ) {
			return '';
		}

		if ( preg_match( '%[\\\(&=}]|/\*%', $gap_value ) ) {
			return '';
		}

		if ( str_contains( $gap_value, 'var:preset|spacing|' ) ) {
			$index_to_splice = strrpos( $gap_value, '|' ) + 1;
			$slug            = _wp_to_kebab_case( substr( $gap_value, $index_to_splice ) );
			return "var(--wp--preset--spacing--$slug)";
		}

		return $gap_value;
	}

	/**
	 * Render a thumbnail button for carousel mode.
	 *
	 * @param array  $image Image metadata.
	 * @param string $aspect_ratio Thumbnail aspect ratio.
	 * @param int    $index Image index.
	 * @return string
	 */
	public static function render_thumbnail( array $image, string $aspect_ratio, int $index ): string {
		$style = '';
		if ( $aspect_ratio && 'auto' !== $aspect_ratio ) {
			$style = sprintf( ' style="%s"', esc_attr( 'aspect-ratio:' . $aspect_ratio . ';object-fit:cover;' ) );
		}

		return sprintf(
			'<button type="button" class="matter-gallery__thumb" data-index="%1$d" aria-label="%2$s"><img src="%3$s" alt="%4$s"%5$s loading="lazy" /></button>',
			(int) $index,
			esc_attr(
				sprintf(
					/* translators: %d: image number */
					__( 'Go to image %d', 'matter' ),
					$index + 1
				)
			),
			esc_url( $image['thumbSrc'] ?: $image['src'] ),
			esc_attr( $image['alt'] ),
			$style // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
		);
	}
}
