<?php
/**
 * Tabs helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Tabs.
 */
class Tabs {

	/**
	 * CSS for tabs shown as a dropdown: the button shows, and the tab list
	 * becomes a menu below it, open with `.is-menu-open`. Functional rules at
	 * one class (the scope is in :where()), then the default skin, all in
	 * :where(), for themes to restyle.
	 *
	 * Themes doing the switch in their own CSS (`dropdownBelow` false) can
	 * output this for their own scope, e.g. `.wp-block-matter-tabs.has-dropdown`
	 * and a media query.
	 *
	 * @param string $scope Tabs selector, e.g. `.wp-block-matter-tabs.has-dropdown-below-md`.
	 * @param string $media Media query conditions; empty for none.
	 * @return string CSS.
	 */
	public static function dropdown_css( string $scope, string $media = '' ): string {
		$css = strtr(
			// The block itself (two classes: it wins over `.is-vertical`'s grid).
			'{s}{display:block}'
			. ':where({s})>.wp-block-matter-tabs__nav{display:block;position:relative}'
			. ':where({nav})>.wp-block-matter-tabs__toggle{display:flex}'
			. ':where({nav})>.wp-block-matter-tabs__list{display:none;flex-direction:column;flex-wrap:nowrap;inset-block-start:100%;inset-inline:0;position:absolute;z-index:10}'
			. ':where({s}.is-menu-open>.wp-block-matter-tabs__nav)>.wp-block-matter-tabs__list{display:flex}'
			. ':where({nav}){margin-block-end:1.5em}'
			. ':where({list}){background:var(--scheme--background,Canvas);border:1px solid var(--scheme--border,color-mix(in srgb,currentcolor 20%,transparent));gap:0;margin:0;padding:0}'
			. ':where({list}>.wp-block-matter-tabs__tab){justify-content:flex-start;padding:0.75em 1em;width:100%}',
			[
				'{s}'    => $scope,
				'{nav}'  => $scope . '>.wp-block-matter-tabs__nav',
				'{list}' => $scope . '>.wp-block-matter-tabs__nav>.wp-block-matter-tabs__list',
			]
		);

		return '' === $media ? $css : sprintf( '@media %s{%s}', $media, $css );
	}
}
