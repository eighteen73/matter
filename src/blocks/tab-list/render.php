<?php
/**
 * Tab list block render template.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Tabs;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_content    = isset( $content ) ? (string) $content : '';
$block_instance   = isset( $block ) && $block instanceof \WP_Block ? $block : null;

if ( ! $block_instance instanceof \WP_Block ) {
	return;
}

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Block renderer returns complete escaped markup.
echo Tabs::render_tab_list( $block_attributes, $block_instance );
