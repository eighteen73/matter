<?php
/**
 * Carousel markup, shared by the carousel and gallery blocks.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Carousel markup.
 */
class Carousel {

	/**
	 * Control parts a theme can place, and where groups can go: `before` and
	 * `after` the slides, or over them on the `stage`.
	 */
	public const PARTS     = [ 'prev', 'next', 'dots', 'progress', 'timer', 'counter', 'play', 'thumbnails', 'expand' ];
	public const POSITIONS = [ 'before', 'stage', 'after' ];

	/**
	 * Render carousel markup around slides.
	 *
	 * Controls come from the variant's `controls` option: groups of parts by
	 * position, e.g. `[ 'stage' => [ 'prev', 'next' ], 'after' => [ 'dots' ] ]`.
	 * Each group is a `.wp-block-matter-carousel__controls.is-{position}`; the
	 * theme's CSS places the group and its parts.
	 *
	 * @param string $slides             Slide HTML (each top-level element is a slide).
	 * @param array  $options            Variant options (loop, align, slidesToScroll, autoplay, autoScroll, controls, thumbnailSize).
	 * @param string $wrapper_attributes Attribute string for the root element (e.g. from get_block_wrapper_attributes()).
	 * @param string $label              Accessible name.
	 * @param array  $args               `thumbnails`: attachment IDs, one per slide (for the thumbnails part); `expand`: offer the gallery's "expand" part.
	 * @return string
	 */
	public static function render( string $slides, array $options, string $wrapper_attributes, string $label = '', array $args = [] ): string {
		$autoplay    = max( 0, (float) ( $options['autoplay'] ?? 0 ) );
		$auto_scroll = max( 0, (float) ( $options['autoScroll'] ?? 0 ) );
		$align       = (string) ( $options['align'] ?? 'start' );
		$scroll      = $options['slidesToScroll'] ?? 1;
		$moves       = $autoplay > 0 || $auto_scroll > 0;

		$context = [
			'options'      => [
				'loop'           => ! empty( $options['loop'] ),
				'align'          => in_array( $align, [ 'start', 'center', 'end' ], true ) ? $align : 'start',
				'slidesToScroll' => 'auto' === $scroll ? 'auto' : max( 1, (int) $scroll ),
			],
			'autoplay'     => $autoplay * 1000,
			'autoScroll'   => $auto_scroll,
			'isPlaying'    => $moves,
			'canPrev'      => false,
			'canNext'      => true,
			'isScrollable' => true,
			'labels'       => [
				/* translators: 1: slide number, 2: number of slides */
				'slide' => __( '%1$d of %2$d', 'matter' ),
				/* translators: %d: slide number */
				'goTo'  => __( 'Go to slide %d', 'matter' ),
			],
		];

		$groups = self::controls( $options, ! empty( $args['thumbnails'] ), ! empty( $args['expand'] ) );
		$html   = array_fill_keys( self::POSITIONS, '' );

		foreach ( $groups as $position => $parts ) {
			$html[ $position ] = sprintf(
				'<div class="wp-block-matter-carousel__controls is-%1$s">%2$s</div>',
				esc_attr( $position ),
				implode( '', array_map( fn( $part ) => self::part( $part, $args, $options ), $parts ) )
			);
		}

		return sprintf(
			'<div %1$s role="region" aria-roledescription="%2$s"%3$s data-wp-interactive="matter/carousel" %4$s data-wp-init="callbacks.init">%5$s<div class="wp-block-matter-carousel__stage"><div class="wp-block-matter-carousel__viewport"><div class="wp-block-matter-carousel__track">%6$s</div></div>%7$s</div>%8$s</div>',
			$wrapper_attributes,
			esc_attr__( 'carousel', 'matter' ),
			'' !== $label ? ' aria-label="' . esc_attr( $label ) . '"' : '',
			wp_interactivity_data_wp_context( $context ),
			$html['before'],
			$slides,
			$html['stage'],
			$html['after']
		);
	}

	/**
	 * The variant's control groups, cleaned: known positions and parts only.
	 * Moving carousels (autoplay, autoScroll) always get a play/pause button
	 * (WCAG 2.2.2), added after the other controls if the theme didn't place it.
	 *
	 * @param array $options        Variant options.
	 * @param bool  $has_thumbnails Thumbnails are available.
	 * @param bool  $can_expand     The expand part is available (gallery lightbox).
	 * @return array<string, string[]> Parts by position.
	 */
	public static function controls( array $options, bool $has_thumbnails = false, bool $can_expand = false ): array {
		$groups = [];

		foreach ( (array) ( $options['controls'] ?? [] ) as $position => $parts ) {
			if ( ! in_array( $position, self::POSITIONS, true ) ) {
				continue;
			}

			$parts = array_values(
				array_filter(
					array_unique( (array) $parts ),
					fn( $part ) => in_array( $part, self::PARTS, true )
						&& ( 'thumbnails' !== $part || $has_thumbnails )
						&& ( 'expand' !== $part || $can_expand )
				)
			);

			if ( $parts ) {
				$groups[ $position ] = $parts;
			}
		}

		$moves = (float) ( $options['autoplay'] ?? 0 ) > 0 || (float) ( $options['autoScroll'] ?? 0 ) > 0;

		if ( $moves && ! in_array( 'play', array_merge( [], ...array_values( $groups ) ), true ) ) {
			$groups['after']   = $groups['after'] ?? [];
			$groups['after'][] = 'play';
		}

		// Keep positions in document order.
		return array_intersect_key( array_replace( array_fill_keys( self::POSITIONS, null ), $groups ), $groups );
	}

