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
