/**
 * Syncable container block names.
 *
 * Groups only: a synced Group peers its similar siblings/cousins and maps
 * style changes anywhere in that Group's subtree by relative path.
 */
export const SYNCABLE_BLOCK_NAMES = ['core/group'];

/**
 * Block attribute that enables style sync on a container.
 */
export const STYLE_SYNC_ATTRIBUTE = 'styleSync';

/**
 * Stable notice IDs for snackbar deduplication.
 */
export const NOTICE_ID_OFFER = 'matter/style-sync-offer';
export const NOTICE_ID_SYNCED = 'matter/style-sync-synced';
