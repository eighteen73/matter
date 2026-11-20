<?php
/**
 * Colour schemes: which classes and CSS a scheme gives a block.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Supports\Scheme;

/**
 * Colour schemes.
 */
class SchemeTest extends TestCase {

	/**
	 * A section with a scheme.
	 *
	 * @param string $attrs Attributes (JSON).
	 * @param string $inner Inner markup.
	 * @return string
	 */
	private function section( string $attrs, string $inner = '' ): string {
		return $this->render( "<!-- wp:matter-test/section {$attrs} --><!-- wp:matter/slot {\"name\":\"content\"} -->{$inner}<!-- /wp:matter/slot --><!-- /wp:matter-test/section -->" );
	}

	/**
	 * A scheme the theme defines gets its classes.
	 *
	 * @return void
	 */
	public function test_known_scheme(): void {
		$this->assertStringContainsString( 'has-scheme has-scheme-brand', $this->section( '{"scheme":"brand"}' ) );
	}

	/**
	 * A scheme that isn't defined (removed from theme.json) adds no class,
	 * so the block inherits its parent's.
	 *
	 * @return void
	 */
	public function test_unknown_scheme_renders_no_class(): void {
		$html = $this->section( '{"scheme":"gone"}' );

		$this->assertStringNotContainsString( 'has-scheme', $html );
		$this->assertStringNotContainsString( 'gone', $html );
	}

	/**
	 * A scheme on a section inside another's gets its own class only.
	 *
	 * @return void
	 */
	public function test_nested_schemes(): void {
		$inner = '<!-- wp:matter-test/section {"scheme":"default"} --><!-- wp:matter/slot {"name":"content"} --><!-- /wp:matter/slot --><!-- /wp:matter-test/section -->';
		$html  = $this->section( '{"scheme":"brand"}', $inner );

		$this->assertSame( 1, substr_count( $html, 'has-scheme-brand' ) );
		$this->assertSame( 1, substr_count( $html, 'has-scheme-default' ) );
		$this->assertLessThan( strpos( $html, 'has-scheme-default' ), strpos( $html, 'has-scheme-brand' ), 'the outer comes first' );
	}

	/**
	 * A scheme added by the `matter_schemes` filter works like a theme's: a
	 * class, and CSS with its own values (it has no theme.json variables).
	 *
	 * @return void
	 */
	public function test_filter_only_scheme(): void {
		add_filter(
			'matter_schemes',
			static function ( array $schemes ): array {
				$schemes['promo'] = [
					'label'      => 'Promotion',
					'background' => '#112233',
					'text'       => 'var:preset|color|base',
					'border'     => 'red; } body { display: none',
				];

				return $schemes;
			}
		);

		$this->assertStringContainsString( 'has-scheme has-scheme-promo', $this->section( '{"scheme":"promo"}' ) );

		$css = Scheme::instance()->get_css();

		$this->assertStringContainsString( '.has-scheme-promo{--scheme--background:#112233;--scheme--text:var(--wp--preset--color--base);', $css );
		$this->assertStringContainsString( '--scheme--border:red  body  display: none;', $css, 'nothing ends the declaration or the rule' );
		$this->assertStringNotContainsString( '--scheme--label', $css, 'the label is a name, not a colour' );
		$this->assertStringNotContainsString( '--wp--custom--scheme--promo', $css );

		// The theme's own schemes still read WordPress's variables.
		$this->assertStringContainsString( '.has-scheme-brand{--scheme--background:var(--wp--custom--scheme--brand--background);', $css );

		$this->assertSame( 'Promotion', Scheme::instance()->get_labels()['promo'] );
		$this->assertSame( 'Brand', Scheme::instance()->get_labels()['brand'] );

		$data = array_column( Scheme::instance()->get_editor_data(), null, 'slug' );

		$this->assertArrayNotHasKey( 'label', $data['promo']['tokens'] );
	}

	/**
	 * A filter can supply every scheme; the default is the first (or `default`).
	 *
	 * @return void
	 */
	public function test_filter_can_supply_every_scheme(): void {
		add_filter( 'matter_schemes', static fn() => [ 'only' => [ 'text' => '#000' ] ] );

		$this->assertSame( [ 'only' ], array_keys( Scheme::instance()->get_schemes() ) );
		$this->assertSame( 'only', Scheme::instance()->get_default() );
		$this->assertStringContainsString( ':root{--scheme--text:#000;}', Scheme::instance()->get_css() );
	}

	/**
	 * A filter that changes a theme scheme's value is honoured; one that
	 * leaves it alone keeps reading the variable.
	 *
	 * @return void
	 */
	public function test_changed_theme_value_is_written_out(): void {
		add_filter(
			'matter_schemes',
			static function ( array $schemes ): array {
				$schemes['brand']['text'] = '#abcdef';

				return $schemes;
			}
		);

		$css = Scheme::instance()->get_css();

		$this->assertStringContainsString( '--scheme--text:#abcdef;', $css );
		$this->assertStringContainsString( '--scheme--background:var(--wp--custom--scheme--brand--background);', $css );
	}

	/**
	 * A value that could comment out, fetch, or swallow what follows is
	 * dropped; ordinary colours are kept.
	 *
	 * @return void
	 */
	public function test_literal_values(): void {
		$literal = new \ReflectionMethod( Scheme::class, 'literal' );

		foreach ( [ '/\\*', 'url(x)', 'URL( "x" )', 'image-set(a 1x)', '"', "'", 'var(--x', 'red)', 'red</style>', '@import x', 'a */ b', 'red; } * { display: none' ] as $bad ) {
			$result = $literal->invoke( null, $bad );

			$this->assertNotSame( 1, preg_match( '/url\s*\(|\/\*|\*\/|[@"\'<>]/i', $result ), "{$bad} gives {$result}" );
		}

		foreach ( [ '/\\*', 'url(x)', '"', 'var(--x', 'red</style>', 'red)' ] as $dropped ) {
			$this->assertSame( '', $literal->invoke( null, $dropped ), $dropped );
		}

		foreach (
			[
				'#112233'                                     => '#112233',
				'rgb(0 0 0 / 50%)'                            => 'rgb(0 0 0 / 50%)',
				'oklch(0.7 0.1 200)'                          => 'oklch(0.7 0.1 200)',
				'color-mix(in oklch, var(--a) 50%, white)'    => 'color-mix(in oklch, var(--a) 50%, white)',
				'var:preset|color|base'                       => 'var(--wp--preset--color--base)',
			] as $value => $expected
		) {
			$this->assertSame( $expected, $literal->invoke( null, $value ), $value );
		}
	}
}
