/**
 * Core's filter for insertion rules, whether a block type can go in a place.
 * It's `__unstable` in name only (WooCommerce uses it), and one name here
 * means one place to change if core renames it.
 */
export const CAN_INSERT_FILTER = 'blockEditor.__unstableCanInsertBlockType';
