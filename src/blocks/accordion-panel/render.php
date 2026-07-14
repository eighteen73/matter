<?php
/**
 * Accordion panel block render template.
 *
 * @package Eighteen73\Matter
 */

defined( 'ABSPATH' ) || exit;

$block_content  = isset( $content ) ? (string) $content : '';
$block_instance = isset( $block ) && $block instanceof WP_Block ? $block : null;

$item_id         = '';
$open_by_default = false;

if ( $block_instance instanceof WP_Block ) {
	$item_id         = (string) ( $block_instance->context['matter/accordion-item-id'] ?? '' );
	$open_by_default = ! empty( $block_instance->context['matter/accordion-open-by-default'] );
}

if ( '' === $item_id ) {
	$item_id = wp_unique_id( 'matter-accordion-item-' );
}

$panel_id = $item_id . '-panel';

$wrapper_attributes = [
	'id'                  => $panel_id,
	'role'                => 'region',
	'aria-labelledby'     => $item_id,
	'data-wp-interactive' => 'matter/accordion/private',
	'data-wp-bind--inert' => '!state.isOpen',
];

if ( ! $open_by_default ) {
	$wrapper_attributes['inert'] = true;
}

?>

<div
	<?php
	echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) );
	?>
>
	<?php echo $block_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
