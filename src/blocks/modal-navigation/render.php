<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\ModalNavigation
 */

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$context          = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];
$direction        = isset( $block_attributes['direction'] ) && 'previous' === $block_attributes['direction'] ? 'previous' : 'next';
$label            = isset( $block_attributes['label'] ) ? trim( wp_strip_all_tags( (string) $block_attributes['label'] ) ) : '';
$show_label       = ! empty( $block_attributes['showLabel'] );
$target_id        = ! empty( $context['matter/modal-id'] ) ? (string) $context['matter/modal-id'] : '';
$action           = 'previous' === $direction ? 'actions.openPrevious' : 'actions.openNext';

if ( '' === $label ) {
	$label = 'previous' === $direction ? __( 'Previous', 'matter' ) : __( 'Next', 'matter' );
}

$button_attributes = [
	'type'                        => 'button',
	'class'                       => 'is-direction-' . sanitize_html_class( $direction ),
	'aria-label'                  => $label,
	'data-wp-interactive'         => 'matter/overlay',
	'data-wp-on--click'           => $action,
	'data-wp-bind--disabled'      => 'state.isNavigationDisabled',
	'data-wp-bind--aria-disabled' => 'state.isNavigationDisabled',
];

if ( '' !== $target_id ) {
	$button_attributes['aria-controls'] = $target_id;
}
?>

<button
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes( $button_attributes )
		. ' '
		. wp_interactivity_data_wp_context(
			[
				'id'        => $target_id,
				'direction' => $direction,
			]
		)
	);
	?>
>
	<span
		class="wp-block-matter-modal-navigation__icon"
		aria-hidden="true"
	></span>

	<?php if ( $show_label ) : ?>
		<span class="wp-block-matter-modal-navigation__label">
			<?php echo esc_html( $label ); ?>
		</span>
	<?php endif; ?>
</button>
