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
			'a list of types' => [ '/?post_type[]=matter_archive&post_type[]=post' ],
			'a draft by ID'   => [ '/?p={draft}&post_type=matter_archive' ],
			'a draft, no type' => [ '/?p={draft}' ],
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
		$this->entry( 'date' );

		$draft = self::factory()->post->create(
			[
				'post_type'   => Archives::POST_TYPE,
				'post_status' => 'draft',
				'post_name'   => 'a-draft',
				'meta_input'  => [ Archives::META => 'author' ],
			]
		);

		$this->go_to( str_replace( '{draft}', (string) $draft, $url ) );
		Archives::instance()->deny_listing();

		$this->assertTrue( is_404(), $url );
		$this->assertFalse( is_home() );
		$this->assertFalse( is_post_type_archive() );

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
		$open = $this->entry( 'author', false, '2026-01-01 00:00:00' );

		$protected = self::factory()->post->create(
			[
				'post_type'     => Archives::POST_TYPE,
				'post_status'   => 'publish',
				'post_password' => 'secret',
				'post_date'     => '2026-02-01 00:00:00',
				'meta_input'    => [ Archives::META => 'author' ],
			]
		);

		$this->assertSame( $open, Archives::instance()->resolve( new Target( 'author' ) )?->ID );
		$this->assertStringNotContainsString( (string) $protected, (string) Archives::instance()->content_for( new Target( 'author' ) ) );

		wp_update_post( [ 'ID' => $open, 'post_status' => 'draft' ] ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
		( new ReflectionProperty( Archives::class, 'resolved' ) )->setValue( Archives::instance(), [] );

		$this->assertNull( Archives::instance()->resolve( new Target( 'author' ) ) );
	}
}
