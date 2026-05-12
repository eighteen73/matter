<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\CarouselProgress
 */

$indicate_current_position = isset( $attributes['indicateCurrentPosition'] ) && $attributes['indicateCurrentPosition'] ? 'true' : 'false';
?>

<div
<?php
echo wp_kses_data(
	get_block_wrapper_attributes(
		[
			'class'                          => 'embla__progress',
			'data-indicate-current-position' => $indicate_current_position,
		]
	)
);
?>
>
	<div class="embla__progress__bar"></div>
</div>
