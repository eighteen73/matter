<?php
/**
 * Matter's editor script: section registration, the colour scheme control and
 * core block extensions (button icon, focal point).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

use Eighteen73\Matter\Blocks\Carousel;
use Eighteen73\Matter\Blocks\QueryDisplay;
use Eighteen73\Matter\Blocks\TemplatePart;
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
		if ( ! is_admin() ) {
			return;
		}

		// Block icons in the canvas (e.g. the carousel's slide picker) may be
		// dashicons, which the iframe doesn't load by default.
		wp_enqueue_style( 'dashicons' );

		if ( file_exists( MATTER_PATH . 'build/editor/canvas.css' ) ) {
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
					'iconCollections' => Icons::collections(),
					'breakpoints'     => Breakpoints::all(),
					'variants'        => Variants::all(),
					'carouselSlides'  => Carousel::slide_types(),
					// Allowing a carousel, accordion or tabs allows the query
					// blocks behind their posts versions.
					'queryBlocks'     => QueryDisplay::query_blocks(),
					// Template parts are placed in templates, so only the Site
					// Editor needs the list.
					'templateParts'   => 'site-editor' === get_current_screen()?->id ? TemplatePart::all() : [],
				]
			) . ';',
			'before'
		);

		wp_set_script_translations( 'matter-editor', 'matter' );
	}
}
