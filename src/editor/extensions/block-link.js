/**
 * Whole-block links: a link button on the toolbar of blocks declaring
 * `supports.matter.link` (e.g. a card). The `link` attribute and the
 * front-end stretched link come from the server (Supports\Link).
 */

/**
 * WordPress dependencies
 */
import { BlockControls, LinkControl } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import { Popover, ToolbarButton } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { link as linkIcon } from '@wordpress/icons';

const hasLinkSupport = (name) => !!getBlockType(name)?.supports?.matter?.link;

function BlockLinkControl({ attributes, setAttributes }) {
	const [anchor, setAnchor] = useState(null);
	const [isEditing, setIsEditing] = useState(false);
	const link = attributes.link ?? {};
	const hasLink = !!link.url;

	return (
		<>
			<BlockControls group="block">
				<ToolbarButton
					ref={setAnchor}
					icon={linkIcon}
					label={
						hasLink
							? __('Edit link', 'matter')
							: __('Link the whole block', 'matter')
					}
					isPressed={hasLink}
					onClick={() => setIsEditing(!isEditing)}
				/>
			</BlockControls>
			{isEditing && (
				<Popover
					anchor={anchor}
					placement="bottom"
					onClose={() => setIsEditing(false)}
					focusOnMount="firstElement"
					shift
				>
					<LinkControl
						value={link}
						forceIsEditingLink={!hasLink}
						onChange={({ url, opensInNewTab }) =>
							setAttributes({
								link: url ? { url, opensInNewTab } : undefined,
							})
						}
						onRemove={() => {
							setAttributes({ link: undefined });
							setIsEditing(false);
						}}
					/>
				</Popover>
			)}
		</>
	);
}

addFilter(
	'editor.BlockEdit',
	'matter/block-link',
	createHigherOrderComponent(
		(BlockEdit) => (props) => (
			<>
				<BlockEdit {...props} />
				{props.isSelected && hasLinkSupport(props.name) && (
					<BlockLinkControl
						attributes={props.attributes}
						setAttributes={props.setAttributes}
					/>
				)}
			</>
		),
		'withBlockLink'
	)
);
