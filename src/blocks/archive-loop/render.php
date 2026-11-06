<?php
/**
 * Archive list: where the template's list of posts or products goes in an
 * archive's content. Its variant (block style) is a class on the wrapper.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Unused.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Archives\Archives;

$matter_loop = Archives::instance()->take_loop();

if ( '' === $matter_loop ) {
	return;
}

// The editor's preview: the block's own wrapper is in the editor.
if ( wp_is_serving_rest_request() ) {
	echo $matter_loop; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered blocks.
	return;
}

printf(
	'<div %1$s>%2$s</div>',
	get_block_wrapper_attributes( [ 'class' => 'alignfull' ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by core.
	$matter_loop // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered blocks.
);
