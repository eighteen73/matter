<?php
/**
 * Collapsible block.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Collapsible block helpers.
 */
class Collapsible {

	/**
	 * Resolve the collapsible ID from block attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return string
	 */
	public static function resolve_id( array $attributes ): string {
		foreach ( [ 'anchor', 'targetId', 'generatedId' ] as $id_attribute ) {
			if ( empty( $attributes[ $id_attribute ] ) ) {
				continue;
			}

			return (string) $attributes[ $id_attribute ];
		}

		return wp_unique_id( 'matter-collapsible-' );
	}

	/**
	 * Resolve the collapsible display type.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return string
	 */
	public static function resolve_type( array $attributes ): string {
		if ( empty( $attributes['type'] ) ) {
			return 'popover';
		}

		$type = sanitize_key( (string) $attributes['type'] );

		return in_array( $type, [ 'popover', 'inline' ], true ) ? $type : 'popover';
	}

	/**
	 * Register collapsible interactivity state.
	 *
	 * @param string $collapsible_id Collapsible element ID.
	 * @return void
	 */
	public static function register_state( string $collapsible_id ): void {
		wp_interactivity_state(
			'matter/overlay/private',
			[
				'items' => [
					$collapsible_id => [
						'isOpen' => false,
						'type'   => 'collapsible',
					],
				],
			]
		);
	}
}
