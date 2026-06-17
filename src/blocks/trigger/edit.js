/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import {
	BlockControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';

const COMPONENT_CONTEXTS = [
	{
		type: 'modal',
		id: 'matter/modal-id',
		label: __('modal', 'matter'),
	},
	{
		type: 'drawer',
		id: 'matter/drawer-id',
		label: __('drawer', 'matter'),
	},
	{
		type: 'collapsible',
		id: 'matter/collapsible-id',
		label: __('collapsible', 'matter'),
	},
];

const TEMPLATE = [
	[
		'core/buttons',
		{},
		[
			[
				'core/button',
				{
					text: __('Open', 'matter'),
					tagName: 'button',
				},
			],
		],
	],
];

export default function Edit({ context, clientId }) {
	const target = COMPONENT_CONTEXTS.find(
		(component) => context[component.id]
	);
	const componentId = target ? context[target.id] : '';
	const componentLabel = target?.label ?? __('component', 'matter');

	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	const { parentClientId, parentAttributes } = useSelect(
		(select) => {
			const blockEditor = select(blockEditorStore);
			const rootClientId = blockEditor.getBlockRootClientId(clientId);

			return {
				parentClientId: rootClientId,
				parentAttributes: rootClientId
					? blockEditor.getBlockAttributes(rootClientId)
					: {},
			};
		},
		[clientId]
	);

	const isOpen = !!parentAttributes?.editorIsOpen;

	const blockProps = useBlockProps();

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: TEMPLATE,
		templateLock: 'insert',
		__experimentalCaptureToolbars: true,
	});

	const toggleComponent = () => {
		if (!parentClientId) {
			return;
		}

		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes(parentClientId, {
			editorIsOpen: !isOpen,
		});
	};

	const buttonLabel = useMemo(
		() =>
			isOpen
				? sprintf(
						/* translators: %s: The component type, for example modal, drawer, or collapsible. */
						__('Close %s', 'matter'),
						componentLabel
					)
				: sprintf(
						/* translators: %s: The component type, for example modal, drawer, or collapsible. */
						__('Open %s', 'matter'),
						componentLabel
					),
		[componentLabel, isOpen]
	);

	if (!componentId) {
		return <div {...innerBlocksProps} />;
	}

	return (
		<>
			<BlockControls __experimentalShareWithChildBlocks>
				<ToolbarGroup>
					<ToolbarButton
						label={buttonLabel}
						aria-controls={componentId}
						onClick={toggleComponent}
					>
						{buttonLabel}
					</ToolbarButton>
				</ToolbarGroup>
			</BlockControls>
			<div {...innerBlocksProps} />
		</>
	);
}
