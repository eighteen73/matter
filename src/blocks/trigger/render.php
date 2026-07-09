<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\Trigger
 */

use Eighteen73\Matter\Blocks\Trigger;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$target_id        = Trigger::resolve_target_id( $block );
$tag_markup       = isset( $content ) && is_string( $content ) ? $content : '';
$accessible_label = isset( $block_attributes['accessibleLabel'] )
	? trim( wp_strip_all_tags( (string) $block_attributes['accessibleLabel'] ) )
	: '';
$overlay_context  = Trigger::sanitize_overlay_context( $block_attributes['overlayContext'] ?? [] );

if ( empty( $target_id ) || empty( $tag_markup ) ) {
	echo $tag_markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	return;
}

$standalone = ! Trigger::uses_context_target( $block );

$updated_html = Trigger::apply_toggle_attributes_to_markup(
	$tag_markup,
	$target_id,
	$standalone,
	$accessible_label,
	$overlay_context
);

echo $updated_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
