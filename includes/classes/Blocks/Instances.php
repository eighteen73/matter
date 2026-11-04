<?php
/**
 * Tracks container blocks (accordion, tabs) while they render.
 *
 * WordPress renders inner blocks before their parent's render callback, so a
 * container can't hand data down through attributes. Instead, each container
 * gets an ID when it starts rendering (render_block_data) and is popped when it
 * finishes (render_block). Children read the current container and record
 * themselves (title, ID, default state), and the container's render callback
 * then reads what its children recorded — e.g. to build a tab list or FAQ
 * schema. This also works inside Query Loops, where core renders each post's
 * blocks in a fresh block instance with only post context.
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
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_data', [ $this, 'start' ] );
		add_filter( 'render_block', [ $this, 'finish' ], 10, 2 );
	}

	/**
	 * A container is about to render its children.
	 *
	 * @param array $parsed_block Parsed block.
	 * @return array
	 */
	public function start( array $parsed_block ): array {
		$name = $parsed_block['blockName'] ?? '';

		if ( in_array( $name, self::CONTAINERS, true ) ) {
			$anchor = sanitize_html_class( (string) ( $parsed_block['attrs']['anchor'] ?? '' ) );
			$id     = '' !== $anchor ? $anchor : wp_unique_id( str_replace( 'matter/', '', $name ) . '-' );

			self::$stack[ $name ][] = $id;
			self::$items[ $id ]     = [];
		}

		return $parsed_block;
	}

	/**
	 * A container has finished rendering.
	 *
	 * @param string $block_content Rendered block.
	 * @param array  $parsed_block  Parsed block.
	 * @return string
	 */
	public function finish( string $block_content, array $parsed_block ): string {
		$name = $parsed_block['blockName'] ?? '';

		if ( in_array( $name, self::CONTAINERS, true ) && ! empty( self::$stack[ $name ] ) ) {
			unset( self::$items[ (string) array_pop( self::$stack[ $name ] ) ] );
		}

		return $block_content;
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
