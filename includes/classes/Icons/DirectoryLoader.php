<?php
/**
 * Loads icons from a directory of SVG files.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Icons;

use Eighteen73\Matter\Config;

defined( 'ABSPATH' ) || exit;

/**
 * Registers icons by scanning an SVG directory.
 */
class DirectoryLoader {

	/**
	 * Registers every SVG in a directory with the given namespace prefix.
	 *
	 * Labels are derived from the filename (e.g. arrow-right → Arrow Right).
	 * Optional overrides can be supplied in config/icon-labels.json.
	 *
	 * @param string $directory     Absolute path to the icons directory.
	 * @param string $icon_namespace Icon namespace prefix.
	 * @return void
	 */
	public static function register_from_directory( string $directory, string $icon_namespace = 'matter' ): void {
		$directory = trailingslashit( $directory );

		if ( ! is_dir( $directory ) ) {
			return;
		}

		$label_overrides = Config::file( 'icon-labels' );
		$svg_files       = glob( $directory . '*.svg' );

		if ( ! is_array( $svg_files ) ) {
			return;
		}

		sort( $svg_files );

		foreach ( $svg_files as $file_path ) {
			$slug = pathinfo( $file_path, PATHINFO_FILENAME );

			if ( ! is_string( $slug ) || ! self::is_valid_icon_slug( $slug ) ) {
				continue;
			}

			$label = $label_overrides[ $slug ] ?? self::slug_to_label( $slug );

			if ( ! is_string( $label ) || '' === $label ) {
				continue;
			}

			/**
			 * Filters the label used when registering an icon from the directory.
			 *
			 * @param string $label     Human-readable icon label.
			 * @param string $slug      Icon slug derived from the filename.
			 * @param string $icon_namespace Icon namespace prefix.
			 */
			$label = apply_filters( 'matter_icon_label', $label, $slug, $icon_namespace );

			$icon_name = $icon_namespace . '/' . $slug;

			if ( function_exists( 'register_icon' ) ) {
				register_icon(
					$icon_name,
					[
						'label'     => $label,
						'file_path' => $file_path,
					]
				);
				continue;
			}

			Registry::instance()->register(
				$icon_name,
				[
					'label'     => $label,
					'file_path' => $file_path,
				]
			);
		}
	}

	/**
	 * Converts a filename slug to a human-readable label.
	 *
	 * @param string $slug Icon slug.
	 * @return string
	 */
	public static function slug_to_label( string $slug ): string {
		$label = str_replace( [ '-', '_' ], ' ', $slug );

		return ucwords( $label );
	}

	/**
	 * Validates an icon slug derived from a filename.
	 *
	 * @param string $slug Icon slug.
	 * @return bool
	 */
	private static function is_valid_icon_slug( string $slug ): bool {
		return (bool) preg_match( '/^[a-z][a-z0-9-]*$/', $slug );
	}
}
