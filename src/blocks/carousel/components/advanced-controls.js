import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Notice, TextareaControl, ToggleControl } from '@wordpress/components';

export default function AdvancedControls({
	advancedEmblaConfig,
	advancedEmblaConfigMerge,
	setAttributes,
}) {
	const mergeWithUi = advancedEmblaConfigMerge === true;

	const [advancedJsonDraft, setAdvancedJsonDraft] = useState(() =>
		JSON.stringify(advancedEmblaConfig ?? {}, null, 2)
	);
	const [advancedJsonError, setAdvancedJsonError] = useState('');

	useEffect(() => {
		const next = JSON.stringify(advancedEmblaConfig ?? {}, null, 2);
		setAdvancedJsonDraft((prev) => (prev === next ? prev : next));
	}, [advancedEmblaConfig]);

	const handleAdvancedJsonBlur = () => {
		const trimmed = advancedJsonDraft.trim();
		if (!trimmed) {
			setAdvancedJsonError('');
			setAttributes({ advancedEmblaConfig: {} });
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
					__('Value must be a JSON object.', 'matter')
				);
				setAdvancedJsonDraft(
					JSON.stringify(advancedEmblaConfig ?? {}, null, 2)
				);
				return;
			}
			setAdvancedJsonError('');
			setAttributes({ advancedEmblaConfig: parsed });
			setAdvancedJsonDraft(JSON.stringify(parsed, null, 2));
		} catch {
			setAdvancedJsonError(__('Invalid JSON.', 'matter'));
			setAdvancedJsonDraft(
				JSON.stringify(advancedEmblaConfig ?? {}, null, 2)
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
					'Enter a JSON object to override the carousel settings. Use the same shape as the block config: nest core options under "options" and plugin options under "plugins" (for example, {"options":{"loop":true},"plugins":{"autoplay":{"active":true,"type":"scroll"}}}).',
					'matter'
				)}
				label={__('Advanced Carousel Config', 'matter')}
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
				label={__('Merge with carousel settings', 'matter')}
				help={__(
					'When enabled, Settings apply first; keys in the JSON below override them.',
					'matter'
				)}
				checked={mergeWithUi}
				onChange={(value) =>
					setAttributes({
						advancedEmblaConfigMerge: value,
					})
				}
			/>
		</>
	);
}
