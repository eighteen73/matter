<?php
/**
 * Accordion block render template.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Accordion;
use Eighteen73\Matter\Blocks\BlockId;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_content    = isset( $content ) ? (string) $content : '';
$block_instance   = isset( $block ) && $block instanceof WP_Block ? $block : null;

if ( ! $block_instance instanceof WP_Block ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Saved block markup.
	echo $block_content;
	return;
}

$accordion_id = $block_instance->context['matter/accordion-id']
	?? BlockId::resolve_base_id( $block_attributes, 'matter-accordion-' );
$autoclose    = ! empty( $block_attributes['autoclose'] );

if ( empty( $accordion_id ) ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Saved block markup.
	echo $block_content;
	return;
}

$accordion_context = [
	'accordionId'    => $accordion_id,
	'autoclose'      => (bool) $autoclose,
	'accordionItems' => [],
];

$wrapper_attributes = [
	'id'                            => $accordion_id,
	'role'                          => 'group',
	'data-wp-interactive'           => 'matter/accordion/private',
	'data-wp-init'                  => 'callbacks.onAccordionInit',
	'data-wp-on-window--hashchange' => 'callbacks.hashChange',
];

$title_font_size = Accordion::resolve_font_size_value(
	$block_attributes['fontSize'] ?? null,
	$block_attributes['style']['typography']['fontSize'] ?? null
);

if ( $title_font_size ) {
	$wrapper_attributes['style'] = '--matter-accordion--title--font-size:' . $title_font_size . ';';
}

?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes( $wrapper_attributes )
		. ' '
		. wp_interactivity_data_wp_context( $accordion_context )
	);
	?>
>
	<?php echo $block_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
