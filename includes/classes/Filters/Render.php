<?php
/**
 * Markup for the filter blocks. Everything a filter shows that can change
 * (an option's chosen state and count, the active filters, the results) is
 * bound to the `matter/filters` store's state, so the store can update it
 * without new HTML from the server; the server renders it from the same
 * state first (State), so the page is right before any script runs.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

use Eighteen73\Matter\Overlays\Panel;
use Eighteen73\Matter\Overlays\Trigger;
use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * Filter block markup.
 */
final class Render {

	/**
	 * Displays for a choice of options.
	 */
	private const CHOICES = [ 'checkboxes', 'radio', 'chips', 'dropdown', 'swatches', 'stars' ];

	/**
	 * The filters block: its filters in a form (submitted as a plain GET
	 * without JavaScript), in a panel that's a drawer below its breakpoint.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Its filter blocks, rendered.
	 * @return string
	 */
	public static function filters( array $attributes, string $content ): string {
		$listing = Filters::listing();

		if ( null === $listing ) {
			return '';
		}

		$panel   = Filters::panel( $attributes );
		$context = wp_interactivity_data_wp_context( [ 'listing' => $listing->key() ] );
		$kept    = '';

		foreach ( Request::kept_params() as $name => $value ) {
			$kept .= sprintf( '<input type="hidden" name="%s" value="%s" />', esc_attr( $name ), esc_attr( $value ) );
		}

		$form = sprintf(
			'<form class="wp-block-matter-filters__form" method="get" action="%1$s" data-wp-interactive="matter/filters" %2$s data-wp-on--submit="actions.submit">%3$s%4$s<button type="submit" class="wp-block-matter-filters__apply" data-wp-bind--hidden="state.isInteractive">%5$s</button></form>',
			esc_url( $listing->base_url() ),
			$context,
			$content,
			$kept,
			esc_html__( 'Apply filters', 'matter' )
		);

		$footer = sprintf(
			'<div class="wp-block-matter-filters__footer is-panel-only"><button type="button" class="wp-block-matter-filters__clear" data-wp-interactive="matter/filters" %1$s data-wp-on--click="actions.clearAll" data-wp-bind--hidden="!state.hasActive">%2$s</button><button type="button" class="wp-block-matter-filters__show" data-wp-interactive="matter/panel" %3$s data-wp-on--click="actions.close"><span data-wp-interactive="matter/filters" %1$s data-wp-text="state.showText"></span></button></div>',
			$context,
			esc_html__( 'Clear all', 'matter' ),
			wp_interactivity_data_wp_context( [ 'id' => $listing->panel_id() ] )
		);

		$inner = null === $panel['collapse_below']
			? $form
			: Panel::render(
				$listing->panel_id(),
				$form . $footer,
				[
					'collapse_below' => $panel['collapse_below'],
					'position'       => $panel['position'],
					'label'          => $panel['label'],
					/* translators: %s: the filters' name, e.g. "Filters". */
					'close_label'    => sprintf( __( 'Close %s', 'matter' ), mb_strtolower( $panel['label'] ) ),
					'class'          => 'wp-block-matter-filters__panel',
					'process'        => false,
				]
			);

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes(
				[
					'data-wp-interactive' => 'matter/filters',
					'data-wp-context'     => (string) wp_json_encode( [ 'listing' => $listing->key() ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP ),
					'data-wp-init'        => 'callbacks.init',
					'data-wp-watch'       => 'callbacks.syncWithServer',
				]
			),
			$inner
		);
	}

