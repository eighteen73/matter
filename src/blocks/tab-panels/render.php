<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\TabPanels
 */

use Eighteen73\Matter\Styling\Color;
use Eighteen73\Matter\Config;

defined( 'ABSPATH' ) || exit;

$wrapper_attributes = [
	'class' => 'wp-block-matter-tab-panels',
	'style' => Color::get_styles( $attributes, Config::get( 'colors', 'tabPanel' ) ),
];
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
