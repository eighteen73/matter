<?php
/**
 * Accordion item block render template.
 *
 * @package Eighteen73\Matter
 */

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_content    = isset( $content ) ? (string) $content : '';
$block_instance   = isset( $block ) && $block instanceof WP_Block ? $block : null;

if ( ! $block_instance instanceof WP_Block ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Saved block markup.
	echo $block_content;
	return;
}

$open_by_default = ! empty( $block_attributes['openByDefault'] );
$item_id         = (string) ( $block_instance->context['matter/accordion-item-id'] ?? '' );
$accordion_id    = (string) ( $block_instance->context['matter/accordion-id'] ?? '' );

if ( '' === $item_id ) {
	$item_id = wp_unique_id( 'matter-accordion-item-' );
}

wp_interactivity_state(
	'matter/accordion/private',
	[
		'isOpen' => static function () {
			$context = wp_interactivity_get_context();
			$id      = $context['id'] ?? '';
			$items   = $context['accordionItems'] ?? [];

			if ( ! is_array( $items ) ) {
				return ! empty( $context['openByDefault'] );
			}

			foreach ( $items as $item ) {
				if ( ( $item['id'] ?? '' ) === $id ) {
					return ! empty( $item['isOpen'] );
				}
			}

			return ! empty( $context['openByDefault'] );
		},
	]
);

$item_context = [
	'id'            => $item_id,
	'openByDefault' => (bool) $open_by_default,
	'accordionId'   => $accordion_id,
];

$wrapper_attributes = [
	'data-wp-interactive'    => 'matter/accordion/private',
	'data-wp-init'           => 'callbacks.initAccordionItems',
	'data-wp-class--is-open' => 'state.isOpen',
];

if ( $open_by_default ) {
	$wrapper_attributes['class'] = 'is-open';
}

/*
 * Deprioritize images in collapsed items so they do not contend with the critical path.
 */
if ( ! $open_by_default && '' !== $block_content ) {
	$processor = new WP_HTML_Tag_Processor( $block_content );
	while ( $processor->next_tag( 'IMG' ) ) {
		$processor->set_attribute( 'fetchpriority', 'low' );
	}
	$block_content = $processor->get_updated_html();
}

?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes( $wrapper_attributes )
		. ' '
		. wp_interactivity_data_wp_context( $item_context )
	);
	?>
>
	<?php echo $block_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
