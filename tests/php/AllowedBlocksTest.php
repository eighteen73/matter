<?php
/**
 * Allowed blocks: the theme's list, and blocks Matter adds or removes.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use WP_Block_Editor_Context;

/**
 * Allowed blocks.
 */
class AllowedBlocksTest extends TestCase {

	/**
	 * The blocks allowed when editing a post of a type.
	 *
	 * @param string $post_type Post type.
	 * @return array|bool
	 */
	private function allowed( string $post_type ): array|bool {
		$post = self::factory()->post->create_and_get( [ 'post_type' => $post_type ] );

		return get_allowed_block_types( new WP_Block_Editor_Context( [ 'post' => $post ] ) );
	}

	/**
	 * The theme's list, with namespace wildcards; the query blocks come with
	 * the blocks that show them; the archive list only in archive entries.
	 *
	 * @return void
	 */
	public function test_theme_list(): void {
		add_filter( 'matter_allowed_blocks', fn() => [ 'core/paragraph', 'matter/*' ] );

		$page = $this->allowed( 'page' );

		$this->assertContains( 'core/paragraph', $page );
		$this->assertContains( 'matter/accordion', $page );
		$this->assertContains( 'core/query', $page, 'Posts accordions, tabs and carousels are queries' );
		$this->assertContains( 'core/terms-query', $page, 'Terms carousels are Terms Queries' );
		$this->assertNotContains( 'core/group', $page );
		$this->assertNotContains( 'matter/archive-loop', $page );

		$this->assertContains( 'matter/archive-loop', $this->allowed( 'matter_archive' ) );
	}

	/**
	 * A block a section's slot allows but the list doesn't is allowed, for
	 * those sections only (the editor limits it to them).
	 *
	 * @return void
	 */
	public function test_slot_only_blocks(): void {
		add_filter( 'matter_allowed_blocks', fn() => [ 'core/heading', 'core/paragraph', 'core/image', 'matter/*', 'matter-test/*' ] );

		$this->assertContains( 'core/verse', $this->allowed( 'page' ) );
		$slot_only = \Eighteen73\Matter\AllowedBlocks::slot_only( [ 'core/heading', 'core/paragraph', 'core/image', 'matter/carousel' ] );

		$this->assertSame( [ 'matter-test/section' ], $slot_only['core/verse'] ?? null );
		$this->assertArrayNotHasKey( 'core/paragraph', $slot_only, 'Blocks on the list are allowed everywhere' );

		// Code that restricted the list earlier still wins.
		$restrict = fn() => [ 'core/paragraph' ];
		add_filter( 'allowed_block_types_all', $restrict, 5 );
		$this->assertNotContains( 'core/verse', $this->allowed( 'page' ) );
		remove_filter( 'allowed_block_types_all', $restrict, 5 );
	}

	/**
	 * Without a theme list, everything but the archive list outside entries.
	 *
	 * @return void
	 */
	public function test_unrestricted(): void {
		$page = $this->allowed( 'page' );

		$this->assertIsArray( $page );
		$this->assertContains( 'core/group', $page );
		$this->assertNotContains( 'matter/archive-loop', $page );
		$this->assertTrue( $this->allowed( 'matter_archive' ) );
	}
}
