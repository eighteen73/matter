<?php
/**
 * Shared rendering for overlay blocks (modal, drawer, collapsible).
 *
 * Each overlay block has two slots:
 * - `trigger` (optional): stays on the page. Its first link or button opens the
 *   overlay; with neither, the whole area becomes the button.
 * - `content`: the dialog (modal, drawer) or the revealed area (collapsible).
 *
 * Inside a Query Loop each post gets its own overlay (ID `{id}-{postId}`), and
 * modals from the same block form a group that can be navigated (prev/next).
 * Anything linking to `#id` also opens the overlay.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Overlays;

use Eighteen73\Matter\Blocks\Instances;
use Eighteen73\Matter\Ids;
use Eighteen73\Matter\Sections\Sections;
use WP_Block;
use WP_HTML_Processor;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * Shared rendering for overlay blocks.
 */
class Overlay {

	/**
	 * The overlay's base ID: the editor-assigned ID (cleaned as the editor
	 * cleans it), or a generated fallback. The fallback changes between page
	 * loads, so only a saved ID can be linked to or remembered (see render()).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Fallback prefix.
	 * @return string
	 */
	public static function id( array $attributes, string $prefix ): string {
		$id = Ids::sanitize( (string) ( $attributes['overlayId'] ?? '' ) );

		return '' !== $id ? $id : wp_unique_id( $prefix . '-' );
	}

	/**
	 * Register an overlay's server-side state.
	 *
	 * @param string $id     Overlay ID.
	 * @param array  $config Settings: automatic opening, dismissible, group.
	 * @return void
	 */
	public static function register( string $id, array $config = [] ): void {
		$url_triggers = array_values(
			array_filter(
				array_map(
					// The parameter is kept as typed (view.js compares names
					// case-insensitively), the value as the visitor's URL has it.
					fn( $rule ) => [
						'param' => (string) preg_replace( '/[^A-Za-z0-9_.\-]/', '', (string) ( $rule['param'] ?? '' ) ),
						'value' => sanitize_text_field( (string) ( $rule['value'] ?? '' ) ),
					],
					(array) ( $config['urlTriggers'] ?? [] )
				),
				fn( $rule ) => '' !== $rule['param']
			)
		);

		wp_interactivity_state(
			'matter/overlay',
			[
				'items'    => [
					$id => [
						'isOpen'          => false,
						'dismissible'     => (bool) ( $config['dismissible'] ?? true ),
						'group'           => (string) ( $config['group'] ?? '' ),
						'openOnLoad'      => ! empty( $config['openOnLoad'] ),
						'openDelay'       => max( 0, (float) ( $config['openDelay'] ?? 0 ) ),
						'openOnScroll'    => ! empty( $config['openOnScroll'] ),
						'scrollThreshold' => min( 100, max( 0, (int) ( $config['scrollThreshold'] ?? 50 ) ) ),
						'urlTriggers'     => $url_triggers,
						'dismissDays'     => max( 0, (int) ( $config['dismissDays'] ?? 0 ) ),
					],
				],
				'isOpen'   => function () {
					$context = wp_interactivity_get_context();
					$state   = wp_interactivity_state( 'matter/overlay' );

					return ! empty( $state['items'][ $context['id'] ?? '' ]['isOpen'] );
				},
				// A collapsible's content is only hidden once the script runs
				// (view.js), so without JavaScript it is readable.
				'isHidden' => fn() => false,
			]
		);
	}

	/**
	 * Interactivity directives for an overlay's root element.
	 *
	 * @param string $id Overlay ID.
	 * @return string
	 */
	public static function directives( string $id ): string {
		return sprintf(
			'data-wp-interactive="matter/overlay" %s data-wp-init="callbacks.init" data-wp-watch="callbacks.sync"',
			wp_interactivity_data_wp_context( [ 'id' => $id ] )
		);
	}

