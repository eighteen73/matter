<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73\Matter\Modal
 */

use Eighteen73\Matter\Blocks\Modal;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_context    = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];
$base_id          = Modal::resolve_base_id( $block_attributes );
$modal_id         = Modal::resolve_id( $block_attributes, $block_context );
$group_id         = Modal::resolve_group_id( $block_attributes, $block_context, $base_id );
$group_index      = Modal::resolve_group_index( $group_id );

$dismissed_duration = ! empty( $block_attributes['dismissedDuration'] )
	? sanitize_text_field( (string) $block_attributes['dismissedDuration'] )
	: '';
$trigger_on_load    = ! empty( $block_attributes['triggerOnLoad'] );
$trigger_delay      = ! empty( $block_attributes['triggerDelay'] )
	? sanitize_text_field( (string) $block_attributes['triggerDelay'] )
	: '';
$trigger_on_scroll  = ! empty( $block_attributes['triggerOnScroll'] );
$scroll_selector    = ! empty( $block_attributes['scrollSelector'] )
	? sanitize_text_field( (string) $block_attributes['scrollSelector'] )
	: '';
$scroll_threshold   = ! empty( $block_attributes['scrollThreshold'] )
	? sanitize_text_field( (string) $block_attributes['scrollThreshold'] )
	: '10';
$url_triggers       = Modal::sanitize_url_triggers( $block_attributes['urlTriggers'] ?? [] );

wp_interactivity_state(
	'matter/overlay/private',
	[
		'items' => [
			$modal_id => [
				'instance'          => null,
				'isOpen'            => false,
				'type'              => 'modal',
				'baseId'            => $base_id,
				'groupId'           => $group_id,
				'groupIndex'        => $group_index,
				'dismissedDuration' => $dismissed_duration,
				'triggerOnLoad'     => $trigger_on_load,
				'triggerDelay'      => $trigger_delay,
				'triggerOnScroll'   => $trigger_on_scroll,
				'scrollSelector'    => $scroll_selector,
				'scrollThreshold'   => $scroll_threshold,
				'urlTriggers'       => $url_triggers,
			],
		],
	]
);
?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes(
			[
				'data-wp-interactive' => 'matter/overlay',
				'data-wp-init'        => 'callbacks.onInit',
			]
		)
		. ' '
		. wp_interactivity_data_wp_context(
			[
				'id'   => $modal_id,
				'type' => 'modal',
			]
		)
	);
	?>
>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
