<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\CarouselNextButton
 */

?>

<div
	<?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>
>
	<button class="embla__button embla__button--next">
		<span class="embla__button-label">
			<?php esc_html_e( 'Next slide', 'eighteen73-blocks' ); ?>
		</span>
	</button>
</div>
