<?php
/**
 * Matter icon registry.
 *
 * Mirrors WP_Icons_Registry semantics with a public register() method.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Icons;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and resolves Matter icon SVGs.
 */
class Registry implements RegistryInterface {
	use Singleton;

	/**
	 * Registered icons keyed by name.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	private $registered_icons = [];

	/**
	 * Registers an icon.
	 *
	 * @param string               $icon_name        Icon name including namespace.
	 * @param array<string, mixed> $icon_properties  Icon properties.
	 * @return bool True if the icon was registered successfully.
	 */
	public function register( string $icon_name, array $icon_properties ): bool {
		if ( ! isset( $icon_name ) || ! is_string( $icon_name ) ) {
			_doing_it_wrong(
				__METHOD__,
				esc_html__( 'Icon name must be a string.', 'matter' ),
				'0.1.0'
			);
			return false;
		}

		if ( preg_match( '/[A-Z]/', $icon_name ) ) {
			_doing_it_wrong(
				__METHOD__,
				esc_html__( 'Icon names must not contain uppercase characters.', 'matter' ),
				'0.1.0'
			);
			return false;
		}

		$name_matcher = '/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/';
		if ( ! preg_match( $name_matcher, $icon_name ) ) {
			_doing_it_wrong(
				__METHOD__,
				esc_html__( 'Icon names must contain a namespace prefix. Example: matter/info', 'matter' ),
				'0.1.0'
			);
			return false;
		}

		if ( $this->is_registered( $icon_name ) ) {
			_doing_it_wrong(
				__METHOD__,
				esc_html__( 'Icon is already registered.', 'matter' ),
				'0.1.0'
			);
			return false;
		}

		$allowed_keys = array_fill_keys( [ 'label', 'content', 'file_path' ], 1 );
		foreach ( array_keys( $icon_properties ) as $key ) {
			if ( ! array_key_exists( $key, $allowed_keys ) ) {
				_doing_it_wrong(
					__METHOD__,
					sprintf(
					/* translators: %s: invalid icon property key */
						esc_html__( 'Invalid icon property: "%s".', 'matter' ),
						esc_html( $key )
					),
					'0.1.0'
				);
				return false;
			}
		}

		if ( ! isset( $icon_properties['label'] ) || ! is_string( $icon_properties['label'] ) ) {
			_doing_it_wrong(
				__METHOD__,
				esc_html__( 'Icon label must be a string.', 'matter' ),
				'0.1.0'
			);
			return false;
		}

		if (
			( ! isset( $icon_properties['content'] ) && ! isset( $icon_properties['file_path'] ) ) ||
			( isset( $icon_properties['content'] ) && isset( $icon_properties['file_path'] ) )
		) {
			_doing_it_wrong(
				__METHOD__,
				esc_html__( 'Icons must provide either `content` or `file_path`.', 'matter' ),
				'0.1.0'
			);
			return false;
		}

		if ( isset( $icon_properties['content'] ) ) {
			if ( ! is_string( $icon_properties['content'] ) ) {
				_doing_it_wrong(
					__METHOD__,
					esc_html__( 'Icon content must be a string.', 'matter' ),
					'0.1.0'
				);
				return false;
			}

			$sanitized_icon_content = $this->sanitize_icon_content( $icon_properties['content'] );
			if ( empty( $sanitized_icon_content ) ) {
				_doing_it_wrong(
					__METHOD__,
					esc_html__( 'Icon content does not contain valid SVG markup.', 'matter' ),
					'0.1.0'
				);
				return false;
			}
		}

		if ( isset( $icon_properties['file_path'] ) && ! is_string( $icon_properties['file_path'] ) ) {
			_doing_it_wrong(
				__METHOD__,
				esc_html__( 'Icon file path must be a string.', 'matter' ),
				'0.1.0'
			);
			return false;
		}

		$icon = array_merge(
			$icon_properties,
			[ 'name' => $icon_name ]
		);

		$this->registered_icons[ $icon_name ] = $icon;

		return true;
	}

	/**
	 * Retrieves an array containing the properties of a registered icon.
	 *
	 * @param string $icon_name Icon name including namespace.
	 * @return array<string, mixed>|null Registered icon properties or null if not registered.
	 */
	public function get_registered_icon( string $icon_name ): ?array {
		if ( ! $this->is_registered( $icon_name ) ) {
			return null;
		}

		$icon            = $this->registered_icons[ $icon_name ];
		$icon['content'] = $icon['content'] ?? $this->get_content( $icon_name );

		if ( null === $icon['content'] ) {
			return null;
		}

		return $icon;
	}

	/**
	 * Retrieves all registered icons.
	 *
	 * @param string $search Optional search term.
	 * @return array<int, array<string, mixed>> Registered icon properties.
	 */
	public function get_registered_icons( string $search = '' ): array {
		$icons = [];

		foreach ( $this->registered_icons as $icon ) {
			if (
				! empty( $search )
				&& false === stripos( $icon['name'], $search )
				&& false === stripos( $icon['label'] ?? '', $search )
			) {
				continue;
			}

			$content = $icon['content'] ?? $this->get_content( $icon['name'] );

			if ( null === $content ) {
				continue;
			}

			$icon['content'] = $content;
			$icons[]         = $icon;
		}

		return $icons;
	}

	/**
	 * Checks if an icon is registered.
	 *
	 * @param string $icon_name Icon name including namespace.
	 * @return bool
	 */
	public function is_registered( string $icon_name ): bool {
		return isset( $this->registered_icons[ $icon_name ] );
	}

	/**
	 * Sanitizes icon SVG content.
	 *
	 * @param string $icon_content Raw SVG markup.
	 * @return string Sanitized SVG markup.
	 */
	public function sanitize_icon_content( string $icon_content ): string {
		$allowed_tags = [
			'svg'     => [
				'class'       => true,
				'xmlns'       => true,
				'width'       => true,
				'height'      => true,
				'viewbox'     => true,
				'aria-hidden' => true,
				'role'        => true,
				'focusable'   => true,
			],
			'path'    => [
				'fill'      => true,
				'fill-rule' => true,
				'd'         => true,
				'transform' => true,
			],
			'polygon' => [
				'fill'      => true,
				'fill-rule' => true,
				'points'    => true,
				'transform' => true,
				'focusable' => true,
			],
		];

		return wp_kses( $icon_content, $allowed_tags );
	}

	/**
	 * Retrieves and caches icon content from disk.
	 *
	 * @param string $icon_name Icon name including namespace.
	 * @return string|null Sanitized SVG content or null on failure.
	 */
	private function get_content( string $icon_name ): ?string {
		if ( ! isset( $this->registered_icons[ $icon_name ]['file_path'] ) ) {
			return null;
		}

		$file_path = $this->registered_icons[ $icon_name ]['file_path'];

		if ( ! is_readable( $file_path ) ) {
			return null;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$content = file_get_contents( $file_path );

		if ( false === $content ) {
			return null;
		}

		$content = $this->sanitize_icon_content( $content );

		if ( empty( $content ) ) {
			return null;
		}

		$this->registered_icons[ $icon_name ]['content'] = $content;

		return $content;
	}
}
