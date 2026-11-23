/**
 * Button icon: choose an icon from the icon library for core/button.
 * The front end renders it as an inline SVG; the editor previews it with a
 * CSS mask (see canvas.scss).
 */

/**
 * WordPress dependencies
 */
import { BlockControls } from '@wordpress/block-editor';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import { IconToolbar, useIcon } from '../../components/icon-picker';

const svgToDataUri = (svg) =>
	`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

addFilter(
	'editor.BlockEdit',
	'matter/button-icon/control',
	createHigherOrderComponent(
		(BlockEdit) => (props) => {
			if (props.name !== 'core/button') {
				return <BlockEdit {...props} />;
			}

			return (
				<>
					<BlockEdit {...props} />
					<BlockControls group="other">
						<IconToolbar
							value={props.attributes.matterIcon}
							onChange={(matterIcon) =>
								props.setAttributes({ matterIcon })
							}
						/>
					</BlockControls>
				</>
			);
		},
		'withButtonIconControl'
	)
);

/**
 * The icon preview of a button. A component of its own so that the icon lookup
 * (a store subscription) only runs for buttons.
 *
 * @param {Object}   props
 * @param {Function} props.BlockListBlock Core's block wrapper.
 * @param {Object}   props.blockProps     The wrapper's props.
 * @return {Element} The wrapper, with the icon as a style variable.
 */
function ButtonIconPreview({ BlockListBlock, blockProps }) {
	const icon = useIcon(blockProps.attributes.matterIcon);

	if (!icon?.content) {
		return <BlockListBlock {...blockProps} />;
	}

	return (
		<BlockListBlock
			{...blockProps}
			className={[blockProps.className, 'has-icon']
				.filter(Boolean)
				.join(' ')}
			wrapperProps={{
				...blockProps.wrapperProps,
				style: {
					...blockProps.wrapperProps?.style,
					'--button-icon': svgToDataUri(icon.content),
				},
			}}
		/>
	);
}

addFilter(
	'editor.BlockListBlock',
	'matter/button-icon/preview',
	createHigherOrderComponent(
		(BlockListBlock) => (props) =>
			props.name === 'core/button' ? (
				<ButtonIconPreview
					BlockListBlock={BlockListBlock}
					blockProps={props}
				/>
			) : (
				<BlockListBlock {...props} />
			),
		'withButtonIconPreview'
	)
);
