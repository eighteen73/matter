<?php
/**
 * Loop items: the theme's design for one item in a loop.
 *
 * A theme registers a pattern per post type, `{namespace}/loop-item-{post_type}`
 * (e.g. `pulsar/loop-item-product`), with `{namespace}/loop-item` as the fallback
 * for any other post type. The `matter/loop-item` block renders that pattern
 * with the item's block context, so loops in templates and carousels in
 * content all show the same, theme-owned design.
 *
 * In a query shown as a block (Blocks\QueryDisplay), the block can have its
 * own patterns, most specific first, like WordPress's template hierarchy:
 *
 * - Carousel slides: `loop-item-{post_type}-carousel`, `loop-item-{post_type}`,
 *   `loop-item-carousel`, `loop-item`.
 * - Accordion and tabs content: `loop-item-{post_type}-accordion` (or
 *   `-tabs`), `loop-item-accordion` (or `loop-item-tabs`), else the item's
 *   excerpt. Not the item's own design: the post's title is already the
 *   heading or tab.
 *
 * Terms (in a Terms Query's term template) have their own patterns,
 * `{namespace}/loop-item-term-{taxonomy}` (e.g. `pulsar/loop-item-term-product_cat`),
 * then `{namespace}/loop-item-term`, and in a carousel the `-carousel` ones
 * first in the same order as posts'. They render with the term's context
 * (`termId`, `taxonomy`), as core's term blocks read it. Without one, a link
 * to the term.
 *
 * The editor previews items through `matter/v1/loop-items` (and terms through
 * `matter/v1/loop-items/terms`), many per request (a carousel's or archive's
 * items together), for items the user can read.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_Block_Patterns_Registry;
use WP_REST_Request;
use WP_REST_Server;
use WP_Term;

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
	 * Patterns rendering, per item (`pulsar/loop-item:post:12`), so a pattern
	 * holding a loop item for its own item doesn't render forever.
	 *
	 * @var array<string, true>
	 */
	private static array $rendering = [];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'rest_api_init', [ $this, 'register_route' ] );
	}

	/**
	 * `GET matter/v1/loop-items?ids[]=…&block=…`: rendered items by ID (in a
	 * query shown as that block, if any), for the editor's previews; and
	 * `GET matter/v1/loop-items/terms?ids[]=…&block=…` for terms (in a Terms
	 * Query shown as a carousel, if any).
	 *
	 * @return void
	 */
	public function register_route(): void {
		$ids = [
			'type'     => 'array',
			'items'    => [
				'type'    => 'integer',
				'minimum' => 1,
			],
			'maxItems' => self::MAX_PREVIEWS,
			'required' => true,
		];

		register_rest_route(
			'matter/v1',
			'/loop-items',
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'previews' ],
				'permission_callback' => fn() => current_user_can( 'edit_posts' ),
				'args'                => [
					'ids'   => $ids,
					'block' => [
						'type'    => 'string',
						'default' => '',
						'enum'    => array_merge( [ '' ], array_keys( QueryDisplay::TYPES ) ),
					],
				],
			]
		);

		register_rest_route(
			'matter/v1',
			'/loop-items/terms',
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'term_previews' ],
				'permission_callback' => fn() => current_user_can( 'edit_posts' ),
				'args'                => [
					'ids'   => $ids,
					'block' => [
						'type'    => 'string',
						'default' => '',
						'enum'    => array_merge( [ '' ], self::term_blocks() ),
					],
				],
			]
		);
	}

	/**
	 * The blocks a Terms Query can be shown as (carousel).
	 *
	 * @return string[]
	 */
	private static function term_blocks(): array {
		return array_values(
			array_filter(
				array_keys( QueryDisplay::TYPES ),
				fn( $type ) => QueryDisplay::supports( $type, QueryDisplay::TERMS )
			)
		);
	}

	/**
	 * Render the requested items the user can read, of post types that are
	 * viewable (have a front end). Others, and items that don't exist, are
	 * left out: loops only list viewable post types, and anyone who can edit
	 * posts mustn't be able to render, say, a coupon or a reusable block.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array<int, array{id: int, html: string}> Rendered items (without the block's wrapper).
	 */
	public function previews( WP_REST_Request $request ): array {
		$previews = [];
		$block    = (string) $request['block'];

		foreach ( array_unique( array_map( 'intval', (array) $request['ids'] ) ) as $id ) {
			if ( self::can_preview( $id ) ) {
				$previews[] = [
					'id'   => $id,
					'html' => self::render( $id, '', $block ),
				];
			}
		}

		return $previews;
	}

	/**
	 * Render the requested terms of viewable (public) taxonomies, as a Terms
	 * Query lists. Others, and terms that don't exist, are left out.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array<int, array{id: int, html: string}> Rendered items (without the block's wrapper).
	 */
	public function term_previews( WP_REST_Request $request ): array {
		$previews = [];
		$block    = (string) $request['block'];

		foreach ( array_unique( array_map( 'intval', (array) $request['ids'] ) ) as $id ) {
			if ( self::can_preview_term( $id ) ) {
				$previews[] = [
					'id'   => $id,
					'html' => self::render_term( $id, '', $block ),
				];
			}
		}

		return $previews;
	}

	/**
	 * Whether the current user may preview a term: one of a viewable
	 * taxonomy (term pages are public).
	 *
	 * @param int $term_id Term ID.
	 * @return bool
	 */
	public static function can_preview_term( int $term_id ): bool {
		return null !== self::term( $term_id );
	}

	/**
	 * A term, if it exists and its taxonomy is viewable.
	 *
	 * @param int    $term_id  Term ID.
	 * @param string $taxonomy Its taxonomy (any when empty).
	 * @return WP_Term|null
	 */
	private static function term( int $term_id, string $taxonomy = '' ): ?WP_Term {
		$term = $term_id > 0 ? get_term( $term_id, $taxonomy ) : null;

		return $term instanceof WP_Term && is_taxonomy_viewable( $term->taxonomy ) ? $term : null;
	}

	/**
	 * Whether the current user may preview an item: one they can read, of a
	 * viewable post type.
	 *
	 * @param int $post_id Item ID.
	 * @return bool
	 */
	public static function can_preview( int $post_id ): bool {
		$type = get_post_type( $post_id );

		return $type && is_post_type_viewable( $type ) && current_user_can( 'read_post', $post_id );
	}

	/**
	 * The rendered loop item for an item.
	 *
	 * @param int    $post_id   Item ID.
	 * @param string $post_type Item post type (looked up when empty).
	 * @param string $block     The block the item's query is shown as
	 *                          (carousel, accordion or tabs); empty for none.
	 * @return string Empty when there's no item.
	 */
	public static function render( int $post_id, string $post_type = '', string $block = '' ): string {
		$post = get_post( $post_id );

		if ( ! $post ) {
			return '';
		}

		$post_type = $post_type ?: $post->post_type;
		$block     = isset( QueryDisplay::TYPES[ $block ] ) ? $block : '';
		$slug      = self::pattern( $post_type, $block );

		if ( null === $slug && '' !== $block && ! QueryDisplay::TYPES[ $block ]['cards'] ) {
			// No accordion or tabs pattern in the theme: the item's excerpt.
			return wp_kses_post( wpautop( get_the_excerpt( $post ) ) );
		}

		if ( null === $slug ) {
			// No pattern in the theme: a plain link, so the loop still works.
			return sprintf( '<a href="%s">%s</a>', esc_url( get_permalink( $post ) ), esc_html( get_the_title( $post ) ) );
		}

		$key = "{$slug}:post:{$post->ID}";

		if ( isset( self::$rendering[ $key ] ) ) {
			return '';
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

		$html = self::render_pattern( $slug, $context, $key );

		if ( $is_other_post ) {
			$GLOBALS['post'] = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restoring.

			if ( $previous_post instanceof \WP_Post ) {
				setup_postdata( $previous_post );
			}
		}

		return $html;
	}

	/**
	 * The rendered loop item for a term.
	 *
	 * @param int    $term_id  Term ID.
	 * @param string $taxonomy Its taxonomy (looked up when empty).
	 * @param string $block    The block the Terms Query is shown as
	 *                         (carousel); empty for none.
	 * @return string Empty when there's no such term, or its taxonomy isn't viewable.
	 */
	public static function render_term( int $term_id, string $taxonomy = '', string $block = '' ): string {
		$term = self::term( $term_id, $taxonomy );

		if ( null === $term ) {
			return '';
		}

		$block = QueryDisplay::supports( $block, QueryDisplay::TERMS ) ? $block : '';
		$slug  = self::term_pattern( $term->taxonomy, $block );

		if ( null === $slug ) {
			// No pattern in the theme: a plain link, so the list still works.
			$link = get_term_link( $term );

			return is_wp_error( $link )
				? esc_html( $term->name )
				: sprintf( '<a href="%s">%s</a>', esc_url( $link ), esc_html( $term->name ) );
		}

		$key = "{$slug}:term:{$term->term_id}";

		if ( isset( self::$rendering[ $key ] ) ) {
			return '';
		}

		return self::render_pattern(
			$slug,
			[
				'termId'   => $term->term_id,
				'taxonomy' => $term->taxonomy,
			],
			$key
		);
	}

	/**
	 * Render a pattern's blocks with an item's context.
	 *
	 * @param string $slug    Pattern slug.
	 * @param array  $context Block context.
	 * @param string $key     The pattern and item (`pulsar/loop-item:post:12`).
	 * @return string
	 */
	private static function render_pattern( string $slug, array $context, string $key ): string {
		self::$rendering[ $key ] = true;

		$html = '';

		foreach ( self::blocks( $slug ) as $parsed ) {
			$html .= ( new WP_Block( $parsed, $context ) )->render();
		}

		unset( self::$rendering[ $key ] );

		return $html;
	}

	/**
	 * The loop item pattern for a post type, in a block if any (see the
	 * hierarchy above), in the theme's namespace (`matter_theme_namespace`),
	 * most specific first at each step.
	 *
	 * @param string $post_type Post type.
	 * @param string $block     The block the item's query is shown as; empty for none.
	 * @return string|null Pattern slug, or null when the theme has none.
	 */
	public static function pattern( string $post_type, string $block = '' ): ?string {
		$registry = WP_Block_Patterns_Registry::get_instance();
		$names    = [ "loop-item-{$post_type}", 'loop-item' ];

		if ( isset( QueryDisplay::TYPES[ $block ] ) ) {
			$names = QueryDisplay::TYPES[ $block ]['cards']
				? [ "loop-item-{$post_type}-{$block}", "loop-item-{$post_type}", "loop-item-{$block}", 'loop-item' ]
				: [ "loop-item-{$post_type}-{$block}", "loop-item-{$block}" ];
		}

		$slug = self::first_registered( $names );

		/**
		 * Filters the pattern used as the loop item for a post type.
		 *
		 * @param string|null $slug      Pattern slug, or null for none.
		 * @param string      $post_type Post type.
		 * @param string      $block     The block the item's query is shown as
		 *                               (carousel, accordion or tabs); empty for none.
		 */
		$slug = apply_filters( 'matter_loop_item_pattern', $slug, $post_type, $block );

		return is_string( $slug ) && $registry->is_registered( $slug ) ? $slug : null;
	}

	/**
	 * The loop item pattern for a taxonomy's terms, in a block if any
	 * (carousel), in the theme's namespace, most specific first at each step:
	 * `loop-item-term-{taxonomy}`, `loop-item-term`, and in a carousel the
	 * `-carousel` one before each, as for posts.
	 *
	 * @param string $taxonomy Taxonomy.
	 * @param string $block    The block the Terms Query is shown as; empty for none.
	 * @return string|null Pattern slug, or null when the theme has none.
	 */
	public static function term_pattern( string $taxonomy, string $block = '' ): ?string {
		$block = QueryDisplay::supports( $block, QueryDisplay::TERMS ) ? $block : '';
		$names = '' !== $block
			? [ "loop-item-term-{$taxonomy}-{$block}", "loop-item-term-{$taxonomy}", "loop-item-term-{$block}", 'loop-item-term' ]
			: [ "loop-item-term-{$taxonomy}", 'loop-item-term' ];

		/**
		 * Filters the pattern used as the loop item for a taxonomy's terms.
		 *
		 * @param string|null $slug     Pattern slug, or null for none.
		 * @param string      $taxonomy Taxonomy.
		 * @param string      $block    The block the Terms Query is shown as
		 *                              (carousel); empty for none.
		 */
		$slug = apply_filters( 'matter_loop_item_term_pattern', self::first_registered( $names ), $taxonomy, $block );

		return is_string( $slug ) && WP_Block_Patterns_Registry::get_instance()->is_registered( $slug ) ? $slug : null;
	}

	/**
	 * The first of these pattern names registered in the theme's namespace
	 * (a child theme's first at each step).
	 *
	 * @param string[] $names Pattern names, most specific first.
	 * @return string|null Pattern slug.
	 */
	private static function first_registered( array $names ): ?string {
		$registry = WP_Block_Patterns_Registry::get_instance();
		$themes   = \Eighteen73\Matter\theme_namespaces();

		foreach ( $names as $name ) {
			foreach ( $themes as $theme ) {
				if ( $registry->is_registered( "{$theme}/{$name}" ) ) {
					return "{$theme}/{$name}";
				}
			}
		}

		return null;
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