	/**
	 * A filter: its source's options (or range) for the listing.
	 *
	 * @param array    $attributes Block attributes.
	 * @param WP_Block $block      Block instance.
	 * @return string
	 */
	public static function filter( array $attributes, WP_Block $block ): string {
		$listing = Filters::listing();
		$source  = Sources::get( (string) ( $attributes['source'] ?? '' ) );

		if ( null === $listing || null === $source ) {
			return '';
		}

		$id       = $listing->next_filter( $source->key() );
		$settings = [ 'operator' => 'and' === ( $attributes['operator'] ?? '' ) ? 'and' : 'or' ];
		$display  = (string) ( $attributes['display'] ?? 'checkboxes' );
		$display  = 'range' === $source->kind() ? 'range' : ( in_array( $display, self::CHOICES, true ) ? $display : 'checkboxes' );
		$options  = $source->options( $listing, $block, $settings );
		// A source with ordered values (ratings) can show stars, and options
		// that include the ones above them ("4 & up").
		$ordered  = method_exists( $source, 'ordered' ) && $source->ordered();
		$at_least = $ordered && ! empty( $attributes['atLeast'] ) && 'range' !== $display;
		$display  = 'stars' === $display && ! $ordered ? 'checkboxes' : $display;
		$label    = trim( (string) ( $attributes['label'] ?? '' ) );
		$label    = '' !== $label ? $label : $source->label();
		$selected = $source->selected( Request::params() );
		$params   = $source->params();

		if ( 'range' === $display ) {
			$listing->note_filter( $id, [], $block );
			self::state( $listing, $id, [], [] );

			$body = self::range( $listing, $id, $params, $options, $selected, $label, ! empty( $attributes['slider'] ) );
		} else {
			$counts = [];
			$labels = [];

			foreach ( $options as $option ) {
				$counts[ (string) $option['value'] ] = (int) $option['count'];
				$labels[ (string) $option['value'] ] = $at_least
					/* translators: %s: an option, e.g. "Rated 4 out of 5". */
					? sprintf( __( '%s and up', 'matter' ), (string) $option['label'] )
					: (string) $option['label'];
			}

			$listing->note_filter( $id, array_keys( $counts ), $block );
			self::state( $listing, $id, $counts, $labels, $at_least );

			// "4 & up" for each but the highest (which is only itself).
			if ( $at_least ) {
				usort( $options, fn( $a, $b ) => (float) $b['value'] <=> (float) $a['value'] );
				$options = count( $options ) > 1 ? array_slice( $options, 1 ) : $options;
				$options = array_map( fn( $option ) => [ 'label' => $labels[ (string) $option['value'] ] ] + $option, $options );
			}

			// A filter with nothing to choose (no option has results, and none
			// is chosen) isn't shown.
			if ( ! array_filter( $counts ) && empty( $selected['values'] ) ) {
				return '';
			}

			$body = 'dropdown' === $display
				? self::dropdown( $id, $params, $options, $label, ! empty( $attributes['showCounts'] ) )
				: self::choices( $id, $display, $params, $options, $label, $attributes, $at_least );
		}

		if ( ! empty( $attributes['collapsible'] ) ) {
			$body = self::collapsible( $listing, $id, $label, $body, ! isset( $attributes['open'] ) || ! empty( $attributes['open'] ) );
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes( [ 'class' => 'is-display-' . $display ] ),
			$body
		);
	}

	/**
	 * A collapsible filter: its options in a disclosure (`details`) whose
	 * summary is its name and how many are chosen. Whether it's open is the
	 * listing's state (`open`, from the block's "Open at first"), so it stays
	 * as the shopper left it when the listing changes. The filter's own label
	 * stays, for screen readers, naming its group of options.
	 *
	 * @param Listing $listing Listing.
	 * @param string  $id      Filter ID.
	 * @param string  $label   Its name.
	 * @param string  $body    Its options.
	 * @param bool    $open    Whether it's open at first.
	 * @return string
	 */
	private static function collapsible( Listing $listing, string $id, string $label, string $body, bool $open ): string {
		$state = wp_interactivity_state( Filters::STORE );

		if ( ! isset( $state['listings'][ $listing->key() ]['filters'][ $id ]['open'] ) ) {
			wp_interactivity_state( Filters::STORE, [ 'listings' => [ $listing->key() => [ 'filters' => [ $id => [ 'open' => $open ] ] ] ] ] );
		}

		$processor = new \WP_HTML_Tag_Processor( $body );

		if ( $processor->next_tag( [ 'class_name' => 'wp-block-matter-filter__label' ] ) ) {
			$processor->add_class( 'screen-reader-text' );
			$body = $processor->get_updated_html();
		}

		return sprintf(
			'<details class="wp-block-matter-filter__group" data-wp-interactive="matter/filters" %1$s data-wp-bind--open="state.isOpen" data-wp-on--toggle="actions.toggleOpen"><summary class="wp-block-matter-filter__summary"><span class="wp-block-matter-filter__summary-label">%2$s</span> <span class="wp-block-matter-filter__chosen" data-wp-bind--hidden="!state.chosenCount"><span data-wp-text="state.chosenCount"></span><span class="screen-reader-text"> %3$s</span></span></summary>%4$s</details>',
			wp_interactivity_data_wp_context(
				[
					'listing' => $listing->key(),
					'filter'  => $id,
				]
			),
			esc_html( $label ),
			esc_html__( 'chosen', 'matter' ),
			$body
		);
	}

