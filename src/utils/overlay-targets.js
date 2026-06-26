/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

import { flattenBlocks } from './block-ids';

export const OVERLAY_BLOCK_TYPES = {
	'matter/modal': {
		label: __('Modal', 'matter'),
	},
	'matter/drawer': {
		label: __('Drawer', 'matter'),
	},
	'matter/collapsible': {
		label: __('Collapsible', 'matter'),
	},
};

export const OVERLAY_CONTEXT_KEYS = [
	{
		id: 'matter/modal-id',
		label: __('modal', 'matter'),
	},
	{
		id: 'matter/drawer-id',
		label: __('drawer', 'matter'),
	},
	{
		id: 'matter/collapsible-id',
		label: __('collapsible', 'matter'),
	},
];

/**
 * @param {Object} block Block instance.
 * @return {string} Resolved overlay target ID.
 */
export const getOverlayTargetIdFromBlock = (block) => {
	const attributes = block?.attributes ?? {};

	return (
		attributes.targetId || attributes.anchor || attributes.generatedId || ''
	);
};

/**
 * @param {Array}   blocks                   Block tree.
 * @param {Object}  options                  Extraction options.
 * @param {string}  options.hint             Source hint for the combobox.
 * @param {boolean} options.includeClientIds Whether to include editor client IDs.
 * @return {Array<Object>} Overlay targets.
 */
export const extractOverlayTargetsFromBlocks = (
	blocks,
	{ hint, includeClientIds = false }
) => {
	const targets = [];

	for (const block of flattenBlocks(blocks)) {
		const config = OVERLAY_BLOCK_TYPES[block.name];

		if (!config) {
			continue;
		}

		const targetId = getOverlayTargetIdFromBlock(block);

		if (!targetId) {
			continue;
		}

		const disambiguator = block.attributes?.anchor || targetId;

		targets.push({
			targetId,
			blockName: block.name,
			label: `${config.label} — ${disambiguator}`,
			hint,
			clientId: includeClientIds ? block.clientId : undefined,
		});
	}

	return targets;
};

/**
 * @param {Array<Array<Object>>} sourceArrays Target lists to merge.
 * @return {Array<Object>} Deduped targets preferring entries with client IDs.
 */
export const mergeOverlayTargets = (...sourceArrays) => {
	const byId = new Map();

	for (const targets of sourceArrays) {
		for (const target of targets) {
			const existing = byId.get(target.targetId);

			if (!existing || (!existing.clientId && target.clientId)) {
				byId.set(target.targetId, target);
			}
		}
	}

	return Array.from(byId.values());
};

/**
 * @param {Array<Object>} targets Overlay targets.
 * @return {Array<Object>} ComboboxControl options.
 */
export const buildSelectOptions = (targets) =>
	[...targets]
		.sort(
			(a, b) =>
				a.hint.localeCompare(b.hint) || a.label.localeCompare(b.label)
		)
		.map(({ targetId, label, hint, clientId }) => ({
			value: targetId,
			label,
			hint,
			clientId,
		}));

/**
 * @param {Array<Object>} options Combobox options.
 * @param {string}        search  Filter string.
 * @return {Array<Object>} Filtered options.
 */
export const filterOverlayTargetOptions = (options, search) => {
	if (!search) {
		return options;
	}

	const needle = search.toLowerCase();

	return options.filter(
		(option) =>
			option.label.toLowerCase().includes(needle) ||
			option.hint.toLowerCase().includes(needle)
	);
};

/**
 * @param {Object} entity Template or template-part entity record.
 * @return {string} Human-readable title.
 */
export const getEntityTitle = (entity) => {
	const renderedTitle = entity?.title?.rendered;

	if (renderedTitle) {
		return renderedTitle.replace(/<[^>]+>/g, '').trim();
	}

	return entity?.slug || '';
};
