<?php
/**
 * Button icon masks from the WordPress icon registry.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_HTML_Tag_Processor;
use WP_Icons_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Icon class.
 */
class Icon {

	use Singleton;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_core/button', [ $this, 'filter_rendered_block' ], 10, 2 );
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_styles' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_styles' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_data' ], 20 );
	}

	/**
	 * Enqueue button icon CSS in the editor canvas and on the front end.
	 *
	 * @return void
	 */
	public function enqueue_styles(): void {
		$style_path = MATTER_PATH . 'build/extensions/style-icon.css';

		if ( ! file_exists( $style_path ) ) {
			return;
		}

		$handle = 'matter-extension-icon-style';

		if ( ! wp_style_is( $handle, 'registered' ) ) {
			wp_register_style(
				$handle,
				MATTER_URL . 'build/extensions/style-icon.css',
				[],
				(string) filemtime( $style_path )
			);
		}

		wp_enqueue_style( $handle );
	}

	/**
	 * Localize mask URLs for the editor so --icon matches the front end.
	 *
	 * @return void
	 */
	public function enqueue_editor_data(): void {
		if ( ! wp_script_is( 'matter-extension-icon', 'enqueued' ) ) {
			return;
		}

		wp_add_inline_script(
			'matter-extension-icon',
			'window.matterIconMasks = ' . wp_json_encode( $this->get_icon_mask_map() ) . ';',
			'before'
		);
	}

	/**
	 * Apply layout classes and an inline --icon mask from the selected icon.
	 *
	 * @param string $block_content Block HTML.
	 * @param array  $block         Parsed block.
	 * @return string
	 */
	public function filter_rendered_block( string $block_content, array $block ): string {
		if ( '' === $block_content ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );

		if ( ! $processor->next_tag( [ 'class_name' => 'wp-block-button' ] ) ) {
			return $block_content;
		}

		$this->remove_generated_icon_classes( $processor );

		$icon      = isset( $block['attrs']['icon'] ) && is_array( $block['attrs']['icon'] ) ? $block['attrs']['icon'] : [];
		$icon_name = isset( $icon['name'] ) && is_string( $icon['name'] ) ? $icon['name'] : '';
		$mask_url  = '' === $icon_name ? '' : $this->get_icon_mask_url( $icon_name );
		$color     = isset( $icon['color'] ) && is_string( $icon['color'] ) ? sanitize_title( $icon['color'] ) : '';

		if ( '' === $mask_url ) {
			$this->set_css_custom_properties(
				$processor,
				[
					'--icon'       => null,
					'--icon-color' => null,
				]
			);

			return $processor->get_updated_html();
		}

		$processor->add_class( 'has-icon' );
		$processor->add_class( ( $icon['position'] ?? 'after' ) === 'before' ? 'has-icon-before' : 'has-icon-after' );

		if ( '' !== $color ) {
			$processor->add_class( 'has-icon-color' );
		}

		$this->set_css_custom_properties(
			$processor,
			[
				'--icon'       => $mask_url,
				'--icon-color' => '' !== $color ? sprintf( 'var(--wp--preset--color--%s)', $color ) : null,
			]
		);

		return $processor->get_updated_html();
	}

	/**
	 * Strip generated icon classes from the current tag.
	 *
	 * @param WP_HTML_Tag_Processor $processor Tag processor.
	 * @return void
	 */
	private function remove_generated_icon_classes( WP_HTML_Tag_Processor $processor ): void {
		$class_attr = $processor->get_attribute( 'class' );

		if ( ! is_string( $class_attr ) ) {
			return;
		}

		foreach ( preg_split( '/\s+/', $class_attr ) as $class_name ) {
			if ( '' !== $class_name && 0 === strpos( $class_name, 'has-icon' ) ) {
				$processor->remove_class( $class_name );
			}
		}
	}

	/**
	 * Set or remove CSS custom properties on the current tag.
	 *
	 * @param WP_HTML_Tag_Processor      $processor   Tag processor.
	 * @param array<string, string|null> $properties Property names mapped to values, or null to remove.
	 * @return void
	 */
	private function set_css_custom_properties( WP_HTML_Tag_Processor $processor, array $properties ): void {
		$existing = $processor->get_attribute( 'style' );
		$existing = is_string( $existing ) ? $existing : '';

		$declarations = [];

		foreach ( explode( ';', $existing ) as $declaration ) {
			$declaration = trim( $declaration );

			if ( '' === $declaration ) {
				continue;
			}

			$skip = false;

			foreach ( array_keys( $properties ) as $property ) {
				if ( 0 === stripos( $declaration, $property . ':' ) ) {
					$skip = true;
					break;
				}
			}

			if ( ! $skip ) {
				$declarations[] = $declaration;
			}
		}

		foreach ( $properties as $property => $value ) {
			if ( null !== $value && '' !== $value ) {
				$declarations[] = $property . ': ' . $value;
			}
		}

		if ( empty( $declarations ) ) {
			$processor->remove_attribute( 'style' );
			return;
		}

		$processor->set_attribute( 'style', implode( '; ', $declarations ) . ';' );
	}

	/**
	 * Resolve a stored icon name to a CSS mask data URI.
	 *
	 * @param string $icon_name Namespaced icon name.
	 * @return string
	 */
	private function get_icon_mask_url( string $icon_name ): string {
		if ( ! class_exists( WP_Icons_Registry::class ) ) {
			return '';
		}

		$icon    = WP_Icons_Registry::get_instance()->get_registered_icon( $icon_name );
		$content = isset( $icon['content'] ) && is_string( $icon['content'] ) ? $icon['content'] : '';

		if ( '' === $content ) {
			return '';
		}

		return $this->svg_to_data_uri( $this->prepare_svg_for_mask( $content ) );
	}

	/**
	 * Map registered icon names to CSS mask URLs for the editor.
	 *
	 * @return array<string, string>
	 */
	private function get_icon_mask_map(): array {
		if ( ! class_exists( WP_Icons_Registry::class ) ) {
			return [];
		}

		$masks = [];

		foreach ( WP_Icons_Registry::get_instance()->get_registered_icons() as $icon ) {
			$name    = isset( $icon['name'] ) && is_string( $icon['name'] ) ? $icon['name'] : '';
			$content = isset( $icon['content'] ) && is_string( $icon['content'] ) ? $icon['content'] : '';

			if ( '' === $name || '' === $content ) {
				continue;
			}

			$mask_url = $this->svg_to_data_uri( $this->prepare_svg_for_mask( $content ) );

			if ( '' !== $mask_url ) {
				$masks[ $name ] = $mask_url;
			}
		}

		return $masks;
	}

	/**
	 * Make SVG markup reliable as a CSS mask.
	 *
	 * Data-URI masks are parsed as XML, so wp_kses' lowercased `viewbox`
	 * is ignored and the SVG falls back to a 300×150 canvas. Restore
	 * `viewBox` and matching width/height. currentColor is flattened to
	 * black; the button tints the mask with background-color.
	 *
	 * @param string $svg SVG markup.
	 * @return string
	 */
	private function prepare_svg_for_mask( string $svg ): string {
		$svg = str_ireplace( 'currentcolor', '#000', $svg );

		$updated = preg_replace_callback(
			'/<svg\b([^>]*)>/i',
			[ $this, 'normalize_svg_opening_tag' ],
			$svg,
			1
		);

		return is_string( $updated ) ? $updated : $svg;
	}

	/**
	 * Restore SVG attributes that HTML sanitization lowercases.
	 *
	 * @param array $matches Opening <svg> tag matches.
	 * @return string
	 */
	private function normalize_svg_opening_tag( array $matches ): string {
		$attrs = $matches[1] ?? '';
		$attrs = preg_replace( '/\bviewbox=/i', 'viewBox=', $attrs ) ?? $attrs;

		if ( ! preg_match( '/\bfill=/i', $attrs ) ) {
			$attrs .= ' fill="#000"';
		}

		if ( preg_match( '/viewBox=[\'"]([\d.\s,-]+)[\'"]/', $attrs, $viewbox ) ) {
			$parts = preg_split( '/[\s,]+/', trim( $viewbox[1] ) );

			if ( is_array( $parts ) && 4 === count( $parts ) ) {
				if ( ! preg_match( '/\bwidth=/i', $attrs ) ) {
					$attrs .= ' width="' . $parts[2] . '"';
				}

				if ( ! preg_match( '/\bheight=/i', $attrs ) ) {
					$attrs .= ' height="' . $parts[3] . '"';
				}
			}
		}

		return '<svg' . $attrs . '>';
	}

	/**
	 * Convert SVG markup to a CSS data URI.
	 *
	 * @param string $svg SVG markup.
	 * @return string
	 */
	private function svg_to_data_uri( string $svg ): string {
		$svg = preg_replace( '/>\s+</', '><', $svg );
		$svg = preg_replace( '/\s+/', ' ', $svg ?? '' );
		$svg = str_replace( [ "\n", "\r", "\t" ], ' ', $svg ?? '' );
		$svg = trim( $svg );
		$svg = str_replace( '"', "'", $svg );
		$svg = rawurlencode( $svg );

		return sprintf( "url('data:image/svg+xml,%s')", $svg );
	}
}
