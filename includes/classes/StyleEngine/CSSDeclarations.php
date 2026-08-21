<?php
/**
 * CSS Declarations class.
 *
 * Holds and processes CSS declarations (property => value pairs).
 * Based on WordPress's WP_Style_Engine_CSS_Declarations pattern.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\StyleEngine;

defined( 'ABSPATH' ) || exit;

/**
 * Manages CSS declarations (property => value pairs).
 */
class CSSDeclarations {

	/**
	 * An array of CSS declarations (property => value pairs).
	 *
	 * @var array<string, string>
	 */
	protected array $declarations = [];

	/**
	 * Constructor.
	 *
	 * @param array<string, string> $declarations Optional. An associative array of CSS definitions.
	 */
	public function __construct( array $declarations = [] ) {
		$this->add_declarations( $declarations );
	}

	/**
	 * Adds a single declaration.
	 *
	 * @param string $property The CSS property.
	 * @param string $value    The CSS value.
	 *
	 * @return self Returns the object to allow chaining methods.
	 */
	public function add_declaration( string $property, string $value ): self {
		$property = $this->sanitize_property( $property );

		if ( empty( $property ) ) {
			return $this;
		}

		$value = trim( $value );

		if ( '' === $value ) {
			return $this;
		}

		$this->declarations[ $property ] = $value;

		return $this;
	}

	/**
	 * Adds multiple declarations.
	 *
	 * @param array<string, string> $declarations An associative array of CSS definitions.
	 *
	 * @return self Returns the object to allow chaining methods.
	 */
	public function add_declarations( array $declarations ): self {
		foreach ( $declarations as $property => $value ) {
			$this->add_declaration( $property, $value );
		}

		return $this;
	}

	/**
	 * Removes a single declaration.
	 *
	 * @param string $property The CSS property.
	 *
	 * @return self Returns the object to allow chaining methods.
	 */
	public function remove_declaration( string $property ): self {
		unset( $this->declarations[ $property ] );

		return $this;
	}

	/**
	 * Gets the declarations array.
	 *
	 * @return array<string, string>
	 */
	public function get_declarations(): array {
		return $this->declarations;
	}

	/**
	 * Gets the declarations output as a CSS string.
	 *
	 * @return string The CSS declarations.
	 */
	public function get_declarations_string(): string {
		if ( empty( $this->declarations ) ) {
			return '';
		}

		$declarations_array = [];

		foreach ( $this->declarations as $property => $value ) {
			$declarations_array[] = "{$property}: {$value}";
		}

		return implode( '; ', $declarations_array ) . ';';
	}

	/**
	 * Sanitizes a CSS property.
	 *
	 * @param string $property The CSS property.
	 *
	 * @return string The sanitized property.
	 */
	protected function sanitize_property( string $property ): string {
		return trim( wp_strip_all_tags( $property ) );
	}
}