	/**
	 * Render an overlay block.
	 *
	 * @param string   $type       modal|drawer|collapsible.
	 * @param array    $attributes Block attributes.
	 * @param string   $content    Rendered slots.
	 * @param WP_Block $block      Block instance.
	 * @param array    $extra      Extra wrapper attributes for the overlay element.
	 * @return string
	 */
	public static function render( string $type, array $attributes, string $content, WP_Block $block, array $extra = [] ): string {
		$slots = Sections::slots( $content, [ 'trigger', 'content' ] );
		$base  = self::id( $attributes, $type );
		// Inside a Query Loop each post gets its own overlay.
		$post_id = Instances::in_query_loop() ? (int) ( $block->context['postId'] ?? 0 ) : 0;
		$wanted  = $post_id ? $base . '-' . $post_id : $base;
		$id      = Ids::claim( $wanted );
		$class   = 'wp-block-matter-' . $type;

		// Modals in a Query Loop form a group automatically; others can share a group name.
		$group = sanitize_html_class( (string) ( $attributes['group'] ?? '' ) );

		if ( '' === $group && $post_id && 'modal' === $type ) {
			// A second copy of the loop (`offer-5-2`) is a group of its own.
			$group = $base . substr( $id, strlen( $base . '-' . $post_id ) );
		}

		// Dismissal is remembered under the overlay's ID, which only a saved
		// one keeps from one page load to the next.
		if ( '' === Ids::sanitize( (string) ( $attributes['overlayId'] ?? '' ) ) ) {
			$attributes['dismissDays'] = 0;
		}

		self::register(
			$id,
			array_merge(
				$attributes,
				[
					'group'       => $group,
					'dismissible' => 'collapsible' === $type || ! isset( $attributes['dismissible'] ) || ! empty( $attributes['dismissible'] ),
				]
			)
		);

		$trigger = '' !== trim( $slots['trigger'] )
			? sprintf(
				// A repeat is renamed (`x-2`); its trigger area remembers the saved ID
				// its links still say, so they aren't taken for the original's.
				'<div class="%1$s__trigger" data-matter-trigger="%2$s"%4$s>%3$s</div>',
				esc_attr( $class ),
				esc_attr( $id ),
				self::link_trigger( $slots['trigger'], $id ),
				$id !== $wanted ? ' data-matter-from="' . esc_attr( $wanted ) . '"' : ''
			)
			: '';

		if ( 'collapsible' === $type ) {
			return sprintf(
				'<div %1$s>%2$s<div id="%3$s" class="%4$s__content" %5$s data-wp-class--is-open="state.isOpen" data-wp-bind--hidden="state.isHidden" data-wp-on--beforematch="actions.open">%6$s</div></div>',
				get_block_wrapper_attributes( $extra ),
				$trigger,
				esc_attr( $id ),
				esc_attr( $class ),
				self::directives( $id ),
				$slots['content']
			);
		}

		$dismissible = ! isset( $attributes['dismissible'] ) || ! empty( $attributes['dismissible'] );
		$label       = trim( (string) ( $attributes['label'] ?? '' ) );
		$name        = '';

		// The dialog's name: its label if the author set one, else its first
		// heading (which is what a sighted visitor reads first), else "Dialog".
		// On the server, so a dialog shown without JavaScript is named too.
		if ( '' !== $label ) {
			$name = sprintf( 'aria-label="%s"', esc_attr( $label ) );
		} else {
			$slots['content'] = self::name_from_heading( $slots['content'], $id, $heading );
			$name             = '' !== $heading
				? sprintf( 'aria-labelledby="%s"', esc_attr( $heading ) )
				: sprintf( 'aria-label="%s"', esc_attr__( 'Dialog', 'matter' ) );
		}

		// `closedby="none"`: browsers that support it ignore Escape and light
		// dismiss for a dialog that can't be closed (view.js also reopens it).
		$dialog = sprintf(
			'<dialog %1$s %2$s %3$s%8$s data-wp-on--close="callbacks.onClose" data-wp-on--cancel="callbacks.onCancel" data-wp-on--click="callbacks.onBackdropClick">%4$s<div class="%5$s__content">%6$s%7$s</div></dialog>',
			get_block_wrapper_attributes( array_merge( [ 'id' => $id ], $extra ) ),
			self::directives( $id ),
			$name,
			$dismissible ? self::close_button( $class ) : '',
			esc_attr( $class ),
			$slots['content'],
			'' !== $group ? self::group_nav( $class ) : '',
			$dismissible ? '' : ' closedby="none"'
		);

		return '' !== $trigger
			? sprintf( '<div class="%1$s-host">%2$s%3$s</div>', esc_attr( $class ), $trigger, $dialog )
			: $dialog;
	}

