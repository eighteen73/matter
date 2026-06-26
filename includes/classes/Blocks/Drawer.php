<?php
/**
 * Drawer block.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Drawer block helpers.
 */
class Drawer {

	/**
	 * Resolve the drawer ID from block attributes.
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

		return wp_unique_id( 'matter-drawer-' );
	}

	/**
	 * Register drawer interactivity state.
	 *
	 * @param string $drawer_id Drawer element ID.
	 * @return void
	 */
	public static function register_state( string $drawer_id ): void {
		wp_interactivity_state(
			'matter/overlay/private',
			[
				'items' => [
					$drawer_id => [
						'isOpen' => false,
						'type'   => 'drawer',
					],
				],
			]
		);
	}
}
