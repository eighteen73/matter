<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\Collapsible
 */

use Eighteen73\Matter\Blocks\Collapsible;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$collapsible_id   = Collapsible::resolve_id( $block_attributes );
$type             = Collapsible::resolve_type( $block_attributes );

Collapsible::register_state( $collapsible_id );
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
