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
 * It also tracks whether a Query Loop's post template is rendering, so blocks
 * can tell a per-post render from the page's own post context.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

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
	 * Blocks that render their children once per post of a query.
	 */
	private const LOOPS = [ 'core/post-template', 'woocommerce/product-template' ];

	/**
	 * Depth of query loop templates currently rendering.
	 *
	 * @var int
	 */
	private static int $loop_depth = 0;

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
		if ( in_array( $parsed_block['blockName'] ?? '', self::LOOPS, true ) ) {
			++self::$loop_depth;
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

		$anchor = sanitize_html_class( (string) ( $parent_block->attributes['anchor'] ?? '' ) );
		$id     = '' !== $anchor ? $anchor : wp_unique_id( str_replace( 'matter/', '', $name ) . '-' );

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
		if ( in_array( $parsed_block['blockName'] ?? '', self::LOOPS, true ) ) {
			self::$loop_depth = max( 0, self::$loop_depth - 1 );
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
		return self::$loop_depth > 0;
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
	 * Record a child of the current container.
	 *
	 * @param string $name Container block name.
	 * @param array  $item Item data.
	 * @return int The item's position (1-based), or 0 outside a container.
	 */
	public static function add( string $name, array $item ): int {
		$id = self::current( $name );

		if ( null === $id ) {
			return 0;
		}

		self::$items[ $id ][] = $item;

		return count( self::$items[ $id ] );
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
}
