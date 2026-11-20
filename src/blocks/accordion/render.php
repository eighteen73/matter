<?php
/**
 * Accordion: wraps its items with behaviour, and optionally outputs FAQ schema.
 *
 * Items (rendered first) record themselves via Instances, which is how the
 * accordion knows which are open by default and what goes in the schema.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered items.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Instances;

$matter_id    = Instances::current( 'matter/accordion' ) ?? wp_unique_id( 'accordion-' );
$matter_items = Instances::items( 'matter/accordion' );
$matter_open  = [];

// Nothing to show (no items, or every one empty): no empty wrapper.
if ( ! $matter_items ) {
	return;
}

// Panels are region landmarks only while there are few: a long FAQ of them
// floods a screen reader's landmark list. Items (rendered first, so counted by
// now, a Query Loop's posts included) left a placeholder, and a nested
// accordion has already resolved its own. A posts display counts the query's
// posts in all, not the page's, so every page of it decides the same. A panel
// without the role is still named by its button (`aria-controls`).
$matter_count = max( count( $matter_items ), Instances::total( 'matter/accordion' ) ?? 0 );

$content = preg_replace_callback(
	'/ data-matter-region="([^"]*)"/',
	fn( $found ) => $matter_count <= 6 ? ' role="region" aria-labelledby="' . $found[1] . '"' : '',
	$content
);

foreach ( $matter_items as $matter_index => $matter_item ) {
	if ( ! empty( $matter_item['open'] ) || ( 0 === $matter_index && ! empty( $attributes['openFirst'] ) ) ) {
		$matter_open[] = $matter_item['id'] ?? $matter_id . '-' . ( $matter_index + 1 );
	}
}

if ( ! empty( $attributes['autoclose'] ) ) {
	$matter_open = array_slice( $matter_open, 0, 1 );
}

// What the server renders is what a visitor without JavaScript gets: every
// panel readable. So the server says an item is open (class and aria-expanded)
// when it opens by default, and nothing about a closed one; the script hides
// its panel, and says it's collapsed, once it starts (view.js).
wp_interactivity_state(
	'matter/accordion',
	[
		'isItemOpen'     => function () {
			$context = wp_interactivity_get_context();

			return in_array( $context['itemId'] ?? '', $context['openItems'] ?? [], true );
		},
		'isItemExpanded' => function () {
			$context = wp_interactivity_get_context();

			return in_array( $context['itemId'] ?? '', $context['openItems'] ?? [], true ) ? true : null;
		},
		'isPanelHidden'  => fn() => false,
	]
);

printf(
	'<div %1$s data-wp-interactive="matter/accordion" %2$s data-wp-init="callbacks.init" data-wp-watch="callbacks.announce" data-wp-on--keydown="actions.onKeydown">%3$s</div>',
	get_block_wrapper_attributes( [ 'id' => $matter_id ] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_interactivity_data_wp_context( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		[
			'openItems' => $matter_open,
			'autoclose' => ! empty( $attributes['autoclose'] ),
		]
	),
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);

if ( ! empty( $attributes['faqSchema'] ) ) {
	$matter_schema = [
		'@context'   => 'https://schema.org',
		'@type'      => 'FAQPage',
		'mainEntity' => array_map(
			fn( $item ) => [
				'@type'          => 'Question',
				'name'           => html_entity_decode( $item['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
				'acceptedAnswer' => [
					'@type' => 'Answer',
					'text'  => html_entity_decode( $item['text'], ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
				],
			],
			array_values( array_filter( $matter_items, fn( $item ) => '' !== $item['title'] && '' !== $item['text'] ) )
		),
	];

	printf( '<script type="application/ld+json">%s</script>', wp_json_encode( $matter_schema, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ) );
}
