<?php
/**
 * Tab panel block render template.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Tabs;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_content    = isset( $content ) ? (string) $content : '';
$block_instance   = isset( $block ) && $block instanceof \WP_Block ? $block : null;

if ( ! $block_instance instanceof \WP_Block ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Saved block markup.
	echo $block_content;
	return;
}

$tabs_id          = (string) ( $block_instance->context['matter/tabs-id'] ?? '' );
$active_tab_index = (int) ( $block_instance->context['matter/tabs-activeTabIndex'] ?? 0 );
$tab_index        = Tabs::get_tab_panel_index( $tabs_id );
$tabs_list        = $block_instance->context['matter/tabs-list'] ?? [];

$tab_id = ! empty( $block_attributes['anchor'] )
	? (string) $block_attributes['anchor']
	: ( ! empty( $tabs_id )
		? $tabs_id . '-tab-' . $tab_index
		: 'tab-' . $tab_index );

$deep_linking_id = $tabs_list[ $tab_index ]['deepLinkingId'] ?? $tab_id;

$panel_context = [
	'tabsId'   => $tabs_id,
	'tabIndex' => $tab_index,
	'tab'      => [
		'id' => $tab_id,
	],
];

$wrapper_attributes = [
	'role'                     => 'tabpanel',
	'aria-labelledby'          => 'tab__' . $tab_id,
	'data-deep-linking-id'     => $deep_linking_id,
	'data-wp-interactive'      => 'core/tabs/private',
	'data-wp-bind--hidden'     => '!state.isActiveTab',
	'data-wp-class--is-active' => 'state.isActiveTab',
	'tabindex'                 => '0',
];

if ( empty( $block_attributes['anchor'] ) ) {
	$wrapper_attributes['id'] = $tab_id;
}

if ( $tab_index !== $active_tab_index ) {
	$wrapper_attributes['hidden'] = true;
}

?>

<section
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes( $wrapper_attributes )
		. ' '
		. wp_interactivity_data_wp_context( $panel_context )
	);
	?>
>
	<?php echo $block_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</section>
