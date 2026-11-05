<?php
/**
 * Whole-block links: a section (e.g. a card) that links somewhere as a whole.
 *
 * Blocks opt in with `"supports": { "matter": { "link": true } }`. Editors set
 * the link on the block toolbar; it's stored in a `link` attribute
 * (`{ url, opensInNewTab }`).
 *
 * On the front end the block's first heading becomes the link (so the link's
 * name is the heading), and the link is stretched over the whole block. Links
 * and buttons inside stay clickable above it. Without a heading, a visually
 * hidden link is added instead. This runs on the rendered block, so sections
 * with their own render.php get it too.
 *
 * The linked block gets `has-link`, and the link `matter-link`, for styling
 * (e.g. hover and focus states).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Supports;

use Eighteen73\Matter\Singleton;
use WP_Block_Type;
use WP_Block_Type_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Whole-block links.
 */
class Link {

	use Singleton;

	/**
	 * Stylesheet handle for the stretched link CSS.
	 */
	public const HANDLE = 'matter-link';

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register_block_support' ], 5 );
		add_action( 'init', [ $this, 'register_style' ] );
		add_filter( 'render_block', [ $this, 'render' ], 10, 2 );
	}

	/**
	 * Register the link block support: the `link` attribute and `has-link`.
	 *
	 * @return void
	 */
	public function register_block_support(): void {
		\WP_Block_Supports::get_instance()->register(
			'matter-link',
			[
				'register_attribute' => [ $this, 'register_attribute' ],
				'apply'              => [ $this, 'apply' ],
			]
		);
	}

	/**
	 * Whether a block type opts into whole-block links.
	 *
	 * @param WP_Block_Type $block_type Block type.
	 * @return bool
	 */
	public static function is_supported( WP_Block_Type $block_type ): bool {
		return ! empty( $block_type->supports['matter']['link'] );
	}

	/**
	 * Add the `link` attribute to supporting blocks.
	 *
	 * @param WP_Block_Type $block_type Block type.
	 * @return void
	 */
	public function register_attribute( WP_Block_Type $block_type ): void {
		if ( ! self::is_supported( $block_type ) ) {
			return;
		}

		$block_type->attributes ??= [];

		if ( ! isset( $block_type->attributes['link'] ) ) {
			$block_type->attributes['link'] = [ 'type' => 'object' ];
		}
	}

	/**
	 * The `has-link` class on linked blocks.
	 *
	 * @param WP_Block_Type $block_type Block type.
	 * @param array         $attributes Block attributes.
	 * @return array
	 */
	public function apply( WP_Block_Type $block_type, array $attributes ): array {
		return self::is_supported( $block_type ) && '' !== self::url( $attributes ) ? [ 'class' => 'has-link' ] : [];
	}

	/**
	 * A block's link URL.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	private static function url( array $attributes ): string {
		return trim( (string) ( $attributes['link']['url'] ?? '' ) );
	}

	/**
	 * Functional CSS (the stretched link), plus defaults in :where().
	 *
	 * @return void
	 */
	public function register_style(): void {
		wp_register_style( self::HANDLE, false, [], MATTER_VERSION );
		wp_add_inline_style(
			self::HANDLE,
			'.has-link{position:relative}'
			. '.has-link .matter-link::after{content:"";inset:0;position:absolute;z-index:1}'
			// Other links and controls inside stay clickable.
			. '.has-link :is(a,button,input,select,textarea,summary,label):not(.matter-link){position:relative;z-index:2}'
			. ':where(.has-link .matter-link){color:inherit;text-decoration:none}'
			. ':where(.has-link:has(.matter-link:focus-visible)){outline:2px solid currentcolor;outline-offset:2px}'
			. ':where(.has-link .matter-link:focus-visible){outline:none}'
		);
	}

	/**
	 * Link a rendered block: its first heading becomes the stretched link.
	 *
	 * @param string $block_content Rendered block.
	 * @param array  $block         Parsed block.
	 * @return string
	 */
	public function render( string $block_content, array $block ): string {
		$url = self::url( $block['attrs'] ?? [] );

		if ( '' === $url || '' === $block_content ) {
			return $block_content;
		}

		$block_type = WP_Block_Type_Registry::get_instance()->get_registered( $block['blockName'] ?? '' );

		if ( ! $block_type || ! self::is_supported( $block_type ) ) {
			return $block_content;
		}

		wp_enqueue_style( self::HANDLE );

		$new_tab    = ! empty( $block['attrs']['link']['opensInNewTab'] );
		$attributes = sprintf(
			'class="matter-link" href="%1$s"%2$s',
			esc_url( $url ),
			$new_tab ? ' target="_blank" rel="noopener"' : ''
		);

		// The first heading's content, unless it already holds a link.
		if ( preg_match( '/(<h([1-6])\b[^>]*>)(.*?)(<\/h\2>)/s', $block_content, $match, PREG_OFFSET_CAPTURE ) && ! str_contains( $match[3][0], '<a' ) ) {
			$linked = $match[1][0] . '<a ' . $attributes . '>' . $match[3][0] . '</a>' . $match[4][0];

			return substr_replace( $block_content, $linked, $match[0][1], strlen( $match[0][0] ) );
		}

		// No usable heading: a visually hidden link, before the closing tag.
		$closing = strrpos( $block_content, '</' );

		if ( false === $closing ) {
			return $block_content;
		}

		$link = sprintf(
			'<a %1$s><span class="screen-reader-text">%2$s</span></a>',
			$attributes,
			esc_html(
				/**
				 * Filters the label of a whole-block link when the block has no heading.
				 *
				 * @param string $label Label.
				 * @param array  $block Parsed block.
				 */
				(string) apply_filters( 'matter_link_label', __( 'Read more', 'matter' ), $block )
			)
		);

		return substr_replace( $block_content, $link, $closing, 0 );
	}
}
