<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\Drawer
 */

use Eighteen73\Matter\Blocks\Drawer;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$drawer_id        = Drawer::resolve_id( $block_attributes );

Drawer::register_state( $drawer_id );
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
				'id'   => $drawer_id,
				'type' => 'drawer',
			]
		)
	);
	?>
>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
