<?php
/**
 * Tracks container blocks (accordion, tabs) while they render.
 *
 * WordPress renders inner blocks before their parent's render callback, so a
 * container can't hand data down through attributes. Instead, a container is
 * started when its first child begins rendering (render_block_data receives the
 * parent block) and finished after it renders (render_block). Children read the
 * current container and record themselves (title, ID, default state), and the
 * container's render callback reads what they recorded — e.g. to build a tab
 * list or FAQ schema.
 *
 * Keying on the parent block object (rather than the container's own
 * render_block_data) means this works however the container is rendered:
 * render_block(), Query Loops (fresh block instances per post) and blocks such
 * as WooCommerce's product details that construct WP_Block directly.
 *
 * A Query Loop shown as an accordion or tabs (QueryDisplay) is that container
 * too, with its display settings standing in for the block's attributes.
 *
 * It also tracks the loop templates rendering (a Query Loop's post template,
 * a Terms Query's term template), so blocks can tell a per-post render from
 * the page's own post context, and a term's from a post's.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Ids;
use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Tracks container blocks while they render.
 */
class Instances {

	use Singleton;

	/**
	 * Container blocks that are tracked.
	 */
	private const CONTAINERS = [ 'matter/accordion', 'matter/tabs' ];

	/**
	 * The class on every loop template's list (a Query Loop's post template,
	 * a Terms Query's term template, and any an integration adds).
	 */
	public const LIST_CLASS = 'matter-query-list';

	/**
	 * Core's blocks that render their children once per item of a query, and
	 * what the items are. Integrations add theirs (see loops()).
	 */
	private const LOOPS = [
		'core/post-template' => 'post',
		'core/term-template' => 'term',
	];

	/**
	 * What the loop templates currently rendering list (innermost last).
	 *
	 * @var string[]
	 */
	private static array $loops = [];

	/**
	 * IDs of containers currently rendering, per block name (innermost last).
	 *
	 * @var array<string, string[]>
	 */
	private static array $stack = [];

	/**
	 * Items recorded by children, keyed by container ID.
	 *
	 * @var array<string, array<int, array<string, mixed>>>
	 */
	private static array $items = [];

