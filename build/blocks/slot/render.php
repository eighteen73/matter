<?php
/**
 * Slot: outputs its inner blocks, marked so the parent section can place them.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Rendered inner blocks.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Sections\Sections;

echo Sections::mark_slot( (string) ( $attributes['name'] ?? '' ), $content ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered block content.
