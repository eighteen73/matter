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
}
