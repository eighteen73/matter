<?php
/**
 * Shared overlay block helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Provides shared ID resolution for overlay blocks.
 */
class Overlay {
	use Singleton;

	/**
	 * Overlay block metadata keyed by block name.
	 *
	 * @var array<string, array{context: string, prefix: string}>
	 */
	private const BLOCKS = [
		'matter/modal'       => [
			'context' => 'matter/modal-id',
			'prefix'  => 'matter-modal-',
		],
		'matter/drawer'      => [
			'context' => 'matter/drawer-id',
			'prefix'  => 'matter-drawer-',
		],
		'matter/collapsible' => [
			'context' => 'matter/collapsible-id',
			'prefix'  => 'matter-collapsible-',
		],
	];

	/**
	 * Setup overlay block hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_context', [ $this, 'provide_context' ], 10, 3 );
	}

	/**
	 * Resolve an overlay ID from attributes and optional block context.
	 *
	 * @param array<string, mixed> $attributes      Block attributes.
	 * @param array<string, mixed> $context         Block context.
	 * @param string               $fallback_prefix Prefix for generated fallback IDs.
	 * @return string
	 */
	public static function resolve_id( array $attributes, array $context = [], string $fallback_prefix = 'matter-overlay-' ): string {
		return BlockId::resolve_id( $attributes, $context, $fallback_prefix );
	}

	/**
	 * Provide computed overlay IDs to descendant blocks during server rendering.
	 *
	 * Overlay IDs are computed from anchor / generatedId (and legacy targetId),
	 * so they cannot be mapped via providesContext alone. Setting the value on
	 * the overlay block context lets WordPress refresh descendants with it.
	 *
	 * @param array<string, mixed> $context      Default block context.
	 * @param array<string, mixed> $parsed_block The block being rendered.
	 * @param \WP_Block|null       $parent_block Parent block instance.
	 * @return array<string, mixed>
	 */
	public function provide_context( array $context, array $parsed_block, $parent_block = null ): array {
		$block_name = $parsed_block['blockName'] ?? '';

		$context = Context::provide( $context, $parent_block );

		if ( is_string( $block_name ) && isset( self::BLOCKS[ $block_name ] ) ) {
			$block_config = self::BLOCKS[ $block_name ];
			$attributes   = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] )
				? $parsed_block['attrs']
				: [];

			$context[ $block_config['context'] ] = self::resolve_id(
				$attributes,
				$context,
				$block_config['prefix']
			);
		}

		foreach ( self::get_context_keys() as $context_key ) {
			if ( empty( $context[ $context_key ] ) ) {
				continue;
			}

			$context[ $context_key ] = BlockId::resolve_contextual_id(
				(string) $context[ $context_key ],
				$context
			);
		}

		return $context;
	}

	/**
	 * Resolve the saved base ID from block attributes.
	 *
	 * @param array<string, mixed> $attributes      Block attributes.
	 * @param string               $fallback_prefix Prefix for generated fallback IDs.
	 * @return string
	 */
	public static function resolve_base_id( array $attributes, string $fallback_prefix ): string {
		return BlockId::resolve_base_id( $attributes, $fallback_prefix );
	}

	/**
	 * Whether the current block context represents a Query Loop post iteration.
	 *
	 * @param array<string, mixed> $context Block context.
	 * @return bool
	 */
	public static function is_query_loop_context( array $context ): bool {
		return BlockId::is_query_loop_context( $context );
	}

	/**
	 * Resolve a query-loop-specific ID when post template context is present.
	 *
	 * @param string               $base_id Overlay base ID.
	 * @param array<string, mixed> $context Block context.
	 * @return string
	 */
	public static function resolve_contextual_id( string $base_id, array $context ): string {
		return BlockId::resolve_contextual_id( $base_id, $context );
	}

	/**
	 * Get overlay context keys.
	 *
	 * @return array<int, string>
	 */
	private static function get_context_keys(): array {
		return array_column( self::BLOCKS, 'context' );
	}
}
