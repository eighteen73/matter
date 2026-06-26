<?php
/**
 * WordPress core icon registry adapter.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Icons;

defined( 'ABSPATH' ) || exit;

/**
 * Read-only adapter for WP_Icons_Registry when available.
 */
class WordPressRegistryAdapter implements RegistryInterface {

	/**
	 * Whether the core registry class is available.
	 *
	 * @return bool
	 */
	public static function is_available(): bool {
		return class_exists( 'WP_Icons_Registry' );
	}

	/**
	 * Retrieves an array containing the properties of a registered icon.
	 *
	 * @param string $icon_name Icon name including namespace.
	 * @return array<string, mixed>|null Registered icon properties or null if not registered.
	 */
	public function get_registered_icon( string $icon_name ): ?array {
		if ( ! self::is_available() ) {
			return null;
		}

		$icon = \WP_Icons_Registry::get_instance()->get_registered_icon( $icon_name );

		return is_array( $icon ) ? $icon : null;
	}

	/**
	 * Retrieves all registered icons.
	 *
	 * @param string $search Optional search term.
	 * @return array<int, array<string, mixed>> Registered icon properties.
	 */
	public function get_registered_icons( string $search = '' ): array {
		if ( ! self::is_available() ) {
			return [];
		}

		return \WP_Icons_Registry::get_instance()->get_registered_icons( $search );
	}

	/**
	 * Checks if an icon is registered.
	 *
	 * @param string $icon_name Icon name including namespace.
	 * @return bool
	 */
	public function is_registered( string $icon_name ): bool {
		if ( ! self::is_available() ) {
			return false;
		}

		return \WP_Icons_Registry::get_instance()->is_registered( $icon_name );
	}
}
