<?php
/**
 * Handles block registration.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use WP_Block_Metadata_Registry;
use WP_Block_Type_Registry;
use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Registers plugin blocks.
 */
class Registry {
	use Singleton;

	/**
	 * Core blocks Matter replaces (parents + children).
	 *
	 * Hidden from the inserter via allowed_block_types_all.
	 * Existing content using these blocks continues to render.
	 *
	 * @var string[]
	 */
	private const DISABLED_CORE_BLOCKS = [
		'core/gallery',
		'core/tabs',
		'core/tab-list',
		'core/tab-panels',
		'core/tab-panel',
		'core/accordion',
		'core/accordion-item',
		'core/accordion-heading',
		'core/accordion-panel',
	];

	/**
	 * Third party blocks that Matter replaces (parents + children).
	 *
	 * Hidden from the inserter via allowed_block_types_all.
	 * Existing content using these blocks continues to render.
	 *
	 * @var string[]
	 */
	private const DISABLED_THIRD_PARTY_BLOCKS = [
		'gravityforms/form',
	];

	/**
	 * Setup block registration hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register_overlay_store_module' ], 9 );
		add_action( 'init', [ $this, 'register_lightbox_store_module' ], 9 );
		add_action( 'init', [ $this, 'register' ] );
		add_filter( 'allowed_block_types_all', [ $this, 'disable_mirrored_core_blocks' ], 10, 2 );
	}

	/**
	 * Remove core blocks that Matter replaces from the editor allow-list.
	 *
	 * @param bool|string[]            $allowed_block_types Allowed block types, or true for all.
	 * @param \WP_Block_Editor_Context $editor_context      Editor context.
	 * @return bool|string[]
	 */
	public function disable_mirrored_core_blocks( $allowed_block_types, $editor_context ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		if ( true === $allowed_block_types ) {
			$allowed_block_types = array_keys( WP_Block_Type_Registry::get_instance()->get_all_registered() );
		}

		if ( ! is_array( $allowed_block_types ) ) {
			return $allowed_block_types;
		}

		return array_values( array_diff( $allowed_block_types, self::DISABLED_CORE_BLOCKS, self::DISABLED_THIRD_PARTY_BLOCKS ) );
	}

	/**
	 * Register the shared overlay store script module.
	 *
	 * Overlay blocks reference this module ID in block.json. The module is built
	 * via webpack.config.js and its dependencies/version come from the generated
	 * asset file (DependencyExtractionWebpackPlugin).
	 *
	 * @return void
	 */
	public function register_overlay_store_module(): void {
		$script_path = MATTER_PATH . 'build/interactivity/overlay-store.js';
		$asset_path  = MATTER_PATH . 'build/interactivity/overlay-store.asset.php';

		if ( ! file_exists( $script_path ) ) {
			return;
		}

		$asset = file_exists( $asset_path ) ? require $asset_path : [];

		wp_register_script_module(
			'matter/overlay-store',
			MATTER_URL . 'build/interactivity/overlay-store.js',
			$asset['dependencies'] ?? [],
			$asset['version'] ?? false,
		);
	}

	/**
	 * Register the shared lightbox store script module.
	 *
	 * @return void
	 */
	public function register_lightbox_store_module(): void {
		$script_path = MATTER_PATH . 'build/interactivity/lightbox-store.js';
		$asset_path  = MATTER_PATH . 'build/interactivity/lightbox-store.asset.php';

		if ( ! file_exists( $script_path ) ) {
			return;
		}

		$asset = file_exists( $asset_path ) ? require $asset_path : [];

		wp_register_script_module(
			'matter/lightbox-store',
			MATTER_URL . 'build/interactivity/lightbox-store.js',
			$asset['dependencies'] ?? [],
			$asset['version'] ?? false,
		);
	}

	/**
	 * Register blocks from the metadata collection, with per-block opt-out filters.
	 *
	 * Uses the same performant manifest flow as wp_register_block_types_from_metadata_collection(),
	 * but allows individual blocks to be skipped via apply_filters().
	 *
	 * @return void
	 */
	public function register(): void {
		$blocks_path   = MATTER_PATH . 'build/blocks';
		$manifest_file = MATTER_PATH . 'build/blocks-manifest.php';

		if ( ! is_dir( $blocks_path ) || ! file_exists( $manifest_file ) ) {
			return;
		}

		// Register the collection once so metadata is cached for all block folders.
		WP_Block_Metadata_Registry::register_collection( $blocks_path, $manifest_file );

		$manifest = require $manifest_file;

		if ( ! is_array( $manifest ) ) {
			return;
		}

		foreach ( $manifest as $block_slug => $block_metadata ) {
			if ( ! is_string( $block_slug ) || ! is_array( $block_metadata ) ) {
				continue;
			}

			$block_folder = trailingslashit( $blocks_path ) . $block_slug;

			/**
			 * Allow blocks to be conditionally registered.
			 *
			 * Usage:
			 * add_filter( 'matter_register_{$block_slug}', function( $should_register, $block_folder ) { ... }, 10, 2 );
			 */
			$should_register = apply_filters( "matter_register_{$block_slug}", true, $block_folder );

			if ( ! $should_register ) {
				continue;
			}

			// Pass the folder only — metadata comes from the registered collection.
			// Do not pass $block_metadata as $args; that merges camelCase block.json
			// keys into WP_Block_Type settings and can produce inconsistent supports.
			register_block_type_from_metadata( $block_folder );
		}
	}
}
