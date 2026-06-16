<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73\Matter\CarouselThumbs
 */

use Eighteen73\Matter\Styling\Spacing;
use Eighteen73\Matter\Config;

defined( 'ABSPATH' ) || exit;

$thumb_gap = isset( $attributes['thumbGap'] ) ? $attributes['thumbGap'] : '';

$wrapper_attributes = [
	'class'                          => 'embla__thumbs',
	'style'                          => Spacing::get_responsive_css_vars( '--matter-carousel--thumb--gap', $thumb_gap, [], [], 'thumbGap' ),
];
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<div class="embla__thumbs__viewport">
		<div class="embla__thumbs__container">
			<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
	</div>
</div>
