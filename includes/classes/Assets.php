<?php
/**
 * Assets for non-block components (menus, panels…).
 *
 * Blocks register their own assets from block.json. Components rendered from
 * PHP templates register theirs here and enqueue them when they render.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

defined( 'ABSPATH' ) || exit;

/**
 * Assets for non-block components.
 */
class Assets {

	use Singleton;

	/**
	 * Component stylesheets: handle => build path (relative to build/).
	 */
	public const STYLES = [
		'matter-menu'            => 'menu/base.css',
		'matter-menu-dropdown'   => 'menu/dropdown.css',
		'matter-menu-accordion'  => 'menu/accordion.css',
		'matter-menu-drill-down' => 'menu/drill-down.css',
		'matter-panel'           => 'panel/base.css',
	];

	/**
	 * Component script modules: module ID => build path (relative to build/).
	 */
	public const MODULES = [
		'matter/menu'    => 'menu/view.js',
		'matter/panel'   => 'panel/view.js',
		'matter/overlay' => 'overlay/view.js',
	];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register' ], 9 );
	}

	/**
	 * Register component styles and script modules.
	 *
	 * @return void
	 */
	public function register(): void {
		foreach ( self::STYLES as $handle => $file ) {
			wp_register_style( $handle, MATTER_URL . 'build/' . $file, [], self::version( $file ) );
		}

		foreach ( self::MODULES as $id => $file ) {
			$asset_file = MATTER_PATH . 'build/' . preg_replace( '/\.js$/', '.asset.php', $file );
			$asset      = file_exists( $asset_file ) ? require $asset_file : [];

			wp_register_script_module(
				$id,
				MATTER_URL . 'build/' . $file,
				$asset['dependencies'] ?? [ '@wordpress/interactivity' ],
				$asset['version'] ?? self::version( $file )
			);
		}
	}

	/**
	 * Absolute path to a build file.
	 *
	 * @param string $file Path relative to build/.
	 * @return string
	 */
	public static function path( string $file ): string {
		return MATTER_PATH . 'build/' . $file;
	}

	/**
	 * Cache-busting version for a build file.
	 *
	 * @param string $file Path relative to build/.
	 * @return string
	 */
	private static function version( string $file ): string {
		$path = self::path( $file );

		return file_exists( $path ) ? (string) filemtime( $path ) : MATTER_VERSION;
	}
}
