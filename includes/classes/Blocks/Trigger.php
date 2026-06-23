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
	public static function resolve_target_id( $block ): string {
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
	 * Return interactivity attributes for overlay toggle controls.
	 *
	 * @param string $target_id Overlay target element ID.
	 * @return array<string, string>
	 */
	public static function get_toggle_attributes( string $target_id ): array {
		if ( '' === $target_id ) {
			return [];
		}

		return [
			'aria-controls'               => $target_id,
			'aria-expanded'               => 'false',
			'data-wp-bind--aria-expanded' => 'state.item.isOpen',
			'data-wp-on--click'           => 'actions.toggle',
		];
	}
}
