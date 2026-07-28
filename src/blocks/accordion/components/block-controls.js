/**
 * WordPress dependencies
 */
import {
	BlockControls,
	HeadingLevelDropdown,
	store as blockEditorStore,
	useBlockEditContext,
} from '@wordpress/block-editor';
import { ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { useCallback } from '@wordpress/element';
import { createBlock } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Walk ancestors to find the nearest matter/accordion client ID.
 *
 * @param {string}   clientId             Starting client ID.
 * @param {Function} getBlock             Get block by client ID.
 * @param {Function} getBlockRootClientId Get parent client ID.
 * @return {string|null} Accordion client ID or null.
 */
function findAccordionClientId(clientId, getBlock, getBlockRootClientId) {
	let currentId = clientId;

	while (currentId) {
		const block = getBlock(currentId);

		if (block?.name === 'matter/accordion') {
			return currentId;
		}

		currentId = getBlockRootClientId(currentId);
	}

	return null;
}

/**
 * Accordion toolbar controls.
 *
 * Mounted from accordion and nested item blocks so "Add item" stays available
 * while editing headings or panel content.
 *
 * @param {Object}   props
 * @param {Object}   [props.attributes]    Accordion attributes (parent only).
 * @param {Function} [props.setAttributes] Accordion setAttributes (parent only).
 */
export default function AccordionBlockControls({ attributes, setAttributes }) {
	const { clientId } = useBlockEditContext();
	const showHeadingLevel = !!attributes && !!setAttributes;

	const { accordionClientId, isQueryMode } = useSelect(
		(select) => {
			const { getBlock, getBlockRootClientId } = select(blockEditorStore);

			const _accordionClientId = findAccordionClientId(
				clientId,
				getBlock,
				getBlockRootClientId
			);

			if (!_accordionClientId) {
				return {
					accordionClientId: null,
					isQueryMode: true,
				};
			}

			const accordionBlock = getBlock(_accordionClientId);

			return {
				accordionClientId: _accordionClientId,
				isQueryMode: !!accordionBlock?.attributes?.isQueryMode,
			};
		},
		[clientId]
	);

	const { insertBlock } = useDispatch(blockEditorStore);

	const handleAddItem = useCallback(() => {
		if (!accordionClientId) {
			return;
		}

		const newItem = createBlock('matter/accordion-item', {}, [
			createBlock('matter/accordion-heading', {}),
			createBlock('matter/accordion-panel', {}, [
				createBlock('core/paragraph', {
					placeholder: __('Type / to add content…', 'matter'),
				}),
			]),
		]);

		insertBlock(newItem, undefined, accordionClientId);
	}, [accordionClientId, insertBlock]);

	return (
		<>
			{!isQueryMode && accordionClientId && (
				<BlockControls group="other" __experimentalShareWithChildBlocks>
					<ToolbarGroup>
						<ToolbarButton onClick={handleAddItem}>
							{__('Add item', 'matter')}
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			)}

			{showHeadingLevel && (
				<BlockControls group="block">
					<HeadingLevelDropdown
						value={attributes.headingLevel}
						onChange={(value) =>
							setAttributes({ headingLevel: value })
						}
					/>
				</BlockControls>
			)}
		</>
	);
}
