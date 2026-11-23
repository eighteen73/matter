<?php
/**
 * Filters: the listing's filters in a form, in a panel that's a drawer below
 * the variant's breakpoint (see Filters\Render::filters()).
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    The filter blocks, rendered.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Filters\Render;

echo Render::filters( $attributes, $content ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Render.
