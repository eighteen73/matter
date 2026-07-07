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
		add_filter( 'render_block_context', [ $this, 'provide_context' ], 10, 2 );
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
		$base_id = self::resolve_base_id( $attributes, $fallback_prefix );

		return self::resolve_contextual_id( $base_id, $context );
	}

	/**
	 * Provide computed overlay IDs to descendant blocks during server rendering.
	 *
	 * @param array<string, mixed> $context      Default block context.
	 * @param array<string, mixed> $parsed_block The block being rendered.
	 * @return array<string, mixed>
	 */
	public function provide_context( array $context, array $parsed_block ): array {
		$block_name = $parsed_block['blockName'] ?? '';

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

			$context[ $context_key ] = self::resolve_contextual_id(
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
		foreach ( [ 'anchor', 'targetId', 'generatedId' ] as $id_attribute ) {
			if ( empty( $attributes[ $id_attribute ] ) ) {
				continue;
			}

			return (string) $attributes[ $id_attribute ];
		}

		return wp_unique_id( $fallback_prefix );
	}

	/**
	 * Resolve a query-loop-specific ID when post template context is present.
	 *
	 * @param string               $base_id Overlay base ID.
	 * @param array<string, mixed> $context Block context.
	 * @return string
	 */
	private static function resolve_contextual_id( string $base_id, array $context ): string {
		if ( ! self::is_query_loop_context( $context ) ) {
			return $base_id;
		}

		$suffix = '-post-' . (int) $context['postId'];

		if ( substr( $base_id, -strlen( $suffix ) ) === $suffix ) {
			return $base_id;
		}

		return $base_id . $suffix;
	}

	/**
	 * Whether the current block context represents a Query Loop post iteration.
	 *
	 * @param array<string, mixed> $context Block context.
	 * @return bool
	 */
	private static function is_query_loop_context( array $context ): bool {
		return ! empty( $context['postId'] );
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
