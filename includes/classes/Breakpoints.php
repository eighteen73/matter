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
	 * Widths are given in px, em or rem (or a bare number, as px) and keep their
	 * unit, so a breakpoint in em or rem still follows the visitor's text size
	 * in the media queries built from it. They're ordered by their size in px
	 * (an em is 16px, as in a media query); equal widths keep the order given.
	 * Another unit is refused with a notice, and the breakpoint left out. So is
	 * a map that mixes px with em or rem (see warn_if_mixed()).
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
		$breakpoints = [];

		foreach ( (array) apply_filters( 'matter_breakpoints', $defaults ) as $name => $width ) {
			if ( null === $width || '' === $width ) {
				continue;
			}

			$normalised = self::normalise( $width );

			if ( null === $normalised ) {
				self::warn_once( (string) $name, $width );
				continue;
			}

			$breakpoints[ (string) $name ] = $normalised;
		}

		uasort( $breakpoints, fn( $a, $b ) => self::to_px( $a ) <=> self::to_px( $b ) );

		self::warn_if_mixed( $breakpoints );

		return $breakpoints;
	}

	/**
	 * A breakpoint width as a number and its unit (`64em`, `768px`).
	 *
	 * @param mixed $width Width: `1024px`, `64em`, `64rem`, `1024` (px) or `0`.
	 * @return string|null Null when it isn't one of those.
	 */
	private static function normalise( mixed $width ): ?string {
		if ( ! is_string( $width ) && ! is_int( $width ) && ! is_float( $width ) ) {
			return null;
		}

		if ( ! preg_match( '/^\s*(\d*\.?\d+)\s*(px|em|rem)?\s*$/i', (string) $width, $matches ) ) {
			return null;
		}

		return rtrim( rtrim( number_format( (float) $matches[1], 4, '.', '' ), '0' ), '.' ) . strtolower( $matches[2] ?? 'px' );
	}

	/**
	 * A normalised width in px, for ordering (an em or rem is 16px).
	 *
	 * @param string $width Width from normalise().
	 * @return float
	 */
	private static function to_px( string $width ): float {
		return (float) $width * ( str_ends_with( $width, 'em' ) ? 16 : 1 );
	}

	/**
	 * Say once that a map mixes px with em or rem.
	 *
	 * Ordering treats an em as 16px, but a media query's em follows the
	 * visitor's text size, so with another size the ranges of such a map
	 * overlap or leave gaps. A zero width is the same in every unit.
	 *
	 * @param array<string, string> $breakpoints Normalised name => width.
	 * @return void
	 */
	private static function warn_if_mixed( array $breakpoints ): void {
		static $warned = [];

		$units = [];

		foreach ( $breakpoints as $width ) {
			if ( 0.0 !== (float) $width ) {
				$units[ str_ends_with( $width, 'px' ) ? 'px' : 'em' ] = true;
			}
		}

		$key = wp_json_encode( $breakpoints );

		if ( count( $units ) < 2 || isset( $warned[ $key ] ) ) {
			return;
		}

		$warned[ $key ] = true;

		_doing_it_wrong(
			'matter_breakpoints',
			esc_html__( 'Mixing px with em or rem is not supported: with a text size other than 16px the ranges overlap or leave gaps. Use one unit for every breakpoint.', 'matter' ),
			'1.0.0'
		);
	}

	/**
	 * Say once that a breakpoint's width isn't usable.
	 *
	 * @param string $name  Breakpoint name.
	 * @param mixed  $width Its width.
	 * @return void
	 */
	private static function warn_once( string $name, mixed $width ): void {
		static $warned = [];

		$key = $name . '=' . wp_json_encode( $width );

		if ( isset( $warned[ $key ] ) ) {
			return;
		}

		$warned[ $key ] = true;

		_doing_it_wrong(
			'matter_breakpoints',
			esc_html(
				sprintf(
					/* translators: 1: breakpoint name, 2: its width. */
					__( 'The breakpoint “%1$s” (%2$s) is ignored: widths must be in px, em or rem, so they can be ordered.', 'matter' ),
					$name,
					is_scalar( $width ) ? (string) $width : gettype( $width )
				)
			),
			'1.0.0'
		);
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
	 * A map with no such entry starts at its first entry's value, so no screen
	 * below its first breakpoint is left without one (`[ 'lg' => 'dropdown' ]`
	 * is a dropdown at every width).
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

		// No base entry: the first one covers the smaller screens too.
		if ( $steps && ! isset( $steps[-1] ) ) {
			$steps = [ -1 => reset( $steps ) ] + array_slice( $steps, 1, null, true );
		}

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
