<?php
/**
 * Breakpoints.
 *
 * The theme owns breakpoints (filter `matter_breakpoints`); Matter falls back
 * to config/breakpoints.json. Responsive components (menus, panels) use these
 * to generate media queries at render time, because Matter's own stylesheets
 * can't know the theme's breakpoints when they're compiled.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

defined( 'ABSPATH' ) || exit;

/**
 * Breakpoints.
 */
class Breakpoints {

	/**
	 * Cached compiled stylesheet contents, keyed by path.
	 *
	 * @var array<string, string>
	 */
	private static array $stylesheets = [];

	/**
	 * Breakpoints as name => min-width (e.g. 'lg' => '1024px'), smallest first.
	 *
	 * @return array<string, string>
	 */
	public static function all(): array {
		$defaults = [];

		foreach ( Config::file( 'breakpoints' ) as $name => $breakpoint ) {
			$defaults[ $name ] = is_array( $breakpoint ) ? (string) ( $breakpoint['value'] ?? '' ) : (string) $breakpoint;
		}

		/**
		 * Filters the breakpoints used by responsive components.
		 *
		 * @param array<string, string> $breakpoints Name => min-width, e.g. [ 'lg' => '1024px' ].
		 */
		$breakpoints = (array) apply_filters( 'matter_breakpoints', $defaults );
		$breakpoints = array_filter( array_map( 'strval', $breakpoints ) );

		uasort( $breakpoints, fn( $a, $b ) => (float) $a <=> (float) $b );

		return $breakpoints;
	}

	/**
	 * Min-width of a named breakpoint.
	 *
	 * @param string $name Breakpoint name.
	 * @return string|null
	 */
	public static function get( string $name ): ?string {
		return self::all()[ $name ] ?? null;
	}

	/**
	 * Media query for a range between two named breakpoints.
	 *
	 * @param string|null $from Lower breakpoint (inclusive), or null for no lower bound.
	 * @param string|null $to   Upper breakpoint (exclusive), or null for no upper bound.
	 * @return string Media query without `@media`, or '' when unbounded.
	 */
	public static function range( ?string $from, ?string $to ): string {
		$conditions = [];

		if ( null !== $from && self::get( $from ) ) {
			$conditions[] = '(width >= ' . self::get( $from ) . ')';
		}

		if ( null !== $to && self::get( $to ) ) {
			$conditions[] = '(width < ' . self::get( $to ) . ')';
		}

		return implode( ' and ', $conditions );
	}

	/**
	 * Split a responsive value map into consecutive ranges.
	 *
	 * `[ 'drill-down', 'lg' => 'dropdown' ]` becomes
	 * `[ [ 'value' => 'drill-down', 'query' => '(width < 1024px)' ], [ 'value' => 'dropdown', 'query' => '(width >= 1024px)' ] ]`.
	 * Integer keys mean "from the smallest screen". Unknown breakpoints are ignored.
	 *
	 * @param string|array $value Single value or mobile-first breakpoint map.
	 * @return array<int, array{value: string, query: string, from: ?string}>
	 */
	public static function ranges( string|array $value ): array {
		if ( ! is_array( $value ) ) {
			return [
				[
					'value' => $value,
					'query' => '',
					'from'  => null,
				],
			];
		}

		$order = array_keys( self::all() );
		$steps = [];

		foreach ( $value as $breakpoint => $step_value ) {
			if ( is_int( $breakpoint ) ) {
				$steps[-1] = (string) $step_value;
			} elseif ( in_array( $breakpoint, $order, true ) ) {
				$steps[ array_search( $breakpoint, $order, true ) ] = (string) $step_value;
			}
		}

		ksort( $steps );

		$ranges  = [];
		$indexes = array_keys( $steps );

		foreach ( $indexes as $position => $index ) {
			$from     = $index >= 0 ? $order[ $index ] : null;
			$next     = $indexes[ $position + 1 ] ?? null;
			$to       = null !== $next ? $order[ $next ] : null;
			$ranges[] = [
				'value' => $steps[ $index ],
				'query' => self::range( $from, $to ),
				'from'  => $from,
			];
		}

		return $ranges;
	}

	/**
	 * Re-scope a compiled stylesheet to one component instance.
	 *
	 * Component stylesheets are authored against a placeholder class (e.g.
	 * `.is-type-dropdown`). This swaps it for an instance class and wraps the
	 * rules in a media query, so per-breakpoint behaviour needs no JavaScript.
	 *
	 * @param string $path        Absolute path to a compiled CSS file.
	 * @param string $placeholder Placeholder class without the dot.
	 * @param string $replacement Instance class without the dot.
	 * @param string $query       Media query ('' for none).
	 * @return string
	 */
	public static function scope_stylesheet( string $path, string $placeholder, string $replacement, string $query = '' ): string {
		if ( ! isset( self::$stylesheets[ $path ] ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local build file.
			$css = file_exists( $path ) ? (string) file_get_contents( $path ) : '';

			self::$stylesheets[ $path ] = self::absolutise_urls( $css, dirname( str_replace( MATTER_PATH, MATTER_URL, $path ) ) );
		}

		$css = preg_replace(
			'/\.' . preg_quote( $placeholder, '/' ) . '(?![\w-])/',
			'.' . $replacement,
			self::$stylesheets[ $path ]
		);

		// Drop the source map comment from compiled files.
		$css = trim( (string) preg_replace( '#/\*\#\s*sourceMappingURL=.*?\*/#', '', (string) $css ) );

		return '' !== $query && '' !== $css ? "@media {$query}{{$css}}" : $css;
	}

	/**
	 * Make relative `url()` references absolute so CSS can be printed inline.
	 *
	 * @param string $css      Stylesheet contents.
	 * @param string $base_url URL of the directory the stylesheet lives in.
	 * @return string
	 */
	private static function absolutise_urls( string $css, string $base_url ): string {
		return (string) preg_replace_callback(
			'/url\(\s*([\'"]?)(?!data:|https?:|\/|#)([^\'")]+)\1\s*\)/i',
			function ( array $matches ) use ( $base_url ): string {
				$segments = explode( '/', untrailingslashit( $base_url ) . '/' . $matches[2] );
				$resolved = [];

				foreach ( $segments as $segment ) {
					// Never climb above scheme://host.
					if ( '..' === $segment && count( $resolved ) > 3 ) {
						array_pop( $resolved );
					} elseif ( '.' !== $segment ) {
						$resolved[] = $segment;
					}
				}

				return 'url("' . implode( '/', $resolved ) . '")';
			},
			$css
		);
	}
}