	/**
	 * Add a filter's counts and option names to the listing's state.
	 *
	 * @param Listing $listing Listing.
	 * @param string  $id      Filter ID.
	 * @param array   $counts  Value => count.
	 * @param array   $labels  Value => name.
	 * @param bool    $at_least Whether each option includes those above it.
	 * @return void
	 */
	private static function state( Listing $listing, string $id, array $counts, array $labels, bool $at_least = false ): void {
		$state = wp_interactivity_state( Filters::STORE );
		$known = (array) ( $state['listings'][ $listing->key() ]['filters'][ $id ]['labels'] ?? [] );

		wp_interactivity_state(
			Filters::STORE,
			[
				'listings' => [
					$listing->key() => [
						'filters' => [
							$id => [
								'counts'  => (object) $counts,
								// Replaced, not merged: values can be numbers (ratings).
								// "& up" names its options and chip itself.
								'labels'  => (object) ( $at_least ? array_replace( $known, $labels ) : array_replace( $labels, $known ) ),
								'atLeast' => $at_least,
							],
						],
					],
				],
			]
		);
	}

	/**
	 * Options to tick or pick: checkboxes, chips, swatches or radio buttons,
	 * nested under their parent, the first few shown until "Show more".
	 *
	 * @param string $id         Filter ID.
	 * @param string $display    Display.
	 * @param array  $params     The source's parameters.
	 * @param array  $options    Options.
	 * @param string $label      Legend.
	 * @param array  $attributes Block attributes.
	 * @param bool   $at_least   Whether each option includes those above it (radio buttons).
	 * @return string
	 */
	private static function choices( string $id, string $display, array $params, array $options, string $label, array $attributes, bool $at_least = false ): string {
		$radio  = 'radio' === $display || $at_least;
		$limit  = max( 0, (int) ( $attributes['limit'] ?? 0 ) );
		$counts = ! empty( $attributes['showCounts'] );

		if ( $radio ) {
			array_unshift(
				$options,
				[
					'value'  => '',
					'label'  => __( 'Any', 'matter' ),
					'count'  => 0,
					'parent' => '',
				]
			);
		}

		$children = [];

		foreach ( $options as $option ) {
			$children[ (string) ( $option['parent'] ?? '' ) ][] = $option;
		}

		$top  = $children[''] ?? [];
		$more = $limit > 0 && count( $top ) > $limit;
		$html = sprintf(
			'<ul class="wp-block-matter-filter__options" data-wp-class--is-collapsed="state.isCollapsed">%s</ul>',
			self::option_list( $top, $children, $params, $radio, $counts, $limit, $display, $at_least )
		);

		if ( $more ) {
			$html .= sprintf(
				'<button type="button" class="wp-block-matter-filter__more" data-wp-on--click="actions.showMore" data-wp-bind--hidden="!state.isCollapsed">%s</button>',
				esc_html__( 'Show more', 'matter' )
			);
		}

		return sprintf(
			'<fieldset class="wp-block-matter-filter__fieldset" data-wp-interactive="matter/filters" %1$s><legend class="wp-block-matter-filter__label">%2$s</legend>%3$s</fieldset>',
			wp_interactivity_data_wp_context(
				[
					'listing' => (string) Filters::listing()?->key(),
					'filter'  => $id,
					'more'    => $more,
				]
			),
			esc_html( $label ),
			$html
		);
	}

