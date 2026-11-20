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
		$this->assertStringContainsString( '<h3><a class="matter-link" href="https://example.com/page/" target="_blank" rel="noopener">Title</a></h3>', $html );
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
}
