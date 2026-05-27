import {
	BlockControls,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import { useEntityRecord, useEntityRecords } from '@wordpress/core-data';
import {
	ExternalLink,
	SelectControl,
	PanelBody,
	Spinner,
	ToggleControl,
	ToolbarButton,
} from '@wordpress/components';
import { parse } from '@wordpress/blocks';
import {
	createInterpolateElement,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import ColorControl from '../../components/color-control';
import { getColorStyles, storeColorValue } from '../../utils/colors';

function getMenuTitle(menu) {
	const renderedTitle = menu?.title?.rendered;

	if (typeof renderedTitle === 'string' && renderedTitle.length) {
		return renderedTitle;
	}

	return sprintf(
		/* translators: %d: menu ID. */
		__('Menu #%d', 'eighteen73-blocks'),
		menu?.id || 0
	);
}

/**
 * Build link attributes for preview links.
 *
 * @param {Object} attributes Navigation item attributes.
 * @return {Object} Link display and attribute values.
 */
function getPreviewLinkAttributes(attributes = {}) {
	const label =
		typeof attributes.label === 'string' && attributes.label.length
			? attributes.label
			: __('Untitled menu item', 'eighteen73-blocks');
	const url =
		typeof attributes.url === 'string' && attributes.url.length
			? attributes.url
			: '#';
	const target = attributes.opensInNewTab ? '_blank' : undefined;
	let rel = typeof attributes.rel === 'string' ? attributes.rel.trim() : '';

	if (attributes.opensInNewTab) {
		rel = `${rel} noopener noreferrer`.trim();
	}

	return {
		label,
		url,
		target,
		rel: rel || undefined,
	};
}

/**
 * Parse serialized navigation content to blocks.
 *
 * @param {Object} menu Selected navigation menu entity.
 * @return {Array} Parsed blocks.
 */
function getParsedNavigationBlocks(menu) {
	const content = menu?.content?.raw || '';

	if (typeof content !== 'string' || !content.length) {
		return [];
	}

	try {
		return parse(content);
	} catch (error) {
		return [];
	}
}

/**
 * Render preview item markup recursively.
 *
 * @param {Object} props Component props.
 * @return {JSX.Element|null} Preview items.
 */
function NavigationPreviewItems(props) {
	const {
		blocks,
		type,
		submenuOpensOnClick,
		openSubmenus,
		setOpenSubmenus,
		pathPrefix = '',
	} = props;

	return blocks.map((parsedBlock, index) => {
		const blockName = parsedBlock?.name || parsedBlock?.blockName || '';
		const attributes = parsedBlock?.attributes || parsedBlock?.attrs || {};
		const itemPath = `${pathPrefix}${index}`;

		if (blockName === 'core/navigation-link') {
			const { label, url, target, rel } =
				getPreviewLinkAttributes(attributes);

			return (
				<li key={itemPath} className="wp-block-navigation-item">
					<a
						className="wp-block-navigation-item__content"
						href={url}
						target={target}
						rel={rel}
						onClick={(event) => event.preventDefault()}
					>
						{label}
					</a>
				</li>
			);
		}

		if (blockName !== 'core/navigation-submenu') {
			return null;
		}

		const children = Array.isArray(parsedBlock?.innerBlocks)
			? parsedBlock.innerBlocks
			: [];
		const { label, url, target, rel } =
			getPreviewLinkAttributes(attributes);
		const hasChildren = children.length > 0;
		const submenuId = `preview-submenu-${itemPath}`;
		const isOpen = openSubmenus.includes(itemPath);
		const showHoverMode = type === 'simple' && !submenuOpensOnClick;
		const liClassName = [
			'wp-block-navigation-item',
			'has-child',
			isOpen ? 'has-open-submenu' : '',
		]
			.filter(Boolean)
			.join(' ');

		const toggleSubmenu = () => {
			setOpenSubmenus((currentOpenSubmenus) => {
				if (currentOpenSubmenus.includes(itemPath)) {
					return currentOpenSubmenus.filter((id) => id !== itemPath);
				}

				return [...currentOpenSubmenus, itemPath];
			});
		};

		const closeSubmenu = () => {
			setOpenSubmenus((currentOpenSubmenus) =>
				currentOpenSubmenus.filter((id) => id !== itemPath)
			);
		};

		if (!hasChildren) {
			return (
				<li key={itemPath} className="wp-block-navigation-item">
					<a
						className="wp-block-navigation-item__content"
						href={url}
						target={target}
						rel={rel}
						onClick={(event) => event.preventDefault()}
					>
						{label}
					</a>
				</li>
			);
		}

		return (
			<li
				key={itemPath}
				className={liClassName}
				{...(showHoverMode
					? {
							onMouseEnter: toggleSubmenu,
							onMouseLeave: closeSubmenu,
						}
					: {})}
			>
				<a
					className="wp-block-navigation-item__content"
					href={url}
					target={target}
					rel={rel}
					onClick={(event) => event.preventDefault()}
				>
					{label}
				</a>
				<button
					type="button"
					className="wp-block-eighteen73-navigation__submenu-toggle"
					onClick={toggleSubmenu}
					aria-expanded={isOpen}
					aria-controls={submenuId}
					aria-label={sprintf(
						/* translators: %s: menu item label. */
						__('Toggle submenu for %s', 'eighteen73-blocks'),
						label
					)}
				>
					<span className="wp-block-eighteen73-navigation__submenu-toggle-text">
						{label}
					</span>
				</button>
				<div
					id={submenuId}
					className="wp-block-eighteen73-navigation__submenu"
					aria-hidden={!isOpen}
					{...(type === 'drill-down' ? { tabIndex: -1 } : {})}
				>
					{type === 'drill-down' && (
						<button
							type="button"
							className="wp-block-eighteen73-navigation__back"
							onClick={closeSubmenu}
						>
							{__('Back', 'eighteen73-blocks')}
						</button>
					)}
					<ul className="wp-block-navigation__submenu-container">
						<NavigationPreviewItems
							blocks={children}
							type={type}
							submenuOpensOnClick={submenuOpensOnClick}
							openSubmenus={openSubmenus}
							setOpenSubmenus={setOpenSubmenus}
							pathPrefix={`${itemPath}-`}
						/>
					</ul>
				</div>
			</li>
		);
	});
}

/**
 * Render read-only navigation preview.
 *
 * @param {Object} props Component props.
 * @return {JSX.Element} Navigation preview markup.
 */
function NavigationPreview(props) {
	const { menu, colorStyles, type, submenuOpensOnClick } = props;
	const [openSubmenus, setOpenSubmenus] = useState([]);
	const blocks = useMemo(() => getParsedNavigationBlocks(menu), [menu]);
	const navClassName = [`is-menu-type-${type}`];

	navClassName.push(
		submenuOpensOnClick
			? 'is-submenu-opens-on-click'
			: 'is-submenu-opens-on-hover'
	);

	useEffect(() => {
		setOpenSubmenus([]);
	}, [menu?.id, type, submenuOpensOnClick]);

	if (!blocks.length) {
		return (
			<nav style={colorStyles} className={navClassName.join(' ')}>
				<p className="wp-block-eighteen73-navigation__empty">
					{__('This menu has no items yet.', 'eighteen73-blocks')}
				</p>
			</nav>
		);
	}

	return (
		<nav style={colorStyles} className={navClassName.join(' ')}>
			<ul className="wp-block-eighteen73-navigation__container">
				<NavigationPreviewItems
					blocks={blocks}
					type={type}
					submenuOpensOnClick={submenuOpensOnClick}
					openSubmenus={openSubmenus}
					setOpenSubmenus={setOpenSubmenus}
				/>
			</ul>
		</nav>
	);
}

export default function Edit({ attributes, setAttributes, clientId }) {
	const {
		ref,
		type = 'simple',
		submenuOpensOnClick,
		submenuTextColor,
		submenuBackgroundColor,
		backTextColor,
		backBackgroundColor,
		submenuIconColor,
		backIconColor,
	} = attributes;
	const colorStyles = getColorStyles(attributes, 'navigation');
	const blockProps = useBlockProps({ style: colorStyles });
	const editorNavClassName = [
		blockProps.className,
		`is-menu-type-${type}`,
		submenuOpensOnClick
			? 'is-submenu-opens-on-click'
			: 'is-submenu-opens-on-hover',
	]
		.filter(Boolean)
		.join(' ');
	const { records: menus, hasResolved } = useEntityRecords(
		'postType',
		'wp_navigation',
		{
			per_page: -1,
			orderby: 'title',
			order: 'asc',
			context: 'edit',
			status: ['publish', 'draft'],
		}
	);
	const { records: selectedMenuRecords } = useEntityRecords(
		'postType',
		'wp_navigation',
		{
			per_page: 1,
			include: ref ? [ref] : [],
			context: 'edit',
			status: ['publish', 'draft'],
		}
	);
	const { record: selectedMenu, isResolving: isResolvingSelectedMenu } =
		useEntityRecord('postType', 'wp_navigation', ref || 0, {
			context: 'edit',
		});
	const navigationEditorUrl = ref
		? `site-editor.php?postType=wp_navigation&postId=${ref}`
		: 'site-editor.php?postType=wp_navigation';
	const selectedMenuFromList = Array.isArray(menus)
		? menus.find((menu) => menu.id === ref) || null
		: null;
	const selectedMenuFromInclude = Array.isArray(selectedMenuRecords)
		? selectedMenuRecords[0] || null
		: null;
	const effectiveSelectedMenu =
		selectedMenu || selectedMenuFromInclude || selectedMenuFromList || null;

	const menuOptions = [
		{
			value: '0',
			label: __('Select a menu', 'eighteen73-blocks'),
		},
		...(menus || []).map((menu) => ({
			value: String(menu.id),
			label: getMenuTitle(menu),
		})),
	];
	const menuTypeOptions = [
		{ value: 'simple', label: __('Simple', 'eighteen73-blocks') },
		{ value: 'accordion', label: __('Accordion', 'eighteen73-blocks') },
		{ value: 'drill-down', label: __('Drill-down', 'eighteen73-blocks') },
	];

	return (
		<>
			{!!ref && (
				<BlockControls group="block">
					<ToolbarButton
						as="a"
						href={navigationEditorUrl}
						target="_blank"
						rel="noopener noreferrer"
						showTooltip
						label={__('Edit navigation', 'eighteen73-blocks')}
					>
						{__('Edit navigation', 'eighteen73-blocks')}
					</ToolbarButton>
				</BlockControls>
			)}

			<InspectorControls group="settings">
				<PanelBody title={__('Settings', 'eighteen73-blocks')}>
					{!hasResolved && <Spinner />}
					{hasResolved && (
						<SelectControl
							__next40pxDefaultSize
							label={__('Menu', 'eighteen73-blocks')}
							help={
								ref
									? createInterpolateElement(
											__(
												'Edit menu items in the <a>Navigation editor</a>',
												'eighteen73-blocks'
											),
											{
												a: (
													<ExternalLink
														href={
															navigationEditorUrl
														}
													/>
												),
											}
										)
									: __(
											'Select a navigation menu to display.',
											'eighteen73-blocks'
										)
							}
							options={menuOptions}
							value={ref}
							onChange={(value) =>
								setAttributes({
									ref: Number(value) || 0,
								})
							}
						/>
					)}
					<SelectControl
						__next40pxDefaultSize
						label={__('Menu Type', 'eighteen73-blocks')}
						options={menuTypeOptions}
						value={type}
						onChange={(value) =>
							setAttributes({
								type: value || 'simple',
							})
						}
					/>
					{!!ref && (
						<ToggleControl
							__nextHasNoMarginBottom
							label={__(
								'Open submenus on click',
								'eighteen73-blocks'
							)}
							help={__(
								'When disabled, simple menus can open on hover for pointer users.',
								'eighteen73-blocks'
							)}
							checked={submenuOpensOnClick}
							onChange={(value) =>
								setAttributes({
									submenuOpensOnClick: !!value,
								})
							}
						/>
					)}
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="color">
				<ColorControl
					label={__('Submenu text', 'eighteen73-blocks')}
					value={submenuTextColor}
					onChange={(value, slug) =>
						setAttributes({
							submenuTextColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>
				<ColorControl
					label={__('Submenu background', 'eighteen73-blocks')}
					value={submenuBackgroundColor}
					onChange={(value, slug) =>
						setAttributes({
							submenuBackgroundColor: storeColorValue(
								slug,
								value
							),
						})
					}
					panelId={clientId}
				/>

				<ColorControl
					label={__('Submenu icon', 'eighteen73-blocks')}
					value={submenuIconColor}
					onChange={(value, slug) =>
						setAttributes({
							submenuIconColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>

				{type === 'drill-down' && (
					<>
						<ColorControl
							label={__('Back text', 'eighteen73-blocks')}
							value={backTextColor}
							onChange={(value, slug) =>
								setAttributes({
									backTextColor: storeColorValue(slug, value),
								})
							}
							panelId={clientId}
						/>

						<ColorControl
							label={__('Back background', 'eighteen73-blocks')}
							value={backBackgroundColor}
							onChange={(value, slug) =>
								setAttributes({
									backBackgroundColor: storeColorValue(
										slug,
										value
									),
								})
							}
							panelId={clientId}
						/>

						<ColorControl
							label={__('Back icon', 'eighteen73-blocks')}
							value={backIconColor}
							onChange={(value, slug) =>
								setAttributes({
									backIconColor: storeColorValue(slug, value),
								})
							}
							panelId={clientId}
						/>
					</>
				)}
			</InspectorControls>

			{!ref && (
				<nav
					{...blockProps}
					className={editorNavClassName || undefined}
				>
					<p className="wp-block-eighteen73-navigation__empty">
						{__(
							'Select a menu from the block settings.',
							'eighteen73-blocks'
						)}
					</p>
				</nav>
			)}
			{!!ref && !hasResolved && (
				<nav
					{...blockProps}
					className={editorNavClassName || undefined}
				>
					<Spinner />
				</nav>
			)}
			{!!ref && hasResolved && isResolvingSelectedMenu && (
				<nav
					{...blockProps}
					className={editorNavClassName || undefined}
				>
					<Spinner />
				</nav>
			)}
			{!!ref &&
				hasResolved &&
				!isResolvingSelectedMenu &&
				!effectiveSelectedMenu && (
					<nav
						{...blockProps}
						className={editorNavClassName || undefined}
					>
						<p className="wp-block-eighteen73-navigation__empty">
							{__(
								'The selected menu could not be loaded. Please reselect it from block settings.',
								'eighteen73-blocks'
							)}
						</p>
					</nav>
				)}
			{!!ref &&
				hasResolved &&
				!isResolvingSelectedMenu &&
				!!effectiveSelectedMenu && (
					<div {...blockProps}>
						<NavigationPreview
							menu={effectiveSelectedMenu}
							colorStyles={colorStyles}
							type={type}
							submenuOpensOnClick={submenuOpensOnClick}
						/>
					</div>
				)}
		</>
	);
}
