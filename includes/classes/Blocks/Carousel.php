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
	 * Render carousel markup around slides.
	 *
	 * @param string $slides             Slide HTML (each top-level element is a slide).
	 * @param array  $options            Variant options (loop, align, slidesToScroll, autoplay, arrows, dots).
	 * @param string $wrapper_attributes Attribute string for the root element (e.g. from get_block_wrapper_attributes()).
	 * @param string $label              Accessible name.
	 * @return string
	 */
	public static function render( string $slides, array $options, string $wrapper_attributes, string $label = '' ): string {
		$autoplay = max( 0, (float) ( $options['autoplay'] ?? 0 ) );
		$align    = (string) ( $options['align'] ?? 'start' );
		$scroll   = $options['slidesToScroll'] ?? 1;

		$context = [
			'options'   => [
				'loop'           => ! empty( $options['loop'] ),
				'align'          => in_array( $align, [ 'start', 'center', 'end' ], true ) ? $align : 'start',
				'slidesToScroll' => 'auto' === $scroll ? 'auto' : max( 1, (int) $scroll ),
			],
			'autoplay'  => $autoplay * 1000,
			'isPlaying' => $autoplay > 0,
			'canPrev'   => false,
			'canNext'   => true,
			'labels'    => [
				/* translators: 1: slide number, 2: number of slides */
				'slide' => __( '%1$d of %2$d', 'matter' ),
				/* translators: %d: slide number */
				'goTo'  => __( 'Go to slide %d', 'matter' ),
			],
		];

		$arrows   = ! empty( $options['arrows'] );
		$controls = '';

		if ( $arrows || ! empty( $options['dots'] ) || $autoplay > 0 ) {
			$controls = sprintf(
				'<div class="wp-block-matter-carousel__controls">%1$s%2$s%3$s%4$s</div>',
				$autoplay > 0 ? self::button( 'play', __( 'Pause slideshow', 'matter' ), 'actions.togglePlay', 'data-wp-bind--aria-pressed="!context.isPlaying"' ) : '',
				$arrows ? self::button( 'prev', __( 'Previous slide', 'matter' ), 'actions.prev', 'data-wp-bind--disabled="!context.canPrev"' ) : '',
				! empty( $options['dots'] ) ? '<div class="wp-block-matter-carousel__dots"></div>' : '',
				$arrows ? self::button( 'next', __( 'Next slide', 'matter' ), 'actions.next', 'data-wp-bind--disabled="!context.canNext"' ) : ''
			);
		}

		return sprintf(
			'<div %1$s role="region" aria-roledescription="%2$s"%3$s data-wp-interactive="matter/carousel" %4$s data-wp-init="callbacks.init"><div class="wp-block-matter-carousel__viewport"><div class="wp-block-matter-carousel__track">%5$s</div></div>%6$s</div>',
			$wrapper_attributes,
			esc_attr__( 'carousel', 'matter' ),
			'' !== $label ? ' aria-label="' . esc_attr( $label ) . '"' : '',
			wp_interactivity_data_wp_context( $context ),
			$slides,
			$controls
		);
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
