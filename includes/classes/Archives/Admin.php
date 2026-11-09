<?php
/**
 * Archives in the admin: where editors find and start entries.
 *
 * - Front end: "Edit archive" / "Customise archive" in the admin bar,
 *   after the core edit link.
 * - Term screens: where the term's content comes from, with Edit or
 *   Customise; the term list links to the taxonomy's default.
 * - "Archive" under each post type with an archive (and Posts).
 * - Appearance › Archives: every entry and what it shows on. "Customise an
 *   archive" (Add new) chooses the archive first; the Help tab explains which
 *   content shows.
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
 * Archives admin.
 */
class Admin {

	use Singleton;

	private const ACTION = 'matter_archive_customise';

	private const CHOOSER = 'matter-archive-pages';

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		// After core's "Edit Category" / "Edit Page" (80).
		add_action( 'admin_bar_menu', [ $this, 'admin_bar' ], 81 );
		add_action( 'wp_enqueue_scripts', [ $this, 'admin_bar_icon' ] );
		add_action( 'admin_post_' . self::ACTION, [ $this, 'customise' ] );
		add_action( 'admin_menu', [ $this, 'post_type_menus' ] );
		add_action( 'admin_menu', [ $this, 'chooser_page' ] );
		add_action( 'load-post-new.php', [ $this, 'redirect_add_new' ] );
		add_action( 'admin_init', [ $this, 'term_screens' ] );
		add_action( 'current_screen', [ $this, 'help' ] );
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
	 * Where an archive's content comes from, for editors: "Customised",
	 * "Uses the content from Shop", "Draft · Uses the theme's default".
	 *
	 * @param Target $target Archive.
	 * @return string HTML.
	 */
	private function status( Target $target ): string {
		[ 'own' => $own, 'shown' => $shown ] = $this->state( $target );

		if ( $own && $shown && $own->ID === $shown->ID ) {
			return '<strong>' . esc_html__( 'Customised', 'matter' ) . '</strong>';
		}

		$source = $shown ? Archives::target_of( $shown ) : null;
		$now    = $source
			/* translators: %s: archive name, e.g. "Shop". */
			? sprintf( esc_html__( 'Uses the content from %s', 'matter' ), '<strong>' . esc_html( $source->label() ) . '</strong>' )
			: esc_html__( 'Uses the theme’s default', 'matter' );

		if ( ! $own ) {
			return $now;
		}

		$state = 'future' === $own->post_status
			/* translators: %s: date. */
			? sprintf( __( 'Scheduled for %s', 'matter' ), get_the_date( '', $own ) )
			: (string) get_post_status_object( $own->post_status )->label;

		return '<strong>' . esc_html( $state ) . '</strong> &middot; ' . $now;
	}

