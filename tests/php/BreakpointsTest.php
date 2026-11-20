<?php
/**
 * Breakpoints: responsive value maps become media query ranges.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Breakpoints;

/**
 * Breakpoints.
 */
class BreakpointsTest extends TestCase {

	/**
	 * Use known breakpoints, whatever the config.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		add_filter(
			'matter_breakpoints',
			fn() => [
				'lg' => '1024px',
				'md' => '768px',
			]
		);
	}

	/**
	 * Breakpoints are sorted smallest first.
	 *
	 * @return void
	 */
	public function test_all_sorted(): void {
		$this->assertSame( [ 'md', 'lg' ], array_keys( Breakpoints::all() ) );
	}

	/**
	 * A single value has no query.
	 *
	 * @return void
	 */
	public function test_single_value(): void {
		$this->assertSame(
			[
				[
					'value' => 'dropdown',
					'query' => '',
					'from'  => null,
				],
			],
			Breakpoints::ranges( 'dropdown' )
		);
	}

	/**
	 * A mobile-first map becomes consecutive ranges; unknown breakpoints are ignored.
	 *
	 * @return void
	 */
	public function test_map_to_ranges(): void {
		$ranges = Breakpoints::ranges(
			[
				'drill-down',
				'lg'      => 'dropdown',
				'md'      => 'accordion',
				'unknown' => 'nope',
			]
		);

		$this->assertSame(
			[
				[ 'drill-down', '(width < 768px)' ],
				[ 'accordion', '(width >= 768px) and (width < 1024px)' ],
				[ 'dropdown', '(width >= 1024px)' ],
			],
			array_map( fn( $range ) => [ $range['value'], $range['query'] ], $ranges )
		);
	}

	/**
	 * A map with no base entry starts at its first entry's value, so the
	 * screens below its first breakpoint have one.
	 *
	 * @return void
	 */
	public function test_a_map_without_a_base_entry_covers_small_screens(): void {
		$summary = fn( array $map ) => array_map( fn( $range ) => [ $range['value'], $range['query'] ], Breakpoints::ranges( $map ) );

		$this->assertSame( [ [ 'dropdown', '' ] ], $summary( [ 'lg' => 'dropdown' ] ) );
		$this->assertSame(
			[
				[ 'accordion', '(width < 1024px)' ],
				[ 'dropdown', '(width >= 1024px)' ],
			],
			$summary(
				[
					'md' => 'accordion',
					'lg' => 'dropdown',
				]
			)
		);
		$this->assertSame( [], Breakpoints::ranges( [ 'nope' => 'dropdown' ] ) );
	}

	/**
	 * Widths in px, em and rem keep their unit and are ordered by their size in
	 * px; others are refused with a notice, and left out.
	 *
	 * @return void
	 */
	public function test_units_are_normalised_and_others_refused(): void {
		remove_all_filters( 'matter_breakpoints' );
		add_filter(
			'matter_breakpoints',
			fn() => [
				'lg'    => '64em',
				'md'    => 768,
				'xl'    => '90rem',
				'sm'    => '500px',
				'wide'  => '80%',
				'vw'    => '50vw',
				'empty' => '',
			]
		);

		$this->setExpectedIncorrectUsage( 'matter_breakpoints' );

		$this->assertSame(
			[
				'sm' => '500px',
				'md' => '768px',
				'lg' => '64em',
				'xl' => '90rem',
			],
			Breakpoints::all()
		);
		$this->assertSame( '(width >= 768px) and (width < 64em)', Breakpoints::range( 'md', 'lg' ) );
	}

	/**
	 * A map in em makes media queries in em, so a breakpoint follows the
	 * visitor's text size.
	 *
	 * @return void
	 */
	public function test_em_breakpoints_make_em_queries(): void {
		remove_all_filters( 'matter_breakpoints' );
		add_filter(
			'matter_breakpoints',
			fn() => [
				'md' => '48em',
				'lg' => '64em',
			]
		);

		$this->assertSame( '(width >= 48em) and (width < 64em)', Breakpoints::range( 'md', 'lg' ) );
		$this->assertSame( '(width < 48em)', Breakpoints::ranges( [ 'base', 'md' => 'x' ] )[0]['query'] );
		$this->assertSame( '(width >= 64em)', Breakpoints::ranges( [ 'md' => 'a', 'lg' => 'b' ] )[1]['query'] ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
	}

	/**
	 * A zero base width is allowed (a theme's `xs => 0`), without a notice;
	 * equal widths keep the order given, however the map is ordered.
	 *
	 * @return void
	 */
	public function test_zero_is_a_width_and_ties_and_unordered_maps_are_stable(): void {
		remove_all_filters( 'matter_breakpoints' );
		add_filter(
			'matter_breakpoints',
			fn() => [
				'xl'   => '1280px',
				'xs'   => '0',
				'lg'   => '80em',
				'zero' => '0px',
				'md'   => '768px',
				'tie'  => '1280px',
			]
		);

		$this->assertSame(
			[ 'xs', 'zero', 'md', 'xl', 'lg', 'tie' ],
			array_keys( Breakpoints::all() )
		);
		$this->assertSame( '0px', Breakpoints::get( 'xs' ) );
		$this->assertSame( '(width >= 0px) and (width < 768px)', Breakpoints::range( 'xs', 'md' ) );
	}
}
