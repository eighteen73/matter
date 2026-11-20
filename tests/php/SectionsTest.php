<?php
/**
 * Sections: splitting a section's content into its slots.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Sections\Sections;

/**
 * Sections.
 */
class SectionsTest extends TestCase {

	/**
	 * Slots are found by name; declared slots without content are empty.
	 *
	 * @return void
	 */
	public function test_slots_by_name(): void {
		$content = Sections::mark_slot( 'media', '<img>' ) . Sections::mark_slot( 'content', '<p>Text</p>' );
		$slots   = Sections::slots( $content, [ 'content', 'media', 'footer' ] );

		$this->assertSame(
			[
				'content' => '<p>Text</p>',
				'media'   => '<img>',
				'footer'  => '',
			],
			$slots
		);
	}

	/**
	 * Undeclared slots aren't returned when names are declared; the first slot
	 * with a name wins.
	 *
	 * @return void
	 */
	public function test_undeclared_and_duplicate_slots(): void {
		$content = Sections::mark_slot( 'media', '<p>First</p>' )
			. Sections::mark_slot( 'media', '<p>Second</p>' )
			. Sections::mark_slot( 'removed', '<p>Orphan</p>' );

		$this->assertSame( [ 'media' => '<p>First</p>' ], Sections::slots( $content, [ 'media' ] ) );

		// Without declared names, everything found (first wins).
		$this->assertSame(
			[
				'media'   => '<p>First</p>',
				'removed' => '<p>Orphan</p>',
			],
			Sections::slots( $content )
		);
	}

	/**
	 * Content saved under a slot's old name fills it when it's missing or
	 * empty, but never replaces content saved under the new name.
	 *
	 * @return void
	 */
	public function test_slot_aliases(): void {
		$aliases = [ 'media' => 'image' ];

		$this->assertSame(
			[ 'image' => '<img>' ],
			Sections::slots( Sections::mark_slot( 'media', '<img>' ), [ 'image' ], $aliases )
		);
		$this->assertSame(
			[ 'image' => '<img>' ],
			Sections::slots( Sections::mark_slot( 'image', ' ' ) . Sections::mark_slot( 'media', '<img>' ), [ 'image' ], $aliases )
		);
		$this->assertSame(
			[ 'image' => '<new>' ],
			Sections::slots( Sections::mark_slot( 'media', '<old>' ) . Sections::mark_slot( 'image', '<new>' ), [ 'image' ], $aliases )
		);
	}

	/**
	 * Aliases come from each slot's `previously`, unless the old name is
	 * declared again; the default renderer and slots() use them.
	 *
	 * @return void
	 */
	public function test_aliases_from_block_type_and_render(): void {
		register_block_type(
			'matter-test/renamed',
			[
				'supports' => [
					'matter' => [
						'slots' => [
							'content' => [ 'previously' => [ 'body', 'content' ] ],
							'image'   => [ 'previously' => [ 'media' ] ],
						],
					],
				],
			]
		);

		$block_type = \WP_Block_Type_Registry::get_instance()->get_registered( 'matter-test/renamed' );

		$this->assertSame(
			[
				'body'  => 'content',
				'media' => 'image',
			],
			Sections::get_slot_aliases( $block_type )
		);

		$html = do_blocks(
			'<!-- wp:matter-test/renamed -->'
			. '<!-- wp:matter/slot {"name":"body"} --><!-- wp:paragraph --><p>Body</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->'
			. '<!-- wp:matter/slot {"name":"gone"} --><!-- wp:paragraph --><p>Gone</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->'
			. '<!-- /wp:matter-test/renamed -->'
		);

		$this->assertStringContainsString( '<div class="wp-block-matter-slot wp-block-matter-test-renamed__content"><p class="wp-block-paragraph">Body</p></div>', $html );
		$this->assertStringContainsString( '<div class="wp-block-matter-slot wp-block-matter-test-renamed__image is-empty"></div>', $html );
		$this->assertStringNotContainsString( 'Gone', $html );

		unregister_block_type( 'matter-test/renamed' );
	}

	/**
	 * A slot's HTML past the regex engine's backtrack limit (about 1 MB) comes
	 * back whole, and the slots after it aren't lost.
	 *
	 * @return void
	 */
	public function test_a_slot_over_two_megabytes(): void {
		$big     = str_repeat( '<p>Filler paragraph to make the slot large.</p>', 50000 ) . '<p>End marker</p>';
		$content = Sections::mark_slot( 'content', $big ) . Sections::mark_slot( 'media', '<img>' );

		$this->assertGreaterThan( 2 * 1024 * 1024, strlen( $content ) );

		$slots = Sections::slots( $content, [ 'content', 'media' ] );

		$this->assertSame( $big, $slots['content'] );
		$this->assertSame( '<img>', $slots['media'] );
		$this->assertSame( [ 'content', 'media' ], array_keys( Sections::slots( $content ) ) );
	}

