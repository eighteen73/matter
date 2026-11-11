<?php
/**
 * Handles block registration.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use WP_Block_Metadata_Registry;
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
	 * Hidden from the inserter; existing content using them still renders.
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
	 * Hidden from the inserter; existing content using them still renders.
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
		add_action( 'init', [ $this, 'register' ] );
		add_filter( 'register_block_type_args', [ $this, 'hide_replaced_blocks' ], 10, 2 );
		add_filter( 'block_type_metadata', [ $this, 'version_styles' ] );
	}

	/**
	 * Cache-bust Matter's block stylesheets when they change.
	 *
	 * Core versions a block's scripts from their `.asset.php` hash, but its
	 * styles from block.json's `version`, which only changes on release, so
	 * browsers would keep an old stylesheet after an update. The version
	 * becomes the newest modification time of the block's built stylesheets
	 * (as Assets does for Matter's other files).
	 *
	 * @param array $metadata Block metadata.
	 * @return array
	 */
	public function version_styles( array $metadata ): array {
		if ( ! str_starts_with( (string) ( $metadata['name'] ?? '' ), 'matter/' ) || empty( $metadata['file'] ) ) {
			return $metadata;
		}

		$folder = dirname( $metadata['file'] );
		$times  = [];

		foreach ( [ 'style', 'editorStyle', 'viewStyle' ] as $field ) {
			foreach ( (array) ( $metadata[ $field ] ?? [] ) as $style ) {
				if ( ! is_string( $style ) || ! str_starts_with( $style, 'file:' ) ) {
					continue;
				}

				$path = $folder . '/' . remove_block_asset_path_prefix( $style );

				if ( file_exists( $path ) ) {
					$times[] = filemtime( $path );
				}
			}
		}

		if ( $times ) {
			$metadata['version'] = (string) max( $times );
		}

		return $metadata;
	}

	/**
	 * Hide blocks Matter replaces from the inserter.
	 *
	 * Uses supports.inserter rather than the allowed-blocks list, so blocks
	 * registered only in JavaScript aren't affected and the theme's own
	 * allow-list keeps working.
	 *
	 * @param array  $args       Block type args.
	 * @param string $block_name Block name.
	 * @return array
	 */
	public function hide_replaced_blocks( array $args, string $block_name ): array {
		if ( in_array( $block_name, array_merge( self::DISABLED_CORE_BLOCKS, self::DISABLED_THIRD_PARTY_BLOCKS ), true ) ) {
			$args['supports']             = $args['supports'] ?? [];
			$args['supports']['inserter'] = false;
		}

		return $args;
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
