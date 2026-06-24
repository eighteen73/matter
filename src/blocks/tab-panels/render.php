<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Styling\BlockStyles;

defined( 'ABSPATH' ) || exit;

$wrapper_attributes = [
	'class' => 'wp-block-matter-tab-panels',
	'style' => BlockStyles::get_styles( 'tab-panel', $attributes ),
];
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
