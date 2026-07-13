/**
 * WordPress dependencies
 */
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Notice,
	TextareaControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

const isPlainObject = (value) =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

const isEmptyObject = (value) =>
	isPlainObject(value) && Object.keys(value).length === 0;

const isAllowedValue = (value) =>
	value === null || ['string', 'number', 'boolean'].includes(typeof value);

const serializeContext = (context) =>
	!isPlainObject(context) || isEmptyObject(context)
		? ''
		: JSON.stringify(context, null, 2);

const validateOverlayContext = (value) => {
	if (!isPlainObject(value)) {
		return __('Value must be a JSON object.', 'matter');
	}

	for (const [key, item] of Object.entries(value)) {
		if (!key.trim()) {
			return __('Context keys cannot be empty.', 'matter');
		}

		if (!isAllowedValue(item)) {
			return __(
				'Context values must be strings, numbers, booleans, or null.',
				'matter'
			);
		}
	}

	return '';
};

export default function OverlayContextControl({
	overlayContext,
	setAttributes,
}) {
	const [jsonDraft, setJsonDraft] = useState(() =>
		serializeContext(overlayContext)
	);
	const [jsonError, setJsonError] = useState('');

	useEffect(() => {
		const next = serializeContext(overlayContext);
		setJsonDraft((prev) => (prev === next ? prev : next));
	}, [overlayContext]);

	const clearOverlayContext = () => {
		setJsonError('');
		setJsonDraft('');
		setAttributes({ overlayContext: {} });
	};

	const handleBlur = () => {
		const trimmed = jsonDraft.trim();

		if (!trimmed) {
			clearOverlayContext();
			return;
		}

		try {
			const parsed = JSON.parse(trimmed);
			const error = validateOverlayContext(parsed);

			if (error) {
				setJsonError(error);
				setJsonDraft(serializeContext(overlayContext));
				return;
			}

			if (isEmptyObject(parsed)) {
				clearOverlayContext();
				return;
			}

			setJsonError('');
			setAttributes({ overlayContext: parsed });
			setJsonDraft(JSON.stringify(parsed, null, 2));
		} catch {
			setJsonError(__('Invalid JSON.', 'matter'));
			setJsonDraft(serializeContext(overlayContext));
		}
	};

	return (
		<ToolsPanel label={__('Advanced Overlay Context', 'matter')}>
			{jsonError ? (
				<Notice status="error" isDismissible={false}>
					{jsonError}
				</Notice>
			) : null}

			<ToolsPanelItem
				label={__('Overlay Context', 'matter')}
				hasValue={() => jsonDraft.trim() !== ''}
				onDeselect={clearOverlayContext}
			>
				<TextareaControl
					help={__(
						'Enter a flat JSON object to pass to the overlay when this trigger opens it. Values may be strings, numbers, booleans, or null.',
						'matter'
					)}
					label={__('Overlay Context', 'matter')}
					value={jsonDraft}
					onBlur={handleBlur}
					onChange={(value) => {
						setJsonDraft(value);

						if (jsonError) {
							setJsonError('');
						}
					}}
					rows={8}
					style={{ fontFamily: 'monospace' }}
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