	/**
	 * A slot holding a slot of the same name (a section in a slot of the same
	 * name) ends at its own closing marker, and what is nested stays inside.
	 *
	 * @return void
	 */
	public function test_nested_slots_of_the_same_name(): void {
		$inner   = Sections::mark_slot( 'content', '<p>Inner</p>' );
		$content = Sections::mark_slot( 'content', '<p>Before</p>' . $inner . '<p>After</p>' ) . Sections::mark_slot( 'media', '<img>' );

		$this->assertSame(
			[
				'content' => '<p>Before</p>' . $inner . '<p>After</p>',
				'media'   => '<img>',
			],
			Sections::slots( $content )
		);

		// A different name nested stays inside too, and a marker left open is skipped.
		$content = '<!--matter-slot:broken--><p>No end</p>' . Sections::mark_slot( 'a', Sections::mark_slot( 'b', 'B' ) );

		$this->assertSame( [ 'a' => Sections::mark_slot( 'b', 'B' ) ], Sections::slots( $content ) );
	}

	/**
	 * A slot name other than letters, numbers, hyphens and underscores can't
	 * be matched by its marker, so declaring one is reported.
	 *
	 * @return void
	 */
	public function test_invalid_slot_names_are_reported(): void {
		$this->setExpectedIncorrectUsage( 'matter-test/bad-slot' );

		register_block_type(
			'matter-test/bad-slot',
			[
				'supports' => [
					'matter' => [
						'slots' => [
							'good_name-1' => [],
							'bad name'    => [],
						],
					],
				],
			]
		);

		unregister_block_type( 'matter-test/bad-slot' );

		$this->assertTrue( true );
	}

	/**
	 * A slot name is reduced to word characters and hyphens in its marker.
	 *
	 * @return void
	 */
	public function test_mark_slot_sanitises_name(): void {
		$this->assertSame( '<!--matter-slot:badname-->x<!--/matter-slot:badname-->', Sections::mark_slot( 'bad name!>', 'x' ) );
	}

	/**
	 * Only blocks declaring slots are sections, unless they opt out.
	 *
	 * @return void
	 */
	public function test_is_section(): void {
		$this->assertTrue( Sections::is_section( [ 'supports' => [ 'matter' => [ 'slots' => [ 'a' => [] ] ] ] ] ) );
		$this->assertFalse( Sections::is_section( [ 'supports' => [ 'matter' => [ 'slots' => [ 'a' => [] ], 'section' => false ] ] ] ) );
		$this->assertFalse( Sections::is_section( [ 'supports' => [] ] ) );
		$this->assertContains( 'matter-test/section', Sections::names() );
		$this->assertNotContains( 'matter/modal', Sections::names() );
	}

	/**
	 * A section without an `example` is previewed in the inserter from its
	 * slots' templates: placeholders as text, a neutral picture for images.
	 *
	 * @return void
	 */
	public function test_example(): void {
		$example = \WP_Block_Type_Registry::get_instance()->get_registered( 'matter-test/section' )->example;

		$this->assertSame( 1200, $example['viewportWidth'] );
		$this->assertSame( [ 'content', 'media' ], array_column( array_column( $example['innerBlocks'], 'attributes' ), 'name' ) );

		[ $content, $media ] = $example['innerBlocks'];

		$this->assertSame( 'core/heading', $content['innerBlocks'][0]['name'] );
		$this->assertNotEmpty( $content['innerBlocks'][0]['attributes']['content'] );
		$this->assertStringStartsWith( 'data:image/svg+xml', $media['innerBlocks'][0]['attributes']['url'] );

		// A placeholder is the text.
		$block = Sections::example( [ 'intro' => [ 'template' => [ [ 'core/paragraph', [ 'placeholder' => 'Introduce the page' ] ] ] ] ] );
		$this->assertSame( 'Introduce the page', $block['innerBlocks'][0]['innerBlocks'][0]['attributes']['content'] );
	}

	/**
	 * A section in its default variant gets the variant's class; a chosen
	 * variant replaces it; a section without variants gets none.
	 *
	 * @return void
	 */
	public function test_default_variant_class(): void {
		register_block_type(
			'matter-test/variants',
			[
				'styles'   => [
					[
						'name'      => 'default',
						'label'     => 'Default',
						'isDefault' => true,
					],
					[
						'name'  => 'wide',
						'label' => 'Wide',
					],
				],
				'supports' => [ 'matter' => [ 'slots' => [ 'content' => [] ] ] ],
			]
		);

		$section = fn( string $attrs ) => do_blocks( "<!-- wp:matter-test/variants {$attrs} --><!-- wp:matter/slot {\"name\":\"content\"} --><!-- /wp:matter/slot --><!-- /wp:matter-test/variants -->" );

		$this->assertMatchesRegularExpression( '/class="wp-block-matter-test-variants is-section is-style-default"/', $section( '' ) );
		$this->assertStringNotContainsString( 'is-style-default', $section( '{"className":"is-style-wide"}' ) );
		$this->assertStringContainsString( 'is-style-wide', $section( '{"className":"is-style-wide"}' ) );

		// A variant the theme has removed: its class stays, and the default's applies.
		$removed = $section( '{"className":"is-style-gone"}' );

		$this->assertStringContainsString( 'is-style-gone', $removed );
		$this->assertStringContainsString( 'is-style-default', $removed );
		$this->assertStringContainsString( 'is-style-default', $section( '{"className":"has-x is-style-gone"}' ) );
		$this->assertStringNotContainsString( 'is-style-default', $section( '{"className":"is-style-gone is-style-wide"}' ) );
		$this->assertStringNotContainsString( 'is-style-', $this->render( '<!-- wp:matter-test/section --><!-- /wp:matter-test/section -->' ) );

		unregister_block_type( 'matter-test/variants' );
	}
}
