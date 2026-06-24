<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73\Matter\CarouselPreviousButton
 */

defined( 'ABSPATH' ) || exit;

use Eighteen73\Matter\Styling\BlockStyles;

$wrapper_attributes = [
	'class' => 'embla__button embla__button--previous',
	'style' => BlockStyles::get_styles( 'carousel', $attributes ),
];
?>

<button <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<span class="embla__button-label">
		<?php esc_html_e( 'Previous slide', 'matter' ); ?>
	</span>
</button>
