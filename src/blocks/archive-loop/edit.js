/**
 * Archive list in an archive's content: a live preview of the archive's posts
 * or products, rendered by the theme's template, which editors can move but
 * not remove or change (except its variant).
 */

/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';
import { Disabled, Placeholder, Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { useServerSideRender } from '@wordpress/server-side-render';

export default function Edit() {
	const { postId, target } = useSelect((select) => {
		const editor = select(editorStore);

		return {
			postId: editor.getCurrentPostId(),
			target: editor.getEditedPostAttribute('meta')
				?._matter_archive_target,
		};
	}, []);

	// The archive being edited, so a change in "Shows on" previews at once.
	const { content = '', status } = useServerSideRender({
		block: 'matter/archive-loop',
		attributes: {},
		urlQueryArgs: { post_id: postId, matter_target: target ?? '' },
		skipBlockSupportAttributes: true,
	});

	const blockProps = useBlockProps({ className: 'alignfull' });

	return (
		<div {...blockProps}>
			<span className="wp-block-matter-archive-loop__label">
				{__('Archive list · set by the theme', 'matter')}
			</span>
			{content && (
				<Disabled>
					<div
						className="wp-block-matter-archive-loop__preview"
						dangerouslySetInnerHTML={{ __html: content }}
					/>
				</Disabled>
			)}
			{!content && (
				<Placeholder
					icon="grid-view"
					label={__('Archive list', 'matter')}
					instructions={
						'loading' === status
							? undefined
							: __(
									'The archive’s posts or products show here, as the theme lists them. Add content above and below.',
									'matter'
								)
					}
				>
					{'loading' === status && <Spinner />}
				</Placeholder>
			)}
		</div>
	);
}