	/**
	 * One control part's markup.
	 *
	 * @param string $part    Part name.
	 * @param array  $args    Render args (thumbnails).
	 * @param array  $options Variant options (thumbnailSize).
	 * @return string
	 */
	private static function part( string $part, array $args, array $options ): string {
		switch ( $part ) {
			case 'prev':
				return self::button( 'prev', __( 'Previous slide', 'matter' ), 'actions.prev', 'data-wp-bind--disabled="!context.canPrev"' );

			case 'next':
				return self::button( 'next', __( 'Next slide', 'matter' ), 'actions.next', 'data-wp-bind--disabled="!context.canNext"' );

			case 'play':
				return self::button( 'play', __( 'Pause slideshow', 'matter' ), 'actions.togglePlay', 'data-wp-bind--aria-pressed="!context.isPlaying"' );

			case 'dots':
				// Built by view.js: one per scroll position, which depends on layout.
				return '<div class="wp-block-matter-carousel__dots"></div>';

			case 'progress':
			case 'timer':
				return sprintf( '<div class="wp-block-matter-carousel__%1$s" aria-hidden="true"><span class="wp-block-matter-carousel__%1$s-bar"></span></div>', $part );

			case 'counter':
				return '<div class="wp-block-matter-carousel__counter" aria-hidden="true"><span class="wp-block-matter-carousel__counter-current">1</span><span class="wp-block-matter-carousel__counter-separator"> / </span><span class="wp-block-matter-carousel__counter-total"></span></div>';

			case 'expand':
				return sprintf(
					'<button type="button" class="wp-block-matter-carousel__expand" data-wp-on--click="matter/gallery::actions.openCurrent"><span class="screen-reader-text">%s</span></button>',
					esc_html__( 'View larger', 'matter' )
				);

			case 'thumbnails':
				$size    = (string) ( $options['thumbnailSize'] ?? 'thumbnail' );
				$buttons = '';

				foreach ( array_values( (array) $args['thumbnails'] ) as $index => $attachment ) {
					$buttons .= sprintf(
						'<button type="button" class="wp-block-matter-carousel__thumbnail" data-index="%1$d" aria-label="%2$s">%3$s</button>',
						$index,
						/* translators: %d: slide number */
						esc_attr( sprintf( __( 'Go to slide %d', 'matter' ), $index + 1 ) ),
						$attachment ? wp_get_attachment_image(
							(int) $attachment,
							$size,
							false,
							[
								'alt'     => '',
								'loading' => 'lazy',
							]
						) : ''
					);
				}

				return '<div class="wp-block-matter-carousel__thumbnails">' . $buttons . '</div>';
		}

		return '';
	}

	/**
	 * A carousel control button.
	 *
	 * @param string $name       Element suffix (prev, next, play).
	 * @param string $label      Visually hidden label.
	 * @param string $action     Click action.
	 * @param string $directives Extra directives.
	 * @return string
	 */
	private static function button( string $name, string $label, string $action, string $directives ): string {
		return sprintf(
			'<button type="button" class="wp-block-matter-carousel__%1$s" data-wp-on--click="%2$s" %3$s><span class="screen-reader-text">%4$s</span></button>',
			esc_attr( $name ),
			esc_attr( $action ),
			$directives,
			esc_html( $label )
		);
	}

	/**
	 * Slide types offered when a carousel is added, beyond the built-in
	 * images, posts and products. Each may set the variant (block style) the
	 * carousel starts with; built-in types can be given one too.
	 *
	 *     add_filter( 'matter_carousel_slides', fn() => [
	 *         'pulsar/card' => [ 'label' => 'Cards', 'variant' => 'cards' ],
	 *         'core/image'  => [ 'variant' => 'slides' ],
	 *     ] );
	 *
	 * @return array<string, array{label: string, variant: string}> Keyed by block name.
	 */
	public static function slide_types(): array {
		/**
		 * Filters the carousel's slide types.
		 *
		 * @param array $types Block name => label, or [ 'label' => …, 'variant' => … ].
		 */
		$types = (array) apply_filters( 'matter_carousel_slides', [] );
		$clean = [];

		foreach ( $types as $name => $type ) {
			$type           = is_array( $type ) ? $type : [ 'label' => $type ];
			$clean[ $name ] = [
				'label'   => (string) ( $type['label'] ?? '' ),
				'variant' => (string) ( $type['variant'] ?? '' ),
			];
		}

		return $clean;
	}
}
