<?php
/**
 * Navigation block render template.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\Navigation;

defined( 'ABSPATH' ) || exit;

$block_attributes        = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_instance          = isset( $block ) && $block instanceof \WP_Block ? $block : null;
$is_block_editor_preview = defined( 'REST_REQUEST' ) && REST_REQUEST;

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Block renderer returns complete escaped markup.
echo Navigation::render( $block_attributes, ! $is_block_editor_preview );
