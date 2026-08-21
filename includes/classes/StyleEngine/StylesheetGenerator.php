<?php
/**
 * Stylesheet Generator class.
 *
 * Generates CSS stylesheets for various use cases (utility classes, container classes, etc.).
 * Based on WordPress's Style Engine and WP_Theme_JSON patterns.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\StyleEngine;

defined( 'ABSPATH' ) || exit;

/**
 * Generates CSS stylesheets following WordPress core patterns.
 */
class StylesheetGenerator {

	/**
	 * CSS rules collection.
	 *
	 * @var CSSRule[]
	 */
	protected array $rules = [];

	/**
	 * Adds a CSS rule.
	 *
	 * @param CSSRule $rule The CSS rule to add.
	 *
	 * @return self Returns the object to allow chaining methods.
	 */
	public function add_rule( CSSRule $rule ): self {
		$this->rules[] = $rule;

		return $this;
	}

	/**
	 * Adds multiple CSS rules.
	 *
	 * @param CSSRule[] $rules Array of CSS rules.
	 *
	 * @return self Returns the object to allow chaining methods.
	 */
	public function add_rules( array $rules ): self {
		foreach ( $rules as $rule ) {
			if ( $rule instanceof CSSRule ) {
				$this->add_rule( $rule );
			}
		}

		return $this;
	}

	/**
	 * Generate a utility class rule.
	 *
	 * Following WordPress pattern: .has-{slug}-{property} { property: value !important; }
	 *
	 * @param string                $selector     The CSS selector (e.g., '.has-icon-default-arrow-right').
	 * @param array<string, string> $declarations CSS property => value pairs.
	 * @param bool                  $important    Whether to add !important. Default true.
	 *
	 * @return CSSRule
	 */
	public function generate_utility_class( string $selector, array $declarations, bool $important = true ): CSSRule {
		$css_declarations = [];

		foreach ( $declarations as $property => $value ) {
			$css_declarations[ $property ] = $important ? "{$value} !important" : $value;
		}

		return new CSSRule( $selector, $css_declarations );
	}

	/**
	 * Generate multiple utility class rules from a preset pattern.
	 *
	 * @param array<int, array<string, mixed>> $presets Array of preset definitions.
	 * @param string                           $class_pattern Class pattern with $slug placeholder.
	 * @param string                           $property_name CSS property name.
	 * @param callable                         $value_callback Callable to generate value from preset.
	 * @param bool                             $important Whether to add !important. Default true.
	 *
	 * @return CSSRule[]
	 */
	public function generate_utility_classes_from_presets(
		array $presets,
		string $class_pattern,
		string $property_name,
		callable $value_callback,
		bool $important = true
	): array {
		$rules = [];

		foreach ( $presets as $preset ) {
			$slug = $preset['slug'] ?? $preset['name'] ?? '';

			if ( empty( $slug ) ) {
				continue;
			}

			$slug     = sanitize_html_class( $slug );
			$selector = str_replace( '$slug', $slug, $class_pattern );
			$value    = $value_callback( $preset );

			if ( empty( $value ) ) {
				continue;
			}

			$rules[] = $this->generate_utility_class(
				$selector,
				[ $property_name => $value ],
				$important
			);
		}

		return $rules;
	}

	/**
	 * Generate sequential container classes.
	 *
	 * Like WordPress's wp-container-1, wp-container-2, etc.
	 *
	 * @param int                   $count Number of container classes to generate.
	 * @param string                $pattern Class pattern with $number placeholder.
	 * @param array<string, string> $declarations CSS declarations for each container.
	 * @param callable|null         $callback Optional callback to customize declarations per container.
	 *
	 * @return CSSRule[]
	 */
	public function generate_sequential_container_classes(
		int $count,
		string $pattern,
		array $declarations = [],
		?callable $callback = null
	): array {
		$rules = [];

		for ( $i = 1; $i <= $count; $i++ ) {
			$selector = str_replace( '$number', (string) $i, $pattern );

			if ( $callback && is_callable( $callback ) ) {
				$custom_declarations = $callback( $i, $declarations );
			} else {
				$custom_declarations = $declarations;
			}

			$rules[] = new CSSRule( $selector, $custom_declarations );
		}

		return $rules;
	}

	/**
	 * Generate a CSS ruleset from an array format.
	 *
	 * Matches WP_Theme_JSON::to_ruleset() signature for compatibility.
	 *
	 * @param string $selector CSS selector.
	 * @param array  $declarations Array of declarations with 'name' and 'value' keys.
	 *
	 * @return string
	 */
	public static function to_ruleset( string $selector, array $declarations ): string {
		if ( empty( $declarations ) ) {
			return '';
		}

		$declaration_block = array_reduce(
			$declarations,
			static function ( $carry, $element ) {
				return $carry .= $element['name'] . ': ' . $element['value'] . ';';
			},
			''
		);

		return $selector . '{' . $declaration_block . '}';
	}

	/**
	 * Get the complete stylesheet as a string.
	 *
	 * @param bool $minified Whether to minify the output. Default true.
	 *
	 * @return string
	 */
	public function get_stylesheet( bool $minified = true ): string {
		if ( empty( $this->rules ) ) {
			return '';
		}

		$css = '';

		foreach ( $this->rules as $rule ) {
			$css .= $rule->get_css();

			if ( ! $minified ) {
				$css .= "\n";
			}
		}

		return $css;
	}

	/**
	 * Clear all rules.
	 *
	 * @return self
	 */
	public function clear(): self {
		$this->rules = [];

		return $this;
	}
}
