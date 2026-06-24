/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	store as blockEditorStore,
	RichText,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { useCallback } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Media from '../../components/media';
import { useEffectiveActiveTabIndex } from '../tabs/utils/use-effective-active-tab-index';

export default function Edit({ attributes, setAttributes, clientId, context }) {
	const { label, mediaId, mediaType, focalPoint, posterId } = attributes;
	const effectiveActiveIndex = useEffectiveActiveTabIndex(context);

	const { blockIndex, tabsClientId } = useSelect(
		(select) => {
			const { getBlockIndex, getBlockRootClientId } =
				select(blockEditorStore);

			const tabListClientId = getBlockRootClientId(clientId);
			const tabsClientId = tabListClientId
				? getBlockRootClientId(tabListClientId)
				: null;

			return {
				blockIndex: getBlockIndex(clientId),
				tabsClientId,
			};
		},
		[clientId]
	);

	const { __unstableMarkNextChangeAsNotPersistent, updateBlockAttributes } =
		useDispatch(blockEditorStore);

	const isActive = blockIndex === effectiveActiveIndex;

	const handleClick = useCallback(
		(event) => {
			event.preventDefault();

			if (tabsClientId && blockIndex !== effectiveActiveIndex) {
				__unstableMarkNextChangeAsNotPersistent();
				updateBlockAttributes(tabsClientId, {
					editorActiveTabIndex: blockIndex,
				});
			}
		},
		[
			tabsClientId,
			blockIndex,
			effectiveActiveIndex,
			updateBlockAttributes,
			__unstableMarkNextChangeAsNotPersistent,
		]
	);

	const blockProps = useBlockProps({
		className: clsx({ 'is-active': isActive }),
		role: 'tab',
		tabIndex: -1,
		type: 'button',
		'aria-selected': isActive,
		onClick: handleClick,
	});

	return (
		<button {...blockProps}>
			<Media
				mediaId={mediaId}
				mediaType={mediaType}
				posterId={posterId}
				focalPoint={focalPoint}
				setAttributes={setAttributes}
				videoClassName="wp-block-matter-tab-button__video"
				imageClassName="wp-block-matter-tab-button__image"
			/>

			<RichText
				tagName="span"
				className="wp-block-matter-tab-button__label"
				withoutInteractiveFormatting
				placeholder={__('Tab title', 'matter')}
				value={label}
				onChange={(newLabel) => setAttributes({ label: newLabel })}
				allowedFormats={[]}
			/>
		</button>
	);
}
