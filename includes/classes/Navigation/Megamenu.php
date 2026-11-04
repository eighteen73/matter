<?php
/**
 * Megamenus for classic menus.
 *
 * A top-level menu item can be flagged as a megamenu in Appearance > Menus.
 * Its submenu then renders as columns: second-level items are column headings
 * and third-level items their links. An optional developer-built panel can be
 * appended from the theme's `template-parts/megamenu/*.php` files (discovered
 * from their `Title:` file header), so extra content stays version controlled.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Navigation;

use Eighteen73\Matter\Singleton;
use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Megamenus for classic menus.
 */
class Megamenu {

	use Singleton;

	/**
	 * Menu item meta keys.
	 */
	public const META_ENABLED = '_matter_megamenu';
	public const META_WIDTH   = '_matter_megamenu_width';
	public const META_PANEL   = '_matter_megamenu_panel';

	/**
	 * Allowed widths.
	 */
	public const WIDTHS = [ 'content', 'wide', 'full' ];

	/**
	 * Theme directory holding panel template parts.
	 */
	public const PANEL_DIRECTORY = 'template-parts/megamenu';

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'wp_nav_menu_item_custom_fields', [ $this, 'render_fields' ], 10, 2 );
		add_action( 'wp_update_nav_menu_item', [ $this, 'save_fields' ], 10, 2 );
	}

	/**
	 * Whether a menu item is flagged as a megamenu.
	 *
	 * @param WP_Post $item Menu item.
	 * @return bool
	 */
	public static function is_megamenu( WP_Post $item ): bool {
		return (bool) get_post_meta( $item->ID, self::META_ENABLED, true );
	}

	/**
	 * Megamenu width: content, wide or full.
	 *
	 * @param WP_Post $item Menu item.
	 * @return string
	 */
	public static function get_width( WP_Post $item ): string {
		$width = (string) get_post_meta( $item->ID, self::META_WIDTH, true );

		return in_array( $width, self::WIDTHS, true ) ? $width : 'wide';
	}

	/**
	 * Panels available in the theme, keyed by slug.
	 *
	 * @return array<string, string> Slug => title.
	 */
	public static function get_panels(): array {
		$panels    = [];
		$directory = get_theme_file_path( self::PANEL_DIRECTORY );

		foreach ( glob( trailingslashit( $directory ) . '*.php' ) ?: [] as $file ) {
			$slug            = basename( $file, '.php' );
			$headers         = get_file_data( $file, [ 'title' => 'Title' ] );
			$panels[ $slug ] = '' !== $headers['title'] ? $headers['title'] : $slug;
		}

		/**
		 * Filters the megamenu panels that can be attached to menu items.
		 *
		 * @param array<string, string> $panels Slug => title.
		 */
		return (array) apply_filters( 'matter_megamenu_panels', $panels );
	}

	/**
	 * Render the panel attached to a megamenu item, if any.
	 *
	 * @param WP_Post $item Menu item.
	 * @return string
	 */
	public static function render_panel( WP_Post $item ): string {
		$slug = (string) get_post_meta( $item->ID, self::META_PANEL, true );

		if ( '' === $slug || ! array_key_exists( $slug, self::get_panels() ) ) {
			return '';
		}

		ob_start();
		get_template_part( self::PANEL_DIRECTORY . '/' . $slug, null, [ 'item' => $item ] );
		$panel = trim( (string) ob_get_clean() );

		return '' !== $panel ? '<div class="matter-menu__panel">' . $panel . '</div>' : '';
	}

	/**
	 * Megamenu fields on each menu item in Appearance > Menus.
	 *
	 * Fields only take effect on top-level items.
	 *
	 * @param int     $item_id Menu item ID.
	 * @param WP_Post $item    Menu item.
	 * @return void
	 */
	public function render_fields( $item_id, $item ): void {
		$enabled = self::is_megamenu( $item );
		$width   = self::get_width( $item );
		$panel   = (string) get_post_meta( $item_id, self::META_PANEL, true );
		$panels  = self::get_panels();
		$name    = 'matter-megamenu[' . (int) $item_id . ']';
		?>
		<fieldset class="field-matter-megamenu description-wide" style="margin-block: 8px;">
			<legend class="screen-reader-text"><?php esc_html_e( 'Megamenu', 'matter' ); ?></legend>
			<label>
				<input type="checkbox" name="<?php echo esc_attr( $name ); ?>[enabled]" value="1" <?php checked( $enabled ); ?> />
				<?php esc_html_e( 'Display submenu as a megamenu (top-level items only)', 'matter' ); ?>
			</label>
			<p class="description">
				<label>
					<?php esc_html_e( 'Megamenu width', 'matter' ); ?><br />
					<select name="<?php echo esc_attr( $name ); ?>[width]" class="widefat">
						<option value="content" <?php selected( $width, 'content' ); ?>><?php esc_html_e( 'Content', 'matter' ); ?></option>
						<option value="wide" <?php selected( $width, 'wide' ); ?>><?php esc_html_e( 'Wide', 'matter' ); ?></option>
						<option value="full" <?php selected( $width, 'full' ); ?>><?php esc_html_e( 'Full width', 'matter' ); ?></option>
					</select>
				</label>
			</p>
			<?php if ( $panels ) : ?>
				<p class="description">
					<label>
						<?php esc_html_e( 'Megamenu panel', 'matter' ); ?><br />
						<select name="<?php echo esc_attr( $name ); ?>[panel]" class="widefat">
							<option value=""><?php esc_html_e( 'None', 'matter' ); ?></option>
							<?php foreach ( $panels as $slug => $title ) : ?>
								<option value="<?php echo esc_attr( $slug ); ?>" <?php selected( $panel, $slug ); ?>><?php echo esc_html( $title ); ?></option>
							<?php endforeach; ?>
						</select>
					</label>
				</p>
			<?php endif; ?>
		</fieldset>
		<?php
	}

	/**
	 * Save megamenu fields.
	 *
	 * Core verifies the `update-nav_menu` nonce before saving menu items; this
	 * re-checks it rather than trusting the request.
	 *
	 * @param int $menu_id         Menu ID.
	 * @param int $menu_item_db_id Menu item ID.
	 * @return void
	 */
	public function save_fields( $menu_id, $menu_item_db_id ): void {
		$nonce = isset( $_POST['update-nav-menu-nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['update-nav-menu-nonce'] ) ) : '';

		if ( ! wp_verify_nonce( $nonce, 'update-nav_menu' ) || ! current_user_can( 'edit_theme_options' ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Sanitised per field below.
		$fields = isset( $_POST['matter-megamenu'][ $menu_item_db_id ] ) ? (array) wp_unslash( $_POST['matter-megamenu'][ $menu_item_db_id ] ) : [];
		$width  = sanitize_key( $fields['width'] ?? '' );
		$panel  = sanitize_file_name( $fields['panel'] ?? '' );

		if ( empty( $fields['enabled'] ) ) {
			delete_post_meta( $menu_item_db_id, self::META_ENABLED );
		} else {
			update_post_meta( $menu_item_db_id, self::META_ENABLED, 1 );
		}

		if ( in_array( $width, self::WIDTHS, true ) ) {
			update_post_meta( $menu_item_db_id, self::META_WIDTH, $width );
		}

		if ( '' !== $panel && array_key_exists( $panel, self::get_panels() ) ) {
			update_post_meta( $menu_item_db_id, self::META_PANEL, $panel );
		} else {
			delete_post_meta( $menu_item_db_id, self::META_PANEL );
		}
	}
}
