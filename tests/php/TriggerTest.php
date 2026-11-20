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
	 * A toggle before its panel (the usual order) and one after it both
	 * control that panel.
	 *
	 * @return void
	 */
	public function test_toggles_find_their_panel(): void {
		$before = Trigger::button( 'site-nav' );

		Panel::render( 'site-nav', 'x' );

		$this->assertSame( 'site-nav', self::controls( $before ) );

		\Eighteen73\Matter\Ids::reset();

		Panel::render( 'site-nav', 'x' );

		$this->assertSame( 'site-nav', self::controls( Trigger::button( 'site-nav' ) ) );
	}

	/**
	 * A panel rendered twice (a template part used twice) is renamed the
	 * second time, and each toggle goes with its own panel, whether the
	 * toggles come before their panels or after them.
	 *
	 * @return void
	 */
	public function test_a_panel_used_twice_has_a_toggle_each(): void {
		$first = Trigger::button( 'site-nav' );
		Panel::render( 'site-nav', 'one' );
		$second = Trigger::button( 'site-nav' );
		Panel::render( 'site-nav', 'two' );

		$this->assertSame( 'site-nav', self::controls( $first ) );
		$this->assertSame( 'site-nav-2', self::controls( $second ) );

		// Toggles that come after their panels.
		\Eighteen73\Matter\Ids::reset();

		Panel::render( 'menu', 'one' );
		$one = Trigger::button( 'menu' );
		Panel::render( 'menu', 'two' );
		$two = Trigger::button( 'menu' );

		$this->assertSame( 'menu', self::controls( $one ) );
		$this->assertSame( 'menu-2', self::controls( $two ) );
	}

	/**
	 * Toggles with no panel between them share the one panel.
	 *
	 * @return void
	 */
	public function test_toggles_in_a_row_share_a_panel(): void {
		$one = Trigger::button( 'site-nav' );
		$two = Trigger::button( 'site-nav' );

		Panel::render( 'site-nav', 'x' );

		$this->assertSame( 'site-nav', self::controls( $one ) );
		$this->assertSame( 'site-nav', self::controls( $two ) );
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

	/**
	 * Each page starts over: the toggles' memory doesn't carry into the next
	 * render once the ID registry has restarted.
	 *
	 * @return void
	 */
	public function test_a_new_page_forgets_the_last(): void {
		Panel::render( 'site-nav', 'x' );
		Panel::render( 'site-nav', 'y' );

		$this->assertSame( 'site-nav-2', self::controls( Trigger::button( 'site-nav' ) ) );

		\Eighteen73\Matter\Ids::reset();

		$this->assertSame( 'site-nav', self::controls( Trigger::button( 'site-nav' ) ) );
	}
}
