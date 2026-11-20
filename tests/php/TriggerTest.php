<?php
/**
 * Panel triggers: the buttons that open a panel.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Overlays\Panel;
use Eighteen73\Matter\Overlays\Trigger;

/**
 * Trigger.
 */
class TriggerTest extends TestCase {

	/**
	 * A known breakpoint.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		add_filter( 'matter_breakpoints', fn() => [ 'lg' => '1024px' ] );
	}

	/**
	 * The ID a toggle controls.
	 *
	 * @param string $html Toggle markup.
	 * @return string
	 */
	private static function controls( string $html ): string {
		preg_match( '/aria-controls="([^"]*)"/', $html, $match );

		return $match[1] ?? '';
	}

	/**
	 * The button's name, state and the panel it controls.
	 *
	 * @return void
	 */
	public function test_the_button(): void {
		$html = Trigger::button( 'site-nav', [ 'collapse_below' => 'lg' ] );

		$this->assertStringStartsWith( '<button type="button" class="matter-panel-toggle is-panel-lg has-hamburger has-hidden-label"', $html );
		$this->assertStringContainsString( 'aria-controls="site-nav" aria-expanded="false"', $html );
		$this->assertStringContainsString( 'data-wp-interactive="matter/panel"', $html );
		$this->assertStringContainsString( 'data-wp-on--click="actions.toggle"', $html );
		$this->assertStringContainsString( 'data-wp-bind--aria-expanded="state.isOpen"', $html );
		$this->assertStringContainsString( '<span class="matter-panel-toggle__label">Menu</span>', $html );
		$this->assertStringContainsString( '<span class="matter-panel-toggle__icon" aria-hidden="true">', $html );
		$this->assertSame( 1, substr_count( $html, '<button' ) );
	}

	/**
	 * Label, icon, classes and extra content are options; the label is
	 * escaped.
	 *
	 * @return void
	 */
	public function test_the_options(): void {
		$html = Trigger::button(
			'filters',
			[
				'label'      => 'Filters <b>',
				'show_label' => true,
				'hamburger'  => false,
				'class'      => 'is-small "x"',
				'content'    => '<span class="count">3</span>',
			]
		);

		$this->assertStringContainsString( 'Filters &lt;b&gt;', $html );
		$this->assertStringNotContainsString( 'has-hidden-label', $html );
		$this->assertStringNotContainsString( 'has-hamburger', $html );
		$this->assertStringNotContainsString( 'matter-panel-toggle__icon', $html );
		$this->assertStringContainsString( 'is-small &quot;x&quot;', $html );
		$this->assertStringContainsString( '<span class="count">3</span></button>', $html );
		$this->assertStringContainsString( 'is-panel-always', $html, 'no breakpoint: always off-canvas' );
	}

	/**
	 * The ID is made safe for an attribute and a class.
	 *
	 * @return void
	 */
	public function test_the_id_is_sanitised(): void {
		$html = Trigger::button( 'nav" onclick="x' );

		$this->assertSame( 'navonclickx', self::controls( $html ) );
		$this->assertStringNotContainsString( 'onclick', str_replace( 'navonclickx', '', $html ) );
	}

	/**
	 * A block renders its toggle without processing the directives (the
	 * outermost interactive block does), a template with them processed.
	 *
	 * @return void
	 */
	public function test_directives_are_processed_only_when_asked(): void {
		$template = Trigger::button( 'a' );
		$block    = Trigger::button( 'b', [ 'process' => false ] );

		$this->assertStringContainsString( 'data-wp-bind--aria-expanded="state.isOpen"', $template );
		$this->assertMatchesRegularExpression( '/aria-expanded="false"/', $template );
		$this->assertStringContainsString( 'data-wp-context=', $block );
		$this->assertStringContainsString( 'data-wp-on--click="actions.toggle"', $block );
		$this->assertSame( 1, preg_match( '/data-wp-interactive="matter\/panel" data-wp-context=/', $block ) );
	}

	/**
	 * The markup names the ID the panel was asked for, which is all the server
	 * knows: the panel script pairs the toggle with a panel of that name (or a
	 * numbered repeat of it) in the page. `aria-controls` starts as the same ID.
	 *
	 * @return void
	 */
	public function test_the_toggle_names_the_panel_it_was_asked_for(): void {
		$html = Trigger::button( 'site-nav' );

		$this->assertStringContainsString( 'data-matter-panel="site-nav"', $html );
		$this->assertStringContainsString( 'data-wp-init="callbacks.bindToggle"', $html );
		$this->assertSame( 'site-nav', self::controls( $html ) );
	}

	/**
	 * Toggles on either side of panels, and a panel rendered twice, all name
	 * the ID they were asked for: the order they render in decides nothing.
	 *
	 * @return void
	 */
	public function test_repeats_do_not_change_what_a_toggle_names(): void {
		$html  = Trigger::button( 'site-nav' );
		$html .= Panel::render( 'site-nav', 'one' );
		$html .= Trigger::button( 'site-nav' );
		$html .= Panel::render( 'site-nav', 'two' );
		$html .= Trigger::button( 'site-nav' );

		$this->assertSame( 3, substr_count( $html, 'data-matter-panel="site-nav"' ) );
		$this->assertSame( 3, substr_count( $html, 'aria-controls="site-nav"' ) );
		$this->assertStringContainsString( '<div id="site-nav-2" class="matter-panel', $html );
	}

	/**
	 * The ID is made safe in the attribute the script reads as well.
	 *
	 * @return void
	 */
	public function test_the_named_panel_is_sanitised(): void {
		$this->assertStringContainsString( 'data-matter-panel="navonclickx"', Trigger::button( 'nav" onclick="x' ) );
	}

	/**
	 * A toggle after its panel takes the panel's breakpoint when it isn't
	 * given one.
	 *
	 * @return void
	 */
	public function test_a_toggle_inherits_its_panels_breakpoint(): void {
		Panel::render( 'site-nav', 'x', [ 'collapse_below' => 'lg' ] );

		$this->assertStringContainsString( 'is-panel-lg', Trigger::button( 'site-nav' ) );
	}
}
