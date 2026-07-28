import { useBlockProps } from '@wordpress/block-editor';
import { Disabled, Notice, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { postCommentsForm } from '@wordpress/icons';
import { useServerSideRender } from '@wordpress/server-side-render';
import GravityFormInspectorControls from './components/inspector-controls';
import GravityFormPlaceholder from './components/placeholder';

/**
 * Forms localized from PHP for the block editor.
 *
 * @return {Array<{id: number|string, title: string}>} Active forms list.
 */
function getForms() {
	return window.matterGravityForm?.forms ?? [];
}

/**
 * Build SelectControl options from the forms list.
 *
 * @param {Array<{id: number|string, title: string}>} forms Forms list.
 * @return {Array<{label: string, value: string}>} Select options.
 */
function getFormOptions(forms) {
	return [
		{
			label: __('Select a Form', 'matter'),
			value: '',
		},
		...forms.map((form) => ({
			label: form.title,
			value: String(form.id),
		})),
	];
}

/**
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update attributes.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
	const {
		formId = '',
		displayTitle,
		displayDescription,
		ajaxSubmission,
		tabindex,
		fieldValues,
	} = attributes;
	const blockProps = useBlockProps();
	const forms = getForms();
	const formOptions = getFormOptions(forms);
	const selectedForm = forms.find(
		(form) => String(form.id) === String(formId)
	);
	const hasInvalidFormId = Boolean(formId) && !selectedForm;
	const blockIcon = postCommentsForm;

	const { content: previewHtml = '', status: previewStatus } =
		useServerSideRender({
			block: 'matter/gravity-form',
			attributes: {
				formId,
				displayTitle,
				displayDescription,
				ajaxSubmission,
				tabindex,
				fieldValues,
			},
			skipBlockSupportAttributes: true,
		});

	return (
		<>
			<GravityFormInspectorControls
				attributes={attributes}
				setAttributes={setAttributes}
				formOptions={formOptions}
			/>

			<div {...blockProps}>
				<GravityFormPlaceholder
					forms={forms}
					blockIcon={blockIcon}
					formId={formId}
					hasInvalidFormId={hasInvalidFormId}
					attributes={attributes}
					setAttributes={setAttributes}
					formOptions={formOptions}
					previewHtml={previewHtml}
				/>

				{previewStatus === 'loading' && <Spinner />}

				{previewStatus === 'error' && (
					<Notice status="error" isDismissible={false}>
						{__(
							'Unable to preview this form in the editor.',
							'matter'
						)}
					</Notice>
				)}

				{previewStatus !== 'loading' &&
					previewStatus !== 'error' &&
					previewHtml && (
						<Disabled>
							<div
								dangerouslySetInnerHTML={{
									__html: previewHtml,
								}}
							/>
						</Disabled>
					)}
			</div>
		</>
	);
}
