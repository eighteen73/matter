<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\Modal
 */

?>

<dialog
	<?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>
	data-wp-interactive="matter/modal"
	data-wp-context='{ "isOpen": false }'
>
</dialog>
