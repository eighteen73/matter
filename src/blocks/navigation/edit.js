import {
	BlockControls,
	InspectorControls,
	useBlockEditContext,
	useBlockProps,
} from '@wordpress/block-editor';
import { useEntityRecords } from '@wordpress/core-data';
import {
	ExternalLink,
	SelectControl,
	PanelBody,
	Spinner,
	ToggleControl,
	ToolbarButton,
} from '@wordpress/components';
import {
	createInterpolateElement,
	useEffect,
	useMemo,
	useRef,
} from '@wordpress/element';
import { useServerSideRender } from '@wordpress/server-side-render';
import { __, sprintf } from '@wordpress/i18n';

import ColorControl from '../../components/color-control';
import { getColorStyles, storeColorValue } from '../../utils/colors';

/**
 * Extract menu list markup from the editor SSR response.
 *
 * Core layout support adds classes to the first tag in rendered block HTML.
 * We wrap the list in a throwaway div server-side so layout classes stay off the ul.
 *
 * @param {string} html Server-rendered block HTML.
 * @return {string} List markup for the nav wrapper.
 */
function extractNavigationListMarkup(html) {
	if (!html) {
		return '';
	}

	const match = html.match(
		/<ul\s+class="wp-block-matter-navigation__items"[^>]*>[\s\S]*<\/ul>/
	);

	return match ? match[0] : html;
}

function getMenuTitle(menu) {
	const renderedTitle = menu?.title?.rendered;

	if (typeof renderedTitle === 'string' && renderedTitle.length) {
		return renderedTitle;
	}

	return sprintf(
		/* translators: %d: menu ID. */
		__('Menu #%d', 'matter'),
		menu?.id || 0
	);
}

function useEditorPreviewInteractions(containerRef, options) {
	const { type, submenuOpensOnClick, previewSignature } = options;

	useEffect(() => {
		const container = containerRef.current;

		if (!container) {
			return undefined;
		}

		const setSubmenuOpen = (menuItem, isOpen) => {
			if (!menuItem) {
				return;
			}

			menuItem.classList.toggle('has-open-submenu', isOpen);

			const toggle = menuItem.querySelector(
				'.wp-block-matter-navigation__submenu-toggle'
			);
			const submenu = menuItem.querySelector(
				'.wp-block-matter-navigation__submenu'
			);

			if (toggle) {
				toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
			}

			if (submenu) {
				submenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
			}
		};

		const closeAllSubmenus = () => {
			container
				.querySelectorAll('.wp-block-navigation-item.has-child')
				.forEach((menuItem) => {
					setSubmenuOpen(menuItem, false);
				});
		};

		closeAllSubmenus();

		const handleClick = (event) => {
			const target = event.target;

			if (!target || target.nodeType !== 1) {
				return;
			}

			const link = target.closest(
				'.wp-block-navigation-item__content, .wp-block-matter-navigation__view-all'
			);
			if (link) {
				event.preventDefault();
			}

			const toggle = target.closest(
				'.wp-block-matter-navigation__submenu-toggle'
			);
			if (toggle) {
				event.preventDefault();
				const menuItem = toggle.closest(
					'.wp-block-navigation-item.has-child'
				);

				if (!menuItem) {
					return;
				}

				setSubmenuOpen(
					menuItem,
					!menuItem.classList.contains('has-open-submenu')
				);
				return;
			}

			const backButton = target.closest(
				'.wp-block-matter-navigation__back'
			);
			if (!backButton) {
				return;
			}

			event.preventDefault();
			const submenu = backButton.closest(
				'.wp-block-matter-navigation__submenu'
			);

			if (!submenu) {
				return;
			}

			const menuItem = submenu.closest(
				'.wp-block-navigation-item.has-child'
			);
			setSubmenuOpen(menuItem, false);
		};

		const shouldUseHover = type === 'simple' && !submenuOpensOnClick;

		const handleMouseOver = (event) => {
			if (
				!shouldUseHover ||
				!event.target ||
				event.target.nodeType !== 1
			) {
				return;
			}

			const menuItem = event.target.closest(
				'.wp-block-navigation-item.has-child'
			);

			if (!menuItem || !container.contains(menuItem)) {
				return;
			}

			if (
				event.relatedTarget &&
				event.relatedTarget.nodeType === 1 &&
				menuItem.contains(event.relatedTarget)
			) {
				return;
			}

			setSubmenuOpen(menuItem, true);
		};

		const handleMouseOut = (event) => {
			if (
				!shouldUseHover ||
				!event.target ||
				event.target.nodeType !== 1
			) {
				return;
			}

			const menuItem = event.target.closest(
				'.wp-block-navigation-item.has-child'
			);

			if (!menuItem || !container.contains(menuItem)) {
				return;
			}

			if (
				event.relatedTarget &&
				event.relatedTarget.nodeType === 1 &&
				menuItem.contains(event.relatedTarget)
			) {
				return;
			}

			setSubmenuOpen(menuItem, false);
		};

		container.addEventListener('click', handleClick);
		container.addEventListener('mouseover', handleMouseOver);
		container.addEventListener('mouseout', handleMouseOut);

		return () => {
			container.removeEventListener('click', handleClick);
			container.removeEventListener('mouseover', handleMouseOver);
			container.removeEventListener('mouseout', handleMouseOut);
		};
	}, [containerRef, previewSignature, submenuOpensOnClick, type]);
}

