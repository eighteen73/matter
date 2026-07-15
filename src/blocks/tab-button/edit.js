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
import { useCallback, useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import AddTabToolbarButton from '../../components/add-tab-toolbar-button';
import Media from '../../components/media';
import { useEffectiveActiveTabIndex } from '../tabs/utils/use-effective-active-tab-index';

export default function Edit({
	attributes,
	setAttributes,
	clientId,
	context,
	isSelected,
}) {
	const { label, mediaId, mediaType, focalPoint, posterId } = attributes;
	const effectiveActiveIndex = useEffectiveActiveTabIndex(context);

	const { blockIndex, tabsClientId } = useSelect(
		(select) => {
			const { getBlockIndex, getBlockRootClientId } =
				select(blockEditorStore);

			const tabListClientId = getBlockRootClientId(clientId);

			return {
				blockIndex: getBlockIndex(clientId),
				tabsClientId: tabListClientId
					? getBlockRootClientId(tabListClientId)
					: null,
			};
		},
		[clientId]
	);

	const { __unstableMarkNextChangeAsNotPersistent, updateBlockAttributes } =
		useDispatch(blockEditorStore);

	const isActive = blockIndex === effectiveActiveIndex;

	const activateTab = useCallback(() => {
		if (tabsClientId && blockIndex !== effectiveActiveIndex) {
			__unstableMarkNextChangeAsNotPersistent();
			updateBlockAttributes(tabsClientId, {
				editorActiveTabIndex: blockIndex,
			});
		}
	}, [
		tabsClientId,
		blockIndex,
		effectiveActiveIndex,
		updateBlockAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	]);

	// contentOnly selection often selects the block without a reliable click;
	// keep the visible panel in sync whenever this tab button is selected.
	useEffect(() => {
		if (isSelected) {
			activateTab();
		}
	}, [isSelected, activateTab]);

	const handleMouseDown = useCallback(() => {
		activateTab();
	}, [activateTab]);

	const handleClick = useCallback(
		(event) => {
			event.preventDefault();
			activateTab();
		},
		[activateTab]
	);

	const blockProps = useBlockProps({
		className: clsx({ 'is-active': isActive }),
		role: 'tab',
		tabIndex: -1,
		type: 'button',
		'aria-selected': isActive,
		onMouseDown: handleMouseDown,
		onClick: handleClick,
	});

	return (
		<>
			<AddTabToolbarButton />
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
		</>
	);
}