	/**
	 * A level of options (and, inside each, its children).
	 *
	 * @param array  $options  Options at this level.
	 * @param array  $children Options by their parent's value.
	 * @param array  $params   The source's parameters.
	 * @param bool   $radio    Radio buttons (one choice).
	 * @param bool   $counts   Show counts.
	 * @param int    $limit    Top-level options shown before "Show more" (0 for all).
	 * @param string $display  Display.
	 * @param bool   $at_least Whether each option includes those above it.
	 * @return string
	 */
	private static function option_list( array $options, array $children, array $params, bool $radio, bool $counts, int $limit = 0, string $display = '', bool $at_least = false ): string {
		$html = '';

		foreach ( array_values( $options ) as $index => $option ) {
			$value = (string) $option['value'];
			$kids  = '' !== $value ? ( $children[ $value ] ?? [] ) : [];

			$html .= sprintf(
				'<li class="%1$s" %2$s data-wp-bind--hidden="state.isHidden"><label class="wp-block-matter-filter__choice"><input type="%3$s" name="%4$s" value="%5$s" data-wp-bind--checked="state.isChecked" data-wp-on--change="%6$s" data-wp-on--pointerenter="actions.prefetch" data-wp-on--focus="actions.prefetch" />%7$s%8$s%9$s</label>%10$s</li>',
				esc_attr( implode( ' ', array_filter( [ 'wp-block-matter-filter__option', $limit > 0 && $index >= $limit ? 'is-more' : '' ] ) ) ),
				wp_interactivity_data_wp_context( [ 'value' => $value ] ),
				$radio ? 'radio' : 'checkbox',
				esc_attr( $radio ? $params['value'] : $params['value'] . '[]' ),
				esc_attr( $value ),
				$radio ? 'actions.choose' : 'actions.toggle',
				! empty( $option['swatch'] ) ? sprintf( '<span class="wp-block-matter-filter__swatch" style="%s" aria-hidden="true"></span>', esc_attr( '--swatch:' . $option['swatch'] ) ) : '',
				self::option_name( $option, $display, $at_least ),
				$counts && '' !== $value ? sprintf( ' <span class="wp-block-matter-filter__count" data-wp-text="state.count">%d</span>', (int) $option['count'] ) : '',
				$kids ? sprintf( '<ul class="wp-block-matter-filter__children">%s</ul>', self::option_list( $kids, $children, $params, $radio, $counts, 0, $display, $at_least ) ) : ''
			);
		}

		return $html;
	}

	/**
	 * An option's name: as text, or for a rating shown as stars, the stars
	 * (with "& up") and its name for screen readers.
	 *
	 * @param array  $option   Option.
	 * @param string $display  Display.
	 * @param bool   $at_least Whether each option includes those above it.
	 * @return string
	 */
	private static function option_name( array $option, string $display, bool $at_least ): string {
		if ( 'stars' !== $display || ! isset( $option['rating'] ) ) {
			return sprintf( '<span class="wp-block-matter-filter__name">%s</span>', esc_html( (string) $option['label'] ) );
		}

		return sprintf(
			'<span class="wp-block-matter-filter__stars" style="%1$s" aria-hidden="true"></span><span class="wp-block-matter-filter__name screen-reader-text">%2$s</span>%3$s',
			esc_attr( '--rating:' . (float) $option['rating'] ),
			esc_html( (string) $option['label'] ),
			$at_least ? '<span class="wp-block-matter-filter__up" aria-hidden="true">' . esc_html__( '& up', 'matter' ) . '</span>' : ''
		);
	}

