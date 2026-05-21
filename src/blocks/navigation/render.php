<?php
/**
 * Navigation block render template.
 *
 * @package Eighteen73\Blocks
 */

use Eighteen73\Blocks\Blocks\Navigation;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_instance   = isset( $block ) && $block instanceof \WP_Block ? $block : null;

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Block renderer returns complete escaped markup.
echo Navigation::render( $block_attributes );
