<?php
/**
 * Colour schemes.
 *
 * Schemes are defined by the theme in theme.json under `settings.custom.scheme`:
 *
 *     "custom": { "scheme": { "default": { "background": "…", "text": "…" }, "brand": { … } } }
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
		$schemes = wp_get_global_settings( [ 'custom', 'scheme' ] );

		if ( ! is_array( $schemes ) ) {
			return [];
		}

		$schemes = array_filter( $schemes, 'is_array' );

		/**
		 * Filters the available colour schemes.
		 *
		 * @param array<string, array<string, string>> $schemes Schemes keyed by slug.
		 */
		return apply_filters( 'matter_schemes', $schemes );
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

		foreach ( array_keys( $this->get_schemes() ) as $slug ) {
			$labels[ $slug ] = ucwords( str_replace( [ '-', '_' ], ' ', $slug ) );
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

		$css = ':root{' . $this->get_declarations( $default, $schemes[ $default ] ) . '}';

		foreach ( $schemes as $slug => $tokens ) {
			$css .= sprintf( '.has-scheme-%s{%s}', sanitize_html_class( $slug ), $this->get_declarations( $slug, $tokens ) );
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
	 * @param string $slug   Scheme slug.
	 * @param array  $tokens Token => value pairs.
	 * @return string
	 */
	private function get_declarations( string $slug, array $tokens ): string {
		$declarations = '';
		$slug         = _wp_to_kebab_case( $slug );

		foreach ( array_keys( $tokens ) as $token ) {
			$token         = _wp_to_kebab_case( (string) $token );
			$declarations .= sprintf( '--scheme--%1$s:var(--wp--custom--scheme--%2$s--%1$s);', $token, $slug );
		}

		return $declarations;
	}
}