	/**
	 * The ID of the first heading in an overlay's content (a `<h1>` to `<h6>`
	 * or `role="heading"`) that is the dialog's own, giving it one if it has
	 * none, to name the dialog. Not one that isn't shown or isn't its own: in a
	 * nested dialog, a template, something hidden or inert, an accordion item's
	 * heading (a button's wrapper) or a tab's label.
	 *
	 * @param string $html    Content.
	 * @param string $id      Overlay ID.
	 * @param string $heading Set to the heading's ID, or '' if there is none.
	 * @return string The content, with the heading's ID.
	 */
	private static function name_from_heading( string $html, string $id, ?string &$heading ): string {
		$heading = '';

		// The HTML processor knows what a heading sits in. Where it gives up
		// (markup it doesn't support), the plain scan below checks the
		// heading's own attributes only.
		$tags = WP_HTML_Processor::create_fragment( $html );

		if ( null !== $tags ) {
			$inside = null;

			while ( $tags->next_token() ) {
				if ( '#tag' !== $tags->get_token_type() || $tags->is_tag_closer() ) {
					continue;
				}

				$depth = $tags->get_current_depth();

				if ( null !== $inside && $depth <= $inside ) {
					$inside = null;
				}

				if ( null === $inside && self::is_unshown( $tags ) ) {
					$inside = $depth;
				}

				if ( null === $inside && self::is_named_by( $tags ) ) {
					return self::give_id( $tags, $id, $heading );
				}
			}

			if ( null === $tags->get_last_error() ) {
				return $html;
			}
		}

		$tags = new WP_HTML_Tag_Processor( $html );

		while ( $tags->next_tag() ) {
			if ( ! self::is_unshown( $tags ) && self::is_named_by( $tags ) ) {
				return self::give_id( $tags, $id, $heading );
			}
		}

		return $html;
	}

	/**
	 * Whether a tag, and what is in it, is not the dialog's to be named by: a
	 * nested dialog, a template, something hidden or inert.
	 *
	 * @param WP_HTML_Tag_Processor $tags Processor at an opening tag.
	 * @return bool
	 */
	private static function is_unshown( WP_HTML_Tag_Processor $tags ): bool {
		return in_array( $tags->get_tag(), [ 'DIALOG', 'TEMPLATE' ], true )
			|| null !== $tags->get_attribute( 'hidden' )
			|| null !== $tags->get_attribute( 'inert' );
	}

	/**
	 * Whether a tag is a heading that can name the dialog: not an accordion
	 * item's heading or a tab's label.
	 *
	 * @param WP_HTML_Tag_Processor $tags Processor at an opening tag.
	 * @return bool
	 */
	private static function is_named_by( WP_HTML_Tag_Processor $tags ): bool {
		return ( in_array( $tags->get_tag(), [ 'H1', 'H2', 'H3', 'H4', 'H5', 'H6' ], true ) || 'heading' === $tags->get_attribute( 'role' ) )
			&& ! $tags->has_class( 'wp-block-matter-accordion-item__heading' )
			&& ! $tags->has_class( 'wp-block-matter-tab__label' );
	}

