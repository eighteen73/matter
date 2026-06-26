<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\TriggerHamburger
 */

use Eighteen73\Matter\Blocks\Trigger;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$label            = isset( $block_attributes['label'] ) ? trim( wp_strip_all_tags( $block_attributes['label'] ) ) : '';
$show_label       = ! empty( $block_attributes['showLabel'] );
$target_id        = Trigger::resolve_target_id( $block );
$standalone       = ! Trigger::uses_context_target( $block );

if ( '' === $label ) {
	$label = __( 'Open menu', 'matter' );
}

$button_attributes = array_merge(
	[
		'type'       => 'button',
		'aria-label' => $label,
	],
	Trigger::get_toggle_attributes( $target_id, $standalone )
);
?>

<button <?php echo wp_kses_data( get_block_wrapper_attributes( $button_attributes ) ); ?>>
	<span
		class="wp-block-matter-trigger-hamburger__icon"
		aria-hidden="true"
	></span>

	<?php if ( $show_label ) : ?>
		<span class="wp-block-matter-trigger-hamburger__label">
			<?php echo esc_html( $label ); ?>
		</span>
	<?php endif; ?>
</button>
