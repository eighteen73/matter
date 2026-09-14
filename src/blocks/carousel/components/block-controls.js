/**
 * WordPress dependencies
 */
import {
	BlockControls,
	store as blockEditorStore,
	useBlockEditContext,
} from '@wordpress/block-editor';
import { ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { useCallback } from '@wordpress/element';
import { createBlock } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { getCarouselMode } from '../variations';

/**
 * Walk ancestors to find the nearest matter/carousel client ID.
 *
 * @param {string}   clientId             Starting client ID.
 * @param {Function} getBlock             Get block by client ID.
 * @param {Function} getBlockRootClientId Get parent client ID.
 * @return {string|null} Carousel client ID or null.
 */
function findCarouselClientId(clientId, getBlock, getBlockRootClientId) {
	let currentId = clientId;

	while (currentId) {
		const block = getBlock(currentId);

		if (block?.name === 'matter/carousel') {
			return currentId;
		}

		currentId = getBlockRootClientId(currentId);
	}

	return null;
}

/**
 * Carousel toolbar controls.
 *
 * Mounted from carousel and nested viewport/slide blocks so "Add item" stays
 * available while editing slides.
 */
export default function CarouselBlockControls() {
	const { clientId } = useBlockEditContext();

	const { viewportClientId, carouselMode, allowedBlocks } = useSelect(
		(select) => {
			const { getBlock, getBlockRootClientId } = select(blockEditorStore);

			const carouselClientId = findCarouselClientId(
				clientId,
				getBlock,
				getBlockRootClientId
			);

			if (!carouselClientId) {
				return {
					viewportClientId: null,
					carouselMode: 'post',
					allowedBlocks: [],
				};
			}

			const carouselBlock = getBlock(carouselClientId);
			const viewportBlock = (carouselBlock?.innerBlocks ?? []).find(
				(block) => block.name === 'matter/carousel-viewport'
			);

			return {
				viewportClientId: viewportBlock?.clientId ?? null,
				carouselMode: getCarouselMode(
					carouselBlock?.attributes?.className
				),
				allowedBlocks: viewportBlock?.attributes?.allowedBlocks ?? [],
			};
		},
		[clientId]
	);

	const { insertBlock } = useDispatch(blockEditorStore);

	const handleAddItem = useCallback(() => {
		if (!viewportClientId || carouselMode === 'post') {
			return;
		}

		// Variations set allowedBlocks on the viewport. A single entry is the
		// default item type; otherwise keep the built-in image/slide fallback.
		let blockName = 'matter/carousel-slide';

		if (allowedBlocks.length === 1) {
			blockName = allowedBlocks[0];
		} else if (carouselMode === 'image') {
			blockName = 'core/image';
		}

		insertBlock(createBlock(blockName), undefined, viewportClientId);
	}, [viewportClientId, carouselMode, allowedBlocks, insertBlock]);

	if (carouselMode === 'post' || !viewportClientId) {
		return null;
	}

	return (
		<BlockControls group="other" __experimentalShareWithChildBlocks>
			<ToolbarGroup>
				<ToolbarButton onClick={handleAddItem}>
					{__('Add item', 'matter')}
				</ToolbarButton>
			</ToolbarGroup>
		</BlockControls>
	);
}
