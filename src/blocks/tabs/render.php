<?php
/**
 * Tabs block render template.
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

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Block renderer returns complete escaped markup.
echo Tabs::render_tabs( $block_attributes, $block_content, $block_instance );
