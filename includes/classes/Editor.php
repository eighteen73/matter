<?php
/**
 * Matter's editor script: section registration, the colour scheme control and
 * core block extensions (button icon, focal point).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

use Eighteen73\Matter\Extensions\ButtonIcon;
use Eighteen73\Matter\Sections\Sections;
use Eighteen73\Matter\Supports\Scheme;

defined( 'ABSPATH' ) || exit;

/**
 * Matter's editor script.
 */
class Editor {

	use Singleton;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue' ] );
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_canvas_styles' ] );
	}

	/**
	 * Styles for the editor canvas (iframe) only.
	 *
	 * @return void
	 */
	public function enqueue_canvas_styles(): void {
		if ( is_admin() && file_exists( MATTER_PATH . 'build/editor/canvas.css' ) ) {
			wp_enqueue_style( 'matter-editor-canvas', MATTER_URL . 'build/editor/canvas.css', [], (string) filemtime( MATTER_PATH . 'build/editor/canvas.css' ) );
		}
	}

	/**
	 * Enqueue the editor script and its data.
	 *
	 * @return void
	 */
	public function enqueue(): void {
		$asset_file = MATTER_PATH . 'build/editor/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script( 'matter-editor', MATTER_URL . 'build/editor/index.js', $asset['dependencies'], $asset['version'], true );

		if ( file_exists( MATTER_PATH . 'build/editor/index.css' ) ) {
			wp_enqueue_style( 'matter-editor', MATTER_URL . 'build/editor/index.css', [], $asset['version'] );
		}

		wp_add_inline_script(
			'matter-editor',
			'window.matterEditor = ' . wp_json_encode(
				[
					'sections'        => Sections::names(),
					'schemes'         => Scheme::instance()->get_editor_data(),
					'iconCollections' => ButtonIcon::collections(),
					'breakpoints'     => Breakpoints::all(),
					'variants'        => Variants::all(),
				]
			) . ';',
			'before'
		);

		wp_set_script_translations( 'matter-editor', 'matter' );
	}
}
