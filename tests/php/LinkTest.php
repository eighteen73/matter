<?php
/**
 * Whole-block links (`supports.matter.link`, saved in `matterLink`).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Supports\Link;
use WP_Block_Type_Registry;

/**
 * Whole-block links.
 */
class LinkTest extends TestCase {

	private const BLOCK = 'matter-test/linked-card';

	/**
	 * A block that opts in.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		register_block_type(
			self::BLOCK,
			[
				'supports'        => [ 'matter' => [ 'link' => true ] ],
				'render_callback' => fn() => '<div ' . get_block_wrapper_attributes() . '><h3>Title</h3></div>',
			]
		);

		// What the block supports registry does for blocks registered before `init` ends.
		Link::instance()->register_attribute( WP_Block_Type_Registry::get_instance()->get_registered( self::BLOCK ) );
	}

	/**
	 * Remove it.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		unregister_block_type( self::BLOCK );

		parent::tear_down();
	}

	/**
	 * The attribute is `matterLink`, and it links the block.
	 *
	 * @return void
	 */
	public function test_matter_link_attribute(): void {
		$type = WP_Block_Type_Registry::get_instance()->get_registered( self::BLOCK );

		$this->assertArrayHasKey( 'matterLink', $type->attributes );
		$this->assertArrayNotHasKey( 'link', $type->attributes );

		$html = $this->render( '<!-- wp:' . self::BLOCK . ' {"matterLink":{"url":"https://example.com/page/","opensInNewTab":true}} /-->' );

		$this->assertStringContainsString( 'has-link', $html );
		$this->assertStringContainsString( '<h3><a class="matter-link" href="https://example.com/page/" target="_blank" rel="noopener">Title <span class="screen-reader-text">(opens in a new tab)</span></a></h3>', $html );
	}

	/**
	 * The 0.x `link` attribute no longer links anything.
	 *
	 * @return void
	 */
	public function test_old_link_attribute_is_ignored(): void {
		$html = $this->render( '<!-- wp:' . self::BLOCK . ' {"link":{"url":"https://example.com/page/"}} /-->' );

		$this->assertStringNotContainsString( 'matter-link', $html );
		$this->assertStringNotContainsString( 'has-link', $html );
	}

	/**
	 * Link rendered block HTML.
	 *
	 * @param string $html Rendered block.
	 * @param string $url  Link URL.
	 * @param bool   $tab  Opens in a new tab.
	 * @return string
	 */
	private function link( string $html, string $url = 'https://example.com/page/', bool $tab = false ): string {
		return Link::instance()->render(
			$html,
			[
				'blockName' => self::BLOCK,
				'attrs'     => [ 'matterLink' => [ 'url' => $url, 'opensInNewTab' => $tab ] ], // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
			]
		);
	}

	/**
	 * An address that isn't safe to output links nothing: the block is
	 * untouched, with no `has-link` class and no empty link.
	 *
	 * @return void
	 */
	public function test_an_unsafe_url_links_nothing(): void {
		$html = '<div class="wp-block-card"><h3>Title</h3></div>';

		$this->assertSame( $html, $this->link( $html, 'javascript:alert(1)' ) );
		$this->assertSame( $html, $this->link( $html, ' JaVaScRiPt:alert(1)' ) );

		$rendered = $this->render( '<!-- wp:' . self::BLOCK . ' {"matterLink":{"url":"javascript:alert(1)"}} /-->' );

		$this->assertStringNotContainsString( 'has-link', $rendered );
		$this->assertStringNotContainsString( 'matter-link', $rendered );
		$this->assertStringNotContainsString( 'javascript', $rendered );
	}

	/**
	 * `<abbr>` (and `<article>`, `<aside>`…) in a heading aren't links: the
	 * heading still becomes the link.
	 *
	 * @return void
	 */
	public function test_a_heading_with_abbr_is_linked(): void {
		$html = $this->link( '<div><h3>The <abbr title="Royal Society">RS</abbr> story</h3></div>' );

		$this->assertStringContainsString( '<h3><a class="matter-link" href="https://example.com/page/">The <abbr title="Royal Society">RS</abbr> story</a></h3>', $html );
		$this->assertStringNotContainsString( 'screen-reader-text', $html );
	}