export default function Edit({ attributes, setAttributes, clientId }) {
	const {
		ref,
		type = 'simple',
		submenuOpensOnClick,
		showSubmenuLabel,
		showSubmenuViewAll,
		iconColor,
		accentColor,
		submenuTextColor,
		submenuBackgroundColor,
		backTextColor,
		backBackgroundColor,
		submenuIconColor,
		backIconColor,
		submenuDividerColor,
	} = attributes;
	const { __unstableLayoutClassNames = '' } = useBlockEditContext();
	const previewRef = useRef(null);
	const customColorStyles = useMemo(
		() => getColorStyles(attributes, 'navigation'),
		[attributes]
	);
	const blockProps = useBlockProps({
		ref: previewRef,
		style: customColorStyles,
	});
	const editorNavClassName = [
		blockProps.className,
		__unstableLayoutClassNames,
		`is-menu-type-${type}`,
		submenuOpensOnClick
			? 'is-submenu-opens-on-click'
			: 'is-submenu-opens-on-hover',
		type === 'drill-down' && showSubmenuLabel ? 'has-submenu-label' : '',
		type === 'drill-down' && showSubmenuViewAll
			? 'has-submenu-view-all'
			: '',
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
	const navigationEditorUrl = ref
		? `site-editor.php?postType=wp_navigation&postId=${ref}`
		: 'site-editor.php?postType=wp_navigation';

	const menuOptions = [
		{
			value: '0',
			label: __('Select a menu', 'matter'),
		},
		...(menus || []).map((menu) => ({
			value: String(menu.id),
			label: getMenuTitle(menu),
		})),
	];
	const menuTypeOptions = [
		{ value: 'simple', label: __('Simple', 'matter') },
		{ value: 'accordion', label: __('Accordion', 'matter') },
		{ value: 'drill-down', label: __('Drill-down', 'matter') },
	];
	const serverSideAttributes = useMemo(
		() => ({
			ref: attributes.ref,
			type: attributes.type,
			submenuOpensOnClick: attributes.submenuOpensOnClick,
			showSubmenuLabel: attributes.showSubmenuLabel,
			showSubmenuViewAll: attributes.showSubmenuViewAll,
		}),
		[
			attributes.ref,
			attributes.type,
			attributes.submenuOpensOnClick,
			attributes.showSubmenuLabel,
			attributes.showSubmenuViewAll,
		]
	);
	const { content: serverRenderedPreview = '', status: serverRenderStatus } =
		useServerSideRender({
			block: 'matter/navigation',
			attributes: serverSideAttributes,
			skipBlockSupportAttributes: true,
		});
	const menuListMarkup = useMemo(
		() => extractNavigationListMarkup(serverRenderedPreview),
		[serverRenderedPreview]
	);
	const hasServerRenderedPreview =
		typeof menuListMarkup === 'string' && menuListMarkup.length > 0;
	const previewSignature = useMemo(
		() =>
			JSON.stringify({
				serverSideAttributes,
				serverRenderedPreview,
			}),
		[serverSideAttributes, serverRenderedPreview]
	);

	useEditorPreviewInteractions(previewRef, {
		type,
		submenuOpensOnClick,
		previewSignature,
	});

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
						label={__('Edit navigation', 'matter')}
					>
						{__('Edit navigation', 'matter')}
					</ToolbarButton>
				</BlockControls>
			)}

			<InspectorControls group="settings">
				<PanelBody title={__('Settings', 'matter')}>
					{!hasResolved && <Spinner />}
					{hasResolved && (
						<SelectControl
							__next40pxDefaultSize
							label={__('Menu', 'matter')}
							help={
								ref
									? createInterpolateElement(
											__(
												'Edit menu items in the <a>Navigation editor</a>',
												'matter'
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
											'matter'
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
						label={__('Menu Type', 'matter')}
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
							label={__('Open submenus on click', 'matter')}
							help={__(
								'When disabled, simple menus can open on hover for pointer users.',
								'matter'
							)}
							checked={submenuOpensOnClick}
							onChange={(value) =>
								setAttributes({
									submenuOpensOnClick: !!value,
								})
							}
						/>
					)}
					{type === 'drill-down' && (
						<>
							<ToggleControl
								__nextHasNoMarginBottom
								label={__('Show submenu label', 'matter')}
								help={__(
									'Display the parent menu item name in the submenu.',
									'matter'
								)}
								checked={showSubmenuLabel}
								onChange={(value) =>
									setAttributes({
										showSubmenuLabel: !!value,
									})
								}
							/>
							<ToggleControl
								__nextHasNoMarginBottom
								label={__(
									'Show submenu view all link',
									'matter'
								)}
								help={__(
									'Display a link to the parent menu item in the submenu.',
									'matter'
								)}
								checked={showSubmenuViewAll}
								onChange={(value) =>
									setAttributes({
										showSubmenuViewAll: !!value,
									})
								}
							/>
						</>
					)}
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="color">
				<ColorControl
					label={__('Icon', 'matter')}
					value={iconColor}
					attributeName="iconColor"
					onChange={(value, slug) =>
						setAttributes({
							iconColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>

				<ColorControl
					label={__('Accent', 'matter')}
					value={accentColor}
					attributeName="accentColor"
					onChange={(value, slug) =>
						setAttributes({
							accentColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>

				<ColorControl
					label={__('Submenu text', 'matter')}
					value={submenuTextColor}
					attributeName="submenuTextColor"
					onChange={(value, slug) =>
						setAttributes({
							submenuTextColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>

				<ColorControl
					label={__('Submenu background', 'matter')}
					value={submenuBackgroundColor}
					attributeName="submenuBackgroundColor"
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
					label={__('Submenu icon', 'matter')}
					value={submenuIconColor}
					attributeName="submenuIconColor"
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
							label={__('Submenu divider', 'matter')}
							value={submenuDividerColor}
							attributeName="submenuDividerColor"
							onChange={(value, slug) =>
								setAttributes({
									submenuDividerColor: storeColorValue(
										slug,
										value
									),
								})
							}
							panelId={clientId}
						/>

						<ColorControl
							label={__('Back text', 'matter')}
							value={backTextColor}
							attributeName="backTextColor"
							onChange={(value, slug) =>
								setAttributes({
									backTextColor: storeColorValue(slug, value),
								})
							}
							panelId={clientId}
						/>

						<ColorControl
							label={__('Back background', 'matter')}
							value={backBackgroundColor}
							attributeName="backBackgroundColor"
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
							label={__('Back icon', 'matter')}
							value={backIconColor}
							attributeName="backIconColor"
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
					<p className="wp-block-matter-navigation__empty">
						{__('Select a menu from the block settings.', 'matter')}
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
			{!!ref && hasResolved && serverRenderStatus === 'loading' && (
				<nav
					{...blockProps}
					className={editorNavClassName || undefined}
				>
					<Spinner />
				</nav>
			)}
			{!!ref && hasResolved && serverRenderStatus === 'error' && (
				<nav
					{...blockProps}
					className={editorNavClassName || undefined}
				>
					<p className="wp-block-matter-navigation__empty">
						{__(
							'The selected menu could not be loaded. Please reselect it from block settings.',
							'matter'
						)}
					</p>
				</nav>
			)}
			{!!ref &&
				hasResolved &&
				serverRenderStatus !== 'loading' &&
				serverRenderStatus !== 'error' &&
				!hasServerRenderedPreview && (
					<nav
						{...blockProps}
						className={editorNavClassName || undefined}
					>
						<p className="wp-block-matter-navigation__empty">
							{__('This menu has no items yet.', 'matter')}
						</p>
					</nav>
				)}
			{!!ref &&
				hasResolved &&
				serverRenderStatus !== 'loading' &&
				serverRenderStatus !== 'error' &&
				hasServerRenderedPreview && (
					<nav
						{...blockProps}
						className={editorNavClassName || undefined}
						dangerouslySetInnerHTML={{
							__html: menuListMarkup,
						}}
					/>
				)}
		</>
	);
}
