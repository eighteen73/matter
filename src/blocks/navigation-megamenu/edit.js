/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	BlockControls,
	InspectorControls,
	RichText,
	store as blockEditorStore,
	useBlockProps,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalLinkControl as LinkControl,
} from '@wordpress/block-editor';
import { useViewportMatch } from '@wordpress/compose';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import {
	Button,
	CheckboxControl,
	Notice,
	Popover,
	TextControl,
	ToolbarButton,
	ToolbarGroup,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOptionIcon as ToggleGroupControlOptionIcon,
} from '@wordpress/components';
import {
	alignNone,
	external,
	link as linkIcon,
	stretchFullWidth,
	stretchWide,
} from '@wordpress/icons';

/**
 * Internal dependencies
 */
import TemplateSelector from './components/template-selector';
import LinkPicker from './components/link-picker';
import useLinkPreview from './hooks/use-link-preview';
import useMegamenuTemplates from './hooks/use-megamenu-templates';
import { getSuggestionsQuery, isHashLink, isRelativePath } from './utils/link';

/**
 * Dropdown menu props for inspector ToolsPanels, matching core Submenu.
 *
 * @return {Object} Dropdown menu props.
 */
function useToolsPanelDropdownMenuProps() {
	const isMobile = useViewportMatch('medium', '<');

	return !isMobile
		? {
				popoverProps: {
					placement: 'left-start',
					offset: 259,
				},
			}
		: {};
}

/**
 * The megamenu block editor.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @param {Object}   props.context       Block context from Navigation.
 * @param {string}   props.clientId      Block client ID.
 * @param {boolean}  props.isSelected    Whether the block is selected.
 * @return {Element} Element to render.
 */
