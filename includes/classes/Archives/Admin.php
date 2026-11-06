<?php
/**
 * Archive content in the admin: where editors find and start entries.
 *
 * - Front end: "Edit archive content" / "Customise" in the admin bar.
 * - Term screens: the term's content, with Edit or Customise; the term list
 *   links to the taxonomy's default.
 * - "Archive page" under each post type with an archive (and Posts).
 * - Appearance › Archive content: every entry, what it shows on, and
 *   shortcuts for each archive.
 * - Customise: creates a draft for an archive, starting from what shows
 *   there now, and opens it; or opens the archive's own entry.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Archives;

use Eighteen73\Matter\Singleton;
use WP_Admin_Bar;
use WP_Post;
use WP_REST_Request;
use WP_Term;

defined( 'ABSPATH' ) || exit;

/**
 * Archive content admin.
 */
class Admin {

	use Singleton;

	private const ACTION = 'matter_archive_customise';

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'admin_bar_menu', [ $this, 'admin_bar' ], 80 );
		add_action( 'admin_post_' . self::ACTION, [ $this, 'customise' ] );
		add_action( 'admin_menu', [ $this, 'post_type_menus' ] );
		add_action( 'admin_init', [ $this, 'term_screens' ] );
		add_action( 'admin_notices', [ $this, 'shortcuts' ] );
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'editor_data' ], 11 );
		add_filter( 'manage_' . Archives::POST_TYPE . '_posts_columns', [ $this, 'columns' ] );
		add_action( 'manage_' . Archives::POST_TYPE . '_posts_custom_column', [ $this, 'column' ], 10, 2 );
		add_filter( 'post_row_actions', [ $this, 'row_actions' ], 10, 2 );
	}

	/**
	 * Whether the user can edit archive content.
	 *
	 * @return bool
	 */
	private function can_edit(): bool {
		return current_user_can( get_post_type_object( Archives::POST_TYPE )->cap->edit_posts ?? 'edit_pages' );
	}

	/**
	 * Link that customises an archive (or opens its own entry).
	 *
	 * @param Target $target Archive.
	 * @param int    $copy   An entry to start a new draft from (a new version
	 *                       to schedule), rather than opening the own entry.
	 * @return string
	 */
	public static function customise_url( Target $target, int $copy = 0 ): string {
		return wp_nonce_url(
			add_query_arg(
				array_filter(
					[
						'action' => self::ACTION,
						'target' => $target->key(),
						'copy'   => $copy ?: null,
					]
				),
				admin_url( 'admin-post.php' )
			),
			self::ACTION
		);
	}

	/**
	 * The archive's own entry, or a new draft for it, then its editor.
	 *
	 * @return void
	 */
	public function customise(): void {
		check_admin_referer( self::ACTION );

		$target = Target::from_string( sanitize_text_field( wp_unslash( $_GET['target'] ?? '' ) ) );

		if ( ! $target || ! $this->can_edit() ) {
			wp_die( esc_html__( 'Sorry, you can’t customise this archive.', 'matter' ), 403 );
		}

		$archives = Archives::instance();
		$copy     = get_post( absint( $_GET['copy'] ?? 0 ) );
		$copy     = $copy && Archives::POST_TYPE === $copy->post_type && current_user_can( 'edit_post', $copy->ID ) ? $copy : null;
		$entry    = $copy ? null : $archives->own_entry( $target );

		if ( ! $entry ) {
			$id = wp_insert_post(
				[
					'post_type'    => Archives::POST_TYPE,
					'post_status'  => 'draft',
					'post_title'   => $target->label(),
					'post_content' => wp_slash( $copy ? $copy->post_content : $archives->content_for( $target ) ),
					'meta_input'   => [ Archives::META => $target->key() ],
				],
				true
			);

			if ( is_wp_error( $id ) ) {
				wp_die( esc_html( $id->get_error_message() ) );
			}

			$entry = get_post( $id );
		}

		wp_safe_redirect( (string) get_edit_post_link( $entry->ID, 'raw' ) );
		exit;
	}

	/**
	 * The archive's state for editors: its own entry, an inherited one, or
	 * the theme default.
	 *
	 * @param Target $target Archive.
	 * @return array{own: WP_Post|null, shown: WP_Post|null}
	 */
	private function state( Target $target ): array {
		return [
			'own'   => Archives::instance()->own_entry( $target ),
			'shown' => Archives::instance()->resolve( $target ),
		];
	}

	/**
	 * Front end: edit or customise the archive being viewed.
	 *
	 * @param WP_Admin_Bar $admin_bar Admin bar.
	 * @return void
	 */
	public function admin_bar( WP_Admin_Bar $admin_bar ): void {
		$target = is_admin() ? null : Target::current();

		if ( ! $target || ! $this->can_edit() ) {
			return;
		}

		[ 'own' => $own, 'shown' => $shown ] = $this->state( $target );

		if ( $own ) {
			$admin_bar->add_node(
				[
					'id'    => 'matter-archive',
					'title' => __( 'Edit archive content', 'matter' ),
					'href'  => get_edit_post_link( $own->ID, 'raw' ),
				]
			);

			return;
		}

		$admin_bar->add_node(
			[
				'id'    => 'matter-archive',
				'title' => __( 'Customise archive', 'matter' ),
				'href'  => self::customise_url( $target ),
			]
		);

		// Showing an entry shared with other archives: edit that, or start
		// this archive's own.
		if ( ! $shown ) {
			return;
		}

		$admin_bar->add_node(
			[
				'parent' => 'matter-archive',
				'id'     => 'matter-archive-customise',
				/* translators: %s: archive name, e.g. "Christmas". */
				'title'  => sprintf( __( 'Customise for %s only', 'matter' ), $target->short_label() ),
				'href'   => self::customise_url( $target ),
			]
		);

		$admin_bar->add_node(
			[
				'parent' => 'matter-archive',
				'id'     => 'matter-archive-shared',
				/* translators: %s: entry title. */
				'title'  => sprintf( __( 'Edit “%s” (shared)', 'matter' ), get_the_title( $shown ) ),
				'href'   => get_edit_post_link( $shown->ID, 'raw' ),
			]
		);
	}

	/**
	 * Post types with an archive (and Posts, for the blog): "Archive page".
	 *
	 * @return void
	 */
	public function post_type_menus(): void {
		if ( ! $this->can_edit() ) {
			return;
		}

		$post_types = array_merge(
			[ 'post' ],
			get_post_types(
				[
					'has_archive' => true,
					'show_ui'     => true,
				]
			)
		);

		foreach ( array_unique( $post_types ) as $post_type ) {
			$target = new Target( 'post_type', $post_type );
			$slug   = 'matter-archive-' . $post_type;
			$hook   = add_submenu_page(
				'post' === $post_type ? 'edit.php' : 'edit.php?post_type=' . $post_type,
				$target->label(),
				__( 'Archive page', 'matter' ),
				get_post_type_object( Archives::POST_TYPE )->cap->edit_posts,
				$slug,
				fn() => $this->render_default_page( $target )
			);

			// With an entry, go straight to it.
			add_action(
				"load-{$hook}",
				function () use ( $target ) {
					$own = Archives::instance()->own_entry( $target );

					if ( $own ) {
						wp_safe_redirect( (string) get_edit_post_link( $own->ID, 'raw' ) );
						exit;
					}
				}
			);
		}
	}

	/**
	 * "Archive page" for an archive still on the theme default.
	 *
	 * @param Target $target Archive.
	 * @return void
	 */
	private function render_default_page( Target $target ): void {
		$url = $target->url();
		?>
		<div class="wrap">
			<h1><?php echo esc_html( $target->label() ); ?></h1>
			<p>
				<?php esc_html_e( 'This archive shows the theme’s default content above and below its list. Customise it to add your own sections; the list itself stays as the theme sets it.', 'matter' ); ?>
			</p>
			<p>
				<a class="button button-primary" href="<?php echo esc_url( self::customise_url( $target ) ); ?>"><?php esc_html_e( 'Customise', 'matter' ); ?></a>
				<?php if ( $url ) : ?>
					<a class="button" href="<?php echo esc_url( $url ); ?>"><?php esc_html_e( 'View archive', 'matter' ); ?></a>
				<?php endif; ?>
			</p>
		</div>
		<?php
	}

	/**
	 * Term screens of public taxonomies.
	 *
	 * @return void
	 */
	public function term_screens(): void {
		foreach ( get_taxonomies(
			[
				'public'  => true,
				'show_ui' => true,
			]
		) as $taxonomy ) {
			add_action( "{$taxonomy}_edit_form_fields", [ $this, 'term_field' ], 20 );
			add_action( "after-{$taxonomy}-table", [ $this, 'taxonomy_note' ] );
		}
	}

	/**
	 * Edit term: its archive content.
	 *
	 * @param WP_Term $term Term.
	 * @return void
	 */
	public function term_field( WP_Term $term ): void {
		if ( ! $this->can_edit() ) {
			return;
		}

		$target                              = new Target( 'term', $term->taxonomy, $term->term_id );
		[ 'own' => $own, 'shown' => $shown ] = $this->state( $target );
		?>
		<tr class="form-field">
			<th scope="row"><?php esc_html_e( 'Archive content', 'matter' ); ?></th>
			<td>
				<?php if ( $own ) : ?>
					<p>
						<a class="button" href="<?php echo esc_url( (string) get_edit_post_link( $own->ID ) ); ?>"><?php esc_html_e( 'Edit archive content', 'matter' ); ?></a>
						<?php echo 'publish' === $own->post_status ? '' : esc_html( ' ' . get_post_status_object( $own->post_status )->label ); ?>
					</p>
				<?php else : ?>
					<p>
						<?php
						echo $shown
							/* translators: %s: entry title. */
							? esc_html( sprintf( __( 'Uses “%s”.', 'matter' ), get_the_title( $shown ) ) )
							: esc_html__( 'Uses the theme’s default.', 'matter' );
						?>
						<a class="button" href="<?php echo esc_url( self::customise_url( $target ) ); ?>"><?php esc_html_e( 'Customise', 'matter' ); ?></a>
					</p>
				<?php endif; ?>
				<p class="description"><?php esc_html_e( 'Content above and below this archive’s list. Child terms use it too, unless they have their own.', 'matter' ); ?></p>
			</td>
		</tr>
		<?php
	}

	/**
	 * Term list: the taxonomy's default archive content.
	 *
	 * @param string $taxonomy Taxonomy.
	 * @return void
	 */
	public function taxonomy_note( string $taxonomy ): void {
		if ( ! $this->can_edit() ) {
			return;
		}

		$target = new Target( 'taxonomy', $taxonomy );
		$own    = Archives::instance()->own_entry( $target );
		?>
		<p>
			<?php
			/* translators: %s: archive name, e.g. "All product categories". */
			echo esc_html( sprintf( __( 'Archive content for %s:', 'matter' ), mb_strtolower( $target->label() ) ) );
			?>
			<a href="<?php echo esc_url( $own ? (string) get_edit_post_link( $own->ID ) : self::customise_url( $target ) ); ?>">
				<?php $own ? esc_html_e( 'Edit', 'matter' ) : esc_html_e( 'Customise', 'matter' ); ?>
			</a>
		</p>
		<?php
	}

	/**
	 * Archives editors can customise: post type archives, taxonomies, search
	 * and 404.
	 *
	 * @return Target[]
	 */
	public static function top_level_targets(): array {
		$targets = [];

		foreach ( array_unique(
			array_merge(
				[ 'post' ],
				get_post_types(
					[
						'has_archive' => true,
						'show_ui'     => true,
					]
				)
			)
		) as $post_type ) {
			$targets[] = new Target( 'post_type', $post_type );
		}

		foreach ( get_taxonomies(
			[
				'public'  => true,
				'show_ui' => true,
			]
		) as $taxonomy ) {
			if ( 'post_format' !== $taxonomy ) {
				$targets[] = new Target( 'taxonomy', $taxonomy );
			}
		}

		$targets[] = new Target( 'search' );
		$targets[] = new Target( '404' );

		return $targets;
	}

	/**
	 * Appearance › Archive content: shortcuts for each archive.
	 *
	 * @return void
	 */
	public function shortcuts(): void {
		$screen = get_current_screen();

		if ( ! $screen || 'edit-' . Archives::POST_TYPE !== $screen->id ) {
			return;
		}

		$links = array_map(
			function ( Target $target ) {
				$own = Archives::instance()->own_entry( $target );

				return sprintf(
					'%1$s: <a href="%2$s">%3$s</a>',
					esc_html( $target->label() ),
					esc_url( $own ? (string) get_edit_post_link( $own->ID ) : self::customise_url( $target ) ),
					$own ? esc_html__( 'Edit', 'matter' ) : esc_html__( 'Customise', 'matter' )
				);
			},
			self::top_level_targets()
		);
		?>
		<div class="notice notice-info">
			<p>
				<?php esc_html_e( 'Content above and below archive lists. Terms use their parent’s, then their taxonomy’s, then the post type’s, then the theme’s default. Customise a single term from its edit screen or from the admin bar on its archive. The newest published entry for an archive shows, so you can schedule a replacement.', 'matter' ); ?>
			</p>
			<p><?php echo wp_kses_post( implode( ' &middot; ', $links ) ); ?></p>
		</div>
		<?php
	}

	/**
	 * List columns: what each entry shows on.
	 *
	 * @param array $columns Columns.
	 * @return array
	 */
	public function columns( array $columns ): array {
		$position = array_search( 'title', array_keys( $columns ), true );

		return array_slice( $columns, 0, false === $position ? 1 : $position + 1, true )
			+ [ 'matter_target' => __( 'Shows on', 'matter' ) ]
			+ $columns;
	}

	/**
	 * The "Shows on" column.
	 *
	 * @param string $column  Column.
	 * @param int    $post_id Entry.
	 * @return void
	 */
	public function column( string $column, int $post_id ): void {
		if ( 'matter_target' !== $column ) {
			return;
		}

		$target = Archives::target_of( $post_id );

		if ( ! $target ) {
			echo '&mdash;';
			return;
		}

		$shown = Archives::instance()->resolve( $target );
		$url   = $target->url();

		echo $url ? '<a href="' . esc_url( $url ) . '">' . esc_html( $target->label() ) . '</a>' : esc_html( $target->label() );

		if ( 'publish' === get_post_status( $post_id ) && $shown && $shown->ID !== $post_id && Archives::target_of( $shown )?->key() === $target->key() ) {
			echo '<br><span class="description">' . esc_html__( 'Replaced by a newer entry', 'matter' ) . '</span>';
		}
	}

	/**
	 * Row action: start a replacement (a draft copy) to schedule.
	 *
	 * @param array   $actions Actions.
	 * @param WP_Post $post    Post.
	 * @return array
	 */
	public function row_actions( array $actions, WP_Post $post ): array {
		$target = Archives::POST_TYPE === $post->post_type ? Archives::target_of( $post ) : null;

		if ( $target && $this->can_edit() ) {
			$actions['matter_copy'] = sprintf(
				'<a href="%1$s">%2$s</a>',
				esc_url( self::customise_url( $target, $post->ID ) ),
				esc_html__( 'New version', 'matter' )
			);
		}

		return $actions;
	}

	/**
	 * `GET matter/v1/archive-targets`: archives an entry can show on, for the
	 * editor's "Shows on" control. `search` adds matching terms; `include`
	 * returns one target (with its bound values).
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			'matter/v1',
			'/archive-targets',
			[
				'methods'             => 'GET',
				'permission_callback' => fn() => $this->can_edit(),
				'args'                => [
					'search'  => [
						'type'    => 'string',
						'default' => '',
					],
					'include' => [
						'type'    => 'string',
						'default' => '',
					],
				],
				'callback'            => function ( WP_REST_Request $request ) {
					$include = Target::from_string( (string) $request['include'] );

					if ( $include ) {
						return rest_ensure_response( [ self::describe( $include ) ] );
					}

					$search  = trim( (string) $request['search'] );
					$targets = array_filter(
						self::top_level_targets(),
						fn( Target $target ) => '' === $search || false !== mb_stripos( $target->label(), $search )
					);

					if ( '' !== $search ) {
						$terms = get_terms(
							[
								'taxonomy'   => array_values(
									get_taxonomies(
										[
											'public'  => true,
											'show_ui' => true,
										]
									)
								),
								'search'     => $search,
								'number'     => 20,
								'hide_empty' => false,
							]
						);

						foreach ( is_array( $terms ) ? $terms : [] as $term ) {
							$targets[] = new Target( 'term', $term->taxonomy, $term->term_id );
						}
					}

					return rest_ensure_response( array_values( array_map( [ self::class, 'describe' ], $targets ) ) );
				},
			]
		);
	}

	/**
	 * A target for the editor.
	 *
	 * @param Target $target Archive.
	 * @return array
	 */
	public static function describe( Target $target ): array {
		return [
			'value'  => $target->key(),
			'label'  => $target->label(),
			'url'    => $target->url(),
			'values' => [
				'title'       => wp_specialchars_decode( (string) Archives::value( $target, 'title' ) ),
				'description' => wp_strip_all_tags( (string) Archives::value( $target, 'description' ) ),
				'count'       => (string) Archives::value( $target, 'count' ),
			],
		];
	}

	/**
	 * The entry's archive, for the editor (bound values, "Shows on").
	 *
	 * @return void
	 */
	public function editor_data(): void {
		$post = get_post();

		if ( ! $post || Archives::POST_TYPE !== $post->post_type ) {
			return;
		}

		$target = Archives::target_of( $post );

		wp_add_inline_script(
			'matter-editor',
			'window.matterEditor = Object.assign( window.matterEditor || {}, ' . wp_json_encode(
				[
					'archive' => $target ? self::describe( $target ) : null,
				]
			) . ' );',
			'before'
		);
	}
}
