<?php
/**
 * Drawer: a native <dialog> pinned to the left or right edge.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered inner blocks.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Overlays\Overlay;

$matter_position = 'left' === ( $attributes['position'] ?? '' ) ? 'left' : 'right';

echo Overlay::render_dialog( 'drawer', $attributes, $content, [ 'class' => 'is-position-' . $matter_position ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in render_dialog().
