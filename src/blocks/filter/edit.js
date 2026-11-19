/**
 * A filter in the editor: its settings, and a preview of how it shows (a
 * taxonomy's own terms, else sample options). Counts and which options show
 * depend on the list, so the front end's are the real ones.
 */

/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

// Displays for a choice of options.
const CHOICES = [
	{ value: 'checkboxes', label: __('Checkboxes', 'matter') },
	{ value: 'chips', label: __('Chips', 'matter') },
	{ value: 'swatches', label: __('Swatches', 'matter') },
	{ value: 'radio', label: __('Radio buttons (one choice)', 'matter') },
	{ value: 'dropdown', label: __('Dropdown (one choice)', 'matter') },
];

// Options a preview shows.
const PREVIEW = 5;

const sources = () => window.matterEditor?.filterSources ?? [];

export default function Edit({ attributes, setAttributes }) {
	const { source, display, label, showCounts, operator, limit, atLeast } =
		attributes;
	const found = sources().find(({ key }) => key === source);
	const isRange = found?.kind === 'range';
	const ordered = !!found?.ordered;
	const shown = isRange ? 'range' : display;
	const isMultiple =
		['checkboxes', 'chips', 'swatches', 'stars'].includes(shown) &&
		!(ordered && atLeast);
	const terms = useSelect(
		(select) =>
			found?.taxonomy
				? select(coreStore).getEntityRecords(
						'taxonomy',
						found.taxonomy,
						{ per_page: PREVIEW, hide_empty: true }
					)
				: null,
		[found?.taxonomy]
	);
	const ratings = (atLeast ? [4, 3, 2, 1] : [5, 4, 3, 2, 1]).map((n) => ({
		id: n,
		rating: n,
		/* translators: %d: a rating, 1 to 5. */
		name: __('Rated %d out of 5', 'matter').replace('%d', n),
		count: 0,
	}));
	const samples = [1, 2, 3].map((n) => ({
		id: n,
		/* translators: %d: a sample option's number. */
		name: __('Option %d', 'matter').replace('%d', n),
		count: 0,
	}));
	let options = samples;

	if ((terms ?? []).length) {
		options = terms.map(({ id, name, count }) => ({ id, name, count }));
	} else if (ordered) {
		options = ratings;
	}

	const blockProps = useBlockProps({ className: `is-display-${shown}` });

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Filter', 'matter')}>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Filter by', 'matter')}
						value={source}
						options={[
							{ value: '', label: __('Choose…', 'matter') },
							...sources().map(({ key, label: name }) => ({
								value: key,
								label: name,
							})),
						]}
						onChange={(value) => {
							const next = sources().find(
								({ key }) => key === value
							);

							setAttributes({
								source: value,
								display:
									next?.kind === 'range'
										? 'range'
										: 'checkboxes',
							});
						}}
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Name', 'matter')}
						value={label}
						placeholder={found?.label}
						onChange={(value) => setAttributes({ label: value })}
					/>
					{!isRange && (
						<>
							<SelectControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={__('Show as', 'matter')}
								value={display}
								options={
									ordered
										? [
												...CHOICES,
												{
													value: 'stars',
													label: __(
														'Stars',
														'matter'
													),
												},
											]
										: CHOICES
								}
								onChange={(value) =>
									setAttributes({ display: value })
								}
							/>
							{ordered && (
								<ToggleControl
									__nextHasNoMarginBottom
									label={__(
										'Each option includes those above it ("4 & up")',
										'matter'
									)}
									checked={!!atLeast}
									onChange={(value) =>
										setAttributes({ atLeast: value })
									}
								/>
							)}
							{isMultiple && (
								<SelectControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									label={__('With several chosen', 'matter')}
									value={operator}
									options={[
										{
											value: 'or',
											label: __(
												'Show results with any of them',
												'matter'
											),
										},
										{
											value: 'and',
											label: __(
												'Show results with all of them',
												'matter'
											),
										},
									]}
									onChange={(value) =>
										setAttributes({ operator: value })
									}
								/>
							)}
							<ToggleControl
								__nextHasNoMarginBottom
								label={__(
									'Show how many results each has',
									'matter'
								)}
								checked={showCounts}
								onChange={(value) =>
									setAttributes({ showCounts: value })
								}
							/>
							{display !== 'dropdown' && (
								<RangeControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									label={__(
										'Options shown before "Show more"',
										'matter'
									)}
									help={__('0 shows them all.', 'matter')}
									value={limit}
									min={0}
									max={30}
									onChange={(value) =>
										setAttributes({ limit: value ?? 0 })
									}
								/>
							)}
						</>
					)}
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<fieldset className="wp-block-matter-filter__fieldset" disabled>
					<legend className="wp-block-matter-filter__label">
						{label ||
							found?.label ||
							__('Choose what to filter by', 'matter')}
					</legend>
					{isRange && (
						<div className="wp-block-matter-filter__range">
							<span className="wp-block-matter-filter__bound">
								{__('Min', 'matter')}
								<input
									type="number"
									aria-label={__('Min', 'matter')}
								/>
							</span>
							<span className="wp-block-matter-filter__bound">
								{__('Max', 'matter')}
								<input
									type="number"
									aria-label={__('Max', 'matter')}
								/>
							</span>
						</div>
					)}
					{!isRange && display === 'dropdown' && (
						<select>
							<option>{__('Any', 'matter')}</option>
						</select>
					)}
					{!isRange && display !== 'dropdown' && (
						<ul className="wp-block-matter-filter__options">
							{options.map(({ id, name, count, rating }) => (
								<li
									key={id}
									className="wp-block-matter-filter__option"
								>
									<span className="wp-block-matter-filter__choice">
										<input
											type={
												display === 'radio' ||
												(ordered && atLeast)
													? 'radio'
													: 'checkbox'
											}
											aria-label={name}
										/>
										{display === 'stars' && rating ? (
											<>
												<span
													className="wp-block-matter-filter__stars"
													style={{
														'--rating': rating,
													}}
													aria-hidden="true"
												/>
												{atLeast && (
													<span className="wp-block-matter-filter__up">
														{__('& up', 'matter')}
													</span>
												)}
											</>
										) : (
											<span className="wp-block-matter-filter__name">
												{name}
											</span>
										)}
										{showCounts && count > 0 && (
											<span className="wp-block-matter-filter__count">
												{count}
											</span>
										)}
									</span>
								</li>
							))}
						</ul>
					)}
				</fieldset>
			</div>
		</>
	);
}
