/**
 * Manage a block's image children as a gallery, like core's Gallery block:
 * the media library opens in its gallery mode ("Add to gallery" and "Edit
 * gallery": add, remove and reorder). Existing image blocks (and anything set
 * on them) are kept; new images become core/image blocks.
 *
 * Used by the gallery block, and by carousels whose slides are all images.
 */

/**
 * WordPress dependencies
 */
import {
	MediaUpload,
	MediaUploadCheck,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * A core/image block for a media library image.
 *
 * @param {Object} image Media library attachment.
 * @return {Object} Block.
 */
export const toImageBlock = (image) =>
	createBlock('core/image', {
		id: image.id,
		url: image.url,
		alt: image.alt,
	});

/**
 * @param {string} clientId Parent block client ID.
 * @return {Object} `isImageOnly` (no children, or only images), `ids` (chosen
 *                  images in order) and `update(images)` to apply a selection.
 */
export function useGalleryMedia(clientId) {
	const blocks = useSelect(
		(select) => select(blockEditorStore).getBlocks(clientId),
		[clientId]
	);
	const { replaceInnerBlocks } = useDispatch(blockEditorStore);

	const isImageOnly = blocks.every((block) => block.name === 'core/image');
	const ids = blocks
		.map((block) => block.attributes.id)
		.filter((id) => typeof id === 'number');

	// The selection is the whole gallery in its new order; images without an
	// attachment (empty placeholders) are dropped.
	const update = (images) => {
		const existing = new Map(
			blocks
				.filter((block) => block.attributes.id)
				.map((block) => [block.attributes.id, block])
		);

		replaceInnerBlocks(
			clientId,
			images.map((image) => existing.get(image.id) ?? toImageBlock(image))
		);
	};

	return { isImageOnly, ids, update };
}

/**
 * Opens the media library in gallery mode.
 *
 * @param {Object}   props
 * @param {number[]} props.ids      Current image IDs, in order.
 * @param {Function} props.onSelect Called with the gallery's images.
 * @param {Function} props.render   Renders the opener: ({ open, label }).
 * @return {Element} Media upload.
 */
export function GalleryMediaUpload({ ids, onSelect, render }) {
	const hasImages = ids.length > 0;

	return (
		<MediaUploadCheck>
			<MediaUpload
				allowedTypes={['image']}
				multiple
				gallery
				addToGallery={hasImages}
				value={hasImages ? ids : undefined}
				onSelect={onSelect}
				render={({ open }) =>
					render({
						open,
						label: hasImages
							? __('Edit images', 'matter')
							: __('Choose images', 'matter'),
					})
				}
			/>
		</MediaUploadCheck>
	);
}
