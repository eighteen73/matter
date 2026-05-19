<?php
/**
 * Navigation block render template.
 *
 * @package Eighteen73\Blocks
 */

use Eighteen73\Blocks\Navigation;

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_instance   = isset( $block ) && $block instanceof \WP_Block ? $block : null;

echo Navigation::render( $block_attributes, $block_instance );
