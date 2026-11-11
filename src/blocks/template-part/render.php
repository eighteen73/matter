<?php
/**
 * Renders a PHP file from the theme's template-parts folder. The part
 * receives its slug and the block's context (postId, postType, queryId) as
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

// Only the slug and the block's context: other saved attributes could come
// from anyone who can edit content, and parts may print what they're given.
$matter_slug = (string) ( $attributes['slug'] ?? '' );
$matter_part = TemplatePart::render( $matter_slug, array_merge( $block->context, [ 'slug' => $matter_slug ] ) );

echo $matter_part; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- The theme's own template.
