<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\DrawerContent
 */

use Eighteen73\Matter\Config;
use Eighteen73\Matter\Styling\Color;

defined( 'ABSPATH' ) || exit;

$context   = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];
$drawer_id = ! empty( $context['matter/drawer-id'] ) ? $context['matter/drawer-id'] : wp_unique_id( 'matter-drawer-' );
$position = ! empty( $attributes['position'] ) ? $attributes['position'] : 'left';

$wrapper_attributes = [
	'id'                 => $drawer_id,
	'class'              => "wp-block-matter-drawer__content opens-{$position}",
	'style'              => Color::get_styles( $attributes, Config::get( 'colors', 'drawer-content' ) ),
	'data-wp-watch'      => 'callbacks.syncDialog',
	'data-wp-on--close'  => 'callbacks.onNativeClose',
	'data-wp-on--cancel' => 'callbacks.onCancel',
	'data-wp-on--click'  => 'callbacks.onBackdropClick',
	'aria-modal'         => 'true',
];
?>

<dialog <?php echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) ); ?>>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</dialog>
