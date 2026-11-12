<?php
/**
 * Public template functions.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

use Eighteen73\Matter\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * The prefixes of the theme's pattern slugs and icon names, most specific
 * first: by default the active theme's folder, then its parent's. A theme
 * names its own with the `matter_theme_namespace` filter, so a renamed
 * folder or a child theme keeps working:
 *
 *     add_filter( 'matter_theme_namespace', fn() => 'pulsar' );
 *
 * @return string[]
 */
function theme_namespaces(): array {
	/**
	 * Filters the theme's namespace: the prefix of its pattern slugs (e.g.
	 * `pulsar/loop-item`) and its icon collection. A string, or a list most
	 * specific first.
	 *
	 * @param string[] $namespaces Default: the theme's folder, then its parent's.
	 */
	$namespaces = apply_filters( 'matter_theme_namespace', array_values( array_unique( [ get_stylesheet(), get_template() ] ) ) );

	return array_values( array_unique( array_filter( array_map( 'sanitize_key', (array) $namespaces ) ) ) );
}

/**
 * Get a site setting by `section.field` path.
 *
 * @param string $path          Dot path, e.g. `contact.phone`.
 * @param mixed  $default_value Returned when the setting is unknown or empty.
 * @return mixed
 */
function setting( string $path, mixed $default_value = null ): mixed {
	return Settings::instance()->get( $path, $default_value );
}

/**
 * Render a menu from Appearance > Menus.
 *
 * @see Navigation\Menu::render() for arguments.
 *
 * @param array $args Menu arguments.
 * @return string
 */
function get_menu( array $args = [] ): string {
	return Navigation\Menu::render( $args );
}

/**
 * Output a menu from Appearance > Menus.
 *
 * @see Navigation\Menu::render() for arguments.
 *
 * @param array $args Menu arguments.
 * @return void
 */
function menu( array $args = [] ): void {
	echo get_menu( $args ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by the renderer.
}

/**
 * Render a responsive panel (off-canvas below a breakpoint, inline above).
 *
 * @see Overlays\Panel::render() for arguments.
 *
 * @param string          $id      Panel ID.
 * @param callable|string $content Content, or a callback that echoes/returns it.
 * @param array           $args    Panel arguments.
 * @return string
 */
function get_panel( string $id, callable|string $content, array $args = [] ): string {
	return Overlays\Panel::render( $id, $content, $args );
}

/**
 * Output a responsive panel.
 *
 * @see Overlays\Panel::render() for arguments.
 *
 * @param string          $id      Panel ID.
 * @param callable|string $content Content, or a callback that echoes/returns it.
 * @param array           $args    Panel arguments.
 * @return void
 */
function panel( string $id, callable|string $content, array $args = [] ): void {
	echo get_panel( $id, $content, $args ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by the renderer.
}

/**
 * Render a button that toggles a panel.
 *
 * @see Overlays\Trigger::button() for arguments.
 *
 * @param string $id   Panel ID.
 * @param array  $args Button arguments.
 * @return string
 */
function get_panel_toggle( string $id, array $args = [] ): string {
	return Overlays\Trigger::button( $id, $args );
}

/**
 * Output a button that toggles a panel.
 *
 * @see Overlays\Trigger::button() for arguments.
 *
 * @param string $id   Panel ID.
 * @param array  $args Button arguments.
 * @return void
 */
function panel_toggle( string $id, array $args = [] ): void {
	echo get_panel_toggle( $id, $args ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by the renderer.
}

/**
 * Split a section's rendered content into its named slots.
 *
 * Use in a section's render.php:
 *
 *     $slots = Eighteen73\Matter\slots( $content, $block );
 *     echo $slots['content'];
 *
 * @param string         $content Section inner content (render.php's $content).
 * @param \WP_Block|null $block   Section block, so every declared slot is present (as '').
 * @return array<string, string> Slot name => HTML.
 */
function slots( string $content, ?\WP_Block $block = null ): array {
	if ( ! $block ) {
		return Sections\Sections::slots( $content );
	}

	return Sections\Sections::slots(
		$content,
		Sections\Sections::get_slot_names( $block->block_type ),
		Sections\Sections::get_slot_aliases( $block->block_type )
	);
}
