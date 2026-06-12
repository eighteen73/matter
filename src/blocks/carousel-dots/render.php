<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\CarouselDots
 */

use Eighteen73\Blocks\Color\Styles;
use Eighteen73\Blocks\Config;

defined( 'ABSPATH' ) || exit;

$wrapper_attributes = [
	'class' => 'embla__dots',
	'style' => Styles::get_styles( $attributes, Config::get( 'colors', 'carousel' ) ),
];
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>></div>
