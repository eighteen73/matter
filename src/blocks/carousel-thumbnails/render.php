<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73\Matter\CarouselThumbs
 */

use Eighteen73\Matter\Blocks\CarouselThumbnails;

defined( 'ABSPATH' ) || exit;

$wrapper_attributes = [
	'class' => 'embla__thumbs',
];

$thumb_content = CarouselThumbnails::render_inner_blocks( $block, $content );
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<div class="embla__thumbs__viewport">
		<div class="embla__thumbs__container">
			<?php echo $thumb_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
	</div>
</div>
