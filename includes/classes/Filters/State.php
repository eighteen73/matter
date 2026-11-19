<?php
/**
 * The `matter/filters` store's derived state on the server: the same getters
 * as src/filters/view.js, so the server renders what the store would.
 *
 * Contexts: a filter's element has `listing` (the listing's key) and
 * `filter` (its ID); an option adds `value`; an active filter's chip is
 * `chip` (`filter`, `value`, `label`). The listing's state is
 * `listings[key]`: `baseUrl`, `filters` (each one's `kind`, `params`,
 * `operator`, `values`, `min`, `max`, `labels`, `counts`), and once its query
 * has run `total`, `resultsText` and `showText`.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

defined( 'ABSPATH' ) || exit;

/**
 * Server-side derived state.
 */
final class State {

	/**
	 * The derived state, as closures.
	 *
	 * @return array<string, \Closure>
	 */
	public static function derived(): array {
		return [
			// No JavaScript yet: the filter form's Apply button shows.
			'isInteractive' => fn() => false,
			// An option is chosen; "Any" (`''`) when none is.
			'isChecked'     => function () {
				$context = wp_interactivity_get_context();
				$filter  = self::filter( $context );
				$value   = (string) ( $context['value'] ?? '' );

				return '' === $value ? empty( $filter['values'] ) : in_array( $value, (array) ( $filter['values'] ?? [] ), true );
			},
			'count'         => function () {
				$context = wp_interactivity_get_context();
				$counts  = (array) ( self::filter( $context )['counts'] ?? [] );

				return (int) ( $counts[ (string) ( $context['value'] ?? '' ) ] ?? 0 );
			},
			// An option with no results is hidden, unless it's chosen.
			'isHidden'      => function () {
				$context = wp_interactivity_get_context();
				$filter  = self::filter( $context );
				$value   = (string) ( $context['value'] ?? '' );
				$counts  = (array) ( $filter['counts'] ?? [] );

				return '' !== $value && ! in_array( $value, (array) ( $filter['values'] ?? [] ), true ) && 0 === (int) ( $counts[ $value ] ?? 0 );
			},
			'activeCount'   => fn() => self::active_count( self::listing( wp_interactivity_get_context() ) ),
			'hasActive'     => fn() => self::active_count( self::listing( wp_interactivity_get_context() ) ) > 0,
			'chips'         => fn() => self::chips( self::listing( wp_interactivity_get_context() ) ),
			'resultsText'   => fn() => (string) ( self::listing( wp_interactivity_get_context() )['resultsText'] ?? '' ),
			'showText'      => fn() => (string) ( self::listing( wp_interactivity_get_context() )['showText'] ?? '' ),
			// A choice's "Show more" is collapsed until clicked.
			'isCollapsed'   => function () {
				$context = wp_interactivity_get_context();

				return empty( $context['expanded'] ) && ! empty( $context['more'] );
			},
		];
	}

	/**
	 * A listing's state, from a context's `listing`.
	 *
	 * @param array $context Context.
	 * @return array
	 */
	private static function listing( array $context ): array {
		$state = wp_interactivity_state( Filters::STORE );

		return (array) ( $state['listings'][ (string) ( $context['listing'] ?? '' ) ] ?? [] );
	}

	/**
	 * A filter's state, from a context's `listing` and `filter`.
	 *
	 * @param array $context Context.
	 * @return array
	 */
	private static function filter( array $context ): array {
		return (array) ( self::listing( $context )['filters'][ (string) ( $context['filter'] ?? '' ) ] ?? [] );
	}

	/**
	 * How many filters are applied: each chosen option, and each range set.
	 *
	 * @param array $listing Listing state.
	 * @return int
	 */
	public static function active_count( array $listing ): int {
		return count( self::chips( $listing ) );
	}

	/**
	 * The listing's active filters, as chips: each `key`, `filter`, `value`,
	 * `label` and `removeText` (its remove button's name).
	 *
	 * @param array $listing Listing state.
	 * @return array<int, array{key: string, filter: string, value: string, label: string, removeText: string}>
	 */
	public static function chips( array $listing ): array {
		$chips = [];

		foreach ( (array) ( $listing['filters'] ?? [] ) as $id => $filter ) {
			$labels = (array) ( $filter['labels'] ?? [] );

			if ( 'range' === ( $filter['kind'] ?? '' ) ) {
				if ( null !== ( $filter['min'] ?? null ) || null !== ( $filter['max'] ?? null ) ) {
					$chips[] = self::chip( (string) $id, 'range', (string) ( $labels['range'] ?? '' ) );
				}

				continue;
			}

			foreach ( (array) ( $filter['values'] ?? [] ) as $value ) {
				$chips[] = self::chip( (string) $id, (string) $value, (string) ( $labels[ $value ] ?? $value ) );
			}
		}

		return $chips;
	}

	/**
	 * A chip.
	 *
	 * @param string $filter Filter ID.
	 * @param string $value  Value (`range` for a range).
	 * @param string $label  Name.
	 * @return array{key: string, filter: string, value: string, label: string, removeText: string}
	 */
	private static function chip( string $filter, string $value, string $label ): array {
		$config = wp_interactivity_config( Filters::STORE );

		return [
			'key'        => "{$filter}:{$value}",
			'filter'     => $filter,
			'value'      => $value,
			'label'      => $label,
			'removeText' => sprintf( (string) ( $config['removeText'] ?? '%s' ), $label ),
		];
	}
}
