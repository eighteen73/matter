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
							value={props.attributes.icon}
							onChange={(icon) => props.setAttributes({ icon })}
						/>
					</BlockControls>
				</>
			);
		},
		'withButtonIconControl'
	)
);

addFilter(
	'editor.BlockListBlock',
	'matter/button-icon/preview',
	createHigherOrderComponent(
		(BlockListBlock) => (props) => {
			const icon = useIcon(
				props.name === 'core/button' ? props.attributes.icon : undefined
			);

			if (!icon?.content) {
				return <BlockListBlock {...props} />;
			}

			return (
				<BlockListBlock
					{...props}
					className={[props.className, 'has-icon']
						.filter(Boolean)
						.join(' ')}
					wrapperProps={{
						...props.wrapperProps,
						style: {
							...props.wrapperProps?.style,
							'--button-icon': svgToDataUri(icon.content),
						},
					}}
				/>
			);
		},
		'withButtonIconPreview'
	)
);
