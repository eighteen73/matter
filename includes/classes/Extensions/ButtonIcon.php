<?php
/**
 * Button icon: an optional icon on core/button, chosen from the theme's icon
 * collections (Icons::collections()). Placement, size and colour are theme
 * CSS (`.wp-block-button__link.has-icon` / `.wp-block-button__icon`).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Extensions;

use Eighteen73\Matter\Icons;
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
		$icon = Icons::render( (string) ( $block['attrs']['icon'] ?? '' ), 'wp-block-button__icon' );

		if ( '' === $icon ) {
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
			$icon . '$1',
			$block_content,
			1
		);
	}
}
