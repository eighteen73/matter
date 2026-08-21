<?php
/**
 * CSS Rule class.
 *
 * Combines a CSS selector with declarations.
 * Based on WordPress's WP_Style_Engine_CSS_Rule pattern.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\StyleEngine;

defined( 'ABSPATH' ) || exit;

/**
 * Manages a CSS rule (selector + declarations).
 */
class CSSRule {

	/**
	 * The CSS selector.
	 *
	 * @var string
	 */
	protected string $selector;

	/**
	 * The CSS declarations.
	 *
	 * @var CSSDeclarations
	 */
	protected CSSDeclarations $declarations;

	/**
	 * Constructor.
	 *
	 * @param string                                $selector     Optional. The CSS selector.
	 * @param array<string, string>|CSSDeclarations $declarations Optional. CSS declarations as array or object.
	 */
	public function __construct( string $selector = '', $declarations = [] ) {
		$this->set_selector( $selector );
		$this->add_declarations( $declarations );
	}

	/**
	 * Sets the selector.
	 *
	 * @param string $selector The CSS selector.
	 *
	 * @return self Returns the object to allow chaining methods.
	 */
	public function set_selector( string $selector ): self {
		$this->selector = $selector;

		return $this;
	}

	/**
	 * Gets the selector.
	 *
	 * @return string
	 */
	public function get_selector(): string {
		return $this->selector;
	}

	/**
	 * Adds declarations.
	 *
	 * @param array<string, string>|CSSDeclarations $declarations CSS declarations as array or object.
	 *
	 * @return self Returns the object to allow chaining methods.
	 */
	public function add_declarations( $declarations ): self {
		if ( $declarations instanceof CSSDeclarations ) {
			$this->declarations = $declarations;
		} else {
			$this->declarations = new CSSDeclarations( $declarations );
		}

		return $this;
	}

	/**
	 * Gets the declarations object.
	 *
	 * @return CSSDeclarations
	 */
	public function get_declarations(): CSSDeclarations {
		return $this->declarations ?? new CSSDeclarations();
	}

	/**
	 * Gets the complete CSS rule as a string.
	 *
	 * @return string
	 */
	public function get_css(): string {
		$selector     = $this->get_selector();
		$declarations = $this->get_declarations()->get_declarations_string();

		if ( empty( $selector ) || empty( $declarations ) ) {
			return '';
		}

		return "{$selector} { {$declarations} }";
	}
}
