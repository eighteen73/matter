<?php
/**
 * Loop items: which theme pattern shows an item, like the template hierarchy.
 *
 * The fixture theme has `loop-item`, `loop-item-carousel` and
 * `loop-item-accordion` patterns, and none for tabs or for posts specifically.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Blocks\LoopItem;

/**
 * Loop items.
 */
class LoopItemTest extends TestCase {

	/**
	 * The pattern chosen per block.
	 *
	 * @return void
	 */
	public function test_pattern_hierarchy(): void {
		$this->assertSame( 'matter-test-theme/loop-item', LoopItem::pattern( 'post' ) );
		$this->assertSame( 'matter-test-theme/loop-item-carousel', LoopItem::pattern( 'post', 'carousel' ) );
		$this->assertSame( 'matter-test-theme/loop-item-accordion', LoopItem::pattern( 'post', 'accordion' ) );
		$this->assertNull( LoopItem::pattern( 'post', 'tabs' ), 'Tabs never fall back to the general loop item' );
	}

	/**
	 * A more specific pattern wins.
	 *
	 * @return void
	 */
	public function test_post_type_pattern_wins(): void {
		register_block_pattern(
			'matter-test-theme/loop-item-post',
			[
				'title'   => 'Post',
				'content' => '<!-- wp:post-date /-->',
			]
		);

		$this->assertSame( 'matter-test-theme/loop-item-post', LoopItem::pattern( 'post' ) );
		// A carousel keeps the post type's design before a general carousel one.
		$this->assertSame( 'matter-test-theme/loop-item-post', LoopItem::pattern( 'post', 'carousel' ) );

		unregister_block_pattern( 'matter-test-theme/loop-item-post' );
	}

	/**
	 * Patterns are looked up in the theme's namespace, not its folder name.
	 *
	 * @return void
	 */
	public function test_theme_namespace(): void {
		register_block_pattern(
			'acme/loop-item',
			[
				'title'   => 'Acme',
				'content' => '<!-- wp:post-date /-->',
			]
		);
		add_filter( 'matter_theme_namespace', fn() => 'acme' );

		$this->assertSame( [ 'acme' ], \Eighteen73\Matter\theme_namespaces() );
		$this->assertSame( 'acme/loop-item', LoopItem::pattern( 'post' ) );
		$this->assertNull( LoopItem::pattern( 'post', 'accordion' ), 'The folder name is no longer used' );

		unregister_block_pattern( 'acme/loop-item' );
	}

	/**
	 * Without an accordion or tabs pattern, the item's excerpt shows.
	 *
	 * @return void
	 */
	public function test_tabs_fall_back_to_excerpt(): void {
		$post = self::factory()->post->create( [ 'post_excerpt' => 'Short summary' ] );

		$this->assertSame( "<p>Short summary</p>\n", LoopItem::render( $post, '', 'tabs' ) );
	}

	/**
	 * The pattern renders with the item as its context.
	 *
	 * @return void
	 */
	public function test_render_uses_item_context(): void {
		$post = self::factory()->post->create( [ 'post_title' => 'Context title' ] );

		$this->assertStringContainsString( 'Context title', LoopItem::render( $post ) );
	}
}
