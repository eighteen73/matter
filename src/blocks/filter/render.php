<?php
/**
 * Filter: its source's options (or range) for the listing it's in (see
 * Filters\Render::filter()).
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Unused.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Filters\Render;

echo Render::filter( $attributes, $block ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Render.
