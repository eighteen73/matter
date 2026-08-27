<?php
/**
 * Discovers, filters, and enqueues block extensions.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Plugin;
use Eighteen73\Matter\Registries\StickyOffsetRegistry;
use Eighteen73\Matter\Registries\StylesheetRegistryInterface;
use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Registers editor and front-end assets for src/extensions.
 */
class Registry {

	use Singleton;

	/**
	 * Transient cache key for enabled extension slugs.
	 *
	 * @var string
	 */
	private const CACHE_KEY = 'matter_extensions_cache';

	/**
	 * Map of extension folder names to the core blocks they target.
	 *
	 * Empty arrays still enqueue the editor script (e.g. document plugins).
	 *
	 * @var array<string, string[]>
	 */
	private const EXTENSIONS = [
		'icon'        => [ 'core/button' ],
		'stack'       => [ 'core/columns' ],
		'reverse'     => [ 'core/columns' ],
		'order'       => [ 'core/column' ],
		'link'        => [ 'core/group' ],
		'sticky'      => [ 'core/group' ],
		'add-media'   => [ 'core/icon' ],
		'placeholder' => [ 'core/heading', 'core/paragraph' ],
		'style-sync'  => [ 'core/group', 'core/column' ],
		'focal-point' => [],
	];

	/**
	 * Setup extension hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register_block_styles' ] );
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_registry_stylesheets' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_scripts' ] );
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_editor_styles' ] );

		Link::instance()->setup();
		AddMedia::instance()->setup();
		FocalPoint::instance()->setup();
		Icon::instance()->setup();
		Stack::instance()->setup();
		Reverse::instance()->setup();
		Order::instance()->setup();
	}

	/**
	 * Clear extension caches on activation/deactivation.
	 *
	 * @return void
	 */
	public static function clear_caches(): void {
		delete_transient( self::CACHE_KEY );
		StickyOffsetRegistry::instance()->clear_cache();
	}

	/**
	 * Register front-end block styles for enabled extensions.
	 *
	 * @return void
	 */
	public function register_block_styles(): void {
		foreach ( $this->get_enabled_extensions() as $extension ) {
			$style_path = MATTER_PATH . "build/extensions/style-{$extension}.css";

			if ( ! file_exists( $style_path ) ) {
				continue;
			}

			$version = $this->get_asset_version( $extension, $style_path );
			$blocks  = self::EXTENSIONS[ $extension ] ?? [];

			if ( empty( $blocks ) ) {
				continue;
			}

			foreach ( $blocks as $block_name ) {
				$style_handle = "matter-extension-{$extension}-style";

				wp_enqueue_block_style(
					$block_name,
					[
						'handle' => $style_handle,
						'src'    => MATTER_URL . "build/extensions/style-{$extension}.css",
						'path'   => $style_path,
						'ver'    => $version,
					]
				);
			}
		}
	}

	/**
	 * Enqueue editor scripts for enabled extensions.
	 *
	 * @return void
	 */
	public function enqueue_editor_scripts(): void {
		foreach ( $this->get_enabled_extensions() as $extension ) {
			$asset_path  = MATTER_PATH . "build/extensions/{$extension}.asset.php";
			$script_path = MATTER_PATH . "build/extensions/{$extension}.js";

			if ( ! file_exists( $asset_path ) || ! file_exists( $script_path ) ) {
				continue;
			}

			$asset = require $asset_path;

			wp_enqueue_script(
				"matter-extension-{$extension}",
				MATTER_URL . "build/extensions/{$extension}.js",
				$asset['dependencies'] ?? [],
				$asset['version'] ?? false,
				[
					'in_footer' => true,
				]
			);
		}
	}

