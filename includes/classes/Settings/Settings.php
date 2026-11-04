<?php
/**
 * Site settings.
 *
 * A config-driven settings page for the small amount of site-wide content
 * clients should be able to edit (contact details, social links, footer text…).
 * Themes declare fields with the `matter_settings_fields` filter:
 *
 *     add_filter( 'matter_settings_fields', fn() => [
 *         'contact' => [
 *             'title'  => 'Contact details',
 *             'fields' => [
 *                 'phone' => [ 'type' => 'tel', 'label' => 'Phone' ],
 *             ],
 *         ],
 *     ] );
 *
 * Values are read with `Matter\setting( 'contact.phone' )` or bound to blocks
 * with the `matter/setting` block bindings source.
 *
 * Field types: text, textarea, email, url, tel, number, toggle, select, media
 * (attachment ID) and repeater (a list of rows of the other types).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Settings;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Site settings.
 */
class Settings {

	use Singleton;

	/**
	 * Option name holding all values.
	 */
	public const OPTION = 'matter_site_settings';

	/**
	 * Admin page slug.
	 */
	public const PAGE = 'matter-settings';

	/**
	 * REST namespace and route.
	 */
	public const REST_NAMESPACE = 'matter/v1';
	public const REST_ROUTE     = '/settings';

	/**
	 * Field types and their stored value type.
	 */
	private const TYPES = [
		'text'     => 'string',
		'textarea' => 'string',
		'email'    => 'string',
		'url'      => 'string',
		'tel'      => 'string',
		'select'   => 'string',
		'number'   => 'number',
		'toggle'   => 'boolean',
		'media'    => 'integer',
		'repeater' => 'array',
	];

