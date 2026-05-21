<?php
/**
 * Main plugin class.
 *
 * @package Eighteen73\Blocks
 */

namespace Eighteen73\Blocks;

use Eighteen73\Blocks\Blocks\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Main Plugin class.
 */
class Plugin {

	use Singleton;

	/**
	 * Setup the plugin.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'load_textdomain' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_scripts' ] );
		Registry::instance()->setup();
	}

	/**
	 * Load plugin textdomain.
	 *
	 * @return void
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain(
			'eighteen73-blocks',
			false,
			EIGHTEEN73_BLOCKS_PATH . '/languages'
		);
	}

	/**
	 * Plugin activation.
	 *
	 * @return void
	 */
	public static function activation(): void {}

	/**
	 * Plugin deactivation.
	 *
	 * @return void
	 */
	public static function deactivation(): void {}

	/**
	 * Enqueue frontend scripts and styles.
	 *
	 * @return void
	 */
	public function enqueue_scripts(): void {}

	/**
	 * Enqueue admin scripts and styles.
	 *
	 * @return void
	 */
	public function enqueue_admin_scripts(): void {}
}
