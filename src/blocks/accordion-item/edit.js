/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import clsx from 'clsx';

const TEMPLATE = [
	['matter/accordion-heading'],
	[
		'matter/accordion-panel',
		{},
		[
			[
				'core/paragraph',
				{
					placeholder: __('Type / to add content…', 'matter'),
				},
			],
		],
	],
];

const QUERY_TEMPLATE = [
	['matter/accordion-heading'],
	[
		'matter/accordion-panel',
		{},
		[
			['core/post-featured-image', { isLink: true, aspectRatio: '16/9' }],
			['core/post-title'],
			['core/post-excerpt'],
		],
	],
];

export default function Edit({
	attributes,
	setAttributes,
	clientId,
	isSelected: isSingleSelected,
}) {
	const { openByDefault, inQueryLoop } = attributes;

	const queryLoopParents = useSelect(
		(select) =>
			select(blockEditorStore).getBlockParentsByBlockName(
				clientId,
				'core/query'
			),
		[clientId]
	);
	const { accordionClientId, isFirstItem } = useSelect(
		(select) => {
			const { getBlockRootClientId, getBlocks } =
				select(blockEditorStore);
			const parentClientId = getBlockRootClientId(clientId);
			const siblings = parentClientId ? getBlocks(parentClientId) : [];
			const firstAccordionItem = siblings.find(
				(block) => block.name === 'matter/accordion-item'
			);

			return {
				accordionClientId: parentClientId,
				isFirstItem: firstAccordionItem?.clientId === clientId,
			};
		},
		[clientId]
	);
	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	useEffect(() => {
		const isWithinQueryLoop = queryLoopParents.length > 0;

		if (isWithinQueryLoop !== inQueryLoop) {
			__unstableMarkNextChangeAsNotPersistent();
			setAttributes({ inQueryLoop: isWithinQueryLoop });
		}
	}, [
		inQueryLoop,
		queryLoopParents,
		setAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	]);

	const syncOpenByDefault = (value) => {
		setAttributes({ openByDefault: value });

		if (isFirstItem && accordionClientId) {
			updateBlockAttributes(accordionClientId, {
				openFirstItem: value,
			});
		}
	};

	const { isSelected } = useSelect(
		(select) => {
			if (isSingleSelected || openByDefault || inQueryLoop) {
				return { isSelected: true };
			}

			return {
				isSelected: select(blockEditorStore).hasSelectedInnerBlock(
					clientId,
					true
				),
			};
		},
		[clientId, isSingleSelected, openByDefault, inQueryLoop]
	);

	const blockProps = useBlockProps({
		className: clsx({
			'is-open': openByDefault || isSelected,
		}),
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: inQueryLoop ? QUERY_TEMPLATE : TEMPLATE,
		templateLock: 'all',
		directInsert: true,
		templateInsertUpdatesSelection: true,
	});

	return (
		<>
			{!inQueryLoop && (
				<InspectorControls>
					<ToolsPanel
						label={__('Settings', 'matter')}
						resetAll={() => syncOpenByDefault(false)}
					>
						<ToolsPanelItem
							hasValue={() => !!openByDefault}
							label={__('Open by default', 'matter')}
							onDeselect={() => syncOpenByDefault(false)}
							isShownByDefault
						>
							<ToggleControl
								__nextHasNoMarginBottom
								label={__('Open by default', 'matter')}
								help={__(
									'Accordion content will be displayed by default.',
									'matter'
								)}
								checked={openByDefault}
								onChange={syncOpenByDefault}
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</InspectorControls>
			)}
			<div {...innerBlocksProps} />
		</>
	);
}
