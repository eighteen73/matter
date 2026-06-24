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
import {
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { useMemo, useEffect } from '@wordpress/element';
import clsx from 'clsx';

/**
 * Internal dependencies
 */
import {
	findTabsClientId,
	getTabPanelIndex,
} from '../tabs/utils/query-tabs-list';
import { useEffectiveActiveTabIndex } from '../tabs/utils/use-effective-active-tab-index';

const TEMPLATE = [
	[
		'core/paragraph',
		{
			placeholder: __('Type / to choose a block', 'matter'),
		},
	],
];

const QUERY_TEMPLATE = [['core/post-content']];

export default function Edit({ attributes, clientId, context, isSelected }) {
	const { inQueryLoop } = attributes;
	const isQueryMode = context['matter/tabs-isQueryMode'] ?? false;
	const effectiveActiveIndex = useEffectiveActiveTabIndex(context);
	const activeTabIndex = context['matter/tabs-activeTabIndex'];

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

	useEffect(() => {
		if (inQueryLoop || isQueryMode) {
			return;
		}

		const isTabSelected = isSelected || hasInnerBlocksSelected;
		if (
			isTabSelected &&
			tabsClientId &&
			effectiveActiveIndex !== blockIndex
		) {
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

	const isActiveTab = effectiveActiveIndex === blockIndex;
	const isDefaultTab = activeTabIndex === blockIndex;

	const isSelectedTab = useMemo(() => {
		if (inQueryLoop || isQueryMode) {
			return true;
		}

		if (isSelected || hasInnerBlocksSelected) {
			return true;
		}

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
					<ToolsPanel label={__('Settings', 'matter')}>
						<ToolsPanelItem
							hasValue={() => !!isDefaultTab}
							label={__('Default tab', 'matter')}
							onDeselect={() =>
								updateBlockAttributes(tabsClientId, {
									activeTabIndex: 0,
								})
							}
							isShownByDefault
						>
							<ToggleControl
								label={__('Default tab', 'matter')}
								help={__('Open this tab by default.', 'matter')}
								checked={isDefaultTab}
								onChange={(value) => {
									if (!value || !tabsClientId) {
										updateBlockAttributes(tabsClientId, {
											activeTabIndex: 0,
										});

										return;
									}

									updateBlockAttributes(tabsClientId, {
										activeTabIndex: blockIndex,
									});
								}}
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</InspectorControls>
			)}

			{(inQueryLoop || isQueryMode || isSelectedTab) &&
				innerBlocksProps.children}
		</section>
	);
}
