/**
 * Button icon: choose an icon from the theme's collection for core/button.
 * The front end renders it as an inline SVG; the editor previews it with a
 * CSS mask (see canvas.scss).
 */

/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { BlockControls } from '@wordpress/block-editor';
import {
	Button,
	Dropdown,
	MenuGroup,
	Spinner,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { RawHTML, useEffect, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

const { iconCollections = [] } = window.matterEditor ?? {};

let iconsRequest = null;

/**
 * Icons from the allowed collections (all collections when none are set).
 *
 * @return {Promise<Array>} Icons: { name, label, content }.
 */
const fetchIcons = () => {
	iconsRequest ??= Promise.all(
		(iconCollections.length ? iconCollections : ['']).map((collection) =>
			apiFetch({
				path: collection
					? `/wp/v2/icons/${collection}`
					: '/wp/v2/icons',
			}).catch(() => [])
		)
	).then((lists) => lists.flat());

	return iconsRequest;
};

const useIcons = () => {
	const [icons, setIcons] = useState(null);

	useEffect(() => {
		fetchIcons().then(setIcons);
	}, []);

	return icons;
};

const svgToDataUri = (svg) =>
	`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

function IconPicker({ value, onChange }) {
	const icons = useIcons();

	return (
		<ToolbarGroup>
			<Dropdown
				popoverProps={{ placement: 'bottom-start' }}
				renderToggle={({ isOpen, onToggle }) => (
					<ToolbarButton
						aria-expanded={isOpen}
						onClick={onToggle}
						isPressed={!!value}
					>
						{__('Icon', 'matter')}
					</ToolbarButton>
				)}
				renderContent={() => (
					<MenuGroup label={__('Icon', 'matter')}>
						{icons === null && <Spinner />}
						<div className="matter-icon-picker">
							{(icons ?? []).map((icon) => (
								<Button
									key={icon.name}
									className="matter-icon-picker__icon"
									label={icon.label}
									showTooltip
									isPressed={value === icon.name}
									onClick={() =>
										onChange(
											value === icon.name
												? undefined
												: icon.name
										)
									}
								>
									<RawHTML>{icon.content}</RawHTML>
								</Button>
							))}
						</div>
						{value && (
							<Button
								variant="link"
								isDestructive
								onClick={() => onChange(undefined)}
							>
								{__('Remove icon', 'matter')}
							</Button>
						)}
					</MenuGroup>
				)}
			/>
		</ToolbarGroup>
	);
}

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
						<IconPicker
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
			const icons = useIcons();
			const icon =
				props.name === 'core/button' && props.attributes.icon
					? icons?.find(({ name }) => name === props.attributes.icon)
					: null;

			if (!icon) {
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
							'--matter-button-icon': svgToDataUri(icon.content),
						},
					}}
				/>
			);
		},
		'withButtonIconPreview'
	)
);
