<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\CarouselDots
 */

use Eighteen73\Blocks\BlockColour;

$dot_style = BlockColour::build_custom_color_style_string(
	$attributes,
	BlockColour::get_dot_color_definitions()
);

$wrapper_attributes = array(
	'class' => 'embla__dots',
);

if ( $dot_style ) {
	$wrapper_attributes['style'] = $dot_style;
}

?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>></div>
