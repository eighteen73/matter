<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\Trigger
 */

defined( 'ABSPATH' ) || exit;

$target_contexts = [
	'matter/modal-id'       => 'matter/modal',
	'matter/drawer-id'      => 'matter/drawer',
	'matter/collapsible-id' => 'matter/collapsible',
];

$target_id  = '';
$context    = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];
$tag_markup = isset( $content ) && is_string( $content ) ? $content : '';

foreach ( $target_contexts as $context_key => $context_namespace ) {
	if ( empty( $context[ $context_key ] ) ) {
		continue;
	}

	$target_id = $context[ $context_key ];
	break;
}

if ( empty( $target_id ) || empty( $tag_markup ) ) {
	echo $tag_markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	return;
}

$tag_processor = new WP_HTML_Tag_Processor( $tag_markup );

while ( $tag_processor->next_tag() ) {
	$tag_name = strtolower( $tag_processor->get_tag() );

	if ( ! in_array( $tag_name, [ 'button', 'a' ], true ) ) {
		continue;
	}

	$tag_processor->add_class( 'wp-block-matter-trigger' );
	$tag_processor->add_class( 'wp-block-matter-trigger__control' );
	$tag_processor->set_attribute( 'aria-controls', $target_id );
	$tag_processor->set_attribute( 'aria-expanded', 'false' );
	$tag_processor->set_attribute( 'data-wp-bind--aria-expanded', 'context.isOpen' );
	$tag_processor->set_attribute( 'data-wp-on--click', 'actions.toggle' );

	if ( 'button' === $tag_name && ! $tag_processor->get_attribute( 'type' ) ) {
		$tag_processor->set_attribute( 'type', 'button' );
	}

	break;
}

echo $tag_processor->get_updated_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
