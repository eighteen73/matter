<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\Collapsible
 */

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$collapsible_id   = '';

foreach ( [ 'anchor', 'targetId', 'generatedId' ] as $id_attribute ) {
	if ( empty( $block_attributes[ $id_attribute ] ) ) {
		continue;
	}

	$collapsible_id = $block_attributes[ $id_attribute ];
	break;
}

if ( empty( $collapsible_id ) ) {
	$collapsible_id = wp_unique_id( 'matter-collapsible-' );
}

$type = ! empty( $block_attributes['type'] ) ? $block_attributes['type'] : 'popover';

wp_interactivity_state(
	'matter/overlay/private',
	[
		'items' => [
			$collapsible_id => [
				'isOpen' => false,
				'type'   => 'collapsible',
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
				'id'                     => $collapsible_id,
				'class'                  => "is-type-{$type}",
				'data-wp-interactive'    => 'matter/overlay',
				'data-wp-init'           => 'callbacks.onInit',
				'data-wp-class--is-open' => 'state.item.isOpen',
			]
		)
		. ' '
		. wp_interactivity_data_wp_context(
			[
				'id'   => $collapsible_id,
				'type' => 'collapsible',
			]
		)
	);
	?>
>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
