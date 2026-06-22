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
import { useMemo, useCallback } from '@wordpress/element';

export default function Edit({ attributes, setAttributes, clientId, context }) {
	const { label } = attributes;
	const activeTabIndex = context['matter/tabs-activeTabIndex'];
	const editorActiveTabIndex = context['matter/tabs-editorActiveTabIndex'];

	const effectiveActiveIndex = useMemo(() => {
		return editorActiveTabIndex ?? activeTabIndex ?? 0;
	}, [editorActiveTabIndex, activeTabIndex]);

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
		onClick: handleClick,
	});

	return (
		<button {...blockProps}>
			<RichText
				tagName="span"
				withoutInteractiveFormatting
				placeholder={__('Tab title')}
				value={label}
				onChange={(newLabel) => setAttributes({ label: newLabel })}
				allowedFormats={[]}
			/>
		</button>
	);
}
