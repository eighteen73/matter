<?php
/**
 * Menu types.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Navigation;

defined( 'ABSPATH' ) || exit;

/**
 * How a menu presents its submenus.
 */
enum MenuType: string {

	/**
	 * Submenus open as positioned dropdowns/flyouts (typically desktop).
	 */
	case Dropdown = 'dropdown';

	/**
	 * Submenus expand inline beneath their parent.
	 */
	case Accordion = 'accordion';

	/**
	 * Submenus slide over the menu as full panels with a back button (typically mobile).
	 */
	case DrillDown = 'drill-down';
}
