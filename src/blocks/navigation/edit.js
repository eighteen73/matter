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
		/<ul\s+class="wp-block-eighteen73-navigation__container"[^>]*>[\s\S]*<\/ul>/
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
		__('Menu #%d', 'eighteen73-blocks'),
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
				'.wp-block-eighteen73-navigation__submenu-toggle'
			);
			const submenu = menuItem.querySelector(
				'.wp-block-eighteen73-navigation__submenu'
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

			const link = target.closest('.wp-block-navigation-item__content');
			if (link) {
				event.preventDefault();
			}

			const toggle = target.closest(
				'.wp-block-eighteen73-navigation__submenu-toggle'
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
				'.wp-block-eighteen73-navigation__back'
			);
			if (!backButton) {
				return;
			}

			event.preventDefault();
			const submenu = backButton.closest(
				'.wp-block-eighteen73-navigation__submenu'
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
		submenuTextColor,
		submenuBackgroundColor,
		backTextColor,
		backBackgroundColor,
		submenuIconColor,
		backIconColor,
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
	const serverSideAttributes = useMemo(
		() => ({
			ref: attributes.ref,
			type: attributes.type,
			submenuOpensOnClick: attributes.submenuOpensOnClick,
		}),
		[attributes.ref, attributes.type, attributes.submenuOpensOnClick]
	);
	const { content: serverRenderedPreview = '', status: serverRenderStatus } =
		useServerSideRender({
			block: 'eighteen73/navigation',
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
					attributeName="submenuTextColor"
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
					label={__('Submenu icon', 'eighteen73-blocks')}
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
							label={__('Back text', 'eighteen73-blocks')}
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
							label={__('Back background', 'eighteen73-blocks')}
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
							label={__('Back icon', 'eighteen73-blocks')}
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
				serverRenderStatus !== 'loading' &&
				serverRenderStatus !== 'error' &&
				!hasServerRenderedPreview && (
					<nav
						{...blockProps}
						className={editorNavClassName || undefined}
					>
						<p className="wp-block-eighteen73-navigation__empty">
							{__(
								'This menu has no items yet.',
								'eighteen73-blocks'
							)}
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
