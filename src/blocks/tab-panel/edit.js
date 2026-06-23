/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { useMemo, useRef, useEffect } from '@wordpress/element';
import clsx from 'clsx';

/**
 * Internal dependencies
 */
import {
	findTabsClientId,
	getTabPanelIndex,
} from '../tabs/utils/query-tabs-list';

const TEMPLATE = [
	[
		'core/paragraph',
		{
			placeholder: __('Type / to choose a block'),
		},
	],
];

const QUERY_TEMPLATE = [['core/post-content']];

const { cancelAnimationFrame } = window;

export default function Edit({ attributes, clientId, context, isSelected }) {
	const focusRef = useRef();
	const { inQueryLoop } = attributes;
	const isQueryMode = context['matter/tabs-isQueryMode'] ?? false;

	// Consume tab indices from context
	const activeTabIndex = context['matter/tabs-activeTabIndex'];
	const editorActiveTabIndex = context['matter/tabs-editorActiveTabIndex'];
	const effectiveActiveIndex = editorActiveTabIndex ?? activeTabIndex;

	// Clean up animation frames on unmount.
	useEffect(() => {
		return () => {
			if (focusRef.current) {
				cancelAnimationFrame(focusRef.current);
			}
		};
	}, []);

	const { blockIndex, hasInnerBlocksSelected, tabsClientId } = useSelect(
		(select) => {
			const {
				getBlock,
				getBlockRootClientId,
				getBlocks,
				hasSelectedInnerBlock,
			} = select(blockEditorStore);

			const _tabsClientId = findTabsClientId(
				clientId,
				getBlock,
				getBlockRootClientId
			);
			const _blockIndex = getTabPanelIndex(
				clientId,
				getBlock,
				getBlockRootClientId,
				getBlocks
			);
			const _hasInnerBlocksSelected = hasSelectedInnerBlock(
				clientId,
				true
			);

			return {
				blockIndex: _blockIndex,
				hasInnerBlocksSelected: _hasInnerBlocksSelected,
				tabsClientId: _tabsClientId,
			};
		},
		[clientId]
	);

	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	// Sync editorActiveTabIndex when this tab is selected directly
	useEffect(() => {
		if (inQueryLoop || isQueryMode) {
			return;
		}

		// Only update if this tab is selected and not already the active index
		const isTabSelected = isSelected || hasInnerBlocksSelected;
		if (
			isTabSelected &&
			tabsClientId &&
			effectiveActiveIndex !== blockIndex
		) {
			// Mark as non-persistent so it doesn't add to undo history
			__unstableMarkNextChangeAsNotPersistent();
			updateBlockAttributes(tabsClientId, {
				editorActiveTabIndex: blockIndex,
			});
		}
	}, [
		inQueryLoop,
		isQueryMode,
		isSelected,
		hasInnerBlocksSelected,
		tabsClientId,
		effectiveActiveIndex,
		blockIndex,
		updateBlockAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	]);

	// Determine if this is the currently active tab (for editor visibility)
	const isActiveTab = effectiveActiveIndex === blockIndex;

	// Determine if this is the default tab (for the "Default Tab" toggle in controls)
	const isDefaultTab = activeTabIndex === blockIndex;

	/**
	 * This hook determines if the current tab panel should be visible.
	 * This is true if it is the editor active tab, or if it is selected directly.
	 */
	const isSelectedTab = useMemo(() => {
		if (inQueryLoop || isQueryMode) {
			return true;
		}

		// Show if this tab is directly selected or has selected inner blocks
		if (isSelected || hasInnerBlocksSelected) {
			return true;
		}
		// Always show the active tab (at effectiveActiveIndex) regardless of other selection state.
		// This ensures the tab panel remains visible when editing labels in tab-list.
		if (isActiveTab) {
			return true;
		}
		return false;
	}, [
		inQueryLoop,
		isQueryMode,
		isSelected,
		hasInnerBlocksSelected,
		isActiveTab,
	]);

	const blockProps = useBlockProps({
		...(!inQueryLoop && !isQueryMode
			? {
					hidden: !isSelectedTab,
					tabIndex: isSelectedTab ? 0 : -1,
				}
			: {}),
		className: clsx({
			'is-active': isActiveTab && !inQueryLoop && !isQueryMode,
		}),
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: inQueryLoop ? QUERY_TEMPLATE : TEMPLATE,
	});

	return (
		<section {...innerBlocksProps}>
			{!inQueryLoop && !isQueryMode && (
				<InspectorControls>
					<PanelBody title={__('Settings', 'matter')}>
						<ToggleControl
							label={__('Default tab', 'matter')}
							help={__('Open this tab by default.', 'matter')}
							checked={isDefaultTab}
							onChange={(value) => {
								updateBlockAttributes(tabsClientId, {
									activeTabIndex: value ? blockIndex : 0,
								});
							}}
						/>
					</PanelBody>
				</InspectorControls>
			)}

			{(inQueryLoop || isQueryMode || isSelectedTab) &&
				innerBlocksProps.children}
		</section>
	);
}
