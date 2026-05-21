<?php
/**
 * Shared JSON config loader.
 *
 * @package Eighteen73\Blocks
 */

namespace Eighteen73\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Loads config files from the plugin config directory.
 */
class Config {

	/**
	 * Loaded config files.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	private static $files = [];

	/**
	 * Get a config file by name.
	 *
	 * @param string $name Config file name without extension.
	 * @return array<string, mixed>
	 */
	public static function file( string $name ): array {
		$config_key = sanitize_key( $name );

		if ( isset( self::$files[ $config_key ] ) ) {
			return self::$files[ $config_key ];
		}

		$config_file = EIGHTEEN73_BLOCKS_PATH . 'config/' . $config_key . '.json';

		if ( ! file_exists( $config_file ) ) {
			self::$files[ $config_key ] = [];
			return self::$files[ $config_key ];
		}

		$decoded = wp_json_file_decode( $config_file, [ 'associative' => true ] );

		self::$files[ $config_key ] = is_array( $decoded ) ? $decoded : [];

		return self::$files[ $config_key ];
	}

	/**
	 * Get a keyed array from a config file.
	 *
	 * @param string               $name    Config file name without extension.
	 * @param string               $key      Top-level config key.
	 * @param array<string, mixed> $fallback Fallback value.
	 * @return array<string, mixed>
	 */
	public static function get( string $name, string $key, array $fallback = [] ): array {
		$value = self::file( $name )[ $key ] ?? $fallback;

		return is_array( $value ) ? $value : $fallback;
	}
}