	/**
	 * A dropdown: one option, or any.
	 *
	 * @param string $id      Filter ID.
	 * @param array  $params  The source's parameters.
	 * @param array  $options Options.
	 * @param string $label   Label.
	 * @param bool   $counts  Show counts.
	 * @return string
	 */
	private static function dropdown( string $id, array $params, array $options, string $label, bool $counts ): string {
		$listing = (string) Filters::listing()?->key();
		$field   = 'matter-filter-' . $listing . '-' . $id;
		$html    = sprintf( '<option value="" data-wp-context=\'{"value":""}\' data-wp-bind--selected="state.isChecked">%s</option>', esc_html__( 'Any', 'matter' ) );

		foreach ( $options as $option ) {
			$value = (string) $option['value'];
			$depth = 0;

			for ( $parent = (string) ( $option['parent'] ?? '' ); '' !== $parent && $depth < 10; ++$depth ) {
				$parent = (string) ( array_column( $options, 'parent', 'value' )[ $parent ] ?? '' );
			}

			$html .= sprintf(
				'<option value="%1$s" %2$s data-wp-bind--selected="state.isChecked" data-wp-bind--hidden="state.isHidden">%3$s%4$s</option>',
				esc_attr( $value ),
				wp_interactivity_data_wp_context( [ 'value' => $value ] ),
				esc_html( str_repeat( '– ', $depth ) . (string) $option['label'] ),
				$counts ? esc_html( sprintf( ' (%d)', (int) $option['count'] ) ) : ''
			);
		}

		return sprintf(
			'<div class="wp-block-matter-filter__field" data-wp-interactive="matter/filters" %1$s><label class="wp-block-matter-filter__label" for="%2$s">%3$s</label><select id="%2$s" name="%4$s" data-wp-on--change="actions.choose">%5$s</select></div>',
			wp_interactivity_data_wp_context(
				[
					'listing' => $listing,
					'filter'  => $id,
				]
			),
			esc_attr( $field ),
			esc_html( $label ),
			esc_attr( $params['value'] ),
			$html
		);
	}

	/**
	 * A range: a low and a high value, within the listing's.
	 *
	 * @param Listing $listing  Listing.
	 * @param string  $id       Filter ID.
	 * @param array   $params   The source's parameters (`min`, `max`).
	 * @param array   $bounds   The listing's `min` and `max`.
	 * @param array   $selected The selection's `min` and `max`.
	 * @param string  $label    Legend.
	 * @param bool    $slider   Whether it has a slider too.
	 * @return string
	 */
	private static function range( Listing $listing, string $id, array $params, array $bounds, array $selected, string $label, bool $slider = false ): string {
		$field = function ( string $bound, string $name ) use ( $listing, $id, $params, $bounds, $selected ): string {
			$field_id = 'matter-filter-' . $listing->key() . '-' . $id . '-' . $bound;
			$value    = $selected[ $bound ] ?? null;
			$limit    = $bounds[ $bound ] ?? null;

			return sprintf(
				'<div class="wp-block-matter-filter__bound" %1$s><label for="%2$s">%3$s</label><input id="%2$s" type="number" inputmode="decimal" name="%4$s" step="any"%5$s%6$s%7$s%8$s data-wp-bind--value="state.boundValue" data-wp-on--change="actions.setRange" /></div>',
				wp_interactivity_data_wp_context( [ 'bound' => $bound ] ),
				esc_attr( $field_id ),
				esc_html( $name ),
				esc_attr( (string) ( $params[ $bound ] ?? '' ) ),
				null !== ( $bounds['min'] ?? null ) ? sprintf( ' min="%s"', esc_attr( (string) $bounds['min'] ) ) : '',
				null !== ( $bounds['max'] ?? null ) ? sprintf( ' max="%s"', esc_attr( (string) $bounds['max'] ) ) : '',
				null !== $limit ? sprintf( ' placeholder="%s"', esc_attr( (string) $limit ) ) : '',
				null !== $value ? sprintf( ' value="%s"', esc_attr( (string) $value ) ) : ''
			);
		};

		$has_bounds = null !== ( $bounds['min'] ?? null ) && null !== ( $bounds['max'] ?? null ) && $bounds['max'] > $bounds['min'];
		$slider     = $slider && $has_bounds;

		return sprintf(
			'<fieldset class="wp-block-matter-filter__fieldset" data-wp-interactive="matter/filters" %1$s><legend class="wp-block-matter-filter__label">%2$s</legend>%3$s<div class="wp-block-matter-filter__range">%4$s%5$s</div></fieldset>',
			wp_interactivity_data_wp_context(
				array_filter(
					[
						'listing' => $listing->key(),
						'filter'  => $id,
						// A slider's ends, and where its thumbs are while dragged.
						'bounds'  => $slider ? [
							'min' => (float) $bounds['min'],
							'max' => (float) $bounds['max'],
						] : null,
						'draft'   => $slider ? [
							'min' => null,
							'max' => null,
						] : null,
					]
				)
			),
			esc_html( $label ),
			$slider ? self::slider( $label ) : '',
			$field( 'min', __( 'Min', 'matter' ) ),
			$field( 'max', __( 'Max', 'matter' ) )
		);
	}

