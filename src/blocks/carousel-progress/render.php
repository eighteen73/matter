<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\CarouselProgress
 */

use Eighteen73\Blocks\BlockColour;

$indicate_current_position = isset( $attributes['indicateCurrentPosition'] ) && $attributes['indicateCurrentPosition'] ? 'true' : 'false';

$bar_style = BlockColour::build_custom_color_style_string(
	$attributes,
	BlockColour::get_progress_bar_color_definitions()
);

$wrapper_attributes = [
	'class'                          => 'embla__progress',
	'data-indicate-current-position' => $indicate_current_position,
];

if ( $bar_style ) {
	$wrapper_attributes['style'] = $bar_style;
}

?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<div class="embla__progress__bar"></div>
</div>
