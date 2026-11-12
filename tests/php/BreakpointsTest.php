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
}
