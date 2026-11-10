<?php
/**
 * Cards: the theme's design for one item in a loop.
 *
 * A theme registers a pattern per post type, `{theme}/card-{post_type}`
 * (e.g. `pulsar/card-product`), with `{theme}/card` as the fallback for any
 * other post type. The `matter/card` block renders that pattern with the
 * item's block context, so loops in templates and carousels in content all
 * show the same, theme-owned card.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use WP_Block;
use WP_Block_Patterns_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Card rendering.
 */
final class Card {

	/**
	 * Parsed pattern blocks, keyed by pattern slug.
	 *
	 * @var array<string, array>
	 */
	private static array $blocks = [];

	/**
	 * The rendered card for an item.
	 *
	 * @param int    $post_id   Item ID.
	 * @param string $post_type Item post type (looked up when empty).
	 * @return string Empty when there's no item.
	 */
	public static function render( int $post_id, string $post_type = '' ): string {
		$post = get_post( $post_id );

		if ( ! $post ) {
			return '';
		}

		$post_type = $post_type ?: $post->post_type;
		$slug      = self::pattern( $post_type );

		if ( null === $slug ) {
			// No card in the theme: a plain link, so the loop still works.
			return sprintf( '<a href="%s">%s</a>', esc_url( get_permalink( $post ) ), esc_html( get_the_title( $post ) ) );
		}

		$context = [
			'postId'   => $post->ID,
			'postType' => $post_type,
		];

		// Some blocks (e.g. WooCommerce's) read the global post or product
		// rather than context, so make sure it's this item.
		$previous_post = $GLOBALS['post'] ?? null;
		$is_other_post = ! $previous_post instanceof \WP_Post || $previous_post->ID !== $post->ID;

		if ( $is_other_post ) {
			$GLOBALS['post'] = $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restored below.
			setup_postdata( $post );
		}

		$html = '';

		foreach ( self::blocks( $slug ) as $parsed ) {
			$html .= ( new WP_Block( $parsed, $context ) )->render();
		}

		if ( $is_other_post ) {
			$GLOBALS['post'] = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restoring.

			if ( $previous_post instanceof \WP_Post ) {
				setup_postdata( $previous_post );
			}
		}

		return $html;
	}

	/**
	 * The card pattern for a post type.
	 *
	 * @param string $post_type Post type.
	 * @return string|null Pattern slug, or null when the theme has none.
	 */
	public static function pattern( string $post_type ): ?string {
		$registry   = WP_Block_Patterns_Registry::get_instance();
		$themes     = array_unique( [ get_stylesheet(), get_template() ] );
		$candidates = [];

		foreach ( $themes as $theme ) {
			$candidates[] = "{$theme}/card-{$post_type}";
		}

		foreach ( $themes as $theme ) {
			$candidates[] = "{$theme}/card";
		}

		$slug = null;

		foreach ( $candidates as $candidate ) {
			if ( $registry->is_registered( $candidate ) ) {
				$slug = $candidate;
				break;
			}
		}

		/**
		 * Filters the pattern used as the card for a post type.
		 *
		 * @param string|null $slug      Pattern slug, or null for none.
		 * @param string      $post_type Post type.
		 */
		$slug = apply_filters( 'matter_card_pattern', $slug, $post_type );

		return is_string( $slug ) && $registry->is_registered( $slug ) ? $slug : null;
	}

	/**
	 * A pattern's parsed blocks (empty blocks between them dropped).
	 *
	 * @param string $slug Pattern slug.
	 * @return array
	 */
	private static function blocks( string $slug ): array {
		if ( ! isset( self::$blocks[ $slug ] ) ) {
			$pattern = WP_Block_Patterns_Registry::get_instance()->get_registered( $slug );

			self::$blocks[ $slug ] = array_values(
				array_filter(
					parse_blocks( (string) ( $pattern['content'] ?? '' ) ),
					fn( $block ) => null !== $block['blockName']
				)
			);
		}

		return self::$blocks[ $slug ];
	}
}
