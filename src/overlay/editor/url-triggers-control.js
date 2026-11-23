/**
 * WordPress dependencies
 */
import {
	BaseControl,
	Button,
	Flex,
	FlexBlock,
	TextControl,
	useBaseControlProps,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { trash } from '@wordpress/icons';

/**
 * URL parameters that open an overlay, e.g. `?offer=spring`.
 * An empty value matches the parameter with any value.
 *
 * @param {Object}   props
 * @param {Array}    props.value    Rules: { param, value }.
 * @param {Function} props.onChange Receives the new rules.
 * @return {Element} Control.
 */
export default function UrlTriggersControl({ value = [], onChange }) {
	const { baseControlProps } = useBaseControlProps({
		label: __('When the URL contains', 'matter'),
		help: __(
			'e.g. offer = spring opens on ?offer=spring. Leave the value empty to match any value.',
			'matter'
		),
		__nextHasNoMarginBottom: true,
	});

	const update = (index, key, next) =>
		onChange(
			value.map((rule, ruleIndex) =>
				ruleIndex === index ? { ...rule, [key]: next } : rule
			)
		);

	return (
		<BaseControl {...baseControlProps}>
			{value.map((rule, index) => (
				<Flex key={index} align="flex-end" style={{ marginBottom: 8 }}>
					<FlexBlock>
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Parameter', 'matter')}
							value={rule.param ?? ''}
							onChange={(next) => update(index, 'param', next)}
						/>
					</FlexBlock>
					<FlexBlock>
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Value', 'matter')}
							value={rule.value ?? ''}
							onChange={(next) => update(index, 'value', next)}
						/>
					</FlexBlock>
					<Button
						icon={trash}
						label={__('Remove', 'matter')}
						onClick={() =>
							onChange(
								value.filter(
									(_, ruleIndex) => ruleIndex !== index
								)
							)
						}
						__next40pxDefaultSize
					/>
				</Flex>
			))}
			<Button
				variant="secondary"
				onClick={() => onChange([...value, { param: '', value: '' }])}
			>
				{__('Add URL rule', 'matter')}
			</Button>
		</BaseControl>
	);
}
