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
		// Shared by menus and panels (one copy, one trap stack).
		'matter/focus-trap' => 'focus-trap/index.js',
		'matter/menu'       => 'menu/view.js',
		'matter/panel'      => 'panel/view.js',
		'matter/overlay'    => 'overlay/view.js',
	];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register' ], 9 );
		add_action( 'wp_head', [ $this, 'print_api_stub' ], 1 );
	}

	/**
	 * Block types with a `matter.{type}()` accessor.
	 */
	public const API_TYPES = [ 'accordion', 'carousel', 'gallery', 'overlay', 'panel', 'tabs' ];

	/**
	 * A small `window.matter` for theme scripts that run before Matter's
	 * modules load, or on pages without the block: `matter.ready()` queues
	 * until a module takes over (src/interactivity/api.js), and each
	 * `matter.{type}()` returns null until then.
	 *
	 * @return string
	 */
	public static function api_stub(): string {
		return sprintf(
			'(function(m){if(m.ready)return;var q=m._queue=[];m._stub=true;m.ready=function(t){return new Promise(function(r){q.push([t,r]);});};%s.forEach(function(t){var f=function(){return null;};f._stub=true;m[t]=f;});})(window.matter=window.matter||{});',
			wp_json_encode( self::API_TYPES )
		);
	}

	/**
	 * Print the API stub in the page's head.
	 *
	 * @return void
	 */
	public function print_api_stub(): void {
		wp_print_inline_script_tag( self::api_stub(), [ 'id' => 'matter-api' ] );
	}

	/**
	 * Register component styles and script modules.
	 *
	 * @return void
	 */
	public function register(): void {
		foreach ( self::STYLES as $handle => $file ) {
			wp_register_style( $handle, MATTER_URL . 'build/' . $file, [], self::version( $file ) );
			// The flipped `-rtl.css` build on right-to-left sites.
			wp_style_add_data( $handle, 'rtl', 'replace' );
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
	 * Absolute path to a built stylesheet, its flipped `-rtl.css` version on
	 * right-to-left sites (for CSS Matter prints inline, e.g. a responsive
	 * menu's per-breakpoint rules).
	 *
	 * @param string $file Stylesheet path relative to build/, e.g. menu/dropdown.css.
	 * @return string
	 */
	public static function style_path( string $file ): string {
		$rtl = preg_replace( '/\.css$/', '-rtl.css', $file );

		return is_rtl() && file_exists( self::path( $rtl ) ) ? self::path( $rtl ) : self::path( $file );
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
