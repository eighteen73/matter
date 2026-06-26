<?php
/**
 * Icon registry interface.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Icons;

defined( 'ABSPATH' ) || exit;

/**
 * Contract for icon registry read operations.
 */
interface RegistryInterface {

	/**
	 * Retrieves an array containing the properties of a registered icon.
	 *
	 * @param string $icon_name Icon name including namespace.
	 * @return array<string, mixed>|null Registered icon properties or null if not registered.
	 */
	public function get_registered_icon( string $icon_name ): ?array;

	/**
	 * Retrieves all registered icons.
	 *
	 * @param string $search Optional search term.
	 * @return array<int, array<string, mixed>> Registered icon properties.
	 */
	public function get_registered_icons( string $search = '' ): array;

	/**
	 * Checks if an icon is registered.
	 *
	 * @param string $icon_name Icon name including namespace.
	 * @return bool
	 */
	public function is_registered( string $icon_name ): bool;
}
