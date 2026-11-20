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
	 * Whether snapshots are being rewritten: only when UPDATE_SNAPSHOTS is
	 * exactly `1`, so `0`, `false` or an empty value can't rewrite them.
	 *
	 * @return bool
	 */
	protected static function updating_snapshots(): bool {
		return '1' === getenv( 'UPDATE_SNAPSHOTS' );
	}

	/**
	 * Assert markup matches its stored snapshot.
	 *
	 * @param string $name   Snapshot name (file name without extension).
	 * @param string $actual Markup, or CSS when `$type` is `css`.
	 * @param string $type   `html` or `css`: the file's extension, and how it is laid out.
	 * @return void
	 */
	protected function assertMatchesSnapshot( string $name, string $actual, string $type = 'html' ): void {
		$file   = dirname( __DIR__ ) . '/__snapshots__/' . $name . '.' . $type;
		$actual = 'css' === $type ? self::normalise_css( $actual ) : self::normalise( $actual );

		// A missing snapshot fails: written only when asked
		// (`npm run test:php:update`), so a lost one can't hide a change.
		if ( ! self::updating_snapshots() && ! file_exists( $file ) ) {
			$this->fail( "No snapshot of the theme contract's {$name} markup. Write it with `npm run test:php:update`." );
		}

		if ( self::updating_snapshots() ) {
			wp_mkdir_p( dirname( $file ) );
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
		// Post and menu item IDs depend on what the database held before.
		$html = preg_replace( '/\b(post|menu-item|matter-menu-[a-z0-9-]*?-item)-\d+\b/', '$1-N', (string) $html );
		$html = preg_replace( '/\s+/', ' ', (string) $html );
		$html = preg_replace( '/>\s*</', ">\n<", (string) $html );

		return trim( (string) $html ) . "\n";
	}

	/**
	 * One rule per line, and the site's address replaced.
	 *
	 * @param string $css Stylesheet.
	 * @return string
	 */
	private static function normalise_css( string $css ): string {
		$css = str_replace( [ MATTER_URL, home_url() ], [ '{matter-url}', '{home-url}' ], $css );
		$css = preg_replace( '/\s+/', ' ', $css );
		$css = preg_replace( '/([{;}])(?![^()]*\))\s*/', "$1\n", (string) $css );

		return trim( (string) $css ) . "\n";
	}
}
