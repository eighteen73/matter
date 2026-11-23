/**
 * WordPress dependencies
 */
import {
	BaseControl,
	Button,
	useBaseControlProps,
} from '@wordpress/components';
import { useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Image picker using the core media library.
 *
 * @param {Object}   props
 * @param {Object}   props.field    Field definition.
 * @param {number}   props.value    Attachment ID (0 when empty).
 * @param {Function} props.onChange Receives the new attachment ID.
 * @param {Object}   props.media    Map of attachment ID => preview URL (mutated as images are picked).
 * @return {Element} Media field.
 */
export default function MediaField({ field, value, onChange, media }) {
	const frame = useRef();
	const { baseControlProps } = useBaseControlProps({
		label: field.label,
		help: field.help || undefined,
		__nextHasNoMarginBottom: true,
	});

	const open = () => {
		if (!frame.current) {
			frame.current = window.wp.media({
				title: field.label,
				library: { type: 'image' },
				multiple: false,
			});

			frame.current.on('select', () => {
				const attachment = frame.current
					.state()
					.get('selection')
					.first()
					.toJSON();

				media[attachment.id] =
					attachment.sizes?.medium?.url ?? attachment.url;
				onChange(attachment.id);
			});
		}

		frame.current.open();
	};

	const preview = value ? media[value] : null;

	return (
		<BaseControl {...baseControlProps}>
			<div className="matter-settings__media">
				{preview && (
					<img
						className="matter-settings__media-preview"
						src={preview}
						alt=""
					/>
				)}
				<div className="matter-settings__media-actions">
					<Button variant="secondary" onClick={open}>
						{value
							? __('Replace image', 'matter')
							: __('Select image', 'matter')}
					</Button>
					{!!value && (
						<Button
							variant="tertiary"
							isDestructive
							onClick={() => onChange(0)}
						>
							{__('Remove', 'matter')}
						</Button>
					)}
				</div>
			</div>
		</BaseControl>
	);
}
