<?php
/**
 * Whole-block links: a section (e.g. a card) that links somewhere as a whole.
 *
 * Blocks opt in with `"supports": { "matter": { "link": true } }`. Editors set
 * the link on the block toolbar; it's stored in a `matterLink` attribute
 * (`{ url, opensInNewTab }`).
 *
 * On the front end the block's first heading becomes the link (so the link's
 * name is the heading), and the link is stretched over the whole block. Links
 * and buttons inside stay clickable above it. Without a heading, a visually
 * hidden link is added instead, named after the block's first text or image
 * (else "Read more"). A link that opens in a new tab says so: in the hidden
 * link's name, and for a heading link in a hidden element after the heading
 * that the link is described by, so the heading's text stays clean. This runs on the rendered block, so sections with their own
 * render.php get it too.
 *
 * The linked block gets `has-link`, and the link `matter-link`, for styling
 * (e.g. hover and focus states).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Supports;

use Eighteen73\Matter\Ids;
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
	 * Register the link block support: the `matterLink` attribute and `has-link`.
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
	 * Add the `matterLink` attribute to supporting blocks.
	 *
	 * @param WP_Block_Type $block_type Block type.
	 * @return void
	 */
	public function register_attribute( WP_Block_Type $block_type ): void {
		if ( ! self::is_supported( $block_type ) ) {
			return;
		}

		$block_type->attributes ??= [];

		if ( ! isset( $block_type->attributes['matterLink'] ) ) {
			$block_type->attributes['matterLink'] = [ 'type' => 'object' ];
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
		return self::is_supported( $block_type ) && '' !== esc_url( self::url( $attributes ) ) ? [ 'class' => 'has-link' ] : [];
	}

	/**
	 * A block's link URL.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	private static function url( array $attributes ): string {
		return trim( (string) ( $attributes['matterLink']['url'] ?? '' ) );
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
			. ':where(.has-link) .matter-link::after{content:"";inset:0;position:absolute;z-index:1}'
			// Other links and controls inside stay clickable: above the stretched
			// link, at zero specificity, so a theme can still position its own
			// (e.g. a wishlist button in a corner).
			. ':where(.has-link :is(a,button,input,select,textarea,summary,label):not(.matter-link)){position:relative;z-index:2}'
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
		// The address as it will be output: one that's unsafe (`javascript:`)
		// is empty, and links nothing.
		$href = esc_url( self::url( $block['attrs'] ?? [] ) );

		if ( '' === $href || '' === $block_content ) {
			return $block_content;
		}

		$block_type = WP_Block_Type_Registry::get_instance()->get_registered( $block['blockName'] ?? '' );

		if ( ! $block_type || ! self::is_supported( $block_type ) ) {
			return $block_content;
		}

		wp_enqueue_style( self::HANDLE );

		$new_tab    = ! empty( $block['attrs']['matterLink']['opensInNewTab'] );
		$attributes = sprintf(
			'class="matter-link" href="%1$s"%2$s',
			$href,
			$new_tab ? ' target="_blank" rel="noopener"' : ''
		);

		// The first heading's content, unless it already holds a link.
		if ( preg_match( '/(<h([1-6])\b[^>]*>)(.*?)(<\/h\2>)/s', $block_content, $match, PREG_OFFSET_CAPTURE ) && ! preg_match( '/<a[\s>]/i', $match[3][0] ) ) {
			$link = $attributes;
			$cue  = '';

			if ( $new_tab ) {
				// The cue sits after the heading, not in it, so the heading's
				// text stays what the author wrote, and the link is described
				// by it.
				$cue_id = Ids::claim( 'matter-link-new-tab' );
				$link  .= ' aria-describedby="' . esc_attr( $cue_id ) . '"';
				$cue    = '<span id="' . esc_attr( $cue_id ) . '" hidden>' . esc_html__( '(opens in a new tab)', 'matter' ) . '</span>';
			}

			$linked = $match[1][0] . '<a ' . $link . '>' . $match[3][0] . '</a>' . $match[4][0] . $cue;

			return substr_replace( $block_content, $linked, $match[0][1], strlen( $match[0][0] ) );
		}

		// No usable heading: a visually hidden link, before the closing tag.
		$closing = strrpos( $block_content, '</' );

		if ( false === $closing ) {
			return $block_content;
		}

		/**
		 * Filters the label of a whole-block link when the block has no heading.
		 * The default is the block's first text or image description, else
		 * "Read more".
		 *
		 * @param string $label Label.
		 * @param array  $block Parsed block.
		 */
		$label = (string) apply_filters( 'matter_link_label', self::default_label( $block_content ), $block );

		if ( $new_tab ) {
			/* translators: %s: the link's label */
			$label = sprintf( __( '%s (opens in a new tab)', 'matter' ), $label );
		}

		$link = sprintf( '<a %1$s><span class="screen-reader-text">%2$s</span></a>', $attributes, esc_html( $label ) );

		return substr_replace( $block_content, $link, $closing, 0 );
	}

	/**
	 * What a block without a heading is called: its first text (a paragraph,
	 * shortened as the editor shortens a section's label), else the
	 * description of its first image, else "Read more".
	 *
	 * @param string $html Rendered block.
	 * @return string
	 */
	private static function default_label( string $html ): string {
		$text = '';

		if ( preg_match( '/<p\b[^>]*>(.*?)<\/p>/is', $html, $match ) ) {
			$text = self::shorten( self::tidy( html_entity_decode( wp_strip_all_tags( $match[1] ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) );
		}

		if ( '' === $text ) {
			$tags = new \WP_HTML_Tag_Processor( $html );

			while ( $tags->next_tag( 'img' ) ) {
				$text = self::shorten( self::tidy( (string) $tags->get_attribute( 'alt' ) ) );

				if ( '' !== $text ) {
					break;
				}
			}
		}

		return '' !== $text ? $text : __( 'Read more', 'matter' );
	}

	/**
	 * Text with every run of whitespace (a no-break space included, which
	 * `trim()` leaves) collapsed to one space, and the ends trimmed. Empty
	 * when nothing but whitespace is left, so a paragraph of `&nbsp;` names
	 * nothing.
	 *
	 * @param string $text Text, entities decoded.
	 * @return string
	 */
	private static function tidy( string $text ): string {
		$text = trim( (string) preg_replace( '/[\s\x{00A0}]+/u', ' ', $text ) );

		return preg_match( '/\S/u', $text ) ? $text : '';
	}

	/**
	 * Text shortened to a label's length, at a word's end unless that leaves
	 * too little (as `shorten` in the editor's first-heading.js).
	 *
	 * @param string $text Text.
	 * @return string
	 */
	private static function shorten( string $text ): string {
		$length = 40;

		if ( mb_strlen( $text ) <= $length ) {
			return $text;
		}

		$cut   = mb_substr( $text, 0, $length );
		$space = mb_strrpos( $cut, ' ' );

		return rtrim( false !== $space && $space > $length / 2 ? mb_substr( $cut, 0, $space ) : $cut ) . '…';
	}
}
