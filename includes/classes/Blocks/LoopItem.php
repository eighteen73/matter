<?php
/**
 * Loop items: the theme's design for one item in a loop.
 *
 * A theme registers a pattern per post type, `{theme}/loop-item-{post_type}`
 * (e.g. `pulsar/loop-item-product`), with `{theme}/loop-item` as the fallback
 * for any other post type. The `matter/loop-item` block renders that pattern
 * with the item's block context, so loops in templates and carousels in
 * content all show the same, theme-owned design.
 *
 * The editor previews items through `matter/v1/loop-items`, many per request
 * (a carousel's or archive's items together), for items the user can read.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_Block_Patterns_Registry;
use WP_REST_Request;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Loop item rendering.
 */
final class LoopItem {

	use Singleton;

	/**
	 * Most items previewed in one request.
	 */
	public const MAX_PREVIEWS = 100;

	/**
	 * Parsed pattern blocks, keyed by pattern slug.
	 *
	 * @var array<string, array>
	 */
	private static array $blocks = [];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'rest_api_init', [ $this, 'register_route' ] );
	}

	/**
	 * `GET matter/v1/loop-items?ids[]=…`: rendered items by ID, for the
	 * editor's previews.
	 *
	 * @return void
	 */
	public function register_route(): void {
		register_rest_route(
			'matter/v1',
			'/loop-items',
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'previews' ],
				'permission_callback' => fn() => current_user_can( 'edit_posts' ),
				'args'                => [
					'ids' => [
						'type'     => 'array',
						'items'    => [
							'type'    => 'integer',
							'minimum' => 1,
						],
						'maxItems' => self::MAX_PREVIEWS,
						'required' => true,
					],
				],
			]
		);
	}

	/**
	 * Render the requested items the user can read. Items they can't (or
	 * that don't exist) are left out.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array<int, array{id: int, html: string}> Rendered items (without the block's wrapper).
	 */
	public function previews( WP_REST_Request $request ): array {
		$previews = [];

		foreach ( array_unique( array_map( 'intval', (array) $request['ids'] ) ) as $id ) {
			if ( current_user_can( 'read_post', $id ) ) {
				$previews[] = [
					'id'   => $id,
					'html' => self::render( $id ),
				];
			}
		}

		return $previews;
	}

	/**
	 * The rendered loop item for an item.
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
			// No pattern in the theme: a plain link, so the loop still works.
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
	 * The loop item pattern for a post type.
	 *
	 * @param string $post_type Post type.
	 * @return string|null Pattern slug, or null when the theme has none.
	 */
	public static function pattern( string $post_type ): ?string {
		$registry   = WP_Block_Patterns_Registry::get_instance();
		$themes     = array_unique( [ get_stylesheet(), get_template() ] );
		$candidates = [];

		foreach ( $themes as $theme ) {
			$candidates[] = "{$theme}/loop-item-{$post_type}";
		}

		foreach ( $themes as $theme ) {
			$candidates[] = "{$theme}/loop-item";
		}

		$slug = null;

		foreach ( $candidates as $candidate ) {
			if ( $registry->is_registered( $candidate ) ) {
				$slug = $candidate;
				break;
			}
		}

		/**
		 * Filters the pattern used as the loop item for a post type.
		 *
		 * @param string|null $slug      Pattern slug, or null for none.
		 * @param string      $post_type Post type.
		 */
		$slug = apply_filters( 'matter_loop_item_pattern', $slug, $post_type );

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
