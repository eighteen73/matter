<?php
/**
 * Shared trigger helpers for overlay open controls.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Trigger block helpers.
 */
class Trigger {

	/**
	 * Context keys that provide overlay target IDs.
	 *
	 * @var array<int, string>
	 */
	public const TARGET_CONTEXT_KEYS = [
		'matter/modal-id',
		'matter/drawer-id',
		'matter/collapsible-id',
	];

	/**
	 * Resolve the overlay target ID from block context.
	 *
	 * @param \WP_Block $block Block instance.
	 * @return string
	 */
	public static function resolve_target_id_from_context( $block ): string {
		$context = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];

		foreach ( self::TARGET_CONTEXT_KEYS as $context_key ) {
			if ( empty( $context[ $context_key ] ) ) {
				continue;
			}

			return (string) $context[ $context_key ];
		}

		return '';
	}

	/**
	 * Resolve the overlay target ID from context or block attributes.
	 *
	 * @param \WP_Block $block Block instance.
	 * @return string
	 */
	public static function resolve_target_id( $block ): string {
		$from_context = self::resolve_target_id_from_context( $block );

		if ( '' !== $from_context ) {
			return $from_context;
		}

		$attributes = isset( $block->attributes ) && is_array( $block->attributes ) ? $block->attributes : [];

		if ( empty( $attributes['targetId'] ) ) {
			return '';
		}

		return (string) $attributes['targetId'];
	}

	/**
	 * Whether the trigger resolves its target from parent block context.
	 *
	 * @param \WP_Block $block Block instance.
	 * @return bool
	 */
	public static function uses_context_target( $block ): bool {
		return '' !== self::resolve_target_id_from_context( $block );
	}

	/**
	 * Return interactivity attributes for overlay toggle controls.
	 *
	 * @param string $target_id  Overlay target element ID.
	 * @param bool   $standalone Whether the trigger sits outside the overlay parent.
	 * @return array<string, string>
	 */
	public static function get_toggle_attributes( string $target_id, bool $standalone = false ): array {
		if ( '' === $target_id ) {
			return [];
		}

		$attributes = [
			'aria-controls'               => $target_id,
			'aria-expanded'               => 'false',
			'data-wp-bind--aria-expanded' => 'state.item.isOpen',
			'data-wp-on--click'           => 'actions.toggle',
		];

		if ( $standalone ) {
			$attributes['data-wp-interactive'] = 'matter/overlay';
			$attributes['data-wp-context']     = wp_json_encode(
				[
					'id' => $target_id,
				]
			);
		}

		return $attributes;
	}
}