	/**
	 * Enqueue editor-only styles inside the iframed editor.
	 *
	 * @return void
	 */
	public function enqueue_editor_styles(): void {
		if ( ! is_admin() ) {
			return;
		}

		foreach ( $this->get_enabled_extensions() as $extension ) {
			$style_path     = MATTER_PATH . "build/extensions/{$extension}.css";
			$style_rtl_path = MATTER_PATH . "build/extensions/{$extension}-rtl.css";

			if ( ! file_exists( $style_path ) ) {
				continue;
			}

			$asset_path = MATTER_PATH . "build/extensions/{$extension}.asset.php";
			$version    = filemtime( $style_path );

			if ( file_exists( $asset_path ) ) {
				$asset   = require $asset_path;
				$version = $asset['version'] ?? $version;
			}

			$style_handle = "matter-extension-{$extension}-editor";

			wp_enqueue_style(
				$style_handle,
				MATTER_URL . "build/extensions/{$extension}.css",
				[],
				$version
			);

			if ( file_exists( $style_rtl_path ) ) {
				wp_style_add_data( $style_handle, 'rtl', 'replace' );
			}
		}
	}

	/**
	 * Enqueue generated utility stylesheets.
	 *
	 * @return void
	 */
	public function enqueue_registry_stylesheets(): void {
		foreach ( $this->get_stylesheet_registries() as $registry ) {
			$handle = $registry->get_handle();
			$css    = $registry->get_css();

			if ( empty( $css ) ) {
				continue;
			}

			if ( ! wp_style_is( $handle, 'registered' ) ) {
				wp_register_style( $handle, false, [], MATTER_VERSION );
			}

			wp_enqueue_style( $handle );

			if ( empty( wp_styles()->get_data( $handle, 'after' ) ) ) {
				wp_add_inline_style( $handle, $css );
			}
		}
	}

	/**
	 * Get stylesheet registries.
	 *
	 * @return StylesheetRegistryInterface[]
	 */
	private function get_stylesheet_registries(): array {
		return [
			StickyOffsetRegistry::instance(),
		];
	}

	/**
	 * Get enabled extension slugs after filters and environment gates.
	 *
	 * @return string[]
	 */
	private function get_enabled_extensions(): array {
		$is_development = Plugin::is_development_mode();

		if ( ! $is_development ) {
			$cached = get_transient( self::CACHE_KEY );
			if ( false !== $cached && is_array( $cached ) ) {
				return $cached;
			}
		}

		$extensions = array_keys( self::EXTENSIONS );

		if ( ! $this->should_load_placeholder_extension() ) {
			$extensions = array_values(
				array_filter(
					$extensions,
					static fn( $slug ) => 'placeholder' !== $slug
				)
			);
		}

		$enabled = [];

		foreach ( $extensions as $slug ) {
			/**
			 * Filter whether a Matter extension should load.
			 *
			 * @param bool   $should_load Whether the extension should load.
			 * @param string $slug        Extension folder name.
			 */
			$should_load = apply_filters( "matter_extension_{$slug}", true, $slug );

			if ( $should_load ) {
				$enabled[] = $slug;
			}
		}

		if ( ! $is_development ) {
			set_transient( self::CACHE_KEY, $enabled, DAY_IN_SECONDS );
		}

		return $enabled;
	}

	/**
	 * Whether the placeholder extension should load.
	 *
	 * @return bool
	 */
	private function should_load_placeholder_extension(): bool {
		return in_array( wp_get_environment_type(), [ 'development', 'staging' ], true )
			&& current_user_can( 'manage_options' );
	}

	/**
	 * Get a version string for an extension asset.
	 *
	 * @param string $extension  Extension slug.
	 * @param string $style_path Style file path.
	 * @return string
	 */
	private function get_asset_version( string $extension, string $style_path ): string {
		$asset_path = MATTER_PATH . "build/extensions/{$extension}.asset.php";
		$version    = (string) filemtime( $style_path );

		if ( file_exists( $asset_path ) ) {
			$asset   = require $asset_path;
			$version = $asset['version'] ?? $version;
		}

		return $version;
	}
}
