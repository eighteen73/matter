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
 * In a block in a variant other than its default, a pattern for that variant
 * comes before each block pattern: `loop-item-{post_type}-carousel-{variant}`
 * before `loop-item-{post_type}-carousel`, `loop-item-carousel-{variant}`
 * before `loop-item-carousel`.
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

use Eighteen73\Matter\Archives\Archives;
use Eighteen73\Matter\Live\Live;
use Eighteen73\Matter\LoopItems\Prerendered;
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
	 * Loop item patterns rendered this request, by slug: once one has, its
	 * blocks' styles, scripts and stores are loaded, so later items can be
	 * prerendered copies (see from_prerendered()).
	 *
	 * @var array<string, true>
	 */
	private static array $rendered = [];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'rest_api_init', [ $this, 'register_route' ] );
	}

	/**
	 * `GET matter/v1/loop-items?ids[]=…&block=…&variant=…`: rendered items by
	 * ID (in a query shown as that block, in that variant, if any), for the
	 * editor's previews; and `GET matter/v1/loop-items/terms?ids[]=…&block=…`
	 * (and `variant`) for terms (in a Terms Query shown as a carousel, if any).
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

		$variant = [
			'type'              => 'string',
			'default'           => '',
			'sanitize_callback' => 'sanitize_key',
		];

		register_rest_route(
			'matter/v1',
			'/loop-items',
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'previews' ],
				'permission_callback' => fn() => current_user_can( 'edit_posts' ),
				'args'                => [
					'ids'     => $ids,
					'block'   => [
						'type'    => 'string',
						'default' => '',
						'enum'    => array_merge( [ '' ], array_keys( QueryDisplay::TYPES ) ),
					],
					'variant' => $variant,
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
					'ids'     => $ids,
					'block'   => [
						'type'    => 'string',
						'default' => '',
						'enum'    => array_merge( [ '' ], self::term_blocks() ),
					],
					'variant' => $variant,
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
		$variant  = (string) $request['variant'];

		foreach ( array_unique( array_map( 'intval', (array) $request['ids'] ) ) as $id ) {
			if ( self::can_preview( $id ) ) {
				$previews[] = [
					'id'   => $id,
					'html' => self::render( $id, '', $block, $variant ),
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
		$variant  = (string) $request['variant'];

		foreach ( array_unique( array_map( 'intval', (array) $request['ids'] ) ) as $id ) {
			if ( self::can_preview_term( $id ) ) {
				$previews[] = [
					'id'   => $id,
					'html' => self::render_term( $id, '', $block, $variant ),
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

		// Not archive entries (their titles and excerpts are for editors), nor
		// protected posts, which the preview would show to anyone who may read.
		return $type
			&& Archives::POST_TYPE !== $type
			&& '' === (string) get_post_field( 'post_password', $post_id )
			&& is_post_type_viewable( $type )
			&& current_user_can( 'read_post', $post_id );
	}

	/**
	 * The rendered loop item for an item.
	 *
	 * @param int    $post_id   Item ID.
	 * @param string $post_type Item post type (looked up when empty).
	 * @param string $block     The block the item's query is shown as
	 *                          (carousel, accordion or tabs); empty for none.
	 * @param string $variant   That block's variant; empty for its default.
	 * @return string Empty when there's no item.
	 */
	public static function render( int $post_id, string $post_type = '', string $block = '', string $variant = '' ): string {
		$post = get_post( $post_id );

		if ( ! $post ) {
			return '';
		}

		$post_type = $post_type ?: $post->post_type;
		$block     = isset( QueryDisplay::TYPES[ $block ] ) ? $block : '';
		$slug      = self::pattern( $post_type, $block, $variant );

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
		// In a plain loop, a copy prerendered ahead (a search index's), when a
		// plugin has one.
		if ( '' === $block ) {
			$prerendered = self::from_prerendered( $post, $slug );

			if ( null !== $prerendered ) {
				return $prerendered;
			}
		}

		$previous_post = $GLOBALS['post'] ?? null;
		$is_other_post = ! $previous_post instanceof \WP_Post || $previous_post->ID !== $post->ID;

		if ( $is_other_post ) {
			$GLOBALS['post'] = $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restored below.
			setup_postdata( $post );
		}

		// In a plain loop, live blocks (a price) can be placeholders, filled
		// with the visitor's own (Live\Live).
		$html = '' === $block
			? Live::item( $post->ID, fn() => self::render_pattern( $slug, $context, $key ) )
			: self::render_pattern( $slug, $context, $key );

		self::$rendered[ $slug ] = true;

		if ( $is_other_post ) {
			$GLOBALS['post'] = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restoring.

			if ( $previous_post instanceof \WP_Post ) {
				setup_postdata( $previous_post );
			}
		}

		return $html;
	}

	/**
	 * A post's loop item from a copy prerendered ahead (LoopItems\Prerendered),
	 * when a plugin offers one (`matter_loop_item_prerendered`; Seek, from the
	 * search result's document), instead of rendering its pattern: its live
	 * blocks (a price) are filled in, rendered now for this visitor (or left
	 * as placeholders, see Live::placeholders_on_pages()), and the state its
	 * blocks set is added to the page's. Rendering only those is most of the
	 * work of a listing saved.
	 *
	 * Not when the copy is older than the pattern (its version differs), not
	 * while prerendering or capturing, and not for the first item of each
	 * pattern on a page, which renders so its blocks' styles, scripts and
	 * stores load.
	 *
	 * @param \WP_Post $post Post.
	 * @param string   $slug Its loop item pattern.
	 * @return string|null
	 */
	private static function from_prerendered( \WP_Post $post, string $slug ): ?string {
		if ( 'render' !== Live::mode() || ! isset( self::$rendered[ $slug ] ) ) {
			return null;
		}

		/**
		 * Filters a post's prerendered loop item, to show in place of rendering
		 * it: as Prerendered::render() returns it (`html`, `data` and
		 * `version`), or null to render it.
		 *
		 * @param array|null $item Prerendered loop item.
		 * @param \WP_Post   $post Post.
		 */
		$item = apply_filters( 'matter_loop_item_prerendered', null, $post );

		if ( ! is_array( $item ) || ! is_string( $item['html'] ?? null ) || ( $item['version'] ?? '' ) !== Prerendered::version( $post->post_type ) ) {
			return null;
		}

		$html = $item['html'];

		if ( Live::placeholders_on_pages() ) {
			Live::expect();
		} else {
			$html = Live::fill( $post->ID, $html );

			if ( null === $html ) {
				return null;
			}
		}

		foreach ( (array) ( $item['data']['state'] ?? [] ) as $namespace => $state ) {
			wp_interactivity_state( (string) $namespace, (array) $state );
		}

		foreach ( (array) ( $item['data']['config'] ?? [] ) as $namespace => $config ) {
			wp_interactivity_config( (string) $namespace, (array) $config );
		}

		return $html;
	}

	/**
	 * Render only a post's loop item's live blocks (Live\Live), as render()
	 * would: in the same order, with the context and global post they'd have,
	 * so they're captured and numbered as the item's placeholders are. The
	 * rest of the item (images, titles, buttons, the groups around them) isn't
	 * rendered, which is most of the work of rendering it.
	 *
	 * A block whose output can hold blocks its parsed tree doesn't show (a
	 * pattern, a template part) is rendered whole, so any live blocks it adds
	 * are captured in order; see sources().
	 *
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public static function render_live( int $post_id ): void {
		$post = get_post( $post_id );
		$slug = $post ? self::pattern( $post->post_type ) : null;

		if ( null === $slug ) {
			return;
		}

		$key = "{$slug}:post:{$post->ID}";

		if ( isset( self::$rendering[ $key ] ) ) {
			return;
		}

		$context = [
			'postId'   => $post->ID,
			'postType' => $post->post_type,
		];
		$live    = Live::blocks();

		$previous_post = $GLOBALS['post'] ?? null;
		$is_other_post = ! $previous_post instanceof \WP_Post || $previous_post->ID !== $post->ID;

		if ( $is_other_post ) {
			$GLOBALS['post'] = $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restored below.
			setup_postdata( $post );
		}

		self::$rendering[ $key ] = true;

		try {
			Live::item(
				$post->ID,
				function () use ( $slug, $context, $live ) {
					foreach ( self::blocks( $slug ) as $parsed ) {
						// As render_pattern() renders them: no render filters before.
						$block = new WP_Block( $parsed, $context );

						if ( self::renders_for_live( $block, $live ) ) {
							$block->render();
						} else {
							self::live_inside( $block, $live );
						}
					}
				}
			);
		} finally {
			unset( self::$rendering[ $key ] );

			if ( $is_other_post ) {
				$GLOBALS['post'] = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restoring.

				if ( $previous_post instanceof \WP_Post ) {
					setup_postdata( $previous_post );
				}
			}
		}
	}

	/**
	 * Render the live blocks inside a block that isn't rendered itself, each
	 * through the filters WP_Block::render() runs on an inner block.
	 *
	 * @param WP_Block $parent_block Block.
	 * @param string[] $live         Live block names.
	 * @return void
	 */
	private static function live_inside( WP_Block $parent_block, array $live ): void {
		// Nothing inside that renders, or could add, a live block.
		if ( ! self::contains( $parent_block->parsed_block, array_merge( $live, self::sources() ) ) ) {
			return;
		}

		foreach ( $parent_block->inner_blocks as $inner ) {
			if ( ! self::renders_for_live( $inner, $live ) ) {
				self::live_inside( $inner, $live );
				continue;
			}

			/** This filter is documented in wp-includes/blocks.php */
			if ( null !== apply_filters( 'pre_render_block', null, $inner->parsed_block, $parent_block ) ) {
				continue;
			}

			$source  = $inner->parsed_block;
			$context = $inner->context;

			/** This filter is documented in wp-includes/blocks.php */
			$inner->parsed_block = apply_filters( 'render_block_data', $inner->parsed_block, $source, $parent_block );
			/** This filter is documented in wp-includes/blocks.php */
			$inner->context = apply_filters( 'render_block_context', $inner->context, $inner->parsed_block, $parent_block );

			if ( $inner->context !== $context ) {
				$inner->refresh_context_dependents();
			} elseif ( $inner->parsed_block !== $source ) {
				$inner->refresh_parsed_block_dependents();
			}

			$inner->render();
		}
	}

	/**
	 * Whether a block is rendered when only live blocks are: a live block,
	 * or one whose output can hold live blocks the walk can't see.
	 *
	 * @param WP_Block $block Block.
	 * @param string[] $live  Live block names.
	 * @return bool
	 */
	private static function renders_for_live( WP_Block $block, array $live ): bool {
		if ( in_array( $block->name, $live, true ) ) {
			return true;
		}

		// It renders its inner blocks itself, so they can't be walked.
		if ( ! empty( $block->block_type->skip_inner_blocks ) && self::contains( $block->parsed_block, array_merge( $live, self::sources() ) ) ) {
			return true;
		}

		return in_array( $block->name, self::sources(), true );
	}

	/**
	 * Blocks whose output can hold blocks that aren't in their parsed tree.
	 *
	 * @return string[]
	 */
	private static function sources(): array {
		/**
		 * Filters the blocks whose output can hold blocks their parsed tree
		 * doesn't show (rendering a pattern, a template part or a post's
		 * content), which are rendered whole when a loop item's live blocks are
		 * rendered on their own.
		 *
		 * @param string[] $names Block names.
		 */
		return (array) apply_filters(
			'matter_live_block_sources',
			[ 'core/block', 'core/pattern', 'core/template-part', 'core/post-content', 'matter/template-part', 'matter/loop-item' ]
		);
	}

	/**
	 * Whether a parsed block, or any block inside it, is one of these.
	 *
	 * @param array    $parsed Parsed block.
	 * @param string[] $names  Block names.
	 * @return bool
	 */
	private static function contains( array $parsed, array $names ): bool {
		if ( in_array( $parsed['blockName'] ?? '', $names, true ) ) {
			return true;
		}

		foreach ( (array) ( $parsed['innerBlocks'] ?? [] ) as $inner ) {
			if ( self::contains( $inner, $names ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * The rendered loop item for a term.
	 *
	 * @param int    $term_id  Term ID.
	 * @param string $taxonomy Its taxonomy (looked up when empty).
	 * @param string $block    The block the Terms Query is shown as
	 *                         (carousel); empty for none.
	 * @param string $variant  That block's variant; empty for its default.
	 * @return string Empty when there's no such term, or its taxonomy isn't viewable.
	 */
	public static function render_term( int $term_id, string $taxonomy = '', string $block = '', string $variant = '' ): string {
		$term = self::term( $term_id, $taxonomy );

		if ( null === $term ) {
			return '';
		}

		$block = QueryDisplay::supports( $block, QueryDisplay::TERMS ) ? $block : '';
		$slug  = self::term_pattern( $term->taxonomy, $block, $variant );

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
	 * hierarchy above), in the theme's namespace (`matter_theme_namespaces`),
	 * most specific first at each step.
	 *
	 * @param string $post_type Post type.
	 * @param string $block     The block the item's query is shown as; empty for none.
	 * @param string $variant   That block's variant; empty for its default.
	 * @return string|null Pattern slug, or null when the theme has none.
	 */
	public static function pattern( string $post_type, string $block = '', string $variant = '' ): ?string {
		$registry = WP_Block_Patterns_Registry::get_instance();
		$names    = [ "loop-item-{$post_type}", 'loop-item' ];
		$block    = isset( QueryDisplay::TYPES[ $block ] ) ? $block : '';
		$variant  = '' !== $block ? self::variant( $variant ) : '';

		if ( '' !== $block ) {
			$names = QueryDisplay::TYPES[ $block ]['cards']
				? [ "loop-item-{$post_type}-{$block}", "loop-item-{$post_type}", "loop-item-{$block}", 'loop-item' ]
				: [ "loop-item-{$post_type}-{$block}", "loop-item-{$block}" ];
		}

		$slug = self::first_registered( self::with_variant( $names, $block, $variant ) );

		/**
		 * Filters the pattern used as the loop item for a post type.
		 *
		 * @param string|null $slug      Pattern slug, or null for none.
		 * @param string      $post_type Post type.
		 * @param string      $block     The block the item's query is shown as
		 *                               (carousel, accordion or tabs); empty for none.
		 * @param string      $variant   That block's variant; empty for its default.
		 */
		$slug = apply_filters( 'matter_loop_item_pattern', $slug, $post_type, $block, $variant );

		return is_string( $slug ) && $registry->is_registered( $slug ) ? $slug : null;
	}

	/**
	 * The loop item pattern for a taxonomy's terms, in a block if any
	 * (carousel), in the theme's namespace, most specific first at each step:
	 * `loop-item-term-{taxonomy}`, `loop-item-term`, and in a carousel the
	 * `-carousel` one before each (and its variant's before that), as for posts.
	 *
	 * @param string $taxonomy Taxonomy.
	 * @param string $block    The block the Terms Query is shown as; empty for none.
	 * @param string $variant  That block's variant; empty for its default.
	 * @return string|null Pattern slug, or null when the theme has none.
	 */
	public static function term_pattern( string $taxonomy, string $block = '', string $variant = '' ): ?string {
		$block   = QueryDisplay::supports( $block, QueryDisplay::TERMS ) ? $block : '';
		$variant = '' !== $block ? self::variant( $variant ) : '';
		$names   = '' !== $block
			? [ "loop-item-term-{$taxonomy}-{$block}", "loop-item-term-{$taxonomy}", "loop-item-term-{$block}", 'loop-item-term' ]
			: [ "loop-item-term-{$taxonomy}", 'loop-item-term' ];

		/**
		 * Filters the pattern used as the loop item for a taxonomy's terms.
		 *
		 * @param string|null $slug     Pattern slug, or null for none.
		 * @param string      $taxonomy Taxonomy.
		 * @param string      $block    The block the Terms Query is shown as
		 *                              (carousel); empty for none.
		 * @param string      $variant  That block's variant; empty for its default.
		 */
		$slug = apply_filters( 'matter_loop_item_term_pattern', self::first_registered( self::with_variant( $names, $block, $variant ) ), $taxonomy, $block, $variant );

		return is_string( $slug ) && WP_Block_Patterns_Registry::get_instance()->is_registered( $slug ) ? $slug : null;
	}

	/**
	 * A block's variant as it names patterns: empty for the default.
	 *
	 * @param string $variant Variant slug.
	 * @return string
	 */
	private static function variant( string $variant ): string {
		$variant = sanitize_key( $variant );

		return 'default' === $variant ? '' : $variant;
	}

	/**
	 * Pattern names with the variant's before each of the block's
	 * (`loop-item-carousel-cards` before `loop-item-carousel`).
	 *
	 * @param string[] $names   Pattern names, most specific first.
	 * @param string   $block   The block; empty for none.
	 * @param string   $variant Its variant; empty for the default.
	 * @return string[]
	 */
	private static function with_variant( array $names, string $block, string $variant ): array {
		if ( '' === $block || '' === $variant ) {
			return $names;
		}

		$expanded = [];

		foreach ( $names as $name ) {
			if ( str_ends_with( $name, "-{$block}" ) ) {
				$expanded[] = "{$name}-{$variant}";
			}

			$expanded[] = $name;
		}

		return $expanded;
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
