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
import { createBlobURL } from '@wordpress/blob';
import { createBlock } from '@wordpress/blocks';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';

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

// Not `instanceof File`: files from the editor canvas's iframe are another
// window's.
const isFile = (item) =>
	Object.prototype.toString.call(item) === '[object File]';

/**
 * @param {string} clientId Parent block client ID.
 * @return {Object} `isImageOnly` (no children, or only images), `ids` (chosen
 *                  images in order), `urls` (each child's image URL) and
 *                  `update(images)` to apply a selection or add uploaded
 *                  files.
 */
export function useGalleryMedia(clientId) {
	const blocks = useSelect(
		(select) => select(blockEditorStore).getBlocks(clientId),
		[clientId]
	);
	const registry = useRegistry();
	const { replaceInnerBlocks } = useDispatch(blockEditorStore);
	const { createErrorNotice } = useDispatch(noticesStore);

	const isImageOnly = blocks.every((block) => block.name === 'core/image');
	const ids = blocks
		.map((block) => block.attributes.id)
		.filter((id) => typeof id === 'number');

	const update = (selection) => {
		const items = Array.from(selection ?? []);
		// Read now: an upload's callback may outlive this render.
		const current = registry.select(blockEditorStore).getBlocks(clientId);

		// Files dropped or uploaded (MediaPlaceholder's `handleUpload` is
		// off): each becomes an image block that uploads its own file, as in
		// core's Gallery. WordPress's upload queue reports files one at a
		// time, so handling the upload here kept only the last.
		if (items.some(isFile)) {
			const images = items.filter(
				(file) => isFile(file) && file.type.startsWith('image/')
			);

			if (images.length < items.length) {
				createErrorNotice(
					__('Only images can be added here.', 'matter'),
					{ type: 'snackbar' }
				);
			}

			replaceInnerBlocks(clientId, [
				...current,
				...images.map((file) =>
					createBlock('core/image', { blob: createBlobURL(file) })
				),
			]);
			return;
		}

		// A media library selection is the whole gallery in its new order;
		// images without an attachment (empty placeholders) are dropped.
		const existing = new Map(
			current
				.filter((block) => block.attributes.id)
				.map((block) => [block.attributes.id, block])
		);

		replaceInnerBlocks(
			clientId,
			items.map((image) => existing.get(image.id) ?? toImageBlock(image))
		);
	};

	// For thumbnails: each image's URL, in order.
	const urls = blocks.map((block) => block.attributes.url ?? '');

	return { isImageOnly, ids, urls, update };
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
