/**
 * WordPress dependencies
 */
import {
	BaseControl,
	Button,
	useBaseControlProps,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { arrowDown, arrowUp, trash } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Field from './field';

/**
 * A list of rows, each made of the repeater's sub-fields.
 *
 * @param {Object}   props
 * @param {Object}   props.field    Repeater field definition.
 * @param {Array}    props.value    Rows.
 * @param {Function} props.onChange Receives the new rows.
 * @param {Object}   props.media    Map of attachment ID => preview URL.
 * @return {Element} Repeater field.
 */
export default function RepeaterField({ field, value, onChange, media }) {
	const rows = Array.isArray(value) ? value : [];
	const { baseControlProps } = useBaseControlProps({
		label: field.label,
		help: field.help || undefined,
		__nextHasNoMarginBottom: true,
	});

	const emptyRow = () =>
		Object.fromEntries(
			Object.entries(field.fields).map(([key, subField]) => [
				key,
				subField.default,
			])
		);

	const updateRow = (index, key, next) =>
		onChange(
			rows.map((row, rowIndex) =>
				rowIndex === index ? { ...row, [key]: next } : row
			)
		);

	const move = (index, offset) => {
		const next = [...rows];
		const [row] = next.splice(index, 1);
		next.splice(index + offset, 0, row);
		onChange(next);
	};

	return (
		<BaseControl {...baseControlProps}>
			<div className="matter-settings__repeater">
				{rows.map((row, index) => (
					<div className="matter-settings__repeater-row" key={index}>
						<div className="matter-settings__repeater-fields">
							{Object.entries(field.fields).map(
								([key, subField]) => (
									<Field
										key={key}
										field={subField}
										value={row[key]}
										media={media}
										onChange={(next) =>
											updateRow(index, key, next)
										}
									/>
								)
							)}
						</div>
						<div className="matter-settings__repeater-actions">
							<Button
								icon={arrowUp}
								size="small"
								label={__('Move up', 'matter')}
								disabled={index === 0}
								onClick={() => move(index, -1)}
							/>
							<Button
								icon={arrowDown}
								size="small"
								label={__('Move down', 'matter')}
								disabled={index === rows.length - 1}
								onClick={() => move(index, 1)}
							/>
							<Button
								icon={trash}
								size="small"
								isDestructive
								label={sprintf(
									/* translators: %d: row number */
									__('Remove row %d', 'matter'),
									index + 1
								)}
								onClick={() =>
									onChange(
										rows.filter(
											(_, rowIndex) => rowIndex !== index
										)
									)
								}
							/>
						</div>
					</div>
				))}
				<Button
					variant="secondary"
					onClick={() => onChange([...rows, emptyRow()])}
				>
					{__('Add row', 'matter')}
				</Button>
			</div>
		</BaseControl>
	);
}
