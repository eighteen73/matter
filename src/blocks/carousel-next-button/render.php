<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73\Matter\CarouselNextButton
 */

defined( 'ABSPATH' ) || exit;

use Eighteen73\Matter\Color\Styles;
use Eighteen73\Matter\Config;


$wrapper_attributes = [
	'class' => 'embla__button embla__button--next',
	'style' => Styles::get_styles( $attributes, Config::get( 'colors', 'carousel' ) ),
];

?>

<button <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<span class="embla__button-label">
		<?php esc_html_e( 'Next slide', 'matter' ); ?>
	</span>
</button>
