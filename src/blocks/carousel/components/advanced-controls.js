import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Notice,
	TextareaControl,
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

const isEmptyAdvancedConfig = (config) =>
	config === null ||
	config === undefined ||
	(typeof config === 'object' &&
		!Array.isArray(config) &&
		Object.keys(config).length === 0);

const serializeAdvancedConfig = (config) =>
	isEmptyAdvancedConfig(config) ? '' : JSON.stringify(config, null, 2);

export default function AdvancedControls({
	advancedEmblaConfig,
	advancedEmblaConfigMerge,
	setAttributes,
}) {
	const mergeWithUi = advancedEmblaConfigMerge === true;

	const [advancedJsonDraft, setAdvancedJsonDraft] = useState(() =>
		serializeAdvancedConfig(advancedEmblaConfig)
	);
	const [advancedJsonError, setAdvancedJsonError] = useState('');

	useEffect(() => {
		const next = serializeAdvancedConfig(advancedEmblaConfig);
		setAdvancedJsonDraft((prev) => (prev === next ? prev : next));
	}, [advancedEmblaConfig]);

	const clearAdvancedConfig = () => {
		setAdvancedJsonError('');
		setAdvancedJsonDraft('');
		setAttributes({ advancedEmblaConfig: null });
	};

	const handleAdvancedJsonBlur = () => {
		const trimmed = advancedJsonDraft.trim();
		if (!trimmed) {
			clearAdvancedConfig();
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
					serializeAdvancedConfig(advancedEmblaConfig)
				);
				return;
			}
			if (isEmptyAdvancedConfig(parsed)) {
				clearAdvancedConfig();
				return;
			}
			setAdvancedJsonError('');
			setAttributes({ advancedEmblaConfig: parsed });
			setAdvancedJsonDraft(JSON.stringify(parsed, null, 2));
		} catch {
			setAdvancedJsonError(__('Invalid JSON.', 'matter'));
			setAdvancedJsonDraft(serializeAdvancedConfig(advancedEmblaConfig));
		}
	};

	return (
		<ToolsPanel label={__('Advanced Carousel Settings', 'matter')}>
			{advancedJsonError ? (
				<Notice status="error" isDismissible={false}>
					{advancedJsonError}
				</Notice>
			) : null}

			<ToolsPanelItem
				label={__('Advanced Carousel Config', 'matter')}
				hasValue={() => advancedJsonDraft.trim() !== ''}
				onDeselect={clearAdvancedConfig}
			>
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
			</ToolsPanelItem>

			<ToolsPanelItem
				label={__('Merge with carousel settings', 'matter')}
				hasValue={() => !!mergeWithUi}
				onDeselect={() =>
					setAttributes({ advancedEmblaConfigMerge: false })
				}
			>
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
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
