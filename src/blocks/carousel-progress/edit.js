import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { ToggleControl, PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit({ attributes, setAttributes }) {
	const { indicateCurrentPosition } = attributes;
	const blockProps = useBlockProps({
		className: 'embla__progress',
	});

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__('Settings', 'eighteen73-blocks')}
					initialOpen={true}
				>
					<ToggleControl
						label={__(
							'Indicate current position',
							'eighteen73-blocks'
						)}
						checked={indicateCurrentPosition}
						onChange={() =>
							setAttributes({
								indicateCurrentPosition:
									!indicateCurrentPosition,
							})
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}></div>
		</>
	);
}
