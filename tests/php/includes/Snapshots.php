<?php
/**
 * Snapshot assertions for markup in the theme contract.
 *
 * A snapshot is written the first time a test runs, and compared after that.
 * A failing snapshot means a contract change: if it's intended, update it
 * with `UPDATE_SNAPSHOTS=1 npm run test:php` and add a changelog line.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

/**
 * Snapshot assertions.
 */
trait Snapshots {

	/**
	 * Assert markup matches its stored snapshot.
	 *
	 * @param string $name   Snapshot name (file name without extension).
	 * @param string $actual Markup.
	 * @return void
	 */
	protected function assertMatchesSnapshot( string $name, string $actual ): void {
		$file   = __DIR__ . '/../__snapshots__/' . $name . '.html';
		$actual = self::normalise( $actual );

		if ( getenv( 'UPDATE_SNAPSHOTS' ) || ! file_exists( $file ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- Test fixture.
			file_put_contents( $file, $actual );
			$this->addToAssertionCount( 1 );
			return;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Test fixture.
		$this->assertSame( file_get_contents( $file ), $actual, "Markup in the theme contract changed ({$name}). If intended, update the snapshot and the changelog." );
	}

	/**
	 * One tag per line, and request-specific values replaced, so snapshots
	 * diff readably and don't depend on test order.
	 *
	 * @param string $html Markup.
	 * @return string
	 */
	private static function normalise( string $html ): string {
		// Generated IDs (wp_unique_id) depend on how many ran before.
		$html = preg_replace( '/\b((?:accordion|tabs|modal|drawer|collapsible|matter-gallery-caption)-)\d+\b/', '$1N', $html );
		$html = preg_replace( '/\s+/', ' ', (string) $html );
		$html = preg_replace( '/>\s*</', ">\n<", (string) $html );

		return trim( (string) $html ) . "\n";
	}
}
