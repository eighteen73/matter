<?php
/**
 * Icon resolver facade.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Icons;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves icons from Matter and core registries.
 */
class Resolver implements RegistryInterface {
	use Singleton;

	/**
	 * Core registry adapter.
	 *
	 * @var WordPressRegistryAdapter
	 */
	private $wordpress_adapter;

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->wordpress_adapter = new WordPressRegistryAdapter();
	}

	/**
	 * Retrieves an array containing the properties of a registered icon.
	 *
	 * Prefers the core registry when the icon exists there, otherwise falls back
	 * to the Matter registry.
	 *
	 * @param string $icon_name Icon name including namespace.
	 * @return array<string, mixed>|null Registered icon properties or null if not registered.
	 */
	public function get_registered_icon( string $icon_name ): ?array {
		if ( $this->wordpress_adapter->is_registered( $icon_name ) ) {
			return $this->wordpress_adapter->get_registered_icon( $icon_name );
		}

		return Registry::instance()->get_registered_icon( $icon_name );
	}

	/**
	 * Retrieves Matter registered icons for REST and picker consumption.
	 *
	 * @param string $search Optional search term.
	 * @return array<int, array<string, mixed>> Registered icon properties.
	 */
	public function get_registered_icons( string $search = '' ): array {
		return Registry::instance()->get_registered_icons( $search );
	}

	/**
	 * Checks if an icon is registered in either registry.
	 *
	 * @param string $icon_name Icon name including namespace.
	 * @return bool
	 */
	public function is_registered( string $icon_name ): bool {
		return $this->wordpress_adapter->is_registered( $icon_name )
			|| Registry::instance()->is_registered( $icon_name );
	}
}
