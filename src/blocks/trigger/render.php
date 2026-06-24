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

$target_id  = Trigger::resolve_target_id( $block );
$tag_markup = isset( $content ) && is_string( $content ) ? $content : '';

if ( empty( $target_id ) || empty( $tag_markup ) ) {
	echo $tag_markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	return;
}

$standalone        = ! Trigger::uses_context_target( $block );
$toggle_attributes = Trigger::get_toggle_attributes( $target_id, $standalone );
$tag_processor     = new WP_HTML_Tag_Processor( $tag_markup );

while ( $tag_processor->next_tag() ) {
	$tag_name = strtolower( $tag_processor->get_tag() );

	if ( ! in_array( $tag_name, [ 'button', 'a' ], true ) ) {
		continue;
	}

	$tag_processor->add_class( 'wp-block-matter-trigger' );
	$tag_processor->add_class( 'wp-block-matter-trigger__control' );

	foreach ( $toggle_attributes as $attribute => $value ) {
		$tag_processor->set_attribute( $attribute, $value );
	}

	if ( 'button' === $tag_name && ! $tag_processor->get_attribute( 'type' ) ) {
		$tag_processor->set_attribute( 'type', 'button' );
	}

	break;
}

echo $tag_processor->get_updated_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
