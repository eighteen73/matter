/**
 * Toolbar text control shown only in contentOnly editing mode.
 *
 * Use for attributes that are normally edited in the inspector, which is
 * disabled when a parent pattern uses templateLock: "contentOnly".
 */
import { BlockControls, useBlockEditingMode } from '@wordpress/block-editor';
import { Dropdown, TextControl, ToolbarButton } from '@wordpress/components';

/**
 * @param {Object}   props               Component props.
 * @param {string}   props.label         Toolbar button and field label.
 * @param {string}   props.value         Current attribute value.
 * @param {Function} props.onChange      Called with the new value.
 * @param {string}   [props.help]        Optional help text under the field.
 * @param {string}   [props.placeholder] Optional placeholder.
 * @param {boolean}  [props.show]        Extra gate (e.g. content trigger). Defaults to true.
 * @return {Element|null} Toolbar control or null when not in contentOnly mode.
 */
export default function ContentOnlyTextControl({
	label,
	value,
	onChange,
	help,
	placeholder,
	show = true,
}) {
	const isContentOnlyMode = useBlockEditingMode() === 'contentOnly';

	if (!isContentOnlyMode || !show) {
		return null;
	}

	return (
		<BlockControls group="other">
			<Dropdown
				popoverProps={{ placement: 'bottom-end' }}
				renderToggle={({ isOpen, onToggle }) => (
					<ToolbarButton
						onClick={onToggle}
						aria-haspopup="true"
						aria-expanded={isOpen}
					>
						{label}
					</ToolbarButton>
				)}
				renderContent={() => (
					<div
						className="matter-content-only-text-control"
						style={{ width: 250, padding: 8 }}
					>
						<TextControl
							label={label}
							help={help}
							value={value}
							onChange={onChange}
							placeholder={placeholder}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</div>
				)}
			/>
		</BlockControls>
	);
}
