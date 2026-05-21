<?php
/**
 * Handles block registration.
 *
 * @package Eighteen73\Blocks
 */

namespace Eighteen73\Blocks\Blocks;

use WP_Block_Metadata_Registry;
use Eighteen73\Blocks\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Registers plugin blocks.
 */
class Registry {
	use Singleton;

	/**
	 * Setup block registration hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register' ] );
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
		$blocks_path   = EIGHTEEN73_BLOCKS_PATH . 'build/blocks';
		$manifest_file = EIGHTEEN73_BLOCKS_PATH . 'build/blocks-manifest.php';

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
			 * add_filter( 'eighteen73_blocks_register_{$block_slug}', function( $should_register, $block_folder ) { ... }, 10, 2 );
			 */
			$should_register = apply_filters( "eighteen73_blocks_register_{$block_slug}", true, $block_folder );

			if ( ! $should_register ) {
				continue;
			}

			register_block_type_from_metadata( $block_folder, $block_metadata );
		}
	}
}
