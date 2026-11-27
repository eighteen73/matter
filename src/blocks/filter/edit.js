/**
 * A filter in the editor, in the front end's markup so the theme's styles
 * show it as it will look: its name is edited in place, a collapsible one
 * opens and closes (a click on its row; it starts as set), and in a bar of
 * filters its options open below its button while it's selected. The options
 * are a preview (a few of the source's, else samples): the front end shows
 * the listing's, with their counts.
 */

/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	RichText,
	store as blockEditorStore,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	Placeholder,
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
	ToolsPanel,
	ToolsPanelItem,
} from '../../components/compat';
import { filtersLayout } from '../filters/layout';
import { sourceIcon } from './icons';

// How a choice of options can show. Stars only for ordered values (ratings).
const DISPLAYS = [
	{ value: 'checkboxes', label: __('Checkboxes', 'matter') },
	{ value: 'chips', label: __('Chips', 'matter') },
	{ value: 'swatches', label: __('Swatches', 'matter') },
	{ value: 'radio', label: __('Radio buttons', 'matter') },
	{ value: 'dropdown', label: __('Dropdown', 'matter') },
];
const STARS = { value: 'stars', label: __('Stars', 'matter') };

// What resetting the settings puts back (the display: the source's own).
const DEFAULTS = {
	showCounts: true,
	operator: 'or',
	limit: 0,
	atLeast: false,
	collapsible: false,
	open: true,
	slider: false,
};

const sources = () => window.matterEditor?.filterSources ?? [];

/**
 * The options a preview shows: ratings for ordered values, else the source's
 * examples (a taxonomy's terms, stock statuses), else samples. Each nested
 * under its parent when that's shown too.
 *
 * @param {Object|undefined} source  The source.
 * @param {boolean}          atLeast "4 & up" options.
 * @return {Object[]} Top-level options, each with its `children`.
 */
function previewOptions(source, atLeast) {
	let options;

	if (source?.ordered) {
		options = (atLeast ? [4, 3, 2, 1] : [5, 4, 3, 2, 1]).map((n) => ({
			id: n,
			rating: n,
			/* translators: %d: a rating, 1 to 5. */
			name: sprintf(__('Rated %d out of 5', 'matter'), n),
			count: 0,
		}));
	} else if (source?.examples?.length) {
		options = source.examples;
	} else {
		options = [1, 2, 3].map((n) => ({
			id: n,
			/* translators: %d: a sample option's number. */
			name: sprintf(__('Option %d', 'matter'), n),
			count: 0,
		}));
	}

	const ids = new Set(options.map(({ id }) => id));

	return options
		.filter(({ parent }) => !parent || !ids.has(parent))
		.map((option) => ({
			...option,
			children: options.filter(({ parent }) => parent === option.id),
		}));
}

/**
 * An option's name: its stars (and "& up") for a rating shown as stars.
 *
 * @param {Object}  props
 * @param {Object}  props.option  The option.
 * @param {boolean} props.stars   Shown as stars.
 * @param {boolean} props.atLeast "4 & up" options.
 * @return {Element} Name.
 */
function OptionName({ option, stars, atLeast }) {
	if (stars && option.rating) {
		return (
			<>
				<span
					className="wp-block-matter-filter__stars"
					style={{ '--rating': option.rating }}
					aria-hidden="true"
				/>
				<span className="wp-block-matter-filter__name screen-reader-text">
					{option.name}
				</span>
				{atLeast && (
					<span className="wp-block-matter-filter__up" aria-hidden>
						{__('& up', 'matter')}
					</span>
				)}
			</>
		);
	}

	return <span className="wp-block-matter-filter__name">{option.name}</span>;
}

/**
 * The options as a list: a checkbox or radio button each (chips and swatches
 * are checkboxes the theme styles), children nested, those past the limit
 * behind "Show more". Not interactive: the editor's clicks select the block.
 *
 * @param {Object}   props
 * @param {Object[]} props.options    Top-level options.
 * @param {string}   props.display    How they show.
 * @param {boolean}  props.radio      One choice (radio buttons).
 * @param {boolean}  props.atLeast    "4 & up" options.
 * @param {boolean}  props.showCounts Counts shown.
 * @param {number}   props.limit      Options before "Show more" (0: all).
 * @return {Element} List.
 */
