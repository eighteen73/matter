<?php
/**
 * Collapsible: optional trigger area plus content revealed in place.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered slots.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Overlays\Overlay;

$matter_html = Overlay::render( 'collapsible', $attributes, $content, $block );

echo $matter_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Overlay::render().
