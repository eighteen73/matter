<?php
/**
 * Archive content: editable content above and below an archive's fixed list.
 *
 * Archive templates (post type and taxonomy archives, the blog, search, 404)
 * wrap their list of posts or products in `matter/archive-content`. That
 * block renders an "Archive" entry, edited like a page with sections,
 * in which `matter/archive-loop` marks where the template's list goes.
 *
 * Which entry shows (see Target::chain()): the archive's own; for a term,
 * then its parent's (and theirs), the taxonomy's, then the post type
 * archive's; without one, the theme's default content
 * (`matter_archive_default_content`). A parent term's or post type archive's
 * entry only shows further down when it's set to (`_matter_archive_cascade`,
 * off by default); a taxonomy's is for every term in it. Among published entries for the
 * same archive the newest wins, so a scheduled replacement takes over on its
 * date and unpublishing it falls back.
 *
 * Only content is stored in the database; templates stay in the theme.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Archives;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_Post;
use WP_Query;

defined( 'ABSPATH' ) || exit;

/**
 * Archive content.
 */
class Archives {

	use Singleton;

	public const POST_TYPE = 'matter_archive';

	public const META = '_matter_archive_target';

	/**
	 * Whether a term's or post type archive's entry also shows on the archives
	 * below it (child terms; the post type's term archives) without their own.
	 */
	public const CASCADE = '_matter_archive_cascade';

	/**
	 * Lists of posts being rendered, innermost last: each the template's
	 * rendered list and whether the entry placed it yet.
	 *
	 * @var array<int, array{html: string, used: bool}>
	 */
	private array $loops = [];

	/**
	 * Entries found per target, for this request.
	 *
	 * @var array<string, WP_Post|null>
	 */
	private array $resolved = [];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register' ] );
		add_action( 'init', [ $this, 'register_bindings_source' ] );
		add_action( 'template_redirect', [ $this, 'redirect_single' ] );
		add_filter( 'post_type_link', [ $this, 'permalink' ], 10, 2 );
		add_filter( 'preview_post_link', [ $this, 'preview_link' ], 10, 2 );
		add_filter( 'render_block_core/paragraph', [ $this, 'drop_empty_bound_paragraph' ], 10, 2 );
		add_filter( 'rest_request_after_callbacks', [ $this, 'hide_from_post_type_list' ], 10, 3 );

