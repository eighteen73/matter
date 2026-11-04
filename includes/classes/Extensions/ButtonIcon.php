<?php
/**
 * Button icon: an optional icon on core/button, chosen from the theme's icon
 * collection (WordPress icon registry). Placement, size and colour are theme
 * CSS (`.wp-block-button__link.has-icon` / `.wp-block-button__icon`).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Singleton;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * Button icon.
 */
class ButtonIcon {

	use Singleton;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'register_block_type_args', [ $this, 'register_attribute' ], 10, 2 );
		add_filter( 'render_block_core/button', [ $this, 'render' ], 10, 2 );
	}

	/**
	 * Icon collections offered in the editor (empty = all).
	 *
	 * @return string[]
	 */
	public static function collections(): array {
		/**
		 * Filters the icon collections editors can choose button icons from.
		 *
		 * @param string[] $collections Collection slugs; empty allows every collection.
		 */
		return array_values( (array) apply_filters( 'matter_button_icon_collections', [] ) );
	}

	/**
	 * Add the `icon` attribute to core/button.
	 *
	 * @param array  $args       Block type args.
	 * @param string $block_name Block name.
	 * @return array
	 */
	public function register_attribute( array $args, string $block_name ): array {
		if ( 'core/button' === $block_name ) {
			$args['attributes']['icon'] = [ 'type' => 'string' ];
		}

		return $args;
	}

	/**
	 * Output the icon inside the button link.
	 *
	 * @param string $block_content Rendered button.
	 * @param array  $block         Parsed block.
	 * @return string
	 */
	public function render( string $block_content, array $block ): string {
		$name = (string) ( $block['attrs']['icon'] ?? '' );

		if ( '' === $name || ! function_exists( 'wp_get_icon' ) ) {
			return $block_content;
		}

		$svg = wp_get_icon( $name, [ 'size' => null ] );

		if ( '' === $svg ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );

		if ( $processor->next_tag( [ 'class_name' => 'wp-block-button__link' ] ) ) {
			$processor->add_class( 'has-icon' );
			$block_content = $processor->get_updated_html();
		}

		// Insert before the link's closing tag (the last </a> or </button>).
		return (string) preg_replace(
			'#(</(?:a|button)>)(?!.*</(?:a|button)>)#s',
			'<span class="wp-block-button__icon">' . $svg . '</span>$1',
			$block_content,
			1
		);
	}
}
