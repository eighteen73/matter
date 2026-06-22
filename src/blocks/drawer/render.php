<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\Drawer
 */

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$drawer_id        = '';

foreach ( [ 'anchor', 'targetId', 'generatedId' ] as $id_attribute ) {
	if ( empty( $block_attributes[ $id_attribute ] ) ) {
		continue;
	}

	$drawer_id = $block_attributes[ $id_attribute ];
	break;
}

if ( empty( $drawer_id ) ) {
	$drawer_id = wp_unique_id( 'matter-drawer-' );
}

wp_interactivity_state(
	'matter/overlay/private',
	[
		'items' => [
			$drawer_id => [
				'isOpen' => false,
				'type'   => 'drawer',
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
			]
		)
		. ' '
		. wp_interactivity_data_wp_context(
			[
				'id'   => $drawer_id,
				'type' => 'drawer',
			]
		)
	);
	?>
>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
