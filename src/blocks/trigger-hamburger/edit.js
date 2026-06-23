import { __, sprintf } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import {
	BlockControls,
	InspectorControls,
	useBlockProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	TextControl,
	ToggleControl,
	ToolbarButton,
	ToolbarGroup,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';

const COMPONENT_CONTEXTS = [
	{
		id: 'matter/modal-id',
		label: __('modal', 'matter'),
	},
	{
		id: 'matter/drawer-id',
		label: __('drawer', 'matter'),
	},
	{
		id: 'matter/collapsible-id',
		label: __('collapsible', 'matter'),
	},
];

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @param {Object}   props.context       Block context.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes, context, clientId }) {
	const { label, showLabel } = attributes;
	const target = COMPONENT_CONTEXTS.find(
		(component) => context[component.id]
	);
	const componentId = target ? context[target.id] : '';
	const componentLabel = target?.label ?? __('component', 'matter');
	const buttonLabel = label || __('Open menu', 'matter');

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

	const blockProps = useBlockProps({
		'aria-label': buttonLabel,
		'aria-expanded': isOpen,
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

	const toolbarLabel = useMemo(
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

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() =>
						setAttributes({ label: 'Open menu', showLabel: false })
					}
				>
					<ToolsPanelItem
						label={__('Label', 'matter')}
						hasValue={() => !!label && label !== 'Open menu'}
						onDeselect={() => setAttributes({ label: 'Open menu' })}
						isShownByDefault
					>
						<TextControl
							label={__('Label', 'matter')}
							value={label}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={__('Show label', 'matter')}
						hasValue={() => !!showLabel}
						onDeselect={() => setAttributes({ showLabel: false })}
						isShownByDefault
					>
						<ToggleControl
							label={__('Show label', 'matter')}
							checked={showLabel}
							onChange={(value) =>
								setAttributes({ showLabel: value })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			{componentId && (
				<BlockControls>
					<ToolbarGroup>
						<ToolbarButton
							label={toolbarLabel}
							aria-controls={componentId}
							onClick={toggleComponent}
						>
							{toolbarLabel}
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			)}

			<button {...blockProps} type="button">
				<span
					className="wp-block-matter-trigger-hamburger__icon"
					aria-hidden="true"
				/>
				{showLabel && (
					<span className="wp-block-matter-trigger-hamburger__label">
						{buttonLabel}
					</span>
				)}
			</button>
		</>
	);
}
