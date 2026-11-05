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
	 * becomes a menu below it, open with `.is-menu-open`. Functional rules,
	 * then defaults in :where() for themes to restyle.
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
			'{s}{display:block}'
			. '{nav}{display:block;position:relative}'
			. '{nav}>.wp-block-matter-tabs__toggle{display:flex}'
			. '{list}{display:none;flex-direction:column;flex-wrap:nowrap;inset-inline:0;position:absolute;top:100%;z-index:10}'
			. '{s}.is-menu-open{list}{display:flex}'
			. ':where({nav}){margin-block-end:1.5em}'
			. ':where({list}){background:var(--scheme--background,#fff);border:1px solid var(--scheme--border,rgb(0 0 0 / 15%));box-shadow:0 0.5em 1.5em rgb(0 0 0 / 10%);gap:0;margin:0;padding:0}'
			. ':where({list}>.wp-block-matter-tabs__tab){border:0;justify-content:flex-start;margin:0;padding:0.75em 1em;text-align:start;width:100%}'
			. ':where({list}>.wp-block-matter-tabs__tab[aria-selected="true"]){background:rgb(0 0 0 / 5%)}',
			[
				'{s}'    => $scope,
				'{nav}'  => $scope . '>.wp-block-matter-tabs__nav',
				'{list}' => $scope . '>.wp-block-matter-tabs__nav>.wp-block-matter-tabs__list',
			]
		);

		return '' === $media ? $css : sprintf( '@media %s{%s}', $media, $css );
	}
}
