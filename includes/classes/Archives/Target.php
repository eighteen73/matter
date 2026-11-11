<?php
/**
 * An archive that can have its own content: a post type archive, a taxonomy
 * (the default for its terms), a term, search results or the 404 page.
 *
 * Stored as a string on an archive content entry:
 * `post_type:product`, `taxonomy:product_cat`, `term:product_cat:42`,
 * `search`, `404`.
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
	 * @param string $type    post_type, taxonomy, term, search or 404.
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
	 * @return self|null Null when it's invalid or no longer exists.
	 */
	public static function from_string( string $value ): ?self {
		$parts = explode( ':', $value );

		return match ( $parts[0] ) {
			'search', '404' => new self( $parts[0] ),
			'post_type'     => isset( $parts[1] ) && post_type_exists( $parts[1] ) ? new self( 'post_type', $parts[1] ) : null,
			'taxonomy'      => isset( $parts[1] ) && taxonomy_exists( $parts[1] ) ? new self( 'taxonomy', $parts[1] ) : null,
			'term'          => isset( $parts[1], $parts[2] ) && get_term( (int) $parts[2], $parts[1] ) instanceof WP_Term
				? new self( 'term', $parts[1], (int) $parts[2] )
				: null,
			default         => null,
		};
	}

	/**
	 * The archive being viewed.
	 *
	 * Author and date archives count as the blog (`post_type:post`).
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

		if ( is_home() || is_author() || is_date() ) {
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

		if ( in_array( $this->type, [ 'term', 'taxonomy' ], true ) && $this->post_type() ) {
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
	 * A name for editors, e.g. "Shop", "All product categories",
	 * "Christmas (Product categories)".
	 *
	 * @return string
	 */
	public function label(): string {
		$taxonomy = in_array( $this->type, [ 'term', 'taxonomy' ], true ) ? get_taxonomy( $this->name ) : null;

		return match ( $this->type ) {
			'post_type' => Archives::post_type_title( $this->name ),
			/* translators: %s: taxonomy name, e.g. "product categories". */
			'taxonomy'  => sprintf( __( 'All %s', 'matter' ), mb_strtolower( (string) ( $taxonomy->labels->name ?? $this->name ) ) ),
			// The taxonomy's plural: singular names can clash (WooCommerce's
			// product categories are "Category").
			'term'      => sprintf(
				/* translators: 1: term name, 2: taxonomy name, e.g. "Christmas (Product categories)". */
				__( '%1$s (%2$s)', 'matter' ),
				$this->short_label(),
				(string) ( $taxonomy->labels->name ?? $this->name )
			),
			'search'    => __( 'Search results', 'matter' ),
			'404'       => __( 'Page not found (404)', 'matter' ),
			default     => $this->key(),
		};
	}

	/**
	 * Where it shows, for editors, e.g. "Each of the product categories,
	 * unless it has its own".
	 *
	 * @return string
	 */
	public function description(): string {
		$taxonomy = in_array( $this->type, [ 'term', 'taxonomy' ], true ) ? get_taxonomy( $this->name ) : null;
		$items    = mb_strtolower( (string) ( get_post_type_object( (string) $this->post_type() )->labels->name ?? '' ) );

		return match ( $this->type ) {
			/* translators: %s: items listed, e.g. "products". */
			'post_type' => sprintf( __( 'The page listing all %s', 'matter' ), $items ),
			/* translators: %s: taxonomy name, e.g. "product categories". */
			'taxonomy'  => sprintf( __( 'Each of the %s, unless it has its own', 'matter' ), mb_strtolower( (string) ( $taxonomy->labels->name ?? $this->name ) ) ),
			/* translators: %s: taxonomy singular name, e.g. "category". */
			'term'      => sprintf( __( 'This %s’s page', 'matter' ), mb_strtolower( (string) ( $taxonomy->labels->singular_name ?? $this->name ) ) ),
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
			fn( $taxonomy ) => mb_strtolower( (string) $taxonomy->labels->singular_name ),
			array_filter(
				get_object_taxonomies( $this->name, 'objects' ),
				fn( $taxonomy ) => $taxonomy->public && $taxonomy->publicly_queryable && $taxonomy->show_ui
			)
		);

		/* translators: %l: taxonomy names, e.g. "category and tag". */
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
	 * The archive's address (a taxonomy uses its busiest term).
	 *
	 * @return string|null
	 */
	public function url(): ?string {
		if ( 'post_type' === $this->type ) {
			if ( 'post' === $this->name ) {
				$page = (int) get_option( 'page_for_posts' );

				return $page ? (string) get_permalink( $page ) : home_url( '/' );
			}

			return get_post_type_archive_link( $this->name ) ?: null;
		}

		if ( in_array( $this->type, [ 'term', 'taxonomy' ], true ) ) {
			$term = $this->term();
			$link = $term ? get_term_link( $term ) : null;

			return is_string( $link ) ? $link : null;
		}

		return match ( $this->type ) {
			'search' => add_query_arg( 's', '', home_url( '/' ) ),
			'404'    => home_url( '/page-not-found-preview/' ),
			default  => null,
		};
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
			'post_type'   => $this->post_type() ?? 'post',
			'post_status' => 'publish',
		];

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

		return '404' === $this->type ? null : $args;
	}
}
