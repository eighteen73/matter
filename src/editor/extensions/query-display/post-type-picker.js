/**
 * A new posts display's first question: what it lists (posts, pages, FAQs).
 * Shown in place of the display until a post type is chosen.
 */

/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';
import { Button, Placeholder } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { postList } from '@wordpress/icons';

/**
 * @param {Object}   props
 * @param {string}   props.label     The display's name, e.g. "Posts accordion".
 * @param {Object[]} props.postTypes `{ name, label }` for each choice.
 * @param {Function} props.onChoose  Called with the chosen post type's name.
 * @return {Element} Picker.
 */
export default function PostTypePicker({ label, postTypes, onChoose }) {
	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			<Placeholder
				icon={postList}
				label={label}
				instructions={__('What will it list?', 'matter')}
			>
				<div className="matter-post-type-picker">
					{postTypes.map((postType) => (
						<Button
							key={postType.name}
							variant="secondary"
							onClick={() => onChoose(postType.name)}
							__next40pxDefaultSize
						>
							{postType.label}
						</Button>
					))}
				</div>
			</Placeholder>
		</div>
	);
}
