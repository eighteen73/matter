/**
 * Custom ComboboxControl option renderer for overlay targets.
 *
 * @param {Object} props      Component props.
 * @param {Object} props.item Combobox option item.
 * @return {Element} Element to render.
 */
export default function OverlayTargetOption({ item }) {
	return (
		<div
			className="matter-overlay-target-option"
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				gap: '16px',
				width: '100%',
			}}
		>
			<span className="matter-overlay-target-option__label">
				{item.label}
			</span>
			<span
				className="matter-overlay-target-option__hint"
				style={{
					color: '#757575',
					flexShrink: 0,
				}}
			>
				{item.hint}
			</span>
		</div>
	);
}
