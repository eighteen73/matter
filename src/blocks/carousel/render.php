<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\Carousel
 */

$embla_config = isset( $attributes['emblaConfig'] ) && is_array( $attributes['emblaConfig'] )
	? $attributes['emblaConfig']
	: [];

$advanced_embla_config = isset( $attributes['advancedEmblaConfig'] ) && is_array( $attributes['advancedEmblaConfig'] )
	? $attributes['advancedEmblaConfig']
	: [];

$advanced_embla_config_merge = isset( $attributes['advancedEmblaConfigMerge'] )
	? (bool) $attributes['advancedEmblaConfigMerge']
	: false;

$carousel_context = [
	'emblaConfig'              => $embla_config,
	'advancedEmblaConfig'      => $advanced_embla_config,
	'advancedEmblaConfigMerge' => $advanced_embla_config_merge,
];
?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes(
			[
				'data-wp-interactive' => 'eighteen73-blocks/carousel',
				'data-wp-init'        => 'callbacks.loadEmblaCarousel',
			]
		)
		. ' '
		. wp_interactivity_data_wp_context( $carousel_context )
	);
	?>
>
	<div
		class="embla"
	>
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</div>
</div>
