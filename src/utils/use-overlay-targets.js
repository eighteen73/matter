/**
 * WordPress dependencies
 */
import { parse } from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as editorStore } from '@wordpress/editor';
import {
	useEntityRecord,
	useEntityRecords,
	useSelect,
	store as coreStore,
} from '@wordpress/core-data';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import {
	buildSelectOptions,
	extractOverlayTargetsFromBlocks,
	getEntityTitle,
	mergeOverlayTargets,
} from './overlay-targets';

/**
 * @return {Object} Overlay target options and lookup helpers.
 */
export default function useOverlayTargets() {
	const { blocks, documentHint, templateId } = useSelect((select) => {
		const blockEditor = select(blockEditorStore);
		const editor = select(editorStore);
		const core = select(coreStore);
		const postType = editor.getCurrentPostType();
		const postTypeObject = postType
			? core.getPostType(postType)
			: undefined;
		const templateSlug = editor.getEditedPostAttribute('template');
		const theme = core.getCurrentTheme()?.stylesheet;

		return {
			blocks: blockEditor.getBlocks(),
			documentHint:
				postTypeObject?.labels?.singular_name || __('Page', 'matter'),
			templateId:
				templateSlug && theme ? `${theme}//${templateSlug}` : null,
		};
	}, []);

	const { records: templateParts, isResolving: isResolvingTemplateParts } =
		useEntityRecords('postType', 'wp_template_part', {
			per_page: -1,
			context: 'edit',
		});

	const { record: templateRecord, isResolving: isResolvingTemplate } =
		useEntityRecord('postType', 'wp_template', templateId || undefined);

	const { targets, options } = useMemo(() => {
		const documentTargets = extractOverlayTargetsFromBlocks(blocks, {
			hint: documentHint,
			includeClientIds: true,
		});

		const templatePartTargets = (templateParts || []).flatMap((part) => {
			const hint =
				getEntityTitle(part) ||
				part.slug ||
				__('Template part', 'matter');
			const content = part?.content?.raw;

			if (!content) {
				return [];
			}

			return extractOverlayTargetsFromBlocks(parse(content), {
				hint,
				includeClientIds: false,
			});
		});

		const templateTargets = (() => {
			const content = templateRecord?.content?.raw;

			if (!content) {
				return [];
			}

			const hint =
				getEntityTitle(templateRecord) || __('Template', 'matter');

			return extractOverlayTargetsFromBlocks(parse(content), {
				hint,
				includeClientIds: false,
			});
		})();

		const mergedTargets = mergeOverlayTargets(
			documentTargets,
			templatePartTargets,
			templateTargets
		);

		return {
			targets: mergedTargets,
			options: buildSelectOptions(mergedTargets),
		};
	}, [blocks, documentHint, templateParts, templateRecord]);

	const findTargetById = useMemo(
		() => (targetId) => {
			if (!targetId) {
				return undefined;
			}

			return targets.find((target) => target.targetId === targetId);
		},
		[targets]
	);

	return {
		options,
		targets,
		isResolving: isResolvingTemplateParts || isResolvingTemplate,
		findTargetById,
	};
}
