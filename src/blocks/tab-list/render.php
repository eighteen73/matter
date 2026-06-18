<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\TabList
 */

$tabs = $block->context['matter/tabs-list'] ?? [];
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes( [ 'role' => 'tablist' ] ) ); ?>>
	<?php foreach ( $tabs as $tab ) : ?>
		<button key={ $tab.id }>
			{ $tab.label }
		</button>
	<?php endforeach; ?>
</div>
