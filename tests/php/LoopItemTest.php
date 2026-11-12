<?php
/**
 * Loop items: which theme pattern shows an item, like the template hierarchy.
 *
 * The fixture theme has `loop-item`, `loop-item-carousel`,
 * `loop-item-accordion` and `loop-item-term` patterns, and none for tabs or
 * for a post type or taxonomy specifically.
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

	/**
	 * A Terms Query of categories, as the editor saves it.
	 *
	 * @param int[]  $term_ids Terms to list.
	 * @param string $display  The block it's shown as, if any.
	 * @return string Block markup.
	 */
	private function terms_query( array $term_ids, string $display = '' ): string {
		$attributes = [
			'termQuery' => [
				'perPage'    => 10,
				'taxonomy'   => 'category',
				'order'      => 'asc',
				'orderBy'    => 'name',
				'include'    => $term_ids,
				'hideEmpty'  => false,
				'showNested' => false,
				'inherit'    => false,
			],
		];

		if ( '' !== $display ) {
			$attributes['matterDisplay'] = [ 'type' => $display ];
		}

		return '<!-- wp:terms-query ' . wp_json_encode( $attributes ) . ' --><div class="wp-block-terms-query">'
			. '<!-- wp:term-template --><!-- wp:matter/loop-item /--><!-- /wp:term-template -->'
			. '</div><!-- /wp:terms-query -->';
	}

	/**
	 * Register a pattern for a test.
	 *
	 * @param string $slug    Pattern slug.
	 * @param string $content Pattern content.
	 * @return void
	 */
	private function pattern( string $slug, string $content = '<!-- wp:term-name /-->' ): void {
		register_block_pattern(
			$slug,
			[
				'title'   => $slug,
				'content' => $content,
			]
		);
	}

	/**
	 * Term patterns, most specific first, with carousel ones in a carousel
	 * only (terms are never accordions or tabs).
	 *
	 * @return void
	 */
	public function test_term_pattern_hierarchy(): void {
		$this->assertSame( 'matter-test-theme/loop-item-term', LoopItem::term_pattern( 'category' ) );
		$this->assertSame( 'matter-test-theme/loop-item-term', LoopItem::term_pattern( 'category', 'carousel' ) );

		$this->pattern( 'matter-test-theme/loop-item-term-carousel' );
		$this->assertSame( 'matter-test-theme/loop-item-term-carousel', LoopItem::term_pattern( 'category', 'carousel' ) );
		$this->assertSame( 'matter-test-theme/loop-item-term', LoopItem::term_pattern( 'category' ) );

		// A taxonomy's design before a general carousel one.
		$this->pattern( 'matter-test-theme/loop-item-term-category' );
		$this->assertSame( 'matter-test-theme/loop-item-term-category', LoopItem::term_pattern( 'category' ) );
		$this->assertSame( 'matter-test-theme/loop-item-term-category', LoopItem::term_pattern( 'category', 'carousel' ) );
		$this->assertSame( 'matter-test-theme/loop-item-term-carousel', LoopItem::term_pattern( 'post_tag', 'carousel' ) );

		$this->pattern( 'matter-test-theme/loop-item-term-category-carousel' );
		$this->assertSame( 'matter-test-theme/loop-item-term-category-carousel', LoopItem::term_pattern( 'category', 'carousel' ) );
		$this->assertSame( 'matter-test-theme/loop-item-term-category', LoopItem::term_pattern( 'category', 'accordion' ), 'Terms are carousels only' );

		// Post patterns are never used for terms, nor term ones for posts.
		$this->assertSame( 'matter-test-theme/loop-item', LoopItem::pattern( 'post' ) );

		foreach ( [ 'term-carousel', 'term-category', 'term-category-carousel' ] as $name ) {
			unregister_block_pattern( "matter-test-theme/loop-item-{$name}" );
		}
	}

	/**
	 * In a Terms Query, the loop item is the term: term blocks in its pattern
	 * show the term, not the page it's on.
	 *
	 * @return void
	 */
	public function test_terms_query_renders_terms(): void {
		$page = self::factory()->post->create_and_get(
			[
				'post_type'  => 'page',
				'post_title' => 'The page title',
			]
		);
		$term = self::factory()->category->create( [ 'name' => 'Shoes' ] );

		$GLOBALS['post'] = $page; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- The page being viewed.
		setup_postdata( $page );

		$html = $this->render( $this->terms_query( [ $term ] ) );

		$this->assertStringContainsString(
			sprintf( '<div class="wp-block-matter-loop-item"><p class="wp-block-term-name"><a href="%s">Shoes</a></p>', esc_url( get_term_link( $term ) ) ),
			$html
		);
		$this->assertStringNotContainsString( 'The page title', $html );

		wp_reset_postdata();
	}

	/**
	 * Without a term pattern, the term's name links to it.
	 *
	 * @return void
	 */
	public function test_term_falls_back_to_link(): void {
		$term = self::factory()->category->create( [ 'name' => 'Boots & shoes' ] );

		add_filter( 'matter_loop_item_term_pattern', '__return_null' );

		$this->assertSame(
			sprintf( '<a href="%s">Boots &amp; shoes</a>', esc_url( get_term_link( $term ) ) ),
			LoopItem::render_term( $term )
		);
	}

	/**
	 * Terms that don't exist, or of taxonomies without a front end, render
	 * nothing.
	 *
	 * @return void
	 */
	public function test_term_must_be_viewable(): void {
		register_taxonomy( 'matter_private', 'post', [ 'public' => false ] );

		$private = self::factory()->term->create( [ 'taxonomy' => 'matter_private' ] );
		$term    = self::factory()->category->create();

		$this->assertSame( '', LoopItem::render_term( $private ) );
		$this->assertSame( '', LoopItem::render_term( 999999 ) );
		$this->assertSame( '', LoopItem::render_term( $term, 'post_tag' ), 'The term is of the given taxonomy' );
		$this->assertFalse( LoopItem::can_preview_term( $private ) );
		$this->assertTrue( LoopItem::can_preview_term( $term ) );

		unregister_taxonomy( 'matter_private' );
	}

	/**
	 * A Query Loop inside a term's pattern lists posts: the innermost loop
	 * decides what its loop items are.
	 *
	 * @return void
	 */
	public function test_post_loop_inside_term_pattern(): void {
		self::factory()->post->create( [ 'post_title' => 'Nested post' ] );
		$term = self::factory()->category->create( [ 'name' => 'Hats' ] );

		$this->pattern(
			'matter-test-theme/loop-item-term-category',
			'<!-- wp:term-name /-->'
			. '<!-- wp:query {"queryId":3,"query":{"perPage":1,"postType":"post","inherit":false}} --><div class="wp-block-query">'
			. '<!-- wp:post-template --><!-- wp:matter/loop-item /--><!-- /wp:post-template -->'
			. '</div><!-- /wp:query -->'
		);

		$html = $this->render( $this->terms_query( [ $term ] ) );

		$this->assertStringContainsString( 'Hats', $html );
		$this->assertStringContainsString( 'Nested post', $html );

		unregister_block_pattern( 'matter-test-theme/loop-item-term-category' );
	}

	/**
	 * A pattern holding a loop item for its own item renders it once.
	 *
	 * @return void
	 */
	public function test_pattern_does_not_render_itself(): void {
		$term = self::factory()->tag->create( [ 'name' => 'Scarves' ] );

		$this->pattern( 'matter-test-theme/loop-item-term-post_tag', '<!-- wp:term-name /--><!-- wp:matter/loop-item /-->' );

		$this->assertSame( 1, substr_count( LoopItem::render_term( $term ), 'Scarves' ) );

		unregister_block_pattern( 'matter-test-theme/loop-item-term-post_tag' );
	}
}