	/**
	 * A heading that already holds a link isn't wrapped in another: the card
	 * gets the visually hidden link instead.
	 *
	 * @return void
	 */
	public function test_a_heading_with_a_link_is_not_nested(): void {
		foreach ( [ '<a href="/x">Title</a>', '<A HREF="/x">Title</A>', '<a>Title</a>' ] as $heading ) {
			$html = $this->link( "<div><h3>{$heading}</h3><p>Text</p></div>" );

			$this->assertStringContainsString( "<h3>{$heading}</h3>", $html );
			$this->assertSame( 1, substr_count( $html, 'class="matter-link"' ), $heading );
			$this->assertStringContainsString( 'screen-reader-text', $html );
		}
	}

	/**
	 * Without a heading, a visually hidden link goes before the closing tag,
	 * named after the block's text.
	 *
	 * @return void
	 */
	public function test_without_a_heading_a_hidden_link_is_added(): void {
		$html = $this->link( '<div><p>Text</p></div>' );

		$this->assertSame( '<div><p>Text</p><a class="matter-link" href="https://example.com/page/"><span class="screen-reader-text">Text</span></a></div>', $html );
	}

	/**
	 * A new tab opens safely.
	 *
	 * @return void
	 */
	public function test_a_new_tab_link(): void {
		$html = $this->link( '<div><h3>Title</h3></div>', 'https://example.com/page/', true );

		$this->assertStringContainsString( 'href="https://example.com/page/" target="_blank" rel="noopener"', $html );
	}

	/**
	 * Without a heading the hidden link is named after the block's first
	 * text, shortened, else its first image's description, else "Read more".
	 *
	 * @return void
	 */
	public function test_a_hidden_link_is_named_after_the_block(): void {
		$this->assertStringContainsString(
			'<span class="screen-reader-text">Spring offers &amp; more</span>',
			$this->link( '<div><p>Spring <em>offers</em> &amp; more</p></div>' )
		);
		$this->assertStringContainsString(
			'<span class="screen-reader-text">The long and winding road that leads to…</span>',
			$this->link( '<div><p>The long and winding road that leads to your door</p></div>' )
		);
		$this->assertStringContainsString(
			'<span class="screen-reader-text">A red door</span>',
			$this->link( '<div><img src="a.jpg" alt=""><img src="b.jpg" alt="A red door"></div>' )
		);
		$this->assertStringContainsString( '<span class="screen-reader-text">Read more</span>', $this->link( '<div><img src="a.jpg" alt=""></div>' ) );
	}

	/**
	 * A new tab is said in the name, in the heading's link and in the hidden
	 * one, and not for a link that opens in place.
	 *
	 * @return void
	 */
	public function test_a_new_tab_is_in_the_name(): void {
		$hidden = $this->link( '<div><p>Offers</p></div>', 'https://example.com/page/', true );

		$this->assertStringContainsString( '<span class="screen-reader-text">Offers (opens in a new tab)</span>', $hidden );
		$this->assertSame( 1, substr_count( $hidden, 'opens in a new tab' ) );
		$this->assertStringNotContainsString( 'opens in a new tab', $this->link( '<div><h3>Title</h3></div>' ) );
		$this->assertStringNotContainsString( 'opens in a new tab', $this->link( '<div><p>Offers</p></div>' ) );
	}

	/**
	 * The filter still has the last word on the hidden label.
	 *
	 * @return void
	 */
	public function test_the_label_is_filterable(): void {
		$filter = fn( $label ) => $label . ' now';

		add_filter( 'matter_link_label', $filter );

		$this->assertStringContainsString( 'Offers now', $this->link( '<div><p>Offers</p></div>' ) );

		remove_filter( 'matter_link_label', $filter );
	}
}
