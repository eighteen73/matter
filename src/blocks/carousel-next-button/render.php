<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\CarouselNextButton
 */

use Eighteen73\Blocks\BlockColour;

$icon_style = BlockColour::build_custom_color_style_string(
	$attributes,
	BlockColour::get_button_icon_color_definitions()
);

$wrapper_attributes = [];

if ( $icon_style ) {
	$wrapper_attributes['style'] = $icon_style;
}

?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<button class="embla__button embla__button--next">
		<span class="embla__button-label">
			<?php esc_html_e( 'Next slide', 'eighteen73-blocks' ); ?>
		</span>
	</button>
</div>
