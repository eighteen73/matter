/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	RichText,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import {
	Button,
	PanelBody,
	TextControl,
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- Stable in practice since 6.2.
	__experimentalToggleGroupControlOption as ToggleGroupControlOption, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { safeHTML } from '@wordpress/dom';
import { plus, plusCircle } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { IconLibraryModal, useIcon } from '../../components/icon-picker';
import { ActiveTabContext } from './context';

function TabIcon({ name }) {
	const icon = useIcon(name);

	return icon?.content ? (
		<span
			className="wp-block-matter-tabs__icon"
			aria-hidden="true"
			dangerouslySetInnerHTML={{ __html: safeHTML(icon.content) }}
		/>
	) : null;
}

/**
 * The editable tab's icon: click it (or "Add icon" while editing) to choose
 * one from the icon library.
 *
 * @param {Object}   props
 * @param {string}   props.name      Icon name.
 * @param {boolean}  props.isEditing Whether the tabs block is being edited.
 * @param {Function} props.onChange  Called with an icon name ('' to remove).
 * @return {Element|null} Icon button.
 */
function TabIconPicker({ name, isEditing, onChange }) {
	const [isOpen, setIsOpen] = useState(false);

	if (!isEditing) {
		return <TabIcon name={name} />;
	}

	return (
		<>
			<Button
				className="matter-tabs-editor__icon-button"
				label={
					name
						? __('Change icon', 'matter')
						: __('Add icon', 'matter')
				}
				icon={name ? undefined : plusCircle}
				size="small"
				onClick={(event) => {
					event.stopPropagation();
					setIsOpen(true);
				}}
			>
				{name && <TabIcon name={name} />}
			</Button>
			{isOpen && (
				<IconLibraryModal
					value={name}
					onSelect={(value) => onChange(value)}
					onRemove={name ? () => onChange('') : undefined}
					onRequestClose={() => setIsOpen(false)}
				/>
			)}
		</>
	);
}

const ALLOWED_BLOCKS = ['matter/tab', 'core/query'];

export default function Edit({ attributes, setAttributes, clientId }) {
	const { label, deepLink, orientation, dropdown } = attributes;
	const [activeId, setActiveId] = useState(null);

	const { tabs, isQuery, isEditing } = useSelect(
		(select) => {
			const { getBlocks, isBlockSelected, hasSelectedInnerBlock } =
				select(blockEditorStore);
			const blocks = getBlocks(clientId);

			return {
				tabs: blocks.filter((block) => block.name === 'matter/tab'),
				isQuery: blocks.some((block) => block.name === 'core/query'),
				// Editor-only controls show while the block is being edited.
				isEditing:
					isBlockSelected(clientId) ||
					hasSelectedInnerBlock(clientId, true),
			};
		},
		[clientId]
	);
	const { insertBlock, updateBlockAttributes } =
		useDispatch(blockEditorStore);

	const currentId = tabs.some((tab) => tab.clientId === activeId)
		? activeId
		: tabs[0]?.clientId;

	const contextValue = useMemo(
		() => ({ activeId: isQuery ? null : currentId, setActiveId }),
		[currentId, isQuery]
	);

	const blockProps = useBlockProps({
		className: orientation === 'vertical' ? 'is-vertical' : undefined,
	});
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-matter-tabs__panels' },
		{
			allowedBlocks: ALLOWED_BLOCKS,
			template: [['matter/tab'], ['matter/tab']],
			renderAppender: false,
		}
	);

	const addTab = () => {
		const block = createBlock('matter/tab');

		insertBlock(block, tabs.length, clientId, false);
		setActiveId(block.clientId);
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={__('Name', 'matter')}
						help={__(
							'Describes the tab list to screen readers.',
							'matter'
						)}
						value={label}
						onChange={(value) => setAttributes({ label: value })}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Link to tabs', 'matter')}
						help={__(
							'Update the address bar when a tab is chosen, so it can be shared.',
							'matter'
						)}
						checked={deepLink}
						onChange={(value) => setAttributes({ deepLink: value })}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__(
							'Show as a dropdown on smaller screens',
							'matter'
						)}
						help={__(
							'Replace the tabs with a dropdown menu where there is less room.',
							'matter'
						)}
						checked={dropdown}
						onChange={(value) => setAttributes({ dropdown: value })}
					/>
					<ToggleGroupControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						isBlock
						label={__('Orientation', 'matter')}
						value={orientation}
						onChange={(value) =>
							setAttributes({ orientation: value })
						}
					>
						<ToggleGroupControlOption
							value="horizontal"
							label={__('Horizontal', 'matter')}
						/>
						<ToggleGroupControlOption
							value="vertical"
							label={__('Vertical', 'matter')}
						/>
					</ToggleGroupControl>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				{!isQuery && (
					<div
						className="wp-block-matter-tabs__list"
						role="tablist"
						aria-orientation={orientation}
					>
						{tabs.map((tab, index) => {
							const isActive = tab.clientId === currentId;

							return (
								<div
									key={tab.clientId}
									className="wp-block-matter-tabs__tab"
									role="tab"
									aria-selected={isActive}
									tabIndex={0}
									onClick={() => setActiveId(tab.clientId)}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											setActiveId(tab.clientId);
										}
									}}
								>
									{isActive ? (
										<TabIconPicker
											name={tab.attributes.icon}
											isEditing={isEditing}
											onChange={(icon) =>
												updateBlockAttributes(
													tab.clientId,
													{ icon }
												)
											}
										/>
									) : (
										<TabIcon name={tab.attributes.icon} />
									)}
									{isActive ? (
										<RichText
											tagName="span"
											className="wp-block-matter-tabs__label"
											value={tab.attributes.label}
											onChange={(value) =>
												updateBlockAttributes(
													tab.clientId,
													{ label: value }
												)
											}
											placeholder={sprintf(
												/* translators: %d: tab number */
												__('Tab %d', 'matter'),
												index + 1
											)}
											allowedFormats={[]}
										/>
									) : (
										<span className="wp-block-matter-tabs__label">
											{tab.attributes.label ||
												sprintf(
													/* translators: %d: tab number */
													__('Tab %d', 'matter'),
													index + 1
												)}
										</span>
									)}
								</div>
							);
						})}
						{isEditing && (
							<Button
								icon={plus}
								label={__('Add tab', 'matter')}
								onClick={addTab}
								size="small"
							/>
						)}
					</div>
				)}
				<ActiveTabContext.Provider value={contextValue}>
					<div {...innerBlocksProps} />
				</ActiveTabContext.Provider>
			</div>
		</>
	);
}
