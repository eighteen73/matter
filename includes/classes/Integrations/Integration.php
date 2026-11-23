<?php
/**
 * An integration with another plugin.
 *
 * Matter's PHP never calls another plugin outside an integration. What Matter
 * does with one (WooCommerce's products, Gravity Forms' forms) lives in an
 * integration, which boots only when that plugin is active and adds to Matter
 * through its hooks. See Integrations for the list. (The Gravity Form block's
 * source stays with Matter's blocks, and registers only when its integration
 * turns it on.)
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations;

defined( 'ABSPATH' ) || exit;

/**
 * An integration with another plugin.
 */
interface Integration {

	/**
	 * Whether the plugin is active, so the integration should boot.
	 *
	 * Called on `plugins_loaded`, once every plugin has loaded.
	 *
	 * @return bool
	 */
	public function can_boot(): bool;

	/**
	 * Add the integration's actions and filters.
	 *
	 * @return void
	 */
	public function boot(): void;
}
