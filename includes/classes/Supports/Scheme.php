<?php
/**
 * Colour schemes.
 *
 * Schemes are defined by the theme in theme.json under `settings.custom.scheme`,
 * each setting the same roles, usually from the palette:
 *
 *     "custom": { "scheme": {
 *         "default": {
 *             "background":         "var:preset|color|base",           // the section's background
 *             "background-surface": "var:preset|color|base-subtle",    // cards, inputs, accordion panels on it
 *             "background-fill":    "var:preset|color|brand-primary",  // strong fills: buttons, badges, active tab
 *             "text":               "var:preset|color|contrast",       // body text
 *             "text-subtle":        "var:preset|color|contrast-subtle", // dates, captions, help text
 *             "text-heading":       "var:preset|color|contrast",       // headings
 *             "text-link":          "var:preset|color|brand-primary",  // links
 *             "text-fill":          "var:preset|color|base",           // text and icons on background-fill
 *             "border":             "var:preset|color|border",         // dividers and card outlines
 *             "border-strong":      "var:preset|color|border-strong",  // input borders, anything that must be seen (3:1)
 *             "highlight":          "var:preset|color|brand-secondary" // eyebrows, icons, active indicators
 *         },
 *         "brand": { … }
 *     } }
 *
 * WordPress turns those into `--wp--custom--scheme--{slug}--{token}` variables.
 * This class maps the active scheme onto short `--scheme--{token}` variables:
 * `:root` gets the default scheme and `.has-scheme-{slug}` swaps in another.
 * Everything inside a scheme (text, headings, links, buttons…) reads the short
 * variables, so content adapts without per-block colour settings.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Supports;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Colour schemes.
 */
class Scheme {

	use Singleton;

	/**
	 * Stylesheet handle for the generated scheme CSS.
	 */
	public const HANDLE = 'matter-schemes';

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		// Fires on the front end and inside the editor canvas.
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_styles' ] );