	/**
	 * A range's slider: two thumbs on one track, the lowest and highest,
	 * with what they span as text ("£10 – £40"). Dragging shows where they'd
	 * filter; letting go filters. A thumb at its end of the track is no
	 * bound. The fields below stay, for typing an exact value.
	 *
	 * @param string $label The filter's name.
	 * @return string
	 */
	private static function slider( string $label ): string {
		$thumb = fn( string $bound, string $name ) => sprintf(
			'<input type="range" class="wp-block-matter-filter__thumb is-%1$s" aria-label="%2$s" step="1" data-wp-context=\'{"bound":"%1$s"}\' data-wp-bind--min="context.bounds.min" data-wp-bind--max="context.bounds.max" data-wp-bind--value="state.sliderValue" data-wp-bind--aria-valuetext="state.sliderText" data-wp-on--input="actions.slide" data-wp-on--change="actions.setRange" />',
			esc_attr( $bound ),
			esc_attr( sprintf( '%1$s: %2$s', $label, $name ) )
		);

		return sprintf(
			'<div class="wp-block-matter-filter__slider" data-wp-bind--style="state.sliderStyle">%1$s%2$s</div><output class="wp-block-matter-filter__span" data-wp-text="state.rangeText"></output>',
			$thumb( 'min', __( 'lowest', 'matter' ) ),
			$thumb( 'max', __( 'highest', 'matter' ) )
		);
	}

	/**
	 * The button that opens the filters drawer, with the number of active
	 * filters. Hidden while the filters are inline.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	public static function toggle( array $attributes ): string {
		$listing = Filters::listing();

		if ( null === $listing || null === ( $listing->panel['collapse_below'] ?? null ) ) {
			return '';
		}

		$label = trim( (string) ( $attributes['label'] ?? '' ) );
		$label = '' !== $label ? $label : (string) $listing->panel['label'];

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes(),
			Trigger::button(
				$listing->panel_id(),
				[
					'collapse_below' => $listing->panel['collapse_below'],
					'label'          => $label,
					'show_label'     => true,
					'hamburger'      => false,
					'class'          => 'wp-block-matter-filters-toggle__button',
					'content'        => sprintf(
						'<span class="wp-block-matter-filters-toggle__count" data-wp-interactive="matter/filters" %s data-wp-text="state.activeCount" data-wp-bind--hidden="!state.hasActive"></span>',
						wp_interactivity_data_wp_context( [ 'listing' => $listing->key() ] )
					),
					'process'        => false,
				]
			)
		);
	}

	/**
	 * The active filters: a chip for each, which removes it, and Clear all.
	 *
	 * @return string
	 */
	public static function active(): string {
		$listing = Filters::listing();

		if ( null === $listing ) {
			return '';
		}

		return sprintf(
			'<div %1$s data-wp-bind--hidden="!state.hasActive"><ul class="wp-block-matter-active-filters__list"><template data-wp-each--chip="state.chips" data-wp-each-key="context.chip.key"><li class="wp-block-matter-active-filters__item"><button type="button" class="wp-block-matter-active-filters__chip" data-wp-on--click="actions.remove" data-wp-bind--aria-label="context.chip.removeText"><span data-wp-text="context.chip.label"></span></button></li></template></ul><button type="button" class="wp-block-matter-active-filters__clear" data-wp-on--click="actions.clearAll">%2$s</button></div>',
			get_block_wrapper_attributes(
				[
					'data-wp-interactive' => 'matter/filters',
					'data-wp-context'     => (string) wp_json_encode( [ 'listing' => $listing->key() ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP ),
				]
			),
			esc_html__( 'Clear all', 'matter' )
		);
	}

	/**
	 * The number of results ("Showing 1–12 of 48 results"), announced when it
	 * changes.
	 *
	 * @return string
	 */
	public static function results(): string {
		$listing = Filters::listing();

		if ( null === $listing ) {
			return '';
		}

		return sprintf(
			'<p %s data-wp-text="state.resultsText" aria-live="polite"></p>',
			get_block_wrapper_attributes(
				[
					'data-wp-interactive' => 'matter/filters',
					'data-wp-context'     => (string) wp_json_encode( [ 'listing' => $listing->key() ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP ),
				]
			)
		);
	}
}
