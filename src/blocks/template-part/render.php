<?php
/**
 * Renders a PHP file from the theme's template-parts folder. The part
 * receives the block's attributes and context (postId, postType, queryId) as
 * `$args`.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var WP_Block $block      Block instance.
 *
 * @package Eighteen73\Matter
 */

use Eighteen73\Matter\Blocks\TemplatePart;

defined( 'ABSPATH' ) || exit;

$matter_part = TemplatePart::render( (string) ( $attributes['slug'] ?? '' ), array_merge( $attributes, $block->context ) );

echo $matter_part; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- The theme's own template.
