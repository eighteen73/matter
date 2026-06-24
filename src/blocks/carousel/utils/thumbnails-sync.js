import { cloneBlock, createBlock } from '@wordpress/blocks';

export const DEFAULT_THUMB_BLOCK = 'core/group';

export const THUMB_IMAGE_OVERRIDES = {
	aspectRatio: '1',
	height: '50px',
	scale: 'cover',
	width: '50px',
};

const THUMB_IMAGE_OVERRIDE_KEYS = Object.keys(THUMB_IMAGE_OVERRIDES);

const stripThumbImageOverrides = (attributes) => {
	const nextAttributes = { ...(attributes || {}) };

	THUMB_IMAGE_OVERRIDE_KEYS.forEach((key) => {
		delete nextAttributes[key];
	});

	return nextAttributes;
};

export const getBlockContentSignature = (block) => {
	if (!block) {
		return null;
	}

	const attributes =
		block.name === 'core/image'
			? stripThumbImageOverrides(block.attributes)
			: { ...(block.attributes || {}) };

	return {
		name: block.name,
		attributes,
		innerBlocks: (block.innerBlocks || []).map(getBlockContentSignature),
	};
};

export const createThumbBlockFromViewportBlock = (viewportBlock) => {
	if (!viewportBlock) {
		return createBlock(DEFAULT_THUMB_BLOCK);
	}

	if (viewportBlock.name === 'core/image') {
		return cloneBlock(viewportBlock, THUMB_IMAGE_OVERRIDES);
	}

	return cloneBlock(viewportBlock);
};

export const buildSyncedThumbBlocks = (viewportInnerBlocks) =>
	viewportInnerBlocks.map(createThumbBlockFromViewportBlock);

const contentSignaturesMatch = (viewportBlock, thumbBlock) =>
	JSON.stringify(getBlockContentSignature(viewportBlock)) ===
	JSON.stringify(getBlockContentSignature(thumbBlock));

export const shouldReplaceThumbBlocks = ({
	syncWithCarousel,
	viewportInnerBlocks,
	thumbsInnerBlocks,
}) => {
	const viewportCount = viewportInnerBlocks.length;
	const thumbsCount = thumbsInnerBlocks.length;

	if (syncWithCarousel) {
		if (viewportCount !== thumbsCount) {
			return buildSyncedThumbBlocks(viewportInnerBlocks);
		}

		for (let index = 0; index < viewportCount; index += 1) {
			if (
				!contentSignaturesMatch(
					viewportInnerBlocks[index],
					thumbsInnerBlocks[index]
				)
			) {
				return buildSyncedThumbBlocks(viewportInnerBlocks);
			}
		}

		return null;
	}

	if (viewportCount === thumbsCount) {
		return null;
	}

	if (thumbsCount > viewportCount) {
		return thumbsInnerBlocks.slice(0, viewportCount);
	}

	return [
		...thumbsInnerBlocks,
		...Array.from({ length: viewportCount - thumbsCount }, (_, offset) =>
			createThumbBlockFromViewportBlock(
				viewportInnerBlocks[thumbsCount + offset]
			)
		),
	];
};
