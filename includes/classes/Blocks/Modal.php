<?php
/**
 * Modal block.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Modal block helpers.
 */
class Modal {

	/**
	 * Per-group render order counters.
	 *
	 * @var array<string, int>
	 */
	private static $group_counters = [];

	/**
	 * Resolve the modal ID from block attributes and context.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param array<string, mixed> $context    Block context.
	 * @return string
	 */
	public static function resolve_id( array $attributes, array $context = [] ): string {
		return Overlay::resolve_id( $attributes, $context, 'matter-modal-' );
	}

	/**
	 * Resolve the saved base ID used to group query-loop modal instances.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return string
	 */
	public static function resolve_base_id( array $attributes ): string {
		return Overlay::resolve_base_id( $attributes, 'matter-modal-' );
	}

	/**
	 * Resolve the modal group ID from explicit settings or query-loop context.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param array<string, mixed> $context    Block context.
	 * @param string               $base_id    Saved base modal ID.
	 * @return string
	 */
	public static function resolve_group_id( array $attributes, array $context = [], string $base_id = '' ): string {
		if ( ! empty( $attributes['groupId'] ) ) {
			return sanitize_title( (string) $attributes['groupId'] );
		}

		if ( Overlay::is_query_loop_context( $context ) ) {
			return $base_id;
		}

		return '';
	}

	/**
	 * Resolve the next render-order index for a modal group.
	 *
	 * @param string $group_id Modal group ID.
	 * @return int|null
	 */
	public static function resolve_group_index( string $group_id ): ?int {
		if ( '' === $group_id ) {
			return null;
		}

		if ( ! isset( self::$group_counters[ $group_id ] ) ) {
			self::$group_counters[ $group_id ] = 0;
		}

		$group_index = self::$group_counters[ $group_id ];
		++self::$group_counters[ $group_id ];

		return $group_index;
	}

	/**
	 * Sanitize URL trigger rules for interactivity state.
	 *
	 * @param mixed $url_triggers Raw urlTriggers attribute.
	 * @return array<int, array{param: string, value: string, match: string}>
	 */
	public static function sanitize_url_triggers( $url_triggers ): array {
		if ( ! is_array( $url_triggers ) ) {
			return [];
		}

		$sanitized = [];

		foreach ( $url_triggers as $rule ) {
			if ( ! is_array( $rule ) ) {
				continue;
			}

			$param = isset( $rule['param'] ) ? sanitize_key( $rule['param'] ) : '';

			if ( '' === $param ) {
				continue;
			}

			$value = isset( $rule['value'] ) ? sanitize_text_field( (string) $rule['value'] ) : '';
			$match = isset( $rule['match'] ) && 'regex' === $rule['match'] ? 'regex' : 'exact';

			$sanitized[] = [
				'param' => $param,
				'value' => $value,
				'match' => $match,
			];
		}

		return $sanitized;
	}
}
