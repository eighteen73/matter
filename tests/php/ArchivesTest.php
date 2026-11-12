<?php
/**
 * Archives: which entry shows on an archive.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Archives\Archives;
use Eighteen73\Matter\Archives\Target;
use ReflectionProperty;

/**
 * Archive entry lookup.
 */
class ArchivesTest extends TestCase {

	/**
	 * Parent and child categories.
	 *
	 * @var array{parent: int, child: int}
	 */
	private array $terms;

	/**
	 * Fresh lookups and terms for each test.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		( new ReflectionProperty( Archives::class, 'resolved' ) )->setValue( Archives::instance(), [] );

		$parent      = self::factory()->category->create( [ 'name' => 'Parent' ] );
		$this->terms = [
			'parent' => $parent,
			'child'  => self::factory()->category->create(
				[
					'name'   => 'Child',
					'parent' => $parent,
				]
			),
		];
	}

	/**
	 * Create a published entry for a target.
	 *
	 * @param string $target  Stored target.
	 * @param bool   $cascade Shows further down.
	 * @param string $date    Post date.
	 * @return int
	 */
	private function entry( string $target, bool $cascade = false, string $date = '2026-01-01 00:00:00' ): int {
		return self::factory()->post->create(
			[
				'post_type'   => Archives::POST_TYPE,
				'post_status' => 'publish',
				'post_date'   => $date,
				'meta_input'  => [
					Archives::META    => $target,
					Archives::CASCADE => $cascade,
				],
			]
		);
	}

	/**
	 * Look up the entry for the child category.
	 *
	 * @return int|null
	 */
	private function child_entry(): ?int {
		( new ReflectionProperty( Archives::class, 'resolved' ) )->setValue( Archives::instance(), [] );

		return Archives::instance()->resolve( new Target( 'term', 'category', $this->terms['child'] ) )?->ID;
	}

	/**
	 * Nothing set up: the theme's default.
	 *
	 * @return void
	 */
	public function test_no_entry(): void {
		$this->assertNull( $this->child_entry() );
	}

	/**
	 * A parent's entry shows on its children only when set to cascade.
	 *
	 * @return void
	 */
	public function test_parent_cascades_only_when_set(): void {
		$this->entry( "term:category:{$this->terms['parent']}" );
		$this->assertNull( $this->child_entry() );

		$cascading = $this->entry( "term:category:{$this->terms['parent']}", true, '2026-02-01 00:00:00' );
		$this->assertSame( $cascading, $this->child_entry() );
	}

	/**
	 * A taxonomy's entry is for each of its terms; the post type's only when
	 * it cascades; the term's own always wins.
	 *
	 * @return void
	 */
	public function test_chain_order(): void {
		$this->entry( 'post_type:post' );
		$this->assertNull( $this->child_entry() );

		$taxonomy = $this->entry( 'taxonomy:category' );
		$this->assertSame( $taxonomy, $this->child_entry() );

		$own = $this->entry( "term:category:{$this->terms['child']}" );
		$this->assertSame( $own, $this->child_entry() );
	}

	/**
	 * Among entries for one archive, the newest published wins.
	 *
	 * @return void
	 */
	public function test_newest_wins(): void {
		$this->entry( "term:category:{$this->terms['child']}", false, '2026-01-01 00:00:00' );
		$newer = $this->entry( "term:category:{$this->terms['child']}", false, '2026-03-01 00:00:00' );

		$this->assertSame( $newer, $this->child_entry() );
	}

	/**
	 * Stored targets round-trip, and invalid ones are rejected.
	 *
	 * @return void
	 */
	public function test_target_strings(): void {
		foreach ( [ 'post_type:post', 'taxonomy:category', "term:category:{$this->terms['child']}", 'search', '404' ] as $key ) {
			$this->assertSame( $key, Target::from_string( $key )?->key() );
		}

		$this->assertNull( Target::from_string( 'post_type:nope' ) );
		$this->assertNull( Target::from_string( 'term:category:999999' ) );
		$this->assertNull( Target::from_string( 'anything' ) );
	}
}