function OptionList({ options, display, radio, atLeast, showCounts, limit }) {
	const more = limit > 0 && options.length > limit;
	const all = radio
		? [
				{
					id: 'any',
					name: __('Any', 'matter'),
					count: 0,
					children: [],
				},
				...options,
			]
		: options;
	const item = (option, index) => (
		<li
			key={option.id}
			className={[
				'wp-block-matter-filter__option',
				more && index >= limit + (radio ? 1 : 0) ? 'is-more' : '',
			]
				.filter(Boolean)
				.join(' ')}
		>
			<span className="wp-block-matter-filter__choice">
				<input
					type={radio ? 'radio' : 'checkbox'}
					tabIndex={-1}
					defaultChecked={radio && option.id === 'any'}
					aria-label={option.name}
				/>
				{display === 'swatches' && option.swatch && (
					<span
						className="wp-block-matter-filter__swatch"
						style={{ '--swatch': option.swatch }}
						aria-hidden="true"
					/>
				)}
				<span className="wp-block-matter-filter__text">
					<OptionName
						option={option}
						stars={display === 'stars'}
						atLeast={atLeast}
					/>
					{showCounts && option.count > 0 && (
						<>
							{' '}
							<span className="wp-block-matter-filter__count">
								{option.count}
							</span>
						</>
					)}
				</span>
			</span>
			{option.children?.length > 0 && (
				<ul className="wp-block-matter-filter__children">
					{option.children.map((child) => item(child, 0))}
				</ul>
			)}
		</li>
	);

	return (
		<>
			<ul
				className={[
					'wp-block-matter-filter__options',
					more ? 'is-collapsed' : '',
				]
					.filter(Boolean)
					.join(' ')}
			>
				{all.map(item)}
			</ul>
			{more && (
				<button
					type="button"
					className="wp-block-matter-filter__more"
					tabIndex={-1}
				>
					{__('Show more', 'matter')}
				</button>
			)}
		</>
	);
}

