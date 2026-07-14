/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

export default function Edit({ attributes, setAttributes, context }) {
	const { title } = attributes;
	const iconPosition = context['matter/accordion-icon-position'] ?? 'right';
	const showIcon = context['matter/accordion-show-icon'] ?? true;
	const headingLevel = context['matter/accordion-heading-level'] ?? 3;
	const isQueryMode = context['matter/accordion-isQueryMode'] ?? false;
	const postId = context.postId;
	const postType = context.postType;

	const postTitle = useSelect(
		(select) => {
			if (!isQueryMode || !postId || !postType) {
				return null;
			}

			const post = select('core').getEntityRecord(
				'postType',
				postType,
				postId
			);
			return post?.title?.rendered || post?.title || '';
		},
		[isQueryMode, postId, postType]
	);

	const TagName = `h${headingLevel}`;
	const displayTitle =
		isQueryMode && postTitle ? postTitle.replace(/<[^>]+>/g, '') : title;

	const blockProps = useBlockProps({
		className: clsx({
			'has-icon': showIcon,
			'has-icon-left': showIcon && iconPosition === 'left',
			'has-icon-right': showIcon && iconPosition === 'right',
		}),
	});

	return (
		<TagName {...blockProps}>
			<button
				type="button"
				className="wp-block-matter-accordion-heading__toggle"
			>
				{showIcon && iconPosition === 'left' && (
					<span
						className="wp-block-matter-accordion-heading__toggle-icon"
						aria-hidden="true"
					>
						+
					</span>
				)}
				{isQueryMode && postTitle ? (
					<span className="wp-block-matter-accordion-heading__toggle-title">
						{displayTitle}
					</span>
				) : (
					<RichText
						tagName="span"
						value={title}
						onChange={(newTitle) =>
							setAttributes({ title: newTitle })
						}
						placeholder={__('Accordion title', 'matter')}
						className="wp-block-matter-accordion-heading__toggle-title"
						allowedFormats={[]}
					/>
				)}
				{showIcon && iconPosition === 'right' && (
					<span
						className="wp-block-matter-accordion-heading__toggle-icon"
						aria-hidden="true"
					>
						+
					</span>
				)}
			</button>
		</TagName>
	);
}
