<?php
/**
 * Archives: which entry shows on an archive.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Archives\Archives;
use Eighteen73\Matter\Archives\Target;
use ReflectionMethod;
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

	/**
	 * The blog's checkbox says it also covers author and date archives.
	 *
	 * @return void
	 */
	public function test_blog_cascade_label_names_author_and_date(): void {
		$label = ( new Target( 'post_type', 'post' ) )->cascade_label();

		$this->assertStringContainsString( 'category', $label );
		$this->assertStringContainsString( 'author', $label );
		$this->assertStringContainsString( 'date', $label );
		$this->assertStringNotContainsString( 'author', ( new Target( 'post_type', 'page' ) )->cascade_label() );
	}

	/**
	 * An author archive's preview lists nothing, not everyone's posts, when no
	 * author has published; with one it lists theirs.
	 *
	 * @return void
	 */
	public function test_author_preview_without_an_author_lists_nothing(): void {
		foreach ( get_posts( [ 'numberposts' => -1, 'post_status' => 'any' ] ) as $existing ) { // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
			wp_delete_post( $existing->ID, true );
		}

		$args = ( new Target( 'author' ) )->query_args();

		$this->assertSame( [ 0 ], $args['post__in'] );
		$this->assertArrayNotHasKey( 'author', $args );

		$user = self::factory()->user->create( [ 'role' => 'author' ] );

		self::factory()->post->create( [ 'post_author' => $user ] );

		$args = ( new Target( 'author' ) )->query_args();

		$this->assertSame( $user, $args['author'] );
		$this->assertArrayNotHasKey( 'post__in', $args );
	}

	/**
	 * Run the preview of an entry as a user, as the editor's Preview does:
	 * the entry's link plus `preview=true`.
	 *
	 * @param int    $post_id Entry.
	 * @param int    $user    User ID (0 for no one).
	 * @param string $nonce   A `preview_nonce`, if any.
	 * @return int The entry shown, or 0.
	 */
	private function previewed( int $post_id, int $user, string $nonce = '' ): int {
		$_GET = [
			'preview'    => 'true',
			'preview_id' => (string) $post_id,
		];

		if ( '' !== $nonce ) {
			$_GET['preview_nonce'] = $nonce;
		}

		wp_set_current_user( $user );

		$method = new ReflectionMethod( Archives::class, 'preview_entry' );
		$shown  = $method->invoke( Archives::instance() );

		$_GET = [];

		wp_set_current_user( 0 );

		return $shown ? $shown->ID : 0;
	}

	/**
	 * The link the editor reads for an entry that isn't published says which
	 * entry it is, so two drafts for one archive each preview as themselves.
	 *
	 * @return void
	 */
	public function test_an_unpublished_entrys_link_names_it(): void {
		$draft = self::factory()->post->create(
			[
				'post_type'   => Archives::POST_TYPE,
				'post_status' => 'draft',
				'meta_input'  => [ Archives::META => 'author' ],
			]
		);

		$published = $this->entry( 'date' );

		$this->assertStringContainsString( 'preview_id=' . $draft, get_permalink( $draft ) );
		$this->assertStringNotContainsString( 'preview_id', get_permalink( $published ) );
	}

	/**
	 * Preview shows exactly the entry asked for, whoever else has drafts for
	 * the archive, to someone who can edit it (with or without a nonce), and
	 * to no one else.
	 *
	 * @return void
	 */
	public function test_preview_shows_the_entry_asked_for(): void {
		$editor = self::factory()->user->create( [ 'role' => 'editor' ] );
		$other  = self::factory()->user->create( [ 'role' => 'subscriber' ] );
		$drafts = [];

		foreach ( [ 'First draft', 'Second draft' ] as $title ) {
			$drafts[] = self::factory()->post->create(
				[
					'post_type'   => Archives::POST_TYPE,
					'post_status' => 'draft',
					'post_title'  => $title,
					'meta_input'  => [ Archives::META => 'date' ],
				]
			);
		}

		// Each is its own, whichever is newer.
		$this->assertSame( $drafts[0], $this->previewed( $drafts[0], $editor ) );
		$this->assertSame( $drafts[1], $this->previewed( $drafts[1], $editor ) );
		$this->assertSame( $drafts[0], $this->previewed( $drafts[0], $editor, wp_create_nonce( 'post_preview_' . $drafts[0] ) ) );

		// Logged out, or without the right to edit: nothing.
		$this->assertSame( 0, $this->previewed( $drafts[0], 0 ) );
		$this->assertSame( 0, $this->previewed( $drafts[1], $other ) );

		// Without an entry named, nothing is guessed (it used to be the newest).
		$_GET = [ 'preview' => 'true' ];

		wp_set_current_user( $editor );

		$shown = ( new ReflectionMethod( Archives::class, 'preview_entry' ) )->invoke( Archives::instance() );

		$_GET = [];

		wp_set_current_user( 0 );

		$this->assertNull( $shown );
	}

	/**
	 * Every address that asks for the post type, other than an entry's own
	 * (redirected to its archive), is a 404 on the front end.
	 *
	 * @return array<string, array{0: string}>
	 */
	public static function listing_urls(): array {
		return [
			'the type'        => [ '/?post_type=matter_archive' ],
			'the type, paged' => [ '/?post_type=matter_archive&paged=2' ],
			'its feed'        => [ '/?post_type=matter_archive&feed=rss2' ],
			'its atom feed'   => [ '/?post_type=matter_archive&feed=atom' ],
			'the main feed'   => [ '/feed/?post_type=matter_archive' ],
			'a mixed feed'    => [ '/?post_type[]=matter_archive&post_type[]=post&feed=rss2' ],
			'a searched feed' => [ '/?post_type=matter_archive&feed=rss2&s=entry' ],
			'a list of types' => [ '/?post_type[]=matter_archive&post_type[]=post' ],
			'a draft by ID'   => [ '/?p={draft}&post_type=matter_archive' ],
			'a draft by name' => [ '/?name=a-draft&post_type=matter_archive' ],
		];
	}

	/**
	 * Entries can't be listed or found by a visitor.
	 *
	 * @dataProvider listing_urls
	 *
	 * @param string $url URL, `{draft}` being a draft entry's ID.
	 * @return void
	 */
	public function test_entries_cannot_be_listed( string $url ): void {
		$published = $this->entry( 'date' );

		wp_update_post(
			[
				'ID'         => $published,
				'post_title' => 'Entry published',
			]
		);
		self::factory()->post->create( [ 'post_title' => 'Ordinary post' ] );

		$draft = self::factory()->post->create(
			[
				'post_type'   => Archives::POST_TYPE,
				'post_status' => 'draft',
				'post_title'  => 'Entry draft',
				'post_name'   => 'a-draft',
				'meta_input'  => [ Archives::META => 'author' ],
			]
		);

		$this->go_to( str_replace( '{draft}', (string) $draft, $url ) );
		Archives::instance()->deny_listing();

		$this->assertTrue( is_404(), $url );

		// Nothing of an entry is left in the main query, which a feed or a
		// theme's 404 or search template would list.
		$this->assertSame( [], array_filter( $GLOBALS['wp_query']->posts, fn( $post ) => Archives::POST_TYPE === $post->post_type ), $url );

		if ( str_contains( $url, 'feed' ) ) {
			ob_start();
			@do_feed(); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- The feed sends headers, which the test run has already sent.
			$feed = ob_get_clean();
			$this->assertStringNotContainsString( 'Entry draft', $feed, $url );
			$this->assertStringNotContainsString( 'Entry published', $feed, $url );
		}

		// A request that also asks for posts still has them in the main query
		// (so the check above isn't passing on an empty site), without the
		// entries.
		if ( str_contains( $url, 'post_type[]=post' ) ) {
			$this->assertContains( 'Ordinary post', wp_list_pluck( $GLOBALS['wp_query']->posts, 'post_title' ), $url );
		}

		$this->assertFalse( is_home() );
		$this->assertFalse( is_post_type_archive() );

		$this->go_to( '/' );
	}

	/**
	 * An entry's own address as a feed (`?p=<ID>&feed=rss2`) lists nothing:
	 * singular requests keep the entry for its redirect, but not in a feed.
	 *
	 * @return void
	 */
	public function test_an_entrys_own_feed_is_empty(): void {
		$entry = $this->entry( 'date' );

		wp_update_post(
			[
				'ID'         => $entry,
				'post_title' => 'Entry published',
			]
		);

		$this->go_to( '/?p=' . $entry . '&feed=rss2' );
		Archives::instance()->deny_listing();

		$this->assertSame( [], array_filter( $GLOBALS['wp_query']->posts, fn( $post ) => Archives::POST_TYPE === $post->post_type ) );

		ob_start();
		@do_feed(); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- The feed sends headers, which the test run has already sent.
		$feed = ob_get_clean();

		$this->assertStringNotContainsString( 'Entry published', $feed );
		$this->assertStringNotContainsString( '<item>', $feed );

		$this->go_to( '/' );
	}

	/**
	 * Preview requests for something that isn't an entry the user may edit
	 * are ordinary requests: no entry, so core's redirect and caching headers
	 * are left alone.
	 *
	 * @return void
	 */
	public function test_a_preview_of_no_entry_is_left_alone(): void {
		$editor = self::factory()->user->create( [ 'role' => 'editor' ] );
		$post   = self::factory()->post->create();

		wp_set_current_user( $editor );

		// A preview id that doesn't exist, and one of another post type.
		$this->assertSame( 0, $this->previewed( 999999, $editor ) );
		$this->assertSame( 0, $this->previewed( $post, $editor ) );

		$_GET = [
			'preview'    => 'true',
			'preview_id' => (string) $post,
		];

		$this->assertSame( 'https://example.org/', Archives::instance()->keep_preview( 'https://example.org/' ), 'core redirects as usual' );

		$_GET = [];

		wp_set_current_user( 0 );
	}

	/**
	 * The editor's Preview keeps `preview=true` through core's canonical
	 * redirect, for the user who may edit the entry only. (That the draft is
	 * kept out of shared caches is checked in the browser: the headers can't
	 * be sent in a test run.)
	 *
	 * @return void
	 */
	public function test_a_preview_keeps_its_query(): void {
		$editor = self::factory()->user->create( [ 'role' => 'editor' ] );
		$draft  = self::factory()->post->create(
			[
				'post_type'    => Archives::POST_TYPE,
				'post_status'  => 'draft',
				'meta_input'   => [ Archives::META => 'post_type:post' ],
			]
		);

		wp_set_current_user( $editor );

		$_GET = [
			'preview'    => 'true',
			'preview_id' => (string) $draft,
		];

		$this->assertFalse( Archives::instance()->keep_preview( 'https://example.org/blog/' ), 'the redirect that would drop preview=true is cancelled' );

		// Only the editing user's request is kept.
		wp_set_current_user( 0 );
		$this->assertSame( 'https://example.org/blog/', Archives::instance()->keep_preview( 'https://example.org/blog/' ) );

		$_GET = [];
	}

	/**
	 * With every block allowed (`true`), the editor's list is left alone
	 * outside entries: turning it into the server's registered blocks would
	 * drop blocks registered only in JavaScript. In an entry the Archive list
	 * is added to a list; a list elsewhere never has it.
	 *
	 * @return void
	 */
	public function test_allowed_blocks_outside_entries_are_left_alone(): void {
		$page  = new \WP_Block_Editor_Context( [ 'post' => self::factory()->post->create_and_get( [ 'post_type' => 'page' ] ) ] );
		$entry = new \WP_Block_Editor_Context( [ 'post' => get_post( $this->entry( 'date' ) ) ] );
		$run   = fn( $allowed, $context ) => apply_filters( 'allowed_block_types_all', $allowed, $context );

		$this->assertTrue( $run( true, $page ) );
		$this->assertTrue( $run( true, $entry ) );
		$this->assertFalse( $run( false, $page ) );
		$this->assertSame( [ 'core/paragraph' ], $run( [ 'core/paragraph', 'matter/archive-loop' ], $page ) );
		$this->assertSame( [ 'core/paragraph', 'matter/archive-loop' ], $run( [ 'core/paragraph' ], $entry ) );
	}

	/**
	 * A search plugin that puts an entry in the main query doesn't make the
	 * page a 404: the entry is dropped, and the rest is shown.
	 *
	 * @return void
	 */
	public function test_an_entry_in_the_main_query_is_dropped(): void {
		$entry = get_post( $this->entry( 'date' ) );
		$post  = get_post( self::factory()->post->create() );

		$this->go_to( '/?s=anything' );

		$kept = Archives::instance()->keep_entries_out_of_the_page( [ $entry, $post ], $GLOBALS['wp_query'] );

		$this->assertSame( [ $post ], $kept );

		Archives::instance()->deny_listing();
		$this->assertFalse( is_404() );

		// Another query keeps them (the admin's lists, the editor's REST).
		$this->assertSame( [ $entry, $post ], Archives::instance()->keep_entries_out_of_the_page( [ $entry, $post ], new \WP_Query() ) );

		$this->go_to( '/' );
	}

	/**
	 * An ordinary archive, and its preview by someone who can edit entries,
	 * are not touched.
	 *
	 * @return void
	 */
	public function test_archives_and_previews_are_not_denied(): void {
		$draft  = self::factory()->post->create(
			[
				'post_type'   => Archives::POST_TYPE,
				'post_status' => 'draft',
				'meta_input'  => [ Archives::META => 'date' ],
			]
		);
		$editor = self::factory()->user->create( [ 'role' => 'editor' ] );

		// A year with a post in it, so the archive isn't a 404 anyway.
		self::factory()->post->create( [ 'post_date' => '2026-03-01 00:00:00' ] );

		$this->go_to( '/?m=2026' );
		Archives::instance()->deny_listing();
		$this->assertFalse( is_404() );

		wp_set_current_user( $editor );

		// The editor's Preview: the archive's address plus the entry.
		$this->go_to( add_query_arg( [ 'preview' => 'true', 'preview_id' => $draft ], '/?m=2026' ) ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
		$_GET = [ 'preview' => 'true', 'preview_id' => (string) $draft ]; // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
		Archives::instance()->deny_listing();
		$_GET = [];

		$this->assertFalse( is_404() );
		$this->assertTrue( is_date() );

		wp_set_current_user( 0 );
		$this->go_to( '/' );
	}

	/**
	 * Entries are left out of the sitemap, and of the REST API for anyone who
	 * can't edit them (a published entry is a fragment of an archive page).
	 *
	 * @return void
	 */
	public function test_entries_are_not_published_to_visitors(): void {
		$published = $this->entry( 'date' );

		// The type isn't `public`, so core never offers it to the sitemap: this
		// checks the filter kept as defence in depth, should that change.
		$this->assertArrayNotHasKey( Archives::POST_TYPE, apply_filters( 'wp_sitemaps_post_types', [ Archives::POST_TYPE => get_post_type_object( Archives::POST_TYPE ) ] ) );

		do_action( 'rest_api_init' );
		wp_set_current_user( 0 );

		$list = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wp/v2/matter_archive' ) );
		$one  = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wp/v2/matter_archive/' . $published ) );

		$this->assertSame( 401, $list->get_status() );
		$this->assertSame( 401, $one->get_status() );

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'subscriber' ] ) );

		$this->assertSame( 403, rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wp/v2/matter_archive' ) )->get_status() );

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'editor' ] ) );

		$list = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wp/v2/matter_archive' ) );
		$one  = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wp/v2/matter_archive/' . $published ) );

		$this->assertSame( 200, $list->get_status() );
		$this->assertSame( 200, $one->get_status() );

		wp_set_current_user( 0 );
	}

	/**
	 * Contributors and authors can edit posts but not entries, so they can't
	 * read an entry, its revisions or autosaves, or its edit context.
	 *
	 * @return void
	 */
	public function test_entries_stay_out_of_reach_of_contributors_and_authors(): void {
		$entry = $this->entry( 'date' );

		do_action( 'rest_api_init' );
		wp_update_post(
			[
				'ID'           => $entry,
				'post_content' => 'Changed so there is a revision',
			]
		);

		$routes = [
			'/wp/v2/matter_archive',
			"/wp/v2/matter_archive/{$entry}",
			"/wp/v2/matter_archive/{$entry}/revisions",
			"/wp/v2/matter_archive/{$entry}/autosaves",
		];

		foreach ( [ 'contributor', 'author' ] as $role ) {
			wp_set_current_user( self::factory()->user->create( [ 'role' => $role ] ) );

			foreach ( $routes as $route ) {
				foreach ( [ 'view', 'edit' ] as $context ) {
					$request = new \WP_REST_Request( 'GET', $route );

					$request->set_param( 'context', $context );

					$status = rest_get_server()->dispatch( $request )->get_status();

					$this->assertSame( 403, $status, "{$role} {$context} {$route}" );
				}
			}
		}

		// An editor reads them.
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'editor' ] ) );

		foreach ( $routes as $route ) {
			$request = new \WP_REST_Request( 'GET', $route );

			$request->set_param( 'context', 'edit' );

			$this->assertSame( 200, rest_get_server()->dispatch( $request )->get_status(), "editor {$route}" );
		}

		wp_set_current_user( 0 );
	}

	/**
	 * Only taxonomies with a front end can have an archive entry: a private
	 * one's terms have no archive to customise.
	 *
	 * @return void
	 */
	public function test_targets_need_a_viewable_taxonomy(): void {
		register_taxonomy( 'matter_private', 'post', [ 'public' => false ] );

		$term = self::factory()->term->create( [ 'taxonomy' => 'matter_private' ] );

		$this->assertNull( Target::from_string( 'taxonomy:matter_private' ) );
		$this->assertNull( Target::from_string( "term:matter_private:{$term}" ) );
		$this->assertNotNull( Target::from_string( 'taxonomy:category' ) );
		$this->assertNotNull( Target::from_string( 'term:category:' . $this->terms['parent'] ) );

		unregister_taxonomy( 'matter_private' );
	}

	/**
	 * A password-protected entry doesn't show on its archive, and doesn't hide
	 * an older one's.
	 *
	 * @return void
	 */
	public function test_a_password_protected_entry_is_skipped(): void {
		$this->entry( 'author', false, '2026-01-01 00:00:00' );

		$protected = self::factory()->post->create(
			[
				'post_type'     => Archives::POST_TYPE,
				'post_status'   => 'publish',
				'post_password' => 'secret',
				'post_date'     => '2026-02-01 00:00:00',
				'meta_input'    => [ Archives::META => 'author' ],
			]
		);

		// The newest is protected: the archive has no entry (the default
		// content), not an older one the editor replaced.
		$this->assertNull( Archives::instance()->resolve( new Target( 'author' ) ) );
		$this->assertStringNotContainsString( (string) $protected, (string) Archives::instance()->content_for( new Target( 'author' ) ) );
	}

	/**
	 * A protected newest entry ends the search: the archive shows the default
	 * content, not the cascading parent's entry that its own was meant to
	 * replace.
	 *
	 * @return void
	 */
	public function test_a_protected_newest_entry_does_not_fall_through_to_a_parent(): void {
		$parent = $this->entry( "term:category:{$this->terms['parent']}", true );

		$this->assertSame( $parent, $this->child_entry(), 'the parent cascades while the child has no entry' );

		self::factory()->post->create(
			[
				'post_type'     => Archives::POST_TYPE,
				'post_status'   => 'publish',
				'post_password' => 'secret',
				'post_date'     => '2026-03-01 00:00:00',
				'meta_input'    => [ Archives::META => "term:category:{$this->terms['child']}" ],
			]
		);

		$this->assertNull( $this->child_entry() );
	}

	/**
	 * Page 2 and later show the archive's title and the list, not the entry's
	 * intro (whose first section can hold the H1): one H1, no intro. Page 1,
	 * and a preview, keep the entry.
	 *
	 * @return void
	 */
	public function test_paged_archives_show_a_title_and_the_list_only(): void {
		update_option( 'posts_per_page', 1 );
		self::factory()->post->create_many( 3, [ 'post_title' => 'Hello there' ] );

		$this->entry( 'search' );
		wp_update_post(
			[
				'ID'           => $this->entry( 'search', false, '2026-03-01 00:00:00' ),
				'post_content' => '<!-- wp:heading {"level":1} --><h1>Custom intro heading</h1><!-- /wp:heading --><!-- wp:matter/archive-loop /-->',
			]
		);
		( new ReflectionProperty( Archives::class, 'resolved' ) )->setValue( Archives::instance(), [] );

		$render = fn() => Archives::instance()->render( '<ul class="list"><li>Post</li></ul>' );

		$this->go_to( home_url( '/?s=hello' ) );
		$first = $render();

		$this->assertStringContainsString( 'Custom intro heading', $first );

		$this->go_to( home_url( '/?s=hello&paged=2' ) );
		$this->assertTrue( is_paged() );

		$paged = $render();

		$this->assertSame( 1, substr_count( $paged, '<h1' ), 'one H1' );
		$this->assertStringNotContainsString( 'Custom intro heading', $paged );
		$this->assertStringContainsString( 'Search results for', $paged );
		$this->assertStringContainsString( '<li>Post</li>', $paged );

		// A preview of the entry keeps it on a later page.
		$editor = self::factory()->user->create( [ 'role' => 'editor' ] );
		$entry  = self::factory()->post->create(
			[
				'post_type'    => Archives::POST_TYPE,
				'post_status'  => 'draft',
				'post_content' => '<!-- wp:heading {"level":1} --><h1>Previewed intro</h1><!-- /wp:heading --><!-- wp:matter/archive-loop /-->',
				'meta_input'   => [ Archives::META => 'search' ],
			]
		);

		wp_set_current_user( $editor );
		$_GET = [
			'preview'    => 'true',
			'preview_id' => (string) $entry,
		];

		$this->assertStringContainsString( 'Previewed intro', $render() );

		$_GET = [];

		wp_set_current_user( 0 );

		// Themes can change it.
		add_filter( 'matter_archive_paged_content', fn() => '<!-- wp:matter/archive-loop /-->' );
		$this->assertStringNotContainsString( '<h1', $render() );
		remove_all_filters( 'matter_archive_paged_content' );

		$this->go_to( '/' );
	}

	/**
	 * Customising an archive whose title has a backslash keeps it.
	 *
	 * @return void
	 */
	public function test_a_new_entrys_title_keeps_backslashes(): void {
		$term = self::factory()->category->create( [ 'name' => wp_slash( 'Back\\slash' ) ] );

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'administrator' ] ) );

		$_GET = [
			'action'   => 'matter_archive_customise',
			'target'   => 'term:category:' . $term,
			'_wpnonce' => wp_create_nonce( 'matter_archive_customise' ),
		];
		$_REQUEST = $_GET;

		add_filter(
			'wp_redirect',
			function ( $location ) {
				throw new \RuntimeException( 'redirected' );
			}
		);

		try {
			\Eighteen73\Matter\Archives\Admin::instance()->customise();
		} catch ( \RuntimeException ) {
			// Redirected to the editor.
		}

		remove_all_filters( 'wp_redirect' );

		$_GET     = [];
		$_REQUEST = [];

		$found = get_posts(
			[
				'post_type'   => Archives::POST_TYPE,
				'post_status' => 'auto-draft',
				'meta_key'    => Archives::META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- Test.
				'meta_value'  => 'term:category:' . $term, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- Test.
			]
		);
		$entry = $found[0] ?? null;

		wp_set_current_user( 0 );

		$this->assertNotNull( $entry );
		$this->assertSame( 'Back\\slash (Categories)', $entry->post_title );
	}

	/**
	 * An archive's address is worked out once a request, until what it
	 * depends on changes.
	 *
	 * @return void
	 */
	public function test_an_archives_address_is_cached_for_the_request(): void {
		$page = self::factory()->post->create(
			[
				'post_type'  => 'page',
				'post_title' => 'Journal',
			]
		);

		Target::flush_urls();
		update_option( 'show_on_front', 'page' );
		update_option( 'page_for_posts', $page );

		$posts = new Target( 'post_type', 'post' );
		$first = $posts->url();

		$this->assertSame( get_permalink( $page ), $first );

		// The cached address is used (a later change that doesn't announce
		// itself isn't seen), and the options flush it.
		$queries = get_num_queries();
		$posts->url();
		$this->assertSame( $queries, get_num_queries() );

		update_option( 'page_for_posts', 0 );
		$this->assertNull( $posts->url() );
	}

	/**
	 * Changes to a term's slug or to the pages (a slug, a new term, a deleted
	 * one) are seen in the same request, and an address that isn't known yet
	 * isn't remembered.
	 *
	 * @return void
	 */
	public function test_addresses_follow_terms_and_pages_within_a_request(): void {
		$this->set_permalink_structure( '/%postname%/' );
		add_filter( 'term_link', fn( $link, $term ) => home_url( '/topics/' . $term->slug . '/' ), 10, 2 );
		Target::flush_urls();

		$term   = new Target( 'term', 'category', $this->terms['child'] );
		$before = $term->url();

		wp_update_term( $this->terms['child'], 'category', [ 'slug' => 'renamed-child' ] );

		$this->assertNotSame( $before, $term->url() );
		$this->assertStringContainsString( 'renamed-child', (string) $term->url() );

		// Not known yet, then known: the first answer isn't kept.
		$late = new Target( 'post_type', 'matter_late' );

		$this->assertNull( $late->url() );

		register_post_type( 'matter_late', [ 'public' => true, 'has_archive' => true ] ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing

		$this->assertNotNull( $late->url() );

		unregister_post_type( 'matter_late' );
		Target::flush_urls();

		$page = self::factory()->post->create(
			[
				'post_type'  => 'page',
				'post_title' => 'Journal',
			]
		);

		update_option( 'show_on_front', 'page' );
		update_option( 'page_for_posts', $page );

		$posts = new Target( 'post_type', 'post' );

		$this->assertStringContainsString( '/journal/', (string) $posts->url() );
		wp_update_post(
			[
				'ID'        => $page,
				'post_name' => 'news',
			]
		);
		$this->assertStringContainsString( '/news/', (string) $posts->url() );
	}

	/**
	 * The editor's search preview lists matching posts, a page at a time.
	 *
	 * @return void
	 */
	public function test_the_search_preview_applies_a_search_and_a_page_size(): void {
		update_option( 'posts_per_page', 7 );
		self::factory()->post->create( [ 'post_title' => 'Quokkas everywhere' ] );

		$args = ( new Target( 'search' ) )->query_args();

		$this->assertSame( 'Quokkas', $args['s'] );
		$this->assertSame( 7, $args['posts_per_page'] );
		$this->assertNotEmpty( ( new \WP_Query( $args ) )->posts );
	}
}
