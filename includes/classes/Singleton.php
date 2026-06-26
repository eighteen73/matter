<?php
/**
 * Singleton trait.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

trait Singleton {

	/**
	 * The class instance.
	 *
	 * @var self|null Single instance of this class.
	 */
	private static $instance = null;

	/**
	 * Cloning is forbidden.
	 */
	public function __clone() {
		_doing_it_wrong( __FUNCTION__, esc_html__( 'Cloning is forbidden.', 'matter' ), false );
	}

	/**
	 * Unserializing instances of this class is forbidden.
	 */
	public function __wakeup() {
		_doing_it_wrong( __FUNCTION__, esc_html__( 'Unserializing instances of this class is forbidden.', 'matter' ), false );
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		// Intentionally empty.
	}

	/**
	 * Gets the main instance.
	 *
	 * Ensures only one instance can be loaded.
	 *
	 * @return self Single instance of this class.
	 */
	final public static function instance(): self {
		if ( self::$instance === null ) {
			self::$instance = new self();
		}
		return self::$instance;
	}
}
