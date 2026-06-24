<?php
/**
 * Tabs block render template.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Config;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_content    = isset( $content ) ? (string) $content : '';
$block_instance   = isset( $block ) && $block instanceof \WP_Block ? $block : null;

if ( ! $block_instance instanceof \WP_Block ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Saved block markup.
	echo $block_content;
	return;
}

$tabs_id                     = $block_instance->context['matter/tabs-id'] ?? null;
$tabs_list                   = $block_instance->context['matter/tabs-list'] ?? [];
$active_tab_index            = $block_attributes['activeTabIndex'] ?? 0;
$deep_linking                = $block_attributes['deepLinking'] ?? false;
$deep_linking_update_history = $block_attributes['deepLinkingUpdateHistory'] ?? false;
$stack_on_mobile             = $block_attributes['stackOnMobile'] ?? false;
$stacked_breakpoint          = $block_attributes['stackedBreakpoint'] ?? 'lg';
$is_horizontal               = $block_attributes['layout']['orientation'] === 'horizontal';

$allowed_breakpoints = array_keys( Config::file( 'breakpoints' ) );
if ( ! in_array( $stacked_breakpoint, $allowed_breakpoints, true ) ) {
	$stacked_breakpoint = 'lg';
}

if ( empty( $tabs_id ) ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Saved block markup.
	echo $block_content;
	return;
}

$wrapper_classes = [];
if ( $stack_on_mobile && $is_horizontal ) {
	$wrapper_classes[] = 'is-stacked-on-mobile';
	$wrapper_classes[] = 'is-stacked-on-mobile-until-' . $stacked_breakpoint;
}

wp_interactivity_state(
	'matter/tabs/private',
	[
		$tabs_id => $tabs_list,
	]
);

$tabs_context = [
	'tabsId'                   => $tabs_id,
	'activeTabIndex'           => $active_tab_index,
	'deepLinking'              => (bool) $deep_linking,
	'deepLinkingUpdateHistory' => (bool) $deep_linking_update_history,
];

$wrapper_attributes = [
	'data-wp-interactive'           => 'matter/tabs/private',
	'data-wp-init'                  => 'callbacks.onTabsInit',
	'data-wp-on--keydown'           => 'actions.handleTabKeyDown',
	'data-wp-on-window--hashchange' => 'actions.onHashChange',
	'class'                         => implode( ' ', $wrapper_classes ),
];

?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes( $wrapper_attributes )
		. ' '
		. wp_interactivity_data_wp_context( $tabs_context )
	);
	?>
>
	<?php echo $block_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
