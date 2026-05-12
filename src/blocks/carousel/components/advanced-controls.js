import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Notice,
	PanelBody,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';

export default function AdvancedControls({
	advancedCarouselConfig,
	advancedCarouselConfigMerge,
	setAttributes,
}) {
	const mergeWithUi = advancedCarouselConfigMerge === true;

	const [advancedJsonDraft, setAdvancedJsonDraft] = useState(() =>
		JSON.stringify(advancedCarouselConfig ?? {}, null, 2)
	);
	const [advancedJsonError, setAdvancedJsonError] = useState('');

	useEffect(() => {
		const next = JSON.stringify(advancedCarouselConfig ?? {}, null, 2);
		setAdvancedJsonDraft((prev) => (prev === next ? prev : next));
	}, [advancedCarouselConfig]);

	const handleAdvancedJsonBlur = () => {
		const trimmed = advancedJsonDraft.trim();
		if (!trimmed) {
			setAdvancedJsonError('');
			setAttributes({ advancedCarouselConfig: {} });
			setAdvancedJsonDraft('{}');
			return;
		}
		try {
			const parsed = JSON.parse(trimmed);
			if (
				parsed === null ||
				typeof parsed !== 'object' ||
				Array.isArray(parsed)
			) {
				setAdvancedJsonError(
					__('Value must be a JSON object.', 'eighteen73-blocks')
				);
				setAdvancedJsonDraft(
					JSON.stringify(advancedCarouselConfig ?? {}, null, 2)
				);
				return;
			}
			setAdvancedJsonError('');
			setAttributes({ advancedCarouselConfig: parsed });
			setAdvancedJsonDraft(JSON.stringify(parsed, null, 2));
		} catch {
			setAdvancedJsonError(__('Invalid JSON.', 'eighteen73-blocks'));
			setAdvancedJsonDraft(
				JSON.stringify(advancedCarouselConfig ?? {}, null, 2)
			);
		}
	};

	return (
		<>
			{advancedJsonError ? (
				<Notice status="error" isDismissible={false}>
					{advancedJsonError}
				</Notice>
			) : null}

			<TextareaControl
				help={__(
					'Enter a JSON object to override the carousel settings.',
					'eighteen73-blocks'
				)}
				label={__('Advanced Carousel Config', 'eighteen73-blocks')}
				value={advancedJsonDraft}
				onChange={(value) => {
					setAdvancedJsonDraft(value);
					if (advancedJsonError) {
						setAdvancedJsonError('');
					}
				}}
				onBlur={handleAdvancedJsonBlur}
				rows={12}
				style={{ fontFamily: 'monospace' }}
			/>

			<ToggleControl
				label={__('Merge with carousel settings', 'eighteen73-blocks')}
				help={__(
					'When enabled, Settings apply first; keys in the JSON below override them.',
					'eighteen73-blocks'
				)}
				checked={mergeWithUi}
				onChange={(value) =>
					setAttributes({
						advancedCarouselConfigMerge: value,
					})
				}
			/>
		</>
	);
}
