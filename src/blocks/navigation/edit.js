import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	EntityProvider,
	useEntityBlockEditor,
	useEntityRecords,
} from '@wordpress/core-data';
import { SelectControl, PanelBody, Spinner } from '@wordpress/components';
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

const ALLOWED_BLOCKS = [
	'core/navigation-link',
	'core/navigation-submenu',
	'core/page-list',
	'core/search',
	'core/social-links',
	'core/spacer',
	'core/buttons',
];

function EditableNavigationEntityBlocks() {
	const [blocks, onInput, onChange] = useEntityBlockEditor(
		'postType',
		'wp_navigation'
	);

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'wp-block-eighteen73-navigation__container',
		},
		{
			value: blocks,
			onInput,
			onChange,
			allowedBlocks: ALLOWED_BLOCKS,
			renderAppender: InnerBlocks.ButtonBlockAppender,
		}
	);

	return <div {...innerBlocksProps} />;
}

export default function Edit({ attributes, setAttributes }) {
	const { ref, type = 'simple' } = attributes;
	const blockProps = useBlockProps();
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
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				{!ref && (
					<p className="wp-block-eighteen73-navigation__empty">
						{__(
							'Select a menu from the block settings.',
							'eighteen73-blocks'
						)}
					</p>
				)}
				{!!ref && !hasResolved && <Spinner />}
				{!!ref && hasResolved && (
					<>
						{!ref && (
							<p className="wp-block-eighteen73-navigation__empty">
								{__(
									'The selected menu could not be loaded.',
									'eighteen73-blocks'
								)}
							</p>
						)}
						{!!ref && (
							<EntityProvider
								kind="postType"
								type="wp_navigation"
								id={ref}
							>
								<EditableNavigationEntityBlocks />
							</EntityProvider>
						)}
					</>
				)}
			</div>
		</>
	);
}
