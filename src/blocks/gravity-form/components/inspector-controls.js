/**
 * WordPress dependencies
 */
import { useEffect, useState } from '@wordpress/element';
import {
	Notice,
	TextareaControl,
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalNumberControl as NumberControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import FormSelect from './form-select';

const isEmptyFieldValues = (config) =>
	config === null ||
	config === undefined ||
	(typeof config === 'object' &&
		!Array.isArray(config) &&
		Object.keys(config).length === 0);

const serializeFieldValues = (config) =>
	isEmptyFieldValues(config) ? '' : JSON.stringify(config, null, 2);

export default function GravityFormInspectorControls({
	attributes,
	setAttributes,
	formOptions,
}) {
	const {
		formId,
		displayTitle,
		displayDescription,
		ajaxSubmission,
		tabindex,
		fieldValues,
	} = attributes;

	const [fieldValuesDraft, setFieldValuesDraft] = useState(() =>
		serializeFieldValues(fieldValues)
	);
	const [fieldValuesError, setFieldValuesError] = useState('');

	useEffect(() => {
		const next = serializeFieldValues(fieldValues);
		setFieldValuesDraft((prev) => (prev === next ? prev : next));
	}, [fieldValues]);

	const clearFieldValues = () => {
		setFieldValuesError('');
		setFieldValuesDraft('');
		setAttributes({ fieldValues: null });
	};

	const handleFieldValuesBlur = () => {
		const trimmed = fieldValuesDraft.trim();
		if (!trimmed) {
			clearFieldValues();
			return;
		}
		try {
			const parsed = JSON.parse(trimmed);
			if (
				parsed === null ||
				typeof parsed !== 'object' ||
				Array.isArray(parsed)
			) {
				setFieldValuesError(
					__('Value must be a JSON object.', 'matter')
				);
				setFieldValuesDraft(serializeFieldValues(fieldValues));
				return;
			}
			if (isEmptyFieldValues(parsed)) {
				clearFieldValues();
				return;
			}
			setFieldValuesError('');
			setAttributes({ fieldValues: parsed });
			setFieldValuesDraft(JSON.stringify(parsed, null, 2));
		} catch {
			setFieldValuesError(__('Invalid JSON.', 'matter'));
			setFieldValuesDraft(serializeFieldValues(fieldValues));
		}
	};

	return (
		<>
			<InspectorControls group="content">
				<ToolsPanel
					label={__('Form Content', 'matter')}
					resetAll={() => {
						setAttributes({
							formId: '',
						});
					}}
				>
					<ToolsPanelItem
						label={__('Form', 'matter')}
						hasValue={() => !!formId}
						onDeselect={() => setAttributes({ formId: '' })}
						isShownByDefault
					>
						<FormSelect
							attributes={attributes}
							setAttributes={setAttributes}
							formOptions={formOptions}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() => {
						setAttributes({
							displayTitle: false,
							displayDescription: false,
							ajaxSubmission: true,
							tabindex: 0,
							fieldValues: null,
						});
						setFieldValuesError('');
						setFieldValuesDraft('');
					}}
				>
					<ToolsPanelItem
						label={__('Display Title', 'matter')}
						hasValue={() => displayTitle}
						onDeselect={() =>
							setAttributes({ displayTitle: false })
						}
						isShownByDefault
					>
						<ToggleControl
							label={__('Display Title', 'matter')}
							checked={displayTitle}
							onChange={(value) =>
								setAttributes({ displayTitle: value })
							}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={__('Display Description', 'matter')}
						hasValue={() => displayDescription}
						onDeselect={() =>
							setAttributes({ displayDescription: false })
						}
						isShownByDefault
					>
						<ToggleControl
							label={__('Display Description', 'matter')}
							checked={displayDescription}
							onChange={(value) =>
								setAttributes({ displayDescription: value })
							}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={__('Ajax Submission', 'matter')}
						hasValue={() => ajaxSubmission}
						onDeselect={() =>
							setAttributes({ ajaxSubmission: true })
						}
						isShownByDefault
					>
						<ToggleControl
							label={__('AJAX Submission', 'matter')}
							help={__(
								'This will prevent the page from reloading when the form is submitted.',
								'matter'
							)}
							checked={ajaxSubmission}
							onChange={(value) =>
								setAttributes({ ajaxSubmission: value })
							}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={__('Tabindex', 'matter')}
						hasValue={() => tabindex}
						onDeselect={() => setAttributes({ tabindex: 0 })}
					>
						<NumberControl
							label={__('Tabindex', 'matter')}
							help={__(
								'The tabindex of the form. 0 or -1 are recommended',
								'matter'
							)}
							value={tabindex}
							onChange={(value) =>
								setAttributes({ tabindex: value })
							}
						/>
					</ToolsPanelItem>

					{fieldValuesError ? (
						<Notice status="error" isDismissible={false}>
							{fieldValuesError}
						</Notice>
					) : null}

					<ToolsPanelItem
						label={__('Field Values', 'matter')}
						hasValue={() => fieldValuesDraft.trim() !== ''}
						onDeselect={clearFieldValues}
					>
						<TextareaControl
							label={__('Field Values', 'matter')}
							help={__(
								'JSON object of dynamic population parameter keys and values (for example, {"some_field": "custom_value"}).',
								'matter'
							)}
							value={fieldValuesDraft}
							onChange={(value) => {
								setFieldValuesDraft(value);
								if (fieldValuesError) {
									setFieldValuesError('');
								}
							}}
							onBlur={handleFieldValuesBlur}
							rows={6}
							style={{ fontFamily: 'monospace' }}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>
		</>
	);
}
