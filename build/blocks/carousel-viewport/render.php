<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73\Matter\CarouselViewport
 */

?>

<div
	<?php echo wp_kses_data( get_block_wrapper_attributes( [ 'class' => 'embla__viewport' ] ) ); ?>
>
	<div class="embla__container">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</div>
</div>
