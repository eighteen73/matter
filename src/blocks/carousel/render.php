<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73\Matter\Carousel
 */

use Eighteen73\Matter\Blocks\Carousel;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_context    = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];
$carousel_id      = Carousel::resolve_id( $block_attributes, $block_context );

$carousel_classes = implode( ' ', Carousel::generate_carousel_classes( $block_attributes ) );
$carousel_context = Carousel::build_carousel_context( $carousel_id, $block_attributes );
$generated_styles = Carousel::generate_styles( $carousel_id, $block_attributes );

if ( ! empty( $generated_styles ) ) {
	wp_enqueue_block_support_styles( $generated_styles, 10 );
}

wp_interactivity_state(
	'matter/carousel/private',
	[
		'items' => [
			$carousel_id => [
				'instance' => null,
			],
		],
	]
);
?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes(
			[
				'id'                  => $carousel_id,
				'data-wp-interactive' => 'matter/carousel',
				'data-wp-init'        => 'callbacks.loadCarousel',
				'class'               => $carousel_classes,
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
