<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\CarouselPreviousButton
 */

?>

<div
	<?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>
>
	<?php esc_html_e( 'Hello from Carousel Previous Button', 'eighteen73-blocks' ); ?>
</div>
