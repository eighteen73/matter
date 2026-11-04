<?php
/**
 * Drawer: optional trigger area plus a native <dialog> pinned to an edge.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered slots.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Overlays\Overlay;

$matter_position = 'left' === ( $attributes['position'] ?? '' ) ? 'left' : 'right';
$matter_html     = Overlay::render( 'drawer', $attributes, $content, $block, [ 'class' => 'is-position-' . $matter_position ] );

echo $matter_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Overlay::render().