export default function Edit({
	attributes,
	setAttributes,
	context = {},
	clientId,
	isSelected,
}) {
	const {
		label,
		url,
		id,
		kind,
		type,
		opensInNewTab,
		menuSlug,
		width = 'content',
	} = attributes;
	const { showSubmenuIcon = true, openSubmenusOnClick = false } = context;
	const isLinkEditable = !openSubmenusOnClick;
	const [isLinkOpen, setIsLinkOpen] = useState(false);
	const [popoverAnchor, setPopoverAnchor] = useState(null);
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();
	const { isMissing: isMissingMegamenu } = useMegamenuTemplates(menuSlug);
	const preview = useLinkPreview({
		url,
		type,
		attributes,
	});

	const { layout, homeUrl } = useSelect((select) => {
		return {
			layout: select(blockEditorStore).getSettings()
				?.__experimentalFeatures?.layout,
			homeUrl: select(coreStore).getEntityRecord('root', '__unstableBase')
				?.home,
		};
	}, []);

	useEffect(() => {
		if (!label || !label.trim()) {
			return;
		}

		if (attributes.metadata?.name === label) {
			return;
		}

		setAttributes({
			metadata: {
				...(attributes.metadata || {}),
				name: label,
			},
		});
	}, [label, attributes.metadata, setAttributes]);

	const blockProps = useBlockProps({
		ref: setPopoverAnchor,
		className: clsx('wp-block-navigation-item', {
			'is-editing': isSelected,
			'has-link': !!url,
		}),
	});

	const widthOptions = [
		{
			value: 'content',
			icon: alignNone,
			label: layout?.contentSize
				? sprintf(
						/* translators: %s: theme content size. */
						__('Content width (%s)', 'matter'),
						layout.contentSize
					)
				: __('Content width', 'matter'),
		},
		{
			value: 'wide',
			icon: stretchWide,
			label: layout?.wideSize
				? sprintf(
						/* translators: %s: theme wide size. */
						__('Wide width (%s)', 'matter'),
						layout.wideSize
					)
				: __('Wide width', 'matter'),
		},
		{
			value: 'full',
			icon: stretchFullWidth,
			label: __('Full width', 'matter'),
		},
	];

	const handleLinkChange = (nextValue) => {
		if (!nextValue) {
			return;
		}

		const nextType = nextValue.type === 'post_tag' ? 'tag' : nextValue.type;
		const isBuiltInType = ['post', 'page', 'tag', 'category'].includes(
			nextType
		);
		const isCustomLink =
			(!nextValue.kind && !isBuiltInType) || nextValue.kind === 'custom';
		const nextAttributes = {
			url: nextValue.url || '',
			id: nextValue.id,
			kind: isCustomLink ? 'custom' : nextValue.kind,
			type: nextType && nextType !== 'URL' ? nextType : undefined,
		};

		if (typeof nextValue.opensInNewTab === 'boolean') {
			nextAttributes.opensInNewTab = nextValue.opensInNewTab;
		}

		if (!label && nextValue.title) {
			nextAttributes.label = nextValue.title;
		}

		setAttributes(nextAttributes);
	};

	const handleLinkRemove = () => {
		setAttributes({
			url: '',
			id: undefined,
			kind: undefined,
			type: undefined,
			opensInNewTab: false,
		});
	};

	const isViewableUrl =
		!!url &&
		(!isHashLink(url) || (isRelativePath(url) && !url.startsWith('/')));
	const viewUrl =
		isViewableUrl && url.startsWith('/') && homeUrl ? homeUrl + url : url;
	const linkValue = url
		? {
				url,
				title: label,
				id,
				kind,
				type,
			}
		: undefined;

	return (
		<>
			{isLinkEditable && (
				<BlockControls group="block">
					<ToolbarGroup>
						<ToolbarButton
							name="link"
							icon={linkIcon}
							title={__('Link', 'matter')}
							onClick={() => setIsLinkOpen(true)}
							isActive={!!url}
						/>
					</ToolbarGroup>
				</BlockControls>
			)}

			{isLinkEditable && isLinkOpen && (
				<Popover
					placement="bottom"
					onClose={() => setIsLinkOpen(false)}
					anchor={popoverAnchor}
					shift
				>
					<LinkControl
						value={
							url
								? {
										...linkValue,
										opensInNewTab,
									}
								: undefined
						}
						onChange={(nextValue) => {
							handleLinkChange(nextValue);
							setIsLinkOpen(false);
						}}
						onRemove={() => {
							handleLinkRemove();
							setIsLinkOpen(false);
						}}
					/>
				</Popover>
			)}

			<InspectorControls>
				{isMissingMegamenu && (
					<Notice status="warning" isDismissible={false}>
						{__(
							'The selected megamenu template part no longer exists. Choose another.',
							'matter'
						)}
					</Notice>
				)}
			</InspectorControls>

			<InspectorControls group="content">
				<ToolsPanel
					label={__('Settings', 'matter')}
					panelId={clientId}
					dropdownMenuProps={dropdownMenuProps}
					resetAll={() =>
						setAttributes({
							label: '',
							url: '',
							id: undefined,
							kind: undefined,
							type: undefined,
							opensInNewTab: false,
							menuSlug: '',
							width: 'content',
						})
					}
				>
					<ToolsPanelItem
						label={__('Text', 'matter')}
						hasValue={() => !!label}
						onDeselect={() => setAttributes({ label: '' })}
						isShownByDefault
						panelId={clientId}
					>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Text', 'matter')}
							value={label ? label.replace(/<[^>]*>/g, '') : ''}
							onChange={(value) =>
								setAttributes({ label: value })
							}
							autoComplete="off"
						/>
					</ToolsPanelItem>
					{isLinkEditable && (
						<>
							<ToolsPanelItem
								label={__('Link to', 'matter')}
								hasValue={() => !!url}
								onDeselect={handleLinkRemove}
								isShownByDefault
								panelId={clientId}
							>
								<LinkPicker
									preview={preview}
									onSelect={handleLinkChange}
									suggestionsQuery={getSuggestionsQuery(
										type,
										kind
									)}
									label={__('Link to', 'matter')}
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={__('Open in new tab', 'matter')}
								hasValue={() => !!opensInNewTab}
								onDeselect={() =>
									setAttributes({ opensInNewTab: false })
								}
								isShownByDefault
								panelId={clientId}
							>
								<CheckboxControl
									__nextHasNoMarginBottom
									label={__('Open in new tab', 'matter')}
									checked={!!opensInNewTab}
									onChange={(value) =>
										setAttributes({
											opensInNewTab: !!value,
										})
									}
								/>
							</ToolsPanelItem>
							{isViewableUrl && (
								<Button
									__next40pxDefaultSize
									className="navigation-link-to__action-button"
									variant="secondary"
									href={viewUrl}
									target="_blank"
									icon={external}
									iconPosition="right"
								>
									{__('View', 'matter')}
								</Button>
							)}
						</>
					)}
					<ToolsPanelItem
						label={__('Template', 'matter')}
						hasValue={() => !!menuSlug}
						onDeselect={() => setAttributes({ menuSlug: '' })}
						isShownByDefault
						panelId={clientId}
					>
						<TemplateSelector
							value={menuSlug}
							onChange={(value) =>
								setAttributes({ menuSlug: value || '' })
							}
							itemLabel={label}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={__('Width', 'matter')}
						hasValue={() => width && width !== 'content'}
						onDeselect={() => setAttributes({ width: 'content' })}
						isShownByDefault
						panelId={clientId}
					>
						<ToggleGroupControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							isBlock
							label={__('Width', 'matter')}
							value={width}
							onChange={(nextWidth) =>
								setAttributes({ width: nextWidth || 'content' })
							}
							help={
								width === 'content'
									? __(
											'The panel is sized to the theme content width and centered on this menu item.',
											'matter'
										)
									: __(
											'The panel is sized to the viewport and centered in the browser.',
											'matter'
										)
							}
						>
							{widthOptions.map((option) => (
								<ToggleGroupControlOptionIcon
									key={option.value}
									value={option.value}
									icon={option.icon}
									label={option.label}
								/>
							))}
						</ToggleGroupControl>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<div {...blockProps}>
				<span className="wp-block-navigation-item__content">
					<RichText
						identifier="label"
						className="wp-block-navigation-item__label"
						value={label}
						onChange={(value) => setAttributes({ label: value })}
						aria-label={__('Megamenu link text', 'matter')}
						placeholder={__('Add label…', 'matter')}
						withoutInteractiveFormatting
						onFocus={() => setIsLinkOpen(false)}
					/>
				</span>
				{showSubmenuIcon && (
					<span
						className="wp-block-matter-navigation-megamenu__toggle-icon"
						aria-hidden="true"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
							focusable="false"
						>
							<path d="M1.5 4L6 8L10.5 4" strokeWidth="1.5" />
						</svg>
					</span>
				)}
			</div>
		</>
	);
}
