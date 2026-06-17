<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\CollapsibleContent
 */

defined( 'ABSPATH' ) || exit;

$context        = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];
$collapsible_id = ! empty( $context['matter/collapsible-id'] ) ? $context['matter/collapsible-id'] : '';
$content_id     = ! empty( $collapsible_id ) ? $collapsible_id . '-content' : wp_unique_id( 'matter-collapsible-content-' );
?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes(
			[
				'id'                   => $content_id,
				'data-wp-bind--hidden' => '!context.isOpen',
			]
		)
	);
	?>
>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
