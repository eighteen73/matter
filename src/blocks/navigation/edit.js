import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	EntityProvider,
	useEntityBlockEditor,
	useEntityRecords,
} from '@wordpress/core-data';
import {
	SelectControl,
	PanelBody,
	Spinner,
	ToggleControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

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
 * Renders the navigation menu inside the entity provider.
 *
 * Layout classes from useInnerBlocksProps (including wp-container-*) are applied
 * to <nav> so editor layout CSS matches the frontend wrapper.
 *
 * @param {Object} props Component props.
 * @return {JSX.Element} Navigation menu markup.
 */
function NavigationMenu(props) {
	const { type, submenuOpensOnClick } = props;
	const blockProps = useBlockProps();
	const [blocks, onInput, onChange] = useEntityBlockEditor(
		'postType',
		'wp_navigation'
	);

	// Do not pass className here — WordPress merges layout classes into this object.
	// We move them onto <nav> below and keep a fixed class on <ul> only.
	const innerBlocksProps = useInnerBlocksProps(
		{},
		{
			value: blocks,
			onInput,
			onChange,
			renderAppender: false,
		}
	);

	const {
		children,
		className: layoutClassName,
		...innerBlocksBindings
	} = innerBlocksProps;

	const navClassName = [
		blockProps.className,
		layoutClassName,
		`is-menu-type-${type}`,
		submenuOpensOnClick
			? 'is-submenu-opens-on-click'
			: 'is-submenu-opens-on-hover',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<nav {...blockProps} className={navClassName || undefined}>
			<ul
				className="wp-block-eighteen73-navigation__container"
				{...innerBlocksBindings}
			>
				{children}
			</ul>
		</nav>
	);
}

export default function Edit({ attributes, setAttributes }) {
	const { ref, type = 'simple', submenuOpensOnClick = false } = attributes;
	const blockProps = useBlockProps();
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
			<InspectorControls group="settings">
				<PanelBody title={__('Settings', 'eighteen73-blocks')}>
					{!hasResolved && <Spinner />}
					{hasResolved && (
						<SelectControl
							__next40pxDefaultSize
							label={__('Menu', 'eighteen73-blocks')}
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
			{!!ref && hasResolved && (
				<EntityProvider kind="postType" type="wp_navigation" id={ref}>
					<NavigationMenu
						type={type}
						submenuOpensOnClick={submenuOpensOnClick}
					/>
				</EntityProvider>
			)}
		</>
	);
}