	/**
	 * Edit (own entry) or Customise buttons for an archive.
	 *
	 * @param Target $target    Archive.
	 * @param string $customise Customise button text.
	 * @return string HTML.
	 */
	private function actions( Target $target, string $customise ): string {
		$own = Archives::instance()->own_entry( $target );

		return $own
			? sprintf( '<a class="button" href="%1$s">%2$s</a>', esc_url( (string) get_edit_post_link( $own->ID ) ), esc_html__( 'Edit', 'matter' ) )
			: sprintf( '<a class="button" href="%1$s">%2$s</a>', esc_url( self::customise_url( $target ) ), esc_html( $customise ) );
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
					'title' => __( 'Edit archive', 'matter' ),
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
				/* translators: %s: archive the content is set for, e.g. "Shop". */
				'title'  => sprintf( __( 'Edit the shared content (%s)', 'matter' ), Archives::target_of( $shown )?->label() ?? get_the_title( $shown ) ),
				'href'   => get_edit_post_link( $shown->ID, 'raw' ),
			]
		);
	}

	/**
	 * The admin bar item's icon, like core's items.
	 *
	 * @return void
	 */
	public function admin_bar_icon(): void {
		if ( is_admin_bar_showing() ) {
			wp_add_inline_style( 'admin-bar', '#wpadminbar #wp-admin-bar-matter-archive > .ab-item::before { content: "\\f538"; top: 2px; }' );
		}
	}

	/**
	 * Post types with an archive (and Posts, for the blog): "Archive".
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
				__( 'Archive', 'matter' ),
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
	 * "Archive" for an archive still on the theme default.
	 *
	 * @param Target $target Archive.
	 * @return void
	 */
	private function render_default_page( Target $target ): void {
		$url = $target->url();
		?>
		<div class="wrap">
			<h1><?php echo esc_html( $target->label() ); ?></h1>
			<p><?php echo wp_kses_post( $this->status( $target ) ); ?>.</p>
			<p>
				<?php
				printf(
					/* translators: %s: items listed, e.g. "products". */
					esc_html__( 'Customise it to add your own sections above and below its list of %s. The list itself stays as the theme sets it.', 'matter' ),
					esc_html( mb_strtolower( (string) get_post_type_object( (string) $target->post_type() )->labels->name ) )
				);
				?>
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
	 * Edit term: where its archive content comes from, then Edit or
	 * Customise.
	 *
	 * @param WP_Term $term Term.
	 * @return void
	 */
	public function term_field( WP_Term $term ): void {
		if ( ! $this->can_edit() ) {
			return;
		}

		$target   = new Target( 'term', $term->taxonomy, $term->term_id );
		$taxonomy = get_taxonomy( $term->taxonomy );
		$singular = mb_strtolower( (string) $taxonomy->labels->singular_name );
		$items    = mb_strtolower( (string) ( get_post_type_object( (string) $target->post_type() )->labels->name ?? '' ) );
		$own      = Archives::instance()->own_entry( $target );
		$shown    = Archives::instance()->resolve( $target );
		?>
		<tr class="form-field">
			<th scope="row"><?php esc_html_e( 'Archive', 'matter' ); ?></th>
			<td>
				<p><?php echo wp_kses_post( $this->status( $target ) ); ?></p>
				<p>
					<?php
					/* translators: %s: taxonomy singular name, e.g. "category". */
					echo wp_kses_post( $this->actions( $target, sprintf( __( 'Customise for this %s', 'matter' ), $singular ) ) );

					if ( ! $own && $shown && current_user_can( 'edit_post', $shown->ID ) ) {
						printf(
							' <a href="%1$s" style="margin-inline-start: 0.5em;">%2$s</a>',
							esc_url( (string) get_edit_post_link( $shown->ID ) ),
							esc_html__( 'Edit the shared content', 'matter' )
						);
					}
					?>
				</p>
				<p class="description">
					<?php
					/* translators: 1: taxonomy singular name, e.g. "category"; 2: items listed, e.g. "products". */
					echo esc_html( sprintf( __( 'Content above and below this %1$s’s list of %2$s.', 'matter' ), $singular, $items ) );

					if ( $taxonomy->hierarchical ) {
						echo ' ';
						/* translators: %s: taxonomy name, e.g. "Product categories". */
						echo esc_html( sprintf( __( '%s inside it use it too, unless they have their own.', 'matter' ), $taxonomy->labels->name ) );
					}
					?>
				</p>
			</td>
		</tr>
		<?php
	}

	/**
	 * Term list: the taxonomy's default archive.
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
			/* translators: %s: taxonomy name, e.g. "Product categories". */
			echo esc_html( sprintf( __( '%s without their own archive share one layout.', 'matter' ), get_taxonomy( $taxonomy )->labels->name ) );
			?>
			<a href="<?php echo esc_url( $own ? (string) get_edit_post_link( $own->ID ) : self::customise_url( $target ) ); ?>">
				<?php $own ? esc_html_e( 'Edit it', 'matter' ) : esc_html_e( 'Customise it', 'matter' ); ?>
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
	 * "Customise an archive": choose the archive, then customise it. Hidden from
	 * the menu; Add new leads here.
	 *
	 * @return void
	 */
	public function chooser_page(): void {
		$hook = add_submenu_page(
			'',
			__( 'Customise an archive', 'matter' ),
			'',
			get_post_type_object( Archives::POST_TYPE )->cap->edit_posts,
			self::CHOOSER,
			[ $this, 'render_chooser' ]
		);

		// Highlight Appearance › Archives.
		add_action(
			"load-{$hook}",
			function () {
				add_filter( 'parent_file', fn() => 'themes.php' );
				add_filter( 'submenu_file', fn() => 'edit.php?post_type=' . Archives::POST_TYPE );
			}
		);
	}

	/**
	 * Add new: choose the archive first (`blank` starts an empty entry).
	 *
	 * @return void
	 */
	public function redirect_add_new(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Navigation only.
		if ( Archives::POST_TYPE === ( $_GET['post_type'] ?? '' ) && ! isset( $_GET['blank'] ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::CHOOSER ) );
			exit;
		}
	}

	/**
	 * The chooser: each archive, where its content comes from, and Customise.
	 *
	 * @return void
	 */
	public function render_chooser(): void {
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Customise an archive', 'matter' ); ?></h1>
			<p><?php esc_html_e( 'Choose an archive to add your own sections above and below its list. The list itself stays as the theme sets it.', 'matter' ); ?></p>

			<table class="widefat striped" style="max-width: 60rem;">
				<thead>
					<tr>
						<th scope="col"><?php esc_html_e( 'Archive', 'matter' ); ?></th>
						<th scope="col"><?php esc_html_e( 'Currently', 'matter' ); ?></th>
						<th scope="col"><span class="screen-reader-text"><?php esc_html_e( 'Actions', 'matter' ); ?></span></th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( self::top_level_targets() as $target ) : ?>
						<tr>
							<td>
								<strong><?php echo esc_html( $target->label() ); ?></strong><br>
								<span class="description"><?php echo esc_html( $target->description() ); ?></span>
							</td>
							<td><?php echo wp_kses_post( $this->status( $target ) ); ?></td>
							<td style="text-align: end; white-space: nowrap;">
								<?php if ( $target->url() ) : ?>
									<a href="<?php echo esc_url( (string) $target->url() ); ?>" style="margin-inline-end: 0.5em;"><?php esc_html_e( 'View', 'matter' ); ?></a>
								<?php endif; ?>
								<?php echo wp_kses_post( $this->actions( $target, __( 'Customise', 'matter' ) ) ); ?>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>

			<h2><?php esc_html_e( 'A single category or tag', 'matter' ); ?></h2>
			<p>
				<?php esc_html_e( 'Edit the category or tag and choose Customise under Archive, or view it on the site and choose Customise archive in the toolbar.', 'matter' ); ?>
			</p>
			<p>
				<a href="<?php echo esc_url( admin_url( 'post-new.php?post_type=' . Archives::POST_TYPE . '&blank=1' ) ); ?>"><?php esc_html_e( 'Or start from a blank page and choose where it shows', 'matter' ); ?></a>
			</p>
		</div>
		<?php
	}

	/**
	 * Help tab on the list and chooser: which content shows, and scheduling.
	 *
	 * @param \WP_Screen $screen Screen.
	 * @return void
	 */
	public function help( \WP_Screen $screen ): void {
		if ( 'edit-' . Archives::POST_TYPE !== $screen->id && 'admin_page_' . self::CHOOSER !== $screen->id ) {
			return;
		}

		$screen->add_help_tab(
			[
				'id'      => 'matter-archive-overview',
				'title'   => __( 'Overview', 'matter' ),
				'content' => '<p>' . esc_html__( 'Archives list things: the shop, the blog, categories and tags, search results, and the page shown when a page can’t be found. The theme controls each list; here you add sections above and below it.', 'matter' ) . '</p>'
					. '<p>' . esc_html__( 'Start from the toolbar while viewing one (Customise archive), from a category’s edit screen, or with Customise an archive here.', 'matter' ) . '</p>',
			]
		);

		$screen->add_help_tab(
			[
				'id'      => 'matter-archive-which',
				'title'   => __( 'Which content shows', 'matter' ),
				'content' => '<p>' . esc_html__( 'A category shows its own archive if it has one. If not, it uses its parent category’s, then the one for all its categories, then the shop’s or blog’s, then the theme’s default.', 'matter' ) . '</p>'
					. '<p>' . esc_html__( 'The Shows on column says which page each one is for.', 'matter' ) . '</p>',
			]
		);

		$screen->add_help_tab(
			[
				'id'      => 'matter-archive-schedule',
				'title'   => __( 'Scheduling', 'matter' ),
				'content' => '<p>' . esc_html__( 'Only published archives show, and the newest wins. To prepare a seasonal version, choose New version under one in the list, edit it, and schedule it. It replaces the current one on its date; unpublish it to bring the old one back.', 'matter' ) . '</p>',
			]
		);
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
