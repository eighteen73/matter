<?php
/**
 * Modal: a native <dialog>, opened by links/buttons pointing at its #ID.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered inner blocks.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Overlays\Overlay;

echo Overlay::render_dialog( 'modal', $attributes, $content ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in render_dialog().
