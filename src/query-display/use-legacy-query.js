/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	cloneBlock,
	createBlock,
	createBlocksFromInnerBlocksTemplate,
} from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { ATTRIBUTE, ITEMS, NAMESPACES, QUERY_BLOCKS } from './templates';
import { useSwapBlock } from './use-swap-block';

/**
 * The style (block style name) in a block's classes.
 *
 * @param {string} className Classes.
 * @return {string|undefined} Style name.
 */
export const styleOf = (className = '') =>
	className.match(/(?:^|\s)is-style-([\w-]+)/)?.[1];

/**
 * A carousel, accordion or tabs block made before queries could be shown as
 * one, holding a Query Loop (or, for carousels, a Product Collection),
 * becomes that query shown as the block, with the block's settings. Its
 * items become Matter's for the type. Not an edit: the page isn't marked as
 * changed until it's saved.
 *
 * @param {string} clientId   The block's client ID.
 * @param {string} type       Display type (carousel, accordion or tabs).
 * @param {Object} attributes The block's attributes.
 * @param {Array}  settings   The attributes that are its settings.
 */
export function useLegacyQuery(clientId, type, attributes, settings) {
	const swapBlock = useSwapBlock();
	const legacy = useSelect(
		(select) => {
			const blocks = select(blockEditorStore).getBlocks(clientId);
			const query = blocks.find(({ name }) =>
				type === 'carousel'
					? QUERY_BLOCKS.includes(name)
					: name === 'core/query'
			);

			return blocks.length === 1 && query ? query : null;
		},
		[clientId, type]
	);

	useEffect(() => {
		if (!legacy) {
			return;
		}

		const display = { type };

		settings.forEach((key) => {
			if (attributes[key] !== undefined && attributes[key] !== '') {
				display[key] = attributes[key];
			}
		});

		const style = styleOf(attributes.className);

		if (style) {
			display.style = style;
		}

		if (attributes.scheme) {
			display.scheme = attributes.scheme;
		}

		// A carousel's query already held loop items; accordions and tabs
		// held items with the post's excerpt, now the theme's panel.
		const block =
			type === 'carousel'
				? cloneBlock(legacy, { [ATTRIBUTE]: display })
				: createBlock(
						legacy.name,
						{
							...legacy.attributes,
							namespace: NAMESPACES[type],
							[ATTRIBUTE]: display,
						},
						createBlocksFromInnerBlocksTemplate([
							['core/post-template', {}, ITEMS[type]],
						])
					);

		swapBlock(clientId, block, { persistent: false });
		// The settings are read once, when the block is swapped.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [legacy, clientId, type, swapBlock]);
}
