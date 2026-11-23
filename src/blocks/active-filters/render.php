<?php
/**
 * Active filters (see Filters\Render).
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Unused.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Filters\Render;

echo Render::active(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Render.