	/**
	 * Give the heading at the processor an ID.
	 *
	 * @param WP_HTML_Tag_Processor $tags    Processor at the heading.
	 * @param string                $id      Overlay ID.
	 * @param string                $heading Set to the heading's ID.
	 * @return string The content, with the heading's ID.
	 */
	private static function give_id( WP_HTML_Tag_Processor $tags, string $id, ?string &$heading ): string {
		$existing = $tags->get_attribute( 'id' );

		// An ID the author gave is kept, unless this page has it already (a
		// second copy of the overlay): then the copy's heading gets the next.
		if ( is_string( $existing ) && '' !== $existing ) {
			$claimed = Ids::claim( $existing );
			$heading = '' !== $claimed ? $claimed : $existing;

			if ( $heading !== $existing ) {
				$tags->set_attribute( 'id', $heading );
			}

			return $tags->get_updated_html();
		}

		$heading = Ids::claim( $id . '-title' );
		$tags->set_attribute( 'id', $heading );

		return $tags->get_updated_html();
	}

	/**
	 * Make a trigger area's first control a link to the overlay. The trigger is
	 * its first link or button (view.js); a link the author left without a
	 * destination (a button block with no URL renders `<a>` with no `href`, or
	 * the placeholder `#`) gets `#{id}`, so without JavaScript it still goes
	 * to the overlay, which a dialog shows in the page (see the modal's CSS).
	 * Anything else is left alone: a button, a link to a destination (even to
	 * the saved ID of a copy that was renamed, which view.js knows is the
	 * copy's own), a trigger area with neither.
	 *
	 * @param string $html Trigger area content.
	 * @param string $id   Overlay's ID on this page.
	 * @return string
	 */
	private static function link_trigger( string $html, string $id ): string {
		$tags = new WP_HTML_Tag_Processor( $html );

		while ( $tags->next_tag() ) {
			$tag = $tags->get_tag();

			if ( 'BUTTON' === $tag ) {
				return $html;
			}

			if ( 'A' !== $tag ) {
				continue;
			}

			$href = $tags->get_attribute( 'href' );
			$href = is_string( $href ) ? trim( $href ) : '';

			if ( '' !== $href && '#' !== $href ) {
				return $html;
			}

			$tags->set_attribute( 'href', '#' . $id );

			return $tags->get_updated_html();
		}

		return $html;
	}

	/**
	 * Close button for dialogs.
	 *
	 * @param string $block_class Block class, e.g. wp-block-matter-modal.
	 * @return string
	 */
	public static function close_button( string $block_class ): string {
		/**
		 * Filters the overlay close button label.
		 *
		 * @param string $label       Label (visually hidden).
		 * @param string $block_class Block class.
		 */
		$label = (string) apply_filters( 'matter_overlay_close_label', __( 'Close', 'matter' ), $block_class );

		return sprintf(
			'<button type="button" class="%1$s__close" data-wp-on--click="actions.close"><span class="screen-reader-text">%2$s</span></button>',
			esc_attr( $block_class ),
			esc_html( $label )
		);
	}

	/**
	 * Previous/next navigation for grouped dialogs.
	 *
	 * @param string $block_class Block class.
	 * @return string
	 */
	private static function group_nav( string $block_class ): string {
		return sprintf(
			'<nav class="%1$s__group-nav" aria-label="%2$s"><button type="button" class="%1$s__previous" data-wp-on--click="actions.prev"><span class="screen-reader-text">%3$s</span></button><span class="%1$s__position" data-wp-text="state.groupPosition"></span><button type="button" class="%1$s__next" data-wp-on--click="actions.next"><span class="screen-reader-text">%4$s</span></button></nav>',
			esc_attr( $block_class ),
			esc_attr__( 'More in this group', 'matter' ),
			esc_html__( 'Previous', 'matter' ),
			esc_html__( 'Next', 'matter' )
		);
	}
}
