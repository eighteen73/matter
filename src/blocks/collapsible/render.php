<?php
/**
 * Collapsible: content hidden in place until a link/button pointing at its
 * #ID reveals it.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered inner blocks.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Overlays\Overlay;

$matter_id = Overlay::id( $attributes, 'collapsible' );

Overlay::register( $matter_id );

printf(
	'<div %1$s %2$s hidden data-wp-bind--hidden="!state.isOpen"><div class="wp-block-matter-collapsible__content">%3$s</div></div>',
	get_block_wrapper_attributes( [ 'id' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	Overlay::directives( $matter_id ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
