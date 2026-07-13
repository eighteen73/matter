<?php
/**
 * Shared block ID resolution helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves stable block IDs from attributes and render context.
 */
class BlockId {

	/**
	 * Resolve a block ID from attributes and optional block context.
	 *
	 * @param array<string, mixed> $attributes      Block attributes.
	 * @param array<string, mixed> $context         Block context.
	 * @param string               $fallback_prefix Prefix for generated fallback IDs.
	 * @return string
	 */
	public static function resolve_id( array $attributes, array $context = [], string $fallback_prefix = 'matter-block-' ): string {
		$base_id = self::resolve_base_id( $attributes, $fallback_prefix );

		return self::resolve_contextual_id( $base_id, $context );
	}

	/**
	 * Resolve the saved base ID from block attributes.
	 *
	 * Priority: anchor → generatedId → legacy targetId → wp_unique_id( prefix ).
	 *
	 * @param array<string, mixed> $attributes      Block attributes.
	 * @param string               $fallback_prefix Prefix for generated fallback IDs.
	 * @return string
	 */
	public static function resolve_base_id( array $attributes, string $fallback_prefix ): string {
		foreach ( [ 'anchor', 'generatedId', 'targetId' ] as $id_attribute ) {
			if ( empty( $attributes[ $id_attribute ] ) ) {
				continue;
			}

			return (string) $attributes[ $id_attribute ];
		}

		return wp_unique_id( $fallback_prefix );
	}

	/**
	 * Whether the current block context represents a Query Loop post iteration.
	 *
	 * Query Loop descendants do not always receive queryId during server render,
	 * so Matter marks repeated item descendants with matter/in-query-loop.
	 *
	 * @param array<string, mixed> $context Block context.
	 * @return bool
	 */
	public static function is_query_loop_context( array $context ): bool {
		$post_id = empty( $context['postId'] ) ? 0 : (int) $context['postId'];

		if ( $post_id <= 0 ) {
			return false;
		}

		return Context::is_in_query_loop( $context ) || isset( $context['queryId'] );
	}

	/**
	 * Resolve a query-loop-specific ID when post template context is present.
	 *
	 * @param string               $base_id Block base ID.
	 * @param array<string, mixed> $context Block context.
	 * @return string
	 */
	public static function resolve_contextual_id( string $base_id, array $context ): string {
		if ( ! self::is_query_loop_context( $context ) ) {
			return $base_id;
		}

		$suffix = '-post-' . (int) $context['postId'];

		if ( substr( $base_id, -strlen( $suffix ) ) === $suffix ) {
			return $base_id;
		}

		return $base_id . $suffix;
	}
}