export default function Edit({
	attributes,
	setAttributes,
	clientId,
	context,
	isSelected,
}) {
	const {
		source,
		display,
		label,
		showCounts,
		operator,
		limit,
		atLeast,
		collapsible,
		open,
		slider,
	} = attributes;
	const postType = context?.query?.postType;
	// The sources for what the listing lists (a post's category, not a
	// product's), and the one chosen.
	const available = sources().filter(
		({ postTypes }) =>
			!postType || !postTypes?.length || postTypes.includes(postType)
	);
	const found = sources().find(({ key }) => key === source);
	const isRange = found?.kind === 'range';
	const ordered = !!found?.ordered;
	const shown = isRange ? 'range' : display;
	const oneChoice = ['radio', 'dropdown'].includes(shown);
	const isMultiple = !isRange && !oneChoice && !(ordered && atLeast);
	const layout = useSelect(
		(select) => {
			const { getBlockParentsByBlockName, getBlockAttributes } =
				select(blockEditorStore);
			const [filters] = getBlockParentsByBlockName(
				clientId,
				'matter/filters',
				true
			);

			return filtersLayout(
				filters ? getBlockAttributes(filters)?.className : ''
			);
		},
		[clientId]
	);
	const isBar = layout === 'bar';
	// A collapsible filter's preview: open or closed as set, and opened or
	// closed by a click on its row (the setting doesn't change).
	const [expanded, setExpanded] = useState(open !== false);
	const popover = useRef();

	useEffect(() => setExpanded(open !== false), [open]);

	// In a bar of filters, the options open below the button while the
	// filter is selected.
	useEffect(() => {
		const element = popover.current;

		if (!element?.showPopover) {
			return;
		}

		try {
			if (isSelected) {
				element.showPopover();
			} else {
				element.hidePopover();
			}
		} catch {
			// Already open or closed, or not shown (in a drawer).
		}
	}, [isSelected, isBar]);

	const blockProps = useBlockProps({ className: `is-display-${shown}` });
	const name = (tagName, className) => (
		<RichText
			identifier="label"
			tagName={tagName}
			className={className}
			value={label}
			placeholder={found?.label ?? __('Filter', 'matter')}
			onChange={(value) => setAttributes({ label: value })}
			allowedFormats={[]}
			withoutInteractiveFormatting
			disableLineBreaks
			aria-label={__('Filter name', 'matter')}
		/>
	);
	const resetAll = () =>
		setAttributes({ ...DEFAULTS, display: found?.display ?? 'checkboxes' });
	const chooseSource = (value) => {
		const next = sources().find(({ key }) => key === value);

		setAttributes({
			source: value,
			display: next?.display ?? 'checkboxes',
			atLeast: false,
		});
	};
	const sourceOptions = [
		{ value: '', label: __('Choose…', 'matter') },
		...available.map(({ key, label: sourceLabel }) => ({
			value: key,
			label: sourceLabel,
		})),
	];

	if (!found) {
		return (
			<div {...blockProps}>
				<Placeholder
					icon={sourceIcon()}
					label={__('Filter', 'matter')}
					instructions={
						source
							? sprintf(
									/* translators: %s: a filter source's key, e.g. "taxonomy:pa_color". */
									__(
										'“%s” isn’t available here. Choose what it filters by.',
										'matter'
									),
									source
								)
							: __('Choose what it filters by.', 'matter')
					}
				>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Filter by', 'matter')}
						hideLabelFromVision
						value={source}
						options={sourceOptions}
						onChange={chooseSource}
					/>
				</Placeholder>
			</div>
		);
	}

	const options = previewOptions(found, atLeast);
	// Its name over its options: edited there unless its row or button shows
	// it (collapsible, or in a bar), when it's for screen readers only.
	const hiddenLabel = collapsible || isBar;
	const groupName = (tagName) => {
		if (!hiddenLabel) {
			return name(tagName, 'wp-block-matter-filter__label');
		}

		const Tag = tagName;

		return (
			<Tag className="wp-block-matter-filter__label screen-reader-text">
				{label || found.label}
			</Tag>
		);
	};
	let body;

	if (isRange) {
		body = (
			<fieldset className="wp-block-matter-filter__fieldset">
				{groupName('legend')}
				{slider && (
					<>
						<div
							className="wp-block-matter-filter__slider"
							style={{ '--from': '0%', '--to': '100%' }}
						>
							<input
								type="range"
								className="wp-block-matter-filter__thumb is-min"
								tabIndex={-1}
								defaultValue={0}
								aria-label={__('Lowest', 'matter')}
							/>
							<input
								type="range"
								className="wp-block-matter-filter__thumb is-max"
								tabIndex={-1}
								defaultValue={100}
								aria-label={__('Highest', 'matter')}
							/>
						</div>
						<output className="wp-block-matter-filter__span">
							{__('Lowest – highest', 'matter')}
						</output>
					</>
				)}
				<div className="wp-block-matter-filter__range">
					<div className="wp-block-matter-filter__bound">
						{/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- A preview. */}
						<label>{__('Min', 'matter')}</label>
						<input type="number" tabIndex={-1} />
					</div>
					<div className="wp-block-matter-filter__bound">
						{/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- A preview. */}
						<label>{__('Max', 'matter')}</label>
						<input type="number" tabIndex={-1} />
					</div>
				</div>
			</fieldset>
		);
	} else if (shown === 'dropdown') {
		body = (
			<div className="wp-block-matter-filter__field">
				{groupName('div')}
				<select tabIndex={-1}>
					<option>{__('Any', 'matter')}</option>
				</select>
			</div>
		);
	} else {
		body = (
			<fieldset className="wp-block-matter-filter__fieldset">
				{groupName('legend')}
				<OptionList
					options={options}
					display={shown}
					radio={shown === 'radio' || (ordered && atLeast)}
					atLeast={ordered && atLeast}
					showCounts={showCounts}
					limit={limit}
				/>
			</fieldset>
		);
	}

	let filter = body;

	if (isBar) {
		filter = (
			<>
				<div
					className="wp-block-matter-filter__trigger"
					style={{ '--matter-filter-anchor': `--matter-${clientId}` }}
				>
					{name('span', 'wp-block-matter-filter__trigger-label')}
				</div>
				<div
					ref={popover}
					className="wp-block-matter-filter__popover"
					popover="manual"
					style={{ '--matter-filter-anchor': `--matter-${clientId}` }}
				>
					{body}
				</div>
			</>
		);
	} else if (collapsible) {
		filter = (
			<div className="wp-block-matter-filter__group" open={expanded}>
				{/* Its row opens and closes it, as on the front end; its
				name is edited in place. */}
				{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
				<div
					className="wp-block-matter-filter__summary"
					onClick={(event) => {
						if (event.target === event.currentTarget) {
							setExpanded(!expanded);
						}
					}}
				>
					{name('span', 'wp-block-matter-filter__summary-label')}
				</div>
				<div className="wp-block-matter-filter__group-body">
					<div className="wp-block-matter-filter__group-content">
						{body}
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={resetAll}
				>
					<ToolsPanelItem
						label={__('Filter by', 'matter')}
						hasValue={() => false}
						isShownByDefault
					>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Filter by', 'matter')}
							value={source}
							options={sourceOptions}
							onChange={chooseSource}
						/>
					</ToolsPanelItem>
					{isRange ? (
						<ToolsPanelItem
							label={__('Slider', 'matter')}
							hasValue={() => !!slider}
							onDeselect={() => setAttributes({ slider: false })}
							isShownByDefault
						>
							<ToggleControl
								__nextHasNoMarginBottom
								label={__('Slider', 'matter')}
								checked={!!slider}
								onChange={(value) =>
									setAttributes({ slider: value })
								}
							/>
						</ToolsPanelItem>
					) : (
						<ToolsPanelItem
							label={__('Show as', 'matter')}
							hasValue={() =>
								display !== (found.display ?? 'checkboxes')
							}
							onDeselect={() =>
								setAttributes({
									display: found.display ?? 'checkboxes',
								})
							}
							isShownByDefault
						>
							<SelectControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={__('Show as', 'matter')}
								help={
									oneChoice
										? __('One choice at a time.', 'matter')
										: undefined
								}
								value={display}
								options={
									ordered ? [...DISPLAYS, STARS] : DISPLAYS
								}
								onChange={(value) =>
									setAttributes({ display: value })
								}
							/>
						</ToolsPanelItem>
					)}
					{ordered && (
						<ToolsPanelItem
							label={__('"& up" options', 'matter')}
							hasValue={() => !!atLeast}
							onDeselect={() => setAttributes({ atLeast: false })}
							isShownByDefault
						>
							<ToggleControl
								__nextHasNoMarginBottom
								label={__('"& up" options', 'matter')}
								help={__(
									'Each option includes those above it.',
									'matter'
								)}
								checked={!!atLeast}
								onChange={(value) =>
									setAttributes({ atLeast: value })
								}
							/>
						</ToolsPanelItem>
					)}
					{isMultiple && (
						<ToolsPanelItem
							label={__('Match', 'matter')}
							hasValue={() => operator === 'and'}
							onDeselect={() => setAttributes({ operator: 'or' })}
							isShownByDefault
						>
							<ToggleGroupControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								isBlock
								label={__('Match', 'matter')}
								help={
									operator === 'and'
										? __(
												'Results with every option chosen.',
												'matter'
											)
										: __(
												'Results with any option chosen.',
												'matter'
											)
								}
								value={operator}
								onChange={(value) =>
									setAttributes({ operator: value })
								}
							>
								<ToggleGroupControlOption
									value="or"
									label={__('Any', 'matter')}
								/>
								<ToggleGroupControlOption
									value="and"
									label={__('All', 'matter')}
								/>
							</ToggleGroupControl>
						</ToolsPanelItem>
					)}
					{!isRange && (
						<ToolsPanelItem
							label={__('Show counts', 'matter')}
							hasValue={() => !showCounts}
							onDeselect={() =>
								setAttributes({ showCounts: true })
							}
							isShownByDefault
						>
							<ToggleControl
								__nextHasNoMarginBottom
								label={__('Show counts', 'matter')}
								checked={showCounts}
								onChange={(value) =>
									setAttributes({ showCounts: value })
								}
							/>
						</ToolsPanelItem>
					)}
					{!isRange && shown !== 'dropdown' && (
						<ToolsPanelItem
							label={__('Visible options', 'matter')}
							hasValue={() => limit > 0}
							onDeselect={() => setAttributes({ limit: 0 })}
						>
							<RangeControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={__('Visible options', 'matter')}
								help={__(
									'"Show more" shows the rest. 0 shows all.',
									'matter'
								)}
								value={limit}
								min={0}
								max={30}
								onChange={(value) =>
									setAttributes({ limit: value ?? 0 })
								}
							/>
						</ToolsPanelItem>
					)}
					{/* In a bar it collapses only in the drawer (its dropdown opens and closes itself). */}
					{
						<ToolsPanelItem
							label={__('Collapsible', 'matter')}
							hasValue={() => !!collapsible}
							onDeselect={() =>
								setAttributes({
									collapsible: false,
									open: true,
								})
							}
							isShownByDefault
						>
							<ToggleControl
								__nextHasNoMarginBottom
								label={__('Collapsible', 'matter')}
								help={
									isBar
										? __(
												'Where the filters are a drawer, its options open and close under its name.',
												'matter'
											)
										: undefined
								}
								checked={!!collapsible}
								onChange={(value) =>
									setAttributes({ collapsible: value })
								}
							/>
						</ToolsPanelItem>
					}
					{collapsible && (
						<ToolsPanelItem
							label={__('Open by default', 'matter')}
							hasValue={() => open === false}
							onDeselect={() => setAttributes({ open: true })}
							isShownByDefault
						>
							<ToggleControl
								__nextHasNoMarginBottom
								label={__('Open by default', 'matter')}
								checked={open !== false}
								onChange={(value) =>
									setAttributes({ open: value })
								}
							/>
						</ToolsPanelItem>
					)}
				</ToolsPanel>
			</InspectorControls>
			<div {...blockProps}>{filter}</div>
		</>
	);
}
