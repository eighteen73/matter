<?php
/**
 * An archive that can have its own content: a post type archive, a taxonomy
 * (the default for its terms), a term, every author archive, every date
 * archive, search results or the 404 page.
 *
 * Stored as a string on an archive content entry:
 * `post_type:product`, `taxonomy:product_cat`, `term:product_cat:42`,
 * `author`, `date`, `search`, `404`.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Archives;

use WP_Term;

defined( 'ABSPATH' ) || exit;

/**
 * An archive target.
 */
final readonly class Target {

	/**
	 * Constructor.
	 *
	 * @param string $type    post_type, taxonomy, term, author, date, search or 404.
	 * @param string $name    Post type or taxonomy name.
	 * @param int    $term_id Term ID (terms only).
	 */
	public function __construct(
		public string $type,
		public string $name = '',
		public int $term_id = 0,
	) {}

	/**
	 * A target from its stored form.
	 *
	 * @param string $value Stored target.
	 * @return self|null Null when it's invalid, no longer exists, or is of a
	 *                   taxonomy without a front end (a private one has no archive).
	 */
	public static function from_string( string $value ): ?self {
		$parts = explode( ':', $value );

		return match ( $parts[0] ) {
			'author', 'date', 'search', '404' => new self( $parts[0] ),
			'post_type'                       => isset( $parts[1] ) && post_type_exists( $parts[1] ) ? new self( 'post_type', $parts[1] ) : null,
			'taxonomy'                        => isset( $parts[1] ) && is_taxonomy_viewable( $parts[1] ) ? new self( 'taxonomy', $parts[1] ) : null,
			'term'                            => isset( $parts[1], $parts[2] ) && is_taxonomy_viewable( $parts[1] ) && get_term( (int) $parts[2], $parts[1] ) instanceof WP_Term
				? new self( 'term', $parts[1], (int) $parts[2] )
				: null,
			default                           => null,
		};
	}

	/**
	 * The archive being viewed.
	 *
	 * Author archives and date archives are one archive each (`author`,
	 * `date`); the blog's entry shows on them only if it's set to cascade.
	 *
	 * @return self|null Null when the request isn't an archive, search or 404.
	 */
	public static function current(): ?self {
		if ( is_404() ) {
			return new self( '404' );
		}

		if ( is_search() ) {
			return new self( 'search' );
		}

		if ( is_category() || is_tag() || is_tax() ) {
			$term = get_queried_object();

			return $term instanceof WP_Term ? new self( 'term', $term->taxonomy, $term->term_id ) : null;
		}

		if ( is_post_type_archive() ) {
			$post_type = get_query_var( 'post_type' );
			$post_type = is_array( $post_type ) ? reset( $post_type ) : $post_type;

			return $post_type ? new self( 'post_type', (string) $post_type ) : null;
		}

		if ( is_author() ) {
			return new self( 'author' );
		}

		if ( is_date() ) {
			return new self( 'date' );
		}

		if ( is_home() ) {
			return new self( 'post_type', 'post' );
		}

		return null;
	}

	/**
	 * The stored form.
	 *
	 * @return string
	 */
	public function key(): string {
		return match ( $this->type ) {
			'term'                  => "term:{$this->name}:{$this->term_id}",
			'post_type', 'taxonomy' => "{$this->type}:{$this->name}",
			default                 => $this->type,
		};
	}

	/**
	 * Where to look for content, most specific first: a term, its ancestors,
	 * its taxonomy, then the post type's archive. Ancestors' and the post type
	 * archive's entries only count when set to cascade (Archives::resolve()).
	 *
	 * @return self[]
	 */
	public function chain(): array {
		$chain = [ $this ];

		if ( 'term' === $this->type ) {
			foreach ( get_ancestors( $this->term_id, $this->name, 'taxonomy' ) as $ancestor ) {
				$chain[] = new self( 'term', $this->name, (int) $ancestor );
			}

			$chain[] = new self( 'taxonomy', $this->name );
		}

		if ( in_array( $this->type, [ 'term', 'taxonomy', 'author', 'date' ], true ) && $this->post_type() ) {
			$chain[] = new self( 'post_type', (string) $this->post_type() );
		}

		return $chain;
	}

	/**
	 * The post type listed.
	 *
	 * @return string|null
	 */
	public function post_type(): ?string {
		if ( 'post_type' === $this->type ) {
			return $this->name;
		}

		// Posts are what authors and dates list.
		if ( in_array( $this->type, [ 'author', 'date' ], true ) ) {
			return 'post';
		}

		if ( in_array( $this->type, [ 'term', 'taxonomy' ], true ) ) {
			$object_types = get_taxonomy( $this->name )->object_type ?? [];

			return $object_types ? (string) reset( $object_types ) : null;
		}

		return null;
	}

	/**
	 * The term (terms), or the taxonomy's busiest term to preview with.
	 *
	 * @return WP_Term|null
	 */
	public function term(): ?WP_Term {
		if ( 'term' === $this->type ) {
			$term = get_term( $this->term_id, $this->name );

			return $term instanceof WP_Term ? $term : null;
		}

		if ( 'taxonomy' === $this->type ) {
			$terms = get_terms(
				[
					'taxonomy'   => $this->name,
					'number'     => 1,
					'orderby'    => 'count',
					'order'      => 'DESC',
					'hide_empty' => false,
				]
			);

			return is_array( $terms ) && $terms ? $terms[0] : null;
		}

		return null;
	}

	/**
	 * A name for editors, e.g. "Shop", "All Product categories",
	 * "Christmas (Product categories)". Taxonomy and post type names are the
	 * registered labels, as written: they aren't lowercased, which would be
	 * wrong in languages that capitalise nouns.
	 *
	 * @return string
	 */
	public function label(): string {
		$taxonomy = in_array( $this->type, [ 'term', 'taxonomy' ], true ) ? get_taxonomy( $this->name ) : null;

		return match ( $this->type ) {
			'post_type' => Archives::post_type_title( $this->name ),
			/* translators: %s: taxonomy name, e.g. "Product categories". */
			'taxonomy'  => sprintf( __( 'All %s', 'matter' ), (string) ( $taxonomy->labels->name ?? $this->name ) ),
			// The taxonomy's plural: singular names can clash (WooCommerce's
			// product categories are "Category").
			'term'      => sprintf(
				/* translators: 1: term name, 2: taxonomy name, e.g. "Christmas (Product categories)". */
				__( '%1$s (%2$s)', 'matter' ),
				$this->short_label(),
				(string) ( $taxonomy->labels->name ?? $this->name )
			),
			'author'    => __( 'Author archives', 'matter' ),
			'date'      => __( 'Date archives', 'matter' ),
			'search'    => __( 'Search results', 'matter' ),
			'404'       => __( 'Page not found (404)', 'matter' ),
			default     => $this->key(),
		};
	}

	/**
	 * Where it shows, for editors, e.g. "Each of the Product categories,
	 * unless it has its own".
	 *
	 * @return string
	 */
	public function description(): string {
		$taxonomy = in_array( $this->type, [ 'term', 'taxonomy' ], true ) ? get_taxonomy( $this->name ) : null;
		$items    = (string) ( get_post_type_object( (string) $this->post_type() )->labels->name ?? '' );

		return match ( $this->type ) {
			/* translators: %s: items listed, e.g. "products". */
			'post_type' => sprintf( __( 'The page listing all %s', 'matter' ), $items ),
			/* translators: %s: taxonomy name, e.g. "product categories". */
			'taxonomy'  => sprintf( __( 'Each of the %s, unless it has its own', 'matter' ), (string) ( $taxonomy->labels->name ?? $this->name ) ),
			/* translators: %s: taxonomy singular name, e.g. "category". */
			'term'      => sprintf( __( 'This %s’s page', 'matter' ), (string) ( $taxonomy->labels->singular_name ?? $this->name ) ),
			'author'    => __( 'Each author’s page, unless it’s the blog’s to share', 'matter' ),
			'date'      => __( 'The year, month and day archives, unless it’s the blog’s to share', 'matter' ),
			'search'    => __( 'Shown when someone searches the site', 'matter' ),
			'404'       => __( 'Shown when a page can’t be found', 'matter' ),
			default     => '',
		};
	}

	/**
	 * What an entry for this archive can also show on, as the editor's
	 * toggle: a term's children (hierarchical taxonomies), or a post type
	 * archive's term archives. Empty when nothing is below it.
	 *
	 * @return string
	 */
	public function cascade_label(): string {
		if ( 'term' === $this->type ) {
			$taxonomy = get_taxonomy( $this->name );

			return $taxonomy && $taxonomy->hierarchical ? __( 'Include subcategories', 'matter' ) : '';
		}

		if ( 'post_type' !== $this->type ) {
			return '';
		}

		$names = array_map(
			fn( $taxonomy ) => (string) $taxonomy->labels->singular_name,
			array_filter(
				get_object_taxonomies( $this->name, 'objects' ),
				fn( $taxonomy ) => $taxonomy->public && $taxonomy->publicly_queryable && $taxonomy->show_ui
			)
		);

		// The blog's entry can also show on the author and date archives.
		if ( 'post' === $this->name ) {
			$names[] = __( 'Author', 'matter' );
			$names[] = __( 'Date', 'matter' );
		}

		/* translators: %l: archive names, e.g. "Category and Tag". */
		return $names ? wp_sprintf( __( 'Include %l pages', 'matter' ), array_values( $names ) ) : '';
	}

	/**
	 * A short name: a term's own name, else the full label.
	 *
	 * @return string
	 */
	public function short_label(): string {
		return 'term' === $this->type ? (string) ( $this->term()?->name ?? $this->term_id ) : $this->label();
	}

	/**
	 * The archive's address (a taxonomy uses its busiest term), worked out
	 * once per request (several screens ask for each, and an author's or a
	 * year's takes a query).
	 *
	 * @return string|null
	 */
	public function url(): ?string {
		$cache = &self::url_cache();
		$key   = $this->key();

		if ( array_key_exists( $key, $cache ) ) {
			return $cache[ $key ];
		}

		$url = $this->work_out_url();

		// A long-running command sees changes nothing announces, and no
		// address yet (a type or taxonomy not registered so far) may have one
		// a moment later: neither is remembered.
		if ( null !== $url && ! ( defined( 'WP_CLI' ) && WP_CLI ) ) {
			$cache[ $key ] = $url;
		}

		return $url;
	}

	/**
	 * Forget the addresses worked out (when what they depend on changes).
	 *
	 * @return void
	 */
	public static function flush_urls(): void {
		$cache = &self::url_cache();
		$cache = [];
	}

	/**
	 * The addresses worked out this request, by target. (A static variable:
	 * a readonly class can't have static properties.)
	 *
	 * @return array<string, string|null>
	 */
	private static function &url_cache(): array {
		static $cache = [];

		return $cache;
	}

	/**
	 * The archive's address, without the cache.
	 *
	 * @return string|null
	 */
	private function work_out_url(): ?string {
		if ( 'post_type' === $this->type ) {
			if ( 'post' === $this->name ) {
				$page = (int) get_option( 'page_for_posts' );

				if ( $page ) {
					return (string) get_permalink( $page );
				}

				// With a static front page and no posts page, nothing lists
				// the posts (WordPress's link would be the front page).
				return 'page' === get_option( 'show_on_front' ) ? null : home_url( '/' );
			}

			return get_post_type_archive_link( $this->name ) ?: null;
		}

		if ( in_array( $this->type, [ 'term', 'taxonomy' ], true ) ) {
			$term = $this->term();
			$link = $term ? get_term_link( $term ) : null;

			return is_string( $link ) ? $link : null;
		}

		$author = 'author' === $this->type ? $this->sample_author() : 0;

		return match ( $this->type ) {
			'author' => $author ? get_author_posts_url( $author ) : null,
			'date'   => get_year_link( $this->sample_year() ),
			'search' => add_query_arg( 's', '', home_url( '/' ) ),
			'404'    => home_url( '/page-not-found-preview/' ),
			default  => null,
		};
	}

	/**
	 * Why the archive has no address, for editors, if that's something a
	 * person can change: posts without a posts page.
	 *
	 * @return string|null
	 */
	public function missing_page(): ?string {
		if ( 'post_type' !== $this->type || 'post' !== $this->name || null !== $this->url() ) {
			return null;
		}

		return __( 'No page lists the posts yet, so there’s nothing to link to or view. An administrator can choose one in Settings › Reading, as the “Posts page”.', 'matter' );
	}

	/**
	 * Where the archive can be seen, for previews: its address, or for posts
	 * without a page of their own, WordPress's posts list by its query.
	 *
	 * @return string|null
	 */
	public function preview_url(): ?string {
		return $this->url() ?? ( $this->missing_page() ? add_query_arg( 'post_type', 'post', home_url( '/' ) ) : null );
	}

	/**
	 * Block templates that could render this archive, most specific first.
	 *
	 * @return string[]
	 */
	public function template_hierarchy(): array {
		$post_type = $this->post_type();

		if ( in_array( $this->type, [ 'term', 'taxonomy' ], true ) ) {
			$term   = $this->term();
			$prefix = match ( $this->name ) {
				'category' => 'category',
				'post_tag' => 'tag',
				default    => "taxonomy-{$this->name}",
			};

			return array_values(
				array_filter(
					[
						$term ? "{$prefix}-{$term->slug}" : null,
						$prefix,
						str_starts_with( $prefix, 'taxonomy-' ) ? 'taxonomy' : null,
						$post_type && 'post' !== $post_type ? "archive-{$post_type}" : null,
						'archive',
						'index',
					]
				)
			);
		}

		return match ( $this->type ) {
			'post_type' => 'post' === $this->name ? [ 'home', 'index' ] : [ "archive-{$this->name}", 'archive', 'index' ],
			'author'    => [ 'author', 'archive', 'index' ],
			'date'      => [ 'date', 'archive', 'index' ],
			'search'    => [ 'search', 'index' ],
			'404'       => [ '404', 'index' ],
			default     => [ 'index' ],
		};
	}

	/**
	 * Query args listing this archive's items, for the editor preview.
	 *
	 * @return array|null Null when there's no listing (404).
	 */
	public function query_args(): ?array {
		$args = [
			'post_type'      => $this->post_type() ?? 'post',
			'post_status'    => 'publish',
			// A page of the list, as the front end lists it (the template's
			// own page size isn't known here).
			'posts_per_page' => max( 1, (int) get_option( 'posts_per_page', 10 ) ),
		];

		if ( 'search' === $this->type ) {
			$args['s'] = $this->sample_search();
		}

		if ( in_array( $this->type, [ 'term', 'taxonomy' ], true ) ) {
			$term = $this->term();

			if ( $term ) {
				$args['tax_query'] = [ // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Editor preview only.
					[
						'taxonomy' => $this->name,
						'terms'    => $term->term_id,
					],
				];
			}
		}

		if ( 'author' === $this->type ) {
			$author = $this->sample_author();

			if ( $author ) {
				$args['author'] = $author;
			} else {
				// `author => 0` would list everyone's posts; without an author
				// there is nothing to list.
				$args['post__in'] = [ 0 ];
			}
		}

		if ( 'date' === $this->type ) {
			$args['year'] = $this->sample_year();
		}

		return '404' === $this->type ? null : $args;
	}

	/**
	 * Something to search for, for the search preview: a word from the
	 * newest post's title, so there are results to show.
	 *
	 * @return string
	 */
	private function sample_search(): string {
		$posts = get_posts(
			[
				'numberposts'   => 1,
				'no_found_rows' => true,
			]
		);

		foreach ( preg_split( '/\W+/u', (string) ( $posts[0]->post_title ?? '' ), -1, PREG_SPLIT_NO_EMPTY ) ?: [] as $word ) {
			if ( mb_strlen( $word ) >= 3 ) {
				return $word;
			}
		}

		return 'a';
	}

	/**
	 * An author to show an author archive with: the first with published posts.
	 *
	 * @return int User ID, 0 if no one has posted.
	 */
	private function sample_author(): int {
		$users = get_users(
			[
				'has_published_posts' => [ 'post' ],
				'number'              => 1,
				'fields'              => 'ID',
			]
		);

		return $users ? (int) $users[0] : 0;
	}

	/**
	 * A year to show a date archive with: the newest post's.
	 *
	 * @return int
	 */
	private function sample_year(): int {
		$posts = get_posts(
			[
				'numberposts'   => 1,
				'fields'        => 'ids',
				'no_found_rows' => true,
			]
		);

		return $posts ? (int) get_the_date( 'Y', $posts[0] ) : (int) wp_date( 'Y' );
	}
}
