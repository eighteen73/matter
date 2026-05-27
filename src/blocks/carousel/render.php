<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\Carousel
 */

use Eighteen73\Blocks\Config;
use Eighteen73\Blocks\Spacing\Styles as SpacingStyles;

$embla_config = isset( $attributes['emblaConfig'] ) && is_array( $attributes['emblaConfig'] )
	? $attributes['emblaConfig']
	: [];

$advanced_embla_config = isset( $attributes['advancedEmblaConfig'] ) && is_array( $attributes['advancedEmblaConfig'] )
	? $attributes['advancedEmblaConfig']
	: [];

$advanced_embla_config_merge = isset( $attributes['advancedEmblaConfigMerge'] )
	? (bool) $attributes['advancedEmblaConfigMerge']
	: false;

$carousel_id = wp_unique_id( 'eighteen73-blocks-carousel-' );

$carousel_context = [
	'emblaConfig'              => $embla_config,
	'advancedEmblaConfig'      => $advanced_embla_config,
	'advancedEmblaConfigMerge' => $advanced_embla_config_merge,
	'carouselId'               => $carousel_id,
];

$breakpoint_tokens = array_keys( Config::file( 'breakpoints' ) );
$breakpoint_layers = isset( $embla_config['breakpointLayers'] ) && is_array( $embla_config['breakpointLayers'] )
	? $embla_config['breakpointLayers']
	: [];
$base_options      = isset( $embla_config['options'] ) && is_array( $embla_config['options'] )
	? $embla_config['options']
	: [];
$content           = isset( $content ) && is_string( $content ) ? $content : '';

// Generate CSS variables for slidesToShow
$slides_to_show = [
	'base' => $base_options['slidesToShow'] ?? 1,
];
foreach ( $breakpoint_tokens as $breakpoint ) {
	$slides_to_show[ $breakpoint ] = $breakpoint_layers[ $breakpoint ]['options']['slidesToShow'] ?? $slides_to_show['base'];
}

$slides_to_show_css_variables = [];
foreach ( $slides_to_show as $breakpoint => $value ) {
	$slides_to_show_css_variables[] = "--wp--custom--eighteen73-carousel--slides-to-show-{$breakpoint}: {$value}";
}

$slide_gap_css_variables = SpacingStyles::get_responsive_css_vars(
	'--wp--custom--eighteen73-carousel--slide--gap',
	isset( $base_options['slideGap'] ) && is_string( $base_options['slideGap'] ) ? $base_options['slideGap'] : '',
	$breakpoint_layers,
	$breakpoint_tokens
);

$styles = implode( '; ', $slides_to_show_css_variables );
if ( '' !== $slide_gap_css_variables ) {
	$styles .= '; ' . $slide_gap_css_variables;
}
?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes(
			[
				'id'                  => $carousel_id,
				'data-wp-interactive' => 'eighteen73-blocks/carousel',
				'data-wp-init'        => 'callbacks.loadEmblaCarousel',
				'style'               => $styles,
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
