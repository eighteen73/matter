<?php
/**
 * Icons bootstrap.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Icons;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Loads icons from assets/icons and registers REST routes.
 */
class Bootstrap {
	use Singleton;

	/**
	 * REST controller instance.
	 *
	 * @var RestController|null
	 */
	private $rest_controller = null;

	/**
	 * Setup icon hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register_directory_icons' ], 9 );
		add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
	}

	/**
	 * Registers icons by scanning assets/icons for SVG files.
	 *
	 * @return void
	 */
	public function register_directory_icons(): void {
		DirectoryLoader::register_from_directory( MATTER_PATH . 'assets/icons', 'matter' );
	}

	/**
	 * Registers REST routes for Matter icons.
	 *
	 * @return void
	 */
	public function register_rest_routes(): void {
		if ( null === $this->rest_controller ) {
			$this->rest_controller = new RestController();
		}

		$this->rest_controller->register_routes();
	}
}
