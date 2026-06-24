<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\ModalContent
 */

use Eighteen73\Matter\Styling\BlockStyles;

defined( 'ABSPATH' ) || exit;

$context  = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];
$modal_id = ! empty( $context['matter/modal-id'] ) ? $context['matter/modal-id'] : wp_unique_id( 'matter-modal-' );

$wrapper_attributes = [
	'id'                 => $modal_id,
	'class'              => 'wp-block-matter-modal__content',
	'style'              => BlockStyles::get_styles( 'modal-content', $attributes ),
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