	/**
	 * Normalised sections, cached per request.
	 *
	 * @var array|null
	 */
	private ?array $sections = null;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
		add_action( 'admin_menu', [ $this, 'register_page' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_page_assets' ] );
		add_action( 'init', [ $this, 'register_bindings_source' ] );
	}

	/**
	 * Capability required to view and edit the settings.
	 *
	 * @return string
	 */
	public function capability(): string {
		/**
		 * Filters the capability required to manage site settings.
		 *
		 * @param string $capability Defaults to edit_theme_options, which clients
		 *                           already have for managing menus.
		 */
		return (string) apply_filters( 'matter_settings_capability', 'edit_theme_options' );
	}

	/**
	 * Normalised field definitions, grouped by section.
	 *
	 * @return array<string, array{title: string, description: string, fields: array}>
	 */
	public function get_sections(): array {
		if ( null !== $this->sections ) {
			return $this->sections;
		}

		/**
		 * Filters the site settings fields, grouped into sections.
		 *
		 * @param array $sections Sections keyed by slug.
		 */
		$sections = apply_filters( 'matter_settings_fields', [] );

		$this->sections = [];

		foreach ( (array) $sections as $section_key => $section ) {
			$section_key = sanitize_key( $section_key );
			$fields      = $this->normalise_fields( $section['fields'] ?? [] );

			if ( '' === $section_key || empty( $fields ) ) {
				continue;
			}

			$this->sections[ $section_key ] = [
				'title'       => (string) ( $section['title'] ?? ucfirst( $section_key ) ),
				'description' => (string) ( $section['description'] ?? '' ),
				'fields'      => $fields,
			];
		}

		return $this->sections;
	}

	/**
	 * All stored values, merged over field defaults.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public function get_values(): array {
		$stored = get_option( self::OPTION, [] );
		$stored = is_array( $stored ) ? $stored : [];
		$values = [];

		foreach ( $this->get_sections() as $section_key => $section ) {
			foreach ( $section['fields'] as $field_key => $field ) {
				$values[ $section_key ][ $field_key ] = $stored[ $section_key ][ $field_key ] ?? $field['default'];
			}
		}

		return $values;
	}

	/**
	 * Get a single value by `section.field` path.
	 *
	 * @param string $path          Dot path, e.g. `contact.phone`.
	 * @param mixed  $default_value Returned when the field is unknown or empty.
	 * @return mixed
	 */
	public function get( string $path, mixed $default_value = null ): mixed {
		[ $section_key, $field_key ] = array_pad( explode( '.', $path, 2 ), 2, '' );

		$value = $this->get_values()[ $section_key ][ $field_key ] ?? null;

		return ( null === $value || '' === $value || [] === $value ) ? $default_value : $value;
	}

	/**
	 * Save values, sanitising them against the field definitions.
	 *
	 * Unknown sections/fields are discarded.
	 *
	 * @param array $values Values keyed by section then field.
	 * @return array The saved values.
	 */
	public function save( array $values ): array {
		$clean = [];

		foreach ( $this->get_sections() as $section_key => $section ) {
			foreach ( $section['fields'] as $field_key => $field ) {
				$clean[ $section_key ][ $field_key ] = $this->sanitise_value( $values[ $section_key ][ $field_key ] ?? null, $field );
			}
		}

		update_option( self::OPTION, $clean, false );

		/**
		 * Fires after site settings are saved.
		 *
		 * @param array $clean The saved values.
		 */
		do_action( 'matter_settings_saved', $clean );

		return $this->get_values();
	}

	/**
	 * Register the REST route used by the settings page.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			self::REST_NAMESPACE,
			self::REST_ROUTE,
			[
				[
					'methods'             => 'GET',
					'callback'            => fn() => new WP_REST_Response( $this->get_values() ),
					'permission_callback' => [ $this, 'can_manage' ],
				],
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'rest_save' ],
					'permission_callback' => [ $this, 'can_manage' ],
					'args'                => [
						'values' => [
							'type'     => 'object',
							'required' => true,
						],
					],
				],
			]
		);
	}

	/**
	 * Whether the current user can manage settings.
	 *
	 * @return bool
	 */
	public function can_manage(): bool {
		return current_user_can( $this->capability() );
	}

	/**
	 * REST: save settings.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function rest_save( WP_REST_Request $request ): WP_REST_Response {
		return new WP_REST_Response( $this->save( (array) $request->get_param( 'values' ) ) );
	}

	/**
	 * Add the settings page when the theme declares fields.
	 *
	 * @return void
	 */
	public function register_page(): void {
		if ( empty( $this->get_sections() ) ) {
			return;
		}

		/**
		 * Filters the settings page title.
		 *
		 * @param string $title Page and menu title.
		 */
		$title = (string) apply_filters( 'matter_settings_page_title', __( 'Site Settings', 'matter' ) );

		add_menu_page(
			$title,
			$title,
			$this->capability(),
			self::PAGE,
			[ $this, 'render_page' ],
			'dashicons-admin-site-alt3',
			61
		);
	}

	/**
	 * Settings page container; the React app mounts here.
	 *
	 * @return void
	 */
	public function render_page(): void {
		printf(
			'<div class="wrap"><h1>%s</h1><div id="matter-settings"></div></div>',
			esc_html( get_admin_page_title() )
		);
	}

	/**
	 * Enqueue the settings app on its page.
	 *
	 * @param string $hook_suffix Current admin page.
	 * @return void
	 */
	public function enqueue_page_assets( string $hook_suffix ): void {
		if ( 'toplevel_page_' . self::PAGE !== $hook_suffix ) {
			return;
		}

		$asset_file = MATTER_PATH . 'build/settings/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_media();

		wp_enqueue_script(
			'matter-settings',
			MATTER_URL . 'build/settings/index.js',
			$asset['dependencies'],
			$asset['version'],
			[ 'in_footer' => true ]
		);

		wp_enqueue_style( 'wp-components' );

		if ( file_exists( MATTER_PATH . 'build/settings/index.css' ) ) {
			wp_enqueue_style( 'matter-settings', MATTER_URL . 'build/settings/index.css', [ 'wp-components' ], $asset['version'] );
		}

		wp_add_inline_script(
			'matter-settings',
			'window.matterSettings = ' . wp_json_encode(
				[
					'sections' => $this->get_sections(),
					'values'   => $this->get_values(),
					'media'    => $this->get_media_previews(),
					'path'     => self::REST_NAMESPACE . self::REST_ROUTE,
				]
			) . ';',
			'before'
		);

		wp_set_script_translations( 'matter-settings', 'matter' );
	}

	/**
	 * Register the `matter/setting` block bindings source.
	 *
	 * Usage: `"metadata":{"bindings":{"content":{"source":"matter/setting","args":{"key":"contact.phone"}}}}`.
	 *
	 * @return void
	 */
	public function register_bindings_source(): void {
		register_block_bindings_source(
			'matter/setting',
			[
				'label'              => __( 'Site settings', 'matter' ),
				'get_value_callback' => [ $this, 'get_binding_value' ],
			]
		);
	}

	/**
	 * Resolve a bound block attribute.
	 *
	 * @param array    $source_args    Binding args; `key` is the setting path.
	 * @param WP_Block $block_instance Block being rendered.
	 * @param string   $attribute_name Bound attribute.
	 * @return string|int|null
	 */
	public function get_binding_value( array $source_args, WP_Block $block_instance, string $attribute_name ): string|int|null {
		$path  = (string) ( $source_args['key'] ?? '' );
		$field = $this->get_field( $path );
		$value = $this->get( $path );

		if ( null === $field || null === $value || is_array( $value ) ) {
			return null;
		}

		if ( 'media' === $field['type'] ) {
			return match ( $attribute_name ) {
				'id'    => (int) $value,
				'alt'   => (string) get_post_meta( (int) $value, '_wp_attachment_image_alt', true ),
				default => (string) wp_get_attachment_url( (int) $value ),
			};
		}

		if ( in_array( $attribute_name, [ 'url', 'href' ], true ) ) {
			return match ( $field['type'] ) {
				'email' => 'mailto:' . $value,
				'tel'   => 'tel:' . preg_replace( '/[^0-9+]/', '', (string) $value ),
				default => (string) $value,
			};
		}

		return 'textarea' === $field['type'] ? nl2br( esc_html( (string) $value ) ) : esc_html( (string) $value );
	}

	/**
	 * Field definition for a `section.field` path.
	 *
	 * @param string $path Dot path.
	 * @return array|null
	 */
	public function get_field( string $path ): ?array {
		[ $section_key, $field_key ] = array_pad( explode( '.', $path, 2 ), 2, '' );

		return $this->get_sections()[ $section_key ]['fields'][ $field_key ] ?? null;
	}

	/**
	 * Normalise a list of field definitions.
	 *
	 * @param array $fields   Raw fields keyed by slug.
	 * @param bool  $is_child Whether these are repeater sub-fields (no nested repeaters).
	 * @return array
	 */
	private function normalise_fields( array $fields, bool $is_child = false ): array {
		$normalised = [];

		foreach ( $fields as $key => $field ) {
			$key  = sanitize_key( $key );
			$type = $field['type'] ?? 'text';

			if ( '' === $key || ! isset( self::TYPES[ $type ] ) || ( $is_child && 'repeater' === $type ) ) {
				continue;
			}

			$normalised[ $key ] = [
				'type'    => $type,
				'label'   => (string) ( $field['label'] ?? ucfirst( $key ) ),
				'help'    => (string) ( $field['help'] ?? '' ),
				'options' => 'select' === $type ? (array) ( $field['options'] ?? [] ) : [],
				'fields'  => 'repeater' === $type ? $this->normalise_fields( (array) ( $field['fields'] ?? [] ), true ) : [],
				'default' => $field['default'] ?? $this->empty_value( $type ),
			];
		}

		return $normalised;
	}

	/**
	 * The empty value for a field type.
	 *
	 * @param string $type Field type.
	 * @return mixed
	 */
	private function empty_value( string $type ): mixed {
		return match ( self::TYPES[ $type ] ) {
			'boolean' => false,
			'integer' => 0,
			'number'  => null,
			'array'   => [],
			default   => '',
		};
	}

	/**
	 * Sanitise a value for a field.
	 *
	 * @param mixed $value Raw value.
	 * @param array $field Field definition.
	 * @return mixed
	 */
	private function sanitise_value( mixed $value, array $field ): mixed {
		if ( null === $value ) {
			return $this->empty_value( $field['type'] );
		}

		switch ( $field['type'] ) {
			case 'textarea':
				return sanitize_textarea_field( (string) $value );
			case 'email':
				return sanitize_email( (string) $value );
			case 'url':
				return esc_url_raw( (string) $value );
			case 'number':
				return is_numeric( $value ) ? $value + 0 : null;
			case 'toggle':
				return (bool) $value;
			case 'media':
				$id = absint( $value );
				return $id && wp_attachment_is_image( $id ) ? $id : 0;
			case 'select':
				$value = (string) $value;
				return array_key_exists( $value, $field['options'] ) ? $value : '';
			case 'repeater':
				$rows = [];
				foreach ( (array) $value as $row ) {
					$clean = [];
					foreach ( $field['fields'] as $key => $sub_field ) {
						$clean[ $key ] = $this->sanitise_value( $row[ $key ] ?? null, $sub_field );
					}
					$rows[] = $clean;
				}
				return $rows;
			default:
				return sanitize_text_field( (string) $value );
		}
	}

	/**
	 * Preview URLs for selected media, so the page renders thumbnails immediately.
	 *
	 * @return array<int, string>
	 */
	private function get_media_previews(): array {
		$previews = [];
		$values   = $this->get_values();

		foreach ( $this->get_sections() as $section_key => $section ) {
			foreach ( $section['fields'] as $field_key => $field ) {
				$value = $values[ $section_key ][ $field_key ] ?? null;

				if ( 'media' === $field['type'] && $value ) {
					$previews[ $value ] = (string) wp_get_attachment_image_url( $value, 'medium' );
				}

				if ( 'repeater' === $field['type'] ) {
					foreach ( (array) $value as $row ) {
						foreach ( $field['fields'] as $key => $sub_field ) {
							if ( 'media' === $sub_field['type'] && ! empty( $row[ $key ] ) ) {
								$previews[ $row[ $key ] ] = (string) wp_get_attachment_image_url( $row[ $key ], 'medium' );
							}
						}
					}
				}
			}
		}

		return $previews;
	}
}
