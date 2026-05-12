<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\Carousel
 */

$defaults = [
	'loop'           => false,
	'axis'           => 'x',
	'slidesToScroll' => 1,
];

$raw_options = isset( $attributes['options'] ) && is_array( $attributes['options'] ) ? $attributes['options'] : [];

$axis = isset( $raw_options['axis'] ) && in_array( $raw_options['axis'], [ 'x', 'y' ], true )
	? $raw_options['axis']
	: $defaults['axis'];

$slides_to_scroll = isset( $raw_options['slidesToScroll'] ) ? (int) $raw_options['slidesToScroll'] : $defaults['slidesToScroll'];
if ( $slides_to_scroll < 1 ) {
	$slides_to_scroll = $defaults['slidesToScroll'];
}

$options = [
	'loop'           => isset( $raw_options['loop'] ) ? (bool) $raw_options['loop'] : $defaults['loop'],
	'axis'           => $axis,
	'slidesToScroll' => $slides_to_scroll,
];

$autoplay = isset( $attributes['autoplay'] ) ? $attributes['autoplay'] : false;

$advanced_carousel_config = isset( $attributes['advancedCarouselConfig'] ) && is_array( $attributes['advancedCarouselConfig'] )
	? $attributes['advancedCarouselConfig']
	: [];

$advanced_carousel_config_merge = isset( $attributes['advancedCarouselConfigMerge'] )
	? (bool) $attributes['advancedCarouselConfigMerge']
	: false;

$carousel_context = [
	'options'                     => $options,
	'autoplay'                    => $autoplay,
	'advancedCarouselConfig'      => $advanced_carousel_config,
	'advancedCarouselConfigMerge' => $advanced_carousel_config_merge,
];
?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes(
			[
				'data-wp-interactive' => 'eighteen73-blocks/carousel',
				'data-wp-init'        => 'callbacks.loadEmblaCarousel',
			]
		)
		. ' '
		. wp_interactivity_data_wp_context( $carousel_context )
	);
	?>
>
	<div
		class="embla"
	>
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</div>
</div>
