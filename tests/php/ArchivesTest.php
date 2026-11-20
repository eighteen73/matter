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
	 * Entry content renders as post content does: embeds and shortcodes too.
	 *
	 * @return void
	 */
	public function test_render_content_embeds_and_shortcodes(): void {
		// No network in tests: answer the oEmbed request.
		add_filter(
			'pre_oembed_result',
			fn( $result, $url ) => str_contains( $url, 'youtube.com' ) ? '<iframe title="Video" src="https://www.youtube.com/embed/x"></iframe>' : $result,
			10,
			2
		);
		add_shortcode( 'matter_test', fn() => 'shortcode ran' );

		$html = Archives::render_content(
			'<!-- wp:embed {"url":"https://www.youtube.com/watch?v=x","type":"video","providerNameSlug":"youtube"} -->'
			. "<figure class=\"wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube\"><div class=\"wp-block-embed__wrapper\">\nhttps://www.youtube.com/watch?v=x\n</div></figure>"
			. '<!-- /wp:embed -->'
			. '<!-- wp:shortcode -->[matter_test]<!-- /wp:shortcode -->'
		);

		$this->assertStringContainsString( '<iframe', $html );
		$this->assertStringContainsString( 'shortcode ran', $html );

		remove_shortcode( 'matter_test' );
	}

	/**
	 * Stored targets round-trip, and invalid ones are rejected.
	 *
	 * @return void
	 */
	public function test_target_strings(): void {
		foreach ( [ 'post_type:post', 'taxonomy:category', "term:category:{$this->terms['child']}", 'author', 'date', 'search', '404' ] as $key ) {
			$this->assertSame( $key, Target::from_string( $key )?->key() );
		}

		$this->assertNull( Target::from_string( 'post_type:nope' ) );
		$this->assertNull( Target::from_string( 'term:category:999999' ) );
		$this->assertNull( Target::from_string( 'anything' ) );
	}

	/**
	 * Posts are listed on the posts page, or the front page showing posts.
	 * With a static front page and no posts page, nothing lists them: no
	 * address (not the front page's), a reason for editors, and previews
	 * use WordPress's posts list.
	 *
	 * @return void
	 */
	public function test_posts_url(): void {
		$posts  = new Target( 'post_type', 'post' );
		$front  = self::factory()->post->create( [ 'post_type' => 'page' ] );
		$listed = self::factory()->post->create( [ 'post_type' => 'page' ] );

		update_option( 'show_on_front', 'posts' );
		$this->assertSame( home_url( '/' ), $posts->url() );
		$this->assertNull( $posts->missing_page() );

		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $front );
		update_option( 'page_for_posts', $listed );
		$this->assertSame( get_permalink( $listed ), $posts->url() );
		$this->assertNull( $posts->missing_page() );

		update_option( 'page_for_posts', 0 );
		$this->assertNull( $posts->url() );
		$this->assertNotEmpty( $posts->missing_page() );
		$this->assertSame( add_query_arg( 'post_type', 'post', home_url( '/' ) ), $posts->preview_url() );
	}

	/**
	 * Archive content lays out what editors add as page content does: text
	 * at the content width, bands (the list, sections) full width.
	 *
	 * @return void
	 */
	public function test_archive_content_layout(): void {
		$html = do_blocks( '<!-- wp:matter/archive-content --><p>List</p><!-- /wp:matter/archive-content -->' );

		$this->assertMatchesRegularExpression( '/class="wp-block-matter-archive-content [^"]*is-layout-constrained/', $html );
	}

	/**
	 * The target for each kind of request.
	 *
	 * @return void
	 */
	public function test_current_target(): void {
		$author = self::factory()->user->create( [ 'role' => 'author' ] );

		// Two posts and one to a page, so there is a page 2.
		update_option( 'posts_per_page', 1 );
		self::factory()->post->create(
			[
				'post_author' => $author,
				'post_date'   => '2026-02-04 04:05:06',
			]
		);

		$post = self::factory()->post->create(
			[
				'post_author' => $author,
				'post_date'   => '2026-02-03 04:05:06',
			]
		);

		$this->go_to( get_author_posts_url( $author ) );
		$this->assertSame( 'author', Target::current()?->key() );

		$this->go_to( add_query_arg( 'paged', 2, get_author_posts_url( $author ) ) );
		$this->assertSame( 'author', Target::current()?->key(), 'a paged author archive' );

		foreach ( [ get_year_link( 2026 ), get_month_link( 2026, 2 ), get_day_link( 2026, 2, 3 ) ] as $url ) {
			$this->go_to( $url );
			$this->assertSame( 'date', Target::current()?->key(), $url );
		}

		$this->go_to( add_query_arg( 'paged', 2, get_year_link( 2026 ) ) );
		$this->assertSame( 'date', Target::current()?->key(), 'a paged date archive' );

		self::factory()->post->create_many( 2, [ 'post_title' => 'Hello there' ] );

		$this->go_to( home_url( '/?s=hello' ) );
		$this->assertSame( 'search', Target::current()?->key() );

		$this->go_to( home_url( '/?s=hello&paged=2' ) );
		$this->assertSame( 'search', Target::current()?->key(), 'paged search' );

		$this->go_to( home_url( '/?p=99999999' ) );
		$this->assertSame( '404', Target::current()?->key() );

		$this->go_to( home_url( '/' ) );
		$this->assertSame( 'post_type:post', Target::current()?->key(), 'the blog' );

		$this->go_to( get_permalink( $post ) );
		$this->assertNull( Target::current(), 'a single post' );

		$this->go_to( get_category_link( $this->terms['child'] ) );
		$this->assertSame( "term:category:{$this->terms['child']}", Target::current()?->key() );
	}

	/**
	 * Author and date archives have their own entry, and use the blog's only
	 * when it cascades.
	 *
	 * @return void
	 */
	public function test_author_and_date_chain(): void {
		$chain = fn( string $key ) => array_map( fn( Target $item ) => $item->key(), Target::from_string( $key )->chain() );

		$this->assertSame( [ 'author', 'post_type:post' ], $chain( 'author' ) );
		$this->assertSame( [ 'date', 'post_type:post' ], $chain( 'date' ) );

		$resolve = function ( string $key ): ?int {
			( new ReflectionProperty( Archives::class, 'resolved' ) )->setValue( Archives::instance(), [] );

			return Archives::instance()->resolve( Target::from_string( $key ) )?->ID;
		};

		$blog = $this->entry( 'post_type:post' );

		$this->assertNull( $resolve( 'author' ), 'the blog does not cascade' );
		$this->assertNull( $resolve( 'date' ) );

		$cascading = $this->entry( 'post_type:post', true, '2026-02-01 00:00:00' );

		$this->assertSame( $cascading, $resolve( 'author' ) );
		$this->assertSame( $cascading, $resolve( 'date' ) );

		$date = $this->entry( 'date' );

		$this->assertSame( $date, $resolve( 'date' ) );
		$this->assertSame( $cascading, $resolve( 'author' ), 'a date entry is not for authors' );
		$this->assertNotSame( $blog, $cascading );
	}

	/**
	 * The title binding is WordPress's archive title for these archives, not
	 * the blog's.
	 *
	 * @return void
	 */
	public function test_author_and_date_titles(): void {
		$author = self::factory()->user->create(
			[
				'role'         => 'author',
				'display_name' => 'Ada Writer',
			]
		);

		self::factory()->post->create(
			[
				'post_author' => $author,
				'post_date'   => '2026-02-03 04:05:06',
			]
		);

		$this->go_to( get_author_posts_url( $author ) );
		$this->assertStringContainsString( 'Ada Writer', (string) Archives::value( Target::current(), 'title' ) );
		$this->assertStringNotContainsString( 'Blog', (string) Archives::value( Target::current(), 'title' ) );

		$this->go_to( get_year_link( 2026 ) );
		$this->assertStringContainsString( '2026', (string) Archives::value( Target::current(), 'title' ) );

		// Outside the archive (the editor), a placeholder.
		$this->go_to( home_url( '/' ) );
		$this->assertSame( 'Author archives', Archives::value( new Target( 'author' ), 'title' ) );
		$this->assertSame( 'Date archives', Archives::value( new Target( 'date' ), 'title' ) );
	}

	/**
	 * Both are offered when customising an archive, with labels and a preview
	 * query.
	 *
	 * @return void
	 */
	public function test_author_and_date_are_offered(): void {
		$keys = array_map( fn( Target $target ) => $target->key(), \Eighteen73\Matter\Archives\Admin::top_level_targets() );

		$this->assertContains( 'author', $keys );
		$this->assertContains( 'date', $keys );
		$this->assertSame( 'Author archives', ( new Target( 'author' ) )->label() );
		$this->assertSame( 'Date archives', ( new Target( 'date' ) )->label() );
		$this->assertSame( [ 'author', 'archive', 'index' ], ( new Target( 'author' ) )->template_hierarchy() );
		$this->assertSame( 'post', ( new Target( 'date' ) )->query_args()['post_type'] );
	}
}
