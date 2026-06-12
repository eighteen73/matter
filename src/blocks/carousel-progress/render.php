<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\CarouselProgress
 */

use Eighteen73\Blocks\Color\Styles;
use Eighteen73\Blocks\Config;

defined( 'ABSPATH' ) || exit;

$indicate_current_position = isset( $attributes['indicateCurrentPosition'] ) && $attributes['indicateCurrentPosition'] ? 'true' : 'false';

$wrapper_attributes = [
	'class'                          => 'embla__progress',
	'data-indicate-current-position' => $indicate_current_position,
	'style'                          => Styles::get_styles( $attributes, Config::get( 'colors', 'carousel' ) ),
];

?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<div class="embla__progress__bar"></div>
</div>
