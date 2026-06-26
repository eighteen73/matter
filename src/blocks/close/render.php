<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\Close
 */

defined( 'ABSPATH' ) || exit;

use Eighteen73\Matter\Styling\BlockStyles;

$target_contexts = [
	'matter/modal-id',
	'matter/drawer-id',
];

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$context          = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];
$label            = isset( $block_attributes['label'] ) ? trim( wp_strip_all_tags( $block_attributes['label'] ) ) : '';
$show_label       = ! array_key_exists( 'showLabel', $block_attributes ) || (bool) $block_attributes['showLabel'];
$position         = isset( $block_attributes['position'] ) ? (string) $block_attributes['position'] : 'inline';
$target_id        = '';

if ( '' === $label ) {
	$label = __( 'Close', 'matter' );
}

foreach ( $target_contexts as $context_key ) {
	if ( empty( $context[ $context_key ] ) ) {
		continue;
	}

	$target_id = $context[ $context_key ];
	break;
}

$button_attributes = [
	'type'       => 'button',
	'aria-label' => $label,
];

if ( 'inline' !== $position ) {
	$button_attributes['class'] = 'is-position-' . sanitize_html_class( $position );

	$inset_styles = BlockStyles::get_styles( 'close', $block_attributes );

	if ( '' !== $inset_styles ) {
		$button_attributes['style'] = $inset_styles;
	}
}

if ( ! empty( $target_id ) ) {
	$button_attributes['aria-controls']       = $target_id;
	$button_attributes['data-wp-interactive'] = 'matter/overlay';
	$button_attributes['data-wp-on--click']   = 'actions.close';
}
?>

<button <?php echo wp_kses_data( get_block_wrapper_attributes( $button_attributes ) ); ?>>
	<span
		class="wp-block-matter-close__icon"
		aria-hidden="true"
	></span>

	<?php if ( $show_label ) : ?>
		<span class="wp-block-matter-close__label">
			<?php echo esc_html( $label ); ?>
		</span>
	<?php endif; ?>
</button>