		// Blocks opt in with `"supports": { "matter": { "scheme": true } }`.
		add_action( 'init', [ $this, 'register_block_support' ], 5 );
	}

	/**
	 * Register the scheme block support.
	 *
	 * Adds a `scheme` attribute to opted-in blocks and the `has-scheme
	 * has-scheme-{slug}` classes through get_block_wrapper_attributes(), so any
	 * dynamic block picks them up without extra code.
	 *
	 * @return void
	 */
	public function register_block_support(): void {
		\WP_Block_Supports::get_instance()->register(
			'matter-scheme',
			[
				'register_attribute' => [ $this, 'register_attribute' ],
				'apply'              => [ $this, 'apply' ],
			]
		);
	}

	/**
	 * Whether a block type opts into schemes.
	 *
	 * @param \WP_Block_Type $block_type Block type.
	 * @return bool
	 */
	public static function is_supported( \WP_Block_Type $block_type ): bool {
		return ! empty( $block_type->supports['matter']['scheme'] );
	}

	/**
	 * Add the `scheme` attribute to supporting blocks.
	 *
	 * @param \WP_Block_Type $block_type Block type.
	 * @return void
	 */
	public function register_attribute( \WP_Block_Type $block_type ): void {
		if ( ! self::is_supported( $block_type ) ) {
			return;
		}

		$block_type->attributes ??= [];

		if ( ! isset( $block_type->attributes['scheme'] ) ) {
			$block_type->attributes['scheme'] = [ 'type' => 'string' ];
		}
	}

	/**
	 * Wrapper classes for a block's scheme.
	 *
	 * @param \WP_Block_Type $block_type Block type.
	 * @param array          $attributes Block attributes.
	 * @return array
	 */
	public function apply( \WP_Block_Type $block_type, array $attributes ): array {
		$scheme = (string) ( $attributes['scheme'] ?? '' );

		if ( ! self::is_supported( $block_type ) || '' === $scheme || ! array_key_exists( $scheme, $this->get_schemes() ) ) {
			return [];
		}

		return [ 'class' => 'has-scheme has-scheme-' . sanitize_html_class( $scheme ) ];
	}

	/**
	 * Data for the editor's scheme control.
	 *
	 * @return array<int, array{slug: string, label: string, tokens: array}>
	 */
	public function get_editor_data(): array {
		$labels = $this->get_labels();
		$data   = [];

		foreach ( $this->get_schemes() as $slug => $tokens ) {
			unset( $tokens['label'] );

			$data[] = [
				'slug'   => (string) $slug,
				'label'  => $labels[ $slug ] ?? (string) $slug,
				'tokens' => $tokens,
			];
		}

		return $data;
	}

	/**
	 * All schemes keyed by slug, each an array of token => value.
	 *
	 * @return array<string, array<string, string>>
	 */
	public function get_schemes(): array {
		/**
		 * Filters the available colour schemes: the theme's (from theme.json)
		 * or none, and whatever else a plugin or the theme's code adds. A
		 * scheme added here lists literal CSS values (or `var:preset|color|slug`
		 * shorthand); an optional `label` names it in the editor.
		 *
		 * @param array<string, array<string, string>> $schemes Schemes keyed by slug.
		 */
		return (array) apply_filters( 'matter_schemes', $this->get_theme_schemes() );
	}

	/**
	 * The schemes theme.json defines, which WordPress turns into
	 * `--wp--custom--scheme--{slug}--{token}` variables.
	 *
	 * @return array<string, array<string, string>>
	 */
	private function get_theme_schemes(): array {
		$schemes = wp_get_global_settings( [ 'custom', 'scheme' ] );

		return is_array( $schemes ) ? array_filter( $schemes, 'is_array' ) : [];
	}

	/**
	 * The default scheme slug, applied to `:root`.
	 *
	 * @return string|null Null when the theme defines no schemes.
	 */
	public function get_default(): ?string {
		$schemes = $this->get_schemes();

		if ( empty( $schemes ) ) {
			return null;
		}

		$default = array_key_exists( 'default', $schemes ) ? 'default' : array_key_first( $schemes );

		/**
		 * Filters the default colour scheme slug.
		 *
		 * @param string $default Default scheme slug.
		 * @param array  $schemes Schemes keyed by slug.
		 */
		$default = (string) apply_filters( 'matter_default_scheme', $default, $schemes );

		return array_key_exists( $default, $schemes ) ? $default : array_key_first( $schemes );
	}

	/**
	 * Human readable scheme labels keyed by slug.
	 *
	 * @return array<string, string>
	 */
	public function get_labels(): array {
		$labels = [];

		foreach ( $this->get_schemes() as $slug => $tokens ) {
			$label           = isset( $tokens['label'] ) && is_string( $tokens['label'] ) ? trim( $tokens['label'] ) : '';
			$labels[ $slug ] = '' !== $label ? $label : ucwords( str_replace( [ '-', '_' ], ' ', (string) $slug ) );
		}

		/**
		 * Filters the colour scheme labels shown in the editor.
		 *
		 * @param array<string, string> $labels Labels keyed by scheme slug.
		 */
		return apply_filters( 'matter_scheme_labels', $labels );
	}

	/**
	 * The generated scheme CSS.
	 *
	 * @return string
	 */
	public function get_css(): string {
		$schemes = $this->get_schemes();
		$default = $this->get_default();

		if ( null === $default ) {
			return '';
		}

		$theme = $this->get_theme_schemes();
		$css   = ':root{' . $this->get_declarations( $default, $schemes[ $default ], $theme[ $default ] ?? [] ) . '}';

		foreach ( $schemes as $slug => $tokens ) {
			$css .= sprintf( '.has-scheme-%s{%s}', sanitize_html_class( (string) $slug ), $this->get_declarations( (string) $slug, $tokens, $theme[ $slug ] ?? [] ) );
		}

		// A scheme always paints its own surface.
		$css .= ':where(.has-scheme){background-color:var(--scheme--background);color:var(--scheme--text);}';

		return $css;
	}

	/**
	 * Enqueue the scheme CSS.
	 *
	 * @return void
	 */
	public function enqueue_styles(): void {
		$css = $this->get_css();

		if ( '' === $css ) {
			return;
		}

		wp_register_style( self::HANDLE, false, [], MATTER_VERSION );
		wp_add_inline_style( self::HANDLE, $css );
		wp_enqueue_style( self::HANDLE );
	}

	/**
	 * CSS declarations mapping a scheme's tokens onto `--scheme--{token}`.
	 *
	 * A token that comes from theme.json, unchanged, reads the variable
	 * WordPress made from it. Any other (a scheme a filter added, or a value a
	 * filter changed) is written out as its own value. A `label` is the
	 * scheme's name, not a colour.
	 *
	 * @param string $slug   Scheme slug.
	 * @param array  $tokens Token => value pairs.
	 * @param array  $theme  The same scheme's tokens in theme.json, if it has them.
	 * @return string
	 */
	private function get_declarations( string $slug, array $tokens, array $theme = [] ): string {
		$declarations = '';
		$slug         = self::kebab( $slug );

		foreach ( $tokens as $token => $value ) {
			if ( 'label' === $token ) {
				continue;
			}

			$name = self::kebab( (string) $token );

			if ( isset( $theme[ $token ] ) && $theme[ $token ] === $value ) {
				$declarations .= sprintf( '--scheme--%1$s:var(--wp--custom--scheme--%2$s--%1$s);', $name, $slug );
				continue;
			}

			$value = self::literal( $value );

			if ( '' !== $value ) {
				$declarations .= sprintf( '--scheme--%1$s:%2$s;', $name, $value );
			}
		}

		return $declarations;
	}

	/**
	 * A token's value as CSS: theme.json's `var:preset|color|slug` shorthand
	 * becomes its variable, and anything that could end the declaration or
	 * the rule is dropped.
	 *
	 * @param mixed $value Value.
	 * @return string
	 */
	private static function literal( mixed $value ): string {
		if ( ! is_string( $value ) ) {
			return '';
		}

		$value = (string) preg_replace_callback(
			'/var:(preset|custom)\|([\w|-]+)/',
			fn( $found ) => 'var(--wp--' . $found[1] . '--' . str_replace( '|', '--', $found[2] ) . ')',
			$value
		);
		$value = wp_strip_all_tags( $value );

		return trim( str_replace( [ ';', '{', '}', '/*', '*/', '\\' ], '', $value ) );
	}

	/**
	 * A name as the CSS variable WordPress makes from it: `textMuted` and
	 * `text_muted` become `text-muted`, `accent2` becomes `accent-2`. The same
	 * result as core's private `_wp_to_kebab_case()` for names like these.
	 *
	 * @param string $name Slug or token.
	 * @return string
	 */
	public static function kebab( string $name ): string {
		$name = (string) preg_replace( '/([a-z])([A-Z])|([A-Z]+)([A-Z][a-z])/', '$1$3-$2$4', $name );
		$name = (string) preg_replace( '/([a-zA-Z])(\d)|(\d)([a-zA-Z])/', '$1$3-$2$4', $name );
		$name = (string) preg_replace( '/[^a-zA-Z0-9]+/', '-', $name );

		return strtolower( trim( $name, '-' ) );
	}
}
