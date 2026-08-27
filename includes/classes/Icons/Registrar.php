<?php
/**
 * Registers the Matter icon collection with WordPress 7.1.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Icons;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Icon collection registrar.
 */
class Registrar {

	use Singleton;

	/**
	 * Collection slug.
	 *
	 * @var string
	 */
	public const COLLECTION = 'matter';

	/**
	 * Setup registration hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register' ] );
	}

	/**
	 * Register the collection and bundled icons.
	 *
	 * @return void
	 */
	public function register(): void {
		if ( ! function_exists( 'wp_register_icon_collection' ) || ! function_exists( 'wp_register_icon' ) ) {
			return;
		}

		wp_register_icon_collection(
			self::COLLECTION,
			[
				'label'       => get_bloginfo( 'name' ) ?: __( 'Matter', 'matter' ),
				'description' => __( 'Icons provided by the Matter plugin.', 'matter' ),
			]
		);

		foreach ( $this->get_icon_files() as $file ) {
			$slug  = basename( $file, '.svg' );
			$label = $this->get_icon_label( $slug );

			wp_register_icon(
				self::COLLECTION . '/' . $slug,
				[
					'label'     => $label,
					'file_path' => $file,
				]
			);
		}
	}

	/**
	 * Get bundled SVG file paths.
	 *
	 * @return string[]
	 */
	public function get_icon_files(): array {
		$icons_path = MATTER_PATH . 'assets/icons';

		if ( ! is_dir( $icons_path ) ) {
			return [];
		}

		$files = glob( $icons_path . '/*.svg' );

		return is_array( $files ) ? $files : [];
	}

	/**
	 * Human-readable label for an icon slug.
	 *
	 * @param string $slug Icon slug.
	 * @return string
	 */
	private function get_icon_label( string $slug ): string {
		$labels = [
			'arrow-left'    => __( 'Arrow left', 'matter' ),
			'arrow-right'   => __( 'Arrow right', 'matter' ),
			'check'         => __( 'Check', 'matter' ),
			'chevron-left'  => __( 'Chevron left', 'matter' ),
			'chevron-right' => __( 'Chevron right', 'matter' ),
			'open-in-new'   => __( 'Open in new', 'matter' ),
		];

		if ( isset( $labels[ $slug ] ) ) {
			return $labels[ $slug ];
		}

		return ucwords( str_replace( '-', ' ', $slug ) );
	}
}
