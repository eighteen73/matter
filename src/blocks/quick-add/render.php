<?php
/**
 * Quick add: a product's button (see Integrations\WooCommerce\QuickAdd).
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Unused.
 * @param WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Integrations\WooCommerce\QuickAdd;

echo QuickAdd::button( (int) ( $block->context['postId'] ?? get_the_ID() ), $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in QuickAdd.