		Admin::instance()->setup();
	}

	/**
	 * Leave entries out of the post type lists the editor offers wherever a
	 * post type is chosen (e.g. a Query Loop's "Post type", which asks for
	 * `/wp/v2/types?per_page=-1`): they're publicly queryable only so the
	 * entry editor offers Preview. The editor's own list of post types (no
	 * `per_page`), from which it sets up what it can edit, keeps them, as does
	 * `/wp/v2/types/matter_archive`.
	 *
	 * @param \WP_REST_Response|\WP_HTTP_Response|\WP_Error|mixed $response Response.
	 * @param array                                               $handler  Route handler.
	 * @param \WP_REST_Request                                    $request  Request.
	 * @return mixed
	 */
	public function hide_from_post_type_list( $response, $handler, $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundBeforeLastUsed -- Filter signature.
		if ( '/wp/v2/types' !== $request->get_route() || null === $request->get_param( 'per_page' ) || ! $response instanceof \WP_HTTP_Response ) {
			return $response;
		}

		$data = $response->get_data();

		if ( is_array( $data ) && isset( $data[ self::POST_TYPE ] ) ) {
			unset( $data[ self::POST_TYPE ] );
			$response->set_data( $data );
		}

		return $response;
	}

	/**
	 * Register the post type and its target meta.
	 *
	 * Not public: entries have no address of their own (their links go to
	 * their archive), but are publicly queryable so the editor offers Preview.
	 *
	 * @return void
	 */
	public function register(): void {
		register_post_type(
			self::POST_TYPE,
			[
				'labels'              => [
					'name'               => __( 'Archives', 'matter' ),
					'singular_name'      => __( 'Archive', 'matter' ),
					'menu_name'          => __( 'Archives', 'matter' ),
					'all_items'          => __( 'Archives', 'matter' ),
					'add_new'            => __( 'Customise an archive', 'matter' ),
					'add_new_item'       => __( 'Customise an archive', 'matter' ),
					'edit_item'          => __( 'Edit archive', 'matter' ),
					'new_item'           => __( 'New archive', 'matter' ),
					'view_item'          => __( 'View archive', 'matter' ),
					'search_items'       => __( 'Search archives', 'matter' ),
					'not_found'          => __( 'No archives customised yet: they all show the theme’s default.', 'matter' ),
					'not_found_in_trash' => __( 'No archives in the bin.', 'matter' ),
					'item_published'     => __( 'Archive published.', 'matter' ),
					'item_scheduled'     => __( 'Archive scheduled.', 'matter' ),
					'item_updated'       => __( 'Archive updated.', 'matter' ),
				],
				'description'         => __( 'Content above and below the lists on shop, blog, category, search and 404 pages.', 'matter' ),
				'public'              => false,
				'publicly_queryable'  => true,
				'exclude_from_search' => true,
				'show_ui'             => true,
				'show_in_menu'        => 'themes.php',
				'show_in_admin_bar'   => false,
				'show_in_nav_menus'   => false,
				'show_in_rest'        => true,
				'rewrite'             => false,
				'query_var'           => false,
				'has_archive'         => false,
				'hierarchical'        => false,
				'capability_type'     => 'page',
				'map_meta_cap'        => true,
				'supports'            => [ 'title', 'editor', 'revisions', 'custom-fields' ],
				'template'            => [ [ 'matter/archive-loop' ] ],
			]
		);

		register_post_meta(
			self::POST_TYPE,
			self::META,
			[
				'type'              => 'string',
				'single'            => true,
				'default'           => '',
				'show_in_rest'      => true,
				'sanitize_callback' => fn( $value ) => Target::from_string( (string) $value )?->key() ?? '',
				'auth_callback'     => fn( $allowed, $meta_key, $post_id ) => current_user_can( 'edit_post', $post_id ),
			]
		);

		register_post_meta(
			self::POST_TYPE,
			self::CASCADE,
			[
				'type'          => 'boolean',
				'single'        => true,
				'default'       => false,
				'show_in_rest'  => true,
				'auth_callback' => fn( $allowed, $meta_key, $post_id ) => current_user_can( 'edit_post', $post_id ),
			]
		);
	}

	/**
	 * An entry's archive.
	 *
	 * @param WP_Post|int $post Entry.
	 * @return Target|null
	 */
	public static function target_of( WP_Post|int $post ): ?Target {
		$post = get_post( $post );

		return $post ? Target::from_string( (string) get_post_meta( $post->ID, self::META, true ) ) : null;
	}

	/**
	 * The published entry that shows on an archive (its own or inherited).
	 *
	 * @param Target $target Archive.
	 * @return WP_Post|null
	 */
	public function resolve( Target $target ): ?WP_Post {
		$key = $target->key();

		if ( array_key_exists( $key, $this->resolved ) ) {
			return $this->resolved[ $key ];
		}

		$keys  = array_map( fn( Target $item ) => $item->key(), $target->chain() );
		$posts = get_posts(
			[
				'post_type'        => self::POST_TYPE,
				'post_status'      => 'publish',
				'numberposts'      => -1,
				'orderby'          => 'date',
				'order'            => 'DESC',
				'no_found_rows'    => true,
				'suppress_filters' => false,
				'meta_query'       => [ // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Few entries; one query per archive view.
					[
						'key'     => self::META,
						'value'   => $keys,
						'compare' => 'IN',
					],
				],
			]
		);

		$this->resolved[ $key ] = null;

		foreach ( $target->chain() as $index => $candidate ) {
			// Each archive's entry is its newest published one (posts are
			// newest first).
			$entry = current(
				array_filter( $posts, fn( WP_Post $post ) => get_post_meta( $post->ID, self::META, true ) === $candidate->key() )
			);

			if ( ! $entry ) {
				continue;
			}

			// The archive's own, a taxonomy's (for each of its terms), or one
			// set to show further down.
			if ( 0 === $index || 'taxonomy' === $candidate->type || get_post_meta( $entry->ID, self::CASCADE, true ) ) {
				$this->resolved[ $key ] = $entry;
				break;
			}
		}

		return $this->resolved[ $key ];
	}

	/**
	 * The entry made for exactly this archive: the one showing, else the
	 * newest in any state (a draft, or a scheduled one).
	 *
	 * @param Target $target Archive.
	 * @return WP_Post|null
	 */
	public function own_entry( Target $target ): ?WP_Post {
		$shown = $this->resolve( $target );

		if ( $shown && get_post_meta( $shown->ID, self::META, true ) === $target->key() ) {
			return $shown;
		}

		$posts = get_posts(
			[
				'post_type'     => self::POST_TYPE,
				'post_status'   => [ 'publish', 'future', 'draft', 'pending', 'private' ],
				'numberposts'   => 1,
				'orderby'       => 'date',
				'order'         => 'DESC',
				'no_found_rows' => true,
				'meta_key'      => self::META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- Admin only.
				'meta_value'    => $target->key(), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- Admin only.
			]
		);

		return $posts[0] ?? null;
	}

	/**
	 * Block content that shows on an archive: its entry's, else the theme's
	 * default.
	 *
	 * @param Target $target Archive.
	 * @return string
	 */
	public function content_for( Target $target ): string {
		$entry = $this->resolve( $target );

		return $entry ? $entry->post_content : $this->default_content( $target );
	}

	/**
	 * The theme's content for an archive without an entry.
	 *
	 * @param Target $target Archive.
	 * @return string
	 */
	public function default_content( Target $target ): string {
		$content = implode(
			"\n\n",
			[
				'<!-- wp:heading {"level":1,"metadata":{"bindings":{"content":{"source":"matter/archive","args":{"key":"title"}}}}} -->',
				'<h1 class="wp-block-heading"></h1>',
				'<!-- /wp:heading -->',
				'<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"matter/archive","args":{"key":"description"}}}}} -->',
				'<p></p>',
				'<!-- /wp:paragraph -->',
				'<!-- wp:matter/archive-loop /-->',
			]
		);

		/**
		 * Filters the content of an archive without its own (or an inherited)
		 * entry. Also the starting point when an editor customises one.
		 *
		 * Include `<!-- wp:matter/archive-loop /-->` where the list goes
		 * (without one it goes at the end). Bind headings and text to the
		 * archive with the `matter/archive` bindings source.
		 *
		 * @param string $content Block markup.
		 * @param Target $target  The archive.
		 */
		return (string) apply_filters( 'matter_archive_default_content', $content, $target );
	}

	/**
	 * The entry being previewed on this request, if the user may.
	 *
	 * @return WP_Post|null With its autosave's content when that's newer.
	 */
	private function preview_entry(): ?WP_Post {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Verified below.
		$id    = absint( $_GET['preview_id'] ?? 0 );
		$nonce = sanitize_text_field( wp_unslash( $_GET['preview_nonce'] ?? '' ) );
		// phpcs:enable

		if ( ! $id || ! wp_verify_nonce( $nonce, 'post_preview_' . $id ) || ! current_user_can( 'edit_post', $id ) ) {
			return null;
		}

		$post = get_post( $id );

		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return null;
		}

		$autosave = wp_get_post_autosave( $id, get_current_user_id() );

		if ( $autosave && mysql2date( 'U', $autosave->post_modified_gmt, false ) > mysql2date( 'U', $post->post_modified_gmt, false ) ) {
			$post               = clone $post;
			$post->post_content = $autosave->post_content;
		}

		return $post;
	}

	/**
	 * Render an archive's content around its list (`matter/archive-content`).
	 *
	 * @param string $loop The template's rendered list.
	 * @return string
	 */
	public function render( string $loop ): string {
		$target = Target::current();

		if ( ! $target ) {
			return $loop;
		}

		$preview = $this->preview_entry();
		$content = $preview ? $preview->post_content : $this->content_for( $target );

		$this->loops[] = [
			'html' => $loop,
			'used' => false,
		];

		$html = self::render_content( $content );
		$last = array_pop( $this->loops );

		if ( ! $last['used'] && '' !== trim( $loop ) ) {
			$html .= sprintf( '<div class="wp-block-matter-archive-loop alignfull">%s</div>', $loop );
		}

		return $html;
	}

	/**
	 * An entry's content as WordPress renders post content: embeds (an
	 * embed block's URL becomes the embed), blocks, shortcodes, and image
	 * attributes (srcset, lazy loading). Core's steps only, not the whole
	 * `the_content` filter, which other plugins add to.
	 *
	 * @param string $content Block markup.
	 * @return string
	 */
	public static function render_content( string $content ): string {
		global $wp_embed;

		if ( $wp_embed instanceof \WP_Embed ) {
			$content = $wp_embed->run_shortcode( $content );
			$content = $wp_embed->autoembed( $content );
		}

		$content = do_blocks( $content );
		$content = shortcode_unautop( $content );
		$content = do_shortcode( $content );

		return wp_filter_content_tags( $content );
	}

	/**
	 * The list for `matter/archive-loop` to place: the template's, or in the
	 * editor a preview of the entry's archive.
	 *
	 * @return string
	 */
	public function take_loop(): string {
		$index = array_key_last( $this->loops );

		if ( null !== $index ) {
			$this->loops[ $index ]['used'] = true;

			return $this->loops[ $index ]['html'];
		}

		return wp_is_serving_rest_request() ? $this->preview_loop() : '';
	}

	/**
	 * The archive's list as its template renders it, for the editor.
	 *
	 * Uses the target being edited (`matter_target`, so changes show before
	 * saving), else the entry's: finds the template, takes the list inside its
	 * `matter/archive-content` and renders it with a query for that archive.
	 *
	 * @return string
	 */
	private function preview_loop(): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only preview; the block renderer checks permissions.
		$requested = sanitize_text_field( wp_unslash( $_GET['matter_target'] ?? '' ) );
		$target    = Target::from_string( $requested ) ?? ( get_the_ID() ? self::target_of( (int) get_the_ID() ) : null );
		$args      = $target?->query_args();

		if ( ! $target || ! $args ) {
			return '';
		}

		$template = resolve_block_template( 'archive', $target->template_hierarchy(), '' );
		$inner    = $template ? $this->find_inner_blocks( parse_blocks( $template->content ) ) : null;

		if ( ! $inner ) {
			return '';
		}

		global $wp_query, $wp_the_query, $post;

		$saved = [ $wp_query, $wp_the_query, $post ];

		$wp_query     = new WP_Query( $args ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restored below.
		$wp_the_query = $wp_query; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restored below.

		$html = '';

		foreach ( $inner as $block ) {
			$html .= render_block( $block );
		}

		[ $wp_query, $wp_the_query, $post ] = $saved; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restoring.

		return $html;
	}

	/**
	 * The inner blocks of the first `matter/archive-content` in a template.
	 *
	 * @param array $blocks Parsed blocks.
	 * @return array|null
	 */
	private function find_inner_blocks( array $blocks ): ?array {
		foreach ( $blocks as $block ) {
			if ( 'matter/archive-content' === ( $block['blockName'] ?? '' ) ) {
				return $block['innerBlocks'];
			}

			$found = $this->find_inner_blocks( $block['innerBlocks'] ?? [] );

			if ( null !== $found ) {
				return $found;
			}
		}

		return null;
	}

	/**
	 * Register the `matter/archive` block bindings source: the archive's
	 * `title`, `description`, `count` and `image` (a term's thumbnail).
	 *
	 * Usage: `"metadata":{"bindings":{"content":{"source":"matter/archive","args":{"key":"title"}}}}`.
	 *
	 * @return void
	 */
	public function register_bindings_source(): void {
		register_block_bindings_source(
			'matter/archive',
			[
				'label'              => __( 'Archive', 'matter' ),
				'get_value_callback' => fn( array $args, WP_Block $block, string $attribute ) => self::value( Target::current(), (string) ( $args['key'] ?? '' ), $attribute ),
			]
		);
	}

	/**
	 * An archive's title, description, count or image.
	 *
	 * A taxonomy (the default for its terms) gives placeholders.
	 *
	 * @param Target|null $target    Archive.
	 * @param string      $key       title, description, count or image.
	 * @param string      $attribute Bound attribute (image: url, id or alt).
	 * @return string|int|null
	 */
	public static function value( ?Target $target, string $key, string $attribute = 'content' ): string|int|null {
		if ( ! $target ) {
			return null;
		}

		$term     = 'term' === $target->type ? $target->term() : null;
		$taxonomy = in_array( $target->type, [ 'term', 'taxonomy' ], true ) ? get_taxonomy( $target->name ) : null;
		$singular = (string) ( $taxonomy->labels->singular_name ?? '' );

		switch ( $key ) {
			case 'title':
				$title = match ( $target->type ) {
					'term'      => $term?->name,
					/* translators: %s: taxonomy singular name. */
					'taxonomy'  => sprintf( __( '%s name', 'matter' ), $singular ),
					'post_type' => self::post_type_title( $target->name ),
					/* translators: %s: search terms. */
					'search'    => is_search() ? sprintf( __( 'Search results for “%s”', 'matter' ), get_search_query( false ) ) : __( 'Search results', 'matter' ),
					'404'       => __( 'Page not found', 'matter' ),
					default     => null,
				};

				return null === $title ? null : esc_html( (string) $title );

			case 'description':
				$description = match ( $target->type ) {
					'term'      => (string) $term?->description,
					/* translators: %s: taxonomy singular name. */
					'taxonomy'  => sprintf( __( '%s description', 'matter' ), $singular ),
					'post_type' => (string) ( get_post_type_object( $target->name )->description ?? '' ),
					default     => '',
				};

				return wp_kses_post( (string) preg_replace( '#</?p[^>]*>#i', '', $description ) );

			case 'count':
				if ( 'term' === $target->type ) {
					return (int) $term?->count;
				}

				if ( 'post_type' === $target->type ) {
					return (int) ( wp_count_posts( $target->name )->publish ?? 0 );
				}

				return 'search' === $target->type ? (int) $GLOBALS['wp_query']?->found_posts : null;

			case 'image':
				$image = $term ? (int) get_term_meta( $term->term_id, 'thumbnail_id', true ) : 0;

				if ( ! $image ) {
					return null;
				}

				return match ( $attribute ) {
					'id'    => $image,
					'alt'   => (string) get_post_meta( $image, '_wp_attachment_image_alt', true ),
					default => (string) wp_get_attachment_image_url( $image, 'full' ),
				};
		}

		return null;
	}

	/**
	 * A post type archive's title (the blog and shop: their page's title).
	 *
	 * @param string $post_type Post type.
	 * @return string
	 */
	public static function post_type_title( string $post_type ): string {
		if ( 'post' === $post_type ) {
			$page = (int) get_option( 'page_for_posts' );

			return $page ? get_the_title( $page ) : __( 'Blog', 'matter' );
		}

		// WooCommerce's shop page names the products archive.
		if ( 'product' === $post_type && function_exists( 'wc_get_page_id' ) && wc_get_page_id( 'shop' ) > 0 ) {
			return get_the_title( wc_get_page_id( 'shop' ) );
		}

		// Core's filter, as post_type_archive_title() applies it (WooCommerce
		// uses it for the shop page's title).
		return (string) apply_filters( 'post_type_archive_title', (string) ( get_post_type_object( $post_type )->labels->name ?? $post_type ), $post_type );
	}

	/**
	 * Drop a paragraph bound to the archive that came out empty (e.g. a term
	 * with no description), so it leaves no gap.
	 *
	 * @param string $content Rendered block.
	 * @param array  $block   Parsed block.
	 * @return string
	 */
	public function drop_empty_bound_paragraph( string $content, array $block ): string {
		$source = $block['attrs']['metadata']['bindings']['content']['source'] ?? '';

		return 'matter/archive' === $source && '' === trim( wp_strip_all_tags( $content ) ) ? '' : $content;
	}

	/**
	 * An entry's link is its archive.
	 *
	 * @param string  $link Link.
	 * @param WP_Post $post Post.
	 * @return string
	 */
	public function permalink( string $link, WP_Post $post ): string {
		return self::POST_TYPE === $post->post_type ? ( self::target_of( $post )?->url() ?? home_url( '/' ) ) : $link;
	}

	/**
	 * Preview an entry on its archive.
	 *
	 * @param string  $link Preview link, with preview query args.
	 * @param WP_Post $post Post.
	 * @return string
	 */
	public function preview_link( string $link, WP_Post $post ): string {
		if ( self::POST_TYPE !== $post->post_type ) {
			return $link;
		}

		wp_parse_str( (string) wp_parse_url( $link, PHP_URL_QUERY ), $args );

		return add_query_arg(
			[
				'preview'       => 'true',
				'preview_id'    => $post->ID,
				'preview_nonce' => $args['preview_nonce'] ?? wp_create_nonce( 'post_preview_' . $post->ID ),
			],
			self::target_of( $post )?->url() ?? home_url( '/' )
		);
	}

	/**
	 * Entries have no page of their own: send any request for one to its
	 * archive.
	 *
	 * @return void
	 */
	public function redirect_single(): void {
		if ( ! is_singular( self::POST_TYPE ) ) {
			return;
		}

		wp_safe_redirect( self::target_of( (int) get_queried_object_id() )?->url() ?? home_url( '/' ) );
		exit;
	}
}