	/**
	 * Settings (attributes) of each container, keyed by container ID.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	private static array $settings = [];

	/**
	 * Started containers: block object ID => [ container ID, container name ].
	 *
	 * @var array<int, array{0: string, 1: string}>
	 */
	private static array $active = [];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_data', [ $this, 'start' ], 10, 3 );
		add_filter( 'render_block', [ $this, 'finish' ], 10, 3 );
	}

	/**
	 * A block is about to render: start its parent if that's an unstarted container.
	 *
	 * @param array          $parsed_block Parsed block about to render.
	 * @param array          $source_block Original parsed block.
	 * @param \WP_Block|null $parent_block Parent block instance.
	 * @return array
	 */
	public function start( array $parsed_block, array $source_block = [], ?\WP_Block $parent_block = null ): array { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundBeforeLastUsed -- Filter signature.
		$loop = self::loops()[ $parsed_block['blockName'] ?? '' ] ?? null;

		if ( null !== $loop ) {
			self::$loops[] = $loop;
		}

		if ( null === $parent_block ) {
			return $parsed_block;
		}

		$key = spl_object_id( $parent_block );

		if ( isset( self::$active[ $key ] ) ) {
			return $parsed_block;
		}

		$container = self::container( $parent_block );

		if ( null === $container ) {
			return $parsed_block;
		}

		[ $name, $settings ] = $container;

		// The client's HTML anchor, else the ID Matter gave the block when it
		// was added (kept out of the anchor, which the editor shows).
		$anchor = sanitize_html_class( (string) ( $parent_block->attributes['anchor'] ?? '' ) );
		$anchor = '' !== $anchor ? $anchor : sanitize_html_class( (string) ( $parent_block->attributes['matterId'] ?? '' ) );
		$id     = '' !== $anchor ? $anchor : wp_unique_id( str_replace( 'matter/', '', $name ) . '-' );

		// Claimed before any item derives its own ID from it, so a container
		// rendered twice (a synced pattern used twice) keeps every ID unique.
		$id = Ids::claim( $id );

		self::$active[ $key ]   = [ $id, $name ];
		self::$stack[ $name ][] = $id;
		self::$items[ $id ]     = [];
		self::$settings[ $id ]  = $settings;

		return $parsed_block;
	}

	/**
	 * A block has finished rendering: finish it if it's a started container.
	 *
	 * @param string         $block_content Rendered block.
	 * @param array          $parsed_block  Parsed block.
	 * @param \WP_Block|null $instance      Block instance.
	 * @return string
	 */
	public function finish( string $block_content, array $parsed_block, ?\WP_Block $instance = null ): string { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundBeforeLastUsed -- Filter signature.
		if ( isset( self::loops()[ $parsed_block['blockName'] ?? '' ] ) ) {
			array_pop( self::$loops );
			$block_content = self::mark_list( $block_content );
		}

		$key = null !== $instance ? spl_object_id( $instance ) : null;

		if ( null !== $key && isset( self::$active[ $key ] ) ) {
			[ $id, $name ] = self::$active[ $key ];

			array_pop( self::$stack[ $name ] );
			unset( self::$items[ $id ], self::$settings[ $id ], self::$active[ $key ] );
		}

		return $block_content;
	}

	/**
	 * Mark a loop template's list (its first element) with LIST_CLASS, so
	 * blocks around a query (a carousel, an accordion) find its items by one
	 * class, whichever block listed them.
	 *
	 * @param string $html Rendered loop template.
	 * @return string
	 */
	private static function mark_list( string $html ): string {
		if ( '' === trim( $html ) ) {
			return $html;
		}

		$processor = new \WP_HTML_Tag_Processor( $html );

		if ( ! $processor->next_tag() ) {
			return $html;
		}

		$processor->add_class( self::LIST_CLASS );

		return $processor->get_updated_html();
	}

	/**
	 * Blocks that render their children once per item of a query (a loop
	 * template), and what the items are: `post` or `term`.
	 *
	 * @return array<string, string> Block name => `post` or `term`.
	 */
	public static function loops(): array {
		/**
		 * Filters the loop templates: blocks that render their children once
		 * per item of a query, and whether the items are posts or terms. The
		 * WooCommerce integration adds the Product Collection's product template.
		 *
		 * @param array<string, string> $loops Block name => `post` or `term`.
		 */
		$loops = (array) apply_filters( 'matter_query_loops', self::LOOPS );

		return array_filter( $loops, fn( $kind ) => in_array( $kind, [ 'post', 'term' ], true ) );
	}

	/**
	 * The container a block is, if any: its name and settings.
	 *
	 * @param \WP_Block $block Block instance.
	 * @return array{0: string, 1: array}|null
	 */
	private static function container( \WP_Block $block ): ?array {
		if ( in_array( $block->name, self::CONTAINERS, true ) ) {
			return [ $block->name, $block->attributes ];
		}

		$display = QueryDisplay::of( $block->name, $block->attributes );

		return null !== $display && in_array( $display['block'], self::CONTAINERS, true )
			? [ $display['block'], $display['attributes'] ]
			: null;
	}

	/**
	 * Settings of the innermost container of a type currently rendering.
	 *
	 * @param string $name Container block name.
	 * @return array|null
	 */
	public static function settings( string $name ): ?array {
		$id = self::current( $name );

		return null !== $id ? ( self::$settings[ $id ] ?? [] ) : null;
	}

	/**
	 * Whether a Query Loop's post template is rendering (so `postId` context is
	 * a loop item rather than the page's own post).
	 *
	 * @return bool
	 */
	public static function in_query_loop(): bool {
		return in_array( 'post', self::$loops, true );
	}

	/**
	 * What the innermost loop template rendering lists: a Query Loop's posts
	 * or a Terms Query's terms.
	 *
	 * @return string `post`, `term`, or empty outside a loop.
	 */
	public static function loop(): string {
		return (string) end( self::$loops );
	}

	/**
	 * ID of the innermost container of a type currently rendering.
	 *
	 * @param string $name Container block name.
	 * @return string|null
	 */
	public static function current( string $name ): ?string {
		$stack = self::$stack[ $name ] ?? [];

		return $stack ? (string) end( $stack ) : null;
	}

	/**
	 * Record a child of the current container, and give it its ID: the one
	 * it asks for (`id`, a post's item), else `{container}-{position}`, made
	 * unique on the page. (A container rendered twice is `tabs-2`, and its
	 * own second item `tabs-2` too, so item IDs are claimed as well.)
	 *
	 * @param string $name Container block name.
	 * @param array  $item Item data.
	 * @return string The item's ID, or empty outside a container.
	 */
	public static function add( string $name, array $item ): string {
		$container = self::current( $name );

		if ( null === $container ) {
			return '';
		}

		$wanted     = (string) ( $item['id'] ?? '' );
		$wanted     = '' !== $wanted ? $wanted : $container . '-' . ( count( self::$items[ $container ] ) + 1 );
		$item['id'] = Ids::claim( $wanted );

		self::$items[ $container ][] = $item;

		return $item['id'];
	}

	/**
	 * Items recorded for the current container.
	 *
	 * @param string $name Container block name.
	 * @return array<int, array<string, mixed>>
	 */
	public static function items( string $name ): array {
		$id = self::current( $name );

		return null !== $id ? ( self::$items[ $id ] ?? [] ) : [];
	}

	/**
	 * Whether an item's rendered content has nothing to show: no text, media
	 * or form controls (e.g. a product's specifications when it has none, or
	 * blocks that render nothing). Such accordion items and tabs aren't output.
	 *
	 * @param string $content Rendered inner blocks.
	 * @return bool
	 */
	public static function is_empty( string $content ): bool {
		return '' === trim( wp_strip_all_tags( $content ) )
			&& ! preg_match( '/<(img|picture|video|audio|iframe|svg|canvas|object|embed|form|input|select|textarea|button)\b/i', $content );
	}
}
