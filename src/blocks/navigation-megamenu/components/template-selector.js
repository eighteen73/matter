/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { decodeEntities } from '@wordpress/html-entities';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	Button,
	ComboboxControl,
	Spinner,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { createInterpolateElement } from '@wordpress/element';
import { pencil } from '@wordpress/icons';
import { cleanForSlug } from '@wordpress/url';

/**
 * Internal dependencies
 */
import useMegamenuTemplates, {
	MEGAMENU_AREA,
} from '../hooks/use-megamenu-templates';
import useTemplateCreation from '../hooks/use-template-creation';

/**
 * Resolve the wp-admin URL from the current location.
 *
 * @return {string} Admin URL with trailing slash.
 */
function getAdminUrl() {
	if (typeof window === 'undefined') {
		return '/wp-admin/';
	}

	const match = window.location.pathname.match(/^(.*\/wp-admin\/)/);

	if (match) {
		return match[1];
	}

	return `${window.location.origin}/wp-admin/`;
}

/**
 * Template part selector for megamenu panels.
 *
 * @param {Object}   props           Component props.
 * @param {string}   props.value     Selected template part slug.
 * @param {Function} props.onChange  Called with the selected slug.
 * @param {string}   props.itemLabel Navigation item label used when creating a part.
 * @return {Element} Element to render.
 */
export default function TemplateSelector({ value, onChange, itemLabel = '' }) {
	const { currentTheme, onNavigateToEntityRecord } = useSelect((select) => {
		const settings = select(blockEditorStore).getSettings();

		return {
			currentTheme: select(coreStore).getCurrentTheme()?.stylesheet,
			onNavigateToEntityRecord: settings?.onNavigateToEntityRecord,
		};
	}, []);

	const { hasResolved, templates, selectedRecord } =
		useMegamenuTemplates(value);

	const templateOptions = templates.map((item) => ({
		label: decodeEntities(item.title?.rendered || item.slug),
		value: item.slug,
	}));

	if (
		selectedRecord &&
		!templateOptions.some((option) => option.value === selectedRecord.slug)
	) {
		templateOptions.unshift({
			label: decodeEntities(
				selectedRecord.title?.rendered || selectedRecord.slug
			),
			value: selectedRecord.slug,
		});
	} else if (
		value &&
		!templateOptions.some((option) => option.value === value)
	) {
		templateOptions.unshift({
			label: value,
			value,
		});
	}

	const hasTemplates = templateOptions.length > 0;

	const trimmedLabel = itemLabel.replace(/<[^>]*>/g, '').trim();
	const baseTitle = trimmedLabel || __('Megamenu', 'matter');
	const baseSlug = cleanForSlug(baseTitle) || 'megamenu';

	const { createTemplate, isCreating } = useTemplateCreation({
		templateArea: MEGAMENU_AREA,
		baseSlug,
		baseTitle,
		existingTemplates: templates,
		currentTheme,
		onNavigateToEntityRecord,
		getAdminUrl,
		onSuccess: (newTemplate) => {
			if (newTemplate?.slug) {
				onChange(newTemplate.slug);
			}
		},
	});

	const siteEditorPartsUrl = `${getAdminUrl()}site-editor.php?postType=wp_template_part&categoryId=${MEGAMENU_AREA}`;
	const editTemplateUrl = selectedRecord
		? `${getAdminUrl()}site-editor.php?p=%2Fwp_template_part%2F${encodeURIComponent(
				currentTheme || 'theme'
			)}%2F%2F${encodeURIComponent(selectedRecord.slug)}&canvas=edit`
		: '';

	let helpText;

	if (hasResolved) {
		helpText = hasTemplates
			? createInterpolateElement(
					__(
						'Select a megamenu or <create>create a new one</create> in the <editor>Site Editor</editor>.',
						'matter'
					),
					{
						create: (
							// eslint-disable-next-line jsx-a11y/anchor-has-content
							<a
								href="#create-megamenu"
								onClick={(event) => {
									event.preventDefault();
									if (!isCreating) {
										createTemplate();
									}
								}}
							/>
						),
						editor: (
							// eslint-disable-next-line jsx-a11y/anchor-has-content
							<a
								href={siteEditorPartsUrl}
								target="_blank"
								rel="noreferrer"
							/>
						),
					}
				)
			: createInterpolateElement(
					__(
						'No megamenus found. <a>Create your first megamenu</a>.',
						'matter'
					),
					{
						a: (
							// eslint-disable-next-line jsx-a11y/anchor-has-content
							<a
								href="#create-megamenu"
								onClick={(event) => {
									event.preventDefault();
									if (!isCreating) {
										createTemplate();
									}
								}}
							/>
						),
					}
				);
	}

	const handleEditTemplate = () => {
		if (!selectedRecord) {
			return;
		}

		if (onNavigateToEntityRecord) {
			onNavigateToEntityRecord({
				postType: 'wp_template_part',
				postId: selectedRecord.id,
			});
			return;
		}

		window.open(editTemplateUrl, '_blank', 'noopener,noreferrer');
	};

	if (!hasResolved) {
		return <Spinner />;
	}

	return (
		<VStack spacing={4}>
			<ComboboxControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={__('Template', 'matter')}
				value={value || undefined}
				options={templateOptions}
				onChange={onChange}
				help={helpText}
			/>
			{isCreating && (
				<p>
					{sprintf(
						/* translators: %s: template part title. */
						__('Creating “%s”…', 'matter'),
						baseTitle
					)}
				</p>
			)}
			{selectedRecord && (
				<Button
					__next40pxDefaultSize
					className="wp-block-matter-navigation-megamenu__edit-template"
					variant="secondary"
					icon={pencil}
					onClick={handleEditTemplate}
				>
					{__('Edit template', 'matter')}
				</Button>
			)}
		</VStack>
	);
}
