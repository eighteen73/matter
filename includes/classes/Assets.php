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
		// What panels, drill-down menus and overlays hold inert: one registry,
		// so a modal can tell a panel's hold to let go.
		'matter/inert'      => 'inert/index.js',
		'matter/menu'       => 'menu/view.js',
		'matter/panel'      => 'panel/view.js',
		'matter/overlay'    => 'overlay/view.js',
		// Filters' store, shared by the filter blocks; a results provider
		// (e.g. Seek's) imports its registerProvider().
		'matter/filters'    => 'filters/view.js',
		// Fills live blocks' placeholders (a price) with the visitor's own.
		'matter/live'       => 'live/view.js',
		// Tells other scripts when a list's loop items change (a filter, a page).
		'matter/loop-items' => 'loop-items/view.js',
		// Quick add's modal: loads a product's content into it.
		'matter/quick-add'  => 'quick-add/view.js',
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
	public const API_TYPES = [ 'accordion', 'carousel', 'filters', 'gallery', 'overlay', 'panel', 'tabs' ];

	/**
	 * The first thing Matter's JavaScript does on a page: it adds `matter-js`
	 * to `<html>` (so CSS can tell "JavaScript is running" from "it isn't"),
	 * and `matter-late` four seconds after the page is parsed (at once, if the
	 * script runs after that). A block's module adds `is-enhanced` to the block
	 * when it starts, and `matter-ready-{type}` to `<html>`; CSS hides content
	 * only once a block is enhanced, or while it is about to be (`matter-js`
	 * and either not yet `matter-late` or `matter-ready-{type}`), so a module
	 * that fails leaves the content showing.
	 *
	 * It also gives theme scripts a small `window.matter` that works before
	 * Matter's modules load, or on pages without the block: `matter.ready()` queues
	 * (privately, under `Symbol.for( 'matter' )`) until a module takes over
	 * (src/interactivity/api.js), and each `matter.{type}()` returns null until
	 * then. On pages where no module ever loads, the queue settles with `null`
	 * when the page has loaded.
	 *
	 * @return string
	 */
	public static function api_stub(): string {
		return sprintf(
			'(function(m){var h=document.documentElement,l=function(){setTimeout(function(){h.classList.add("matter-late");},4000);};h.classList.add("matter-js");if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",l);}else{l();}if(m.ready)return;var s=m[Symbol.for("matter")]={stub:true,queue:[]};m.ready=function(t){return new Promise(function(r){s.queue.push([t,r]);});};window.addEventListener("load",function(){s.queue.splice(0).forEach(function(q){q[1](null);});});%s.forEach(function(t){var f=function(){return null;};f._stub=true;m[t]=f;});})(window.matter=window.matter||{});',
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
			// Menu types come after the shared menu rules, which they build on.
			$deps = str_starts_with( $handle, 'matter-menu-' ) ? [ 'matter-menu' ] : [];

			wp_register_style( $handle, MATTER_URL . 'build/' . $file, $deps, self::version( $file ) );
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
